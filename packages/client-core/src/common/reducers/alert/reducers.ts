import Immutable from 'immutable'
import { SHOW_NOTIFICATION, HIDE_NOTIFICATION } from '../../../user/reducers/actions'
import { AlertState, AlertAction } from './actions'

export const initialAlertState: AlertState = {
  type: 'none',
  message: ''
}

const immutableState = Immutable.fromJS(initialAlertState)

const alertReducer = (state = immutableState, action: AlertAction): any => {
  switch (action.type) {
    case SHOW_NOTIFICATION:
      return state.set('type', action.alertType).set('message', action.message)
    case HIDE_NOTIFICATION:
      return state.set('type', action.alertType).set('message', action.message)
    default:
      break
  }
  return state
}

export default alertReducer
