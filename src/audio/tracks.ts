// Per-scene / per-world music tracks. Melodies are transcribed from
// memory of the iconic Pokemon R/B/Y opening phrases, not precise
// engravings — the goal is instant recognisability ("oh, Route 1")
// rather than bit-accurate note-for-note copies. Two channels per
// track: square-lead melody + triangle/sawtooth bass. No sampled
// audio is ever loaded; MusicManager schedules each channel on a
// Web Audio oscillator at runtime.

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
// Title — the RBY title-screen fanfare (C major, moderate)
// =====================================================================
// Opens with the iconic ascending arpeggio → sustained top → descending
// resolution. Feels like a "press start" curtain-raiser.
const TITLE_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.12,
  notes: [
    n("G4", 0.5), n("C5", 0.5), n("E5", 0.5), n("G5", 0.5),
    n("C6", 2),
    n("B5", 0.5), n("A5", 0.5), n("G5", 0.5), n("E5", 0.5),
    n("G5", 2),
    n("F5", 0.5), n("A5", 0.5), n("C6", 0.5), n("F6", 0.5),
    n("E6", 1), n("D6", 1),
    n("C6", 0.5), n("B5", 0.5), n("A5", 0.5), n("G5", 0.5),
    n("C6", 2),
    n("E5", 0.5), n("G5", 0.5), n("C6", 0.5), n("E6", 0.5),
    n("G6", 1.5), n("E6", 0.5),
    n("F6", 0.5), n("E6", 0.5), n("D6", 0.5), n("C6", 0.5),
    n("B5", 1), n("G5", 1),
    n("A5", 0.5), n("G5", 0.5), n("F5", 0.5), n("E5", 0.5),
    n("C5", 2),
    r(2),
  ],
};
const TITLE_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.11,
  notes: [
    n("C3", 1), n("G3", 1), n("C3", 1), n("G3", 1),
    n("C3", 1), n("E3", 1), n("G3", 1), n("G3", 1),
    n("F3", 1), n("C4", 1), n("F3", 1), n("A3", 1),
    n("G3", 1), n("D4", 1), n("G3", 1), n("B3", 1),
    n("C3", 1), n("G3", 1), n("E3", 1), n("G3", 1),
    n("F3", 1), n("A3", 1), n("G3", 1), n("G3", 1),
    n("C3", 2), n("G3", 2),
    n("C3", 2), r(2),
  ],
};

// =====================================================================
// Lab — Professor Oak's lab / curious bouncy theme (A major)
// =====================================================================
// Channels the "clipboard-and-test-tubes" feel: syncopated
// eighth-note figure, lots of A-C#-E arpeggios.
const LAB_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("A4", 0.5), n("C#5", 0.5), n("E5", 0.5), n("A5", 0.5),
    n("G#5", 0.5), n("E5", 0.5), n("C#5", 1),
    n("B4", 0.5), n("D5", 0.5), n("F#5", 0.5), n("B5", 0.5),
    n("A5", 0.5), n("F#5", 0.5), n("D5", 1),
    n("A4", 0.5), n("E5", 0.5), n("C#5", 0.5), n("E5", 0.5),
    n("A5", 1), n("G#5", 0.5), n("F#5", 0.5),
    n("E5", 0.5), n("F#5", 0.5), n("G#5", 0.5), n("E5", 0.5),
    n("A5", 2),
  ],
};
const LAB_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("C#3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("C#3", 0.5), n("E3", 0.5),
    n("B2", 0.5), n("F#3", 0.5), n("B2", 0.5), n("D3", 0.5),
    n("B2", 0.5), n("F#3", 0.5), n("D3", 0.5), n("F#3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("C#3", 0.5), n("A2", 0.5),
    n("D3", 0.5), n("A3", 0.5), n("F#3", 0.5), n("D3", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("G#3", 0.5), n("E3", 0.5),
    n("A2", 2),
  ],
};

// =====================================================================
// Town — Pallet Town style (G major, peaceful, pastoral)
// =====================================================================
// Classic home-town feel — simple descending phrase, warm I-IV-V-I.
const TOWN_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("D5", 0.5), n("B4", 0.5), n("G4", 0.5), n("B4", 0.5),
    n("D5", 1), n("B4", 1),
    n("C5", 0.5), n("A4", 0.5), n("F#4", 0.5), n("A4", 0.5),
    n("D5", 1), n("C5", 1),
    n("B4", 0.5), n("D5", 0.5), n("G5", 0.5), n("D5", 0.5),
    n("B4", 1), n("G4", 1),
    n("A4", 0.5), n("B4", 0.5), n("C5", 0.5), n("D5", 0.5),
    n("G4", 2),
    n("G5", 0.5), n("F#5", 0.5), n("E5", 0.5), n("D5", 0.5),
    n("C5", 1), n("B4", 1),
    n("C5", 0.5), n("B4", 0.5), n("A4", 0.5), n("G4", 0.5),
    n("D5", 1), n("D5", 1),
    n("E5", 0.5), n("D5", 0.5), n("C5", 0.5), n("B4", 0.5),
    n("A4", 1), n("C5", 1),
    n("B4", 0.5), n("A4", 0.5), n("G4", 0.5), n("A4", 0.5),
    n("G4", 2),
  ],
};
const TOWN_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("G2", 1), n("D3", 1), n("G2", 1), n("D3", 1),
    n("C3", 1), n("G3", 1), n("D3", 1), n("D3", 1),
    n("G2", 1), n("D3", 1), n("G2", 1), n("D3", 1),
    n("D3", 1), n("A3", 1), n("G2", 2),
    n("E3", 1), n("B3", 1), n("A2", 1), n("E3", 1),
    n("D3", 1), n("A3", 1), n("D3", 1), n("D3", 1),
    n("C3", 1), n("G3", 1), n("A2", 1), n("D3", 1),
    n("G2", 2), n("D3", 2),
  ],
};

