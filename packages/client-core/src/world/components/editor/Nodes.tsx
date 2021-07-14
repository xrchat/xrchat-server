import AmbientLightNode from '@xrengine/engine/src/editor/nodes/AmbientLightNode'
import AudioNode from '@xrengine/engine/src/editor/nodes/AudioNode'
import BoxColliderNode from '@xrengine/engine/src/editor/nodes/BoxColliderNode'
import PortalNode from '@xrengine/engine/src/editor/nodes/PortalNode'
import DirectionalLightNode from '@xrengine/engine/src/editor/nodes/DirectionalLightNode'
import FloorPlanNode from '@xrengine/engine/src/editor/nodes/FloorPlanNode'
import GameNode from '@xrengine/engine/src/editor/nodes/GameNode'
import GroundPlaneNode from '@xrengine/engine/src/editor/nodes/GroundPlaneNode'
import GroupNode from '@xrengine/engine/src/editor/nodes/GroupNode'
import HemisphereLightNode from '@xrengine/engine/src/editor/nodes/HemisphereLightNode'
import ImageNode from '@xrengine/engine/src/editor/nodes/ImageNode'
import LinkNode from '@xrengine/engine/src/editor/nodes/LinkNode'
import ModelNode from '@xrengine/engine/src/editor/nodes/ModelNode'
import ParticleEmitterNode from '@xrengine/engine/src/editor/nodes/ParticleEmitterNode'
import PointLightNode from '@xrengine/engine/src/editor/nodes/PointLightNode'
import PostProcessingNode from '@xrengine/engine/src/editor/nodes/PostProcessingNode'
import SceneNode from '@xrengine/engine/src/editor/nodes/SceneNode'
import ScenePreviewCameraNode from '@xrengine/engine/src/editor/nodes/ScenePreviewCameraNode'
import SkyboxNode from '@xrengine/engine/src/editor/nodes/SkyboxNode'
import SpawnPointNode from '@xrengine/engine/src/editor/nodes/SpawnPointNode'
import SpotLightNode from '@xrengine/engine/src/editor/nodes/SpotLightNode'
import TriggerVolumeNode from '@xrengine/engine/src/editor/nodes/TriggerVolumeNode'
import VideoNode from '@xrengine/engine/src/editor/nodes/VideoNode'
import VolumetricNode from '@xrengine/engine/src/editor/nodes/VolumetricNode'
import ReflectionProbeNode from '@xrengine/engine/src/editor/nodes/ReflectionProbeNode'
import SplineNode from '@xrengine/engine/src/editor/nodes/SplineNode'
import ElementsSource from './assets/sources/ElementsSource'
import MyAssetsSource from './assets/sources/MyAssetsSource'
import Editor from './Editor'
import AmbientLightNodeEditor from './properties/AmbientLightNodeEditor'
import AudioNodeEditor from './properties/AudioNodeEditor'
import BoxColliderNodeEditor from './properties/BoxColliderNodeEditor'
import PortalNodeEditor from './properties/PortalNodeEditor'
import DirectionalLightNodeEditor from './properties/DirectionalLightNodeEditor'
import FloorPlanNodeEditor from './properties/FloorPlanNodeEditor'
import GameNodeEditor from './properties/GameNodeEditor'
import GroundPlaneNodeEditor from './properties/GroundPlaneNodeEditor'
import GroupNodeEditor from './properties/GroupNodeEditor'
import HemisphereLightNodeEditor from './properties/HemisphereLightNodeEditor'
import ImageNodeEditor from './properties/ImageNodeEditor'
import LinkNodeEditor from './properties/LinkNodeEditor'
import ModelNodeEditor from './properties/ModelNodeEditor'
import ParticleEmitterNodeEditor from './properties/ParticleEmitterNodeEditor'
import PointLightNodeEditor from './properties/PointLightNodeEditor'
import PostProcessingNodeEditor from './properties/PostProcessingNodeEditor'
import ReflectionProbeNodeEditor from './properties/ReflectionProbeNodeEditor'
import SceneNodeEditor from './properties/SceneNodeEditor'
import ScenePreviewCameraNodeEditor from './properties/ScenePreviewCameraNodeEditor'
import SkyboxNodeEditor from './properties/SkyboxNodeEditor'
import SpawnPointNodeEditor from './properties/SpawnPointNodeEditor'
import SplineNodeEditor from './properties/SplineNodeEditor'
import SpotLightNodeEditor from './properties/SpotLightNodeEditor'
import TriggerVolumeNodeEditor from './properties/TriggerVolumeNodeEditor'
import VideoNodeEditor from './properties/VideoNodeEditor'
import VolumetricNodeEditor from './properties/VolumetricNodeEditor'
import MapNodeEditor from './properties/MapNodeEditor'
import MapNode from '@xrengine/engine/src/editor/nodes/MapNode'

/**
 * createEditor used to create editor object and register nodes available to create scene.
 *
 * @author Robert Long
 * @param  {any} api      [provides the api object]
 * @param  {any} settings [provides settings to be Applied]
 * @return {Editor}          [editor]
 */
export function createEditor(api, settings, Engine) {
  const editor = new Editor(api, settings, Engine)
  editor.registerNode(SceneNode, SceneNodeEditor)
  editor.registerNode(GroupNode, GroupNodeEditor)
  editor.registerNode(ModelNode, ModelNodeEditor)
  editor.registerNode(GroundPlaneNode, GroundPlaneNodeEditor)
  editor.registerNode(BoxColliderNode, BoxColliderNodeEditor)
  editor.registerNode(PortalNode, PortalNodeEditor)
  editor.registerNode(AmbientLightNode, AmbientLightNodeEditor)
  editor.registerNode(DirectionalLightNode, DirectionalLightNodeEditor)
  editor.registerNode(HemisphereLightNode, HemisphereLightNodeEditor)
  editor.registerNode(SpotLightNode, SpotLightNodeEditor)
  editor.registerNode(PointLightNode, PointLightNodeEditor)
  editor.registerNode(SpawnPointNode, SpawnPointNodeEditor)
  editor.registerNode(SkyboxNode, SkyboxNodeEditor)
  editor.registerNode(FloorPlanNode, FloorPlanNodeEditor)
  editor.registerNode(ImageNode, ImageNodeEditor)
  editor.registerNode(VideoNode, VideoNodeEditor)
  editor.registerNode(VolumetricNode, VolumetricNodeEditor)
  editor.registerNode(AudioNode, AudioNodeEditor)
  editor.registerNode(PostProcessingNode, PostProcessingNodeEditor)
  editor.registerNode(TriggerVolumeNode, TriggerVolumeNodeEditor)
  editor.registerNode(LinkNode, LinkNodeEditor)
  editor.registerNode(ScenePreviewCameraNode, ScenePreviewCameraNodeEditor)
  editor.registerNode(ParticleEmitterNode, ParticleEmitterNodeEditor)
  editor.registerNode(SplineNode, SplineNodeEditor)
  editor.registerSource(new ElementsSource(editor))
  editor.registerSource(new MyAssetsSource(editor))
  editor.registerNode(GameNode, GameNodeEditor)
  editor.registerNode(MapNode, MapNodeEditor)
  editor.registerNode(ReflectionProbeNode, ReflectionProbeNodeEditor)
  return editor
}
