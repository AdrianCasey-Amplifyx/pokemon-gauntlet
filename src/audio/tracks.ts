// Original chiptune tracks authored for Pokemon Gauntlet. Each track
// is deliberately its own piece — it does not attempt to evoke any
// specific published composition. The aesthetic target is "small
// Game Boy RPG": square-wave lead over a triangle-wave bass, simple
// diatonic melodies, standard I-IV-V / i-VI-VII chord progressions,
// 4-8 bar repeating phrases.
//
// MusicManager schedules each channel on a Web Audio oscillator at
// runtime; no sampled audio is loaded.

export type TrackId =
  | "title"
  | "lab"
  | "town"
  | "world0"
  | "world1"
  | "world2"
  | "world3"
  | "world4"
  | "world5"
  | "world6"
  | "world7"
  | "battle_wild"
  | "battle_boss"
  | "battle_final"
  | "none";

export interface TrackChannel {
  wave: OscillatorType;
  volume: number;
  /** Sequence of notes. `note: null` = rest. `beats` are in quarter notes. */
  notes: Array<{ note: string | null; beats: number }>;
}

export interface TrackDef {
  /** Beats per minute; one beat = one quarter note. */
  bpm: number;
  channels: TrackChannel[];
}

const n = (note: string, beats: number) => ({ note, beats });
const r = (beats: number) => ({ note: null, beats });

// =====================================================================
// Title — grand C-major fanfare
// =====================================================================
const TITLE_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.12,
  notes: [
    n("C5", 1), n("E5", 1), n("G5", 2),
    n("A5", 1), n("G5", 1), n("E5", 1), n("C5", 1),
    n("D5", 1), n("F5", 1), n("A5", 2),
    n("G5", 1), n("E5", 1), n("C5", 2),
    n("E5", 1), n("G5", 1), n("C6", 2),
    n("B5", 1), n("A5", 1), n("G5", 2),
    n("F5", 1), n("E5", 1), n("D5", 1), n("F5", 1),
    n("E5", 2), n("C5", 2),
  ],
};
const TITLE_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.11,
  notes: [
    n("C3", 2), n("G3", 2),
    n("F3", 2), n("C3", 2),
    n("D3", 2), n("G3", 2),
    n("C3", 2), n("C3", 2),
    n("C3", 2), n("E3", 2),
    n("F3", 2), n("G3", 2),
    n("A3", 2), n("D3", 2),
    n("G3", 2), n("C3", 2),
  ],
};

// =====================================================================
// Lab — curious A-major figure with off-beat accents
// =====================================================================
const LAB_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    r(0.5), n("E5", 0.5), n("A5", 1), r(0.5), n("C#5", 0.5), n("E5", 1),
    r(0.5), n("F#5", 0.5), n("D5", 1), r(0.5), n("A4", 0.5), n("C#5", 1),
    n("E5", 0.5), n("F#5", 0.5), n("A5", 1), n("G#5", 0.5), n("F#5", 0.5), n("E5", 1),
    n("B4", 0.5), n("C#5", 0.5), n("D5", 1), n("C#5", 0.5), n("B4", 0.5), n("A4", 1),
  ],
};
const LAB_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("A2", 1), n("A3", 1), n("A2", 1), n("A3", 1),
    n("D3", 1), n("D4", 1), n("A2", 1), n("A3", 1),
    n("E3", 1), n("E4", 1), n("A2", 1), n("A3", 1),
    n("D3", 1), n("E3", 1), n("A2", 2),
  ],
};

// =====================================================================
// Town — gentle G-major hub theme
// =====================================================================
const TOWN_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("G4", 1), n("B4", 0.5), n("D5", 0.5), n("G5", 1), n("D5", 1),
    n("E5", 0.5), n("D5", 0.5), n("B4", 1), n("A4", 1), n("G4", 1),
    n("A4", 1), n("C5", 0.5), n("E5", 0.5), n("A5", 1), n("E5", 1),
    n("F#5", 0.5), n("E5", 0.5), n("D5", 1), n("C5", 1), n("B4", 1),
    n("D5", 0.5), n("E5", 0.5), n("G5", 1), n("E5", 1), n("D5", 1),
    n("C5", 0.5), n("B4", 0.5), n("A4", 1), n("B4", 1), n("G4", 1),
    n("D5", 1), n("C5", 1), n("B4", 1), n("A4", 1),
    n("B4", 1), n("A4", 1), n("G4", 2),
  ],
};
const TOWN_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("G2", 2), n("D3", 2),
    n("E3", 2), n("C3", 2),
    n("A2", 2), n("E3", 2),
    n("D3", 2), n("G2", 2),
    n("C3", 2), n("G3", 2),
    n("A2", 2), n("D3", 2),
    n("G2", 2), n("D3", 2),
    n("G2", 4),
  ],
};

