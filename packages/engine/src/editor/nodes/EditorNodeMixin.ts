import {
  StaticModes,
  computeStaticMode,
  computeAndSetStaticModes,
  isDynamic,
  isInherits,
  isStatic
} from '../functions/StaticMode'
import { Color, Object3D } from 'three'
import serializeColor from '../functions/serializeColor'
import ErrorIcon from '../classes/ErrorIcon'
export default function EditorNodeMixin(Object3DClass) {
  return class extends Object3DClass {
    static nodeName = 'Unknown Node'
    static disableTransform = false
    static useMultiplePlacementMode = false
    static ignoreRaycast = false
    static haveStaticTags = true
    // Used for props like src that have side effects that we don't want to happen in the constructor
    static initialElementProps = {}
    static hideInElementsPanel = false
    reflectionProbeStatic: boolean
    static canAddNode(_editor) {
      return true
    }
    static async load() {
      return Promise.resolve()
    }
    static shouldDeserialize(entityJson) {
      return !!entityJson.components.find((c) => c.name === this.legacyComponentName)
    }
    static async deserialize(editor, json) {
      const node = new this(editor)
      node.name = json.name
      if (json.components) {
        const transformComponent = json.components.find((c) => c.name === 'transform')
        if (transformComponent) {
          const { position, rotation, scale } = transformComponent.props
          node.position.set(position.x, position.y, position.z)
          node.rotation.set(rotation.x, rotation.y, rotation.z)
          node.scale.set(scale.x, scale.y, scale.z)
        }

        const visibleComponent = json.components.find((c) => c.name === 'visible')
        if (visibleComponent) node.visible = visibleComponent.props.visible

        const persistComponent = json.components.find((c) => c.name === 'persist')
        node.persist = !!persistComponent

        const reflectionProbeStaticComponent = json.components.find((c) => c.name === 'reflectionprobestatic')
        node.reflectionProbeStatic = !!reflectionProbeStaticComponent
      }
      return node
    }
    constructor(editor, ...args) {
      super(...args)
      this.editor = editor
      this.nodeName = (this.constructor as any).nodeName
      this.name = (this.constructor as any).nodeName
      this.isNode = true
      this.isCollapsed = false
      this.disableTransform = (this.constructor as any).disableTransform
      this.haveStaticTags = (this.constructor as any).haveStaticTags
      this.useMultiplePlacementMode = (this.constructor as any).useMultiplePlacementMode
      this.ignoreRaycast = (this.constructor as any).ignoreRaycast
      this.staticMode = StaticModes.Inherits
      this.originalStaticMode = null
      this.saveParent = false
      this.errorIcon = null
      this.issues = []
    }
    clone(recursive) {
      return new (this as any).constructor(this.editor).copy(this, recursive)
    }
    copy(source, recursive = true) {
      if (recursive) {
        this.remove(this.errorIcon)
      }
      super.copy(source, recursive)
      if (recursive) {
        const errorIconIndex = source.children.findIndex((child) => child === source.errorIcon)
        if (errorIconIndex !== -1) {
          this.errorIcon = this.children[errorIconIndex]
        }
      }
      this.issues = source.issues.slice()
      return this
    }
    onPlay() {}
    onUpdate(delta: number, time: number) {}
    onPause() {}
    onAdd() {}
    onChange(prop: string) {}
    onRemove() {}
    onSelect() {}
    onDeselect() {}
    onRendererChanged() {}
    async serialize(projectID, components) {
      const entityJson = {
        name: this.name,
        components: [
          {
            name: 'transform',
            props: {
              position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
              },
              rotation: {
                x: this.rotation.x,
                y: this.rotation.y,
                z: this.rotation.z
              },
              scale: {
                x: this.scale.x,
                y: this.scale.y,
                z: this.scale.z
              }
            }
          },
          {
            name: 'visible',
            props: {
              visible: this.visible
            }
          }
        ]
      }

      if (this.persist) {
        entityJson.components.push({
          name: 'persist',
          props: {} as any
        })
      }

      if (this.reflectionProbeStatic) {
        entityJson.components.push({
          name: 'reflectionprobestatic',
          props: {} as any
        })
      }

      if (components) {
        for (const componentName in components) {
          if (!Object.prototype.hasOwnProperty.call(components, componentName)) continue
          const serializedProps = {}
          const componentProps = components[componentName]
          for (const propName in componentProps) {
            if (!Object.prototype.hasOwnProperty.call(componentProps, propName)) continue
            const propValue = componentProps[propName]
            if (propValue instanceof Color) {
              serializedProps[propName] = serializeColor(propValue)
            } else {
              serializedProps[propName] = propValue
            }
          }
          ;(entityJson.components as any).push({
            name: componentName,
            props: serializedProps
          })
        }
      }
      return entityJson
    }
    prepareForExport() {
      this.userData.editor_uuid = this.uuid
      if (!this.visible) {
        this.addGLTFComponent('visible', {
          visible: this.visible
        })
      }
    }
    addGLTFComponent(name, props?) {
      if (!this.userData.gltfExtensions) {
        this.userData.gltfExtensions = {}
      }
      if (!this.userData.gltfExtensions.componentData) {
        this.userData.gltfExtensions.componentData = {}
      }
      if (props !== undefined && typeof props !== 'object') {
        throw new Error('glTF component props must be an object or undefined')
      }
      const componentProps = {}
      for (const key in props) {
        if (!Object.prototype.hasOwnProperty.call(props, key)) continue
        const value = props[key]
        if (value instanceof Color) {
          componentProps[key] = serializeColor(value)
        } else {
          componentProps[key] = value
        }
      }
      this.userData.gltfExtensions.componentData[name] = componentProps
    }
    replaceObject(replacementObject?) {
      replacementObject = replacementObject || new Object3D().copy(this as any, false)
      replacementObject.uuid = this.uuid
      if (this.userData.gltfExtensions && this.userData.gltfExtensions.componentData) {
        replacementObject.userData.gltfExtensions.componentData = this.userData.gltfExtensions.componentData
      }
      for (const child of this.children) {
        if (child.isNode) {
          replacementObject.children.push(child)
          child.parent = replacementObject
        }
      }
      this.parent.add(replacementObject)
      this.parent.remove(this)
    }
    gltfIndexForUUID(nodeUUID) {
      return { __gltfIndexForUUID: nodeUUID }
    }
    getObjectByUUID(uuid) {
      return this.getObjectByProperty('uuid', uuid)
    }
    computeStaticMode() {
      return computeStaticMode(this)
    }
    computeAndSetStaticModes() {
      return computeAndSetStaticModes(this)
    }
    computeAndSetVisible() {
      this.traverse((object) => {
        if (object.parent && !object.parent.visible) {
          object.visible = false
        }
      })
    }
    showErrorIcon() {
      if (!this.errorIcon) {
        this.errorIcon = new ErrorIcon()
        this.add(this.errorIcon)
      }
      const worldScale = this.getWorldScale(this.errorIcon.scale)
      if (worldScale.x === 0 || worldScale.y === 0 || worldScale.z === 0) {
        this.errorIcon.scale.set(1, 1, 1)
      } else {
        this.errorIcon.scale.set(1 / worldScale.x, 1 / worldScale.y, 1 / worldScale.z)
      }
    }
    hideErrorIcon() {
      if (this.errorIcon) {
        this.remove(this.errorIcon)
        this.errorIcon = null
      }
    }
    isInherits() {
      return isInherits(this)
    }
    isStatic() {
      return isStatic(this)
    }
    isDynamic() {
      return isDynamic(this)
    }
    findNodeByType(nodeType) {
      if (this.constructor === nodeType) {
        return this
      }
      for (const child of this.children) {
        if (child.isNode) {
          const result = child.findNodeByType(nodeType)
          if (result) {
            return result
          }
        }
      }
      return null
    }
    getNodesByType(nodeType) {
      const nodes = []
      if (this.constructor === nodeType) {
        nodes.push(this)
      }
      for (const child of this.children) {
        if (child.isNode) {
          const results = child.getNodesByType(nodeType)
          for (const result of results) {
            nodes.push(result)
          }
        }
      }
      return nodes
    }
  }
}
