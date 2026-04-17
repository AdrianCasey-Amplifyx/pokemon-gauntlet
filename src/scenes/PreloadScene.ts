import Phaser from "phaser";
import { generatePokemonSprites } from "../sprites/pokemonSprites.ts";
import { generateEggSprites } from "../sprites/eggSprites.ts";
import { MusicManager } from "../audio/MusicManager.ts";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  create(): void {
    generatePokemonSprites(this);
    generateEggSprites(this);

    // Kick off MIDI parse in parallel; start the Title Scene once done
    // so every play() call hits loaded tracks rather than the fallback.
    MusicManager.init().finally(() => {
      this.scene.start("TitleScene");
    });
  }
}
