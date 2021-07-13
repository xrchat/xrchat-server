/**
 *Compoment to render existing project on the basis of projectId.
 *@Param :- projectId
 */

import React, { lazy, Suspense, useEffect, useState } from 'react'

// importing component EditorContainer.
const EditorContainer = lazy(() => import('@xrengine/client-core/src/world/components/editor/EditorContainer'))

import { connect } from 'react-redux'
import { selectAuthState } from '@xrengine/client-core/src/user/reducers/auth/selector'
import { bindActionCreators, Dispatch } from 'redux'
import { doLoginAuto } from '@xrengine/client-core/src/user/reducers/auth/service'
import { initializeEngine } from '@xrengine/engine/src/initializeEngine'
import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { GamesSchema } from '@xrengine/engine/src/game/templates/GamesSchema'
import { EngineSystemPresets, InitializeOptions } from '@xrengine/engine/src/initializationOptions'
/**
 * Declairing Props interface having two props.
 *@authState can be of any type.
 *@doLoginAuto can be of type doLoginAuto component.
 *
 */
interface Props {
  authState?: any
  doLoginAuto?: typeof doLoginAuto
}

/**
 *Function component providing authState on the basis of state.
 */

const mapStateToProps = (state: any): any => {
  return {
    authState: selectAuthState(state)
  }
}

/**
 *Function component providing doAutoLogin on the basis of dispatch.
 */
const mapDispatchToProps = (dispatch: Dispatch): any => ({
  doLoginAuto: bindActionCreators(doLoginAuto, dispatch)
})

/**
 * Function component providing project editor view.
 */
const Project = (props: Props) => {
  // initialising consts using props interface.
  const { authState, doLoginAuto } = props

  // initialising authUser.
  const authUser = authState.get('authUser')
  // initialising authState.
  const user = authState.get('user')
  // initialising hasMounted to false.
  const [hasMounted, setHasMounted] = useState(false)

  const [engineIsInitialized, setEngineInitialized] = useState(false)

  const initializationOptions: InitializeOptions = {
    type: EngineSystemPresets.EDITOR,
    publicPath: location.origin
  }

  useEffect(() => {
    initializeEngine(initializationOptions).then(() => {
      console.log('Setting engine inited')
      setEngineInitialized(true)
    })
  }, [])

  // setting hasMounted true once DOM get rendered or get updated.
  useEffect(() => setHasMounted(true), [])

  // setting doLoginAuto true once DOM get rendered or get updated..
  useEffect(() => {
    doLoginAuto(true)
  }, [])

  /**
   * validating user and rendering EditorContainer component.
   */
  return (
    hasMounted && (
      <Suspense fallback={React.Fragment}>
        {authUser?.accessToken != null &&
          authUser.accessToken.length > 0 &&
          user?.id != null &&
          engineIsInitialized && <EditorContainer Engine={Engine} {...props} />}
      </Suspense>
    )
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(Project)
