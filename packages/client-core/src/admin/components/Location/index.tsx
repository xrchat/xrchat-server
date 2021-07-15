import React from 'react'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'
import Search from './SearchLocation'
import { useStyles } from './styles'
import LocationTable from './LocationTable'
import CreateLocation from './createLocation'

const Location = () => {
  const classes = useStyles()
  const [locationModelOpen, setLocationModelOpen] = React.useState(false)

  const openModalCreate = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return
    }
    setLocationModelOpen(open)
  }
  const closeViewModel = (open: boolean) => {
    setLocationModelOpen(open)
  }

  return (
    <div>
      <Grid container spacing={3} className={classes.marginBottom}>
        <Grid item xs={9}>
          <Search />
        </Grid>
        <Grid item xs={3}>
          <Button className={classes.createBtn} type="submit" variant="contained" onClick={openModalCreate(true)}>
            Create New Location
          </Button>
        </Grid>
      </Grid>
      <div className={classes.rootTable}>
        <LocationTable />
      </div>
      <CreateLocation open={locationModelOpen} handleClose={openModalCreate} closeViewModel={closeViewModel} />
    </div>
  )
}

export default Location
