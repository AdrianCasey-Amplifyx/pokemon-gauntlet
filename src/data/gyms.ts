import { getEncounterLevel } from "./worlds.ts";

export interface GymRosterEntry {
  /** Pokemon species id */
  speciesId: string;
  /** Level offset relative to the ace (0 = ace, negative = lower-level grunts) */
  levelOffset: number;
}

export interface GymData {
  /** Gym leader's display name (e.g. "Brock") */
  leader: string;
  /** Gym city, used for narrative flavor (e.g. "Pewter") */
  city: string;
  /** Gym's themed type — also drives the room 20–24 encounter pool */
  type: string;
  /** Canon roster, ordered weakest → ace. Last entry is the ace. */
  roster: GymRosterEntry[];
  /** Encounter pool used for rooms 20–24 (themed to the gym's type). */
  encounterPool: string[];
}

/**
 * Gen 1-accurate gym rosters per world. Levels are computed at runtime to
 * match the player's world progression — only the *relative* level
 * ordering and team composition come from canon (per PRD §4.2).
 */
export const GYMS: GymData[] = [
  // World 0 — Pewter Gym
  {
    leader: "Brock",
    city: "Pewter",
    type: "rock",
    roster: [
      { speciesId: "geodude", levelOffset: -2 },
      { speciesId: "onix",    levelOffset:  0 },
    ],
    encounterPool: ["geodude", "onix"],
  },
  // World 1 — Cerulean Gym
  {
    leader: "Misty",
    city: "Cerulean",
    type: "water",
    roster: [
      { speciesId: "staryu",  levelOffset: -2 },
      { speciesId: "starmie", levelOffset:  0 },
    ],
    encounterPool: ["staryu", "psyduck", "poliwag", "horsea", "goldeen", "shellder", "krabby", "tentacool"],
  },
  // World 2 — Vermilion Gym
  {
    leader: "Lt. Surge",
    city: "Vermilion",
    type: "electric",
    roster: [
      { speciesId: "voltorb", levelOffset: -4 },
      { speciesId: "pikachu", levelOffset: -2 },
      { speciesId: "raichu",  levelOffset:  0 },
    ],
    encounterPool: ["voltorb", "magnemite", "pikachu", "electrode", "magneton"],
  },
  // World 3 — Celadon Gym
  {
    leader: "Erika",
    city: "Celadon",
    type: "grass",
    roster: [
      { speciesId: "victreebel", levelOffset: -4 },
      { speciesId: "tangela",    levelOffset: -2 },
      { speciesId: "vileplume",  levelOffset:  0 },
    ],
    encounterPool: ["bellsprout", "weepinbell", "oddish", "gloom", "exeggcute", "tangela", "bulbasaur"],
  },
  // World 4 — Fuchsia Gym
  {
    leader: "Koga",
    city: "Fuchsia",
    type: "poison",
    roster: [
      { speciesId: "koffing", levelOffset: -6 },
      { speciesId: "muk",     levelOffset: -4 },
      { speciesId: "koffing", levelOffset: -2 },
      { speciesId: "weezing", levelOffset:  0 },
    ],
    encounterPool: ["zubat", "golbat", "ekans", "arbok", "grimer", "muk", "koffing", "venonat", "venomoth"],
  },
  // World 5 — Saffron Gym
  {
    leader: "Sabrina",
    city: "Saffron",
    type: "psychic",
    roster: [
      { speciesId: "kadabra",  levelOffset: -6 },
      { speciesId: "mr_mime",  levelOffset: -4 },
      { speciesId: "venomoth", levelOffset: -2 },
      { speciesId: "alakazam", levelOffset:  0 },
    ],
    encounterPool: ["abra", "kadabra", "drowzee", "hypno", "mr_mime", "slowpoke", "jynx"],
  },
  // World 6 — Cinnabar Gym
  {
    leader: "Blaine",
    city: "Cinnabar",
    type: "fire",
    roster: [
      { speciesId: "growlithe", levelOffset: -6 },
      { speciesId: "ponyta",    levelOffset: -4 },
      { speciesId: "rapidash",  levelOffset: -2 },
      { speciesId: "arcanine",  levelOffset:  0 },
    ],
    encounterPool: ["growlithe", "ponyta", "vulpix", "magmar", "charmander", "rapidash"],
  },
  // World 7 — Viridian Gym (Giovanni's final stand)
  {
    leader: "Giovanni",
    city: "Viridian",
    type: "ground",
    roster: [
      { speciesId: "rhyhorn",   levelOffset: -8 },
      { speciesId: "dugtrio",   levelOffset: -6 },
      { speciesId: "nidoqueen", levelOffset: -4 },
      { speciesId: "nidoking",  levelOffset: -2 },
      { speciesId: "rhydon",    levelOffset:  0 },
    ],
    encounterPool: ["sandshrew", "sandslash", "diglett", "dugtrio", "cubone", "marowak", "rhyhorn", "geodude", "graveler"],
  },
];

/** True when a map is one of the themed pre-gym lead-in rooms (room 20–24). */
export function isGymLeadInRoom(mapIndex: number): boolean {
  return mapIndex >= 19 && mapIndex <= 23;
}

/** True when a map is the gym room itself (room 25). */
export function isGymRoom(mapIndex: number): boolean {
  return mapIndex === 24;
}

export function getGymForWorld(worldIndex: number): GymData {
  return GYMS[worldIndex] ?? GYMS[0];
}

/**
 * Build the gym roster with concrete levels for the given world.
 * The ace level matches the legacy boss-level formula so room 25
 * stays roughly as challenging as it was before the gym swap.
 */
export function getGymRosterLevels(worldIndex: number): { speciesId: string; level: number }[] {
  const gym = getGymForWorld(worldIndex);
  const aceLevel = getEncounterLevel(worldIndex, 24) + 3 + Math.floor(worldIndex / 2);
  return gym.roster.map(({ speciesId, levelOffset }) => ({
    speciesId,
    level: Math.max(2, aceLevel + levelOffset),
  }));
}

/** Pick a random species from the gym-themed lead-in pool. */
export function getRandomGymLeadInSpecies(worldIndex: number): string {
  const gym = getGymForWorld(worldIndex);
  return gym.encounterPool[Math.floor(Math.random() * gym.encounterPool.length)];
}
