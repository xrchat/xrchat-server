import React, { Suspense } from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import { Config } from '@xrengine/client-core/src/helper'
import ProtectedRoute from './protected'
import homePage from '../pages/index'
import CircularProgress from '@material-ui/core/CircularProgress'

class RouterComp extends React.Component<{}, { hasError: boolean }> {
  static getDerivedStateFromError() {
    return { hasError: true }
  }

  constructor(props) {
    super(props)

    this.state = { hasError: false }
  }

  componentDidCatch() {
    setTimeout(() => {
      this.setState({ hasError: false })
    }, 2000)
  }

  render() {
    if (this.state.hasError) return <div>Working...</div>

    return (
      <Suspense
        fallback={
          <div
            style={{
              height: '100vh',
              width: '100%',
              textAlign: 'center',
              paddingTop: 'calc(50vh - 7px)'
            }}
          >
            <CircularProgress />
          </div>
        }
      >
        <Switch>
          <Route path="/" component={homePage} exact />
          <Route path="/login" component={React.lazy(() => import('../pages/login'))} />

          {/* Admin Routes*/}
          <Route path="/admin" component={ProtectedRoute} />

          <Route path="/offlineDev" component={React.lazy(() => import('../pages/offlineDev'))} />
          <Route path="/examples/helloworld" component={React.lazy(() => import('../pages/examples/ecs_helloworld'))} />
          <Route path="/examples/ikrig" component={React.lazy(() => import('../pages/examples/ikrig'))} />
          <Route path="/asset-test" component={React.lazy(() => import('../pages/examples/asset-test'))} />

          {/* Auth Routes */}
          <Route path="/auth/oauth/facebook" component={React.lazy(() => import('../pages/auth/oauth/facebook'))} />
          <Route path="/auth/oauth/github" component={React.lazy(() => import('../pages/auth/oauth/github'))} />
          <Route path="/auth/oauth/google" component={React.lazy(() => import('../pages/auth/oauth/google'))} />
          <Route path="/auth/oauth/linkedin" component={React.lazy(() => import('../pages/auth/oauth/linkedin'))} />
          <Route path="/auth/oauth/twitter" component={React.lazy(() => import('../pages/auth/oauth/twitter'))} />
          <Route path="/auth/confirm" component={React.lazy(() => import('../pages/auth/confirm'))} />
          <Route path="/auth/forgotpassword" component={React.lazy(() => import('../pages/auth/forgotpassword'))} />
          <Route path="/auth/magiclink" component={React.lazy(() => import('../pages/auth/magiclink'))} />

          {/* Location Routes */}
          <Route
            path="/location/:locationName"
            component={React.lazy(() => import('../pages/location/[locationName]'))}
          />
          <Redirect path="/location" to={'/location/' + Config.publicRuntimeConfig.lobbyLocationName} />
          <Route path="/video360" component={React.lazy(() => import('../pages/video360'))} />
          <Route
            path="/blondtron/:locationName"
            component={React.lazy(() => import('../pages/event/[locationName]'))}
          />
          <Route
            path="/event/:locationName"
            component={React.lazy(() => import('../pages/event/[locationName]'))}
          />
          <Route
            path="/offline/:locationName"
            component={React.lazy(() => import('../pages/offline/[locationName]'))}
          />

          {/* Harmony Routes */}
          <Route path="/harmony" component={React.lazy(() => import('../pages/harmony/index'))} />

          {/* Editor Routes */}
          <Route
            path="/editor/projects/:projectId"
            component={React.lazy(() => import('../pages/editor/projects/[projectId]'))}
          />
          <Route path="/editor/projects" component={React.lazy(() => import('../pages/editor/projects'))} />
          <Route path="/editor/create" component={React.lazy(() => import('../pages/editor/create'))} />
          <Redirect path="/editor" to="/editor/projects" />

          <Route path="/workerTest" component={React.lazy(() => import('../pages/WorkerTest'))} />
          <Route path="*" component={React.lazy(() => import('../pages/404'))} />
        </Switch>
      </Suspense>
    )
  }
}

export default RouterComp
