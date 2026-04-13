import type {
  ItemData,
  BattleItem,
  BattlePokemon,
  Stats,
  StageBoosts,
  PokemonSpecies,
} from "../types.ts";
import { addXP, applyStatBonuses, evolveIntoSpecies, xpToNextLevel } from "../core/statCalc.ts";
import { getStoneEvolution } from "./stoneEvolutions.ts";
import { getMove } from "./moves.ts";

// --- Vitamin config ---

export interface VitaminConfig {
  stat: keyof Stats;
  gain: number;
  cap: number;
}

export const VITAMIN_CONFIG: Record<string, VitaminConfig> = {
  hp_up: { stat: "hp", gain: 5, cap: 25 },
  protein: { stat: "atk", gain: 3, cap: 15 },
  iron: { stat: "def", gain: 3, cap: 15 },
  carbos: { stat: "spd", gain: 3, cap: 15 },
  calcium: { stat: "spc", gain: 3, cap: 15 },
};

// --- Battle item config ---

export interface BattleItemConfig {
  stat: keyof StageBoosts;
}

export const BATTLE_ITEM_CONFIG: Record<string, BattleItemConfig> = {
  x_attack: { stat: "atk" },
  x_defend: { stat: "def" },
  x_speed: { stat: "spd" },
  x_special: { stat: "spc" },
};

export const MAX_BATTLE_STAGES = 2;

// --- Item catalogue ---

