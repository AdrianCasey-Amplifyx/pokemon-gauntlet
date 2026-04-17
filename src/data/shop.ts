import type { ShopPokemon, ShopItem, BattlePokemon, PokemonSpecies, MoveData, Stats } from "../types.ts";
import { getPokemon, POKEMON } from "./pokemon.ts";
import { getMove } from "./moves.ts";
import { canLearnTM } from "./tmCompatibility.ts";

/** Base price based on rarity + base stat total (at the starter level of 5). */
function getPokemonBaseCost(species: PokemonSpecies): number {
  const s = species.baseStats;
  const bst = s.hp + s.atk + s.def + s.spd + s.spc;
  const rarityMult = species.rarity === "rare" ? 3 : species.rarity === "uncommon" ? 1.5 : 1;
  return Math.floor((bst / 3 + 30) * rarityMult);
}

/** The minimum level a Pokemon can be purchased at. */
export const SHOP_POKEMON_MIN_LEVEL = 5;

/**
 * Full purchase cost scaled for buying a Pokemon at `level`. Costs grow
 * linearly with level above the baseline (level 5 = 1x, level 10 = 2x,
 * level 20 = 4x, etc) so late-game roster top-ups feel meaningful.
 */
export function getPokemonPurchaseCost(species: PokemonSpecies, level: number): number {
  const base = getPokemonBaseCost(species);
  const effectiveLevel = Math.max(level, SHOP_POKEMON_MIN_LEVEL);
  const mult = effectiveLevel / SHOP_POKEMON_MIN_LEVEL;
  return Math.max(1, Math.floor(base * mult));
}

/**
 * Sell-back value is half the purchase cost at the Pokemon's current level —
 * so selling a level-20 species you bought for 200g nets 100g.
 */
export function getPokemonSellValue(species: PokemonSpecies, level: number): number {
  return Math.max(1, Math.floor(getPokemonPurchaseCost(species, level) / 2));
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

/**
 * Get Pokemon available in shop — any species the player has SEEN in battle
 * is for sale, even if they already own one. Each entry is sold at the
 * highest level the player has encountered that species at (minimum
 * `SHOP_POKEMON_MIN_LEVEL`), and the cost scales accordingly.
 */
export function getAvailableShopPokemon(
  seenPokemon: Record<string, number>
): ShopPokemon[] {
  const entries: ShopPokemon[] = [];
  for (const [id, seenLevel] of Object.entries(seenPokemon)) {
    try {
      const species = getPokemon(id);
      const level = Math.max(seenLevel, SHOP_POKEMON_MIN_LEVEL);
      entries.push({
        speciesId: id,
        level,
        cost: getPokemonPurchaseCost(species, level),
      });
    } catch {
      // unknown species id — skip
    }
  }
  return entries;
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

export interface TrainableMoveEntry {
  moveId: string;
  move: MoveData;
  level: number;
  cost: number;
  known: boolean;
  /** True when this move is in the player's forgotten bucket (relearn free). */
  forgotten: boolean;
}

/**
 * Get moves available to learn at the Train shop for a given Pokemon. The
 * return shape tags each entry with `known` (already in the pokemon's
 * moveset) and `forgotten` (in the forgotten-bucket, relearnable free).
 * A move is only genuinely "new" when both flags are false.
 */
export function getTrainableMoves(pokemon: BattlePokemon): TrainableMoveEntry[] {
  const knownIds = new Set(pokemon.moves.map((m) => m.id));
  const forgottenIds = new Set(pokemon.forgottenMoves ?? []);

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
        forgotten: forgottenIds.has(entry.moveId) && !knownIds.has(entry.moveId),
      };
    })
    .sort((a, b) => a.level - b.level);
}

/**
 * Count of genuinely-new moves the player has not yet learned and has not
 * already forgotten. Drives the "N new" badge on the Train roster.
 */
export function countNewMoves(pokemon: BattlePokemon): number {
  return getTrainableMoves(pokemon).filter((t) => !t.known && !t.forgotten).length;
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

/**
 * Reverse lookup for stone-based evolutions. Keys are the pre-evolution
 * species id — value is the species the player will get when they apply
 * the right stone. Used by the Train screen to show an informative
 * "Evolves to {Target} with a special item" hint without naming the
 * stone (discovery intact).
 */
function buildStoneEvolutionTargets(): Map<string, PokemonSpecies> {
  const map = new Map<string, PokemonSpecies>();
  for (const species of Object.values(POKEMON)) {
    if (species.evolvesFrom && species.evolutionStone && !map.has(species.evolvesFrom)) {
      map.set(species.evolvesFrom, species);
    }
  }
  return map;
}

const STONE_TARGETS = buildStoneEvolutionTargets();

/**
 * Target species a Pokemon will evolve into with a stone (any branch), or
 * null when the species has no stone evolution. For split-branch species
 * like Eevee this returns the first branch discovered in the POKEMON map —
 * callers should treat the label as generic (no stone name reveal).
 */
export function getStoneEvolutionTarget(pokemon: BattlePokemon): PokemonSpecies | null {
  return STONE_TARGETS.get(pokemon.species.id) ?? null;
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
  reason?: "already_knows" | "incompatible" | "unknown_move";
  label?: string; // short label for UI disabled state
}

/**
 * Gen 1 Bulbapedia per-species TM compatibility. A Pokemon can learn a TM
 * if its species is in that TM's compatibility list (see
 * `src/data/tmCompatibility.ts`). This replaces the earlier
 * "shared-type" heuristic, which wrongly rejected cross-type TMs like
 * Body Slam on Clefairy or Ice Beam on Lapras's siblings.
 */
export function canUseTM(pokemon: BattlePokemon, tmItemId: string, moveId: string): TMCheckResult {
  try {
    getMove(moveId);
  } catch {
    return { ok: false, reason: "unknown_move", label: "Unknown" };
  }

  if (pokemon.moves.some((m) => m.id === moveId)) {
    return { ok: false, reason: "already_knows", label: "Already knows" };
  }

  if (!canLearnTM(pokemon.species.id, tmItemId)) {
    return { ok: false, reason: "incompatible", label: "Can't learn" };
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
