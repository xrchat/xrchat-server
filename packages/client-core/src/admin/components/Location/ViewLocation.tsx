import React from 'react';
import Drawer from "@material-ui/core/Drawer";
import { useStyle, useStyles } from "./styles";
import Paper from '@material-ui/core/Paper';
import Container from '@material-ui/core/Container';
import Typography from "@material-ui/core/Typography";

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
                        <div style={{ margin: "50px auto", width: "300px", border: "1px solid red", textAlign: "center"}}>
                        <Typography variant="h4" component="span" >{"Kimenyi kevin"}</Typography>
                        </div>
                    </Container>
                </Paper>
            </Drawer>
        </React.Fragment>
    )
}

export default ViewLocation;