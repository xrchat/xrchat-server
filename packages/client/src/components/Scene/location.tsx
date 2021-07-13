import Button from '@material-ui/core/Button'
import Snackbar from '@material-ui/core/Snackbar'
import EmoteMenu from '@xrengine/client-core/src/common/components/EmoteMenu'
import LoadingScreen from '@xrengine/client-core/src/common/components/Loader'
import TooltipContainer from '@xrengine/client-core/src/common/components/TooltipContainer'
import {
  GeneralStateList,
  setAppLoaded,
  setAppOnBoardingStep,
  setAppSpecificOnBoardingStep
} from '@xrengine/client-core/src/common/reducers/app/actions'
import { selectAppState } from '@xrengine/client-core/src/common/reducers/app/selector'
import { selectDeviceDetectState } from '@xrengine/client-core/src/common/reducers/devicedetect/selector'
import { client } from '@xrengine/client-core/src/feathers'
import { Config } from '@xrengine/client-core/src/helper'
import { selectLocationState } from '@xrengine/client-core/src/social/reducers/location/selector'
import { getLobby, getLocationByName } from '@xrengine/client-core/src/social/reducers/location/service'
import { selectPartyState } from '@xrengine/client-core/src/social/reducers/party/selector'
import Store from '@xrengine/client-core/src/store'
import UserMenu from '@xrengine/client-core/src/user/components/UserMenu'
import { selectAuthState } from '@xrengine/client-core/src/user/reducers/auth/selector'
import { doLoginAuto } from '@xrengine/client-core/src/user/reducers/auth/service'
import { selectUserState } from '@xrengine/client-core/src/user/reducers/user/selector'
import { InteractableModal } from '@xrengine/client-core/src/world/components/InteractableModal'
import NamePlate from '@xrengine/client-core/src/world/components/NamePlate'
import { OpenLink } from '@xrengine/client-core/src/world/components/OpenLink'
import { setCurrentScene } from '@xrengine/client-core/src/world/reducers/scenes/actions'
import { testScenes, testUserId, testWorldState } from '@xrengine/common/src/assets/testScenes'
import { AssetLoader } from '@xrengine/engine/src/assets/classes/AssetLoader'
import { FollowCameraComponent } from '@xrengine/engine/src/camera/components/FollowCameraComponent'
import { CharacterComponent } from '@xrengine/engine/src/character/components/CharacterComponent'
import { ControllerColliderComponent } from '@xrengine/engine/src/character/components/ControllerColliderComponent'
import { teleportPlayer } from '@xrengine/engine/src/character/prefabs/NetworkPlayerCharacter'
import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { EngineEvents } from '@xrengine/engine/src/ecs/classes/EngineEvents'
import { processLocationChange, resetEngine } from '@xrengine/engine/src/ecs/functions/EngineFunctions'
import { addComponent, getComponent, removeComponent } from '@xrengine/engine/src/ecs/functions/EntityFunctions'
import { InitializeOptions } from '@xrengine/engine/src/initializationOptions'
import { initializeEngine } from '@xrengine/engine/src/initializeEngine'
import { ClientInputSystem } from '@xrengine/engine/src/input/systems/ClientInputSystem'
import { InteractiveSystem } from '@xrengine/engine/src/interaction/systems/InteractiveSystem'
import { Network } from '@xrengine/engine/src/networking/classes/Network'
import { MessageTypes } from '@xrengine/engine/src/networking/enums/MessageTypes'
import { NetworkSchema } from '@xrengine/engine/src/networking/interfaces/NetworkSchema'
import { WorldStateInterface } from '@xrengine/engine/src/networking/interfaces/WorldState'
import { WorldStateModel } from '@xrengine/engine/src/networking/schema/worldStateSchema'
import { ClientNetworkSystem } from '@xrengine/engine/src/networking/systems/ClientNetworkSystem'
import { PhysicsSystem } from '@xrengine/engine/src/physics/systems/PhysicsSystem'
import { PortalProps } from '@xrengine/engine/src/scene/behaviors/createPortal'
import { WorldScene } from '@xrengine/engine/src/scene/functions/SceneLoading'
import { TransformComponent } from '@xrengine/engine/src/transform/components/TransformComponent'
import { XRSystem } from '@xrengine/engine/src/xr/systems/XRSystem'
import querystring from 'querystring'
import React, { Suspense, useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import url from 'url'
import { CameraLayers } from '../../../../engine/src/camera/constants/CameraLayers'
import MediaIconsBox from '../../components/MediaIconsBox'
import NetworkDebug from '../../components/NetworkDebug'
import { selectInstanceConnectionState } from '../../reducers/instanceConnection/selector'
import {
  connectToInstanceServer,
  provisionInstanceServer,
  resetInstanceServer
} from '../../reducers/instanceConnection/service'
import { SocketWebRTCClientTransport } from '../../transports/SocketWebRTCClientTransport'
import WarningRefreshModal from '../AlertModals/WarningRetryModal'
import RecordingApp from './../Recorder/RecordingApp'

const store = Store.store

const goHome = () => (window.location.href = window.location.origin)

const TouchGamepad = React.lazy(() => import('@xrengine/client-core/src/common/components/TouchGamepad'))

const engineRendererCanvasId = 'engine-renderer-canvas'
const projectRegex = /\/([A-Za-z0-9]+)\/([a-f0-9-]+)$/

const initialRefreshModalValues = {
  open: false,
  title: '',
  body: '',
  action: async () => {},
  parameters: [],
  timeout: 10000,
  noCountdown: false
}

const canvasStyle = {
  zIndex: 0,
  width: '100%',
  height: '100%',
  position: 'absolute',
  WebkitUserSelect: 'none',
  userSelect: 'none'
} as React.CSSProperties

// debug for contexts where devtools may be unavailable
const consoleLog = []
if (globalThis.process?.env.NODE_ENV === 'development') {
  const consolelog = console.log
  console.log = (...args) => {
    consolelog(...args)
    consoleLog.push('Log: ' + args.join(' '))
  }

  const consolewarn = console.warn
  console.warn = (...args) => {
    consolewarn(...args)
    consoleLog.push('Warn: ' + args.join(' '))
  }

  const consoleerror = console.error
  console.error = (...args) => {
    consoleerror(...args)
    consoleLog.push('Error: ' + args.join(' '))
  }

  globalThis.dump = () => {
    document.body.innerHTML = consoleLog
      .map((log) => {
        return `<p>${log}</p>`
      })
      .join('')
    consolelog(consoleLog)
    resetEngine()
  }
}

interface Props {
  setAppLoaded?: any
  sceneId?: string
  userState?: any
  deviceState?: any
  locationName: string
  appState?: any
  authState?: any
  locationState?: any
  partyState?: any
  history?: any
  instanceConnectionState?: any
  doLoginAuto?: typeof doLoginAuto
  getLocationByName?: typeof getLocationByName
  connectToInstanceServer?: typeof connectToInstanceServer
  provisionInstanceServer?: typeof provisionInstanceServer
  resetInstanceServer?: typeof resetInstanceServer
  setCurrentScene?: typeof setCurrentScene
  harmonyOpen?: boolean
}

const mapStateToProps = (state: any) => {
  return {
    userState: selectUserState(state),
    appState: selectAppState(state),
    deviceState: selectDeviceDetectState(state),
    authState: selectAuthState(state),
    instanceConnectionState: selectInstanceConnectionState(state),
    locationState: selectLocationState(state),
    partyState: selectPartyState(state)
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setAppLoaded: bindActionCreators(setAppLoaded, dispatch),
  doLoginAuto: bindActionCreators(doLoginAuto, dispatch),
  getLocationByName: bindActionCreators(getLocationByName, dispatch),
  connectToInstanceServer: bindActionCreators(connectToInstanceServer, dispatch),
  provisionInstanceServer: bindActionCreators(provisionInstanceServer, dispatch),
  resetInstanceServer: bindActionCreators(resetInstanceServer, dispatch),
  setCurrentScene: bindActionCreators(setCurrentScene, dispatch)
})

let slugifiedName = null

export const EnginePage = (props: Props) => {
  const {
    appState,
    authState,
    locationState,
    partyState,
    userState,
    deviceState,
    instanceConnectionState,
    doLoginAuto,
    getLocationByName,
    connectToInstanceServer,
    provisionInstanceServer,
    resetInstanceServer,
    setCurrentScene,
    setAppLoaded,
    locationName,
    harmonyOpen,
    history
  } = props

  const currentUser = authState.get('user')
  const [hoveredLabel, setHoveredLabel] = useState('')
  const [infoBoxData, setModalData] = useState(null)
  const [userBanned, setUserBannedState] = useState(false)
  const [openLinkData, setOpenLinkData] = useState(null)

  const [progressEntity, setProgressEntity] = useState(99)
  const [userHovered, setonUserHover] = useState(false)
  const [userId, setonUserId] = useState(null)
  const [position, setonUserPosition] = useState(null)
  const [objectActivated, setObjectActivated] = useState(false)
  const [objectHovered, setObjectHovered] = useState(false)

  const [isValidLocation, setIsValidLocation] = useState(true)
  const [isInXR, setIsInXR] = useState(false)
  const [warningRefreshModalValues, setWarningRefreshModalValues] = useState(initialRefreshModalValues)
  const [noGameserverProvision, setNoGameserverProvision] = useState(false)
  const [instanceDisconnected, setInstanceDisconnected] = useState(false)
  const [instanceKicked, setInstanceKicked] = useState(false)
  const [instanceKickedMessage, setInstanceKickedMessage] = useState('')
  const [isInputEnabled, setInputEnabled] = useState(true)
  const [porting, setPorting] = useState(false)
  const [newSpawnPos, setNewSpawnPos] = useState(null)

  const appLoaded = appState.get('loaded')
  const selfUser = authState.get('user')
  const party = partyState.get('party')
  const instanceId = selfUser?.instanceId ?? party?.instanceId
  let sceneId = null
  let locationId = null

  useEffect(() => {
    if (Config.publicRuntimeConfig.offlineMode) {
      init(locationName)
    } else {
      doLoginAuto(true)
      EngineEvents.instance.addEventListener(
        SocketWebRTCClientTransport.EVENTS.PROVISION_INSTANCE_NO_GAMESERVERS_AVAILABLE,
        () => setNoGameserverProvision(true)
      )
      EngineEvents.instance.addEventListener(SocketWebRTCClientTransport.EVENTS.INSTANCE_DISCONNECTED, () => {
        if ((Network.instance.transport as SocketWebRTCClientTransport).left === false) setInstanceDisconnected(true)
      })
      EngineEvents.instance.addEventListener(SocketWebRTCClientTransport.EVENTS.INSTANCE_KICKED, ({ message }) => {
        setInstanceKickedMessage(message)
        setInstanceKicked(true)
      })
      EngineEvents.instance.addEventListener(SocketWebRTCClientTransport.EVENTS.INSTANCE_RECONNECTED, () =>
        setWarningRefreshModalValues(initialRefreshModalValues)
      )
      EngineEvents.instance.addEventListener(EngineEvents.EVENTS.RESET_ENGINE, async (ev: any) => {
        if (ev.instance === true) {
          await resetEngine()
          resetInstanceServer()
          const currentLocation = locationState.get('currentLocation').get('location')
          locationId = currentLocation.id
          if (locationName === Config.publicRuntimeConfig.lobbyLocationName) {
            getLobby()
              .then((lobby) => {
                history.replace('/location/' + lobby.slugifiedName)
              })
              .catch((err) => console.log('getLobby error', err))
          } else {
            getLocationByName(locationName)
            if (sceneId === null) {
              sceneId = currentLocation.sceneId
            }
          }
        }
      })
    }
  }, [])

  useEffect(() => {
    const currentLocation = locationState.get('currentLocation').get('location')
    locationId = currentLocation.id

    setUserBannedState(selfUser?.locationBans?.find((ban) => ban.locationId === locationId) != null)
    if (
      authState.get('isLoggedIn') === true &&
      authState.get('user')?.id != null &&
      authState.get('user')?.id.length > 0 &&
      currentLocation.id == null &&
      userBanned === false &&
      locationState.get('fetchingCurrentLocation') !== true
    ) {
      if (locationName === Config.publicRuntimeConfig.lobbyLocationName) {
        getLobby()
          .then((lobby) => {
            history.replace('/location/' + lobby.slugifiedName)
          })
          .catch((err) => console.log('getLobby error', err))
      } else {
        getLocationByName(locationName)
        if (sceneId === null) {
          sceneId = currentLocation.sceneId
        }
      }
    }
  }, [authState])

  useEffect(() => {
    const currentLocation = locationState.get('currentLocation').get('location')
    slugifiedName = currentLocation.slugifiedName
    if (
      currentLocation.id != null &&
      userBanned != true &&
      instanceConnectionState.get('instanceProvisioned') === false &&
      instanceConnectionState.get('instanceProvisioning') === false
    ) {
      const search = window.location.search
      let instanceId
      if (search != null) {
        const parsed = url.parse(window.location.href)
        const query = querystring.parse(parsed.query)
        instanceId = query.instanceId
      }
      provisionInstanceServer(currentLocation.id, instanceId || undefined, sceneId)
    }
    if (sceneId === null) {
      sceneId = currentLocation.sceneId
    }

    if (
      !currentLocation.id &&
      !locationState.get('currentLocationUpdateNeeded') &&
      !locationState.get('fetchingCurrentLocation')
    ) {
      setIsValidLocation(false)
      store.dispatch(setAppSpecificOnBoardingStep(GeneralStateList.FAILED, false))
    }
  }, [locationState])

  useEffect(() => {
    if (
      instanceConnectionState.get('instanceProvisioned') === true &&
      instanceConnectionState.get('updateNeeded') === true &&
      instanceConnectionState.get('instanceServerConnecting') === false &&
      instanceConnectionState.get('connected') === false
    ) {
      reinit()
    }
  }, [instanceConnectionState])

  useEffect(() => {
    if (
      appLoaded === true &&
      instanceConnectionState.get('instanceProvisioned') === false &&
      instanceConnectionState.get('instanceProvisioning') === false
    ) {
      if (instanceId != null) {
        client
          .service('instance')
          .get(instanceId)
          .then((instance) => {
            const currentLocation = locationState.get('currentLocation').get('location')
            provisionInstanceServer(instance.locationId, instanceId, currentLocation.sceneId)
            if (sceneId === null) {
              console.log('Set scene ID to', sceneId)
              sceneId = currentLocation.sceneId
            }
          })
          .catch((err) => console.log('instance get error', err))
      }
    }
  }, [appState])

  useEffect(() => {
    if (noGameserverProvision === true) {
      const currentLocation = locationState.get('currentLocation').get('location')
      const newValues = {
        open: true,
        title: 'No Available Servers',
        body: "There aren't any servers available for you to connect to. Attempting to re-connect in",
        action: provisionInstanceServer,
        parameters: [currentLocation.id, instanceId, currentLocation.sceneId],
        timeout: 10000
      }
      //@ts-ignore
      setWarningRefreshModalValues(newValues)
      setNoGameserverProvision(false)
    }
  }, [noGameserverProvision])

  useEffect(() => {
    if (instanceDisconnected === true && !porting) {
      const newValues = {
        open: true,
        title: 'World disconnected',
        body: "You've lost your connection with the world. We'll try to reconnect before the following time runs out, otherwise you'll be forwarded to a different instance.",
        action: window.location.reload,
        parameters: [],
        timeout: 30000
      }
      //@ts-ignore
      setWarningRefreshModalValues(newValues)
      setInstanceDisconnected(false)
    }
  }, [instanceDisconnected])

  useEffect(() => {
    if (instanceKicked === true) {
      const newValues = {
        open: true,
        title: "You've been kicked from the world",
        body: 'You were kicked from this world for the following reason: ' + instanceKickedMessage,
        noCountdown: true
      }
      //@ts-ignore
      setWarningRefreshModalValues(newValues)
      setInstanceDisconnected(false)
    }
  }, [instanceKicked])

  const reinit = () => {
    const currentLocation = locationState.get('currentLocation').get('location')
    if (sceneId === null && currentLocation.sceneId !== null) {
      sceneId = currentLocation.sceneId
    }
    init(sceneId)
  }

  async function init(sceneId: string): Promise<any> {
    // auth: any,
    let sceneData
    if (Config.publicRuntimeConfig.offlineMode) {
      sceneData = testScenes[sceneId] || testScenes.test
    } else {
      let service, serviceId
      const projectResult = await client.service('project').get(sceneId)
      setCurrentScene(projectResult)
      const projectUrl = projectResult.project_url
      const regexResult = projectUrl.match(projectRegex)
      if (regexResult) {
        service = regexResult[1]
        serviceId = regexResult[2]
      }
      sceneData = await client.service(service).get(serviceId)
    }

    if (!Engine.isInitialized) {
      const initializationOptions: InitializeOptions = {
        publicPath: location.origin,
        networking: {
          schema: {
            transport: SocketWebRTCClientTransport
          } as NetworkSchema
        },
        renderer: {
          canvasId: engineRendererCanvasId
        },
        physics: {
          simulationEnabled: false
        }
      }

      await initializeEngine(initializationOptions)

      document.dispatchEvent(new CustomEvent('ENGINE_LOADED')) // this is the only time we should use document events. would be good to replace this with react state
      addUIEvents()
    }

    if (!Config.publicRuntimeConfig.offlineMode) await connectToInstanceServer('instance')

    const connectPromise = new Promise<void>((resolve) => {
      EngineEvents.instance.once(
        EngineEvents.EVENTS.CONNECT_TO_WORLD,
        async ({ worldState }: { worldState: WorldStateInterface }) => {
          const localClient = worldState.clientsConnected.find((client) => {
            return client.userId === Network.instance.userId
          })
          console.log(localClient.avatarDetail.avatarURL)
          AssetLoader.load({ url: localClient.avatarDetail.avatarURL })
          resolve()
        }
      )
    })
    store.dispatch(setAppOnBoardingStep(GeneralStateList.SCENE_LOADING))

    const sceneLoadPromise = new Promise<void>((resolve) => {
      WorldScene.load(
        sceneData,
        () => {
          setProgressEntity(0)
          store.dispatch(setAppOnBoardingStep(GeneralStateList.SCENE_LOADED))
          setAppLoaded(true)
          resolve()
        },
        onSceneLoadedEntity
      )
    })

    await Promise.all([connectPromise, sceneLoadPromise])

    const worldState = await new Promise<any>(async (resolve) => {
      if (Config.publicRuntimeConfig.offlineMode) {
        EngineEvents.instance.dispatchEvent({ type: ClientNetworkSystem.EVENTS.CONNECT, id: testUserId })
        resolve(testWorldState)
      } else {
        // TEMPORARY - just so portals work for now - will be removed in favor of gameserver-gameserver communication
        let spawnTransform
        if (porting) {
          spawnTransform = { position: newSpawnPos.spawnPosition, rotation: newSpawnPos.spawnRotation }
        }

        const { worldState } = await (Network.instance.transport as SocketWebRTCClientTransport).instanceRequest(
          MessageTypes.JoinWorld.toString(),
          { spawnTransform }
        )
        resolve(WorldStateModel.fromBuffer(worldState))
      }
    })

    EngineEvents.instance.dispatchEvent({ type: EngineEvents.EVENTS.JOINED_WORLD, worldState })
    store.dispatch(setAppOnBoardingStep(GeneralStateList.SUCCESS))
    setPorting(false)
  }

  useEffect(() => {
    EngineEvents.instance.dispatchEvent({
      type: ClientInputSystem.EVENTS.ENABLE_INPUT,
      keyboard: isInputEnabled,
      mouse: isInputEnabled
    })
  }, [isInputEnabled])

  const onSceneLoadedEntity = (left: number): void => {
    setProgressEntity(left || 0)
  }

  const onObjectHover = ({ focused, interactionText }: { focused: boolean; interactionText: string }): void => {
    setObjectHovered(focused)
    let displayText = interactionText
    const length = interactionText && interactionText.length
    if (length > 110) {
      displayText = interactionText.substring(0, 110) + '...'
    }
    setHoveredLabel(displayText)
  }

  const onUserHover = ({ focused, userId, position }): void => {
    setonUserHover(focused)
    setonUserId(focused ? userId : null)
    setonUserPosition(focused ? position : null)
  }

  const portToLocation = async ({ portalComponent }: { portalComponent: PortalProps }) => {
    // console.log('portToLocation', slugifiedName, portalComponent);

    if (slugifiedName === portalComponent.location) {
      teleportPlayer(Network.instance.localClientEntity, portalComponent.spawnPosition, portalComponent.spawnRotation)
      return
    }

    // shut down connection with existing GS
    setPorting(true)
    resetInstanceServer()
    Network.instance.transport.close()

    EngineEvents.instance.dispatchEvent({ type: EngineEvents.EVENTS.ENABLE_SCENE, physics: false })

    // remove controller since physics world will be destroyed and we don't want it moving
    PhysicsSystem.instance.removeController(
      getComponent(Network.instance.localClientEntity, ControllerColliderComponent).controller
    )
    removeComponent(Network.instance.localClientEntity, ControllerColliderComponent)

    // Handle Camera transition while player is moving
    // Remove the follow component, and attach the camera to the player, so it moves with them without causing discomfort while in VR
    removeComponent(Network.instance.localClientEntity, FollowCameraComponent)
    const camParent = Engine.camera.parent
    if (camParent) Engine.camera.removeFromParent()
    Engine.camera.layers.disable(CameraLayers.Scene)

    // change our browser URL
    history.replace('/location/' + portalComponent.location)
    setNewSpawnPos(portalComponent)

    await processLocationChange()

    getLocationByName(portalComponent.location)

    // add back the collider using previous parameters
    EngineEvents.instance.once(EngineEvents.EVENTS.JOINED_WORLD, () => {
      // teleport player to where the portal is
      const transform = getComponent(Network.instance.localClientEntity, TransformComponent)
      const actor = getComponent(Network.instance.localClientEntity, CharacterComponent)
      transform.position.set(
        portalComponent.spawnPosition.x,
        portalComponent.spawnPosition.y + actor.actorHalfHeight,
        portalComponent.spawnPosition.z
      )
      transform.rotation.copy(portalComponent.spawnRotation)

      addComponent(Network.instance.localClientEntity, ControllerColliderComponent)

      addComponent(Network.instance.localClientEntity, FollowCameraComponent)
      if (camParent) camParent.add(Engine.camera)
      Engine.camera.layers.enable(CameraLayers.Scene)

      EngineEvents.instance.dispatchEvent({ type: EngineEvents.EVENTS.ENABLE_SCENE, physics: true })
    })
  }

  const addUIEvents = () => {
    EngineEvents.instance.addEventListener(InteractiveSystem.EVENTS.USER_HOVER, onUserHover)
    EngineEvents.instance.addEventListener(InteractiveSystem.EVENTS.OBJECT_ACTIVATION, onObjectActivation)
    EngineEvents.instance.addEventListener(InteractiveSystem.EVENTS.OBJECT_HOVER, onObjectHover)
    EngineEvents.instance.addEventListener(PhysicsSystem.EVENTS.PORTAL_REDIRECT_EVENT, portToLocation)
    EngineEvents.instance.addEventListener(XRSystem.EVENTS.XR_START, async () => {
      setIsInXR(true)
    })
    EngineEvents.instance.addEventListener(XRSystem.EVENTS.XR_END, async () => {
      setIsInXR(false)
    })
  }

  let characterAvatar: CharacterComponent = null
  let networkUser
  const onObjectActivation = (interactionData): void => {
    switch (interactionData.interactionType) {
      case 'link':
        setOpenLinkData(interactionData)
        setInputEnabled(false)
        setObjectActivated(true)
        break
      case 'infoBox':
      case 'mediaSource':
        setModalData(interactionData)
        setInputEnabled(false)
        setObjectActivated(true)
        break
      default:
        break
    }
  }

  useEffect(() => {
    return (): void => {
      document.body.innerHTML = consoleLog
        .map((log) => {
          ;`<p>${log}</p>`
        })
        .join()
      resetEngine()
    }
  }, [])

  //touch gamepad
  const touchGamepadProps = { hovered: objectHovered, layout: 'default' }
  const touchGamepad = deviceState.get('content')?.touchDetected ? (
    <Suspense fallback={<></>}>
      <TouchGamepad {...touchGamepadProps} />
    </Suspense>
  ) : null

  if (userBanned) return <div className="banned">You have been banned from this location</div>
  return isInXR ? (
    <></>
  ) : (
    <>
      {isValidLocation && <UserMenu />}
      <Snackbar
        open={!isValidLocation}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center'
        }}
      >
        <>
          <section>Location is invalid</section>
          <Button onClick={goHome}>Return Home</Button>
        </>
      </Snackbar>

      <NetworkDebug reinit={reinit} />
      <LoadingScreen objectsToLoad={progressEntity} />
      {harmonyOpen !== true && <MediaIconsBox />}
      {userHovered && <NamePlate userId={userId} position={{ x: position?.x, y: position?.y }} focused={userHovered} />}
      {/* {objectHovered && !objectActivated && <TooltipContainer message={hoveredLabel} />} */}
      <InteractableModal
        onClose={() => {
          setModalData(null)
          setObjectActivated(false)
          setInputEnabled(true)
        }}
        data={infoBoxData}
      />
      <RecordingApp />
      <OpenLink
        onClose={() => {
          setOpenLinkData(null)
          setObjectActivated(false)
          setInputEnabled(true)
        }}
        data={openLinkData}
      />
      <canvas id={engineRendererCanvasId} style={canvasStyle} />
      {touchGamepad}
      <WarningRefreshModal
        open={warningRefreshModalValues.open && !porting}
        handleClose={() => {
          setWarningRefreshModalValues(initialRefreshModalValues)
        }}
        title={warningRefreshModalValues.title}
        body={warningRefreshModalValues.body}
        action={warningRefreshModalValues.action}
        parameters={warningRefreshModalValues.parameters}
        timeout={warningRefreshModalValues.timeout}
        noCountdown={warningRefreshModalValues.noCountdown}
      />
      <EmoteMenu />
    </>
  )
}

const connector = connect(mapStateToProps, mapDispatchToProps)(EnginePage)

export default connector
