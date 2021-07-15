import { Object3D, BoxBufferGeometry, Material, Mesh, BoxHelper } from 'three'
import EditorNodeMixin from './EditorNodeMixin'
export default class BoxColliderNode extends EditorNodeMixin(Object3D) {
  static legacyComponentName = 'box-collider'
  static nodeName = 'Box Collider'
  static _geometry = new BoxBufferGeometry()
  static _material = new Material()

  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)

    const gameObject = json.components.find((c) => c.name === 'game-object')

    if (gameObject) {
      node.target = gameObject.props.target
      node.role = gameObject.props.role
    }

    const boxCollider = json.components.find((c) => c.name === 'box-collider')

    if (boxCollider) {
      node.isTrigger = boxCollider.props.isTrigger
    }

    return node
  }

  constructor(editor) {
    super(editor)
    const boxMesh = new Mesh(BoxColliderNode._geometry, BoxColliderNode._material)
    const box = new BoxHelper(boxMesh, 0x00ff00)
    box.layers.set(1)
    this.helper = box
    this.add(box)
    this.isTrigger = false
  }
  copy(source, recursive = true) {
    if (recursive) {
      this.remove(this.helper)
    }
    super.copy(source, recursive)
    if (recursive) {
      const helperIndex = source.children.indexOf(source.helper)
      if (helperIndex !== -1) {
        const boxMesh = new Mesh(BoxColliderNode._geometry, BoxColliderNode._material)
        const box = new BoxHelper(boxMesh, 0x00ff00) as any
        box.layers.set(1)
        this.helper = box
        box.parent = this
        this.children.splice(helperIndex, 1, box)
      }
    }
    this.isTrigger = source.isTrigger
    return this
  }
  async serialize(projectID) {
    const components = {
      'box-collider': {
        type: this.target === undefined ? 'box' : 'game-object',
        isTrigger: this.isTrigger,
        mass: 0,
        position: this.position,
        quaternion: {
          x: this.quaternion.x,
          y: this.quaternion.y,
          z: this.quaternion.z,
          w: this.quaternion.w
        },
        scale: {
          x: this.scale.x / 2,
          y: this.scale.y / 2,
          z: this.scale.z / 2
        }
      }
    } as any

    if (this.target != undefined) {
      components['game-object'] = {
        gameName: this.editor.nodes.find((node) => node.uuid === this.target).name,
        role: this.role,
        target: this.target
      }
    }
    return await super.serialize(projectID, components)
  }
  prepareForExport() {
    super.prepareForExport()
    this.remove(this.helper)
    this.addGLTFComponent('box-collider', {
      // TODO: Remove exporting these properties. They are already included in the transform props.
      type: this.target === undefined ? 'box' : 'game-object',
      isTrigger: this.isTrigger,
      position: this.position,
      rotation: {
        x: this.rotation.x,
        y: this.rotation.y,
        z: this.rotation.z
      },
      scale: this.scale
    })
    if (this.target != undefined) {
      this.addGLTFComponent('game-object', {
        gameName: this.editor.nodes.find((node) => node.uuid === this.target).name,
        role: this.role,
        target: this.target
      })
    }
  }
}
