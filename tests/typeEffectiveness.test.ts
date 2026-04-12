import { describe, it, expect } from "vitest";
import { getEffectiveness, isSTAB } from "../src/core/typeEffectiveness.ts";
import type { MoveData } from "../src/types.ts";

describe("getEffectiveness", () => {
  it("fire is super effective against grass", () => {
    expect(getEffectiveness("fire", ["grass"])).toBe(2.0);
  });

  it("water is super effective against fire", () => {
    expect(getEffectiveness("water", ["fire"])).toBe(2.0);
  });

  it("grass is super effective against water", () => {
    expect(getEffectiveness("grass", ["water"])).toBe(2.0);
  });

  it("electric is super effective against water", () => {
    expect(getEffectiveness("electric", ["water"])).toBe(2.0);
  });

  it("ground is super effective against electric", () => {
    expect(getEffectiveness("ground", ["electric"])).toBe(2.0);
  });

  it("fire is not very effective against water", () => {
    expect(getEffectiveness("fire", ["water"])).toBe(0.5);
  });

  it("normal is not very effective against rock", () => {
    expect(getEffectiveness("normal", ["rock"])).toBe(0.5);
  });

  it("electric has no effect on ground", () => {
    expect(getEffectiveness("electric", ["ground"])).toBe(0);
  });

  it("normal vs normal is neutral", () => {
    expect(getEffectiveness("normal", ["normal"])).toBe(1.0);
  });

  it("multiplies across dual types — grass vs rock/ground = 4x", () => {
    expect(getEffectiveness("grass", ["rock", "ground"])).toBe(4.0);
  });

  it("multiplies across dual types — electric vs rock/ground includes immunity", () => {
    // Electric vs Rock = 1.0, Electric vs Ground = 0 → 0
    expect(getEffectiveness("electric", ["rock", "ground"])).toBe(0);
  });

  it("psychic is super effective against fighting", () => {
    expect(getEffectiveness("psychic", ["fighting"])).toBe(2.0);
  });

  it("psychic is super effective against poison", () => {
    expect(getEffectiveness("psychic", ["poison"])).toBe(2.0);
  });

  it("fighting is super effective against normal", () => {
    expect(getEffectiveness("fighting", ["normal"])).toBe(2.0);
  });

  it("fighting is super effective against rock", () => {
    expect(getEffectiveness("fighting", ["rock"])).toBe(2.0);
  });

  it("poison is super effective against grass", () => {
    expect(getEffectiveness("poison", ["grass"])).toBe(2.0);
  });
});

describe("isSTAB", () => {
  const fireMove: MoveData = {
    id: "ember",
    name: "Ember",
    type: "fire",
    power: 40,
    accuracy: 100,
    cooldown: 1,
    category: "special",
    description: "",
  };

  it("returns true when move type matches attacker type", () => {
    expect(isSTAB(fireMove, ["fire"])).toBe(true);
  });

  it("returns true when move type matches one of dual types", () => {
    expect(isSTAB(fireMove, ["fire", "normal"])).toBe(true);
  });

  it("returns false when move type doesn't match", () => {
    expect(isSTAB(fireMove, ["water"])).toBe(false);
  });
});
