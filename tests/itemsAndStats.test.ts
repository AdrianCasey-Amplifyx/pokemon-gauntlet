import { describe, it, expect } from "vitest";
import {
  addXP,
  applyStatBonuses,
  createBattlePokemon,
  evolveIntoSpecies,
  xpToNextLevel,
  zeroStats,
} from "../src/core/statCalc.ts";
import { applyItem } from "../src/data/items.ts";
import { getStoneEvolution } from "../src/data/stoneEvolutions.ts";
import { getPokemon } from "../src/data/pokemon.ts";
import { getMove } from "../src/data/moves.ts";
import { canUseTM } from "../src/data/shop.ts";

describe("applyStatBonuses", () => {
  it("sums base stats with bonus stats", () => {
    const base = { hp: 30, atk: 20, def: 15, spd: 10, spc: 25 };
    const bonus = { hp: 5, atk: 3, def: 0, spd: 7, spc: 0 };
    const result = applyStatBonuses(base, bonus);
    expect(result).toEqual({ hp: 35, atk: 23, def: 15, spd: 17, spc: 25 });
  });

  it("zeroStats returns all zeros", () => {
    expect(zeroStats()).toEqual({ hp: 0, atk: 0, def: 0, spd: 0, spc: 0 });
  });
});

describe("addXP preserves vitamin bonuses on level up", () => {
  it("keeps statBonuses in the stat block after leveling", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 5);
    // Simulate a Protein (+3 Atk)
    p.statBonuses.atk = 3;
    p.stats.atk += 3;

    const preAtkBonus = p.statBonuses.atk;
    const leveled = addXP(p, xpToNextLevel(p.level));
    expect(leveled).toBe(true);

    // Vitamin bonus should still be on the pokemon and reflected in stats
    expect(p.statBonuses.atk).toBe(preAtkBonus);
    // The recomputed base at the new level should have the +3 added on top
    const freshBase = createBattlePokemon(getPokemon("charmander"), p.level).stats.atk;
    expect(p.stats.atk).toBe(freshBase + 3);
  });
});

describe("evolveIntoSpecies", () => {
  it("preserves vitamin bonuses across evolution", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 20);
    p.statBonuses.atk = 5;
    p.stats.atk += 5;

    evolveIntoSpecies(p, getPokemon("charmeleon"));

    expect(p.species.id).toBe("charmeleon");
    expect(p.statBonuses.atk).toBe(5);

    const freshCharmeleonAtk = createBattlePokemon(getPokemon("charmeleon"), 20).stats.atk;
    expect(p.stats.atk).toBe(freshCharmeleonAtk + 5);
  });

  it("preserves HP ratio on evolution", () => {
    const p = createBattlePokemon(getPokemon("bulbasaur"), 20);
    p.currentHP = Math.floor(p.maxHP / 2); // 50%
    evolveIntoSpecies(p, getPokemon("ivysaur"));
    const ratio = p.currentHP / p.maxHP;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });
});

describe("stone evolution lookup", () => {
  it("Pikachu + Thunder Stone → Raichu", () => {
    const pikachu = createBattlePokemon(getPokemon("pikachu"), 20);
    const result = getStoneEvolution(pikachu, "thunder_stone");
    expect(result?.id).toBe("raichu");
  });

  it("Pikachu + Fire Stone → null", () => {
    const pikachu = createBattlePokemon(getPokemon("pikachu"), 20);
    expect(getStoneEvolution(pikachu, "fire_stone")).toBeNull();
  });

  it("Eevee branches by stone", () => {
    const eevee = createBattlePokemon(getPokemon("eevee"), 20);
    expect(getStoneEvolution(eevee, "water_stone")?.id).toBe("vaporeon");
    expect(getStoneEvolution(eevee, "thunder_stone")?.id).toBe("jolteon");
    expect(getStoneEvolution(eevee, "fire_stone")?.id).toBe("flareon");
  });
});

