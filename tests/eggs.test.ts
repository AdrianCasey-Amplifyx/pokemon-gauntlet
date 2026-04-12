import { describe, it, expect } from "vitest";
import {
  EGG_TIERS,
  getAllEggTiers,
  rollEggSpecies,
  calculateHatchLevel,
  createEgg,
  tickEggs,
} from "../src/data/eggs.ts";
import { createBattlePokemon } from "../src/core/statCalc.ts";
import { getPokemon, POKEMON } from "../src/data/pokemon.ts";
import type { EggInstance } from "../src/types.ts";

describe("EGG_TIERS", () => {
  it("defines all three tiers with expected costs and steps", () => {
    expect(EGG_TIERS.common.cost).toBe(250);
    expect(EGG_TIERS.rare.cost).toBe(750);
    expect(EGG_TIERS.legendary.cost).toBe(2000);
    expect(EGG_TIERS.common.stepsToHatch).toBe(50);
    expect(EGG_TIERS.rare.stepsToHatch).toBe(150);
    expect(EGG_TIERS.legendary.stepsToHatch).toBe(400);
  });

  it("pools only reference species that exist in POKEMON", () => {
    for (const tier of getAllEggTiers()) {
      for (const id of tier.pool) {
        expect(POKEMON[id], `species ${id} in ${tier.tier} pool`).toBeDefined();
      }
    }
  });

  it("legendary pool contains the expected birds and mewtwo", () => {
    const pool = EGG_TIERS.legendary.pool;
    expect(pool).toContain("articuno");
    expect(pool).toContain("zapdos");
    expect(pool).toContain("moltres");
    expect(pool).toContain("mewtwo");
  });

  it("rare pool contains starters, eevee, dratini, kangaskhan", () => {
    const pool = EGG_TIERS.rare.pool;
    expect(pool).toContain("bulbasaur");
    expect(pool).toContain("charmander");
    expect(pool).toContain("squirtle");
    expect(pool).toContain("eevee");
    expect(pool).toContain("dratini");
    expect(pool).toContain("kangaskhan");
  });

  it("excludes stone-evolved forms from all pools", () => {
    const allIds = new Set<string>();
    for (const tier of getAllEggTiers()) {
      for (const id of tier.pool) allIds.add(id);
    }
    // Stone evos that should NOT be reachable via eggs
    const excluded = [
      "raichu", "nidoqueen", "nidoking", "clefable", "ninetales", "wigglytuff",
      "vileplume", "persian", "arcanine", "alakazam", "machamp", "poliwrath",
      "victreebel", "golem", "cloyster", "gengar", "starmie", "exeggutor",
      "vaporeon", "jolteon", "flareon",
    ];
    for (const id of excluded) {
      expect(allIds.has(id), `${id} should be excluded`).toBe(false);
    }
  });
});

describe("rollEggSpecies", () => {
  it("returns a member of the tier pool", () => {
    for (let i = 0; i < 20; i++) {
      const rng = () => i / 20;
      const id = rollEggSpecies("common", rng);
      expect(EGG_TIERS.common.pool).toContain(id);
    }
  });

  it("deterministic given same rng output", () => {
    const id1 = rollEggSpecies("legendary", () => 0);
    const id2 = rollEggSpecies("legendary", () => 0);
    expect(id1).toBe(id2);
    expect(EGG_TIERS.legendary.pool).toContain(id1);
  });

  it("hits every species in the pool given different rng values", () => {
    const pool = EGG_TIERS.legendary.pool;
    const seen = new Set<string>();
    for (let i = 0; i < pool.length; i++) {
      const rng = () => i / pool.length;
      seen.add(rollEggSpecies("legendary", rng));
    }
    expect(seen.size).toBe(pool.length);
  });
});

