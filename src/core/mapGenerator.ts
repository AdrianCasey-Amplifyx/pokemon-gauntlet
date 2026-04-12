import type { DungeonMap, MapTile, Direction } from "../types.ts";
import { getGridSize, getEncounterRate } from "../data/worlds.ts";

function makeTile(type: "wall" | "floor" | "exit", encounterChance: number = 0, goldDrop: number = 0, exitDir?: Direction): MapTile {
  return { type, revealed: false, visited: false, encounterChance, goldDrop, exitDirection: exitDir };
}

export function generateDungeon(worldIndex: number, mapIndex: number): DungeonMap {
  const size = getGridSize(worldIndex, mapIndex);
  const width = size;
  const height = size;

  const tiles: MapTile[][] = [];
  for (let row = 0; row < height; row++) {
    tiles[row] = [];
    for (let col = 0; col < width; col++) {
      tiles[row][col] = makeTile("wall");
    }
  }

  const baseEncounter = getEncounterRate(worldIndex, mapIndex);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // Place single exit on a random edge
  const edge = Math.floor(Math.random() * 4);
  let exitRow: number, exitCol: number;
  let exitDir: Direction;

  switch (edge) {
    case 0: exitRow = 0; exitCol = randomMid(1, width - 2); exitDir = "up"; break;
    case 1: exitRow = height - 1; exitCol = randomMid(1, width - 2); exitDir = "down"; break;
    case 2: exitRow = randomMid(1, height - 2); exitCol = 0; exitDir = "left"; break;
    default: exitRow = randomMid(1, height - 2); exitCol = width - 1; exitDir = "right"; break;
  }

  tiles[exitRow][exitCol] = makeTile("exit", 0, 0, exitDir);

  // Carve path from center to exit
  carvePath(tiles, centerY, centerX, exitRow, exitCol, baseEncounter, worldIndex);

  // Carve additional random floor tiles for open areas
  const innerWalls: { row: number; col: number }[] = [];
  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      if (tiles[row][col].type === "wall") {
        innerWalls.push({ row, col });
      }
    }
  }

  const extraFloors = Math.floor(innerWalls.length * (0.35 + Math.random() * 0.2));
  shuffleArr(innerWalls);
  for (let i = 0; i < extraFloors && i < innerWalls.length; i++) {
    const { row, col } = innerWalls[i];
    if (hasFloorNeighbor(tiles, row, col, width, height)) {
      const goldChance = Math.random();
      const gold = goldChance < 0.08 ? 5 + Math.floor(Math.random() * (10 + worldIndex * 5)) : 0;
      tiles[row][col] = makeTile("floor", baseEncounter + (Math.random() * 0.06 - 0.03), gold);
    }
  }

  return { width, height, tiles, worldIndex, mapIndex };
}

function carvePath(
  tiles: MapTile[][],
  fromRow: number, fromCol: number,
  toRow: number, toCol: number,
  baseEncounter: number,
  worldIndex: number
): void {
  let row = fromRow;
  let col = fromCol;

  while (col !== toCol) {
    if (tiles[row][col].type === "wall") {
      const gold = Math.random() < 0.06 ? 5 + Math.floor(Math.random() * (8 + worldIndex * 3)) : 0;
      tiles[row][col] = makeTile("floor", baseEncounter + (Math.random() * 0.06 - 0.03), gold);
    }
    col += col < toCol ? 1 : -1;
  }

  while (row !== toRow) {
    if (tiles[row][col].type === "wall") {
      const gold = Math.random() < 0.06 ? 5 + Math.floor(Math.random() * (8 + worldIndex * 3)) : 0;
      tiles[row][col] = makeTile("floor", baseEncounter + (Math.random() * 0.06 - 0.03), gold);
    }
    row += row < toRow ? 1 : -1;
  }

  if (tiles[row][col].type === "wall") {
    tiles[row][col] = makeTile("floor", baseEncounter, 0);
  }
}

function hasFloorNeighbor(tiles: MapTile[][], row: number, col: number, width: number, height: number): boolean {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
      if (tiles[nr][nc].type === "floor" || tiles[nr][nc].type === "exit") return true;
    }
  }
  return false;
}

function randomMid(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffleArr<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
