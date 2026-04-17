// Procedural music using Web Audio API.
//
// Track definitions live in `./tracks.ts` — each track is a list of
// channels (melody / bass / etc.) with its own BPM. At play time the
// manager spawns one self-scheduling timer per channel, each looping
// its own `notes[]` independently, so channels of different lengths
// still line up over the long run (Game Boy style). No sampled audio
// is ever loaded.

import { TRACKS, type TrackId } from "./tracks.ts";

// Note frequencies covering the range used across all tracks
// (A2 through C6, enharmonic spellings aliased).
const NOTES: Record<string, number> = {
  // Octave 2
  A2: 110.00, "A#2": 116.54, Bb2: 116.54, B2: 123.47,
  // Octave 3
  C3: 130.81, "C#3": 138.59, Db3: 138.59, D3: 146.83, "D#3": 155.56, Eb3: 155.56,
  E3: 164.81, F3: 174.61, "F#3": 185.00, Gb3: 185.00, G3: 196.00, "G#3": 207.65, Ab3: 207.65,
  A3: 220.00, "A#3": 233.08, Bb3: 233.08, B3: 246.94,
  // Octave 4
  C4: 261.63, "C#4": 277.18, Db4: 277.18, D4: 293.66, "D#4": 311.13, Eb4: 311.13,
  E4: 329.63, F4: 349.23, "F#4": 369.99, Gb4: 369.99, G4: 392.00, "G#4": 415.30, Ab4: 415.30,
  A4: 440.00, "A#4": 466.16, Bb4: 466.16, B4: 493.88,
  // Octave 5
  C5: 523.25, "C#5": 554.37, Db5: 554.37, D5: 587.33, "D#5": 622.25, Eb5: 622.25,
  E5: 659.25, F5: 698.46, "F#5": 739.99, Gb5: 739.99, G5: 783.99, "G#5": 830.61, Ab5: 830.61,
  A5: 880.00, "A#5": 932.33, Bb5: 932.33, B5: 987.77,
  // Octave 6
  C6: 1046.50, "C#6": 1108.73, Db6: 1108.73, D6: 1174.66, "D#6": 1244.51, Eb6: 1244.51,
  E6: 1318.51, F6: 1396.91,
};

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

// Re-export so callers only import one module.
export type { TrackId } from "./tracks.ts";

class MusicManagerClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: TrackId = "none";
  private channelTimers: number[] = [];
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

  play(track: TrackId): void {
    if (track === this.currentTrack) return;
    this.stop();
    this.currentTrack = track;
    this.started = true;

    if (track === "none") return;
    const def = TRACKS[track];
    if (!def) return;

    const secondsPerBeat = 60 / def.bpm;
    for (const channel of def.channels) {
      this.loopChannel(channel, secondsPerBeat);
    }
  }

  stop(): void {
    this.currentTrack = "none";
    for (const id of this.channelTimers) clearTimeout(id);
    this.channelTimers = [];
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.activeOscillators = [];
  }

  private loopChannel(
    channel: { wave: OscillatorType; volume: number; notes: Array<{ note: string | null; beats: number }> },
    secondsPerBeat: number
  ): void {
    const ctx = this.ensureContext();
    let idx = 0;

    const playNext = () => {
      if (this.currentTrack === "none") return;
      if (!this.masterGain) return;

      const step = channel.notes[idx % channel.notes.length];
      const dur = step.beats * secondsPerBeat;

      if (step.note !== null) {
        const freq = NOTES[step.note];
        if (freq !== undefined) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = channel.wave;
          osc.frequency.value = freq;

          // Gentle attack / release envelope so notes don't click.
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(channel.volume, ctx.currentTime + 0.02);
          gain.gain.linearRampToValueAtTime(channel.volume * 0.6, ctx.currentTime + dur * 0.7);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur * 0.95);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + dur);
          this.activeOscillators.push(osc);
          osc.onended = () => {
            this.activeOscillators = this.activeOscillators.filter((o) => o !== osc);
          };
        }
      }

      idx++;
      const timerId = window.setTimeout(playNext, dur * 1000);
      this.channelTimers.push(timerId);
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