// =====================================================================
// World 0 "Viridian Path" — upbeat D-major walking theme
// =====================================================================
const WORLD0_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("D5", 0.5), n("F#5", 0.5), n("A5", 0.5), n("F#5", 0.5),
    n("D5", 0.5), n("A4", 0.5), n("F#4", 0.5), n("A4", 0.5),
    n("G5", 0.5), n("E5", 0.5), n("C#5", 0.5), n("E5", 0.5),
    n("G5", 0.5), n("E5", 0.5), n("A4", 1),
    n("A5", 0.5), n("G5", 0.5), n("F#5", 0.5), n("E5", 0.5),
    n("D5", 0.5), n("E5", 0.5), n("F#5", 1),
    n("G5", 0.5), n("F#5", 0.5), n("E5", 0.5), n("D5", 0.5),
    n("C#5", 1), n("A4", 1),
  ],
};
const WORLD0_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("D3", 1), n("A3", 1), n("D3", 1), n("A3", 1),
    n("A2", 1), n("E3", 1), n("A2", 1), n("E3", 1),
    n("D3", 1), n("A3", 1), n("G2", 1), n("D3", 1),
    n("A2", 1), n("E3", 1), n("D3", 2),
  ],
};

// =====================================================================
// World 1 "Mt. Moon Depths" — sparse A-minor cavern
// =====================================================================
const WORLD1_MELODY: TrackChannel = {
  wave: "triangle",
  volume: 0.11,
  notes: [
    n("A4", 2), r(0.5), n("C5", 0.5), n("E5", 1),
    n("D5", 2), n("B4", 1), n("A4", 1),
    n("E5", 1), n("F5", 1), n("E5", 1), n("D5", 1),
    n("C5", 2), n("A4", 2),
    n("E4", 1), n("A4", 1), n("C5", 1), n("E5", 1),
    n("D5", 2), n("B4", 2),
    n("A4", 1), n("B4", 1), n("C5", 1), n("E5", 1),
    n("A4", 4),
  ],
};
const WORLD1_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.08,
  notes: [
    n("A2", 4), n("F2", 4),
    n("G2", 4), n("E2", 4),
    n("A2", 4), n("D3", 4),
    n("E3", 4), n("A2", 4),
  ],
};

// =====================================================================
// World 2 "Cerulean Caves" — flowing E-major current
// =====================================================================
const WORLD2_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("E5", 0.5), n("F#5", 0.5), n("G#5", 0.5), n("A5", 0.5),
    n("B5", 0.5), n("A5", 0.5), n("G#5", 1),
    n("F#5", 0.5), n("G#5", 0.5), n("A5", 0.5), n("B5", 0.5),
    n("C#6", 0.5), n("B5", 0.5), n("A5", 1),
    n("G#5", 0.5), n("A5", 0.5), n("B5", 0.5), n("C#6", 0.5),
    n("B5", 0.5), n("A5", 0.5), n("G#5", 1),
    n("F#5", 0.5), n("E5", 0.5), n("D#5", 0.5), n("E5", 0.5),
    n("B4", 2),
  ],
};
const WORLD2_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("E3", 2), n("B3", 2),
    n("A3", 2), n("E3", 2),
    n("C#3", 2), n("G#3", 2),
    n("B2", 2), n("E3", 2),
  ],
};

// =====================================================================
// World 3 "Vermilion Docks" — stately A-major march
// =====================================================================
const WORLD3_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("A4", 0.75), n("C#5", 0.25), n("E5", 1), n("A4", 0.75), n("C#5", 0.25), n("E5", 1),
    n("D5", 0.75), n("F#5", 0.25), n("A5", 1), n("D5", 0.75), n("F#5", 0.25), n("A5", 1),
    n("E5", 0.75), n("G#5", 0.25), n("B5", 1), n("A5", 0.5), n("G#5", 0.5), n("F#5", 1),
    n("E5", 0.75), n("D5", 0.25), n("C#5", 1), n("B4", 0.5), n("C#5", 0.5), n("A4", 1),
  ],
};
const WORLD3_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("A2", 1), n("E3", 1), n("A2", 1), n("E3", 1),
    n("D3", 1), n("A3", 1), n("D3", 1), n("A3", 1),
    n("E3", 1), n("B3", 1), n("F#3", 1), n("C#4", 1),
    n("A2", 1), n("E3", 1), n("A2", 2),
  ],
};

