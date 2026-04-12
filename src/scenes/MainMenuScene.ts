import Phaser from "phaser";
import type { GameState } from "../types.ts";
import { createBattlePokemon, xpToNextLevel } from "../core/statCalc.ts";
import { saveGame } from "../core/saveManager.ts";
import { ITEMS, applyItem } from "../data/items.ts";
import { getPokemon } from "../data/pokemon.ts";
import { getAvailableShopPokemon, getAvailableShopItems, getWorldsUnlocked, getTrainableMoves, getEvolutionInfo } from "../data/shop.ts";
import { calculateAllStats } from "../core/statCalc.ts";
import { getMove } from "../data/moves.ts";
import { MusicManager } from "../audio/MusicManager.ts";
import { generateDungeon } from "../core/mapGenerator.ts";
import { WORLD_NAMES, MAPS_PER_WORLD } from "../data/worlds.ts";

const GAME_W = 390;
const GAME_H = 844;
const PARTY_SIZE = 3;

export class MainMenuScene extends Phaser.Scene {
  private gameState!: GameState;
  private selectedParty: number[] = [];

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    this.selectedParty = [];
    MusicManager.play("map");

    this.gameState = this.registry.get("gameState") as GameState;

    // Reset cooldowns/status but do NOT auto-heal HP
    for (const p of this.gameState.roster) {
      p.cooldowns = p.cooldowns.map(() => 0);
      p.statusEffects = [];
    }

    // Auto-heal only if returning from a cleared room
    const roomCleared = this.registry.get("roomCleared") as boolean | undefined;
    if (roomCleared) {
      this.registry.remove("roomCleared");
      for (const p of this.gameState.roster) {
        p.currentHP = p.maxHP;
      }
    }

