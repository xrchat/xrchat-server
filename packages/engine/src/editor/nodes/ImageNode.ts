import EditorNodeMixin from './EditorNodeMixin'
import Image, { ImageAlphaMode } from '../../scene/classes/Image'
import { RethrownError } from '../functions/errors'
// @ts-ignore
export default class ImageNode extends EditorNodeMixin(Image) {
  static legacyComponentName = 'image'
  static nodeName = 'Image'
  static initialElementProps = {
    src: new URL('/editor/dot.png', location as any).href
  }
  static async deserialize(editor, json, loadAsync, onError) {
    const node = await super.deserialize(editor, json)
    const { src, projection, controls, alphaMode, alphaCutoff } = json.components.find((c) => c.name === 'image').props
    loadAsync(
      (async () => {
        await node.load(src, onError)
        node.controls = controls || false
        node.alphaMode = alphaMode === undefined ? ImageAlphaMode.Blend : alphaMode
        node.alphaCutoff = alphaCutoff === undefined ? 0.5 : alphaCutoff
        node.projection = projection
      })()
    )
    return node
  }
  constructor(editor) {
    super(editor)
    this._canonicalUrl = ''
    this.controls = true
  }
  get src() {
    return this._canonicalUrl
  }
  set src(value) {
    this.load(value).catch(console.error)
  }
  onChange() {
    this.onResize()
  }
  loadTexture(src) {
    return this.editor.textureCache.get(src)
  }
  async load(src, onError?) {
    const nextSrc = src || ''
    if (nextSrc === this._canonicalUrl && nextSrc !== '') {
      return
    }
    this._canonicalUrl = nextSrc
    this.issues = []
    this._mesh.visible = false
    this.hideErrorIcon()
    try {
      const { url } = await this.editor.api.resolveMedia(src)
      await super.load(url)
    } catch (error) {
      this.showErrorIcon()
      const imageError = new RethrownError(`Error loading image ${this._canonicalUrl}`, error)
      if (onError) {
        onError(this, imageError)
      }
      console.error(imageError)
      this.issues.push({ severity: 'error', message: 'Error loading image.' })
    }
    this.editor.emit('objectsChanged', [this])
    this.editor.emit('selectionChanged')
    // this.hideLoadingCube();
    return this
  }
  copy(source, recursive = true) {
    super.copy(source, recursive)
    this.controls = source.controls
    this.alphaMode = source.alphaMode
    this.alphaCutoff = source.alphaCutoff
    this._canonicalUrl = source._canonicalUrl
    return this
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      image: {
        src: this._canonicalUrl,
        controls: this.controls,
        alphaMode: this.alphaMode,
        alphaCutoff: this.alphaCutoff,
        projection: this.projection
      }
    })
  }
  prepareForExport() {
    super.prepareForExport()
    const imageData = {
      src: this._canonicalUrl,
      controls: this.controls,
      alphaMode: this.alphaMode,
      projection: this.projection
    }
    if (this.alphaMode === ImageAlphaMode.Mask) {
      imageData['alphaCutoff'] = this.alphaCutoff
    }
    this.addGLTFComponent('image', imageData)
    this.addGLTFComponent('networked', {
      id: this.uuid
    })
    this.replaceObject()
  }
}
