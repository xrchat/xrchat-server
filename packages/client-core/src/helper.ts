export function validateEmail(email: string): boolean {
  return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)
}

export function validatePhoneNumber(phone: string): boolean {
  return /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(phone)
}

export class Config {
  static publicRuntimeConfig = {
    title: 'The Overlay',
    dev: false,
    loginDisabled: false,
    logo: './logo.svg',
    gameserverHost: 'localhost',
    gameserverPort: '3031',
    apiServer: 'https://api-dev.theoverlay.io',
    appServer: 'https://dev.theoverlay.io',
    gameserver: 'https://localhost:3030',
    mediatorServer: 'https://authn.io',
    wasmUrl: 'https://localhost:3000/recast/recast.wasm',
    gameserverDomain: '',
    lobbyLocationName: 'lobby',
    siteTitle: 'The Overlay',
    siteDescription: 'Connected Worlds for Everyone',
    feathersStoreKey: 'TheOverlay-Auth-Store',
    localStorageKey: 'theoverlay-client-store-key-v1',
    HARPGL_API_KEY: 'Ttss4aUB77Zt0zEDvFs-4kwmG6CbM58pV5unTlZrXMA',
    auth: {
      enableSmsMagicLink: true,
      enableEmailMagicLink: true,
      enableUserPassword: true,
      enableGithubSocial: true,
      enableFacebookSocial: true,
      enableGoogleSocial: true,
      enableLinkedInSocial: true,
      enableTwitterSocial: true
    },
    alert: {
      timeout: 10000
    },
    offlineMode: false,
    staticPages: {
      termsOfService: ''
    },
    xr: {
      vrRoomGrid: {
        scenes: []
      }
    }
  }
}

export const setRuntime = (runtime: any): void => {
  const newConfig = typeof runtime === 'string' ? JSON.parse(runtime) : runtime
  Config.publicRuntimeConfig = Object.assign({}, Config.publicRuntimeConfig, newConfig)
}