describe("calculateHatchLevel", () => {
  it("returns 5 for empty roster", () => {
    expect(calculateHatchLevel([])).toBe(5);
  });

  it("clamps to minimum of 5", () => {
    const roster = [createBattlePokemon(getPokemon("pidgey"), 3)];
    expect(calculateHatchLevel(roster)).toBe(5);
  });

  it("uses single Pokemon's level when above 5", () => {
    const roster = [createBattlePokemon(getPokemon("pidgey"), 10)];
    expect(calculateHatchLevel(roster)).toBe(10);
  });

  it("averages top 3 by level, descending", () => {
    const roster = [
      createBattlePokemon(getPokemon("pidgey"), 5),
      createBattlePokemon(getPokemon("rattata"), 8),
      createBattlePokemon(getPokemon("pikachu"), 20),
      createBattlePokemon(getPokemon("bulbasaur"), 12),
      createBattlePokemon(getPokemon("charmander"), 15),
    ];
    // top 3 levels: 20, 15, 12 -> avg 15.66 -> floor 15
    expect(calculateHatchLevel(roster)).toBe(15);
  });

  it("averages 2 pokemon when roster has fewer than 3", () => {
    const roster = [
      createBattlePokemon(getPokemon("pidgey"), 10),
      createBattlePokemon(getPokemon("rattata"), 12),
    ];
    // avg 11
    expect(calculateHatchLevel(roster)).toBe(11);
  });

  it("floors the average", () => {
    const roster = [
      createBattlePokemon(getPokemon("pidgey"), 10),
      createBattlePokemon(getPokemon("rattata"), 11),
      createBattlePokemon(getPokemon("pikachu"), 12),
    ];
    // avg 11.0 -> 11
    expect(calculateHatchLevel(roster)).toBe(11);
  });
});

describe("createEgg", () => {
  it("creates an egg with the correct tier data", () => {
    const egg = createEgg("rare", () => 0);
    expect(egg.tier).toBe("rare");
    expect(egg.stepsRemaining).toBe(150);
    expect(EGG_TIERS.rare.pool).toContain(egg.speciesId);
    expect(egg.id).toMatch(/^egg_/);
  });

  it("assigns unique IDs to distinct eggs", () => {
    const a = createEgg("common");
    const b = createEgg("common");
    expect(a.id).not.toBe(b.id);
  });
});

describe("tickEggs", () => {
  it("decrements all eggs by 1 step", () => {
    const eggs: EggInstance[] = [
      { id: "a", tier: "common", speciesId: "pidgey", stepsRemaining: 10 },
      { id: "b", tier: "rare", speciesId: "eevee", stepsRemaining: 20 },
    ];
    tickEggs(eggs);
    expect(eggs[0].stepsRemaining).toBe(9);
    expect(eggs[1].stepsRemaining).toBe(19);
  });

  it("returns null when no egg is ready", () => {
    const eggs: EggInstance[] = [
      { id: "a", tier: "common", speciesId: "pidgey", stepsRemaining: 5 },
    ];
    expect(tickEggs(eggs)).toBeNull();
  });

  it("returns the hatched egg when stepsRemaining reaches 0", () => {
    const eggs: EggInstance[] = [
      { id: "a", tier: "common", speciesId: "pidgey", stepsRemaining: 1 },
      { id: "b", tier: "rare", speciesId: "eevee", stepsRemaining: 20 },
    ];
    const hatched = tickEggs(eggs);
    expect(hatched).not.toBeNull();
    expect(hatched?.id).toBe("a");
    expect(hatched?.stepsRemaining).toBe(0);
  });

  it("returns only the first hatched egg when multiple would hatch", () => {
    const eggs: EggInstance[] = [
      { id: "a", tier: "common", speciesId: "pidgey", stepsRemaining: 1 },
      { id: "b", tier: "common", speciesId: "rattata", stepsRemaining: 1 },
    ];
    const hatched = tickEggs(eggs);
    expect(hatched?.id).toBe("a");
    // second egg also ticked down
    expect(eggs[1].stepsRemaining).toBe(0);
  });

  it("does not go below 0", () => {
    const eggs: EggInstance[] = [
      { id: "a", tier: "common", speciesId: "pidgey", stepsRemaining: 0 },
    ];
    tickEggs(eggs);
    expect(eggs[0].stepsRemaining).toBe(0);
  });

  it("handles empty egg array", () => {
    expect(tickEggs([])).toBeNull();
  });
});
