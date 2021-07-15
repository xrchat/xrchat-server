import { Entity } from '../../ecs/classes/Entity'
import { System, SystemAttributes } from '../../ecs/classes/System'
import { Network } from '../../networking/classes/Network'

import { NetworkObject } from '../../networking/components/NetworkObject'
import { Game } from '../components/Game'
import { TransformComponent } from '../../transform/components/TransformComponent'
import { GameObject } from '../components/GameObject'
import { GamePlayer } from '../components/GamePlayer'

import {
  addComponent,
  getComponent,
  getMutableComponent,
  hasComponent,
  removeComponent
} from '../../ecs/functions/EntityFunctions'
import {
  initState,
  removeEntityFromState,
  clearRemovedEntitysFromGame,
  saveInitStateCopy,
  requireState,
  addStateComponent
} from '../functions/functionsState'
import { getStorage, initStorage } from '../functions/functionsStorage'

import { GamesSchema } from '../../game/templates/GamesSchema'
import { PrefabType } from '../../networking/templates/PrefabType'
import { SystemUpdateType } from '../../ecs/functions/SystemUpdateType'
import { GameMode } from '../types/GameMode'
import { ColliderComponent } from '../../physics/components/ColliderComponent'
import { ColliderHitEvent } from 'three-physx'
import { isClient } from '../../common/functions/isClient'
import { checkIsGamePredictionStillRight, clearPredictionCheckList } from '../functions/functionsActions'
import { NewPlayerTagComponent } from '../templates/Golf/components/GolfTagComponents'

/**
 * @author HydraFire <github.com/HydraFire>
 */

function checkWatchers(entity, arr) {
  return (
    arr === undefined ||
    arr.length === 0 ||
    arr.some((componentArr) => componentArr.every((component) => hasComponent(entity, component)))
  )
}

function checkCheckers(entity, entityOther, arr) {
  return arr.map((checker) => checker.function(entity, checker.args, entityOther))
}

function isPlayerInGameArea(entity, gameArea) {
  const p = getComponent(entity, TransformComponent).position
  const inGameArea =
    p.x < gameArea.max.x &&
    p.x > gameArea.min.x &&
    p.y < gameArea.max.y &&
    p.y > gameArea.min.y &&
    p.z < gameArea.max.z &&
    p.z > gameArea.min.z
  return { entity, inGameArea }
}

type ComplexResult = {
  behavior: (entity: Entity, args: any, delta: number, entityOther: Entity, time: number, checkersResult: any) => void
  entity: Entity
  args: any
  entityOther: Entity
  checkersResult: any
}

/**
 * @author HydraFire <github.com/HydraFire>
 */

export class GameManagerSystem extends System {
  static instance: GameManagerSystem
  updateType = SystemUpdateType.Fixed

  updateNewPlayersRate: number
  updateLastTime: number
  currentGames: Map<string, Game>
  gameEntities: Entity[]

  constructor(attributes: SystemAttributes = {}) {
    super(attributes)
    GameManagerSystem.instance = this
    this.reset()
  }

  reset(): void {
    this.updateNewPlayersRate = 60 * 5
    this.updateLastTime = 0
    this.currentGames = new Map<string, Game>()
    this.gameEntities = []
  }

  dispose(): void {
    super.dispose()
    this.reset()
  }

