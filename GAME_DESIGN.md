# Pokemon Gauntlet — Game Design Document

## Context

A roguelike Pokemon game built for mobile-first browser play. Runs are 2-5 minutes. Turn-based combat with cooldown moves (Grim Quest style). Gauntlet structure with catching risk/reward. Persistent meta-progression across runs. 8 gym areas form the campaign. Built with Phaser 3 + TypeScript + Vite. Art sourced from Midjourney with retro-modern hybrid aesthetic.

---

## 1. Core Game Loop

```
┌─────────────────────────────────────────────────────┐
│                    HOME BASE                         │
│  Roster · Moves · Items · Shop · Lab · Upgrades     │
└──────────────┬──────────────────────────────────────┘
               │ Select area + loadout
               ▼
┌─────────────────────────────────────────────────────┐
│                  LOADOUT PHASE                       │
│  Pick 3 Pokemon · Assign 4 moves each · Fill belt   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│                   GAUNTLET RUN                       │
│  12-18 rooms: battles, catches, rests, forks, loot  │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│                GYM LEADER BOSS                       │
│  2-3 Pokemon, held items, signature moves            │
└──────────────┬──────────────────────────────────────┘
               │ Win or lose
               ▼
┌─────────────────────────────────────────────────────┐
│                  RUN RESULTS                         │
│  XP · Currency · Caught Pokemon · Badge (if won)    │
└──────────────┬──────────────────────────────────────┘
               │
               ▼ Back to HOME BASE
```

**Win condition:** Beat all 8 Gym Leaders. Each badge unlocks the next area.
**Lose condition:** All party Pokemon faint during a run. You keep caught Pokemon, XP, and partial currency.

---

## 2. Combat System

### 2.1 Cooldown-Based Moves

Every move has a **cooldown** measured in turns. After using a move, it becomes unavailable for N turns.

**Move categories by cooldown:**

| Cooldown | Role | Power Range | Examples |
|----------|------|-------------|---------|
| 0 (always available) | Basic attack | 30-50 | Tackle, Scratch, Ember, Water Gun |
| 1 turn | Bread & butter | 50-70 | Bite, Vine Whip, Thundershock |
| 2 turns | Heavy hitter | 75-100 | Flamethrower, Surf, Psychic |
| 3 turns | Nuke / utility | 100-130 or strong effect | Fire Blast, Blizzard, Thunder |
| 3 turns | Status / debuff | No damage | Burn, Paralyze, Stat drops, Trap |

**Design rule:** Every Pokemon should have exactly 1 cooldown-0 move available. This ensures you always have an action, but your good moves cycle in and out.

**Cooldowns tick down whether the Pokemon is active or not.** So swapping out a Pokemon for 2 turns means their big move is refreshed when they come back. This rewards active party rotation.

### 2.2 Turn Structure

Each turn:
1. Player selects action: **Attack**, **Swap**, or **Use Item**
2. Enemy selects action (AI)
3. Speed determines who goes first
4. Actions resolve
5. End-of-turn effects (burn, poison, trap damage)
6. Cooldowns tick down by 1

**Speed timer (configurable):** 5-second timer per turn. If it expires, auto-select the lowest-cooldown available move. This is a setting — players can disable it if they want to think. Default ON for the intended fast-paced feel.

### 2.3 Damage Formula

Simplified Gen 1 inspired formula:

```
damage = ((2 * level / 5 + 2) * power * (atk / def)) / 50 + 2
damage *= STAB (1.5 if move type matches Pokemon type)
damage *= type_effectiveness (0.5 / 1.0 / 2.0)
damage *= random(0.85, 1.00)
```

**Stat spread:** Each Pokemon has 5 stats: HP, Attack, Defense, Speed, Special.
Using a single Special stat (like Gen 1) keeps things simple. Special covers both special attack and special defense.

### 2.4 Type Chart

Start with a **reduced type set** for v1. Can expand later.

**10 types for v1:**
Normal, Fire, Water, Grass, Electric, Rock, Ground, Psychic, Poison, Fighting

This covers the classic matchups and is enough for 8 gyms with distinct themes. Flying, Ice, Ghost, Dragon, Bug, etc. can be added in future updates.

### 2.5 Switching

