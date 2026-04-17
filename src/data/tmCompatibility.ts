/**
 * Per-species TM compatibility for Gen 1 TMs the shop currently sells.
 * Mirrors the Bulbapedia Gen 1 TM/HM learnset (with Gen 2+ TMs falling
 * back to their canonical compatibility from the gen they were introduced).
 *
 * Shape: `{ [tmItemId]: speciesId[] }`. The shop TM id keys (not the moveId).
 * Lookup via `canLearnTM(speciesId, tmItemId)` — missing entries mean no
 * species can learn the TM (fail closed).
 *
 * The famous cases this table gets right:
 *   - Clefairy/Clefable learn almost every TM.
 *   - Body Slam is broadly compatible (not just Normal types).
 *   - Ghosts can't learn Body Slam / Headbutt.
 *   - Bug line, Magikarp, Magnemite family have narrow learnsets.
 *   - Ditto and Unown are effectively TM-incompatible.
 */

// --- Convenience group lists (kept here to keep per-TM arrays readable) ---

const STARTERS_FINAL = [
  "bulbasaur", "ivysaur", "venusaur",
  "charmander", "charmeleon", "charizard",
  "squirtle", "wartortle", "blastoise",
];

const NORMAL_BROAD = [
  "rattata", "raticate", "pidgey", "pidgeotto", "pidgeot",
  "spearow", "fearow", "meowth", "persian", "farfetchd",
  "doduo", "dodrio", "lickitung", "chansey", "kangaskhan",
  "tauros", "eevee", "vaporeon", "jolteon", "flareon",
  "porygon", "snorlax",
];

const FIRE_BROAD = [
  "vulpix", "ninetales", "growlithe", "arcanine",
  "ponyta", "rapidash", "magmar", "moltres",
];

const WATER_BROAD = [
  "psyduck", "golduck", "poliwag", "poliwhirl", "poliwrath",
  "tentacool", "tentacruel", "slowpoke", "slowbro",
  "seel", "dewgong", "shellder", "cloyster",
  "krabby", "kingler", "horsea", "seadra",
  "goldeen", "seaking", "staryu", "starmie",
  "lapras", "gyarados",
];

const GRASS_BROAD = [
  "oddish", "gloom", "vileplume",
  "bellsprout", "weepinbell", "victreebel",
  "exeggcute", "exeggutor",
  "paras", "parasect", "tangela",
  "venonat", "venomoth",
];

const ROCK_BROAD = [
  "geodude", "graveler", "golem", "onix",
  "rhyhorn", "rhydon",
  "kabuto", "kabutops", "omanyte", "omastar", "aerodactyl",
];

const GROUND_BROAD = [
  "sandshrew", "sandslash", "diglett", "dugtrio",
  "cubone", "marowak",
];

const POISON_BROAD = [
  "ekans", "arbok",
  "nidoran_f", "nidorina", "nidoqueen",
  "nidoran_m", "nidorino", "nidoking",
  "grimer", "muk", "koffing", "weezing",
];

const ELECTRIC_ARMED = [
  "pikachu", "raichu", "voltorb", "electrode", "electabuzz", "jolteon", "zapdos",
];

const PSYCHIC_BROAD = [
  "abra", "kadabra", "alakazam",
  "slowpoke", "slowbro", "drowzee", "hypno",
  "mr_mime", "jynx", "mewtwo", "mew",
];

const FIGHTING_BROAD = [
  "mankey", "primeape",
  "machop", "machoke", "machamp",
  "hitmonlee", "hitmonchan", "poliwrath",
];

const FAIRY_PUFF = [
  "clefairy", "clefable", "jigglypuff", "wigglytuff",
];

const ICE_BROAD = [
  "lapras", "articuno", "dewgong", "cloyster", "jynx",
];

const DRAGON_BROAD = [
  "dratini", "dragonair", "dragonite",
];

const BUG_BROAD = [
  "scyther", "pinsir",
];

