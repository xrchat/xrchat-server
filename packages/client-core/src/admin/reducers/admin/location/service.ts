import { Dispatch } from 'redux'
import {
  locationTypesRetrieved,
  locationsRetrieved,
  locationCreated,
  locationPatched,
  locationRemoved
} from './actions'
import { dispatchAlertError } from '../../../../common/reducers/alert/service'
import { client } from '../../../../feathers'

export function fetchLocationTypes() {
  return async (dispatch: Dispatch): Promise<any> => {
    const locationTypes = await client.service('location-type').find()
    dispatch(locationTypesRetrieved(locationTypes))
  }
}

export function patchLocation(id: string, location: any) {
  return async (dispatch: Dispatch): Promise<any> => {
    try {
      const result = await client.service('location').patch(id, location)
      dispatch(locationPatched(result))
    } catch (err) {
      console.error(err)
      dispatchAlertError(dispatch, err.message)
    }
  }
}

export function removeLocation(id: string) {
  return async (dispatch: Dispatch): Promise<any> => {
    const result = await client.service('location').remove(id)
    dispatch(locationRemoved(result))
  }
}

export function createLocation(location: any) {
  return async (dispatch: Dispatch): Promise<any> => {
    try {
      const result = await client.service('location').create(location)
      dispatch(locationCreated(result))
    } catch (err) {
      console.error(err.message)
      dispatchAlertError(dispatch, err.message)
    }
  }
}

export function fetchAdminLocations() {
  return async (dispatch: Dispatch, getState: any): Promise<any> => {
    const locations = await client.service('location').find({
      query: {
        $sort: {
          name: 1
        },
        $skip: getState().get('adminLocation').get('locations').get('skip'),
        $limit: getState().get('adminLocation').get('locations').get('limit'),
        adminnedLocations: true
      }
    })
    dispatch(locationsRetrieved(locations))
  }
}
