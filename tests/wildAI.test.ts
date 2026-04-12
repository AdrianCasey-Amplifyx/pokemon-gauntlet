import { describe, it, expect } from "vitest";
import { chooseWildAction } from "../src/core/wildAI.ts";
import { createBattlePokemon } from "../src/core/statCalc.ts";
import { getPokemon } from "../src/data/pokemon.ts";

describe("chooseWildAction", () => {
  it("picks super-effective move when available", () => {
    // Fire vs Grass — should pick a fire move
    const ai = createBattlePokemon(getPokemon("charmander"), 20);
    const player = createBattlePokemon(getPokemon("bulbasaur"), 20);

    const choice = chooseWildAction(ai, player, () => 0.5);
    const move = ai.moves[choice];

    // Should pick a fire type move (super effective vs grass)
    const fireMoves = ai.moves.filter((m) => m.type === "fire");
    if (fireMoves.length > 0) {
      expect(move.type).toBe("fire");
    }
  });

  it("picks highest power move when no super-effective available", () => {
    const ai = createBattlePokemon(getPokemon("eevee"), 20);
    const player = createBattlePokemon(getPokemon("charmander"), 20);

    const choice = chooseWildAction(ai, player, () => 0.5);
    const move = ai.moves[choice];

    // Should pick the highest power available move
    const maxPower = Math.max(...ai.moves.filter((m) => m.power > 0).map((m) => m.power));
    expect(move.power).toBe(maxPower);
  });

  it("returns a valid move index", () => {
    const ai = createBattlePokemon(getPokemon("pikachu"), 10);
    const player = createBattlePokemon(getPokemon("geodude"), 10);

    const choice = chooseWildAction(ai, player, () => 0.5);
    expect(choice).toBeGreaterThanOrEqual(0);
    expect(choice).toBeLessThan(ai.moves.length);
  });

  it("always returns an available move", () => {
    const ai = createBattlePokemon(getPokemon("machop"), 15);
    const player = createBattlePokemon(getPokemon("geodude"), 15);

    const choice = chooseWildAction(ai, player, () => 0.5);
    expect(ai.cooldowns[choice]).toBe(0);
  });
});
