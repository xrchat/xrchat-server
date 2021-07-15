import { GameMode } from '../../game/types/GameMode'
// others componennt
import { TransformComponent } from '../../transform/components/TransformComponent'
// game State Tag Component
import { Action, State } from '../types/GameComponents'
// game behavior
import { executeBehaviorArray } from './gameDefault/behaviors/executeBehaviorArray'
import { objectMove } from './gameDefault/behaviors/objectMove'
import { addState, removeState, switchState } from './gameDefault/behaviors/switchState'
import { setHideModel } from './gameDefault/behaviors/setHideModel'
//
import { addForce } from './Golf/behaviors/addForce'
import { removeVelocity, teleportObject } from './Golf/behaviors/teleportObject'
//
import { addRole } from './Golf/behaviors/addRole'
import { addTurn } from './Golf/behaviors/addTurn'
import { applyTurn } from './Golf/behaviors/applyTurn'
import { nextTurn } from './Golf/behaviors/nextTurn'

//
//
import { initScore, saveScore } from './Golf/behaviors/saveScore'
import { displayScore, saveGoalScore } from './Golf/behaviors/displayScore'
import { giveGoalState } from './Golf/behaviors/giveGoalState'
//
import { spawnClub, updateClub } from './Golf/prefab/GolfClubPrefab'
import { addBall } from './Golf/behaviors/addBall'
import { addHole } from './Golf/behaviors/addHole'
// checkers
import { isPlayersInGame } from './gameDefault/checkers/isPlayersInGame'
import { ifGetOut } from './gameDefault/checkers/ifGetOut'
import { ifOwned } from './gameDefault/checkers/ifOwned'
import { dontHasState } from './gameDefault/checkers/dontHasState'
import { customChecker } from './gameDefault/checkers/customChecker'
import { isDifferent } from './gameDefault/checkers/isDifferent'
import { doesPlayerHaveGameObject } from './gameDefault/checkers/doesPlayerHaveGameObject'

// others
import { grabEquippable } from '../../interaction/functions/grabEquippable'
import { getComponent, hasComponent } from '../../ecs/functions/EntityFunctions'
import { disableInteractiveToOthers, disableInteractive } from './Golf/behaviors/disableInteractiveToOthers'
import { Network } from '../../networking/classes/Network'
import { Entity } from '../../ecs/classes/Entity'
import { GolfPrefabs } from './Golf/prefab/GolfGamePrefabs'
import { ColliderComponent } from '../../physics/components/ColliderComponent'
import { BodyType } from 'three-physx'
import { Euler, Quaternion, Vector3 } from 'three'
import { removeSpawnedObjects } from '../functions/functions'
import { ifVelocity } from './gameDefault/checkers/ifVelocity'
import { spawnBall, updateBall } from './Golf/prefab/GolfBallPrefab'
import { hitBall } from './Golf/behaviors/hitBall'
import { teleportPlayerBehavior } from './Golf/behaviors/teleportPlayer'
import { getPositionNextPoint } from './Golf/behaviors/getPositionNextPoint'

// ui
import { createYourTurnPanel } from './Golf/behaviors/createYourTurnPanel'
import { setupPlayerInput } from './Golf/behaviors/setupPlayerInput'
import { makeKinematic } from './Golf/behaviors/makeKinematic'
import { hasState } from './gameDefault/checkers/hasState'
import { GolfClubComponent } from './Golf/components/GolfClubComponent'
import { setupOfflineDebug } from './Golf/behaviors/setupOfflineDebug'
import { setupPlayerAvatar } from './Golf/behaviors/setupPlayerAvatar'

/**
 * @author HydraFire
 */

const templates = {
  switchStateAndObjectMove: ({ x = 0, y = 0, z = 0, stateToMove, stateToMoveBack, min = 0.2, max = 3 }) => {
    return [
      {
        behavior: objectMove,
        args: { vectorAndSpeed: { x: x * -1, y: y * -1, z: z * -1 } },
        watchers: [[stateToMoveBack]],
        checkers: [
          {
            function: isDifferent,
            args: { min: min }
          }
        ]
      },
      {
        behavior: objectMove,
        args: { vectorAndSpeed: { x: x, y: y, z: z } },
        watchers: [[stateToMove]],
        checkers: [
          {
            function: isDifferent,
            args: { max: max }
          }
        ]
      }
    ]
  },

  isPlayerInGameAndSwitchState: ({ remove, add }) => {
    return [
      {
        behavior: switchState,
        args: { on: 'self', add: remove, remove: add },
        checkers: [{ function: isPlayersInGame }]
      },
      {
        behavior: switchState,
        args: { on: 'self', add: add, remove: remove },
        checkers: [{ function: isPlayersInGame, args: { invert: true } }]
      }
    ]
  },

  hasHadInteractionAndSwitchState: ({ remove, add }) => {
    return [
      {
        behavior: switchState,
        watchers: [[Action.HasHadInteraction, remove]], // components in one array means HasHadInteraction && Close, in different means HasHadInteraction || Close
        args: { on: 'self', remove: remove, add: add }
      },
      {
        behavior: switchState,
        watchers: [[Action.HasHadInteraction, add]],
        args: { on: 'self', remove: add, add: remove }
      }
    ]
  }
}

