import type { BattlePokemon } from "../types.ts";

export function isMoveAvailable(
  pokemon: BattlePokemon,
  moveIndex: number
): boolean {
  return pokemon.cooldowns[moveIndex] === 0;
}

export function getAvailableMoves(pokemon: BattlePokemon): number[] {
  return pokemon.cooldowns
    .map((cd, i) => (cd === 0 ? i : -1))
    .filter((i) => i >= 0);
}

export function useMove(pokemon: BattlePokemon, moveIndex: number): void {
  const move = pokemon.moves[moveIndex];
  // Add 1 because tickCooldowns runs at end of the same turn,
  // so CD 1 = wait 1 turn, CD 3 = wait 3 turns. CD 0 stays always available.
  pokemon.cooldowns[moveIndex] = move.cooldown > 0 ? move.cooldown + 1 : 0;
}

export function tickCooldowns(pokemon: BattlePokemon): void {
  for (let i = 0; i < pokemon.cooldowns.length; i++) {
    if (pokemon.cooldowns[i] > 0) {
      pokemon.cooldowns[i]--;
    }
  }
}
