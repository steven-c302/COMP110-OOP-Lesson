// Tiny chiptune synth (Web Audio): every sound effect and music loop is generated
// in the browser, so there are no audio files or licenses to worry about.
// Only the projector (/screen) plays audio.

type Wave = OscillatorType;

class Synth {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicGain: GainNode | null = null;
  muted = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private mood: Mood | null = null;
  private step = 0;

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === "running";
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  /** Duck the music under the TA's voice (slides) or bring it up (battles). */
  setMusicLevel(level: number) {
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.3);
  }

  tone(freq: number, dur: number, opts: { wave?: Wave; gain?: number; at?: number; slide?: number; out?: AudioNode } = {}) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + (opts.at ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.wave ?? "square";
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    const peak = opts.gain ?? 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(opts.out ?? this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur: number, opts: { gain?: number; at?: number; filter?: number; out?: AudioNode } = {}) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + (opts.at ?? 0);
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = opts.filter ?? 2000;
    const g = this.ctx.createGain();
    g.gain.value = opts.gain ?? 0.3;
    src.connect(f).connect(g).connect(opts.out ?? this.master);
    src.start(t);
  }

  // ------------------------------------------------------------ music
  music(mood: Mood | null) {
    if (mood === this.mood) return;
    this.mood = mood;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (!mood) return;
    const song = SONGS[mood];
    const stepMs = 60_000 / song.bpm / 2; // eighth notes
    this.step = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted || !this.musicGain) return;
      const i = this.step++ % song.bass.length;
      const out = this.musicGain;
      const b = song.bass[i];
      if (b) this.tone(midi(b), stepMs / 1000 * 0.9, { wave: "triangle", gain: 0.5, out });
      const m = song.lead[i % song.lead.length];
      if (m) this.tone(midi(m), (stepMs / 1000) * 0.8, { wave: song.leadWave, gain: 0.12, out });
      if (song.drums) {
        if (i % 4 === 0) this.tone(120, 0.12, { wave: "sine", gain: 0.5, slide: 40, out });
        if (i % 4 === 2) this.noise(0.08, { gain: 0.12, filter: 6000, out });
      }
    }, stepMs);
  }
}

type Mood = "lobby" | "think" | "battle" | "tension";

function midi(n: number) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

// Original little loops (MIDI note numbers, 0 = rest)
const SONGS: Record<Mood, { bpm: number; bass: number[]; lead: number[]; leadWave: Wave; drums: boolean }> = {
  lobby: {
    bpm: 112,
    bass: [45, 0, 45, 52, 43, 0, 43, 50, 41, 0, 41, 48, 43, 0, 43, 50],
    lead: [69, 0, 72, 76, 74, 0, 71, 0, 72, 0, 69, 72, 71, 0, 67, 0, 69, 0, 72, 76, 79, 0, 76, 0, 77, 0, 76, 72, 74, 0, 0, 0],
    leadWave: "square",
    drums: true,
  },
  think: {
    bpm: 84,
    bass: [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 50, 0, 0, 0],
    lead: [72, 0, 0, 76, 0, 0, 79, 0, 77, 0, 0, 74, 0, 0, 72, 0],
    leadWave: "triangle",
    drums: false,
  },
  tension: {
    bpm: 132,
    bass: [40, 40, 40, 40, 41, 41, 41, 41, 40, 40, 40, 40, 43, 43, 42, 42],
    lead: [0],
    leadWave: "square",
    drums: true,
  },
  battle: {
    bpm: 150,
    bass: [40, 40, 52, 40, 43, 43, 55, 43, 38, 38, 50, 38, 45, 45, 57, 47],
    lead: [64, 0, 67, 69, 71, 0, 69, 67, 64, 0, 62, 64, 67, 0, 71, 74, 76, 0, 74, 71, 69, 0, 67, 69, 71, 0, 0, 0, 64, 0, 0, 0],
    leadWave: "sawtooth",
    drums: true,
  },
};

export const synth = new Synth();

export type Sfx =
  | "pop" | "tick" | "tickHi" | "lock" | "reveal" | "correct" | "wrong" | "whoosh" | "hit" | "heavy"
  | "whiff" | "heal" | "guard" | "fumble" | "ko" | "fanfare" | "drum" | "gong" | "coin" | "cheer" | "slam";