function somePrepareFunction(gameRules: GameMode) {
  gameRules.initGameState = copleNameRolesInOneString(gameRules.initGameState)
  gameRules.registerActionTagComponents = registerAllActions() //TO DO: registerActionsOnlyUsedInThisMode();
  gameRules.registerStateTagComponents = registerAllStates() //TO DO: registerStatesOnlyUsedInThisMode();
  return gameRules
}

function somePrepareGameInitPlayersRole(gameRules: GameMode, maxPlayerCount) {
  for (let playerNumper = 2; playerNumper <= maxPlayerCount; playerNumper++) {
    cloneSameRoleRules(gameRules.gamePlayerRoles, { from: '1-Player', to: playerNumper + '-Player' })
    searchPlaceAndAddRole(gameRules.gameObjectRoles, playerNumper + '-Player')
    if (playerNumper > 2) {
      cloneSameRoleRules(gameRules.initGameState, { from: '2-Player', to: playerNumper + '-Player' })
    }
  }
}

function searchPlaceAndAddRole(gameObjectRoles, newRole) {
  Object.keys(gameObjectRoles).forEach((key) => {
    Object.keys(gameObjectRoles[key]).forEach((action) => {
      gameObjectRoles[key][action].forEach((behavior) => {
        if (behavior?.takeEffectOn?.targetsRole['1-Player']) {
          behavior.takeEffectOn.targetsRole[newRole] = behavior.takeEffectOn.targetsRole['1-Player']
        }
      })
    })
  })
}

function cloneSameRoleRules(object, args) {
  object[args.to] = object[args.from] //JSON.parse(JSON.stringify(object[args.from]))
}

function registerAllActions() {
  return Object.keys(Action).map((key) => Action[key])
}
function registerAllStates() {
  return Object.keys(State).map((key) => State[key])
}

function copleNameRolesInOneString(object) {
  const needsCopyArr = Object.keys(object).filter((str) => str.includes(' '))
  if (needsCopyArr.length === 0) return
  const objectWithCorrectRoles = needsCopyArr.reduce(
    (acc, v) => Object.assign(acc, ...v.split(' ').map((roleName) => ({ [roleName]: object[v] }))),
    {}
  )
  needsCopyArr.forEach((key) => delete object[key])
  return Object.assign(object, objectWithCorrectRoles)
}

const onGolfGameStart = (entity: Entity) => {}

const onGolfGameLoading = (entity: Entity) => {
  // add our prefabs - TODO: find a better way of doing this that doesn't pollute prefab namespace
  Object.entries(GolfPrefabs).forEach(([prefabType, prefab]) => {
    Network.instance.schema.prefabs[prefabType] = prefab
  })
}

const beforeGolfPlayerLeave = (entity: Entity) => {
  if (getComponent(entity, State.YourTurn, true) || getComponent(entity, State.Waiting, true)) {
    nextTurn(entity)
  }
}

const onGolfPlayerLeave = (entity: Entity, playerComponent, game) => {
  //  const entityArray = getEntityOwnedObjects(entity)
  //  entityArray.forEach(entityObjects => removeSpawnedObject(entityObjects));
  removeSpawnedObjects(entity, playerComponent, game)
  //console.warn('need clean score');
}

