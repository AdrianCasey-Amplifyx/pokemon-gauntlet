import Phaser from "phaser";
import type { PokemonType } from "../types.ts";
import { TYPE_COLORS } from "./TypeColors.ts";

const DEPTH = 50;

/**
 * Play a short, procedural "move landed" animation keyed off the move's type.
 * Phase-1 (PRD 4.5): one animation per type, reused across every move that
 * shares it. All effects destroy themselves when their tween completes so the
 * caller never has to clean up.
 */
export function playMoveAnimation(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  type: PokemonType,
): void {
  switch (type) {
    case "fire": return fireBurst(scene, toX, toY);
    case "water": return waterArc(scene, fromX, fromY, toX, toY);
    case "electric": return forkedBolt(scene, toX, toY);
    case "grass": return leafSpiral(scene, toX, toY);
    case "rock":
    case "ground": return rockProjectile(scene, fromX, fromY, toX, toY);
    case "psychic": return psychicRipple(scene, toX, toY);
    case "ice": return iceShards(scene, toX, toY);
    case "poison": return poisonCloud(scene, toX, toY);
    case "bug": return bugScatter(scene, fromX, fromY, toX, toY);
    case "ghost": return ghostPulse(scene, toX, toY);
    case "flying": return windStreak(scene, fromX, fromY, toX, toY);
    case "dragon": return dragonArc(scene, fromX, fromY, toX, toY);
    case "fighting":
    case "normal":
    default: return impactFlash(scene, toX, toY);
  }
}

// ---- Shared helpers ----

function fadeAndKill(scene: Phaser.Scene, go: Phaser.GameObjects.GameObject & { alpha: number }, duration: number): void {
  scene.tweens.add({
    targets: go,
    alpha: 0,
    duration,
    onComplete: () => go.destroy(),
  });
}

// ---- Type animations ----

/** Normal / Fighting — crisp white impact flash over the target. */
function impactFlash(scene: Phaser.Scene, x: number, y: number): void {
  const star = scene.add.star(x, y, 6, 12, 28, 0xffffff).setDepth(DEPTH).setAlpha(0.9);
  scene.tweens.add({
    targets: star,
    scale: 1.8,
    alpha: 0,
    angle: 40,
    duration: 260,
    ease: "Cubic.Out",
    onComplete: () => star.destroy(),
  });
  const ring = scene.add.circle(x, y, 8, 0xffffff, 0.0).setDepth(DEPTH).setStrokeStyle(3, 0xffffff, 1);
  scene.tweens.add({
    targets: ring,
    scale: 3.2,
    alpha: 0,
    duration: 300,
    onComplete: () => ring.destroy(),
  });
}

/** Fire — Ember-style rising flame tongues from just below the target. */
function fireBurst(scene: Phaser.Scene, x: number, y: number): void {
  const color = TYPE_COLORS.fire;
  for (let i = 0; i < 7; i++) {
    const ox = x + Phaser.Math.Between(-22, 22);
    const oy = y + Phaser.Math.Between(5, 20);
    const flame = scene.add.circle(ox, oy, Phaser.Math.Between(6, 11), color).setDepth(DEPTH);
    scene.tweens.add({
      targets: flame,
      y: oy - Phaser.Math.Between(38, 58),
      scale: 0.2,
      alpha: 0,
      duration: 340,
      delay: i * 18,
      ease: "Cubic.Out",
      onComplete: () => flame.destroy(),
    });
  }
  // Inner bright core
  const core = scene.add.circle(x, y + 6, 18, 0xffdd66, 0.8).setDepth(DEPTH);
  scene.tweens.add({ targets: core, scale: 0.1, alpha: 0, duration: 320, onComplete: () => core.destroy() });
}

/** Water — bubble arcs from attacker up-and-over into target, splashing on impact. */
function waterArc(scene: Phaser.Scene, fromX: number, fromY: number, toX: number, toY: number): void {
  const color = TYPE_COLORS.water;
  const peakY = Math.min(fromY, toY) - 70;
  for (let i = 0; i < 3; i++) {
    const bubble = scene.add.circle(fromX, fromY, 10 - i * 2, color, 0.9).setDepth(DEPTH).setStrokeStyle(2, 0xffffff, 0.6);
    // Two-stage tween: rise to peak, fall to target.
    scene.tweens.add({
      targets: bubble,
      x: (fromX + toX) / 2,
      y: peakY,
      duration: 140,
      delay: i * 50,
      ease: "Quad.Out",
      onComplete: () => {
        scene.tweens.add({
          targets: bubble,
          x: toX,
          y: toY,
          duration: 140,
          ease: "Quad.In",
          onComplete: () => {
            // Splash at target
            for (let j = 0; j < 5; j++) {
              const drop = scene.add.circle(toX, toY, 4, color, 0.9).setDepth(DEPTH);
              const ang = (Math.PI * 2 * j) / 5 - Math.PI / 2;
              scene.tweens.add({
                targets: drop,
                x: toX + Math.cos(ang) * 32,
                y: toY + Math.sin(ang) * 24,
                alpha: 0,
                duration: 220,
                ease: "Quad.Out",
                onComplete: () => drop.destroy(),
              });
            }
            bubble.destroy();
          },
        });
      },
    });
  }
}