export function sfx(name: Sfx) {
  const s = synth;
  if (!s.ctx || s.muted) return;
  switch (name) {
    case "pop":
      s.tone(660, 0.08, { wave: "square", gain: 0.15 });
      s.tone(990, 0.1, { wave: "square", gain: 0.12, at: 0.05 });
      break;
    case "tick":
      s.tone(1200, 0.04, { wave: "square", gain: 0.08 });
      break;
    case "tickHi":
      s.tone(1600, 0.06, { wave: "square", gain: 0.14 });
      break;
    case "lock":
      s.tone(520, 0.06, { gain: 0.15 });
      s.tone(780, 0.09, { gain: 0.15, at: 0.06 });
      break;
    case "reveal":
      s.tone(80, 0.35, { wave: "sine", gain: 0.6, slide: 40 });
      s.noise(0.25, { gain: 0.25, filter: 1200 });
      break;
    case "correct":
      [72, 76, 79, 84].forEach((n, i) => s.tone(midi(n), 0.14, { wave: "square", gain: 0.15, at: i * 0.08 }));
      break;
    case "wrong":
      s.tone(220, 0.3, { wave: "sawtooth", gain: 0.12, slide: 110 });
      break;
    case "whoosh":
      s.noise(0.25, { gain: 0.15, filter: 3000 });
      break;
    case "hit":
      s.noise(0.12, { gain: 0.4, filter: 1800 });
      s.tone(180, 0.1, { wave: "square", gain: 0.2, slide: 60 });
      break;
    case "heavy":
      s.noise(0.3, { gain: 0.6, filter: 900 });
      s.tone(140, 0.3, { wave: "sawtooth", gain: 0.3, slide: 35 });
      break;
    case "whiff":
      s.noise(0.18, { gain: 0.12, filter: 5000 });
      s.tone(900, 0.15, { wave: "sine", gain: 0.06, slide: 300 });
      break;
    case "heal":
      [76, 79, 83, 88].forEach((n, i) => s.tone(midi(n), 0.18, { wave: "triangle", gain: 0.18, at: i * 0.06 }));
      break;
    case "guard":
      s.tone(300, 0.15, { wave: "square", gain: 0.12 });
      s.tone(450, 0.2, { wave: "triangle", gain: 0.15, at: 0.05 });
      break;
    case "fumble":
      s.tone(400, 0.12, { wave: "square", gain: 0.12, slide: 200 });
      s.tone(300, 0.2, { wave: "square", gain: 0.12, at: 0.12, slide: 120 });
      break;
    case "ko":
      s.tone(60, 0.8, { wave: "sine", gain: 0.8, slide: 30 });
      s.noise(0.6, { gain: 0.5, filter: 700 });
      break;
    case "fanfare":
      [[67, 0], [67, 0.12], [67, 0.24], [72, 0.36], [76, 0.66], [79, 0.86]].forEach(([n, at], i) =>
        s.tone(midi(n), i === 5 ? 0.7 : 0.16, { wave: "square", gain: 0.16, at }),
      );
      [[48, 0.36], [55, 0.66], [60, 0.86]].forEach(([n, at]) => s.tone(midi(n), 0.5, { wave: "triangle", gain: 0.3, at }));
      break;
    case "drum":
      for (let i = 0; i < 14; i++) s.noise(0.06, { gain: 0.08 + i * 0.015, filter: 1500, at: i * 0.07 });
      break;
    case "gong":
      s.tone(110, 1.2, { wave: "sine", gain: 0.4 });
      s.tone(166, 1.0, { wave: "sine", gain: 0.2 });
      s.noise(0.4, { gain: 0.15, filter: 800 });
      break;
    case "coin":
      s.tone(988, 0.07, { gain: 0.12 });
      s.tone(1319, 0.2, { gain: 0.12, at: 0.07 });
      break;
    case "cheer":
      s.noise(0.5, { gain: 0.08, filter: 2500 });
      break;
    case "slam":
      s.tone(90, 0.4, { wave: "square", gain: 0.35, slide: 40 });
      s.noise(0.3, { gain: 0.35, filter: 1500 });
      break;
  }
}
