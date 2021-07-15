import { AmbientLight } from 'three'
import EditorNodeMixin from './EditorNodeMixin'
export default class AmbientLightNode extends EditorNodeMixin(AmbientLight) {
  static legacyComponentName = 'ambient-light'
  static nodeName = 'Ambient Light'
  static disableTransform = true
  static canAddNode(editor) {
    return editor.scene.findNodeByType(AmbientLightNode) === null
  }
  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)
    const { color, intensity } = json.components.find((c) => c.name === 'ambient-light').props
    node.color.set(color)
    node.intensity = intensity
    return node
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      'ambient-light': {
        color: this.color,
        intensity: this.intensity
      }
    })
  }
  prepareForExport() {
    super.prepareForExport()
    this.addGLTFComponent('ambient-light', {
      color: this.color,
      intensity: this.intensity
    })
    this.replaceObject()
  }
}
