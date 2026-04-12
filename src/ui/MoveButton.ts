import Phaser from "phaser";
import type { MoveData } from "../types.ts";
import { TYPE_COLORS } from "./TypeColors.ts";

const BTN_WIDTH = 170;
const BTN_HEIGHT = 58;

export class MoveButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private cdOverlay: Phaser.GameObjects.Rectangle;
  private cdText: Phaser.GameObjects.Text;
  private _enabled = true;
  private onTap: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Border
    this.border = scene.add
      .rectangle(0, 0, BTN_WIDTH + 2, BTN_HEIGHT + 2, 0x555555)
      .setOrigin(0.5);

    // Background
    this.bg = scene.add
      .rectangle(0, 0, BTN_WIDTH, BTN_HEIGHT, 0x444444)
      .setOrigin(0.5);

    // Move name
    this.nameText = scene.add
      .text(0, -10, "", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Type + power info
    this.infoText = scene.add
      .text(0, 12, "", {
        fontSize: "11px",
        fontFamily: "monospace",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    // Cooldown overlay
    this.cdOverlay = scene.add
      .rectangle(0, 0, BTN_WIDTH, BTN_HEIGHT, 0x000000, 0.6)
      .setOrigin(0.5)
      .setVisible(false);

    // Cooldown number
    this.cdText = scene.add
      .text(0, 0, "", {
        fontSize: "28px",
        fontFamily: "monospace",
        color: "#ff6666",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.add([
      this.border,
      this.bg,
      this.nameText,
      this.infoText,
      this.cdOverlay,
      this.cdText,
    ]);

    // Interactive hit area
    this.setSize(BTN_WIDTH, BTN_HEIGHT);
    this.setInteractive();

    this.on("pointerdown", () => {
      if (this._enabled && this.onTap) {
        this.onTap();
      }
    });

    scene.add.existing(this);
  }

  setMove(move: MoveData): void {
    this.nameText.setText(move.name);

    const typeLabel = move.type.charAt(0).toUpperCase() + move.type.slice(1);
    const powerLabel = move.power > 0 ? `Pow: ${move.power}` : "Status";
    const cdLabel = move.cooldown > 0 ? `CD: ${move.cooldown}` : "";
    this.infoText.setText(
      `${typeLabel}  ${powerLabel}${cdLabel ? "  " + cdLabel : ""}`
    );

    const color = TYPE_COLORS[move.type];
    this.bg.setFillStyle(color, 0.7);
  }

  setCooldown(turns: number): void {
    if (turns > 0) {
      this.cdOverlay.setVisible(true);
      this.cdText.setVisible(true).setText(`${turns}`);
      this._enabled = false;
    } else {
      this.cdOverlay.setVisible(false);
      this.cdText.setVisible(false);
      this._enabled = true;
    }
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.setAlpha(enabled ? 1.0 : 0.5);
  }

  onClick(callback: () => void): void {
    this.onTap = callback;
  }
}
