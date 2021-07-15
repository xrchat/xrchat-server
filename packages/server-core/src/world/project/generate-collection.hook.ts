import { HookContext } from '@feathersjs/feathers'
import { BadRequest } from '@feathersjs/errors'
import fetch from 'node-fetch'

import { extractLoggedInUserFromParams } from '../../user/auth-management/auth-management.utils'
import { collectionType } from '../../entities/collection-type/collectionType'
import config from '../../appconfig'
import StorageProvider from '../../media/storageprovider/storageprovider'
import { readJSONFromBlobStore } from './project-helper'

export default (options: any) => {
  return async (context: HookContext): Promise<HookContext> => {
    const seqeulizeClient = context.app.get('sequelizeClient')
    const models = seqeulizeClient.models
    const CollectionModel = models.collection
    const EntityModel = models.entity
    const StaticResourceModel = models.static_resource
    const ComponentModel = models.component
    const ComponentTypeModel = models.component_type
    const provider = new StorageProvider()
    const storage = provider.getStorage()
    const loggedInUser = extractLoggedInUserFromParams(context.params)

    // TODO: Get other scene data too if there is any parent too
    // Get the project JSON from s3
    // After creating of project, remove the owned_file of project json

    // Find the project owned_file from database
    const ownedFile = await StaticResourceModel.findOne({
      where: {
        id: context.data.ownedFileId
      },
      raw: true
    })

    if (!ownedFile) {
      return await Promise.reject(new BadRequest('Project File not found!'))
    }
    let sceneData
    if (config.server.storageProvider === 'aws') {
      sceneData = await fetch(ownedFile.url).then((res) => res.json())
    } else {
      sceneData = await readJSONFromBlobStore(storage, ownedFile.key)
    }
    if (!sceneData) return
    const savedCollection = await CollectionModel.create({
      //thumbnailOwnedFileId: context.data.thumbnailOwnedFileId,
      ownedfiles: JSON.stringify(context.data.ownedfiles),
      type: options.type ?? collectionType.scene,
      name: context.data.name,
      metadata: sceneData.metadata,
      version: sceneData.version,
      userId: loggedInUser.userId
    })

    const sceneEntitiesArray: any = []

    for (const prop in sceneData.entities) {
      sceneEntitiesArray.push({ entityId: prop, ...sceneData.entities[prop] })
    }

    const entites = sceneEntitiesArray.map((entity: any) => {
      entity.name = entity.name.toLowerCase()
      entity.collectionId = savedCollection.id
      return entity
    })

    const savedEntities = await EntityModel.bulkCreate(entites)

    const components: any = []
    const componentTypeSet = new Set()
    savedEntities.forEach((savedEntity: any, index: number) => {
      const entity = sceneEntitiesArray[index]
      entity.components.forEach((component: any) => {
        componentTypeSet.add(component.name.toLowerCase())
        components.push({
          data: component.props,
          entityId: savedEntity.id,
          type: component.name.toLowerCase(),
          userId: loggedInUser.userId,
          collection: savedCollection.id
          // TODO: Manage Static_RESOURCE
        })
      })
    })

    // Now we check if any of component-type is missing, then create that one
    let savedComponentTypes = await ComponentTypeModel.findAll({
      where: {
        type: Array.from(componentTypeSet)
      },
      raw: true,
      attributes: ['type']
    })

    savedComponentTypes = savedComponentTypes.map((item: any) => item.type)
    if (savedComponentTypes.length <= componentTypeSet.size) {
      let nonExistedComponentTypes = Array.from(componentTypeSet).filter(
        (item) => savedComponentTypes.indexOf(item) < 0
      )

      nonExistedComponentTypes = nonExistedComponentTypes.map((item) => {
        return {
          type: item
        }
      })
      await ComponentTypeModel.bulkCreate(nonExistedComponentTypes)
    }
    await ComponentModel.bulkCreate(components)

    // Remove the static-resource because entities and components have been extracted from that resource
    await StaticResourceModel.destroy({
      where: {
        id: ownedFile.id
      }
    })
    context.params.collection = savedCollection
    context.params.ownedFile = ownedFile
    return context
  }
}
