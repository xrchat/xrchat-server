import { Group, MathUtils, Mesh, Vector3 } from 'three'
import { Body, BodyType, ShapeType, SHAPES } from 'three-physx'
import { AssetLoader } from '../../../../assets/classes/AssetLoader'
import { isClient } from '../../../../common/functions/isClient'
import { Behavior } from '../../../../common/interfaces/Behavior'
import { Engine } from '../../../../ecs/classes/Engine'
import { Entity } from '../../../../ecs/classes/Entity'
import { addComponent, getComponent, getMutableComponent } from '../../../../ecs/functions/EntityFunctions'
import { Network } from '../../../../networking/classes/Network'
import { NetworkObject } from '../../../../networking/components/NetworkObject'
import { initializeNetworkObject } from '../../../../networking/functions/initializeNetworkObject'
import { NetworkPrefab } from '../../../../networking/interfaces/NetworkPrefab'
import { ColliderComponent } from '../../../../physics/components/ColliderComponent'
import { InterpolationComponent } from '../../../../physics/components/InterpolationComponent'
import { LocalInterpolationComponent } from '../../../../physics/components/LocalInterpolationComponent'
import { RigidBodyComponent } from '../../../../physics/components/RigidBody'
import { CollisionGroups } from '../../../../physics/enums/CollisionGroups'
import { PhysicsSystem } from '../../../../physics/systems/PhysicsSystem'
import { Object3DComponent } from '../../../../scene/components/Object3DComponent'
import { TransformComponent } from '../../../../transform/components/TransformComponent'
import { GameObject } from '../../../components/GameObject'
import { getGame } from '../../../functions/functions'
import { GolfCollisionGroups, GolfPrefabTypes } from '../GolfGameConstants'
import TrailRenderer from '../../../../scene/classes/TrailRenderer'

/**
 * @author Josh Field <github.com/HexaField>
 */

export const spawnBall: Behavior = (
  entityPlayer: Entity,
  args?: any,
  delta?: number,
  entityTarget?: Entity,
  time?: number,
  checks?: any
): void => {
  // server sends clients the entity data
  if (isClient) return
  console.warn('SpawnBall')

  const game = getGame(entityPlayer)
  const playerNetworkObject = getComponent(entityPlayer, NetworkObject)

  const networkId = Network.getNetworkId()
  const uuid = MathUtils.generateUUID()
  // send position to spawn
  // now we have just one location
  // but soon
  const teeEntity = game.gameObjects[args.positionCopyFromRole][0]
  const teeTransform = getComponent(teeEntity, TransformComponent)

  const parameters: GolfBallSpawnParameters = {
    gameName: game.name,
    role: 'GolfBall',
    spawnPosition: new Vector3(
      teeTransform.position.x,
      teeTransform.position.y + args.offsetY,
      teeTransform.position.z
    ),
    uuid,
    ownerNetworkId: playerNetworkObject.networkId
  }

  // this spawns the ball on the server
  createGolfBallPrefab({
    networkId,
    uniqueId: uuid,
    ownerId: playerNetworkObject.ownerId, // the uuid of the player whose ball this is
    parameters
  })

  // this sends the ball to the clients
  Network.instance.worldState.createObjects.push({
    networkId,
    ownerId: playerNetworkObject.ownerId,
    uniqueId: uuid,
    prefabType: GolfPrefabTypes.Ball,
    parameters
  })
}

/**
 * @author Josh Field <github.com/HexaField>
 */

export const updateBall: Behavior = (
  entityBall: Entity,
  args?: any,
  delta?: number,
  entityTarget?: Entity,
  time?: number,
  checks?: any
): void => {
  if (isClient) {
    const obj = getComponent(entityBall, Object3DComponent)
    if (!obj?.value) return
    const ballMesh = obj.value.userData.trailObject as TrailRenderer
    ballMesh.advance()
    ballMesh.updateHead()
    console.log(ballMesh)
  }
}

/**
 * @author Josh Field <github.com/HexaField>
 */

const golfBallRadius = 0.03 // this is the graphical size of the golf ball
const golfBallColliderExpansion = 0.03 // this is the size of the ball collider