- Costs your turn (no free switches)
- Incoming Pokemon takes the hit if enemy attacks
- Strategic purpose: rotate to manage HP across party, refresh cooldowns, exploit type matchups
- Caught Pokemon during the run can be swapped in from a "bench" — they don't occupy active party slots until you swap them in

### 2.6 Status Effects

Keep it to 4 core statuses:

| Status | Effect | Duration |
|--------|--------|----------|
| Burn | Lose 1/8 max HP per turn, Attack halved | 3 turns |
| Poison | Lose 1/8 max HP per turn, stacks with repeated poison | Until healed |
| Paralyze | 25% chance to skip turn, Speed halved | 3 turns |
| Trap | Can't switch, lose 1/16 HP per turn | 2 turns |

---

## 3. Gauntlet Structure

### 3.1 Room Types

Each gauntlet is a linear sequence of **12-18 rooms** (varies by area). The next **3 rooms are always visible** on the map so the player can plan ahead.

| Room Type | Frequency | Description |
|-----------|-----------|-------------|
| **Wild Encounter** | ~50% | Fight a wild Pokemon. Option to catch after winning. |
| **Trainer Battle** | ~20% | Harder fight (trainer has 2 Pokemon). Better XP/currency. Can't catch. |
| **Rest Stop** | ~10% | Heal one Pokemon by 40% HP. Choose which one. |
| **Item Cache** | ~8% | Find a random consumable item (Potion, Revive, Ball, held item). |
| **Fork** | ~7% | Choose between two paths (e.g., 2 easy rooms vs 1 hard room + rare item). |
| **Elite Trainer** | ~5% | Mini-boss. Tougher than normal trainer. Drops rare TM or item. |

**Room generation rules:**
- Never start with a Trainer Battle (ease the player in)
- Rest Stop never appears in rooms 1-3 or the last 2 rooms before the gym
- At least 1 Fork per gauntlet
- At least 1 Rest Stop per gauntlet
- Elite Trainer appears at most once, always in the second half
- Gym Leader is always the final room

### 3.2 Difficulty Scaling Within a Run

Rooms get progressively harder:

- **Rooms 1-4:** Wild Pokemon 1-2 levels below player average. Single encounters.
- **Rooms 5-8:** Wild Pokemon at player level. Trainers have better moves.
- **Rooms 9-12:** Wild Pokemon 1-2 levels above. Trainers have type coverage.
- **Rooms 13+:** Challenging encounters. Pokemon with status moves and held items.
- **Gym Leader:** 2-3 Pokemon, 2-4 levels above player, held items, signature moves.

### 3.3 Area Themes (8 Gyms)

Each area has a distinct environment, encounter pool, and gym leader. Areas unlock linearly.

| Area | Theme | Gym Leader Type | Key Wild Pokemon | Rooms |
|------|-------|----------------|------------------|-------|
| 1 — Stonewood Trail | Forest/Rocky | Rock | Geodude, Pidgey, Rattata, Oddish | 12 |
| 2 — Tidepool Coast | Beach/Water | Water | Tentacool, Staryu, Krabby, Shellder | 13 |
| 3 — Ember Caverns | Volcanic cave | Fire | Vulpix, Growlithe, Magmar, Ponyta | 14 |
| 4 — Thundervolt City | Urban/Electric | Electric | Voltorb, Magnemite, Pikachu, Electabuzz | 14 |
| 5 — Mistveil Garden | Overgrown ruins | Grass/Poison | Bulbasaur, Bellsprout, Nidoran, Grimer | 15 |
| 6 — Ironpeak Summit | Mountain | Fighting | Machop, Mankey, Hitmonchan, Hitmonlee | 16 |
| 7 — Mindscape Tower | Psychic temple | Psychic | Abra, Drowzee, Mr. Mime, Jynx | 16 |
| 8 — Champion's Gauntlet | Mixed/All types | Mixed | All types, evolved forms | 18 |

---

## 4. Catching System

### 4.1 Catch Flow

1. Defeat a wild Pokemon in battle (they faint at 0 HP... but not exactly)
2. If you have a Poke Ball in your belt, the game prompts: **"Attempt catch?"**
3. **Catch rate** is calculated based on how low you got their HP before the final blow

**The mechanical twist:** Wild Pokemon don't faint at 0 HP if you have a Poke Ball. Instead, they enter a **"weakened" state** at 1 HP when they would have fainted. You then choose: throw the ball (consume it, roll catch rate) or finish them off (no ball used). This avoids the frustration of accidentally KOing what you wanted to catch.

