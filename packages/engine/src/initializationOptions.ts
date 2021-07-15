import { CharacterInputSchema } from './character/CharacterInputSchema'
import { DefaultGameMode } from './game/templates/DefaultGameMode'
import { DefaultNetworkSchema } from './networking/templates/DefaultNetworkSchema'
import { GamesSchema, GameType } from './game/templates/GamesSchema'
import { InputSchema } from './input/interfaces/InputSchema'
import { NetworkSchema } from './networking/interfaces/NetworkSchema'
import { GameMode } from './game/types/GameMode'
import { PhysXConfig } from 'three-physx'
import { SystemConstructor } from './ecs/classes/System'

export enum EngineSystemPresets {
  CLIENT,
  EDITOR,
  SERVER
}

export type InitializeOptions = {
  type?: EngineSystemPresets
  input?: {
    disabled?: boolean
    schema: InputSchema
  }
  networking?: {
    schema?: NetworkSchema
    app?: any
    useOfflineMode?: boolean
  }
  renderer?: {
    canvasId?: string
    disabled?: boolean
    postProcessing?: boolean
  }
  gameMode?: GameMode
  supportedGameModes?: {
    [key: string]: GameMode
  }
  publicPath?: string
  physics?: {
    simulationEnabled?: boolean
    physicsWorldConfig?: PhysXConfig
    physxWorker?: any
  }
  systems?: [
    {
      system: SystemConstructor<any>
      args?: any
    }
  ]
}

/**
 *
 * @author Shaw
 * If you just want to start up multiplayer worlds, use this.
 * Otherwise you should copy this into your own into your initializeEngine call.
 */
export const DefaultInitializationOptions: InitializeOptions = {
  type: EngineSystemPresets.CLIENT,
  publicPath: '',
  input: {
    disabled: false,
    schema: CharacterInputSchema
  },
  networking: {
    schema: DefaultNetworkSchema,
    useOfflineMode: false
  },
  renderer: {
    disabled: false,
    postProcessing: true
  },
  gameMode: DefaultGameMode,
  supportedGameModes: GamesSchema,
  physics: {
    simulationEnabled: true, // start the engine with the physics simulation running
    physicsWorldConfig: {
      bounceThresholdVelocity: 0.5,
      maximumDelta: 1000 / 20, // limits physics maximum delta so no huge jumps can be made
      start: false,
      lengthScale: 1,
      verbose: false,
      substeps: 1,
      gravity: { x: 0, y: -9.81, z: 0 }
    }
  }
}
