// Per-scene / per-world music tracks. Original compositions authored in
// the key, tempo, and mood of the Pokemon R/B/Y pieces they replace —
// see docs/plans/2026-04-17-music-overhaul.md §3 for the full assignment
// table. Tracks are data-only; MusicManager schedules each channel on a
// Web Audio oscillator at runtime. No sampled audio is ever loaded.

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

// Shorthand builders keep track data compact and readable.
const n = (note: string, beats: number) => ({ note, beats });
const r = (beats: number) => ({ note: null, beats });

// =====================================================================
// Frontend / menu tracks
// =====================================================================

// --- Title: fanfare in C major (134 BPM) ---
// Ascending triad → held high C → descending answer. Mimics the
// swelling "press start" feel of the original RBY title screen.
const TITLE_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("C5", 0.5), n("E5", 0.5), n("G5", 0.5), n("C6", 1.5),
    n("B5", 0.5), n("G5", 0.5), n("E5", 1),
    n("D5", 0.5), n("F5", 0.5), n("A5", 0.5), n("D6", 1.5),
    n("C6", 0.5), n("A5", 0.5), n("G5", 1),
    n("E5", 0.5), n("G5", 0.5), n("C6", 0.5), n("E6", 1.5),
    n("D6", 0.5), n("B5", 0.5), n("G5", 1),
    n("F5", 0.5), n("E5", 0.5), n("D5", 0.5), n("C5", 1.5),
    r(1.5),
  ],
};
const TITLE_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.10,
  notes: [
    n("C3", 1), n("G3", 1), n("C3", 1), n("G3", 1),
    n("F3", 1), n("C4", 1), n("G3", 1), n("G3", 1),
    n("C3", 1), n("G3", 1), n("C3", 1), n("G3", 1),
    n("F3", 1), n("G3", 1), n("C3", 2),
  ],
};

// --- Lab: curious / scientific in A major (138 BPM) ---
// Bouncy syncopated eighths, evokes Prof Oak's research theme.
const LAB_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.10,
  notes: [
    n("A4", 0.5), n("C#5", 0.5), n("E5", 0.5), n("A5", 0.5),
    n("E5", 0.5), n("C#5", 0.5), n("E5", 1),
    n("B4", 0.5), n("D5", 0.5), n("F#5", 0.5), n("B5", 0.5),
    n("F#5", 0.5), n("D5", 0.5), n("F#5", 1),
    n("A4", 0.5), n("E5", 0.5), n("C#5", 0.5), n("A4", 0.5),
    n("E5", 0.5), n("C#5", 0.5), n("A4", 1),
    n("G#4", 0.5), n("B4", 0.5), n("E5", 0.5), n("C#5", 0.5),
    n("B4", 0.5), n("A4", 0.5), n("E4", 1),
  ],
};
const LAB_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.08,
  notes: [
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("E3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("E3", 0.5),
    n("D3", 0.5), n("A3", 0.5), n("D3", 0.5), n("A3", 0.5),
    n("D3", 0.5), n("A3", 0.5), n("D3", 0.5), n("A3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("E3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("E3", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("E3", 0.5), n("B3", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("E3", 1),
  ],
};

// --- Town: cheerful big-town hub in E major (134 BPM) ---
// Classic singable 8-bar phrase with I–V–vi–IV under it.
const TOWN_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("E5", 0.5), n("F#5", 0.5), n("G#5", 0.5), n("B5", 0.5),
    n("A5", 0.5), n("G#5", 0.5), n("F#5", 1),
    n("E5", 0.5), n("F#5", 0.5), n("G#5", 0.5), n("E5", 0.5),
    n("D#5", 0.5), n("E5", 0.5), n("B4", 1),
    n("C#5", 0.5), n("E5", 0.5), n("G#5", 0.5), n("B5", 0.5),
    n("A5", 0.5), n("F#5", 0.5), n("E5", 1),
    n("A4", 0.5), n("B4", 0.5), n("C#5", 0.5), n("D#5", 0.5),
    n("E5", 0.5), n("F#5", 0.5), n("E5", 1),
    n("G#5", 0.5), n("F#5", 0.5), n("E5", 0.5), n("B4", 0.5),
    n("A4", 0.5), n("B4", 0.5), n("C#5", 1),
    n("E5", 0.5), n("D#5", 0.5), n("C#5", 0.5), n("B4", 0.5),
    n("C#5", 0.5), n("B4", 0.5), n("A4", 1),
    n("F#5", 0.5), n("E5", 0.5), n("D#5", 0.5), n("C#5", 0.5),
    n("B4", 0.5), n("F#5", 0.5), n("B5", 1),
    n("A5", 0.5), n("G#5", 0.5), n("F#5", 0.5), n("E5", 0.5),
    n("F#5", 0.5), n("E5", 0.5), n("E5", 1),
  ],
};
const TOWN_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("E3", 1), n("B3", 1), n("E3", 1), n("B3", 1),
    n("C#3", 1), n("G#3", 1), n("A3", 1), n("B3", 1),
    n("E3", 1), n("B3", 1), n("E3", 1), n("B3", 1),
    n("A3", 1), n("B3", 1), n("E3", 2),
  ],
};

