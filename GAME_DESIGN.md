# Pokemon Gauntlet — Game Design Document

> **Status:** This document describes the game **as it is currently built**. Aspirational / unbuilt ideas live in [§13 Future Directions](#13-future-directions) so they can't be confused with shipped features. When code changes, update this file in the same commit (see `CLAUDE.md` → End-of-Task Workflow).

---

## 1. Overview

Pokemon Gauntlet is a mobile-first, browser-based roguelike built with Phaser 3 + TypeScript + Vite. Runs are short (1–3 minutes per dungeon room) and loop around a persistent town hub where the player heals, shops, trains, hatches eggs, and manages a roster. Combat is turn-based with **per-move cooldowns** (Grim Quest style) rather than PP.

- **Mobile-first viewport:** 390 × 844 portrait (scaled to fit)
- **151 Gen 1 Pokemon** with stats, move pools, and evolution lines
- **80+ moves** spread across 15 types in 4 cooldown tiers
- **8 worlds × 25 rooms** of procedurally generated fog-of-war dungeons
- **No external assets:** all sprites are drawn from code at boot, all music is procedural Web Audio
- **Persistence:** single save slot in `localStorage`

---

## 2. Core Game Loop

```
┌─────────────────────────────────────────────────────┐
│                   TITLE SCREEN                      │
│     New Game · Continue · Delete Save               │
└──────────────┬──────────────────────────────────────┘
               │ New Game
               ▼
┌─────────────────────────────────────────────────────┐
│                STARTER SELECT                        │
│  Pick 1 of 3: Charmander / Squirtle / Bulbasaur     │
│  Starting inventory: 3 Potions, 1 Escape Rope, 100g │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│               MAIN MENU (Town Hub)                   │
│  Pokemon · Items · PokeMart · PokeCenter            │
│  Buy Pokemon · Eggs · Adventure                      │
└──────────────┬──────────────────────────────────────┘
               │ Select party of 3, enter Adventure
               ▼
┌─────────────────────────────────────────────────────┐
│              MAP SCENE (Dungeon Room)                │
│  Fog-of-war grid, D-pad movement, encounters,       │
│  gold pickups, find the exit tile                   │
└──────────────┬──────────────────────────────────────┘
               │ Step onto an encounter
               ▼
┌─────────────────────────────────────────────────────┐
│                  BATTLE SCENE                        │
│  Turn-based, cooldown moves, swap, items            │
└──────────────┬──────────────────────────────────────┘
               │ Win → back to Map
               │ Exit tile → party heal + advance room
               │ All faint → lose 15% gold → back to Town
               ▼
       (loop back to Main Menu or next room)
```

**Win condition (aspirational):** Clear all 25 rooms of all 8 worlds.
**Lose condition:** All three active party members faint. The run ends, player forfeits 15% of their current gold, and returns to town. No auto-heal on defeat.
**Save:** Auto-saves at town checkpoints and after every cleared room. Mid-dungeon state is **not** preserved — quitting during a dungeon loses that run's progress.

### Scene flow

| Scene | Purpose |
|---|---|
| `BootScene` | Splash screen |
| `PreloadScene` | Generate 151 Pokemon sprite textures from code |
| `TitleScene` | New Game / Continue / Delete Save |
| `StarterSelectScene` | Pick 1 of 3 starters at level 5 |
| `MainMenuScene` | Town hub — all shops, management, launch point for Adventure |
| `WorldSelectScene` | Browse 8 worlds with progress (not in main flow yet) |
| `MapScene` | Fog-of-war dungeon grid with D-pad controls |
| `BattleScene` | Turn-based combat with party switching and items |

---

## 3. Combat System

### 3.1 Cooldown-Based Moves

Every move has a **cooldown** measured in turns. After using a move, it becomes unavailable for N turns. Cooldowns tick down every turn — including while a Pokemon is swapped out — so rotating the party can cycle big moves back in.

| Cooldown | Role | Power Range | Examples |
|---|---|---|---|
| **0** | Always available | 20–40 | Tackle, Scratch, Bubble, Pound, Quick Attack |
| **1** | Bread & butter | 25–50 | Bite, Ember, Water Gun, Vine Whip, Thundershock |
| **2** | Heavy hitter | 50–70 | Flamethrower, Surf, Psychic, Slam, Waterfall |
| **3** | Nuke | 70–100 | Fire Blast, Hydro Pump, Hyper Beam, Explosion, Horn Drill |

**Design rule:** every learnable Pokemon moveset contains at least one CD-0 move, so the player always has an action.

### 3.2 Turn Structure

Each turn:
1. Player chooses an action: **Attack / Swap / Use Item**
2. Enemy AI chooses an action
3. Speed determines order; ties resolve in the player's favor
4. Actions resolve
5. End-of-turn status ticks (burn/poison damage, paralyze/sleep skip rolls)
6. Cooldowns decrement by 1 for all moves

Swapping costs your turn — the enemy still attacks. Using an item costs your turn the same way.

### 3.3 Damage Formula

Gen 1 inspired, implemented in `src/core/damageCalc.ts`:

```
damage = (((2 * level / 5) + 2) * power * (atk / def)) / 65 + 2
damage *= 1.5        if STAB (move type matches attacker's type)
damage *= effectiveness   (0, 0.5, 1.0, 2.0, 4.0)
damage *= random(0.85 — 1.00)
damage = max(1, floor(damage))   (unless fully immune, in which case 0)
```

`atk/def` uses **Attack/Defense** for physical moves and **Special/Special** for special moves (single Special stat like Gen 1).

### 3.4 Stat Formula

Stats scale with level from species base stats (`src/core/statCalc.ts`):

```
HP     = floor((base * 2 * level) / 50) + level + 10
others = floor((base * 2 * level) / 50) + 5
```

The five stats are **HP / Attack / Defense / Speed / Special**.

### 3.5 Type Chart

**15 types** (full Gen 1 roster): Normal, Fire, Water, Grass, Electric, Rock, Ground, Psychic, Poison, Fighting, Flying, Bug, Ghost, Ice, Dragon.
The effectiveness matrix lives in `src/data/typeChart.ts` and follows the classic Gen 1 chart. Helpers in `src/core/typeEffectiveness.ts` handle dual-type multiplication (can stack to 4× or 0.25×) and STAB detection.

### 3.6 Status Effects

Four status types (`src/types.ts` → `StatusType`):

| Status | Effect | Inflicted by (examples) |
|---|---|---|
| **Burn** | 1/16 max HP end-of-turn chip damage; emitted as `status_damage` | Ember, Fire Punch, Flamethrower, Fire Blast |
| **Poison** | 1/8 max HP end-of-turn chip damage | Poison Sting, Sludge, Smog, **Poison Powder**, **Poison Gas**, Toxic |
| **Paralyze** | 25% chance to skip turn (`status_skip` event) | Thunder Wave, Thunder Shock, Thunderbolt, Stun Spore, **Glare** |
| **Sleep** | Turn always skipped; 33% wake-up chance at start of each skip | **Sing**, **Hypnosis**, Sleep Powder, **Spore** (85%), **Lovely Kiss** (75%) |

Moves carry a `{ type, chance }` effect object; the battle state machine rolls for application, emits `status_applied`, and tracks active statuses on `BattlePokemon.statusEffects`. **Damage-dealing moves** (`power > 0`) apply their status on top of dealing damage. **Status-only moves** (`power: 0`) skip the damage step and only roll for status — these cover sleep/paralyze/poison infliction at high chance (see the bolded entries above). Wild AI picks a status move ~10% of the time if one is available (`wildAI.ts:26`).

### 3.7 Switching & Items In-Battle

- Switching costs your turn. The incoming Pokemon eats any enemy attack that resolves that turn.
- If a Pokemon faints, the player is forced into a swap phase (`PLAYER_FORCE_SWAP`) — no alternate action allowed.
- Items used in battle also cost your turn. Only ally-targeting items (Potion, Super Potion, Revive) are usable mid-battle.
- XP is awarded to **every alive party member** when an enemy faints, not just the one that landed the KO. Fainted Pokemon earn nothing.

### 3.8 Wild AI

Simple, implemented in `src/core/wildAI.ts`:

- Use the highest-power **ready** move (respects cooldowns)
- Weakly prefer super-effective moves
- Never switch (wild encounters are solo, or the enemy AI cycles deterministically in multi-Pokemon boss fights)

---

## 4. Worlds, Rooms, and Scaling

### 4.1 World List

| # | Name | Theme / Pool |
|---|---|---|
| 0 | Viridian Path | Early routes (Pidgey, Rattata, Caterpie, Pikachu…) |
| 1 | Mt. Moon Depths | Caves (Zubat, Geodude, Clefairy, Paras…) |
| 2 | Cerulean Caves | Water/mixed (Psyduck, Magikarp, Krabby, Horsea…) |
| 3 | Vermilion Docks | Electric/urban (Voltorb, Magnemite, Growlithe, Diglett…) |
| 4 | Celadon Gardens | Grass/Poison/Bug (Bulbasaur, Tangela, Scyther, Oddish…) |
| 5 | Saffron Tower | Psychic/Fighting (Abra, Jynx, Machop, Hitmonlee…) |
| 6 | Cinnabar Volcano | Fire/Fossil (Charmander, Magmar, Omanyte, Aerodactyl…) |
| 7 | Indigo Plateau | Legendary tier (Dratini, Lapras, Snorlax, Chansey…) |

Each world has **25 rooms** (`MAPS_PER_WORLD = 25`). Clearing a room heals the party and advances `WorldProgress.currentMap`. Progress is saved per world.

### 4.2 Scaling Formulas (`src/data/worlds.ts`)

```
gridSize         = min(15 + worldIndex + floor(mapIndex / 10), 20)
encounterLevel   = 2 + worldIndex * 5 + floor(mapIndex / 5)
enemyPartySize   = clamp(1 + floor(worldIndex / 2) + (mapIndex >= 20 ? 1 : 0), 1, 6)
                   (World 0, rooms < 10 are always solo encounters for onboarding)
encounterRate    = 0.15  (per-step, flat)
goldPerBattle    = (15 + worldIndex * 12 + floor(mapIndex / 5) * 5) * enemyCount + rand(0..19)
```

### 4.3 Boss Rooms

Rooms **5, 10, 15, 20, and 25** (1-indexed) are boss rooms. When the player steps onto the exit tile in a boss room, they're locked into a battle against a boss before advancing.

- **Boss species** are rolled from a curated `WORLD_BOSSES` pool *separate from the world's regular encounter pool*. These are out-of-area standouts — e.g. Onix or Snorlax in Mt. Moon, Gyarados in Cerulean, Mewtwo/Articuno/etc. on Indigo Plateau.
- **Boss level** = `encounterLevel + 3 + floor(worldIndex / 2)`, so bosses are a noticeable step up from the surrounding rooms.

### 4.4 Map Generation

`src/core/mapGenerator.ts` builds each dungeon on entry:

1. Allocate a `gridSize × gridSize` grid of wall tiles.
2. Choose a random edge and place the single **exit** tile at a random inner position on that edge. Store the exit direction.
3. Carve an L-shaped **floor path** from the grid center to the exit.
4. Randomly carve 35–55% of the remaining inner walls into extra floor tiles (must be adjacent to an existing floor — no orphan rooms).
5. Sprinkle **gold drops** on carved tiles (~6% of path tiles, ~8% of extra floors) with values scaling by world index.
6. Set per-tile encounter chance to `0.15 ± 0.03` jitter.

Tiles track `{ type, revealed, visited, encounterChance, goldDrop, exitDirection? }`. Fog-of-war reveals the 8 neighboring tiles when the player steps onto a tile (`src/core/fogOfWar.ts`).

### 4.5 In-Dungeon Systems

- **D-pad movement** (on-screen or arrow keys). Each step consumes 1 turn of Repel if active and ticks every carried egg by 1 step.
- **Encounters** roll on step using the tile's `encounterChance`. Repel fully blocks rolls for 20 steps after use. Boss rooms guarantee the boss battle on the exit tile regardless of encounter rolls.
- **Gold** is picked up on step-on.
- **Map item** reveals every tile immediately.
- **Escape Rope** returns the party to town safely (no gold penalty).
- **Party wipe** → lose 15% gold, return to town, party is not auto-healed.
- **Bottom button row** has three buttons: **POKEMON** (opens the full roster view with HP, numeric XP, stats, and a PARTY marker on active members), **ITEMS** (inventory + egg progress), and **ESCAPE** (uses an Escape Rope). The Pokemon view mirrors the town's roster screen so XP progression can be tracked mid-run without leaving the dungeon.

---

## 5. Town Hub

`MainMenuScene` is the hub between dungeons. Menu options:

| Option | Function |
|---|---|
| **Pokemon** | View roster, inspect stats/moves, select the 3-Pokemon adventure party |
| **Items** | View inventory |
| **PokeMart** | Buy items (gated by world progress — see §6) |
| **PokeCenter** | Heal entire roster to full HP + clear statuses for **20 gold** |
| **Buy Pokemon** | Purchase Pokemon that have been **seen in battle** (not yet owned) |
| **Eggs** | Buy eggs of three tiers; active eggs hatch after N dungeon steps |
| **Adventure** | Enter the active world's next room |

Secondary menus accessed from **Pokemon**:

- **Train** — learn any move from the Pokemon's move pool whose unlock level ≤ current level (see §6.3)
- **Evolve** — evolve eligible species once they meet their level requirement (see §9.2)

---

## 6. Economy & Shops

### 6.1 PokeMart (Items)

Items are world-gated so that the store grows as the player progresses. The PokeMart UI groups items by category for scannability.

**Medicine**

| Item | Cost | Unlocked after |
|---|---|---|
| Potion | 30 | World 0 |
| Super Potion | 80 | World 1 |
| Revive | 120 | World 2 |

**Field**

| Item | Cost | Unlocked after |
|---|---|---|
| Escape Rope | 40 | World 0 |
| Repel | 50 | World 0 |
| Map | 75 | World 0 |

**Battle items** (usable only in battle, +1 stage = ×1.5 until battle ends, capped at 2 stages)

| Item | Cost | Unlocked after |
|---|---|---|
| X Attack | 100 | World 1 |
| X Defend | 100 | World 1 |
| X Speed | 100 | World 1 |
| X Special | 120 | World 1 |

**Vitamins** (permanent stat boost, applied from the Items menu, caps: +25 HP / +15 per other stat)

| Item | Cost | Unlocked after | Effect |
|---|---|---|---|
| HP Up | 400 | World 1 | +5 max HP per use |
| Protein | 400 | World 1 | +3 Attack per use |
| Iron | 400 | World 1 | +3 Defense per use |
| Carbos | 400 | World 1 | +3 Speed per use |
| Calcium | 400 | World 1 | +3 Special per use |

**Candy**

| Item | Cost | Unlocked after | Effect |
|---|---|---|---|
| Rare Candy | 700 | World 2 | Level up by 1, **capped at the highest level in your roster** (so it catches stragglers up, doesn't create a new ceiling) |

**Evolution Stones** (used from the Items menu on a matching pokemon)

| Item | Cost | Unlocked after | Evolves |
|---|---|---|---|
| Fire Stone | 500 | World 2 | Vulpix → Ninetales, Growlithe → Arcanine, Eevee → Flareon |
| Water Stone | 500 | World 2 | Poliwhirl → Poliwrath, Shellder → Cloyster, Staryu → Starmie, Eevee → Vaporeon |
| Thunder Stone | 500 | World 2 | Pikachu → Raichu, Eevee → Jolteon |
| Leaf Stone | 500 | World 2 | Gloom → Vileplume, Weepinbell → Victreebel, Exeggcute → Exeggutor |
| Moon Stone | 600 | World 3 | Clefairy → Clefable, Jigglypuff → Wigglytuff, Nidorino → Nidoking, Nidorina → Nidoqueen |

**TMs** (purchasable items; **used at the Training Centre**, not the Items menu). Each TM is single-use and teaches a specific move. TMs are **type-matched only** — a pokemon must share at least one type with the move to learn it.

| TM | Move | Cost | Unlocked after |
|---|---|---|---|
| TM Surf | Surf (Water, Pow 60, CD 2) | 800 | World 2 |
| TM Shadow Ball | Shadow Ball (Ghost, Pow 55, CD 2) | 800 | World 3 |
| TM Thunderbolt | Thunderbolt (Electric, Pow 60, CD 2) | 900 | World 2 |
| TM Flamethrower | Flamethrower (Fire, Pow 60, CD 2) | 900 | World 2 |
| TM Ice Beam | Ice Beam (Ice, Pow 60, CD 2) | 900 | World 2 |
| TM Psychic | Psychic (Psychic, Pow 60, CD 2) | 900 | World 3 |
| TM Earthquake | Earthquake (Ground, Pow 65, CD 2) | 1000 | World 3 |
| TM Fire Blast | Fire Blast (Fire, Pow 80, CD 3) | 1200 | World 4 |
| TM Hydro Pump | Hydro Pump (Water, Pow 80, CD 3) | 1200 | World 4 |
| TM Blizzard | Blizzard (Ice, Pow 80, CD 3) | 1200 | World 4 |
| TM Thunder | Thunder (Electric, Pow 80, CD 3) | 1200 | World 4 |
| TM Hyper Beam | Hyper Beam (Normal, Pow 85, CD 3) | 1500 | World 4 |

### 6.2 Buy Pokemon

The player can purchase any Pokemon species they have **seen** in battle (tracked as `seenPokemon` in `GameState`) and do not currently own. Cost formula:

```
cost = floor((BST / 3 + 30) * rarityMultiplier)
       rarityMult: common 1.0, uncommon 1.5, rare 3.0
```

Bought Pokemon join at **level 5** with auto-assigned level-appropriate moves.

### 6.3 Move Training

At the **Train** menu, a Pokemon can learn any move from its move pool whose `level` requirement is ≤ its current level. Cost per move:

```
cost = 15 + floor(power / 5) + (learnLevel * 2)
```

Learning a new move when the Pokemon already knows 4 requires replacing one — handled in-menu.

### 6.4 Eggs

Three tiers (`src/data/eggs.ts`):

| Tier | Cost | Steps to Hatch | Pool Size | Color |
|---|---|---|---|---|
| **Common Egg** | 250g | 50 | 47 common species (Caterpie, Pidgey, Rattata, Magikarp…) | Green |
| **Rare Egg** | 750g | 150 | 26 rare species (Bulbasaur, Eevee, Dratini, Scyther, Snorlax…) | Blue |
| **Legendary Egg** | 2000g | 400 | 5 legendary species (Articuno, Zapdos, Moltres, Mewtwo, Mew) | Orange |

Eggs are bought in town, stored on `GameState.eggs`, and decrement their `stepsRemaining` on every dungeon step. When one reaches 0, it hatches on the player's next town visit.

**Hatch level:** `max(5, floor(avg level of top 3 roster Pokemon by level))`. This keeps hatched Pokemon useful regardless of when the player bought the egg.

### 6.5 Battle Rewards

- **Gold** on win: `(15 + worldIndex * 12 + floor(mapIndex / 5) * 5) * enemyCount + rand(0..19)`
- **XP** per defeated enemy: `enemyLevel * 6 + 10 + rand(0..7)` — awarded to every alive party member
- **Gold tile pickups** scale with world index and are rolled during map generation
- **Defeat penalty:** -15% current gold, return to town

### 6.6 Leveling Curve

```
xpToNextLevel(level) = level² * 8 + level * 15 + 30
```

Fast early levels, steep late game. Leveling up recalculates stats and grants the maxHP delta as a heal.

---

## 7. Items

All items carry an `ItemCategory` (`medicine` · `field` · `vitamin` · `stone` · `candy` · `battle` · `tm`) which drives filtering, UI behaviour, and the `applyItem` dispatcher in `src/data/items.ts`.

### 7.1 Battle-usable (`BattleScene` items menu)

The battle items panel only shows `medicine` and `battle` categories. Everything else is filtered out (field items used to leak into this panel and silently fail — now fixed).

| Item | Category | Effect |
|---|---|---|
| Potion | medicine | Heal 30 HP (cannot revive or overheal) |
| Super Potion | medicine | Heal 60 HP |
| Revive | medicine | Restore a fainted Pokemon to 25% max HP |
| X Attack | battle | +1 Attack stage (×1.5) for the rest of this battle |
| X Defend | battle | +1 Defense stage for the rest of this battle |
| X Speed | battle | +1 Speed stage for the rest of this battle (affects turn order) |
| X Special | battle | +1 Special stage for the rest of this battle |

Battle stage boosts cap at +2 (×2.25). They are tracked in `BattlePokemon.battleBoosts: StageBoosts` and reset at the start of every battle on the player's roster (enemies never boost). `damageCalc.ts` applies the multiplier to atk/spc and defender def/spc; `battleStateMachine.resolveTurn` applies it to speed.

Using any battle item costs the player's turn.

### 7.2 Field Items (usable in `MapScene`)

| Item | Effect |
|---|---|
| Escape Rope | Leave the dungeon safely; return to town with no gold penalty |
| Repel | Suppress all encounter rolls for the next 20 steps |
| Map | Reveal every tile in the current dungeon |

### 7.3 Menu-only items (Items screen in town)

These items can't be used during battle or on the map — only from the Items screen's USE button, which opens a roster picker filtered by eligibility.

| Item | Category | Effect |
|---|---|---|
| HP Up / Protein / Iron / Carbos / Calcium | vitamin | Permanent stat bonus, tracked in `BattlePokemon.statBonuses: Stats`, layered on top of level-based stats via `applyStatBonuses`. Preserved across level-ups, evolution, and save/load. Caps: +25 HP / +15 per other stat. |
| Rare Candy | candy | Raises level by 1. **Capped** at the highest level in the current roster — you can't use it to exceed your best pokemon. |
| Fire / Water / Thunder / Leaf / Moon Stone | stone | Evolves a matching species via `getStoneEvolution(pokemon, stoneId)`. Goes through the shared `evolveIntoSpecies` helper in `statCalc.ts`, so vitamin bonuses and HP ratio are preserved exactly like a level-based evolution. |
| TM *<move>* | tm | Appears in the Items screen but USE triggers a dialog pointing to the Training Centre. Actual teaching happens in the Train screen's new "Use TMs" panel. Single-use; consumes the TM on apply. |

### 7.4 Training Centre — TM teaching

The Train screen (per pokemon) now has a third section after Current Moves / Available to Learn: **Use TMs**. It lists every TM the player owns, each with a TEACH button. Eligibility comes from `canUseTM(pokemon, moveId)`:

- **Already knows** → disabled grey label.
- **Type mismatch** → disabled grey label. TMs are **type-matched only**: the pokemon must share at least one type with the move's type.
- **OK** → enabled button. On click, if the pokemon has < 4 moves the TM is appended; otherwise a "Which move should be forgotten?" picker appears (same style as the existing FORGET button), then replaces the chosen move.

### 7.5 Starter Inventory

New games begin with: **3 Potions**, **1 Escape Rope**, **100 gold**.

---

## 8. Data Model

Key types from `src/types.ts`:

```ts
PokemonSpecies {
  id, name, types[], baseStats, movePool[],
  catchRate, rarity, spriteKey,
  evolvesFrom?, evolutionLevel?, evolutionStone?
}

BattlePokemon {
  species, level, currentXP, currentHP, maxHP,
  stats, moves[], cooldowns[], statusEffects[],
  statBonuses: Stats,        // permanent vitamin bonuses, persisted
  battleBoosts: StageBoosts  // temporary X-item stages, reset per battle
}

MoveData {
  id, name, type, power, accuracy, cooldown,
  category: "physical" | "special",
  effect?: { type: StatusType, chance: number }
}

EggInstance {
  id, tier, speciesId, stepsRemaining
}

DungeonMap {
  width, height, tiles[][], worldIndex, mapIndex
}

MapTile {
  type: "floor" | "wall" | "exit",
  revealed, visited,
  encounterChance, goldDrop,
  exitDirection?
}

GameState {
  roster[], playerParty[], playerItems[], gold,
  seenPokemon[], worlds[], activeWorld,
  currentMap, playerX, playerY,
  repelSteps, eggs[]
}
```

All battle logic mutates `BattlePokemon` objects in place. Same references persist across scene transitions via the Phaser registry — the town/map/battle scenes all read/write the same `GameState`.

---

## 9. Progression Systems

### 9.1 Experience & Leveling

- XP is awarded per defeated enemy to every alive party member.
- Level-ups recompute stats and heal the maxHP delta.
- Moves do **not** auto-replace on level up — the player must visit **Train** in town to learn new moves from the move pool.

### 9.2 Evolution

Species with `evolvesFrom` + `evolutionLevel` can be evolved at the **Evolve** menu once their level meets the requirement. Evolution cost:

```
cost = floor((evolvedSpeciesBST / 4 + 20) * rarityMultiplier)
       rarityMult: common 1.0, uncommon 1.5, rare 2.0
```

Evolving swaps the species reference and recalculates stats; moves and current HP are preserved.

### 9.3 Seen vs Owned

- **Seen** (`seenPokemon`): species encountered in battle at least once. Drives **Buy Pokemon** availability.
- **Owned** (`roster`): species purchased, hatched, or the starter. Only owned Pokemon can be placed in `playerParty`.

### 9.4 Party Selection

The player picks up to **3 Pokemon** from the roster to form `playerParty` before entering Adventure. Parties can be reconfigured freely at the town. The active party member in battle is tracked via `playerActiveIndex` on the battle state machine.

---

## 10. Save System

- **Key:** `pokemonGauntlet_save` in `localStorage`
- **Format:** JSON. Pokemon are serialized as `{ speciesId, level, currentXP, currentHP }` and reconstructed through `createBattlePokemon` on load (so full stats/moves/cooldowns re-derive from data).
- **What's saved:** roster, playerParty, playerItems, gold, seenPokemon, worlds progress, activeWorld, eggs
- **What's NOT saved:** `currentMap`, `playerX/Y`, `repelSteps`, active battle state. Quitting mid-dungeon forfeits that run.
- **Single save slot.** "Delete Save" from the Title screen wipes it.

---

## 11. Audio & Visuals

- **Sprites:** 16×16 pixel art for all 151 Pokemon, each defined as a palette + grid in `src/sprites/pokemonSprites.ts` and rendered to Phaser textures during `PreloadScene`. Nearest-neighbor filtering; no external PNGs.
- **UI:** monospace text, flat rectangles, type-colored accents (`src/ui/TypeColors.ts` maps all 15 types to hex colors).
- **Music:** procedural Web Audio via `src/audio/MusicManager.ts`. Distinct loops for map exploration and battles. No audio files.
- **SFX:** short one-shot effects also synthesized via `MusicManager.playSFX(kind)`. Current presets: `purchase` (ca-ching B5→E6), `heal` (C-E-G rising chime), `item_use` (short click), `hatch` (C-E-G-C celebration arpeggio, also used for evolution), `learn` (E5→B5 ding), `error` (low A3→E3 descending). Reuses the master gain node of the current music track.
- **Confirmation toasts:** reusable `src/ui/Toast.ts` shows a fading yellow-by-default message near the bottom of the screen (~1 s hold + 1.8 s fade). Used for every purchase (PokeMart, Buy Pokemon, Egg Shop), every PokeCenter heal, every move learned, every field item use (Map, Repel, medicine/vitamin/stone/rare candy), and every error/denial (not enough gold, "only usable in battle", etc.). Item-apply messages are generated from the `applyItem` result via `src/ui/itemFeedback.ts` so MainMenu and MapScene share the same vocabulary ("Charizard restored 30 HP!", "Pikachu grew to Lv14!", "Eevee's Attack rose by 3!"). Evolution and egg-hatch full-screen overlays also trigger the `hatch` SFX.

---

## 12. Testing

Pure-logic modules live in `src/core/` and `src/data/` with zero Phaser imports, making them trivially unit-testable. Current test coverage (`tests/`):

- `damageCalc.test.ts` — damage formula, STAB, effectiveness, random roll bounds
- `typeEffectiveness.test.ts` — type chart lookups, dual-type multiplication
- `cooldownManager.test.ts` — tick and reset behavior
- `battleStateMachine.test.ts` — turn flow, action resolution, event emission
- `wildAI.test.ts` — AI move selection

Tests use injectable RNG for determinism. Run with `npm test`.

---

## 13. Future Directions

These ideas were in earlier drafts or are natural next steps — **none of them are implemented yet**. Listed here so they don't get confused with shipped features.

- **Wild catching** — currently the only way to acquire new Pokemon is Buy Pokemon or Eggs. A classic catch flow (weaken → throw ball → catch rate roll) is a candidate for a future update. `catchRate` fields already exist on species data.
- **Trainer battles** as a distinct room type with scripted teams and AI switching, separate from wild encounters.
- **Gym Leader bosses per world** with signature moves and held items (current bosses are rare species, not themed leaders).
- **Held items** (Charcoal, Leftovers, Focus Sash, Quick Claw, Scope Lens…) granting passive effects.
- **Held items** (leftovers, eviolite, etc.) for passive battle effects.
- **Research tasks** — ongoing objectives unlocking Pokemon or upgrades.
- **Professor's Lab global upgrades** (+% HP/Atk/Spd, more item slots, more bench slots, better catch rates, etc.).
- **Speed timer per turn** for faster combat (currently turns are untimed).
- **Status effects expansion** — Freeze, Confuse, traps (Wrap, Bind) with their unique rules.
- **Multi-save slots**, cloud sync, or export/import.
- **Difficulty modes** for replaying cleared worlds with better rewards.

When any of these ship, move the relevant bullet out of this section and into the appropriate numbered section above.
