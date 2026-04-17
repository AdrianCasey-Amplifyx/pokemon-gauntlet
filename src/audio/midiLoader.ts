// Minimal MIDI loader. Parses format-0/1 .mid files into the same
// TrackDef shape our hand-authored TRACKS use, so MusicManager can
// play them without a second engine. Only supports note-on, note-off,
// and set-tempo events; everything else (program change, CC, sysex,
// time-sig, etc.) is read past and ignored. Polyphonic MIDI tracks
// are reduced to monophonic by keeping the highest active pitch.

import type { TrackChannel, TrackDef } from "./tracks.ts";

// MIDI pitch 69 = A4 @ 440Hz; each semitone is 2^(1/12).
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiPitchToNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  return `${NOTE_NAMES[pitch % 12]}${octave}`;
}

// ------------------------------------------------------------------
// Byte-stream reader
// ------------------------------------------------------------------

interface Reader {
  pos: number;
  view: DataView;
}

function readByte(r: Reader): number {
  return r.view.getUint8(r.pos++);
}

function readUInt16(r: Reader): number {
  const v = r.view.getUint16(r.pos);
  r.pos += 2;
  return v;
}

function readUInt32(r: Reader): number {
  const v = r.view.getUint32(r.pos);
  r.pos += 4;
  return v;
}

function readString(r: Reader, n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += String.fromCharCode(readByte(r));
  return s;
}

/** Variable-length quantity: up to 4 bytes, 7 data bits each, top bit is continuation. */
function readVLQ(r: Reader): number {
  let v = 0;
  let b: number;
  do {
    b = readByte(r);
    v = (v << 7) | (b & 0x7f);
  } while (b & 0x80);
  return v;
}

// ------------------------------------------------------------------
// Event extraction
// ------------------------------------------------------------------

interface RawEvent {
  tick: number;
  kind: "note_on" | "note_off" | "tempo";
  pitch?: number;
  channel?: number;
  microsecondsPerBeat?: number;
}

function parseTrack(r: Reader, byteLen: number): RawEvent[] {
  const endPos = r.pos + byteLen;
  const events: RawEvent[] = [];
  let tick = 0;
  let runningStatus = 0;

  while (r.pos < endPos) {
    const delta = readVLQ(r);
    tick += delta;

    let status = r.view.getUint8(r.pos);
    if (status < 0x80) {
      // Running status: reuse last status byte, don't advance pos.
      status = runningStatus;
    } else {
      r.pos++;
      runningStatus = status;
    }

    const typeNibble = status >> 4;
    const channel = status & 0x0f;

    if (status === 0xff) {
      // Meta event
      const metaType = readByte(r);
      const metaLen = readVLQ(r);
      if (metaType === 0x51 && metaLen === 3) {
        const b0 = readByte(r);
        const b1 = readByte(r);
        const b2 = readByte(r);
        events.push({
          tick,
          kind: "tempo",
          microsecondsPerBeat: (b0 << 16) | (b1 << 8) | b2,
        });
      } else {
        r.pos += metaLen;
      }
    } else if (status === 0xf0 || status === 0xf7) {
      // SysEx — skip
      const len = readVLQ(r);
      r.pos += len;
    } else if (typeNibble === 0x9) {
      // Note on (velocity 0 == note off)
      const pitch = readByte(r);
      const velocity = readByte(r);
      if (velocity === 0) {
        events.push({ tick, kind: "note_off", pitch, channel });
      } else {
        events.push({ tick, kind: "note_on", pitch, channel });
      }
    } else if (typeNibble === 0x8) {
      // Note off
      const pitch = readByte(r);
      readByte(r); // velocity (ignored)
      events.push({ tick, kind: "note_off", pitch, channel });
    } else if (typeNibble === 0xa || typeNibble === 0xb || typeNibble === 0xe) {
      // 2-byte data events (aftertouch, CC, pitch-bend) — ignore
      r.pos += 2;
    } else if (typeNibble === 0xc || typeNibble === 0xd) {
      // 1-byte data events (program change, channel pressure) — ignore
      r.pos += 1;
    } else {
      // Unknown status — bail to avoid infinite loop.
      break;
    }
  }

  r.pos = endPos;
  return events;
}

