import { HookContext } from '@feathersjs/feathers'
import { v1 as uuidv1 } from 'uuid'
import config from '../appconfig'
import getBasicMimetype from '../util/get-basic-mimetype'

export default () => {
  return async (context: HookContext): Promise<HookContext> => {
    const { data, params } = context
    const body = params.body || {}

    const domain: string =
      config.server.storageProvider === 'aws' &&
      config.aws.cloudfront.domain != '' &&
      config.aws.cloudfront.domain != undefined
        ? config.aws.cloudfront.domain
        : config.server.localStorageProvider

    let savedFile
    if (body.projectId && context.params.imageIdentifier) {
      // Update File instead of creating a new one if project exists to avoid orphan resources
      savedFile = await context.app.service('static-resource').patch(context.params.imageIdentifier, {
        url: data.uri || data.url,
        key: (data.uri || data.url).replace(`https://${domain}/`, '')
      })
    } else {
      const resourceData = {
        id: body.fileId,
        name: data.name || body.name,
        url: data.uri || data.url,
        key: (data.uri || data.url).replace(`https://${domain}/`, ''),

        content_type: data.mimeType || params.mimeType,
        userId: body.userId,
        metadata: data.metadata || body.metadata
      }

      /* if (context.params.skipResourceCreation === true) {
          context.result = await context.app.service('owned-file').patch(context.params.patchId, {
            url: resourceData.url,
            metadata: resourceData.metadata
          })
        } else { */
      if (context.params.parentResourceId) {
        ;(resourceData as any).parentResourceId = context.params.parentResourceId
      }
      ;(resourceData as any).type = getBasicMimetype(resourceData.content_type)

      // Remap input from Editor to fit
      const modifiedResourceData = {
        ...resourceData,
        mimeType: resourceData.content_type
      }
      savedFile = await context.app.service('static-resource').create(modifiedResourceData)
    }
    context.result = {
      // This is to fulfill the editor response, as editor is expecting the below object
      file_id: savedFile.id,
      meta: {
        access_token: uuidv1(), // TODO: authenticate upload with bearer token
        expected_content_type: savedFile.mimeType,
        promotion_token: null
      },
      origin: savedFile.url
    }
    // }
    return context
  }
}