// =====================================================================
// World 0 "Viridian Path" — Route 1 style (D major, bouncy first-route)
// =====================================================================
// The iconic "leaving home, first Pokemon adventure" feel. Staccato
// eighths climbing then settling.
const WORLD0_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("D5", 0.5), n("F#5", 0.5), n("A5", 0.5), n("F#5", 0.5),
    n("D5", 0.5), n("A4", 0.5), n("D5", 1),
    n("E5", 0.5), n("G5", 0.5), n("B5", 0.5), n("G5", 0.5),
    n("E5", 0.5), n("B4", 0.5), n("E5", 1),
    n("F#5", 0.5), n("A5", 0.5), n("D6", 0.5), n("A5", 0.5),
    n("F#5", 0.5), n("D5", 0.5), n("A4", 1),
    n("G5", 0.5), n("F#5", 0.5), n("E5", 0.5), n("D5", 0.5),
    n("C#5", 1), n("A4", 1),
    n("A4", 0.5), n("D5", 0.5), n("F#5", 0.5), n("A5", 0.5),
    n("D6", 1), n("A5", 1),
    n("G5", 0.5), n("F#5", 0.5), n("E5", 0.5), n("G5", 0.5),
    n("F#5", 1), n("D5", 1),
    n("E5", 0.5), n("F#5", 0.5), n("G5", 0.5), n("A5", 0.5),
    n("D6", 1), n("C#6", 1),
    n("D6", 0.5), n("A5", 0.5), n("F#5", 0.5), n("A5", 0.5),
    n("D5", 2),
  ],
};
const WORLD0_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("D3", 0.5), n("A3", 0.5), n("D3", 0.5), n("A3", 0.5),
    n("D3", 0.5), n("A3", 0.5), n("D3", 0.5), n("A3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("E3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("E3", 0.5),
    n("D3", 0.5), n("A3", 0.5), n("D3", 0.5), n("A3", 0.5),
    n("G2", 0.5), n("D3", 0.5), n("G2", 0.5), n("D3", 0.5),
    n("A2", 0.5), n("E3", 0.5), n("A2", 0.5), n("C#3", 0.5),
    n("D3", 0.5), n("A3", 0.5), n("D3", 2.5),
  ],
};

