import { describe, it, expect } from "vitest";
import { BattleStateMachine } from "../src/core/battleStateMachine.ts";
import { createBattlePokemon } from "../src/core/statCalc.ts";
import { getPokemon } from "../src/data/pokemon.ts";
import { createStarterBelt } from "../src/data/items.ts";
import type { AnyBattleEvent } from "../src/types.ts";

const fixedRng = () => 0.5;

function makeParty(ids: string[]) {
  return ids.map((id) => createBattlePokemon(getPokemon(id), 10));
}

describe("BattleStateMachine", () => {
  function makeBattle(playerIds = ["charmander"], enemyIds = ["squirtle"]) {
    const player = makeParty(playerIds);
    const enemy = makeParty(enemyIds);
    return new BattleStateMachine(player, enemy, createStarterBelt(), fixedRng);
  }

  it("starts in BATTLE_START phase", () => {
    const battle = makeBattle();
    expect(battle.phase).toBe("BATTLE_START");
  });

  it("transitions to PLAYER_CHOOSE_ACTION on start", () => {
    const battle = makeBattle();
    battle.start();
    expect(battle.phase).toBe("PLAYER_CHOOSE_ACTION");
  });

  it("returns events when player submits an attack", () => {
    const battle = makeBattle();
    battle.start();
    const events = battle.submitPlayerAttack(0);
    expect(events.length).toBeGreaterThan(0);
    const moveEvents = events.filter((e) => e.type === "move_used");
    expect(moveEvents.length).toBe(2);
  });

  it("deals damage to both Pokemon", () => {
    const battle = makeBattle();
    battle.start();
    const playerHPBefore = battle.playerPokemon.currentHP;
    const enemyHPBefore = battle.enemyPokemon.currentHP;
    battle.submitPlayerAttack(0);
    const totalDamage =
      (playerHPBefore - battle.playerPokemon.currentHP) +
      (enemyHPBefore - battle.enemyPokemon.currentHP);
    expect(totalDamage).toBeGreaterThan(0);
  });

  it("faster Pokemon goes first", () => {
    const battle = makeBattle(["pikachu"], ["geodude"]);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const moveEvents = events.filter((e) => e.type === "move_used");
    if (moveEvents[0].type === "move_used") {
      expect(moveEvents[0].actor).toBe("player");
    }
  });

  it("slower Pokemon goes second", () => {
    const battle = makeBattle(["geodude"], ["pikachu"]);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const moveEvents = events.filter((e) => e.type === "move_used");
    if (moveEvents[0].type === "move_used") {
      expect(moveEvents[0].actor).toBe("enemy");
    }
  });

  it("emits battle_end when all enemy Pokemon faint", () => {
    const battle = makeBattle(["charmander", "squirtle"], ["eevee"]);
    battle.start();
    for (let i = 0; i < 50; i++) {
      if (battle.phase === "BATTLE_END") break;
      if (battle.phase === "PLAYER_FORCE_SWAP") {
        const next = battle.playerParty.findIndex((p, idx) => idx !== battle.playerActiveIndex && p.currentHP > 0);
        if (next >= 0) battle.submitPlayerSwap(next);
        continue;
      }
      battle.submitPlayerAttack(0);
    }
    expect(battle.phase).toBe("BATTLE_END");
  });

  it("emits events via listener", () => {
    const battle = makeBattle();
    const received: AnyBattleEvent[] = [];
    battle.on((event) => received.push(event));
    battle.start();
    battle.submitPlayerAttack(0);
    expect(received.length).toBeGreaterThan(0);
  });

  it("returns to PLAYER_CHOOSE_ACTION after a non-ending turn", () => {
    const battle = makeBattle(["onix"], ["onix"]);
    battle.start();
    battle.submitPlayerAttack(0);
    if (battle.phase !== "BATTLE_END") {
      expect(battle.phase).toBe("PLAYER_CHOOSE_ACTION");
    }
  });

  it("ignores moves when not in PLAYER_CHOOSE_ACTION phase", () => {
    const battle = makeBattle();
    const events = battle.submitPlayerAttack(0);
    expect(events).toEqual([]);
  });

  // --- Switching tests ---
  it("allows player to swap Pokemon", () => {
    const battle = makeBattle(["charmander", "squirtle"], ["eevee"]);
    battle.start();
    const events = battle.submitPlayerSwap(1);
    const swapEvents = events.filter((e) => e.type === "swap");
    expect(swapEvents.length).toBeGreaterThanOrEqual(1);
    expect(battle.playerActiveIndex).toBe(1);
    expect(battle.playerPokemon.species.id).toBe("squirtle");
  });

  it("swap costs a turn — enemy still attacks", () => {
    const battle = makeBattle(["charmander", "squirtle"], ["eevee"]);
    battle.start();
    const events = battle.submitPlayerSwap(1);
    const enemyAttacks = events.filter((e) => e.type === "move_used" && e.actor === "enemy");
    expect(enemyAttacks.length).toBe(1);
  });

  it("cannot swap to fainted Pokemon", () => {
    const battle = makeBattle(["charmander", "squirtle"], ["eevee"]);
    battle.start();
    battle.playerParty[1].currentHP = 0;
    const events = battle.submitPlayerSwap(1);
    expect(events).toEqual([]);
  });

  it("force swap when active Pokemon faints", () => {
    const battle = makeBattle(["charmander", "squirtle"], ["eevee"]);
    battle.start();
    battle.playerPokemon.currentHP = 1;
    const events = battle.submitPlayerAttack(0);
    // If player fainted, should be in force swap
    if (battle.playerPokemon.currentHP <= 0) {
      expect(battle.phase).toBe("PLAYER_FORCE_SWAP");
      const forceSwapEvents = events.filter((e) => e.type === "force_swap");
      expect(forceSwapEvents.length).toBe(1);
    }
  });

  // --- Item tests ---
  it("player can use a potion", () => {
    const battle = makeBattle(["charmander"], ["eevee"]);
    battle.start();
    // Deal some damage first
    battle.playerPokemon.currentHP = 20;
    const events = battle.submitPlayerItem(0, 0); // potion on active
    const itemEvents = events.filter((e) => e.type === "item_used");
    expect(itemEvents.length).toBe(1);
    expect(battle.playerPokemon.currentHP).toBeGreaterThan(20);
  });

  it("using item costs a turn — enemy attacks", () => {
    const battle = makeBattle(["charmander"], ["eevee"]);
    battle.start();
    battle.playerPokemon.currentHP = 20;
    const events = battle.submitPlayerItem(0, 0);
    const enemyAttacks = events.filter((e) => e.type === "move_used" && e.actor === "enemy");
    expect(enemyAttacks.length).toBe(1);
  });

  it("enemy sends next Pokemon when one faints", () => {
    const battle = makeBattle(["charmander"], ["eevee", "squirtle"]);
    battle.start();
    battle.enemyPokemon.currentHP = 1;
    const events = battle.submitPlayerAttack(0);
    if (battle.enemyParty[0].currentHP <= 0) {
      const swapEvents = events.filter((e) => e.type === "swap" && e.actor === "enemy");
      expect(swapEvents.length).toBe(1);
      expect(battle.enemyPokemon.species.id).toBe("squirtle");
    }
  });
});
