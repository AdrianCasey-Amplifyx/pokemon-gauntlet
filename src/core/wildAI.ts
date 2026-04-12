import type { BattlePokemon } from "../types.ts";
import { getAvailableMoves } from "./cooldownManager.ts";
import { getEffectiveness } from "./typeEffectiveness.ts";

export function chooseWildAction(
  aiPokemon: BattlePokemon,
  playerPokemon: BattlePokemon,
  rng: () => number = Math.random
): number {
  const available = getAvailableMoves(aiPokemon);

  if (available.length === 0) {
    // Shouldn't happen since every Pokemon has a CD-0 move, but fallback
    return 0;
  }

  if (available.length === 1) {
    return available[0];
  }

  // Separate status moves (power 0) from damage moves
  const damageMoves = available.filter((i) => aiPokemon.moves[i].power > 0);
  const statusMoves = available.filter((i) => aiPokemon.moves[i].power === 0);

  // 10% chance to use a status move if one is available
  if (statusMoves.length > 0 && rng() < 0.1) {
    return statusMoves[Math.floor(rng() * statusMoves.length)];
  }

  if (damageMoves.length === 0) {
    // Only status moves available — pick randomly
    return available[Math.floor(rng() * available.length)];
  }

  // Find super-effective moves
  const superEffective = damageMoves.filter((i) => {
    const move = aiPokemon.moves[i];
    return getEffectiveness(move.type, playerPokemon.species.types) > 1;
  });

  // If any super-effective, pick the highest power among them
  if (superEffective.length > 0) {
    return pickHighestPower(aiPokemon, superEffective);
  }

  // Otherwise pick highest power available damage move
  return pickHighestPower(aiPokemon, damageMoves);
}

function pickHighestPower(
  pokemon: BattlePokemon,
  moveIndices: number[]
): number {
  let best = moveIndices[0];
  let bestPower = pokemon.moves[best].power;

  for (let i = 1; i < moveIndices.length; i++) {
    const idx = moveIndices[i];
    const power = pokemon.moves[idx].power;
    if (power > bestPower) {
      best = idx;
      bestPower = power;
    }
  }

  return best;
}
