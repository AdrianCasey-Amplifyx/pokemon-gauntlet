import { describe, it, expect } from "vitest";
import {
  isMoveAvailable,
  getAvailableMoves,
  useMove,
  tickCooldowns,
} from "../src/core/cooldownManager.ts";
import { createBattlePokemon } from "../src/core/statCalc.ts";
import { getPokemon } from "../src/data/pokemon.ts";

describe("cooldownManager", () => {
  // Use a Pokemon at a level where it has 4 moves
  function makePokemon() {
    return createBattlePokemon(getPokemon("charmander"), 20);
  }

  it("all moves start available", () => {
    const pokemon = makePokemon();
    const available = getAvailableMoves(pokemon);
    expect(available.length).toBe(pokemon.moves.length);
  });

  it("isMoveAvailable returns true for 0 cooldown", () => {
    const pokemon = makePokemon();
    expect(isMoveAvailable(pokemon, 0)).toBe(true);
  });

  it("useMove on CD-0 keeps it always available", () => {
    const pokemon = makePokemon();
    // Find a CD-0 move
    const cd0Idx = pokemon.moves.findIndex((m) => m.cooldown === 0);
    if (cd0Idx >= 0) {
      useMove(pokemon, cd0Idx);
      expect(pokemon.cooldowns[cd0Idx]).toBe(0);
      expect(isMoveAvailable(pokemon, cd0Idx)).toBe(true);
    }
  });

  it("useMove sets cooldown to cd+1 to account for end-of-turn tick", () => {
    const pokemon = makePokemon();
    // Find a move with CD > 0
    const cdIdx = pokemon.moves.findIndex((m) => m.cooldown > 0);
    if (cdIdx >= 0) {
      const cd = pokemon.moves[cdIdx].cooldown;
      useMove(pokemon, cdIdx);
      expect(pokemon.cooldowns[cdIdx]).toBe(cd + 1);
      expect(isMoveAvailable(pokemon, cdIdx)).toBe(false);
    }
  });

  it("CD 1 move: unavailable for 1 turn after use", () => {
    const pokemon = makePokemon();
    const cd1Idx = pokemon.moves.findIndex((m) => m.cooldown === 1);
    if (cd1Idx >= 0) {
      useMove(pokemon, cd1Idx);
      tickCooldowns(pokemon); // end turn 1
      expect(isMoveAvailable(pokemon, cd1Idx)).toBe(false);
      tickCooldowns(pokemon); // end turn 2
      expect(isMoveAvailable(pokemon, cd1Idx)).toBe(true);
    }
  });

  it("tickCooldowns doesn't go below 0", () => {
    const pokemon = makePokemon();
    tickCooldowns(pokemon);
    expect(pokemon.cooldowns[0]).toBe(0);
  });

  it("getAvailableMoves excludes moves on cooldown", () => {
    const pokemon = makePokemon();
    // Put all non-CD-0 moves on cooldown
    pokemon.moves.forEach((m, i) => {
      if (m.cooldown > 0) useMove(pokemon, i);
    });
    const available = getAvailableMoves(pokemon);
    // Only CD-0 moves should remain
    for (const idx of available) {
      expect(pokemon.moves[idx].cooldown).toBe(0);
    }
  });

  it("tickCooldowns decrements all by 1", () => {
    const pokemon = makePokemon();
    const cdIdx = pokemon.moves.findIndex((m) => m.cooldown >= 2);
    if (cdIdx >= 0) {
      useMove(pokemon, cdIdx);
      const before = pokemon.cooldowns[cdIdx];
      tickCooldowns(pokemon);
      expect(pokemon.cooldowns[cdIdx]).toBe(before - 1);
    }
  });
});
