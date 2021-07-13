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
import { selectAuthState } from '@xrengine/client-core/src/user/reducers/auth/selector'
import { doLoginAuto } from '@xrengine/client-core/src/user/reducers/auth/service'
import { selectUserState } from '@xrengine/client-core/src/user/reducers/user/selector'
import { setCurrentScene } from '@xrengine/client-core/src/world/reducers/scenes/actions'
import { testUserId, testWorldState } from '@xrengine/common/src/assets/testScenes'
import { EngineEvents } from '@xrengine/engine/src/ecs/classes/EngineEvents'
import { resetEngine } from '@xrengine/engine/src/ecs/functions/EngineFunctions'
import { InitializeOptions } from '@xrengine/engine/src/initializationOptions'
import { initializeEngine } from '@xrengine/engine/src/initializeEngine'
import { ClientInputSystem } from '@xrengine/engine/src/input/systems/ClientInputSystem'
import { InteractiveSystem } from '@xrengine/engine/src/interaction/systems/InteractiveSystem'
import { ClientNetworkSystem } from '@xrengine/engine/src/networking/systems/ClientNetworkSystem'
import { WorldScene } from '@xrengine/engine/src/scene/functions/SceneLoading'
import { XRSystem } from '@xrengine/engine/src/xr/systems/XRSystem'
import querystring from 'querystring'
import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import url from 'url'
import { selectInstanceConnectionState } from '../../reducers/instanceConnection/selector'
import {
  connectToInstanceServer,
  provisionInstanceServer,
  resetInstanceServer
} from '../../reducers/instanceConnection/service'
import MediaIconsBox from '../../components/MediaIconsBox'
import NetworkDebug from '../../components/NetworkDebug'
import { delay } from 'lodash'
import { Network } from '../../../../engine/src/networking/classes/Network'
import { ClientNetworkStateSystem } from '../../../../engine/src/networking/systems/ClientNetworkStateSystem'

const store = Store.store

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
    doLoginAuto(true)
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

    const initializationOptions: InitializeOptions = {
      publicPath: location.origin,
      networking: {
        useOfflineMode: true
      },
      renderer: {
        canvasId: engineRendererCanvasId
      },
      physics: {
        simulationEnabled: false
      }
    }

    await initializeEngine(initializationOptions)

    document.dispatchEvent(new CustomEvent('ENGINE_LOADED'))
    addUIEvents()

    EngineEvents.instance.dispatchEvent({ type: ClientNetworkSystem.EVENTS.CONNECT, id: testUserId })

    store.dispatch(setAppOnBoardingStep(GeneralStateList.SCENE_LOADING))

    await new Promise<void>((resolve) => {
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

    await new Promise<void>((resolve) => delay(resolve, 1000))
    EngineEvents.instance.dispatchEvent({ type: EngineEvents.EVENTS.JOINED_WORLD, worldState: testWorldState })
    await new Promise<void>((resolve) => delay(resolve, 1000))

    store.dispatch(setAppOnBoardingStep(GeneralStateList.SUCCESS))
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

  const addUIEvents = () => {
    EngineEvents.instance.addEventListener(InteractiveSystem.EVENTS.USER_HOVER, onUserHover)
    EngineEvents.instance.addEventListener(InteractiveSystem.EVENTS.OBJECT_ACTIVATION, onObjectActivation)
    EngineEvents.instance.addEventListener(InteractiveSystem.EVENTS.OBJECT_HOVER, onObjectHover)
    EngineEvents.instance.addEventListener(XRSystem.EVENTS.XR_START, async () => {
      setIsInXR(true)
    })
    EngineEvents.instance.addEventListener(XRSystem.EVENTS.XR_END, async () => {
      setIsInXR(false)
    })
  }

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
      resetEngine()
    }
  }, [])

  return isInXR ? (
    <></>
  ) : (
    <>
      <MediaIconsBox />
      <NetworkDebug reinit={reinit} />
      <canvas id={engineRendererCanvasId} style={canvasStyle} />
    </>
  )
}

const connector = connect(mapStateToProps, mapDispatchToProps)(EnginePage)

export default connector
