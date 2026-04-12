import type { MoveData } from "../types.ts";

export const MOVES: Record<string, MoveData> = {
  // === NORMAL ===
  tackle: { id: "tackle", name: "Tackle", type: "normal", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "A basic charge." },
  scratch: { id: "scratch", name: "Scratch", type: "normal", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "Scratches with claws." },
  pound: { id: "pound", name: "Pound", type: "normal", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "Pounds with fists." },
  quick_attack: { id: "quick_attack", name: "Quick Attack", type: "normal", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "A swift strike." },
  bite: { id: "bite", name: "Bite", type: "normal", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "Bites with fangs." },
  slam: { id: "slam", name: "Slam", type: "normal", power: 50, accuracy: 100, cooldown: 2, category: "physical", description: "Slams the foe." },
  body_slam: { id: "body_slam", name: "Body Slam", type: "normal", power: 55, accuracy: 100, cooldown: 2, category: "physical", description: "A heavy body slam." },
  take_down: { id: "take_down", name: "Take Down", type: "normal", power: 60, accuracy: 100, cooldown: 2, category: "physical", description: "A reckless charge." },
  swift: { id: "swift", name: "Swift", type: "normal", power: 40, accuracy: 100, cooldown: 1, category: "special", description: "Stars that never miss." },
  hyper_beam: { id: "hyper_beam", name: "Hyper Beam", type: "normal", power: 85, accuracy: 100, cooldown: 3, category: "special", description: "A devastating beam." },
  strength: { id: "strength", name: "Strength", type: "normal", power: 50, accuracy: 100, cooldown: 2, category: "physical", description: "A powerful strike." },
  rage: { id: "rage", name: "Rage", type: "normal", power: 20, accuracy: 100, cooldown: 0, category: "physical", description: "An angry attack." },
  wrap: { id: "wrap", name: "Wrap", type: "normal", power: 25, accuracy: 100, cooldown: 1, category: "physical", description: "Wraps and squeezes." },
  sing: { id: "sing", name: "Sing", type: "normal", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "A soothing song. May put foe to sleep.", effect: { type: "sleep", chance: 0.55 } },
  lovely_kiss: { id: "lovely_kiss", name: "Lovely Kiss", type: "normal", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "A scary kiss. May put foe to sleep.", effect: { type: "sleep", chance: 0.75 } },
  glare: { id: "glare", name: "Glare", type: "normal", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "A terrifying glare. May paralyze.", effect: { type: "paralyze", chance: 0.75 } },
  headbutt: { id: "headbutt", name: "Headbutt", type: "normal", power: 45, accuracy: 100, cooldown: 1, category: "physical", description: "A ramming headbutt." },
  double_edge: { id: "double_edge", name: "Double-Edge", type: "normal", power: 70, accuracy: 100, cooldown: 3, category: "physical", description: "A reckless tackle." },
  fury_attack: { id: "fury_attack", name: "Fury Attack", type: "normal", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "Jabs repeatedly." },
  comet_punch: { id: "comet_punch", name: "Comet Punch", type: "normal", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "A flurry of punches." },
  mega_punch: { id: "mega_punch", name: "Mega Punch", type: "normal", power: 50, accuracy: 100, cooldown: 2, category: "physical", description: "A powerful punch." },
  mega_kick: { id: "mega_kick", name: "Mega Kick", type: "normal", power: 70, accuracy: 100, cooldown: 3, category: "physical", description: "A powerful kick." },
  tri_attack: { id: "tri_attack", name: "Tri Attack", type: "normal", power: 50, accuracy: 100, cooldown: 2, category: "special", description: "Three-beam blast." },
  slash: { id: "slash", name: "Slash", type: "normal", power: 45, accuracy: 100, cooldown: 1, category: "physical", description: "Slashes sharply." },
  horn_attack: { id: "horn_attack", name: "Horn Attack", type: "normal", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "Jabs with a horn." },
  horn_drill: { id: "horn_drill", name: "Horn Drill", type: "normal", power: 80, accuracy: 100, cooldown: 3, category: "physical", description: "A drilling horn attack." },
  stomp: { id: "stomp", name: "Stomp", type: "normal", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "Stomps hard." },
  self_destruct: { id: "self_destruct", name: "Self-Destruct", type: "normal", power: 90, accuracy: 100, cooldown: 3, category: "physical", description: "Explodes violently." },
  explosion: { id: "explosion", name: "Explosion", type: "normal", power: 90, accuracy: 100, cooldown: 3, category: "physical", description: "A massive explosion." },

  // === FIRE ===
  ember: { id: "ember", name: "Ember", type: "fire", power: 30, accuracy: 100, cooldown: 1, category: "special", description: "A small flame. May burn.", effect: { type: "burn", chance: 0.1 } },
  fire_punch: { id: "fire_punch", name: "Fire Punch", type: "fire", power: 45, accuracy: 100, cooldown: 1, category: "physical", description: "A fiery punch. May burn.", effect: { type: "burn", chance: 0.1 } },
  flamethrower: { id: "flamethrower", name: "Flamethrower", type: "fire", power: 60, accuracy: 100, cooldown: 2, category: "special", description: "A stream of fire. May burn.", effect: { type: "burn", chance: 0.15 } },
  fire_blast: { id: "fire_blast", name: "Fire Blast", type: "fire", power: 80, accuracy: 100, cooldown: 3, category: "special", description: "An intense fire blast. May burn.", effect: { type: "burn", chance: 0.2 } },
  fire_spin: { id: "fire_spin", name: "Fire Spin", type: "fire", power: 25, accuracy: 100, cooldown: 1, category: "special", description: "Traps in fire." },

  // === WATER ===
  water_gun: { id: "water_gun", name: "Water Gun", type: "water", power: 30, accuracy: 100, cooldown: 1, category: "special", description: "A water blast." },
  bubble: { id: "bubble", name: "Bubble", type: "water", power: 25, accuracy: 100, cooldown: 0, category: "special", description: "Shoots bubbles." },
  bubble_beam: { id: "bubble_beam", name: "Bubble Beam", type: "water", power: 40, accuracy: 100, cooldown: 1, category: "special", description: "A beam of bubbles." },
  surf: { id: "surf", name: "Surf", type: "water", power: 60, accuracy: 100, cooldown: 2, category: "special", description: "A huge wave." },
  hydro_pump: { id: "hydro_pump", name: "Hydro Pump", type: "water", power: 80, accuracy: 100, cooldown: 3, category: "special", description: "A massive torrent." },
  waterfall: { id: "waterfall", name: "Waterfall", type: "water", power: 50, accuracy: 100, cooldown: 2, category: "physical", description: "Charges with water." },
  clamp: { id: "clamp", name: "Clamp", type: "water", power: 25, accuracy: 100, cooldown: 1, category: "physical", description: "Clamps the foe." },
  crabhammer: { id: "crabhammer", name: "Crabhammer", type: "water", power: 60, accuracy: 100, cooldown: 2, category: "physical", description: "A hammer claw." },

  // === GRASS ===
  vine_whip: { id: "vine_whip", name: "Vine Whip", type: "grass", power: 30, accuracy: 100, cooldown: 1, category: "physical", description: "Strikes with vines." },
  razor_leaf: { id: "razor_leaf", name: "Razor Leaf", type: "grass", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "Sharp leaves." },
  solar_beam: { id: "solar_beam", name: "Solar Beam", type: "grass", power: 80, accuracy: 100, cooldown: 3, category: "special", description: "A beam of sunlight." },
  mega_drain: { id: "mega_drain", name: "Mega Drain", type: "grass", power: 30, accuracy: 100, cooldown: 1, category: "special", description: "Drains HP." },
  petal_dance: { id: "petal_dance", name: "Petal Dance", type: "grass", power: 55, accuracy: 100, cooldown: 2, category: "special", description: "A flurry of petals." },
  absorb: { id: "absorb", name: "Absorb", type: "grass", power: 20, accuracy: 100, cooldown: 0, category: "special", description: "Drains a little HP." },
  sleep_powder: { id: "sleep_powder", name: "Sleep Powder", type: "grass", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "May put foe to sleep.", effect: { type: "sleep", chance: 0.5 } },
  stun_spore: { id: "stun_spore", name: "Stun Spore", type: "grass", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "May paralyze.", effect: { type: "paralyze", chance: 0.6 } },
  poison_powder: { id: "poison_powder", name: "Poison Powder", type: "grass", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "Toxic spores. May poison.", effect: { type: "poison", chance: 0.75 } },
  spore: { id: "spore", name: "Spore", type: "grass", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "Deep sleep spores. Likely to sleep.", effect: { type: "sleep", chance: 0.85 } },
  leech_seed: { id: "leech_seed", name: "Leech Seed", type: "grass", power: 20, accuracy: 100, cooldown: 1, category: "special", description: "Plants a seed." },

  // === ELECTRIC ===
  thunder_shock: { id: "thunder_shock", name: "Thunder Shock", type: "electric", power: 30, accuracy: 100, cooldown: 1, category: "special", description: "A jolt of electricity. May paralyze.", effect: { type: "paralyze", chance: 0.1 } },
  thunderbolt: { id: "thunderbolt", name: "Thunderbolt", type: "electric", power: 60, accuracy: 100, cooldown: 2, category: "special", description: "A powerful bolt. May paralyze.", effect: { type: "paralyze", chance: 0.1 } },
  thunder: { id: "thunder", name: "Thunder", type: "electric", power: 80, accuracy: 100, cooldown: 3, category: "special", description: "A devastating bolt. May paralyze.", effect: { type: "paralyze", chance: 0.15 } },
  thunder_wave: { id: "thunder_wave", name: "Thunder Wave", type: "electric", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "May paralyze.", effect: { type: "paralyze", chance: 0.8 } },
  thunder_punch: { id: "thunder_punch", name: "Thunder Punch", type: "electric", power: 45, accuracy: 100, cooldown: 1, category: "physical", description: "An electric punch." },

  // === ROCK ===
  rock_throw: { id: "rock_throw", name: "Rock Throw", type: "rock", power: 35, accuracy: 100, cooldown: 1, category: "physical", description: "Hurls a rock." },
  rock_slide: { id: "rock_slide", name: "Rock Slide", type: "rock", power: 55, accuracy: 100, cooldown: 2, category: "physical", description: "Boulders crash down." },

  // === GROUND ===
  mud_slap: { id: "mud_slap", name: "Mud-Slap", type: "ground", power: 30, accuracy: 100, cooldown: 1, category: "special", description: "Hurls mud." },
  dig: { id: "dig", name: "Dig", type: "ground", power: 50, accuracy: 100, cooldown: 2, category: "physical", description: "Digs then attacks." },
  earthquake: { id: "earthquake", name: "Earthquake", type: "ground", power: 65, accuracy: 100, cooldown: 2, category: "physical", description: "A ground-shaking quake." },
  bone_club: { id: "bone_club", name: "Bone Club", type: "ground", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "Strikes with a bone." },
  bonemerang: { id: "bonemerang", name: "Bonemerang", type: "ground", power: 55, accuracy: 100, cooldown: 2, category: "physical", description: "Throws a boomerang bone." },
  fissure: { id: "fissure", name: "Fissure", type: "ground", power: 80, accuracy: 100, cooldown: 3, category: "physical", description: "Opens a crack." },

  // === PSYCHIC ===
  confusion: { id: "confusion", name: "Confusion", type: "psychic", power: 35, accuracy: 100, cooldown: 1, category: "special", description: "Telekinetic attack." },
  psybeam: { id: "psybeam", name: "Psybeam", type: "psychic", power: 45, accuracy: 100, cooldown: 1, category: "special", description: "A psychic beam." },
  psychic: { id: "psychic", name: "Psychic", type: "psychic", power: 60, accuracy: 100, cooldown: 2, category: "special", description: "A strong psi attack." },
  dream_eater: { id: "dream_eater", name: "Dream Eater", type: "psychic", power: 65, accuracy: 100, cooldown: 3, category: "special", description: "Eats a dream." },
  hypnosis: { id: "hypnosis", name: "Hypnosis", type: "psychic", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "Hypnotic gaze. May cause sleep.", effect: { type: "sleep", chance: 0.6 } },

  // === POISON ===
  poison_sting: { id: "poison_sting", name: "Poison Sting", type: "poison", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "A toxic sting. May poison.", effect: { type: "poison", chance: 0.2 } },
  acid: { id: "acid", name: "Acid", type: "poison", power: 30, accuracy: 100, cooldown: 1, category: "special", description: "Sprays acid." },
  sludge: { id: "sludge", name: "Sludge", type: "poison", power: 40, accuracy: 100, cooldown: 1, category: "special", description: "Hurls sludge. May poison.", effect: { type: "poison", chance: 0.2 } },
  sludge_bomb: { id: "sludge_bomb", name: "Sludge Bomb", type: "poison", power: 60, accuracy: 100, cooldown: 2, category: "special", description: "An explosive sludge. May poison.", effect: { type: "poison", chance: 0.3 } },
  smog: { id: "smog", name: "Smog", type: "poison", power: 25, accuracy: 100, cooldown: 0, category: "special", description: "Noxious gas." },
  toxic: { id: "toxic", name: "Toxic", type: "poison", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "Badly poisons.", effect: { type: "poison", chance: 0.9 } },
  poison_gas: { id: "poison_gas", name: "Poison Gas", type: "poison", power: 0, accuracy: 100, cooldown: 3, category: "special", description: "A cloud of poison gas.", effect: { type: "poison", chance: 0.55 } },

  // === FIGHTING ===
  karate_chop: { id: "karate_chop", name: "Karate Chop", type: "fighting", power: 30, accuracy: 100, cooldown: 0, category: "physical", description: "A sharp chop." },
  low_kick: { id: "low_kick", name: "Low Kick", type: "fighting", power: 35, accuracy: 100, cooldown: 1, category: "physical", description: "A sweeping kick." },
  double_kick: { id: "double_kick", name: "Double Kick", type: "fighting", power: 30, accuracy: 100, cooldown: 1, category: "physical", description: "Kicks twice." },
  submission: { id: "submission", name: "Submission", type: "fighting", power: 50, accuracy: 100, cooldown: 2, category: "physical", description: "A body slam." },
  cross_chop: { id: "cross_chop", name: "Cross Chop", type: "fighting", power: 65, accuracy: 100, cooldown: 2, category: "physical", description: "A double chop." },
  hi_jump_kick: { id: "hi_jump_kick", name: "Hi Jump Kick", type: "fighting", power: 70, accuracy: 100, cooldown: 3, category: "physical", description: "A flying kick." },
  seismic_toss: { id: "seismic_toss", name: "Seismic Toss", type: "fighting", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "A throwing attack." },
  rolling_kick: { id: "rolling_kick", name: "Rolling Kick", type: "fighting", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "A spinning kick." },

  // === FLYING ===
  gust: { id: "gust", name: "Gust", type: "flying", power: 30, accuracy: 100, cooldown: 1, category: "special", description: "A gust of wind." },
  wing_attack: { id: "wing_attack", name: "Wing Attack", type: "flying", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "Strikes with wings." },
  peck: { id: "peck", name: "Peck", type: "flying", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "Pecks sharply." },
  drill_peck: { id: "drill_peck", name: "Drill Peck", type: "flying", power: 50, accuracy: 100, cooldown: 2, category: "physical", description: "A spinning peck." },
  fly: { id: "fly", name: "Fly", type: "flying", power: 55, accuracy: 100, cooldown: 2, category: "physical", description: "Flies up then strikes." },
  sky_attack: { id: "sky_attack", name: "Sky Attack", type: "flying", power: 75, accuracy: 100, cooldown: 3, category: "physical", description: "A powerful dive." },
  aerial_ace: { id: "aerial_ace", name: "Aerial Ace", type: "flying", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "A swift aerial slash." },

  // === BUG ===
  string_shot: { id: "string_shot", name: "String Shot", type: "bug", power: 20, accuracy: 100, cooldown: 0, category: "special", description: "Shoots sticky string." },
  leech_life: { id: "leech_life", name: "Leech Life", type: "bug", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "Drains blood." },
  pin_missile: { id: "pin_missile", name: "Pin Missile", type: "bug", power: 35, accuracy: 100, cooldown: 1, category: "physical", description: "Sharp pins fly." },
  twineedle: { id: "twineedle", name: "Twineedle", type: "bug", power: 35, accuracy: 100, cooldown: 1, category: "physical", description: "Stabs twice." },
  signal_beam: { id: "signal_beam", name: "Signal Beam", type: "bug", power: 50, accuracy: 100, cooldown: 2, category: "special", description: "A peculiar beam." },
  x_scissor: { id: "x_scissor", name: "X-Scissor", type: "bug", power: 55, accuracy: 100, cooldown: 2, category: "physical", description: "Slashes in an X." },
  megahorn: { id: "megahorn", name: "Megahorn", type: "bug", power: 70, accuracy: 100, cooldown: 3, category: "physical", description: "A massive horn charge." },

  // === GHOST ===
  lick: { id: "lick", name: "Lick", type: "ghost", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "Licks eerily." },
  night_shade: { id: "night_shade", name: "Night Shade", type: "ghost", power: 35, accuracy: 100, cooldown: 1, category: "special", description: "Dark illusions." },
  shadow_ball: { id: "shadow_ball", name: "Shadow Ball", type: "ghost", power: 55, accuracy: 100, cooldown: 2, category: "special", description: "A shadowy blob." },
  shadow_punch: { id: "shadow_punch", name: "Shadow Punch", type: "ghost", power: 40, accuracy: 100, cooldown: 1, category: "physical", description: "A ghostly punch." },

  // === ICE ===
  ice_punch: { id: "ice_punch", name: "Ice Punch", type: "ice", power: 45, accuracy: 100, cooldown: 1, category: "physical", description: "An icy fist." },
  ice_beam: { id: "ice_beam", name: "Ice Beam", type: "ice", power: 60, accuracy: 100, cooldown: 2, category: "special", description: "A freezing beam." },
  blizzard: { id: "blizzard", name: "Blizzard", type: "ice", power: 80, accuracy: 100, cooldown: 3, category: "special", description: "A howling blizzard." },
  aurora_beam: { id: "aurora_beam", name: "Aurora Beam", type: "ice", power: 40, accuracy: 100, cooldown: 1, category: "special", description: "A rainbow beam." },
  powder_snow: { id: "powder_snow", name: "Powder Snow", type: "ice", power: 25, accuracy: 100, cooldown: 0, category: "special", description: "Light snow." },
  ice_shard: { id: "ice_shard", name: "Ice Shard", type: "ice", power: 25, accuracy: 100, cooldown: 0, category: "physical", description: "Quick ice attack." },

  // === DRAGON ===
  dragon_rage: { id: "dragon_rage", name: "Dragon Rage", type: "dragon", power: 40, accuracy: 100, cooldown: 1, category: "special", description: "A shockwave." },
  dragon_claw: { id: "dragon_claw", name: "Dragon Claw", type: "dragon", power: 50, accuracy: 100, cooldown: 2, category: "physical", description: "Slashes with claws." },
  outrage: { id: "outrage", name: "Outrage", type: "dragon", power: 70, accuracy: 100, cooldown: 3, category: "physical", description: "A rampage." },
};

export function getMove(id: string): MoveData {
  const move = MOVES[id];
  if (!move) throw new Error(`Unknown move: ${id}`);
  return move;
}
