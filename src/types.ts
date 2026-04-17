export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "grass"
  | "electric"
  | "rock"
  | "ground"
  | "psychic"
  | "poison"
  | "fighting"
  | "flying"
  | "bug"
  | "ghost"
  | "ice"
  | "dragon";

export type MoveCategory = "physical" | "special";

export type StatusType = "burn" | "poison" | "paralyze" | "sleep" | "confuse";

export interface StatusEffect {
  type: StatusType;
  chance: number;
}

export interface MoveData {
  id: string;
  name: string;
  type: PokemonType;
  power: number;
  accuracy: number;
  cooldown: number;
  category: MoveCategory;
  effect?: StatusEffect;
  description: string;
  // --- Optional mechanic flags (Gen 1) ---
  drainRatio?: number;        // fraction of damage dealt returned to user as HP (0.5 for drain moves)
  leechSeed?: boolean;        // plant Leech Seed on target
  bide?: boolean;             // store damage for 2 turns, unleash 2× on turn 3
  rollout?: boolean;          // doubles power each consecutive hit (reset on miss/switch)
  counter?: boolean;          // deals 2× the physical damage received this turn
  semiInvulnerable?: boolean; // Dig/Fly — turn 1 untargetable, turn 2 attack
  charge?: boolean;           // Solar Beam/Sky Attack/Skull Bash — turn 1 charge, turn 2 attack
  ohko?: boolean;             // Horn Drill/Fissure — one-hit KO with level-gated accuracy
  flinchChance?: number;      // 0-1 chance to flinch target if user moved first
  multiHit?: boolean;         // 2-5 hits (Gen 1 distribution: 2/3 @ 3/8, 4/5 @ 1/8)
  fixedHits?: number;         // always exactly this many hits (Twineedle, Bonemerang, Double Kick = 2)
  recoilRatio?: number;       // fraction of damage dealt taken back as recoil (0.25)
  highCrit?: boolean;         // 8× base crit rate (Slash, Razor Leaf, Karate Chop, Crabhammer)
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  spc: number;
}

export interface MovePoolEntry {
  moveId: string;
  level: number; // level at which the move is learned
}

export interface PokemonSpecies {
  id: string;
  name: string;
  types: PokemonType[];
  baseStats: Stats;
  movePool: MovePoolEntry[];
  catchRate: number;
  rarity: "common" | "uncommon" | "rare";
  spriteKey: string;
  evolvesFrom?: string;
  evolutionLevel?: number;
  evolutionStone?: string;
}

export interface StageBoosts {
  atk: number;
  def: number;
  spd: number;
  spc: number;
}

export interface BattlePokemon {
  species: PokemonSpecies;
  level: number;
  currentXP: number;
  currentHP: number;
  maxHP: number;
  stats: Stats;
  moves: MoveData[];
  cooldowns: number[];
  statusEffects: StatusType[];
  statBonuses: Stats; // permanent vitamin bonuses, persisted
  battleBoosts: StageBoosts; // temporary X item stages, reset per battle
  /**
   * Transient in-battle state for moves with continuation mechanics
   * (Bide, Rollout, Dig/Fly, Solar Beam, Counter, Leech Seed, confusion).
   * All fields live and die within a battle and are reset on start/switch
   * where appropriate. Never persisted to save.
   */
  battleState?: BattleMoveState;
  isFavourite?: boolean; // starred in the roster UI, persisted
  /**
   * Move ids this Pokemon has previously known and forgotten (via the Train
   * FORGET button or a TM overwrite). Relearnable free of charge from the
   * Train screen. Persisted to save.
   */
  forgottenMoves?: string[];
}

export interface BattleMoveState {
  /** Turns left charging / held in Bide / semi-invulnerable / confused. */
  bideTurnsLeft?: number;     // 2 → 1 → 0 (unleash)
  bideDamage?: number;        // damage accumulated while biding
  rolloutStreak?: number;     // 0 → 1 → 2 → ... (multiplier = 2^streak)
  counterStored?: number;     // physical damage received this turn that can be countered
  chargingMoveId?: string;    // solar_beam / sky_attack / skull_bash / dig / fly
  semiInvulnerable?: boolean; // true on charge turn of Dig/Fly — attacks miss
  leechSeededBy?: "player" | "enemy"; // actor that seeded this mon, for heal routing
  confusionTurnsLeft?: number; // 0 = not confused; 1-4 otherwise
  flinched?: boolean;         // set on-hit by flinch mover; cleared after turn use
}