### 4.2 Catch Rate

```
catch_rate = base_rate * ball_modifier * hp_modifier

base_rate: 0.3 - 0.7 depending on Pokemon rarity
ball_modifier: Poke Ball 1.0, Great Ball 1.5, Ultra Ball 2.0
hp_modifier: percentage of HP removed (1.0 at full damage, down to 0.3 if barely scratched)
```

**In practice:** Common Pokemon (Rattata) are almost guaranteed catches. Rare Pokemon (Abra, starters) are 30-50% even with low HP. Ultra Balls make rare catches reliable.

**Failed catch:** Ball is consumed. Pokemon is KO'd. No second chances.

### 4.3 Caught Pokemon During Run

- Caught Pokemon are added to a **bench** (up to 3 bench slots)
- They join at **50% HP** (not the low HP they were caught at — a small mercy)
- You can swap them into your active party of 3 at any time between rooms
- They have a random moveset from their species' move pool (you don't choose)
- They keep the level they were encountered at
- After the run (win or lose), caught Pokemon are added to your **permanent roster**

### 4.4 The Catch Risk/Reward

This is the heart of the game's strategic tension:

**Costs of catching:**
- Poke Ball occupies an item belt slot that could have been a Potion or held item
- The battle to weaken (not one-shot) takes more turns = more damage taken
- A failed catch wastes the ball entirely
- Mid-run caught Pokemon have random moves, may not synergize

**Benefits of catching:**
- Extra party member (4th, 5th, 6th body for the gauntlet)
- Type coverage you didn't bring in your loadout
- Permanent roster addition even if the run fails
- Some Pokemon are only obtainable through catching in specific areas

---

## 5. Item System

### 5.1 Item Belt

The belt has **limited slots** (starts at 3, upgradeable to 6). You fill it pre-run. Every slot is a tradeoff.

**Consumable items (one-use during run):**

| Item | Effect | Shop Cost |
|------|--------|-----------|
| Potion | Heal 50 HP | 50 |
| Super Potion | Heal 120 HP | 150 |
| Revive | Revive fainted Pokemon at 25% HP | 200 |
| Full Heal | Cure status effects | 75 |
| X Attack | +50% Attack for 3 turns | 100 |
| X Defense | +50% Defense for 3 turns | 100 |
| Poke Ball | Catch attempt, 1.0x rate | 100 |
| Great Ball | Catch attempt, 1.5x rate | 250 |
| Ultra Ball | Catch attempt, 2.0x rate | 500 |

**Held items (passive, persist entire run, reusable across runs):**

| Item | Effect | Unlock Cost |
|------|--------|-------------|
| Charcoal | Fire moves +20% damage | 300 |
| Mystic Water | Water moves +20% damage | 300 |
| Quick Claw | 20% chance to move first regardless of speed | 400 |
| Leftovers | Heal 1/16 HP per turn | 500 |
| Focus Sash | Survive one lethal hit at 1 HP (once per run) | 600 |
| Scope Lens | Critical hit rate doubled | 400 |

**Held items occupy belt slots too.** So a run loadout might be: 1 Potion, 1 Poke Ball, 1 Charcoal. Or: 2 Potions, 1 Revive. Or: 3 Poke Balls (pray).

### 5.2 Items Found During Runs

