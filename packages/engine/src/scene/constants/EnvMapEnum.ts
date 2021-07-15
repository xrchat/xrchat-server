import { ReflectionProbeSettings } from '../../editor/nodes/ReflectionProbeNode'

export const enum EnvMapSourceType {
  'Default',
  'Texture',
  'Color',
  'Skybox',
  'ReflectionProbe'
}

export const enum EnvMapTextureType {
  'Cubemap',
  'Equirectangular'
}

export type EnvMapProps = {
  type: EnvMapSourceType
  envMapIntensity: number
  envMapSourceURL?: string
  envMapTextureType?: EnvMapTextureType
  envMapSourceColor?: string
  envMapReflectionProbe?: ReflectionProbeSettings
}
