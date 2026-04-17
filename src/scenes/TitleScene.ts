import Phaser from "phaser";
import { getAllSlotInfo, loadGame, deleteSlotSave, setActiveSlot, saveGame, createTestGameState, addGoldToSlot, type SaveSlotInfo } from "../core/saveManager.ts";
import { MusicManager } from "../audio/MusicManager.ts";

const GAME_W = 390;
const GAME_H = 844;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  create(): void {
    MusicManager.play("title");

    // Title
    this.add.text(GAME_W / 2, 180, "POKEMON\nGAUNTLET", {
      fontSize: "36px", fontFamily: "monospace", color: "#f8d030",
      fontStyle: "bold", align: "center", lineSpacing: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 270, "A Roguelike Adventure", {
      fontSize: "13px", fontFamily: "monospace", color: "#888899",
    }).setOrigin(0.5);

    const btnY = 380;

    this.createButton(GAME_W / 2, btnY, "SAVE SLOTS", 0x335588, () => {
      this.showSlotSelect();
    });

    // Version
    this.add.text(GAME_W / 2, GAME_H - 30, "v0.1.0", {
      fontSize: "10px", fontFamily: "monospace", color: "#444466",
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Rectangle {
    const bg = this.add.rectangle(x, y, 260, 44, color).setOrigin(0.5).setStrokeStyle(2, 0x666666);
    this.add.text(x, y, label, {
      fontSize: "16px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    bg.setInteractive();
    bg.on("pointerdown", onClick);
    return bg;
  }

  private showSlotSelect(): void {
    const slots = getAllSlotInfo();
    const overlay = this.add.container(0, 0).setDepth(200);
    const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x111122, 1).setOrigin(0.5);
    overlay.add(bg);

    overlay.add(this.add.text(GAME_W / 2, 60, "SAVE SLOTS", {
      fontSize: "24px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5));

    overlay.add(this.add.text(GAME_W / 2, 95, "Select a slot to continue or start new", {
      fontSize: "11px", fontFamily: "monospace", color: "#888899",
    }).setOrigin(0.5));

    const startY = 140;
    const slotH = 195;

    slots.forEach((slot, i) => {
      this.createSlotCard(overlay, startY + i * slotH, slot);
    });

    // Back button
    const backBg = this.add.rectangle(GAME_W / 2, startY + slots.length * slotH + 20, 200, 40, 0x333344).setOrigin(0.5).setStrokeStyle(1, 0x555566);
    overlay.add(backBg);
    const backText = this.add.text(GAME_W / 2, startY + slots.length * slotH + 20, "BACK", {
      fontSize: "14px", fontFamily: "monospace", color: "#aaaaaa", fontStyle: "bold",
    }).setOrigin(0.5);
    overlay.add(backText);
    backBg.setInteractive();
    backBg.on("pointerdown", () => overlay.destroy(true));
  }

  private createSlotCard(overlay: Phaser.GameObjects.Container, y: number, slot: SaveSlotInfo): void {
    const cardW = 340;
    const cardH = 180;
    const cardX = GAME_W / 2;

    const cardBg = this.add.rectangle(cardX, y + cardH / 2, cardW, cardH, slot.empty ? 0x222233 : 0x1a2a3a).setOrigin(0.5).setStrokeStyle(2, slot.empty ? 0x444455 : 0x446688);
    overlay.add(cardBg);

    // Slot label
    overlay.add(this.add.text(cardX - cardW / 2 + 15, y + 12, `SLOT ${slot.slot + 1}`, {
      fontSize: "14px", fontFamily: "monospace", color: "#8899bb", fontStyle: "bold",
    }));

    if (slot.empty) {
      // Empty slot — show "New Game" button (plus a Dev Test button on slot 0)
      overlay.add(this.add.text(cardX, y + 42, "- Empty -", {
        fontSize: "13px", fontFamily: "monospace", color: "#555566",
      }).setOrigin(0.5));

      const isDevSlot = slot.slot === 0;
      const newY = isDevSlot ? y + 80 : y + 100;

      const newBg = this.add.rectangle(cardX, newY, 180, 32, 0x338855).setOrigin(0.5).setStrokeStyle(1, 0x44aa66);
      overlay.add(newBg);
      overlay.add(this.add.text(cardX, newY, "NEW GAME", {
        fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5));
      newBg.setInteractive();
      newBg.on("pointerdown", () => {
        setActiveSlot(slot.slot);
        this.registry.remove("gameState");
        this.scene.start("StarterSelectScene");
      });

      if (isDevSlot) {
        const devBg = this.add.rectangle(cardX, y + 118, 220, 32, 0x664422).setOrigin(0.5).setStrokeStyle(1, 0xaa7733);
        overlay.add(devBg);
        overlay.add(this.add.text(cardX, y + 118, "DEV: TEST SAVE (5000g)", {
          fontSize: "12px", fontFamily: "monospace", color: "#ffcc77", fontStyle: "bold",
        }).setOrigin(0.5));
        devBg.setInteractive();
        devBg.on("pointerdown", () => {
          setActiveSlot(slot.slot);
          const state = createTestGameState();
          this.registry.set("gameState", state);
          saveGame(state);
          this.scene.start("MainMenuScene");
        });
      }
    } else {
      // Occupied slot — show summary + Continue / Delete
      const names = slot.pokemonNames?.join(", ") ?? "???";
      overlay.add(this.add.text(cardX - cardW / 2 + 15, y + 35, names, {
        fontSize: "12px", fontFamily: "monospace", color: "#ddddee",
      }));

      const infoLine = `Lv ${slot.level}  |  ${slot.gold}g  |  World ${slot.worldProgress}/${8}`;
      overlay.add(this.add.text(cardX - cardW / 2 + 15, y + 58, infoLine, {
        fontSize: "11px", fontFamily: "monospace", color: "#7788aa",
      }));

      // Continue button
      const contBg = this.add.rectangle(cardX - 55, y + 105, 150, 36, 0x335588).setOrigin(0.5).setStrokeStyle(1, 0x4477aa);
      overlay.add(contBg);
      overlay.add(this.add.text(cardX - 55, y + 105, "CONTINUE", {
        fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5));
      contBg.setInteractive();
      contBg.on("pointerdown", () => {
        setActiveSlot(slot.slot);
        const state = loadGame();
        if (state) {
          this.registry.set("gameState", state);
          this.scene.start("MainMenuScene");
        }
      });

      // Delete button
      const delBg = this.add.rectangle(cardX + 105, y + 105, 80, 36, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x884444);
      overlay.add(delBg);
      overlay.add(this.add.text(cardX + 105, y + 105, "DELETE", {
        fontSize: "12px", fontFamily: "monospace", color: "#cc6666", fontStyle: "bold",
      }).setOrigin(0.5));
      delBg.setInteractive();
      delBg.on("pointerdown", () => {
        this.showDeleteConfirm(overlay, slot.slot);
      });

      // Dev: +5000g button
      const goldBg = this.add.rectangle(cardX, y + 150, 220, 30, 0x664422).setOrigin(0.5).setStrokeStyle(1, 0xaa7733);
      overlay.add(goldBg);
      const goldLabel = this.add.text(cardX, y + 150, "DEV: +5000g", {
        fontSize: "12px", fontFamily: "monospace", color: "#ffcc77", fontStyle: "bold",
      }).setOrigin(0.5);
      overlay.add(goldLabel);
      goldBg.setInteractive();
      goldBg.on("pointerdown", () => {
        if (addGoldToSlot(slot.slot, 5000)) {
          overlay.destroy(true);
          this.showSlotSelect();
        }
      });
    }
  }

  private showDeleteConfirm(parentOverlay: Phaser.GameObjects.Container, slot: number): void {
    const confirmOverlay = this.add.container(0, 0).setDepth(300);
    const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.85).setOrigin(0.5);
    confirmOverlay.add(bg);

    confirmOverlay.add(this.add.text(GAME_W / 2, GAME_H / 2 - 60, `Delete Slot ${slot + 1}?`, {
      fontSize: "20px", fontFamily: "monospace", color: "#ff4444", fontStyle: "bold",
    }).setOrigin(0.5));

    confirmOverlay.add(this.add.text(GAME_W / 2, GAME_H / 2 - 25, "This cannot be undone.", {
      fontSize: "13px", fontFamily: "monospace", color: "#aaaaaa",
    }).setOrigin(0.5));

    const yesBg = this.add.rectangle(GAME_W / 2 - 70, GAME_H / 2 + 30, 120, 38, 0x993333).setOrigin(0.5).setStrokeStyle(1, 0xcc4444);
    confirmOverlay.add(yesBg);
    confirmOverlay.add(this.add.text(GAME_W / 2 - 70, GAME_H / 2 + 30, "DELETE", {
      fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5));
    yesBg.setInteractive();
    yesBg.on("pointerdown", () => {
      deleteSlotSave(slot);
      this.registry.remove("gameState");
      confirmOverlay.destroy(true);
      parentOverlay.destroy(true);
      this.showSlotSelect(); // Refresh
    });

    const noBg = this.add.rectangle(GAME_W / 2 + 70, GAME_H / 2 + 30, 120, 38, 0x335588).setOrigin(0.5).setStrokeStyle(1, 0x4477aa);
    confirmOverlay.add(noBg);
    confirmOverlay.add(this.add.text(GAME_W / 2 + 70, GAME_H / 2 + 30, "CANCEL", {
      fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5));
    noBg.setInteractive();
    noBg.on("pointerdown", () => confirmOverlay.destroy(true));
  }
}
