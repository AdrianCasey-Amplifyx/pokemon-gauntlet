import type { BattlePokemon, PokemonSpecies } from "../types.ts";
import { POKEMON } from "./pokemon.ts";

interface StoneEvolution {
  from: string;
  stone: string;
  to: PokemonSpecies;
}

function buildStoneEvolutions(): StoneEvolution[] {
  const list: StoneEvolution[] = [];
  for (const species of Object.values(POKEMON)) {
    if (species.evolvesFrom && species.evolutionStone) {
      list.push({ from: species.evolvesFrom, stone: species.evolutionStone, to: species });
    }
  }
  return list;
}

const STONE_EVOLUTIONS = buildStoneEvolutions();

/** Return the species a Pokemon will evolve into when given this stone, or null. */
export function getStoneEvolution(
  pokemon: BattlePokemon,
  stoneId: string
): PokemonSpecies | null {
  const entry = STONE_EVOLUTIONS.find(
    (e) => e.from === pokemon.species.id && e.stone === stoneId
  );
  return entry?.to ?? null;
}

/** All stone evolutions available in the game. */
export function listStoneEvolutions(): ReadonlyArray<StoneEvolution> {
  return STONE_EVOLUTIONS;
}