// =====================================================================
// World 1 "Mt. Moon" — dark cavern (A minor)
// =====================================================================
// Opens with the iconic descending minor triplet figure that gives
// Mt. Moon its "lost in the dark" atmosphere.
const WORLD1_MELODY: TrackChannel = {
  wave: "triangle",
  volume: 0.11,
  notes: [
    n("E5", 0.5), n("C5", 0.5), n("A4", 1),
    n("B4", 0.5), n("G4", 0.5), n("E4", 1),
    n("A4", 0.5), n("C5", 0.5), n("E5", 0.5), n("A5", 0.5),
    n("G5", 1), n("E5", 1),
    n("F5", 0.5), n("E5", 0.5), n("D5", 0.5), n("C5", 0.5),
    n("B4", 1), n("A4", 1),
    n("E4", 0.5), n("A4", 0.5), n("C5", 0.5), n("E5", 0.5),
    n("A5", 2),
    n("G5", 0.5), n("F5", 0.5), n("E5", 1),
    n("D5", 0.5), n("C5", 0.5), n("B4", 1),
    n("A4", 0.5), n("B4", 0.5), n("C5", 0.5), n("D5", 0.5),
    n("E5", 1), n("A4", 1),
    n("C5", 0.5), n("B4", 0.5), n("A4", 2.5),
  ],
};
const WORLD1_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.08,
  notes: [
    n("A2", 2), n("E3", 2),
    n("F2", 2), n("C3", 2),
    n("D3", 2), n("A3", 2),
    n("E3", 1), n("G#3", 1), n("A2", 2),
    n("A2", 2), n("E3", 2),
    n("F2", 2), n("G2", 2),
    n("E3", 2), n("A2", 2),
  ],
};

// =====================================================================
// World 2 "Cerulean Caves" — Route 24 / Nugget Bridge (E major)
// =====================================================================
// Crossing-the-bridge forward-momentum feel.
const WORLD2_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("E5", 0.5), n("G#5", 0.5), n("B5", 0.5), n("G#5", 0.5),
    n("E5", 0.5), n("B4", 0.5), n("E5", 1),
    n("F#5", 0.5), n("A5", 0.5), n("C#6", 0.5), n("A5", 0.5),
    n("F#5", 0.5), n("C#5", 0.5), n("F#5", 1),
    n("G#5", 0.5), n("B5", 0.5), n("E6", 0.5), n("B5", 0.5),
    n("G#5", 0.5), n("E5", 0.5), n("B4", 1),
    n("A5", 0.5), n("G#5", 0.5), n("F#5", 0.5), n("E5", 0.5),
    n("D#5", 0.5), n("E5", 0.5), n("B4", 1),
    n("B4", 0.5), n("E5", 0.5), n("G#5", 0.5), n("B5", 0.5),
    n("E6", 1), n("B5", 1),
    n("A5", 0.5), n("G#5", 0.5), n("F#5", 0.5), n("A5", 0.5),
    n("G#5", 1), n("E5", 1),
    n("F#5", 0.5), n("E5", 0.5), n("D#5", 0.5), n("C#5", 0.5),
    n("B4", 1), n("E5", 1),
  ],
};
const WORLD2_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("E3", 0.5), n("B3", 0.5), n("E3", 0.5), n("B3", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("E3", 0.5), n("B3", 0.5),
    n("F#3", 0.5), n("C#4", 0.5), n("F#3", 0.5), n("C#4", 0.5),
    n("F#3", 0.5), n("C#4", 0.5), n("F#3", 0.5), n("C#4", 0.5),
    n("G#3", 0.5), n("D#4", 0.5), n("G#3", 0.5), n("D#4", 0.5),
    n("A3", 0.5), n("E4", 0.5), n("A3", 0.5), n("E4", 0.5),
    n("B3", 0.5), n("F#4", 0.5), n("B3", 0.5), n("F#4", 0.5),
    n("E3", 0.5), n("B3", 0.5), n("E3", 1),
  ],
};

// =====================================================================
// World 3 "Vermilion Docks" — Vermilion City jaunty port (A major)
// =====================================================================
// Naval march feel — strong oom-pa-pa bass, melody in 3-beat swing.
const WORLD3_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("A4", 0.75), n("A4", 0.25), n("C#5", 0.5), n("E5", 0.5),
    n("A5", 1), n("E5", 0.5), n("C#5", 0.5),
    n("D5", 0.75), n("D5", 0.25), n("F#5", 0.5), n("A5", 0.5),
    n("D6", 1), n("A5", 0.5), n("F#5", 0.5),
    n("E5", 0.75), n("E5", 0.25), n("G#5", 0.5), n("B5", 0.5),
    n("E6", 1), n("B5", 0.5), n("G#5", 0.5),
    n("A5", 0.5), n("G#5", 0.5), n("F#5", 0.5), n("E5", 0.5),
    n("D5", 0.5), n("C#5", 0.5), n("B4", 0.5), n("A4", 0.5),
  ],
};
const WORLD3_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("A2", 1), n("E3", 0.5), n("C#3", 0.5),
    n("A2", 1), n("E3", 0.5), n("C#3", 0.5),
    n("D3", 1), n("A3", 0.5), n("F#3", 0.5),
    n("D3", 1), n("A3", 0.5), n("F#3", 0.5),
    n("E3", 1), n("B3", 0.5), n("G#3", 0.5),
    n("E3", 1), n("B3", 0.5), n("G#3", 0.5),
    n("A2", 1), n("E3", 1),
    n("D3", 0.5), n("E3", 0.5), n("A2", 1),
  ],
};

