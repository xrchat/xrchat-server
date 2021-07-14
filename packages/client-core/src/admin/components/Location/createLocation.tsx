import React from 'react'
import Drawer from '@material-ui/core/Drawer'
import Button from '@material-ui/core/Button'
import { bindActionCreators, Dispatch } from 'redux'
import { connect } from 'react-redux'
import DialogActions from '@material-ui/core/DialogActions'
import Container from '@material-ui/core/Container'
import DialogTitle from '@material-ui/core/DialogTitle'
import Snackbar from '@material-ui/core/Snackbar'
import MuiAlert from '@material-ui/lab/Alert'
import { useStyles, useStyle } from './styles'
import Paper from '@material-ui/core/Paper'
import InputBase from '@material-ui/core/InputBase'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import Grid from '@material-ui/core/Grid'
import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import FormGroup from '@material-ui/core/FormGroup'
import Switch from '@material-ui/core/Switch'
import { useTranslation } from 'react-i18next'
import { selectAdminLocationState } from '../../reducers/admin/location/selector'
import { selectAdminSceneState } from '../../reducers/admin/scene/selector'
import { createLocation as createLocationAction } from '../../reducers/admin/location/service'
import { formValid } from '../Users/validation'
import { selectAlertState } from '../../../common/reducers/alert/selector'

const Alert = (props) => {
  return <MuiAlert elevation={6} variant="filled" {...props} />
}

interface Props {
  open: boolean
  handleClose: any
  adminLocationState?: any
  adminSceneState?: any
  createLocationAction?: any
  closeViewModel?: any
  adminAlert?: any
}

const mapStateToProps = (state: any): any => {
  return {
    adminLocationState: selectAdminLocationState(state),
    adminSceneState: selectAdminSceneState(state),
    adminAlert: selectAlertState(state)
  }
}

const mapDispatchToProps = (dispatch: Dispatch): any => ({
  createLocationAction: bindActionCreators(createLocationAction, dispatch)
})

