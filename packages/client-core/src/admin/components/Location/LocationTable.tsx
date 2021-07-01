import React, { ReactElement, useEffect } from "react";
import {
    fetchAdminLocations,
    fetchLocationTypes
} from "../../reducers/admin/location/service";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { useStyles, useStyle } from "./styles";
import { bindActionCreators, Dispatch } from 'redux';
import { selectAuthState } from '../../../user/reducers/auth/selector';
import { selectAppState } from '../../../common/reducers/app/selector';
import { selectAdminLocationState } from "../../reducers/admin/location/selector";
import { selectAdminInstanceState } from "../../reducers/admin/instance/selector";
import { selectAdminUserState } from '../../reducers/admin/user/selector';
import { fetchAdminScenes } from '../../reducers/admin/scene/service';
import { selectAdminSceneState } from "../../reducers/admin/scene/selector";
import { fetchUsersAsAdmin } from '../../reducers/admin/user/service';
import { fetchAdminInstances } from '../../reducers/admin/instance/service';
import { connect } from "react-redux";
import { useTranslation } from 'react-i18next';
import { columns, Props } from "./variable";
import Chip from '@material-ui/core/Chip';
import Avatar from '@material-ui/core/Avatar';
import TablePagination from '@material-ui/core/TablePagination';


const mapStateToProps = (state: any): any => {
    return {
        appState: selectAppState(state),
        authState: selectAuthState(state),
        adminLocationState: selectAdminLocationState(state),
        adminUserState: selectAdminUserState(state),
        adminInstanceState: selectAdminInstanceState(state),
        adminSceneState: selectAdminSceneState(state)
    };
};

const mapDispatchToProps = (dispatch: Dispatch): any => ({
    fetchAdminLocations: bindActionCreators(fetchAdminLocations, dispatch),
    fetchAdminScenes: bindActionCreators(fetchAdminScenes, dispatch),
    fetchLocationTypes: bindActionCreators(fetchLocationTypes, dispatch),
    fetchUsersAsAdmin: bindActionCreators(fetchUsersAsAdmin, dispatch),
    fetchAdminInstances: bindActionCreators(fetchAdminInstances, dispatch)
});

const LocationTable = (props: Props) => {
    const classes = useStyles();
    const classex = useStyle();
    const {
        authState,
        fetchAdminLocations,
        fetchAdminScenes,
        fetchLocationTypes,
        fetchUsersAsAdmin,
        fetchAdminInstances,
        adminLocationState,
        adminUserState,
        adminInstanceState,
        adminSceneState
    } = props;
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(12);
    const user = authState.get('user');
    const adminLocations = adminLocationState.get('locations').get('locations');
    const adminLocationCount = adminLocationState.get('locations').get('total');
    const adminUsers = adminUserState.get('users').get('users');
    const adminUserCount = adminUserState.get('users').get('total');
    const adminInstances = adminInstanceState.get('instances').get('instances');
    const adminInstanceCount = adminInstanceState.get('instances').get('total');
    const { t } = useTranslation();

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };


    useEffect(() => {
        if (user?.id != null && adminLocationState.get('locations').get('updateNeeded') === true) {
            fetchAdminLocations();
        }
        if (user?.id != null && adminSceneState.get('scenes').get('updateNeeded') === true) {
            fetchAdminScenes();
        }
        if (user?.id != null && adminLocationState.get('locationTypes').get('updateNeeded') === true) {
            fetchLocationTypes();
        }
        if (user?.id != null && adminUserState.get('users').get('updateNeeded') === true) {
            fetchUsersAsAdmin();
        }
        if (user?.id != null && adminInstanceState.get('instances').get('updateNeeded') === true) {
            fetchAdminInstances();
        }
    }, [authState, adminSceneState, adminInstanceState, adminLocationState]);


    const createData = (id: string, name: string, sceneId: string, maxUsersPerInstance: string, type: string, tags: any, instanceMediaChatEnabled: ReactElement<any, any>, videoEnabled: ReactElement<any, any>) => {
        return {
            id,
            name,
            sceneId,
            maxUsersPerInstance,
            type,
            tags,
            instanceMediaChatEnabled,
            videoEnabled,
            action: (
                <>
                    <a href="#h" className={classex.actionStyle} ><span className={classex.spanWhite}>View</span></a>
                    <a href="#h" className={classex.actionStyle} > <span className={classex.spanDange}>Delete</span> </a>
                </>
            )
        };
    }


    const rows = adminLocations.map(el => {
        return createData(
            el.id, el.name,
            el.sceneId,
            el.maxUsersPerInstance,
            el.slugifiedName,
            (<div> {
                el.isFeatured &&
                <Chip
                    style={{ marginLeft: "5px" }}
                    avatar={<Avatar>F</Avatar>}
                    label={t('admin:components.index.featured')}
                //  onClick={handleClick}
                />
            }
                {
                    el.isLobby &&
                    <Chip
                        avatar={<Avatar>L</Avatar>}
                        label={t('admin:components.index.lobby')}
                    // onClick={handleClick}
                    />
                } </div>),
            (<div> {el.location_setting?.instanceMediaChatEnabled ? "Yes" : "No"} </div>),
            (<div> {el.videoEnabled ? "Yes" : "No"}</div>)
        )
    })

    return (
        <div>
            <TableContainer className={classes.container}>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <TableRow >
                            {columns.map((column) => (
                                <TableCell
                                    key={column.id}
                                    align={column.align}
                                    style={{ minWidth: column.minWidth }}
                                    className={classex.tableCellHeader}
                                >
                                    {column.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, id) => {
                            return (
                                <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                                    {columns.map((column) => {
                                        const value = row[column.id];
                                        return (
                                            <TableCell
                                                key={column.id}
                                                align={column.align}
                                                className={classex.tableCellBody}
                                            >
                                                {value}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[12]}
                component="div"
                count={12}
                rowsPerPage={rowsPerPage}
                page={page}
                onChangePage={handleChangePage}
                onChangeRowsPerPage={handleChangeRowsPerPage}
                className={classex.tableFooter}
            />
        </div>
    )
}

export default connect(mapStateToProps, mapDispatchToProps)(LocationTable);
