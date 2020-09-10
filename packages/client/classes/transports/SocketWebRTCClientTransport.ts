import { sleep } from "@xr3ngine/engine/src/common/functions/sleep";
import { MediaStreamComponent } from "@xr3ngine/engine/src/networking/components/MediaStreamComponent";
import { Network as NetworkComponent, Network } from "@xr3ngine/engine/src/networking/components/Network";
import { CAM_VIDEO_SIMULCAST_ENCODINGS } from "@xr3ngine/engine/src/networking/constants/VideoConstants";
import { MessageTypes } from "@xr3ngine/engine/src/networking/enums/MessageTypes";
import { NetworkTransport } from "@xr3ngine/engine/src/networking/interfaces/NetworkTransport";
import { UnreliableMessageReturn, UnreliableMessageType } from "@xr3ngine/engine/src/networking/types/NetworkingTypes";
import handleDataChannelConsumerMessage from "@xr3ngine/engine/src/networking/functions/handleDataChannelConsumerMessage";
import * as mediasoupClient from "mediasoup-client";
import { DataConsumer, DataConsumerOptions, DataProducer, Transport as MediaSoupTransport } from "mediasoup-client/lib/types";
import ioclient from "socket.io-client";
import moment from 'moment';
import { applyWorldState } from "@xr3ngine/engine/src/networking/behaviors/applyWorldState";

const Device = mediasoupClient.Device;

const DEFAULT_DATA_CHANNEl = 'default'

export class SocketWebRTCClientTransport implements NetworkTransport {
  isServer = false
  mediasoupDevice: mediasoupClient.Device
  joined: boolean
  leaving = false
  recvTransport: MediaSoupTransport
  sendTransport: MediaSoupTransport
  lastPollSyncData = {}
  pollingInterval: NodeJS.Timeout
  heartbeatInterval = 2000
  pollingTickRate = 1000
  pollingTimeout = 4000
  connectionWaitTime = 2000
  dataProducers = new Map<string, DataProducer>()
  dataConsumers = new Map<string, DataConsumer>()
  mediaStreamComponent = new MediaStreamComponent();

  socket: SocketIOClient.Socket = {} as SocketIOClient.Socket

  request: any
  localScreen: any;
  lastPoll: Date;
  pollPending = false;
  /**
   * Send a message over TCP with socket.io
   * You should probably want {@link @xr3ngine/packages/enginge/src/networking/functions/NetworkFunctions.ts#sendMessage}
   * @param message message to send
   */
  sendReliableMessage(message): void {
    console.log("Sending reliable message ", message)
    this.socket.emit(message);
  }

  // send and init are done separately to make it a bit more readable
  // sendTransport should be available before initializing data channel
  // creates data producer on client
  async createDataProducer(channel: string, type: UnreliableMessageType = 'json', customInitInfo: any = {}): Promise<DataProducer | Error> {
    try {
      if (!this.sendTransport) throw new Error('Send Transport not initialized')
      // else if (this.dataProducers.get(channel)) return Promise.reject(new Error('Data channel already exists!'))
      const dataProducer = await this.sendTransport.produceData({
        appData: { data: customInitInfo }, // Probably Add additional info to send to server
        ordered: false,
        label: channel,
        maxPacketLifeTime: 3000,
        // maxRetransmits: 3,
        protocol: type // sub-protocol for type of data to be transmitted on the channel e.g. json, raw etc. maybe make type an enum rather than string
      });
      console.log('data producer created on client!')
      dataProducer.on("open", () => {
        console.log(`Data channel: '${dataProducer.label}' open...`)
        dataProducer.send(JSON.stringify({ info: 'init' }));
      });
      dataProducer.on("transportclose", () => {
        this.dataProducers.delete(channel);
        dataProducer.close()
      });
      console.log('setting data producer to client map!')
      this.dataProducers.set(channel, dataProducer);
      return Promise.resolve(dataProducer)
    } catch (e) {
      return Promise.reject(e)
    }
  }
  
