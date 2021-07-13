// Patch XHR for FileLoader in threejs
import { XMLHttpRequest } from 'xmlhttprequest'
import Worker from 'web-worker'
import path from 'path'
import { initializeEngine } from '@xrengine/engine/src/initializeEngine'
import { NetworkSchema } from '@xrengine/engine/src/networking/interfaces/NetworkSchema'
import config from '@xrengine/server-core/src/appconfig'
import { SocketWebRTCServerTransport } from './SocketWebRTCServerTransport'
import { EngineSystemPresets, InitializeOptions } from '@xrengine/engine/src/initializationOptions'
;(globalThis as any).XMLHttpRequest = XMLHttpRequest

const currentPath = (process.platform === 'win32' ? 'file:///' : '') + path.dirname(__filename)
const options: InitializeOptions = {
  type: EngineSystemPresets.SERVER,
  networking: {
    schema: {
      transport: SocketWebRTCServerTransport
    } as NetworkSchema
  },
  publicPath: config.client.url
}

export class WebRTCGameServer {
  static instance: WebRTCGameServer = null
  constructor(app: any) {
    ;(options.networking as any).app = app
    WebRTCGameServer.instance = this
  }
  initialize() {
    return initializeEngine(options)
  }
}