// Species that broadly can learn most TMs in Gen 1 (arms + not-ghost + not-bug-pre-evo).
const BROAD_TM_LEARNERS = [
  ...STARTERS_FINAL,
  ...NORMAL_BROAD,
  ...FIRE_BROAD,
  ...WATER_BROAD,
  ...GRASS_BROAD,
  ...ROCK_BROAD,
  ...GROUND_BROAD,
  ...POISON_BROAD,
  ...ELECTRIC_ARMED,
  ...PSYCHIC_BROAD,
  ...FIGHTING_BROAD,
  ...FAIRY_PUFF,
  ...ICE_BROAD,
  ...DRAGON_BROAD,
  ...BUG_BROAD,
];

// --- Per-TM compatibility ---

// Body Slam (TM08) — the famously broad one. Essentially every species with
// a body, including bird/flying and many of the odd types. Excludes bugs
// (pre-evos), ghosts, Magikarp/Magnemite line, Ditto, Zubat/Golbat.
const BODY_SLAM_SPECIES = dedupe([
  ...BROAD_TM_LEARNERS,
]);

// Headbutt (Gen 2 TM02) — broad, similar to Body Slam but excludes the
// bipedal-with-arms-only restriction. Most mammals, birds, big reptiles.
const HEADBUTT_SPECIES = dedupe([
  ...STARTERS_FINAL,
  ...NORMAL_BROAD,
  ...FIRE_BROAD,
  "psyduck", "golduck",
  "poliwag", "poliwhirl", "poliwrath",
  "slowpoke", "slowbro",
  "krabby", "kingler",
  "goldeen", "seaking",
  "horsea", "seadra",
  "lapras", "gyarados",
  ...GRASS_BROAD,
  ...ROCK_BROAD,
  ...GROUND_BROAD,
  "ekans", "arbok",
  "nidoran_f", "nidorina", "nidoqueen",
  "nidoran_m", "nidorino", "nidoking",
  ...FIGHTING_BROAD,
  ...FAIRY_PUFF,
  ...DRAGON_BROAD,
  "pinsir",
  "pikachu", "raichu",
  "drowzee", "hypno",
  "mr_mime",
  "abra", "kadabra", "alakazam",
  "mewtwo", "mew",
  "eevee", "vaporeon", "jolteon", "flareon",
  "porygon",
]);

// Thunderbolt (TM24) — learnable by electric-types and many with hands / conductive body.
const THUNDERBOLT_SPECIES = dedupe([
  "pikachu", "raichu",
  "magnemite", "magneton",
  "voltorb", "electrode",
  "electabuzz", "zapdos",
  "jolteon",
  // starters + mixed
  ...STARTERS_FINAL,
  "rattata", "raticate",
  ...NORMAL_BROAD.filter(s => s !== "farfetchd" && s !== "doduo" && s !== "dodrio"),
  ...POISON_BROAD,
  "clefairy", "clefable",
  "jigglypuff", "wigglytuff",
  ...PSYCHIC_BROAD,
  "tentacool", "tentacruel",
  "psyduck", "golduck",
  "poliwag", "poliwhirl", "poliwrath",
  "slowpoke", "slowbro",
  "horsea", "seadra",
  "goldeen", "seaking",
  "staryu", "starmie",
  "lapras", "gyarados",
  ...DRAGON_BROAD,
  "mewtwo", "mew",
]);

// Flamethrower (not a Gen 1 TM; using canonical Gen 2 TM35 compatibility).
// Fire-types + dragons + some psychics / special attackers.
const FLAMETHROWER_SPECIES = dedupe([
  "charmander", "charmeleon", "charizard",
  ...FIRE_BROAD,
  ...DRAGON_BROAD,
  "mewtwo", "mew",
  "clefairy", "clefable",
  "jigglypuff", "wigglytuff",
  "eevee", "flareon",
  "magmar", "moltres",
  "pidgey", "pidgeotto", "pidgeot",
  "spearow", "fearow",
  "rattata", "raticate",
  "meowth", "persian",
  "alakazam",
  "mr_mime",
  "lickitung",
  "chansey",
  "kangaskhan",
  "tauros",
  "porygon",
  "snorlax",
  "farfetchd",
]);

