# Pokemon Gauntlet

A roguelike Pokemon game built with Phaser 3 + TypeScript + Vite.

## Quick Start

```bash
npm install
npm run dev      # Dev server on http://localhost:4200
npm run test     # Run tests with Vitest
npm run build    # Production build
```

## Architecture

### Tech Stack
- **Engine:** Phaser 3
- **Language:** TypeScript (strict mode)
- **Bundler:** Vite (port 4200)
- **Tests:** Vitest
- **Audio:** Web Audio API (procedural, no audio files)
- **Sprites:** 16x16 pixel art generated at runtime via canvas
- **Persistence:** localStorage JSON serialization

### Directory Structure
```
src/
  main.ts                    # Phaser game config (390x844 portrait)
  types.ts                   # All shared types and interfaces
  data/
    pokemon.ts               # 151 Gen 1 Pokemon with stats, movesets, evolution
    moves.ts                 # 80+ moves across 15 types, 4 cooldown tiers
    items.ts                 # Items, apply logic, shop data, gold rewards
    typeChart.ts             # 15-type effectiveness matrix (Gen 1)
    shop.ts                  # Shop pricing, availability, move training
    worlds.ts                # 8 worlds, encounter pools, scaling formulas
  core/
    battleStateMachine.ts    # Turn flow, action resolution, event system
    damageCalc.ts            # Damage formula with STAB + type effectiveness
    cooldownManager.ts       # Per-move cooldown tracking
    wildAI.ts                # Enemy move selection logic
    statCalc.ts              # Stat calc, XP/leveling, move learning
    typeEffectiveness.ts     # Type chart lookup helpers
    mapGenerator.ts          # Procedural fog-of-war dungeon generation
    fogOfWar.ts              # Tile reveal logic
    saveManager.ts           # Save/load/delete to localStorage
  scenes/
    BootScene.ts             # Splash screen
    PreloadScene.ts          # Generate sprite textures
    TitleScene.ts            # New Game / Continue / Delete Save
    StarterSelectScene.ts    # Pick 1 of 3 starters
    MainMenuScene.ts         # Town hub: Pokemon, Items, PokeMart, PokeCenter, Buy Pokemon, Adventure
    WorldSelectScene.ts      # 8 worlds with progress (not currently in main flow)
    MapScene.ts              # Fog-of-war grid dungeon with D-pad controls
    BattleScene.ts           # Turn-based battle with party switching and items
  ui/
    HPBar.ts                 # Animated HP bar component
    MoveButton.ts            # Move button with cooldown overlay
    BattleHUD.ts             # Full battle screen layout
    TypeColors.ts            # PokemonType -> hex color map (15 types)
  sprites/
    pokemonSprites.ts        # 151 pixel art sprites as palette + grid data
  audio/
    MusicManager.ts          # Procedural map/battle music via Web Audio API
  utils/
    random.ts                # RNG helpers
tests/
    damageCalc.test.ts
    typeEffectiveness.test.ts
    cooldownManager.test.ts
    battleStateMachine.test.ts
    wildAI.test.ts
```

### Key Design Principles

- **Pure logic / rendering split:** `core/` has zero Phaser imports. All game logic is pure functions, trivially testable. `scenes/` and `ui/` are the only Phaser-aware code.
- **Event-driven battles:** The battle state machine emits typed events. Scenes subscribe for animations/UI.
- **Object reference mutation:** BattlePokemon objects are mutated in place. Same references persist across scene transitions via Phaser registry.
- **No external assets:** All sprites generated from code at boot. Music is procedural Web Audio.

## Game Flow

```
TitleScene → StarterSelectScene → MainMenuScene (town hub)
                                      ↕
                                  MapScene (dungeon)
                                      ↕
                                  BattleScene
```

