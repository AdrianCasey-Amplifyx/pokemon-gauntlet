import type { PokemonType } from "../types.ts";

export const TYPE_COLORS: Record<PokemonType, number> = {
  normal: 0xa8a878,
  fire: 0xf08030,
  water: 0x6890f0,
  grass: 0x78c850,
  electric: 0xf8d030,
  rock: 0xb8a038,
  ground: 0xe0c068,
  psychic: 0xf85888,
  poison: 0xa040a0,
  fighting: 0xc03028,
  flying: 0xa890f0,
  bug: 0xa8b820,
  ghost: 0x705898,
  ice: 0x98d8d8,
  dragon: 0x7038f8,
};

export const TYPE_COLORS_HEX: Record<PokemonType, string> = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  grass: "#78c850",
  electric: "#f8d030",
  rock: "#b8a038",
  ground: "#e0c068",
  psychic: "#f85888",
  poison: "#a040a0",
  fighting: "#c03028",
  flying: "#a890f0",
  bug: "#a8b820",
  ghost: "#705898",
  ice: "#98d8d8",
  dragon: "#7038f8",
};