/** Electric — zigzag fork striking down onto the target, then a bright flash. */
function forkedBolt(scene: Phaser.Scene, x: number, y: number): void {
  const color = TYPE_COLORS.electric;
  const g = scene.add.graphics().setDepth(DEPTH);
  g.lineStyle(4, color, 1);
  const topY = y - 120;
  let cx = x;
  g.beginPath();
  g.moveTo(cx, topY);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const jitter = Phaser.Math.Between(-14, 14);
    const segY = topY + ((y - topY) * i) / steps;
    g.lineTo(x + jitter, segY);
  }
  g.strokePath();
  // Second fork branch
  g.lineStyle(2, 0xffffff, 1);
  g.beginPath();
  g.moveTo(cx + 6, topY + 20);
  for (let i = 1; i <= steps; i++) {
    const jitter = Phaser.Math.Between(-18, 18);
    const segY = topY + 20 + ((y - (topY + 20)) * i) / steps;
    g.lineTo(x + jitter, segY);
  }
  g.strokePath();

  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration: 260,
    ease: "Cubic.In",
    onComplete: () => g.destroy(),
  });

  const flash = scene.add.circle(x, y, 26, 0xffffcc, 0.85).setDepth(DEPTH);
  scene.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 240, onComplete: () => flash.destroy() });
}

/** Grass — leaf crescents spiraling inward onto the target. */
function leafSpiral(scene: Phaser.Scene, x: number, y: number): void {
  const color = TYPE_COLORS.grass;
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI * 2 * i) / 6;
    const radius = 64;
    const sx = x + Math.cos(ang) * radius;
    const sy = y + Math.sin(ang) * radius;
    const leaf = scene.add.triangle(sx, sy, 0, -8, 8, 6, -8, 6, color).setDepth(DEPTH);
    leaf.setAngle(Phaser.Math.RadToDeg(ang) + 90);
    scene.tweens.add({
      targets: leaf,
      x,
      y,
      angle: leaf.angle + 360,
      alpha: 0,
      duration: 340,
      delay: i * 22,
      ease: "Cubic.In",
      onComplete: () => leaf.destroy(),
    });
  }
}

/** Rock / Ground — a boulder arcs in from attacker, followed by dust puffs on impact. */
function rockProjectile(scene: Phaser.Scene, fromX: number, fromY: number, toX: number, toY: number): void {
  const color = TYPE_COLORS.rock;
  const rock = scene.add.rectangle(fromX, fromY, 18, 18, color).setStrokeStyle(2, 0x5a4a20).setDepth(DEPTH);
  rock.setAngle(12);
  const peakY = Math.min(fromY, toY) - 50;
  scene.tweens.add({
    targets: rock,
    x: (fromX + toX) / 2,
    y: peakY,
    angle: 200,
    duration: 150,
    ease: "Quad.Out",
    onComplete: () => {
      scene.tweens.add({
        targets: rock,
        x: toX,
        y: toY,
        angle: 420,
        duration: 150,
        ease: "Quad.In",
        onComplete: () => {
          // Dust puffs
          for (let i = 0; i < 5; i++) {
            const ang = Math.PI + (Math.PI * i) / 4;
            const puff = scene.add.circle(toX, toY + 6, 8, 0xc9b989, 0.85).setDepth(DEPTH);
            scene.tweens.add({
              targets: puff,
              x: toX + Math.cos(ang) * 34,
              y: toY + 6 + Math.sin(ang) * 18,
              scale: 1.6,
              alpha: 0,
              duration: 280,
              ease: "Quad.Out",
              onComplete: () => puff.destroy(),
            });
          }
          rock.destroy();
        },
      });
    },
  });
}

/** Psychic — magenta concentric rings rippling out from the target. */
function psychicRipple(scene: Phaser.Scene, x: number, y: number): void {
  const color = TYPE_COLORS.psychic;
  for (let i = 0; i < 3; i++) {
    const ring = scene.add.circle(x, y, 12, 0x000000, 0).setStrokeStyle(3, color, 1).setDepth(DEPTH);
    scene.tweens.add({
      targets: ring,
      scale: 3.4,
      alpha: 0,
      duration: 380,
      delay: i * 90,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
    });
  }
}

