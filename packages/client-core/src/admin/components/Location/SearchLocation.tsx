import React from 'react'
import IconButton from '@material-ui/core/IconButton'
import InputBase from '@material-ui/core/InputBase'
import Paper from '@material-ui/core/Paper'
import MenuIcon from '@material-ui/icons/Menu'
import SearchIcon from '@material-ui/icons/Search'
import { useStyles } from './styles'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'

interface Props {
  searchUserAction?: any
}

const mapDispatchToProps = (dispatch: Dispatch): any => ({})

const SearchLocation = (props: Props) => {
  const { searchUserAction } = props
  const classes = useStyles()
  const [search, setSearch] = React.useState('')
  //    const handleChange = (e: any) => {
  //      searchUserAction(search);
  //      setSearch(e.target.value);
  //    };

  return (
    <Paper component="form" className={classes.searchRoot}>
      <InputBase
        className={classes.input}
        placeholder={`Search for location`}
        inputProps={{ 'aria-label': 'search for location ' }}
        //onChange={handleChange}
      />
      <IconButton type="submit" className={classes.iconButton} aria-label="search">
        <SearchIcon />
      </IconButton>
    </Paper>
  )
}

export default connect(null, mapDispatchToProps)(SearchLocation)
