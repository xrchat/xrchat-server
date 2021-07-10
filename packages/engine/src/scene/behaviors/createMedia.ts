import { MathUtils, Object3D } from 'three';
import { addObject3DComponent } from './addObject3DComponent';
import { Engine } from '../../ecs/classes/Engine';
import { Interactable } from "../../interaction/components/Interactable";
import { Behavior } from "../../common/interfaces/Behavior";
import { getComponent } from "../../ecs/functions/EntityFunctions";
import AudioSource from '../classes/AudioSource';
import { Object3DComponent } from '../components/Object3DComponent';
import { isWebWorker } from '../../common/functions/getEnvironment';
import VolumetricComponent from "../components/VolumetricComponent";
import { addComponent, getMutableComponent } from '../../ecs/functions/EntityFunctions';
import { EngineEvents } from '../../ecs/classes/EngineEvents';
import { InteractiveSystem } from '../../interaction/systems/InteractiveSystem';
import Video from '../classes/Video';
import { Network } from '../../networking/classes/Network';
import { PrefabType } from '../../networking/templates/PrefabType';

const isBrowser = new Function("try {return this===window;}catch(e){ return false;}");

const DracosisPlayer = null;
if (isBrowser()) {
  // import("volumetric/src/Player").then(imported => {
  //   DracosisPlayer = imported;
  // });
  // @ts-ignore
  // import PlayerWorker from 'volumetric/src/decoder/workerFunction.ts?worker';
}

export interface AudioProps {
  src: string;
  controls: boolean;
  autoPlay: boolean;
  loop: boolean;
  synchronize: number;
  audioType: 'stereo' | 'pannernode';
  volume: number; 
  distanceModel: 'linear' | 'inverse' | 'exponential';
  rolloffFactor: number;
  refDistance: number;
  maxDistance: number;
  coneInnerAngle: number;
  coneOuterAngle: number;
  coneOuterGain: number;
  interactable: boolean;
}

export interface VideoProps extends AudioProps {
  isLivestream: boolean;
  elementId: string;
  projection: 'flat' | '360-equirectangular';
}

export const elementPlaying = (element: any): boolean => {
  // if (isWebWorker) return element?._isPlaying;
  return element && (!!(element.currentTime > 0 && !element.paused && !element.ended && element.readyState > 2));
};

const onMediaInteraction = (entityInitiator, args, delta, entityInteractive, time) => {
  const volumetric = getComponent(entityInteractive, VolumetricComponent);
  if (volumetric) {
    // TODO handle volumetric interaction here
    return
  }
  console.log('onMediaInteraction')

  const source = getComponent(entityInteractive, Object3DComponent).value as AudioSource;
  if (elementPlaying(source.el)) {
    if(typeof source.pause === 'function') source.pause();
  } else {
    if(typeof source.play === 'function')source.play();
  }
};

const onMediaInteractionHover = (entityInitiator, { focused }: { focused: boolean }, delta, entityInteractive, time) => {
  const { el: mediaElement } = getComponent(entityInteractive, Object3DComponent).value as AudioSource;

  EngineEvents.instance.dispatchEvent({
    type: InteractiveSystem.EVENTS.OBJECT_HOVER,
    focused,
    interactionType: 'mediaSource',
    interactionText: elementPlaying(mediaElement) ? 'pause video' : 'play video'
  });
};

export function createMediaServer(entity, args: any): void {
  addObject3DComponent(entity, { obj3d: new Object3D(), objArgs: args });
  if (args.interactable) addInteraction(entity);
  // If media component is not requires to be sync then return
  
  // const data = {
  //   networkId: Network.getNetworkId(),
  //   prefabType: PrefabType.MediaStream,
  //   uniqueId: MathUtils.generateUUID(),
  //   ownerId: 'server',
  //   parameters: {
  //     sceneEntityId: args.sceneEntityId,
  //     sceneEntityName: entity.name,
  //     startTime: args.synchronize,
  //     src: args.src
  //   },
  // };

  // Currently we are only creating media objects while scene loading time,
  // Hence no need to send create object message to clients since they are not yet connected.
  // It will be used when the objects will be created while running.
  // Spread the object so that the changes to the object will not affect original data.
  // Network.instance.worldState.createObjects.push({ ...data });

  // Added into the network Object list of the server
  // Network.instance.networkObjects[data.networkId] = data as any;
}

export function createAudio(entity, args: AudioProps): void {
  addObject3DComponent(entity, { obj3d: new Audio(Engine.audioListener), objArgs: args });
  if(args.interactable) addInteraction(entity);
}


export function createVideo(entity, args: VideoProps): void {
  const video = new Video(Engine.audioListener, args.elementId)
  if(args.synchronize) {
    video.startTime = args.synchronize
    video.isSynced = args.synchronize > 0
  }
  addObject3DComponent(entity, { obj3d: video, objArgs: { ...args } });
  if(args.interactable) addInteraction(entity);
}

export const createVolumetric = (entity, args: VolumetricProps) => {
  addComponent(entity, VolumetricComponent);
  const volumetricComponent = getMutableComponent(entity, VolumetricComponent);
  const container = new Object3D();
  // const worker = new PlayerWorker();
  const DracosisSequence = new DracosisPlayer({
    scene: container,
    renderer: Engine.renderer,
    // worker: worker,
    manifestFilePath: args.src.replace(".drcs", ".manifest"),
    meshFilePath: args.src,
    videoFilePath: args.src.replace(".drcs", ".mp4"),
    loop: args.loop,
    autoplay: args.autoPlay,
    scale: 1,
    frameRate: 25
  });
  volumetricComponent.player = DracosisSequence;
  addObject3DComponent(entity, { obj3d: container });
  if(args.interactable) addInteraction(entity);
};

function addInteraction(entity): void {

  const data = {
    interactionType: 'mediaSource',
  };

  const interactiveData = {
    onInteraction: onMediaInteraction,
    onInteractionCheck: () => { return true; },
    onInteractionFocused: onMediaInteractionHover,
    data
  };

  addComponent(entity, Interactable, interactiveData);

  const onVideoStateChange = (didPlay) => {
    EngineEvents.instance.dispatchEvent({
      type: InteractiveSystem.EVENTS.OBJECT_HOVER,
      focused: true,
      interactionType: 'mediaSource',
      interactionText: didPlay ? 'pause media' : 'play media'
    })
  };

  const { el: mediaElement } = getComponent(entity, Object3DComponent).value as AudioSource;

  if (mediaElement) {
    mediaElement.addEventListener('play', () => {
      onVideoStateChange(true);
    });
    mediaElement.addEventListener('pause', () => {
      onVideoStateChange(false);
    });
  }
}


interface VolumetricProps{
  src :string,
  loop :number,
  autoPlay  : boolean,
  interactable: boolean
}