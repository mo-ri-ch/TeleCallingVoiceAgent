const FRAME_SIZE = 4096;
const TARGET_SAMPLE_RATE = 16000;
const SPEECH_RMS = 0.008;
const SPEECH_FRAMES_TO_START = 4;
const SILENCE_FRAMES_TO_END = 35;

function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const len = Math.round(input.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Blob([buf], { type: "audio/wav" });
}

export type VadState = "idle" | "listening" | "speech" | "processing";

export class VadRecorder {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private proc: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private speechFrames = 0;
  private silenceFrames = 0;
  private inSpeech = false;
  private active = false;

  constructor(
    private onUtterance: (blob: Blob) => void,
    private onState: (s: VadState) => void,
  ) {}

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.ctx = new AudioContext();
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.proc = this.ctx.createScriptProcessor(FRAME_SIZE, 1, 1);
    this.reset();
    this.active = true;

    this.proc.onaudioprocess = (e) => {
      if (!this.active) return;
      const samples = e.inputBuffer.getChannelData(0);
      const rms = Math.sqrt(samples.reduce((s, x) => s + x * x, 0) / samples.length);

      if (rms > SPEECH_RMS) {
        this.speechFrames++;
        this.silenceFrames = 0;
        if (!this.inSpeech && this.speechFrames >= SPEECH_FRAMES_TO_START) {
          this.inSpeech = true;
          this.chunks = [];
          this.onState("speech");
        }
      } else {
        if (this.inSpeech) this.silenceFrames++;
        else this.speechFrames = 0;
      }

      if (this.inSpeech) this.chunks.push(new Float32Array(samples));

      if (this.inSpeech && this.silenceFrames >= SILENCE_FRAMES_TO_END) {
        this.flush();
      }
    };

    this.src.connect(this.proc);
    this.proc.connect(this.ctx.destination);
    this.onState("listening");
  }

  private flush() {
    const rate = this.ctx?.sampleRate ?? 44100;
    const total = this.chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Float32Array(total);
    let pos = 0;
    for (const c of this.chunks) { merged.set(c, pos); pos += c.length; }
    this.reset();
    this.onState("processing");
    this.onUtterance(encodeWav(resample(merged, rate, TARGET_SAMPLE_RATE), TARGET_SAMPLE_RATE));
  }

  resumeListening() {
    this.reset();
    this.onState("listening");
  }

  private reset() {
    this.chunks = [];
    this.speechFrames = 0;
    this.silenceFrames = 0;
    this.inSpeech = false;
  }

  stop() {
    this.active = false;
    this.proc?.disconnect();
    this.src?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.stream = null; this.ctx = null; this.src = null; this.proc = null;
    this.onState("idle");
  }
}