// =====================================================================
// World 4 "Celadon Gardens" — Celadon City (G major, urban cheer)
// =====================================================================
// Bright city-bustle melody with a confident I-V-vi-IV undertone.
const WORLD4_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("D5", 0.5), n("G5", 0.5), n("B5", 0.5), n("G5", 0.5),
    n("A5", 0.5), n("G5", 0.5), n("F#5", 0.5), n("D5", 0.5),
    n("E5", 0.5), n("G5", 0.5), n("B5", 0.5), n("D6", 0.5),
    n("C6", 1), n("B5", 1),
    n("A5", 0.5), n("G5", 0.5), n("F#5", 0.5), n("E5", 0.5),
    n("D5", 0.5), n("E5", 0.5), n("G5", 1),
    n("B5", 0.5), n("A5", 0.5), n("G5", 0.5), n("F#5", 0.5),
    n("G5", 2),
    n("G5", 0.5), n("B5", 0.5), n("D6", 0.5), n("G6", 0.5),
    n("F#6", 0.5), n("E6", 0.5), n("D6", 1),
    n("C6", 0.5), n("B5", 0.5), n("A5", 0.5), n("G5", 0.5),
    n("F#5", 1), n("A5", 1),
    n("G5", 0.5), n("A5", 0.5), n("B5", 0.5), n("C6", 0.5),
    n("D6", 1), n("B5", 1),
    n("A5", 0.5), n("G5", 0.5), n("F#5", 0.5), n("A5", 0.5),
    n("G5", 2),
  ],
};
const WORLD4_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.09,
  notes: [
    n("G2", 1), n("D3", 1), n("G2", 1), n("D3", 1),
    n("C3", 1), n("G3", 1), n("D3", 1), n("D3", 1),
    n("E3", 1), n("B3", 1), n("A2", 1), n("E3", 1),
    n("D3", 1), n("A3", 1), n("G2", 2),
    n("G2", 1), n("D3", 1), n("G2", 1), n("B3", 1),
    n("A2", 1), n("E3", 1), n("D3", 1), n("D3", 1),
    n("C3", 1), n("G3", 1), n("A2", 1), n("D3", 1),
    n("G2", 2), n("D3", 2),
  ],
};

// =====================================================================
// World 5 "Saffron Tower" — Silph Co. corporate maze (E minor)
// =====================================================================
// Repetitive stepwise pattern with cold chromatic bass — feels like
// climbing an elevator through enemy territory.
const WORLD5_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("E5", 0.5), n("F#5", 0.5), n("G5", 0.5), n("F#5", 0.5),
    n("E5", 0.5), n("D5", 0.5), n("B4", 1),
    n("E5", 0.5), n("F#5", 0.5), n("G5", 0.5), n("A5", 0.5),
    n("B5", 1), n("A5", 0.5), n("G5", 0.5),
    n("F#5", 0.5), n("G5", 0.5), n("A5", 0.5), n("G5", 0.5),
    n("F#5", 0.5), n("E5", 0.5), n("D5", 1),
    n("E5", 0.5), n("G5", 0.5), n("B5", 0.5), n("D6", 0.5),
    n("B5", 1), n("G5", 1),
    n("F#5", 0.5), n("A5", 0.5), n("C6", 0.5), n("A5", 0.5),
    n("F#5", 1), n("D5", 1),
    n("E5", 0.5), n("B4", 0.5), n("E5", 0.5), n("G5", 0.5),
    n("B5", 1), n("E5", 1),
  ],
};
const WORLD5_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.08,
  notes: [
    n("E3", 1), n("E3", 1), n("B2", 1), n("B2", 1),
    n("C3", 1), n("C3", 1), n("D3", 1), n("D3", 1),
    n("A2", 1), n("A2", 1), n("B2", 1), n("B2", 1),
    n("E3", 1), n("B3", 1), n("E3", 2),
    n("D3", 1), n("D3", 1), n("B2", 1), n("B2", 1),
    n("A2", 1), n("B2", 1), n("E3", 2),
  ],
};

