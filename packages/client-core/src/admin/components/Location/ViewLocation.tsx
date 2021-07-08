import React from 'react';
import { useTranslation } from 'react-i18next';
import Drawer from "@material-ui/core/Drawer";
import { useStyle, useStyles } from "./styles";
import Paper from '@material-ui/core/Paper';
import Container from '@material-ui/core/Container';
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip"
import Avatar from "@material-ui/core/Avatar"
import Grid from "@material-ui/core/Grid"
import DialogActions from '@material-ui/core/DialogActions';
import Button from "@material-ui/core/Button"
import InputBase from "@material-ui/core/InputBase";
import { Edit, Save } from "@material-ui/icons";
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import { selectAdminSceneState } from "../../reducers/admin/scene/selector";
import { connect } from 'react-redux';
import { selectAdminLocationState } from "../../reducers/admin/location/selector";

interface Props {
    openView: any;
    closeViewModel: any;
    locationAdmin: any;
    adminSceneState: any;
    adminLocationState: any;
}

const mapStateToProps = (state: any): any => {
    return {
        adminSceneState: selectAdminSceneState(state),
        adminLocationState: selectAdminLocationState(state),
    }
}

const ViewLocation = (props: Props) => {
    const { openView, closeViewModel, adminSceneState, adminLocationState, locationAdmin } = props;
    const classex = useStyle();
    const classes = useStyles();
    const [editMode, setEditMode] = React.useState(false)
    const [state, setState] = React.useState({
        name: "",
        maxUsers: 10,
        scene: "",
        type: "private",
        videoEnabled: false,
        globalMediaEnabled: false,
        isLobby: false,
        isFeatured: false,
        formErrors: {
            name: "",
            maxUsers: "",
            scene: "",
            type: "",
        }
    });
    const [location, setLocation] = React.useState<any>("");
    const { t } = useTranslation();
    const adminScenes = adminSceneState.get('scenes').get('scenes');
    const locationTypes = adminLocationState.get('locationTypes').get('locationTypes');

    React.useEffect(() => {
        if (locationAdmin) {
            setLocation(locationAdmin);
        }
    }, [locationAdmin]);
    console.log('====================================');
    console.log(location);
    console.log('====================================');
    return (
        <React.Fragment>
            <Drawer
                anchor="right"
                open={openView}
                onClose={closeViewModel(false)}
                classes={{ paper: classex.paper }}
            >
                <Paper elevation={0} className={classes.rootPaper} >
                    <Container maxWidth="sm">
                        <div className={classes.locationTitle}>
                            <Typography variant="h4" component="span" >{location?.name}</Typography>
                        </div>
                        <div className={classes.locationSubTitle}>
                            {
                                location.isFeatured &&
                                <Chip
                                    style={{ marginLeft: "5px" }}
                                    avatar={<Avatar>F</Avatar>}
                                    label={t('admin:components.index.featured')}
                                //  onClick={handleClick}
                                />
                            }
                            {
                                location.isLobby &&
                                <Chip
                                    avatar={<Avatar>L</Avatar>}
                                    label={t('admin:components.index.lobby')}
                                />
                            }
                            {/* <Paper className={classes.smpd} elevation={0}>
                        <Typography variant="h6" component="span" >{location.createdAt ? `Created At: ${location.createdAt.slice(0, 10)}`:""}</Typography>
                        </Paper> */}
                        </div>
                    </Container>
                </Paper>

                {editMode ? <Container maxWidth="sm">
                    <div className={classes.mt10}>
                        <Typography variant="h4" component="h4" className={classes.mb10}> Update location Information  </Typography>
                        <label>Name</label>
                        <Paper component="div" className={state.formErrors.name.length > 0 ? classes.redBorder : classes.createInput}>
                            <InputBase
                                className={classes.input}
                                name="name"
                                placeholder="Enter name"
                                style={{ color: "#fff" }}
                                autoComplete="off"
                                value={state.name}
                            // onChange={handleInputChange}
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
                                style={{ color: "#fff" }}
                                autoComplete="off"
                                type="number"
                                value={state.maxUsers}
                            // onChange={handleChange}
                            />
                        </Paper>

                        <label>Scene</label>
                        <Paper component="div" className={state.formErrors.scene.length > 0 ? classes.redBorder : classes.createInput}>
                            <FormControl fullWidth>
                                <Select
                                    labelId="demo-controlled-open-select-label"
                                    id="demo-controlled-open-select"
                                    value={state.scene}
                                    fullWidth
                                    displayEmpty
                                    //onChange={handleChange}
                                    className={classes.select}
                                    name="scene"
                                    MenuProps={{ classes: { paper: classex.selectPaper } }}
                                >
                                    <MenuItem value="" disabled>
                                        <em>Select scene</em>
                                    </MenuItem>
                                    {
                                        adminScenes.map(el => <MenuItem value={el.sid} key={el.sid}>{`${el.name} (${el.sid})`}</MenuItem>)
                                    }
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
                                   // onChange={handleChange}
                                    className={classes.select}
                                    name="type"
                                    MenuProps={{ classes: { paper: classex.selectPaper } }}
                                >
                                    <MenuItem value="" disabled>
                                        <em>Select type</em>
                                    </MenuItem>
                                    {
                                        locationTypes.map(el => <MenuItem value={el.type} key={el.type}>{el.type}</MenuItem>)
                                    }
                                </Select>
                            </FormControl>
                        </Paper>

                    </div>

                </Container>
                    :
                    <React.Fragment> <Paper elevation={3} className={classes.middlePaper}>
                        <Grid container spacing={2} className={classes.pdl}>
                            <Grid item xs={6} className={classes.typo}>
                                <Typography variant="h5" component="h5" className={`${classes.locationOtherInfo} ${classes.mb}`}>Max Users</Typography>
                                <Typography variant="h5" component="h5" className={`${classes.locationOtherInfo} ${classes.mb}`}>Scene ID</Typography>
                                <Typography variant="h5" component="h5" className={classes.locationOtherInfo}>Slugy Name</Typography>
                            </Grid>
                            <Grid item xs={6} className={classes.typo}>
                                <Typography variant="h6" component="h5" className={`${classes.locationOtherInfo} ${classes.mb}`} >{(location as any)?.maxUsersPerInstance || <span className={classes.spanNone}>None</span>}</Typography>
                                <Typography variant="h5" component="h5" className={`${classes.locationOtherInfo} ${classes.mb}`}>{location?.sceneId || <span className={classes.spanNone}>None</span>}</Typography>
                                <Typography variant="h5" component="h5" className={`${classes.locationOtherInfo}`}>{location?.slugifiedName || <span className={classes.spanNone}>None</span>}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                        <Typography variant="h4" component="h4" className={`${classes.mb20px} ${classes.spacing}`}>Location Settings  </Typography>
                        <Grid container spacing={2} className={classes.pdlarge}>
                            <Grid item xs={6}>
                                <Typography variant="h5" component="h5" className={classes.mb10}>Location Type:</Typography>
                                {/* <Typography variant="h5" component="h5" className={classes.mb10}>Updated At:</Typography> */}
                                <Typography variant="h5" component="h5" className={classes.mb10}>Video Enabled</Typography>
                                <Typography variant="h5" component="h5" className={classes.mb10}>Media Chat Enabled</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="h6" component="h6" className={classes.mb10} >{location?.location_setting?.locationType || <span className={classes.spanNone}>None</span>}</Typography>
                                {/* <Typography variant="h6" component="h6" className={classes.mb10}>{location?.location_setting?.updatedAt.slice(0,10) || <span className={classes.spanNone}>None</span>}</Typography> */}
                                <Typography variant="h6" component="h6" className={classes.mb10}><span className={classes.spanNone}>{location?.location_setting?.videoEnabled ? "Yes" : "No"}</span></Typography>
                                <Typography variant="h6" component="h6" className={classes.mb10}><span className={classes.spanNone}>{location?.location_setting?.instanceMediaChatEnabled ? "Yes" : "No"}</span></Typography>
                            </Grid>
                        </Grid>
                    </React.Fragment>
                }
                <DialogActions className={classes.mb10}>
                    {
                        editMode ?
                            <div>
                                <Button
                                    // onClick={handleSubmit}
                                    className={classes.saveBtn}
                                >
                                    <span style={{ marginRight: "15px" }}><Save /></span> Submit
                                </Button>
                                <Button
                                    className={classes.saveBtn}
                                    onClick={() => {
                                        setEditMode(false);
                                    }}
                                >
                                    CANCEL
                                </Button>
                            </div>
                            :
                            <div>
                                <Button
                                    className={classes.saveBtn}
                                    onClick={() => {
                                        setEditMode(true);
                                    }}>
                                    EDIT
                                </Button>
                                <Button
                                    onClick={closeViewModel(false)}
                                    className={classes.saveBtn}
                                >
                                    CANCEL
                                </Button>
                            </div>
                    }
                </DialogActions>

            </Drawer>
        </React.Fragment>
    )
}

export default connect(mapStateToProps, null)(ViewLocation)