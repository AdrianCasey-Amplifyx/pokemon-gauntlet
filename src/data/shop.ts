import type { ShopPokemon, ShopItem, BattlePokemon, PokemonSpecies, MoveData, Stats } from "../types.ts";
import { getPokemon, POKEMON } from "./pokemon.ts";
import { getMove } from "./moves.ts";

/** Price based on rarity + base stat total */
function getPokemonCost(species: PokemonSpecies): number {
  const s = species.baseStats;
  const bst = s.hp + s.atk + s.def + s.spd + s.spc;
  const rarityMult = species.rarity === "rare" ? 3 : species.rarity === "uncommon" ? 1.5 : 1;
  return Math.floor((bst / 3 + 30) * rarityMult);
}

// Items available, gated by world progress
export const SHOP_ITEMS_SCALED: (ShopItem & { worldRequired: number })[] = [
  // Medicine
  { itemId: "potion", cost: 30, worldRequired: 0 },
  { itemId: "super_potion", cost: 80, worldRequired: 1 },
  { itemId: "revive", cost: 120, worldRequired: 2 },

  // Field
  { itemId: "escape_rope", cost: 40, worldRequired: 0 },
  { itemId: "repel", cost: 50, worldRequired: 0 },
  { itemId: "dungeon_map", cost: 75, worldRequired: 0 },

  // Battle items
  { itemId: "x_attack", cost: 100, worldRequired: 1 },
  { itemId: "x_defend", cost: 100, worldRequired: 1 },
  { itemId: "x_speed", cost: 100, worldRequired: 1 },
  { itemId: "x_special", cost: 120, worldRequired: 1 },

  // Vitamins
  { itemId: "hp_up", cost: 400, worldRequired: 1 },
  { itemId: "protein", cost: 400, worldRequired: 1 },
  { itemId: "iron", cost: 400, worldRequired: 1 },
  { itemId: "carbos", cost: 400, worldRequired: 1 },
  { itemId: "calcium", cost: 400, worldRequired: 1 },

  // Candy
  { itemId: "rare_candy", cost: 700, worldRequired: 2 },

  // Stones
  { itemId: "fire_stone", cost: 500, worldRequired: 2 },
  { itemId: "water_stone", cost: 500, worldRequired: 2 },
  { itemId: "thunder_stone", cost: 500, worldRequired: 2 },
  { itemId: "leaf_stone", cost: 500, worldRequired: 2 },
  { itemId: "moon_stone", cost: 600, worldRequired: 3 },

  // TMs
  { itemId: "tm_headbutt", cost: 250, worldRequired: 0 },
  { itemId: "tm_body_slam", cost: 350, worldRequired: 0 },
  { itemId: "tm_surf", cost: 800, worldRequired: 2 },
  { itemId: "tm_shadow_ball", cost: 800, worldRequired: 3 },
  { itemId: "tm_thunderbolt", cost: 900, worldRequired: 2 },
  { itemId: "tm_flamethrower", cost: 900, worldRequired: 2 },
  { itemId: "tm_ice_beam", cost: 900, worldRequired: 2 },
  { itemId: "tm_psychic", cost: 900, worldRequired: 3 },
  { itemId: "tm_earthquake", cost: 1000, worldRequired: 3 },
  { itemId: "tm_fire_blast", cost: 1200, worldRequired: 4 },
  { itemId: "tm_hydro_pump", cost: 1200, worldRequired: 4 },
  { itemId: "tm_blizzard", cost: 1200, worldRequired: 4 },
  { itemId: "tm_thunder", cost: 1200, worldRequired: 4 },
  { itemId: "tm_hyper_beam", cost: 1500, worldRequired: 4 },
];

/** Get Pokemon available in shop — must have been SEEN in battle and not already owned */
export function getAvailableShopPokemon(
  seenPokemon: string[],
  roster: BattlePokemon[]
): ShopPokemon[] {
  return seenPokemon
    .filter((id) => !roster.some((r) => r.species.id === id))
    .map((id) => {
      try {
        const species = getPokemon(id);
        return { speciesId: id, cost: getPokemonCost(species) };
      } catch {
        return null;
      }
    })
    .filter((x): x is ShopPokemon => x !== null);
}

export function getAvailableShopItems(
  worldsUnlocked: number
): (ShopItem & { worldRequired: number })[] {
  return SHOP_ITEMS_SCALED.filter((i) => i.worldRequired < worldsUnlocked);
}

export function getWorldsUnlocked(worlds: { unlocked: boolean }[]): number {
  return worlds.filter((w) => w.unlocked).length;
}

