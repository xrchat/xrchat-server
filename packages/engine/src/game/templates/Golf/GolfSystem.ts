import { Entity } from '../../../ecs/classes/Entity'
import { System, SystemAttributes } from '../../../ecs/classes/System'
import { addComponent, getComponent, hasComponent } from '../../../ecs/functions/EntityFunctions'
import { SystemUpdateType } from '../../../ecs/functions/SystemUpdateType'
import { Network } from '../../../networking/classes/Network'
import { NetworkObjectOwner } from '../../../networking/components/NetworkObjectOwner'
import { GameObject } from '../../components/GameObject'
import { GamePlayer } from '../../components/GamePlayer'
import { addStateComponent } from '../../functions/functionsState'
import { Action, State } from '../../types/GameComponents'
import { addState } from '../gameDefault/behaviors/switchState'
import { doesPlayerHaveGameObject } from '../gameDefault/checkers/doesPlayerHaveGameObject'
import { hasState } from '../gameDefault/checkers/hasState'
import { ifVelocity } from '../gameDefault/checkers/ifVelocity'
import { addRole } from './behaviors/addRole'
import { addTurn } from './behaviors/addTurn'
import { createYourTurnPanel } from './behaviors/createYourTurnPanel'
import { hitBall } from './behaviors/hitBall'
import { initScore } from './behaviors/saveScore'
import { setupOfflineDebug } from './behaviors/setupOfflineDebug'
import { setupPlayerAvatar } from './behaviors/setupPlayerAvatar'
import { setupPlayerInput } from './behaviors/setupPlayerInput'
import { GolfBallComponent } from './components/GolfBallComponent'
import { GolfClubComponent } from './components/GolfClubComponent'
import { NewPlayerTagComponent } from './components/GolfTagComponents'
import { spawnBall } from './prefab/GolfBallPrefab'
import { spawnClub, updateClub } from './prefab/GolfClubPrefab'

/**
 *
 * @author Josh Field <github.com/hexafield>
 */

export class GolfSystem extends System {
  static instance: GolfSystem
  updateType = SystemUpdateType.Fixed

  constructor(attributes: SystemAttributes = {}) {
    super(attributes)

    GolfSystem.instance = this
  }

  /** Removes resize listener. */
  dispose(): void {
    super.dispose()
  }

  /**
   * Executes the system. Called each frame by default from the Engine.
   * @param delta Time since last frame.
   */
  execute(delta: number, time: number): void {
    const behaviorsToExecute: (() => void)[] = []

    // initGameState.newPlayer
    this.queryResults.player.added.forEach((entity) => {
      behaviorsToExecute.push(() => {
        addComponent(entity, State.WaitTurn)
        addRole(entity)
        setupPlayerAvatar(entity)
        setupPlayerInput(entity)
        createYourTurnPanel(entity)
        setupOfflineDebug(entity)
        spawnClub(entity)
        initScore(entity)
        if (getComponent(entity, GamePlayer).role === '1-Player') {
          addTurn(entity)
        }
      })
    })

    // gamePlayerRoles
    this.queryResults.player.all.forEach((entity) => {
      const playerComponent = getComponent(entity, GamePlayer)

      // gamePlayerRoles.1-Player.spawnBall
      if (hasComponent(entity, State.YourTurn)) {
        if (doesPlayerHaveGameObject(entity, { on: 'self', objectRoleName: 'GolfBall', invert: true })) {
          behaviorsToExecute.push(() => {
            spawnBall(entity, { positionCopyFromRole: 'GolfTee-0', offsetY: 1 })
          })
        }

        const clubEntity = playerComponent.ownedObjects?.['GolfClub']
        const ballEntity = playerComponent.ownedObjects?.['GolfBall']

        // gamePlayerRoles.1-Player.HitBall
        if (clubEntity && ballEntity) {
          if (hasComponent(clubEntity, Action.GameObjectCollisionTag)) {
            if (!hasComponent(clubEntity, State.Hit)) {
              if (ifVelocity(clubEntity, { on: 'target', component: GolfClubComponent, more: 0.01, less: 1 })) {
                if (
                  hasComponent(ballEntity, Action.GameObjectCollisionTag) &&
                  hasComponent(ballEntity, State.BallStopped) &&
                  hasComponent(ballEntity, State.Ready) &&
                  hasComponent(ballEntity, State.Active)
                ) {
                  behaviorsToExecute.push(() => {
                    addStateComponent(clubEntity, State.addedHit)
                  })
                }
              }
            }
          }
        }
      }
    })

    // initGameState.GolfClub
    this.queryResults.golfClub.added.forEach((entity) => {
      behaviorsToExecute.push(() => {
        addComponent(entity, State.SpawnedObject)
        addComponent(entity, State.Active)

        const ownerPlayerEntity =
          Network.instance.networkObjects[getComponent(entity, NetworkObjectOwner).networkId].component.entity
        const ownerGamePlayer = getComponent(ownerPlayerEntity, GamePlayer)

        ownerGamePlayer.ownedObjects['GolfClub'] = entity
      })
    })

    // gameObjectRoles.GolfClub
    // this.queryResults.golfClub.all.forEach((entity) => {

    //   // gameObjectRoles.GolfClub.update
    //   executeComplexResult.push({
    //     updateClub,
    //     entity
    //   })

    //   // gameObjectRoles.GolfClub.hitBall
    //   if(hasComponent(entity, State.addedHit)) {
    //     const clubOwnerPlayerEntity: Entity = getComponent(entity, GameObjectOwner).owner
    //     const entityBall: Entity = getComponent(clubOwnerPlayerEntity, GolfPlayerComponent).ball
    //     if(hasState(entity, { stateComponent: State.Active })) {
    //       executeComplexResult.push({
    //         hitBall,
    //         entity,
    //         args: { clubPowerMultiplier: 5, hitAdvanceFactor: 4 },
    //         entityOther: entityBall,
    //       })
    //     }
    //   }
    // })

    this.queryResults.golfBall.added.forEach((entity) => {
      behaviorsToExecute.push(() => {
        addComponent(entity, State.SpawnedObject)
        addComponent(entity, State.NotReady)
        addComponent(entity, State.Active)
        addComponent(entity, State.BallMoving)

        const ownerPlayerEntity =
          Network.instance.networkObjects[getComponent(entity, NetworkObjectOwner).networkId].component.entity
        const ownerGamePlayer = getComponent(ownerPlayerEntity, GamePlayer)

        ownerGamePlayer.ownedObjects['GolfBall'] = entity
      })
    })

    behaviorsToExecute.forEach((v) => v())
  }

  static queries = {
    player: {
      components: [GamePlayer],
      listen: {
        added: true,
        removed: true
      }
    },
    golfClub: {
      components: [GameObject, GolfClubComponent],
      listen: {
        added: true,
        removed: true
      }
    },
    golfBall: {
      components: [GameObject, GolfBallComponent],
      listen: {
        added: true,
        removed: true
      }
    }
  }
}