function assetLoadCallback(group: Group, ballEntity: Entity) {
  // its transform was set in createGolfBallPrefab from parameters (its transform Golf Tee);
  const transform = getComponent(ballEntity, TransformComponent)
  const gameObject = getComponent(ballEntity, GameObject)
  const ballMesh = group.children[0].clone(true) as Mesh
  ballMesh.name = 'Ball' + gameObject.uuid
  ballMesh.position.copy(transform.position)
  ballMesh.scale.copy(transform.scale)
  ballMesh.castShadow = true
  ballMesh.receiveShadow = true
  addComponent(ballEntity, Object3DComponent, { value: ballMesh })

  // Add trail effect

  const trailHeadGeometry = []
  trailHeadGeometry.push(new Vector3(-10.0, 0.0, 0.0), new Vector3(0.0, 0.0, 0.0), new Vector3(10.0, 0.0, 0.0))
  const trailObject = new TrailRenderer(false)
  const trailMaterial = TrailRenderer.createBaseMaterial()
  const trailLength = 150
  Engine.scene.add(trailObject)
  trailObject.initialize(trailMaterial, trailLength, false, 150, trailHeadGeometry, ballMesh)
  ballMesh.userData.trailObject = trailObject
  console.log(ballMesh)
}

export const initializeGolfBall = (ballEntity: Entity) => {
  // its transform was set in createGolfBallPrefab from parameters (its transform Golf Tee);
  const transform = getComponent(ballEntity, TransformComponent)

  if (isClient) {
    AssetLoader.load(
      {
        url: Engine.publicPath + '/models/golf/golf_ball.glb'
      },
      (group: Group) => {
        assetLoadCallback(group, ballEntity)
      }
    )
  }

  const shape: ShapeType = {
    shape: SHAPES.Sphere,
    options: { radius: golfBallRadius + golfBallColliderExpansion },
    config: {
      // we add a rest offset to make the contact detection of the ball bigger, without making the actual size of the ball bigger
      restOffset: -golfBallColliderExpansion,
      // we mostly reverse the expansion for contact detection (so the ball rests on the ground)
      // this will not reverse the expansion for trigger colliders
      contactOffset: golfBallColliderExpansion,
      material: { staticFriction: 0.2, dynamicFriction: 0.2, restitution: 0.9 },
      collisionLayer: GolfCollisionGroups.Ball,
      collisionMask: CollisionGroups.Default | CollisionGroups.Ground | GolfCollisionGroups.Hole
    }
  }

  const body = PhysicsSystem.instance.addBody(
    new Body({
      shapes: [shape],
      type: BodyType.DYNAMIC,
      transform: {
        translation: { x: transform.position.x, y: transform.position.y, z: transform.position.z }
      },
      userData: ballEntity
    })
  )

  const collider = getMutableComponent(ballEntity, ColliderComponent)
  collider.body = body
}

type GolfBallSpawnParameters = {
  gameName: string
  role: string
  uuid: string
  ownerNetworkId?: number
  spawnPosition: Vector3
}

export const createGolfBallPrefab = (args: {
  parameters?: GolfBallSpawnParameters
  networkId?: number
  uniqueId: string
  ownerId?: string
}) => {
  console.log('createGolfBallPrefab', args.parameters)
  initializeNetworkObject({
    prefabType: GolfPrefabTypes.Ball,
    uniqueId: args.uniqueId,
    ownerId: args.ownerId,
    networkId: args.networkId,
    parameters: args.parameters,
    override: {
      networkComponents: [
        {
          type: GameObject,
          data: {
            gameName: args.parameters.gameName,
            role: args.parameters.role,
            uuid: args.parameters.uuid
          }
        },
        {
          type: TransformComponent,
          data: {
            position: new Vector3(
              args.parameters.spawnPosition.x,
              args.parameters.spawnPosition.y + golfBallRadius,
              args.parameters.spawnPosition.z
            ),
            scale: new Vector3().setScalar(golfBallRadius)
          }
        }
      ]
    }
  })
}

// Prefab is a pattern for creating an entity and component collection as a prototype
export const GolfBallPrefab: NetworkPrefab = {
  initialize: createGolfBallPrefab,
  // These will be created for all players on the network
  networkComponents: [
    // Transform system applies values from transform component to three.js object (position, rotation, etc)
    { type: TransformComponent },
    { type: ColliderComponent },
    { type: RigidBodyComponent },
    { type: GameObject }
    // Local player input mapped to behaviors in the input map
  ],
  // These are only created for the local player who owns this prefab
  localClientComponents: [{ type: LocalInterpolationComponent }],
  clientComponents: [{ type: InterpolationComponent }],
  serverComponents: [],
  onAfterCreate: [
    {
      behavior: initializeGolfBall,
      networked: true
    }
  ],
  onBeforeDestroy: []
}
