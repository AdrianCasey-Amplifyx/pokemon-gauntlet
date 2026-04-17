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
    pokemon.ts               # 151 Gen 1 Pokemon with stats, movesets, evolution (level + stone)
    moves.ts                 # 80+ moves across 15 types, 4 cooldown tiers
    items.ts                 # Items (medicine/field/vitamin/stone/candy/battle/tm), applyItem dispatcher
    tmCompatibility.ts       # Per-species Gen 1 Bulbapedia TM learnset, canLearnTM(speciesId, tmItemId)
    typeChart.ts             # 15-type effectiveness matrix (Gen 1)
    shop.ts                  # Shop pricing, availability, move training, vitamin/TM/candy helpers
    pokedexEntries.ts        # One-sentence flavor description per Gen 1 species (Pokedex reveal content)
    stoneEvolutions.ts       # Stone → evolution lookup (Eevee branches, Raichu, Ninetales, etc)
    worlds.ts                # 8 worlds, encounter pools, scaling formulas, bosses
    eggs.ts                  # Egg tiers (common/rare/legendary), pools, hatch logic
  core/
    battleStateMachine.ts    # Turn flow, action resolution, event system, X-item boost reset
    damageCalc.ts            # Damage formula with STAB + type effectiveness + stage multipliers
    cooldownManager.ts       # Per-move cooldown tracking
    wildAI.ts                # Enemy move selection logic
    statCalc.ts              # Stat calc, XP/leveling, move learning, evolveIntoSpecies, applyStatBonuses
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
    Toast.ts                 # Reusable fading-text confirmation toast (+ optional SFX)
    itemFeedback.ts          # ApplyResult -> {message, sfx, color} helper shared by MainMenu and MapScene
  sprites/
    pokemonSprites.ts        # 151 pixel art sprites as palette + grid data
  audio/
    MusicManager.ts          # Procedural map/battle music + short one-shot SFX presets (playSFX) via Web Audio API
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

- **Town:** Heal at PokeCenter (20g), buy items at PokeMart, buy previously-seen Pokemon (species must be encountered in battle first to unlock), buy eggs (common/rare/legendary) that hatch after N steps in dungeons, manage moves, select party of 3, enter adventure
- **Adventure:** Single room per run. Find the exit in a fog-of-war grid. Random encounters based on world-specific Pokemon pools. Gold drops on floor tiles. `Repel` suppresses encounters for 20 steps; `Map` reveals the whole grid.
- **Battle:** Cooldown-based moves (CD 0 = always available, CD 1-3 = wait that many turns). Speed determines turn order. XP awarded to alive party on enemy faint. Enemy parties can have multiple Pokemon, scaling with world/room.
- **Progression:** 8 worlds × 25 rooms each. Boss rooms at 5/10/15/20/25 spawn a rare out-of-pool species at elevated level. Clearing a room heals party and advances progress. Defeat loses 5% gold and returns to town (no auto-heal).

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