// --- Move Training ---

/** Price to learn a move, based on power and learn level */
export function getMoveCost(move: MoveData, learnLevel: number): number {
  const baseCost = 15;
  const powerComponent = Math.floor(move.power / 5);
  const levelComponent = learnLevel * 2;
  return baseCost + powerComponent + levelComponent;
}

/** Get moves available to learn at the Train shop for a given Pokemon */
export function getTrainableMoves(pokemon: BattlePokemon): { moveId: string; move: MoveData; level: number; cost: number; known: boolean }[] {
  const knownIds = new Set(pokemon.moves.map((m) => m.id));

  return pokemon.species.movePool
    .filter((entry) => entry.level <= pokemon.level)
    .map((entry) => {
      const move = getMove(entry.moveId);
      return {
        moveId: entry.moveId,
        move,
        level: entry.level,
        cost: getMoveCost(move, entry.level),
        known: knownIds.has(entry.moveId),
      };
    })
    .sort((a, b) => a.level - b.level);
}

// --- Evolution ---

/** Build reverse lookup: pre-evolution ID -> { evolvedSpecies, requiredLevel } */
function buildEvolutionMap(): Map<string, { speciesId: string; level: number }> {
  const map = new Map<string, { speciesId: string; level: number }>();
  for (const species of Object.values(POKEMON)) {
    if (species.evolvesFrom && species.evolutionLevel) {
      map.set(species.evolvesFrom, { speciesId: species.id, level: species.evolutionLevel });
    }
  }
  return map;
}

const EVOLUTION_MAP = buildEvolutionMap();

export interface EvolutionInfo {
  evolvedSpecies: PokemonSpecies;
  requiredLevel: number;
  cost: number;
  canEvolve: boolean; // meets level requirement
}

/** Get evolution info for a Pokemon, or null if it can't evolve */
export function getEvolutionInfo(pokemon: BattlePokemon): EvolutionInfo | null {
  const entry = EVOLUTION_MAP.get(pokemon.species.id);
  if (!entry) return null;

  const evolvedSpecies = getPokemon(entry.speciesId);
  const cost = getEvolutionCost(evolvedSpecies);

  return {
    evolvedSpecies,
    requiredLevel: entry.level,
    cost,
    canEvolve: pokemon.level >= entry.level,
  };
}

/** Evolution cost based on the evolved species' base stat total and rarity */
function getEvolutionCost(species: PokemonSpecies): number {
  const s = species.baseStats;
  const bst = s.hp + s.atk + s.def + s.spd + s.spc;
  const rarityMult = species.rarity === "rare" ? 2 : species.rarity === "uncommon" ? 1.5 : 1;
  return Math.floor((bst / 4 + 20) * rarityMult);
}

// --- Vitamins ---

const VITAMIN_CAPS: Record<keyof Stats, number> = {
  hp: 25,
  atk: 15,
  def: 15,
  spd: 15,
  spc: 15,
};

/** True if the pokemon is below the cap for that vitamin stat. */
export function canUseVitamin(pokemon: BattlePokemon, stat: keyof Stats): boolean {
  return pokemon.statBonuses[stat] < VITAMIN_CAPS[stat];
}

// --- TMs ---

export interface TMCheckResult {
  ok: boolean;
  reason?: "already_knows" | "type_mismatch" | "unknown_move";
  label?: string; // short label for UI disabled state
}

/**
 * TMs are type-matched only: the pokemon must share at least one type with
 * the move's type. Also must not already know the move.
 */
export function canUseTM(pokemon: BattlePokemon, moveId: string): TMCheckResult {
  let move: MoveData;
  try {
    move = getMove(moveId);
  } catch {
    return { ok: false, reason: "unknown_move", label: "Unknown" };
  }

  if (pokemon.moves.some((m) => m.id === moveId)) {
    return { ok: false, reason: "already_knows", label: "Already knows" };
  }

  if (!pokemon.species.types.includes(move.type)) {
    return { ok: false, reason: "type_mismatch", label: "Type mismatch" };
  }

  return { ok: true };
}

// --- Rare Candy ---

/** Returns the max level a Rare Candy can take a pokemon to (highest in roster). */
export function rareCandyCap(roster: BattlePokemon[]): number {
  return roster.reduce((m, p) => Math.max(m, p.level), 1);
}

/** True if Rare Candy would actually level this pokemon up without exceeding the cap. */
export function canUseRareCandy(pokemon: BattlePokemon, roster: BattlePokemon[]): boolean {
  if (pokemon.currentHP <= 0) return false;
  return pokemon.level < rareCandyCap(roster);
}
