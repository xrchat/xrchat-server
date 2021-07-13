/** Functions to provide engine level functionalities. */

import { Color } from 'three'
import { PhysXInstance } from 'three-physx'
import { AssetLoader } from '../../assets/classes/AssetLoader'
import { disposeDracoLoaderWorkers } from '../../assets/functions/LoadGLTF'
import { now } from '../../common/functions/now'
import { Network } from '../../networking/classes/Network'
import { Vault } from '../../networking/classes/Vault'
import { PhysicsSystem } from '../../physics/systems/PhysicsSystem'
import disposeScene from '../../renderer/functions/disposeScene'
import { PersistTagComponent } from '../../scene/components/PersistTagComponent'
import { WorldScene } from '../../scene/functions/SceneLoading'
import { Engine } from '../classes/Engine'
import { System } from '../classes/System'
import { hasComponent, removeAllComponents, removeAllEntities, removeEntity } from './EntityFunctions'
import { SystemUpdateType } from './SystemUpdateType'

/** Reset the engine and remove everything from memory. */
export async function reset(): Promise<void> {
  console.log('RESETTING ENGINE')
  // Stop all running workers
  Engine.workers.forEach((w) => w.terminate())
  Engine.workers.length = 0

  disposeDracoLoaderWorkers()

  // clear all entities components
  await new Promise<void>((resolve) => {
    Engine.entities.forEach((entity) => {
      removeAllComponents(entity, false)
    })
    setTimeout(() => {
      executeSystemBeforeReset() // for systems to handle components deletion
      resolve()
    }, 500)
  })

  await new Promise<void>((resolve) => {
    // delete all entities
    removeAllEntities()
    setTimeout(() => {
      executeSystemBeforeReset() // for systems to handle components deletion
      resolve()
    }, 500)
  })

  if (Engine.entities.length) {
    console.log('Engine.entities.length', Engine.entities.length)
    throw new Error('Engine.entities cleanup not complete')
  }

  Engine.tick = 0

  Engine.entities.length = 0
  Engine.entitiesToRemove.length = 0
  Engine.entitiesWithComponentsToRemove.length = 0
  Engine.nextEntityId = 0

  // cleanup/unregister components
  Engine.components.length = 0
  // Engine.componentsMap = {}
  // Engine.numComponents = {}
  // Engine.componentPool = {}
  Engine.nextComponentId = 0

  // cleanup systems
  Engine.systems.forEach((system) => {
    system.dispose()
  })
  Engine.systems.length = 0
  Engine.activeSystems.clear()

  // cleanup queries
  Engine.queries.length = 0

  // cleanup events
  Engine.eventDispatcher.reset()

  // delete all what is left on scene
  if (Engine.scene) {
    disposeScene(Engine.scene)
    Engine.scene = null
  }
  Engine.sceneLoaded = false
  WorldScene.isLoading = false

  Engine.camera = null

  if (Engine.renderer) {
    Engine.renderer.clear(true, true, true)
    Engine.renderer.dispose()
    Engine.renderer = null
  }

  Network.instance.dispose()

  Vault.instance.clear()
  AssetLoader.Cache.clear()

  // Engine.enabled = false;
  Engine.gameMode = null
  Engine.inputState.clear()
  Engine.prevInputState.clear()
  Engine.viewportElement = null
}

/**
 * Execute all systems (a "frame").
 * This is typically called on a loop.
 * **WARNING:** This is called by {@link initialize.initializeEngine | initializeEngine()}.\
 * You probably don't want to use this.
 *
 * @author Fernando Serrano, Robert Long
 */
export function execute(delta: number, time: number, updateType: SystemUpdateType): void {
  Engine.tick++
  time = now() / 1000
  if (!delta) {
    delta = time - Engine.lastTime
  }
  Engine.lastTime = time
  // if (Engine.enabled) {
  Engine.activeSystems.execute(delta, time, updateType)
  processDeferredEntityRemoval()
  // }
}

function executeSystemBeforeReset() {
  Engine.tick++
  const time = now() / 1000
  const delta = 0.001
  Engine.lastTime = time

  if (Engine.enabled) {
    Engine.activeSystems.executeAll(delta, time)
    processDeferredEntityRemoval()
  }
}

/**
 * Remove entities at the end of a simulation frame.
 * **NOTE:** By default, the engine is set to process deferred removal, so this will be called.
 *
 * @author Fernando Serrano, Robert Long
 */
