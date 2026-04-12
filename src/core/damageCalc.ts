import type { BattlePokemon, MoveData } from "../types.ts";
import { getEffectiveness, isSTAB } from "./typeEffectiveness.ts";

export interface DamageResult {
  damage: number;
  effectiveness: number;
  isStab: boolean;
}

export function calculateDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: MoveData,
  rng: () => number = Math.random
): DamageResult {
  if (move.power === 0) {
    return { damage: 0, effectiveness: 1, isStab: false };
  }

  // Pick atk/def based on move category
  const atk =
    move.category === "physical" ? attacker.stats.atk : attacker.stats.spc;
  const def =
    move.category === "physical" ? defender.stats.def : defender.stats.spc;

  // Base damage formula (Gen 1 inspired)
  let damage =
    ((2 * attacker.level) / 5 + 2) * move.power * (atk / def) / 65 + 2;

  // STAB
  const stab = isSTAB(move, attacker.species.types);
  if (stab) {
    damage *= 1.5;
  }

  // Type effectiveness
  const effectiveness = getEffectiveness(move.type, defender.species.types);
  damage *= effectiveness;

  // Random roll: 0.85 - 1.00
  const roll = 0.85 + rng() * 0.15;
  damage *= roll;

  // Floor with minimum of 1 (unless immune)
  damage = Math.floor(damage);
  if (damage < 1 && effectiveness > 0) {
    damage = 1;
  }

  return { damage, effectiveness, isStab: stab };
}
