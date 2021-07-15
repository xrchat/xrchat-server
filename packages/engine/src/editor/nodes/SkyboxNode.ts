import EditorNodeMixin from './EditorNodeMixin'
import { Sky } from '../../scene/classes/Sky'
import { Color, CubeTextureLoader, Mesh, PMREMGenerator, sRGBEncoding, TextureLoader } from 'three'

export type SkyBoxShaderProps = {
  turbidity: number
  rayleigh: number
  luminance: number
  mieCoefficient: number
  mieDirectionalG: number
  inclination: number
  azimuth: number
  distance: number
}

export enum SkyTypeEnum {
  'color',
  'cubemap',
  'equirectangular',
  'skybox'
}

export type SceneBackgroundProps = {
  backgroundColor: string
  equirectangularPath: string
  cubemapPath: string
  backgroundType: SkyTypeEnum
  skyboxProps: SkyBoxShaderProps
}

export default class SkyboxNode extends EditorNodeMixin(Sky) {
  static legacyComponentName = 'skybox'
  static disableTransform = true
  static ignoreRaycast = true
  static nodeName = 'Skybox'

  static handleEnvironmentMap = false

  turbidity = 10
  rayleigh = 2
  luminance = 1
  mieCoefficient = 0.005
  mieDirectionalG = 8.5
  inclination = 60
  azimuth = 0
  distance = 1

  backgroundType = SkyTypeEnum.skybox
  equirectangularPath = '/hdr/city.jpg'
  cubemapPath = '/cubemap/'
  backgroundColor = '#000000'

  constructor(editor) {
    super(editor)
  }

  static canAddNode(editor) {
    return editor.scene.findNodeByType(SkyboxNode) === null
  }

  async serialize(projectID) {
    const skybox: SceneBackgroundProps = {
      backgroundColor: this.backgroundColor,
      equirectangularPath: this.equirectangularPath,
      cubemapPath: this.cubemapPath,
      backgroundType: this.backgroundType,
      skyboxProps: {
        turbidity: this.turbidity,
        rayleigh: this.rayleigh,
        luminance: this.luminance,
        mieCoefficient: this.mieCoefficient,
        mieDirectionalG: this.mieDirectionalG,
        inclination: this.inclination,
        azimuth: this.azimuth,
        distance: this.distance
      }
    }

    return await super.serialize(projectID, { skybox })
  }

  static async deserialize(editor, json) {
    const node = (await super.deserialize(editor, json)) as SkyboxNode
    const skybox = json.components.find((c) => c.name === 'skybox')
    const prop = skybox.props as SceneBackgroundProps
    if (prop.skyboxProps) {
      node.backgroundColor = prop.backgroundColor
      node.equirectangularPath = prop.equirectangularPath
      node.cubemapPath = prop.cubemapPath
      node.backgroundType = prop.backgroundType
      node.turbidity = prop.skyboxProps.turbidity
      node.turbidity = prop.skyboxProps.turbidity
      node.rayleigh = prop.skyboxProps.rayleigh
      node.luminance = prop.skyboxProps.luminance
      node.mieCoefficient = prop.skyboxProps.mieCoefficient
      node.mieDirectionalG = prop.skyboxProps.mieDirectionalG
      node.inclination = prop.skyboxProps.inclination
      node.azimuth = prop.skyboxProps.azimuth
      node.distance = prop.skyboxProps.distance
    }

    return node
  }

  onChange() {
    this.setUpBackground(this.backgroundType)
  }

  onRemove() {
    this.editor.scene.background = new Color('black')
  }

  prepareForExport() {
    super.prepareForExport()
    const skybox: SceneBackgroundProps = {
      backgroundColor: this.backgroundColor,
      equirectangularPath: this.equirectangularPath,
      cubemapPath: this.cubemapPath,
      backgroundType: this.backgroundType,
      skyboxProps: {
        turbidity: this.turbidity,
        rayleigh: this.rayleigh,
        luminance: this.luminance,
        mieCoefficient: this.mieCoefficient,
        mieDirectionalG: this.mieDirectionalG,
        inclination: this.inclination,
        azimuth: this.azimuth,
        distance: this.distance
      }
    }
    this.addGLTFComponent('skybox', skybox)
    this.replaceObject()
  }

  setUpBackground(type: SkyTypeEnum) {
    if (this.editor.scene.background?.dispose) this.editor.scene.background.dispose()
    ;(this.sky as Mesh).visible = false

    switch (type) {
      case SkyTypeEnum.color:
        this.editor.scene.background = new Color(this.backgroundColor)
        break

      case SkyTypeEnum.cubemap:
        const negx = 'negx.jpg'
        const negy = 'negy.jpg'
        const negz = 'negz.jpg'
        const posx = 'posx.jpg'
        const posy = 'posy.jpg'
        const posz = 'posz.jpg'
        const renderer = this.editor.renderer.renderer
        new CubeTextureLoader().setPath(this.cubemapPath).load(
          [posx, negx, posy, negy, posz, negz],
          (texture) => {
            texture.encoding = sRGBEncoding
            this.editor.scene.background = texture
          },
          (res) => {
            console.log(res)
          },
          (erro) => {
            console.warn('Skybox texture could not be found!', erro)
          }
        )
        break

      case SkyTypeEnum.equirectangular:
        new TextureLoader().load(this.equirectangularPath, (texture) => {
          texture.encoding = sRGBEncoding
          this.editor.scene.background = new PMREMGenerator(this.editor.renderer.renderer).fromEquirectangular(
            texture
          ).texture
        })
        break
      default:
        ;(this.sky as Mesh).visible = true
        this.editor.scene.background = this.generateSkybox(this.editor.renderer.renderer)
        break
    }
  }
}
