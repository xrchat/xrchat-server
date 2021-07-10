import { Entity } from '../../../../ecs/classes/Entity';
import { addComponent, getComponent } from '../../../../ecs/functions/EntityFunctions';
import { NetworkObject } from '../../../../networking/components/NetworkObject';
import { createGolfBallPrefab } from '../prefab/GolfBallPrefab';
import { Network } from '../../../../networking/classes/Network';
import { isClient } from '../../../../common/functions/isClient';
import { getGame } from '../../../functions/functions';
import { MathUtils, Vector3 } from 'three';
import { GolfPrefabTypes } from '../GolfGameConstants';
import { TransformComponent } from "../../../../transform/components/TransformComponent";
import { Behavior } from '../../../../common/interfaces/Behavior';

/**
 * @author HydraFire <github.com/HydraFire>
 */

export const spawnBall: Behavior = (entity: Entity, args?: any, delta?: number, entityTarget?: Entity, time?: number, checks?: any): void => {

  // server sends clients the entity data
  if (isClient) return;

  const game = getGame(entity);
  const ownerId = getComponent(entity, NetworkObject).ownerId;

  const networkId = Network.getNetworkId();
  const uuid = MathUtils.generateUUID();
  // send position to spawn
  // now we have just one location
  // but soon
  const teeEntity = game.gameObjects[args.positionCopyFromRole][0]
  const teeTransform = getComponent(teeEntity, TransformComponent);
  
  const parameters = {
    gameName: game.name,
    role: 'GolfBall',
    spawnPosition: new Vector3(teeTransform.position.x, teeTransform.position.y + args.offsetY, teeTransform.position.z),
    uuid
  };

  // this spawns the ball on the server
  createGolfBallPrefab({
    networkId,
    uniqueId: uuid,
    ownerId, // the uuid of the player whose ball this is
    parameters
  })

  // this sends the ball to the clients
  Network.instance.worldState.createObjects.push({
    networkId,
    ownerId,
    uniqueId: uuid,
    prefabType: GolfPrefabTypes.Ball,
    parameters,
  })
};
