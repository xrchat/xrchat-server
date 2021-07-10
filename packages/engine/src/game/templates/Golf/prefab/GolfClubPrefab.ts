
import { Entity } from '../../../../ecs/classes/Entity';
import { NetworkPrefab } from '../../../../networking/interfaces/NetworkPrefab';
import { TransformComponent } from '../../../../transform/components/TransformComponent';
import { ColliderComponent } from '../../../../physics/components/ColliderComponent';
import { RigidBodyComponent } from '../../../../physics/components/RigidBody';
import { initializeNetworkObject } from '../../../../networking/functions/initializeNetworkObject';
import { GolfCollisionGroups, GolfPrefabTypes, GolfColors } from '../GolfGameConstants';
import { BoxBufferGeometry, DoubleSide, Group, Material, Mesh, MeshStandardMaterial, Quaternion, Vector3, MathUtils } from 'three';
import { Body, BodyType, ColliderHitEvent, ShapeType, RaycastQuery, SceneQueryType, SHAPES } from 'three-physx';
import { CollisionGroups } from '../../../../physics/enums/CollisionGroups';
import { PhysicsSystem } from '../../../../physics/systems/PhysicsSystem';
import { Object3DComponent } from '../../../../scene/components/Object3DComponent';
import { GameObject } from '../../../components/GameObject';
import { Behavior } from '../../../../common/interfaces/Behavior';
import { hasComponent, addComponent, getComponent, getMutableComponent } from '../../../../ecs/functions/EntityFunctions';
import { Network } from '../../../../networking/classes/Network';
import { isClient } from '../../../../common/functions/isClient';
import { getGame } from '../../../functions/functions';
import { NetworkObject } from '../../../../networking/components/NetworkObject';
import { GolfClubComponent } from '../components/GolfClubComponent';
import { getHandTransform } from '../../../../xr/functions/WebXRFunctions';
import { DebugArrowComponent } from '../../../../debug/DebugArrowComponent';
import { GameObjectInteractionBehavior } from '../../../interfaces/GameObjectPrefab';
import { NetworkObjectOwner } from '../../../../networking/components/NetworkObjectOwner';
import { Action, State } from '../../../types/GameComponents';
import { addActionComponent } from '../../../functions/functionsActions';
import { GamePlayer } from '../../../components/GamePlayer';
import { YourTurn } from '../components/YourTurnTagComponent';
import { XRUserSettings } from '../../../../xr/types/XRUserSettings';
import { Interactable } from '../../../../interaction/components/Interactable';

const vector0 = new Vector3();
const vector1 = new Vector3();
const vec3 = new Vector3();
const quat = new Quaternion();
const quat2 = new Quaternion();
const quat3 = new Quaternion();

/**
 * @author Josh Field <github.com/HexaField>
 */

export const spawnClub: Behavior = (entityPlayer: Entity, args?: any, delta?: number, entityTarget?: Entity, time?: number, checks?: any): void => {

  // server sends clients the entity data
  if (isClient) return;

  const game = getGame(entityPlayer);
  const playerNetworkObject = getComponent(entityPlayer, NetworkObject);
  /*console.log(playerNetworkObject);
  console.log(playerNetworkObject.entity.gamePlayer.role);
  console.log('spawning club for player', playerNetworkObject.ownerId);*/

  const networkId = Network.getNetworkId();
  const uuid = MathUtils.generateUUID();

  const parameters: GolfClubSpawnParameters = {
    gameName: game.name,
    role: 'GolfClub',
    uuid,
    ownerNetworkId: playerNetworkObject.networkId
  };

  // this spawns the club on the server
  createGolfClubPrefab({
    networkId,
    uniqueId: uuid,
    ownerId: playerNetworkObject.ownerId,
    parameters
  })

  // this sends the club to the clients
  Network.instance.worldState.createObjects.push({
    networkId,
    ownerId: playerNetworkObject.ownerId,
    uniqueId: uuid,
    prefabType: GolfPrefabTypes.Club,
    parameters,
  })
};

export const enableClub = (entityClub: Entity, enable: boolean): void => {
  const golfClubComponent = getMutableComponent(entityClub, GolfClubComponent);
  golfClubComponent.canHitBall = enable;
  golfClubComponent.meshGroup.traverse((obj: Mesh) => {
    if(obj.material) {
      (obj.material as Material).opacity = enable ? 1 : 0.3;
    }
  })
}

/**
* @author Josh Field <github.com/HexaField>
 */

