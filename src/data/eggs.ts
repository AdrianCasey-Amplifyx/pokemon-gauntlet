import type { BattlePokemon, EggInstance, EggTier } from "../types.ts";

export interface EggTierData {
  tier: EggTier;
  name: string;
  cost: number;
  stepsToHatch: number;
  pool: string[];
  color: number;
  description: string;
  spriteKey: string;
}

const COMMON_POOL: string[] = [
  "caterpie", "weedle", "pidgey", "rattata", "spearow", "ekans", "pikachu",
  "sandshrew", "nidoran_f", "nidoran_m", "clefairy", "vulpix", "jigglypuff",
  "zubat", "oddish", "paras", "venonat", "diglett", "meowth", "psyduck",
  "mankey", "growlithe", "poliwag", "abra", "machop", "bellsprout",
  "tentacool", "geodude", "ponyta", "slowpoke", "magnemite", "doduo",
  "seel", "grimer", "shellder", "gastly", "onix", "drowzee", "krabby",
  "voltorb", "exeggcute", "cubone", "koffing", "rhyhorn", "horsea",
  "goldeen", "staryu", "magikarp",
];

const RARE_POOL: string[] = [
  "bulbasaur", "charmander", "squirtle", "eevee", "dratini", "kangaskhan",
  "lapras", "snorlax", "aerodactyl", "porygon", "omanyte", "kabuto",
  "chansey", "scyther", "pinsir", "tauros", "hitmonlee", "hitmonchan",
  "lickitung", "tangela", "jynx", "electabuzz", "magmar", "mr_mime",
  "farfetchd", "ditto",
];

const LEGENDARY_POOL: string[] = [
  "articuno", "zapdos", "moltres", "mewtwo", "mew",
];

export const EGG_TIERS: Record<EggTier, EggTierData> = {
  common: {
    tier: "common",
    name: "Common Egg",
    cost: 250,
    stepsToHatch: 50,
    pool: COMMON_POOL,
    color: 0x88aa55,
    description: "Hatches a common Pokemon after 50 steps.",
    spriteKey: "egg_common",
  },
  rare: {
    tier: "rare",
    name: "Rare Egg",
    cost: 750,
    stepsToHatch: 150,
    pool: RARE_POOL,
    color: 0x4488cc,
    description: "Hatches a rare Pokemon after 150 steps.",
    spriteKey: "egg_rare",
  },
  legendary: {
    tier: "legendary",
    name: "Legendary Egg",
    cost: 2000,
    stepsToHatch: 400,
    pool: LEGENDARY_POOL,
    color: 0xcc8822,
    description: "Hatches a legendary Pokemon after 400 steps.",
    spriteKey: "egg_legendary",
  },
};

export function getAllEggTiers(): EggTierData[] {
  return [EGG_TIERS.common, EGG_TIERS.rare, EGG_TIERS.legendary];
}

/** Pick a random species from the tier's pool using the supplied RNG (defaults to Math.random). */
export function rollEggSpecies(tier: EggTier, rng: () => number = Math.random): string {
  const pool = EGG_TIERS[tier].pool;
  const idx = Math.floor(rng() * pool.length);
  return pool[idx];
}

/** Hatch level = floor(avg level of top 3 roster Pokemon by level), minimum 5. */
export function calculateHatchLevel(roster: BattlePokemon[]): number {
  if (roster.length === 0) return 5;
  const sorted = [...roster].sort((a, b) => b.level - a.level);
  const top = sorted.slice(0, 3);
  const sum = top.reduce((acc, p) => acc + p.level, 0);
  const avg = Math.floor(sum / top.length);
  return Math.max(5, avg);
}

let eggCounter = 0;
function makeEggId(): string {
  eggCounter += 1;
  return `egg_${Date.now()}_${eggCounter}`;
}

export function createEgg(tier: EggTier, rng: () => number = Math.random): EggInstance {
  const data = EGG_TIERS[tier];
  return {
    id: makeEggId(),
    tier,
    speciesId: rollEggSpecies(tier, rng),
    stepsRemaining: data.stepsToHatch,
  };
}

/**
 * Decrement stepsRemaining on every egg in-place. Returns the first egg that
 * reached 0 (ready to hatch), or null if none are ready. Caller removes the
 * hatched egg after handling.
 */
export function tickEggs(eggs: EggInstance[]): EggInstance | null {
  let hatched: EggInstance | null = null;
  for (const egg of eggs) {
    if (egg.stepsRemaining > 0) {
      egg.stepsRemaining -= 1;
    }
    if (egg.stepsRemaining === 0 && hatched === null) {
      hatched = egg;
    }
  }
  return hatched;
}
