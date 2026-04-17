import Phaser from "phaser";
import type { BattleItem, BattlePokemon, GameState, EggTier, ItemCategory, PokemonType, PokemonSpecies, MoveData } from "../types.ts";
import { createBattlePokemon, evolveIntoSpecies, xpToNextLevel } from "../core/statCalc.ts";
import { saveGame } from "../core/saveManager.ts";
import { ITEMS, applyItem, getTMMove, VITAMIN_CONFIG } from "../data/items.ts";
import { getPokemon, getAllPokemon } from "../data/pokemon.ts";
import { POKEDEX_ENTRIES } from "../data/pokedexEntries.ts";
import { getStoneEvolution } from "../data/stoneEvolutions.ts";
import {
  getAvailableShopPokemon,
  getAvailableShopItems,
  getPokemonSellValue,
  getWorldsUnlocked,
  getTrainableMoves,
  getEvolutionInfo,
  canUseVitamin,
  canUseTM,
  canUseRareCandy,
  rareCandyCap,
  countNewMoves,
  getStoneEvolutionTarget,
} from "../data/shop.ts";
import { EGG_TIERS, getAllEggTiers, createEgg } from "../data/eggs.ts";
import { getMove } from "../data/moves.ts";
import { MusicManager } from "../audio/MusicManager.ts";
import { showToast } from "../ui/Toast.ts";
import { describeItemResult } from "../ui/itemFeedback.ts";
import { openFilterModal } from "../ui/FilterModal.ts";
import { TYPE_COLORS } from "../ui/TypeColors.ts";
import { generateDungeon } from "../core/mapGenerator.ts";
import { WORLD_NAMES, MAPS_PER_WORLD } from "../data/worlds.ts";

const GAME_W = 390;
const GAME_H = 844;
const PARTY_SIZE = 3;
const LIST_PAGE_SIZE = 10;

/**
 * Push a move id into a Pokemon's forgotten-moves bucket, deduping and
 * initializing the array if this is the first forget. Used by both the
 * Train FORGET button and the TM overwrite path so the player can always
 * relearn anything they previously knew at no cost.
 */
function pushForgotten(pokemon: BattlePokemon, moveId: string): void {
  if (!pokemon.forgottenMoves) pokemon.forgottenMoves = [];
  if (!pokemon.forgottenMoves.includes(moveId)) {
    pokemon.forgottenMoves.push(moveId);
  }
}

type RosterSort = "level" | "type" | "name";
type ItemSort = "name" | "quantity";
type PokeshopMode = "buy" | "sell";

/** Context-dependent state stored alongside `detailContext` so tapping BACK
 *  on the Pokemon detail screen returns the player to the list they came from.
 */
type DetailReturn =
  | { screen: "roster" }
  | { screen: "pokedex" }
  | { screen: "train" }
  | { screen: "party" }
  | { screen: "pokeshop" };

export class MainMenuScene extends Phaser.Scene {
  private gameState!: GameState;
  private selectedParty: number[] = [];
  private listPage = 0;
  private rosterSort: RosterSort = "level";
  private itemSort: ItemSort = "name";
  private pokeshopMode: PokeshopMode = "buy";
  /** Single-type filter applied to every roster-style list. `null` = show all. */
  private typeFilter: PokemonType | null = null;
  /** Active PokeMart category tab; `null` = show all categories stacked. */
  private shopTab: ItemCategory = "medicine";
  /** Active Items screen tab; `"egg"` shows the Eggs bucket instead of a category. */
  private itemsTab: ItemCategory | "egg" = "medicine";

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    this.selectedParty = [];
    this.pokeshopMode = "buy";
    this.typeFilter = null;
    this.shopTab = "medicine";
    this.itemsTab = "medicine";
    MusicManager.play("town");

    this.gameState = this.registry.get("gameState") as GameState;

    // Reset cooldowns/status but do NOT auto-heal HP
    for (const p of this.gameState.roster) {
      p.cooldowns = p.cooldowns.map(() => 0);
      p.statusEffects = [];
    }

    // Auto-heal only if returning from a cleared room
    const roomCleared = this.registry.get("roomCleared") as boolean | undefined;
    if (roomCleared) {
      this.registry.remove("roomCleared");
      for (const p of this.gameState.roster) {
        p.currentHP = p.maxHP;
      }
    }