export const updateClub: Behavior = (entityClub: Entity, args?: any, delta?: number, entityTarget?: Entity, time?: number, checks?: any): void => {
  if (!hasComponent(entityClub, NetworkObjectOwner)) return;

  const ownerNetworkObject = Network.instance.networkObjects[getComponent(entityClub, NetworkObjectOwner).networkId].component;

  const golfClubComponent = getMutableComponent(entityClub, GolfClubComponent);

  const transformClub = getMutableComponent(entityClub, TransformComponent);
  const collider = getMutableComponent(entityClub, ColliderComponent);

  const ownerEntity = Network.instance.networkObjects[ownerNetworkObject.networkId].component.entity;

  const handTransform = getHandTransform(ownerEntity);
  const { position, rotation } = handTransform;

  transformClub.position.copy(position);
  transformClub.rotation.copy(rotation);

  golfClubComponent.raycast.origin.copy(position);
  golfClubComponent.raycast.direction.set(0, 0, -1).applyQuaternion(rotation);

  // find the rotation along the XZ plane the hand is pointing
  quat2.setFromUnitVectors(
    vector0.set(0, 0, -1),
    vector1.set(0, 0, -1).applyQuaternion(rotation).setY(0).normalize()
  );

  const hit = golfClubComponent.raycast.hits[0];
  const headDistance = XRUserSettings.staticLengthGolfClub ? clubLength : (hit ? hit.distance : clubLength);

  if(hasComponent(ownerEntity, YourTurn)) {
    enableClub(entityClub, true);
  } else {
    enableClub(entityClub, false);
  }

  // update position of club
  golfClubComponent.headGroup.position.setZ(-headDistance)
  golfClubComponent.neckObject.position.setZ(-headDistance * 0.5);
  golfClubComponent.neckObject.scale.setZ(headDistance * 0.5);

  golfClubComponent.meshGroup.getWorldQuaternion(quat);
  // get rotation of club relative to parent
  golfClubComponent.headGroup.quaternion.copy(quat).invert().multiply(quat2);
  golfClubComponent.headGroup.updateMatrixWorld(true);

  // make rotation flush to ground
  // TODO: use ground normal instead of world up vector
  golfClubComponent.headGroup.getWorldDirection(vector1).setY(0);
  // get local forward direction, then apply that in world space
  quat2.setFromUnitVectors(vector0.set(0, 0, 1), vector1);
  golfClubComponent.meshGroup.getWorldQuaternion(quat);
  golfClubComponent.headGroup.quaternion.copy(quat).invert().multiply(quat2);
  golfClubComponent.headGroup.updateMatrixWorld(true);

  // calculate velocity of the head of the golf club
  // average over multiple frames
  golfClubComponent.headGroup.getWorldPosition(vector1)
  vector0.subVectors(vector1, golfClubComponent.lastPositions[0])
  for(let i = 0; i < golfClubComponent.velocityPositionsToCalculate - 1; i++) {
    vector0.add(vector1.subVectors(golfClubComponent.lastPositions[i], golfClubComponent.lastPositions[i + 1]))
  }
  vector0.multiplyScalar(1 / (golfClubComponent.velocityPositionsToCalculate + 1));
  golfClubComponent.velocity.copy(vector0);
  golfClubComponent.body.transform.linearVelocity.x = vector0.x;
  golfClubComponent.body.transform.linearVelocity.y = vector0.y;
  golfClubComponent.body.transform.linearVelocity.z = vector0.z;
  // now shift all previous positions down the list
  for(let i = golfClubComponent.velocityPositionsToCalculate - 1; i > 0; i--) {
    golfClubComponent.lastPositions[i].copy(golfClubComponent.lastPositions[i - 1]);
  }
  // add latest position to list
  golfClubComponent.headGroup.getWorldPosition(vector1)
  golfClubComponent.lastPositions[0].copy(vector1);

  // calculate relative rotation of club head
  quat.set(collider.body.transform.rotation.x, collider.body.transform.rotation.y, collider.body.transform.rotation.z, collider.body.transform.rotation.w)
  quat.invert().multiply(quat2)

  collider.body.shapes[0].transform = {
    translation: {
      x: golfClubComponent.headGroup.position.x,
      y: golfClubComponent.headGroup.position.y,
      z: golfClubComponent.headGroup.position.z
    },
    rotation: quat
  }
}

// https://github.com/PersoSirEduard/OculusQuest-Godot-MiniGolfGame/blob/master/Scripts/GolfClub/GolfClub.gd#L18

export const onClubColliderWithBall: GameObjectInteractionBehavior = (entityClub: Entity, delta: number, args: { hitEvent: ColliderHitEvent }, entityBall: Entity) => {
  if(hasComponent(entityBall, State.Active) && hasComponent(entityClub, State.Active)) {
    addActionComponent(entityBall, Action.GameObjectCollisionTag);
    addActionComponent(entityClub, Action.GameObjectCollisionTag);
  }
}

/**
* @author Josh Field <github.com/HexaField>
 */

const clubColliderSize = new Vector3(0.03, 0.05, 0.1);
const clubHalfWidth = 0.05;
const clubPutterLength = 0.1;
const clubLength = 1;

