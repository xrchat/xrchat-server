import EditorNodeMixin from './EditorNodeMixin'
import PhysicalSpotLight from '../../scene/classes/PhysicalSpotLight'
import EditorSpotLightHelper from '../classes/EditorSpotLightHelper'
export default class SpotLightNode extends EditorNodeMixin(PhysicalSpotLight) {
  static legacyComponentName = 'spot-light'
  static nodeName = 'Spot Light'
  static ignoreRaycast = true
  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)
    const {
      color,
      intensity,
      range,
      innerConeAngle,
      outerConeAngle,
      castShadow,
      shadowMapResolution,
      shadowBias,
      shadowRadius
    } = json.components.find((c) => c.name === 'spot-light').props
    node.color.set(color)
    node.intensity = intensity
    node.range = range
    node.innerConeAngle = innerConeAngle
    node.outerConeAngle = outerConeAngle
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
    this.helper = new EditorSpotLightHelper(this)
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
          this.helper = new EditorSpotLightHelper(this)
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
      'spot-light': {
        color: this.color,
        intensity: this.intensity,
        range: this.range,
        innerConeAngle: this.innerConeAngle,
        outerConeAngle: this.outerConeAngle,
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
    this.addGLTFComponent('spot-light', {
      color: this.color,
      intensity: this.intensity,
      range: this.range,
      innerConeAngle: this.innerConeAngle,
      outerConeAngle: this.outerConeAngle,
      castShadow: this.castShadow,
      shadowMapResolution: this.shadowMapResolution.toArray(),
      shadowBias: this.shadowBias,
      shadowRadius: this.shadowRadius
    })
    this.replaceObject()
  }
}
