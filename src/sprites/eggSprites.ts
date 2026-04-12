import Phaser from "phaser";

interface EggSpriteData {
  palette: Record<string, string>;
  grid: string[];
}

/**
 * 16x16 pixel-art eggs styled to match the Pokemon sprites.
 * Each egg has:
 *   - a 1px dark outline (k)
 *   - an upper-left highlight band, mid-tone body, and lower-right shadow
 *   - a tier-specific pattern (green spots / white bands / teal runes)
 */
const EGG_SPRITES: Record<string, EggSpriteData> = {
  egg_common: {
    palette: {
      k: "#3C281C", // outline
      w: "#FFFBEE", // highlight
      c: "#F4DDB4", // cream base
      s: "#C29A6C", // shadow
      g: "#82B848", // green spot
      d: "#4E7826", // dark green spot
    },
    grid: [
      "................",
      "......kkkk......",
      ".....kwwcsk.....",
      "....kwcccssk....",
      "....kwcggssk....",
      "...kwccgdgcsk...",
      "...kwcggggcsk...",
      "...kwccccccsk...",
      "..kwccccccccsk..",
      "..kcccgdgccssk..",
      "..kccggggccssk..",
      "...kcccccsssk...",
      "...kccccssssk...",
      "....kcsssssk....",
      ".....kkkkkk.....",
      "................",
    ],
  },

  egg_rare: {
    palette: {
      k: "#0A1830", // deep blue outline
      l: "#78A8D8", // light blue highlight
      c: "#3060A0", // blue body
      s: "#1A3868", // blue shadow
      w: "#F4F4E6", // white band
      y: "#B4B4A0", // white band shadow
    },
    grid: [
      "................",
      "......kkkk......",
      ".....kllcsk.....",
      "....klccccsk....",
      "....kwwwwyyk....",
      "...klccccccsk...",
      "...klccccsssk...",
      "...kwwwwwwyyk...",
      "..klccccccccsk..",
      "..kccccccccssk..",
      "..kwwwwwwwwyyk..",
      "...kccccccssk...",
      "...kccccssssk...",
      "....kcsssssk....",
      ".....kkkkkk.....",
      "................",
    ],
  },

  egg_legendary: {
    palette: {
      k: "#3C1808", // dark brown outline
      y: "#FFE850", // bright gold highlight
      o: "#F58820", // orange body
      r: "#A83808", // dark red shadow
      t: "#58D0E8", // bright teal rune
      b: "#1A5878", // dark teal
    },
    grid: [
      "................",
      "......kkkk......",
      ".....kyyork.....",
      "....kyooorrk....",
      "....kyoootrk....",
      "...kyootttork...",
      "...kyobtborrk...",
      "...kyoooooork...",
      "..kyoooooorrrk..",
      "..kyootoooorrk..",
      "..kybttoooorrk..",
      "...kooooorrrk...",
      "...kooorrrrrk...",
      "....koorrrrk....",
      ".....kkkkkk.....",
      "................",
    ],
  },
};

/**
 * Generate egg textures. Call this in PreloadScene alongside pokemon sprites.
 * Texture keys: egg_common, egg_rare, egg_legendary.
 */
export function generateEggSprites(scene: Phaser.Scene): void {
  for (const [id, data] of Object.entries(EGG_SPRITES)) {
    const size = 16;
    const canvas = scene.textures.createCanvas(id, size, size);
    if (!canvas) continue;

    const ctx = canvas.getContext();

    for (let row = 0; row < data.grid.length && row < size; row++) {
      const line = data.grid[row];
      for (let col = 0; col < line.length && col < size; col++) {
        const ch = line[col];
        if (ch === "." || ch === " ") continue;
        const color = data.palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(col, row, 1, 1);
      }
    }

    canvas.refresh();
  }
}
