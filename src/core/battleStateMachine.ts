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
    // Clear any stale X-item boosts from prior battles on the player's party
    // (the same instances persist across battles; enemies are always fresh).
    for (const p of this.playerParty) {
      clearBoosts(p);
    }
    // Track all enemy Pokemon as seen
    for (const p of this.enemyParty) {
      this.seenSpeciesIds.add(p.species.id);
    }
  }

  // --- Player submits an attack ---
  submitPlayerAttack(moveIndex: number): AnyBattleEvent[] {
    if (this.phase !== "PLAYER_CHOOSE_ACTION") return [];
    const action: AttackAction = { type: "attack", actor: "player", moveIndex };
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

    // Enemy always attacks
    const enemyMoveIndex = chooseWildAction(
      this.enemyPokemon,
      this.playerPokemon,
      this.rng
    );
    const enemyAction: AttackAction = {
      type: "attack",
      actor: "enemy",
      moveIndex: enemyMoveIndex,
    };

    // Swap and item actions always go first (before attacks)
    // If player attacks, use speed to determine order
    if (playerAction.type === "swap") {
      // Player swaps first, then enemy attacks
      this.doSwap("player", playerAction.targetIndex, events);
      this.resolveAttack(enemyAction, events);
      this.handleFaintCascade(events);
    } else if (playerAction.type === "item") {
      // Player uses item first, then enemy attacks
      this.doItem(playerAction, events);
      this.resolveAttack(enemyAction, events);
      this.handleFaintCascade(events);
    } else {
      // Both attack — speed determines order (X Speed boost included)
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

    // End-of-turn status damage (burn, poison)
    const phase1 = this.phase as BattlePhase;
    if (phase1 !== "BATTLE_END" && phase1 !== "PLAYER_FORCE_SWAP") {
      this.applyEndOfTurnStatus(this.playerPokemon, "player", events);
      if (!this.handleFaintCascade(events)) {
        this.applyEndOfTurnStatus(this.enemyPokemon, "enemy", events);
        this.handleFaintCascade(events);
      }
    }

    // Tick cooldowns if battle continues
    const p = this.phase as BattlePhase;
    if (p !== "BATTLE_END" && p !== "PLAYER_FORCE_SWAP") {
      tickCooldowns(this.playerPokemon);
      tickCooldowns(this.enemyPokemon);
      this.phase = "PLAYER_CHOOSE_ACTION";
    }

    for (const e of events) this.emit(e);
    return events;
  }

  private resolveAttack(action: AttackAction, events: AnyBattleEvent[]): void {
    const attacker = action.actor === "player" ? this.playerPokemon : this.enemyPokemon;
    const defender = action.actor === "player" ? this.enemyPokemon : this.playerPokemon;

    if (attacker.currentHP <= 0) return;

    // Check for status-based skip (paralyze, sleep)
    if (this.checkStatusSkip(attacker, action.actor, events)) {
      return; // Turn lost
    }

    const move = attacker.moves[action.moveIndex];
    useMove(attacker, action.moveIndex);

    events.push({
      type: "move_used",
      actor: action.actor,
      moveName: move.name,
      pokemonName: attacker.species.name,
    } as MoveUsedEvent);

    // Accuracy check. Moves with accuracy < 100 can miss — no damage, no status.
    // Roll is independent of the damage-variance roll (which happens later in
    // calculateDamage). accuracy: 100 always hits (no RNG consumed).
    if (move.accuracy < 100 && this.rng() >= move.accuracy / 100) {
      events.push({
        type: "move_missed",
        actor: action.actor,
        moveName: move.name,
        pokemonName: attacker.species.name,
      } as MoveMissedEvent);
      return;
    }

    const { damage, effectiveness, isStab } = calculateDamage(attacker, defender, move, this.rng);

    if (damage > 0) {
      defender.currentHP = Math.max(0, defender.currentHP - damage);
      events.push({
        type: "damage",
        target: action.actor === "player" ? "enemy" : "player",
        amount: damage,
        effectiveness,
        isStab,
        moveName: move.name,
        attacker: action.actor,
      } as DamageEvent);
    }

    // Try to apply status effect from the move
    if (move.effect && defender.currentHP > 0) {
      this.tryApplyStatus(move.effect.type, move.effect.chance, defender, action.actor === "player" ? "enemy" : "player", events);
    }
  }

  /** Check if a Pokemon's status prevents them from attacking. Returns true if skipped. */
  private checkStatusSkip(pokemon: BattlePokemon, actor: "player" | "enemy", events: AnyBattleEvent[]): boolean {
    if (pokemon.statusEffects.includes("sleep")) {
      // 33% chance to wake up each turn
      if (this.rng() < 0.33) {
        pokemon.statusEffects = pokemon.statusEffects.filter((s) => s !== "sleep");
        // They wake up but still lose this turn
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
      // 25% chance to be fully paralyzed
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
    // Don't stack the same status
    if (target.statusEffects.includes(status)) return;

    if (this.rng() < chance) {
      target.statusEffects.push(status);
      events.push({
        type: "status_applied",
        target: targetSide,
        status,
        pokemonName: target.species.name,
      } as StatusAppliedEvent);
    }
  }

  /** Apply end-of-turn status damage (burn, poison) */
  private applyEndOfTurnStatus(pokemon: BattlePokemon, side: "player" | "enemy", events: AnyBattleEvent[]): void {
    if (pokemon.currentHP <= 0) return;

    for (const status of pokemon.statusEffects) {
      if (status === "burn" || status === "poison") {
        // Burn: 1/16 max HP, Poison: 1/8 max HP
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

  private doSwap(actor: "player" | "enemy", targetIndex: number, events: AnyBattleEvent[]): void {
    const party = actor === "player" ? this.playerParty : this.enemyParty;
    const oldIndex = actor === "player" ? this.playerActiveIndex : this.enemyActiveIndex;
    const fromName = party[oldIndex].species.name;
    const toName = party[targetIndex].species.name;

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
    // Find and consume the item
    const beltEntry = this.playerItems.find((b) => b.item.id === action.itemId && b.quantity > 0);
    if (!beltEntry) return;

    // Only medicine and battle items are usable in battle. Guard against UI bugs.
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
    // Check enemy faint
    if (this.enemyPokemon.currentHP <= 0) {
      clearBoosts(this.enemyPokemon);
      events.push({
        type: "faint",
        target: "enemy",
        pokemonName: this.enemyPokemon.species.name,
      } as FaintEvent);

      // Award XP to all alive party members
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

    // Check player faint
    if (this.playerPokemon.currentHP <= 0) {
      // Fainting clears the mon's boosts — revive mid-battle still comes back clean.
      clearBoosts(this.playerPokemon);
      events.push({
        type: "faint",
        target: "player",
        pokemonName: this.playerPokemon.species.name,
      } as FaintEvent);

      const nextPlayer = this.playerParty.findIndex(
        (p, i) => i !== this.playerActiveIndex && p.currentHP > 0
      );
      if (nextPlayer === -1) {
        // All player Pokemon fainted — player loses
        this.endBattle("lose", events);
        return true;
      } else {
        // Player must choose who to send in
        events.push({ type: "force_swap", actor: "player" } as ForceSwapEvent);
        this.phase = "PLAYER_FORCE_SWAP";
        return true;
      }
    }

    return false;
  }

  private endBattle(result: "win" | "lose", events: AnyBattleEvent[]): void {
    // Defense in depth: wipe every player mon's boosts at battle end so the
    // next battle can't inherit them even if start() gets skipped somewhere.
    for (const p of this.playerParty) clearBoosts(p);
    events.push({ type: "battle_end", result } as BattleEndEvent);
    this.result = result;
    this.phase = "BATTLE_END";
  }
}
