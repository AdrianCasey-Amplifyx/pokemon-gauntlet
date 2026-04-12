import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 40, "POKEMON GAUNTLET", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#f8d030",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 20, "Loading...", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this.scene.start("PreloadScene");
    });
  }
}
