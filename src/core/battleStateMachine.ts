import type {
  BattlePokemon,
  BattleItem,
  TurnAction,
  AttackAction,
  AnyBattleEvent,
  DamageEvent,
  MoveUsedEvent,
  FaintEvent,
  BattleEndEvent,
  SwapEvent,
  ItemUsedEvent,
  ForceSwapEvent,
  StatusAppliedEvent,
  StatusDamageEvent,
  StatusSkipEvent,
  StatBoostEvent,
  StatusType,
  MoveMissedEvent,
  MoveData,
  BattleMoveState,
} from "../types.ts";
import { calculateDamage, stageMultiplier } from "./damageCalc.ts";
import { useMove, tickCooldowns } from "./cooldownManager.ts";
import { chooseWildAction } from "./wildAI.ts";
import { applyItem } from "../data/items.ts";
import { xpFromEnemy, addXP } from "./statCalc.ts";

export type BattlePhase =
  | "BATTLE_START"
  | "PLAYER_CHOOSE_ACTION"
  | "PLAYER_FORCE_SWAP"
  | "RESOLVING"
  | "BATTLE_END";

/** Reset a Pokemon's X-item stat stages to zero. */
export function clearBoosts(p: BattlePokemon): void {
  p.battleBoosts = { atk: 0, def: 0, spd: 0, spc: 0 };
}

function getState(p: BattlePokemon): BattleMoveState {
  if (!p.battleState) p.battleState = {};
  return p.battleState;
}

/** Reset in-battle transient state (rollout streak, charge, leech seed, counter, etc). */
function resetBattleState(p: BattlePokemon): void {
  p.battleState = {};
}

/** Roll 2-5 multi-hit count per Gen 1 distribution (2/3 @ 37.5%, 4/5 @ 12.5%). */
function rollMultiHit(rng: () => number): number {
  const r = rng();
  if (r < 0.375) return 2;
  if (r < 0.75) return 3;
  if (r < 0.875) return 4;
  return 5;
}

export type BattleResult = "win" | "lose" | null;

export type EventListener = (event: AnyBattleEvent) => void;

export class BattleStateMachine {
  playerParty: BattlePokemon[];
  enemyParty: BattlePokemon[];
  playerActiveIndex: number = 0;
  enemyActiveIndex: number = 0;
  playerItems: BattleItem[];
  phase: BattlePhase = "BATTLE_START";
  result: BattleResult = null;
  seenSpeciesIds: Set<string> = new Set();
  xpEarned: Map<BattlePokemon, number> = new Map();
  levelUps: { pokemon: BattlePokemon; newLevel: number }[] = [];
  private listeners: EventListener[] = [];
  private rng: () => number;

  constructor(
    playerParty: BattlePokemon[],
    enemyParty: BattlePokemon[],
    playerItems: BattleItem[],
    rng: () => number = Math.random
  ) {
    this.playerParty = playerParty;
    this.enemyParty = enemyParty;
    this.playerItems = playerItems;
    this.rng = rng;
  }

  get playerPokemon(): BattlePokemon {
    return this.playerParty[this.playerActiveIndex];
  }

  get enemyPokemon(): BattlePokemon {
    return this.enemyParty[this.enemyActiveIndex];
  }

  on(listener: EventListener): void {
    this.listeners.push(listener);
  }

