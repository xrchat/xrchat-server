import { makeStyles, createStyles, Theme } from '@material-ui/core/styles'

export const useStyle = makeStyles({
  root: {
    width: '100%'
    //background: "#fff"
  },
  container: {
    maxHeight: '80vh'
  },
  actionStyle: {
    textDecoration: 'none',
    color: '#000',
    marginRight: '10px'
  },
  spanDange: {
    color: '#FF8C00'
  },
  spanNone: {
    color: '#808080'
  },
  marginBottm: {
    marginBottom: '15px'
  },
  textLink: {
    marginLeft: '5px',
    textDecoration: 'none',
    color: '#ff9966'
  },
  marginTop: {
    marginTop: '30px'
  },
  spanWhite: {
    color: '#f1f1f1'
  }
})

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tableCellHeader: {
      background: '#343b41 !important',
      color: '#f1f1f1 !important',
      borderBottom: '2px solid #23282c !important'
    },
    tableCellBody: {
      borderBottom: '1px solid #23282c !important',
      color: '#f1f1f1 !important'
    },
    rootTable: {
      flexGrow: 1,
      width: '100%',
      backgroundColor: '#43484F',
      color: '#f1f1f1'
    },
    tableFooter: {
      background: '#343b41 !important',
      color: '#f1f1f1 !important'
    },
    searchRoot: {
      padding: '2px 20px',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      background: '#343b41'
    },
    input: {
      marginLeft: theme.spacing(1),
      flex: 1,
      color: '#f1f1f1'
    },
    iconButton: {
      padding: 10,
      color: '#f1f1f1'
    },
    createBtn: {
      height: '50px',
      margin: 'auto 5px',
      width: '100%',
      background: 'rgb(58, 65, 73)',
      color: '#f1f1f1 !important'
    }
  })
)
