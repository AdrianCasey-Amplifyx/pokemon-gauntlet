import type { Stats, PokemonSpecies, BattlePokemon, MovePoolEntry } from "../types.ts";
import { getMove } from "../data/moves.ts";

export function calculateStat(
  base: number,
  level: number,
  isHP: boolean
): number {
  if (isHP) {
    return Math.floor(((base * 2) * level) / 50) + level + 10;
  }
  return Math.floor(((base * 2) * level) / 50) + 5;
}

export function calculateAllStats(baseStats: Stats, level: number): Stats {
  return {
    hp: calculateStat(baseStats.hp, level, true),
    atk: calculateStat(baseStats.atk, level, false),
    def: calculateStat(baseStats.def, level, false),
    spd: calculateStat(baseStats.spd, level, false),
    spc: calculateStat(baseStats.spc, level, false),
  };
}

export function xpToNextLevel(level: number): number {
  // Scaling: early levels are fast, later levels require more XP
  return Math.floor(level * level * 8 + level * 15 + 30);
}

/** XP earned from defeating an enemy Pokemon */
export function xpFromEnemy(enemyLevel: number): number {
  return Math.floor(enemyLevel * 6 + 10 + Math.random() * 8);
}

/** Apply XP to a Pokemon. Returns true if leveled up. */
export function addXP(pokemon: BattlePokemon, amount: number): boolean {
  if (pokemon.currentHP <= 0) return false; // fainted Pokemon don't gain XP

  pokemon.currentXP += amount;
  const needed = xpToNextLevel(pokemon.level);

  if (pokemon.currentXP >= needed) {
    // Level up!
    pokemon.currentXP -= needed;
    pokemon.level++;

    // Recalculate stats
    const oldMaxHP = pokemon.maxHP;
    const newStats = calculateAllStats(pokemon.species.baseStats, pokemon.level);
    pokemon.stats = newStats;
    pokemon.maxHP = newStats.hp;

    // Heal the HP difference from the level up
    const hpGain = newStats.hp - oldMaxHP;
    pokemon.currentHP = Math.min(pokemon.currentHP + hpGain, pokemon.maxHP);

    // Moves are now managed via the Train menu in town — don't auto-replace

    return true;
  }

  return false;
}

/** Get the best 4 moves available at a given level */
export function getMovesForLevel(movePool: MovePoolEntry[], level: number): string[] {
  const available = movePool
    .filter((e) => e.level <= level)
    .sort((a, b) => b.level - a.level); // newest moves first
  // Take up to 4, preferring higher-level moves
  return available.slice(0, 4).map((e) => e.moveId);
}

export function createBattlePokemon(
  species: PokemonSpecies,
  level: number,
  moveIds?: string[]
): BattlePokemon {
  const stats = calculateAllStats(species.baseStats, level);
  const ids = moveIds ?? getMovesForLevel(species.movePool, level);
  if (ids.length === 0) ids.push("tackle"); // fallback
  const moves = ids.map((id) => getMove(id));

  return {
    species,
    level,
    currentXP: 0,
    currentHP: stats.hp,
    maxHP: stats.hp,
    stats,
    moves,
    cooldowns: moves.map(() => 0),
    statusEffects: [],
  };
}