// =====================================================================
// Per-world overworld music (MapScene)
// =====================================================================

// --- World 0 "Viridian Path" — pastoral, D major, 127 BPM ---
const WORLD0_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.10,
  notes: [
    n("D5", 0.5), n("F#5", 0.5), n("A5", 1),
    n("G5", 0.5), n("F#5", 0.5), n("E5", 1),
    n("D5", 0.5), n("E5", 0.5), n("F#5", 1),
    n("A4", 0.5), n("D5", 0.5), n("F#5", 1),
    n("G5", 0.5), n("A5", 0.5), n("B5", 1),
    n("A5", 0.5), n("F#5", 0.5), n("D5", 1),
    n("E5", 0.5), n("D5", 0.5), n("C#5", 0.5), n("A4", 0.5),
    n("D5", 2),
  ],
};
const WORLD0_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.08,
  notes: [
    n("D3", 1), n("A3", 1), n("D3", 1), n("A3", 1),
    n("G3", 1), n("D3", 1), n("A3", 1), n("A3", 1),
    n("D3", 1), n("A3", 1), n("D3", 1), n("A3", 1),
    n("G3", 1), n("A3", 1), n("D3", 2),
  ],
};

// --- World 1 "Mt. Moon Depths" — cavernous A minor, 120 BPM ---
const WORLD1_MELODY: TrackChannel = {
  wave: "triangle",
  volume: 0.10,
  notes: [
    n("A4", 1), n("E4", 0.5), n("A4", 0.5), n("C5", 1),
    n("B4", 0.5), n("A4", 0.5), n("G4", 1),
    n("F4", 1), n("E4", 0.5), n("F4", 0.5), n("A4", 1),
    n("G4", 0.5), n("E4", 0.5), n("D4", 1),
    n("E4", 1), n("A4", 0.5), n("C5", 0.5), n("E5", 1),
    n("D5", 0.5), n("C5", 0.5), n("B4", 1),
    n("C5", 0.5), n("B4", 0.5), n("A4", 1),
    n("G4", 0.5), n("E4", 0.5), n("A4", 2),
  ],
};
const WORLD1_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.07,
  notes: [
    n("A2", 2), n("A2", 2),
    n("F2", 2), n("F2", 2),
    n("G2", 2), n("G2", 2),
    n("E2", 2), n("E2", 2),
  ],
};

// --- World 2 "Cerulean Caves" — flowing water-route E major, 127 BPM ---
const WORLD2_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.10,
  notes: [
    n("E5", 0.5), n("G#5", 0.5), n("B5", 0.5), n("G#5", 0.5),
    n("E5", 0.5), n("B4", 0.5), n("E5", 1),
    n("F#5", 0.5), n("A5", 0.5), n("C#6", 0.5), n("A5", 0.5),
    n("F#5", 0.5), n("C#5", 0.5), n("F#5", 1),
    n("G#5", 0.5), n("B5", 0.5), n("E6", 0.5), n("B5", 0.5),
    n("G#5", 0.5), n("E5", 0.5), n("G#5", 1),
    n("A5", 0.5), n("G#5", 0.5), n("F#5", 0.5), n("E5", 0.5),
    n("F#5", 0.5), n("E5", 0.5), n("B4", 1),
  ],
};
const WORLD2_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.08,
  notes: [
    n("E3", 0.5), n("B3", 0.5), n("E3", 0.5), n("B3", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("E3", 1),
    n("F#3", 0.5), n("C#4", 0.5), n("F#3", 0.5), n("C#4", 0.5),
    n("F#3", 0.5), n("C#4", 0.5), n("F#3", 1),
    n("G#3", 0.5), n("D#4", 0.5), n("G#3", 0.5), n("D#4", 0.5),
    n("A3", 0.5), n("E4", 0.5), n("A3", 1),
    n("B3", 0.5), n("F#4", 0.5), n("A3", 0.5), n("E4", 0.5),
    n("B3", 0.5), n("B3", 0.5), n("E3", 1),
  ],
};

