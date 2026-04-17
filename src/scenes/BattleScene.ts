import Phaser from "phaser";
import type { AnyBattleEvent, BattlePokemon, GameState } from "../types.ts";
import { BattleStateMachine } from "../core/battleStateMachine.ts";
import { BattleHUD } from "../ui/BattleHUD.ts";
import { MusicManager } from "../audio/MusicManager.ts";
import { getBattleGoldReward } from "../data/items.ts";
import { saveGame } from "../core/saveManager.ts";

const GAME_W = 390;
const GAME_H = 844;
const EVENT_DELAY = 400;

export class BattleScene extends Phaser.Scene {
  private battleSM!: BattleStateMachine;
  private hud!: BattleHUD;
  private isProcessing = false;
  private gameState!: GameState;
  private enemyCount = 0;
  private isBossBattle = false;

  constructor() {
    super({ key: "BattleScene" });
  }

  create(): void {
    this.isProcessing = false;

    this.gameState = this.registry.get("gameState") as GameState;
    const enemyParty = this.registry.get("enemyParty") as BattlePokemon[];
    this.registry.remove("enemyParty");
    this.enemyCount = enemyParty.length;

    this.isBossBattle = this.registry.get("isBossBattle") as boolean ?? false;
    this.registry.remove("isBossBattle");

    for (const p of this.gameState.playerParty) {
      p.cooldowns = p.cooldowns.map(() => 0);
    }

    const leadIndex = this.gameState.playerParty.findIndex((p) => p.currentHP > 0);
    if (leadIndex > 0) {
      const alive = this.gameState.playerParty[leadIndex];
      this.gameState.playerParty.splice(leadIndex, 1);
      this.gameState.playerParty.unshift(alive);
    }

    this.battleSM = new BattleStateMachine(
      this.gameState.playerParty,
      enemyParty,
      this.gameState.playerItems
    );

    this.hud = new BattleHUD(this);
    this.hud.create(
      this.gameState.playerParty,
      enemyParty,
      this.gameState.playerItems,
      {
        onMoveSelect: (i) => this.onMoveSelected(i),
        onSwapSelect: (i) => this.onSwapSelected(i),
        onItemSelect: (itemIdx, targetIdx) => this.onItemSelected(itemIdx, targetIdx),
      }
    );

    MusicManager.play("battle");
    this.hud.showMessage(this.isBossBattle ? "A powerful Boss appeared!" : "A wild Pokemon appeared!");
    this.hud.setMovesEnabled(false);

    this.time.delayedCall(600, () => {
      this.battleSM.start();
      this.hud.showMessage("What will you do?");
      this.hud.setMovesEnabled(true);
    });
  }

  private onMoveSelected(moveIndex: number): void {
    if (this.isProcessing) return;
    if (this.battleSM.phase !== "PLAYER_CHOOSE_ACTION") return;
    if (this.battleSM.playerPokemon.cooldowns[moveIndex] > 0) return;

    this.isProcessing = true;
    this.hud.setMovesEnabled(false);
    this.hud.closeAllOverlays();
    this.playEventSequence(this.battleSM.submitPlayerAttack(moveIndex));
  }

  private onSwapSelected(partyIndex: number): void {
    if (this.isProcessing && this.battleSM.phase !== "PLAYER_FORCE_SWAP") return;
    if (partyIndex === this.battleSM.playerActiveIndex) return;
    const target = this.battleSM.playerParty[partyIndex];
    if (!target || target.currentHP <= 0) return;

    this.isProcessing = true;
    this.hud.setMovesEnabled(false);
    this.hud.closeAllOverlays();
    this.playEventSequence(this.battleSM.submitPlayerSwap(partyIndex));
  }

  private onItemSelected(itemIndex: number, targetPartyIndex: number): void {
    if (this.isProcessing) return;
    if (this.battleSM.phase !== "PLAYER_CHOOSE_ACTION") return;

    // Sentinel -1 from the HUD means "apply to the active battler" (X items).
    const resolvedTarget = targetPartyIndex < 0 ? this.battleSM.playerActiveIndex : targetPartyIndex;

    this.isProcessing = true;
    this.hud.setMovesEnabled(false);
    this.hud.closeAllOverlays();
    this.playEventSequence(this.battleSM.submitPlayerItem(itemIndex, resolvedTarget));
  }

