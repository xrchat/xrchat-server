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
import Button from "@material-ui/core/Button"
import DialogActions from "@material-ui/core/DialogActions"

interface Props {
    openView: any;
    closeViewModel: any;
    locationAdmin: any;
}

const ViewLocation = (props: Props) => {
    const { openView, closeViewModel, locationAdmin } = props;
    const classex = useStyle();
    const classes = useStyles();
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
    const [location, setLocation] = React.useState("");
    const { t } = useTranslation();

    React.useEffect(()=>{
        if(locationAdmin){
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

                <Paper elevation={3} className={classes.middlePaper}>
                    <Grid container spacing={2} className={classes.pdl}>
                        <Grid item xs={6}>
                            <Typography variant="h5" component="h5" className={classes.locationOtherInfo}>Max Users</Typography>
                            <Typography variant="h5" component="h5" className={classes.locationOtherInfo}>Scene ID</Typography>
                            <Typography variant="h5" component="h5" className={classes.locationOtherInfo}>Slugy Name</Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="h6" component="h5" className={classes.locationOtherInfo} >{(location as any)?.maxUsersPerInstance || <span className={classes.spanNone}>None</span>}</Typography>
                            <Typography variant="h5" component="h5" className={classes.locationOtherInfo}>{location?.sceneId|| <span className={classes.spanNone}>None</span>}</Typography>
                            <Typography variant="h5" component="h5" className={classes.locationOtherInfo}>{location?.slugifiedName|| <span className={classes.spanNone}>None</span>}</Typography>
                        </Grid>
                    </Grid>
                </Paper>
                <Typography variant="h4" component="h4" className={`${classes.mb20px} ${classes.spacing}`}>Location Settings  </Typography>
                <Grid container spacing={2} className={classes.pdl}>
                    <Grid item xs={6}>
                        <Typography variant="h5" component="h5" className={classes.mb10}>Location Type:</Typography>
                        <Typography variant="h5" component="h5" className={classes.mb10}>Updated At:</Typography>
                        <Typography variant="h5" component="h5" className={classes.mb10}>Video Enabled</Typography>
                        <Typography variant="h5" component="h5" className={classes.mb10}>Media Chat Enabled</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="h6" component="h6" className={classes.mb10} >{location?.location_setting?.locationType || <span className={classes.spanNone}>None</span>}</Typography>
                        <Typography variant="h6" component="h6" className={classes.mb10}>{location?.location_setting?.updatedAt.slice(0,10) || <span className={classes.spanNone}>None</span>}</Typography>
                        <Typography variant="h6" component="h6" className={classes.mb10}><span className={classes.spanNone}>{location?.location_setting?.videoEnabled ?"Yes" : "No"}</span></Typography>
                        <Typography variant="h6" component="h6" className={classes.mb10}><span className={classes.spanNone}>{location?.location_setting?.instanceMediaChatEnabled ?"Yes" : "No"}</span></Typography>
                    </Grid>
                </Grid>

                <div className={classes.btnContainer}>
                    <Button className={classes.saveBtn}>EDIT</Button>
                    <Button className={classes.saveBtn}>CANCEL</Button>
                </div>
            </Drawer>
        </React.Fragment>
    )
}

export default ViewLocation;