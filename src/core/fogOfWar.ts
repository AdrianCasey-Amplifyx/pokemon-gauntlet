import type { DungeonMap } from "../types.ts";

export function revealTilesAround(
  map: DungeonMap,
  px: number,
  py: number,
  radius: number = 1
): void {
  for (let row = py - radius; row <= py + radius; row++) {
    for (let col = px - radius; col <= px + radius; col++) {
      if (row >= 0 && row < map.height && col >= 0 && col < map.width) {
        map.tiles[row][col].revealed = true;
      }
    }
  }
  // Mark current tile as visited
  if (py >= 0 && py < map.height && px >= 0 && px < map.width) {
    map.tiles[py][px].visited = true;
  }
}
