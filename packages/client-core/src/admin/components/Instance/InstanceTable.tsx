import React from 'react'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TablePagination from '@material-ui/core/TablePagination'
import TableRow from '@material-ui/core/TableRow'
import { selectAuthState } from '../../../user/reducers/auth/selector'
import { selectAdminState } from '../../reducers/admin/selector'
import { fetchAdminInstances, removeInstance } from '../../reducers/admin/instance/service'
import { bindActionCreators, Dispatch } from 'redux'
import { connect } from 'react-redux'
import { columns, Data } from './variables'
import { selectAdminInstanceState } from '../../reducers/admin/instance/selector'
import { useStyle, useStyles } from './styles'

interface Props {
  adminState?: any
  authState?: any
  fetchAdminState?: any
  fetchAdminInstances?: any
  adminInstanceState?: any
}

const mapStateToProps = (state: any): any => {
  return {
    authState: selectAuthState(state),
    adminState: selectAdminState(state),
    adminInstanceState: selectAdminInstanceState(state)
  }
}

const mapDispatchToProps = (dispatch: Dispatch): any => ({
  fetchAdminInstances: bindActionCreators(fetchAdminInstances, dispatch)
})

/**
 * JSX used to display table of instance
 *
 * @param props
 * @returns DOM Element
 * @author KIMENYI Kevin
 */
const InstanceTable = (props: Props) => {
  const { fetchAdminInstances, authState, adminInstanceState } = props
  const classes = useStyle()
  const classex = useStyles()
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(12)

  const user = authState.get('user')
  const adminInstances = adminInstanceState.get('instances')
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value)
    setPage(0)
  }

  React.useEffect(() => {
    if (user.id && adminInstances.get('updateNeeded')) {
      fetchAdminInstances()
    }
  }, [user, adminInstanceState])

  const createData = (
    id: string,
    ipAddress: string,
    currentUsers: Number,
    locationId: any,
    channelId: string
  ): Data => {
    return {
      id,
      ipAddress,
      currentUsers,
      locationId: locationId.name || '',
      channelId,
      action: (
        <>
          <a href="#h" className={classes.actionStyle}>
            {' '}
            <span className={classes.spanDange}>Delete</span>{' '}
          </a>
        </>
      )
    }
  }

  const rows = adminInstances
    .get('instances')
    .map((el: any) => createData(el.id, el.ipAddress, el.currentUsers, el.location, el.channelId || ''))

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
                    const value = row[column.id]
                    return (
                      <TableCell key={column.id} align={column.align} className={classex.tableCellBody}>
                        {value}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
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
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        className={classex.tableFooter}
      />
    </div>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(InstanceTable)
