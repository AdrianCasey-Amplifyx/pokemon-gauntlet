import { describe, it, expect } from "vitest";
import { calculateDamage } from "../src/core/damageCalc.ts";
import { createBattlePokemon } from "../src/core/statCalc.ts";
import { getPokemon } from "../src/data/pokemon.ts";
import { getMove } from "../src/data/moves.ts";

const fixedRng = () => 0.5;

describe("calculateDamage", () => {
  it("calculates basic damage", () => {
    const attacker = createBattlePokemon(getPokemon("charmander"), 10);
    const defender = createBattlePokemon(getPokemon("eevee"), 10);
    const move = getMove("tackle");

    const result = calculateDamage(attacker, defender, move, fixedRng);
    expect(result.damage).toBeGreaterThan(0);
    expect(result.effectiveness).toBe(1.0);
  });

  it("applies STAB bonus", () => {
    const attacker = createBattlePokemon(getPokemon("charmander"), 15);
    const defender = createBattlePokemon(getPokemon("eevee"), 15);

    const noStab = calculateDamage(attacker, defender, getMove("tackle"), fixedRng);
    const withStab = calculateDamage(attacker, defender, getMove("ember"), fixedRng);

    // Ember (fire, STAB for Charmander) should do more relative to its power
    expect(withStab.isStab).toBe(true);
    expect(noStab.isStab).toBe(false);
  });

  it("applies super effective multiplier", () => {
    const attacker = createBattlePokemon(getPokemon("charmander"), 10);
    const grassDef = createBattlePokemon(getPokemon("bulbasaur"), 10);

    const result = calculateDamage(attacker, grassDef, getMove("ember"), fixedRng);
    expect(result.effectiveness).toBe(2.0);
  });

  it("applies not very effective multiplier", () => {
    const attacker = createBattlePokemon(getPokemon("charmander"), 10);
    const defender = createBattlePokemon(getPokemon("squirtle"), 10);

    const result = calculateDamage(attacker, defender, getMove("ember"), fixedRng);
    expect(result.effectiveness).toBe(0.5);
  });

  it("returns 0 damage for 0-power moves", () => {
    const attacker = createBattlePokemon(getPokemon("charmander"), 10);
    const defender = createBattlePokemon(getPokemon("eevee"), 10);
    const zeroMove = { ...getMove("tackle"), power: 0 };

    const result = calculateDamage(attacker, defender, zeroMove, fixedRng);
    expect(result.damage).toBe(0);
  });

  it("minimum damage is 1 (not immune)", () => {
    const attacker = createBattlePokemon(getPokemon("abra"), 5);
    const defender = createBattlePokemon(getPokemon("onix"), 20);

    const result = calculateDamage(attacker, defender, getMove("tackle"), () => 0);
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it("deals 0 damage on immunity", () => {
    const attacker = createBattlePokemon(getPokemon("pikachu"), 10);
    const defender = createBattlePokemon(getPokemon("geodude"), 10);

    const result = calculateDamage(attacker, defender, getMove("thunder_shock"), fixedRng);
    expect(result.damage).toBe(0);
    expect(result.effectiveness).toBe(0);
  });

  it("uses special stats for special moves", () => {
    const attacker = createBattlePokemon(getPokemon("abra"), 15);
    const defender = createBattlePokemon(getPokemon("eevee"), 15);

    const physicalDmg = calculateDamage(attacker, defender, getMove("tackle"), fixedRng);
    const specialDmg = calculateDamage(attacker, defender, getMove("confusion"), fixedRng);

    // Abra has 105 Spc but 20 Atk — special should do much more
    expect(specialDmg.damage).toBeGreaterThan(physicalDmg.damage);
  });
});