// ------------------------------------------------------------------
// Note-span reconstruction + monophonic reduction
// ------------------------------------------------------------------

interface NoteSpan {
  pitch: number;
  startTick: number;
  endTick: number;
}

function buildSpans(events: RawEvent[]): NoteSpan[] {
  const spans: NoteSpan[] = [];
  const active = new Map<number, number>(); // pitch → startTick

  for (const ev of events) {
    if (ev.kind === "note_on" && ev.pitch !== undefined) {
      // Close any existing note at this pitch first (malformed MIDI safety net).
      const prior = active.get(ev.pitch);
      if (prior !== undefined) {
        spans.push({ pitch: ev.pitch, startTick: prior, endTick: ev.tick });
      }
      active.set(ev.pitch, ev.tick);
    } else if (ev.kind === "note_off" && ev.pitch !== undefined) {
      const start = active.get(ev.pitch);
      if (start !== undefined) {
        spans.push({ pitch: ev.pitch, startTick: start, endTick: ev.tick });
        active.delete(ev.pitch);
      }
    }
  }

  // Close dangling notes at the last-seen tick.
  const lastTick = events.length > 0 ? events[events.length - 1].tick : 0;
  for (const [pitch, start] of active) {
    spans.push({ pitch, startTick: start, endTick: lastTick });
  }

  return spans;
}

/**
 * Collapse potentially polyphonic spans into a monophonic sequence.
 * At every tick where the set of simultaneously-active notes changes,
 * pick the highest pitch — that's the melodic line most listeners hear.
 * Gaps where no note is active become rests.
 */
function toMonophonic(
  spans: NoteSpan[],
  totalTicks: number,
  ticksPerBeat: number
): Array<{ note: string | null; beats: number }> {
  if (spans.length === 0) return [];

  // Two events per span: on and off. Sort by tick; at the same tick,
  // process offs before ons so chords don't briefly "drop out" at
  // a sustain break.
  interface E { tick: number; type: "on" | "off"; pitch: number }
  const events: E[] = [];
  for (const s of spans) {
    events.push({ tick: s.startTick, type: "on", pitch: s.pitch });
    events.push({ tick: s.endTick, type: "off", pitch: s.pitch });
  }
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === b.type) return 0;
    return a.type === "off" ? -1 : 1;
  });

  const active = new Set<number>();
  const segments: Array<{ startTick: number; pitch: number | null }> = [];

  let i = 0;
  while (i < events.length) {
    const tick = events[i].tick;
    while (i < events.length && events[i].tick === tick) {
      const ev = events[i];
      if (ev.type === "on") active.add(ev.pitch);
      else active.delete(ev.pitch);
      i++;
    }
    const highest = active.size === 0 ? null : Math.max(...active);
    const last = segments[segments.length - 1];
    if (!last || last.pitch !== highest) {
      segments.push({ startTick: tick, pitch: highest });
    }
  }

  const result: Array<{ note: string | null; beats: number }> = [];
  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s];
    const endTick = s + 1 < segments.length ? segments[s + 1].startTick : totalTicks;
    const beats = (endTick - seg.startTick) / ticksPerBeat;
    if (beats <= 0) continue;
    result.push({
      note: seg.pitch === null ? null : midiPitchToNoteName(seg.pitch),
      beats,
    });
  }

  return result;
}

// ------------------------------------------------------------------
// Top-level parse
// ------------------------------------------------------------------

/**
 * Parse a .mid file ArrayBuffer into a TrackDef.
 *
 * Wave assignment for voices, in order of first non-empty MIDI track:
 * square / square / triangle / triangle. Any drum-channel (MIDI
 * channel 10 / index 9) events are discarded since we have no noise
 * channel.
 */
