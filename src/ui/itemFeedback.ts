import type { BattlePokemon } from "../types.ts";
import type { ApplyResult } from "../data/items.ts";
import type { SFXKind } from "../audio/MusicManager.ts";

export interface ItemFeedback {
  message: string;
  sfx: SFXKind;
  color: string;
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spd: "Speed",
  spc: "Special",
};

/**
 * Map an ApplyResult to a human-friendly toast. Caller should only invoke
 * for successful results — failures have no feedback by design.
 */
export function describeItemResult(
  result: ApplyResult,
  target: BattlePokemon
): ItemFeedback {
  switch (result.kind) {
    case "heal":
      return {
        message: `${target.species.name} restored ${result.healAmount} HP!`,
        sfx: "heal",
        color: "#88ffaa",
      };
    case "revive":
      return {
        message: `${target.species.name} was revived!`,
        sfx: "heal",
        color: "#88ffaa",
      };
    case "vitamin":
      return {
        message: `${target.species.name}'s ${STAT_LABELS[result.stat] ?? result.stat} rose by ${result.gained}!`,
        sfx: "item_use",
        color: "#88ccff",
      };
    case "levelup":
      return {
        message: `${target.species.name} grew to Lv${result.newLevel}!`,
        sfx: "learn",
        color: "#ffdd44",
      };
    case "boost":
      return {
        message: `${target.species.name}'s ${STAT_LABELS[result.stat] ?? result.stat} rose!`,
        sfx: "item_use",
        color: "#88ccff",
      };
    case "cure": {
      const labels: Record<string, string> = {
        poison: "poisoning",
        paralyze: "paralysis",
        sleep: "sleep",
        burn: "burn",
        confuse: "confusion",
      };
      return {
        message: `${target.species.name} was cured of ${labels[result.status] ?? result.status}!`,
        sfx: "heal",
        color: "#88ffaa",
      };
    }
    case "evolve":
      return {
        message: `${result.oldName} evolved into ${result.newSpecies.name}!`,
        sfx: "hatch",
        color: "#ff8844",
      };
    case "fail":
      return {
        message: result.reason,
        sfx: "error",
        color: "#ff6666",
      };
  }
}