// --- World 3 "Vermilion Docks" — elegant 6/8-feel A major, 150 BPM ---
const WORLD3_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.10,
  notes: [
    n("A4", 0.75), n("C#5", 0.25), n("E5", 0.5),
    n("F#5", 0.75), n("E5", 0.25), n("C#5", 0.5),
    n("D5", 0.75), n("F#5", 0.25), n("A5", 0.5),
    n("E5", 0.75), n("C#5", 0.25), n("A4", 0.5),
    n("B4", 0.75), n("D5", 0.25), n("F#5", 0.5),
    n("G#5", 0.75), n("F#5", 0.25), n("E5", 0.5),
    n("A5", 0.75), n("G#5", 0.25), n("F#5", 0.5),
    n("E5", 0.75), n("C#5", 0.25), n("A4", 0.5),
  ],
};
const WORLD3_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.08,
  notes: [
    n("A2", 0.5), n("E3", 0.5), n("C#3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("C#3", 0.5),
    n("D3", 0.5), n("A3", 0.5), n("F#3", 0.5),
    n("D3", 0.5), n("A3", 0.5), n("F#3", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("G#3", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("G#3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("A3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("C#3", 0.5),
  ],
};

// --- World 4 "Celadon Gardens" — urban cheer G major, 134 BPM ---
const WORLD4_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.10,
  notes: [
    n("G4", 0.5), n("B4", 0.5), n("D5", 0.5), n("G5", 0.5),
    n("F#5", 0.5), n("E5", 0.5), n("D5", 1),
    n("E5", 0.5), n("D5", 0.5), n("C5", 0.5), n("B4", 0.5),
    n("A4", 0.5), n("B4", 0.5), n("G4", 1),
    n("A4", 0.5), n("C5", 0.5), n("E5", 0.5), n("A5", 0.5),
    n("G5", 0.5), n("F#5", 0.5), n("E5", 1),
    n("D5", 0.5), n("E5", 0.5), n("F#5", 0.5), n("G5", 0.5),
    n("A5", 0.5), n("G5", 0.5), n("D5", 1),
    n("B4", 0.5), n("D5", 0.5), n("G5", 0.5), n("B5", 0.5),
    n("A5", 0.5), n("G5", 0.5), n("F#5", 1),
    n("G5", 0.5), n("E5", 0.5), n("C5", 0.5), n("E5", 0.5),
    n("D5", 0.5), n("C5", 0.5), n("B4", 1),
    n("A4", 0.5), n("B4", 0.5), n("C5", 0.5), n("D5", 0.5),
    n("E5", 0.5), n("F#5", 0.5), n("G5", 1),
    n("F#5", 0.5), n("E5", 0.5), n("D5", 0.5), n("C5", 0.5),
    n("B4", 0.5), n("A4", 0.5), n("G4", 1),
  ],
};
const WORLD4_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("G3", 1), n("D4", 1), n("G3", 1), n("D4", 1),
    n("C3", 1), n("G3", 1), n("D3", 1), n("D3", 1),
    n("A3", 1), n("E4", 1), n("D3", 1), n("D3", 1),
    n("G3", 1), n("D4", 1), n("G3", 2),
  ],
};

// --- World 5 "Saffron Tower" — corporate/tense E minor, 155 BPM ---
const WORLD5_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.10,
  notes: [
    n("E5", 0.25), n("E5", 0.25), n("E5", 0.5), n("G5", 0.25), n("F#5", 0.25),
    n("E5", 0.5), n("D5", 0.5),
    n("E5", 0.25), n("E5", 0.25), n("B4", 0.5), n("E5", 0.25), n("D5", 0.25),
    n("C5", 0.5), n("B4", 0.5),
    n("F#5", 0.25), n("F#5", 0.25), n("F#5", 0.5), n("A5", 0.25), n("G5", 0.25),
    n("F#5", 0.5), n("E5", 0.5),
    n("D5", 0.25), n("E5", 0.25), n("F#5", 0.5), n("G5", 0.25), n("A5", 0.25),
    n("B5", 0.5), n("E5", 0.5),
  ],
};
const WORLD5_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.07,
  notes: [
    n("E2", 0.5), n("E2", 0.5), n("E2", 0.5), n("E2", 0.5),
    n("F2", 0.5), n("F2", 0.5), n("F#2", 0.5), n("G2", 0.5),
    n("A2", 0.5), n("A2", 0.5), n("G2", 0.5), n("F#2", 0.5),
    n("B2", 0.5), n("B2", 0.5), n("E3", 0.5), n("E2", 0.5),
  ],
};

