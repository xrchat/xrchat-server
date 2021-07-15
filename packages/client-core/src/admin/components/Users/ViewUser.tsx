import React from 'react'
import Drawer from '@material-ui/core/Drawer'
import Container from '@material-ui/core/Container'
import Paper from '@material-ui/core/Paper'
import Avatar from '@material-ui/core/Avatar'
import Grid from '@material-ui/core/Grid'
import Typography from '@material-ui/core/Typography'
import Chip from '@material-ui/core/Chip'
import { Edit, Save } from '@material-ui/icons'
import Skeleton from '@material-ui/lab/Skeleton'
import TextField from '@material-ui/core/TextField'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'
import Button from '@material-ui/core/Button'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { selectAuthState } from '../../../user/reducers/auth/selector'
import { bindActionCreators, Dispatch } from 'redux'
import { fetchUserRole } from '../../reducers/admin/user/service'
import { connect } from 'react-redux'
import InputBase from '@material-ui/core/InputBase'
import { updateUserRole, patchUser, fetchSingleUserAdmin, fetchStaticResource } from '../../reducers/admin/user/service'
import { useStyles, useStyle } from './styles'
import { selectAdminUserState } from '../../reducers/admin/user/selector'
import { formValid } from './validation'
import MuiAlert from '@material-ui/lab/Alert'
import Snackbar from '@material-ui/core/Snackbar'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

interface Props {
  openView: boolean
  userAdmin: any
  authState?: any
  fetchUserRole?: any
  fetchAdminParty?: any
  patchUser?: any
  closeViewModel?: any
  updateUserRole?: any
  fetchSingleUserAdmin?: any
  adminUserState?: any
  fetchStaticResource?: any
}

const mapStateToProps = (state: any): any => {
  return {
    authState: selectAuthState(state),
    adminUserState: selectAdminUserState(state)
  }
}

const mapDispatchToProps = (dispatch: Dispatch): any => ({
  fetchUserRole: bindActionCreators(fetchUserRole, dispatch),
  patchUser: bindActionCreators(patchUser, dispatch),
  updateUserRole: bindActionCreators(updateUserRole, dispatch),
  fetchSingleUserAdmin: bindActionCreators(fetchSingleUserAdmin, dispatch),
  fetchStaticResource: bindActionCreators(fetchStaticResource, dispatch)
})

const Alert = (props) => {
  return <MuiAlert elevation={6} variant="filled" {...props} />
}

