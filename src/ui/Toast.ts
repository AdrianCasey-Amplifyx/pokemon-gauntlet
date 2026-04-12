import Phaser from "phaser";
import { MusicManager, type SFXKind } from "../audio/MusicManager.ts";

const GAME_W = 390;
const GAME_H = 844;

export interface ToastOptions {
  color?: string;
  sfx?: SFXKind;
  y?: number;
  duration?: number;
}

/**
 * Show a fading text toast near the bottom of the screen and optionally
 * trigger a one-shot sound effect. Safe to call from any Phaser scene.
 */
export function showToast(
  scene: Phaser.Scene,
  message: string,
  opts: ToastOptions = {}
): void {
  const { color = "#ffdd44", sfx, y = GAME_H - 120, duration = 1800 } = opts;

  if (sfx) MusicManager.playSFX(sfx);

  const msg = scene.add
    .text(GAME_W / 2, y, message, {
      fontSize: "13px",
      fontFamily: "monospace",
      color,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
      wordWrap: { width: GAME_W - 40 },
    })
    .setOrigin(0.5)
    .setDepth(500);

  scene.tweens.add({
    targets: msg,
    alpha: 0,
    y: y - 14,
    duration,
    delay: 1000,
    onComplete: () => msg.destroy(),
  });
}