- `BattlePokemon` — runtime instance with mutable HP, XP, cooldowns, statusEffects, `statBonuses` (persisted vitamin bonuses, layered via `applyStatBonuses`), and `battleBoosts` (temporary X-item stage counters, reset per battle on the player's roster)
- `PokemonSpecies` — static species data with base stats and `MovePoolEntry[]` (moveId + unlock level), plus `evolvesFrom`/`evolutionLevel` for level-based evolution and `evolutionStone` for stone-based evolution (Raichu, Ninetales, Eeveelutions, etc)
- `ItemData` — carries `category: ItemCategory` (`medicine` · `field` · `vitamin` · `stone` · `candy` · `battle` · `tm`) and optional `param` (stat key, stone id, TM moveId). `applyItem` dispatches by category
- `GameState` — `roster`, `playerParty`, `playerItems`, `gold`, `seenPokemon` (`Record<speciesId, highestLevelEncountered>` — unlocks species in the Pokemon Trader and sets its buy/sell level + price), `caughtPokemon` (`string[]` — persistent Pokedex flag, stays set after selling), `worlds` progress, `activeWorld`, `currentMap`, `playerX`/`playerY`, `repelSteps`, `eggs` (array of `EggInstance` with tier + stepsRemaining)
- `DungeonMap` — 2D tile grid with fog of war, encounter chances, gold drops, single exit

## Save System

Saves to `localStorage` key `"pokemonGauntlet_save"`. Serializes Pokemon as `{speciesId, level, currentXP, currentHP}` and reconstructs full objects on load. Dungeon state is NOT saved — quitting mid-dungeon loses that run.

## Testing

All `core/` modules have unit tests. Tests use injectable RNG for determinism. Run with `npm test`.

## End-of-Task Workflow (MANDATORY)

Every time you finish a task that changes the game, run through these steps **in order** before telling the user you're done. Do not skip or reorder them.

1. **Make the code changes + run tests** if relevant.
2. **Update `CHANGELOG.md`** — append an entry under today's date (see format below).
3. **Update `GAME_DESIGN.md`** — if the change affects gameplay, balance, content, mechanics, economy, progression, or anything a designer/player would care about. Keep this file in sync so it's always a true description of the shipped game.
4. **Update `CLAUDE.md`** — if the change touches architecture (new file in `core/`, new scene, new data module, new top-level system). Keep the Directory Structure and Data Model sections accurate.
5. **Commit** — one logical change = one commit, with a meaningful message (see Git section).
6. **Push to `origin main`** — never leave the session with unpushed commits on `main`.

If any step fails (tests break, push rejected, etc.), stop and surface the problem to the user — do not paper over it.

### CHANGELOG.md format

```
## YYYY-MM-DD

- **<area>:** <one-line summary of what changed and why>
  - optional sub-bullet with file path(s) or extra detail
```

Rules:
- Use the absolute date from the session context — never relative dates like "yesterday".
- Newest date at the top (reverse-chronological). Group same-day entries under a single date heading; add new bullets to the existing top entry if it's already today.
- `<area>` tags: `balance`, `content`, `combat`, `ui`, `map`, `shop`, `save`, `audio`, `bugfix`, `refactor`, `test`, `docs`, `build`, `git`.
- One sentence per bullet, focused on the *player-visible effect* or *why*, not a diff recap.
- If the user reverts or changes direction, add a new entry noting the revert — never edit history.

### GAME_DESIGN.md expectations

`GAME_DESIGN.md` is the canonical description of how the game currently plays. Sections it must keep accurate:
- Core loop and scene flow
- Combat system (formula, cooldown tiers, status effects, type chart size)
- World/room structure (count, scaling formulas, boss rooms)
- Shop contents and pricing, PokeCenter cost, gold economy
- Items (battle + field) with current effects
- Egg system (tiers, costs, step counts, pools)
- Save system behavior
- Any forward-looking/aspirational content goes under a clearly-marked **Future Directions** section so it isn't confused with shipped features.

When you change a number (move power, cooldown, shop price, HP heal, encounter rate, etc.), update the matching table/section in `GAME_DESIGN.md` in the same commit.

### PRD-driven batches (`docs/plans/YYYY-MM-DD-*.md`)

When a dated PRD exists in `docs/plans/` and the current work is delivering items from it, treat the PRD as the source of truth for batch progress:

1. **Find the active PRD first.** Before starting, `ls docs/plans/` and open the most recent dated PRD. If the user's request maps to items in it, you're doing PRD-driven work.
2. **Tick items off in the PRD as you ship them.** Use GitHub-style checkboxes. The item heading stays as-is; add `✅` to the heading **and** flip any `- [ ]` bullets to `- [x]` as sub-items complete. Example: `### 1.4 Move deletion guard (TODO #14) ✅`. If a section is partially done, mark only the completed sub-items.
3. **Cross-reference the CHANGELOG.** Each `CHANGELOG.md` bullet that delivers a PRD item must cite it by section number, e.g.:
   `- **combat:** implement Bide / Counter / Rollout / drain mechanics (PRD 2026-04-17 §1.2).`
   This makes the CHANGELOG → PRD mapping explicit without duplicating detail.
4. **Update the PRD's Done-definition checklist** at the bottom of the document as each criterion is met.
5. **Commit the PRD edit alongside the code change** for the item it tracks — same commit, so the progress marker and the delivering diff move together.
6. **If scope changes mid-batch** (item dropped, split, or a new item added), edit the PRD to reflect reality and note the change in CHANGELOG under a `docs` bullet. Never silently drop a PRD item.

Rule of thumb: at any point during a PRD batch, a reader should be able to open the PRD and see exactly what's done, what's in flight, and what's left — without needing to diff git history.

## Git & GitHub Policy

The repo is hosted at **https://github.com/AdrianCasey-Amplifyx/pokemon-gauntlet** (public), default branch `main`.

- **Commit messages:** present-tense imperative (`add egg shop`, `fix cooldown tick bug`), not past tense. Subject ≤72 chars. Add a body paragraph when the "why" isn't obvious from the subject.
- **Always include** the Claude co-author trailer:
  ```
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```
- **Stage files explicitly by name** when possible — avoid `git add -A` / `git add .` so build artifacts or secrets don't sneak in.
- **Push immediately after committing** so GitHub stays in sync with local. If you're making several related commits in one session, it's fine to push once at the end — but never end a session with unpushed commits on `main`.
- **Never commit:** `node_modules/`, `dist/`, `.env*`, `.DS_Store`, editor cruft. These are already in `.gitignore`.
- **Branches:** work directly on `main` unless the user asks for a feature branch or PR. If the user requests a PR, create a branch like `feat/<short-name>` or `fix/<short-name>`, push it, and open the PR with `gh pr create`.
- **Destructive operations** (`reset --hard`, `push --force`, branch delete, history rewrite, `--amend` on pushed commits) always require explicit user confirmation — never as a shortcut to "fix" a mistake.