// --- World 6 "Cinnabar Volcano" — decaying F minor, 134 BPM ---
const WORLD6_MELODY: TrackChannel = {
  wave: "triangle",
  volume: 0.10,
  notes: [
    n("F4", 1), n("G#4", 0.5), n("C5", 0.5), n("Db5", 1),
    n("C5", 0.5), n("G#4", 0.5), n("F4", 1),
    n("Eb4", 1), n("G4", 0.5), n("Bb4", 0.5), n("C5", 1),
    n("Bb4", 0.5), n("G4", 0.5), n("Eb4", 1),
    n("F4", 0.5), n("G#4", 0.5), n("C5", 0.5), n("F5", 0.5),
    n("Eb5", 0.5), n("Db5", 0.5), n("C5", 1),
    n("Bb4", 0.5), n("C5", 0.5), n("Db5", 0.5), n("C5", 0.5),
    n("Bb4", 0.5), n("G#4", 0.5), n("F4", 1),
  ],
};
const WORLD6_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.08,
  notes: [
    n("F2", 2), n("C3", 2),
    n("Eb2", 2), n("Bb2", 2),
    n("Db2", 2), n("G#2", 2),
    n("Bb2", 1), n("C3", 1), n("F2", 2),
  ],
};

// --- World 7 "Indigo Plateau" — grand F major, 146 BPM ---
const WORLD7_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("F5", 0.5), n("A5", 0.5), n("C6", 1),
    n("Bb5", 0.5), n("A5", 0.5), n("G5", 1),
    n("F5", 0.5), n("G5", 0.5), n("A5", 0.5), n("Bb5", 0.5),
    n("C6", 1.5), r(0.5),
    n("Bb5", 0.5), n("G5", 0.5), n("Eb5", 1),
    n("D5", 0.5), n("F5", 0.5), n("Bb5", 1),
    n("A5", 0.5), n("G5", 0.5), n("F5", 0.5), n("E5", 0.5),
    n("F5", 2),
    n("C6", 0.5), n("Bb5", 0.5), n("A5", 0.5), n("G5", 0.5),
    n("F5", 0.5), n("A5", 0.5), n("C6", 1),
    n("F6", 0.5), n("E6", 0.5), n("D6", 0.5), n("C6", 0.5),
    n("Bb5", 0.5), n("A5", 0.5), n("G5", 1),
    n("A5", 0.5), n("Bb5", 0.5), n("C6", 0.5), n("D6", 0.5),
    n("C6", 0.5), n("Bb5", 0.5), n("A5", 1),
    n("G5", 0.5), n("F5", 0.5), n("E5", 0.5), n("F5", 0.5),
    n("A5", 0.5), n("F5", 0.5), n("F5", 1),
  ],
};
const WORLD7_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("F3", 1), n("C4", 1), n("F3", 1), n("C4", 1),
    n("Bb3", 1), n("F4", 1), n("C4", 1), n("C4", 1),
    n("D3", 1), n("A3", 1), n("G3", 1), n("D4", 1),
    n("Bb3", 1), n("C4", 1), n("F3", 2),
  ],
};

// =====================================================================
// Battle tracks
// =====================================================================

