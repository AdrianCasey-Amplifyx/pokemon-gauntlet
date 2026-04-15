import Phaser from "phaser";
import type { BattlePokemon, BattleItem, StatusType } from "../types.ts";
import { HPBar } from "./HPBar.ts";
import { MoveButton } from "./MoveButton.ts";
import { TYPE_COLORS } from "./TypeColors.ts";

const GAME_W = 390;
const GAME_H = 844;

export interface HUDCallbacks {
  onMoveSelect: (index: number) => void;
  onSwapSelect: (partyIndex: number) => void;
  onItemSelect: (itemIndex: number, targetIndex: number) => void;
}

export class BattleHUD {
  scene: Phaser.Scene;

  // Sprites
  enemySprite!: Phaser.GameObjects.Container;
  playerSprite!: Phaser.GameObjects.Container;

  // HP bars
  enemyHPBar!: HPBar;
  playerHPBar!: HPBar;

  // Move buttons
  moveButtons: MoveButton[] = [];

  // Action buttons (Swap / Items)
  private swapBtn!: Phaser.GameObjects.Container;
  private itemsBtn!: Phaser.GameObjects.Container;

  // Message area
  messageText!: Phaser.GameObjects.Text;
  effectivenessText!: Phaser.GameObjects.Text;

  // Overlay containers
  private swapOverlay: Phaser.GameObjects.Container | null = null;
  private itemOverlay: Phaser.GameObjects.Container | null = null;
  private itemTargetOverlay: Phaser.GameObjects.Container | null = null;

  // Party strip
  private partyStrip!: Phaser.GameObjects.Container;
  private partyDots: Phaser.GameObjects.Arc[] = [];
  private enemyPartyStrip!: Phaser.GameObjects.Container;
  private enemyDots: Phaser.GameObjects.Arc[] = [];

  // Status indicators
  private playerStatusText: Phaser.GameObjects.Text | null = null;
  private enemyStatusText: Phaser.GameObjects.Text | null = null;

  // Battle stat boost indicator (X items)
  private playerBoostText: Phaser.GameObjects.Text | null = null;

  // References
  private callbacks!: HUDCallbacks;
  private playerParty!: BattlePokemon[];
  private enemyParty!: BattlePokemon[];
  private playerItems!: BattleItem[];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(
    playerParty: BattlePokemon[],
    enemyParty: BattlePokemon[],
    playerItems: BattleItem[],
    callbacks: HUDCallbacks
  ): void {
    this.callbacks = callbacks;
    this.playerParty = playerParty;
    this.enemyParty = enemyParty;
    this.playerItems = playerItems;

    const playerPokemon = playerParty[0];
    const enemyPokemon = enemyParty[0];

    // -- Enemy party dots --
    this.enemyPartyStrip = this.scene.add.container(GAME_W / 2 - 120, 55);
    this.enemyDots = [];
    for (let i = 0; i < enemyParty.length; i++) {
      const dot = this.scene.add.circle(i * 18, 0, 6, 0x22cc44).setStrokeStyle(1, 0x333333);
      this.enemyPartyStrip.add(dot);
      this.enemyDots.push(dot);
    }

    // -- Enemy section (top) --
    this.enemySprite = this.createPokemonSprite(GAME_W / 2 + 40, 150, enemyPokemon);
    this.enemyHPBar = new HPBar(this.scene, GAME_W / 2 - 120, 75);
    this.enemyHPBar.setInfo(enemyPokemon.species.name, enemyPokemon.level);
    this.enemyHPBar.setHP(enemyPokemon.currentHP, enemyPokemon.maxHP, false);

    // -- Player section (middle) --
    this.playerSprite = this.createPokemonSprite(GAME_W / 2 - 40, 365, playerPokemon);
    this.playerHPBar = new HPBar(this.scene, GAME_W / 2 - 120, 295);
    this.playerHPBar.setInfo(playerPokemon.species.name, playerPokemon.level);
    this.playerHPBar.setHP(playerPokemon.currentHP, playerPokemon.maxHP, false);

    // -- Player party dots --
    this.partyStrip = this.scene.add.container(GAME_W / 2 - 120, 320);
    this.partyDots = [];
    for (let i = 0; i < playerParty.length; i++) {
      const dot = this.scene.add.circle(i * 18, 0, 6, 0x22cc44).setStrokeStyle(1, 0x333333);
      this.partyStrip.add(dot);
      this.partyDots.push(dot);
    }

    // Divider
    this.scene.add.rectangle(GAME_W / 2, 440, GAME_W - 40, 2, 0x444444).setOrigin(0.5);

    // -- Message area --
    this.messageText = this.scene.add
      .text(GAME_W / 2, 455, "What will you do?", {
        fontSize: "15px",
        fontFamily: "monospace",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: GAME_W - 40 },
      })
      .setOrigin(0.5, 0);