  off(listener: EventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private emit(event: AnyBattleEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  start(): void {
    this.phase = "PLAYER_CHOOSE_ACTION";
    for (const p of this.playerParty) {
      clearBoosts(p);
      resetBattleState(p);
    }
    for (const p of this.enemyParty) {
      resetBattleState(p);
      this.seenSpeciesIds.add(p.species.id);
    }
  }

  /** Expose any forced action the player is locked into (charging Solar Beam, emerging from Dig, or biding). */
  getForcedPlayerMoveIndex(): number | null {
    const s = this.playerPokemon.battleState;
    if (!s) return null;
    if (s.chargingMoveId) {
      const idx = this.playerPokemon.moves.findIndex((m) => m.id === s.chargingMoveId);
      return idx >= 0 ? idx : null;
    }
    if (s.bideTurnsLeft !== undefined) {
      const idx = this.playerPokemon.moves.findIndex((m) => m.bide === true);
      return idx >= 0 ? idx : null;
    }
    return null;
  }

  // --- Player submits an attack ---
  submitPlayerAttack(moveIndex: number): AnyBattleEvent[] {
    if (this.phase !== "PLAYER_CHOOSE_ACTION") return [];
    const forced = this.getForcedPlayerMoveIndex();
    const effectiveIndex = forced !== null ? forced : moveIndex;
    const action: AttackAction = { type: "attack", actor: "player", moveIndex: effectiveIndex };
    return this.resolveTurn(action);
  }

  // --- Player submits a swap ---
  submitPlayerSwap(partyIndex: number): AnyBattleEvent[] {
    if (
      this.phase !== "PLAYER_CHOOSE_ACTION" &&
      this.phase !== "PLAYER_FORCE_SWAP"
    )
      return [];

    if (partyIndex === this.playerActiveIndex) return [];
    const target = this.playerParty[partyIndex];
    if (!target || target.currentHP <= 0) return [];

    // Force swap: no enemy turn, just swap
    if (this.phase === "PLAYER_FORCE_SWAP") {
      const events: AnyBattleEvent[] = [];
      this.doSwap("player", partyIndex, events);
      this.phase = "PLAYER_CHOOSE_ACTION";
      for (const e of events) this.emit(e);
      return events;
    }

    // Voluntary swap costs the player's turn
    const action: TurnAction = {
      type: "swap",
      actor: "player",
      targetIndex: partyIndex,
    };
    return this.resolveTurn(action);
  }

  // --- Player uses an item ---
  submitPlayerItem(itemIndex: number, targetPartyIndex: number): AnyBattleEvent[] {
    if (this.phase !== "PLAYER_CHOOSE_ACTION") return [];

    const belt = this.playerItems[itemIndex];
    if (!belt || belt.quantity <= 0) return [];

    const action: TurnAction = {
      type: "item",
      actor: "player",
      itemId: belt.item.id,
      targetIndex: targetPartyIndex,
    };
    return this.resolveTurn(action);
  }

  // --- Core turn resolution ---
  private resolveTurn(playerAction: TurnAction): AnyBattleEvent[] {
    this.phase = "RESOLVING";
    const events: AnyBattleEvent[] = [];

    // Clear counter's "stored damage" buffer on both sides at the start of every
    // turn — Counter only reflects damage taken within the same turn.
    const pState = getState(this.playerPokemon);
    const eState = getState(this.enemyPokemon);
    pState.counterStored = 0;
    eState.counterStored = 0;

    // Enemy always attacks
    const enemyMoveIndex = this.getEnemyMoveIndex();
    const enemyAction: AttackAction = {
      type: "attack",
      actor: "enemy",
      moveIndex: enemyMoveIndex,
    };

    if (playerAction.type === "swap") {
      // Swapping in resets the swapped-out mon's rollout/charge/leech-seed state.
      resetBattleState(this.playerPokemon);
      this.doSwap("player", playerAction.targetIndex, events);
      this.resolveAttack(enemyAction, events);
      this.handleFaintCascade(events);
    } else if (playerAction.type === "item") {
      this.doItem(playerAction, events);
      this.resolveAttack(enemyAction, events);
      this.handleFaintCascade(events);
    } else {
      const playerSpeed = this.playerPokemon.stats.spd * stageMultiplier(this.playerPokemon.battleBoosts.spd);
      const enemySpeed = this.enemyPokemon.stats.spd * stageMultiplier(this.enemyPokemon.battleBoosts.spd);

      let first: AttackAction;
      let second: AttackAction;

      if (playerSpeed > enemySpeed) {
        first = playerAction;
        second = enemyAction;
      } else if (enemySpeed > playerSpeed) {
        first = enemyAction;
        second = playerAction;
      } else {
        if (this.rng() < 0.5) {
          first = playerAction;
          second = enemyAction;
        } else {
          first = enemyAction;
          second = playerAction;
        }
      }

      this.resolveAttack(first, events);
      if (!this.handleFaintCascade(events)) {
        this.resolveAttack(second, events);
        this.handleFaintCascade(events);
      }
    }

    // End-of-turn status + leech seed
    const phase1 = this.phase as BattlePhase;
    if (phase1 !== "BATTLE_END" && phase1 !== "PLAYER_FORCE_SWAP") {
      this.applyEndOfTurnStatus(this.playerPokemon, "player", events);
      this.applyLeechSeedTick(this.playerPokemon, "player", events);
      if (!this.handleFaintCascade(events)) {
        this.applyEndOfTurnStatus(this.enemyPokemon, "enemy", events);
        this.applyLeechSeedTick(this.enemyPokemon, "enemy", events);
        this.handleFaintCascade(events);
      }
      // Decrement confusion counter on both sides
      this.tickConfusion(this.playerPokemon);
      this.tickConfusion(this.enemyPokemon);
    }

    const p = this.phase as BattlePhase;
    if (p !== "BATTLE_END" && p !== "PLAYER_FORCE_SWAP") {
      tickCooldowns(this.playerPokemon);
      tickCooldowns(this.enemyPokemon);
      this.phase = "PLAYER_CHOOSE_ACTION";
    }

    for (const e of events) this.emit(e);
    return events;
  }

  private getEnemyMoveIndex(): number {
    const forced = this.enemyPokemon.battleState;
    if (forced?.chargingMoveId) {
      const idx = this.enemyPokemon.moves.findIndex((m) => m.id === forced.chargingMoveId);
      if (idx >= 0) return idx;
    }
    if (forced?.bideTurnsLeft !== undefined) {
      const idx = this.enemyPokemon.moves.findIndex((m) => m.bide === true);
      if (idx >= 0) return idx;
    }
    return chooseWildAction(this.enemyPokemon, this.playerPokemon, this.rng);
  }

  private resolveAttack(action: AttackAction, events: AnyBattleEvent[]): void {
    const attacker = action.actor === "player" ? this.playerPokemon : this.enemyPokemon;
    const defender = action.actor === "player" ? this.enemyPokemon : this.playerPokemon;
    const attackerSide = action.actor;
    const defenderSide: "player" | "enemy" = action.actor === "player" ? "enemy" : "player";

    if (attacker.currentHP <= 0) return;

    const aState = getState(attacker);
    const dState = getState(defender);

    // Flinch check — set by a previous mover's move this turn.
    if (aState.flinched) {
      aState.flinched = false;
      events.push({
        type: "flinched",
        target: attackerSide,
        pokemonName: attacker.species.name,
      });
      return;
    }

    // Status-based skip (sleep / paralyze)
    if (this.checkStatusSkip(attacker, attackerSide, events)) {
      return;
    }

    // Confusion: decrement and possibly self-hit
    if (aState.confusionTurnsLeft !== undefined && aState.confusionTurnsLeft > 0) {
      if (this.rng() < 0.5) {
        const selfHit = this.computeConfusionSelfHit(attacker);
        attacker.currentHP = Math.max(0, attacker.currentHP - selfHit);
        events.push({
          type: "confusion_self_hit",
          target: attackerSide,
          amount: selfHit,
          pokemonName: attacker.species.name,
        });
        return;
      }
    }

    // Resolve the effective move — forced charging / biding override the picked index.
    let effectiveIndex = action.moveIndex;
    if (aState.chargingMoveId) {
      const i = attacker.moves.findIndex((m) => m.id === aState.chargingMoveId);
      if (i >= 0) effectiveIndex = i;
    } else if (aState.bideTurnsLeft !== undefined) {
      const i = attacker.moves.findIndex((m) => m.bide === true);
      if (i >= 0) effectiveIndex = i;
    }
    const move = attacker.moves[effectiveIndex];
    const isUnleashingChargedAttack = aState.chargingMoveId === move.id;
    if (isUnleashingChargedAttack) {
      aState.chargingMoveId = undefined;
      aState.semiInvulnerable = false;
    }

    // --- Bide ---
    if (move.bide) {
      if (aState.bideTurnsLeft === undefined) {
        // First turn of Bide
        aState.bideTurnsLeft = 2;
        aState.bideDamage = 0;
        events.push({
          type: "move_used",
          actor: attackerSide,
          moveName: move.name,
          pokemonName: attacker.species.name,
        } as MoveUsedEvent);
        events.push({
          type: "bide_storing",
          actor: attackerSide,
          pokemonName: attacker.species.name,
        });
        useMove(attacker, effectiveIndex);
        return;
      }
      if (aState.bideTurnsLeft > 0) {
        aState.bideTurnsLeft--;
        events.push({
          type: "bide_storing",
          actor: attackerSide,
          pokemonName: attacker.species.name,
        });
        return;
      }
      // Unleash
      const amount = (aState.bideDamage ?? 0) * 2;
      aState.bideTurnsLeft = undefined;
      aState.bideDamage = undefined;
      events.push({
        type: "bide_unleash",
        actor: attackerSide,
        amount,
        pokemonName: attacker.species.name,
      });
      if (amount > 0) {
        defender.currentHP = Math.max(0, defender.currentHP - amount);
        events.push({
          type: "damage",
          target: defenderSide,
          amount,
          effectiveness: 1,
          isStab: false,
          moveName: move.name,
          attacker: attackerSide,
        } as DamageEvent);
      }
      return;
    }

    // --- Charge (Solar Beam / Sky Attack) ---
    if (move.charge && !isUnleashingChargedAttack) {
      aState.chargingMoveId = move.id;
      events.push({
        type: "move_used",
        actor: attackerSide,
        moveName: move.name,
        pokemonName: attacker.species.name,
      } as MoveUsedEvent);
      events.push({
        type: "move_charging",
        actor: attackerSide,
        moveName: move.name,
        pokemonName: attacker.species.name,
      });
      return;
    }

    // --- Semi-invulnerable (Dig / Fly) — turn 1 goes underground / sky ---
    if (move.semiInvulnerable && !isUnleashingChargedAttack) {
      aState.chargingMoveId = move.id;
      aState.semiInvulnerable = true;
      events.push({
        type: "move_used",
        actor: attackerSide,
        moveName: move.name,
        pokemonName: attacker.species.name,
      } as MoveUsedEvent);
      events.push({
        type: "move_charging",
        actor: attackerSide,
        moveName: move.name,
        pokemonName: attacker.species.name,
      });
      return;
    }

    // --- Counter ---
    if (move.counter) {
      events.push({
        type: "move_used",
        actor: attackerSide,
        moveName: move.name,
        pokemonName: attacker.species.name,
      } as MoveUsedEvent);
      useMove(attacker, effectiveIndex);
      const stored = aState.counterStored ?? 0;
      aState.counterStored = 0;
      if (stored > 0) {
        const amount = stored * 2;
        defender.currentHP = Math.max(0, defender.currentHP - amount);
        events.push({
          type: "counter_fired",
          actor: attackerSide,
          amount,
          pokemonName: attacker.species.name,
        });
        events.push({
          type: "damage",
          target: defenderSide,
          amount,
          effectiveness: 1,
          isStab: false,
          moveName: move.name,
          attacker: attackerSide,
        } as DamageEvent);
      } else {
        events.push({
          type: "move_missed",
          actor: attackerSide,
          moveName: move.name,
          pokemonName: attacker.species.name,
        } as MoveMissedEvent);
      }
      return;
    }

    // From here: regular attacking move (possibly an unleashed charge/semi-invuln).
    useMove(attacker, effectiveIndex);
    events.push({
      type: "move_used",
      actor: attackerSide,
      moveName: move.name,
      pokemonName: attacker.species.name,
    } as MoveUsedEvent);

    // Semi-invulnerable target — incoming attacks miss regardless of accuracy.
    if (dState.semiInvulnerable) {
      events.push({
        type: "semi_invulnerable_miss",
        actor: attackerSide,
        pokemonName: defender.species.name,
      });
      if (move.rollout) aState.rolloutStreak = 0;
      return;
    }

    // --- OHKO (Horn Drill / Fissure) ---
    if (move.ohko) {
      if (defender.level > attacker.level) {
        events.push({ type: "ohko_failed", target: defenderSide });
        return;
      }
      // Accuracy still rolls (move.accuracy = 30).
      if (this.rng() >= (move.accuracy / 100)) {
        events.push({
          type: "move_missed",
          actor: attackerSide,
          moveName: move.name,
          pokemonName: attacker.species.name,
        } as MoveMissedEvent);
        return;
      }
      const killAmount = defender.currentHP;
      defender.currentHP = 0;
      events.push({ type: "ohko", target: defenderSide, pokemonName: defender.species.name });
      events.push({
        type: "damage",
        target: defenderSide,
        amount: killAmount,
        effectiveness: 1,
        isStab: false,
        moveName: move.name,
        attacker: attackerSide,
      } as DamageEvent);
      return;
    }

    // Accuracy check (regular moves)
    if (move.accuracy < 100 && this.rng() >= move.accuracy / 100) {
      events.push({
        type: "move_missed",
        actor: attackerSide,
        moveName: move.name,
        pokemonName: attacker.species.name,
      } as MoveMissedEvent);
      // Rollout misses reset the streak.
      if (move.rollout) aState.rolloutStreak = 0;
      return;
    }

    // --- Damage (with multi-hit, rollout, crit) ---
    const plannedHits = move.fixedHits ?? (move.multiHit ? rollMultiHit(this.rng) : 1);
    let totalDamage = 0;
    let actualHits = 0;
    let lastEffectiveness = 1;
    let sawCrit = false;
    for (let h = 0; h < plannedHits; h++) {
      const powerMult = move.rollout ? Math.pow(2, aState.rolloutStreak ?? 0) : 1;
      const { damage, effectiveness, isStab, isCrit } = calculateDamage(
        attacker,
        defender,
        move,
        this.rng,
        { powerMultiplier: powerMult }
      );
      lastEffectiveness = effectiveness;
      if (damage > 0) {
        defender.currentHP = Math.max(0, defender.currentHP - damage);
        events.push({
          type: "damage",
          target: defenderSide,
          amount: damage,
          effectiveness,
          isStab,
          moveName: move.name,
          attacker: attackerSide,
        } as DamageEvent);
        if (isCrit && !sawCrit) {
          events.push({ type: "crit", target: defenderSide });
          sawCrit = true;
        }
        totalDamage += damage;
        actualHits++;
      }
      if (defender.currentHP <= 0) break;
    }
    // Only announce the multi-hit count when more than one hit actually landed;
    // fainting early cuts the streak short, and a "Hit 4 times!" flash after a
    // single-hit KO is misleading.
    if ((move.multiHit || move.fixedHits) && actualHits > 1) {
      events.push({ type: "multi_hit", target: defenderSide, hits: actualHits });
    }

    // Rollout streak progression — only if this hit dealt damage.
    if (move.rollout && totalDamage > 0) {
      const newStreak = Math.min(4, (aState.rolloutStreak ?? 0) + 1);
      aState.rolloutStreak = newStreak;
      events.push({
        type: "rollout_stack",
        actor: attackerSide,
        multiplier: Math.pow(2, newStreak),
        pokemonName: attacker.species.name,
      });
    } else if (!move.rollout) {
      aState.rolloutStreak = 0;
    }

    // Counter: physical damage received stored on defender for their next turn.
    if (move.category === "physical" && totalDamage > 0) {
      dState.counterStored = (dState.counterStored ?? 0) + totalDamage;
    }

    // Bide: defender accumulates received damage while biding.
    if (dState.bideTurnsLeft !== undefined && totalDamage > 0) {
      dState.bideDamage = (dState.bideDamage ?? 0) + totalDamage;
    }

    // Drain heal — minimum 1 when any damage was dealt so tiny hits still drip
    // some HP back (matches the "always drains something" feel of canon).
    if (move.drainRatio && totalDamage > 0 && attacker.currentHP > 0) {
      const heal = Math.max(1, Math.floor(totalDamage * move.drainRatio));
      const actualHeal = Math.min(heal, attacker.maxHP - attacker.currentHP);
      if (actualHeal > 0) {
        attacker.currentHP += actualHeal;
        events.push({
          type: "drain_heal",
          actor: attackerSide,
          amount: actualHeal,
          pokemonName: attacker.species.name,
        });
      }
    }

    // Recoil
    if (move.recoilRatio && totalDamage > 0) {
      const recoil = Math.max(1, Math.floor(totalDamage * move.recoilRatio));
      attacker.currentHP = Math.max(0, attacker.currentHP - recoil);
      events.push({
        type: "recoil",
        actor: attackerSide,
        amount: recoil,
        pokemonName: attacker.species.name,
      });
    }

    // Leech Seed — plants on target.
    if (move.leechSeed && !dState.leechSeededBy && defender.currentHP > 0) {
      // Grass-type is immune to Leech Seed in canon.
      if (!defender.species.types.includes("grass")) {
        dState.leechSeededBy = attackerSide;
        events.push({
          type: "leech_seed_applied",
          target: defenderSide,
          pokemonName: defender.species.name,
        });
      }
    }

    // Flinch — only meaningful if target hasn't acted yet this turn.
    if (move.flinchChance && totalDamage > 0 && this.rng() < move.flinchChance) {
      dState.flinched = true;
    }

    // Non-damaging status moves (sleep powder, thunder wave, etc) and
    // damaging moves with secondary effects (ember burn, thunderbolt para).
    void lastEffectiveness;
    if (move.effect && defender.currentHP > 0) {
      this.tryApplyStatus(move.effect.type, move.effect.chance, defender, defenderSide, events);
    }
  }

  private computeConfusionSelfHit(self: BattlePokemon): number {
    // 40-power typeless physical against self's own defense.
    const level = self.level;
    const atk = self.stats.atk;
    const def = self.stats.def;
    const base = ((2 * level) / 5 + 2) * 40 * (atk / def) / 65 + 2;
    return Math.max(1, Math.floor(base));
  }

  private tickConfusion(p: BattlePokemon): void {
    const s = p.battleState;
    if (!s) return;
    if (s.confusionTurnsLeft !== undefined && s.confusionTurnsLeft > 0) {
      s.confusionTurnsLeft--;
      if (s.confusionTurnsLeft === 0) {
        p.statusEffects = p.statusEffects.filter((st) => st !== "confuse");
      }
    }
  }

  /** Check if a Pokemon's status prevents them from attacking. Returns true if skipped. */
  private checkStatusSkip(pokemon: BattlePokemon, actor: "player" | "enemy", events: AnyBattleEvent[]): boolean {
    if (pokemon.statusEffects.includes("sleep")) {
      if (this.rng() < 0.33) {
        pokemon.statusEffects = pokemon.statusEffects.filter((s) => s !== "sleep");
      }
      events.push({
        type: "status_skip",
        target: actor,
        status: "sleep",
        pokemonName: pokemon.species.name,
      } as StatusSkipEvent);
      return true;
    }

    if (pokemon.statusEffects.includes("paralyze")) {
      if (this.rng() < 0.25) {
        events.push({
          type: "status_skip",
          target: actor,
          status: "paralyze",
          pokemonName: pokemon.species.name,
        } as StatusSkipEvent);
        return true;
      }
    }

    return false;
  }

  /** Try to apply a status effect to a target Pokemon */
  private tryApplyStatus(
    status: StatusType,
    chance: number,
    target: BattlePokemon,
    targetSide: "player" | "enemy",
    events: AnyBattleEvent[]
  ): void {
    if (target.statusEffects.includes(status)) return;

    if (this.rng() < chance) {
      target.statusEffects.push(status);
      if (status === "confuse") {
        const s = getState(target);
        s.confusionTurnsLeft = 1 + Math.floor(this.rng() * 4); // 1-4 turns Gen 1
      }
      events.push({
        type: "status_applied",
        target: targetSide,
        status,
        pokemonName: target.species.name,
      } as StatusAppliedEvent);
    }
  }

  private applyEndOfTurnStatus(pokemon: BattlePokemon, side: "player" | "enemy", events: AnyBattleEvent[]): void {
    if (pokemon.currentHP <= 0) return;

    for (const status of pokemon.statusEffects) {
      if (status === "burn" || status === "poison") {
        const fraction = status === "burn" ? 16 : 8;
        const damage = Math.max(1, Math.floor(pokemon.maxHP / fraction));
        pokemon.currentHP = Math.max(0, pokemon.currentHP - damage);
        events.push({
          type: "status_damage",
          target: side,
          status,
          amount: damage,
          pokemonName: pokemon.species.name,
        } as StatusDamageEvent);
      }
    }
  }

  private applyLeechSeedTick(pokemon: BattlePokemon, side: "player" | "enemy", events: AnyBattleEvent[]): void {
    if (pokemon.currentHP <= 0) return;
    const s = pokemon.battleState;
    if (!s?.leechSeededBy) return;
    const drain = Math.max(1, Math.floor(pokemon.maxHP / 8));
    pokemon.currentHP = Math.max(0, pokemon.currentHP - drain);
    events.push({
      type: "leech_seed_tick",
      target: side,
      drained: drain,
      pokemonName: pokemon.species.name,
    });
    const seeder = s.leechSeededBy === "player" ? this.playerPokemon : this.enemyPokemon;
    if (seeder && seeder.currentHP > 0) {
      const heal = Math.min(drain, seeder.maxHP - seeder.currentHP);
      if (heal > 0) {
        seeder.currentHP += heal;
        events.push({
          type: "drain_heal",
          actor: s.leechSeededBy,
          amount: heal,
          pokemonName: seeder.species.name,
        });
      }
    }
  }

  private doSwap(actor: "player" | "enemy", targetIndex: number, events: AnyBattleEvent[]): void {
    const party = actor === "player" ? this.playerParty : this.enemyParty;
    const oldIndex = actor === "player" ? this.playerActiveIndex : this.enemyActiveIndex;
    const fromName = party[oldIndex].species.name;
    const toName = party[targetIndex].species.name;

    // Swapping out clears the outgoing mon's rollout/charge/leech-seed state —
    // it's a fresh slate when they come back in.
    resetBattleState(party[oldIndex]);

    if (actor === "player") {
      this.playerActiveIndex = targetIndex;
    } else {
      this.enemyActiveIndex = targetIndex;
    }

    events.push({
      type: "swap",
      actor,
      fromName,
      toName,
    } as SwapEvent);
  }

  private doItem(action: TurnAction & { type: "item" }, events: AnyBattleEvent[]): void {
    const beltEntry = this.playerItems.find((b) => b.item.id === action.itemId && b.quantity > 0);
    if (!beltEntry) return;

    const category = beltEntry.item.category;
    if (category !== "medicine" && category !== "battle") return;

    const target = this.playerParty[action.targetIndex];
    if (!target) return;

    const result = applyItem(action.itemId, target, { roster: this.playerParty });
    if (result.kind === "fail") return;

    beltEntry.quantity--;

    if (result.kind === "boost") {
      events.push({
        type: "stat_boost",
        actor: "player",
        stat: result.stat,
        stages: result.stages,
        pokemonName: target.species.name,
        itemName: beltEntry.item.name,
      } as StatBoostEvent);
    } else {
      const healAmount =
        result.kind === "heal" || result.kind === "revive" ? result.healAmount : undefined;
      events.push({
        type: "item_used",
        actor: "player",
        itemName: beltEntry.item.name,
        targetName: target.species.name,
        healAmount,
      } as ItemUsedEvent);
    }
  }

  /**
   * Handle faint cascade: when a Pokemon faints, check for party wipe or force swap.
   * Returns true if battle ended or a force swap is needed (halts further actions this turn).
   */
  private handleFaintCascade(events: AnyBattleEvent[]): boolean {
    if (this.enemyPokemon.currentHP <= 0) {
      clearBoosts(this.enemyPokemon);
      resetBattleState(this.enemyPokemon);
      events.push({
        type: "faint",
        target: "enemy",
        pokemonName: this.enemyPokemon.species.name,
      } as FaintEvent);

      const xp = xpFromEnemy(this.enemyPokemon.level);
      for (const p of this.playerParty) {
        if (p.currentHP > 0) {
          const prev = this.xpEarned.get(p) ?? 0;
          this.xpEarned.set(p, prev + xp);
          const leveled = addXP(p, xp);
          if (leveled) {
            this.levelUps.push({ pokemon: p, newLevel: p.level });
          }
        }
      }

      const nextEnemy = this.enemyParty.findIndex(
        (p, i) => i !== this.enemyActiveIndex && p.currentHP > 0
      );
      if (nextEnemy === -1) {
        this.endBattle("win", events);
        return true;
      } else {
        this.doSwap("enemy", nextEnemy, events);
      }
    }

    if (this.playerPokemon.currentHP <= 0) {
      clearBoosts(this.playerPokemon);
      resetBattleState(this.playerPokemon);
      events.push({
        type: "faint",
        target: "player",
        pokemonName: this.playerPokemon.species.name,
      } as FaintEvent);

      const nextPlayer = this.playerParty.findIndex(
        (p, i) => i !== this.playerActiveIndex && p.currentHP > 0
      );
      if (nextPlayer === -1) {
        this.endBattle("lose", events);
        return true;
      } else {
        events.push({ type: "force_swap", actor: "player" } as ForceSwapEvent);
        this.phase = "PLAYER_FORCE_SWAP";
        return true;
      }
    }

    return false;
  }

  private endBattle(result: "win" | "lose", events: AnyBattleEvent[]): void {
    for (const p of this.playerParty) {
      clearBoosts(p);
      resetBattleState(p);
    }
    for (const p of this.enemyParty) resetBattleState(p);
    events.push({ type: "battle_end", result } as BattleEndEvent);
    this.result = result;
    this.phase = "BATTLE_END";
  }
}

// Re-export for tests / consumers that want the type.
export type { MoveData };
