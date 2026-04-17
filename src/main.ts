import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.ts";
import { PreloadScene } from "./scenes/PreloadScene.ts";
import { TitleScene } from "./scenes/TitleScene.ts";
import { StarterSelectScene } from "./scenes/StarterSelectScene.ts";
import { MainMenuScene } from "./scenes/MainMenuScene.ts";
import { WorldSelectScene } from "./scenes/WorldSelectScene.ts";
import { MapScene } from "./scenes/MapScene.ts";
import { BattleScene } from "./scenes/BattleScene.ts";
import { RoomClearScene } from "./scenes/RoomClearScene.ts";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 390,
  height: 844,
  parent: "game",
  backgroundColor: "#1a1a2e",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    parent: "game",
  },
  scene: [BootScene, PreloadScene, TitleScene, StarterSelectScene, MainMenuScene, WorldSelectScene, MapScene, BattleScene, RoomClearScene],
};

new Phaser.Game(config);
