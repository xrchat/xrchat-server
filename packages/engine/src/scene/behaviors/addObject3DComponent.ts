/** This Module contains function to perform different operations on 
 *    {@link https://threejs.org/docs/#api/en/core/Object3D | Object3D } from three.js library. 
 * @packageDocumentation
 * */

import { Color, Object3D } from "three";
import { Object3DComponent } from '../components/Object3DComponent';
import {
  AmbientLightProbeTagComponent,
  AmbientLightTagComponent,
  ArrayCameraTagComponent,
  AudioListenerTagComponent,
  AudioTagComponent,
  BoneTagComponent,
  CameraTagComponent,
  CubeCameraTagComponent,
  DirectionalLightTagComponent,
  GroupTagComponent,
  HemisphereLightProbeTagComponent,
  HemisphereLightTagComponent,
  ImmediateRenderObjectTagComponent,
  InstancedMeshTagComponent,
  LightProbeTagComponent,
  LightTagComponent,
  LineSegmentsTagComponent,
  LineTagComponent,
  LODTagComponent,
  MeshTagComponent,
  OrthographicCameraTagComponent,
  PerspectiveCameraTagComponent,
  PointLightTagComponent,
  PointsTagComponent,
  PositionalAudioTagComponent,
  RectAreaLightTagComponent,
  SceneTagComponent,
  SkinnedMeshTagComponent,
  SpotLightTagComponent,
  SpriteTagComponent
} from '../components/Object3DTagComponents';
import { Behavior } from '../../common/interfaces/Behavior';
import { Entity } from '../../ecs/classes/Entity';
import { Component } from '../../ecs/classes/Component';
import { ComponentConstructor } from '../../ecs/interfaces/ComponentInterfaces';
import {
  hasComponent,
  getComponent,
  removeComponent,
  removeEntity,
  getMutableComponent, 
  addComponent
} from '../../ecs/functions/EntityFunctions';
import { SkyboxComponent } from '../components/SkyboxComponent';
import { Engine } from '../../ecs/classes/Engine';
import ShadowComponent from "../components/ShadowComponent";
import { createShadow } from "./createShadow";
import { WebGLRendererSystem } from "../../renderer/WebGLRendererSystem";
import { isClient } from "../../common/functions/isClient";

/**
 * Add Object3D Component with args into Entity from the Behavior.
 */
