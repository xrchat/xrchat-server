import { isServer } from '../../common/functions/isServer';
import { Entity } from '../../ecs/classes/Entity';
import { System } from '../../ecs/classes/System';
import { addComponent, createEntity, getComponent } from '../../ecs/functions/EntityFunctions';
import { SystemUpdateType } from '../../ecs/functions/SystemUpdateType';
import { cleanupInput } from '../../input/behaviors/cleanupInput';
import { handleInputOnClient } from '../../input/behaviors/handleInputOnClient';
import { Input } from '../../input/components/Input';
import { LocalInputReceiver } from '../../input/components/LocalInputReceiver';
import { State } from '../../state/components/State';
import { TransformComponent } from '../../transform/components/TransformComponent';
import { Client } from '../components/Client';
import { Network } from '../components/Network';
import { NetworkInterpolation } from '../components/NetworkInterpolation';
import { NetworkObject } from '../components/NetworkObject';
import { Server } from '../components/Server';
import { addInputToWorldStateOnServer } from '../functions/addInputToWorldStateOnServer';
import { addNetworkTransformToWorldState } from '../functions/addNetworkTransformToWorldState';
import { applyNetworkStateToClient } from '../functions/applyNetworkStateToClient';
import { handleInputOnServer } from '../functions/handleInputOnServer';
import { handleUpdatesFromClients } from '../functions/handleUpdatesFromClients';
import { createSnapshot, addSnapshot } from '../functions/NetworkInterpolationFunctions';
let t = 0, m = true

export class ServerNetworkSystem extends System {
  private _inputComponent: Input

  updateType = SystemUpdateType.Fixed;

  isServer;

  constructor(attributes) {
    super();

    // Create a Network entity (singleton)
    const networkEntity = createEntity();
    addComponent(networkEntity, Network);
    addComponent(networkEntity, NetworkInterpolation);

    const { schema, app } = attributes;
    Network.instance.schema = schema;
    // Instantiate the provided transport (SocketWebRTCClientTransport / SocketWebRTCServerTransport by default)
    Network.instance.transport = new schema.transport(app);

    this.isServer = Network.instance.transport.isServer;

    // Add a component so we can filter server and client queries
    addComponent(networkEntity, this.isServer ? Server : Client);

    // Initialize the server automatically - client is initialized in connectToServer
    if (process.env.SERVER_MODE !== undefined && (process.env.SERVER_MODE === 'realtime' || process.env.SERVER_MODE === 'local')) {
      Network.instance.transport.initialize();
      Network.instance.isInitialized = true;
    }
  }

  // Call execution on server
  fixedExecuteOnServer = (delta: number) => {
      // Create a new worldstate frame for next tick
      Network.tick++;
    Network.instance.worldState = {
      tick: Network.tick,
      transforms: [],
      snapshot: {
        state: undefined
      },
      inputs: [],
      states: [],
      clientsConnected: Network.instance.clientsConnected,
      clientsDisconnected: Network.instance.clientsDisconnected,
      createObjects: Network.instance.createObjects,
      destroyObjects: Network.instance.destroyObjects
    };

    if(Network.instance.createObjects.length >0){
      console.log("Network.instance.createObjects is ", Network.instance.createObjects)
    }

    if(Network.instance.destroyObjects.length >0){
      console.log("Network.instance.destroyObjects is ", Network.instance.destroyObjects)
    }

    Network.instance.clientsConnected = []
    Network.instance.clientsDisconnected = []
    Network.instance.createObjects = []
    Network.instance.destroyObjects = []
    // Set input values on server to values sent from clients
    handleUpdatesFromClients();
    // Apply input for local user input onto client
    this.queryResults.inputOnServer.all?.forEach(entity => {
      // Call behaviors associated with input
      handleInputOnServer(entity, {isLocal:false, isServer: true}, delta);
      addInputToWorldStateOnServer(entity);
      cleanupInput(entity);
    });

    // Called when input component is added to entity
    this.queryResults.inputOnServer.added?.forEach(entity => {
      // Get component reference
      this._inputComponent = getComponent(entity, Input);

      if (this._inputComponent === undefined)
        return console.warn("Tried to execute on a newly added input component, but it was undefined")
      // Call all behaviors in "onAdded" of input map
      this._inputComponent.schema.onAdded?.forEach(behavior => {
        behavior.behavior(entity, { ...behavior.args });
      });
    });

    // Called when input component is removed from entity
    this.queryResults.inputOnServer.removed?.forEach(entity => {
      // Get component reference
      this._inputComponent = getComponent(entity, Input);

      // Call all behaviors in "onRemoved" of input map
      this._inputComponent?.schema?.onRemoved?.forEach(behavior => {
        behavior.behavior(entity, behavior.args);
      });
    });

    // Transforms that are updated are automatically collected
    // note: onChanged needs to currently be handled outside of fixedExecute
    this.queryResults.serverNetworkTransforms.all?.forEach((entity: Entity) =>
      addNetworkTransformToWorldState(entity));

    // // For each networked object + input receiver, add to the frame to send
    // this.queryResults.serverNetworkInputs.all?.forEach((entity: Entity) =>
    //   addInputToWorldStateOnServer(entity));

    // For each networked object + input receiver, add to the frame to send
    // this.queryResults.serverNetworkStates.changed?.forEach((entity: Entity) =>
    //   addStateToWorldStateOnServer(entity));

     addSnapshot(createSnapshot(Network.instance.worldState.transforms));
     Network.instance.worldState.snapshot = NetworkInterpolation.instance.get();

    // TODO: to enable snapshots, use worldStateModel.toBuffer(Network.instance.worldState)
    // Send the message to all connected clients
    if(Network.instance.transport !== undefined)
      Network.instance.transport.sendReliableData(Network.instance.worldState); // Use default channel

  }

  // Call execution on client
  fixedExecuteOnClient = (delta: number) => {
    if (Network.instance == null) return
    // Client logic
    const queue = Network.instance.incomingMessageQueue;
    // For each message, handle and process
    while (queue.getBufferLength() > 0)
      applyNetworkStateToClient(queue.pop(), delta);
  }

  // Call logic based on whether we are the server or the client
  execute = isServer ? this.fixedExecuteOnServer :
    this.fixedExecuteOnClient;

  static queries: any = {
    inputOnServer: {
      components: [NetworkObject, Input, Server],
      listen: {
        added: true,
        removed: true
      }
    },
    networkServer: {
      components: [Network, Server]
    },
    networkClient: {
      components: [Network, Client]
    },
    localClientNetworkInputReceivers: {
      components: [NetworkObject, Input, LocalInputReceiver]
    },
    serverNetworkStates: {
      components: [NetworkObject, State, Server]
    },
    serverNetworkTransforms: {
      components: [NetworkObject, TransformComponent, Server]
    },
    serverNetworkObjects: {
      components: [NetworkObject, Server]
    },
    serverNetworkInputs: {
      components: [NetworkObject, Input, Server]
    }
  }
}
