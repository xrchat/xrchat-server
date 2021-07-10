import { Vector3 } from 'three';
import { RaycastQuery, SceneQueryType } from 'three-physx';
import { Behavior } from '../../../../common/interfaces/Behavior';
import { Entity } from '../../../../ecs/classes/Entity';
import { getMutableComponent, hasComponent } from '../../../../ecs/functions/EntityFunctions';
import { ColliderComponent } from '../../../../physics/components/ColliderComponent';
import { CollisionGroups } from '../../../../physics/enums/CollisionGroups';
import { PhysicsSystem } from '../../../../physics/systems/PhysicsSystem';
import { GolfCollisionGroups } from '../GolfGameConstants';

/**
 * @author Josh Field <github.com/HexaField>
 * @author HydraFire <github.com/HydraFire>
 */

const vector0 = new Vector3();
const vector1 = new Vector3();

export const initBallRaycast: Behavior = (entity: Entity, args?: any, delta?: number, entityOther?: Entity, time?: number, checks?: any): void => {
  // const game = getComponent(playerEntity, GamePlayer).game;
  // const gameSchema = GamesSchema[game.gameMode];
  const collider = getMutableComponent(entity, ColliderComponent);
 
  collider.raycastQuery = PhysicsSystem.instance.addRaycastQuery(new RaycastQuery({
    type: SceneQueryType.Closest,
    origin: new Vector3(0, 0, 0),
    direction: new Vector3(0, -1, 0),
    maxDistance: 0.1,
    collisionMask: CollisionGroups.Default | CollisionGroups.Ground | GolfCollisionGroups.Course,
  }));
}