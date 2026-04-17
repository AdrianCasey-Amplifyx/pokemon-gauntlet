import Phaser from "phaser";
import type { GameState, BattlePokemon, Direction, PokemonSpecies, EggTier } from "../types.ts";
import { revealTilesAround } from "../core/fogOfWar.ts";
import { createBattlePokemon, xpToNextLevel } from "../core/statCalc.ts";
import { applyItem } from "../data/items.ts";
import { getPokemon } from "../data/pokemon.ts";
import { MusicManager } from "../audio/MusicManager.ts";
import { showToast } from "../ui/Toast.ts";
import { describeItemResult } from "../ui/itemFeedback.ts";
import { saveGame } from "../core/saveManager.ts";
import { getEncounterLevel, getEnemyPartySize, getRandomEncounterSpecies, MAPS_PER_WORLD, WORLD_NAMES, isBossRoom, getBossSpecies, getBossLevel, trackForWorld } from "../data/worlds.ts";
import { EGG_TIERS, tickEggs, calculateHatchLevel } from "../data/eggs.ts";

const GAME_W = 390;
const GAME_H = 844;

export class MapScene extends Phaser.Scene {
  private gameState!: GameState;
  private tileRects: Phaser.GameObjects.Rectangle[][] = [];
  private fogRects: Phaser.GameObjects.Rectangle[][] = [];
  private playerToken!: Phaser.GameObjects.Container;
  private isMoving = false;
  private gridSize = 15;
  private tileSize = 22;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private repelText: Phaser.GameObjects.Text | null = null;
  private repelBar: Phaser.GameObjects.Rectangle | null = null;
  private repelBarBg: Phaser.GameObjects.Rectangle | null = null;
  // Count of currently-open modal overlays. The scene-level tap-to-move
  // handler checks this to avoid leaking clicks through a modal into the
  // map behind it. Use registerModal() to wire automatic decrement on
  // destroy.
  private activeModals = 0;

  constructor() {
    super({ key: "MapScene" });
  }

  create(): void {
    this.tileRects = [];
    this.fogRects = [];
    this.isMoving = false;

    const battleResult = this.registry.get("battleResult") as string | undefined;
    if (battleResult) this.registry.remove("battleResult");

    this.gameState = this.registry.get("gameState") as GameState;
    if (!this.gameState || !this.gameState.currentMap) {
      this.scene.start("MainMenuScene");
      return;
    }

    const alive = this.gameState.playerParty.some((p) => p.currentHP > 0);
    if (!alive) {
      this.scene.start("MainMenuScene");
      return;
    }

    for (const p of this.gameState.playerParty) {
      p.cooldowns = p.cooldowns.map(() => 0);
    }

    // Layout calculations
    const map = this.gameState.currentMap;
    this.gridSize = map.width;

    // Grid fills full width with padding
    const gridPad = 10;
    this.tileSize = Math.floor((GAME_W - gridPad * 2) / this.gridSize);
    const gridPixels = this.tileSize * this.gridSize;
    this.gridOffsetX = Math.floor((GAME_W - gridPixels) / 2);
    this.gridOffsetY = 115; // below header + party strip

    this.buildMapUI();
    MusicManager.play(trackForWorld(map.worldIndex));
  }

