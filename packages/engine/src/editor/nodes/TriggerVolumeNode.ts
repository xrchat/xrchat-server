import { Material, BoxBufferGeometry, Object3D, Mesh, BoxHelper, Vector3 } from 'three'
import EditorNodeMixin from './EditorNodeMixin'
const requiredProperties = [
  'target',
  'enterComponent',
  'enterProperty',
  'enterValue',
  'leaveComponent',
  'leaveProperty',
  'leaveValue'
]
export default class TriggerVolumeNode extends EditorNodeMixin(Object3D) {
  static legacyComponentName = 'trigger-volume'
  static nodeName = 'Trigger Volume'
  static _geometry = new BoxBufferGeometry()
  static _material = new Material()
  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)
    const props = json.components.find((c) => c.name === 'trigger-volume').props
    node.target = props.target
    node.enterComponent = props.enterComponent
    node.enterProperty = props.enterProperty
    node.enterValue = props.enterValue
    node.leaveComponent = props.leaveComponent
    node.leaveProperty = props.leaveProperty
    node.leaveValue = props.leaveValue
    return node
  }
  constructor(editor) {
    super(editor)
    const boxMesh = new Mesh(TriggerVolumeNode._geometry, TriggerVolumeNode._material)
    const box = new BoxHelper(boxMesh, 0xffff00)
    box.layers.set(1)
    this.helper = box
    this.add(box)
    this.target = null
    this.enterComponent = null
    this.enterProperty = null
    this.enterValue = null
    this.leaveComponent = null
    this.leaveProperty = null
    this.leaveValue = null
  }
  copy(source, recursive = true) {
    if (recursive) {
      this.remove(this.helper)
    }
    super.copy(source, recursive)
    if (recursive) {
      const helperIndex = source.children.indexOf(source.helper)
      if (helperIndex !== -1) {
        this.helper = this.children[helperIndex]
      }
    }
    this.target = source.target
    this.enterComponent = source.enterComponent
    this.enterProperty = source.enterProperty
    this.enterValue = source.enterValue
    this.leaveComponent = source.leaveComponent
    this.leaveProperty = source.leaveProperty
    this.leaveValue = source.leaveValue
    return this
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      'trigger-volume': {
        target: this.target,
        enterComponent: this.enterComponent,
        enterProperty: this.enterProperty,
        enterValue: this.enterValue,
        leaveComponent: this.leaveComponent,
        leaveProperty: this.leaveProperty,
        leaveValue: this.leaveValue
      }
    })
  }
  prepareForExport() {
    super.prepareForExport()
    this.remove(this.helper)
    for (const prop of requiredProperties) {
      if (this[prop] === null || this[prop] === undefined) {
        console.warn(`TriggerVolumeNode: property "${prop}" is required. Skipping...`)
        return
      }
    }
    const scale = new Vector3()
    this.getWorldScale(scale)
    this.addGLTFComponent('trigger-volume', {
      size: { x: scale.x, y: scale.y, z: scale.z },
      target: this.gltfIndexForUUID(this.target),
      enterComponent: this.enterComponent,
      enterProperty: this.enterProperty,
      enterValue: this.enterValue,
      leaveComponent: this.leaveComponent,
      leaveProperty: this.leaveProperty,
      leaveValue: this.leaveValue
    })
  }
}
