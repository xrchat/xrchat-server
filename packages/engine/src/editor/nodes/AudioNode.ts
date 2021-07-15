import EditorNodeMixin from './EditorNodeMixin'
import { PlaneBufferGeometry, MeshBasicMaterial, Mesh, DoubleSide } from 'three'

import loadTexture from '../functions/loadTexture'
import { RethrownError } from '../functions/errors'
import AudioSource from '../../scene/classes/AudioSource'
let audioHelperTexture = null
// @ts-ignore
export default class AudioNode extends EditorNodeMixin(AudioSource) {
  static legacyComponentName = 'audio'
  static nodeName = 'Audio'
  static async load() {
    audioHelperTexture = await loadTexture('/editor/audio-icon.png')
  }
  static async deserialize(editor, json, loadAsync, onError) {
    const node = await super.deserialize(editor, json)
    const {
      src,
      controls,
      autoPlay,
      synchronize,
      loop,
      audioType,
      volume,
      distanceModel,
      rolloffFactor,
      refDistance,
      maxDistance,
      coneInnerAngle,
      coneOuterAngle,
      coneOuterGain
    } = json.components.find((c) => c.name === 'audio').props
    loadAsync(
      (async () => {
        await node.load(src, onError)
        node.controls = controls || false
        node.autoPlay = autoPlay
        node.synchronize = synchronize
        node.loop = loop
        node.audioType = audioType
        node.volume = volume
        node.distanceModel = distanceModel
        node.rolloffFactor = rolloffFactor
        node.refDistance = refDistance
        node.maxDistance = maxDistance
        node.coneInnerAngle = coneInnerAngle
        node.coneOuterAngle = coneOuterAngle
        node.coneOuterGain = coneOuterGain
      })()
    )
    return node
  }
  constructor(editor) {
    super(editor, editor.audioListener)
    this._canonicalUrl = ''
    this._autoPlay = true
    this.volume = 0.5
    this.controls = true
    const geometry = new PlaneBufferGeometry()
    const material = new MeshBasicMaterial()
    material.map = audioHelperTexture
    material.side = DoubleSide
    material.transparent = true
    this.helper = new Mesh(geometry, material)
    this.helper.layers.set(1)
    this.add(this.helper)
  }
  get src() {
    return this._canonicalUrl
  }
  set src(value) {
    this.load(value).catch(console.error)
  }
  get autoPlay() {
    return this._autoPlay
  }
  set autoPlay(value) {
    this._autoPlay = value
  }
  async load(src, onError?) {
    const nextSrc = src || ''
    if (nextSrc === this._canonicalUrl && nextSrc !== '') {
      return
    }
    this._canonicalUrl = src || ''
    this.helper.visible = false
    this.hideErrorIcon()
    if (this.editor.playing) {
      ;(this.el as any).pause()
    }
    try {
      const { url, contentType } = await this.editor.api.resolveMedia(src)
      await super.load(url, contentType)
      if (this.editor.playing && this.autoPlay) {
        ;(this.el as any).play()
      }
      this.helper.visible = true
    } catch (error) {
      this.showErrorIcon()
      const audioError = new RethrownError(`Error loading audio ${this._canonicalUrl}`, error)
      if (onError) {
        onError(this, audioError)
      }
      console.error(audioError)
    }
    this.editor.emit('objectsChanged', [this])
    this.editor.emit('selectionChanged')
    // this.hideLoadingCube();
    return this
  }
  onPlay() {
    if (this.autoPlay) {
      ;(this.el as any).play()
    }
  }
  onPause() {
    ;(this.el as any).pause()
    ;(this.el as any).currentTime = 0
  }
  clone(recursive) {
    return new (this as any).constructor(this.editor, this.audioListener).copy(this, recursive)
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
    this._canonicalUrl = source._canonicalUrl
    this.controls = source.controls
    return this
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      audio: {
        src: this._canonicalUrl,
        controls: this.controls,
        autoPlay: this.autoPlay,
        synchronize: this.synchronize,
        loop: this.loop,
        audioType: this.audioType,
        volume: this.volume,
        distanceModel: this.distanceModel,
        rolloffFactor: this.rolloffFactor,
        refDistance: this.refDistance,
        maxDistance: this.maxDistance,
        coneInnerAngle: this.coneInnerAngle,
        coneOuterAngle: this.coneOuterAngle,
        coneOuterGain: this.coneOuterGain
      }
    })
  }
  prepareForExport() {
    super.prepareForExport()
    this.remove(this.helper)
    this.addGLTFComponent('audio', {
      src: this._canonicalUrl,
      controls: this.controls,
      autoPlay: this.autoPlay,
      synchronize: this.synchronize,
      loop: this.loop,
      audioType: this.audioType,
      volume: this.volume,
      distanceModel: this.distanceModel,
      rolloffFactor: this.rolloffFactor,
      refDistance: this.refDistance,
      maxDistance: this.maxDistance,
      coneInnerAngle: this.coneInnerAngle,
      coneOuterAngle: this.coneOuterAngle,
      coneOuterGain: this.coneOuterGain
    })
    this.addGLTFComponent('networked', {
      id: this.uuid
    })
    this.replaceObject()
  }
}