  private buildMapUI(): void {
    // Force-disable input on every child before destroying so the
    // Phaser input plugin drops them synchronously — otherwise a
    // destroyed button can linger in the hit-test list for a frame
    // and leak taps to the next screen. Same rationale as
    // MainMenuScene.resetScreen.
    this.children.each((child) => {
      const go = child as Phaser.GameObjects.GameObject;
      if (go.input) go.disableInteractive();
    });
    this.children.removeAll(true);
    this.tileRects = [];
    this.fogRects = [];

    const map = this.gameState.currentMap!;

    // === HEADER (y: 0-40) ===
    this.add.text(GAME_W / 2, 14, WORLD_NAMES[map.worldIndex], {
      fontSize: "14px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 32, `Room ${map.mapIndex + 1}/${MAPS_PER_WORLD}  |  Gold: ${this.gameState.gold}`, {
      fontSize: "10px", fontFamily: "monospace", color: "#ffd700",
    }).setOrigin(0.5);

    // === PARTY STRIP (y: 45-110) — horizontal cards ===
    this.drawPartyStrip();

    // === REPEL INDICATOR ===
    this.drawRepelIndicator();

    // === GRID (y: gridOffsetY) ===
    revealTilesAround(map, this.gameState.playerX, this.gameState.playerY, 1);

    for (let row = 0; row < map.height; row++) {
      this.tileRects[row] = [];
      this.fogRects[row] = [];
      for (let col = 0; col < map.width; col++) {
        const x = this.gridOffsetX + col * this.tileSize;
        const y = this.gridOffsetY + row * this.tileSize;
        const tile = map.tiles[row][col];

        let tileColor = 0x2a2a3e;
        if (tile.type === "wall") tileColor = 0x12121e;
        else if (tile.type === "exit") tileColor = isBossRoom(map.mapIndex) ? 0x5a2a2a : 0x2a5a2a;

        this.tileRects[row][col] = this.add
          .rectangle(x, y, this.tileSize - 1, this.tileSize - 1, tileColor).setOrigin(0, 0);

        // Gold sparkle on tiles with gold
        if (tile.type === "floor" && tile.goldDrop > 0 && tile.revealed) {
          this.add.text(x + this.tileSize / 2, y + this.tileSize / 2, "$", {
            fontSize: `${Math.max(8, this.tileSize - 8)}px`, fontFamily: "monospace", color: "#ffd700",
          }).setOrigin(0.5).setDepth(4).setAlpha(0.7);
        }

        if (tile.type === "exit" && tile.revealed && tile.exitDirection) {
          const isBoss = isBossRoom(map.mapIndex);
          const arrows: Record<Direction, string> = { up: "^", down: "v", left: "<", right: ">" };
          const exitLabel = isBoss ? "!" : arrows[tile.exitDirection];
          const exitColor = isBoss ? "#ff4444" : "#88ff88";
          this.add.text(x + this.tileSize / 2, y + this.tileSize / 2, exitLabel, {
            fontSize: `${Math.max(10, this.tileSize - 4)}px`, fontFamily: "monospace", color: exitColor, fontStyle: "bold",
          }).setOrigin(0.5).setDepth(5);
        }

        const fogAlpha = tile.revealed ? (tile.visited ? 0 : 0.4) : 0.95;
        this.fogRects[row][col] = this.add
          .rectangle(x, y, this.tileSize - 1, this.tileSize - 1, 0x08080e).setOrigin(0, 0).setAlpha(fogAlpha);
      }
    }

    this.playerToken = this.createPlayerToken(this.gameState.playerX, this.gameState.playerY);

    // === BOTTOM CONTROLS (anchored to bottom of canvas) ===
    const bottomY = GAME_H;

    // D-pad centered, above buttons
    const dpadCy = bottomY - 115;
    const dpadCx = GAME_W / 2;
    this.createDPad(dpadCx, dpadCy);

    // Pokemon + Items + Escape buttons at very bottom
    const btnRow = bottomY - 30;
    this.createBottomButton(65, btnRow, "POKEMON", 0x335588, () => this.showPokemonModal(), 110);
    this.createBottomButton(195, btnRow, "ITEMS", 0x885533, () => this.showItemModal(), 110);
    this.createBottomButton(325, btnRow, "ESCAPE", 0x553333, () => this.useEscapeRope(), 110);

    // Tap-to-move. `buildMapUI` is called many times per run (after using
    // Map / Repel, on room rebuild, etc.) so we remove any previous
    // handler before registering a fresh one — otherwise listeners stack
    // and every tap fires tryMove multiple times. The `activeModals`
    // guard stops taps from leaking through open modals into the map.
    this.input.removeAllListeners("pointerdown");
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.activeModals > 0) return;
      const col = Math.floor((pointer.x - this.gridOffsetX) / this.tileSize);
      const row = Math.floor((pointer.y - this.gridOffsetY) / this.tileSize);
      if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;
      const dx = col - this.gameState.playerX;
      const dy = row - this.gameState.playerY;
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        if (dx === 1) this.tryMove("right");
        else if (dx === -1) this.tryMove("left");
        else if (dy === 1) this.tryMove("down");
        else if (dy === -1) this.tryMove("up");
      }
    });
  }

  /** Track a modal so tap-to-move ignores clicks while it is open. */
  private registerModal(obj: Phaser.GameObjects.GameObject): void {
    this.activeModals++;
    obj.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.activeModals = Math.max(0, this.activeModals - 1);
    });
  }

  // === PARTY STRIP — horizontal row of mini cards ===
  private drawPartyStrip(): void {
    const party = this.gameState.playerParty;
    const cardW = Math.min(120, (GAME_W - 20) / party.length - 4);
    const cardH = 58;
    const startX = Math.floor((GAME_W - (cardW + 4) * party.length) / 2);
    const y = 48;

    party.forEach((pokemon, i) => {
      const x = startX + i * (cardW + 4);
      const fainted = pokemon.currentHP <= 0;

      // Card bg
      this.add.rectangle(x + cardW / 2, y + cardH / 2, cardW, cardH, fainted ? 0x1a1111 : 0x1a1a2e)
        .setOrigin(0.5).setStrokeStyle(1, fainted ? 0x442222 : 0x333355);

      // Sprite
      const spriteKey = pokemon.species.spriteKey;
      if (this.textures.exists(spriteKey)) {
        const img = this.add.image(x + 18, y + cardH / 2, spriteKey)
          .setDisplaySize(26, 26).setOrigin(0.5).setAlpha(fainted ? 0.3 : 1);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      // Name + Level
      this.add.text(x + 34, y + 6, pokemon.species.name, {
        fontSize: "8px", fontFamily: "monospace", color: fainted ? "#666666" : "#ffffff", fontStyle: "bold",
      });
      this.add.text(x + cardW - 3, y + 6, `${pokemon.level}`, {
        fontSize: "8px", fontFamily: "monospace", color: "#aaaaaa",
      }).setOrigin(1, 0);

      // HP bar
      const barX = x + 34;
      const barY = y + 20;
      const barW = cardW - 40;
      this.add.rectangle(barX + barW / 2, barY + 2, barW, 4, 0x333333).setOrigin(0.5);
      if (!fainted) {
        const pct = Math.max(0, pokemon.currentHP / pokemon.maxHP);
        const color = pct > 0.5 ? 0x22cc44 : pct > 0.25 ? 0xddcc22 : 0xcc2222;
        if (pct > 0) this.add.rectangle(barX, barY, pct * barW, 4, color).setOrigin(0, 0);
      }
      this.add.text(barX, barY + 6, fainted ? "FNT" : `${pokemon.currentHP}/${pokemon.maxHP}`, {
        fontSize: "6px", fontFamily: "monospace", color: fainted ? "#cc4444" : "#888888",
      });

      // XP bar + numeric — bg and fill share origin so they align to the pixel,
      // and the numeric text makes it obvious whether the bar is in sync with
      // the underlying currentXP (the detailed Pokemon modal is the source of
      // truth for XP state).
      const xpY = barY + 14;
      const needed = xpToNextLevel(pokemon.level);
      const rawXP = Math.max(0, pokemon.currentXP);
      const xpPct = Math.min(rawXP / needed, 1);
      const xpH = 4;
      this.add.rectangle(barX, xpY, barW, xpH, 0x222244).setOrigin(0, 0);
      if (xpPct > 0) {
        this.add.rectangle(barX, xpY, Math.max(1, xpPct * barW), xpH, 0x4488cc).setOrigin(0, 0);
      }
      this.add.text(barX, xpY + xpH + 1, `XP ${rawXP}/${needed}`, {
        fontSize: "6px", fontFamily: "monospace", color: "#4488cc",
      });
    });
  }

  // === REPEL INDICATOR ===
  private drawRepelIndicator(): void {
    const steps = this.gameState.repelSteps;
    if (steps <= 0) {
      this.repelText = null;
      this.repelBar = null;
      this.repelBarBg = null;
      return;
    }
    const y = 110;
    const barW = 120;
    const pct = Math.min(steps / 20, 1);
    this.repelBarBg = this.add.rectangle(GAME_W / 2, y, barW, 6, 0x222233).setOrigin(0.5).setDepth(15);
    this.repelBar = this.add.rectangle(GAME_W / 2 - barW / 2, y, pct * barW, 6, 0x44bbaa).setOrigin(0, 0.5).setDepth(15);
    this.repelText = this.add.text(GAME_W / 2 + barW / 2 + 8, y, `${steps}`, {
      fontSize: "9px", fontFamily: "monospace", color: "#44bbaa", fontStyle: "bold",
    }).setOrigin(0, 0.5).setDepth(15);
  }

  private updateRepelUI(): void {
    const steps = this.gameState.repelSteps;
    if (steps <= 0) {
      this.repelText?.destroy();
      this.repelBar?.destroy();
      this.repelBarBg?.destroy();
      this.repelText = null;
      this.repelBar = null;
      this.repelBarBg = null;
      return;
    }
    const barW = 120;
    const pct = Math.min(steps / 20, 1);
    if (this.repelBar) {
      this.repelBar.width = pct * barW;
    }
    if (this.repelText) {
      this.repelText.setText(`${steps}`);
    }
  }

  // === PLAYER TOKEN ===
  private createPlayerToken(col: number, row: number): Phaser.GameObjects.Container {
    const x = this.gridOffsetX + col * this.tileSize + this.tileSize / 2;
    const y = this.gridOffsetY + row * this.tileSize + this.tileSize / 2;
    const container = this.add.container(x, y).setDepth(10);

    const lead = this.gameState.playerParty.find((p) => p.currentHP > 0);
    const spriteKey = lead?.species.spriteKey;
    const tokenSize = Math.min(this.tileSize - 2, 24);

    if (spriteKey && this.textures.exists(spriteKey)) {
      const img = this.add.image(0, 0, spriteKey).setDisplaySize(tokenSize, tokenSize).setOrigin(0.5);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      container.add(img);
    } else {
      container.add(this.add.circle(0, 0, tokenSize / 2, 0xf8d030).setStrokeStyle(2, 0xffffff));
    }

    container.add(this.add.circle(0, 0, tokenSize / 2 + 2).setStrokeStyle(1, 0xf8d030, 0.5).setFillStyle(0x000000, 0));
    return container;
  }

  // === D-PAD ===
  private createDPad(cx: number, cy: number): void {
    const size = 48;
    const gap = 52;
    const dirs: { dir: Direction; dx: number; dy: number; label: string }[] = [
      { dir: "up", dx: 0, dy: -gap, label: "^" },
      { dir: "down", dx: 0, dy: gap, label: "v" },
      { dir: "left", dx: -gap, dy: 0, label: "<" },
      { dir: "right", dx: gap, dy: 0, label: ">" },
    ];
    for (const { dir, dx, dy, label } of dirs) {
      const btn = this.add.container(cx + dx, cy + dy);
      btn.add(this.add.rectangle(0, 0, size, size, 0x333355).setOrigin(0.5).setStrokeStyle(2, 0x555577));
      btn.add(this.add.text(0, 0, label, { fontSize: "20px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5));
      btn.setSize(size, size).setInteractive();
      btn.on("pointerdown", () => this.tryMove(dir));
    }
    this.add.circle(cx, cy, 6, 0x222244).setStrokeStyle(1, 0x444466);
  }

  // === BOTTOM BUTTONS ===
  private createBottomButton(cx: number, cy: number, label: string, color: number, onClick: () => void, width: number = 120): void {
    const btn = this.add.container(cx, cy);
    btn.add(this.add.rectangle(0, 0, width, 36, color).setOrigin(0.5).setStrokeStyle(1, 0x666666));
    btn.add(this.add.text(0, 0, label, { fontSize: "12px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5));
    btn.setSize(width, 36).setInteractive();
    btn.on("pointerdown", onClick);
  }

  private useEscapeRope(): void {
    const rope = this.gameState.playerItems.find((b) => b.item.id === "escape_rope" && b.quantity > 0);
    if (rope) {
      rope.quantity--;
      saveGame(this.gameState);
      this.scene.start("MainMenuScene");
    }
  }

  // === MOVEMENT ===
  private tryMove(dir: Direction): void {
    if (this.isMoving) return;

    const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const nx = this.gameState.playerX + dx;
    const ny = this.gameState.playerY + dy;

    if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) return;
    const tile = this.gameState.currentMap!.tiles[ny][nx];
    if (tile.type === "wall") return;

    this.isMoving = true;
    this.gameState.playerX = nx;
    this.gameState.playerY = ny;

    const targetX = this.gridOffsetX + nx * this.tileSize + this.tileSize / 2;
    const targetY = this.gridOffsetY + ny * this.tileSize + this.tileSize / 2;

    this.tweens.add({
      targets: this.playerToken, x: targetX, y: targetY,
      duration: 80, ease: "Power1",
      onComplete: () => {
        revealTilesAround(this.gameState.currentMap!, nx, ny, 1);
        this.refreshFog();

        // Gold pickup
        if (tile.goldDrop > 0) {
          this.gameState.gold += tile.goldDrop;
          const floater = this.add.text(targetX, targetY - 12, `+${tile.goldDrop}g`, {
            fontSize: "11px", fontFamily: "monospace", color: "#ffd700", fontStyle: "bold",
            stroke: "#000000", strokeThickness: 2,
          }).setOrigin(0.5).setDepth(100);
          this.tweens.add({ targets: floater, y: targetY - 35, alpha: 0, duration: 500, onComplete: () => floater.destroy() });
          tile.goldDrop = 0;
        }

        if (tile.type === "exit") {
          const map = this.gameState.currentMap!;
          if (isBossRoom(map.mapIndex)) {
            this.triggerBossBattle();
            return;
          }
          this.completeMap();
          return;
        }

        // Repel step tracking
        if (this.gameState.repelSteps > 0) {
          this.gameState.repelSteps--;
          this.updateRepelUI();
          if (this.gameState.repelSteps === 0) {
            const worn = this.add.text(GAME_W / 2, this.gridOffsetY - 5, "Repel wore off!", {
              fontSize: "11px", fontFamily: "monospace", color: "#cc8844", fontStyle: "bold",
              stroke: "#000000", strokeThickness: 2,
            }).setOrigin(0.5).setDepth(100);
            this.tweens.add({ targets: worn, y: worn.y - 20, alpha: 0, duration: 1200, onComplete: () => worn.destroy() });
          }
        }

        // Egg tick — hatch preempts any encounter on this step
        if (this.tickEggsAndMaybeHatch()) {
          return;
        }

        if (this.gameState.repelSteps <= 0 && tile.encounterChance > 0 && Math.random() < tile.encounterChance) {
          tile.encounterChance = 0;
          this.triggerBattle();
          return;
        }
        this.isMoving = false;
      },
    });
  }

  /** Tick every egg by 1 step; if one hatches, play the hatch overlay and return true. */
  private tickEggsAndMaybeHatch(): boolean {
    const hatched = tickEggs(this.gameState.eggs);
    if (!hatched) return false;

    const tier = hatched.tier;
    const species = getPokemon(hatched.speciesId);
    const level = calculateHatchLevel(this.gameState.roster);
    const newPokemon = createBattlePokemon(species, level);
    this.gameState.roster.push(newPokemon);
    const prevSeen = this.gameState.seenPokemon[species.id] ?? 0;
    if (level > prevSeen) {
      this.gameState.seenPokemon[species.id] = level;
    }
    if (!this.gameState.caughtPokemon.includes(species.id)) {
      this.gameState.caughtPokemon.push(species.id);
    }
    this.gameState.eggs = this.gameState.eggs.filter((e) => e.id !== hatched.id);
    saveGame(this.gameState);

    this.playHatchOverlay(tier, species, level, () => {
      this.isMoving = false;
    });
    return true;
  }

  private playHatchOverlay(tier: EggTier, species: PokemonSpecies, level: number, onDismiss: () => void): void {
    const tierData = EGG_TIERS[tier];
    const container = this.add.container(0, 0).setDepth(500);
    this.registerModal(container);

    const darkBg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.88).setOrigin(0.5);
    darkBg.setInteractive();
    container.add(darkBg);

    MusicManager.playSFX("hatch");

    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 140, `Your ${tierData.name} hatched!`, {
      fontSize: "16px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);
    container.add(title);

    // Egg sprite — pixel-art texture rendered at 8x scale
    let egg: Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse;
    if (this.textures.exists(tierData.spriteKey)) {
      const eggImg = this.add.image(GAME_W / 2, GAME_H / 2, tierData.spriteKey).setDisplaySize(128, 128).setOrigin(0.5);
      eggImg.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      egg = eggImg;
    } else {
      egg = this.add.ellipse(GAME_W / 2, GAME_H / 2, 60, 80, tierData.color).setOrigin(0.5).setStrokeStyle(3, 0xffffff);
    }
    container.add(egg);

    // Phase 1: wobble
    this.tweens.add({
      targets: egg, angle: { from: -12, to: 12 },
      duration: 180, yoyo: true, repeat: 3, ease: "Sine.easeInOut",
      onComplete: () => {
        // Phase 2: flash white + shrink egg
        const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xffffff, 0).setOrigin(0.5);
        container.add(flash);
        this.tweens.add({ targets: flash, alpha: { from: 0, to: 1 }, duration: 160, yoyo: true,
          onComplete: () => flash.destroy() });
        this.tweens.add({ targets: egg, scale: { from: 1, to: 0 }, duration: 200,
          onComplete: () => egg.destroy() });

        // Phase 3: reveal Pokemon
        this.time.delayedCall(250, () => {
          if (this.textures.exists(species.spriteKey)) {
            const sprite = this.add.image(GAME_W / 2, GAME_H / 2, species.spriteKey)
              .setDisplaySize(120, 120).setOrigin(0.5).setAlpha(0);
            sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            container.add(sprite);
            this.tweens.add({
              targets: sprite, alpha: 1, scale: { from: 0.5, to: 1 },
              duration: 600, ease: "Back.easeOut",
            });
          }

          const joinText = this.add.text(GAME_W / 2, GAME_H / 2 + 90, `${species.name} joined your team\nat Lv${level}!`, {
            fontSize: "15px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold", align: "center",
          }).setOrigin(0.5);
          container.add(joinText);

          const tapText = this.add.text(GAME_W / 2, GAME_H / 2 + 150, "Tap to continue", {
            fontSize: "12px", fontFamily: "monospace", color: "#888888",
          }).setOrigin(0.5);
          container.add(tapText);
          this.tweens.add({ targets: tapText, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

          // Dismiss on tap
          const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0).setOrigin(0.5).setInteractive();
          container.add(overlay);
          overlay.once("pointerdown", () => {
            container.destroy();
            onDismiss();
          });
        });
      },
    });
  }

  private revealFullMap(): void {
    const map = this.gameState.currentMap!;
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        map.tiles[row][col].revealed = true;
      }
    }
  }

  private refreshFog(): void {
    const map = this.gameState.currentMap!;
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const tile = map.tiles[row][col];
        if (tile.revealed) {
          this.fogRects[row][col].setAlpha(tile.visited ? 0 : 0.35);
        }
      }
    }
  }

  // === MAP COMPLETION ===
  private completeMap(): void {
    const map = this.gameState.currentMap!;
    this.registry.set("gameState", this.gameState);
    this.registry.set("roomClearContext", {
      kind: "area",
      worldIndex: map.worldIndex,
      mapIndex: map.mapIndex,
    });
    this.scene.start("RoomClearScene");
  }

  // === BATTLE TRIGGER ===
  private triggerBattle(): void {
    MusicManager.stop();
    const map = this.gameState.currentMap!;
    const level = getEncounterLevel(map.worldIndex, map.mapIndex);
    const partySize = getEnemyPartySize(map.worldIndex, map.mapIndex);
    const enemyParty: BattlePokemon[] = [];
    for (let i = 0; i < partySize; i++) {
      const speciesId = getRandomEncounterSpecies(map.worldIndex);
      try {
        enemyParty.push(createBattlePokemon(getPokemon(speciesId), level));
      } catch {
        enemyParty.push(createBattlePokemon(getPokemon("rattata"), level));
      }
    }

    this.registry.set("gameState", this.gameState);
    this.registry.set("enemyParty", enemyParty);

    // Battle transition
    this.isMoving = true;
    const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xffffff).setOrigin(0.5).setDepth(300).setAlpha(0);
    const bars: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 8; i++) {
      bars.push(this.add.rectangle(-GAME_W, (GAME_H / 8) * i + GAME_H / 16, GAME_W * 2, GAME_H / 8 + 2, 0x000000).setOrigin(0.5).setDepth(301).setAlpha(0));
    }
    const battleText = this.add.text(GAME_W / 2, GAME_H / 2, "Wild Pokemon!", {
      fontSize: "22px", fontFamily: "monospace", color: "#ff4444", fontStyle: "bold", stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(302).setAlpha(0);

    this.tweens.add({ targets: flash, alpha: 1, duration: 150, yoyo: true, repeat: 1 });
    bars.forEach((bar, i) => this.tweens.add({ targets: bar, x: GAME_W / 2, alpha: 1, duration: 200, delay: 300 + i * 40, ease: "Power2" }));
    this.tweens.add({ targets: battleText, alpha: 1, duration: 200, delay: 650 });
    this.time.delayedCall(1200, () => this.scene.start("BattleScene"));
  }

  // === BOSS BATTLE ===
  private triggerBossBattle(): void {
    MusicManager.stop();
    const map = this.gameState.currentMap!;
    const bossSpeciesId = getBossSpecies(map.worldIndex);
    const bossLevel = getBossLevel(map.worldIndex, map.mapIndex);

    let bossPokemon: BattlePokemon;
    try {
      bossPokemon = createBattlePokemon(getPokemon(bossSpeciesId), bossLevel);
    } catch {
      bossPokemon = createBattlePokemon(getPokemon("snorlax"), bossLevel);
    }

    this.registry.set("gameState", this.gameState);
    this.registry.set("enemyParty", [bossPokemon]);
    this.registry.set("isBossBattle", true);

    // Boss battle transition — red-tinted, more dramatic
    this.isMoving = true;
    const flash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xff2222).setOrigin(0.5).setDepth(300).setAlpha(0);
    const bars: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 8; i++) {
      bars.push(this.add.rectangle(-GAME_W, (GAME_H / 8) * i + GAME_H / 16, GAME_W * 2, GAME_H / 8 + 2, 0x220000).setOrigin(0.5).setDepth(301).setAlpha(0));
    }
    const battleText = this.add.text(GAME_W / 2, GAME_H / 2, "BOSS BATTLE!", {
      fontSize: "26px", fontFamily: "monospace", color: "#ff4444", fontStyle: "bold", stroke: "#000000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(302).setAlpha(0);

    this.tweens.add({ targets: flash, alpha: 1, duration: 200, yoyo: true, repeat: 2 });
    bars.forEach((bar, i) => this.tweens.add({ targets: bar, x: GAME_W / 2, alpha: 1, duration: 200, delay: 400 + i * 50, ease: "Power2" }));
    this.tweens.add({ targets: battleText, alpha: 1, duration: 200, delay: 800 });
    this.time.delayedCall(1500, () => this.scene.start("BattleScene"));
  }

  // === ITEMS MODAL ===
  private showPokemonModal(): void {
    const modal = this.add.container(0, 0).setDepth(200);
    this.registerModal(modal);

    const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.92).setOrigin(0.5);
    bg.setInteractive();
    modal.add(bg);

    modal.add(this.add.text(GAME_W / 2, 40, "YOUR POKEMON", {
      fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5));

    const partySet = new Set(this.gameState.playerParty);
    const cardH = 76;
    const startY = 70;
    const maxY = GAME_H - 95;

    this.gameState.roster.forEach((pokemon, i) => {
      const y = startY + i * (cardH + 4);
      if (y + cardH > maxY) return; // truncate overflow

      const x = 20;
      const w = GAME_W - 40;
      const inParty = partySet.has(pokemon);
      const fainted = pokemon.currentHP <= 0;

      modal.add(
        this.add.rectangle(x + w / 2, y + cardH / 2, w, cardH, fainted ? 0x1a1111 : 0x1a1a2e)
          .setOrigin(0.5).setStrokeStyle(1, inParty ? 0x66aa66 : 0x333355)
      );

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(x + 28, y + cardH / 2, pokemon.species.spriteKey)
          .setDisplaySize(44, 44).setOrigin(0.5).setAlpha(fainted ? 0.4 : 1);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        modal.add(img);
      }

      modal.add(this.add.text(x + 56, y + 6, pokemon.species.name, {
        fontSize: "13px", fontFamily: "monospace", color: fainted ? "#886666" : "#ffffff", fontStyle: "bold",
      }));
      modal.add(this.add.text(x + w - 5, y + 6, `Lv${pokemon.level}`, {
        fontSize: "11px", fontFamily: "monospace", color: "#aaaaaa",
      }).setOrigin(1, 0));

      if (inParty) {
        modal.add(this.add.text(x + 56, y + 22, "PARTY", {
          fontSize: "7px", fontFamily: "monospace", color: "#66cc66", fontStyle: "bold",
        }));
      }

      // HP bar + numeric
      const barX = x + 100;
      const hpY = y + 22;
      const barW = w - 112;
      modal.add(this.add.rectangle(barX + barW / 2, hpY + 3, barW, 6, 0x333333).setOrigin(0.5));
      const hpPct = pokemon.maxHP > 0 ? pokemon.currentHP / pokemon.maxHP : 0;
      const hpColor = hpPct > 0.5 ? 0x22cc44 : hpPct > 0.25 ? 0xddcc22 : 0xcc2222;
      if (hpPct > 0) {
        modal.add(this.add.rectangle(barX, hpY, hpPct * barW, 6, hpColor).setOrigin(0, 0));
      }
      modal.add(this.add.text(barX, hpY + 8, `HP ${pokemon.currentHP}/${pokemon.maxHP}`, {
        fontSize: "7px", fontFamily: "monospace", color: "#888888",
      }));

      // XP bar + numeric
      const xpY = hpY + 18;
      const needed = xpToNextLevel(pokemon.level);
      const xpPct = Math.min(pokemon.currentXP / needed, 1);
      modal.add(this.add.rectangle(barX + barW / 2, xpY + 3, barW, 5, 0x222244).setOrigin(0.5));
      if (xpPct > 0) {
        modal.add(this.add.rectangle(barX, xpY, xpPct * barW, 5, 0x4488cc).setOrigin(0, 0));
      }
      modal.add(this.add.text(barX, xpY + 7, `XP ${pokemon.currentXP}/${needed}`, {
        fontSize: "7px", fontFamily: "monospace", color: "#4488cc",
      }));

      // Stats line
      const s = pokemon.stats;
      modal.add(this.add.text(x + 56, y + cardH - 12, `ATK ${s.atk}  DEF ${s.def}  SPD ${s.spd}  SPC ${s.spc}`, {
        fontSize: "7px", fontFamily: "monospace", color: "#777799",
      }));
    });

    const cancelBg = this.add.rectangle(GAME_W / 2, GAME_H - 60, 180, 44, 0x553333).setOrigin(0.5).setStrokeStyle(2, 0x774444);
    modal.add(cancelBg);
    modal.add(this.add.text(GAME_W / 2, GAME_H - 60, "CLOSE", {
      fontSize: "16px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5));
    cancelBg.setInteractive();
    cancelBg.on("pointerdown", () => modal.destroy(true));
  }

  private showItemModal(): void {
    // Full screen modal overlay
    const modal = this.add.container(0, 0).setDepth(200);
    this.registerModal(modal);

    // Background blocks all input below
    const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.9).setOrigin(0.5);
    bg.setInteractive(); // block clicks through
    modal.add(bg);

    modal.add(this.add.text(GAME_W / 2, 50, "ITEMS", {
      fontSize: "22px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5));

    const items = this.gameState.playerItems.filter((b) => b.quantity > 0);
    const eggs = this.gameState.eggs;

    if (items.length === 0 && eggs.length === 0) {
      modal.add(this.add.text(GAME_W / 2, GAME_H / 2, "No items!", {
        fontSize: "16px", fontFamily: "monospace", color: "#888888",
      }).setOrigin(0.5));
    } else {
      items.forEach((belt, i) => {
        const y = 110 + i * 70;
        const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 55, 0x2a2a3e, 0.9).setOrigin(0.5).setStrokeStyle(1, 0x444466);
        modal.add(cardBg);

        const icon = this.getItemIcon(belt.item.id);
        modal.add(this.add.text(GAME_W / 2 - 155, y, icon, { fontSize: "20px", fontFamily: "monospace" }).setOrigin(0.5));
        modal.add(this.add.text(GAME_W / 2 - 130, y - 10, `${belt.item.name}  x${belt.quantity}`, {
          fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0, 0.5));
        modal.add(this.add.text(GAME_W / 2 - 130, y + 10, belt.item.description, {
          fontSize: "9px", fontFamily: "monospace", color: "#888888",
        }).setOrigin(0, 0.5));

        // USE button — repel/map use instantly, healing items pick a target
        if (belt.item.id === "dungeon_map") {
          const useBg = this.add.rectangle(GAME_W / 2 + 140, y, 55, 30, 0x335588).setOrigin(0.5).setStrokeStyle(1, 0x4477aa);
          modal.add(useBg);
          modal.add(this.add.text(GAME_W / 2 + 140, y, "USE", {
            fontSize: "11px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
          }).setOrigin(0.5));
          useBg.setInteractive();
          useBg.on("pointerdown", () => {
            belt.quantity--;
            this.revealFullMap();
            modal.destroy(true);
            this.buildMapUI();
            showToast(this, "Map revealed!", { color: "#88ccff", sfx: "item_use" });
          });
        } else if (belt.item.id === "repel") {
          const useBg = this.add.rectangle(GAME_W / 2 + 140, y, 55, 30, 0x335588).setOrigin(0.5).setStrokeStyle(1, 0x4477aa);
          modal.add(useBg);
          modal.add(this.add.text(GAME_W / 2 + 140, y, "USE", {
            fontSize: "11px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
          }).setOrigin(0.5));
          useBg.setInteractive();
          useBg.on("pointerdown", () => {
            belt.quantity--;
            this.gameState.repelSteps = 20;
            modal.destroy(true);
            this.buildMapUI();
            showToast(this, "Repel applied — 20 steps", { color: "#cc88ff", sfx: "item_use" });
          });
        } else if (belt.item.id !== "escape_rope") {
          const useBg = this.add.rectangle(GAME_W / 2 + 140, y, 55, 30, 0x335588).setOrigin(0.5).setStrokeStyle(1, 0x4477aa);
          modal.add(useBg);
          modal.add(this.add.text(GAME_W / 2 + 140, y, "USE", {
            fontSize: "11px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
          }).setOrigin(0.5));
          useBg.setInteractive();
          useBg.on("pointerdown", () => {
            modal.destroy(true);
            this.showItemTargetModal(belt);
          });
        }
      });

      // Eggs section — show egg progress mid-dungeon, same card style as the
      // town Items view. Eggs tick here so it's critical they're visible.
      if (eggs.length > 0) {
        const headerY = 110 + items.length * 70 + 14;

        modal.add(this.add.rectangle(GAME_W / 2, headerY - 8, 300, 1, 0x445566));
        modal.add(this.add.text(GAME_W / 2, headerY + 6, `EGGS (${eggs.length})`, {
          fontSize: "13px", fontFamily: "monospace", color: "#cc88cc", fontStyle: "bold",
        }).setOrigin(0.5));

        eggs.forEach((egg, i) => {
          const y = headerY + 32 + i * 58;
          if (y + 25 > GAME_H - 95) return; // stay above CLOSE button

          const tierData = EGG_TIERS[egg.tier];
          const stepsTaken = tierData.stepsToHatch - egg.stepsRemaining;

          // Card
          modal.add(this.add.rectangle(GAME_W / 2, y, 340, 50, 0x1a1a2e, 0.9).setOrigin(0.5).setStrokeStyle(2, tierData.color));

          // Egg sprite
          if (this.textures.exists(tierData.spriteKey)) {
            const img = this.add.image(GAME_W / 2 - 150, y, tierData.spriteKey).setDisplaySize(40, 40).setOrigin(0.5);
            img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            modal.add(img);
          }

          // Name
          modal.add(this.add.text(GAME_W / 2 - 125, y - 12, tierData.name, {
            fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
          }).setOrigin(0, 0.5));

          // Steps walked / total, right-aligned
          modal.add(this.add.text(GAME_W / 2 + 160, y - 12, `${stepsTaken} / ${tierData.stepsToHatch}`, {
            fontSize: "11px", fontFamily: "monospace", color: "#aaccff", fontStyle: "bold",
          }).setOrigin(1, 0.5));

          // Flavor line
          const flavor = egg.stepsRemaining === 0 ? "Ready to hatch!" : "Hatching as you walk";
          modal.add(this.add.text(GAME_W / 2 - 125, y + 5, flavor, {
            fontSize: "9px", fontFamily: "monospace",
            color: egg.stepsRemaining === 0 ? "#44ff88" : "#888899",
          }).setOrigin(0, 0.5));

          // Progress bar
          const barX = GAME_W / 2 - 125;
          const barY = y + 17;
          const barW = 280;
          const barH = 5;
          modal.add(this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x222233).setOrigin(0.5));
          const pct = Math.max(0, Math.min(1, stepsTaken / tierData.stepsToHatch));
          if (pct > 0) {
            modal.add(this.add.rectangle(barX, barY - barH / 2, barW * pct, barH, tierData.color).setOrigin(0, 0));
          }
        });
      }
    }

    // CANCEL button
    const cancelBg = this.add.rectangle(GAME_W / 2, GAME_H - 60, 180, 44, 0x553333).setOrigin(0.5).setStrokeStyle(2, 0x774444);
    modal.add(cancelBg);
    modal.add(this.add.text(GAME_W / 2, GAME_H - 60, "CLOSE", {
      fontSize: "16px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5));
    cancelBg.setInteractive();
    cancelBg.on("pointerdown", () => modal.destroy(true));
  }

  private showItemTargetModal(belt: typeof this.gameState.playerItems[0]): void {
    const modal = this.add.container(0, 0).setDepth(200);
    this.registerModal(modal);
    const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.9).setOrigin(0.5);
    bg.setInteractive();
    modal.add(bg);

    const isRevive = belt.item.id === "revive";
    modal.add(this.add.text(GAME_W / 2, 50, `Use ${belt.item.name} on?`, {
      fontSize: "18px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5));

    this.gameState.playerParty.forEach((pokemon, i) => {
      const y = 120 + i * 80;
      const fainted = pokemon.currentHP <= 0;
      const fullHP = pokemon.currentHP >= pokemon.maxHP;
      const canTarget = isRevive ? fainted : (!fainted && !fullHP);

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 60, canTarget ? 0x222244 : 0x181822, 0.9)
        .setOrigin(0.5).setStrokeStyle(1, canTarget ? 0x444466 : 0x222233);
      modal.add(cardBg);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        // Always full-alpha so sprites stay readable even when the card is
        // disabled (e.g. all-full-HP party).
        const img = this.add.image(GAME_W / 2 - 130, y, pokemon.species.spriteKey)
          .setDisplaySize(44, 44).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        modal.add(img);
      }

      modal.add(this.add.text(GAME_W / 2 - 95, y - 10, pokemon.species.name, {
        fontSize: "13px", fontFamily: "monospace", color: canTarget ? "#ffffff" : "#555555", fontStyle: "bold",
      }).setOrigin(0, 0.5));
      modal.add(this.add.text(GAME_W / 2 - 95, y + 10, fainted ? "FAINTED" : `HP: ${pokemon.currentHP}/${pokemon.maxHP}`, {
        fontSize: "10px", fontFamily: "monospace", color: fainted ? "#cc4444" : "#22cc44",
      }).setOrigin(0, 0.5));

      if (canTarget) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => {
          const result = applyItem(belt.item.id, pokemon, { roster: this.gameState.roster });
          if (result.kind !== "fail") belt.quantity--;
          modal.destroy(true);
          this.buildMapUI();
          if (result.kind !== "fail") {
            const fb = describeItemResult(result, pokemon);
            showToast(this, fb.message, { color: fb.color, sfx: fb.sfx });
          }
        });
      }
    });

    const cancelBg = this.add.rectangle(GAME_W / 2, GAME_H - 60, 180, 44, 0x553333).setOrigin(0.5).setStrokeStyle(2, 0x774444);
    modal.add(cancelBg);
    modal.add(this.add.text(GAME_W / 2, GAME_H - 60, "CANCEL", {
      fontSize: "16px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5));
    cancelBg.setInteractive();
    cancelBg.on("pointerdown", () => modal.destroy(true));
  }

  private getItemIcon(itemId: string): string {
    switch (itemId) {
      case "potion": return "\u2764";
      case "super_potion": return "\u2764";
      case "revive": return "\u2606";
      case "escape_rope": return "\u21b6";
      case "repel": return "\u2668";
      case "dungeon_map": return "\u25a9";
      default: return "\u25a0";
    }
  }
}
