import { describe, it, expect } from "vitest";
import {
  BASIC_ITEM_POOL,
  DECENT_ITEM_POOL,
  LEGENDARY_EGG_MIN_WORLD_INDEX,
  rollRoomDrops,
  rollTrainerDrops,
} from "../src/data/rewardDrops.ts";
import { applyItem } from "../src/data/items.ts";
import { createBattlePokemon } from "../src/core/statCalc.ts";
import { getPokemon } from "../src/data/pokemon.ts";

/** Scripted RNG that returns successive values from the given list. */
function scriptedRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("rollRoomDrops", () => {
  it("returns nothing when all rolls exceed their thresholds", () => {
    // Every roll uses 0.99 — strictly above every threshold (max 25%).
    const rng = scriptedRng([0.99]);
    const drops = rollRoomDrops(0, rng);
    expect(drops).toEqual([]);
  });

  it("rolls a basic item when the first roll falls below 25%", () => {
    // 0.01 passes basic, 0.99 blocks the others; 0.0 picks the first basic item.
    const rng = scriptedRng([0.01, 0.0, 0.99, 0.99, 0.99]);
    const drops = rollRoomDrops(0, rng);
    expect(drops).toHaveLength(1);
    expect(drops[0]).toEqual({ kind: "item", itemId: BASIC_ITEM_POOL[0] });
  });

  it("rolls a decent item when the second roll falls below 5%", () => {
    // 0.99 blocks basic, 0.01 passes decent (picks first), 0.99 blocks eggs.
    const rng = scriptedRng([0.99, 0.01, 0.0, 0.99, 0.99]);
    const drops = rollRoomDrops(0, rng);
    expect(drops).toHaveLength(1);
    expect(drops[0]).toEqual({ kind: "item", itemId: DECENT_ITEM_POOL[0] });
  });

  it("rolls a rare egg when the third roll falls below 1%", () => {
    // 0.99 blocks basic + decent, 0.005 passes rare egg, 0.99 blocks legendary.
    const rng = scriptedRng([0.99, 0.99, 0.005, 0.99]);
    const drops = rollRoomDrops(0, rng);
    expect(drops).toEqual([{ kind: "egg", tier: "rare" }]);
  });

  it("skips the legendary egg roll below the minimum world", () => {
    // 4 potential rolls — last one would pass but worldIndex < min, so skipped.
    const rng = scriptedRng([0.99, 0.99, 0.99, 0.005]);
    const drops = rollRoomDrops(LEGENDARY_EGG_MIN_WORLD_INDEX - 1, rng);
    expect(drops).toEqual([]);
  });

  it("rolls a legendary egg at the minimum world when the roll passes", () => {
    const rng = scriptedRng([0.99, 0.99, 0.99, 0.005]);
    const drops = rollRoomDrops(LEGENDARY_EGG_MIN_WORLD_INDEX, rng);
    expect(drops).toEqual([{ kind: "egg", tier: "legendary" }]);
  });

  it("can stack multiple independent drops in a single clear", () => {
    // All four drop rolls pass; item-pick rolls fall between.
    const rng = scriptedRng([0.01, 0.0, 0.01, 0.0, 0.005, 0.005]);
    const drops = rollRoomDrops(LEGENDARY_EGG_MIN_WORLD_INDEX, rng);
    expect(drops).toHaveLength(4);
    expect(drops[0]).toEqual({ kind: "item", itemId: BASIC_ITEM_POOL[0] });
    expect(drops[1]).toEqual({ kind: "item", itemId: DECENT_ITEM_POOL[0] });
    expect(drops[2]).toEqual({ kind: "egg", tier: "rare" });
    expect(drops[3]).toEqual({ kind: "egg", tier: "legendary" });
  });
});

describe("rollTrainerDrops", () => {
  it("always returns at least one decent item", () => {
    const rng = scriptedRng([0.0, 0.99, 0.99]);
    const drops = rollTrainerDrops(0, rng);
    expect(drops).toHaveLength(1);
    expect(drops[0]).toEqual({ kind: "item", itemId: DECENT_ITEM_POOL[0] });
  });

  it("can add a rare egg on top of the guaranteed decent item", () => {
    const rng = scriptedRng([0.5, 0.005, 0.99]);
    const drops = rollTrainerDrops(0, rng);
    expect(drops).toHaveLength(2);
    expect(drops[0].kind).toBe("item");
    expect(drops[1]).toEqual({ kind: "egg", tier: "rare" });
  });

  it("gates the legendary egg by world index", () => {
    const rng = scriptedRng([0.5, 0.99, 0.005]);
    // Below world 5 — third roll is never consumed.
    expect(rollTrainerDrops(0, rng)).toHaveLength(1);

    const rng2 = scriptedRng([0.5, 0.99, 0.005]);
    const drops = rollTrainerDrops(LEGENDARY_EGG_MIN_WORLD_INDEX, rng2);
    expect(drops).toHaveLength(2);
    expect(drops[1]).toEqual({ kind: "egg", tier: "legendary" });
  });
});

describe("status-cure medicine items", () => {
  it("Antidote clears poison only", () => {
    const p = createBattlePokemon(getPokemon("charmander"), 10);
    p.statusEffects = ["poison", "burn"];
    const result = applyItem("antidote", p);
    expect(result).toEqual({ kind: "cure", status: "poison" });
    expect(p.statusEffects).toEqual(["burn"]);
  });

  it("Paralyze Heal clears paralysis only", () => {
    const p = createBattlePokemon(getPokemon("pikachu"), 10);
    p.statusEffects = ["paralyze"];
    const result = applyItem("paralyze_heal", p);
    expect(result).toEqual({ kind: "cure", status: "paralyze" });
    expect(p.statusEffects).toEqual([]);
  });

  it("Awakening clears sleep only", () => {
    const p = createBattlePokemon(getPokemon("snorlax"), 20);
    p.statusEffects = ["sleep", "poison"];
    const result = applyItem("awakening", p);
    expect(result).toEqual({ kind: "cure", status: "sleep" });
    expect(p.statusEffects).toEqual(["poison"]);
  });

  it("fails cleanly when the target has no matching status", () => {
    const p = createBattlePokemon(getPokemon("rattata"), 10);
    p.statusEffects = ["paralyze"];
    const result = applyItem("antidote", p);
    expect(result.kind).toBe("fail");
  });

  it("Hyper Potion heals up to 120 HP", () => {
    const p = createBattlePokemon(getPokemon("snorlax"), 30);
    p.currentHP = 10;
    const before = p.currentHP;
    const result = applyItem("hyper_potion", p);
    expect(result.kind).toBe("heal");
    if (result.kind === "heal") {
      expect(result.healAmount).toBeGreaterThan(0);
      expect(result.healAmount).toBeLessThanOrEqual(120);
      expect(p.currentHP).toBe(before + result.healAmount);
    }
  });
});