  execute(delta: number, time: number): void {
    this.queryResults.game.added?.forEach((entity) => {
      const game = getMutableComponent(entity, Game)
      const gameSchema = GamesSchema[game.gameMode] as GameMode
      game.maxPlayers ? gameSchema.preparePlayersRole(gameSchema, game.maxPlayers) : ''
      game.priority = gameSchema.priority // DOTO: set its from editor
      initState(game, gameSchema)
      this.gameEntities.push(entity)
      // its for client, to get game entity whan came Action Message with only name of Game
      this.currentGames.set(game.name, game)
      // TODO: add start & stop functions to be able to start and end games
      gameSchema.onGameStart(entity)
      console.log('CREATE GAME')
    })

    this.queryResults.gameObjectCollisions?.all?.forEach((entity) => {
      const collider = getComponent(entity, ColliderComponent)
      const gameObject = getComponent(entity, GameObject)
      collider.body?.collisionEvents?.forEach((collisionEvent: ColliderHitEvent) => {
        const otherEntity = collisionEvent.bodyOther.userData as Entity
        if (typeof otherEntity === 'undefined') return
        const otherGameObject = getComponent<GameObject>(otherEntity, GameObject)
        if (!otherGameObject) return
        Object.keys(gameObject.collisionBehaviors).forEach((role) => {
          if (role === otherGameObject.role) {
            gameObject.collisionBehaviors[role](entity, delta, { hitEvent: collisionEvent }, otherEntity)
          }
        })
      })
    })

    this.queryResults.game.all?.forEach((entityGame) => {
      const game = getComponent(entityGame, Game)
      const gameArea = game.gameArea
      const gameSchema = GamesSchema[game.gameMode]
      const gameObjects = game.gameObjects
      const gamePlayers = game.gamePlayers
      //const gameState = game.state;
      if (isClient && game.isGlobal && checkIsGamePredictionStillRight()) {
        clearPredictionCheckList()
        requireState(
          game,
          getComponent(
            Network.instance.networkObjects[Network.instance.localAvatarNetworkId].component.entity,
            GamePlayer
          )
        )
      }
      // MAIN EXECUTE
      const executeComplexResult: ComplexResult[] = []
      // its case beter then this.queryResults.gameObject.all, becose its sync execute all role groubs entity, and you not think about behavior do work on haotic case
      Object.keys(gamePlayers)
        .concat(Object.keys(gameObjects))
        .forEach((role) => {
          ;(gameObjects[role] || gamePlayers[role]).forEach((entity) => {
            const gameObject = hasComponent(entity, GameObject)
              ? getComponent(entity, GameObject)
              : getComponent(entity, GamePlayer)
            const actionSchema = gameSchema.gameObjectRoles[role] || gameSchema.gamePlayerRoles[role]

            Object.keys(actionSchema).forEach((actionName) => {
              const actionBehaviors = actionSchema[actionName]
              actionBehaviors.forEach((b) => {
                let args = []
                let checkersResult = []

                if (checkWatchers(entity, b.watchers) === false) return

                if (b.checkers != undefined && b.checkers.length > 0) {
                  checkersResult = checkCheckers(entity, undefined, b.checkers)
                  if (checkersResult.some((result) => result === undefined || result === null || result === false))
                    return
                }
                /*
              if(typeof b.takeEffectOn === 'function') {
                const entityOther = b.takeEffectOn(entity);
                if(entityOther) {
                  executeComplexResult.push({ behavior: b.behavior, entity: entity, entityOther, args, checkersResult });
                }
              } else
              */
                b.args != undefined ? (args = b.args) : ''
                if (typeof b.takeEffectOn === 'undefined' || typeof b.takeEffectOn.targetsRole === 'undefined') {
                  //b.behavior(entity, undefined, args, checkersResult);
                  // used to prepair position of golf tee
                  b.prepareArgs != undefined ? (args = b.prepareArgs(entity, b.args)) : ''

                  executeComplexResult.push({
                    behavior: b.behavior,
                    entity: entity,
                    entityOther: undefined,
                    args,
                    checkersResult
                  })
                } else {
                  const complexResultObjects = Object.keys(b.takeEffectOn.targetsRole).reduce(
                    (acc, searchedRoleName) => {
                      const targetRoleSchema = b.takeEffectOn.targetsRole[searchedRoleName]
                      // search second entity
                      let resultObjects = (gameObjects[searchedRoleName] || gamePlayers[searchedRoleName]) as any

                      if (targetRoleSchema.watchers != undefined && targetRoleSchema.watchers.length > 0) {
                        resultObjects = resultObjects.filter((entityOtherObj) =>
                          checkWatchers(entityOtherObj, targetRoleSchema.watchers)
                        )
                      }

                      resultObjects = resultObjects.map((v) => ({
                        entity: v,
                        checkersResult: [],
                        args: targetRoleSchema.args
                      }))

                      if (targetRoleSchema.checkers != undefined && targetRoleSchema.checkers.length > 0) {
                        resultObjects.forEach((complexOtherObj) => {
                          complexOtherObj.checkersResult = checkCheckers(
                            entity,
                            complexOtherObj.entity,
                            targetRoleSchema.checkers
                          )
                        })
                        resultObjects = resultObjects.filter((complexOtherObj) => {
                          return !complexOtherObj.checkersResult.some(
                            (result) => result === undefined || result === null || result === false
                          )
                        })
                      }

                      return acc.concat(resultObjects)
                    },
                    []
                  )

                  /*
                if (b.takeEffectOn.sortMethod != undefined && complexResultObjects.length > 1 ) {
                  complexResultObjects = b.takeEffectOn.sortMethod(complexResultObjects)
                }
                */
                  complexResultObjects.forEach((complexResult) => {
                    b.prepareArgs != undefined ? (args = b.prepareArgs(entity, b.args, complexResult.entity)) : ''
                    executeComplexResult.push({
                      behavior: b.behavior,
                      entity: entity,
                      entityOther: complexResult.entity,
                      args: { ...args, ...complexResult.args },
                      checkersResult: { ...checkersResult, ...complexResult.checkersResult }
                    })
                  })
                }
              })
            })
          })
        })
      // execute all behavior after all preparing
      executeComplexResult.forEach((v) => v.behavior(v.entity, v.args, delta, v.entityOther, time, v.checkersResult))
      // Clean onetime Tag components for every gameobject
      Object.keys(gamePlayers)
        .concat(Object.keys(gameObjects))
        .forEach((role: string) => {
          ;(gameObjects[role] || gamePlayers[role]).forEach((entity) => {
            gameSchema.registerActionTagComponents.forEach((component) =>
              hasComponent(entity, component) ? removeComponent(entity, component) : ''
            )
          })
        })

      // GAME AREA ADDIND PLAYERS or REMOVE
      // adding or remove players from this Game, always give the first Role from GameSchema
      // if (this.updateLastTime > this.updateNewPlayersRate) {
      Object.keys(Network.instance.networkObjects)
        .map(Number)
        .filter((key) => Network.instance.networkObjects[key].prefabType === PrefabType.Player)
        .map((key) => Network.instance.networkObjects[key].component.entity)
        .map((entity) => isPlayerInGameArea(entity, gameArea))
        .forEach((v) => {
          // is Player in Game Area
          if (v.inGameArea && hasComponent(v.entity, GamePlayer)) {
            /*
              if (getComponent(v.entity, GamePlayer).gameName != game.name) {
                getGameFromName(getComponent(v.entity, GamePlayer).gameName).priority < game.priority;
                removeComponent(v.entity, GamePlayer);
              }
              */
          } else if (v.inGameArea && !hasComponent(v.entity, GamePlayer)) {
            addComponent(v.entity, GamePlayer, {
              gameName: game.name,
              role: Object.keys(gameSchema.gamePlayerRoles)[0],
              uuid: getComponent(v.entity, NetworkObject).ownerId
            })
            addComponent(v.entity, NewPlayerTagComponent)
          } else if (!v.inGameArea && hasComponent(v.entity, GamePlayer)) {
            if (getComponent(v.entity, GamePlayer).gameName === game.name) {
              removeComponent(v.entity, GamePlayer)
            }
          }
        })
      //   this.updateLastTime = 0
      // } else {
      //   this.updateLastTime += 1
      // }
      // end of frame circle one game
    })

    // PLAYERS REMOVE
    this.queryResults.gamePlayer.removed?.forEach((entity) => {
      this.queryResults.game.all?.forEach((entityGame) => {
        const game = getComponent(entityGame, Game)
        const gamePlayer = getComponent(entity, GamePlayer, true)
        if (gamePlayer === undefined || gamePlayer.gameName != game.name) return
        const gameSchema = GamesSchema[game.gameMode]
        gameSchema.beforePlayerLeave(entity)
        removeEntityFromState(gamePlayer, game)
        clearRemovedEntitysFromGame(game)
        game.gamePlayers[gamePlayer.role] = game.gamePlayers[gamePlayer.role].filter((entityFind) =>
          hasComponent(entityFind, GamePlayer)
        )
        gameSchema.onPlayerLeave(entity, gamePlayer, game)
      })
    })

    // OBJECTS REMOVE
    this.queryResults.gameObject.removed?.forEach((entity) => {
      this.queryResults.game.all?.forEach((entityGame) => {
        const game = getComponent(entityGame, Game)
        const gameObject = getComponent(entity, GameObject, true)
        if (gameObject === undefined || gameObject.gameName != game.name) return
        removeEntityFromState(gameObject, game)
        clearRemovedEntitysFromGame(game)
      })
    })
    // PLAYERS ADDIND
    this.queryResults.gamePlayer.added?.forEach((entity) => {
      this.queryResults.game.all?.forEach((entityGame) => {
        const game = getComponent(entityGame, Game)
        const gamePlayer = getComponent(entity, GamePlayer)
        if (gamePlayer.gameName != game.name) return

        const gameSchema = GamesSchema[game.gameMode]
        // befor adding first player
        const countAllPlayersInGame = Object.keys(game.gamePlayers).reduce(
          (acc, v) => acc + game.gamePlayers[v].length,
          0
        )
        if (countAllPlayersInGame == 1) saveInitStateCopy(entityGame)
        // add to gamePlayers list sorted by role
        game.gamePlayers[gamePlayer.role].push(entity)
        // add init Tag components for start state of Games
        const schema = gameSchema.initGameState[gamePlayer.role]
        if (schema != undefined) {
          schema.components?.forEach((component) => addStateComponent(entity, component))
          //initStorage(entity, schema.storage);
          schema.behaviors?.forEach((behavior) => behavior(entity))
        }
        //console.warn(game.state);
        requireState(game, gamePlayer)
      })
    })

    // OBJECTS ADDIND
    // its needet for allow dynamicly adding objects and exept errors when enitor gives object without created game
    this.queryResults.gameObject.added?.forEach((entity) => {
      this.queryResults.game.all?.forEach((entityGame) => {
        const game = getComponent(entityGame, Game)
        if (getComponent(entity, GameObject).gameName != game.name) return

        const gameSchema = GamesSchema[game.gameMode]
        const gameObjects = game.gameObjects
        // add to gameObjects list sorted by role
        gameObjects[getComponent(entity, GameObject).role].push(entity)
        // add init Tag components for start state of Games
        const schema = gameSchema.initGameState[getComponent(entity, GameObject).role]
        if (schema != undefined) {
          schema.components?.forEach((component) => addStateComponent(entity, component))
          initStorage(entity, schema.storage)
          schema.behaviors?.forEach((behavior) => behavior(entity))
        }
      })
    })

    // end of execute
  }
}
/*
this.queryResults.gameObject.removed?.forEach(entity => {
  removeFromGame(entity);
  removeFromState(entity);
  console.warn('ONE OBJECT REMOVED');
});
*/
GameManagerSystem.queries = {
  game: {
    components: [Game],
    listen: {
      added: true,
      removed: true
    }
  },
  gameObject: {
    components: [GameObject],
    listen: {
      added: true,
      removed: true
    }
  },
  gameObjectCollisions: {
    components: [GameObject, ColliderComponent]
  },
  gamePlayer: {
    components: [GamePlayer],
    listen: {
      added: true,
      removed: true
    }
  }
}
