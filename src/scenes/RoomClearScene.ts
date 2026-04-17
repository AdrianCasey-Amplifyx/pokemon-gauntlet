import Phaser from "phaser";
import type { GameState } from "../types.ts";
import { ITEMS } from "../data/items.ts";
import { rollRoomDrops, rollTrainerDrops, type RewardDrop } from "../data/rewardDrops.ts";
import { createEgg, EGG_TIERS } from "../data/eggs.ts";
import { getPokemon } from "../data/pokemon.ts";
import { MAPS_PER_WORLD, WORLD_NAMES } from "../data/worlds.ts";
import { saveGame } from "../core/saveManager.ts";
import { MusicManager } from "../audio/MusicManager.ts";

const GAME_W = 390;
const GAME_H = 844;

export type RoomClearKind = "area" | "trainer";

export interface RoomClearContext {
  kind: RoomClearKind;
  worldIndex: number;
  mapIndex: number;
  /** Total XP gained in the most recent battle (trainer flow only). */
  battleXP?: number;
  /** Level-ups recorded during the most recent battle. */
  levelUps?: { name: string; newLevel: number }[];
  /** Whether any new species were unlocked in the shop from the battle. */
  newSeen?: boolean;
  /** Gold earned from the battle (trainer flow only; area flow awards no gold). */
  goldEarned?: number;
  /** Species id of the defeated trainer/boss — used for portrait + name copy. */
  bossSpeciesId?: string;
}

export class RoomClearScene extends Phaser.Scene {
  private gameState!: GameState;
  private ctx!: RoomClearContext;
  private drops: RewardDrop[] = [];
  private dismissed = false;

  constructor() {
    super({ key: "RoomClearScene" });
  }

  create(): void {
    this.dismissed = false;
    this.gameState = this.registry.get("gameState") as GameState;
    this.ctx = (this.registry.get("roomClearContext") as RoomClearContext) ?? {
      kind: "area",
      worldIndex: this.gameState.activeWorld,
      mapIndex: 0,
    };
    this.registry.remove("roomClearContext");

    // Roll drops up-front so the layout is stable.
    this.drops =
      this.ctx.kind === "trainer"
        ? rollTrainerDrops(this.ctx.worldIndex)
        : rollRoomDrops(this.ctx.worldIndex);

    MusicManager.stop();
    this.buildLayout();
  }

  private buildLayout(): void {
    const trainer = this.ctx.kind === "trainer";

    // Full-screen dark backdrop.
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.92).setOrigin(0.5);

    // Header band
    const accent = trainer ? "#ff8844" : "#44ff44";
    const heading = trainer ? "Trainer Defeated!" : "Area Cleared!";

    this.add.text(GAME_W / 2, 70, heading, {
      fontSize: "28px", fontFamily: "monospace", color: accent, fontStyle: "bold",
      stroke: "#000000", strokeThickness: 4,
    }).setOrigin(0.5);

    const world = WORLD_NAMES[this.ctx.worldIndex] ?? "";
    const roomLabel = `${world}  ·  Room ${this.ctx.mapIndex + 1}/${MAPS_PER_WORLD}`;
    this.add.text(GAME_W / 2, 100, roomLabel, {
      fontSize: "12px", fontFamily: "monospace", color: "#aaaaaa",
    }).setOrigin(0.5);

    // Trainer portrait (only on trainer wins)
    let cursorY = 130;
    if (trainer && this.ctx.bossSpeciesId) {
      cursorY = this.drawTrainerPortrait(cursorY);
    }

    // Battle summary rows (XP + gold + level-ups + new seen)
    cursorY = this.drawBattleSummary(cursorY + 10);

    // Drops section
    cursorY = this.drawDrops(cursorY + 16);

