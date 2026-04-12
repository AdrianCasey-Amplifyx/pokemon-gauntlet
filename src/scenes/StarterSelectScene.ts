import Phaser from "phaser";
import type { GameState } from "../types.ts";
import { getPokemon } from "../data/pokemon.ts";
import { createBattlePokemon } from "../core/statCalc.ts";
import { createStarterBelt } from "../data/items.ts";
import { saveGame } from "../core/saveManager.ts";
import { TOTAL_WORLDS } from "../data/worlds.ts";

const GAME_W = 390;

const STARTERS = ["charmander", "squirtle", "bulbasaur"];

export class StarterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "StarterSelectScene" });
  }

  create(): void {
    this.add.text(GAME_W / 2, 60, "Choose your starter!", {
      fontSize: "22px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 90, "This Pokemon will be your first companion.", {
      fontSize: "11px", fontFamily: "monospace", color: "#888899",
    }).setOrigin(0.5);

    STARTERS.forEach((id, i) => {
      const species = getPokemon(id);
      const y = 180 + i * 200;

      // Card
      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 170, 0x1a1a2e, 0.9)
        .setOrigin(0.5).setStrokeStyle(2, 0x444466);

      // Sprite
      if (this.textures.exists(species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 100, y - 15, species.spriteKey)
          .setDisplaySize(96, 96).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      // Info
      this.add.text(GAME_W / 2 + 10, y - 45, species.name, {
        fontSize: "22px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0, 0.5);

      const typeStr = species.types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" / ");
      this.add.text(GAME_W / 2 + 10, y - 18, typeStr, {
        fontSize: "13px", fontFamily: "monospace", color: "#aaaacc",
      }).setOrigin(0, 0.5);

      const s = species.baseStats;
      this.add.text(GAME_W / 2 + 10, y + 5, `HP:${s.hp}  ATK:${s.atk}  DEF:${s.def}`, {
        fontSize: "10px", fontFamily: "monospace", color: "#888899",
      }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 + 10, y + 20, `SPD:${s.spd}  SPC:${s.spc}`, {
        fontSize: "10px", fontFamily: "monospace", color: "#888899",
      }).setOrigin(0, 0.5);

      // Select button
      this.add.rectangle(GAME_W / 2 + 60, y + 50, 120, 34, 0x338855)
        .setOrigin(0.5).setStrokeStyle(1, 0x44aa66);
      this.add.text(GAME_W / 2 + 60, y + 50, "CHOOSE", {
        fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5);

      cardBg.setInteractive();
      cardBg.on("pointerover", () => cardBg.setStrokeStyle(2, 0x6688ff));
      cardBg.on("pointerout", () => cardBg.setStrokeStyle(2, 0x444466));
      cardBg.on("pointerdown", () => this.selectStarter(id));
    });
  }

  private selectStarter(speciesId: string): void {
    const species = getPokemon(speciesId);
    const starter = createBattlePokemon(species, 5);

    const worlds = Array.from({ length: TOTAL_WORLDS }, (_, i) => ({
      currentMap: 0,
      unlocked: i === 0,
    }));

    const gameState: GameState = {
      roster: [starter],
      playerParty: [],
      playerItems: createStarterBelt(),
      gold: 100,
      seenPokemon: [],
      worlds,
      activeWorld: 0,
      currentMap: null,
      playerX: 0,
      playerY: 0,
      repelSteps: 0,
    };

    this.registry.set("gameState", gameState);
    saveGame(gameState);

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("MainMenuScene");
    });
  }
}
