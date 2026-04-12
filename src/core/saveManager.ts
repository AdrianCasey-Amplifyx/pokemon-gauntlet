import type { GameState, BattlePokemon, WorldProgress, EggInstance, Stats } from "../types.ts";
import { getPokemon } from "../data/pokemon.ts";
import { getMove } from "../data/moves.ts";
import { ITEMS } from "../data/items.ts";
import { TOTAL_WORLDS } from "../data/worlds.ts";
import { createEgg } from "../data/eggs.ts";
import { applyStatBonuses, calculateAllStats, createBattlePokemon, getMovesForLevel, zeroStats } from "./statCalc.ts";

const SAVE_KEY_PREFIX = "pokemonGauntlet_save_";
const LEGACY_SAVE_KEY = "pokemonGauntlet_save";
const MAX_SLOTS = 3;

let activeSlot: number = 0;

function slotKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

interface SavePokemon {
  speciesId: string;
  level: number;
  currentXP: number;
  currentHP: number;
  moveIds?: string[]; // persisted move choices (optional for backwards compat)
  statBonuses?: Stats; // vitamin bonuses, optional for backwards compat
}

function hasAnyBonus(s: Stats): boolean {
  return s.hp > 0 || s.atk > 0 || s.def > 0 || s.spd > 0 || s.spc > 0;
}

interface SaveData {
  version: number;
  roster: SavePokemon[];
  partyIndices: number[];
  items: { itemId: string; quantity: number }[];
  gold: number;
  seenPokemon: string[];
  worlds: WorldProgress[];
  activeWorld: number;
  eggs?: EggInstance[];
}

function serializePokemon(p: BattlePokemon): SavePokemon {
  const save: SavePokemon = {
    speciesId: p.species.id,
    level: p.level,
    currentXP: p.currentXP,
    currentHP: p.currentHP,
    moveIds: p.moves.map((m) => m.id),
  };
  if (hasAnyBonus(p.statBonuses)) {
    save.statBonuses = { ...p.statBonuses };
  }
  return save;
}

function deserializePokemon(s: SavePokemon): BattlePokemon {
  const species = getPokemon(s.speciesId);
  const statBonuses: Stats = s.statBonuses ? { ...s.statBonuses } : zeroStats();
  const stats = applyStatBonuses(
    calculateAllStats(species.baseStats, s.level),
    statBonuses
  );
  // Use saved moves if available, otherwise fall back to level-based calculation
  const moveIds = s.moveIds && s.moveIds.length > 0
    ? s.moveIds
    : getMovesForLevel(species.movePool, s.level);
  if (moveIds.length === 0) moveIds.push("tackle");
  const moves = moveIds.map((id) => getMove(id));

  return {
    species,
    level: s.level,
    currentXP: s.currentXP ?? 0,
    currentHP: Math.min(s.currentHP, stats.hp),
    maxHP: stats.hp,
    stats,
    moves,
    cooldowns: moves.map(() => 0),
    statusEffects: [],
    statBonuses,
    battleBoosts: { atk: 0, def: 0, spd: 0, spc: 0 },
  };
}

export function setActiveSlot(slot: number): void {
  activeSlot = slot;
}

export function getActiveSlot(): number {
  return activeSlot;
}

export function saveGame(state: GameState): void {
  const data: SaveData = {
    version: 2,
    roster: state.roster.map(serializePokemon),
    partyIndices: state.playerParty.map((p) =>
      state.roster.indexOf(p)
    ).filter((i) => i >= 0),
    items: state.playerItems
      .filter((b) => b.quantity > 0)
      .map((b) => ({ itemId: b.item.id, quantity: b.quantity })),
    gold: state.gold,
    seenPokemon: state.seenPokemon,
    worlds: state.worlds,
    activeWorld: state.activeWorld,
    eggs: state.eggs,
  };

  localStorage.setItem(slotKey(activeSlot), JSON.stringify(data));
}

function loadRawSaveData(key: string): SaveData | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

