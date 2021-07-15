import EditorNodeMixin from './EditorNodeMixin'
import Volumetric from '../../scene/classes/Volumetric'
import { RethrownError } from '../functions/errors'

// @ts-ignore
export default class VolumetricNode extends EditorNodeMixin(Volumetric) {
  static legacyComponentName = 'volumetric'
  static nodeName = 'Volumetric'
  // static initialElementProps = {
  //   src: new URL(editorLandingVolumetric, location as any).href
  // };
  static initialElementProps = {}
  static async deserialize(editor, json, loadAsync, onError) {
    const node = (await super.deserialize(editor, json)) as any
    const {
      src,
      controls,
      autoPlay,
      loop,
      audioType,
      volume,
      distanceModel,
      rolloffFactor,
      refDistance,
      maxDistance,
      coneInnerAngle,
      coneOuterAngle,
      coneOuterGain,
      projection
    } = json.components.find((c) => c.name === 'volumetric').props
    loadAsync(
      (async () => {
        await node.load(src, onError)
        node.controls = controls || false
        node.autoPlay = autoPlay
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
        node.projection = projection
      })()
    )
    return node
  }
  _canonicalUrl: string
  _autoPlay: boolean
  volume: number
  controls: boolean
  issues: any[]
  _mesh: any
  editor: any
  el: any
  onResize: any
  audioListener: any
  loop: any
  audioType: any
  distanceModel: any
  rolloffFactor: any
  refDistance: any
  maxDistance: any
  coneInnerAngle: any
  coneOuterAngle: any
  coneOuterGain: any
  projection: any
  uuid: any
  constructor(editor) {
    super(editor, editor.audioListener)
    this._canonicalUrl = ''
    this._autoPlay = true
    this.volume = 0.5
    this.controls = true
  }
  get src(): string {
    return this._canonicalUrl
  }
  set src(value) {
    this.load(value).catch(console.error)
  }
  get autoPlay(): any {
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
    this.issues = []
    this._mesh.visible = false
    this.hideErrorIcon()
    if (this.editor.playing) {
      ;(this.el as any).pause()
    }
    try {
    } catch (error) {
      this.showErrorIcon()
      const videoError = new RethrownError(`Error loading volumetric ${this._canonicalUrl}`, error)
      if (onError) {
        onError(this, videoError)
      }
      console.error(videoError)
      this.issues.push({ severity: 'error', message: 'Error loading volumetric.' })
    }
    this.editor.emit('objectsChanged', [this])
    this.editor.emit('selectionChanged')
    // this.hideLoadingCube();
    return this
  }
  onPlay(): void {
    if (this.autoPlay) {
      ;(this.el as any).play()
    }
  }
  onPause(): void {
    ;(this.el as any).pause()
    ;(this.el as any).currentTime = 0
  }
  onChange(): void {
    this.onResize()
  }
  clone(recursive): VolumetricNode {
    return new (this as any).constructor(this.editor, this.audioListener).copy(this, recursive)
  }
  copy(source, recursive = true): any {
    super.copy(source, recursive)
    this.controls = source.controls
    this._canonicalUrl = source._canonicalUrl
    return this
  }
  async serialize(projectID) {
    return await super.serialize(projectID, {
      volumetric: {
        src: this._canonicalUrl,
        controls: this.controls,
        autoPlay: this.autoPlay,
        loop: this.loop,
        audioType: this.audioType,
        volume: this.volume,
        distanceModel: this.distanceModel,
        rolloffFactor: this.rolloffFactor,
        refDistance: this.refDistance,
        maxDistance: this.maxDistance,
        coneInnerAngle: this.coneInnerAngle,
        coneOuterAngle: this.coneOuterAngle,
        coneOuterGain: this.coneOuterGain,
        projection: this.projection
      }
    })
  }
  prepareForExport(): void {
    super.prepareForExport()
    this.addGLTFComponent('volumetric', {
      src: this._canonicalUrl,
      controls: this.controls,
      autoPlay: this.autoPlay,
      loop: this.loop,
      audioType: this.audioType,
      volume: this.volume,
      distanceModel: this.distanceModel,
      rolloffFactor: this.rolloffFactor,
      refDistance: this.refDistance,
      maxDistance: this.maxDistance,
      coneInnerAngle: this.coneInnerAngle,
      coneOuterAngle: this.coneOuterAngle,
      coneOuterGain: this.coneOuterGain,
      projection: this.projection
    })
    this.addGLTFComponent('networked', {
      id: this.uuid
    })
    this.replaceObject()
  }
}