/** Ice — cyan shards radiating outward from the target. */
function iceShards(scene: Phaser.Scene, x: number, y: number): void {
  const color = TYPE_COLORS.ice;
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI * 2 * i) / 8;
    const shard = scene.add.triangle(x, y, 0, -12, 5, 6, -5, 6, color).setDepth(DEPTH);
    shard.setAngle(Phaser.Math.RadToDeg(ang));
    shard.setStrokeStyle(1, 0xffffff, 1);
    scene.tweens.add({
      targets: shard,
      x: x + Math.cos(ang - Math.PI / 2) * 44,
      y: y + Math.sin(ang - Math.PI / 2) * 44,
      alpha: 0,
      duration: 320,
      ease: "Cubic.Out",
      onComplete: () => shard.destroy(),
    });
  }
  const flash = scene.add.circle(x, y, 14, 0xffffff, 0.8).setDepth(DEPTH);
  scene.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
}

/** Poison — toxic blob pulsing at target with a few dripping globules below. */
function poisonCloud(scene: Phaser.Scene, x: number, y: number): void {
  const color = TYPE_COLORS.poison;
  const blob = scene.add.circle(x, y, 22, color, 0.85).setDepth(DEPTH).setStrokeStyle(2, 0x6a1f8a, 0.9);
  scene.tweens.add({
    targets: blob,
    scale: 1.6,
    alpha: 0,
    duration: 360,
    ease: "Cubic.Out",
    onComplete: () => blob.destroy(),
  });
  for (let i = 0; i < 4; i++) {
    const drop = scene.add.circle(x + Phaser.Math.Between(-16, 16), y + 10, 5, color, 0.95).setDepth(DEPTH);
    scene.tweens.add({
      targets: drop,
      y: y + 42,
      alpha: 0,
      duration: 340,
      delay: i * 40,
      ease: "Quad.In",
      onComplete: () => drop.destroy(),
    });
  }
}

/** Bug — short scatter of small motes from attacker sweeping toward target. */
function bugScatter(scene: Phaser.Scene, fromX: number, fromY: number, toX: number, toY: number): void {
  const color = TYPE_COLORS.bug;
  for (let i = 0; i < 8; i++) {
    const mote = scene.add.circle(fromX, fromY, 4, color, 0.9).setDepth(DEPTH);
    const jitterX = toX + Phaser.Math.Between(-26, 26);
    const jitterY = toY + Phaser.Math.Between(-18, 18);
    scene.tweens.add({
      targets: mote,
      x: jitterX,
      y: jitterY,
      alpha: 0,
      duration: 300,
      delay: i * 18,
      ease: "Quad.Out",
      onComplete: () => mote.destroy(),
    });
  }
}

/** Ghost — purple fade-pulse that strobes at the target before dissolving. */
function ghostPulse(scene: Phaser.Scene, x: number, y: number): void {
  const color = TYPE_COLORS.ghost;
  const ghost = scene.add.circle(x, y, 26, color, 0.7).setDepth(DEPTH);
  scene.tweens.add({
    targets: ghost,
    alpha: { from: 0.2, to: 0.9 },
    scale: { from: 0.6, to: 1.8 },
    duration: 180,
    yoyo: true,
    repeat: 1,
    onComplete: () => {
      scene.tweens.add({ targets: ghost, alpha: 0, duration: 120, onComplete: () => ghost.destroy() });
    },
  });
}

/** Flying — pale wind streaks sweeping past the target from the attacker's side. */
function windStreak(scene: Phaser.Scene, fromX: number, _fromY: number, toX: number, toY: number): void {
  const dir = Math.sign(toX - fromX) || 1;
  for (let i = 0; i < 4; i++) {
    const offset = (i - 1.5) * 14;
    const streak = scene.add.rectangle(toX - dir * 70, toY + offset, 60, 3, 0xffffff, 0.85).setDepth(DEPTH);
    streak.setOrigin(0.5);
    scene.tweens.add({
      targets: streak,
      x: toX + dir * 70,
      alpha: 0,
      duration: 280,
      delay: i * 30,
      ease: "Cubic.Out",
      onComplete: () => streak.destroy(),
    });
  }
}

/** Dragon — violet energy zigzag arcing from attacker to target. */
function dragonArc(scene: Phaser.Scene, fromX: number, fromY: number, toX: number, toY: number): void {
  const color = TYPE_COLORS.dragon;
  const g = scene.add.graphics().setDepth(DEPTH);
  g.lineStyle(5, color, 1);
  g.beginPath();
  const steps = 8;
  g.moveTo(fromX, fromY);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const lineX = fromX + (toX - fromX) * t;
    const lineY = fromY + (toY - fromY) * t;
    const jitter = (i % 2 === 0 ? 1 : -1) * 14 * (1 - Math.abs(0.5 - t) * 2);
    g.lineTo(lineX + jitter, lineY + jitter);
  }
  g.strokePath();
  // Outline glow
  g.lineStyle(2, 0xffffff, 0.8);
  g.strokePath();

  fadeAndKill(scene, g, 320);

  const burst = scene.add.circle(toX, toY, 18, color, 0.8).setDepth(DEPTH);
  scene.tweens.add({ targets: burst, scale: 2.2, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
}
