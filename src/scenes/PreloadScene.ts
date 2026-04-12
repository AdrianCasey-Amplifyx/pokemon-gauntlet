import Phaser from "phaser";
import { generatePokemonSprites } from "../sprites/pokemonSprites.ts";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  create(): void {
    generatePokemonSprites(this);
    this.scene.start("TitleScene");
  }
}