    this.effectivenessText = this.scene.add
      .text(GAME_W / 2, 490, "", {
        fontSize: "17px",
        fontFamily: "monospace",
        color: "#ffdd44",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);

    // -- Move buttons (2x2 grid) --
    const gridStartX = GAME_W / 2 - 88;
    const gridStartY = 555;
    const gapX = 180;
    const gapY = 64;

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const btn = new MoveButton(this.scene, gridStartX + col * gapX, gridStartY + row * gapY);

      // Always wire the click handler for every slot — updateMoveButtons
      // toggles visibility based on the current pokemon's move count, so
      // slots without a move are inert until a 4-move pokemon is switched
      // in. Without this, a pokemon with a 4th move that wasn't the lead
      // would have a dead button (e.g. switching to Butterfree with Gust).
      const moveIndex = i;
      btn.onClick(() => callbacks.onMoveSelect(moveIndex));

      if (i < playerPokemon.moves.length) {
        btn.setMove(playerPokemon.moves[i]);
        btn.setCooldown(playerPokemon.cooldowns[i]);
      } else {
        btn.setVisible(false);
      }

      this.moveButtons.push(btn);
    }

    // -- Swap & Items buttons --
    const actionY = 728;
    this.swapBtn = this.createActionButton(GAME_W / 2 - 95, actionY, "SWAP", 0x335588, () => {
      this.showSwapPanel(false);
    });
    this.itemsBtn = this.createActionButton(GAME_W / 2 + 95, actionY, "ITEMS", 0x885533, () => {
      this.showItemPanel();
    });

