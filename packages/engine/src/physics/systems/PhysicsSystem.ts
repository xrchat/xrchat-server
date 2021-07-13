import { Not } from '../../ecs/functions/ComponentFunctions'
import { EngineEvents } from '../../ecs/classes/EngineEvents'
import { System, SystemAttributes } from '../../ecs/classes/System'
import { getComponent, getMutableComponent } from '../../ecs/functions/EntityFunctions'
import { SystemUpdateType } from '../../ecs/functions/SystemUpdateType'
import { LocalInputReceiver } from '../../input/components/LocalInputReceiver'
import { Network } from '../../networking/classes/Network'
import { Vault } from '../../networking/classes/Vault'
import { NetworkObject } from '../../networking/components/NetworkObject'
import { calculateInterpolation, createSnapshot } from '../../networking/functions/NetworkInterpolationFunctions'
import { TransformComponent } from '../../transform/components/TransformComponent'
import { ColliderComponent } from '../components/ColliderComponent'
import { InterpolationComponent } from '../components/InterpolationComponent'
import { isClient } from '../../common/functions/isClient'
import { BodyType, PhysXConfig, PhysXInstance } from 'three-physx'
import { findInterpolationSnapshot } from '../behaviors/findInterpolationSnapshot'
import { Vector3 } from 'three'
import { SnapshotData } from '../../networking/types/SnapshotDataTypes'
import { characterCorrectionBehavior } from '../../character/behaviors/characterCorrectionBehavior'
import { CharacterComponent } from '../../character/components/CharacterComponent'
import { characterInterpolationBehavior } from '../../character/behaviors/characterInterpolationBehavior'
import { rigidbodyInterpolationBehavior } from '../behaviors/rigidbodyInterpolationBehavior'
import { LocalInterpolationComponent } from '../components/LocalInterpolationComponent'
import { ControllerColliderComponent } from '../../character/components/ControllerColliderComponent'
import { rigidbodyCorrectionBehavior } from '../behaviors/rigidbodyCorrectionBehavior'
import Worker from 'web-worker'
import { Engine } from '../../ecs/classes/Engine'

/**
 * @author HydraFire <github.com/HydraFire>
 * @author Josh Field <github.com/HexaField>
 */

const vec3 = new Vector3()

export class PhysicsSystem extends System {
  static EVENTS = {
    PORTAL_REDIRECT_EVENT: 'PHYSICS_SYSTEM_PORTAL_REDIRECT'
  }
  static instance: PhysicsSystem
  updateType = SystemUpdateType.Fixed

  physicsWorldConfig: PhysXConfig
  worker: Worker

  simulationEnabled: boolean

  constructor(attributes: SystemAttributes = {}) {
    super(attributes)
    PhysicsSystem.instance = this
    this.physicsWorldConfig = Object.assign({}, attributes.physicsWorldConfig)

    EngineEvents.instance.addEventListener(EngineEvents.EVENTS.ENABLE_SCENE, (ev: any) => {
      if (typeof ev.physics !== 'undefined') {
        this.simulationEnabled = ev.physics
      }
    })

    if (!PhysXInstance.instance) {
      PhysXInstance.instance = new PhysXInstance()
    }

    this.simulationEnabled = attributes.simulationEnabled ?? true
  }

  async initialize() {
    super.initialize()
    console.log(import.meta)
    const url = new URL('../functions/loadPhysX', import.meta.url)
    console.log(url)
    this.worker = new Worker(url, { type: 'module' })
    await PhysXInstance.instance.initPhysX(this.worker, this.physicsWorldConfig)

    Engine.workers.push(this.worker)
  }

  reset(): void {
    // TODO: PhysXInstance.instance.reset();
  }

  dispose(): void {
    super.dispose()
    this.reset()
    PhysXInstance.instance.dispose()
    EngineEvents.instance.removeAllListenersForEvent(PhysicsSystem.EVENTS.PORTAL_REDIRECT_EVENT)
  }

