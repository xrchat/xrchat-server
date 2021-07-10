export enum GolfCollisionGroups {
  Ball = 1 << 10,
  Hole = 1 << 11,
  Club = 1 << 12,
}

export enum GolfPrefabTypes {
  Ball = 10, // TODO: make a prefab register
  Club = 11,
}

export enum GolfColors {
  red = 0xFF0000,
  green = 0x00FF00,
  blue = 0x0000FF,
  yellow = 0xFFFF00,
  magenta = 0xFF00FF,
  cyan = 0xFF00FF,
  orange = 0xFFA500,
  brown = 0x964B00
}