Item Cache rooms and some battle drops can give you items mid-run. These go into **overflow slots** (don't consume belt space). Limited to 2 overflow items. This rewards exploration without negating pre-run decisions.

---

## 6. Meta-Progression

### 6.1 Currencies

| Currency | Earned From | Spent On |
|----------|-------------|----------|
| **PokeDollars** | Every battle (win or lose), bonus for gym clears | Shop items, Pokemon leveling, belt upgrades |
| **Research Points** | Catching new species, completing research tasks | Unlocking new Pokemon, new move pools |
| **Gym Badges** | Beating Gym Leaders | Unlock next area, prestige upgrades |

### 6.2 Pokemon Leveling (Permanent)

Each Pokemon in your roster has a **permanent level** (1-50). Leveling costs PokeDollars, scaling exponentially.

| Level Range | Cost per Level | Stat Growth |
|-------------|---------------|-------------|
| 1-10 | 50-150 | Fast |
| 11-20 | 200-500 | Medium |
| 21-30 | 600-1500 | Medium |
| 31-40 | 2000-5000 | Slow |
| 41-50 | 6000-15000 | Very slow |

**Leveling unlocks move pool expansion** — at certain levels, new moves become available for that Pokemon's loadout selection.

**Evolution:** At specific levels (e.g., 16, 36), Pokemon evolve. Evolution is a significant stat boost + new moves added to pool. Visual change (new Midjourney art).

### 6.3 Move Unlocks

Each Pokemon has a **move pool** of 8-12 moves. Only 4-6 are available initially. The rest unlock via:

- Leveling the Pokemon
- Buying TMs from the shop
- Elite Trainer drops (rare TMs)
- Research task completion

### 6.4 Professor's Lab (Global Upgrades)

Permanent upgrades that apply to ALL runs. Purchased with PokeDollars.

| Upgrade | Levels | Effect per Level | Max Effect |
|---------|--------|-----------------|------------|
| Tough Training | 5 | All Pokemon +3% HP | +15% HP |
| Power Training | 5 | All Pokemon +3% Attack | +15% Attack |
| Quick Feet | 5 | All Pokemon +3% Speed | +15% Speed |
| Survival Kit | 3 | Rest stops heal +15% more | +45% healing |
| Field Research | 3 | +10% catch rate | +30% catch rate |
| Deep Pockets | 3 | +10% PokeDollars from battles | +30% currency |
| Belt Expansion | 3 | +1 item belt slot | +3 slots (max 6) |
| Bench Expansion | 2 | +1 bench slot for caught Pokemon | +2 slots (max 5) |
| Lucky Finder | 3 | +10% chance for item drops | +30% item drops |

### 6.5 Research Tasks

Ongoing objectives that reward Research Points and unlock Pokemon.

**Examples:**
- "Catch 3 different Water types" → Unlock Squirtle
- "Win a run without using any items" → Unlock Eevee
- "Defeat 20 Poison types" → Unlock Nidoking
- "Beat Area 3 with only Fire types" → Unlock Arcanine
- "Catch a Pokemon in every area" → Unlock Ditto

### 6.6 Starter Roster

You begin the game with **3 Pokemon** (classic starter trio). All others are unlocked via catching or research tasks. Target: **40-60 Pokemon** for the full game, with 8-10 per area.

---

## 7. AI & Encounter Design

### 7.1 Wild Pokemon AI

Simple and predictable so fights are fast:
- Use super-effective moves if available
- Otherwise use highest-power available move (respecting cooldowns)
- Never switch (wild Pokemon are solo)
- Occasionally use status moves (10% chance per turn if they have one)

### 7.2 Trainer AI

Smarter, more dangerous:
- Prioritize type matchups
- Switch Pokemon when at disadvantage
- Use status moves strategically (burn physical attackers, paralyze fast Pokemon)
- Use items (Trainers in later areas carry Potions)

### 7.3 Gym Leader AI

Deliberate and challenging:
- Optimal type matchup switching
- Held items on all Pokemon
- Signature move: one unique high-power move on their ace Pokemon
- Pre-programmed "strategies" (e.g., Brock leads with Geodude to scout, then switches to Onix)
- Gym Leaders scale with player level (within a range) so they're never trivially easy on reruns

---

## 8. UI/UX Design

### 8.1 Screens

1. **Home Base** — Hub screen. Buttons for: Start Run, Roster, Shop, Lab, Research, Settings
2. **Roster** — Grid of unlocked Pokemon. Tap to view stats, moves, level up
3. **Loadout** — Party selection (3 slots) + move assignment + belt filling. Drag-and-drop style.
4. **Gauntlet Map** — Scrolling vertical strip showing rooms ahead. Current room highlighted. Next 3 rooms visible with icons showing type.
5. **Battle Screen** — Your Pokemon bottom, enemy top. Move buttons with cooldown indicators. Party HP bars visible. Belt items accessible via button.
6. **Catch Prompt** — After weakening a wild Pokemon, overlay: "Throw [Ball Type]?" with catch rate shown as a percentage.
7. **Run Results** — Summary: rooms cleared, Pokemon caught, XP earned, currency earned. "New Pokemon!" fanfare for first catches.
8. **Shop** — Item grid with costs. TM section. Ball section.
9. **Lab** — Upgrade tree with levels and costs.

### 8.2 Battle UI Layout (Mobile-First)

```
┌─────────────────────────────┐
│  [Enemy Pokemon sprite]     │
│  [Enemy HP bar]             │
│  [Status icons]             │
│                             │
│                             │
│  [Your Pokemon sprite]      │
│  [Your HP bar] [Status]     │
├─────────────────────────────┤
│ Party: [P1 hp] [P2 hp] [P3]│
├──────────┬──────────────────┤
│ [Move 1] │ [Move 2]        │
│  CD: 0   │  CD: 2 (greyed) │
├──────────┼──────────────────┤
│ [Move 3] │ [Move 4]        │
│  CD: 0   │  CD: 1 (greyed) │
├──────────┴──────────────────┤
│ [Swap]  [Items]  [Run Info] │
└─────────────────────────────┘
```

- Moves on cooldown are **greyed out with a number showing turns remaining**
- Tap a move = use it immediately (fast, no confirmation)
- Party HP strip always visible so you know your squad's state
- Speed timer bar at the top of the move area (draining left to right)

### 8.3 Gauntlet Map UI

Vertical scrolling. Your current position is a Poke Ball icon. Upcoming rooms show:
- Icon for room type (sword = battle, tent = rest, chest = item, fork = fork)
- Wild encounter rooms show the Pokemon's **type icon** (not the Pokemon itself — you know it's Fire type but not which Fire type). This enables tactical planning.