function processDeferredEntityRemoval() {
  if (!Engine.deferredRemovalEnabled) {
    return
  }
  const entitiesToRemove = Engine.entitiesToRemove
  const entitiesWithComponentsToRemove = Engine.entitiesWithComponentsToRemove
  for (let i = 0; i < entitiesToRemove.length; i++) {
    const entity = entitiesToRemove[i]
    const index = Engine.entities.indexOf(entity)
    Engine.entities.splice(index, 1)
    Engine.entityMap.delete(String(entity.id))
    entity._pool.release(entity)
  }
  entitiesToRemove.length = 0

  for (let i = 0; i < entitiesWithComponentsToRemove.length; i++) {
    const entity = entitiesWithComponentsToRemove[i]
    while (entity.componentTypesToRemove.length > 0) {
      const Component = entity.componentTypesToRemove.pop()

      const component = entity.componentsToRemove[Component._typeId]
      delete entity.componentsToRemove[Component._typeId]
      if (component) {
        component.dispose()
        Engine.numComponents[component._typeId]--
      }
    }
  }

  Engine.entitiesWithComponentsToRemove.length = 0
}

/**
 * Disable execution of systems without stopping timer.
 *
 * @author Fernando Serrano, Robert Long
 */
export function pause(): void {
  Engine.enabled = false
  Engine.systems.forEach((system) => system.stop())
}

/**
 * Get stats for all entities, components and systems in the simulation.
 *
 * @author Fernando Serrano, Robert Long
 */
export function stats(): { entities: any; system: any } {
  const queryStats = {}
  for (const queryName in Engine.queries) {
    queryStats[queryName] = Engine.queries[queryName].stats()
  }

  const entityStatus = {
    numEntities: Engine.entities.length,
    numQueries: Object.keys(System.queries).length,
    queries: queryStats,
    numComponentPool: Object.keys(Engine.componentPool).length,
    componentPool: {},
    eventDispatcher: (Engine.eventDispatcher as any).stats
  }

  for (const componentId in Engine.componentPool) {
    const pool = Engine.componentPool[componentId]
    entityStatus.componentPool[pool.type.name] = {
      used: pool.poolSize - pool.freeList.length,
      size: pool.count
    }
  }

  const systemStatus = {
    numSystems: Engine.systems.length,
    systems: {}
  }

  for (let i = 0; i < Engine.systems.length; i++) {
    const system = Engine.systems[i]
    const systemStats = (systemStatus.systems[system.name] = {
      queries: {},
      executeTime: system.executeTime
    })
  }

  return {
    entities: entityStatus,
    system: systemStatus
  }
}

/** Reset the engine and clear all the timers. */
export async function resetEngine(): Promise<void> {
  Engine.engineTimer?.clear()
  Engine.engineTimer = null

  await reset()
}

export const delay = (delay: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, delay)
  })
}

export const processLocationChange = async (): Promise<void> => {
  const entitiesToRemove = []
  const removedEntities = []
  const sceneObjectsToRemove = []

  Engine.entities.forEach((entity) => {
    if (!hasComponent(entity, PersistTagComponent)) {
      removeAllComponents(entity, false)
      entitiesToRemove.push(entity)
      removedEntities.push(entity.id)
    }
  })

  executeSystemBeforeReset()

  Engine.scene.background = new Color('black')
  Engine.scene.environment = null

  Engine.scene.traverse((o: any) => {
    console.log(o, o.entity)
    if (!o.entity) return
    if (!removedEntities.includes(o.entity.id)) return

    sceneObjectsToRemove.push(o)
  })

  sceneObjectsToRemove.forEach((o) => Engine.scene.remove(o))

  entitiesToRemove.forEach((entity) => {
    removeEntity(entity, false)
  })

  executeSystemBeforeReset()

  Engine.systems.forEach((system: System) => {
    system.reset()
  })

  await resetPhysics()
}

export const resetPhysics = async (): Promise<void> => {
  PhysicsSystem.instance.worker.terminate()
  Engine.workers.splice(Engine.workers.indexOf(PhysicsSystem.instance.worker), 1)
  PhysXInstance.instance.dispose()
  PhysXInstance.instance = new PhysXInstance()
  await PhysicsSystem.instance.initialize()
}
