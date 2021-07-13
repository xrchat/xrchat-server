import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    createBtn: {
      height: '50px',
      margin: 'auto 5px',
      width: '100%',
      background: 'rgb(58, 65, 73)',
      color: '#f1f1f1 !important'
    },
    rootTable: {
      flexGrow: 1,
      width: '100%',
      backgroundColor: '#43484F',
      color: '#f1f1f1'
    },
    marginBottom: {
      marginBottom: '10px'
    },
    marginBottm: {
      marginBottom: '15px'
    },
    marginTp: {
      marginTop: '20%'
    },
    marginTpM: {
      marginTop: '10%'
    },
    createInput: {
      padding: '2px 4px',
      display: 'flex',
      alignItems: 'center',
      //width: "45vw",
      marginTop: '10px',
      marginBottom: '15px',
      background: '#343b41',
      border: '1px solid #23282c',
      color: '#f1f1f1 !important'
    },
    searchRoot: {
      padding: '2px 20px',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      background: '#343b41'
    },
    iconButton: {
      padding: 10,
      color: '#f1f1f1'
    },
    texAlign: {
      textAlign: 'center'
    },
    input: {
      marginLeft: theme.spacing(1),
      flex: 1,
      color: '#f1f1f1'
    },
    select: {
      color: '#f1f1f1 !important'
    },
    textLink: {
      marginLeft: '5px',
      textDecoration: 'none',
      color: '#ff9966'
    },
    container: {
      maxHeight: '80vh'
    },
    redBorder: {
      border: '1px solid red',
      padding: '2px 4px',
      display: 'flex',
      alignItems: 'center',
      //width: "45vw",
      marginTop: '10px',
      marginBottom: '15px',
      background: '#343b41',
      color: '#f1f1f1 !important'
    },
    paperDialog: {
      background: 'rgb(58, 65, 73) !important',
      color: '#f1f1f1'
    },
    spanDange: {
      color: '#FF8C00'
    },
    spanNone: {
      color: '#808080'
    },
    rootPaper: {
      height: '21vh',
      background: '#111',
      color: '#f1f1f1',
      backgroundColor: '#343b41'
    },
    locationTitle: {
      margin: '50px auto',
      width: '300px',
      textAlign: 'center'
    },
    locationSubTitle: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    mb: {
      marginBottom: '10px'
    },
    locationOtherInfo: {
      fontSize: '1.2rem'
    },
    typo: {
      lineHeight: '1rem'
    },
    mb10: {
      marginBottom: '5%'
    },
    mb20px: {
      marginBottom: '20px'
    },
    pdl: {
      paddingLeft: '1rem'
    },
    smpd: {
      padding: '2px'
    },
    spacing: {
      paddingLeft: '2.5rem',
      marginTop: '5%'
    },
    middlePaper: {
      color: '#f1f1f1',
      padding: '20px 0 0 20px',
      background: '#15171B',
      height: '10rem'
    },
    saveBtn: {
      marginLeft: 'auto',
      background: '#43484F !important',
      color: '#fff !important',
      width: '150px',
      marginRight: '25px',
      boxShadow:
        '0px 3px 1px -2px rgb(0 0 0 / 20%), 0px 2px 2px 0px rgb(0 0 0 / 14%), 0px 1px 5px 0px rgb(0 0 0 / 12%) !important'
    },
    btnContainer: {
      padding: '2rem'
    },
    pdlarge: {
      paddingLeft: '3rem'
    },
    mt10: {
      marginTop: '10%'
    }
  })
)

export const useStyle = makeStyles({
  paper: {
    width: '40%',
    backgroundColor: '#43484F',
    color: '#f1f1f1',
    overflow: 'hidden'
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
  spanWhite: {
    color: '#f1f1f1'
  },
  selectPaper: {
    background: '#343b41',
    color: '#f1f1f1'
  },
  saveBtn: {
    marginLeft: 'auto',
    background: '#43484F !important',
    color: '#fff !important',
    width: '150px',
    marginRight: '25px',
    boxShadow:
      '0px 3px 1px -2px rgb(0 0 0 / 20%), 0px 2px 2px 0px rgb(0 0 0 / 14%), 0px 1px 5px 0px rgb(0 0 0 / 12%) !important'
  },
  tableCellHeader: {
    background: '#343b41 !important',
    color: '#f1f1f1 !important',
    borderBottom: '2px solid #23282c !important'
  },
  tableCellBody: {
    borderBottom: '1px solid #23282c !important',
    color: '#f1f1f1 !important'
  },
  tableFooter: {
    background: '#343b41 !important',
    color: '#f1f1f1 !important'
  }
})
