import { HookContext } from '@feathersjs/feathers'

export default () => {
  return async (context: HookContext): Promise<HookContext> => {
    if (context.params.body.projectId && context.params.body.imageIdentifier) {
      const { ownedUploadedFiles } = await (context.app.service('collection') as any).Model.findOne({
        where: {
          sid: context.params.body.projectId
        }
      })
      context.params.imageIdentifier = ownedUploadedFiles.imageIdentifier
    }
    return context
  }
}
