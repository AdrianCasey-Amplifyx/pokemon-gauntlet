import type { PokemonType } from "../types.ts";

// Gen 1 type effectiveness chart (15 types)
// Super effective = 2.0, not very effective = 0.5, immune = 0

const superEffective: Partial<Record<PokemonType, PokemonType[]>> = {
  normal: [],
  fire: ["grass", "ice", "bug"],
  water: ["fire", "rock", "ground"],
  grass: ["water", "rock", "ground"],
  electric: ["water", "flying"],
  rock: ["fire", "ice", "flying", "bug"],
  ground: ["fire", "electric", "rock", "poison"],
  psychic: ["poison", "fighting"],
  poison: ["grass", "bug"],
  fighting: ["normal", "rock", "ice"],
  flying: ["grass", "fighting", "bug"],
  bug: ["grass", "psychic", "poison"],
  ghost: ["psychic", "ghost"],
  ice: ["grass", "ground", "flying", "dragon"],
  dragon: ["dragon"],
};

const notVeryEffective: Partial<Record<PokemonType, PokemonType[]>> = {
  normal: ["rock"],
  fire: ["fire", "water", "rock", "dragon"],
  water: ["water", "grass", "dragon"],
  grass: ["fire", "grass", "poison", "flying", "bug", "dragon"],
  electric: ["electric", "grass", "dragon"],
  rock: ["fighting", "ground"],
  ground: ["grass", "bug"],
  psychic: ["psychic"],
  poison: ["poison", "rock", "ground", "ghost"],
  fighting: ["poison", "flying", "psychic", "bug", "ghost"],
  flying: ["electric", "rock"],
  bug: ["fire", "fighting", "flying", "ghost"],
  ghost: [],
  ice: ["fire", "water", "ice"],
  dragon: [],
};

// Build lookup table
const chart = new Map<string, number>();

function key(atk: PokemonType, def: PokemonType): string {
  return `${atk}:${def}`;
}

for (const [atkType, defTypes] of Object.entries(superEffective)) {
  for (const defType of defTypes!) {
    chart.set(key(atkType as PokemonType, defType as PokemonType), 2.0);
  }
}

for (const [atkType, defTypes] of Object.entries(notVeryEffective)) {
  for (const defType of defTypes!) {
    chart.set(key(atkType as PokemonType, defType as PokemonType), 0.5);
  }
}

// Immunities (Gen 1)
chart.set(key("normal", "ghost"), 0);
chart.set(key("ghost", "normal"), 0);
chart.set(key("electric", "ground"), 0);
chart.set(key("ground", "flying"), 0);
chart.set(key("fighting", "ghost"), 0);

export function getTypeMultiplier(
  attackType: PokemonType,
  defenderType: PokemonType
): number {
  return chart.get(key(attackType, defenderType)) ?? 1.0;
}