- **Town:** Heal at PokeCenter (20g), buy items at PokeMart, buy previously-seen Pokemon (species must be encountered in battle first to unlock), manage moves, select party of 3, enter adventure
- **Adventure:** Single room per run. Find the exit in a fog-of-war grid. Random encounters based on world-specific Pokemon pools. Gold drops on floor tiles. `Repel` suppresses encounters for 20 steps; `Map` reveals the whole grid.
- **Battle:** Cooldown-based moves (CD 0 = always available, CD 1-3 = wait that many turns). Speed determines turn order. XP awarded to alive party on enemy faint. Enemy parties can have multiple Pokemon, scaling with world/room.
- **Progression:** 8 worlds × 25 rooms each. Boss rooms at 5/10/15/20/25 spawn a rare out-of-pool species at elevated level. Clearing a room heals party and advances progress. Defeat loses 15% gold and returns to town (no auto-heal).

## Combat System

- **Cooldown moves:** CD 0 (basic, every turn), CD 1 (wait 1 turn), CD 2 (wait 2), CD 3 (wait 3)
- **Damage:** `((2*level/5+2) * power * (atk/def)) / 65 + 2` × STAB(1.5) × effectiveness × random(0.85-1.0)
- **Stats:** HP, Atk, Def, Spd, Special (Gen 1 single Special)
- **15 types:** Normal, Fire, Water, Grass, Electric, Rock, Ground, Psychic, Poison, Fighting, Flying, Bug, Ghost, Ice, Dragon
- **Status effects:** Burn, Poison, Paralyze, Sleep. Applied by moves with `effect: { type, chance }`. Burn/Poison tick damage each turn; Paralyze/Sleep may skip turns. Tracked on `BattlePokemon.statusEffects`, emitted as `status_applied`/`status_damage`/`status_skip` events.
- **Switching** costs your turn. Enemy still attacks.
- **Items in battle:** Potion (+30 HP), Super Potion (+60 HP), Revive (25% HP on fainted). Using an item costs your turn.
- **Field items:** Escape Rope (leave dungeon), Repel (20 encounter-free steps), Map (reveal full grid).

## Data Model

- `BattlePokemon` — runtime instance with mutable HP, XP, cooldowns, statusEffects
- `PokemonSpecies` — static species data with base stats and `MovePoolEntry[]` (moveId + unlock level), plus `evolvesFrom`/`evolutionLevel`
- `GameState` — `roster`, `playerParty`, `playerItems`, `gold`, `seenPokemon` (species IDs unlocked in shop), `worlds` progress, `activeWorld`, `currentMap`, `playerX`/`playerY`, `repelSteps`
- `DungeonMap` — 2D tile grid with fog of war, encounter chances, gold drops, single exit

## Save System

Saves to `localStorage` key `"pokemonGauntlet_save"`. Serializes Pokemon as `{speciesId, level, currentXP, currentHP}` and reconstructs full objects on load. Dungeon state is NOT saved — quitting mid-dungeon loses that run.

## Testing

All `core/` modules have unit tests. Tests use injectable RNG for determinism. Run with `npm test`.

## Changelog Policy

**Always maintain `CHANGELOG.md` in the repo root.** Every time you make a change to the game (gameplay, balance, content, bugfix, refactor, new feature, etc.), append an entry to `CHANGELOG.md` before finishing the task.

Format:

```
## YYYY-MM-DD

- **<area>:** <one-line summary of what changed and why>
  - optional sub-bullet with file path(s) or extra detail
```

Rules:
- Use the current absolute date (today is provided in the session context — never use relative dates like "yesterday").
- Group same-day entries under a single date heading; add new bullets to the existing date if it's already the top entry.
- Newest date goes at the top (reverse-chronological).
- `<area>` tags: `balance`, `content`, `combat`, `ui`, `map`, `shop`, `save`, `audio`, `bugfix`, `refactor`, `test`, `docs`, `build`.
- Keep each bullet to one sentence focused on the *player-visible effect* or *why the change was made*, not a diff recap.
- If the user reverts or changes direction, add a new entry noting the revert — never edit history.
- If a change touches CLAUDE.md's architecture section (new file in `core/`, new scene, new data module), update CLAUDE.md's directory listing in the same commit and note it as `docs` in the changelog.
