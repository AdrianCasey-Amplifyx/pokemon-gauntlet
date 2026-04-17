import { describe, it, expect } from "vitest";
import { BattleStateMachine } from "../src/core/battleStateMachine.ts";
import { createBattlePokemon } from "../src/core/statCalc.ts";
import { getPokemon } from "../src/data/pokemon.ts";
import { getMove } from "../src/data/moves.ts";
import { createStarterBelt } from "../src/data/items.ts";
import type { AnyBattleEvent } from "../src/types.ts";

function getMoveForTest(id: string) {
  return getMove(id);
}

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

  // --- X-item boost scope (PRD §1.5) ---
  it("clears battleBoosts on start even if stale from a prior battle", () => {
    const battle = makeBattle(["charmander"], ["eevee"]);
    battle.playerPokemon.battleBoosts.atk = 2;
    battle.start();
    expect(battle.playerPokemon.battleBoosts.atk).toBe(0);
  });

  it("persists battleBoosts across a player swap and back", () => {
    const battle = makeBattle(["charmander", "squirtle"], ["eevee"]);
    battle.start();
    const charmander = battle.playerPokemon;
    charmander.battleBoosts.atk = 1;

    battle.submitPlayerSwap(1);
    // On the bench — boost survives.
    expect(charmander.battleBoosts.atk).toBe(1);

    if (battle.phase === "PLAYER_CHOOSE_ACTION") {
      battle.submitPlayerSwap(0);
      // Back in — boost still there.
      expect(battle.playerPokemon.species.id).toBe("charmander");
      expect(battle.playerPokemon.battleBoosts.atk).toBe(1);
    }
  });

  it("clears battleBoosts when a player Pokemon faints", () => {
    const battle = makeBattle(["charmander", "squirtle"], ["eevee"]);
    battle.start();
    const charmander = battle.playerPokemon;
    charmander.battleBoosts.atk = 2;
    // Pre-faint the active — the next turn's cascade should clear boosts
    // and force-swap in the bench mon.
    charmander.currentHP = 0;
    battle.submitPlayerAttack(0);
    expect(charmander.battleBoosts.atk).toBe(0);
  });

  // --- Accuracy (PRD §1.3) ---
  it("emits move_missed when accuracy roll fails", () => {
    // Horn Drill has accuracy 30. Use a controllable RNG that returns 0.99
    // on the accuracy roll to guarantee a miss.
    const rng = () => 0.99;
    const player = makeParty(["nidoking"]);
    const enemy = makeParty(["squirtle"]);
    // Force Horn Drill in slot 0
    player[0].moves[0] = getMoveForTest("horn_drill");
    player[0].cooldowns[0] = 0;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const missed = events.filter((e) => e.type === "move_missed" && e.actor === "player");
    expect(missed.length).toBe(1);
  });

  it("hits when accuracy roll passes", () => {
    // Horn Drill at accuracy 30, rng 0.1 → hits (0.1 < 0.3).
    const rng = () => 0.1;
    const player = makeParty(["nidoking"]);
    const enemy = makeParty(["squirtle"]);
    player[0].moves[0] = getMoveForTest("horn_drill");
    player[0].cooldowns[0] = 0;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const missed = events.filter((e) => e.type === "move_missed" && e.actor === "player");
    expect(missed.length).toBe(0);
  });

  it("clears all player battleBoosts on battle end", () => {
    const battle = makeBattle(["charmander"], ["eevee"]);
    battle.start();
    battle.playerPokemon.battleBoosts.atk = 2;
    battle.playerPokemon.battleBoosts.spd = 1;
    battle.enemyPokemon.currentHP = 1;
    // One hit should finish the enemy and end the battle.
    for (let i = 0; i < 10 && battle.phase !== "BATTLE_END"; i++) {
      if (battle.phase === "PLAYER_CHOOSE_ACTION") battle.submitPlayerAttack(0);
      else break;
    }
    if (battle.phase === "BATTLE_END") {
      expect(battle.playerPokemon.battleBoosts.atk).toBe(0);
      expect(battle.playerPokemon.battleBoosts.spd).toBe(0);
    }
  });
});
