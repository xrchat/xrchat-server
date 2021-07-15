import { Box3, Sphere, PropertyBinding, BufferGeometry, MathUtils, Matrix4, Quaternion, Vector3, Object3D } from 'three'
import Model from '../../scene/classes/Model'
import EditorNodeMixin from './EditorNodeMixin'
import { setStaticMode, StaticModes } from '../functions/StaticMode'
import cloneObject3D from '../functions/cloneObject3D'
import { RethrownError } from '../functions/errors'
import { clearFromColliders, plusParameter } from '../../physics/behaviors/parseModelColliders'
import { parseCarModel } from '../../vehicle/prefabs/NetworkVehicle'
import { getGeometry } from '../../scene/functions/getGeometry'
import { AnimationManager } from '../../character/AnimationManager'

export default class ModelNode extends EditorNodeMixin(Model) {
  static nodeName = 'Model'
  static legacyComponentName = 'gltf-model'
  static initialElementProps = {
    initialScale: 'fit',
    src: ''
  }

  meshColliders = []
  vehicleObject = []

  static async deserialize(editor, json, loadAsync, onError) {
    const node = await super.deserialize(editor, json)
    loadAsync(
      (async () => {
        const { src, envMapOverride, textureOverride } = json.components.find((c) => c.name === 'gltf-model').props

        const gameObject = json.components.find((c) => c.name === 'game-object')

        if (gameObject) {
          node.target = gameObject.props.target
          node.role = gameObject.props.role
        }
        // its need be first then load
        node.saveColliders = !!json.components.find((c) => c.name === 'mesh-collider-0')

        await node.load(src, onError)
        if (node.envMapOverride) node.envMapOverride = envMapOverride
        if (textureOverride)
          editor.scene.traverse((obj) => {
            if (obj.uuid === textureOverride) node.textureOverride = obj.uuid
          })

        node.collidable = !!json.components.find((c) => c.name === 'collidable')
        node.walkable = !!json.components.find((c) => c.name === 'walkable')
        const loopAnimationComponent = json.components.find((c) => c.name === 'loop-animation')
        if (loopAnimationComponent && loopAnimationComponent.props) {
          const { clip, activeClipIndex, hasAvatarAnimations } = loopAnimationComponent.props
          node.hasAvatarAnimations = hasAvatarAnimations
          if (activeClipIndex !== undefined) {
            node.activeClipIndex = loopAnimationComponent.props.activeClipIndex
          } else if (clip !== undefined && node.model && node.model.animations) {
            // DEPRECATED: Old loop-animation component stored the clip name rather than the clip index
            // node.activeClipIndex = node.model.animations.findIndex(
            //   animation => animation.name === clip
            // );
            const clipIndex = node.model.animations.findIndex((animation) => animation.name === clip)

            if (clipIndex !== -1) {
              node.activeClipIndices = [clipIndex]
            }
          }
        }
        const shadowComponent = json.components.find((c) => c.name === 'shadow')
        if (shadowComponent) {
          node.castShadow = shadowComponent.props.cast
          node.receiveShadow = shadowComponent.props.receive
        }
        const ineractableComponent = json.components.find((c) => c.name === 'interact')

        if (ineractableComponent) {
          node.interactable = ineractableComponent.props.interactable
          node.interactionType = ineractableComponent.props.interactionType
          node.interactionText = ineractableComponent.props.interactionText
          node.interactionDistance = ineractableComponent.props.interactionDistance
          node.payloadName = ineractableComponent.props.payloadName
          node.payloadUrl = ineractableComponent.props.payloadUrl
          node.payloadBuyUrl = ineractableComponent.props.payloadBuyUrl
          node.payloadLearnMoreUrl = ineractableComponent.props.payloadLearnMoreUrl
          node.payloadHtmlContent = ineractableComponent.props.payloadHtmlContent
          node.payloadUrl = ineractableComponent.props.payloadUrl
        }
      })()
    )
    return node
  }

  _canonicalUrl = ''
  envMapOverride = ''
  textureOverride = ''
  collidable = true
  saveColliders = true
  target = null
  walkable = true
  initialScale: string | number = 1
  boundingBox = new Box3()
  boundingSphere = new Sphere()
  gltfJson = null
  isValidURL = false

