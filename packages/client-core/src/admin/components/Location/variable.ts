export interface Column {
  id:
    | 'name'
    | 'sceneId'
    | 'maxUsersPerInstance'
    | 'scene'
    | 'type'
    | 'tags'
    | 'instanceMediaChatEnabled'
    | 'videoEnabled'
    | 'action'
  label: string
  minWidth?: number
  align?: 'right' | 'center'
}

export const columns: Column[] = [
  { id: 'name', label: 'Name', minWidth: 170 },
  { id: 'sceneId', label: 'SceneId', minWidth: 100 },
  {
    id: 'maxUsersPerInstance',
    label: 'Max Users Per Instance',
    minWidth: 170,
    align: 'center'
  },
  {
    id: 'scene',
    label: 'Scene',
    minWidth: 170,
    align: 'center'
  },
  {
    id: 'type',
    label: 'Type',
    minWidth: 170,
    align: 'right'
  },
  {
    id: 'tags',
    label: 'Tags',
    minWidth: 170,
    align: 'center'
  },
  {
    id: 'instanceMediaChatEnabled',
    label: 'Instance Media Chat Enabled',
    minWidth: 170,
    align: 'center'
  },
  {
    id: 'videoEnabled',
    label: 'Video Enabled',
    minWidth: 170,
    align: 'center'
  },
  {
    id: 'action',
    label: 'Action',
    minWidth: 170,
    align: 'right'
  }
]

export interface Data {
  id: string
  user: any
  name: string
  avatar: string
  status: string
  location: string
  inviteCode: string
  instanceId: string
  action: any
}

export interface Props {
  adminState?: any
  authState?: any
  locationState?: any
  fetchAdminLocations?: any
  fetchAdminScenes?: any
  fetchLocationTypes?: any
  fetchUsersAsAdmin?: any
  fetchAdminInstances?: any
  adminLocationState?: any
  adminUserState?: any
  adminInstanceState?: any
  adminSceneState?: any
  removeLocation?: any
}