  execute(delta: number): void {
    this.queryResults.collider.removed?.forEach((entity) => {
      const colliderComponent = getComponent<ColliderComponent>(entity, ColliderComponent, true)
      if (colliderComponent) {
        this.removeBody(colliderComponent.body)
      }
    })

    this.queryResults.collider.all?.forEach((entity) => {
      const collider = getMutableComponent<ColliderComponent>(entity, ColliderComponent)
      const transform = getComponent(entity, TransformComponent)

      if (collider.body.type === BodyType.KINEMATIC) {
        collider.velocity.subVectors(collider.body.transform.translation, transform.position)
        collider.body.updateTransform({ translation: transform.position, rotation: transform.rotation })
      } else if (collider.body.type === BodyType.DYNAMIC) {
        collider.velocity.subVectors(transform.position, collider.body.transform.translation)

        transform.position.set(
          collider.body.transform.translation.x,
          collider.body.transform.translation.y,
          collider.body.transform.translation.z
        )
        collider.position.copy(transform.position)

        transform.rotation.set(
          collider.body.transform.rotation.x,
          collider.body.transform.rotation.y,
          collider.body.transform.rotation.z,
          collider.body.transform.rotation.w
        )
        collider.quaternion.copy(transform.rotation)
      }
    })

    if (isClient && Network.instance?.snapshot) {
      const snapshots: SnapshotData = {
        interpolation: calculateInterpolation('x y z quat velocity'),
        correction: Vault.instance?.get(Network.instance.snapshot.timeCorrection, true),
        new: []
      }
      // Create new snapshot position for next frame server correction
      Vault.instance.add(createSnapshot(snapshots.new))

      this.queryResults.localCharacterInterpolation.all?.forEach((entity) => {
        characterCorrectionBehavior(entity, snapshots, delta)
      })

      this.queryResults.networkClientInterpolation.all?.forEach((entity) => {
        characterInterpolationBehavior(entity, snapshots, delta)
      })

      this.queryResults.networkObjectInterpolation.all?.forEach((entity) => {
        rigidbodyInterpolationBehavior(entity, snapshots, delta)
      })

      this.queryResults.localObjectInterpolation.all?.forEach((entity) => {
        rigidbodyCorrectionBehavior(entity, snapshots, delta)
        // experementalRigidbodyCorrectionBehavior(entity, snapshots, delta);
      })

      // If a networked entity does not have an interpolation component, just copy the data
      this.queryResults.correctionFromServer.all?.forEach((entity) => {
        const snapshot = findInterpolationSnapshot(entity, Network.instance.snapshot)
        if (snapshot == null) return
        const collider = getMutableComponent(entity, ColliderComponent)
        // dynamic objects should be interpolated, kinematic objects should not
        if (collider && collider.body.type !== BodyType.KINEMATIC) {
          collider.velocity.subVectors(
            collider.body.transform.translation,
            vec3.set(snapshot.x, snapshot.y, snapshot.z)
          )
          collider.body.updateTransform({
            translation: {
              x: snapshot.x,
              y: snapshot.y,
              z: snapshot.z
            },
            rotation: {
              x: snapshot.qX,
              y: snapshot.qY,
              z: snapshot.qZ,
              w: snapshot.qW
            }
          })
        }
      })
    }

    PhysXInstance.instance.update()
  }

  get gravity() {
    return { x: 0, y: -9.81, z: 0 }
  }

  set gravity(value: { x: number; y: number; z: number }) {
    // todo
  }

  addRaycastQuery(query) {
    return PhysXInstance.instance.addRaycastQuery(query)
  }
  removeRaycastQuery(query) {
    return PhysXInstance.instance.removeRaycastQuery(query)
  }
  addBody(args) {
    return PhysXInstance.instance.addBody(args)
  }
  removeBody(body) {
    return PhysXInstance.instance.removeBody(body)
  }
  createController(options) {
    return PhysXInstance.instance.createController(options)
  }
  removeController(id) {
    return PhysXInstance.instance.removeController(id)
  }
}

PhysicsSystem.queries = {
  localCharacterInterpolation: {
    components: [LocalInputReceiver, ControllerColliderComponent, InterpolationComponent, NetworkObject]
  },
  networkClientInterpolation: {
    components: [Not(LocalInputReceiver), ControllerColliderComponent, InterpolationComponent, NetworkObject]
  },
  localObjectInterpolation: {
    components: [Not(CharacterComponent), LocalInterpolationComponent, InterpolationComponent, NetworkObject]
  },
  networkObjectInterpolation: {
    components: [Not(CharacterComponent), Not(LocalInterpolationComponent), InterpolationComponent, NetworkObject]
  },
  correctionFromServer: {
    components: [Not(InterpolationComponent), NetworkObject]
  },
  collider: {
    components: [ColliderComponent, TransformComponent],
    listen: {
      added: true,
      removed: true
    }
  }
}