  private playEventSequence(events: AnyBattleEvent[]): void {
    let delay = 0;

    for (const event of events) {
      this.time.delayedCall(delay, () => this.handleEvent(event));
      delay += EVENT_DELAY;
    }

    this.time.delayedCall(delay, () => {
      this.hud.updateActivePokemon(this.battleSM.playerPokemon, this.battleSM.enemyPokemon);
      this.hud.updateStatusDisplay(this.battleSM.playerPokemon, this.battleSM.enemyPokemon);

      if (this.battleSM.phase === "PLAYER_FORCE_SWAP") {
        this.hud.showMessage("Send in the next Pokemon!");
        this.hud.setMovesEnabled(false);
        this.isProcessing = false;
        this.hud.showSwapPanel(true);
      } else if (this.battleSM.phase === "PLAYER_CHOOSE_ACTION") {
        this.hud.updateCooldowns(this.battleSM.playerPokemon.cooldowns);
        this.hud.setMovesEnabled(true);
        this.hud.showMessage("What will you do?");
        this.isProcessing = false;
      } else {
        this.isProcessing = false;
      }
    });
  }

  private handleEvent(event: AnyBattleEvent): void {
    switch (event.type) {
      case "move_used":
        this.hud.showMessage(`${event.pokemonName} used ${event.moveName}!`);
        break;

      case "move_missed":
        this.hud.showMessage(`${event.pokemonName}'s attack missed!`);
        break;

      case "damage":
        this.hud.showDamageFloater(event.target, event.amount);
        this.hud.flashSprite(event.target);
        this.hud.showEffectiveness(event.effectiveness);
        if (event.target === "player") {
          this.hud.updateHP("player", this.battleSM.playerPokemon.currentHP, this.battleSM.playerPokemon.maxHP);
        } else {
          this.hud.updateHP("enemy", this.battleSM.enemyPokemon.currentHP, this.battleSM.enemyPokemon.maxHP);
        }
        this.hud.updatePartyDots();
        this.hud.updateEnemyPartyDots();
        break;

      case "faint":
        this.hud.showMessage(`${event.pokemonName} fainted!`);
        this.hud.updatePartyDots();
        this.hud.updateEnemyPartyDots();
        break;

      case "swap":
        this.hud.showMessage(`${event.fromName}, come back! Go, ${event.toName}!`);
        this.hud.updateActivePokemon(this.battleSM.playerPokemon, this.battleSM.enemyPokemon);
        this.hud.updateMoveButtons(this.battleSM.playerPokemon);
        break;

      case "item_used":
        this.hud.showMessage(`Used ${event.itemName} on ${event.targetName}!`);
        if (event.healAmount) {
          this.hud.showHealFloater("player", event.healAmount);
          this.hud.updateHP("player", this.battleSM.playerPokemon.currentHP, this.battleSM.playerPokemon.maxHP);
        }
        this.hud.updatePartyDots();
        break;

      case "stat_boost": {
        const statNames: Record<string, string> = {
          atk: "Attack",
          def: "Defense",
          spd: "Speed",
          spc: "Special",
        };
        const label = statNames[event.stat] ?? event.stat;
        this.hud.showMessage(`${event.pokemonName}'s ${label} rose!`);
        this.hud.updateStatBoostIndicator(this.battleSM.playerPokemon);
        break;
      }

      case "status_applied": {
        const statusNames: Record<string, string> = { burn: "burned", poison: "poisoned", paralyze: "paralyzed", sleep: "fell asleep" };
        const label = statusNames[event.status] ?? event.status;
        this.hud.showMessage(`${event.pokemonName} was ${label}!`);
        this.hud.showStatusFloater(event.target, label.toUpperCase(), event.status === "burn" ? "#ff6622" : event.status === "poison" ? "#aa44cc" : event.status === "paralyze" ? "#ddcc22" : "#8888cc");
        this.hud.updateStatusDisplay(this.battleSM.playerPokemon, this.battleSM.enemyPokemon);
        break;
      }

      case "status_damage": {
        this.hud.showDamageFloater(event.target, event.amount);
        const dmgLabel = event.status === "burn" ? "hurt by burn" : "hurt by poison";
        this.hud.showMessage(`${event.pokemonName} is ${dmgLabel}!`);
        if (event.target === "player") {
          this.hud.updateHP("player", this.battleSM.playerPokemon.currentHP, this.battleSM.playerPokemon.maxHP);
        } else {
          this.hud.updateHP("enemy", this.battleSM.enemyPokemon.currentHP, this.battleSM.enemyPokemon.maxHP);
        }
        this.hud.updatePartyDots();
        this.hud.updateEnemyPartyDots();
        break;
      }

      case "status_skip": {
        const skipMsg = event.status === "sleep"
          ? `${event.pokemonName} is fast asleep!`
          : `${event.pokemonName} is paralyzed! It can't move!`;
        this.hud.showMessage(skipMsg);
        break;
      }

      case "force_swap":
        break;

      case "battle_end":
        this.time.delayedCall(800, () => this.handleBattleEnd(event.result));
        break;
    }
  }

