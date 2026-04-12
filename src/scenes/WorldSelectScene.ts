import Phaser from "phaser";
import type { GameState } from "../types.ts";
import { WORLD_NAMES, MAPS_PER_WORLD } from "../data/worlds.ts";
import { generateDungeon } from "../core/mapGenerator.ts";
import { MusicManager } from "../audio/MusicManager.ts";

const GAME_W = 390;
const GAME_H = 844;

export class WorldSelectScene extends Phaser.Scene {
  private gameState!: GameState;

  constructor() {
    super({ key: "WorldSelectScene" });
  }

  create(): void {
    this.gameState = this.registry.get("gameState") as GameState;

    this.add.text(GAME_W / 2, 35, "SELECT WORLD", {
      fontSize: "22px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);

    // Party preview
    this.add.text(GAME_W / 2, 65, `Party: ${this.gameState.playerParty.map((p) => p.species.name).join(", ")}`, {
      fontSize: "9px", fontFamily: "monospace", color: "#888899",
    }).setOrigin(0.5);

    // World cards — 2 columns, 4 rows
    const colW = 170;
    const rowH = 95;
    const startX = GAME_W / 2 - colW / 2 - 5;
    const startY = 100;

    for (let i = 0; i < 8; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (colW + 10);
      const y = startY + row * (rowH + 8);
      this.createWorldCard(i, x, y, colW, rowH);
    }

    // Back button
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 50, 160, 38, 0x553333)
      .setOrigin(0.5).setStrokeStyle(1, 0x666666);
    this.add.text(GAME_W / 2, GAME_H - 50, "BACK", {
      fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.scene.start("MainMenuScene"));
  }

  private createWorldCard(worldIndex: number, x: number, y: number, w: number, h: number): void {
    const world = this.gameState.worlds[worldIndex];
    const unlocked = world.unlocked;
    const complete = world.currentMap >= MAPS_PER_WORLD;
    const progress = world.currentMap;

    const bgColor = unlocked ? (complete ? 0x223322 : 0x1a1a2e) : 0x111118;
    const borderColor = unlocked ? (complete ? 0x44aa44 : 0x444466) : 0x222233;

    const card = this.add.rectangle(x + w / 2, y + h / 2, w, h, bgColor)
      .setOrigin(0.5).setStrokeStyle(2, borderColor);

    // World number
    this.add.text(x + 10, y + 8, `World ${worldIndex + 1}`, {
      fontSize: "12px", fontFamily: "monospace",
      color: unlocked ? "#ffffff" : "#444455", fontStyle: "bold",
    });

    // World name
    this.add.text(x + 10, y + 25, WORLD_NAMES[worldIndex], {
      fontSize: "9px", fontFamily: "monospace",
      color: unlocked ? "#aaaacc" : "#333344",
    });

    if (unlocked) {
      // Progress bar
      const barX = x + 10;
      const barY = y + 44;
      const barW = w - 20;
      const barH = 8;
      this.add.rectangle(barX + barW / 2, barY + barH / 2, barW, barH, 0x333333).setOrigin(0.5);

      const pct = progress / MAPS_PER_WORLD;
      const fillColor = complete ? 0x44aa44 : 0x4488cc;
      if (pct > 0) {
        this.add.rectangle(barX, barY, pct * barW, barH, fillColor).setOrigin(0, 0);
      }

      // Progress text
      const progText = complete ? "COMPLETE" : `Map ${progress + 1}/${MAPS_PER_WORLD}`;
      this.add.text(x + w / 2, y + 62, progText, {
        fontSize: "9px", fontFamily: "monospace",
        color: complete ? "#44aa44" : "#888899",
      }).setOrigin(0.5);

      if (!complete) {
        // Status indicator
        this.add.text(x + w / 2, y + h - 10, "TAP TO ENTER", {
          fontSize: "8px", fontFamily: "monospace", color: "#4488cc",
        }).setOrigin(0.5);
      }
    } else {
      // Lock icon
      this.add.text(x + w / 2, y + h / 2 + 5, "LOCKED", {
        fontSize: "14px", fontFamily: "monospace", color: "#333344", fontStyle: "bold",
      }).setOrigin(0.5);
    }

    // Interactive if unlocked and not complete
    if (unlocked && !complete) {
      card.setInteractive();
      card.on("pointerover", () => card.setStrokeStyle(2, 0x6688ff));
      card.on("pointerout", () => card.setStrokeStyle(2, borderColor));
      card.on("pointerdown", () => this.enterWorld(worldIndex));
    }
  }

  private enterWorld(worldIndex: number): void {
    this.gameState.activeWorld = worldIndex;
    const mapIndex = this.gameState.worlds[worldIndex].currentMap;

    // Generate map
    const map = generateDungeon(worldIndex, mapIndex);
    const cx = Math.floor(map.width / 2);
    const cy = Math.floor(map.height / 2);
    map.tiles[cy][cx].type = "floor";
    map.tiles[cy][cx].encounterChance = 0;

    this.gameState.currentMap = map;
    this.gameState.playerX = cx;
    this.gameState.playerY = cy;

    this.registry.set("gameState", this.gameState);
    MusicManager.stop();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("MapScene");
    });
  }
}