    // Tap-to-continue footer
    this.drawTapFooter();
  }

  private drawTrainerPortrait(y: number): number {
    const species = (() => {
      try {
        return getPokemon(this.ctx.bossSpeciesId!);
      } catch {
        return null;
      }
    })();
    if (!species) return y;

    // Portrait framed by a coloured halo so the screen feels ceremonial.
    const cx = GAME_W / 2;
    const portraitY = y + 55;
    this.add.circle(cx, portraitY, 52, 0x331a0d).setStrokeStyle(3, 0xff8844);

    if (this.textures.exists(species.spriteKey)) {
      const img = this.add.image(cx, portraitY, species.spriteKey)
        .setDisplaySize(84, 84).setOrigin(0.5);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.add.text(cx, portraitY + 68, `You defeated ${species.name}!`, {
      fontSize: "15px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);

    return portraitY + 90;
  }

  private drawBattleSummary(y: number): number {
    const rows: string[] = [];

    if (this.ctx.battleXP && this.ctx.battleXP > 0) {
      rows.push(`+${this.ctx.battleXP} XP`);
    }
    if (this.ctx.goldEarned && this.ctx.goldEarned > 0) {
      rows.push(`+${this.ctx.goldEarned} Gold`);
    }
    for (const lu of this.ctx.levelUps ?? []) {
      rows.push(`${lu.name} grew to Lv${lu.newLevel}!`);
    }
    if (this.ctx.newSeen) {
      rows.push("New Pokemon unlocked in shop!");
    }

    if (rows.length === 0) return y;

    const text = this.add.text(GAME_W / 2, y, rows.join("\n"), {
      fontSize: "13px", fontFamily: "monospace", color: "#ffd700",
      align: "center", lineSpacing: 4, wordWrap: { width: 340 },
    }).setOrigin(0.5, 0);

    return y + text.height;
  }

  private drawDrops(y: number): number {
    this.add.text(GAME_W / 2, y, "REWARDS", {
      fontSize: "14px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);

    let rowY = y + 28;

    if (this.drops.length === 0) {
      this.add.text(GAME_W / 2, rowY, "No drops this time.", {
        fontSize: "12px", fontFamily: "monospace", color: "#888888", fontStyle: "italic",
      }).setOrigin(0.5);
      return rowY + 30;
    }

    const cardW = 320;
    const cardH = 50;
    for (const drop of this.drops) {
      const cx = GAME_W / 2;
      const cardColor = drop.kind === "egg" ? 0x2a1a2e : 0x1a2a2e;
      const stroke = drop.kind === "egg"
        ? (drop.tier === "legendary" ? 0xcc8822 : 0x4488cc)
        : 0x44aa88;

      this.add.rectangle(cx, rowY + cardH / 2, cardW, cardH, cardColor)
        .setOrigin(0.5).setStrokeStyle(2, stroke);

      if (drop.kind === "item") {
        const item = ITEMS[drop.itemId];
        const name = item?.name ?? drop.itemId;
        const desc = item?.description ?? "";
        this.add.text(cx - cardW / 2 + 14, rowY + 12, name, {
          fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
        });
        this.add.text(cx - cardW / 2 + 14, rowY + 30, desc, {
          fontSize: "9px", fontFamily: "monospace", color: "#99bbbb",
        });
      } else {
        const tierData = EGG_TIERS[drop.tier];
        this.add.text(cx - cardW / 2 + 14, rowY + 12, tierData.name, {
          fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
        });
        this.add.text(cx - cardW / 2 + 14, rowY + 30, tierData.description, {
          fontSize: "9px", fontFamily: "monospace", color: "#bb99bb",
        });
        if (this.textures.exists(tierData.spriteKey)) {
          const img = this.add.image(cx + cardW / 2 - 24, rowY + cardH / 2, tierData.spriteKey)
            .setDisplaySize(34, 34).setOrigin(0.5);
          img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }

      rowY += cardH + 6;
    }

    return rowY;
  }

  private drawTapFooter(): void {
    const footer = this.add.text(GAME_W / 2, GAME_H - 60, "Tap to continue", {
      fontSize: "14px", fontFamily: "monospace", color: "#cccccc",
    }).setOrigin(0.5);
    this.tweens.add({ targets: footer, alpha: 0.4, yoyo: true, duration: 800, repeat: -1 });

    const hit = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0)
      .setOrigin(0.5).setInteractive();
    hit.once("pointerdown", () => this.dismiss());
  }

  private dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;

    // 1. Apply drops to save state.
    for (const drop of this.drops) {
      if (drop.kind === "item") {
        const existing = this.gameState.playerItems.find((b) => b.item.id === drop.itemId);
        if (existing) existing.quantity++;
        else this.gameState.playerItems.push({ item: ITEMS[drop.itemId], quantity: 1 });
      } else {
        this.gameState.eggs.push(createEgg(drop.tier));
      }
    }

    // 2. Advance room progress (shared with the old completeMap flow).
    const worldIdx = this.gameState.activeWorld;
    const world = this.gameState.worlds[worldIdx];
    world.currentMap++;

    const worldCleared = world.currentMap >= MAPS_PER_WORLD;
    const nextExists = worldIdx + 1 < this.gameState.worlds.length;
    if (worldCleared && nextExists) {
      this.gameState.worlds[worldIdx + 1].unlocked = true;
      this.gameState.activeWorld = worldIdx + 1;
    }

    this.gameState.currentMap = null;
    this.registry.set("roomCleared", true);
    saveGame(this.gameState);

    this.scene.start("MainMenuScene");
  }
}
