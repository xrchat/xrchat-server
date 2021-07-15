import React from 'react'
import Scene from '../../components/Golf/golfLocation'

const LocationPage = (props) => {
  return <Scene locationName={props.match.params.locationName} history={props.history} />
}

export default LocationPage