// =====================================================================
// World 6 "Cinnabar Volcano" — Pokemon Mansion (F minor, decaying)
// =====================================================================
// Lurching minor phrase with tritone-leaning bass — burnt-out
// laboratory vibe.
const WORLD6_MELODY: TrackChannel = {
  wave: "triangle",
  volume: 0.11,
  notes: [
    n("F4", 1), n("Ab4", 0.5), n("C5", 0.5), n("Eb5", 1),
    n("Db5", 0.5), n("C5", 0.5), n("Ab4", 1),
    n("G4", 1), n("Bb4", 0.5), n("Db5", 0.5), n("F5", 1),
    n("Eb5", 0.5), n("Db5", 0.5), n("Bb4", 1),
    n("C5", 0.5), n("Db5", 0.5), n("Eb5", 0.5), n("F5", 0.5),
    n("Ab5", 1), n("F5", 1),
    n("Eb5", 0.5), n("Db5", 0.5), n("C5", 0.5), n("Bb4", 0.5),
    n("Ab4", 1), n("F4", 1),
    n("F4", 0.5), n("Ab4", 0.5), n("C5", 0.5), n("F5", 0.5),
    n("Eb5", 1), n("Db5", 1),
    n("C5", 0.5), n("Bb4", 0.5), n("Ab4", 0.5), n("Bb4", 0.5),
    n("F4", 2),
  ],
};
const WORLD6_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.08,
  notes: [
    n("F2", 2), n("C3", 2),
    n("Eb2", 2), n("Bb2", 2),
    n("Db2", 2), n("Ab2", 2),
    n("C3", 2), n("F2", 2),
    n("F2", 2), n("Db3", 2),
    n("Bb2", 1), n("C3", 1), n("F2", 2),
  ],
};

// =====================================================================
// World 7 "Indigo Plateau" — grand climactic approach (F major)
// =====================================================================
// Big wide leaps, strong resolutions — "you've made it to the end".
const WORLD7_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.12,
  notes: [
    n("F5", 0.5), n("A5", 0.5), n("C6", 1),
    n("Bb5", 0.5), n("A5", 0.5), n("G5", 1),
    n("F5", 0.5), n("G5", 0.5), n("A5", 0.5), n("Bb5", 0.5),
    n("C6", 2),
    n("F6", 0.5), n("E6", 0.5), n("D6", 0.5), n("C6", 0.5),
    n("Bb5", 1), n("A5", 1),
    n("G5", 0.5), n("A5", 0.5), n("Bb5", 0.5), n("C6", 0.5),
    n("F5", 2),
    n("A5", 0.5), n("C6", 0.5), n("F6", 1),
    n("E6", 0.5), n("D6", 0.5), n("C6", 1),
    n("Bb5", 0.5), n("A5", 0.5), n("G5", 0.5), n("Bb5", 0.5),
    n("A5", 1), n("F5", 1),
    n("C6", 0.5), n("Bb5", 0.5), n("A5", 0.5), n("G5", 0.5),
    n("F5", 2),
  ],
};
const WORLD7_BASS: TrackChannel = {
  wave: "triangle",
  volume: 0.10,
  notes: [
    n("F3", 1), n("C4", 1), n("F3", 1), n("C4", 1),
    n("Bb3", 1), n("F4", 1), n("C4", 2),
    n("D3", 1), n("A3", 1), n("G3", 1), n("D4", 1),
    n("C4", 1), n("C4", 1), n("F3", 2),
    n("F3", 1), n("C4", 1), n("F3", 1), n("C4", 1),
    n("Bb3", 1), n("C4", 1), n("F3", 2),
  ],
};