function buildGameState(data: SaveData): GameState {
  const roster = data.roster.map(deserializePokemon);

  // Heal all on load (returning to town)
  for (const p of roster) {
    p.currentHP = p.maxHP;
  }

  const playerParty = data.partyIndices
    .filter((i) => i >= 0 && i < roster.length)
    .map((i) => roster[i]);

  const playerItems = data.items
    .map((s) => {
      const item = ITEMS[s.itemId];
      if (!item) return null;
      return { item, quantity: s.quantity };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Ensure 8 worlds exist
  const worlds: WorldProgress[] = [];
  for (let i = 0; i < TOTAL_WORLDS; i++) {
    if (data.worlds[i]) {
      worlds.push(data.worlds[i]);
    } else {
      worlds.push({ currentMap: 0, unlocked: i === 0 });
    }
  }

  return {
    roster,
    playerParty,
    playerItems,
    gold: data.gold,
    seenPokemon: data.seenPokemon ?? [],
    worlds,
    activeWorld: data.activeWorld,
    currentMap: null,
    playerX: 0,
    playerY: 0,
    repelSteps: 0,
    eggs: data.eggs ?? [],
  };
}

export function loadGame(): GameState | null {
  const data = loadRawSaveData(slotKey(activeSlot));
  if (!data) return null;
  return buildGameState(data);
}

export function hasSave(): boolean {
  return hasAnySave();
}

export function hasAnySave(): boolean {
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (localStorage.getItem(slotKey(i)) !== null) return true;
  }
  return false;
}

export function hasSlotSave(slot: number): boolean {
  return localStorage.getItem(slotKey(slot)) !== null;
}

export interface SaveSlotInfo {
  slot: number;
  empty: boolean;
  pokemonNames?: string[];
  level?: number;
  gold?: number;
  worldProgress?: number; // highest unlocked world
}

export function getSlotInfo(slot: number): SaveSlotInfo {
  const data = loadRawSaveData(slotKey(slot));
  if (!data) return { slot, empty: true };

  const pokemonNames = data.roster.slice(0, 3).map((p) => {
    try { return getPokemon(p.speciesId).name; } catch { return p.speciesId; }
  });
  const maxLevel = Math.max(...data.roster.map((p) => p.level));
  const highestWorld = data.worlds.filter((w) => w.unlocked).length;

  return {
    slot,
    empty: false,
    pokemonNames,
    level: maxLevel,
    gold: data.gold,
    worldProgress: highestWorld,
  };
}

export function getAllSlotInfo(): SaveSlotInfo[] {
  migrateLegacySave();
  return Array.from({ length: MAX_SLOTS }, (_, i) => getSlotInfo(i));
}

export function deleteSave(): void {
  localStorage.removeItem(slotKey(activeSlot));
}

export function deleteSlotSave(slot: number): void {
  localStorage.removeItem(slotKey(slot));
}

/**
 * Dev helper: add gold directly to a slot's saved state without loading it
 * into the full game-state object. Returns true if the slot existed and was
 * updated, false if the slot was empty or the save was unreadable.
 */
export function addGoldToSlot(slot: number, amount: number): boolean {
  const raw = localStorage.getItem(slotKey(slot));
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as SaveData;
    data.gold = (data.gold ?? 0) + amount;
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Dev helper: build an advanced GameState for manually testing features
 * (notably the egg shop and hatch flow) without playing through early game.
 * Spawns a level-30 evolved-starter party, 5000g, full item belt, worlds 0-2
 * unlocked, and one common + one rare egg already in the bag.
 */
export function createTestGameState(): GameState {
  const charmeleon = createBattlePokemon(getPokemon("charmeleon"), 30);
  const wartortle = createBattlePokemon(getPokemon("wartortle"), 30);
  const ivysaur = createBattlePokemon(getPokemon("ivysaur"), 30);
  const pikachu = createBattlePokemon(getPokemon("pikachu"), 25);
  const pidgeotto = createBattlePokemon(getPokemon("pidgeotto"), 25);

  const roster = [charmeleon, wartortle, ivysaur, pikachu, pidgeotto];
  const playerParty = [charmeleon, wartortle, ivysaur];

  const worlds: WorldProgress[] = Array.from({ length: TOTAL_WORLDS }, (_, i) => ({
    currentMap: 0,
    unlocked: i <= 2,
  }));

  const playerItems = [
    { item: ITEMS.potion, quantity: 5 },
    { item: ITEMS.super_potion, quantity: 3 },
    { item: ITEMS.revive, quantity: 2 },
    { item: ITEMS.escape_rope, quantity: 3 },
    { item: ITEMS.repel, quantity: 2 },
    { item: ITEMS.dungeon_map, quantity: 1 },
  ];

  return {
    roster,
    playerParty,
    playerItems,
    gold: 5000,
    seenPokemon: [
      "charmander", "squirtle", "bulbasaur",
      "pikachu", "pidgey", "pidgeotto",
      "rattata", "caterpie", "weedle",
      "geodude", "zubat", "clefairy",
    ],
    worlds,
    activeWorld: 0,
    currentMap: null,
    playerX: 0,
    playerY: 0,
    repelSteps: 0,
    eggs: [createEgg("common"), createEgg("rare")],
  };
}

/** Migrate old single-key save to slot 0 if it exists */
function migrateLegacySave(): void {
  const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
  if (legacy && !localStorage.getItem(slotKey(0))) {
    localStorage.setItem(slotKey(0), legacy);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  }
}
