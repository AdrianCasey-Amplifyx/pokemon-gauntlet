import type { BattlePokemon, MoveData } from "../types.ts";
import { getEffectiveness, isSTAB } from "./typeEffectiveness.ts";

export interface DamageResult {
  damage: number;
  effectiveness: number;
  isStab: boolean;
  isCrit: boolean;
}

/** Convert a stage count (0-2) into a stat multiplier. Each stage = 1.5x. */
export function stageMultiplier(stage: number): number {
  const clamped = Math.max(0, Math.min(2, stage));
  return Math.pow(1.5, clamped);
}

/**
 * Gen-1-ish crit rate. Base = spd / 512 (~6-15% depending on speed).
 * High-crit moves (Slash, Razor Leaf, Karate Chop, Crabhammer) multiply by 8.
 */
function critRate(attacker: BattlePokemon, move: MoveData): number {
  const base = attacker.stats.spd / 512;
  const rate = move.highCrit ? base * 8 : base;
  return Math.max(0, Math.min(1, rate));
}

export interface CalcOptions {
  powerMultiplier?: number; // rollout doubling, etc.
  ignoreCrit?: boolean;     // for fixed-damage / confusion self-hit
}

export function calculateDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: MoveData,
  rng: () => number = Math.random,
  opts: CalcOptions = {}
): DamageResult {
  if (move.power === 0) {
    return { damage: 0, effectiveness: 1, isStab: false, isCrit: false };
  }

  // Pick atk/def based on move category, applying temporary X-item stage boosts
  const atkRaw =
    move.category === "physical" ? attacker.stats.atk : attacker.stats.spc;
  const defRaw =
    move.category === "physical" ? defender.stats.def : defender.stats.spc;
  const atkStage =
    move.category === "physical" ? attacker.battleBoosts.atk : attacker.battleBoosts.spc;
  const defStage =
    move.category === "physical" ? defender.battleBoosts.def : defender.battleBoosts.spc;
  const atk = atkRaw * stageMultiplier(atkStage);
  const def = defRaw * stageMultiplier(defStage);

  const power = move.power * (opts.powerMultiplier ?? 1);

  // Base damage formula (Gen 1 inspired)
  let damage =
    ((2 * attacker.level) / 5 + 2) * power * (atk / def) / 65 + 2;

  // STAB
  const stab = isSTAB(move, attacker.species.types);
  if (stab) {
    damage *= 1.5;
  }

  // Type effectiveness
  const effectiveness = getEffectiveness(move.type, defender.species.types);
  damage *= effectiveness;

  // Critical hit — Gen 1 style: speed-scaled base, 8× for high-crit moves.
  const isCrit = !opts.ignoreCrit && effectiveness > 0 && rng() < critRate(attacker, move);
  if (isCrit) damage *= 2;

  // Random roll: 0.85 - 1.00
  const roll = 0.85 + rng() * 0.15;
  damage *= roll;

  // Floor with minimum of 1 (unless immune)
  damage = Math.floor(damage);
  if (damage < 1 && effectiveness > 0) {
    damage = 1;
  }

  return { damage, effectiveness, isStab: stab, isCrit };
}