// =====================================================================
// World 4 "Celadon Gardens" — cheerful G-major urban
// =====================================================================
const WORLD4_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("G5", 0.5), n("D5", 0.5), n("G5", 0.5), n("B5", 0.5),
    n("A5", 0.5), n("G5", 0.5), n("F#5", 0.5), n("D5", 0.5),
    n("E5", 0.5), n("B4", 0.5), n("E5", 0.5), n("G5", 0.5),
    n("F#5", 0.5), n("E5", 0.5), n("D5", 1),
    n("C5", 0.5), n("A4", 0.5), n("C5", 0.5), n("E5", 0.5),
    n("D5", 0.5), n("C5", 0.5), n("B4", 1),
    n("D5", 0.5), n("E5", 0.5), n("F#5", 0.5), n("G5", 0.5),
    n("A5", 0.5), n("G5", 0.5), n("G5", 1),
  ],
};
const WORLD4_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("G2", 1), n("D3", 1), n("G3", 1), n("D3", 1),
    n("C3", 1), n("G3", 1), n("D3", 1), n("D3", 1),
    n("A2", 1), n("E3", 1), n("A3", 1), n("E3", 1),
    n("D3", 1), n("D3", 1), n("G2", 2),
  ],
};

// =====================================================================
// World 5 "Saffron Tower" — tense E-minor climb
// =====================================================================
const WORLD5_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("E5", 0.5), n("F#5", 0.5), n("G5", 0.5), n("A5", 0.5),
    n("B5", 1), n("G5", 1),
    n("F#5", 0.5), n("G5", 0.5), n("A5", 0.5), n("B5", 0.5),
    n("C6", 1), n("A5", 1),
    n("G5", 0.5), n("A5", 0.5), n("B5", 0.5), n("C6", 0.5),
    n("D6", 1), n("B5", 1),
    n("C6", 0.5), n("B5", 0.5), n("A5", 0.5), n("G5", 0.5),
    n("F#5", 1), n("E5", 1),
  ],
};
const WORLD5_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("E3", 2), n("E3", 2),
    n("A2", 2), n("A2", 2),
    n("D3", 2), n("D3", 2),
    n("B2", 2), n("E3", 2),
  ],
};

// =====================================================================
// World 6 "Cinnabar Volcano" — slow F-minor dirge
// =====================================================================
const WORLD6_MELODY: TrackChannel = {
  wave: "triangle",
  volume: 0.11,
  notes: [
    n("F4", 2), n("Ab4", 2),
    n("C5", 1), n("Db5", 1), n("C5", 2),
    n("Bb4", 2), n("G4", 2),
    n("Ab4", 1), n("G4", 1), n("F4", 2),
    n("Eb5", 2), n("Db5", 2),
    n("C5", 1), n("Bb4", 1), n("Ab4", 2),
    n("G4", 1), n("Ab4", 1), n("Bb4", 1), n("C5", 1),
    n("F4", 4),
  ],
};
const WORLD6_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("F2", 4), n("Db3", 4),
    n("Bb2", 4), n("F2", 4),
    n("Ab2", 4), n("Eb3", 4),
    n("Bb2", 2), n("C3", 2), n("F2", 4),
  ],
};

// =====================================================================
// World 7 "Indigo Plateau" — broad F-major anthem
// =====================================================================
const WORLD7_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.12,
  notes: [
    n("F5", 1), n("A5", 1), n("C6", 2),
    n("Bb5", 1), n("A5", 1), n("G5", 2),
    n("A5", 1), n("Bb5", 1), n("C6", 1), n("D6", 1),
    n("C6", 2), n("A5", 2),
    n("D6", 1), n("C6", 1), n("Bb5", 1), n("A5", 1),
    n("G5", 2), n("Bb5", 2),
    n("A5", 1), n("G5", 1), n("F5", 1), n("A5", 1),
    n("F5", 4),
  ],
};
const WORLD7_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.10,
  notes: [
    n("F3", 2), n("C4", 2),
    n("Bb3", 2), n("F3", 2),
    n("D3", 2), n("A3", 2),
    n("G3", 2), n("C4", 2),
    n("Bb3", 2), n("F3", 2),
    n("D3", 2), n("G3", 2),
    n("F3", 2), n("C4", 2),
    n("F3", 4),
  ],
};

// =====================================================================
// Battle (wild) — driving C-major pulse
// =====================================================================
const BATTLE_WILD_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("C5", 0.5), n("E5", 0.5), n("G5", 0.5), n("C6", 0.5),
    n("G5", 0.5), n("E5", 0.5), n("C5", 1),
    n("D5", 0.5), n("F5", 0.5), n("A5", 0.5), n("D6", 0.5),
    n("A5", 0.5), n("F5", 0.5), n("D5", 1),
    n("E5", 0.5), n("G5", 0.5), n("C6", 0.5), n("E6", 0.5),
    n("D6", 0.5), n("B5", 0.5), n("G5", 1),
    n("F5", 0.5), n("E5", 0.5), n("D5", 0.5), n("E5", 0.5),
    n("C5", 2),
  ],
};
const BATTLE_WILD_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("C3", 0.5), n("G3", 0.5), n("C3", 0.5), n("G3", 0.5),
    n("C3", 0.5), n("G3", 0.5), n("C3", 1),
    n("F3", 0.5), n("C4", 0.5), n("F3", 0.5), n("C4", 0.5),
    n("F3", 0.5), n("C4", 0.5), n("F3", 1),
    n("C3", 0.5), n("E3", 0.5), n("G3", 0.5), n("C4", 0.5),
    n("G3", 0.5), n("D3", 0.5), n("G3", 1),
    n("F3", 0.5), n("C3", 0.5), n("G3", 0.5), n("G3", 0.5),
    n("C3", 2),
  ],
};

