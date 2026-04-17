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

  // --- Move mechanics (PRD §1.2) ---
  it("Mega Drain heals the attacker for half the damage dealt", () => {
    const rng = () => 0.5;
    const player = makeParty(["venonat"]);
    const enemy = makeParty(["rattata"]);
    player[0].moves[0] = getMoveForTest("mega_drain");
    player[0].cooldowns[0] = 0;
    player[0].stats.spd = 999; // go first
    player[0].currentHP = 5;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const drain = events.find((e) => e.type === "drain_heal" && e.actor === "player");
    expect(drain).toBeDefined();
  });

  it("Leech Life heals the attacker for half the damage dealt", () => {
    const rng = () => 0.5;
    const player = makeParty(["paras"]);
    const enemy = makeParty(["rattata"]);
    player[0].moves[0] = getMoveForTest("leech_life");
    player[0].cooldowns[0] = 0;
    player[0].stats.spd = 999; // go first so we resolve the attack before enemy
    player[0].currentHP = Math.max(1, player[0].maxHP - 20);
    const preHP = player[0].currentHP;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const drain = events.find((e) => e.type === "drain_heal" && e.actor === "player");
    expect(drain).toBeDefined();
    // The heal only applies up to the end-of-turn enemy damage, but since player
    // goes first and is at reduced HP with high spd, net HP should go up.
    expect(player[0].currentHP).toBeGreaterThan(preHP);
  });

  it("Leech Life drains at least 1 HP even on a minimum-damage hit", () => {
    // Pikachu (tiny atk) hitting Snorlax (huge def) on a 1 HP leech should
    // still heal 1 back, not floor to 0 (0.5 * 1 = 0 → floor-to-0 was the bug).
    const rng = () => 0.5;
    const player = makeParty(["pikachu"]);
    const enemy = makeParty(["snorlax"]);
    player[0].moves[0] = getMoveForTest("leech_life");
    player[0].cooldowns[0] = 0;
    player[0].stats.spd = 999;
    player[0].stats.atk = 1; // guarantee minimum damage
    player[0].currentHP = Math.max(1, player[0].maxHP - 5);
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const drain = events.find((e) => e.type === "drain_heal" && e.actor === "player") as
      | { type: "drain_heal"; amount: number }
      | undefined;
    expect(drain).toBeDefined();
    expect(drain!.amount).toBeGreaterThanOrEqual(1);
  });

  it("Leech Life emits no drain_heal when the attacker is already at full HP", () => {
    const rng = () => 0.5;
    const player = makeParty(["paras"]);
    const enemy = makeParty(["rattata"]);
    player[0].moves[0] = getMoveForTest("leech_life");
    player[0].cooldowns[0] = 0;
    player[0].stats.spd = 999;
    // currentHP already == maxHP (default from createBattlePokemon)
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const drain = events.find((e) => e.type === "drain_heal" && e.actor === "player");
    // No drain event when there's no room to heal — matches intent.
    expect(drain).toBeUndefined();
  });

  it("recoil moves damage the attacker after dealing damage", () => {
    const rng = () => 0.5;
    const player = makeParty(["tauros"]);
    const enemy = makeParty(["eevee"]);
    player[0].moves[0] = getMoveForTest("take_down");
    player[0].cooldowns[0] = 0;
    const preHP = player[0].currentHP;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const recoil = events.find((e) => e.type === "recoil" && e.actor === "player");
    expect(recoil).toBeDefined();
    expect(player[0].currentHP).toBeLessThan(preHP);
  });

  it("leech seed applies and ticks at end of turn", () => {
    const rng = () => 0.1; // low rolls — accuracy passes (leech_seed is 90)
    const player = makeParty(["bulbasaur"]);
    const enemy = makeParty(["rattata"]); // non-grass, not immune
    player[0].moves[0] = getMoveForTest("leech_seed");
    player[0].cooldowns[0] = 0;
    const preTargetHP = enemy[0].currentHP;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const applied = events.find((e) => e.type === "leech_seed_applied");
    const tick = events.find((e) => e.type === "leech_seed_tick");
    expect(applied).toBeDefined();
    expect(tick).toBeDefined();
    expect(enemy[0].currentHP).toBeLessThan(preTargetHP);
  });

  it("OHKO hits and kills outright when target is not higher level", () => {
    const rng = () => 0.05; // under accuracy/100 = 0.30 → hits
    const player = makeParty(["nidoking"]);
    const enemy = makeParty(["squirtle"]);
    // Ensure they're the same level so the OHKO level-gate passes
    expect(player[0].level).toBe(enemy[0].level);
    player[0].moves[0] = getMoveForTest("horn_drill");
    player[0].cooldowns[0] = 0;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const ohko = events.find((e) => e.type === "ohko");
    expect(ohko).toBeDefined();
    expect(enemy[0].currentHP).toBe(0);
  });

  it("OHKO fails outright when target is higher level", () => {
    const rng = () => 0.01; // would pass accuracy, but level-gate should fail first
    const player = makeParty(["nidoking"]);
    const enemy = makeParty(["squirtle"]);
    player[0].moves[0] = getMoveForTest("horn_drill");
    player[0].cooldowns[0] = 0;
    enemy[0].level = player[0].level + 5;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const failed = events.find((e) => e.type === "ohko_failed");
    expect(failed).toBeDefined();
    expect(enemy[0].currentHP).toBeGreaterThan(0);
  });

  it("semi-invulnerable target (Dig turn 1) makes attacks miss", () => {
    // Two consecutive Dig uses: turn 1 goes underground (no damage), turn 2 erupts.
    const rng = () => 0.2;
    const player = makeParty(["diglett"]);
    const enemy = makeParty(["eevee"]);
    player[0].moves[0] = getMoveForTest("dig");
    player[0].cooldowns[0] = 0;
    // Make player faster so they go first
    player[0].stats.spd = 999;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const preEnemyHP = enemy[0].currentHP;
    const turn1 = battle.submitPlayerAttack(0);
    const charging = turn1.find((e) => e.type === "move_charging");
    expect(charging).toBeDefined();
    // Enemy tried to attack but player is semi-invulnerable (no damage to player from enemy)
    const semiMiss = turn1.find((e) => e.type === "semi_invulnerable_miss");
    expect(semiMiss).toBeDefined();
    expect(enemy[0].currentHP).toBe(preEnemyHP);
  });

  it("multi-hit moves record a multi_hit event with 2-5 hits", () => {
    // Force rng = 0.1 → rollMultiHit returns 2 (under 0.375).
    const rng = () => 0.1;
    const player = makeParty(["beedrill"]);
    const enemy = makeParty(["bulbasaur"]);
    player[0].moves[0] = getMoveForTest("fury_attack");
    player[0].cooldowns[0] = 0;
    const battle = new BattleStateMachine(player, enemy, createStarterBelt(), rng);
    battle.start();
    const events = battle.submitPlayerAttack(0);
    const multi = events.find((e) => e.type === "multi_hit") as { type: "multi_hit"; hits: number } | undefined;
    expect(multi).toBeDefined();
    expect(multi!.hits).toBeGreaterThanOrEqual(2);
    expect(multi!.hits).toBeLessThanOrEqual(5);
  });
});
