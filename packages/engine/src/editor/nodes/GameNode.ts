import { Object3D, BoxBufferGeometry, Material, Mesh, BoxHelper } from 'three'
import EditorNodeMixin from './EditorNodeMixin'
export default class GameNode extends EditorNodeMixin(Object3D) {
  static legacyComponentName = 'game'
  static nodeName = 'Game'
  static _geometry = new BoxBufferGeometry()
  static _material = new Material()
  static async deserialize(editor, json) {
    console.log('Deserializing The GameNode')
    const node = await super.deserialize(editor, json)
    const { isGlobal, minPlayers, maxPlayers, gameObjects, gameMode, name } = json.components.find(
      (c) => c.name === 'game'
    ).props
    node.name = name
    node.isGlobal = isGlobal
    node.minPlayers = minPlayers
    node.maxPlayers = maxPlayers
    node.gameObjects = gameObjects
    node.gameMode = gameMode
    return node
  }
  constructor(editor) {
    super(editor)
    const boxMesh = new Mesh(GameNode._geometry, GameNode._material)
    const box = new BoxHelper(boxMesh, 0xff0000)
    box.layers.set(1)
    this.helper = box
    this.add(box)
  }
  copy(source, recursive = true) {
    if (recursive) {
      this.remove(this.helper)
    }
    super.copy(source, recursive)
    if (recursive) {
      const helperIndex = source.children.indexOf(source.helper)
      if (helperIndex !== -1) {
        const boxMesh = new Mesh(GameNode._geometry, GameNode._material)
        const box = new BoxHelper(boxMesh, 0xff0000) as any
        box.layers.set(1)
        this.helper = box
        box.parent = this
        this.children.splice(helperIndex, 1, box)
      }
    }
    return this
  }
  async serialize(projectID) {
    const components = {
      game: {
        id: this.id,
        position: {
          x: this.position.x,
          y: this.position.y,
          z: this.position.z
        },
        quaternion: {
          x: this.quaternion.x,
          y: this.quaternion.y,
          z: this.quaternion.z,
          w: this.quaternion.w
        },
        scale: {
          x: this.scale.x,
          y: this.scale.y,
          z: this.scale.z
        },
        name: this.name,
        isGlobal: this.isGlobal,
        minPlayers: this.minPlayers,
        maxPlayers: this.maxPlayers,
        gameObjects: this.gameObjects,
        gameMode: this.gameMode
      }
    } as any
    return await super.serialize(projectID, components)
  }
  prepareForExport() {
    super.prepareForExport()
    this.remove(this.helper)
    // this.addGLTFComponent("game", {
    //   // TODO: Remove exporting these properties. They are already included in the transform props.
    //   position: this.position,
    //   rotation: {
    //     x: this.rotation.x,
    //     y: this.rotation.y,
    //     z: this.rotation.z
    //   },
    //   scale: this.scale
    // });
  }
}
