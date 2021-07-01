import React from 'react';
import Drawer from "@material-ui/core/Drawer";
import { useStyle, useStyles } from "./styles";

interface Props {
    openView: any;
    closeViewModel: any;
}

const ViewLocation = (props: Props) => {
    const { openView, closeViewModel } = props;
    const classex = useStyle();
    const classes = useStyles();
    return (
        <React.Fragment>
            <Drawer
                anchor="right"
                open={openView}
                onClose={closeViewModel(false)}
                classes={{ paper: classex.paper }}
            >
                <h1>Hello world!</h1>
            </Drawer>
        </React.Fragment>
    )
}

export default ViewLocation;