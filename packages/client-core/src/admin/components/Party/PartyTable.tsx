import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import { fetchAdminParty } from "../../reducers/admin/party/service";
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { selectAuthState } from '../../../user/reducers/auth/selector';
import { selectAdminState } from "../../reducers/admin/selector";
import { PropsTable, columns, Data } from "./variables";
import { useStyle, useStyles } from "./style";
import { selectAdminPartyState } from "../../reducers/admin/party/selector";

const mapDispatchToProps = (dispatch: Dispatch): any => ({
  fetchAdminParty: bindActionCreators(fetchAdminParty, dispatch)
})

const mapStateToProps = (state: any): any => {
  return {
    adminState: selectAdminState(state),
    authState: selectAuthState(state),
    adminPartyState: selectAdminPartyState(state)
  }
}

const PartyTable = (props: PropsTable) => {
    const classes = useStyle();
    const classex = useStyles();
    const {
        fetchAdminParty,
        authState,
        adminPartyState
    } = props;

    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(12);

  const user = authState.get('user')
  const adminParty = adminPartyState.get('parties')
  const adminPartyData = adminParty.get('parties').data ? adminParty.get('parties').data : []

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

    React.useEffect(() => {
        if (user.id && adminParty.get('updateNeeded') === true) {
            fetchAdminParty();
        }
    }, [authState, adminPartyState]);

    const createData = (id: string, instance: string, location: string): Data => {
        return {
            id,
            instance,
            location,
            action: (
                <>
                    <a href="#h" className={classes.actionStyle}> <span className={classes.spanWhite}>View</span> </a>
                    <a href="#h" className={classes.actionStyle}><span className={classes.spanDange}>Delete</span></a>
                </>
            )
        };
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(+event.target.value)
      setPage(0)
    }

    const rows = adminPartyData.map(el => createData(el.id, el.instance.ipAddress || <span className={classes.spanNone}>None</span>, el.location.name || <span className={classes.spanNone}>None</span>));

    return (
        <div className={classes.root}>
            <TableContainer className={classes.container}>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <TableRow>
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
                        {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
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
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                className={classex.tableFooter}
            />
        </div>
    );
};

export default connect(mapStateToProps, mapDispatchToProps)(PartyTable)