// =====================================================================
// Battle (wild) — the iconic "DA-DA-DA-DA-DA-DA!" wild encounter alarm
// =====================================================================
// RBY wild-battle opening: staccato alternating-pitch alarm over a
// driving bass pulse. Instantly recognisable as Pokemon combat.
const BATTLE_WILD_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("G5", 0.25), n("G5", 0.25), n("G5", 0.25), n("G5", 0.25),
    n("A5", 0.5), n("G5", 0.5),
    n("F5", 0.25), n("F5", 0.25), n("F5", 0.25), n("F5", 0.25),
    n("E5", 0.5), n("D5", 0.5),
    n("G5", 0.25), n("G5", 0.25), n("G5", 0.25), n("G5", 0.25),
    n("A5", 0.5), n("B5", 0.5),
    n("C6", 0.25), n("B5", 0.25), n("A5", 0.25), n("G5", 0.25),
    n("E5", 1),
    n("E5", 0.5), n("G5", 0.5), n("C6", 0.5), n("E6", 0.5),
    n("D6", 0.5), n("C6", 0.5), n("B5", 1),
    n("A5", 0.5), n("C6", 0.5), n("B5", 0.5), n("A5", 0.5),
    n("G5", 0.5), n("F5", 0.5), n("E5", 1),
    n("C5", 0.25), n("E5", 0.25), n("G5", 0.5),
    n("C5", 0.25), n("E5", 0.25), n("G5", 0.5),
    n("B5", 0.25), n("A5", 0.25), n("G5", 0.25), n("F5", 0.25),
    n("E5", 1),
  ],
};
const BATTLE_WILD_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.08,
  notes: [
    n("C3", 0.25), n("C3", 0.25), n("G3", 0.25), n("G3", 0.25),
    n("C3", 0.25), n("C3", 0.25), n("G3", 0.25), n("G3", 0.25),
    n("F3", 0.25), n("F3", 0.25), n("C4", 0.25), n("C4", 0.25),
    n("G3", 0.25), n("G3", 0.25), n("D4", 0.25), n("D4", 0.25),
    n("C3", 0.25), n("E3", 0.25), n("G3", 0.25), n("E3", 0.25),
    n("C3", 0.25), n("E3", 0.25), n("G3", 0.25), n("E3", 0.25),
    n("F3", 0.25), n("A3", 0.25), n("C4", 0.25), n("A3", 0.25),
    n("G3", 0.25), n("B3", 0.25), n("D4", 0.25), n("B3", 0.25),
    n("C3", 0.25), n("G3", 0.25), n("C4", 0.5),
    n("C3", 0.25), n("G3", 0.25), n("C4", 0.5),
  ],
};

// =====================================================================
// Battle (boss) — Gym Leader style (E minor, urgent drive)
// =====================================================================
// The "you're in trouble now" feel: sharp staccato lead over a chugging
// minor bass-line.
const BATTLE_BOSS_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.11,
  notes: [
    n("E5", 0.25), n("E5", 0.25), n("E5", 0.5),
    n("G5", 0.25), n("A5", 0.25), n("E5", 0.5),
    n("D5", 0.25), n("D5", 0.25), n("D5", 0.5),
    n("F#5", 0.25), n("G5", 0.25), n("D5", 0.5),
    n("B5", 0.25), n("A5", 0.25), n("G5", 0.5),
    n("F#5", 0.25), n("E5", 0.25), n("D5", 0.5),
    n("E5", 0.5), n("G5", 0.5), n("B5", 1),
    n("E5", 0.25), n("G5", 0.25), n("B5", 0.25), n("E6", 0.25),
    n("D6", 0.5), n("B5", 0.5),
    n("C6", 0.25), n("B5", 0.25), n("A5", 0.25), n("G5", 0.25),
    n("F#5", 0.5), n("E5", 0.5),
    n("A5", 0.25), n("G5", 0.25), n("F#5", 0.25), n("E5", 0.25),
    n("D5", 0.5), n("B4", 0.5),
    n("E5", 0.5), n("G5", 0.5), n("B5", 1),
  ],
};
const BATTLE_BOSS_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.08,
  notes: [
    n("E3", 0.25), n("E3", 0.25), n("E3", 0.25), n("E3", 0.25),
    n("B2", 0.25), n("B2", 0.25), n("B2", 0.25), n("B2", 0.25),
    n("D3", 0.25), n("D3", 0.25), n("D3", 0.25), n("D3", 0.25),
    n("A2", 0.25), n("A2", 0.25), n("A2", 0.25), n("A2", 0.25),
    n("C3", 0.25), n("G3", 0.25), n("C3", 0.25), n("G3", 0.25),
    n("B2", 0.25), n("F#3", 0.25), n("B2", 0.25), n("F#3", 0.25),
    n("E3", 0.25), n("G3", 0.25), n("B3", 0.25), n("G3", 0.25),
    n("E3", 0.25), n("E3", 0.25), n("E3", 0.5),
  ],
};