// --- Items ---

export type ItemCategory =
  | "medicine"
  | "field"
  | "vitamin"
  | "stone"
  | "candy"
  | "battle"
  | "tm";

export interface ItemData {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  target: "ally" | "self"; // ally = pick a party member, self = field-use item
  param?: string; // stone id, TM moveId, stat key, etc.
}

export interface BattleItem {
  item: ItemData;
  quantity: number;
}

// --- Eggs ---

export type EggTier = "common" | "rare" | "legendary";

export interface EggInstance {
  id: string;
  tier: EggTier;
  speciesId: string;
  stepsRemaining: number;
}

// --- Actions ---

export interface AttackAction {
  type: "attack";
  actor: "player" | "enemy";
  moveIndex: number;
}

export interface SwapAction {
  type: "swap";
  actor: "player" | "enemy";
  targetIndex: number;
}

export interface ItemAction {
  type: "item";
  actor: "player" | "enemy";
  itemId: string;
  targetIndex: number; // which party member to target
}

export type TurnAction = AttackAction | SwapAction | ItemAction;

// --- Events ---

export interface BattleEvent {
  type: string;
}

export interface DamageEvent extends BattleEvent {
  type: "damage";
  target: "player" | "enemy";
  amount: number;
  effectiveness: number;
  isStab: boolean;
  moveName: string;
  attacker: "player" | "enemy";
}

export interface MoveUsedEvent extends BattleEvent {
  type: "move_used";
  actor: "player" | "enemy";
  moveName: string;
  moveType: PokemonType;
  pokemonName: string;
}

export interface FaintEvent extends BattleEvent {
  type: "faint";
  target: "player" | "enemy";
  pokemonName: string;
}

export interface BattleEndEvent extends BattleEvent {
  type: "battle_end";
  result: "win" | "lose";
}

export interface SwapEvent extends BattleEvent {
  type: "swap";
  actor: "player" | "enemy";
  fromName: string;
  toName: string;
}

export interface ItemUsedEvent extends BattleEvent {
  type: "item_used";
  actor: "player" | "enemy";
  itemName: string;
  targetName: string;
  healAmount?: number;
}

export interface ForceSwapEvent extends BattleEvent {
  type: "force_swap";
  actor: "player" | "enemy";
}

export interface StatusAppliedEvent extends BattleEvent {
  type: "status_applied";
  target: "player" | "enemy";
  status: StatusType;
  pokemonName: string;
}

export interface StatusDamageEvent extends BattleEvent {
  type: "status_damage";
  target: "player" | "enemy";
  status: StatusType;
  amount: number;
  pokemonName: string;
}

export interface StatusSkipEvent extends BattleEvent {
  type: "status_skip";
  target: "player" | "enemy";
  status: StatusType;
  pokemonName: string;
}

export interface StatBoostEvent extends BattleEvent {
  type: "stat_boost";
  actor: "player" | "enemy";
  stat: keyof StageBoosts;
  stages: number;
  pokemonName: string;
  itemName: string;
}

export interface MoveMissedEvent extends BattleEvent {
  type: "move_missed";
  actor: "player" | "enemy";
  moveName: string;
  pokemonName: string;
}

export interface MoveChargingEvent extends BattleEvent {
  type: "move_charging";
  actor: "player" | "enemy";
  moveName: string;
  pokemonName: string;
}

export interface SemiInvulnerableMissEvent extends BattleEvent {
  type: "semi_invulnerable_miss";
  actor: "player" | "enemy";
  pokemonName: string;
}

export interface DrainHealEvent extends BattleEvent {
  type: "drain_heal";
  actor: "player" | "enemy";
  amount: number;
  pokemonName: string;
}