---

## 9. Progression Pacing & Economy

### 9.1 Run Duration Targets

| Area | Rooms | Target Time | Difficulty |
|------|-------|-------------|------------|
| Area 1 | 12 | 2-3 min | Tutorial |
| Area 2-3 | 13-14 | 3-4 min | Easy |
| Area 4-5 | 14-15 | 3-5 min | Medium |
| Area 6-7 | 16 | 4-5 min | Hard |
| Area 8 | 18 | 5-7 min | Very Hard |

### 9.2 Economy Targets

- **First gym clear:** ~3-5 runs (1 failed, 1-2 farming, 1 win)
- **Average PokeDollars per run:** 100-300 (scales with area)
- **Full roster unlock:** ~100+ runs across the whole game
- **Max out Lab upgrades:** Long-term goal, 50+ hours
- **Level a Pokemon to 50:** Dedicated investment, ~30-40 runs of currency

### 9.3 Replayability Hooks

- **Random encounters each run** — different wild Pokemon, different rooms
- **Catching completionist goal** — gotta catch 'em all
- **Research tasks** — ongoing objectives across many runs
- **Team experimentation** — try different party combos and loadouts
- **Area replays** — farm earlier areas for currency/XP, still interesting because catches go to permanent roster
- **Difficulty modes (future):** Hard mode gauntlets with better rewards

---

## 10. Data Architecture

### 10.1 Pokemon Definition

```typescript
interface Pokemon {
  id: string;                    // "charmander"
  name: string;                  // "Charmander"
  types: Type[];                 // ["fire"]
  baseStats: Stats;              // { hp: 39, atk: 52, def: 43, spd: 65, spc: 50 }
  movePool: MovePoolEntry[];     // [{ moveId: "ember", unlockLevel: 1 }, ...]
  evolutionLevel?: number;       // 16
  evolvesInto?: string;          // "charmeleon"
  catchRate: number;             // 0.3 - 0.7
  rarity: "common" | "uncommon" | "rare";
  areas: string[];               // ["ember-caverns"] — where this Pokemon appears
  spriteKey: string;             // key for Midjourney art asset
}
```

### 10.2 Move Definition

```typescript
interface Move {
  id: string;                    // "flamethrower"
  name: string;                  // "Flamethrower"
  type: Type;                    // "fire"
  power: number;                 // 90
  accuracy: number;              // 100
  cooldown: number;              // 2
  category: "physical" | "special";
  effect?: StatusEffect;         // { type: "burn", chance: 0.1 }
  description: string;
}
```

### 10.3 Gauntlet Room Definition

```typescript
interface GauntletRoom {
  type: "wild" | "trainer" | "rest" | "item" | "fork" | "elite" | "gym";
  encounterPool?: string[];      // Pokemon IDs that can appear
  trainerData?: TrainerData;
  rewards?: RewardTable;
  difficulty: number;            // 1-10 scale, determines level scaling
}
```

