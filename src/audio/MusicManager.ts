// Procedural music using Web Audio API
// No external audio files needed

type Track = "map" | "battle" | "none";

// Note frequencies (Hz)
const NOTES: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

// Map theme: calm, peaceful melody in C major
const MAP_MELODY: { note: string; dur: number }[] = [
  { note: "E4", dur: 0.4 }, { note: "G4", dur: 0.4 }, { note: "C5", dur: 0.6 },
  { note: "B4", dur: 0.3 }, { note: "A4", dur: 0.5 },
  { note: "G4", dur: 0.4 }, { note: "E4", dur: 0.4 }, { note: "D4", dur: 0.6 },
  { note: "C4", dur: 0.3 }, { note: "E4", dur: 0.5 },
  { note: "G4", dur: 0.4 }, { note: "A4", dur: 0.4 }, { note: "G4", dur: 0.6 },
  { note: "E4", dur: 0.3 }, { note: "D4", dur: 0.5 },
  { note: "C4", dur: 0.4 }, { note: "D4", dur: 0.4 }, { note: "E4", dur: 0.8 },
];

// Map bass line
const MAP_BASS: { note: string; dur: number }[] = [
  { note: "C3", dur: 1.2 }, { note: "A3", dur: 1.0 },
  { note: "F3", dur: 1.2 }, { note: "G3", dur: 1.0 },
  { note: "C3", dur: 1.2 }, { note: "G3", dur: 1.0 },
  { note: "A3", dur: 1.2 }, { note: "G3", dur: 1.0 },
];

// Battle theme: fast, intense in A minor
const BATTLE_MELODY: { note: string; dur: number }[] = [
  { note: "A4", dur: 0.15 }, { note: "C5", dur: 0.15 }, { note: "E5", dur: 0.2 },
  { note: "A4", dur: 0.15 }, { note: "C5", dur: 0.15 }, { note: "D5", dur: 0.2 },
  { note: "E5", dur: 0.15 }, { note: "D5", dur: 0.15 }, { note: "C5", dur: 0.2 },
  { note: "A4", dur: 0.15 }, { note: "B4", dur: 0.15 }, { note: "C5", dur: 0.3 },
  { note: "E4", dur: 0.15 }, { note: "A4", dur: 0.15 }, { note: "G4", dur: 0.2 },
  { note: "A4", dur: 0.15 }, { note: "E4", dur: 0.15 }, { note: "G4", dur: 0.2 },
  { note: "A4", dur: 0.15 }, { note: "C5", dur: 0.15 }, { note: "B4", dur: 0.3 },
  { note: "A4", dur: 0.2 }, { note: "G4", dur: 0.2 }, { note: "E4", dur: 0.3 },
];

const BATTLE_BASS: { note: string; dur: number }[] = [
  { note: "A3", dur: 0.2 }, { note: "A3", dur: 0.2 }, { note: "E3", dur: 0.2 },
  { note: "A3", dur: 0.2 }, { note: "D3", dur: 0.2 }, { note: "D3", dur: 0.2 },
  { note: "E3", dur: 0.2 }, { note: "E3", dur: 0.2 },
  { note: "A3", dur: 0.2 }, { note: "A3", dur: 0.2 }, { note: "G3", dur: 0.2 },
  { note: "E3", dur: 0.2 }, { note: "F3", dur: 0.2 }, { note: "F3", dur: 0.2 },
  { note: "E3", dur: 0.2 }, { note: "E3", dur: 0.2 },
];

// One-shot sound effects. Each preset is a sequence of notes played in
// sequence (via `delay` in ms from trigger time) with short envelopes.
export type SFXKind =
  | "purchase"
  | "heal"
  | "item_use"
  | "hatch"
  | "learn"
  | "error";

interface SFXNote {
  freq: number;
  dur: number;
  delay: number;
  wave: OscillatorType;
  vol: number;
}