const ViewUser = (props: Props) => {
  const classx = useStyle()
  const classes = useStyles()
  const {
    openView,
    closeViewModel,
    fetchUserRole,
    authState,
    userAdmin,
    patchUser,
    updateUserRole,
    fetchSingleUserAdmin,
    adminUserState,
    fetchStaticResource
  } = props
  const [openDialog, setOpenDialog] = React.useState(false)
  const [status, setStatus] = React.useState('')
  const [editMode, setEditMode] = React.useState(false)
  const [refetch, setRefetch] = React.useState(false)
  const [state, setState] = React.useState({
    name: '',
    avatar: '',
    formErrors: {
      name: '',
      avatar: ''
    }
  })
  const [error, setError] = React.useState('')
  const [openWarning, setOpenWarning] = React.useState(false)
  const user = authState.get('user')
  const userRole = adminUserState.get('userRole')
  const userRoleData = userRole ? userRole.get('userRole') : []
  const singleUser = adminUserState.get('singleUser')
  const singleUserData = adminUserState.get('singleUser').get('singleUser')
  const staticResource = adminUserState.get('staticResource')
  const staticResourceData = staticResource.get('staticResource')

  const handleClick = () => {
    setOpenDialog(true)
  }
  const handleCloseDialog = () => {
    setOpenDialog(false)
  }

  React.useEffect(() => {
    const fetchData = async () => {
      await fetchUserRole()
    }
    if (adminUserState.get('users').get('updateNeeded') === true && user.id) fetchData()
    if ((user.id && singleUser.get('updateNeeded') == true) || refetch) {
      fetchSingleUserAdmin(userAdmin.id)
      setRefetch(false)
    }
    if (user.id && staticResource.get('updateNeeded')) {
      fetchStaticResource()
    }
  }, [adminUserState, user, refetch])

  React.useEffect(() => {
    if (!refetch) {
      setRefetch(true)
    }
  }, [userAdmin.id])

  React.useEffect(() => {
    if (singleUserData) {
      setState({
        ...state,
        name: userAdmin.name || '',
        avatar: userAdmin.avatarId || ''
      })
    }
  }, [singleUserData])
  const defaultProps = {
    options: userRoleData,
    getOptionLabel: (option: any) => option.role
  }

  const patchUserRole = async (user: any, role: string) => {
    await updateUserRole(user, role)
    handleCloseDialog()
    setRefetch(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    let temp = state.formErrors
    switch (name) {
      case 'name':
        temp.name = value.length < 2 ? 'Name is required!' : ''
        break
      case 'avatar':
        temp.avatar = value.length < 2 ? 'Avatar is required!' : ''
        break
      default:
        break
    }
    setState({ ...state, [name]: value, formErrors: temp })
  }

  const handleSubmit = () => {
    const data = {
      name: state.name,
      avatarId: state.avatar
    }

    let temp = state.formErrors
    if (!state.name) {
      temp.name = "Name can't be empty"
    }
    if (!state.avatar) {
      temp.avatar = "Avatar can't be empty"
    }
    setState({ ...state, formErrors: temp })
    if (formValid(state, state.formErrors)) {
      patchUser(userAdmin.id, data)
      setState({
        ...state,
        name: '',
        avatar: ''
      })
      setEditMode(false)
      closeViewModel(false)
    } else {
      setError('Please fill all required field')
      setOpenWarning(true)
    }
  }

  const handleCloseWarning = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setOpenWarning(false)
  }

  const handleCloseDrawe = () => {
    setError('')
    setOpenWarning(false)
    closeViewModel(false)
    setState({
      ...state,
      formErrors: {
        ...state.formErrors,
        name: '',
        avatar: ''
      }
    })
  }

  return (
    <React.Fragment>
      <Drawer anchor="right" open={openView} onClose={() => handleCloseDrawe()} classes={{ paper: classx.paper }}>
        {userAdmin && (
          <Paper elevation={3} className={classes.paperHeight}>
            <Container maxWidth="sm">
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Avatar className={classes.large}>
                    {!userAdmin.avatarId ? (
                      <Skeleton animation="wave" variant="circle" width={40} height={40} />
                    ) : (
                      userAdmin.avatarId.charAt(0).toUpperCase()
                    )}
                  </Avatar>
                </Grid>
                <Grid item xs={8}>
                  <div className={classes.mt20}>
                    <Typography variant="h4" component="span">
                      {userAdmin.name}
                    </Typography>
                    <br />
                    {userAdmin.userRole ? (
                      <Chip label={singleUserData?.userRole} onDelete={handleClick} deleteIcon={<Edit />} />
                    ) : (
                      <Chip label="None" onDelete={handleClick} deleteIcon={<Edit />} />
                    )}
                  </div>
                </Grid>
              </Grid>
            </Container>

            <Dialog
              open={openDialog}
              onClose={handleCloseDialog}
              aria-labelledby="form-dialog-title"
              classes={{ paper: classx.paperDialog }}
            >
              <DialogTitle id="form-dialog-title">Do you really want to change role for {userAdmin.name}? </DialogTitle>
              <DialogContent>
                <DialogContentText>
                  In order to change role for {userAdmin.name} search from the list or select user role and submit.
                </DialogContentText>
                <Autocomplete
                  onChange={(e, newValue) => {
                    if (newValue) {
                      setStatus(newValue.role as string)
                    } else {
                      setStatus('')
                    }
                  }}
                  {...defaultProps}
                  id="debug"
                  debug
                  renderInput={(params) => <TextField {...params} label="User Role" />}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog} color="primary">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    patchUserRole(userAdmin.id, status)
                  }}
                  color="primary"
                >
                  Submit
                </Button>
              </DialogActions>
            </Dialog>
          </Paper>
        )}
        <Container maxWidth="sm">
          {editMode ? (
            <div className={classes.mt10}>
              <Typography variant="h4" component="h4" className={classes.mb10}>
                {' '}
                Update personal Information{' '}
              </Typography>
              <label>Name</label>
              <Paper
                component="div"
                className={state.formErrors.name.length > 0 ? classes.redBorder : classes.createInput}
              >
                <InputBase
                  className={classes.input}
                  name="name"
                  placeholder="Enter name"
                  style={{ color: '#fff' }}
                  autoComplete="off"
                  value={state.name}
                  onChange={handleInputChange}
                />
              </Paper>
              <label>Avatar</label>
              <Paper
                component="div"
                className={state.formErrors.avatar.length > 0 ? classes.redBorder : classes.createInput}
              >
                <FormControl fullWidth>
                  <Select
                    labelId="demo-controlled-open-select-label"
                    id="demo-controlled-open-select"
                    value={state.avatar}
                    fullWidth
                    displayEmpty
                    onChange={handleInputChange}
                    className={classes.select}
                    name="avatar"
                    MenuProps={{ classes: { paper: classx.selectPaper } }}
                  >
                    <MenuItem value="" disabled>
                      <em>Select avatar</em>
                    </MenuItem>
                    {staticResourceData.map((el) => (
                      <MenuItem value={el.name} key={el.id}>
                        {el.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Paper>
            </div>
          ) : (
            <Grid container spacing={3} className={classes.mt10}>
              <Typography variant="h4" component="h4" className={classes.mb20px}>
                Personal Information{' '}
              </Typography>
              <Grid item xs={6}>
                <Typography variant="h5" component="h5" className={classes.mb10}>
                  Location:
                </Typography>
                <Typography variant="h5" component="h5" className={classes.mb10}>
                  Avatar:
                </Typography>
                <Typography variant="h5" component="h5" className={classes.mb10}>
                  Invite Code:
                </Typography>
                <Typography variant="h5" component="h5" className={classes.mb10}>
                  Instance:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" component="h6" className={classes.mb10}>
                  {userAdmin?.party?.location?.name || <span className={classx.spanNone}>None</span>}
                </Typography>
                <Typography variant="h6" component="h6" className={classes.mb10}>
                  {userAdmin?.avatarId || <span className={classx.spanNone}>None</span>}
                </Typography>
                <Typography variant="h6" component="h6" className={classes.mb10}>
                  {userAdmin?.inviteCode || <span className={classx.spanNone}>None</span>}
                </Typography>
                <Typography variant="h6" component="h6" className={classes.mb10}>
                  {userAdmin?.party?.instance?.ipAddress || <span className={classx.spanNone}>None</span>}
                </Typography>
              </Grid>
            </Grid>
          )}
          <DialogActions className={classes.mb10}>
            {editMode ? (
              <div>
                <Button onClick={handleSubmit} className={classx.saveBtn}>
                  <span style={{ marginRight: '15px' }}>
                    <Save />
                  </span>{' '}
                  Submit
                </Button>
                <Button
                  className={classx.saveBtn}
                  onClick={() => {
                    setEditMode(false)
                  }}
                >
                  CANCEL
                </Button>
              </div>
            ) : (
              <div>
                <Button
                  className={classx.saveBtn}
                  onClick={() => {
                    setEditMode(true)
                  }}
                >
                  EDIT
                </Button>
                <Button onClick={() => handleCloseDrawe()} className={classx.saveBtn}>
                  CANCEL
                </Button>
              </div>
            )}
          </DialogActions>
        </Container>
        <Snackbar
          open={openWarning}
          autoHideDuration={6000}
          onClose={handleCloseWarning}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseWarning} severity="warning">
            {' '}
            {error}{' '}
          </Alert>
        </Snackbar>
      </Drawer>
    </React.Fragment>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(ViewUser)