export function parseMidi(buffer: ArrayBuffer): TrackDef {
  const r: Reader = { pos: 0, view: new DataView(buffer) };

  // Header chunk
  const headerId = readString(r, 4);
  if (headerId !== "MThd") {
    throw new Error(`Not a MIDI file (got ${headerId})`);
  }
  const headerLen = readUInt32(r);
  readUInt16(r); // format — we handle 0 and 1 uniformly
  const numTracks = readUInt16(r);
  const division = readUInt16(r);
  if (division & 0x8000) {
    throw new Error("SMPTE timing not supported");
  }
  const ticksPerBeat = division;
  r.pos += headerLen - 6; // skip any trailing header bytes

  // Collect per-track events.
  const trackEvents: RawEvent[][] = [];
  const allTempoEvents: RawEvent[] = [];

  for (let t = 0; t < numTracks; t++) {
    const chunkId = readString(r, 4);
    const chunkLen = readUInt32(r);
    if (chunkId !== "MTrk") {
      r.pos += chunkLen;
      continue;
    }
    const events = parseTrack(r, chunkLen);
    // Strip drum-channel note events.
    const filtered = events.filter(
      (ev) => ev.kind === "tempo" || ev.channel !== 9
    );
    trackEvents.push(filtered);
    for (const ev of filtered) {
      if (ev.kind === "tempo") allTempoEvents.push(ev);
    }
  }

  // Tempo: first Set Tempo meta event wins; default to 120 BPM.
  let microsecondsPerBeat = 500000;
  for (const ev of allTempoEvents) {
    if (ev.microsecondsPerBeat !== undefined) {
      microsecondsPerBeat = ev.microsecondsPerBeat;
      break;
    }
  }
  const bpm = 60_000_000 / microsecondsPerBeat;

  // Reduce each track to a monophonic voice.
  const spansByTrack = trackEvents.map(buildSpans);
  let totalTicks = 0;
  for (const spans of spansByTrack) {
    for (const s of spans) totalTicks = Math.max(totalTicks, s.endTick);
  }

  const voices: TrackChannel[] = [];
  const waves: OscillatorType[] = ["square", "square", "triangle", "triangle"];
  const volumes: number[] = [0.11, 0.09, 0.09, 0.08];

  for (const spans of spansByTrack) {
    if (spans.length === 0) continue;
    const notes = toMonophonic(spans, totalTicks, ticksPerBeat);
    if (notes.length === 0) continue;
    const idx = voices.length;
    if (idx >= waves.length) break; // cap at 4 voices
    voices.push({
      wave: waves[idx],
      volume: volumes[idx],
      notes,
    });
  }

  // Fall back to a silent single voice so MusicManager doesn't choke.
  if (voices.length === 0) {
    voices.push({ wave: "square", volume: 0, notes: [{ note: null, beats: 1 }] });
  }

  return { bpm, channels: voices };
}

// ------------------------------------------------------------------
// Bulk loader
// ------------------------------------------------------------------

// Vite will resolve each .mid file to an asset URL at build time. The
// eager glob + ?url query makes this a sync map in the bundle.
const MIDI_URL_MAP = import.meta.glob("./midi/*.mid", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/**
 * Fetch + parse every .mid in `src/audio/midi/`, keyed by basename.
 * Files with a leading underscore (e.g. `_spare_trainer_battle.mid`)
 * are skipped so the player can park alternatives without them
 * auto-playing.
 */
export async function loadAllMidiTracks(): Promise<Record<string, TrackDef>> {
  const out: Record<string, TrackDef> = {};
  const entries = Object.entries(MIDI_URL_MAP);

  await Promise.all(
    entries.map(async ([path, url]) => {
      const basename = path.split("/").pop()?.replace(/\.mid$/, "");
      if (!basename || basename.startsWith("_")) return;
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        out[basename] = parseMidi(buffer);
      } catch (err) {
        console.warn(`[midi] failed to load ${basename}:`, err);
      }
    })
  );

  return out;
}