const upVector = new Vector3(0, 1, 0);
const HALF_PI = Math.PI / 2;

export const initializeGolfClub = (entityClub: Entity) => {

  const transform = getComponent(entityClub, TransformComponent);

  const golfClubComponent = getMutableComponent(entityClub, GolfClubComponent);

  golfClubComponent.raycast = PhysicsSystem.instance.addRaycastQuery(new RaycastQuery({
    type: SceneQueryType.Closest,
    origin: new Vector3(),
    direction: new Vector3(0, -1, 0),
    maxDistance: clubLength,
    collisionMask: CollisionGroups.Default | CollisionGroups.Ground,
  }));

  const golfClubColor = GolfColors.red;

  const handleObject = new Mesh(new BoxBufferGeometry(clubHalfWidth, clubHalfWidth, 0.25), new MeshStandardMaterial({ color: golfClubColor, transparent: true })); // Previous color: 0xff2126
  golfClubComponent.handleObject = handleObject;

  const headGroup = new Group();
  const headObject = new Mesh(new BoxBufferGeometry(clubHalfWidth, clubHalfWidth, clubPutterLength * 2), new MeshStandardMaterial({ color: golfClubColor , transparent: true })); // Previous color: 0x2126ff
  // raise the club by half it's height and move it out by half it's length so it's flush to ground and attached at end
  headObject.position.set(0, clubHalfWidth, - (clubPutterLength * 0.5));
  headGroup.add(headObject);
  golfClubComponent.headGroup = headGroup;

  const neckObject = new Mesh(new BoxBufferGeometry(clubHalfWidth * 0.5, clubHalfWidth * 0.5, -1.75), new MeshStandardMaterial({ color: golfClubColor, transparent: true, side: DoubleSide })); // Previous color: 0x21ff26
  golfClubComponent.neckObject = neckObject;

  const meshGroup = new Group();
  meshGroup.add(handleObject, headGroup, neckObject);
  golfClubComponent.meshGroup = meshGroup;

  meshGroup.traverse((obj) => {
    obj.castShadow = true;
    obj.receiveShadow = true;
  })

  addComponent(entityClub, Object3DComponent, { value: meshGroup });

  const shapeHead: ShapeType = {
    shape: SHAPES.Box,
    options: { boxExtents: clubColliderSize },
    config: {
      isTrigger: true,
      collisionLayer: GolfCollisionGroups.Club,
      collisionMask: GolfCollisionGroups.Ball
    }
  };

  const body = PhysicsSystem.instance.addBody(new Body({
    shapes: [shapeHead],
    type: BodyType.KINEMATIC,
    transform: {
      translation: { x: transform.position.x, y: transform.position.y, z: transform.position.z }
    }
  }));

  const collider = getMutableComponent(entityClub, ColliderComponent);
  collider.body = body;
  golfClubComponent.body = body;

  for(let i = 0; i < golfClubComponent.velocityPositionsToCalculate; i++) {
    golfClubComponent.lastPositions[i] = new Vector3();
  }
  golfClubComponent.velocity = new Vector3();
  addComponent(entityClub, DebugArrowComponent)
 
  const gameObject = getComponent(entityClub, GameObject);
  gameObject.collisionBehaviors['GolfBall'] = onClubColliderWithBall;
}

type GolfClubSpawnParameters = {
  gameName: string;
  role: string;
  uuid: string;
  ownerNetworkId: number;
}

export const createGolfClubPrefab = ( args:{ parameters?: GolfClubSpawnParameters, networkId?: number, uniqueId: string, ownerId?: string }) => {
  console.log('createGolfClubPrefab')
  initializeNetworkObject({
    prefabType: GolfPrefabTypes.Club,
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
          type: NetworkObjectOwner,
          data: {
            networkId: args.parameters.ownerNetworkId
          }
        }
      ]
    }
  });
}

// Prefab is a pattern for creating an entity and component collection as a prototype
export const GolfClubPrefab: NetworkPrefab = {
  initialize: createGolfClubPrefab,
  // These will be created for all players on the network
  networkComponents: [
    // Transform system applies values from transform component to three.js object (position, rotation, etc)
    { type: TransformComponent },
    { type: ColliderComponent },
    { type: RigidBodyComponent },
    { type: GameObject },
    { type: GolfClubComponent },
    { type: NetworkObjectOwner }
    // Local player input mapped to behaviors in the input map
  ],
  // These are only created for the local player who owns this prefab
  localClientComponents: [],
  //clientComponents: [{ type: InterpolationComponent, data: { } }],
  clientComponents: [],
  serverComponents: [],
  onAfterCreate: [
    {
      behavior: initializeGolfClub,
      networked: true
    }
  ],
  onBeforeDestroy: []
};
