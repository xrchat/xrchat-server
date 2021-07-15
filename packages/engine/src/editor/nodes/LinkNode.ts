import EditorNodeMixin from './EditorNodeMixin'
import { Object3D, PlaneBufferGeometry, MeshBasicMaterial, Mesh, DoubleSide } from 'three'
import loadTexture from '../functions/loadTexture'
let linkHelperTexture = null
export default class LinkNode extends EditorNodeMixin(Object3D) {
  static legacyComponentName = 'link'
  static nodeName = 'Link'
  static async load() {
    linkHelperTexture = await loadTexture('/editor/link-icon.png')
  }
  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json)
    const { href } = json.components.find((c) => c.name === 'link').props
    node.href = href
    return node
  }
  constructor(editor) {
    super(editor)
    this.href = ''
    const geometry = new PlaneBufferGeometry()
    const material = new MeshBasicMaterial()
    material.map = linkHelperTexture
    material.side = DoubleSide
    material.transparent = true
    this.helper = new Mesh(geometry, material)
    this.helper.layers.set(1)
    this.add(this.helper)
  }
  copy(source, recursive = true) {
    if (recursive) {
      this.remove(this.helper)
    }
    super.copy(source, recursive)
    if (recursive) {
      const helperIndex = source.children.findIndex((child) => child === source.helper)
      if (helperIndex !== -1) {
        this.helper = this.children[helperIndex]
      }
    }
    this.href = source.href
    return this
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      link: {
        href: this.href
      }
    })
  }
  prepareForExport() {
    super.prepareForExport()
    this.remove(this.helper)
    this.addGLTFComponent('link', {
      href: this.href
    })
    this.addGLTFComponent('networked', {
      id: this.uuid
    })
    this.replaceObject()
  }
}