// =====================================================================
// Battle (boss) — dramatic E-minor drive
// =====================================================================
const BATTLE_BOSS_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("E5", 0.5), n("B4", 0.5), n("E5", 0.5), n("G5", 0.5),
    n("B5", 1), n("G5", 1),
    n("A5", 0.5), n("E5", 0.5), n("A5", 0.5), n("C6", 0.5),
    n("E6", 1), n("C6", 1),
    n("D6", 0.5), n("C6", 0.5), n("B5", 0.5), n("A5", 0.5),
    n("G5", 0.5), n("F#5", 0.5), n("E5", 1),
    n("F#5", 0.5), n("G5", 0.5), n("A5", 0.5), n("B5", 0.5),
    n("E5", 2),
  ],
};
const BATTLE_BOSS_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.10,
  notes: [
    n("E3", 0.5), n("B3", 0.5), n("E3", 0.5), n("B3", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("E3", 1),
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("E3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("A2", 1),
    n("D3", 0.5), n("A3", 0.5), n("C3", 0.5), n("G3", 0.5),
    n("B2", 0.5), n("F#3", 0.5), n("E3", 1),
    n("B2", 0.5), n("F#3", 0.5), n("E3", 0.5), n("B3", 0.5),
    n("E3", 2),
  ],
};

// =====================================================================
// Battle (final) — climactic C-minor sweep
// =====================================================================
const BATTLE_FINAL_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.12,
  notes: [
    n("C5", 1), n("Eb5", 1), n("G5", 2),
    n("Ab5", 1), n("G5", 1), n("F5", 1), n("Eb5", 1),
    n("D5", 1), n("F5", 1), n("Ab5", 2),
    n("G5", 1), n("Eb5", 1), n("C5", 2),
    n("C6", 1), n("Bb5", 1), n("Ab5", 1), n("G5", 1),
    n("F5", 2), n("Eb5", 2),
    n("G5", 1), n("F5", 1), n("Eb5", 1), n("D5", 1),
    n("C5", 4),
  ],
};
const BATTLE_FINAL_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.10,
  notes: [
    n("C3", 2), n("G3", 2),
    n("F3", 2), n("C3", 2),
    n("D3", 2), n("G3", 2),
    n("C3", 2), n("C3", 2),
    n("Ab2", 2), n("Eb3", 2),
    n("F3", 2), n("G3", 2),
    n("C3", 2), n("G3", 2),
    n("C3", 4),
  ],
};

// =====================================================================
// Assembled track table
// =====================================================================

export const TRACKS: Record<Exclude<TrackId, "none">, TrackDef> = {
  title: { bpm: 112, channels: [TITLE_MELODY, TITLE_BASS] },
  lab: { bpm: 118, channels: [LAB_MELODY, LAB_BASS] },
  town: { bpm: 108, channels: [TOWN_MELODY, TOWN_BASS] },
  world0: { bpm: 118, channels: [WORLD0_MELODY, WORLD0_BASS] },
  world1: { bpm: 92, channels: [WORLD1_MELODY, WORLD1_BASS] },
  world2: { bpm: 116, channels: [WORLD2_MELODY, WORLD2_BASS] },
  world3: { bpm: 108, channels: [WORLD3_MELODY, WORLD3_BASS] },
  world4: { bpm: 120, channels: [WORLD4_MELODY, WORLD4_BASS] },
  world5: { bpm: 118, channels: [WORLD5_MELODY, WORLD5_BASS] },
  world6: { bpm: 88, channels: [WORLD6_MELODY, WORLD6_BASS] },
  world7: { bpm: 120, channels: [WORLD7_MELODY, WORLD7_BASS] },
  battle_wild: { bpm: 120, channels: [BATTLE_WILD_MELODY, BATTLE_WILD_BASS] },
  battle_boss: { bpm: 124, channels: [BATTLE_BOSS_MELODY, BATTLE_BOSS_BASS] },
  battle_final: { bpm: 110, channels: [BATTLE_FINAL_MELODY, BATTLE_FINAL_BASS] },
};

export const WORLD_TRACKS: TrackId[] = [
  "world0", "world1", "world2", "world3",
  "world4", "world5", "world6", "world7",
];
