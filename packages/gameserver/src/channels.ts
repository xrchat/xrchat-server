import '@feathersjs/transport-commons'
import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { Network } from '@xrengine/engine/src/networking/classes/Network'
import { WorldScene } from '@xrengine/engine/src/scene/functions/SceneLoading'
import config from '@xrengine/server-core/src/appconfig'
import { Application } from '@xrengine/server-core/declarations'
import getLocalServerIp from '@xrengine/server-core/src/util/get-local-server-ip'
import logger from '@xrengine/server-core/src/logger'
import { decode } from 'jsonwebtoken'
import { EngineEvents } from '@xrengine/engine/src/ecs/classes/EngineEvents'
import path from 'path'
import Worker from 'web-worker'
import { processLocationChange } from '../../engine/src/ecs/functions/EngineFunctions'

export default (app: Application): void => {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return
  }

  app.on('connection', async (connection) => {
    if (
      (config.kubernetes.enabled && config.gameserver.mode === 'realtime') ||
      process.env.NODE_ENV === 'development' ||
      config.gameserver.mode === 'local'
    ) {
      try {
        const token = (connection as any).socketQuery?.token
        if (token != null) {
          const authResult = await (app.service('authentication') as any).strategies.jwt.authenticate(
            { accessToken: token },
            {}
          )
          const identityProvider = authResult['identity-provider']
          if (identityProvider != null && identityProvider.id != null) {
            logger.info(
              `user ${identityProvider.userId} joining ${(connection as any).socketQuery.locationId} with sceneId ${
                (connection as any).socketQuery.sceneId
              }`
            )
            const userId = identityProvider.userId
            const user = await app.service('user').get(userId)
            let locationId = (connection as any).socketQuery.locationId
            let channelId = (connection as any).socketQuery.channelId
            const sceneId = (connection as any).socketQuery.sceneId

            if (sceneId === '') return console.warn("Scene ID is empty, can't init")

            if (locationId === '') locationId = undefined
            if (channelId === '') channelId = undefined
            const agonesSDK = (app as any).agonesSDK
            const gsResult = await agonesSDK.getGameServer()
            const { status } = gsResult

            console.log('Creating new GS or updating current one')
            console.log('agones state is', status.state)
            console.log('app instance is', (app as any).instance)

            const isReady = status.state === 'Ready'
            const isNeedingNewServer =
              config.kubernetes.enabled === false &&
              (status.state === 'Shutdown' ||
                (app as any).instance == null ||
                (app as any).instance.locationId !== locationId ||
                (app as any).instance.channelId !== channelId)

            if (isReady || isNeedingNewServer) {
              logger.info('Starting new instance')
              const localIp = await getLocalServerIp()
              const selfIpAddress = `${status.address as string}:${status.portsList[0].port as string}`
              const newInstance = {
                currentUsers: 1,
                sceneId: sceneId,
                ipAddress: config.gameserver.mode === 'local' ? `${localIp.ipAddress}:3031` : selfIpAddress
              } as any
              console.log('channelId: ' + channelId)
              console.log('locationId: ' + locationId)
              // on local dev, if a scene is already loaded and it's no the scene we want, reset the engine
              if (
                config.kubernetes.enabled === false &&
                (app as any).instance &&
                (app as any).instance.locationId !== locationId
              ) {
                Engine.engineTimer.stop()
                Engine.sceneLoaded = false
                WorldScene.isLoading = false
                const currentPath = (process.platform === 'win32' ? 'file:///' : '') + path.dirname(__filename)
                await processLocationChange()
                Engine.engineTimer.start()
              }
              if (channelId != null) {
                newInstance.channelId = channelId
                ;(app as any).isChannelInstance = true
                //While there's no scene, this will still signal that the engine is ready
                //to handle events, particularly for NetworkFunctions:handleConnectToWorld
                EngineEvents.instance.dispatchEvent({ type: EngineEvents.EVENTS.SCENE_LOADED })
              } else if (locationId != null) {
                newInstance.locationId = locationId
                ;(app as any).isChannelInstance = false
              }
              console.log('Creating new instance:', newInstance)
              const instanceResult = await app.service('instance').create(newInstance)
              await agonesSDK.allocate()
              ;(app as any).instance = instanceResult

              if ((app as any).gsSubdomainNumber != null) {
                const gsSubProvision = await app.service('gameserver-subdomain-provision').find({
                  query: {
                    gs_number: (app as any).gsSubdomainNumber
                  }
                })

                if (gsSubProvision.total > 0) {
                  const provision = gsSubProvision.data[0]
                  await app.service('gameserver-subdomain-provision').patch(provision.id, {
                    instanceId: instanceResult.id
                  })
                }
              }
              console.log('Engine.sceneLoaded, WorldScene.isLoading', Engine.sceneLoaded, WorldScene.isLoading)
              // Only load the scene if this gameserver hasn't already
              if (sceneId != null && !Engine.sceneLoaded && !WorldScene.isLoading) {
                let service, serviceId
                const projectRegex = /\/([A-Za-z0-9]+)\/([a-f0-9-]+)$/
                const projectResult = await app.service('project').get(sceneId)
                // console.log("Project result is: ", projectResult);
                const projectUrl = projectResult.project_url
                const regexResult = projectUrl.match(projectRegex)
                if (regexResult) {
                  service = regexResult[1]
                  serviceId = regexResult[2]
                }
                const result = await app.service(service).get(serviceId)

                let entitiesLeft = -1
                let lastEntitiesLeft = -1
                const loadingInterval = setInterval(() => {
                  if (entitiesLeft >= 0 && lastEntitiesLeft !== entitiesLeft) {
                    lastEntitiesLeft = entitiesLeft
                    console.log(entitiesLeft + ' entites left...')
                  }
                }, 1000)

                WorldScene.load(
                  result,
                  () => {
                    console.log('Scene loaded!')
                    clearInterval(loadingInterval)
                    EngineEvents.instance.dispatchEvent({
                      type: EngineEvents.EVENTS.ENABLE_SCENE,
                      renderer: true,
                      physics: true
                    })
                  },
                  (left) => {
                    entitiesLeft = left
                  }
                )
                console.log('Loading scene...')
              }
            } else {
              try {
                const instance = await app.service('instance').get((app as any).instance.id)
                await agonesSDK.allocate()
                await app.service('instance').patch((app as any).instance.id, {
                  currentUsers: (instance.currentUsers as number) + 1
                })
              } catch (err) {
                console.log('Could not update instance, likely because it is a local one that does not exist')
              }
            }
            // console.log(`Patching user ${user.id} instanceId to ${(app as any).instance.id}`);
            const instanceIdKey = (app as any).isChannelInstance === true ? 'channelInstanceId' : 'instanceId'
            await app.service('user').patch(userId, {
              [instanceIdKey]: (app as any).instance.id
            })
            ;(connection as any).instanceId = (app as any).instance.id
            // console.log('Patched user instanceId');
            app.channel(`instanceIds/${(app as any).instance.id as string}`).join(connection)
            if ((app as any).isChannelInstance !== true)
              await app.service('message').create(
                {
                  targetObjectId: (app as any).instance.id,
                  targetObjectType: 'instance',
                  text: `${user.name} joined the layer`,
                  isNotification: true
                },
                {
                  'identity-provider': {
                    userId: userId
                  }
                }
              )
            if (user.partyId != null) {
              const partyUserResult = await app.service('party-user').find({
                query: {
                  partyId: user.partyId
                }
              })
              const party = await app.service('party').get(user.partyId)
              const partyUsers = (partyUserResult as any).data
              const partyOwner = partyUsers.find((partyUser) => partyUser.isOwner === 1)
              if (partyOwner?.userId === userId && party.instanceId !== (app as any).instance.id) {
                await app.service('party').patch(user.partyId, {
                  instanceId: (app as any).instance.id
                })
                const nonOwners = partyUsers.filter(
                  (partyUser) => partyUser.isOwner !== 1 && partyUser.isOwner !== true
                )
                const emittedIp = !config.kubernetes.enabled
                  ? await getLocalServerIp()
                  : {
                      ipAddress: status.address,
                      port: status.portsList[0].port
                    }
                await Promise.all(
                  nonOwners.map(async (partyUser) => {
                    await app.service('instance-provision').emit('created', {
                      userId: partyUser.userId,
                      ipAddress: emittedIp.ipAddress,
                      port: emittedIp.port,
                      locationId: locationId,
                      channelId: channelId,
                      sceneId: sceneId
                    })
                  })
                )
              }
            }
          }
        }
      } catch (err) {
        logger.error(err)
      }
    }
  })

  app.on('disconnect', async (connection) => {
    if (
      (config.kubernetes.enabled && config.gameserver.mode === 'realtime') ||
      process.env.NODE_ENV === 'development' ||
      config.gameserver.mode === 'local'
    ) {
      try {
        const token = (connection as any).socketQuery?.token
        if (token != null) {
          let authResult
          try {
            authResult = await (app.service('authentication') as any).strategies.jwt.authenticate(
              { accessToken: token },
              {}
            )
          } catch (err) {
            if (err.code === 401 && err.data.name === 'TokenExpiredError') {
              const jwtDecoded = decode(token)
              const idProvider = await app.service('identityProvider').get(jwtDecoded.sub)
              authResult = {
                'identity-provider': idProvider
              }
            } else throw err
          }
          const identityProvider = authResult['identity-provider']
          if (identityProvider != null && identityProvider.id != null) {
            const userId = identityProvider.userId
            const user = await app.service('user').get(userId)
            logger.info('Socket disconnect from ' + userId)
            const instanceId = !config.kubernetes.enabled ? (connection as any).instanceId : (app as any).instance?.id
            let instance
            try {
              instance =
                (app as any).instance && instanceId != null ? await app.service('instance').get(instanceId) : {}
            } catch (err) {
              console.log('Could not get instance, likely because it is a local one that no longer exists')
            }
            console.log('instanceId: ' + instanceId)
            console.log('user instanceId: ' + user.instanceId)

            if (instanceId != null && instance != null) {
              const activeUsers = Object.keys(Network.instance.clients)
              try {
                await app.service('instance').patch(instanceId, {
                  currentUsers: activeUsers.length
                })
              } catch (err) {
                console.log('Failed to patch instance user count, likely because it was destroyed')
              }

              const user = await app.service('user').get(userId)
              const instanceIdKey = (app as any).isChannelInstance === true ? 'channelInstanceId' : 'instanceId'
              if (
                (Network.instance.clients[userId] == null && config.kubernetes.enabled) ||
                process.env.NODE_ENV === 'development'
              )
                await app
                  .service('user')
                  .patch(
                    null,
                    {
                      [instanceIdKey]: null
                    },
                    {
                      query: {
                        id: user.id,
                        [instanceIdKey]: instanceId
                      },
                      [instanceIdKey]: instanceId
                    }
                  )
                  .catch((err) => {
                    console.warn("Failed to patch user, probably because they don't have an ID yet")
                    console.log(err)
                  })

              app.channel(`instanceIds/${instanceId as string}`).leave(connection)

              if (activeUsers.length < 1) {
                console.log('Deleting instance ' + instanceId)
                try {
                  await app.service('instance').remove(instanceId)
                } catch (err) {
                  console.log(err)
                }
                if ((app as any).gsSubdomainNumber != null) {
                  const gsSubdomainProvision = await app.service('gameserver-subdomain-provision').find({
                    query: {
                      gs_number: (app as any).gsSubdomainNumber
                    }
                  })
                  await app.service('gameserver-subdomain-provision').patch(gsSubdomainProvision.data[0].id, {
                    allocated: false
                  })
                }
                if (config.kubernetes.enabled) {
                  delete (app as any).instance
                }
                const gsName = (app as any).gsName
                if (gsName !== undefined) {
                  logger.info("App's gameserver name:")
                  logger.info(gsName)
                }
                await (app as any).agonesSDK.shutdown()
              }
            }
          }
        }
      } catch (err) {
        logger.info(err)
      }
    }
  })
}
