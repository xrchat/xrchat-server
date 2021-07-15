import EditorNodeMixin from './EditorNodeMixin'
import PhysicalHemisphereLight from '../../scene/classes/PhysicalHemisphereLight'
export default class HemisphereLightNode extends EditorNodeMixin(PhysicalHemisphereLight) {
  static legacyComponentName = 'hemisphere-light'
  static disableTransform = true
  static nodeName = 'Hemisphere Light'
  static canAddNode(editor) {
    return editor.scene.findNodeByType(HemisphereLightNode) === null
  }
  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)
    const { skyColor, groundColor, intensity } = json.components.find((c) => c.name === 'hemisphere-light').props
    node.skyColor.set(skyColor)
    node.groundColor.set(groundColor)
    node.intensity = intensity
    return node
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      'hemisphere-light': {
        skyColor: this.skyColor,
        groundColor: this.groundColor,
        intensity: this.intensity
      }
    })
  }
  prepareForExport() {
    super.prepareForExport()
    this.addGLTFComponent('hemisphere-light', {
      skyColor: this.skyColor,
      groundColor: this.groundColor,
      intensity: this.intensity
    })
    this.replaceObject()
  }
}