// --- Wild battle: frantic C major, 185 BPM ---
const BATTLE_WILD_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.09,
  notes: [
    n("C5", 0.25), n("E5", 0.25), n("G5", 0.25), n("C6", 0.25),
    n("B5", 0.25), n("G5", 0.25), n("E5", 0.5),
    n("D5", 0.25), n("F5", 0.25), n("A5", 0.25), n("D6", 0.25),
    n("C6", 0.25), n("A5", 0.25), n("F5", 0.5),
    n("E5", 0.25), n("G5", 0.25), n("C6", 0.25), n("E6", 0.25),
    n("D6", 0.25), n("B5", 0.25), n("G5", 0.5),
    n("C6", 0.25), n("B5", 0.25), n("A5", 0.25), n("G5", 0.25),
    n("F5", 0.25), n("E5", 0.25), n("C5", 0.5),
    n("G4", 0.25), n("C5", 0.25), n("E5", 0.25), n("G5", 0.25),
    n("F5", 0.25), n("D5", 0.25), n("B4", 0.5),
    n("A4", 0.25), n("D5", 0.25), n("F5", 0.25), n("A5", 0.25),
    n("G5", 0.25), n("E5", 0.25), n("C5", 0.5),
    n("E5", 0.25), n("F5", 0.25), n("G5", 0.25), n("A5", 0.25),
    n("B5", 0.25), n("A5", 0.25), n("G5", 0.5),
    n("F5", 0.25), n("E5", 0.25), n("D5", 0.25), n("E5", 0.25),
    n("F5", 0.25), n("G5", 0.25), n("C6", 0.5),
  ],
};
const BATTLE_WILD_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.07,
  notes: [
    n("C3", 0.25), n("C3", 0.25), n("G3", 0.25), n("G3", 0.25),
    n("C3", 0.25), n("C3", 0.25), n("G3", 0.25), n("G3", 0.25),
    n("F3", 0.25), n("F3", 0.25), n("C4", 0.25), n("C4", 0.25),
    n("F3", 0.25), n("F3", 0.25), n("C4", 0.25), n("C4", 0.25),
    n("G3", 0.25), n("G3", 0.25), n("D4", 0.25), n("D4", 0.25),
    n("G3", 0.25), n("G3", 0.25), n("D4", 0.25), n("D4", 0.25),
    n("C3", 0.25), n("C3", 0.25), n("G3", 0.25), n("G3", 0.25),
    n("C3", 0.25), n("C3", 0.25), n("G3", 0.5),
  ],
};

// --- Boss battle: intense E minor, 185 BPM ---
const BATTLE_BOSS_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.10,
  notes: [
    n("E5", 0.5), n("E5", 0.25), n("E5", 0.25),
    n("G5", 0.25), n("F#5", 0.25), n("E5", 0.5),
    n("D5", 0.25), n("B4", 0.25), n("E5", 0.5),
    n("E5", 0.25), n("G5", 0.25), n("B5", 0.5),
    n("A5", 0.25), n("G5", 0.25), n("F#5", 0.5),
    n("E5", 0.25), n("D5", 0.25), n("B4", 0.5),
    n("C5", 0.25), n("D5", 0.25), n("E5", 0.5),
    n("F#5", 0.25), n("G5", 0.25), n("E5", 0.5),
    n("B4", 0.5), n("E5", 0.25), n("G5", 0.25),
    n("B5", 0.25), n("A5", 0.25), n("G5", 0.5),
    n("F#5", 0.5), n("E5", 0.5),
    n("D5", 0.25), n("C5", 0.25), n("B4", 0.5),
    n("A4", 0.25), n("B4", 0.25), n("E5", 0.5),
    n("F#5", 0.25), n("G5", 0.25), n("A5", 0.5),
    n("B5", 0.5), n("A5", 0.25), n("G5", 0.25),
    n("F#5", 0.5), n("E5", 1),
  ],
};
const BATTLE_BOSS_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.08,
  notes: [
    n("E3", 0.25), n("E3", 0.25), n("E3", 0.25), n("E3", 0.25),
    n("B2", 0.25), n("B2", 0.25), n("B2", 0.25), n("B2", 0.25),
    n("C3", 0.25), n("C3", 0.25), n("C3", 0.25), n("C3", 0.25),
    n("D3", 0.25), n("D3", 0.25), n("D3", 0.25), n("D3", 0.25),
    n("E3", 0.25), n("G3", 0.25), n("E3", 0.25), n("G3", 0.25),
    n("A2", 0.25), n("A2", 0.25), n("A2", 0.25), n("A2", 0.25),
    n("B2", 0.25), n("B2", 0.25), n("B2", 0.25), n("F#3", 0.25),
    n("E3", 0.25), n("D3", 0.25), n("E3", 0.5),
  ],
};

