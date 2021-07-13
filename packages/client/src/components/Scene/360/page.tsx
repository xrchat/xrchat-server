import {
  GeneralStateList,
  setAppLoaded,
  setAppOnBoardingStep
} from '@xrengine/client-core/src/common/reducers/app/actions'
import Store from '@xrengine/client-core/src/store'
import { testScenes, testUserId, testWorldState } from '@xrengine/common/src/assets/testScenes'
import { isMobile } from '@xrengine/engine/src/common/functions/isMobile'
import { EngineEvents } from '@xrengine/engine/src/ecs/classes/EngineEvents'
import { resetEngine } from '@xrengine/engine/src/ecs/functions/EngineFunctions'
import { initializeEngine } from '@xrengine/engine/src/initializeEngine'
import { ClientNetworkSystem } from '@xrengine/engine/src/networking/systems/ClientNetworkSystem'
import { createPanelComponent } from '@xrengine/engine/src/ui-old/functions/createPanelComponent'
import { XRSystem } from '@xrengine/engine/src/xr/systems/XRSystem'
import React, { useEffect, useState } from 'react'
import { XR360Player } from './app'
import { testScene } from './test'
import { WorldScene } from '@xrengine/engine/src/scene/functions/SceneLoading'
import { InitializeOptions } from '../../../../../engine/src/initializationOptions'

const TouchGamepad = React.lazy(() => import('@xrengine/client-core/src/common/components/TouchGamepad'))
const engineRendererCanvasId = 'engine-renderer-canvas'

const store = Store.store

interface Props {
  locationName: string
}

const canvasStyle = {
  zIndex: 0,
  width: '100%',
  height: '100%',
  position: 'absolute',
  WebkitUserSelect: 'none',
  userSelect: 'none'
} as React.CSSProperties

export const XR360PlayerPage = (props: Props) => {
  const { locationName } = props

  const [isInXR, setIsInXR] = useState(false)
  useEffect(() => {
    init(locationName)
  }, [])

  async function init(sceneId: string): Promise<any> {
    const sceneData = testScenes[sceneId] || testScenes.test

    const InitializationOptions: InitializeOptions = {
      renderer: {
        canvasId: engineRendererCanvasId,
        postProcessing: false
      },
      networking: {
        useOfflineMode: true
      }
    }
    console.log(InitializationOptions)
    await initializeEngine(InitializationOptions)

    document.dispatchEvent(new CustomEvent('ENGINE_LOADED')) // this is the only time we should use document events. would be good to replace this with react state

    addUIEvents()

    const loadScene = new Promise<void>((resolve) => {
      WorldScene.load(sceneData, () => {
        store.dispatch(setAppOnBoardingStep(GeneralStateList.SCENE_LOADED))
        setAppLoaded(true)
        resolve()
      })
    })

    const getWorldState = new Promise<any>((resolve) => {
      EngineEvents.instance.dispatchEvent({ type: ClientNetworkSystem.EVENTS.CONNECT, id: testUserId })
      resolve(testWorldState)
    })

    const [sceneLoaded, worldState] = await Promise.all([loadScene, getWorldState])

    EngineEvents.instance.dispatchEvent({ type: EngineEvents.EVENTS.JOINED_WORLD, worldState })

    createPanelComponent({ panel: new XR360Player(testScene) })
  }

  const addUIEvents = () => {
    EngineEvents.instance.addEventListener(XRSystem.EVENTS.XR_START, async (ev: any) => {
      setIsInXR(true)
    })
    EngineEvents.instance.addEventListener(XRSystem.EVENTS.XR_END, async (ev: any) => {
      setIsInXR(false)
    })
  }

  useEffect(() => {
    return (): void => {
      resetEngine()
    }
  }, [])

  //touch gamepad
  const touchGamepadProps = { layout: 'default' }
  const touchGamepad = isMobile ? <TouchGamepad {...touchGamepadProps} /> : null
  return (
    <>
      {!isInXR && (
        <div>
          <canvas id={engineRendererCanvasId} style={canvasStyle} />
          {touchGamepad}
        </div>
      )}
    </>
  )
}