  // Create data consumer and subscribe to the other client's producer when signalled
  handleDataConsumerCreation = async (options: DataConsumerOptions) => {
    console.warn('CONSUMER CREATION REQUEST RECEIVED! OPTIONS: ', options)
    console.warn('FROM CLIENT: ', options.appData?.peerId)
    try {
      const dataConsumer = await this.recvTransport.consumeData(options)
      console.log('SUCESS CONSUMEDATA!')
      dataConsumer.on('message', handleDataChannelConsumerMessage(dataConsumer)) // Handle message received
      dataConsumer.on('close', () => {
        dataConsumer.close()
        this.dataConsumers.delete(options.dataProducerId)
      }) // Handle message received
      this.dataConsumers.set(options.dataProducerId, dataConsumer)
    } catch (e) {
      console.warn('CLIENT-DATA_CONSUMER could not be created! ', e)
    }
  }

  // This sends message on a data channel (data channel creation is now handled explicitly/default)
  async sendUnreliableMessage(data: any, channel: string = DEFAULT_DATA_CHANNEl): Promise<UnreliableMessageReturn> {
    try {
      const dataProducer: DataProducer | undefined = this.dataProducers.get(channel)
      if (!dataProducer) throw new Error('Data Channel not initialized on client, Data Producer doesn\'t exist!')
      console.log("Sending data on data channel: ", channel);
      // dataProducer.send(JSON.stringify({ data }))
      return Promise.resolve(dataProducer);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  // Adds support for Promise to socket.io-client
  promisedRequest(socket: SocketIOClient.Socket) {
    return function request(type: any, data = {}): any {
      return new Promise(resolve => {
        socket.emit(type, data, resolve);
        // console.log("Emitting data: ")
        // console.log(data)
      });
    };
  }

  public async initialize(address = "https://127.0.0.1", port = 3030): Promise<void> {
    console.log(`Initializing client transport to ${address}:${port}`);
    this.mediasoupDevice = new Device();

    this.socket = ioclient(`${address}:${port}`, {
      query: {
        cool: 'pants'
      }
    });
    this.request = this.promisedRequest(this.socket);
    console.log(this.socket);

    // window.screenshare = await this.startScreenshare

    console.log(`Initializing socket.io...,`);
    this.socket.on("connect", async () => {
      console.log("Connected!");

      // use sendBeacon to tell the server we're disconnecting when
      // the page unloads
      window.addEventListener("unload", async () => {
        this.socket.emit(MessageTypes.LeaveWorld.toString());
      });
      
      console.log("Attempting to join world")
      await this.joinWorld();
      // Ping request for testing unreliable messaging may remove if not needed
      console.log('About to init receive and send transports')
      
      // Init Receive and Send Transports initially since we need them for unreliable message consumption and production
      await Promise.all([this.initSendTransport(), this.initReceiveTransport()])
      // Access other channels using
      // NetworkComponent.instance.dataChannels

      // await this.createDataProducer(DEFAULT_DATA_CHANNEl) // TODO: Init Data channels needed for the app, right now only inits 'default' channel

      console.log("About to send camera streams");
      await this.sendCameraStreams();
      console.log("about to init sockets");
      console.log(this.recvTransport)
      // this.startScreenshare()
    });
    this.socket.on(MessageTypes.WebRTCConsumeData.toString(), this.handleDataConsumerCreation)
  }

  //= =//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//
  // Mediasoup Code:
  //= =//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//

  async joinWorld() {
    if (this.joined) return Promise.resolve();
    this.joined = true;
    // signal that we're a new peer and initialize our
    // mediasoup-client device, if this is our first time connecting
    
    console.log("Joining world");
    const resp = await this.request(MessageTypes.JoinWorld.toString(),
    {
      // BUG:
      // TODO: Need to populate localUserId
      userId: Network.instance.localUserId ?? "ERROR"
    });

    console.log("Awaiting response to join world");
    const { worldState, routerRtpCapabilities } = resp as any;
   
    // TODO: This shouldn't be in the transport, should be in our network system somehow
    // Apply all state to initial frame
    applyWorldState(worldState)

    console.log("Loading mediasoup");
    if (!this.mediasoupDevice.loaded) await this.mediasoupDevice.load({ routerRtpCapabilities });
    console.log("Polling");
    this.pollAndUpdate(); // start this polling loop
    console.log("Joined world");

    return Promise.resolve()
  }

  // Init receive transport, create one if it doesn't exist else just resolve promise
  async initReceiveTransport(): Promise<MediaSoupTransport | Error> {
    if (!this.recvTransport) {
      console.log('Creating receive transport')
      try {
        this.recvTransport = await this.createTransport("recv");
        return Promise.resolve(this.recvTransport);
      }
      catch (e) {
        return Promise.reject(e);
      }
    } else {
      return Promise.resolve(this.recvTransport);
    }
  }

  // Init send transport, create one if it doesn't exist else just resolve promise
  async initSendTransport(): Promise<MediaSoupTransport | Error> {
    if (!this.sendTransport) {
      console.log('Creating send transport')
      try {
        this.sendTransport = await this.createTransport("send");
        return Promise.resolve(this.sendTransport);
      } catch (e) {
        return Promise.reject(e);
      }
    } else {
      return Promise.resolve(this.sendTransport);
    }
  }

  async sendCameraStreams(): Promise<void> {
    console.log("send camera streams");
    await this.joinWorld();
    // create a transport for outgoing media, if we don't already have one
    if (!this.sendTransport) this.sendTransport = await this.createTransport("send");
    if (!MediaStreamComponent.instance.mediaStream) return;

    // start sending video. the transport logic will initiate a
    // signaling conversation with the server to set up an outbound rtp
    // stream for the camera video track. our createTransport() function
    // includes logic to tell the server to start the stream in a paused
    // state, if the checkbox in our UI is unchecked. so as soon as we
    // have a client-side camVideoProducer object, we need to set it to
    // paused as appropriate, too.
    MediaStreamComponent.instance.camVideoProducer = await this.sendTransport.produce({
      track: MediaStreamComponent.instance.mediaStream.getVideoTracks()[0],
      encodings: CAM_VIDEO_SIMULCAST_ENCODINGS,
      appData: { mediaTag: "cam-video" }
    });

    console.log('Created camVideoProducer')
    console.log(MediaStreamComponent.instance.camVideoProducer)

    if (MediaStreamComponent.instance.videoPaused) await MediaStreamComponent.instance.camVideoProducer.pause();

    // console.log('Calling addVideoAudio')
    // await MediaStreamSystem.instance.addVideoAudio(MediaStreamComponent.instance.camVideoProducer, 'me');

    //To control the producer audio volume, we need to clone the audio track and connect a Gain to it.
    //This Gain is saved on MediaStreamComponent so it can be accessed from the user's component and controlled.
    const audioTrack = MediaStreamComponent.instance.mediaStream.getAudioTracks()[0];
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
    const dst = ctx.createMediaStreamDestination();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1;
    [src, gainNode, dst].reduce((a, b) => a && (a.connect(b) as any));
    MediaStreamComponent.instance.audioGainNode = gainNode;
    MediaStreamComponent.instance.mediaStream.removeTrack(audioTrack);
    MediaStreamComponent.instance.mediaStream.addTrack(dst.stream.getAudioTracks()[0]);
    // same thing for audio, but we can use our already-created
    MediaStreamComponent.instance.camAudioProducer = await this.sendTransport.produce({
      track: MediaStreamComponent.instance.mediaStream.getAudioTracks()[0],
      appData: { mediaTag: "cam-audio" }
    });

    if (MediaStreamComponent.instance.audioPaused) MediaStreamComponent.instance.camAudioProducer.pause();

    console.log('Cam Producers created');
    console.log(MediaStreamComponent.instance)
  }

  async startScreenshare(): Promise<boolean> {
    console.log("start screen share");

    // make sure we've joined the  and that we have a sending
    // transport
    await this.joinWorld();
    if (!this.sendTransport) this.sendTransport = await this.createTransport("send");

    // get a screen share track
    MediaStreamComponent.instance.localScreen = await (navigator.mediaDevices as any).getDisplayMedia({
      video: true,
      audio: true
    });

    // create a producer for video
    MediaStreamComponent.instance.screenVideoProducer = await this.sendTransport.produce({
      track: MediaStreamComponent.instance.localScreen.getVideoTracks()[0],
      encodings: [], // TODO: Add me
      appData: { mediaTag: "screen-video" }
    });

    // create a producer for audio, if we have it
    if (MediaStreamComponent.instance.localScreen.getAudioTracks().length) {
      MediaStreamComponent.instance.screenAudioProducer = await this.sendTransport.produce({
        track: MediaStreamComponent.instance.localScreen.getAudioTracks()[0],
        appData: { mediaTag: "screen-audio" }
      });
    }

    // handler for screen share stopped event (triggered by the
    // browser's built-in screen sharing ui)
    MediaStreamComponent.instance.screenVideoProducer.track.onended = async () => {
      console.log("screen share stopped");
      await MediaStreamComponent.instance.screenVideoProducer.pause();

      const { error } = await this.request(MessageTypes.WebRTCCloseProducer.toString(), {
        producerId: MediaStreamComponent.instance.screenVideoProducer.id
      });
      await MediaStreamComponent.instance.screenVideoProducer.close();
      MediaStreamComponent.instance.screenVideoProducer = null;
      if (error) {
        console.error(error);
      }
      if (MediaStreamComponent.instance.screenAudioProducer) {
        const { error: screenAudioProducerError } = await this.request(MessageTypes.WebRTCCloseProducer.toString(), {
          producerId: MediaStreamComponent.instance.screenAudioProducer.id
        });

        await MediaStreamComponent.instance.screenAudioProducer.close();
        MediaStreamComponent.instance.screenAudioProducer = null;
        if (screenAudioProducerError) {
          console.error(screenAudioProducerError);
        }
      }
    };
    return true;
  }

  async stopSendingMediaStreams(): Promise<boolean> {
    console.log('Stopping Media Streams');
    console.log(this.sendTransport)
    // if (!(MediaStreamComponent.instance.mediaStream && MediaStreamComponent.instance.localScreen)) return false;
    if (this.sendTransport) {
      console.log('Closing send transport')
      const result = await this.request(MessageTypes.WebRTCTransportClose.toString(), {
        transportId: this.sendTransport.id
      });
      console.log('Transport close request response:')
      console.log(result)
      if (result.error) console.error(result.error);

      await this.sendTransport.close();
      this.sendTransport = null;
      console.log('Transport should be fully closed')
    }
    // closing the sendTransport closes all associated producers. when
    // the camVideoProducer and camAudioProducer are closed,
    // mediasoup-client stops the local cam tracks, so we don't need to
    // do anything except set all our local variables to null.
    console.log('Setting producers and such to null')
    MediaStreamComponent.instance.camVideoProducer = null;
    MediaStreamComponent.instance.camAudioProducer = null;
    MediaStreamComponent.instance.screenVideoProducer = null;
    MediaStreamComponent.instance.screenAudioProducer = null;
    MediaStreamComponent.instance.mediaStream = null;
    MediaStreamComponent.instance.localScreen = null;
    return true;
  }

  async leave(): Promise<boolean> {
    try {
      console.log('Attempting to leave client transport')
      if (!this.joined) return false;
      console.log("leave ");
      this.leaving = true;

      // stop polling
      clearInterval(this.pollingInterval);
      console.log('Cleared interval')

      // close everything on the server-side (transports, producers, consumers)
      const result = await this.request(MessageTypes.LeaveWorld.toString());
      console.log('LeaveWorld result:')
      console.log(result)
      if (result.error) {
        console.error(result.error);
      }
      console.log('Left World')

      // closing the transports closes all producers and consumers. we
      // don't need to do anything beyond closing the transports, except
      // to set all our local variables to their initial states
      if (this.recvTransport) await this.recvTransport.close();
      console.log('Closed receive transport')
      if (this.sendTransport) await this.sendTransport.close();
      console.log('Removed send transport')

      this.recvTransport = null;
      this.sendTransport = null;
      MediaStreamComponent.instance.camVideoProducer = null;
      MediaStreamComponent.instance.camAudioProducer = null;
      MediaStreamComponent.instance.screenVideoProducer = null;
      MediaStreamComponent.instance.screenAudioProducer = null;
      MediaStreamComponent.instance.mediaStream = null;
      MediaStreamComponent.instance.localScreen = null;
      this.lastPollSyncData = {};
      MediaStreamComponent.instance.consumers = [];
      this.joined = false;
      this.leaving = false;
      console.log('Nulled everything')
      return true;
    } catch (err) {
      console.log('Error with leave()')
      console.log(err)
    }
  }

  async subscribeToTrack(peerId: string, mediaTag: string) {
    // create a receive transport if we don't already have one
    // if (!this.recvTransport) this.recvTransport = await this.createTransport("recv");

    // if we do already have a consumer, we shouldn't have called this
    // method
    if (this.recvTransport != null) {
      let consumer = MediaStreamComponent.instance.consumers.find(
        (c: any) => c.appData.peerId === peerId && c.appData.mediaTag === mediaTag
      );
      if (consumer) return console.error("already have consumer for track", peerId, mediaTag);

      // ask the server to create a server-side consumer object and send
      // us back the info we need to create a client-side consumer

      const consumerParameters = await this.request(MessageTypes.WebRTCReceiveTrack.toString(), {
        mediaTag,
        mediaPeerId: peerId,
        rtpCapabilities: this.mediasoupDevice.rtpCapabilities
      });

      console.log(`Requesting consumer for peer ${peerId} of type ${mediaTag} at ${new Date()}`)
      consumer = await this.recvTransport.consume({
        ...consumerParameters,
        appData: { peerId, mediaTag }
      });

      console.log('New Consumer:');
      console.log(consumer);
      console.log('Transport connectionState: ' + this.recvTransport?.connectionState);
      const stats = await consumer.getStats();
      console.log(stats);

      if (MediaStreamComponent.instance.consumers?.find(c => c?.appData?.peerId === peerId && c?.appData?.mediaTag === mediaTag) == null) {
        let connected = false;
        MediaStreamComponent.instance.consumers.push(consumer);
        console.log(`Pushed consumer for peer ${peerId} of type ${mediaTag} at ${new Date()}`)
        // the server-side consumer will be started in paused state. wait
        // until we're connected, then send a resume request to the server
        // to get our first keyframe and start displaying video
        // setTimeout(async () => {
        //   if (connected !== true) {
        //     console.log('ReceiveTransport didn\'t connect, scrapping consumer ' + consumer.id + ' and trying again');
        //     await this.closeConsumer(consumer);
        //     MediaStreamComponent.instance.consumers = MediaStreamComponent.instance.consumers.filter((c) => c.id !== consumer.id);
        //   }
        // }, this.connectionWaitTime);

        // while (this.recvTransport?.connectionState !== "connected") await sleep(100);

        connected = true;

        console.log('Resuming newly-subscribed consumer');
        // okay, we're ready. let's ask the peer to send us media
        await this.resumeConsumer(consumer);
      } else {
        await this.closeConsumer(consumer);
      }
    }
  }

  async unsubscribeFromTrack(peerId: any, mediaTag: any) {
    console.log("unsubscribe from track", peerId, mediaTag);
    const consumer = MediaStreamComponent.instance.consumers.find(
      c => c.appData.peerId === peerId && c.appData.mediaTag === mediaTag
    );
    if (!consumer) return;
    await this.closeConsumer(consumer);
  }

  public async pauseConsumer(consumer: { appData: { peerId: any; mediaTag: any }; id: any; pause: () => any }) {
    if (!consumer) return;
    console.log("pause consumer", consumer.appData.peerId, consumer.appData.mediaTag);
    await this.request(MessageTypes.WebRTCPauseConsumer.toString(), { consumerId: consumer.id });
    await consumer.pause();
  }

  public async resumeConsumer(consumer: { appData: { peerId: any; mediaTag: any }; id: any; resume: () => any }) {
    if (!consumer) return;
    console.log("resume consumer", consumer.id, consumer.appData.peerId, consumer.appData.mediaTag);
    await this.request(MessageTypes.WebRTCResumeConsumer.toString(), { consumerId: consumer.id });
    await consumer.resume();
  }

  async pauseProducer(producer: { appData: { mediaTag: any }; id: any; pause: () => any }) {
    if (!producer) return;
    console.log("pause producer", producer.appData.mediaTag);
    await this.request(MessageTypes.WebRTCPauseProducer.toString(), { producerId: producer.id });
    await producer.pause();
  }

  async resumeProducer(producer: { appData: { mediaTag: any }; id: any; resume: () => any }) {
    if (!producer) return;
    console.log("resume producer", producer.appData.mediaTag);
    await this.request(MessageTypes.WebRTCResumeProducer.toString(), { producerId: producer.id });
    await producer.resume();
  }

  async closeConsumer(consumer: any) {
    if (!consumer) return;
    console.log("closing consumer", consumer.appData.peerId, consumer.appData.mediaTag);
    // tell the server we're closing this consumer. (the server-side
    // consumer may have been closed already, but that's okay.)
    await this.request(MessageTypes.WebRTCCloseConsumer.toString(), { consumerId: consumer.id });
    await consumer.close();

    const filteredConsumers = MediaStreamComponent.instance.consumers.filter(
      (c: any) => !(c.id === consumer.id)
    ) as any[];
    MediaStreamComponent.instance.consumers = filteredConsumers;
    // MediaStreamSystem.instance.removeVideoAudio(consumer);
  }

  // utility function to create a transport and hook up signaling logic
  // appropriate to the transport's direction
  async createTransport(direction: string) {
    // ask the server to create a server-side transport object and send
    // us back the info we need to create a client-side transport
    let transport;
    const { transportOptions } = await this.request(MessageTypes.WebRTCTransportCreate.toString(), { direction, sctpCapabilities: this.mediasoupDevice.sctpCapabilities });
    console.log("transport options", transportOptions);

    if (direction === "recv") {
      transport = await this.mediasoupDevice.createRecvTransport(transportOptions);
    } else if (direction === "send") {
      transport = await this.mediasoupDevice.createSendTransport(transportOptions);
    } else {
      throw new Error(`bad transport 'direction': ${direction}`);
    }

    // mediasoup-client will emit a connect event when media needs to
    // start flowing for the first time. send dtlsParameters to the
    // server, then call callback() on success or errback() on failure.
    transport.on("connect", async ({ dtlsParameters }: any, callback: () => void, errback: () => void) => {
      const { error } = await this.request(MessageTypes.WebRTCTransportConnect.toString(), {
        transportId: transportOptions.id,
        dtlsParameters
      });
      if (error) {
        console.error("error connecting transport", direction, error);
        errback();
        return;
      }
      callback();
    });

    if (direction === "send") {
      // sending transports will emit a produce event when a new track
      // needs to be set up to start sending. the producer's appData is
      // passed as a parameter
      transport.on(
        "produce",
        async ({ kind, rtpParameters, appData }: any, callback: (arg0: { id: any }) => void, errback: () => void) => {
          console.log("transport produce event", appData.mediaTag);
          console.log(rtpParameters)

          // we may want to start out paused (if the checkboxes in the ui
          // aren't checked, for each media type. not very clean code, here
          // but, you know, this isn't a real application.)
          let paused = false;
          if (appData.mediaTag === "cam-video") paused = MediaStreamComponent.instance.videoPaused;
          else if (appData.mediaTag === "cam-audio") paused = MediaStreamComponent.instance.audioPaused;

          // tell the server what it needs to know from us in order to set
          // up a server-side producer object, and get back a
          // producer.id. call callback() on success or errback() on
          // failure.
          const { error, id } = await this.request(MessageTypes.WebRTCSendTrack.toString(), {
            transportId: transportOptions.id,
            kind,
            rtpParameters,
            paused,
            appData
          });
          if (error) {
            console.error("error setting up server-side producer", error);
            errback();
            return;
          };
          callback({ id });
        }
      );

      transport.on(
        "producedata",
        async (parameters: any, callback: (arg0: { id: any }) => void, errback: () => void) => {
          console.log("transport produce data event, params: ", parameters);
          const { sctpStreamParameters, label, protocol, appData } = parameters;
          const { error, id } = await this.request(MessageTypes.WebRTCProduceData, {
            transportId: transport.id,
            sctpStreamParameters,
            label,
            protocol,
            appData
          });
          if (error) {
            console.error("error setting up server-side data producer", error);
            errback();
            return;
          }
          return callback({ id });
        }
      );
    }

    // any time a transport transitions to closed,
    // failed, or disconnected, leave the  and reset
    transport.on("connectionstatechange", async (state: string) => {
      console.log(`transport ${transport.id} connectionstatechange ${state}`);
      // for this simple sample code, assume that transports being
      // closed is an error (we never close these transports except when
      // we leave the )
      console.log(`Transport state changed to ${state}`);
      console.log(transport)
      if (this.leaving !== true && (state === "closed" || state === "failed" || state === "disconnected")) {
        console.log("transport closed ... leaving the  and resetting");
        alert("Your connection failed.  Please restart the page");
      }
    });


    return Promise.resolve(transport);
  }

  // polling/update logic
  async pollAndUpdate() {
    setTimeout(() => this.pollAndUpdate(), this.pollingTickRate);
    if (this.request === undefined) return;
    if (this.lastPoll == null || moment().utc().subtract(this.pollingTimeout, 'ms') > moment(this.lastPoll) || this.pollPending === false) {
      this.pollPending = true;
      this.lastPoll = moment().utc().toDate();

      // TODO: We really want the peer deltas here (joined/left)
      const { peers } = await this.request(MessageTypes.Synchronization.toString());

      console.log('Consumers:')
      console.log(MediaStreamComponent.instance.consumers.map((c) => c.id + ' ' + c.appData.peerId + ' ' + c.appData.mediaTag));
      if (peers && peers[NetworkComponent.instance.mySocketID] === undefined) console.log("Server doesn't think you're connected!");

      // decide if we need to update tracks list and video/audio
      // elements. build list of peers, sorted by join time, removing last
      // seen time and stats, so we can easily do a deep-equals
      // comparison. compare this list with the cached list from last
      // poll.

      // auto-subscribe to their feeds:
      for (const id in peers) {
        // if it isnt me...
        if (id !== NetworkComponent.instance.mySocketID) {
          // And I already have the peer in my peer list...
          if (NetworkComponent.instance.clients[id] !== undefined) {
            // for each of the peer's producers...
            for (const [mediaTag, _] of Object.entries(peers[id].media)) {
              if (
                MediaStreamComponent.instance.consumers?.find(
                  c => c?.appData?.peerId === id && c?.appData?.mediaTag === mediaTag
                ) == null
              ) {
                // that we don't already have consumers for...
                console.log(`auto subscribing to ${mediaTag} track that ${id} has added at ${new Date()}`);
                await this.subscribeToTrack(id, mediaTag);
              }
            }
          }
        }

        // if a peer has gone away, we need to close all consumers we have
        // for that peer and remove video and audio elements
        for (const id in this.lastPollSyncData) {
          if (!peers[id]) {
            console.log(`Peer ${id} has exited`);
            if (MediaStreamComponent.instance.consumers.length === 0) return console.log("Consumers length is 0");
            MediaStreamComponent.instance.consumers.forEach(consumer => {
              if (consumer.appData.peerId === id) {
                this.closeConsumer(consumer);
              }
            });
          }
        }

        this.pollPending = false;
        // if a peer has stopped sending media that we are consuming, we
        // need to close the consumer and remove video and audio elements
        if (MediaStreamComponent.instance.consumers == undefined || MediaStreamComponent.instance.consumers.length === 0)
          return console.log("Consumers length is 0");

        MediaStreamComponent.instance.consumers.forEach(consumer => {
          const { peerId, mediaTag } = consumer.appData;
          if (!peers[peerId]) {
            console.log(`Peer ${peerId} has stopped transmitting ${mediaTag}`);
            this.closeConsumer(consumer);
          } else if (!peers[peerId].media[mediaTag]) {
            console.log(`Peer ${peerId} has stopped transmitting ${mediaTag}`);
            this.closeConsumer(consumer);
          }
        });

        // push through the paused state to new sync list
        this.lastPollSyncData = peers;
      }
    }
  }
}