export const ITEMS: Record<string, ItemData> = {
  // Medicine
  potion: {
    id: "potion",
    name: "Potion",
    description: "Heals 30 HP.",
    category: "medicine",
    target: "ally",
  },
  super_potion: {
    id: "super_potion",
    name: "Super Potion",
    description: "Heals 60 HP.",
    category: "medicine",
    target: "ally",
  },
  revive: {
    id: "revive",
    name: "Revive",
    description: "Revives a fainted Pokemon at 25% HP.",
    category: "medicine",
    target: "ally",
  },

  // Field
  escape_rope: {
    id: "escape_rope",
    name: "Escape Rope",
    description: "Escape the dungeon safely.",
    category: "field",
    target: "self",
  },
  repel: {
    id: "repel",
    name: "Repel",
    description: "Prevents wild encounters for 20 steps.",
    category: "field",
    target: "self",
  },
  dungeon_map: {
    id: "dungeon_map",
    name: "Map",
    description: "Reveals the entire dungeon layout.",
    category: "field",
    target: "self",
  },

  // Vitamins
  hp_up: {
    id: "hp_up",
    name: "HP Up",
    description: "Permanently raises max HP by 5 (cap +25).",
    category: "vitamin",
    target: "ally",
    param: "hp",
  },
  protein: {
    id: "protein",
    name: "Protein",
    description: "Permanently raises Attack by 3 (cap +15).",
    category: "vitamin",
    target: "ally",
    param: "atk",
  },
  iron: {
    id: "iron",
    name: "Iron",
    description: "Permanently raises Defense by 3 (cap +15).",
    category: "vitamin",
    target: "ally",
    param: "def",
  },
  carbos: {
    id: "carbos",
    name: "Carbos",
    description: "Permanently raises Speed by 3 (cap +15).",
    category: "vitamin",
    target: "ally",
    param: "spd",
  },
  calcium: {
    id: "calcium",
    name: "Calcium",
    description: "Permanently raises Special by 3 (cap +15).",
    category: "vitamin",
    target: "ally",
    param: "spc",
  },

  // Stones
  fire_stone: {
    id: "fire_stone",
    name: "Fire Stone",
    description: "A stone that radiates heat. Evolves certain Pokemon.",
    category: "stone",
    target: "ally",
  },
  water_stone: {
    id: "water_stone",
    name: "Water Stone",
    description: "A stone with a blue, watery glow. Evolves certain Pokemon.",
    category: "stone",
    target: "ally",
  },
  thunder_stone: {
    id: "thunder_stone",
    name: "Thunder Stone",
    description: "A stone charged with electricity. Evolves certain Pokemon.",
    category: "stone",
    target: "ally",
  },
  leaf_stone: {
    id: "leaf_stone",
    name: "Leaf Stone",
    description: "A stone with a leaf pattern. Evolves certain Pokemon.",
    category: "stone",
    target: "ally",
  },
  moon_stone: {
    id: "moon_stone",
    name: "Moon Stone",
    description: "A stone that glows faintly in the moonlight. Evolves certain Pokemon.",
    category: "stone",
    target: "ally",
  },

  // Candy
  rare_candy: {
    id: "rare_candy",
    name: "Rare Candy",
    description: "Raises one Pokemon's level by 1 (capped at highest roster level).",
    category: "candy",
    target: "ally",
  },

  // Battle items
  x_attack: {
    id: "x_attack",
    name: "X Attack",
    description: "Raises Attack by one stage for the rest of the battle.",
    category: "battle",
    target: "ally",
    param: "atk",
  },
  x_defend: {
    id: "x_defend",
    name: "X Defend",
    description: "Raises Defense by one stage for the rest of the battle.",
    category: "battle",
    target: "ally",
    param: "def",
  },
  x_speed: {
    id: "x_speed",
    name: "X Speed",
    description: "Raises Speed by one stage for the rest of the battle.",
    category: "battle",
    target: "ally",
    param: "spd",
  },
  x_special: {
    id: "x_special",
    name: "X Special",
    description: "Raises Special by one stage for the rest of the battle.",
    category: "battle",
    target: "ally",
    param: "spc",
  },

  // TMs (param = moveId to teach)
  tm_headbutt: {
    id: "tm_headbutt", name: "TM Headbutt",
    description: "Teaches Headbutt at the Training Centre.",
    category: "tm", target: "ally", param: "headbutt",
  },
  tm_body_slam: {
    id: "tm_body_slam", name: "TM Body Slam",
    description: "Teaches Body Slam at the Training Centre.",
    category: "tm", target: "ally", param: "body_slam",
  },
  tm_thunderbolt: {
    id: "tm_thunderbolt", name: "TM Thunderbolt",
    description: "Teaches Thunderbolt at the Training Centre.",
    category: "tm", target: "ally", param: "thunderbolt",
  },
  tm_flamethrower: {
    id: "tm_flamethrower", name: "TM Flamethrower",
    description: "Teaches Flamethrower at the Training Centre.",
    category: "tm", target: "ally", param: "flamethrower",
  },
  tm_ice_beam: {
    id: "tm_ice_beam", name: "TM Ice Beam",
    description: "Teaches Ice Beam at the Training Centre.",
    category: "tm", target: "ally", param: "ice_beam",
  },
  tm_psychic: {
    id: "tm_psychic", name: "TM Psychic",
    description: "Teaches Psychic at the Training Centre.",
    category: "tm", target: "ally", param: "psychic",
  },
  tm_earthquake: {
    id: "tm_earthquake", name: "TM Earthquake",
    description: "Teaches Earthquake at the Training Centre.",
    category: "tm", target: "ally", param: "earthquake",
  },
  tm_surf: {
    id: "tm_surf", name: "TM Surf",
    description: "Teaches Surf at the Training Centre.",
    category: "tm", target: "ally", param: "surf",
  },
  tm_shadow_ball: {
    id: "tm_shadow_ball", name: "TM Shadow Ball",
    description: "Teaches Shadow Ball at the Training Centre.",
    category: "tm", target: "ally", param: "shadow_ball",
  },
  tm_hyper_beam: {
    id: "tm_hyper_beam", name: "TM Hyper Beam",
    description: "Teaches Hyper Beam at the Training Centre.",
    category: "tm", target: "ally", param: "hyper_beam",
  },
  tm_fire_blast: {
    id: "tm_fire_blast", name: "TM Fire Blast",
    description: "Teaches Fire Blast at the Training Centre.",
    category: "tm", target: "ally", param: "fire_blast",
  },
  tm_hydro_pump: {
    id: "tm_hydro_pump", name: "TM Hydro Pump",
    description: "Teaches Hydro Pump at the Training Centre.",
    category: "tm", target: "ally", param: "hydro_pump",
  },
  tm_blizzard: {
    id: "tm_blizzard", name: "TM Blizzard",
    description: "Teaches Blizzard at the Training Centre.",
    category: "tm", target: "ally", param: "blizzard",
  },
  tm_thunder: {
    id: "tm_thunder", name: "TM Thunder",
    description: "Teaches Thunder at the Training Centre.",
    category: "tm", target: "ally", param: "thunder",
  },
};