export const addObject3DComponent = (
  entity: Entity,
  args
) => {

  const isObject3d = typeof args.obj3d === 'object';
  let object3d;

  /**
   * apply value to sub object by path, like material.color = '#fff' will set { material:{ color }}
   * @param subj
   * @param path
   * @param value
   */
  const applyDeepValue = (subj: object, path: string, value: unknown): void => {
    if (!subj) {
      console.warn('subj is not an object', subj);
      return;
    }
    const groups = path.match(/(?<property>[^.]+)(\.(?<nextPath>.*))?/)?.groups;
    if (!groups) {
      return;
    }
    const { property, nextPath } = groups;

    if (!property) {
      // console.warn('property not found', property);
      return;
    }
    if (nextPath) {
      return applyDeepValue(subj[property], nextPath, value);
    }

    if (subj[property] instanceof Color && (typeof value === "number" || typeof value === "string")) {
      subj[property] = new Color(value);
    } else {
      subj[property] = value;
    }
  };

  if (isObject3d) object3d = args.obj3d;
  else object3d = new args.obj3d();

  typeof args.objArgs === 'object' && Object.keys(args.objArgs).forEach(key => {
    applyDeepValue(object3d, key, args.objArgs[key]);
  });

  if (args.parentEntity && hasComponent(args.parentEntity, ShadowComponent)) {
    createShadow(entity, getMutableComponent(args.parentEntity, ShadowComponent));
  }

  const hasShadow = getMutableComponent(entity, ShadowComponent)
  const castShadow = Boolean(hasShadow?.castShadow || args.objArgs?.castShadow);
  const receiveshadow = Boolean(hasShadow?.receiveShadow || args.objArgs?.receiveShadow);

  object3d.traverse((obj) => {
    obj.castShadow = castShadow;
    obj.receiveShadow = receiveshadow;
  });

  addComponent(entity, Object3DComponent, { value: object3d });

  const components: Array<Component<any>> = [];
  if (object3d.type === 'Audio' && (object3d as any).panner !== undefined) {
    components.push(PositionalAudioTagComponent as any);
  }
  if (object3d.type === 'Audio' && (object3d as any).panner !== undefined) {
    components.push(PositionalAudioTagComponent as any);
  } else if (object3d.type === 'Audio') {
    components.push(AudioTagComponent as any);
  } else if (object3d.type === 'AudioListener') {
    components.push(AudioListenerTagComponent as any);
  } else if ((object3d as any).isCamera) {
    components.push(CameraTagComponent as any);

    if ((object3d as any).isOrthographicCamera) {
      components.push(OrthographicCameraTagComponent as any);
    } else if ((object3d as any).isPerspectiveCamera) {
      components.push(PerspectiveCameraTagComponent as any);
    }
    if ((object3d as any).isArrayCamera) {
      components.push(ArrayCameraTagComponent as any);
    } else if (object3d.type === 'CubeCamera') {
      components.push(CubeCameraTagComponent as any);
    } else if ((object3d as any).isImmediateRenderObject) {
      components.push(ImmediateRenderObjectTagComponent as any);
    }
  } else if ((object3d as any).isLight) {
    components.push(LightTagComponent as any);
    if ((object3d as any).isAmbientLight) {
      components.push(AmbientLightTagComponent as any);
    } else if ((object3d as any).isDirectionalLight) {
      components.push(DirectionalLightTagComponent as any);
    } else if ((object3d as any).isHemisphereLight) {
      components.push(HemisphereLightTagComponent as any);
    } else if ((object3d as any).isPointLight) {
      components.push(PointLightTagComponent as any);
    } else if ((object3d as any).isRectAreaLight) {
      components.push(RectAreaLightTagComponent as any);
    } else if ((object3d as any).isSpotLight) {
      components.push(SpotLightTagComponent as any);
    }
  } else if ((object3d as any).isLightProbe) {
    components.push(LightProbeTagComponent as any);
    if ((object3d as any).isAmbientLightProbe) {
      components.push(AmbientLightProbeTagComponent as any);
    } else if ((object3d as any).isHemisphereLightProbe) {
      components.push(HemisphereLightProbeTagComponent as any);
    }
  } else if ((object3d as any).isBone) {
    components.push(BoneTagComponent as any);
  } else if ((object3d as any).isGroup) {
    components.push(GroupTagComponent as any);
  } else if ((object3d as any).isLOD) {
    components.push(LODTagComponent as any);
  } else if ((object3d as any).isMesh) {
    components.push(MeshTagComponent as any);

    if ((object3d as any).isInstancedMesh) {
      components.push(InstancedMeshTagComponent as any);
    } else if ((object3d as any).isSkinnedMesh) {
      components.push(SkinnedMeshTagComponent as any);
    }
  } else if ((object3d as any).isLine) {
    components.push(LineTagComponent as any);

    if ((object3d as any).isLineLoop) {
      components.push(HemisphereLightProbeTagComponent as any);
    } else if ((object3d as any).isLineSegments) {
      components.push(LineSegmentsTagComponent as any);
    }
  } else if ((object3d as any).isPoints) {
    components.push(PointsTagComponent as any);
  } else if ((object3d as any).isSprite) {
    components.push(SpriteTagComponent as any);
  } else if ((object3d as any).isScene) {
    components.push(SceneTagComponent as any);
  } else if ((object3d as any).isSky) {
    components.push(SkyboxComponent as any);
  }

  components.forEach((component: any) => {
    addComponent(entity, component);
  });
  if (args.parentEntity && hasComponent(args.parentEntity, Object3DComponent as any)) {
    getComponent<Object3DComponent>(args.parentEntity, Object3DComponent).value.add(object3d);
  }
  object3d.entity = entity;
  return entity;
};
