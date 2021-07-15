import { Group } from 'three'
import EditorNodeMixin from './EditorNodeMixin'
export default class GroupNode extends EditorNodeMixin(Group) {
  static legacyComponentName = 'group'
  static nodeName = 'Group'
  async serialize(projectID) {
    return await super.serialize(projectID, {
      group: {}
    })
  }
}