export interface LeechSeedTickEvent extends BattleEvent {
  type: "leech_seed_tick";
  target: "player" | "enemy";
  drained: number;
  pokemonName: string;
}

export interface LeechSeedAppliedEvent extends BattleEvent {
  type: "leech_seed_applied";
  target: "player" | "enemy";
  pokemonName: string;
}

export interface FlinchedEvent extends BattleEvent {
  type: "flinched";
  target: "player" | "enemy";
  pokemonName: string;
}

export interface MultiHitEvent extends BattleEvent {
  type: "multi_hit";
  target: "player" | "enemy";
  hits: number;
}

export interface CritEvent extends BattleEvent {
  type: "crit";
  target: "player" | "enemy";
}

export interface RecoilEvent extends BattleEvent {
  type: "recoil";
  actor: "player" | "enemy";
  amount: number;
  pokemonName: string;
}

export interface ConfusionSelfHitEvent extends BattleEvent {
  type: "confusion_self_hit";
  target: "player" | "enemy";
  amount: number;
  pokemonName: string;
}

export interface BideStoreEvent extends BattleEvent {
  type: "bide_storing";
  actor: "player" | "enemy";
  pokemonName: string;
}

export interface BideUnleashEvent extends BattleEvent {
  type: "bide_unleash";
  actor: "player" | "enemy";
  amount: number;
  pokemonName: string;
}

export interface CounterFiredEvent extends BattleEvent {
  type: "counter_fired";
  actor: "player" | "enemy";
  amount: number;
  pokemonName: string;
}

export interface RolloutStackEvent extends BattleEvent {
  type: "rollout_stack";
  actor: "player" | "enemy";
  multiplier: number;
  pokemonName: string;
}

export interface OHKOEvent extends BattleEvent {
  type: "ohko";
  target: "player" | "enemy";
  pokemonName: string;
}

export interface OHKOFailedEvent extends BattleEvent {
  type: "ohko_failed";
  target: "player" | "enemy";
}

export type AnyBattleEvent =
  | DamageEvent
  | MoveUsedEvent
  | FaintEvent
  | BattleEndEvent
  | SwapEvent
  | ItemUsedEvent
  | ForceSwapEvent
  | StatusAppliedEvent
  | StatusDamageEvent
  | StatusSkipEvent
  | StatBoostEvent
  | MoveMissedEvent
  | MoveChargingEvent
  | SemiInvulnerableMissEvent
  | DrainHealEvent
  | LeechSeedTickEvent
  | LeechSeedAppliedEvent
  | FlinchedEvent
  | MultiHitEvent
  | CritEvent
  | RecoilEvent
  | ConfusionSelfHitEvent
  | BideStoreEvent
  | BideUnleashEvent
  | CounterFiredEvent
  | RolloutStackEvent
  | OHKOEvent
  | OHKOFailedEvent;

// --- Map ---

export type TileType = "floor" | "wall" | "exit";

export type Direction = "up" | "down" | "left" | "right";

export interface MapTile {
  type: TileType;
  revealed: boolean;
  visited: boolean;
  exitDirection?: Direction;
  encounterChance: number;
  goldDrop: number;
}

export interface DungeonMap {
  width: number;
  height: number;
  tiles: MapTile[][];
  worldIndex: number;
  mapIndex: number;
}

export interface WorldProgress {
  currentMap: number; // 0-24, 25 = complete
  unlocked: boolean;
}

export interface GameState {
  roster: BattlePokemon[];
  playerParty: BattlePokemon[];
  playerItems: BattleItem[];
  gold: number;
  seenPokemon: Record<string, number>; // speciesId -> highest level ever encountered (unlocks shop + sets buy level)
  caughtPokemon: string[];              // speciesIds the player has ever owned — persistent Pokedex flag (survives selling)
  worlds: WorldProgress[];
  activeWorld: number;
  currentMap: DungeonMap | null;
  playerX: number;
  playerY: number;
  repelSteps: number;
  eggs: EggInstance[];
}

// --- Shop ---

export interface ShopPokemon {
  speciesId: string;
  cost: number;
  level: number;
}

export interface ShopItem {
  itemId: string;
  cost: number;
}