  constructor(editor) {
    super(editor)
  }
  // Overrides Model's src property and stores the original (non-resolved) url.
  get src(): string {
    return this._canonicalUrl
  }
  // When getters are overridden you must also override the setter.
  set src(value: string) {
    this.load(value).catch(console.error)
  }
  reload() {
    console.log('reload')
    this.load(this.src).catch(console.error)
  }
  // Overrides Model's loadGLTF method and uses the Editor's gltf cache.
  async loadGLTF(src) {
    const loadPromise = this.editor.gltfCache.get(src)
    const { scene, json } = await loadPromise
    this.gltfJson = json
    const clonedScene = cloneObject3D(scene)
    return clonedScene
  }
  // Overrides Model's load method and resolves the src url before loading.
  async load(src, onError?) {
    const nextSrc = src || ''
    if (nextSrc === '') {
      return
    }
    this._canonicalUrl = nextSrc
    this.issues = []
    this.gltfJson = null
    if (this.model) {
      this.editor.renderer.removeBatchedObject(this.model)
      this.remove(this.model)
      this.model = null
    }
    this.hideErrorIcon()
    try {
      this.isValidURL = true
      const { url, files } = await this.editor.api.resolveMedia(src)
      if (this.model) {
        this.editor.renderer.removeBatchedObject(this.model)
      }
      await super.load(url)

      if (this.initialScale === 'fit') {
        this.scale.set(1, 1, 1)
        if (this.model) {
          this.updateMatrixWorld()
          this.boundingBox.setFromObject(this.model)
          this.boundingBox.getBoundingSphere(this.boundingSphere)
          const diameter = this.boundingSphere.radius * 2
          if ((diameter > 1000 || diameter < 0.1) && diameter !== 0) {
            // Scale models that are too big or to small to fit in a 1m bounding sphere.
            const scaleFactor = 1 / diameter
            this.scale.set(scaleFactor, scaleFactor, scaleFactor)
          } else if (diameter > 20) {
            // If the bounding sphere of a model is over 20m in diameter, assume that the model was
            // exported with units as centimeters and convert to meters.
            // disabled this because we import scenes that are often bigger than this threshold
            // this.scale.set(0.01, 0.01, 0.01);
          }
        }
        // Clear scale to fit property so that the swapped model maintains the same scale.
        this.initialScale = 1
      } else {
        this.scale.multiplyScalar(this.initialScale)
        this.initialScale = 1
      }
      if (this.model) {
        this.model.traverse((object) => {
          if (object.material && object.material.isMeshStandardMaterial) {
            object.material.envMap = this.editor.scene.environmentMap
            object.material.needsUpdate = true
          }
        })
      }
      if (this.saveColliders) clearFromColliders(this.model, true)
      this.updateStaticModes()
    } catch (error) {
      this.showErrorIcon()
      const modelError = new RethrownError(`Error loading model "${this._canonicalUrl}"`, error)
      if (onError) {
        onError(this, modelError)
      }
      console.error(modelError)
      this.issues.push({ severity: 'error', message: 'Error loading model.' })
      this.isValidURL = false
      //this._canonicalUrl = "";
    }
    this.editor.emit('objectsChanged', [this])
    this.editor.emit('selectionChanged')
    // this.hideLoadingCube();
    return this
  }
  onAdd() {
    if (this.model) {
      this.editor.renderer.addBatchedObject(this.model)
    }
  }
  onRemove() {
    if (this.model) {
      this.editor.renderer.removeBatchedObject(this.model)
    }
  }
  onPlay() {
    this.playAnimation()
  }
  onPause() {
    this.stopAnimation()
  }
  onUpdate(delta: number, time: number) {
    super.onUpdate(delta, time)
    if (this.editor.playing || this.animationMixer) {
      this.update(delta)
    }
  }
  simplyfyFloat(arr) {
    return arr.map((v: number) => parseFloat((Math.round(v * 10000) / 10000).toFixed(4)))
  }
  parseVehicle(group) {
    const vehicleCompData = parseCarModel(group, 'editor')
    const deepColliders = []

    const vehicleSaved = {
      arrayWheelsPosition: vehicleCompData.arrayWheelsPosition.map((array: any) => this.simplyfyFloat(array)),
      entrancesArray: vehicleCompData.entrancesArray.map((array: any) => this.simplyfyFloat(array)),
      seatsArray: vehicleCompData.seatsArray.map((array: any) => this.simplyfyFloat(array)),
      startPosition: this.simplyfyFloat([this.position.x, this.position.y, this.position.z]),
      startQuaternion: this.simplyfyFloat([this.quaternion.x, this.quaternion.y, this.quaternion.z, this.quaternion.w]),
      suspensionRestLength: parseFloat((Math.round(vehicleCompData.suspensionRestLength * 10000) / 10000).toFixed(4)),
      interactionPartsPosition: vehicleCompData.interactionPartsPosition.map((array: any) => this.simplyfyFloat(array)),
      mass: vehicleCompData.mass
    }
    console.warn(vehicleSaved)
    vehicleCompData.vehicleSphereColliders.forEach((v) => {
      deepColliders.push(
        this.parseColliders(v.userData, 'vehicle', v.userData.type, null, v.position, v.quaternion, v.scale, v)
      )
    })
    return [vehicleSaved, deepColliders]
  }

