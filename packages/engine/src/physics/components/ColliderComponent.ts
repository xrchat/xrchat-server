import { Quaternion, Vector3 } from "three";
import type { Body, RaycastQuery } from "three-physx";
import { Component } from '../../ecs/classes/Component';
import { Types } from '../../ecs/types/Types';
import { ColliderTypes } from "../types/PhysicsTypes";

/**
 * @author HydraFire <github.com/HydraFire>
 */


export class ColliderComponent extends Component<ColliderComponent> {
  bodytype: any
  body: Body
  type: ColliderTypes
  raycastQuery: RaycastQuery;
  mass: number
  position: Vector3
  /**
   * The velocity as calculated by either the physics engine or the physics system for manually inteprolated objects
   */
  velocity: Vector3
  quaternion: Quaternion
  scale: Vector3
  mesh: any
  vertices: any
  indices: any
  collisionLayer: any
  collisionMask: any
}

ColliderComponent._schema = {
  bodytype: { type: Types.Ref, default: null },
  body: { type: Types.Ref, default: null },
  type: { type: Types.String, default: 'box' },
  mass: { type: Types.Number, default: 0 },
  position: { type: Types.Vector3Type, default: new Vector3() },
  velocity: { type: Types.Vector3Type, default: new Vector3() },
  quaternion: { type: Types.QuaternionType, default: new Quaternion() },
  scale: { type: Types.Vector3Type, default: new Vector3() },
  mesh: { type: Types.Ref, default: null},
  vertices: { type: Types.Ref, default: null},
  indices: { type: Types.Ref, default: null},
  collisionLayer: { type: Types.Number, default: null },
  collisionMask: { type: Types.Number, default: -1 }
};