// --- Final battle: climactic C minor, 172 BPM ---
const BATTLE_FINAL_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("C5", 0.5), n("Eb5", 0.5), n("G5", 0.5), n("C6", 0.5),
    n("Bb5", 0.5), n("G5", 0.5), n("Eb5", 1),
    n("F5", 0.5), n("G5", 0.5), n("Ab5", 0.5), n("Bb5", 0.5),
    n("C6", 0.5), n("Bb5", 0.5), n("G5", 1),
    n("Ab5", 0.5), n("G5", 0.5), n("F5", 0.5), n("Eb5", 0.5),
    n("D5", 0.5), n("Eb5", 0.5), n("F5", 1),
    n("G5", 0.5), n("Ab5", 0.5), n("Bb5", 0.5), n("C6", 0.5),
    n("D6", 0.5), n("Eb6", 0.5), n("C6", 1),
    n("Bb5", 0.5), n("G5", 0.5), n("Eb5", 0.5), n("C5", 0.5),
    n("G4", 0.5), n("C5", 0.5), n("Eb5", 1),
    n("D5", 0.5), n("Eb5", 0.5), n("F5", 0.5), n("G5", 0.5),
    n("Ab5", 0.5), n("G5", 0.5), n("F5", 1),
    n("G5", 0.5), n("F5", 0.5), n("Eb5", 0.5), n("D5", 0.5),
    n("C5", 0.5), n("D5", 0.5), n("Eb5", 1),
    n("G5", 0.5), n("C6", 0.5), n("Eb6", 0.5), n("D6", 0.5),
    n("C6", 0.5), n("Bb5", 0.5), n("C5", 1),
  ],
};
const BATTLE_FINAL_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.08,
  notes: [
    n("C3", 0.5), n("G3", 0.5), n("C3", 0.5), n("G3", 0.5),
    n("Ab2", 0.5), n("Eb3", 0.5), n("Ab2", 0.5), n("Eb3", 0.5),
    n("F2", 0.5), n("C3", 0.5), n("F2", 0.5), n("C3", 0.5),
    n("G2", 0.5), n("D3", 0.5), n("G2", 0.5), n("B2", 0.5),
    n("C3", 0.5), n("G3", 0.5), n("C3", 0.5), n("G3", 0.5),
    n("Ab2", 0.5), n("Eb3", 0.5), n("Ab2", 0.5), n("Eb3", 0.5),
    n("F2", 0.5), n("C3", 0.5), n("Bb2", 0.5), n("F3", 0.5),
    n("G2", 0.5), n("D3", 0.5), n("C3", 1),
  ],
};

// =====================================================================
// Assembled track table
// =====================================================================

export const TRACKS: Record<Exclude<TrackId, "none">, TrackDef> = {
  title: { bpm: 134, channels: [TITLE_MELODY, TITLE_BASS] },
  lab: { bpm: 138, channels: [LAB_MELODY, LAB_BASS] },
  town: { bpm: 134, channels: [TOWN_MELODY, TOWN_BASS] },
  world0: { bpm: 127, channels: [WORLD0_MELODY, WORLD0_BASS] },
  world1: { bpm: 120, channels: [WORLD1_MELODY, WORLD1_BASS] },
  world2: { bpm: 127, channels: [WORLD2_MELODY, WORLD2_BASS] },
  world3: { bpm: 150, channels: [WORLD3_MELODY, WORLD3_BASS] },
  world4: { bpm: 134, channels: [WORLD4_MELODY, WORLD4_BASS] },
  world5: { bpm: 155, channels: [WORLD5_MELODY, WORLD5_BASS] },
  world6: { bpm: 134, channels: [WORLD6_MELODY, WORLD6_BASS] },
  world7: { bpm: 146, channels: [WORLD7_MELODY, WORLD7_BASS] },
  battle_wild: { bpm: 96, channels: [BATTLE_WILD_MELODY, BATTLE_WILD_BASS] },
  battle_boss: { bpm: 104, channels: [BATTLE_BOSS_MELODY, BATTLE_BOSS_BASS] },
  battle_final: { bpm: 90, channels: [BATTLE_FINAL_MELODY, BATTLE_FINAL_BASS] },
};

// Map the 8 world indices to their assigned track ids. Exposed so
// MapScene can pick a track without hard-coding the mapping.
export const WORLD_TRACKS: TrackId[] = [
  "world0", "world1", "world2", "world3",
  "world4", "world5", "world6", "world7",
];
