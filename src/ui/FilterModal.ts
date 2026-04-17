import Phaser from "phaser";
import type { PokemonType } from "../types.ts";
import { TYPE_COLORS } from "./TypeColors.ts";

const GAME_W = 390;
const GAME_H = 844;

const ALL_TYPES: PokemonType[] = [
  "normal", "fire", "water", "grass", "electric",
  "rock", "ground", "psychic", "poison", "fighting",
  "flying", "bug", "ghost", "ice", "dragon",
];

/**
 * Overlay modal that lets the player pick a single PokemonType or reset
 * to "all types" (passed back as null). Shared by every list screen so
 * the type-filter UX is identical everywhere.
 *
 * Builds its own interactive backdrop + depth-1000+ chrome, tears it all
 * down in one pass when the user picks a type, taps the reset button, or
 * dismisses via the backdrop. The caller supplies the current selection
 * so the active chip is highlighted.
 */
export function openFilterModal(
  scene: Phaser.Scene,
  currentType: PokemonType | null,
  onSelect: (type: PokemonType | null) => void,
): void {
  const created: Phaser.GameObjects.GameObject[] = [];
  const track = <T extends Phaser.GameObjects.GameObject>(go: T): T => {
    created.push(go);
    return go;
  };

  const close = (): void => {
    for (const go of created) {
      if (go.input) go.disableInteractive();
      go.destroy();
    }
  };

  // Dim backdrop — absorbs clicks outside the panel
  const backdrop = track(
    scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.72)
      .setOrigin(0.5)
      .setDepth(1000)
      .setInteractive()
  );
  backdrop.on("pointerdown", () => {
    close();
  });

  // Panel — a tall card covering most of the screen
  const panelW = 320;
  const panelH = 440;
  track(
    scene.add.rectangle(GAME_W / 2, GAME_H / 2, panelW, panelH, 0x14141f)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x4466aa)
      .setDepth(1001)
      .setInteractive() // blocks backdrop click through
  );

  track(
    scene.add.text(GAME_W / 2, GAME_H / 2 - 190, "FILTER BY TYPE", {
      fontSize: "16px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1002)
  );

  // Grid of 15 type chips — 3 cols × 5 rows
  const cols = 3;
  const chipW = 94;
  const chipH = 34;
  const gapX = 8;
  const gapY = 8;
  const gridW = cols * chipW + (cols - 1) * gapX;
  const startX = GAME_W / 2 - gridW / 2 + chipW / 2;
  const startY = GAME_H / 2 - 150;

  ALL_TYPES.forEach((type, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = startX + col * (chipW + gapX);
    const y = startY + row * (chipH + gapY);
    const isActive = currentType === type;
    const baseColor = TYPE_COLORS[type];
    const bg = track(
      scene.add.rectangle(x, y, chipW, chipH, baseColor, isActive ? 1 : 0.55)
        .setOrigin(0.5)
        .setStrokeStyle(isActive ? 3 : 1, isActive ? 0xffffff : 0x222233)
        .setDepth(1002)
        .setInteractive()
    );
    track(
      scene.add.text(x, y, type.toUpperCase(), {
        fontSize: "11px", fontFamily: "monospace",
        color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(1003)
    );
    bg.on("pointerdown", () => {
      close();
      onSelect(type);
    });
  });

  // Reset button — spans the full width below the grid
  const resetY = startY + 5 * (chipH + gapY) + 18;
  const resetBg = track(
    scene.add.rectangle(GAME_W / 2, resetY, panelW - 32, 36, 0x334466)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0x5577aa)
      .setDepth(1002)
      .setInteractive()
  );
  track(
    scene.add.text(GAME_W / 2, resetY, "RESET — SHOW ALL TYPES", {
      fontSize: "12px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1003)
  );
  resetBg.on("pointerdown", () => {
    close();
    onSelect(null);
  });

  // Cancel button
  const cancelY = resetY + 50;
  const cancelBg = track(
    scene.add.rectangle(GAME_W / 2, cancelY, panelW - 32, 32, 0x222233)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0x444455)
      .setDepth(1002)
      .setInteractive()
  );
  track(
    scene.add.text(GAME_W / 2, cancelY, "CANCEL", {
      fontSize: "11px", fontFamily: "monospace", color: "#aaaabb", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1003)
  );
  cancelBg.on("pointerdown", () => {
    close();
  });
}