export const GolfGameMode: GameMode = somePrepareFunction({
  name: 'Golf',
  priority: 1,
  preparePlayersRole: somePrepareGameInitPlayersRole,
  onGameLoading: onGolfGameLoading,
  onGameStart: onGolfGameStart,
  beforePlayerLeave: beforeGolfPlayerLeave,
  onPlayerLeave: onGolfPlayerLeave, // player can leave game without disconnect
  registerActionTagComponents: [], // now auto adding
  registerStateTagComponents: [],
  initGameState: {
    newPlayer: {
      behaviors: [addRole, setupPlayerAvatar, setupPlayerInput, createYourTurnPanel, setupOfflineDebug]
    },
    '1-Player': {
      components: [State.WaitTurn],
      behaviors: [spawnClub, initScore, addTurn]
    },
    '2-Player': {
      components: [State.WaitTurn],
      behaviors: [spawnClub, initScore]
    },
    GolfBall: {
      components: [State.SpawnedObject, State.NotReady, State.Active, State.BallMoving]
    },
    GolfClub: {
      components: [State.SpawnedObject, State.Active]
    },
    GolfHole: {
      behaviors: [addHole] //disableInteractive, setHideModel
    },
    GolfTee: {
      behaviors: [] //disableInteractive, setHideModel
    },
    'StartGamePanel GoalPanel 1stTurnPanel 2stTurnPanel': {
      components: [State.PanelDown],
      storage: [{ component: TransformComponent, variables: ['position'] }],
      behaviors: [disableInteractive]
    },
    WaitingPanel: {
      components: [State.PanelUp],
      storage: [{ component: TransformComponent, variables: ['position'] }]
    },
    selfOpeningDoor: {
      components: [State.Closed],
      storage: [{ component: TransformComponent, variables: ['position'] }]
    }
  },
  gamePlayerRoles: {
    newPlayer: {},
    '1-Player': {
      spawnBall: [
        {
          behavior: spawnBall,
          args: { positionCopyFromRole: 'GolfTee-0', offsetY: 1 },
          watchers: [[State.YourTurn]],
          checkers: [
            {
              function: doesPlayerHaveGameObject,
              args: { on: 'self', objectRoleName: 'GolfBall', invert: true }
            }
          ]
        }
      ],
      HitBall: [
        {
          behavior: addState,
          args: { on: 'target', add: State.addedHit },
          watchers: [[State.YourTurn]],
          takeEffectOn: {
            targetsRole: {
              GolfClub: {
                watchers: [[Action.GameObjectCollisionTag]],
                checkers: [
                  {
                    function: ifOwned
                  },
                  {
                    function: dontHasState,
                    args: { stateComponent: State.Hit }
                  },
                  {
                    function: ifVelocity,
                    args: { on: 'target', component: GolfClubComponent, more: 0.01, less: 1 }
                  },
                  {
                    function: customChecker,
                    args: {
                      on: 'GolfBall',
                      watchers: [[Action.GameObjectCollisionTag, State.BallStopped, State.Ready, State.Active]],
                      checkers: [
                        {
                          function: ifOwned
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      ],
      Goal: [
        {
          behavior: addState,
          args: { on: 'self', add: State.addedGoal },
          watchers: [[State.Waiting]],
          checkers: [
            {
              function: dontHasState,
              args: { stateComponent: State.Goal }
            }
          ],
          takeEffectOn: {
            targetsRole: {
              GolfBall: {
                watchers: [[Action.GameObjectCollisionTag, State.Ready]],
                checkers: [
                  {
                    function: ifOwned
                  },
                  {
                    function: customChecker,
                    args: {
                      on: 'GolfHole',
                      watchers: [[Action.GameObjectCollisionTag]]
                    }
                  }
                ]
              }
            }
          }
        },
        {
          behavior: saveGoalScore,
          watchers: [[State.addedGoal]]
        },
        {
          behavior: switchState,
          args: { on: 'self', remove: State.addedGoal, add: State.Goal },
          watchers: [[State.addedGoal]]
        },
        // takeEffectOn Player, Gall
        {
          behavior: teleportPlayerBehavior,
          prepareArgs: getPositionNextPoint,
          args: { on: 'self', positionCopyFromRole: 'GolfTee-', position: null },
          watchers: [[State.Goal]]
        },
        {
          behavior: teleportObject,
          prepareArgs: getPositionNextPoint,
          args: { on: 'target', positionCopyFromRole: 'GolfTee-', position: null },
          watchers: [[State.Goal]],
          takeEffectOn: {
            targetsRole: {
              GolfBall: {
                checkers: [
                  {
                    function: ifOwned
                  }
                ]
              }
            }
          }
        },
        {
          behavior: switchState,
          args: { on: 'target', remove: State.Ready, add: State.NotReady },
          watchers: [[State.addedGoal]],
          takeEffectOn: {
            targetsRole: {
              GolfBall: {
                checkers: [
                  {
                    function: ifOwned
                  }
                ]
              }
            }
          }
        },
        {
          behavior: removeState,
          args: { on: 'self', remove: State.Goal },
          watchers: [[State.Goal]]
        }
      ],
      updateTurn: [
        // give Ball Inactive State for player cant hit Ball again in one game turn
        {
          behavior: switchState,
          args: { on: 'target', remove: State.Active, add: State.Inactive },
          watchers: [[State.Waiting]],
          takeEffectOn: {
            targetsRole: {
              GolfBall: {
                watchers: [[State.Active, State.BallMoving]],
                checkers: [
                  {
                    function: ifOwned
                  }
                ]
              }
            }
          }
        },
        // do ball Active on next Turn
        {
          behavior: switchState,
          args: { on: 'self', remove: State.YourTurn, add: State.Waiting },
          watchers: [[State.YourTurn]],
          takeEffectOn: {
            targetsRole: {
              GolfClub: {
                watchers: [[State.addedHit]],
                checkers: [
                  {
                    function: ifOwned
                  }
                ]
              }
            }
          }
        },
        {
          behavior: switchState, // GameObjectCollisionTag
          args: { on: 'target', remove: State.Inactive, add: State.Active },
          watchers: [[State.YourTurn]],
          takeEffectOn: {
            targetsRole: {
              GolfBall: {
                watchers: [[State.BallStopped, State.Inactive]],
                checkers: [
                  {
                    function: ifOwned
                  }
                ]
              }
            }
          }
        },
        {
          behavior: nextTurn, // GameObjectCollisionTag
          watchers: [[State.Waiting]],
          takeEffectOn: {
            targetsRole: {
              GolfBall: {
                watchers: [[State.BallStopped, State.Inactive]],
                checkers: [
                  {
                    function: ifOwned
                  }
                ]
              }
            }
          }
        }
      ]
    }
  },
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  gameObjectRoles: {
    GolfBall: {
      checkIfFlyingOut: [
        {
          behavior: teleportObject,
          prepareArgs: getPositionNextPoint,
          args: { on: 'self', positionCopyFromRole: 'GolfTee-', position: null },
          checkers: [
            {
              function: ifGetOut,
              args: { area: 'GameArea' }
            }
          ],
          takeEffectOn: {
            targetsRole: {
              '1-Player': {
                checkers: [
                  {
                    function: ifOwned
                  }
                ]
              }
            }
          }
        }
      ],
      update: [
        {
          behavior: updateBall,
          args: {}
        },
        // switch Moving Stopped State from check Ball Velocity
        {
          behavior: switchState,
          args: { on: 'self', remove: State.BallStopped, add: State.BallMoving },
          watchers: [[State.Ready]],
          checkers: [
            {
              function: ifVelocity,
              args: { more: 0.01 }
            }
          ]
        },
        {
          behavior: switchState,
          args: { on: 'self', remove: State.BallMoving, add: State.BallStopped },
          checkers: [
            {
              function: ifVelocity,
              args: { less: 0.001 }
            }
          ]
        },
        {
          behavior: removeVelocity,
          watchers: [[State.BallStopped, State.Inactive]],
          checkers: [
            {
              function: ifVelocity,
              args: { on: 'self', more: 0.001 }
            }
          ]
        },
        // {
        //   behavior: makeKinematic,
        //   args: { kineamtic: true },
        //   watchers:[ [ State.Inactive ] ]
        // },
        // {
        //   behavior: makeKinematic,
        //   args: { kineamtic: false },
        //   watchers:[ [ State.Active ] ]
        // },
        // whan ball spawn he droping and gets moving State, we give Raady state for him whan he stop
        {
          behavior: switchState,
          args: { remove: State.NotReady, add: State.Ready },
          watchers: [[State.BallStopped]],
          checkers: [
            {
              function: ifVelocity,
              args: { less: 0.0001 }
            }
          ]
        }
      ]
    },
    'GolfTee-0': {},
    'GolfTee-1': {},
    'GolfTee-2': {},
    'GolfTee-3': {},
    'GolfTee-4': {},
    'GolfTee-5': {},
    'GolfTee-6': {},
    'GolfTee-7': {},
    'GolfTee-8': {},
    'GolfTee-9': {},
    'GolfTee-10': {},
    'GolfTee-11': {},
    'GolfTee-12': {},
    'GolfTee-13': {},
    GolfHole: {
      goal: [
        {
          behavior: switchState,
          args: { on: 'target' },
          watchers: [[Action.GameObjectCollisionTag]],
          takeEffectOn: {
            targetsRole: {
              GoalPanel: {
                watchers: [[State.PanelDown]],
                args: { remove: State.PanelDown, add: State.PanelUp }
              }
            }
          }
        }
      ]
    },
    GolfClub: {
      update: [
        {
          behavior: updateClub,
          args: {}
        }
      ],
      hitBall: [
        {
          behavior: hitBall,
          watchers: [[State.addedHit]],
          args: { clubPowerMultiplier: 5, hitAdvanceFactor: 4 },
          takeEffectOn: {
            targetsRole: {
              GolfBall: {
                checkers: [
                  {
                    function: ifOwned
                  },
                  {
                    function: hasState,
                    args: { stateComponent: State.Active }
                  }
                ]
              }
            }
          }
        },
        {
          behavior: switchState,
          args: { on: 'self', remove: State.addedHit, add: State.Hit },
          watchers: [[State.addedHit]]
        },

        {
          behavior: saveScore,
          args: { on: 'target' },
          watchers: [[State.addedHit]],
          takeEffectOn: {
            targetsRole: {
              '1-Player': {
                checkers: [
                  {
                    function: ifOwned
                  }
                ]
              }
            }
          }
        },
        {
          behavior: removeState,
          args: { on: 'self', remove: State.Hit },
          watchers: [[State.Hit]]
        }
      ]
    },
    GoalPanel: {
      objectMove: templates.switchStateAndObjectMove({
        y: 1,
        stateToMoveBack: State.PanelDown,
        stateToMove: State.PanelUp,
        min: 0.2,
        max: 3
      })
    },
    '1stTurnPanel': {
      objectMove: templates.switchStateAndObjectMove({
        y: 1,
        min: 0.2,
        max: 4,
        stateToMoveBack: State.PanelDown,
        stateToMove: State.PanelUp
      }),
      updateState: [
        {
          behavior: switchState,
          args: { on: 'self', remove: State.PanelDown, add: State.PanelUp },
          watchers: [[State.PanelDown]],
          takeEffectOn: {
            targetsRole: {
              '1-Player': {
                watchers: [[State.YourTurn]]
              }
            }
          }
        },
        {
          behavior: switchState,
          args: { on: 'self', remove: State.PanelUp, add: State.PanelDown },
          watchers: [[State.PanelUp]],
          takeEffectOn: {
            targetsRole: {
              '1-Player': {
                watchers: [[State.WaitTurn]]
              }
            }
          }
        }
      ]
    },
    '2stTurnPanel': {
      objectMove: templates.switchStateAndObjectMove({
        y: 1,
        min: 0.2,
        max: 4,
        stateToMoveBack: State.PanelDown,
        stateToMove: State.PanelUp
      }),
      updateState: [
        {
          behavior: switchState,
          args: { on: 'self', remove: State.PanelDown, add: State.PanelUp },
          watchers: [[State.PanelDown]],
          takeEffectOn: {
            targetsRole: {
              '2-Player': {
                watchers: [[State.YourTurn]]
              }
            }
          }
        },
        {
          behavior: switchState,
          args: { on: 'self', remove: State.PanelUp, add: State.PanelDown },
          watchers: [[State.PanelUp]],
          takeEffectOn: {
            targetsRole: {
              '2-Player': {
                watchers: [[State.WaitTurn]]
              }
            }
          }
        }
      ]
    },
    StartGamePanel: {
      switchState: templates.isPlayerInGameAndSwitchState({ remove: State.PanelUp, add: State.PanelDown }),
      objectMove: templates.switchStateAndObjectMove({
        y: 1,
        min: 0.2,
        max: 5,
        stateToMoveBack: State.PanelDown,
        stateToMove: State.PanelUp
      })
    },
    WaitingPanel: {
      switchState: templates.isPlayerInGameAndSwitchState({ remove: State.PanelDown, add: State.PanelUp }),
      objectMove: templates.switchStateAndObjectMove({
        y: 1,
        min: 0.2,
        max: 5,
        stateToMoveBack: State.PanelDown,
        stateToMove: State.PanelUp
      })
    },
    Door: {
      switchState: templates.hasHadInteractionAndSwitchState({ remove: State.Closed, add: State.Open }),
      objectMove: templates.switchStateAndObjectMove({
        z: 1,
        min: 0.2,
        max: 3,
        stateToMoveBack: State.Closed,
        stateToMove: State.Open
      })
    }
  }
})