    this.updatePartyDots();
    this.updateEnemyPartyDots();
    this.updateStatBoostIndicator(playerPokemon);
  }

  private createActionButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, 150, 40, color).setOrigin(0.5).setStrokeStyle(1, 0x666666);
    const text = this.scene.add
      .text(0, 0, label, { fontSize: "15px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(150, 40);
    container.setInteractive();
    container.on("pointerdown", onClick);
    return container;
  }

  private createPokemonSprite(x: number, y: number, pokemon: BattlePokemon): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const spriteKey = pokemon.species.spriteKey;

    if (this.scene.textures.exists(spriteKey)) {
      const sprite = this.scene.add.image(0, 0, spriteKey)
        .setOrigin(0.5)
        .setDisplaySize(96, 96);
      // Nearest neighbor scaling for pixel art
      sprite.setTexture(spriteKey);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      container.add(sprite);
    } else {
      // Fallback colored rect
      const color = TYPE_COLORS[pokemon.species.types[0]];
      const rect = this.scene.add.rectangle(0, 0, 96, 96, color).setOrigin(0.5).setStrokeStyle(3, 0xffffff, 0.3);
      container.add(rect);
    }

    return container;
  }

  // --- Update active Pokemon display ---
  updateActivePokemon(playerPokemon: BattlePokemon, enemyPokemon: BattlePokemon): void {
    // Update player sprite
    this.playerSprite.destroy();
    this.playerSprite = this.createPokemonSprite(GAME_W / 2 - 40, 365, playerPokemon);

    this.playerHPBar.setInfo(playerPokemon.species.name, playerPokemon.level);
    this.playerHPBar.setHP(playerPokemon.currentHP, playerPokemon.maxHP, false);

    // Update enemy sprite
    this.enemySprite.destroy();
    this.enemySprite = this.createPokemonSprite(GAME_W / 2 + 40, 150, enemyPokemon);

    this.enemyHPBar.setInfo(enemyPokemon.species.name, enemyPokemon.level);
    this.enemyHPBar.setHP(enemyPokemon.currentHP, enemyPokemon.maxHP, false);

    // Update move buttons
    this.updateMoveButtons(playerPokemon);
    this.updatePartyDots();
    this.updateEnemyPartyDots();
    this.updateStatBoostIndicator(playerPokemon);
  }

  /** Show ATK/DEF/SPD/SPC arrows above the active player sprite when X items are active. */
  updateStatBoostIndicator(playerPokemon: BattlePokemon): void {
    if (this.playerBoostText) {
      this.playerBoostText.destroy();
      this.playerBoostText = null;
    }

    const boosts = playerPokemon.battleBoosts;
    const parts: string[] = [];
    if (boosts.atk > 0) parts.push(`ATK${"▲".repeat(boosts.atk)}`);
    if (boosts.def > 0) parts.push(`DEF${"▲".repeat(boosts.def)}`);
    if (boosts.spd > 0) parts.push(`SPD${"▲".repeat(boosts.spd)}`);
    if (boosts.spc > 0) parts.push(`SPC${"▲".repeat(boosts.spc)}`);

    if (parts.length === 0) return;

    this.playerBoostText = this.scene.add
      .text(GAME_W / 2 - 40, 305, parts.join(" "), {
        fontSize: "11px",
        fontFamily: "monospace",
        color: "#ffdd44",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  updateMoveButtons(pokemon: BattlePokemon): void {
    for (let i = 0; i < this.moveButtons.length; i++) {
      if (i < pokemon.moves.length) {
        this.moveButtons[i].setMove(pokemon.moves[i]);
        this.moveButtons[i].setCooldown(pokemon.cooldowns[i]);
        this.moveButtons[i].setVisible(true);
      } else {
        this.moveButtons[i].setVisible(false);
      }
    }
  }

  updateHP(target: "player" | "enemy", current: number, max: number, animate = true): void {
    const bar = target === "player" ? this.playerHPBar : this.enemyHPBar;
    bar.setHP(current, max, animate);
  }

  updateCooldowns(cooldowns: number[]): void {
    for (let i = 0; i < this.moveButtons.length && i < cooldowns.length; i++) {
      this.moveButtons[i].setCooldown(cooldowns[i]);
    }
  }

  setMovesEnabled(enabled: boolean): void {
    for (const btn of this.moveButtons) btn.setEnabled(enabled);
    if (this.swapBtn) this.swapBtn.setAlpha(enabled ? 1 : 0.4);
    if (this.itemsBtn) this.itemsBtn.setAlpha(enabled ? 1 : 0.4);
  }

  showMessage(text: string): void {
    this.messageText.setText(text);
  }

  showEffectiveness(effectiveness: number): void {
    let text = "";
    let color = "#ffdd44";
    if (effectiveness >= 2) { text = "Super effective!"; color = "#ff6644"; }
    else if (effectiveness > 0 && effectiveness < 1) { text = "Not very effective..."; color = "#888888"; }
    else if (effectiveness === 0) { text = "No effect!"; color = "#555555"; }
    if (!text) return;
    this.effectivenessText.setText(text).setColor(color).setAlpha(1);
    this.scene.tweens.add({ targets: this.effectivenessText, alpha: 0, duration: 1500, delay: 800 });
  }

  showDamageFloater(target: "player" | "enemy", amount: number): void {
    const sprite = target === "player" ? this.playerSprite : this.enemySprite;
    const x = sprite.x;
    const y = sprite.y - 40;
    const floater = this.scene.add
      .text(x, y, `-${amount}`, {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#ff4444",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.scene.tweens.add({
      targets: floater, y: y - 50, alpha: 0, duration: 800, ease: "Power2",
      onComplete: () => floater.destroy(),
    });
  }

  showHealFloater(target: "player" | "enemy", amount: number): void {
    const sprite = target === "player" ? this.playerSprite : this.enemySprite;
    const x = sprite.x;
    const y = sprite.y - 40;
    const floater = this.scene.add
      .text(x, y, `+${amount}`, {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#44ff44",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.scene.tweens.add({
      targets: floater, y: y - 50, alpha: 0, duration: 800, ease: "Power2",
      onComplete: () => floater.destroy(),
    });
  }

  flashSprite(target: "player" | "enemy"): void {
    const sprite = target === "player" ? this.playerSprite : this.enemySprite;
    this.scene.tweens.add({ targets: sprite, alpha: 0.2, duration: 80, yoyo: true, repeat: 2 });
  }

  // --- Party dots ---
  updatePartyDots(): void {
    for (let i = 0; i < this.partyDots.length && i < this.playerParty.length; i++) {
      const p = this.playerParty[i];
      if (p.currentHP <= 0) this.partyDots[i].setFillStyle(0xcc2222);
      else if (p.currentHP < p.maxHP * 0.5) this.partyDots[i].setFillStyle(0xddcc22);
      else this.partyDots[i].setFillStyle(0x22cc44);
    }
  }

  updateEnemyPartyDots(): void {
    for (let i = 0; i < this.enemyDots.length && i < this.enemyParty.length; i++) {
      const p = this.enemyParty[i];
      if (p.currentHP <= 0) this.enemyDots[i].setFillStyle(0xcc2222);
      else if (p.currentHP < p.maxHP * 0.5) this.enemyDots[i].setFillStyle(0xddcc22);
      else this.enemyDots[i].setFillStyle(0x22cc44);
    }
  }

  // --- Status indicators ---
  private static STATUS_LABELS: Record<StatusType, { text: string; color: string }> = {
    burn: { text: "BRN", color: "#ff6622" },
    poison: { text: "PSN", color: "#aa44cc" },
    paralyze: { text: "PAR", color: "#ddcc22" },
    sleep: { text: "SLP", color: "#8888cc" },
  };

  updateStatusDisplay(playerPokemon: BattlePokemon, enemyPokemon: BattlePokemon): void {
    this.playerStatusText?.destroy();
    this.enemyStatusText?.destroy();
    this.playerStatusText = null;
    this.enemyStatusText = null;

    if (playerPokemon.statusEffects.length > 0) {
      const labels = playerPokemon.statusEffects.map((s) => {
        const info = BattleHUD.STATUS_LABELS[s];
        return info ? info.text : s;
      });
      this.playerStatusText = this.scene.add.text(GAME_W / 2 + 80, 305, labels.join(" "), {
        fontSize: "11px", fontFamily: "monospace", color: BattleHUD.STATUS_LABELS[playerPokemon.statusEffects[0]]?.color ?? "#ffffff",
        fontStyle: "bold", stroke: "#000000", strokeThickness: 2,
      }).setOrigin(0, 0.5).setDepth(50);
    }

    if (enemyPokemon.statusEffects.length > 0) {
      const labels = enemyPokemon.statusEffects.map((s) => {
        const info = BattleHUD.STATUS_LABELS[s];
        return info ? info.text : s;
      });
      this.enemyStatusText = this.scene.add.text(GAME_W / 2 + 80, 85, labels.join(" "), {
        fontSize: "11px", fontFamily: "monospace", color: BattleHUD.STATUS_LABELS[enemyPokemon.statusEffects[0]]?.color ?? "#ffffff",
        fontStyle: "bold", stroke: "#000000", strokeThickness: 2,
      }).setOrigin(0, 0.5).setDepth(50);
    }
  }

  showStatusFloater(target: "player" | "enemy", text: string, color: string): void {
    const sprite = target === "player" ? this.playerSprite : this.enemySprite;
    const x = sprite.x;
    const y = sprite.y + 40;
    const floater = this.scene.add
      .text(x, y, text, {
        fontSize: "14px", fontFamily: "monospace", color, fontStyle: "bold",
        stroke: "#000000", strokeThickness: 2,
      })
      .setOrigin(0.5).setDepth(100);
    this.scene.tweens.add({
      targets: floater, y: y - 30, alpha: 0, duration: 1000, ease: "Power2",
      onComplete: () => floater.destroy(),
    });
  }

  /**
   * Disable (or re-enable) input on the battle HUD's own buttons so an
   * overlay modal can't leak clicks through to the move grid or the
   * SWAP / ITEMS actions underneath it. Relying on Phaser's topOnly +
   * a setInteractive backdrop wasn't enough in practice — taps on empty
   * overlay space were still firing the HUD buttons below.
   */
  private setHudInputEnabled(enabled: boolean): void {
    for (const btn of this.moveButtons) {
      if (enabled) {
        // Only re-enable slots that are actually showing a move —
        // hidden empty slots should stay non-interactive.
        if (btn.visible) btn.setInteractive();
      } else {
        btn.disableInteractive();
      }
    }
    if (this.swapBtn) {
      if (enabled) this.swapBtn.setInteractive();
      else this.swapBtn.disableInteractive();
    }
    if (this.itemsBtn) {
      if (enabled) this.itemsBtn.setInteractive();
      else this.itemsBtn.disableInteractive();
    }
  }

  private anyOverlayOpen(): boolean {
    return !!(this.swapOverlay || this.itemOverlay || this.itemTargetOverlay);
  }

  // --- Swap panel ---
  showSwapPanel(forceSwap: boolean): void {
    if (this.swapOverlay) return;
    this.closeAllOverlays();
    this.setHudInputEnabled(false);

    this.swapOverlay = this.scene.add.container(0, 0).setDepth(150);

    const bg = this.scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7).setOrigin(0.5);
    bg.setInteractive();
    this.swapOverlay.add(bg);

    const title = this.scene.add
      .text(GAME_W / 2, 80, forceSwap ? "Send in who?" : "Switch to who?", {
        fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.swapOverlay.add(title);

    const startY = 140;
    const gap = 100;

    this.playerParty.forEach((pokemon, i) => {
      const y = startY + i * gap;
      const isActive = false; // visual only, not blocking selection
      const card = this.createPartyCard(pokemon, GAME_W / 2, y, i, isActive);
      this.swapOverlay!.add(card);
    });

    if (!forceSwap) {
      const cancelBg = this.scene.add.rectangle(GAME_W / 2, GAME_H - 60, 150, 40, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x666666);
      const cancelText = this.scene.add
        .text(GAME_W / 2, GAME_H - 60, "CANCEL", { fontSize: "15px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" })
        .setOrigin(0.5);
      cancelBg.setInteractive();
      cancelBg.on("pointerdown", () => this.closeSwapPanel());
      this.swapOverlay.add([cancelBg, cancelText]);
    }
  }

  private createPartyCard(
    pokemon: BattlePokemon,
    x: number,
    y: number,
    partyIndex: number,
    _isActive: boolean
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const fainted = pokemon.currentHP <= 0;
    const bgColor = fainted ? 0x332222 : 0x222244;
    const cardBg = this.scene.add.rectangle(0, 0, 340, 80, bgColor, 0.9).setOrigin(0.5).setStrokeStyle(2, 0x444466);

    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    const spriteKey = pokemon.species.spriteKey;
    if (this.scene.textures.exists(spriteKey)) {
      sprite = this.scene.add.image(-130, 0, spriteKey).setOrigin(0.5).setDisplaySize(44, 44);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      const color = TYPE_COLORS[pokemon.species.types[0]];
      sprite = this.scene.add.rectangle(-130, 0, 44, 44, color).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.3);
    }

    const nameText = this.scene.add
      .text(-80, -15, pokemon.species.name, { fontSize: "15px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0, 0.5);

    const hpPct = Math.round((pokemon.currentHP / pokemon.maxHP) * 100);
    const hpColor = fainted ? "#cc2222" : hpPct > 50 ? "#22cc44" : hpPct > 25 ? "#ddcc22" : "#cc2222";
    const hpText = this.scene.add
      .text(-80, 10, fainted ? "FAINTED" : `HP: ${pokemon.currentHP}/${pokemon.maxHP}`, {
        fontSize: "12px", fontFamily: "monospace", color: hpColor,
      })
      .setOrigin(0, 0.5);

    container.add([cardBg, sprite, nameText, hpText]);

    if (!fainted) {
      cardBg.setInteractive();
      cardBg.on("pointerover", () => cardBg.setStrokeStyle(2, 0x6688ff));
      cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, 0x444466));
      cardBg.on("pointerdown", () => {
        this.closeSwapPanel();
        this.callbacks.onSwapSelect(partyIndex);
      });
    }

    return container;
  }

  closeSwapPanel(): void {
    if (this.swapOverlay) {
      this.swapOverlay.destroy(true);
      this.swapOverlay = null;
    }
    if (!this.anyOverlayOpen()) this.setHudInputEnabled(true);
  }

  // --- Item panel ---
  showItemPanel(): void {
    if (this.itemOverlay) return;
    this.closeAllOverlays();
    this.setHudInputEnabled(false);

    this.itemOverlay = this.scene.add.container(0, 0).setDepth(150);
    const bg = this.scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7).setOrigin(0.5);
    bg.setInteractive();
    this.itemOverlay.add(bg);

    const title = this.scene.add
      .text(GAME_W / 2, 100, "Use which item?", {
        fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.itemOverlay.add(title);

    const startY = 180;
    const gap = 90;

    // Only medicine + battle items are usable in battle. This also hides
    // escape rope / repel / map from the battle menu (previously they appeared
    // here and silently failed when used).
    const usableIndices: number[] = [];
    this.playerItems.forEach((belt, i) => {
      if (belt.quantity <= 0) return;
      if (belt.item.category !== "medicine" && belt.item.category !== "battle") return;
      usableIndices.push(i);
    });

    if (usableIndices.length === 0) {
      const noItems = this.scene.add
        .text(GAME_W / 2, 300, "No usable items!", { fontSize: "16px", fontFamily: "monospace", color: "#888888" })
        .setOrigin(0.5);
      this.itemOverlay.add(noItems);
    } else {
      usableIndices.forEach((itemIdx, slot) => {
        const y = startY + slot * gap;
        const card = this.createItemCard(this.playerItems[itemIdx], GAME_W / 2, y, itemIdx);
        this.itemOverlay!.add(card);
      });
    }

    const cancelBg = this.scene.add.rectangle(GAME_W / 2, GAME_H - 60, 150, 40, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x666666);
    const cancelText = this.scene.add
      .text(GAME_W / 2, GAME_H - 60, "CANCEL", { fontSize: "15px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    cancelBg.setInteractive();
    cancelBg.on("pointerdown", () => this.closeItemPanel());
    this.itemOverlay.add([cancelBg, cancelText]);
  }

  private createItemCard(belt: BattleItem, x: number, y: number, itemIndex: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const cardBg = this.scene.add.rectangle(0, 0, 340, 70, 0x443322, 0.9).setOrigin(0.5).setStrokeStyle(2, 0x665544);

    const nameText = this.scene.add
      .text(-140, -10, `${belt.item.name} x${belt.quantity}`, {
        fontSize: "16px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const descText = this.scene.add
      .text(-140, 14, belt.item.description, { fontSize: "11px", fontFamily: "monospace", color: "#aaaaaa" })
      .setOrigin(0, 0.5);

    container.add([cardBg, nameText, descText]);

    cardBg.setInteractive();
    cardBg.on("pointerover", () => cardBg.setStrokeStyle(2, 0xaa8866));
    cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, 0x665544));
    cardBg.on("pointerdown", () => {
      this.closeItemPanel();
      // Battle items (X Attack etc) apply directly to the active battler —
      // no target picker. Medicine still shows the party picker.
      if (belt.item.category === "battle") {
        // Resolve the current active index via the live playerActiveIndex lookup
        // that BattleScene maintains — we piggyback on callbacks.onItemSelect
        // with a synthetic "active index" sentinel of -1.
        this.callbacks.onItemSelect(itemIndex, -1);
      } else {
        this.showItemTargetPanel(itemIndex);
      }
    });

    return container;
  }

  closeItemPanel(): void {
    if (this.itemOverlay) {
      this.itemOverlay.destroy(true);
      this.itemOverlay = null;
    }
    if (!this.anyOverlayOpen()) this.setHudInputEnabled(true);
  }

  // --- Item target selection ---
  private showItemTargetPanel(itemIndex: number): void {
    this.setHudInputEnabled(false);
    this.itemTargetOverlay = this.scene.add.container(0, 0).setDepth(150);
    const bg = this.scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7).setOrigin(0.5);
    bg.setInteractive();
    this.itemTargetOverlay.add(bg);

    const belt = this.playerItems[itemIndex];
    const isRevive = belt.item.id === "revive";

    const title = this.scene.add
      .text(GAME_W / 2, 80, `Use ${belt.item.name} on who?`, {
        fontSize: "18px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.itemTargetOverlay.add(title);

    const startY = 140;
    const gap = 100;

    this.playerParty.forEach((pokemon, i) => {
      const y = startY + i * gap;
      const fainted = pokemon.currentHP <= 0;
      const fullHP = pokemon.currentHP >= pokemon.maxHP;

      // Revive only works on fainted; potions only on alive + not full HP
      const canTarget = isRevive ? fainted : (!fainted && !fullHP);

      const container = this.scene.add.container(GAME_W / 2, y);
      const bgColor = canTarget ? 0x222244 : 0x222222;
      const cardBg = this.scene.add.rectangle(0, 0, 340, 80, bgColor, 0.9).setOrigin(0.5).setStrokeStyle(2, 0x444466);

      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
      const spriteKey = pokemon.species.spriteKey;
      if (this.scene.textures.exists(spriteKey)) {
        // Full-alpha even when non-targetable — disabled state is conveyed by
        // card color and text, not a dim sprite (same fix as MapScene/MainMenu).
        const img = this.scene.add.image(-130, 0, spriteKey).setOrigin(0.5).setDisplaySize(50, 50);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        sprite = img;
      } else {
        const color = TYPE_COLORS[pokemon.species.types[0]];
        sprite = this.scene.add.rectangle(-130, 0, 50, 50, color).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.3);
      }

      const nameText = this.scene.add
        .text(-80, -15, pokemon.species.name, { fontSize: "15px", fontFamily: "monospace", color: canTarget ? "#ffffff" : "#666666", fontStyle: "bold" })
        .setOrigin(0, 0.5);

      const hpColor = fainted ? "#cc2222" : "#22cc44";
      const hpText = this.scene.add
        .text(-80, 10, fainted ? "FAINTED" : `HP: ${pokemon.currentHP}/${pokemon.maxHP}`, {
          fontSize: "12px", fontFamily: "monospace", color: hpColor,
        })
        .setOrigin(0, 0.5);

      container.add([cardBg, sprite, nameText, hpText]);

      if (canTarget) {
        cardBg.setInteractive();
        cardBg.on("pointerover", () => cardBg.setStrokeStyle(2, 0x6688ff));
        cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, 0x444466));
        cardBg.on("pointerdown", () => {
          this.closeItemTargetPanel();
          this.callbacks.onItemSelect(itemIndex, i);
        });
      }

      this.itemTargetOverlay!.add(container);
    });

    const cancelBg = this.scene.add.rectangle(GAME_W / 2, GAME_H - 60, 150, 40, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x666666);
    const cancelText = this.scene.add
      .text(GAME_W / 2, GAME_H - 60, "CANCEL", { fontSize: "15px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    cancelBg.setInteractive();
    cancelBg.on("pointerdown", () => this.closeItemTargetPanel());
    this.itemTargetOverlay.add([cancelBg, cancelText]);
  }

  closeItemTargetPanel(): void {
    if (this.itemTargetOverlay) {
      this.itemTargetOverlay.destroy(true);
      this.itemTargetOverlay = null;
    }
    if (!this.anyOverlayOpen()) this.setHudInputEnabled(true);
  }

  closeAllOverlays(): void {
    this.closeSwapPanel();
    this.closeItemPanel();
    this.closeItemTargetPanel();
  }

  // --- Battle end ---
  showBattleEnd(result: "win" | "lose"): void {
    this.closeAllOverlays();
    const overlay = this.scene.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6)
      .setOrigin(0.5).setDepth(200).setAlpha(0);

    const resultText = this.scene.add
      .text(GAME_W / 2, GAME_H / 2 - 40, result === "win" ? "VICTORY!" : "DEFEAT", {
        fontSize: "42px", fontFamily: "monospace",
        color: result === "win" ? "#44ff44" : "#ff4444",
        fontStyle: "bold", stroke: "#000000", strokeThickness: 4,
      })
      .setOrigin(0.5).setDepth(201).setAlpha(0);

    const playAgainText = this.scene.add
      .text(GAME_W / 2, GAME_H / 2 + 30, "Tap to play again", {
        fontSize: "18px", fontFamily: "monospace", color: "#cccccc",
      })
      .setOrigin(0.5).setDepth(201).setAlpha(0);

    this.scene.tweens.add({ targets: [overlay, resultText, playAgainText], alpha: 1, duration: 500 });
    overlay.setInteractive();
    overlay.once("pointerdown", () => this.scene.scene.restart());
  }
}
