import Phaser from "phaser";

const BAR_WIDTH = 160;
const BAR_HEIGHT = 14;

export class HPBar extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private currentHP = 1;
  private maxHP = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Name label
    this.nameText = scene.add
      .text(0, -20, "", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    // Level label
    this.levelText = scene.add
      .text(BAR_WIDTH, -20, "", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#aaaaaa",
      })
      .setOrigin(1, 0.5);

    // Bar background
    this.bg = scene.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x333333)
      .setOrigin(0, 0.5);

    // Bar fill
    this.fill = scene.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x22cc44)
      .setOrigin(0, 0.5);

    // HP text
    this.hpText = scene.add
      .text(BAR_WIDTH / 2, 0, "", {
        fontSize: "11px",
        fontFamily: "monospace",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5);

    this.add([this.bg, this.fill, this.nameText, this.levelText, this.hpText]);
    scene.add.existing(this);
  }

  setInfo(name: string, level: number): void {
    this.nameText.setText(name);
    this.levelText.setText(`Lv${level}`);
  }

  setHP(current: number, max: number, animate = true): void {
    this.currentHP = Math.max(0, current);
    this.maxHP = max;
    const pct = this.currentHP / this.maxHP;
    const targetWidth = Math.max(0, pct * BAR_WIDTH);

    // Color based on percentage
    let color: number;
    if (pct > 0.5) color = 0x22cc44;
    else if (pct > 0.25) color = 0xddcc22;
    else color = 0xcc2222;

    this.fill.setFillStyle(color);
    this.hpText.setText(`${this.currentHP}/${this.maxHP}`);

    if (animate) {
      this.scene.tweens.add({
        targets: this.fill,
        displayWidth: targetWidth,
        duration: 300,
        ease: "Power2",
      });
    } else {
      this.fill.displayWidth = targetWidth;
    }
  }
}