const SFX_PRESETS: Record<SFXKind, SFXNote[]> = {
  // Cash-register "ca-ching": two rising square blips
  purchase: [
    { freq: 987.77, dur: 0.08, delay: 0, wave: "square", vol: 0.22 },   // B5
    { freq: 1318.51, dur: 0.14, delay: 90, wave: "square", vol: 0.20 }, // E6
  ],
  // Rising C-E-G arpeggio
  heal: [
    { freq: 523.25, dur: 0.09, delay: 0, wave: "triangle", vol: 0.22 }, // C5
    { freq: 659.25, dur: 0.09, delay: 80, wave: "triangle", vol: 0.22 },// E5
    { freq: 783.99, dur: 0.16, delay: 160, wave: "triangle", vol: 0.22 },// G5
  ],
  // Short click-blip for generic item use
  item_use: [
    { freq: 880.0, dur: 0.05, delay: 0, wave: "triangle", vol: 0.18 },
    { freq: 1174.66, dur: 0.07, delay: 50, wave: "triangle", vol: 0.16 },
  ],
  // Celebratory major arpeggio for egg hatch
  hatch: [
    { freq: 523.25, dur: 0.1, delay: 0, wave: "triangle", vol: 0.22 },
    { freq: 659.25, dur: 0.1, delay: 100, wave: "triangle", vol: 0.22 },
    { freq: 783.99, dur: 0.1, delay: 200, wave: "triangle", vol: 0.22 },
    { freq: 1046.5, dur: 0.22, delay: 300, wave: "triangle", vol: 0.24 },
  ],
  // Rising "ding" for learning a move
  learn: [
    { freq: 659.25, dur: 0.08, delay: 0, wave: "square", vol: 0.18 },
    { freq: 987.77, dur: 0.14, delay: 80, wave: "square", vol: 0.18 },
  ],
  // Low descending pair for errors / denials
  error: [
    { freq: 220, dur: 0.12, delay: 0, wave: "sawtooth", vol: 0.16 },
    { freq: 165, dur: 0.18, delay: 80, wave: "sawtooth", vol: 0.14 },
  ],
};

class MusicManagerClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: Track = "none";
  private melodyTimer: number | null = null;
  private bassTimer: number | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private volume = 0.15;
  private started = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  play(track: Track): void {
    if (track === this.currentTrack) return;
    this.stop();
    this.currentTrack = track;
    this.started = true;

    if (track === "map") {
      this.loopSequence(MAP_MELODY, "triangle", 0.12, "melody");
      this.loopSequence(MAP_BASS, "sine", 0.08, "bass");
    } else if (track === "battle") {
      this.loopSequence(BATTLE_MELODY, "square", 0.08, "melody");
      this.loopSequence(BATTLE_BASS, "sawtooth", 0.06, "bass");
    }
  }

  stop(): void {
    this.currentTrack = "none";
    if (this.melodyTimer !== null) { clearTimeout(this.melodyTimer); this.melodyTimer = null; }
    if (this.bassTimer !== null) { clearTimeout(this.bassTimer); this.bassTimer = null; }
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.activeOscillators = [];
  }

  private loopSequence(
    seq: { note: string; dur: number }[],
    wave: OscillatorType,
    vol: number,
    kind: "melody" | "bass"
  ): void {
    const ctx = this.ensureContext();
    let idx = 0;

    const playNext = () => {
      if (this.currentTrack === "none") return;

      const { note, dur } = seq[idx % seq.length];
      const freq = NOTES[note];
      if (!freq || !this.masterGain) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = wave;
      osc.frequency.value = freq;

      // Gentle envelope
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(vol * 0.6, ctx.currentTime + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur * 0.95);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
      this.activeOscillators.push(osc);

      osc.onended = () => {
        this.activeOscillators = this.activeOscillators.filter((o) => o !== osc);
      };

      idx++;
      const timer = window.setTimeout(playNext, dur * 1000);
      if (kind === "melody") this.melodyTimer = timer;
      else this.bassTimer = timer;
    };

    playNext();
  }

  isStarted(): boolean {
    return this.started;
  }

  /** Play a short one-shot sound effect over the current track. */
  playSFX(kind: SFXKind): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    const preset = SFX_PRESETS[kind];
    for (const note of preset) {
      this.playOneShot(ctx, note);
    }
  }

  private playOneShot(ctx: AudioContext, note: SFXNote): void {
    if (!this.masterGain) return;
    const start = ctx.currentTime + note.delay / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = note.wave;
    osc.frequency.value = note.freq;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(note.vol, start + 0.008);
    gain.gain.linearRampToValueAtTime(note.vol * 0.7, start + note.dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, start + note.dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(start);
    osc.stop(start + note.dur + 0.02);
  }
}

export const MusicManager = new MusicManagerClass();
