import { Component } from '../../ecs/classes/Component'
import { Entity } from '../../ecs/classes/Entity'
import { Types } from '../../ecs/types/Types'
/**
 * @author HydraFire <github.com/HydraFire>
 */

type OwnedObjects = {
  [role: string]: Entity
}
export class GamePlayer extends Component<GamePlayer> {
  gameName: string
  role: string
  uuid: string
  ownedObjects: OwnedObjects = {}
}

GamePlayer._schema = {
  gameName: { type: Types.String, default: null },
  role: { type: Types.String, default: null },
  uuid: { type: Types.String, default: null }
}
