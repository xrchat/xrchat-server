import collectAnalytics from '@xrengine/server-core/src/hooks/collect-analytics'
import * as authentication from '@feathersjs/authentication'
import { disallow } from 'feathers-hooks-common'
import { BadRequest } from '@feathersjs/errors'

import { collectionType } from '../../entities/collection-type/collectionType'
import { HookContext } from '@feathersjs/feathers'

import attachOwnerIdInBody from '@xrengine/server-core/src/hooks/set-loggedin-user-in-body'
import attachOwnerIdInQuery from '@xrengine/server-core/src/hooks/set-loggedin-user-in-query'
import generateSceneCollection from './generate-collection.hook'
import mapProjectIdToQuery from '@xrengine/server-core/src/hooks/set-project-id-in-query'
import removeRelatedResources from '@xrengine/server-core/src/hooks/remove-related-resources'
import setResourceIdFromProject from '@xrengine/server-core/src/hooks/set-resource-id-from-project'
import setResponseStatusCode from '@xrengine/server-core/src/hooks/set-response-status-code'

const { authenticate } = authentication.hooks

const mapProjectSaveData = () => {
  return (context: HookContext): HookContext => {
    context.data.ownedFileId = context.data.project.project_file_id
    context.data.name = context.data.project.name
    context.data.ownedUploadedFiles = {}
    Object.values(context.data.project.ownedUploadedFiles).forEach((value, index) => {
      context.data.ownedUploadedFiles[index] = value['file_id']
    })
    return context
  }
}

const validateCollectionData = () => {
  return async (context: HookContext): Promise<HookContext> => {
    if (!context?.data?.ownedFileId || !context?.data?.name || context?.data?.ownedUploadedFiles == {}) {
      return await Promise.reject(new BadRequest('Project Data is required!'))
    }
    return context
  }
}

export default {
  before: {
    all: [authenticate('jwt'), collectAnalytics()],
    find: [],
    get: [],
    create: [
      attachOwnerIdInBody('userId'),
      mapProjectSaveData(),
      validateCollectionData(),
      generateSceneCollection({ type: collectionType.project })
    ],
    update: [disallow()],
    patch: [attachOwnerIdInBody('userId'), mapProjectIdToQuery(), mapProjectSaveData(), validateCollectionData()],
    remove: [attachOwnerIdInQuery('userId'), setResourceIdFromProject(), removeRelatedResources()]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [
      // Editor is expecting 200, while feather is sending 201 for creation
      setResponseStatusCode(200)
    ],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
}
