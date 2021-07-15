import EditorNodeMixin from './EditorNodeMixin'
import PhysicalDirectionalLight from '../../scene/classes/PhysicalDirectionalLight'
import EditorDirectionalLightHelper from '../classes/EditorDirectionalLightHelper'
export default class DirectionalLightNode extends EditorNodeMixin(PhysicalDirectionalLight) {
  static legacyComponentName = 'directional-light'
  static nodeName = 'Directional Light'
  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)
    const { color, intensity, castShadow, shadowMapResolution, shadowBias, shadowRadius } = json.components.find(
      (c) => c.name === 'directional-light'
    ).props
    node.color.set(color)
    node.intensity = intensity
    node.castShadow = castShadow
    node.shadowBias = shadowBias || 0
    node.shadowRadius = shadowRadius === undefined ? 1 : shadowRadius
    if (shadowMapResolution) {
      node.shadowMapResolution.fromArray(shadowMapResolution)
    }
    return node
  }
  constructor(editor) {
    super(editor)
    this.helper = new EditorDirectionalLightHelper(this)
    this.helper.visible = false
    this.add(this.helper)
  }
  onAdd() {
    this.helper.update()
  }
  onChange() {
    this.helper.update()
  }
  onSelect() {
    this.helper.visible = true
  }
  onDeselect() {
    this.helper.visible = false
  }
  copy(source, recursive = true) {
    super.copy(source, false)
    if (recursive) {
      this.remove(this.helper)
      this.remove(this.target)
      for (let i = 0; i < source.children.length; i++) {
        const child = source.children[i]
        if (child === source.helper) {
          this.helper = new EditorDirectionalLightHelper(this)
          this.add(this.helper)
        } else if (child === source.target) {
          this.target = child.clone()
          this.add(this.target)
        } else {
          this.add(child.clone())
        }
      }
    }
    return this
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      'directional-light': {
        color: this.color,
        intensity: this.intensity,
        castShadow: this.castShadow,
        shadowMapResolution: this.shadowMapResolution.toArray(),
        shadowBias: this.shadowBias,
        shadowRadius: this.shadowRadius
      }
    })
  }
  prepareForExport() {
    super.prepareForExport()
    this.remove(this.helper)
    this.addGLTFComponent('directional-light', {
      color: this.color,
      intensity: this.intensity,
      castShadow: this.castShadow,
      shadowMapResolution: this.shadowMapResolution.toArray(),
      shadowBias: this.shadowBias,
      shadowRadius: this.shadowRadius
    })
    this.replaceObject()
  }
}
