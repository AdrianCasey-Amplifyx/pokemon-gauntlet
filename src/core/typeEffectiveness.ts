import type { PokemonType, MoveData } from "../types.ts";
import { getTypeMultiplier } from "../data/typeChart.ts";

export function getEffectiveness(
  attackType: PokemonType,
  defenderTypes: PokemonType[]
): number {
  let multiplier = 1.0;
  for (const defType of defenderTypes) {
    multiplier *= getTypeMultiplier(attackType, defType);
  }
  return multiplier;
}

export function isSTAB(
  move: MoveData,
  attackerTypes: PokemonType[]
): boolean {
  return attackerTypes.includes(move.type);
}