### 10.4 Player Save Data

```typescript
interface PlayerSave {
  roster: PlayerPokemon[];       // all owned Pokemon with levels, moves
  currency: { pokeDollars: number; researchPoints: number };
  badges: string[];              // earned gym badges
  labUpgrades: Record<string, number>;  // upgrade ID -> level
  beltSlots: number;
  benchSlots: number;
  unlockedPokemon: string[];     // available in roster
  researchTasks: ResearchProgress[];
  settings: GameSettings;
}
```

---

## 11. Technical Implementation Plan

### 11.1 Tech Stack

- **Engine:** Phaser 3
- **Language:** TypeScript
- **Bundler:** Vite
- **State Management:** Custom game state manager (simple pub/sub)
- **Save System:** localStorage with JSON serialization (IndexedDB as future upgrade)
- **Art Pipeline:** Midjourney → exported PNGs → sprite sheets

### 11.2 Scene Structure (Phaser)

```
BootScene          → Load core assets, show splash
PreloadScene       → Load all game assets, progress bar
HomeBaseScene      → Hub menu, navigation to sub-screens
RosterScene        → Pokemon management
ShopScene          → Buy items, TMs
LabScene           → Global upgrades
LoadoutScene       → Pre-run party/move/item selection
GauntletScene      → Map view, room progression
BattleScene        → Turn-based combat
CatchScene         → Catch prompt overlay
RunResultsScene    → Post-run summary
```

### 11.3 Core Systems to Build

1. **Pokemon data system** — Load/query Pokemon, moves, types from data files
2. **Type effectiveness engine** — Type chart lookup, STAB calculation
3. **Damage calculator** — Gen 1-inspired formula with cooldown system
4. **Battle state machine** — Turn flow, move selection, AI, switching, items
5. **Cooldown manager** — Track per-move cooldowns, tick on turn end
6. **Gauntlet generator** — Procedural room sequence based on area template + rules
7. **Catch system** — Rate calculation, ball types, roster addition
8. **Inventory/belt system** — Slot management, item use during battle
9. **Meta-progression manager** — XP, leveling, currency, lab upgrades, research tasks
10. **Save/load system** — Serialize/deserialize player state to localStorage
11. **AI controller** — Wild, Trainer, and Gym Leader behavior profiles
12. **UI framework** — Battle HUD, menus, transitions, mobile touch optimization

### 11.4 Build Order (Recommended)

**Phase 1 — Playable battle (1 Pokemon vs 1 Pokemon):**
- Pokemon data + move data (hardcode 5-10 Pokemon, 20 moves)
- Type chart
- Damage calculator
- Battle scene with cooldown moves
- Basic UI (HP bars, move buttons with cooldown display)
- Wild AI

**Phase 2 — Full battle (party of 3, items, switching):**
- Party system (3 active + bench)
- Switching mechanic
- Item use in battle
- Status effects (burn, poison, paralyze, trap)
- Trainer AI

**Phase 3 — Gauntlet loop:**
- Gauntlet generator (room sequences)
- Gauntlet map scene
- Room transitions
- Rest stops, item caches, forks
- Catching system
- Run results screen

**Phase 4 — Meta-progression:**
- Home base scene
- Roster management (view, level up, assign moves)
- Shop (buy items, TMs, balls)
- Lab upgrades
- Save/load system

**Phase 5 — Content & polish:**
- All 8 areas with encounter pools
- Gym Leader fights with signature strategies
- Research tasks
- All 40-60 Pokemon with data
- Evolution system
- Midjourney art integration
- Sound effects, music
- Mobile optimization (touch, responsive layout)
- Balancing pass (economy, difficulty curve, catch rates)

---

## 12. Verification & Testing

- **Battle math:** Unit tests for damage calculator, type effectiveness, cooldown ticking
- **Gauntlet generation:** Verify room rules (no rest in first 3, at least 1 fork, etc.)
- **Catch rate:** Simulate 1000 catches to verify rates match expected %
- **Economy:** Play through areas 1-3 and verify pacing (3-5 runs per gym feels right)
- **Save/load:** Save mid-progression, reload, verify state is intact
- **Mobile:** Test on iOS Safari and Android Chrome — touch targets, no scroll issues, performance
- **Balance:** Full playthrough of all 8 areas, tracking currency earned vs spent, time per run
