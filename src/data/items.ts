import type { ItemData, BattleItem, BattlePokemon, ShopItem } from "../types.ts";

export const ITEMS: Record<string, ItemData> = {
  potion: {
    id: "potion",
    name: "Potion",
    description: "Heals 30 HP.",
    target: "ally",
  },
  super_potion: {
    id: "super_potion",
    name: "Super Potion",
    description: "Heals 60 HP.",
    target: "ally",
  },
  revive: {
    id: "revive",
    name: "Revive",
    description: "Revives a fainted Pokemon at 25% HP.",
    target: "ally",
  },
  escape_rope: {
    id: "escape_rope",
    name: "Escape Rope",
    description: "Escape the dungeon safely.",
    target: "self",
  },
  repel: {
    id: "repel",
    name: "Repel",
    description: "Prevents wild encounters for 20 steps.",
    target: "self",
  },
  dungeon_map: {
    id: "dungeon_map",
    name: "Map",
    description: "Reveals the entire dungeon layout.",
    target: "self",
  },
};

export function getItem(id: string): ItemData {
  const item = ITEMS[id];
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

export function applyItem(
  itemId: string,
  target: BattlePokemon
): { success: boolean; healAmount: number } {
  switch (itemId) {
    case "potion": {
      if (target.currentHP <= 0 || target.currentHP >= target.maxHP) {
        return { success: false, healAmount: 0 };
      }
      const heal = Math.min(30, target.maxHP - target.currentHP);
      target.currentHP += heal;
      return { success: true, healAmount: heal };
    }
    case "super_potion": {
      if (target.currentHP <= 0 || target.currentHP >= target.maxHP) {
        return { success: false, healAmount: 0 };
      }
      const heal = Math.min(60, target.maxHP - target.currentHP);
      target.currentHP += heal;
      return { success: true, healAmount: heal };
    }
    case "revive": {
      if (target.currentHP > 0) {
        return { success: false, healAmount: 0 };
      }
      const heal = Math.floor(target.maxHP * 0.25);
      target.currentHP = heal;
      return { success: true, healAmount: heal };
    }
    default:
      return { success: false, healAmount: 0 };
  }
}

export function createStarterBelt(): BattleItem[] {
  return [
    { item: ITEMS.potion, quantity: 3 },
    { item: ITEMS.escape_rope, quantity: 1 },
  ];
}

// --- Shop data ---

export const SHOP_ITEMS: ShopItem[] = [
  { itemId: "potion", cost: 30 },
  { itemId: "super_potion", cost: 80 },
  { itemId: "revive", cost: 120 },
  { itemId: "escape_rope", cost: 40 },
  { itemId: "repel", cost: 50 },
  { itemId: "dungeon_map", cost: 75 },
];

// Gold reward for winning a battle
export function getBattleGoldReward(enemyCount: number, worldIndex: number, mapIndex: number): number {
  const base = 15 + worldIndex * 12 + Math.floor(mapIndex / 5) * 5;
  return base * enemyCount + Math.floor(Math.random() * 20);
}
