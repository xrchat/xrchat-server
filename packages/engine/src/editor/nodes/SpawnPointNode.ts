import { BoxBufferGeometry, BoxHelper, Group, Mesh, Object3D, Quaternion, Vector3 } from 'three'
import { LoadGLTF } from '../../assets/functions/LoadGLTF'
import EditorNodeMixin from './EditorNodeMixin'

// TODO: add circle option

let spawnPointHelperModel = null
const GLTF_PATH = '/editor/spawn-point.glb' // Static

export default class SpawnPointNode extends EditorNodeMixin(Object3D) {
  static legacyComponentName = 'spawn-point'
  static nodeName = 'Spawn Point'
  static async load() {
    const { scene } = await LoadGLTF(GLTF_PATH)
    spawnPointHelperModel = scene
  }

  helperBox: BoxHelper
  helperModel: Group

  constructor(editor) {
    super(editor)
    if (spawnPointHelperModel) {
      this.helperModel = spawnPointHelperModel.clone()
      this.add(this.helperModel)
    } else {
      console.warn('SpawnPointNode: helper model was not loaded before creating a new SpawnPointNode')
      this.helperModel = null
    }
    this.helperBox = new BoxHelper(new Mesh(new BoxBufferGeometry(1, 0, 1).translate(0, 0, 0)), 0xffffff)
    this.add(this.helperBox)
  }

  copy(source, recursive = true) {
    if (recursive) {
      this.remove(this.helperModel)
      this.remove(this.helperBox)
    }
    super.copy(source, recursive)
    if (recursive) {
      const helperIndex = source.children.findIndex((child) => child === source.helper)
      if (helperIndex !== -1) {
        this.helperModel = this.children[helperIndex]
      }
    }
    return this
  }

  onChange(prop: string) {
    this.helperModel.scale.set(1 / this.scale.x, 1 / this.scale.y, 1 / this.scale.z)
  }

  async serialize(projectID) {
    return await super.serialize(projectID, {
      'spawn-point': {}
    })
  }

  prepareForExport() {
    super.prepareForExport()
    this.remove(this.helperModel)
    this.remove(this.helperBox)
    this.addGLTFComponent('spawn-point', {})
  }
}