// Ice Beam (TM13) — broadly compatible in Gen 1.
const ICE_BEAM_SPECIES = dedupe([
  ...STARTERS_FINAL,
  ...NORMAL_BROAD,
  ...ICE_BROAD,
  ...WATER_BROAD,
  "gyarados",
  ...PSYCHIC_BROAD,
  ...DRAGON_BROAD,
  "clefairy", "clefable",
  "jigglypuff", "wigglytuff",
  "tangela",
  "poliwag", "poliwhirl", "poliwrath",
  "tentacool", "tentacruel",
  "shellder", "cloyster",
  "seadra", "horsea",
  "goldeen", "seaking",
  "staryu", "starmie",
  "krabby", "kingler",
  "omanyte", "omastar",
  "kabuto", "kabutops",
  "seel", "dewgong",
  "articuno",
  "mew", "mewtwo",
]);

// Psychic (TM29) — very broadly compatible in Gen 1 (almost every species).
const PSYCHIC_SPECIES = dedupe([
  ...STARTERS_FINAL,
  ...NORMAL_BROAD,
  ...PSYCHIC_BROAD,
  ...WATER_BROAD,
  ...GRASS_BROAD,
  ...FIRE_BROAD,
  ...POISON_BROAD,
  ...ICE_BROAD,
  ...ROCK_BROAD,
  ...FIGHTING_BROAD,
  ...FAIRY_PUFF,
  ...DRAGON_BROAD,
  ...ELECTRIC_ARMED,
  "rattata", "raticate",
  "sandshrew", "sandslash",
  "diglett", "dugtrio",
  "cubone", "marowak",
  "lickitung",
  "chansey",
  "tauros",
  "kangaskhan",
  "gastly", "haunter", "gengar",
  "scyther", "pinsir",
  "gyarados",
]);

// Earthquake (TM26) — land-based physical attackers.
const EARTHQUAKE_SPECIES = dedupe([
  ...STARTERS_FINAL,
  ...GROUND_BROAD,
  ...ROCK_BROAD,
  ...FIGHTING_BROAD,
  ...NORMAL_BROAD.filter(s => s !== "pidgey" && s !== "pidgeotto" && s !== "pidgeot" && s !== "spearow" && s !== "fearow" && s !== "doduo" && s !== "dodrio" && s !== "farfetchd"),
  ...POISON_BROAD,
  "rattata", "raticate",
  "nidoqueen", "nidoking",
  "rhyhorn", "rhydon",
  "onix",
  "lickitung",
  "chansey",
  "tauros",
  "kangaskhan",
  "snorlax",
  ...DRAGON_BROAD,
  "mewtwo", "mew",
  "cubone", "marowak",
  "exeggcute", "exeggutor",
  "hitmonlee", "hitmonchan",
  "koffing", "weezing",
  "grimer", "muk",
  "arbok", "ekans",
  "pikachu", "raichu",
  "meowth", "persian",
  "clefairy", "clefable",
  "jigglypuff", "wigglytuff",
  "machop", "machoke", "machamp",
  "poliwrath", "poliwhirl", "poliwag",
  "slowpoke", "slowbro",
  "mankey", "primeape",
  "drowzee", "hypno",
  "abra", "kadabra", "alakazam",
  "mr_mime",
  "jynx",
  "electabuzz", "magmar",
  "tangela",
]);

// Surf (HM03) — water types + some amphibious / big species.
const SURF_SPECIES = dedupe([
  "squirtle", "wartortle", "blastoise",
  ...WATER_BROAD,
  "tentacool", "tentacruel",
  "poliwag", "poliwhirl", "poliwrath",
  "psyduck", "golduck",
  "shellder", "cloyster",
  "krabby", "kingler",
  "horsea", "seadra",
  "goldeen", "seaking",
  "staryu", "starmie",
  "magikarp", "gyarados",
  "lapras",
  "seel", "dewgong",
  "omanyte", "omastar",
  "kabuto", "kabutops",
  "dratini", "dragonair", "dragonite",
  "mew",
  "slowpoke", "slowbro",
  "articuno",
]);