  // --- Battle end ---
  private handleBattleEnd(result: "win" | "lose"): void {
    MusicManager.stop();
    this.hud.closeAllOverlays();

    // Track seen Pokemon — unlocks them in the shop at the highest level
    // the player has ever encountered them at, so buying the species back is
    // priced and levelled appropriately.
    for (const enemy of this.battleSM.enemyParty) {
      const id = enemy.species.id;
      const prev = this.gameState.seenPokemon[id] ?? 0;
      if (enemy.level > prev) {
        this.gameState.seenPokemon[id] = enemy.level;
      }
    }

    // Gold reward on win, penalty on loss
    let goldEarned = 0;
    let goldLost = 0;
    if (result === "win") {
      const map = this.gameState.currentMap;
      goldEarned = getBattleGoldReward(this.enemyCount, map?.worldIndex ?? 0, map?.mapIndex ?? 0);
      if (this.isBossBattle) goldEarned = Math.floor(goldEarned * 3); // Boss bonus
      this.gameState.gold += goldEarned;
    } else {
      goldLost = Math.floor(this.gameState.gold * 0.15);
      this.gameState.gold -= goldLost;
    }

    // Mark boss as defeated so MapScene knows to let player through the exit
    if (this.isBossBattle && result === "win") {
      this.registry.set("bossDefeated", true);
    }

    saveGame(this.gameState);
    this.registry.set("battleResult", result);

    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6)
      .setOrigin(0.5).setDepth(200).setAlpha(0);

    const color = result === "win" ? "#44ff44" : "#ff4444";
    const resultText = this.add
      .text(GAME_W / 2, GAME_H / 2 - 60, result === "win" ? "VICTORY!" : "DEFEAT", {
        fontSize: "42px", fontFamily: "monospace", color,
        fontStyle: "bold", stroke: "#000000", strokeThickness: 4,
      })
      .setOrigin(0.5).setDepth(201).setAlpha(0);

    const details: string[] = [];
    if (goldEarned > 0) details.push(`+${goldEarned} gold`);
    if (goldLost > 0) details.push(`-${goldLost} gold lost`);

    // Show XP earned
    if (this.battleSM.xpEarned.size > 0) {
      const totalXP = [...this.battleSM.xpEarned.values()].reduce((a, b) => a + b, 0);
      details.push(`+${totalXP} XP per Pokemon`);
    }

    // Show level ups
    for (const lu of this.battleSM.levelUps) {
      details.push(`${lu.pokemon.species.name} grew to Lv${lu.newLevel}!`);
    }

    // Show newly seen Pokemon
    const newSeen = [...this.battleSM.seenSpeciesIds].filter(
      (id) => !this.gameState.roster.some((r) => r.species.id === id)
    );
    if (newSeen.length > 0) {
      details.push(`New Pokemon seen — now in shop!`);
    }

    const detailText = this.add
      .text(GAME_W / 2, GAME_H / 2 - 10, details.join("\n"), {
        fontSize: "14px", fontFamily: "monospace", color: "#ffd700",
        align: "center", wordWrap: { width: 340 },
      })
      .setOrigin(0.5).setDepth(201).setAlpha(0);

    const continueText = this.add
      .text(GAME_W / 2, GAME_H / 2 + 50, "Tap to continue", {
        fontSize: "16px", fontFamily: "monospace", color: "#cccccc",
      })
      .setOrigin(0.5).setDepth(201).setAlpha(0);

    this.tweens.add({ targets: [overlay, resultText, detailText, continueText], alpha: 1, duration: 500 });

    overlay.setInteractive();
    overlay.once("pointerdown", () => {
      if (result === "lose") {
        // Return to town on defeat
        this.scene.start("MainMenuScene");
      } else {
        // Return to map on win
        this.scene.start("MapScene");
      }
    });
  }
}
