export enum GolfCollisionGroups {
  Ball = 1 << 10,
  Hole = 1 << 11,
  Club = 1 << 12,
  Course = 1 << 13
}

export enum GolfPrefabTypes {
  Ball = 10, // TODO: make a prefab register
  Club = 11,
}