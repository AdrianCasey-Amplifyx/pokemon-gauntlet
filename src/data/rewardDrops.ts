import type { EggTier } from "../types.ts";

export type RewardDrop =
  | { kind: "item"; itemId: string }
  | { kind: "egg"; tier: EggTier };

/** Basic drop pool — rolled at 25% on a regular room clear. */
export const BASIC_ITEM_POOL: string[] = [
  "potion",
  "antidote",
  "paralyze_heal",
  "awakening",
  "repel",
  "escape_rope",
  "x_attack",
  "x_defend",
  "x_speed",
];

/** Decent drop pool — rolled at 5% on a regular room clear, guaranteed on trainer wins. */
export const DECENT_ITEM_POOL: string[] = [
  "super_potion",
  "revive",
  "hyper_potion",
  "hp_up",
  "protein",
  "iron",
  "carbos",
  "calcium",
];

export const BASIC_DROP_CHANCE = 0.25;
export const DECENT_DROP_CHANCE = 0.05;
export const RARE_EGG_CHANCE = 0.01;
export const LEGENDARY_EGG_CHANCE = 0.01;

/** World index (0-based) at which Legendary Eggs unlock in drop rolls. */
export const LEGENDARY_EGG_MIN_WORLD_INDEX = 4; // World 5 (Celadon Gardens) onwards.

function pick<T>(pool: T[], rng: () => number): T {
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Roll independent drops for a regular (non-trainer) room clear.
 *   - 25% chance of a basic-pool item
 *   - 5% chance of a decent-pool item
 *   - 1% chance of a Rare Egg
 *   - 1% chance of a Legendary Egg (only if world >= 5)
 * Rolls are independent, so a single clear can yield multiple rewards.
 */
export function rollRoomDrops(
  worldIndex: number,
  rng: () => number = Math.random
): RewardDrop[] {
  const drops: RewardDrop[] = [];

  if (rng() < BASIC_DROP_CHANCE) {
    drops.push({ kind: "item", itemId: pick(BASIC_ITEM_POOL, rng) });
  }
  if (rng() < DECENT_DROP_CHANCE) {
    drops.push({ kind: "item", itemId: pick(DECENT_ITEM_POOL, rng) });
  }
  if (rng() < RARE_EGG_CHANCE) {
    drops.push({ kind: "egg", tier: "rare" });
  }
  if (worldIndex >= LEGENDARY_EGG_MIN_WORLD_INDEX && rng() < LEGENDARY_EGG_CHANCE) {
    drops.push({ kind: "egg", tier: "legendary" });
  }

  return drops;
}

/**
 * Roll drops for a trainer / boss / gym defeat.
 *   - Guaranteed decent-pool item
 *   - 1% chance of a Rare Egg
 *   - 1% chance of a Legendary Egg (only if world >= 5)
 */
export function rollTrainerDrops(
  worldIndex: number,
  rng: () => number = Math.random
): RewardDrop[] {
  const drops: RewardDrop[] = [
    { kind: "item", itemId: pick(DECENT_ITEM_POOL, rng) },
  ];

  if (rng() < RARE_EGG_CHANCE) {
    drops.push({ kind: "egg", tier: "rare" });
  }
  if (worldIndex >= LEGENDARY_EGG_MIN_WORLD_INDEX && rng() < LEGENDARY_EGG_CHANCE) {
    drops.push({ kind: "egg", tier: "legendary" });
  }

  return drops;
}
