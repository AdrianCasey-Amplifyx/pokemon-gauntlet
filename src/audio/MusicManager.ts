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
}

export const MusicManager = new MusicManagerClass();