export function getItem(id: string): ItemData {
  const item = ITEMS[id];
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

// --- Apply dispatch ---

export type ApplyResult =
  | { kind: "heal"; healAmount: number }
  | { kind: "revive"; healAmount: number }
  | { kind: "vitamin"; stat: keyof Stats; gained: number }
  | { kind: "evolve"; oldName: string; newSpecies: PokemonSpecies }
  | { kind: "levelup"; newLevel: number }
  | { kind: "boost"; stat: keyof StageBoosts; stages: number }
  | { kind: "fail"; reason: string };

export interface ApplyContext {
  roster?: BattlePokemon[];
}

function applyHeal(amount: number, target: BattlePokemon): ApplyResult {
  if (target.currentHP <= 0) return { kind: "fail", reason: "Fainted" };
  if (target.currentHP >= target.maxHP) return { kind: "fail", reason: "Full HP" };
  const heal = Math.min(amount, target.maxHP - target.currentHP);
  target.currentHP += heal;
  return { kind: "heal", healAmount: heal };
}

function applyRevive(target: BattlePokemon): ApplyResult {
  if (target.currentHP > 0) return { kind: "fail", reason: "Not fainted" };
  const heal = Math.floor(target.maxHP * 0.25);
  target.currentHP = heal;
  return { kind: "revive", healAmount: heal };
}

function applyVitamin(itemId: string, target: BattlePokemon): ApplyResult {
  const cfg = VITAMIN_CONFIG[itemId];
  if (!cfg) return { kind: "fail", reason: "Unknown vitamin" };
  const current = target.statBonuses[cfg.stat];
  if (current >= cfg.cap) return { kind: "fail", reason: "Max reached" };
  const gained = Math.min(cfg.gain, cfg.cap - current);
  target.statBonuses[cfg.stat] = current + gained;

  // Re-apply bonuses onto freshly computed base stats.
  // Done via recompute here to keep items.ts self-contained without importing calculateAllStats.
  // Instead rely on applyStatBonuses to layer the new bonus delta onto existing stats.
  if (cfg.stat === "hp") {
    target.stats = applyStatBonuses(target.stats, { hp: gained, atk: 0, def: 0, spd: 0, spc: 0 });
    target.maxHP = target.stats.hp;
    // HP Up also heals the gained amount (Gen 1 behavior)
    target.currentHP = Math.min(target.maxHP, target.currentHP + gained);
  } else {
    const delta: Stats = { hp: 0, atk: 0, def: 0, spd: 0, spc: 0 };
    delta[cfg.stat] = gained;
    target.stats = applyStatBonuses(target.stats, delta);
  }

  return { kind: "vitamin", stat: cfg.stat, gained };
}

function applyStone(itemId: string, target: BattlePokemon): ApplyResult {
  if (target.currentHP <= 0) return { kind: "fail", reason: "Fainted" };
  const newSpecies = getStoneEvolution(target, itemId);
  if (!newSpecies) return { kind: "fail", reason: "No effect" };
  const oldName = target.species.name;
  evolveIntoSpecies(target, newSpecies);
  return { kind: "evolve", oldName, newSpecies };
}

function applyCandy(target: BattlePokemon, ctx: ApplyContext | undefined): ApplyResult {
  if (target.currentHP <= 0) return { kind: "fail", reason: "Fainted" };
  const roster = ctx?.roster ?? [target];
  const highestLevel = roster.reduce((m, p) => Math.max(m, p.level), 1);
  if (target.level >= highestLevel) {
    return { kind: "fail", reason: "At roster cap" };
  }
  const needed = xpToNextLevel(target.level) - target.currentXP;
  addXP(target, Math.max(1, needed));
  return { kind: "levelup", newLevel: target.level };
}

function applyBattleBoost(itemId: string, target: BattlePokemon): ApplyResult {
  const cfg = BATTLE_ITEM_CONFIG[itemId];
  if (!cfg) return { kind: "fail", reason: "Unknown X item" };
  if (target.currentHP <= 0) return { kind: "fail", reason: "Fainted" };
  const current = target.battleBoosts[cfg.stat];
  if (current >= MAX_BATTLE_STAGES) return { kind: "fail", reason: "Stat is maxed" };
  target.battleBoosts[cfg.stat] = current + 1;
  return { kind: "boost", stat: cfg.stat, stages: target.battleBoosts[cfg.stat] };
}

export function applyItem(
  itemId: string,
  target: BattlePokemon,
  ctx?: ApplyContext
): ApplyResult {
  const item = ITEMS[itemId];
  if (!item) return { kind: "fail", reason: "Unknown item" };

  switch (item.category) {
    case "medicine": {
      if (itemId === "potion") return applyHeal(30, target);
      if (itemId === "super_potion") return applyHeal(60, target);
      if (itemId === "revive") return applyRevive(target);
      return { kind: "fail", reason: "Unknown medicine" };
    }
    case "vitamin":
      return applyVitamin(itemId, target);
    case "stone":
      return applyStone(itemId, target);
    case "candy":
      return applyCandy(target, ctx);
    case "battle":
      return applyBattleBoost(itemId, target);
    case "tm":
      return { kind: "fail", reason: "Use at Training Centre" };
    case "field":
      return { kind: "fail", reason: "Field item" };
    default:
      return { kind: "fail", reason: "Unhandled category" };
  }
}

// --- Starter / gold helpers ---

export function createStarterBelt(): BattleItem[] {
  return [
    { item: ITEMS.potion, quantity: 3 },
    { item: ITEMS.escape_rope, quantity: 1 },
  ];
}

/** Gold reward for winning a battle */
export function getBattleGoldReward(enemyCount: number, worldIndex: number, mapIndex: number): number {
  const base = 15 + worldIndex * 12 + Math.floor(mapIndex / 5) * 5;
  return base * enemyCount + Math.floor(Math.random() * 20);
}

/** Convenience: resolve TM item to the move it teaches. */
export function getTMMove(item: ItemData) {
  if (item.category !== "tm" || !item.param) return null;
  try {
    return getMove(item.param);
  } catch {
    return null;
  }
}