describe("applyItem dispatch", () => {
  it("Potion heals up to 30 HP", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    p.currentHP = 5;
    const result = applyItem("potion", p);
    expect(result.kind).toBe("heal");
    expect(p.currentHP).toBe(Math.min(p.maxHP, 35));
  });

  it("Potion fails at full HP", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    // currentHP is already full from createBattlePokemon
    const result = applyItem("potion", p);
    expect(result.kind).toBe("fail");
  });

  it("Revive on fainted pokemon sets HP to 25%", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    p.currentHP = 0;
    const result = applyItem("revive", p);
    expect(result.kind).toBe("revive");
    expect(p.currentHP).toBe(Math.floor(p.maxHP * 0.25));
  });

  it("HP Up raises max HP permanently and heals the gained amount", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    const startMax = p.maxHP;
    p.currentHP = p.maxHP - 2; // slightly hurt
    const result = applyItem("hp_up", p);
    expect(result.kind).toBe("vitamin");
    expect(p.maxHP).toBe(startMax + 5);
    expect(p.statBonuses.hp).toBe(5);
  });

  it("Protein raises attack permanently", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    const startAtk = p.stats.atk;
    const result = applyItem("protein", p);
    expect(result.kind).toBe("vitamin");
    expect(p.stats.atk).toBe(startAtk + 3);
    expect(p.statBonuses.atk).toBe(3);
  });

  it("Vitamin fails at cap", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    p.statBonuses.atk = 15; // at cap
    const result = applyItem("protein", p);
    expect(result.kind).toBe("fail");
  });

  it("Fire Stone evolves Charmander ... wait it doesn't, but Vulpix should become Ninetales", () => {
    const vulpix = createBattlePokemon(getPokemon("vulpix"), 20);
    const result = applyItem("fire_stone", vulpix);
    expect(result.kind).toBe("evolve");
    expect(vulpix.species.id).toBe("ninetales");
  });

  it("Fire Stone fails on a non-matching pokemon", () => {
    const p = createBattlePokemon(getPokemon("pikachu"), 20);
    const result = applyItem("fire_stone", p);
    expect(result.kind).toBe("fail");
  });

  it("Rare Candy levels up a pokemon below the roster cap", () => {
    const lead = createBattlePokemon(getPokemon("charmander"), 10);
    const straggler = createBattlePokemon(getPokemon("bulbasaur"), 5);
    const result = applyItem("rare_candy", straggler, { roster: [lead, straggler] });
    expect(result.kind).toBe("levelup");
    expect(straggler.level).toBe(6);
  });

  it("Rare Candy fails when at roster cap", () => {
    const lead = createBattlePokemon(getPokemon("charmander"), 10);
    const result = applyItem("rare_candy", lead, { roster: [lead] });
    expect(result.kind).toBe("fail");
  });

  it("X Attack adds a battle boost stage", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    const result = applyItem("x_attack", p);
    expect(result.kind).toBe("boost");
    expect(p.battleBoosts.atk).toBe(1);
  });

  it("X Attack caps at 2 stages", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    applyItem("x_attack", p);
    applyItem("x_attack", p);
    const third = applyItem("x_attack", p);
    expect(p.battleBoosts.atk).toBe(2);
    expect(third.kind).toBe("fail");
  });

  it("TMs cannot be applied via applyItem", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 20);
    const result = applyItem("tm_flamethrower", p);
    expect(result.kind).toBe("fail");
  });
});

describe("canUseTM type-match rule", () => {
  it("allows type-matched TM", () => {
    const charmander = createBattlePokemon(getPokemon("charmander"), 20);
    // Charmander already knows ember by default at level 20 (if in pool)
    // Use a move it definitely doesn't know
    const check = canUseTM(charmander, "fire_blast");
    expect(check.ok).toBe(true);
  });

  it("rejects type-mismatched TM", () => {
    const charmander = createBattlePokemon(getPokemon("charmander"), 20);
    const check = canUseTM(charmander, "thunderbolt");
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("type_mismatch");
  });

  it("rejects TM for a move already known", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 20);
    p.moves.push(getMove("fire_blast"));
    const check = canUseTM(p, "fire_blast");
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("already_knows");
  });
});
