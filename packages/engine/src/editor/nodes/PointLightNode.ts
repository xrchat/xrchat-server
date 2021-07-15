// @ts-nocheck

import EditorNodeMixin from './EditorNodeMixin'
import EditorPointLightHelper from '../classes/EditorPointLightHelper'
import PhysicalPointLight from '../../scene/classes/PhysicalPointLight'
export default class PointLightNode extends EditorNodeMixin(PhysicalPointLight) {
  static legacyComponentName = 'point-light'
  static nodeName = 'Point Light'
  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)
    const { color, intensity, range, castShadow, shadowMapResolution, shadowBias, shadowRadius } = json.components.find(
      (c) => c.name === 'point-light'
    ).props
    node.color.set(color)
    node.intensity = intensity
    node.range = range
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
    this.helper = new EditorPointLightHelper(this)
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
      for (let i = 0; i < source.children.length; i++) {
        const child = source.children[i]
        if (child === source.helper) {
          this.helper = new EditorPointLightHelper(this)
          this.add(this.helper)
        } else {
          this.add(child.clone())
        }
      }
    }
    return this
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      'point-light': {
        color: this.color,
        intensity: this.intensity,
        range: this.range,
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
    this.addGLTFComponent('point-light', {
      color: this.color,
      intensity: this.intensity,
      range: this.range,
      castShadow: this.castShadow,
      shadowMapResolution: this.shadowMapResolution.toArray(),
      shadowBias: this.shadowBias,
      shadowRadius: this.shadowRadius
    })
    this.replaceObject()
  }
}