    this.buildUI();
  }

  private buildUI(): void {
    this.children.removeAll(true);

    // Title
    this.add.text(GAME_W / 2, 30, "POKEMON GAUNTLET", {
      fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);

    // Gold
    this.add.text(GAME_W / 2, 58, `Gold: ${this.gameState.gold}`, {
      fontSize: "16px", fontFamily: "monospace", color: "#ffd700", fontStyle: "bold",
    }).setOrigin(0.5);

    // Roster count
    this.add.text(GAME_W / 2, 82, `${this.gameState.roster.length} Pokemon in roster`, {
      fontSize: "11px", fontFamily: "monospace", color: "#888899",
    }).setOrigin(0.5);

    // Mini roster preview
    const previewY = 110;
    const maxPreview = Math.min(this.gameState.roster.length, 8);
    for (let i = 0; i < maxPreview; i++) {
      const p = this.gameState.roster[i];
      const x = GAME_W / 2 - (maxPreview - 1) * 22 + i * 44;
      if (this.textures.exists(p.species.spriteKey)) {
        const img = this.add.image(x, previewY, p.species.spriteKey).setDisplaySize(32, 32).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    // World progress
    const worldIdx = this.gameState.activeWorld;
    const world = this.gameState.worlds[worldIdx];
    this.add.text(GAME_W / 2, 140, `${WORLD_NAMES[worldIdx]} — Room ${world.currentMap + 1}/${MAPS_PER_WORLD}`, {
      fontSize: "11px", fontFamily: "monospace", color: "#4488cc",
    }).setOrigin(0.5);

    // Inventory summary below roster preview
    const itemsY = 150;
    const itemEntries = this.gameState.playerItems.filter((b) => b.quantity > 0);
    if (itemEntries.length > 0) {
      const itemStr = itemEntries.map((b) => `${this.getItemIcon(b.item.id)}${b.item.name} x${b.quantity}`).join("  ");
      this.add.text(GAME_W / 2, itemsY, itemStr, { fontSize: "10px", fontFamily: "monospace", color: "#aaaaaa" }).setOrigin(0.5);
    } else {
      this.add.text(GAME_W / 2, itemsY, "No items", { fontSize: "10px", fontFamily: "monospace", color: "#666666" }).setOrigin(0.5);
    }

    // Main buttons
    const btnY = 185;
    const gap = 48;

    this.makeBtn(GAME_W / 2, btnY, "POKEMON", "View your roster", 0x335588, () => this.showScreen("roster"));
    this.makeBtn(GAME_W / 2, btnY + gap, "ITEMS", "View & use your items", 0x886633, () => this.showScreen("items"));
    this.makeBtn(GAME_W / 2, btnY + gap * 2, "POKECENTER", "Heal all Pokemon — 20g", 0xcc3333, () => this.usePokeCenter());
    this.makeBtn(GAME_W / 2, btnY + gap * 3, "TRAIN", "Learn & manage moves", 0x884488, () => this.showScreen("train"));
    this.makeBtn(GAME_W / 2, btnY + gap * 4, "POKEMART", "Buy items with gold", 0x885533, () => this.showScreen("shop"));
    this.makeBtn(GAME_W / 2, btnY + gap * 5, "BUY POKEMON", "Expand your roster", 0x553388, () => this.showScreen("pokeshop"));
    this.makeBtn(GAME_W / 2, btnY + gap * 6, "ADVENTURE", "Select party & explore!", 0x338855, () => this.showScreen("party"));

    // Title screen button
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 40, 160, 34, 0x333333).setOrigin(0.5).setStrokeStyle(1, 0x555555);
    this.add.text(GAME_W / 2, GAME_H - 40, "TITLE SCREEN", { fontSize: "12px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.scene.start("TitleScene"));
  }

  private makeBtn(x: number, y: number, label: string, desc: string, color: number, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 320, 48, color).setOrigin(0.5).setStrokeStyle(2, 0x666666);
    this.add.text(x, y - 6, label, { fontSize: "16px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(x, y + 14, desc, { fontSize: "9px", fontFamily: "monospace", color: "#cccccc" }).setOrigin(0.5);
    bg.setInteractive();
    bg.on("pointerdown", onClick);
  }

  // === All screens rendered by clearing and rebuilding ===
  private usePokeCenter(): void {
    const cost = 20;
    const allFull = this.gameState.roster.every((p) => p.currentHP >= p.maxHP);

    if (allFull) {
      // Flash a message — all Pokemon already healthy
      const msg = this.add.text(GAME_W / 2, GAME_H / 2, "All Pokemon are healthy!", {
        fontSize: "16px", fontFamily: "monospace", color: "#44ff44", fontStyle: "bold",
        stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: msg, alpha: 0, duration: 1500, delay: 500, onComplete: () => msg.destroy() });
      return;
    }

    if (this.gameState.gold < cost) {
      const msg = this.add.text(GAME_W / 2, GAME_H / 2, "Not enough gold!", {
        fontSize: "16px", fontFamily: "monospace", color: "#ff4444", fontStyle: "bold",
        stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: msg, alpha: 0, duration: 1500, delay: 500, onComplete: () => msg.destroy() });
      return;
    }

    this.gameState.gold -= cost;
    for (const p of this.gameState.roster) {
      p.currentHP = p.maxHP;
    }
    saveGame(this.gameState);

    const msg = this.add.text(GAME_W / 2, GAME_H / 2, "All Pokemon healed!\n-20g", {
      fontSize: "16px", fontFamily: "monospace", color: "#44ff44", fontStyle: "bold",
      stroke: "#000000", strokeThickness: 3, align: "center",
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: msg, alpha: 0, duration: 1500, delay: 800, onComplete: () => { msg.destroy(); this.buildUI(); } });
  }

  private showScreen(screen: "roster" | "items" | "shop" | "pokeshop" | "party" | "train"): void {
    this.children.removeAll(true);

    // Dark background
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a).setOrigin(0.5);

    switch (screen) {
      case "roster": this.drawRoster(); break;
      case "items": this.drawItems(); break;
      case "shop": this.drawShop(); break;
      case "pokeshop": this.drawPokemonShop(); break;
      case "party": this.drawPartySelect(); break;
      case "train": this.drawTrainSelect(); break;
    }

    // Back button
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 45, 160, 38, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x774444);
    this.add.text(GAME_W / 2, GAME_H - 45, "BACK", { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.buildUI());
  }

  // --- Roster ---
  private drawRoster(): void {
    this.add.text(GAME_W / 2, 30, "YOUR POKEMON", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);

    this.gameState.roster.forEach((pokemon, i) => {
      const y = 70 + i * 75;
      if (y > GAME_H - 100) return;
      const x = 20;
      const w = GAME_W - 40;
      const h = 68;

      this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x1a1a2e).setOrigin(0.5).setStrokeStyle(1, 0x333355);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(x + 25, y + h / 2, pokemon.species.spriteKey).setDisplaySize(40, 40).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(x + 52, y + 8, pokemon.species.name, { fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" });
      this.add.text(x + w - 5, y + 8, `Lv${pokemon.level}`, { fontSize: "11px", fontFamily: "monospace", color: "#aaaaaa" }).setOrigin(1, 0);

      // HP bar
      const barX = x + 52;
      const barY = y + 28;
      const barW = w - 65;
      this.add.rectangle(barX + barW / 2, barY + 3, barW, 6, 0x333333).setOrigin(0.5);
      const hpPct = pokemon.currentHP / pokemon.maxHP;
      const hpColor = hpPct > 0.5 ? 0x22cc44 : hpPct > 0.25 ? 0xddcc22 : 0xcc2222;
      this.add.rectangle(barX, barY, hpPct * barW, 6, hpColor).setOrigin(0, 0);
      this.add.text(barX, barY + 8, `HP ${pokemon.currentHP}/${pokemon.maxHP}`, { fontSize: "7px", fontFamily: "monospace", color: "#888888" });

      // XP bar
      const xpBarY = barY + 18;
      const needed = xpToNextLevel(pokemon.level);
      const xpPct = Math.min(pokemon.currentXP / needed, 1);
      this.add.rectangle(barX + barW / 2, xpBarY + 3, barW, 5, 0x222244).setOrigin(0.5);
      if (xpPct > 0) {
        this.add.rectangle(barX, xpBarY, xpPct * barW, 5, 0x4488cc).setOrigin(0, 0);
      }
      this.add.text(barX, xpBarY + 7, `XP ${pokemon.currentXP}/${needed}`, { fontSize: "7px", fontFamily: "monospace", color: "#4488cc" });

      const typeStr = pokemon.species.types.map((t) => t.substring(0, 3).toUpperCase()).join("/");
      this.add.text(x + w - 5, xpBarY + 7, typeStr, { fontSize: "7px", fontFamily: "monospace", color: "#555577" }).setOrigin(1, 0);
    });
  }

  // --- Items view ---
  private drawItems(): void {
    this.add.text(GAME_W / 2, 30, "YOUR ITEMS", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);

    const items = this.gameState.playerItems.filter((b) => b.quantity > 0);

    if (items.length === 0) {
      this.add.text(GAME_W / 2, 200, "No items!\nVisit the PokeMart to buy some.", { fontSize: "14px", fontFamily: "monospace", color: "#888888", align: "center" }).setOrigin(0.5);
      return;
    }

    items.forEach((belt, i) => {
      const y = 80 + i * 70;
      const w = GAME_W - 40;

      this.add.rectangle(GAME_W / 2, y, w, 55, 0x1a1a2e).setOrigin(0.5).setStrokeStyle(1, 0x333355);

      // Icon
      const icon = this.getItemIcon(belt.item.id);
      this.add.text(35, y - 5, icon, { fontSize: "22px", fontFamily: "monospace" }).setOrigin(0.5);

      // Name + quantity
      this.add.text(60, y - 12, `${belt.item.name}  x${belt.quantity}`, {
        fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0, 0.5);

      // Description
      this.add.text(60, y + 10, belt.item.description, {
        fontSize: "10px", fontFamily: "monospace", color: "#888888",
      }).setOrigin(0, 0.5);

      // Use button for healing items (not escape rope — only useful in dungeon)
      if (belt.item.id !== "escape_rope" && belt.item.target === "ally") {
        const useBg = this.add.rectangle(GAME_W - 50, y, 60, 30, 0x335588).setOrigin(0.5).setStrokeStyle(1, 0x4477aa);
        this.add.text(GAME_W - 50, y, "USE", { fontSize: "11px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
        useBg.setInteractive();
        useBg.on("pointerdown", () => this.showItemUseTarget(belt));
      }
    });
  }

  private showItemUseTarget(belt: typeof this.gameState.playerItems[0]): void {
    this.children.removeAll(true);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a).setOrigin(0.5);

    const isRevive = belt.item.id === "revive";
    const icon = this.getItemIcon(belt.item.id);
    this.add.text(GAME_W / 2, 30, `${icon} Use ${belt.item.name} on?`, { fontSize: "18px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 55, `${belt.quantity} remaining`, { fontSize: "11px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);

    this.gameState.roster.forEach((pokemon, i) => {
      const y = 90 + i * 65;
      if (y > GAME_H - 100) return;
      const fainted = pokemon.currentHP <= 0;
      const fullHP = pokemon.currentHP >= pokemon.maxHP;
      const canTarget = isRevive ? fainted : (!fainted && !fullHP);

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 52, canTarget ? 0x222244 : 0x181822, 0.9).setOrigin(0.5).setStrokeStyle(1, canTarget ? 0x444466 : 0x222233);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 140, y, pokemon.species.spriteKey).setDisplaySize(32, 32).setOrigin(0.5).setAlpha(canTarget ? 1 : 0.3);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(GAME_W / 2 - 110, y - 8, pokemon.species.name, { fontSize: "12px", fontFamily: "monospace", color: canTarget ? "#ffffff" : "#555555", fontStyle: "bold" }).setOrigin(0, 0.5);
      const hpStr = fainted ? "FAINTED" : `${pokemon.currentHP}/${pokemon.maxHP} HP`;
      this.add.text(GAME_W / 2 - 110, y + 10, hpStr, { fontSize: "10px", fontFamily: "monospace", color: fainted ? "#cc4444" : "#22cc44" }).setOrigin(0, 0.5);

      if (canTarget) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => {
          const { success } = applyItem(belt.item.id, pokemon);
          if (success) belt.quantity--;
          this.showScreen("items");
        });
      }
    });

    // Back
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 45, 160, 38, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x774444);
    this.add.text(GAME_W / 2, GAME_H - 45, "BACK", { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.showScreen("items"));
  }

  // --- Item Shop ---
  private drawShop(): void {
    this.add.text(GAME_W / 2, 30, "POKEMART", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 55, `Gold: ${this.gameState.gold}`, { fontSize: "14px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);

    const unlocked = getWorldsUnlocked(this.gameState.worlds);
    const available = getAvailableShopItems(unlocked);

    if (available.length === 0) {
      this.add.text(GAME_W / 2, 300, "No items available yet!", { fontSize: "14px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);
      return;
    }

    available.forEach((shopItem, i) => {
      const item = ITEMS[shopItem.itemId];
      const y = 95 + i * 65;
      const canAfford = this.gameState.gold >= shopItem.cost;

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 50, canAfford ? 0x2a2a3e : 0x1a1a22, 0.9).setOrigin(0.5).setStrokeStyle(1, 0x444466);

      // Item icon
      const iconText = this.getItemIcon(shopItem.itemId);
      this.add.text(GAME_W / 2 - 155, y, iconText, { fontSize: "18px", fontFamily: "monospace" }).setOrigin(0.5);

      this.add.text(GAME_W / 2 - 130, y - 8, item.name, { fontSize: "13px", fontFamily: "monospace", color: canAfford ? "#ffffff" : "#666666", fontStyle: "bold" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 - 130, y + 12, item.description, { fontSize: "9px", fontFamily: "monospace", color: "#888888" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 + 140, y, `${shopItem.cost}g`, { fontSize: "14px", fontFamily: "monospace", color: canAfford ? "#ffd700" : "#664400", fontStyle: "bold" }).setOrigin(0.5);

      if (canAfford) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => {
          this.gameState.gold -= shopItem.cost;
          const existing = this.gameState.playerItems.find((b) => b.item.id === shopItem.itemId);
          if (existing) existing.quantity++;
          else this.gameState.playerItems.push({ item: ITEMS[shopItem.itemId], quantity: 1 });
          saveGame(this.gameState);
          this.showScreen("shop");
        });
      }
    });

    // Show current inventory
    const invY = 95 + available.length * 65 + 20;
    this.add.text(20, invY, "INVENTORY:", { fontSize: "11px", fontFamily: "monospace", color: "#888888" });
    let idx = 0;
    this.gameState.playerItems.forEach((belt) => {
      if (belt.quantity <= 0) return;
      const icon = this.getItemIcon(belt.item.id);
      this.add.text(20, invY + 18 + idx * 18, `${icon} ${belt.item.name} x${belt.quantity}`, { fontSize: "11px", fontFamily: "monospace", color: "#aaaaaa" });
      idx++;
    });
  }

  // --- Pokemon Shop ---
  private drawPokemonShop(): void {
    this.add.text(GAME_W / 2, 30, "BUY POKEMON", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 55, `Gold: ${this.gameState.gold}`, { fontSize: "14px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);

    const available = getAvailableShopPokemon(this.gameState.seenPokemon, this.gameState.roster);

    if (available.length === 0) {
      this.add.text(GAME_W / 2, 300, "No new Pokemon\navailable yet!", { fontSize: "14px", fontFamily: "monospace", color: "#888888", align: "center" }).setOrigin(0.5);
      return;
    }

    available.forEach((shopPoke, i) => {
      const species = getPokemon(shopPoke.speciesId);
      const y = 95 + i * 68;
      const canAfford = this.gameState.gold >= shopPoke.cost;

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 55, canAfford ? 0x2a2a3e : 0x1a1a22, 0.9).setOrigin(0.5).setStrokeStyle(1, 0x444466);

      if (this.textures.exists(species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 140, y, species.spriteKey).setDisplaySize(38, 38).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(GAME_W / 2 - 105, y - 10, species.name, { fontSize: "13px", fontFamily: "monospace", color: canAfford ? "#ffffff" : "#666666", fontStyle: "bold" }).setOrigin(0, 0.5);
      const typeStr = species.types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join("/");
      this.add.text(GAME_W / 2 - 105, y + 10, typeStr, { fontSize: "10px", fontFamily: "monospace", color: "#aaaacc" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 + 130, y, `${shopPoke.cost}g`, { fontSize: "14px", fontFamily: "monospace", color: canAfford ? "#ffd700" : "#664400", fontStyle: "bold" }).setOrigin(0.5);

      if (canAfford) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => {
          this.gameState.gold -= shopPoke.cost;
          this.gameState.roster.push(createBattlePokemon(species, 5));
          saveGame(this.gameState);
          this.showScreen("pokeshop");
        });
      }
    });
  }

  // --- Party Select ---
  private drawPartySelect(): void {
    this.add.text(GAME_W / 2, 25, "SELECT PARTY", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 50, `${this.selectedParty.length}/${PARTY_SIZE} selected — tap to toggle`, { fontSize: "11px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);

    // Selected preview
    if (this.selectedParty.length > 0) {
      this.selectedParty.forEach((idx, i) => {
        const p = this.gameState.roster[idx];
        const x = GAME_W / 2 - (this.selectedParty.length - 1) * 25 + i * 50;
        if (this.textures.exists(p.species.spriteKey)) {
          const img = this.add.image(x, 78, p.species.spriteKey).setDisplaySize(32, 32).setOrigin(0.5);
          img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      });
    }

    this.gameState.roster.forEach((pokemon, i) => {
      const y = 105 + i * 55;
      if (y > GAME_H - 130) return;
      const isSelected = this.selectedParty.includes(i);

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 46, isSelected ? 0x334422 : 0x2a2a3e, 0.9).setOrigin(0.5).setStrokeStyle(2, isSelected ? 0x44aa22 : 0x444466);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 145, y, pokemon.species.spriteKey).setDisplaySize(28, 28).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(GAME_W / 2 - 120, y - 5, pokemon.species.name, { fontSize: "12px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 - 120, y + 12, `Lv${pokemon.level}`, { fontSize: "9px", fontFamily: "monospace", color: "#888888" }).setOrigin(0, 0.5);

      if (isSelected) {
        this.add.text(GAME_W / 2 + 145, y, "OK", { fontSize: "14px", fontFamily: "monospace", color: "#44aa22", fontStyle: "bold" }).setOrigin(0.5);
      }

      cardBg.setInteractive();
      cardBg.on("pointerdown", () => {
        if (isSelected) {
          this.selectedParty = this.selectedParty.filter((x) => x !== i);
        } else if (this.selectedParty.length < PARTY_SIZE) {
          this.selectedParty.push(i);
        }
        this.showScreen("party");
      });
    });

    // GO button
    if (this.selectedParty.length > 0) {
      const goBg = this.add.rectangle(GAME_W / 2, GAME_H - 95, 220, 42, 0x338855).setOrigin(0.5).setStrokeStyle(2, 0x44aa66);
      this.add.text(GAME_W / 2, GAME_H - 95, `ADVENTURE! (${this.selectedParty.length})`, { fontSize: "15px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
      goBg.setInteractive();
      goBg.on("pointerdown", () => this.startAdventure());
    }
  }

  // --- Training: Pokemon select ---
  private drawTrainSelect(): void {
    this.add.text(GAME_W / 2, 30, "TRAIN POKEMON", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 55, `Gold: ${this.gameState.gold}`, { fontSize: "14px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 75, "Select a Pokemon to manage moves", { fontSize: "10px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);

    this.gameState.roster.forEach((pokemon, i) => {
      const y = 105 + i * 60;
      if (y > GAME_H - 100) return;

      const trainable = getTrainableMoves(pokemon);
      const unlearnedCount = trainable.filter((t) => !t.known).length;

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 50, 0x2a2a3e, 0.9).setOrigin(0.5).setStrokeStyle(1, 0x444466);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 145, y, pokemon.species.spriteKey).setDisplaySize(34, 34).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(GAME_W / 2 - 115, y - 10, pokemon.species.name, { fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 - 115, y + 10, `Lv${pokemon.level}  ${pokemon.moves.length}/4 moves`, { fontSize: "10px", fontFamily: "monospace", color: "#888888" }).setOrigin(0, 0.5);

      const evoInfo = getEvolutionInfo(pokemon);
      if (evoInfo?.canEvolve) {
        this.add.text(GAME_W / 2 + 130, y - 8, "EVOLVE", { fontSize: "9px", fontFamily: "monospace", color: "#ff8844", fontStyle: "bold" }).setOrigin(0.5);
      }
      if (unlearnedCount > 0) {
        this.add.text(GAME_W / 2 + 130, y + (evoInfo?.canEvolve ? 8 : 0), `${unlearnedCount} new`, { fontSize: "11px", fontFamily: "monospace", color: "#44cc44", fontStyle: "bold" }).setOrigin(0.5);
      }

      cardBg.setInteractive();
      cardBg.on("pointerdown", () => this.drawTrainMoves(i));
    });
  }

  // --- Training: Move management for a specific Pokemon ---
  private drawTrainMoves(rosterIndex: number): void {
    this.children.removeAll(true);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a).setOrigin(0.5);

    const pokemon = this.gameState.roster[rosterIndex];
    const trainable = getTrainableMoves(pokemon);

    // Header
    this.add.text(GAME_W / 2, 20, "TRAIN", { fontSize: "18px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 42, `Gold: ${this.gameState.gold}`, { fontSize: "12px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);

    // Pokemon info
    if (this.textures.exists(pokemon.species.spriteKey)) {
      const img = this.add.image(30, 68, pokemon.species.spriteKey).setDisplaySize(36, 36).setOrigin(0.5);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add.text(55, 60, `${pokemon.species.name}  Lv${pokemon.level}`, { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" });
    this.add.text(55, 78, `Moves: ${pokemon.moves.length}/4`, { fontSize: "10px", fontFamily: "monospace", color: "#aaaaaa" });

    // Evolution section
    let sectionY = 100;
    const evoInfo = getEvolutionInfo(pokemon);
    if (evoInfo) {
      this.add.text(15, sectionY, "EVOLUTION", { fontSize: "11px", fontFamily: "monospace", color: "#ff8844", fontStyle: "bold" });
      sectionY += 18;

      const evoY = sectionY;
      const canAffordEvo = this.gameState.gold >= evoInfo.cost;
      const canEvolve = evoInfo.canEvolve && canAffordEvo;

      this.add.rectangle(GAME_W / 2, evoY, 340, 40, canEvolve ? 0x332211 : 0x1a1a22, 0.9).setOrigin(0.5).setStrokeStyle(1, canEvolve ? 0x664422 : 0x333333);

      // Show evolved species sprite
      if (this.textures.exists(evoInfo.evolvedSpecies.spriteKey)) {
        const evoImg = this.add.image(35, evoY, evoInfo.evolvedSpecies.spriteKey).setDisplaySize(28, 28).setOrigin(0.5);
        evoImg.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      const evoName = evoInfo.evolvedSpecies.name;
      if (evoInfo.canEvolve) {
        this.add.text(55, evoY - 7, `Evolve to ${evoName}`, { fontSize: "12px", fontFamily: "monospace", color: canAffordEvo ? "#ffffff" : "#666666", fontStyle: "bold" }).setOrigin(0, 0.5);
        this.add.text(55, evoY + 8, `Ready!`, { fontSize: "9px", fontFamily: "monospace", color: "#ff8844" }).setOrigin(0, 0.5);
        this.add.text(GAME_W - 95, evoY, `${evoInfo.cost}g`, { fontSize: "11px", fontFamily: "monospace", color: canAffordEvo ? "#ffd700" : "#664400", fontStyle: "bold" }).setOrigin(0.5);

        if (canEvolve) {
          const evoBg = this.add.rectangle(GAME_W - 40, evoY, 55, 24, 0x884422).setOrigin(0.5).setStrokeStyle(1, 0xaa6633);
          this.add.text(GAME_W - 40, evoY, "EVOLVE", { fontSize: "8px", fontFamily: "monospace", color: "#ffaa44", fontStyle: "bold" }).setOrigin(0.5);
          evoBg.setInteractive();
          evoBg.on("pointerdown", () => this.evolvePokemon(rosterIndex));
        }
      } else {
        this.add.text(55, evoY - 7, `Evolves to ${evoName}`, { fontSize: "12px", fontFamily: "monospace", color: "#666666" }).setOrigin(0, 0.5);
        this.add.text(55, evoY + 8, `Requires Lv${evoInfo.requiredLevel}`, { fontSize: "9px", fontFamily: "monospace", color: "#555555" }).setOrigin(0, 0.5);
      }

      sectionY = evoY + 30;
    }

    // Current moves section
    this.add.text(15, sectionY, "CURRENT MOVES", { fontSize: "11px", fontFamily: "monospace", color: "#cc88cc", fontStyle: "bold" });

    pokemon.moves.forEach((move, i) => {
      const y = sectionY + 20 + i * 38;
      this.add.rectangle(GAME_W / 2, y, 340, 32, 0x332244).setOrigin(0.5).setStrokeStyle(1, 0x554466);

      this.add.text(25, y - 5, move.name, { fontSize: "12px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5);
      const typeStr = move.type.charAt(0).toUpperCase() + move.type.slice(1);
      this.add.text(25, y + 9, `${typeStr}  Pow:${move.power}  CD:${move.cooldown}`, { fontSize: "8px", fontFamily: "monospace", color: "#888888" }).setOrigin(0, 0.5);

      // Forget button
      const forgetBg = this.add.rectangle(GAME_W - 50, y, 55, 24, 0x663333).setOrigin(0.5).setStrokeStyle(1, 0x884444);
      this.add.text(GAME_W - 50, y, "FORGET", { fontSize: "9px", fontFamily: "monospace", color: "#ff6666", fontStyle: "bold" }).setOrigin(0.5);

      // Don't allow forgetting if it's the last move
      if (pokemon.moves.length > 1) {
        forgetBg.setInteractive();
        forgetBg.on("pointerdown", () => {
          pokemon.moves.splice(i, 1);
          pokemon.cooldowns.splice(i, 1);
          saveGame(this.gameState);
          this.drawTrainMoves(rosterIndex);
        });
      } else {
        forgetBg.setAlpha(0.3);
      }
    });

    // Available moves section
    const availY = sectionY + 20 + pokemon.moves.length * 38 + 15;
    this.add.text(15, availY, "AVAILABLE TO LEARN", { fontSize: "11px", fontFamily: "monospace", color: "#88cc88", fontStyle: "bold" });

    const unlearned = trainable.filter((t) => !t.known);

    if (unlearned.length === 0) {
      this.add.text(GAME_W / 2, availY + 30, "No new moves available yet.\nLevel up to unlock more!", { fontSize: "11px", fontFamily: "monospace", color: "#666666", align: "center" }).setOrigin(0.5);
    } else {
      unlearned.forEach((entry, i) => {
        const y = availY + 22 + i * 42;
        if (y > GAME_H - 90) return;

        const canAfford = this.gameState.gold >= entry.cost;
        const hasMoveSlot = pokemon.moves.length < 4;
        const canLearn = canAfford && hasMoveSlot;

        this.add.rectangle(GAME_W / 2, y, 340, 36, canLearn ? 0x223322 : 0x1a1a22, 0.9).setOrigin(0.5).setStrokeStyle(1, canLearn ? 0x446644 : 0x333333);

        this.add.text(25, y - 7, entry.move.name, { fontSize: "12px", fontFamily: "monospace", color: canAfford ? "#ffffff" : "#666666", fontStyle: "bold" }).setOrigin(0, 0.5);
        const typeStr = entry.move.type.charAt(0).toUpperCase() + entry.move.type.slice(1);
        this.add.text(25, y + 8, `${typeStr}  Pow:${entry.move.power}  CD:${entry.move.cooldown}  Lv${entry.level}`, { fontSize: "8px", fontFamily: "monospace", color: "#888888" }).setOrigin(0, 0.5);

        // Cost + learn button
        this.add.text(GAME_W - 95, y, `${entry.cost}g`, { fontSize: "11px", fontFamily: "monospace", color: canAfford ? "#ffd700" : "#664400", fontStyle: "bold" }).setOrigin(0.5);

        if (canLearn) {
          const learnBg = this.add.rectangle(GAME_W - 40, y, 55, 24, 0x336633).setOrigin(0.5).setStrokeStyle(1, 0x448844);
          this.add.text(GAME_W - 40, y, "LEARN", { fontSize: "9px", fontFamily: "monospace", color: "#44ff44", fontStyle: "bold" }).setOrigin(0.5);
          learnBg.setInteractive();
          learnBg.on("pointerdown", () => {
            this.gameState.gold -= entry.cost;
            pokemon.moves.push(getMove(entry.moveId));
            pokemon.cooldowns.push(0);
            saveGame(this.gameState);
            this.drawTrainMoves(rosterIndex);
          });
        } else if (!hasMoveSlot) {
          this.add.text(GAME_W - 40, y, "FULL", { fontSize: "9px", fontFamily: "monospace", color: "#886644", fontStyle: "bold" }).setOrigin(0.5);
        }
      });
    }

    // Back button
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 45, 160, 38, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x774444);
    this.add.text(GAME_W / 2, GAME_H - 45, "BACK", { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.showScreen("train"));
  }

  private evolvePokemon(rosterIndex: number): void {
    const pokemon = this.gameState.roster[rosterIndex];
    const evoInfo = getEvolutionInfo(pokemon);
    if (!evoInfo || !evoInfo.canEvolve || this.gameState.gold < evoInfo.cost) return;

    this.gameState.gold -= evoInfo.cost;

    const oldName = pokemon.species.name;

    // Change species
    pokemon.species = evoInfo.evolvedSpecies;

    // Recalculate stats, preserve HP ratio
    const hpRatio = pokemon.currentHP / pokemon.maxHP;
    const newStats = calculateAllStats(pokemon.species.baseStats, pokemon.level);
    pokemon.stats = newStats;
    pokemon.maxHP = newStats.hp;
    pokemon.currentHP = Math.max(1, Math.round(hpRatio * pokemon.maxHP));

    // Keep existing moves — they carry over
    // Reset cooldowns
    pokemon.cooldowns = pokemon.moves.map(() => 0);

    saveGame(this.gameState);

    // Show evolution animation
    this.children.removeAll(true);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H / 2 - 100, "Congratulations!", {
      fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H / 2 - 60, `${oldName} evolved into`, {
      fontSize: "14px", fontFamily: "monospace", color: "#cccccc",
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H / 2 - 35, `${pokemon.species.name}!`, {
      fontSize: "22px", fontFamily: "monospace", color: "#ff8844", fontStyle: "bold",
    }).setOrigin(0.5);

    if (this.textures.exists(pokemon.species.spriteKey)) {
      const sprite = this.add.image(GAME_W / 2, GAME_H / 2 + 40, pokemon.species.spriteKey)
        .setDisplaySize(96, 96).setOrigin(0.5).setAlpha(0);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.tweens.add({ targets: sprite, alpha: 1, scale: { from: 0.5, to: 1 }, duration: 600, ease: "Back.easeOut" });
    }

    const tapText = this.add.text(GAME_W / 2, GAME_H / 2 + 120, "Tap to continue", {
      fontSize: "14px", fontFamily: "monospace", color: "#888888",
    }).setOrigin(0.5);
    this.tweens.add({ targets: tapText, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0).setOrigin(0.5);
    overlay.setInteractive();
    overlay.once("pointerdown", () => this.drawTrainMoves(rosterIndex));
  }

  private startAdventure(): void {
    this.gameState.playerParty = this.selectedParty.map((i) => this.gameState.roster[i]);
    for (const p of this.gameState.playerParty) {
      p.currentHP = p.maxHP;
      p.cooldowns = p.cooldowns.map(() => 0);
    }

    // Generate the map for current world/room
    const worldIdx = this.gameState.activeWorld;
    const mapIdx = this.gameState.worlds[worldIdx].currentMap;
    const map = generateDungeon(worldIdx, mapIdx);
    const cx = Math.floor(map.width / 2);
    const cy = Math.floor(map.height / 2);
    map.tiles[cy][cx].type = "floor";
    map.tiles[cy][cx].encounterChance = 0;

    this.gameState.currentMap = map;
    this.gameState.playerX = cx;
    this.gameState.playerY = cy;

    this.registry.set("gameState", this.gameState);
    saveGame(this.gameState);
    MusicManager.stop();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("MapScene");
    });
  }

  private getItemIcon(itemId: string): string {
    switch (itemId) {
      case "potion": return "\u2764"; // heart
      case "super_potion": return "\u2764";
      case "revive": return "\u2606"; // star
      case "escape_rope": return "\u21b6"; // arrow
      case "repel": return "\u2668"; // hotsprings
      case "dungeon_map": return "\u25a9"; // grid
      default: return "\u25a0"; // square
    }
  }
}