// Shadow Ball (Gen 2 TM30) — broad: most species with a special-attack option.
const SHADOW_BALL_SPECIES = dedupe([
  ...STARTERS_FINAL,
  "gastly", "haunter", "gengar",
  ...PSYCHIC_BROAD,
  "clefairy", "clefable",
  "jigglypuff", "wigglytuff",
  "vulpix", "ninetales",
  "meowth", "persian",
  "growlithe", "arcanine",
  "eevee", "vaporeon", "jolteon", "flareon",
  "porygon",
  "snorlax",
  "chansey",
  "kangaskhan",
  "tauros",
  "rattata", "raticate",
  "pidgey", "pidgeotto", "pidgeot",
  ...POISON_BROAD,
  ...FIRE_BROAD,
  ...WATER_BROAD,
  "lapras",
  ...DRAGON_BROAD,
  "mew", "mewtwo",
  "zapdos", "articuno", "moltres",
  "lickitung",
  ...ROCK_BROAD,
  ...GROUND_BROAD,
  "scyther", "pinsir",
  "tangela",
  "exeggcute", "exeggutor",
  "paras", "parasect",
  "venonat", "venomoth",
]);

// Hyper Beam (TM15) — very broadly compatible in Gen 1, most species can learn.
const HYPER_BEAM_SPECIES = dedupe([
  ...BROAD_TM_LEARNERS,
  "gyarados",
  "magneton",
  "gastly", "haunter", "gengar",
  "articuno", "zapdos", "moltres",
]);

// Fire Blast (TM38) — Fire types + some mixed.
const FIRE_BLAST_SPECIES = dedupe([
  "charmander", "charmeleon", "charizard",
  ...FIRE_BROAD,
  "clefairy", "clefable",
  "jigglypuff", "wigglytuff",
  ...DRAGON_BROAD,
  "mewtwo", "mew",
  "flareon", "eevee",
  "magmar", "moltres",
  "rapidash", "ponyta",
  "ninetales", "vulpix",
  "arcanine", "growlithe",
]);

// Hydro Pump (not a Gen 1 TM; water types + mixed).
const HYDRO_PUMP_SPECIES = dedupe([
  "squirtle", "wartortle", "blastoise",
  ...WATER_BROAD,
  "tentacool", "tentacruel",
  "lapras",
  "horsea", "seadra",
  "poliwag", "poliwhirl", "poliwrath",
  "psyduck", "golduck",
  "shellder", "cloyster",
  "staryu", "starmie",
  "goldeen", "seaking",
  "krabby", "kingler",
  "magikarp", "gyarados",
  "omanyte", "omastar",
  "kabuto", "kabutops",
  "dratini", "dragonair", "dragonite",
  "mew",
]);

// Blizzard (TM14) — broad Gen 1, similar spread to Ice Beam.
const BLIZZARD_SPECIES = dedupe([
  ...ICE_BEAM_SPECIES,
]);

// Thunder (TM25) — broad Gen 1, similar spread to Thunderbolt.
const THUNDER_SPECIES = dedupe([
  ...THUNDERBOLT_SPECIES,
]);

// --- Dispatch table (keyed by TM item id) ---

export const TM_COMPAT: Record<string, readonly string[]> = {
  tm_body_slam: BODY_SLAM_SPECIES,
  tm_headbutt: HEADBUTT_SPECIES,
  tm_thunderbolt: THUNDERBOLT_SPECIES,
  tm_flamethrower: FLAMETHROWER_SPECIES,
  tm_ice_beam: ICE_BEAM_SPECIES,
  tm_psychic: PSYCHIC_SPECIES,
  tm_earthquake: EARTHQUAKE_SPECIES,
  tm_surf: SURF_SPECIES,
  tm_shadow_ball: SHADOW_BALL_SPECIES,
  tm_hyper_beam: HYPER_BEAM_SPECIES,
  tm_fire_blast: FIRE_BLAST_SPECIES,
  tm_hydro_pump: HYDRO_PUMP_SPECIES,
  tm_blizzard: BLIZZARD_SPECIES,
  tm_thunder: THUNDER_SPECIES,
};

export function canLearnTM(speciesId: string, tmItemId: string): boolean {
  const list = TM_COMPAT[tmItemId];
  return list ? list.includes(speciesId) : false;
}

// --- helpers ---

function dedupe(list: string[]): readonly string[] {
  return Array.from(new Set(list));
}