    this.buildUI();
  }

  /**
   * Clears the scene in preparation for drawing a new screen.
   *
   * Phaser 3's input plugin has a one-tick lag when it cleans up
   * destroyed interactive GameObjects — they linger in the hit-test
   * list for a frame, so the next pointerdown can still fire an old
   * button's handler even though its GameObject has been destroyed.
   * That's why the BACK button (destroyed by this.children.removeAll)
   * could still register clicks on the freshly-drawn town screen,
   * leaking taps into whatever previous-screen button sat at that
   * position.
   *
   * Explicitly calling disableInteractive() on every child first
   * forces immediate removal from the input plugin before destroy,
   * which is synchronous and race-free. Every screen rebuild in this
   * scene must go through this helper instead of calling removeAll
   * directly.
   */
  private resetScreen(): void {
    this.children.each((child) => {
      const go = child as Phaser.GameObjects.GameObject;
      if (go.input) go.disableInteractive();
    });
    this.children.removeAll(true);
  }

  private buildUI(): void {
    this.resetScreen();

    // Fresh top-most interactive backdrop — absorbs any empty-space
    // click so a stale input registration from a destroyed button on
    // the previous screen can't fire.
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a)
      .setOrigin(0.5)
      .setInteractive();

    // Title
    this.add.text(GAME_W / 2, 30, "POKEMON GAUNTLET", {
      fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);

    // Gold
    this.add.text(GAME_W / 2, 58, `Gold: ${this.gameState.gold}`, {
      fontSize: "16px", fontFamily: "monospace", color: "#ffd700", fontStyle: "bold",
    }).setOrigin(0.5);

    // Roster count
    this.add.text(GAME_W / 2, 82, `${this.gameState.roster.length} Pokemon in roster`, {
      fontSize: "11px", fontFamily: "monospace", color: "#888899",
    }).setOrigin(0.5);

    // Mini roster preview
    const previewY = 110;
    const maxPreview = Math.min(this.gameState.roster.length, 8);
    for (let i = 0; i < maxPreview; i++) {
      const p = this.gameState.roster[i];
      const x = GAME_W / 2 - (maxPreview - 1) * 22 + i * 44;
      if (this.textures.exists(p.species.spriteKey)) {
        const img = this.add.image(x, previewY, p.species.spriteKey).setDisplaySize(32, 32).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    // World progress
    const worldIdx = this.gameState.activeWorld;
    const world = this.gameState.worlds[worldIdx];
    this.add.text(GAME_W / 2, 140, `${WORLD_NAMES[worldIdx]} — Room ${world.currentMap + 1}/${MAPS_PER_WORLD}`, {
      fontSize: "11px", fontFamily: "monospace", color: "#4488cc",
    }).setOrigin(0.5);

    // Inventory summary below roster preview
    const itemsY = 150;
    const itemEntries = this.gameState.playerItems.filter((b) => b.quantity > 0);
    const eggCount = this.gameState.eggs.length;
    if (itemEntries.length > 0) {
      const itemStr = itemEntries.map((b) => `${this.getItemIcon(b.item.id)}${b.item.name} x${b.quantity}`).join("  ");
      const suffix = eggCount > 0 ? `   🥚 x${eggCount}` : "";
      this.add.text(GAME_W / 2, itemsY, itemStr + suffix, { fontSize: "10px", fontFamily: "monospace", color: "#aaaaaa" }).setOrigin(0.5);
    } else if (eggCount > 0) {
      this.add.text(GAME_W / 2, itemsY, `🥚 Eggs x${eggCount}`, { fontSize: "10px", fontFamily: "monospace", color: "#cc88cc" }).setOrigin(0.5);
    } else {
      this.add.text(GAME_W / 2, itemsY, "No items", { fontSize: "10px", fontFamily: "monospace", color: "#666666" }).setOrigin(0.5);
    }

    // Main buttons — 9 entries fit comfortably between the status block at the top
    // and the TITLE SCREEN back button at the bottom (btn extents 180..556, back at 804).
    const btnY = 180;
    const gap = 44;

    this.makeBtn(GAME_W / 2, btnY, "POKEMON", "View your roster", 0x335588, () => this.showScreen("roster"));
    this.makeBtn(GAME_W / 2, btnY + gap, "POKEDEX", "Seen & caught Pokemon", 0x226677, () => this.showScreen("pokedex"));
    this.makeBtn(GAME_W / 2, btnY + gap * 2, "ITEMS", "View & use your items", 0x886633, () => this.showScreen("items"));
    this.makeBtn(GAME_W / 2, btnY + gap * 3, "POKECENTER", "Heal all Pokemon — 20g", 0xcc3333, () => this.usePokeCenter());
    this.makeBtn(GAME_W / 2, btnY + gap * 4, "TRAIN", "Learn & manage moves", 0x884488, () => this.showScreen("train"));
    this.makeBtn(GAME_W / 2, btnY + gap * 5, "POKEMART", "Buy items with gold", 0x885533, () => this.showScreen("shop"));
    this.makeBtn(GAME_W / 2, btnY + gap * 6, "POKEMON TRADER", "Buy new Pokemon or sell excess", 0x553388, () => this.showScreen("pokeshop"));
    this.makeBtn(GAME_W / 2, btnY + gap * 7, "EGG SHOP", "Buy & hatch Pokemon eggs", 0xaa8833, () => this.showScreen("eggshop"));
    this.makeBtn(GAME_W / 2, btnY + gap * 8, "ADVENTURE", "Select party & explore!", 0x338855, () => this.showScreen("party"));

    // Title screen button
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 40, 160, 34, 0x333333).setOrigin(0.5).setStrokeStyle(1, 0x555555);
    this.add.text(GAME_W / 2, GAME_H - 40, "TITLE SCREEN", { fontSize: "12px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.scene.start("TitleScene"));
  }

  private makeBtn(x: number, y: number, label: string, desc: string, color: number, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 320, 48, color).setOrigin(0.5).setStrokeStyle(2, 0x666666);
    this.add.text(x, y - 6, label, { fontSize: "16px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(x, y + 14, desc, { fontSize: "9px", fontFamily: "monospace", color: "#cccccc" }).setOrigin(0.5);
    bg.setInteractive();
    bg.on("pointerdown", onClick);
  }

  // === All screens rendered by clearing and rebuilding ===
  private usePokeCenter(): void {
    const cost = 20;
    const allFull = this.gameState.roster.every((p) => p.currentHP >= p.maxHP);

    if (allFull) {
      this.showToast("All Pokemon are already healthy!", { color: "#88ffaa", sfx: "error" });
      return;
    }

    if (this.gameState.gold < cost) {
      this.showToast("Not enough gold!", { color: "#ff6666", sfx: "error" });
      return;
    }

    this.gameState.gold -= cost;
    for (const p of this.gameState.roster) {
      p.currentHP = p.maxHP;
    }
    saveGame(this.gameState);
    this.buildUI();
    this.showToast(`All Pokemon healed!  -${cost}g`, { color: "#44ff88", sfx: "heal" });
  }

  private showScreen(
    screen: "roster" | "pokedex" | "items" | "shop" | "pokeshop" | "eggshop" | "party" | "train",
    resetPage = true,
  ): void {
    if (resetPage) this.listPage = 0;
    this.resetScreen();

    // Interactive backdrop — absorbs any empty-space click. See
    // `resetScreen` for the full explanation of why this is required.
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a)
      .setOrigin(0.5)
      .setInteractive();

    switch (screen) {
      case "roster": this.drawRoster(); break;
      case "pokedex": this.drawPokedex(); break;
      case "items": this.drawItems(); break;
      case "shop": this.drawShop(); break;
      case "pokeshop": this.drawPokemonShop(); break;
      case "eggshop": this.drawEggShop(); break;
      case "party": this.drawPartySelect(); break;
      case "train": this.drawTrainSelect(); break;
    }

    // Back button
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 45, 160, 38, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x774444);
    this.add.text(GAME_W / 2, GAME_H - 45, "BACK", { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.buildUI());
  }

  /**
   * Roster sorted by the active sort mode, favourites always first, filtered
   * by the active type filter (if any). Produces a new array — safe to
   * slice/paginate without mutating state.
   */
  private getSortedRoster(): BattlePokemon[] {
    const compare = (a: BattlePokemon, b: BattlePokemon): number => {
      switch (this.rosterSort) {
        case "level":
          return b.level - a.level || a.species.name.localeCompare(b.species.name);
        case "name":
          return a.species.name.localeCompare(b.species.name);
        case "type":
          return (
            a.species.types[0].localeCompare(b.species.types[0]) ||
            b.level - a.level
          );
      }
    };
    const filtered = this.typeFilter === null
      ? [...this.gameState.roster]
      : this.gameState.roster.filter((p) => p.species.types.includes(this.typeFilter!));
    return filtered.sort((a, b) => {
      const favDiff = (a.isFavourite ? 0 : 1) - (b.isFavourite ? 0 : 1);
      if (favDiff !== 0) return favDiff;
      return compare(a, b);
    });
  }

  /**
   * Compact type-filter pill. Left-aligned so it sits on the same row as
   * the right-aligned sort bar. Tapping opens the shared FilterModal.
   * `redraw` is invoked after the user picks (or clears) a type.
   */
  private drawTypeFilterPill(y: number, redraw: () => void): void {
    const x = 20;
    const w = 108;
    const active = this.typeFilter !== null;
    const color = active ? TYPE_COLORS[this.typeFilter!] : 0x1a1a2e;
    const stroke = active ? 0xffffff : 0x444466;
    const bg = this.add
      .rectangle(x, y, w, 22, color, active ? 1 : 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, stroke);
    const label = active
      ? `${this.typeFilter!.toUpperCase()}  ✕`
      : "TYPE FILTER";
    this.add
      .text(x + w / 2, y, label, {
        fontSize: "10px", fontFamily: "monospace",
        color: active ? "#ffffff" : "#8899aa",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    bg.setInteractive();
    bg.on("pointerdown", () => {
      if (this.typeFilter !== null) {
        // Quick-clear without opening the modal
        this.typeFilter = null;
        this.listPage = 0;
        redraw();
        return;
      }
      openFilterModal(this, this.typeFilter, (picked) => {
        this.typeFilter = picked;
        this.listPage = 0;
        redraw();
      });
    });
  }

  private drawSortBar<T extends string>(
    y: number,
    labels: { value: T; label: string }[],
    active: T,
    onPick: (value: T) => void,
  ): void {
    this.add.text(20, y, "Sort:", {
      fontSize: "10px", fontFamily: "monospace", color: "#8899aa",
    }).setOrigin(0, 0.5);
    const btnW = 62;
    const gap = 6;
    const totalW = labels.length * btnW + (labels.length - 1) * gap;
    const startX = GAME_W - 20 - totalW + btnW / 2;
    labels.forEach((entry, idx) => {
      const x = startX + idx * (btnW + gap);
      const isActive = entry.value === active;
      const bg = this.add.rectangle(
        x, y, btnW, 22,
        isActive ? 0x4466aa : 0x1a1a2e,
      ).setOrigin(0.5).setStrokeStyle(1, isActive ? 0x88aadd : 0x444466);
      this.add.text(x, y, entry.label, {
        fontSize: "10px", fontFamily: "monospace",
        color: isActive ? "#ffffff" : "#8899aa",
        fontStyle: "bold",
      }).setOrigin(0.5);
      bg.setInteractive();
      bg.on("pointerdown", () => onPick(entry.value));
    });
  }

  // --- Roster ---
  private drawRoster(): void {
    this.add.text(GAME_W / 2, 24, "YOUR POKEMON", { fontSize: "18px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);

    this.drawSortBar<RosterSort>(
      52,
      [
        { value: "level", label: "LEVEL" },
        { value: "type", label: "TYPE" },
        { value: "name", label: "A-Z" },
      ],
      this.rosterSort,
      (value) => {
        if (value === this.rosterSort) return;
        this.rosterSort = value;
        this.listPage = 0;
        this.showScreen("roster", false);
      },
    );

    this.drawTypeFilterPill(78, () => this.showScreen("roster", false));

    const sorted = this.getSortedRoster();
    this.clampListPage(sorted.length);
    const { slice } = this.pagedSlice(sorted);

    if (sorted.length === 0) {
      this.add.text(GAME_W / 2, 240, "No Pokemon match this filter.", {
        fontSize: "12px", fontFamily: "monospace", color: "#667788",
      }).setOrigin(0.5);
      return;
    }

    slice.forEach((pokemon, localIdx) => {
      const y = 100 + localIdx * 62;
      const x = 20;
      const w = GAME_W - 40;
      const h = 58;

      const cardBg = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x1a1a2e).setOrigin(0.5).setStrokeStyle(1, 0x333355);
      cardBg.setInteractive();
      cardBg.on("pointerdown", () => this.showPokemonDetail(pokemon, { screen: "roster" }));

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(x + 25, y + h / 2, pokemon.species.spriteKey).setDisplaySize(40, 40).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(x + 52, y + 4, pokemon.species.name, { fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" });
      this.add.text(x + w - 28, y + 4, `Lv${pokemon.level}`, { fontSize: "11px", fontFamily: "monospace", color: "#aaaaaa" }).setOrigin(1, 0);

      // Favourite star — tappable, persists to save
      const starHit = this.add.rectangle(x + w - 11, y + 13, 22, 22, 0x000000, 0)
        .setOrigin(0.5)
        .setInteractive();
      this.add.text(x + w - 11, y + 13, pokemon.isFavourite ? "★" : "☆", {
        fontSize: "18px", fontFamily: "monospace",
        color: pokemon.isFavourite ? "#ffcc33" : "#666677",
        fontStyle: "bold",
      }).setOrigin(0.5);
      starHit.on("pointerdown", () => {
        pokemon.isFavourite = !pokemon.isFavourite;
        saveGame(this.gameState);
        this.showScreen("roster", false);
      });

      // HP bar
      const barX = x + 52;
      const barY = y + 23;
      const barW = w - 65;
      this.add.rectangle(barX + barW / 2, barY + 3, barW, 6, 0x333333).setOrigin(0.5);
      const hpPct = pokemon.currentHP / pokemon.maxHP;
      const hpColor = hpPct > 0.5 ? 0x22cc44 : hpPct > 0.25 ? 0xddcc22 : 0xcc2222;
      this.add.rectangle(barX, barY, hpPct * barW, 6, hpColor).setOrigin(0, 0);
      this.add.text(barX, barY + 8, `HP ${pokemon.currentHP}/${pokemon.maxHP}`, { fontSize: "7px", fontFamily: "monospace", color: "#888888" });

      // XP bar
      const xpBarY = barY + 16;
      const needed = xpToNextLevel(pokemon.level);
      const xpPct = Math.min(pokemon.currentXP / needed, 1);
      this.add.rectangle(barX + barW / 2, xpBarY + 3, barW, 5, 0x222244).setOrigin(0.5);
      if (xpPct > 0) {
        this.add.rectangle(barX, xpBarY, xpPct * barW, 5, 0x4488cc).setOrigin(0, 0);
      }
      this.add.text(barX, xpBarY + 7, `XP ${pokemon.currentXP}/${needed}`, { fontSize: "7px", fontFamily: "monospace", color: "#4488cc" });

      const typeStr = pokemon.species.types.map((t) => t.substring(0, 3).toUpperCase()).join("/");
      this.add.text(x + w - 5, xpBarY + 7, typeStr, { fontSize: "7px", fontFamily: "monospace", color: "#555577" }).setOrigin(1, 0);
    });

    this.drawPagination(sorted.length, () => this.showScreen("roster", false));
  }

  // --- Pokedex ---
  private drawPokedex(): void {
    this.add.text(GAME_W / 2, 22, "POKEDEX", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);

    const all = getAllPokemon();
    const seen = this.gameState.seenPokemon;
    const caught = new Set(this.gameState.caughtPokemon);
    const seenCount = all.filter((s) => seen[s.id] !== undefined || caught.has(s.id)).length;
    const caughtCount = all.filter((s) => caught.has(s.id)).length;

    this.add.text(GAME_W / 2, 46, `Seen ${seenCount}/${all.length}   Caught ${caughtCount}/${all.length}`, {
      fontSize: "11px", fontFamily: "monospace", color: "#88aacc",
    }).setOrigin(0.5);

    this.drawTypeFilterPill(70, () => this.showScreen("pokedex", false));

    // Filter respects type selection but keeps original Dex numbering via dexIndex.
    const indexed = all.map((species, dexIndex) => ({ species, dexIndex }));
    const filtered = this.typeFilter === null
      ? indexed
      : indexed.filter((e) => e.species.types.includes(this.typeFilter!));

    this.clampListPage(filtered.length);
    const { slice } = this.pagedSlice(filtered);

    if (filtered.length === 0) {
      this.add.text(GAME_W / 2, 260, "No Pokemon match this filter.", {
        fontSize: "12px", fontFamily: "monospace", color: "#667788",
      }).setOrigin(0.5);
      return;
    }

    slice.forEach((entry, localIdx) => {
      const dexNum = entry.dexIndex + 1;
      const species = entry.species;
      const y = 92 + localIdx * 66;
      const w = GAME_W - 40;
      const h = 60;
      const x = 20;

      const isCaught = caught.has(species.id);
      const isSeen = isCaught || seen[species.id] !== undefined;

      const cardColor = isCaught ? 0x1a2a22 : isSeen ? 0x1a1a2e : 0x14141a;
      const strokeColor = isCaught ? 0x44aa66 : isSeen ? 0x44557a : 0x2a2a33;
      const cardBg = this.add.rectangle(x + w / 2, y + h / 2, w, h, cardColor).setOrigin(0.5).setStrokeStyle(1, strokeColor);
      if (isSeen) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => this.showPokemonDetail(species, { screen: "pokedex" }));
      }

      // Dex number on the left
      this.add.text(x + 10, y + 8, `#${dexNum.toString().padStart(3, "0")}`, {
        fontSize: "10px", fontFamily: "monospace", color: "#667788", fontStyle: "bold",
      });

      // Sprite (or silhouette for unseen)
      const spriteX = x + 30;
      const spriteY = y + h / 2 + 4;
      if (isSeen && this.textures.exists(species.spriteKey)) {
        const img = this.add.image(spriteX, spriteY, species.spriteKey).setDisplaySize(38, 38).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (!isCaught) img.setTint(0x6688aa);
      } else {
        // Unseen placeholder — a dim `?` box
        this.add.rectangle(spriteX, spriteY, 38, 38, 0x1f1f2a).setOrigin(0.5).setStrokeStyle(1, 0x333344);
        this.add.text(spriteX, spriteY, "?", {
          fontSize: "22px", fontFamily: "monospace", color: "#444455", fontStyle: "bold",
        }).setOrigin(0.5);
      }

      // Name
      const nameX = x + 58;
      const displayName = isSeen ? species.name : "???";
      this.add.text(nameX, y + 8, displayName, {
        fontSize: "13px", fontFamily: "monospace",
        color: isCaught ? "#ffffff" : isSeen ? "#cccccc" : "#555566",
        fontStyle: "bold",
      });

      // Caught badge — right-aligned on the first line
      if (isCaught) {
        this.add.text(x + w - 8, y + 10, "✓ CAUGHT", {
          fontSize: "9px", fontFamily: "monospace", color: "#66dd88", fontStyle: "bold",
        }).setOrigin(1, 0);
      } else if (isSeen) {
        this.add.text(x + w - 8, y + 10, "SEEN", {
          fontSize: "9px", fontFamily: "monospace", color: "#8899aa", fontStyle: "bold",
        }).setOrigin(1, 0);
      }

      if (isCaught) {
        // Types + rarity on the middle line
        const typeStr = species.types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" / ");
        const rarityLabel = species.rarity.charAt(0).toUpperCase() + species.rarity.slice(1);
        this.add.text(nameX, y + 24, `${typeStr}  ·  ${rarityLabel}`, {
          fontSize: "9px", fontFamily: "monospace", color: "#aaccee",
        });

        // Description — wrap inside the remaining card width
        const desc = POKEDEX_ENTRIES[species.id] ?? "";
        if (desc) {
          this.add.text(nameX, y + 37, desc, {
            fontSize: "8px", fontFamily: "monospace", color: "#889aaa",
            wordWrap: { width: w - (nameX - x) - 10 },
          });
        }
      } else if (isSeen) {
        // Seen-only cards show a hint that more unlocks on capture.
        this.add.text(nameX, y + 28, "Catch this Pokemon to reveal its details.", {
          fontSize: "9px", fontFamily: "monospace", color: "#667788", fontStyle: "italic",
        });
      } else {
        this.add.text(nameX, y + 28, "Not yet encountered.", {
          fontSize: "9px", fontFamily: "monospace", color: "#444455", fontStyle: "italic",
        });
      }
    });

    this.drawPagination(filtered.length, () => this.showScreen("pokedex", false));
  }

  // --- Items view ---
  private drawItems(): void {
    this.add.text(GAME_W / 2, 22, "YOUR ITEMS", { fontSize: "18px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);

    const allItems = this.gameState.playerItems.filter((b) => b.quantity > 0);
    const eggs = this.gameState.eggs;

    if (allItems.length === 0 && eggs.length === 0) {
      this.add.text(GAME_W / 2, 240, "No items!\nVisit the PokeMart to buy some.", {
        fontSize: "14px", fontFamily: "monospace", color: "#888888", align: "center",
      }).setOrigin(0.5);
      return;
    }

    // Build the tab bar — same seven item categories as PokeMart plus an
    // Eggs tab (always shown, even when empty, so the player never wonders
    // where their eggs went).
    type ItemTab = ItemCategory | "egg";
    const tabs: { value: ItemTab; label: string }[] = [
      ...MainMenuScene.SHOP_TAB_ORDER.map((cat) => ({
        value: cat as ItemTab,
        label: MainMenuScene.CATEGORY_LABELS[cat],
      })),
      { value: "egg", label: `EGG${eggs.length > 0 ? ` ${eggs.length}` : ""}` },
    ];
    this.drawCategoryTabs<ItemTab>(
      58,
      tabs,
      this.itemsTab,
      (value) => {
        if (this.itemsTab === value) return;
        this.itemsTab = value;
        this.listPage = 0;
        this.showScreen("items", false);
      },
    );

    if (this.itemsTab === "egg") {
      this.drawItemsEggTab(eggs);
      return;
    }

    // Sort bar reuses the existing A-Z / Qty toggle but only applies inside
    // the active category tab.
    this.drawSortBar<ItemSort>(
      100,
      [
        { value: "name", label: "A-Z" },
        { value: "quantity", label: "QTY" },
      ],
      this.itemSort,
      (value) => {
        if (value === this.itemSort) return;
        this.itemSort = value;
        this.showScreen("items", false);
      },
    );

    const filtered = allItems.filter((b) => b.item.category === this.itemsTab);
    const sortFn = this.itemSort === "name"
      ? (a: BattleItem, b: BattleItem) => a.item.name.localeCompare(b.item.name)
      : (a: BattleItem, b: BattleItem) => b.quantity - a.quantity || a.item.name.localeCompare(b.item.name);
    const sorted = [...filtered].sort(sortFn);

    if (sorted.length === 0) {
      this.add.text(GAME_W / 2, 260, "No items in this category.", {
        fontSize: "12px", fontFamily: "monospace", color: "#667788",
      }).setOrigin(0.5);
      return;
    }

    this.clampListPage(sorted.length);
    const { slice } = this.pagedSlice(sorted);

    slice.forEach((belt, localIdx) => {
      const y = 130 + localIdx * 56;
      if (y + 25 > GAME_H - 90) return;

      const w = GAME_W - 40;
      this.add.rectangle(GAME_W / 2, y, w, 48, 0x1a1a2e).setOrigin(0.5).setStrokeStyle(1, 0x333355);

      const icon = this.getItemIcon(belt.item.id);
      this.add.text(28, y, icon, { fontSize: "18px", fontFamily: "monospace" }).setOrigin(0.5);

      this.add.text(52, y - 10, `${belt.item.name}  x${belt.quantity}`, {
        fontSize: "12px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0, 0.5);
      this.add.text(52, y + 8, belt.item.description, {
        fontSize: "8px", fontFamily: "monospace", color: "#888888",
        wordWrap: { width: 230 },
      }).setOrigin(0, 0.5);

      this.drawItemUseButton(belt, GAME_W - 40, y);
    });

    this.drawPagination(sorted.length, () => this.showScreen("items", false));
  }

  /** Dedicated Egg tab under the Items screen — paginated owned eggs. */
  private drawItemsEggTab(eggs: { id: string; tier: EggTier; speciesId: string; stepsRemaining: number }[]): void {
    if (eggs.length === 0) {
      this.add.text(GAME_W / 2, 260, "No eggs yet — visit the Egg Shop\nto buy one and walk it to hatch.", {
        fontSize: "12px", fontFamily: "monospace", color: "#667788", align: "center",
      }).setOrigin(0.5);
      return;
    }

    this.clampListPage(eggs.length);
    const { slice } = this.pagedSlice(eggs);

    slice.forEach((egg, localIdx) => {
      const y = 120 + localIdx * 66;
      const tierData = EGG_TIERS[egg.tier];
      const w = GAME_W - 40;

      this.add.rectangle(GAME_W / 2, y, w, 58, 0x1a1a2e).setOrigin(0.5).setStrokeStyle(2, tierData.color);

      if (this.textures.exists(tierData.spriteKey)) {
        const img = this.add.image(38, y, tierData.spriteKey).setDisplaySize(44, 44).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(70, y - 16, tierData.name, {
        fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0, 0.5);

      const stepsTaken = tierData.stepsToHatch - egg.stepsRemaining;
      this.add.text(GAME_W - 25, y - 16, `${stepsTaken} / ${tierData.stepsToHatch}`, {
        fontSize: "11px", fontFamily: "monospace", color: "#aaccff", fontStyle: "bold",
      }).setOrigin(1, 0.5);

      const flavor = egg.stepsRemaining === 0 ? "Ready to hatch!" : "Walk in dungeons to hatch";
      this.add.text(70, y, flavor, {
        fontSize: "9px", fontFamily: "monospace",
        color: egg.stepsRemaining === 0 ? "#44ff88" : "#888899",
      }).setOrigin(0, 0.5);

      const barX = 70;
      const barY = y + 14;
      const barW = GAME_W - barX - 25;
      const barH = 5;
      this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x222233).setOrigin(0.5);
      const pct = Math.max(0, Math.min(1, stepsTaken / tierData.stepsToHatch));
      if (pct > 0) {
        this.add.rectangle(barX, barY - barH / 2, barW * pct, barH, tierData.color).setOrigin(0, 0);
      }
    });

    this.drawPagination(eggs.length, () => this.showScreen("items", false));
  }

  /** Draw the USE / BATTLE / TM button for an item card based on its category. */
  private drawItemUseButton(belt: BattleItem, x: number, y: number): void {
    const cat = belt.item.category;
    if (cat === "field") {
      // Escape rope / repel / map — not usable from town
      this.add.text(x, y, "FIELD", { fontSize: "8px", fontFamily: "monospace", color: "#666666", fontStyle: "bold" }).setOrigin(0.5);
      return;
    }
    if (cat === "battle") {
      const bg = this.add.rectangle(x, y, 64, 26, 0x222244).setOrigin(0.5).setStrokeStyle(1, 0x333355);
      this.add.text(x, y, "BATTLE", { fontSize: "9px", fontFamily: "monospace", color: "#6677aa", fontStyle: "bold" }).setOrigin(0.5);
      bg.setInteractive();
      bg.on("pointerdown", () => this.showToast("Only usable in battle.", { color: "#ff8888", sfx: "error" }));
      return;
    }
    if (cat === "tm") {
      const bg = this.add.rectangle(x, y, 64, 26, 0x664422).setOrigin(0.5).setStrokeStyle(1, 0x886644);
      this.add.text(x, y, "TM", { fontSize: "11px", fontFamily: "monospace", color: "#ffcc88", fontStyle: "bold" }).setOrigin(0.5);
      bg.setInteractive();
      bg.on("pointerdown", () =>
        this.showToast("TMs can only be used at the Training Centre.", { color: "#ffcc88", sfx: "error" })
      );
      return;
    }
    // medicine, vitamin, stone, candy — pick a roster target
    const bg = this.add.rectangle(x, y, 64, 26, 0x335588).setOrigin(0.5).setStrokeStyle(1, 0x4477aa);
    this.add.text(x, y, "USE", { fontSize: "11px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    bg.setInteractive();
    bg.on("pointerdown", () => this.showItemUseTarget(belt));
  }

  private showToast(
    message: string,
    opts: Parameters<typeof showToast>[2] = {}
  ): void {
    showToast(this, message, opts);
  }

  /**
   * Paginate helpers — slice the array and draw a PREV / NEXT strip above
   * the BACK button. Call `clampListPage` first so items removed elsewhere
   * (e.g. evolved, released) don't leave us on a now-empty page.
   */
  private clampListPage(totalItems: number): void {
    const pages = Math.max(1, Math.ceil(totalItems / LIST_PAGE_SIZE));
    if (this.listPage >= pages) this.listPage = pages - 1;
    if (this.listPage < 0) this.listPage = 0;
  }

  private pagedSlice<T>(items: T[]): { slice: T[]; start: number } {
    const start = this.listPage * LIST_PAGE_SIZE;
    return { slice: items.slice(start, start + LIST_PAGE_SIZE), start };
  }

  private drawPagination(totalItems: number, redraw: () => void): void {
    if (totalItems <= LIST_PAGE_SIZE) return;
    const pages = Math.ceil(totalItems / LIST_PAGE_SIZE);
    const y = GAME_H - 80;

    this.add.text(GAME_W / 2, y, `Page ${this.listPage + 1} / ${pages}`, {
      fontSize: "11px", fontFamily: "monospace", color: "#aabbcc", fontStyle: "bold",
    }).setOrigin(0.5);

    if (this.listPage > 0) {
      const prevBg = this.add.rectangle(GAME_W / 2 - 95, y, 74, 26, 0x223344).setOrigin(0.5).setStrokeStyle(1, 0x445566);
      this.add.text(GAME_W / 2 - 95, y, "< PREV", { fontSize: "11px", fontFamily: "monospace", color: "#aaccee", fontStyle: "bold" }).setOrigin(0.5);
      prevBg.setInteractive();
      prevBg.on("pointerdown", () => { this.listPage--; redraw(); });
    }

    if (this.listPage < pages - 1) {
      const nextBg = this.add.rectangle(GAME_W / 2 + 95, y, 74, 26, 0x223344).setOrigin(0.5).setStrokeStyle(1, 0x445566);
      this.add.text(GAME_W / 2 + 95, y, "NEXT >", { fontSize: "11px", fontFamily: "monospace", color: "#aaccee", fontStyle: "bold" }).setOrigin(0.5);
      nextBg.setInteractive();
      nextBg.on("pointerdown", () => { this.listPage++; redraw(); });
    }
  }

  /** Predicate: can this item be applied to this pokemon right now? */
  private canTargetWith(belt: BattleItem, pokemon: BattlePokemon): boolean {
    const id = belt.item.id;
    const cat = belt.item.category;
    switch (cat) {
      case "medicine":
        if (id === "revive") return pokemon.currentHP <= 0;
        return pokemon.currentHP > 0 && pokemon.currentHP < pokemon.maxHP;
      case "vitamin": {
        const cfg = VITAMIN_CONFIG[id];
        if (!cfg) return false;
        return pokemon.currentHP > 0 && canUseVitamin(pokemon, cfg.stat);
      }
      case "stone":
        return pokemon.currentHP > 0 && getStoneEvolution(pokemon, id) !== null;
      case "candy":
        return canUseRareCandy(pokemon, this.gameState.roster);
      default:
        return false;
    }
  }

  /** Short label for why a pokemon can't be targeted (shown on disabled cards). */
  private unavailableReason(belt: BattleItem, pokemon: BattlePokemon): string {
    const id = belt.item.id;
    const cat = belt.item.category;
    if (pokemon.currentHP <= 0 && cat !== "medicine") return "Fainted";
    switch (cat) {
      case "medicine":
        if (id === "revive") return pokemon.currentHP > 0 ? "Not fainted" : "";
        return pokemon.currentHP >= pokemon.maxHP ? "Full HP" : "Fainted";
      case "vitamin": {
        const cfg = VITAMIN_CONFIG[id];
        return cfg ? `${cfg.stat.toUpperCase()} maxed` : "N/A";
      }
      case "stone":
        return "No effect";
      case "candy":
        return pokemon.level >= rareCandyCap(this.gameState.roster)
          ? "At roster cap"
          : "";
      default:
        return "";
    }
  }

  private showItemUseTarget(belt: BattleItem, resetPage = true): void {
    if (resetPage) this.listPage = 0;
    this.resetScreen();
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a)
      .setOrigin(0.5)
      .setInteractive();

    const icon = this.getItemIcon(belt.item.id);
    this.add.text(GAME_W / 2, 30, `${icon} Use ${belt.item.name} on?`, { fontSize: "18px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 55, `${belt.quantity} remaining`, { fontSize: "11px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);

    this.clampListPage(this.gameState.roster.length);
    const { slice } = this.pagedSlice(this.gameState.roster);

    slice.forEach((pokemon, localIdx) => {
      const y = 90 + localIdx * 65;

      const canTarget = this.canTargetWith(belt, pokemon);
      const reason = canTarget ? "" : this.unavailableReason(belt, pokemon);

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 52, canTarget ? 0x222244 : 0x181822, 0.9).setOrigin(0.5).setStrokeStyle(1, canTarget ? 0x444466 : 0x222233);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 140, y, pokemon.species.spriteKey).setDisplaySize(40, 40).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(GAME_W / 2 - 110, y - 10, pokemon.species.name, { fontSize: "12px", fontFamily: "monospace", color: canTarget ? "#ffffff" : "#555555", fontStyle: "bold" }).setOrigin(0, 0.5);
      const lvStr = `Lv${pokemon.level}`;
      const hpStr = pokemon.currentHP <= 0 ? "FAINTED" : `${pokemon.currentHP}/${pokemon.maxHP} HP`;
      this.add.text(GAME_W / 2 - 110, y + 4, `${lvStr}  ${hpStr}`, { fontSize: "10px", fontFamily: "monospace", color: pokemon.currentHP <= 0 ? "#cc4444" : "#22cc44" }).setOrigin(0, 0.5);

      // Show bonus summary if vitamin
      if (belt.item.category === "vitamin") {
        const bonus = pokemon.statBonuses;
        const parts = [
          bonus.hp > 0 ? `HP+${bonus.hp}` : null,
          bonus.atk > 0 ? `A+${bonus.atk}` : null,
          bonus.def > 0 ? `D+${bonus.def}` : null,
          bonus.spd > 0 ? `S+${bonus.spd}` : null,
          bonus.spc > 0 ? `Sp+${bonus.spc}` : null,
        ].filter(Boolean);
        if (parts.length > 0) {
          this.add.text(GAME_W / 2 - 110, y + 18, parts.join(" "), {
            fontSize: "9px", fontFamily: "monospace", color: "#88aacc",
          }).setOrigin(0, 0.5);
        }
      }

      if (!canTarget && reason) {
        this.add.text(GAME_W / 2 + 140, y, reason, {
          fontSize: "9px", fontFamily: "monospace", color: "#886666", fontStyle: "bold",
        }).setOrigin(1, 0.5);
      }

      if (canTarget) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => {
          const result = applyItem(belt.item.id, pokemon, { roster: this.gameState.roster });
          if (result.kind !== "fail") {
            belt.quantity--;
            saveGame(this.gameState);
            if (result.kind === "evolve") {
              this.showEvolutionAnimation(result.oldName, pokemon, () => this.showScreen("items"));
              return;
            }
          }
          this.showScreen("items");
          if (result.kind !== "fail") {
            const { message, sfx, color } = describeItemResult(result, pokemon);
            this.showToast(message, { sfx, color });
          }
        });
      }
    });

    this.drawPagination(this.gameState.roster.length, () => this.showItemUseTarget(belt, false));

    // Back
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 45, 160, 38, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x774444);
    this.add.text(GAME_W / 2, GAME_H - 45, "BACK", { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.showScreen("items"));
  }

  /** Shared evolution animation used by level evolution and stone evolution. */
  private showEvolutionAnimation(oldName: string, pokemon: BattlePokemon, onContinue: () => void): void {
    this.resetScreen();
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a)
      .setOrigin(0.5)
      .setInteractive();
    MusicManager.playSFX("hatch");

    this.add.text(GAME_W / 2, GAME_H / 2 - 100, "Congratulations!", {
      fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H / 2 - 60, `${oldName} evolved into`, {
      fontSize: "14px", fontFamily: "monospace", color: "#cccccc",
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, GAME_H / 2 - 35, `${pokemon.species.name}!`, {
      fontSize: "22px", fontFamily: "monospace", color: "#ff8844", fontStyle: "bold",
    }).setOrigin(0.5);

    if (this.textures.exists(pokemon.species.spriteKey)) {
      const sprite = this.add
        .image(GAME_W / 2, GAME_H / 2 + 40, pokemon.species.spriteKey)
        .setDisplaySize(96, 96)
        .setOrigin(0.5)
        .setAlpha(0);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.tweens.add({ targets: sprite, alpha: 1, scale: { from: 0.5, to: 1 }, duration: 600, ease: "Back.easeOut" });
    }

    const tapText = this.add.text(GAME_W / 2, GAME_H / 2 + 120, "Tap to continue", {
      fontSize: "14px", fontFamily: "monospace", color: "#888888",
    }).setOrigin(0.5);
    this.tweens.add({ targets: tapText, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0).setOrigin(0.5);
    overlay.setInteractive();
    overlay.once("pointerdown", onContinue);
  }

  /**
   * Canonical ordering for the category-tab strip shared by PokeMart and
   * the Items screen. Medicine and field come first because they're the
   * categories with the most turnover during a run.
   */
  private static readonly SHOP_TAB_ORDER: ItemCategory[] = [
    "medicine", "field", "battle", "vitamin", "candy", "stone", "tm",
  ];
  private static readonly CATEGORY_LABELS: Record<ItemCategory, string> = {
    medicine: "MED",
    field: "FIELD",
    battle: "X-ITEM",
    vitamin: "VIT",
    candy: "CANDY",
    stone: "STONE",
    tm: "TM",
  };

  /**
   * Compact horizontal tab strip. Used by PokeMart, Items, and (in extended
   * form) the Items screen's Eggs tab. Tabs wrap to a second row if too many
   * to fit; the active tab highlights with a stroke + solid fill.
   */
  private drawCategoryTabs<T extends string>(
    y: number,
    tabs: { value: T; label: string }[],
    active: T,
    onPick: (value: T) => void,
  ): number {
    const margin = 10;
    const gap = 4;
    const usableW = GAME_W - margin * 2;
    const tabW = Math.floor((usableW - gap * (tabs.length - 1)) / tabs.length);
    const tabH = 26;
    tabs.forEach((tab, idx) => {
      const x = margin + idx * (tabW + gap) + tabW / 2;
      const isActive = tab.value === active;
      const bg = this.add.rectangle(x, y, tabW, tabH, isActive ? 0x4466aa : 0x1a1a2e)
        .setOrigin(0.5)
        .setStrokeStyle(1, isActive ? 0x88aadd : 0x333355);
      this.add.text(x, y, tab.label, {
        fontSize: "10px", fontFamily: "monospace",
        color: isActive ? "#ffffff" : "#8899aa",
        fontStyle: "bold",
      }).setOrigin(0.5);
      bg.setInteractive();
      bg.on("pointerdown", () => onPick(tab.value));
    });
    return y + tabH;
  }

  // --- Item Shop ---
  private drawShop(): void {
    this.add.text(GAME_W / 2, 22, "POKEMART", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 44, `Gold: ${this.gameState.gold}`, { fontSize: "13px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);

    const unlocked = getWorldsUnlocked(this.gameState.worlds);
    const available = getAvailableShopItems(unlocked);

    if (available.length === 0) {
      this.add.text(GAME_W / 2, 300, "No items available yet!", { fontSize: "14px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);
      return;
    }

    // Tab row at y=75 (26px tall → 62..88), cards begin at y=100.
    this.drawCategoryTabs<ItemCategory>(
      75,
      MainMenuScene.SHOP_TAB_ORDER.map((cat) => ({ value: cat, label: MainMenuScene.CATEGORY_LABELS[cat] })),
      this.shopTab,
      (value) => {
        if (this.shopTab === value) return;
        this.shopTab = value;
        this.listPage = 0;
        this.showScreen("shop", false);
      },
    );

    const filtered = available.filter((entry) => ITEMS[entry.itemId].category === this.shopTab);
    if (filtered.length === 0) {
      this.add.text(GAME_W / 2, 240, "No items in this category\nat your current world progress.", {
        fontSize: "11px", fontFamily: "monospace", color: "#667788", align: "center",
      }).setOrigin(0.5);
      return;
    }

    this.clampListPage(filtered.length);
    const { slice } = this.pagedSlice(filtered);

    slice.forEach((shopItem, localIdx) => {
      const y = 110 + localIdx * 56;
      const item = ITEMS[shopItem.itemId];
      const canAfford = this.gameState.gold >= shopItem.cost;

      const cardBg = this.add.rectangle(GAME_W / 2, y, 354, 50, canAfford ? 0x2a2a3e : 0x1a1a22, 0.9)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x444466);

      const iconText = this.getItemIcon(shopItem.itemId);
      this.add.text(24, y, iconText, { fontSize: "16px", fontFamily: "monospace" }).setOrigin(0.5);

      this.add.text(42, y - 12, item.name, {
        fontSize: "12px", fontFamily: "monospace",
        color: canAfford ? "#ffffff" : "#666666", fontStyle: "bold",
      }).setOrigin(0, 0.5);
      this.add.text(42, y + 4, item.description, {
        fontSize: "8px", fontFamily: "monospace", color: "#888888",
        wordWrap: { width: 240 },
      }).setOrigin(0, 0.5);

      this.add.text(GAME_W - 15, y, `${shopItem.cost}g`, {
        fontSize: "12px", fontFamily: "monospace",
        color: canAfford ? "#ffd700" : "#664400", fontStyle: "bold",
      }).setOrigin(1, 0.5);

      if (canAfford) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => {
          this.gameState.gold -= shopItem.cost;
          const existing = this.gameState.playerItems.find((b) => b.item.id === shopItem.itemId);
          if (existing) existing.quantity++;
          else this.gameState.playerItems.push({ item: ITEMS[shopItem.itemId], quantity: 1 });
          saveGame(this.gameState);
          this.showScreen("shop", false);
          this.showToast(`Bought ${item.name}!  -${shopItem.cost}g`, { sfx: "purchase" });
        });
      }
    });

    this.drawPagination(filtered.length, () => this.showScreen("shop", false));
  }

  // --- Pokemon Shop (tabbed BUY / SELL) ---
  private drawPokemonShop(): void {
    this.add.text(GAME_W / 2, 24, "POKEMON TRADER", { fontSize: "19px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 46, `Gold: ${this.gameState.gold}`, { fontSize: "13px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);

    // Buy / Sell tabs
    const tabY = 70;
    const tabs: { mode: PokeshopMode; label: string }[] = [
      { mode: "buy", label: "BUY" },
      { mode: "sell", label: "SELL" },
    ];
    tabs.forEach((tab, idx) => {
      const x = GAME_W / 2 + (idx === 0 ? -60 : 60);
      const active = this.pokeshopMode === tab.mode;
      const bg = this.add.rectangle(x, tabY, 100, 28, active ? 0x4466aa : 0x1a1a2e)
        .setOrigin(0.5)
        .setStrokeStyle(1, active ? 0x88aadd : 0x444466);
      this.add.text(x, tabY, tab.label, {
        fontSize: "13px", fontFamily: "monospace",
        color: active ? "#ffffff" : "#8899aa",
        fontStyle: "bold",
      }).setOrigin(0.5);
      bg.setInteractive();
      bg.on("pointerdown", () => {
        if (this.pokeshopMode === tab.mode) return;
        this.pokeshopMode = tab.mode;
        this.listPage = 0;
        this.showScreen("pokeshop", false);
      });
    });

    this.drawTypeFilterPill(96, () => this.showScreen("pokeshop", false));

    if (this.pokeshopMode === "buy") {
      this.drawPokemonBuyList();
    } else {
      this.drawPokemonSellList();
    }
  }

  private drawPokemonBuyList(): void {
    const available = getAvailableShopPokemon(this.gameState.seenPokemon);

    const filtered = this.typeFilter === null
      ? available
      : available.filter((shopPoke) => getPokemon(shopPoke.speciesId).types.includes(this.typeFilter!));

    if (available.length === 0) {
      this.add.text(GAME_W / 2, 300, "No Pokemon available\nyet!\n\nFight wild Pokemon to\nunlock them in the shop.", { fontSize: "13px", fontFamily: "monospace", color: "#888888", align: "center" }).setOrigin(0.5);
      return;
    }
    if (filtered.length === 0) {
      this.add.text(GAME_W / 2, 300, "No Pokemon match this filter.", {
        fontSize: "12px", fontFamily: "monospace", color: "#667788",
      }).setOrigin(0.5);
      return;
    }

    this.clampListPage(filtered.length);
    const { slice, start } = this.pagedSlice(filtered);

    slice.forEach((shopPoke, localIdx) => {
      const i = start + localIdx;
      void i;
      const species = getPokemon(shopPoke.speciesId);
      const y = 130 + localIdx * 58;
      const canAfford = this.gameState.gold >= shopPoke.cost;

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 52, canAfford ? 0x2a2a3e : 0x1a1a22, 0.9).setOrigin(0.5).setStrokeStyle(1, 0x444466);

      if (this.textures.exists(species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 140, y, species.spriteKey).setDisplaySize(38, 38).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      this.add.text(GAME_W / 2 - 105, y - 12, `${species.name}  Lv${shopPoke.level}`, { fontSize: "13px", fontFamily: "monospace", color: canAfford ? "#ffffff" : "#666666", fontStyle: "bold" }).setOrigin(0, 0.5);
      const typeStr = species.types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join("/");
      this.add.text(GAME_W / 2 - 105, y + 3, typeStr, { fontSize: "10px", fontFamily: "monospace", color: "#aaaacc" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 - 105, y + 16, `Highest seen in wild`, { fontSize: "8px", fontFamily: "monospace", color: "#667788" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 + 130, y, `${shopPoke.cost}g`, { fontSize: "14px", fontFamily: "monospace", color: canAfford ? "#ffd700" : "#664400", fontStyle: "bold" }).setOrigin(0.5);

      if (canAfford) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => {
          this.gameState.gold -= shopPoke.cost;
          this.gameState.roster.push(createBattlePokemon(species, shopPoke.level));
          if (!this.gameState.caughtPokemon.includes(species.id)) {
            this.gameState.caughtPokemon.push(species.id);
          }
          saveGame(this.gameState);
          this.showScreen("pokeshop", false);
          this.showToast(`${species.name} (Lv${shopPoke.level}) joined your roster!  -${shopPoke.cost}g`, { sfx: "purchase" });
        });
      }
    });

    this.drawPagination(filtered.length, () => this.showScreen("pokeshop", false));
  }

  // --- Sell list ---
  private drawPokemonSellList(): void {
    const roster = this.gameState.roster;
    if (roster.length <= 1) {
      this.add.text(GAME_W / 2, 300,
        "You can't sell your last\nPokemon!\n\nCatch or buy more before\nselling any.",
        { fontSize: "13px", fontFamily: "monospace", color: "#ff8888", align: "center" }
      ).setOrigin(0.5);
      return;
    }

    const sorted = this.getSortedRoster();
    this.clampListPage(sorted.length);
    const { slice } = this.pagedSlice(sorted);

    if (sorted.length === 0) {
      this.add.text(GAME_W / 2, 300, "No Pokemon match this filter.", {
        fontSize: "12px", fontFamily: "monospace", color: "#667788",
      }).setOrigin(0.5);
      return;
    }

    slice.forEach((pokemon, localIdx) => {
      const y = 130 + localIdx * 58;
      const sellValue = getPokemonSellValue(pokemon.species, pokemon.level);
      const locked = pokemon.isFavourite;

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 52, locked ? 0x1a1a22 : 0x2a2a3e, 0.9)
        .setOrigin(0.5)
        .setStrokeStyle(1, locked ? 0x554433 : 0x444466);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 140, y, pokemon.species.spriteKey).setDisplaySize(38, 38).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      const nameLabel = locked ? `★ ${pokemon.species.name}` : pokemon.species.name;
      this.add.text(GAME_W / 2 - 105, y - 12, `${nameLabel}  Lv${pokemon.level}`, {
        fontSize: "13px", fontFamily: "monospace",
        color: locked ? "#ffcc33" : "#ffffff",
        fontStyle: "bold",
      }).setOrigin(0, 0.5);
      const typeStr = pokemon.species.types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join("/");
      this.add.text(GAME_W / 2 - 105, y + 3, typeStr, { fontSize: "10px", fontFamily: "monospace", color: "#aaaacc" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 - 105, y + 16, locked ? "Favourited — can't sell" : `HP ${pokemon.currentHP}/${pokemon.maxHP}`, {
        fontSize: "8px", fontFamily: "monospace", color: locked ? "#886644" : "#667788",
      }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 + 130, y, `+${sellValue}g`, {
        fontSize: "14px", fontFamily: "monospace",
        color: locked ? "#554433" : "#88ff88", fontStyle: "bold",
      }).setOrigin(0.5);

      if (!locked) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => this.confirmPokemonSell(pokemon, sellValue));
      }
    });

    this.drawPagination(sorted.length, () => this.showScreen("pokeshop", false));
  }

  private confirmPokemonSell(pokemon: BattlePokemon, sellValue: number): void {
    // Dim backdrop over the existing screen.
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7)
      .setOrigin(0.5)
      .setDepth(1000)
      .setInteractive();

    const panel = this.add.rectangle(GAME_W / 2, GAME_H / 2, 320, 240, 0x1a1a2e)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x4466aa)
      .setDepth(1001);
    void panel;

    this.add.text(GAME_W / 2, GAME_H / 2 - 100, "SELL POKEMON?", {
      fontSize: "16px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1002);

    if (this.textures.exists(pokemon.species.spriteKey)) {
      const img = this.add.image(GAME_W / 2, GAME_H / 2 - 50, pokemon.species.spriteKey)
        .setDisplaySize(56, 56).setOrigin(0.5).setDepth(1002);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.add.text(GAME_W / 2, GAME_H / 2 - 5, `${pokemon.species.name}  Lv${pokemon.level}`, {
      fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1002);

    this.add.text(GAME_W / 2, GAME_H / 2 + 18, `Sell value: +${sellValue}g`, {
      fontSize: "12px", fontFamily: "monospace", color: "#88ff88",
    }).setOrigin(0.5).setDepth(1002);

    this.add.text(GAME_W / 2, GAME_H / 2 + 38, "This is permanent!", {
      fontSize: "10px", fontFamily: "monospace", color: "#ff8888",
    }).setOrigin(0.5).setDepth(1002);

    // Cancel
    const cancelBg = this.add.rectangle(GAME_W / 2 - 70, GAME_H / 2 + 80, 120, 36, 0x333344)
      .setOrigin(0.5).setStrokeStyle(1, 0x555566).setDepth(1002).setInteractive();
    this.add.text(GAME_W / 2 - 70, GAME_H / 2 + 80, "CANCEL", {
      fontSize: "12px", fontFamily: "monospace", color: "#cccccc", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1003);
    cancelBg.on("pointerdown", () => this.showScreen("pokeshop", false));

    // Confirm sell
    const sellBg = this.add.rectangle(GAME_W / 2 + 70, GAME_H / 2 + 80, 120, 36, 0x885533)
      .setOrigin(0.5).setStrokeStyle(1, 0xaa7744).setDepth(1002).setInteractive();
    this.add.text(GAME_W / 2 + 70, GAME_H / 2 + 80, "SELL", {
      fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1003);
    sellBg.on("pointerdown", () => this.doPokemonSell(pokemon, sellValue));

    // Block clicks behind the panel
    overlay.on("pointerdown", () => { /* swallow */ });
  }

  private doPokemonSell(pokemon: BattlePokemon, sellValue: number): void {
    const idx = this.gameState.roster.indexOf(pokemon);
    if (idx < 0) {
      this.showScreen("pokeshop", false);
      return;
    }
    // Removing from roster invalidates any indices in selectedParty — simplest
    // to clear the current party picker state and let the user re-pick.
    this.gameState.roster.splice(idx, 1);
    this.gameState.playerParty = this.gameState.playerParty.filter((p) => p !== pokemon);
    this.selectedParty = [];
    this.gameState.gold += sellValue;
    saveGame(this.gameState);
    this.showScreen("pokeshop", false);
    this.showToast(`Sold ${pokemon.species.name}!  +${sellValue}g`, { sfx: "purchase", color: "#88ff88" });
  }

  // --- Egg Shop ---
  private drawEggShop(): void {
    this.add.text(GAME_W / 2, 30, "EGG SHOP", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 55, `Gold: ${this.gameState.gold}`, { fontSize: "14px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 74, "Hatches while you walk the dungeon", { fontSize: "9px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);

    const tiers = getAllEggTiers();
    tiers.forEach((tier, i) => {
      const y = 110 + i * 72;
      const canAfford = this.gameState.gold >= tier.cost;

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 60, canAfford ? 0x2a2a3e : 0x1a1a22, 0.9).setOrigin(0.5).setStrokeStyle(2, canAfford ? tier.color : 0x333344);

      if (this.textures.exists(tier.spriteKey)) {
        const eggImg = this.add.image(GAME_W / 2 - 148, y, tier.spriteKey).setDisplaySize(48, 48).setOrigin(0.5);
        eggImg.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (!canAfford) eggImg.setAlpha(0.4);
      }

      this.add.text(GAME_W / 2 - 115, y - 16, tier.name, { fontSize: "13px", fontFamily: "monospace", color: canAfford ? "#ffffff" : "#666666", fontStyle: "bold" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 - 115, y + 2, tier.description, { fontSize: "9px", fontFamily: "monospace", color: "#888888" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 - 115, y + 18, `${tier.stepsToHatch} steps to hatch`, { fontSize: "9px", fontFamily: "monospace", color: "#6688aa" }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 + 140, y, `${tier.cost}g`, { fontSize: "14px", fontFamily: "monospace", color: canAfford ? "#ffd700" : "#664400", fontStyle: "bold" }).setOrigin(0.5);

      if (canAfford) {
        cardBg.setInteractive();
        cardBg.on("pointerdown", () => this.purchaseEgg(tier.tier));
      }
    });

    // Current eggs inventory
    const invY = 110 + tiers.length * 72 + 10;
    this.add.text(GAME_W / 2, invY, "YOUR EGGS", { fontSize: "12px", fontFamily: "monospace", color: "#cc88cc", fontStyle: "bold" }).setOrigin(0.5);

    const eggs = this.gameState.eggs;
    if (eggs.length === 0) {
      this.add.text(GAME_W / 2, invY + 22, "None — buy one above!", { fontSize: "10px", fontFamily: "monospace", color: "#666666" }).setOrigin(0.5);
    } else {
      eggs.forEach((egg, i) => {
        const y = invY + 22 + i * 22;
        if (y > GAME_H - 75) return;
        const tierData = EGG_TIERS[egg.tier];
        if (this.textures.exists(tierData.spriteKey)) {
          const img = this.add.image(GAME_W / 2 - 135, y, tierData.spriteKey).setDisplaySize(20, 20).setOrigin(0.5);
          img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        this.add.text(GAME_W / 2 - 115, y, `${tierData.name}`, { fontSize: "11px", fontFamily: "monospace", color: "#ffffff" }).setOrigin(0, 0.5);
        const stepsTaken = tierData.stepsToHatch - egg.stepsRemaining;
        this.add.text(GAME_W / 2 + 140, y, `${stepsTaken} / ${tierData.stepsToHatch}`, { fontSize: "10px", fontFamily: "monospace", color: "#aaccff" }).setOrigin(1, 0.5);
      });
    }
  }

  private purchaseEgg(tier: EggTier): void {
    const tierData = EGG_TIERS[tier];
    if (this.gameState.gold < tierData.cost) return;
    this.gameState.gold -= tierData.cost;
    this.gameState.eggs.push(createEgg(tier));
    saveGame(this.gameState);
    this.showScreen("eggshop");
    this.showToast(`Bought ${tierData.name}!  -${tierData.cost}g`, { sfx: "purchase" });
  }

  // --- Party Select ---
  private drawPartySelect(): void {
    this.add.text(GAME_W / 2, 24, "SELECT PARTY", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 46, `${this.selectedParty.length}/${PARTY_SIZE} selected — tap to toggle`, { fontSize: "11px", fontFamily: "monospace", color: "#888888" }).setOrigin(0.5);

    // Selected preview — reserve the strip at y=72 even when empty so the
    // sort bar below sits in a stable position whether or not a party is picked.
    if (this.selectedParty.length > 0) {
      this.selectedParty.forEach((idx, i) => {
        const p = this.gameState.roster[idx];
        const x = GAME_W / 2 - (this.selectedParty.length - 1) * 25 + i * 50;
        if (this.textures.exists(p.species.spriteKey)) {
          const img = this.add.image(x, 72, p.species.spriteKey).setDisplaySize(32, 32).setOrigin(0.5);
          img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      });
    }

    // Sort bar lives below the preview strip (preview sprites extend ~56..88,
    // sort bar buttons are 22px tall so centered at 104 → 93..115).
    this.drawSortBar<RosterSort>(
      100,
      [
        { value: "level", label: "LEVEL" },
        { value: "type", label: "TYPE" },
        { value: "name", label: "A-Z" },
      ],
      this.rosterSort,
      (value) => {
        if (value === this.rosterSort) return;
        this.rosterSort = value;
        this.listPage = 0;
        this.showScreen("party", false);
      },
    );

    this.drawTypeFilterPill(126, () => this.showScreen("party", false));

    const sorted = this.getSortedRoster();
    this.clampListPage(sorted.length);
    const { slice } = this.pagedSlice(sorted);

    if (sorted.length === 0) {
      this.add.text(GAME_W / 2, 260, "No Pokemon match this filter.", {
        fontSize: "12px", fontFamily: "monospace", color: "#667788",
      }).setOrigin(0.5);
    }

    // First card centered at 156 (top = 133) clears the filter pill's bottom at 137.
    slice.forEach((pokemon, localIdx) => {
      const i = this.gameState.roster.indexOf(pokemon);
      const y = 156 + localIdx * 52;
      const isSelected = this.selectedParty.includes(i);

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 46, isSelected ? 0x334422 : 0x2a2a3e, 0.9).setOrigin(0.5).setStrokeStyle(2, isSelected ? 0x44aa22 : 0x444466);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 145, y, pokemon.species.spriteKey).setDisplaySize(28, 28).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      const nameLabel = pokemon.isFavourite ? `★ ${pokemon.species.name}` : pokemon.species.name;
      this.add.text(GAME_W / 2 - 120, y - 5, nameLabel, {
        fontSize: "12px", fontFamily: "monospace",
        color: pokemon.isFavourite ? "#ffcc33" : "#ffffff",
        fontStyle: "bold",
      }).setOrigin(0, 0.5);
      const typeStr = pokemon.species.types.map((t) => t.substring(0, 3).toUpperCase()).join("/");
      this.add.text(GAME_W / 2 - 120, y + 12, `Lv${pokemon.level}  ${typeStr}`, { fontSize: "9px", fontFamily: "monospace", color: "#888888" }).setOrigin(0, 0.5);

      if (isSelected) {
        this.add.text(GAME_W / 2 + 145, y, "OK", { fontSize: "14px", fontFamily: "monospace", color: "#44aa22", fontStyle: "bold" }).setOrigin(0.5);
      }

      cardBg.setInteractive();
      cardBg.on("pointerdown", () => {
        if (isSelected) {
          this.selectedParty = this.selectedParty.filter((x) => x !== i);
        } else if (this.selectedParty.length < PARTY_SIZE) {
          this.selectedParty.push(i);
        }
        this.showScreen("party", false);
      });
    });

    this.drawPagination(sorted.length, () => this.showScreen("party", false));

    // GO button
    if (this.selectedParty.length > 0) {
      const goBg = this.add.rectangle(GAME_W / 2, GAME_H - 115, 220, 38, 0x338855).setOrigin(0.5).setStrokeStyle(2, 0x44aa66);
      this.add.text(GAME_W / 2, GAME_H - 115, `ADVENTURE! (${this.selectedParty.length})`, { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
      goBg.setInteractive();
      goBg.on("pointerdown", () => this.startAdventure());
    }
  }

  // --- Training: Pokemon select ---
  private drawTrainSelect(): void {
    this.add.text(GAME_W / 2, 24, "TRAIN POKEMON", { fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 48, `Gold: ${this.gameState.gold}`, { fontSize: "12px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 65, "Select a Pokemon — evolutions & new moves first", {
      fontSize: "9px", fontFamily: "monospace", color: "#888888",
    }).setOrigin(0.5);

    this.drawTypeFilterPill(88, () => this.showScreen("train", false));

    const sorted = this.getTrainSortedRoster();
    this.clampListPage(sorted.length);
    const { slice } = this.pagedSlice(sorted);

    if (sorted.length === 0) {
      this.add.text(GAME_W / 2, 300, "No Pokemon match this filter.", {
        fontSize: "12px", fontFamily: "monospace", color: "#667788",
      }).setOrigin(0.5);
      return;
    }

    slice.forEach((pokemon, localIdx) => {
      const y = 118 + localIdx * 58;
      const rosterIdx = this.gameState.roster.indexOf(pokemon);

      const newMoves = countNewMoves(pokemon);
      const evoInfo = getEvolutionInfo(pokemon);
      const canEvolveNow = evoInfo?.canEvolve === true;

      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 50, 0x2a2a3e, 0.9)
        .setOrigin(0.5)
        .setStrokeStyle(1, canEvolveNow ? 0xaa6633 : newMoves > 0 ? 0x558855 : 0x444466);

      if (this.textures.exists(pokemon.species.spriteKey)) {
        const img = this.add.image(GAME_W / 2 - 145, y, pokemon.species.spriteKey).setDisplaySize(34, 34).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      const nameLabel = pokemon.isFavourite ? `★ ${pokemon.species.name}` : pokemon.species.name;
      this.add.text(GAME_W / 2 - 115, y - 10, nameLabel, {
        fontSize: "13px", fontFamily: "monospace",
        color: pokemon.isFavourite ? "#ffcc33" : "#ffffff",
        fontStyle: "bold",
      }).setOrigin(0, 0.5);
      this.add.text(GAME_W / 2 - 115, y + 10, `Lv${pokemon.level}  ${pokemon.moves.length}/4 moves`, {
        fontSize: "10px", fontFamily: "monospace", color: "#888888",
      }).setOrigin(0, 0.5);

      // Right column — badges stack vertically so EVOLVE and "N new" don't overlap.
      const badgeX = GAME_W / 2 + 130;
      if (canEvolveNow && newMoves > 0) {
        this.add.text(badgeX, y - 10, "EVOLVE",
          { fontSize: "9px", fontFamily: "monospace", color: "#ff8844", fontStyle: "bold" }).setOrigin(0.5);
        this.add.text(badgeX, y + 10, `${newMoves} new`,
          { fontSize: "10px", fontFamily: "monospace", color: "#44cc44", fontStyle: "bold" }).setOrigin(0.5);
      } else if (canEvolveNow) {
        this.add.text(badgeX, y, "EVOLVE",
          { fontSize: "10px", fontFamily: "monospace", color: "#ff8844", fontStyle: "bold" }).setOrigin(0.5);
      } else if (newMoves > 0) {
        this.add.text(badgeX, y, `${newMoves} new`,
          { fontSize: "11px", fontFamily: "monospace", color: "#44cc44", fontStyle: "bold" }).setOrigin(0.5);
      }

      cardBg.setInteractive();
      cardBg.on("pointerdown", () => this.drawTrainMoves(rosterIdx));
    });

    this.drawPagination(sorted.length, () => this.showScreen("train", false));
  }

  /**
   * Train-screen ordering (PRD 2026-04-17 §2.9): evolution-ready first,
   * then Pokemon with newly-available moves, then ascending by level.
   * Favourites still bubble to the top within each bucket, and the type
   * filter is applied on top of the ranking.
   */
  private getTrainSortedRoster(): BattlePokemon[] {
    const filtered = this.typeFilter === null
      ? [...this.gameState.roster]
      : this.gameState.roster.filter((p) => p.species.types.includes(this.typeFilter!));

    const rank = (p: BattlePokemon): number => {
      if (getEvolutionInfo(p)?.canEvolve) return 0;
      if (countNewMoves(p) > 0) return 1;
      return 2;
    };

    return filtered.sort((a, b) => {
      const favDiff = (a.isFavourite ? 0 : 1) - (b.isFavourite ? 0 : 1);
      if (favDiff !== 0) return favDiff;
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      // Final tie-break: ascending level (lowest first) per PRD.
      return a.level - b.level || a.species.name.localeCompare(b.species.name);
    });
  }

  // --- Training: Move management for a specific Pokemon ---
  private drawTrainMoves(rosterIndex: number): void {
    this.resetScreen();
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a)
      .setOrigin(0.5)
      .setInteractive();

    const pokemon = this.gameState.roster[rosterIndex];
    const trainable = getTrainableMoves(pokemon);

    // Header
    this.add.text(GAME_W / 2, 20, "TRAIN", { fontSize: "18px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 42, `Gold: ${this.gameState.gold}`, { fontSize: "12px", fontFamily: "monospace", color: "#ffd700" }).setOrigin(0.5);

    // Pokemon info
    if (this.textures.exists(pokemon.species.spriteKey)) {
      const img = this.add.image(30, 68, pokemon.species.spriteKey).setDisplaySize(36, 36).setOrigin(0.5);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.add.text(55, 60, `${pokemon.species.name}  Lv${pokemon.level}`, { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" });
    this.add.text(55, 78, `Moves: ${pokemon.moves.length}/4`, { fontSize: "10px", fontFamily: "monospace", color: "#aaaaaa" });

    // Evolution section — handles both level and stone branches. Stone
    // cards show a non-interactive hint without naming the specific stone
    // (discovery is preserved) per PRD 2026-04-17 §2.6.
    let sectionY = 100;
    const evoInfo = getEvolutionInfo(pokemon);
    const stoneTarget = evoInfo ? null : getStoneEvolutionTarget(pokemon);
    if (evoInfo || stoneTarget) {
      this.add.text(15, sectionY, "EVOLUTION", { fontSize: "11px", fontFamily: "monospace", color: "#ff8844", fontStyle: "bold" });
      sectionY += 18;
      const evoY = sectionY;

      if (evoInfo) {
        const canAffordEvo = this.gameState.gold >= evoInfo.cost;
        const canEvolve = evoInfo.canEvolve && canAffordEvo;

        this.add.rectangle(GAME_W / 2, evoY, 340, 40, canEvolve ? 0x332211 : 0x1a1a22, 0.9).setOrigin(0.5).setStrokeStyle(1, canEvolve ? 0x664422 : 0x333333);

        if (this.textures.exists(evoInfo.evolvedSpecies.spriteKey)) {
          const evoImg = this.add.image(35, evoY, evoInfo.evolvedSpecies.spriteKey).setDisplaySize(28, 28).setOrigin(0.5);
          evoImg.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        const evoName = evoInfo.evolvedSpecies.name;
        if (evoInfo.canEvolve) {
          this.add.text(55, evoY - 7, `Evolve to ${evoName}`, { fontSize: "12px", fontFamily: "monospace", color: canAffordEvo ? "#ffffff" : "#666666", fontStyle: "bold" }).setOrigin(0, 0.5);
          this.add.text(55, evoY + 8, `Ready!`, { fontSize: "9px", fontFamily: "monospace", color: "#ff8844" }).setOrigin(0, 0.5);
          this.add.text(GAME_W - 95, evoY, `${evoInfo.cost}g`, { fontSize: "11px", fontFamily: "monospace", color: canAffordEvo ? "#ffd700" : "#664400", fontStyle: "bold" }).setOrigin(0.5);

          if (canEvolve) {
            const evoBg = this.add.rectangle(GAME_W - 40, evoY, 55, 24, 0x884422).setOrigin(0.5).setStrokeStyle(1, 0xaa6633);
            this.add.text(GAME_W - 40, evoY, "EVOLVE", { fontSize: "8px", fontFamily: "monospace", color: "#ffaa44", fontStyle: "bold" }).setOrigin(0.5);
            evoBg.setInteractive();
            evoBg.on("pointerdown", () => this.evolvePokemon(rosterIndex));
          }
        } else {
          this.add.text(55, evoY - 7, `Evolves to ${evoName}`, { fontSize: "12px", fontFamily: "monospace", color: "#666666" }).setOrigin(0, 0.5);
          this.add.text(55, evoY + 8, `Requires Lv${evoInfo.requiredLevel}`, { fontSize: "9px", fontFamily: "monospace", color: "#555555" }).setOrigin(0, 0.5);
        }
      } else if (stoneTarget) {
        this.add.rectangle(GAME_W / 2, evoY, 340, 40, 0x1a1a22, 0.9)
          .setOrigin(0.5).setStrokeStyle(1, 0x333333);
        if (this.textures.exists(stoneTarget.spriteKey)) {
          const evoImg = this.add.image(35, evoY, stoneTarget.spriteKey).setDisplaySize(28, 28).setOrigin(0.5);
          evoImg.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          evoImg.setTint(0x666677);
        }
        this.add.text(55, evoY - 7, `Evolves to ${stoneTarget.name}`, {
          fontSize: "12px", fontFamily: "monospace", color: "#aaaacc", fontStyle: "bold",
        }).setOrigin(0, 0.5);
        this.add.text(55, evoY + 8, "with a special item", {
          fontSize: "9px", fontFamily: "monospace", color: "#7788aa", fontStyle: "italic",
        }).setOrigin(0, 0.5);
      }

      sectionY = evoY + 30;
    }

    // Layout constants — shared by all Train-screen row builders so section
    // headings, cards, and buttons align on a single column grid per PRD §2.7.
    const ROW_W = 340;
    const ROW_H = 34;
    const ROW_PAD = 4;        // gap between rows within a section
    const SECTION_GAP = 10;   // gap below a section
    const HEADING_GAP = 20;   // from heading baseline to first row center
    const BTN_X = GAME_W - 40;
    const BTN_W = 58;
    const BTN_H = 24;
    const COST_X = GAME_W - 90;

    const drawHeading = (y: number, text: string, color: string): number => {
      this.add.text(20, y, text, {
        fontSize: "11px", fontFamily: "monospace", color, fontStyle: "bold",
      });
      return y + HEADING_GAP;
    };

    const nextRowY = (y: number): number => y + ROW_H + ROW_PAD;

    // --- Current moves section ---
    sectionY = drawHeading(sectionY, "CURRENT MOVES", "#cc88cc");

    pokemon.moves.forEach((move, i) => {
      const y = sectionY + i * (ROW_H + ROW_PAD);
      this.add.rectangle(GAME_W / 2, y, ROW_W, ROW_H, 0x332244).setOrigin(0.5).setStrokeStyle(1, 0x554466);

      this.add.text(25, y - 7, move.name, { fontSize: "12px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5);
      const typeStr = move.type.charAt(0).toUpperCase() + move.type.slice(1);
      this.add.text(25, y + 7, `${typeStr}  Pow:${move.power}  CD:${move.cooldown}`, { fontSize: "8px", fontFamily: "monospace", color: "#888888" }).setOrigin(0, 0.5);

      const forgetBg = this.add.rectangle(BTN_X, y, BTN_W, BTN_H, 0x663333).setOrigin(0.5).setStrokeStyle(1, 0x884444);
      this.add.text(BTN_X, y, "FORGET", { fontSize: "9px", fontFamily: "monospace", color: "#ff6666", fontStyle: "bold" }).setOrigin(0.5);

      const isLastMove = pokemon.moves.length <= 1;
      const isLastCdZero = move.cooldown === 0 &&
        pokemon.moves.filter((m, idx) => idx !== i && m.cooldown === 0).length === 0;

      if (!isLastMove && !isLastCdZero) {
        forgetBg.setInteractive();
        forgetBg.on("pointerdown", () => {
          const forgottenId = pokemon.moves[i].id;
          pokemon.moves.splice(i, 1);
          pokemon.cooldowns.splice(i, 1);
          pushForgotten(pokemon, forgottenId);
          saveGame(this.gameState);
          this.drawTrainMoves(rosterIndex);
        });
      } else {
        forgetBg.setAlpha(0.3);
        forgetBg.setInteractive();
        forgetBg.on("pointerdown", () => {
          const msg = isLastMove
            ? "Must know at least one move."
            : "Must keep at least one no-cooldown move.";
          this.showToast(msg, { color: "#ff8888", sfx: "error" });
        });
      }
    });

    sectionY = sectionY + pokemon.moves.length * (ROW_H + ROW_PAD) + SECTION_GAP;

    // --- Forgotten moves section (relearn free) ---
    const forgottenEntries = (pokemon.forgottenMoves ?? [])
      .filter((id) => !pokemon.moves.some((m) => m.id === id))
      .map((id) => {
        try { return getMove(id); } catch { return null; }
      })
      .filter((m): m is MoveData => m !== null);

    if (forgottenEntries.length > 0) {
      sectionY = drawHeading(sectionY, "FORGOTTEN MOVES — RELEARN FREE", "#88aacc");

      forgottenEntries.forEach((move, i) => {
        const y = sectionY + i * (ROW_H + ROW_PAD);
        if (y + ROW_H > GAME_H - 100) return;
        const hasMoveSlot = pokemon.moves.length < 4;

        this.add.rectangle(GAME_W / 2, y, ROW_W, ROW_H, hasMoveSlot ? 0x223344 : 0x1a1a22, 0.9)
          .setOrigin(0.5).setStrokeStyle(1, hasMoveSlot ? 0x446688 : 0x333333);

        this.add.text(25, y - 7, move.name, {
          fontSize: "11px", fontFamily: "monospace",
          color: hasMoveSlot ? "#ffffff" : "#666666", fontStyle: "bold",
        }).setOrigin(0, 0.5);
        const typeStr = move.type.charAt(0).toUpperCase() + move.type.slice(1);
        this.add.text(25, y + 7, `${typeStr}  Pow:${move.power}  CD:${move.cooldown}`, {
          fontSize: "8px", fontFamily: "monospace", color: "#888888",
        }).setOrigin(0, 0.5);

        if (hasMoveSlot) {
          const relearnBg = this.add.rectangle(BTN_X, y, BTN_W, BTN_H, 0x336677)
            .setOrigin(0.5).setStrokeStyle(1, 0x4488aa);
          this.add.text(BTN_X, y, "RELEARN", {
            fontSize: "8px", fontFamily: "monospace", color: "#aaddff", fontStyle: "bold",
          }).setOrigin(0.5);
          relearnBg.setInteractive();
          relearnBg.on("pointerdown", () => {
            pokemon.moves.push(move);
            pokemon.cooldowns.push(0);
            pokemon.forgottenMoves = (pokemon.forgottenMoves ?? []).filter((id) => id !== move.id);
            saveGame(this.gameState);
            this.drawTrainMoves(rosterIndex);
            this.showToast(
              `${pokemon.species.name} relearned ${move.name}!`,
              { color: "#aaddff", sfx: "learn" }
            );
          });
        } else {
          this.add.text(BTN_X, y, "FULL", {
            fontSize: "9px", fontFamily: "monospace", color: "#886644", fontStyle: "bold",
          }).setOrigin(0.5);
        }
      });

      sectionY = sectionY + forgottenEntries.length * (ROW_H + ROW_PAD) + SECTION_GAP;
    }

    // --- Available moves section ---
    const unlearned = trainable.filter((t) => !t.known && !t.forgotten);

    sectionY = drawHeading(sectionY, "AVAILABLE TO LEARN", "#88cc88");

    if (unlearned.length === 0) {
      this.add.text(GAME_W / 2, sectionY, "No new moves available yet — level up to unlock more.", {
        fontSize: "10px", fontFamily: "monospace", color: "#666666", align: "center",
      }).setOrigin(0.5, 0);
      sectionY += 22;
    } else {
      unlearned.forEach((entry, i) => {
        const y = sectionY + i * (ROW_H + ROW_PAD);
        if (y + ROW_H > GAME_H - 100) return;

        const canAfford = this.gameState.gold >= entry.cost;
        const hasMoveSlot = pokemon.moves.length < 4;
        const canLearn = canAfford && hasMoveSlot;

        this.add.rectangle(GAME_W / 2, y, ROW_W, ROW_H, canLearn ? 0x223322 : 0x1a1a22, 0.9)
          .setOrigin(0.5).setStrokeStyle(1, canLearn ? 0x446644 : 0x333333);

        this.add.text(25, y - 7, entry.move.name, {
          fontSize: "11px", fontFamily: "monospace",
          color: canAfford ? "#ffffff" : "#666666", fontStyle: "bold",
        }).setOrigin(0, 0.5);
        const typeStr = entry.move.type.charAt(0).toUpperCase() + entry.move.type.slice(1);
        this.add.text(25, y + 7, `${typeStr}  Pow:${entry.move.power}  CD:${entry.move.cooldown}  Lv${entry.level}`, {
          fontSize: "8px", fontFamily: "monospace", color: "#888888",
        }).setOrigin(0, 0.5);

        this.add.text(COST_X, y, `${entry.cost}g`, {
          fontSize: "10px", fontFamily: "monospace",
          color: canAfford ? "#ffd700" : "#664400", fontStyle: "bold",
        }).setOrigin(0.5);

        if (canLearn) {
          const learnBg = this.add.rectangle(BTN_X, y, BTN_W, BTN_H, 0x336633)
            .setOrigin(0.5).setStrokeStyle(1, 0x448844);
          this.add.text(BTN_X, y, "LEARN", {
            fontSize: "9px", fontFamily: "monospace", color: "#44ff44", fontStyle: "bold",
          }).setOrigin(0.5);
          learnBg.setInteractive();
          learnBg.on("pointerdown", () => {
            this.gameState.gold -= entry.cost;
            pokemon.moves.push(getMove(entry.moveId));
            pokemon.cooldowns.push(0);
            // Relearning from forgotten (shouldn't happen because we filter
            // by !t.forgotten, but keep the bucket clean in case it does).
            pokemon.forgottenMoves = (pokemon.forgottenMoves ?? [])
              .filter((id) => id !== entry.moveId);
            saveGame(this.gameState);
            this.drawTrainMoves(rosterIndex);
            this.showToast(
              `${pokemon.species.name} learned ${entry.move.name}!  -${entry.cost}g`,
              { color: "#88ff88", sfx: "learn" }
            );
          });
        } else if (!hasMoveSlot) {
          this.add.text(BTN_X, y, "FULL", {
            fontSize: "9px", fontFamily: "monospace", color: "#886644", fontStyle: "bold",
          }).setOrigin(0.5);
        }
      });
      sectionY = sectionY + unlearned.length * (ROW_H + ROW_PAD);
    }

    sectionY += SECTION_GAP;

    // --- TMs section ---
    const ownedTMs = this.gameState.playerItems.filter(
      (b) => b.quantity > 0 && b.item.category === "tm"
    );
    if (ownedTMs.length > 0) {
      sectionY = drawHeading(sectionY, "USE TMs", "#ffcc88");

      ownedTMs.forEach((belt, i) => {
        const y = sectionY + i * (ROW_H + ROW_PAD);
        if (y + ROW_H > GAME_H - 100) return;

        const move = getTMMove(belt.item);
        if (!move) return;

        const check = canUseTM(pokemon, belt.item.id, move.id);
        const canTeach = check.ok;

        this.add.rectangle(GAME_W / 2, y, ROW_W, ROW_H, canTeach ? 0x332a11 : 0x1a1a22, 0.9)
          .setOrigin(0.5).setStrokeStyle(1, canTeach ? 0x665522 : 0x333333);

        this.add.text(25, y - 7, `${belt.item.name.replace("TM ", "")} x${belt.quantity}`, {
          fontSize: "10px", fontFamily: "monospace",
          color: canTeach ? "#ffffff" : "#666666", fontStyle: "bold",
        }).setOrigin(0, 0.5);
        const typeStr = move.type.charAt(0).toUpperCase() + move.type.slice(1);
        this.add.text(25, y + 7, `${typeStr}  Pow:${move.power}  CD:${move.cooldown}`, {
          fontSize: "8px", fontFamily: "monospace", color: "#888888",
        }).setOrigin(0, 0.5);

        if (canTeach) {
          const teachBg = this.add.rectangle(BTN_X, y, BTN_W, BTN_H, 0x554422)
            .setOrigin(0.5).setStrokeStyle(1, 0x886644);
          this.add.text(BTN_X, y, "TEACH", {
            fontSize: "9px", fontFamily: "monospace", color: "#ffcc88", fontStyle: "bold",
          }).setOrigin(0.5);
          teachBg.setInteractive();
          teachBg.on("pointerdown", () => this.applyTM(rosterIndex, belt));
        } else {
          const label = check.label ?? "";
          this.add.text(BTN_X, y, label, {
            fontSize: "8px", fontFamily: "monospace", color: "#886644", fontStyle: "bold",
          }).setOrigin(0.5);
        }
      });
    }

    // Small sanity-guard to stop the bundler complaining about nextRowY being unused.
    void nextRowY;

    // Back button
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 45, 160, 38, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x774444);
    this.add.text(GAME_W / 2, GAME_H - 45, "BACK", { fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.showScreen("train"));
  }

  private evolvePokemon(rosterIndex: number): void {
    const pokemon = this.gameState.roster[rosterIndex];
    const evoInfo = getEvolutionInfo(pokemon);
    if (!evoInfo || !evoInfo.canEvolve || this.gameState.gold < evoInfo.cost) return;

    this.gameState.gold -= evoInfo.cost;
    const oldName = pokemon.species.name;
    evolveIntoSpecies(pokemon, evoInfo.evolvedSpecies);
    saveGame(this.gameState);

    MusicManager.playSFX("purchase");
    this.showEvolutionAnimation(oldName, pokemon, () => this.drawTrainMoves(rosterIndex));
  }

  private applyTM(rosterIndex: number, belt: BattleItem): void {
    const pokemon = this.gameState.roster[rosterIndex];
    const move = getTMMove(belt.item);
    if (!move) return;

    const check = canUseTM(pokemon, belt.item.id, move.id);
    if (!check.ok) return;

    if (pokemon.moves.length < 4) {
      pokemon.moves.push(move);
      pokemon.cooldowns.push(0);
      belt.quantity--;
      saveGame(this.gameState);
      this.drawTrainMoves(rosterIndex);
      this.showToast(`${pokemon.species.name} learned ${move.name}!`, { color: "#ffcc88", sfx: "learn" });
      return;
    }

    // Party has 4 moves — ask which to forget
    this.showTMForgetPicker(rosterIndex, belt, move);
  }

  private showTMForgetPicker(rosterIndex: number, belt: BattleItem, newMove: ReturnType<typeof getMove>): void {
    this.resetScreen();
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a)
      .setOrigin(0.5)
      .setInteractive();

    const pokemon = this.gameState.roster[rosterIndex];

    this.add.text(GAME_W / 2, 30, `TEACH ${newMove.name.toUpperCase()}?`, {
      fontSize: "16px", fontFamily: "monospace", color: "#ffcc88", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 55, `${pokemon.species.name} already knows 4 moves.`, {
      fontSize: "11px", fontFamily: "monospace", color: "#aaaaaa",
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 72, "Pick a move to forget:", {
      fontSize: "11px", fontFamily: "monospace", color: "#aaaaaa",
    }).setOrigin(0.5);

    pokemon.moves.forEach((move, i) => {
      const y = 110 + i * 70;
      const cardBg = this.add.rectangle(GAME_W / 2, y, 340, 54, 0x332244, 0.9).setOrigin(0.5).setStrokeStyle(1, 0x554466);
      this.add.text(25, y - 14, move.name, {
        fontSize: "13px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0, 0.5);
      const typeStr = move.type.charAt(0).toUpperCase() + move.type.slice(1);
      this.add.text(25, y + 5, `${typeStr}  Pow:${move.power}  CD:${move.cooldown}`, {
        fontSize: "9px", fontFamily: "monospace", color: "#888888",
      }).setOrigin(0, 0.5);

      // If the new move has a cooldown and we'd be replacing the last CD-0, block it.
      const replacingLastCdZero = newMove.cooldown > 0 &&
        move.cooldown === 0 &&
        pokemon.moves.filter((m, idx) => idx !== i && m.cooldown === 0).length === 0;

      const btnColor = replacingLastCdZero ? 0x443333 : 0x663333;
      const btnStroke = replacingLastCdZero ? 0x554444 : 0x884444;
      const labelColor = replacingLastCdZero ? "#663333" : "#ff8888";

      const btn = this.add.rectangle(GAME_W - 55, y, 80, 32, btnColor).setOrigin(0.5).setStrokeStyle(1, btnStroke);
      this.add.text(GAME_W - 55, y, "FORGET", {
        fontSize: "10px", fontFamily: "monospace", color: labelColor, fontStyle: "bold",
      }).setOrigin(0.5);
      btn.setInteractive();
      btn.on("pointerdown", () => {
        if (replacingLastCdZero) {
          this.showToast("Must keep at least one no-cooldown move.", { color: "#ff8888", sfx: "error" });
          return;
        }
        const oldMove = pokemon.moves[i];
        pokemon.moves[i] = newMove;
        pokemon.cooldowns[i] = 0;
        pushForgotten(pokemon, oldMove.id);
        // If the new move was in the forgotten bucket, clear it (it's active now).
        pokemon.forgottenMoves = (pokemon.forgottenMoves ?? [])
          .filter((id) => id !== newMove.id);
        belt.quantity--;
        saveGame(this.gameState);
        this.drawTrainMoves(rosterIndex);
        this.showToast(
          `${pokemon.species.name} forgot ${oldMove.name}\nand learned ${newMove.name}!`,
          { color: "#ffcc88", sfx: "learn" }
        );
      });

      // Suppress unused variable warning for cardBg
      void cardBg;
    });

    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 45, 160, 38, 0x553333).setOrigin(0.5).setStrokeStyle(1, 0x774444);
    this.add.text(GAME_W / 2, GAME_H - 45, "CANCEL", { fontSize: "13px", fontFamily: "monospace", color: "#ffffff" }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.drawTrainMoves(rosterIndex));
  }

  /**
   * Pokemon detail screen — shared by the roster, pokedex, party picker and
   * trader screens. Shows a large portrait, stat block (with any vitamin
   * bonuses highlighted), XP progress, evolution line hint, full moveset
   * (each move's type/power/accuracy/cooldown/effect/description), and the
   * Pokedex flavor text. When the target is a species object (pokedex cold
   * lookup) we fall back to the species' learnset at unlock levels.
   */
  private showPokemonDetail(
    target: BattlePokemon | PokemonSpecies,
    returnCtx: DetailReturn,
  ): void {
    this.resetScreen();
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0e0e1a)
      .setOrigin(0.5)
      .setInteractive();

    const isInstance = "species" in target;
    const species = isInstance ? target.species : target;
    const pokemon = isInstance ? target : null;

    // Header — dex number (1-based index into POKEMON order) + name
    const allSpecies = getAllPokemon();
    const dexNum = allSpecies.findIndex((s) => s.id === species.id) + 1;

    this.add.text(20, 22, `#${dexNum.toString().padStart(3, "0")}`, {
      fontSize: "12px", fontFamily: "monospace", color: "#667788", fontStyle: "bold",
    });
    this.add.text(GAME_W / 2, 24, species.name.toUpperCase(), {
      fontSize: "20px", fontFamily: "monospace", color: "#f8d030", fontStyle: "bold",
    }).setOrigin(0.5);
    if (pokemon) {
      this.add.text(GAME_W - 20, 22, `Lv${pokemon.level}`, {
        fontSize: "12px", fontFamily: "monospace", color: "#aaaaaa", fontStyle: "bold",
      }).setOrigin(1, 0);
    }

    // Type chips
    const typeChipsStartX = GAME_W / 2 - (species.types.length - 1) * 36;
    species.types.forEach((t, i) => {
      const chipX = typeChipsStartX + i * 72;
      this.add.rectangle(chipX, 52, 64, 18, TYPE_COLORS[t]).setOrigin(0.5).setStrokeStyle(1, 0x222233);
      this.add.text(chipX, 52, t.toUpperCase(), {
        fontSize: "10px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
      }).setOrigin(0.5);
    });

    // Portrait
    if (this.textures.exists(species.spriteKey)) {
      const img = this.add.image(GAME_W / 2, 120, species.spriteKey).setDisplaySize(96, 96).setOrigin(0.5);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // HP + XP bars (instance only)
    let cursorY = 180;
    if (pokemon) {
      const barW = GAME_W - 80;
      const barX = 40;
      const hpPct = Math.max(0, pokemon.currentHP / pokemon.maxHP);
      this.add.text(barX, cursorY, `HP ${pokemon.currentHP}/${pokemon.maxHP}`, {
        fontSize: "10px", fontFamily: "monospace", color: "#888899",
      });
      this.add.rectangle(barX + barW / 2, cursorY + 16, barW, 6, 0x222233).setOrigin(0.5);
      const hpColor = hpPct > 0.5 ? 0x22cc44 : hpPct > 0.25 ? 0xddcc22 : 0xcc2222;
      if (hpPct > 0) {
        this.add.rectangle(barX, cursorY + 13, barW * hpPct, 6, hpColor).setOrigin(0, 0);
      }
      cursorY += 26;

      const needed = xpToNextLevel(pokemon.level);
      const xpPct = Math.min(pokemon.currentXP / needed, 1);
      this.add.text(barX, cursorY, `XP ${pokemon.currentXP}/${needed}`, {
        fontSize: "10px", fontFamily: "monospace", color: "#4488cc",
      });
      this.add.rectangle(barX + barW / 2, cursorY + 16, barW, 5, 0x222244).setOrigin(0.5);
      if (xpPct > 0) {
        this.add.rectangle(barX, cursorY + 13, barW * xpPct, 5, 0x4488cc).setOrigin(0, 0);
      }
      cursorY += 28;
    } else {
      cursorY += 6;
    }

    // Stats table — 5 rows, each a name + bar + value.
    const statsY = cursorY;
    this.add.text(20, statsY, "STATS", {
      fontSize: "11px", fontFamily: "monospace", color: "#8899aa", fontStyle: "bold",
    });
    const statRows: { label: string; key: keyof typeof species.baseStats }[] = [
      { label: "HP",  key: "hp" },
      { label: "Atk", key: "atk" },
      { label: "Def", key: "def" },
      { label: "Spd", key: "spd" },
      { label: "Spc", key: "spc" },
    ];
    const maxBase = 180; // approximate upper bound for base stats (Chansey HP=250 out-of-scale, clamp anyway)
    statRows.forEach((row, i) => {
      const rowY = statsY + 18 + i * 14;
      const base = species.baseStats[row.key];
      const bonus = pokemon ? pokemon.statBonuses[row.key] : 0;
      this.add.text(22, rowY, row.label, {
        fontSize: "10px", fontFamily: "monospace", color: "#aaaacc",
      });
      // bar
      const barX = 60;
      const barW = 180;
      this.add.rectangle(barX + barW / 2, rowY + 5, barW, 5, 0x222233).setOrigin(0.5);
      const pct = Math.min(1, base / maxBase);
      if (pct > 0) {
        this.add.rectangle(barX, rowY + 3, barW * pct, 5, 0x66aacc).setOrigin(0, 0);
      }
      const valueText = bonus > 0 ? `${base}  +${bonus}` : `${base}`;
      this.add.text(GAME_W - 25, rowY + 3, valueText, {
        fontSize: "10px", fontFamily: "monospace",
        color: bonus > 0 ? "#ffcc66" : "#cccccc", fontStyle: "bold",
      }).setOrigin(1, 0.5);
    });
    cursorY = statsY + 18 + statRows.length * 14 + 4;

    // Evolution hint
    const evo = pokemon ? getEvolutionInfo(pokemon) : null;
    const stoneTarget = pokemon ? getStoneEvolutionTarget(pokemon) : null;
    if (evo) {
      const label = evo.canEvolve
        ? `Ready to evolve → ${evo.evolvedSpecies.name}`
        : `Evolves at Lv${evo.requiredLevel} → ${evo.evolvedSpecies.name}`;
      this.add.text(20, cursorY, label, {
        fontSize: "10px", fontFamily: "monospace",
        color: evo.canEvolve ? "#ff8844" : "#888899",
      });
      cursorY += 14;
    } else if (stoneTarget) {
      this.add.text(20, cursorY, `Evolves to ${stoneTarget.name} with a special item`, {
        fontSize: "10px", fontFamily: "monospace", color: "#888899",
      });
      cursorY += 14;
    }

    // Moves section
    this.add.text(20, cursorY, pokemon ? "MOVES" : "LEARNSET", {
      fontSize: "11px", fontFamily: "monospace", color: "#cc88cc", fontStyle: "bold",
    });
    cursorY += 14;

    const moves: { move: MoveData; sub: string }[] = pokemon
      ? pokemon.moves.map((m) => ({ move: m, sub: "" }))
      : species.movePool
          .map((entry) => ({ move: getMove(entry.moveId), sub: `Lv${entry.level}` }))
          .filter((e) => e.move !== undefined);

    if (moves.length === 0) {
      this.add.text(GAME_W / 2, cursorY + 20, "No moves.", {
        fontSize: "11px", fontFamily: "monospace", color: "#666666",
      }).setOrigin(0.5);
    } else {
      const maxRows = 4;
      const visible = moves.slice(0, maxRows);
      const extra = moves.length - visible.length;
      visible.forEach((entry, i) => {
        const y = cursorY + i * 42;
        if (y + 42 > GAME_H - 80) return;
        this.add.rectangle(GAME_W / 2, y + 18, GAME_W - 40, 38, 0x1a1a2e)
          .setOrigin(0.5).setStrokeStyle(1, 0x333355);

        // Type chip on the left
        this.add.rectangle(40, y + 18, 42, 14, TYPE_COLORS[entry.move.type]).setOrigin(0.5);
        this.add.text(40, y + 18, entry.move.type.substring(0, 4).toUpperCase(), {
          fontSize: "8px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5);

        // Name + sub (Lv unlock)
        this.add.text(70, y + 7, entry.move.name, {
          fontSize: "11px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
        });
        const effectLabel = entry.move.effect
          ? `  ${entry.move.effect.type.toUpperCase()} ${Math.round(entry.move.effect.chance * 100)}%`
          : "";
        this.add.text(70, y + 21, `Pow ${entry.move.power}  Acc ${entry.move.accuracy}  CD ${entry.move.cooldown}${effectLabel}`, {
          fontSize: "8px", fontFamily: "monospace", color: "#8899aa",
        });
        if (entry.sub) {
          this.add.text(GAME_W - 28, y + 7, entry.sub, {
            fontSize: "9px", fontFamily: "monospace", color: "#667788", fontStyle: "bold",
          }).setOrigin(1, 0);
        }
        // Description, truncated to fit
        const desc = entry.move.description.length > 44
          ? entry.move.description.slice(0, 42) + "…"
          : entry.move.description;
        this.add.text(70, y + 32, desc, {
          fontSize: "7px", fontFamily: "monospace", color: "#667788",
        });
      });
      if (extra > 0) {
        const y = cursorY + Math.min(visible.length, maxRows) * 42 + 4;
        if (y < GAME_H - 110) {
          this.add.text(GAME_W / 2, y, `… ${extra} more moves available on the Train screen`, {
            fontSize: "9px", fontFamily: "monospace", color: "#667788", fontStyle: "italic",
          }).setOrigin(0.5);
        }
      }
    }

    // Back button — always routes back to the caller's screen
    const backBg = this.add.rectangle(GAME_W / 2, GAME_H - 45, 200, 38, 0x553333)
      .setOrigin(0.5).setStrokeStyle(1, 0x774444);
    this.add.text(GAME_W / 2, GAME_H - 45, "BACK", {
      fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    backBg.setInteractive();
    backBg.on("pointerdown", () => this.showScreen(returnCtx.screen, false));
  }

  private startAdventure(): void {
    this.gameState.playerParty = this.selectedParty.map((i) => this.gameState.roster[i]);
    for (const p of this.gameState.playerParty) {
      p.currentHP = p.maxHP;
      p.cooldowns = p.cooldowns.map(() => 0);
    }

    // Generate the map for current world/room
    const worldIdx = this.gameState.activeWorld;
    const mapIdx = this.gameState.worlds[worldIdx].currentMap;
    const map = generateDungeon(worldIdx, mapIdx);
    const cx = Math.floor(map.width / 2);
    const cy = Math.floor(map.height / 2);
    map.tiles[cy][cx].type = "floor";
    map.tiles[cy][cx].encounterChance = 0;

    this.gameState.currentMap = map;
    this.gameState.playerX = cx;
    this.gameState.playerY = cy;

    this.registry.set("gameState", this.gameState);
    saveGame(this.gameState);
    MusicManager.stop();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("MapScene");
    });
  }

  private getItemIcon(itemId: string): string {
    switch (itemId) {
      case "potion":
      case "super_potion":
        return "\u2764"; // heart
      case "revive":
        return "\u2606"; // star
      case "escape_rope":
        return "\u21b6"; // return arrow
      case "repel":
        return "\u2668"; // hotsprings
      case "dungeon_map":
        return "\u25a9"; // grid
      case "rare_candy":
        return "\u272a"; // sparkle
      case "hp_up":
      case "protein":
      case "iron":
      case "carbos":
      case "calcium":
        return "\u25b2"; // triangle (vitamin)
      case "fire_stone":
      case "water_stone":
      case "thunder_stone":
      case "leaf_stone":
      case "moon_stone":
        return "\u25c6"; // diamond
      case "x_attack":
      case "x_defend":
      case "x_speed":
      case "x_special":
        return "\u2a2f"; // multiplication x
      default:
        if (itemId.startsWith("tm_")) return "\u25a3"; // square with dot
        return "\u25a0"; // square
    }
  }
}
