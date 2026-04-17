export const WORLD_NAMES: string[] = [
  "Viridian Path",
  "Mt. Moon Depths",
  "Cerulean Caves",
  "Vermilion Docks",
  "Celadon Gardens",
  "Saffron Tower",
  "Cinnabar Volcano",
  "Indigo Plateau",
];

export const TOTAL_WORLDS = 8;
export const MAPS_PER_WORLD = 25;

// Pokemon encounter pools per world — follows the classic game progression
export const WORLD_ENCOUNTERS: string[][] = [
  // World 0: Viridian Path — early route Pokemon
  ["pidgey", "rattata", "spearow", "nidoran_f", "nidoran_m", "caterpie", "weedle", "pikachu"],
  // World 1: Mt. Moon Depths — caves and forests
  ["zubat", "geodude", "paras", "clefairy", "sandshrew", "ekans", "oddish", "bellsprout", "mankey"],
  // World 2: Cerulean Caves — water and mixed
  ["psyduck", "goldeen", "poliwag", "tentacool", "staryu", "magikarp", "slowpoke", "shellder", "krabby", "horsea"],
  // World 3: Vermilion Docks — electric and urban
  ["voltorb", "magnemite", "diglett", "meowth", "growlithe", "ponyta", "farfetchd", "doduo", "grimer", "drowzee"],
  // World 4: Celadon Gardens — grass, poison, bug
  ["bulbasaur", "venonat", "tangela", "scyther", "pinsir", "exeggcute", "bellsprout", "oddish", "gloom", "vileplume"],
  // World 5: Saffron Tower — psychic and fighting
  ["abra", "kadabra", "mr_mime", "jynx", "machop", "machoke", "hitmonlee", "hitmonchan", "cubone", "marowak"],
  // World 6: Cinnabar Volcano — fire and fossil
  ["charmander", "vulpix", "growlithe", "magmar", "ponyta", "rapidash", "omanyte", "kabuto", "aerodactyl", "rhyhorn"],
  // World 7: Indigo Plateau — rare and powerful
  ["dratini", "dragonair", "lapras", "snorlax", "eevee", "porygon", "chansey", "tauros", "kangaskhan", "electabuzz"],
];

export function getGridSize(worldIndex: number, mapIndex: number): number {
  const worldBase = 15 + worldIndex;
  const mapBonus = Math.floor(mapIndex / 10);
  return Math.min(worldBase + mapBonus, 20);
}

export function getEncounterLevel(worldIndex: number, mapIndex: number): number {
  const base = 2 + worldIndex * 10;
  const mapScaling = Math.floor(mapIndex / 2);
  return base + mapScaling;
}

export function getEnemyPartySize(worldIndex: number, mapIndex: number): number {
  if (worldIndex === 0 && mapIndex < 10) return 1;
  const base = 1 + Math.floor(worldIndex / 2);
  const bonus = mapIndex >= 20 ? 1 : 0;
  return Math.min(base + bonus, 6);
}

export function getEncounterRate(_worldIndex: number, _mapIndex: number): number {
  return 0.15;
}

/** Get a random Pokemon species ID for an encounter in this world */
export function getRandomEncounterSpecies(worldIndex: number): string {
  const pool = WORLD_ENCOUNTERS[worldIndex] ?? WORLD_ENCOUNTERS[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- Boss Battles ---

/** Rooms that have a boss battle before the exit (1-indexed room numbers) */
export const BOSS_ROOMS = [5, 10, 15, 20, 25];

/** Check if a given map index (0-indexed) is a boss room */
export function isBossRoom(mapIndex: number): boolean {
  return BOSS_ROOMS.includes(mapIndex + 1);
}

/**
 * Boss Pokemon per world — special/rare Pokemon NOT from the area's encounter pool.
 * Each world has a pool of bosses; one is picked randomly.
 */
export const WORLD_BOSSES: string[][] = [
  // World 0: Viridian Path — surprising finds in the early routes
  ["jigglypuff", "clefairy", "abra", "gastly", "scyther"],
  // World 1: Mt. Moon Depths — unusual cave dwellers
  ["onix", "lapras", "kangaskhan", "snorlax", "chansey"],
  // World 2: Cerulean Caves — rare aquatic Pokemon
  ["gyarados", "dewgong", "starmie", "vaporeon", "cloyster"],
  // World 3: Vermilion Docks — powerful visitors
  ["jolteon", "raichu", "electrode", "magneton", "arcanine"],
  // World 4: Celadon Gardens — evolved jungle beasts
  ["venusaur", "victreebel", "venomoth", "parasect", "exeggutor"],
  // World 5: Saffron Tower — psychic powerhouses
  ["alakazam", "hypno", "gengar", "machamp", "mr_mime"],
  // World 6: Cinnabar Volcano — fire legends and fossils
  ["charizard", "ninetales", "flareon", "omastar", "kabutops"],
  // World 7: Indigo Plateau — legendary tier
  ["dragonite", "articuno", "zapdos", "moltres", "mewtwo"],
];

/** Get a random boss species for a world */
export function getBossSpecies(worldIndex: number): string {
  const pool = WORLD_BOSSES[worldIndex] ?? WORLD_BOSSES[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Boss level is higher than regular encounters for that room */
export function getBossLevel(worldIndex: number, mapIndex: number): number {
  const baseLevel = getEncounterLevel(worldIndex, mapIndex);
  return baseLevel + 3 + Math.floor(worldIndex / 2);
}

// --- Music selection ---

import type { TrackId } from "../audio/tracks.ts";
import { WORLD_TRACKS } from "../audio/tracks.ts";

/** Music track id for the MapScene of a given world. */
export function trackForWorld(worldIndex: number): TrackId {
  return WORLD_TRACKS[worldIndex] ?? WORLD_TRACKS[0];
}

/**
 * Music track id for a battle. World 7 (Indigo Plateau) uses the
 * dedicated climactic theme for every fight; elsewhere, boss rooms
 * swap to the intense variant and regular rooms use the wild theme.
 */
export function trackForBattle(worldIndex: number, isBoss: boolean): TrackId {
  if (worldIndex >= 7) return "battle_final";
  return isBoss ? "battle_boss" : "battle_wild";
}
