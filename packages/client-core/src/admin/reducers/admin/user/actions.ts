import { User } from '@xrengine/common/src/interfaces/User'
import {
  USER_ADMIN_REMOVED,
  USER_ADMIN_CREATED,
  USER_ADMIN_PATCHED,
  USER_SEARCH_ADMIN,
  SINGLE_USER_ADMIN_LOADED,
  ADMIN_LOADED_USERS,
  STATIC_RESOURCE_RETRIEVED
} from '../../actions'

import {
  USER_ROLE_RETRIEVED,
  USER_ROLE_CREATED,
  USER_ROLE_UPDATED
} from '@xrengine/client-core/src/world/reducers/actions'

export interface userRoleRetrievedResponse {
  type: string
  types: any[]
}
export interface userAdminRemovedResponse {
  type: string
  data: any
}
export interface UserCreatedAction {
  type: string
  user: User
}
export interface LoadedUsersAction {
  type: string
  users: User[]
}

export interface fetchedStaticResourceAction {
  type: string
  staticResource: any[]
}

export function loadedUsers(users: User[]): LoadedUsersAction {
  return {
    type: ADMIN_LOADED_USERS,
    users
  }
}
export function userCreated(user: User): UserCreatedAction {
  return {
    type: USER_ADMIN_CREATED,
    user: user
  }
}

export function userPatched(user: User): UserCreatedAction {
  return {
    type: USER_ADMIN_PATCHED,
    user: user
  }
}
export const userRoleRetrieved = (data: any): userRoleRetrievedResponse => {
  return {
    type: USER_ROLE_RETRIEVED,
    types: data
  }
}

export const userRoleCreated = (data: any): userRoleRetrievedResponse => {
  return {
    type: USER_ROLE_CREATED,
    types: data
  }
}

export const userAdminRemoved = (data): userAdminRemovedResponse => {
  return {
    type: USER_ADMIN_REMOVED,
    data: data
  }
}

export const userRoleUpdated = (data: any): any => {
  return {
    type: USER_ROLE_UPDATED,
    data: data
  }
}

export const searchedUser = (data: any): any => {
  return {
    type: USER_SEARCH_ADMIN,
    data: data
  }
}

export const fetchedSIngleUser = (data: any): any => {
  return {
    type: SINGLE_USER_ADMIN_LOADED,
    data: data
  }
}

export const fetchedStaticResource = (data: any): fetchedStaticResourceAction => {
  return {
    type: STATIC_RESOURCE_RETRIEVED,
    staticResource: data
  }
}
