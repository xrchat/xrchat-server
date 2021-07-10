import { Vector3, Quaternion, Matrix4, Object3D, Group, Mesh } from 'three';
import { Behavior } from '../../common/interfaces/Behavior';
import { Entity } from '../../ecs/classes/Entity';
import { addComponent, getComponent } from '../../ecs/functions/EntityFunctions';
import { createNetworkRigidBody } from '../../interaction/prefabs/NetworkRigidBody';
import { createVehicleFromModel } from '../../vehicle/prefabs/NetworkVehicle';
import { TransformComponent } from "../../transform/components/TransformComponent";
import { addColliderWithoutEntity } from './colliderCreateFunctions';
import { BodyType } from "three-physx";
import { ColliderComponent } from '../components/ColliderComponent';
import { LoadGLTFResultInterface } from '../../assets/functions/LoadGLTF';
/**
 * @author HydraFire <github.com/HydraFire>
 */

function plusParametersFromEditorToMesh(entity, mesh) {
  const transform = getComponent(entity, TransformComponent);

  const [position, quaternion, scale] = plusParameter(
    mesh.position,
    mesh.quaternion,
    mesh.scale,
    transform.position,
    transform.rotation,
    transform.scale
  );

  mesh.position.set( position.x, position.y, position.z);
  mesh.quaternion.copy( quaternion );
  mesh.scale.set( scale.x, scale.y, scale.z );
}

export function plusParameter(posM, queM, scaM, posE, queE, scaE): [Vector3, Quaternion, any] {
  const quaternionM = new Quaternion(queM.x,queM.y,queM.z,queM.w);
  const quaternionE = new Quaternion(queE.x,queE.y,queE.z,queE.w);
  const position = new Vector3().set(posM.x, posM.y, posM.z).applyQuaternion(quaternionE)
  const quaternion = new Quaternion();
  const scale = { x: 0, y: 0, z: 0 };
  position.x = (position.x * scaE.x) + posE.x;
  position.y = (position.y * scaE.y) + posE.y;
  position.z = (position.z * scaE.z) + posE.z;
  quaternion.setFromRotationMatrix(
    new Matrix4().multiplyMatrices(
      new Matrix4().makeRotationFromQuaternion(quaternionE),
      new Matrix4().makeRotationFromQuaternion(quaternionM)
    )
  );
  scale.x = scaM.x * scaE.x;
  scale.y = scaM.y * scaE.y;
  scale.z = scaM.z * scaE.z;
  return [position, quaternion, scale];
}

// createStaticColliders
export function createStaticCollider(mesh) {
  // console.log('****** createStaticCollider: '+mesh.userData.type);

  if (mesh.type == 'Group') {
    for (let i = 0; i < mesh.children.length; i++) {
      addColliderWithoutEntity(
        mesh.userData,
        mesh.position,
        mesh.children[i].quaternion,
        mesh.children[i].scale,
        {
          mesh: mesh.children[i],
          vertices: null,
          indices: null,
          collisionLayer: mesh.userData.collisionLayer,
          collisionMask: mesh.userData.collisionMask
        }
      );
    }
  } else if (mesh.type == 'Mesh') {
    addColliderWithoutEntity(
      mesh.userData,
      mesh.position,
      mesh.quaternion,
      mesh.scale,
      {
        mesh,
        vertices: null,
        indices: null,
        collisionLayer: mesh.userData.collisionLayer,
        collisionMask: mesh.userData.collisionMask
      }
    );
  }
}

/**
 * Removes or disables rendering for models that have a physics type attached to userData
 * @param asset
 * @param makeInvisible
 */

export const clearFromColliders = (asset: any, makeInvisible?: boolean) => {
  const arr = [];
  const parseColliders = (mesh) => {
    if(mesh.userData.data === 'physics' || mesh.userData.data === 'kinematic' || mesh.userData.data === 'dynamic' || mesh.userData.type === 'trimesh' || mesh.userData.type === 'sphere') {
      arr.push(mesh);
    }
  }
  
  asset.scene ? asset.scene.traverse(parseColliders) : asset.traverse(parseColliders);
  
  if (makeInvisible)
    arr.forEach(v => v.visible = false);
  else
    arr.forEach(v => v.parent.remove(v));
}

type ModelColliderProps = {
  uniqueId : string,
  asset : any,
}

/**
 * Handles loading physics from a model's userData
 * @param entity
 * @param args
 */

export const parseModelColliders = (entity: Entity, args: ModelColliderProps) => {
  const arr = [];
  const parseColliders = (mesh) => {
    // have user data physics its our case
    if (mesh.userData.data === 'physics' || mesh.userData.data === 'kinematic' || mesh.userData.data === 'dynamic' || mesh.userData.data === 'vehicle') {
      // add position from editor to mesh
      plusParametersFromEditorToMesh(entity, mesh);
      // its for delete mesh from view scene
      mesh.userData.data === 'vehicle' ? '' : arr.push(mesh);
      // parse types of colliders
      switch (mesh.userData.data) {
        case 'physics':
          createStaticCollider( mesh );
          break;

        case 'kinematic':
          addComponent(entity, ColliderComponent, {
            bodytype:  BodyType.KINEMATIC,
            type: mesh.userData.type,
            collisionLayer: mesh.userData.collisionLayer,
            collisionMask: mesh.userData.collisionMask,
            position: mesh.position,
            quaternion: mesh.quaternion,
            scale: mesh.scale,
            mesh: mesh.userData.type === 'trimesh' ? mesh : null,
            mass: mesh.userData.mass ?? 1
          })
          break;

        case 'dynamic':
          createNetworkRigidBody({
            parameters: {
              bodytype: BodyType.DYNAMIC,
              type: mesh.userData.type,
              collisionLayer: mesh.userData.collisionLayer,
              collisionMask: mesh.userData.collisionMask,
              scale: mesh.scale,
              position: mesh.position,
              quaternion: mesh.quaternion,
              mesh: mesh.userData.type === 'trimesh' ? mesh : null,
              mass: mesh.userData.mass ?? 1
            },
            uniqueId: args.uniqueId,
            entity: entity
          });
          break;

        case 'vehicle':
          createVehicleFromModel(entity, mesh, args.uniqueId);
          break;

        default:
          createStaticCollider(mesh);
          break;
      }
    }
  }
  // its for diferent files with models
  args.asset.scene ? args.asset.scene.traverse(parseColliders) : args.asset.traverse(parseColliders);
  // its for delete mesh from view scene
  arr.forEach(v => v.parent.remove(v));
};
