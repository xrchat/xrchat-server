import { BoxBufferGeometry, BufferGeometry, Euler, Mesh, MeshNormalMaterial, Quaternion, Vector3 } from 'three'
import EditorNodeMixin from './EditorNodeMixin'
import Model from '../../scene/classes/Model'
import { Engine } from '../../ecs/classes/Engine'

export default class PortalNode extends EditorNodeMixin(Model) {
  static legacyComponentName = 'portal'
  static nodeName = 'Portal'

  mesh: Mesh
  location: string
  displayText: string
  spawnPosition: Vector3 = new Vector3()
  spawnRotation: Euler = new Euler()

  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)
    const portalComponent = json.components.find((c) => c.name === 'portal')
    if (portalComponent) {
      node.location = portalComponent.props.location
      node.displayText = portalComponent.props.displayText
      node.spawnPosition = new Vector3()
      if (portalComponent.props.spawnPosition)
        node.spawnPosition.set(
          portalComponent.props.spawnPosition.x,
          portalComponent.props.spawnPosition.y,
          portalComponent.props.spawnPosition.z
        )
      node.spawnRotation = new Euler()
      if (portalComponent.props.spawnRotation)
        node.spawnRotation.set(
          portalComponent.props.spawnRotation.x,
          portalComponent.props.spawnRotation.y,
          portalComponent.props.spawnRotation.z
        )
    }
    return node
  }
  constructor(editor) {
    super(editor)
    this.loadGLTF(Engine.publicPath + '/models/common/portal_frame.glb').then((model) => {
      this.mesh = model
      this.add(this.mesh)
    })
  }
  copy(source, recursive = true) {
    if (recursive) {
      this.remove(this.mesh)
    }
    super.copy(source, recursive)
    this.location = source.location
    this.displayText = source.displayText
    return this
  }
  async serialize(projectID) {
    const components = {
      portal: {
        location: this.location,
        displayText: this.displayText,
        spawnPosition: this.spawnPosition,
        spawnRotation: this.spawnRotation
      }
    } as any
    return await super.serialize(projectID, components)
  }
  prepareForExport() {
    super.prepareForExport()
    this.remove(this.helper)
    this.addGLTFComponent('portal', {
      location: this.location,
      displayText: this.displayText,
      spawnPosition: this.spawnPosition,
      spawnRotation: this.spawnRotation
    })
  }
}
