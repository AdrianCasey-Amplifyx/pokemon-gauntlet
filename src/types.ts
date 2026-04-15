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

export type StatusType = "burn" | "poison" | "paralyze" | "sleep";

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
  isFavourite?: boolean; // starred in the roster UI, persisted
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
  | StatBoostEvent;

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