// =====================================================================
// Battle (final) — Rival / Champion climactic (C minor)
// =====================================================================
// Broader, more melodic than wild — more "this matters" than "run".
const BATTLE_FINAL_MELODY: TrackChannel = {
  wave: "square",
  volume: 0.12,
  notes: [
    n("C5", 0.5), n("Eb5", 0.5), n("G5", 0.5), n("C6", 0.5),
    n("Bb5", 0.5), n("G5", 0.5), n("Eb5", 1),
    n("F5", 0.5), n("Ab5", 0.5), n("C6", 0.5), n("Eb6", 0.5),
    n("D6", 0.5), n("C6", 0.5), n("G5", 1),
    n("Ab5", 0.5), n("G5", 0.5), n("F5", 0.5), n("Eb5", 0.5),
    n("D5", 0.5), n("Eb5", 0.5), n("F5", 1),
    n("G5", 0.5), n("Ab5", 0.5), n("Bb5", 0.5), n("C6", 0.5),
    n("D6", 0.5), n("Eb6", 0.5), n("C6", 1),
    n("C6", 0.5), n("Bb5", 0.5), n("Ab5", 0.5), n("G5", 0.5),
    n("F5", 1), n("Eb5", 1),
    n("C5", 0.5), n("Eb5", 0.5), n("G5", 0.5), n("C6", 0.5),
    n("Bb5", 1), n("Ab5", 1),
    n("G5", 0.5), n("F5", 0.5), n("Eb5", 0.5), n("D5", 0.5),
    n("C5", 2),
  ],
};
const BATTLE_FINAL_BASS: TrackChannel = {
  wave: "sawtooth",
  volume: 0.09,
  notes: [
    n("C3", 0.5), n("G3", 0.5), n("C3", 0.5), n("G3", 0.5),
    n("Ab2", 0.5), n("Eb3", 0.5), n("Ab2", 0.5), n("Eb3", 0.5),
    n("F2", 0.5), n("C3", 0.5), n("F2", 0.5), n("C3", 0.5),
    n("G2", 0.5), n("D3", 0.5), n("G2", 0.5), n("B2", 0.5),
    n("Ab2", 0.5), n("Eb3", 0.5), n("Ab2", 0.5), n("F3", 0.5),
    n("G2", 0.5), n("D3", 0.5), n("G2", 0.5), n("D3", 0.5),
    n("C3", 0.5), n("G3", 0.5), n("C3", 2.5),
  ],
};

// =====================================================================
// Assembled track table
// =====================================================================

export const TRACKS: Record<Exclude<TrackId, "none">, TrackDef> = {
  title: { bpm: 120, channels: [TITLE_MELODY, TITLE_BASS] },
  lab: { bpm: 126, channels: [LAB_MELODY, LAB_BASS] },
  town: { bpm: 112, channels: [TOWN_MELODY, TOWN_BASS] },
  world0: { bpm: 122, channels: [WORLD0_MELODY, WORLD0_BASS] },
  world1: { bpm: 108, channels: [WORLD1_MELODY, WORLD1_BASS] },
  world2: { bpm: 120, channels: [WORLD2_MELODY, WORLD2_BASS] },
  world3: { bpm: 118, channels: [WORLD3_MELODY, WORLD3_BASS] },
  world4: { bpm: 125, channels: [WORLD4_MELODY, WORLD4_BASS] },
  world5: { bpm: 128, channels: [WORLD5_MELODY, WORLD5_BASS] },
  world6: { bpm: 104, channels: [WORLD6_MELODY, WORLD6_BASS] },
  world7: { bpm: 132, channels: [WORLD7_MELODY, WORLD7_BASS] },
  battle_wild: { bpm: 120, channels: [BATTLE_WILD_MELODY, BATTLE_WILD_BASS] },
  battle_boss: { bpm: 128, channels: [BATTLE_BOSS_MELODY, BATTLE_BOSS_BASS] },
  battle_final: { bpm: 116, channels: [BATTLE_FINAL_MELODY, BATTLE_FINAL_BASS] },
};

export const WORLD_TRACKS: TrackId[] = [
  "world0", "world1", "world2", "world3",
  "world4", "world5", "world6", "world7",
];