  parseColliders(
    userData,
    data,
    type,
    mass,
    position,
    quaternion,
    scale,
    mesh,
    collisionLayer = undefined,
    collisionMask = undefined
  ) {
    let geometry = null
    if (type == 'trimesh') {
      geometry = getGeometry(mesh)
    }

    const meshCollider = {
      ...userData,
      data: data,
      type: type,
      mass: mass ? mass : 1,
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },
      quaternion: {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w
      },
      scale: {
        x: scale.x,
        y: scale.y,
        z: scale.z
      },
      vertices:
        geometry != null
          ? Array.from(geometry.attributes.position.array).map((v: number) =>
              parseFloat((Math.round(v * 10000) / 10000).toFixed(4))
            )
          : null,
      indices: geometry != null && geometry.index ? Array.from(geometry.index.array) : null,
      collisionLayer,
      collisionMask
    }

    return meshCollider
  }

  parseAndSaveColliders(components) {
    if (this.model) {
      // Set up colliders
      const colliders = []
      const vehicleColliders = []
      const vehicleMain = []

      const parseGroupColliders = (group) => {
        if (
          group.userData.data === 'physics' ||
          group.userData.data === 'kinematic' ||
          group.userData.data === 'dynamic'
        ) {
          if (group.type == 'Group') {
            for (let i = 0; i < group.children.length; i++) {
              colliders.push(
                this.parseColliders(
                  group.userData,
                  group.userData.data,
                  group.userData.type,
                  group.userData.mass,
                  group.position,
                  group.quaternion,
                  group.scale,
                  group.children[i],
                  group.userData.collisionLayer,
                  group.userData.collisionMask
                )
              )
            }
          } else if (group.type == 'Mesh') {
            colliders.push(
              this.parseColliders(
                group.userData,
                group.userData.data,
                group.userData.type,
                group.userData.mass,
                group.position,
                group.quaternion,
                group.scale,
                group,
                group.userData.collisionLayer,
                group.userData.collisionMask
              )
            )
          }
        } else if (group.userData.data === 'vehicle') {
          const [vehicleSaved, deepArrayColliders] = this.parseVehicle(group)
          vehicleMain.push(vehicleSaved)
          vehicleColliders.push(deepArrayColliders)
        }
      }

      this.model.traverse(parseGroupColliders)
      this.meshColliders = colliders.concat(...vehicleColliders)
      this.vehicleObject = vehicleMain
      this.editor.renderer.addBatchedObject(this.model)
    }

    for (let i = 0; i < this.meshColliders.length; i++) {
      components[`mesh-collider-${i}`] = this.addEditorParametersToCollider(this.meshColliders[i])
    }

    for (let i = 0; i < this.vehicleObject.length; i++) {
      components[`vehicle-saved-in-scene-${i}`] = this.vehicleObject[i]
    }
  }
  addEditorParametersToCollider(collider) {
    // its for vehicle
    if (collider.data == 'vehicle') return collider

    const [position, quaternion, scale] = plusParameter(
      collider.position,
      collider.quaternion,
      collider.scale,
      this.position,
      this.quaternion,
      this.scale
    )
    collider.position.x = position.x
    collider.position.y = position.y
    collider.position.z = position.z
    collider.quaternion.x = quaternion.x
    collider.quaternion.y = quaternion.y
    collider.quaternion.z = quaternion.z
    collider.quaternion.w = quaternion.w
    collider.scale.x = scale.x
    collider.scale.y = scale.y
    collider.scale.z = scale.z
    return collider
  }
  updateStaticModes() {
    if (!this.model) return
    setStaticMode(this.model, StaticModes.Static)
    AnimationManager.instance.getAnimations().then((animations) => {
      if (animations && animations.length > 0) {
        for (const animation of animations) {
          for (const track of animation.tracks) {
            const { nodeName: uuid } = PropertyBinding.parseTrackName(track.name)
            const animatedNode = this.model.getObjectByProperty('uuid', uuid)
            if (!animatedNode) {
              // throw new Error(
              //   `Model.updateStaticModes: model with url "${this._canonicalUrl}" has an invalid animation "${animation.name}"`
              // )
            } else {
              setStaticMode(animatedNode, StaticModes.Dynamic)
            }
          }
        }
      }
    })
  }
  async serialize(projectID) {
    const components = {
      'gltf-model': {
        src: this._canonicalUrl,
        envMapOverride: this.envMapOverride !== '' ? this.envMapOverride : undefined,
        textureOverride: this.textureOverride,
        dontParseModel: this.saveColliders
      },
      shadow: {
        cast: this.castShadow,
        receive: this.receiveShadow
      },
      interact: {
        interactable: this.interactable,
        interactionType: this.interactionType,
        interactionText: this.interactionText,
        interactionDistance: this.interactionDistance,
        payloadName: this.payloadName,
        payloadUrl: this.payloadUrl,
        payloadBuyUrl: this.payloadBuyUrl,
        payloadLearnMoreUrl: this.payloadLearnMoreUrl,
        payloadHtmlContent: this.payloadHtmlContent,
        payloadModelUrl: this._canonicalUrl
      }
    }

    if (this.interactionType === 'gameobject') {
      components['game-object'] = {
        gameName: this.editor.nodes.find((node) => node.uuid === this.target).name,
        role: this.role,
        target: this.target
      }
    }

    if (this.saveColliders) {
      this.parseAndSaveColliders(components)
      clearFromColliders(this.model, true)
    }
    if (this.activeClipIndex !== -1) {
      components['loop-animation'] = {
        activeClipIndex: this.activeClipIndex,
        hasAvatarAnimations: this.hasAvatarAnimations
      }
    }
    if (this.collidable) {
      components['collidable'] = {}
    }
    if (this.walkable) {
      components['walkable'] = {}
    }
    return await super.serialize(projectID, components)
  }
  copy(source, recursive = true) {
    super.copy(source, recursive)
    if (source.loadingCube) {
      this.initialScale = source.initialScale
      this.load(source.src)
    } else {
      this.updateStaticModes()
      this.gltfJson = source.gltfJson
      this._canonicalUrl = source._canonicalUrl
      this.envMapOverride = source.envMapOverride
    }
    this.target = source.target
    this.collidable = source.collidable
    this.textureOverride = source.textureOverride
    this.saveColliders = source.saveColliders
    this.walkable = source.walkable
    return this
  }
  // @ts-ignore
  prepareForExport(ctx) {
    super.prepareForExport()
    this.addGLTFComponent('shadow', {
      cast: this.castShadow,
      receive: this.receiveShadow
    })
    // TODO: Support exporting more than one active clip.
    if (this.activeClip) {
      const activeClipIndex = ctx.animations.indexOf(this.activeClip)
      if (activeClipIndex === -1) {
        throw new Error(
          `Error exporting model "${this.name}" with url "${this._canonicalUrl}". Animation could not be found.`
        )
      } else {
        this.addGLTFComponent('loop-animation', {
          hasAvatarAnimations: this.hasAvatarAnimations,
          activeClipIndex: activeClipIndex
        })
      }
    }
  }
}