const CreateLocation = (props: Props) => {
  const { open, handleClose, adminLocationState, adminSceneState, createLocationAction, closeViewModel, adminAlert } =
    props
  const classesx = useStyle()
  const classes = useStyles()
  const [openWarning, setOpenWarning] = React.useState(false)
  const [error, setError] = React.useState('')
  const [state, setState] = React.useState({
    name: '',
    maxUsers: 10,
    scene: '',
    type: 'private',
    videoEnabled: false,
    globalMediaEnabled: false,
    isLobby: false,
    isFeatured: false,
    formErrors: {
      name: '',
      maxUsers: '',
      scene: '',
      type: ''
    }
  })

  const { t } = useTranslation()
  const locationTypes = adminLocationState.get('locationTypes').get('locationTypes')
  const location = adminLocationState.get('locations')
  const adminScenes = adminSceneState.get('scenes').get('scenes')
  const errorType = adminAlert.get('type')
  const errorMessage = adminAlert.get('message')

  React.useEffect(() => {
    if (location.get('created')) {
      closeViewModel(false)
      setState({
        ...state,
        name: '',
        maxUsers: 10,
        scene: '',
        type: 'private',
        videoEnabled: false,
        globalMediaEnabled: false,
        isLobby: false,
        isFeatured: false
      })
    }
  }, [location])

  React.useEffect(() => {
    if (errorType === 'error') {
      setError(errorMessage)
      setOpenWarning(true)
      setTimeout(() => {
        setOpenWarning(false)
      }, 5000)
    }
  }, [errorType, errorMessage])

  const handleCloseWarning = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setOpenWarning(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let temp = state.formErrors
    switch (name) {
      case 'name':
        temp.name = value.length < 2 ? 'Name is required!' : ''
        break
      case 'maxUsers':
        temp.maxUsers = value.length < 2 ? 'Max users is required!' : ''
        break
      case 'scene':
        temp.scene = value.length < 2 ? 'Scene is required!' : ''
        break
      case 'private':
        temp.type = value.length < 2 ? 'Private role is required!' : ''
        break
      default:
        break
    }
    setState({ ...state, [name]: value, formErrors: temp })
  }

  const handleSubmit = () => {
    const data = {
      name: state.name,
      sceneId: state.scene,
      maxUsersPerInstance: state.maxUsers,
      location_setting: {
        locationType: state.type,
        instanceMediaChatEnabled: state.globalMediaEnabled,
        videoEnabled: state.videoEnabled
      },
      isLobby: state.isLobby,
      isFeatured: state.isFeatured
    }
    const temp = state.formErrors
    if (!state.name) {
      temp.name = "Name can't be empty"
    }
    if (!state.maxUsers) {
      temp.maxUsers = "Max user can't be empty"
    }
    if (!state.scene) {
      temp.scene = "Scene can't be empty"
    }
    setState({ ...state, formErrors: temp })
    if (formValid(state, state.formErrors)) {
      createLocationAction(data)
      //  closeViewModel(false)
    } else {
      setError('Please fill all required field')
      setOpenWarning(true)
    }
  }

  return (
    <React.Fragment>
      <Drawer anchor="right" classes={{ paper: classesx.paper }} open={open} onClose={handleClose(false)}>
        <Container maxWidth="sm" className={classes.marginTp}>
          <DialogTitle id="form-dialog-title" className={classes.texAlign}>
            Create New Location
          </DialogTitle>
          <label>Name</label>
          <Paper component="div" className={state.formErrors.name.length > 0 ? classes.redBorder : classes.createInput}>
            <InputBase
              className={classes.input}
              name="name"
              placeholder="Enter name"
              style={{ color: '#fff' }}
              autoComplete="off"
              value={state.name}
              onChange={handleChange}
            />
          </Paper>
          <label>Max Users</label>
          <Paper
            component="div"
            className={state.formErrors.maxUsers.length > 0 ? classes.redBorder : classes.createInput}
          >
            <InputBase
              className={classes.input}
              name="maxUsers"
              placeholder="Enter max users"
              style={{ color: '#fff' }}
              autoComplete="off"
              type="number"
              value={state.maxUsers}
              onChange={handleChange}
            />
          </Paper>
          <label>Scene</label>
          <Paper
            component="div"
            className={state.formErrors.scene.length > 0 ? classes.redBorder : classes.createInput}
          >
            <FormControl fullWidth>
              <Select
                labelId="demo-controlled-open-select-label"
                id="demo-controlled-open-select"
                value={state.scene}
                fullWidth
                displayEmpty
                onChange={handleChange}
                className={classes.select}
                name="scene"
                MenuProps={{ classes: { paper: classesx.selectPaper } }}
              >
                <MenuItem value="" disabled>
                  <em>Select scene</em>
                </MenuItem>
                {adminScenes.map((el) => (
                  <MenuItem value={el.sid} key={el.sid}>{`${el.name} (${el.sid})`}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
          <label>Private</label>
          <Paper component="div" className={classes.createInput}>
            <FormControl fullWidth>
              <Select
                labelId="demo-controlled-open-select-label"
                id="demo-controlled-open-select"
                value={state.type}
                fullWidth
                displayEmpty
                onChange={handleChange}
                className={classes.select}
                name="type"
                MenuProps={{ classes: { paper: classesx.selectPaper } }}
              >
                <MenuItem value="" disabled>
                  <em>Select type</em>
                </MenuItem>
                {locationTypes.map((el) => (
                  <MenuItem value={el.type} key={el.type}>
                    {el.type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
          <Grid container spacing={5} className={classes.marginBottm}>
            <Grid item xs={6}>
              <FormGroup>
                <FormControl>
                  <FormControlLabel
                    color="primary"
                    control={
                      <Switch
                        checked={state.videoEnabled}
                        onChange={(e) => setState({ ...state, videoEnabled: e.target.checked })}
                        name="videoEnabled"
                      />
                    }
                    label={t('admin:components.locationModel.lbl-ve')}
                  />
                </FormControl>
              </FormGroup>
              <FormGroup>
                <FormControl>
                  <FormControlLabel
                    color="primary"
                    control={
                      <Switch
                        checked={state.globalMediaEnabled}
                        onChange={(e) => setState({ ...state, globalMediaEnabled: e.target.checked })}
                        name="globalMediaEnabled"
                      />
                    }
                    label={t('admin:components.locationModel.lbl-gme')}
                  />
                </FormControl>
              </FormGroup>
            </Grid>
            <Grid item xs={6} style={{ display: 'flex' }}>
              <div style={{ marginLeft: 'auto' }}>
                <FormGroup>
                  <FormControl>
                    <FormControlLabel
                      color="primary"
                      control={
                        <Switch
                          checked={state.isLobby}
                          onChange={(e) => setState({ ...state, isLobby: e.target.checked })}
                          name="isLobby"
                        />
                      }
                      label={t('admin:components.locationModel.lbl-lobby')}
                    />
                  </FormControl>
                </FormGroup>
                <FormGroup>
                  <FormControl>
                    <FormControlLabel
                      color="primary"
                      control={
                        <Switch
                          checked={state.isFeatured}
                          onChange={(e) => setState({ ...state, isFeatured: e.target.checked })}
                          name="isFeatured"
                        />
                      }
                      label={t('admin:components.locationModel.lbl-featured')}
                    />
                  </FormControl>
                </FormGroup>
              </div>
            </Grid>
          </Grid>
          <DialogActions>
            <Button className={classesx.saveBtn} onClick={handleSubmit}>
              Submit
            </Button>
            <Button onClick={handleClose(false)} className={classesx.saveBtn}>
              Cancel
            </Button>
          </DialogActions>
          <Snackbar
            open={openWarning}
            autoHideDuration={6000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseWarning} severity="warning">
              {' '}
              {error}{' '}
            </Alert>
          </Snackbar>
        </Container>
      </Drawer>
    </React.Fragment>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateLocation)
