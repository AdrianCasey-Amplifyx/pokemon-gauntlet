// Procedural music using Web Audio API.
//
// Track definitions live either in `./tracks.ts` (hand-authored
// chiptune, used as a fallback) or are loaded from `./midi/*.mid`
// at boot via `./midiLoader.ts` (preferred when present). Both
// sources produce the same `TrackDef { bpm, channels[] }` shape;
// MusicManager spawns one self-scheduling timer per channel, each
// looping its own notes[] independently.

import { TRACKS, type TrackId } from "./tracks.ts";
import type { TrackDef } from "./tracks.ts";
import { loadAllMidiTracks } from "./midiLoader.ts";

// Note frequencies generated for the full MIDI range. Covers C0-C8
// plus enharmonic flat spellings (Bb ≡ A#, etc.) so tracks written
// in flat keys don't trip on missing keys.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_ALIAS: Record<string, string> = {
  "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb",
};
const NOTES: Record<string, number> = (() => {
  const result: Record<string, number> = {};
  for (let midi = 0; midi <= 127; midi++) {
    const octave = Math.floor(midi / 12) - 1;
    const name = NOTE_NAMES[midi % 12];
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    result[`${name}${octave}`] = freq;
    const flat = FLAT_ALIAS[name];
    if (flat) result[`${flat}${octave}`] = freq;
  }
  return result;
})();

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
    { freq: 987.77, dur: 0.08, delay: 0, wave: "square", vol: 0.22 },
    { freq: 1318.51, dur: 0.14, delay: 90, wave: "square", vol: 0.20 },
  ],
  // Rising C-E-G arpeggio
  heal: [
    { freq: 523.25, dur: 0.09, delay: 0, wave: "triangle", vol: 0.22 },
    { freq: 659.25, dur: 0.09, delay: 80, wave: "triangle", vol: 0.22 },
    { freq: 783.99, dur: 0.16, delay: 160, wave: "triangle", vol: 0.22 },
  ],
  item_use: [
    { freq: 880.0, dur: 0.05, delay: 0, wave: "triangle", vol: 0.18 },
    { freq: 1174.66, dur: 0.07, delay: 50, wave: "triangle", vol: 0.16 },
  ],
  hatch: [
    { freq: 523.25, dur: 0.1, delay: 0, wave: "triangle", vol: 0.22 },
    { freq: 659.25, dur: 0.1, delay: 100, wave: "triangle", vol: 0.22 },
    { freq: 783.99, dur: 0.1, delay: 200, wave: "triangle", vol: 0.22 },
    { freq: 1046.5, dur: 0.22, delay: 300, wave: "triangle", vol: 0.24 },
  ],
  learn: [
    { freq: 659.25, dur: 0.08, delay: 0, wave: "square", vol: 0.18 },
    { freq: 987.77, dur: 0.14, delay: 80, wave: "square", vol: 0.18 },
  ],
  error: [
    { freq: 220, dur: 0.12, delay: 0, wave: "sawtooth", vol: 0.16 },
    { freq: 165, dur: 0.18, delay: 80, wave: "sawtooth", vol: 0.14 },
  ],
};

export type { TrackId } from "./tracks.ts";

class MusicManagerClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: TrackId = "none";
  private channelTimers: number[] = [];
  private activeOscillators: OscillatorNode[] = [];
  private volume = 0.15;
  private started = false;
  private midiTracks: Record<string, TrackDef> = {};
  private initPromise: Promise<void> | null = null;

  /** Fetch + parse every .mid in `src/audio/midi/`. Idempotent. */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = loadAllMidiTracks().then((tracks) => {
        this.midiTracks = tracks;
      });
    }
    return this.initPromise;
  }

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

  /**
   * Resolve a track id to its playable definition.
   *
   * Fallback chain:
   *   1. MIDI loaded for this exact id
   *   2. battle_final -> battle_boss (if user hasn't sourced a champion theme)
   *   3. MIDI loaded for "town" (generic hub fallback)
   *   4. Hand-authored tracks.ts entry for this id
   *   5. null (silent)
   */
  private resolveTrack(id: TrackId): TrackDef | null {
    if (id === "none") return null;
    if (this.midiTracks[id]) return this.midiTracks[id];
    if (id === "battle_final" && this.midiTracks["battle_boss"]) {
      return this.midiTracks["battle_boss"];
    }
    if (this.midiTracks["town"]) return this.midiTracks["town"];
    if (TRACKS[id]) return TRACKS[id];
    return null;
  }

  play(track: TrackId): void {
    if (track === this.currentTrack) return;
    this.stop();
    this.currentTrack = track;
    this.started = true;

    const def = this.resolveTrack(track);
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
