import {
  MathUtils as _Math,
  Scene,
  Group,
  Object3D,
  Fog,
  FogExp2,
  LinearToneMapping,
  ShadowMapType,
  PCFSoftShadowMap,
  Color,
  sRGBEncoding,
  LinearFilter,
  DataTexture,
  Texture,
  RGBFormat,
  CubeTextureLoader,
  PMREMGenerator,
  TextureLoader
} from "three";
import EditorNodeMixin from "./EditorNodeMixin";
import { setStaticMode, StaticModes, isStatic } from "../functions/StaticMode";
import sortEntities from "../functions/sortEntities";
import MeshCombinationGroup from "../classes/MeshCombinationGroup";
import GroupNode from "./GroupNode";
import getNodeWithUUID from "../functions/getNodeWithUUID";
import serializeColor from "../functions/serializeColor";
import { FogType } from '../../scene/constants/FogType';
import { EnvMapSourceType, EnvMapTextureType } from '../../scene/constants/EnvMapEnum';
import {DistanceModelType} from "../../scene/classes/AudioSource";
import { RethrownError } from "../functions/errors";
import loadTexture from "../functions/loadTexture";
import Image from "../../scene/classes/Image";
import SkyboxNode, { SkyTypeEnum } from "./SkyboxNode";

export default class SceneNode extends EditorNodeMixin(Scene) {
  static nodeName = "Scene";
  static disableTransform = true;
  static canAddNode() {
    return false;
  }
  static async loadProject(editor, json) {
    const { root, metadata, entities } = json;
    let scene = null;
    const dependencies = [];
    function loadAsync(promise) {
      dependencies.push(promise);
    }
    const errors = [];
    function onError(object, error) {
      errors.push(error);
    }
    const sortedEntities = sortEntities(entities);
    for (const entityId of sortedEntities) {
      const entity = entities[entityId];
      let EntityNodeConstructor;
      for (const NodeConstructor of editor.nodeTypes) {
        if (NodeConstructor.shouldDeserialize(entity)) {
          EntityNodeConstructor = NodeConstructor;
          break;
        }
      }
      if (!EntityNodeConstructor) {
        console.warn(
          `No node constructor found for entity "${entity.name}"`
        );
      } else {
        try {
          const node = await EntityNodeConstructor.deserialize(
            editor,
            entity,
            loadAsync,
            onError
          );
          node.uuid = entityId;
          if (entity.parent) {
            const parent = getNodeWithUUID(scene, entity.parent);
            if (!parent) {
              throw new Error(
                `Node "${entity.name}" with uuid "${
                  entity.uuid
                }" specifies parent "${entity.parent}", but was not found.`
              );
            }
            parent.children.splice(entity.index, 0, node);
            node.parent = parent;
          } else if (entityId === root) {
            scene = node;
            scene.metadata = metadata;
            // Needed so that editor.scene is set correctly when used in nodes deserialize methods.
            editor.scene = scene;
          } else {
            throw new Error(
              `Node "${entity.name}" with uuid "${
                entity.uuid
              }" does not specify a parent.`
            );
          }
          node.onChange();
        } catch(e) {
          console.error('Node failed to load - it will be removed', e)
          errors.push(e)
        }
      }
    }
    await Promise.all(dependencies);
    return [scene, errors];
  }
  static shouldDeserialize(entityJson) {
    return entityJson.parent === undefined;
  }
  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json);
    if (json.components) {
      const fog = json.components.find(c => c.name === "fog");
      if (fog) {
        const { type, color, density, near, far } = fog.props;
        node.fogType = type;
        node.fogColor.set(color);
        node.fogDensity = density;
        node.fogNearDistance = near;
        node.fogFarDistance = far;
      }
      // const background = json.components.find(c => c.name === "background");
      // if (background) {
      //   const { color } = background.props;
      //   node.background.set(color);
      // }
      const audioSettings = json.components.find(
        c => c.name === "audio-settings"
      );
      if (audioSettings) {
        const props = audioSettings.props;
        node.overrideAudioSettings = props.overrideAudioSettings;
        node.avatarDistanceModel = props.avatarDistanceModel;
        node.avatarRolloffFactor = props.avatarRolloffFactor;
        node.avatarRefDistance = props.avatarRefDistance;
        node.avatarMaxDistance = props.avatarMaxDistance;
        node.mediaVolume = props.mediaVolume;
        node.mediaDistanceModel = props.mediaDistanceModel;
        node.mediaRolloffFactor = props.mediaRolloffFactor;
        node.mediaRefDistance = props.mediaRefDistance;
        node.mediaMaxDistance = props.mediaMaxDistance;
        node.mediaConeInnerAngle = props.mediaConeInnerAngle;
        node.mediaConeOuterAngle = props.mediaConeOuterAngle;
        node.mediaConeOuterGain = props.mediaConeOuterGain;
      }
      const simpleMaterials = json.components.find(
        c => c.name === "simple-materials"
      );
      if (simpleMaterials) {
        const props = simpleMaterials.props;
        node.simpleMaterials = props.simpleMaterials;
      }
      const rendererSettings = json.components.find(
        c => c.name === "renderer-settings"
      );
      if (rendererSettings) {
        const props = rendererSettings.props;
        node.overrideRendererSettings = props.overrideRendererSettings;
        node.csm = props.csm;
        node.toneMapping = props.toneMapping;
        node.toneMappingExposure = props.toneMappingExposure;
        node.shadowMapType = props.shadowMapType;
      }
    }
    return node;
  }

  url = null;
  metadata = {};

  _fogType = FogType.Disabled;
  _fog = new Fog(0xffffff, 0.0025);
  _fogExp2 = new FogExp2(0xffffff, 0.0025);
  fog = null;

  overrideAudioSettings = false;
  avatarDistanceModel = DistanceModelType.Inverse;
  avatarRolloffFactor = 2;
  avatarRefDistance = 1;
  avatarMaxDistance = 10000;
  mediaVolume = 0.5;
  mediaDistanceModel = DistanceModelType.Inverse;
  mediaRolloffFactor = 1;
  mediaRefDistance = 1;
  mediaMaxDistance = 10000;
  mediaConeInnerAngle = 360;
  mediaConeOuterAngle = 0;
  mediaConeOuterGain = 0;

  envMapSourceType=EnvMapSourceType.Default;
  envMapTextureType=EnvMapTextureType.Equirectangular;
  _envMapSourceColor="";
  _envMapSourceURL="";

  simpleMaterials = false;
  overrideRendererSettings = false;
  csm = true;
  shadows = true;
  shadowType = true;
  toneMapping = LinearToneMapping;
  toneMappingExposure = 0.8;
  shadowMapType: ShadowMapType = PCFSoftShadowMap;
  errorInEnvmapURL=false;
  _envMapIntensity=1;

  constructor(editor) {
    super(editor);
    setStaticMode(this, StaticModes.Static);
  }

  get envMapSourceURL(){
    return this._envMapSourceURL;
  }

  set envMapSourceURL(src){
    this.load(src);
  }

  get envMapIntensity(){
    return this._envMapIntensity;
  }

  set envMapIntensity(value){
    this._envMapIntensity=value;
    this.traverse(child=>{
      if(child.material)
        child.material.envMapIntensity=value;
    })
  }

  get envMapSourceColor(){
    return this._envMapSourceColor;
  }

  set envMapSourceColor(src){
    this._envMapSourceColor=src;
    if(this.environment?.dispose)
      this.environment.dispose();
    const col=new Color(src);
    const resolution =1;
    const data=new Uint8Array(4*resolution*resolution);
    for(let i=0; i<resolution*resolution;i++){
        data[i]=Math.floor(col.r*255);
        data[i+1]=Math.floor(col.g*255);
        data[i+2]=Math.floor(col.b*255);
        data[i+3]=255;//Math.floor(col.b*255);
    }
    const pmren=new PMREMGenerator(this.editor.renderer.renderer);
    const texture=new DataTexture(data,resolution,resolution,RGBFormat);
    texture.encoding=sRGBEncoding;
    const tex=pmren.fromEquirectangular(texture).texture;
    pmren.compileEquirectangularShader()
    this.environment=tex;//pmren.fromEquirectangular(texture);
    pmren.dispose();
  }

  get fogType() {
    return this._fogType;
  }

  set fogType(type) {
    this._fogType = type;
    switch (type) {
      case FogType.Linear:
        this.fog = this._fog;
        break;
      case FogType.Exponential:
        this.fog = this._fogExp2;
        break;
      default:
        this.fog = null;
        break;
    }
  }



  get fogColor() {
    if (this.fogType === FogType.Linear) {
      return this._fog.color;
    } else {
      return this._fogExp2.color;
    }
  }

  get fogDensity() {
    return this._fogExp2.density;
  }
  set fogDensity(value) {
    this._fogExp2.density = value;
  }
  get fogNearDistance() {
    return this._fog.near;
  }
  set fogNearDistance(value) {
    this._fog.near = value;
  }
  get fogFarDistance() {
    return this._fog.far;
  }
  set fogFarDistance(value) {
    this._fog.far = value;
  }


  copy(source, recursive = true) {
    super.copy(source, recursive);
    this.url = source.url;
    this.metadata = source.metadata;
    this.fogType = source.fogType;

    this.fogColor.copy(source.fogColor);
    this.fogDensity = source.fogDensity;
    this.fogNearDistance = source.fogNearDistance;
    this.fogFarDistance = source.fogFarDistance;

    this.overrideAudioSettings = source.overrideAudioSettings;
    this.avatarDistanceModel = source.avatarDistanceModel;
    this.avatarRolloffFactor = source.avatarRolloffFactor;
    this.avatarRefDistance = source.avatarRefDistance;
    this.avatarMaxDistance = source.avatarMaxDistance;
    this.mediaVolume = source.mediaVolume;
    this.mediaDistanceModel = source.mediaDistanceModel;
    this.mediaRolloffFactor = source.mediaRolloffFactor;
    this.mediaRefDistance = source.mediaRefDistance;
    this.mediaMaxDistance = source.mediaMaxDistance;
    this.mediaConeInnerAngle = source.mediaConeInnerAngle;
    this.mediaConeOuterAngle = source.mediaConeOuterAngle;
    this.mediaConeOuterGain = source.mediaConeOuterGain;

    this.simpleMaterials = source.simpleMaterials;

    this.overrideRendererSettings = source.overrideRendererSettings;
    this.csm = source.csm;
    this.toneMapping = source.toneMapping;
    this.toneMappingExposure = source.toneMappingExposure;
    this.shadowMapType = source.toneMappingType;

    return this;
  }
  // @ts-ignore
  serialize() {
    const sceneJson = {
      version: 4,
      root: this.uuid,
      metadata: JSON.parse(JSON.stringify(this.metadata)),
      entities: {
        [this.uuid]: {
          name: this.name,
          components: [
            {
              name: "fog",
              props: {
                type: this.fogType,
                color: serializeColor(this.fogColor),
                near: this.fogNearDistance,
                far: this.fogFarDistance,
                density: this.fogDensity
              }
            },
            // {
            //   name: "background",
            //   props: {
            //     color: serializeColor(this.background)
            //   }
            // },
            {
              name: "audio-settings",
              props: {
                overrideAudioSettings: this.overrideAudioSettings,
                avatarDistanceModel: this.avatarDistanceModel,
                avatarRolloffFactor: this.avatarRolloffFactor,
                avatarRefDistance: this.avatarRefDistance,
                avatarMaxDistance: this.avatarMaxDistance,
                mediaVolume: this.mediaVolume,
                mediaDistanceModel: this.mediaDistanceModel,
                mediaRolloffFactor: this.mediaRolloffFactor,
                mediaRefDistance: this.mediaRefDistance,
                mediaMaxDistance: this.mediaMaxDistance,
                mediaConeInnerAngle: this.mediaConeInnerAngle,
                mediaConeOuterAngle: this.mediaConeOuterAngle,
                mediaConeOuterGain: this.mediaConeOuterGain
              }
            },
            {
              name: "simple-materials",
              props: {
                simpleMaterials: this.simpleMaterials
              }
            },
            {
              name: "renderer-settings",
              props: {
                overrideRendererSettings: this.overrideRendererSettings,
                csm: this.csm,
                toneMapping: this.toneMapping,
                toneMappingExposure: this.toneMappingExposure,
                shadowMapType: this.shadowMapType,
              }
            },
          ]
        }
      }
    };
    this.traverse(child => {
      if (!child.isNode || child === this) {
        return;
      }
      const entityJson = child.serialize();
      entityJson.parent = child.parent.uuid;
      let index = 0;
      for (const sibling of child.parent.children) {
        if (sibling === child) {
          break;
        } else if (sibling.isNode) {
          index++;
        }
      }
      entityJson.index = index;
      sceneJson.entities[child.uuid] = entityJson;
    });
    return sceneJson;
  }
    // @ts-ignore
  prepareForExport(ctx) {

    console.log("Preparing For Export");
    this.children = this.children.filter(c => c.isNode);
    const nodeList = [];
    this.traverse(child => {
      if (child.isNode && child !== this) {
        nodeList.push(child);
      }
    });
    for (const node of nodeList) {
      node.prepareForExport(ctx);
    }
    if (this.fogType === FogType.Linear) {
      this.addGLTFComponent("fog", {
        type: this.fogType,
        color: serializeColor(this.fogColor),
        near: this.fogNearDistance,
        far: this.fogFarDistance
      });
    } else if (this.fogType === FogType.Exponential) {
      this.addGLTFComponent("fog", {
        type: this.fogType,
        color: serializeColor(this.fogColor),
        density: this.fogDensity
      });
    }
    if (this.overrideAudioSettings) {
      this.addGLTFComponent("audio-settings", {
        avatarDistanceModel: this.avatarDistanceModel,
        avatarRolloffFactor: this.avatarRolloffFactor,
        avatarRefDistance: this.avatarRefDistance,
        avatarMaxDistance: this.avatarMaxDistance,
        mediaVolume: this.mediaVolume,
        mediaDistanceModel: this.mediaDistanceModel,
        mediaRolloffFactor: this.mediaRolloffFactor,
        mediaRefDistance: this.mediaRefDistance,
        mediaMaxDistance: this.mediaMaxDistance,
        mediaConeInnerAngle: this.mediaConeInnerAngle,
        mediaConeOuterAngle: this.mediaConeOuterAngle,
        mediaConeOuterGain: this.mediaConeOuterGain
      });
    }
    if (this.overrideRendererSettings) {
      this.addGLTFComponent("renderer-settings", {
        csm: this.csm,
        toneMapping: this.toneMapping,
        toneMappingExposure: this.toneMappingExposure,
        shadowMapType: this.shadowMapType,
      });
    }
    if(this.simpleMaterials) {
      this.addGLTFComponent("simple-materials", {
        simpleMaterials: this.simpleMaterials
      });
    }

    this.exportEnvMap();
  }
  async combineMeshes() {
    await MeshCombinationGroup.combineMeshes(this);
  }
  removeUnusedObjects() {
    this.computeAndSetStaticModes();
    function hasExtrasOrExtensions(object) {
      const userData = object.userData;
      for (const key in userData) {
        if (Object.prototype.hasOwnProperty.call(userData, key)) {
          return true;
        }
      }
      return false;
    }
    function _removeUnusedObjects(object) {
      let canBeRemoved = !!object.parent;
      for (const child of object.children.slice(0)) {
        if (!_removeUnusedObjects(child)) {
          canBeRemoved = false;
        }
      }
      const shouldRemove =
        canBeRemoved &&
        (object.constructor === Object3D ||
          object.constructor === Scene ||
          object.constructor === Group ||
          object.constructor === GroupNode) &&
        object.children.length === 0 &&
        isStatic(object) &&
        !hasExtrasOrExtensions(object);
      if (canBeRemoved && shouldRemove) {
        object.parent.remove(object);
        return true;
      }
      return false;
    }
    _removeUnusedObjects(this);
  }
  getAnimationClips() {
    const animations = [];
    this.traverse(child => {
      if (child.isNode && child.type === "Model") {
        const activeClip = child.activeClip;
        if (activeClip) {
          animations.push(child.activeClip);
        }
      }
    });
    return animations;
  }
  clearMetadata() {
    this.metadata = {};
  }
  setMetadata(newMetadata) {
    const existingMetadata = this.metadata || {};
    this.metadata = Object.assign(existingMetadata, newMetadata);
  }


  async load(src, onError?) {


    if (this.environment?.dispose) {
      this.environment.dispose();
    }

    const pmremGenerator=new PMREMGenerator(this.editor.renderer.renderer);
    switch(this.envMapTextureType){
      case EnvMapTextureType.Equirectangular:
        const nextSrc = src || "";
        if (nextSrc === this._envMapSourceURL && nextSrc !== "") {
          return;
        }
        this._envMapSourceURL = nextSrc;
        try {
          const { url } = await this.editor.api.resolveMedia(src);
          if (this.environment?.dispose) {
            this.environment.dispose();
          }
          const texture = await new TextureLoader().loadAsync(src);
          texture.encoding = sRGBEncoding;
          texture.minFilter = LinearFilter;
          this.environment=pmremGenerator.fromEquirectangular(texture).texture;
          this.errorInEnvmapURL=false;
          texture.dispose();
        } catch (error) {
          this.errorInEnvmapURL=true;
          console.error(`Error loading image ${this._envMapSourceURL}`);
        }
      break;
      case EnvMapTextureType.Cubemap:
        const negx = "negx.jpg";
        const negy = "negy.jpg";
        const negz = "negz.jpg";
        const posx = "posx.jpg";
        const posy = "posy.jpg";
        const posz = "posz.jpg";
        new CubeTextureLoader()
        .setPath(src)
        .load([posx, negx, posy, negy, posz, negz],
        (texture) => {
          const EnvMap = pmremGenerator.fromCubemap(texture).texture;
          EnvMap.encoding = sRGBEncoding;
          this.environment = EnvMap;
          this.errorInEnvmapURL=false;
          texture.dispose();
        },
        (res)=> {
          console.log(res);
        },
        (erro) => {
          this.errorInEnvmapURL=true;
          console.warn('Skybox texture could not be found!', erro);
        }
        );
      break;
    }
    pmremGenerator.dispose();
    return this;
  }

  exportEnvMap(){
    if(this.envMapSourceType===EnvMapSourceType.Color){
      this.addGLTFComponent("envMap",{
        type:"Color",
        options:{
          colorString:this._envMapSourceColor,
          }
        });
    }
    else if(this.envMapSourceType===EnvMapSourceType.Texture){
      this.addGLTFComponent("envMap",{
        type:"Texture",
        options:{
          url:this._envMapSourceURL,
          type:this.envMapTextureType,
        }
      });
    }
    else if(this.envMapSourceType==EnvMapSourceType.Default){
      let options={};
      let s_node=null;
      this.traverse(child => {
        if (child.isNode && child !== this) {
          if(child.nodeName==="Reflection Probe"){
            options=child.getReflectionProbeProperties();
            this.addGLTFComponent("envMap",{type:"ReflectionProbe",options});
            return;
          }
          else if(child.nodeName==="Skybox"){
            s_node=child;
          }
        }
      });

      if(s_node!==null){
        const skyNode=(s_node as SkyboxNode);
        const type=skyNode.skyType;
        switch(type){
          case SkyTypeEnum.equirectangular:
            this.addGLTFComponent("envMap",{
              type:"Texture",
              options:{
                url:skyNode.texturePath,
                type:EnvMapTextureType.Equirectangular,
              }
            })
            break;
          case SkyTypeEnum.cubemap:
            this.addGLTFComponent("envMap",{
              type:"Texture",
              options:{
                url:skyNode.texturePath,
                type:EnvMapTextureType.Cubemap,
              }
            })
            break;
          case SkyTypeEnum.skybox:
          default:
            const options=skyNode.getSkyBoxProperties();
            this.addGLTFComponent("envMap",{type:"SkyBox",options});
            break;
        }
      }
    }
  }

}
