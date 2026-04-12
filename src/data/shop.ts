import type { ShopPokemon, ShopItem, BattlePokemon, PokemonSpecies, MoveData } from "../types.ts";
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
  { itemId: "potion", cost: 30, worldRequired: 0 },
  { itemId: "escape_rope", cost: 40, worldRequired: 0 },
  { itemId: "repel", cost: 50, worldRequired: 0 },
  { itemId: "dungeon_map", cost: 75, worldRequired: 0 },
  { itemId: "super_potion", cost: 80, worldRequired: 1 },
  { itemId: "revive", cost: 120, worldRequired: 2 },
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
