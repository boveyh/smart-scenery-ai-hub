/**
 * LipSyncAnalyser — 多频段频谱分析驱动 Live2D 双参数口型同步
 *
 * 替代简单的 RMS 音量包络，使用频谱能量分布区分：
 *   - 低频 (125-500Hz)  → ParamMouthOpenY  (张嘴 a/o 元音)
 *   - 中频 (500-2000Hz) → ParamMouthForm   (咧嘴 i/e 元音)
 *   - 高频 (2000-4000Hz) → 圆唇补偿 (u/ü 元音)
 *
 * 输出双回调: onMouthOpen(value: 0-1), onMouthForm(value: 0-1)
 */
export class LipSyncAnalyser {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private onMouthOpen: (value: number) => void;
  private onMouthForm: ((value: number) => void) | null = null;
  private isRunning = false;

  // Sampling rate assumption: usually 44100 or 48000
  private sampleRate = 48000;

  // Frequency band boundary indices (based on fftSize=512, sampleRate=48000)
  // bin width = sampleRate / fftSize = 48000 / 512 ≈ 93.75 Hz
  // We'll compute dynamically in analyse()

  // EMA asymmetric smoothing (ChatVRM-style)
  private smoothedMouthOpen = 0;
  private smoothedMouthForm = 0.5; // neutral at 0.5
  private readonly ATTACK = 0.3;
  private readonly DECAY = 0.08;
  private readonly NOISE_FLOOR = 0.02; // silence threshold
  private readonly GAIN_OPEN = 3.0;    // low-band gain for mouth open
  private readonly GAIN_FORM = 2.0;    // mid-band gain for mouth form
  private readonly CURVE_POWER = 0.6;  // non-linear curvature

  // Keep old single-callback compat
  constructor(onMouthOpen: (value: number) => void, onMouthForm?: (value: number) => void) {
    this.onMouthOpen = onMouthOpen;
    this.onMouthForm = onMouthForm || null;
    try {
      this.audioContext = new AudioContext();
      this.sampleRate = this.audioContext.sampleRate;
    } catch {
      console.error("LipSyncAnalyser: Failed to create AudioContext");
    }
  }

  /** Register a second callback for mouth form (horizontal stretch) */
  setMouthFormCallback(callback: (value: number) => void) {
    this.onMouthForm = callback;
  }

  async ensureResumed(): Promise<boolean> {
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
        this.sampleRate = this.audioContext.sampleRate;
      } catch (err) {
        console.error("LipSyncAnalyser: Failed to create AudioContext", err);
        return false;
      }
    }
    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.error("LipSyncAnalyser: Failed to resume AudioContext", err);
        return false;
      }
    }
    return this.audioContext.state === "running";
  }

  canSync(): boolean {
    return this.audioContext !== null && this.audioContext.state === "running";
  }

  async connect(audioElement: HTMLAudioElement): Promise<boolean> {
    this.disconnect();

    if (!this.audioContext) {
      console.warn("LipSyncAnalyser: No AudioContext available, falling back to native playback");
      this.onMouthOpen(0);
      if (this.onMouthForm) this.onMouthForm(0.5);
      return false;
    }

    try {
      if (this.audioContext.state === "suspended") {
        try {
          await this.audioContext.resume();
        } catch (resumeErr) {
          console.error("LipSyncAnalyser: AudioContext resume failed", resumeErr);
          this.onMouthOpen(0);
          if (this.onMouthForm) this.onMouthForm(0.5);
          return false;
        }
      }

      if (this.audioContext.state !== "running") {
        console.warn(`LipSyncAnalyser: AudioContext not running (state=${this.audioContext.state})`);
        this.onMouthOpen(0);
        if (this.onMouthForm) this.onMouthForm(0.5);
        return false;
      }

      // Create analyser — use frequency data instead of time-domain
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.75; // smooth frequency data

      this.source = this.audioContext.createMediaElementSource(audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.isRunning = true;
      this.analyse();
      console.log("LipSyncAnalyser: Multi-band lip-sync active (2D Live2D)");
      return true;
    } catch (error) {
      console.error("LipSyncAnalyser connect error:", error);
      this.onMouthOpen(0);
      if (this.onMouthForm) this.onMouthForm(0.5);
      return false;
    }
  }

  private analyse = () => {
    if (!this.isRunning || !this.analyser) {
      return;
    }

    try {
      const fftSize = this.analyser.fftSize;
      const binCount = this.analyser.frequencyBinCount; // fftSize/2
      const dataArray = new Uint8Array(binCount);
      this.analyser.getByteFrequencyData(dataArray);

      // Bin width: sampleRate / fftSize
      const binWidth = this.sampleRate / fftSize;

      // Frequency band boundaries (in Hz)
      const LOW_START = 125;
      const LOW_END = 500;
      const MID_START = 500;
      const MID_END = 2000;
      const HIGH_START = 2000;
      const HIGH_END = 4000;

      // Convert Hz to bin indices
      const lowStartBin = Math.max(0, Math.floor(LOW_START / binWidth));
      const lowEndBin = Math.min(binCount, Math.ceil(LOW_END / binWidth));
      const midStartBin = Math.max(0, Math.floor(MID_START / binWidth));
      const midEndBin = Math.min(binCount, Math.ceil(MID_END / binWidth));
      const highStartBin = Math.max(0, Math.floor(HIGH_START / binWidth));
      const highEndBin = Math.min(binCount, Math.ceil(HIGH_END / binWidth));

      // Compute average energy per band (0-255 range)
      let lowEnergy = 0, lowCount = 0;
      for (let i = lowStartBin; i < lowEndBin; i++) {
        lowEnergy += dataArray[i];
        lowCount++;
      }
      const lowAvg = lowCount > 0 ? lowEnergy / lowCount : 0;

      let midEnergy = 0, midCount = 0;
      for (let i = midStartBin; i < midEndBin; i++) {
        midEnergy += dataArray[i];
        midCount++;
      }
      const midAvg = midCount > 0 ? midEnergy / midCount : 0;

      let highEnergy = 0, highCount = 0;
      for (let i = highStartBin; i < highEndBin; i++) {
        highEnergy += dataArray[i];
        highCount++;
      }
      const highAvg = highCount > 0 ? highEnergy / highCount : 0;

      // Normalize to 0-1
      const maxBand = 255;
      const lowNorm = lowAvg / maxBand;
      const midNorm = midAvg / maxBand;
      const highNorm = highAvg / maxBand;

      // Total energy for silence detection
      let totalEnergy = 0;
      for (let i = 0; i < binCount; i++) {
        totalEnergy += dataArray[i];
      }
      const avgEnergy = totalEnergy / binCount / maxBand;

      // === Mouth Open (ParamMouthOpenY): driven primarily by low band ===
      // Low frequencies = jaw movement for a/o vowels
      let targetOpen = 0;
      if (avgEnergy > this.NOISE_FLOOR) {
        // Combine low (weight 0.7) + mid (weight 0.3) for overall volume
        const combined = lowNorm * 0.7 + midNorm * 0.3;
        targetOpen = Math.min(1, Math.pow(combined, this.CURVE_POWER) * this.GAIN_OPEN);
      }

      // === Mouth Form (ParamMouthForm): mid vs high ratio ===
      // mid-high ratio → i/e (stretch); high dominant → u/ü (round)
      let targetForm = 0.5; // neutral
      if (avgEnergy > this.NOISE_FLOOR) {
        if (midNorm > 0.01 || highNorm > 0.01) {
          // Ratio: mid / (mid + high) → closer to 1 = more stretch
          const ratio = midNorm / (midNorm + highNorm + 0.001);
          // Map ratio to form: ratio near 1 → form=1 (stretch), ratio near 0 → form=0 (round)
          const rawForm = ratio;
          targetForm = 0.5 + (rawForm - 0.5) * this.GAIN_FORM;
          targetForm = Math.max(0, Math.min(1, targetForm));
        }
      }

      // EMA smoothing
      if (targetOpen > this.smoothedMouthOpen) {
        this.smoothedMouthOpen += (targetOpen - this.smoothedMouthOpen) * this.ATTACK;
      } else {
        this.smoothedMouthOpen += (targetOpen - this.smoothedMouthOpen) * this.DECAY;
      }

      if (targetForm > this.smoothedMouthForm) {
        this.smoothedMouthForm += (targetForm - this.smoothedMouthForm) * this.ATTACK;
      } else {
        this.smoothedMouthForm += (targetForm - this.smoothedMouthForm) * this.DECAY;
      }

      // Clamp
      this.smoothedMouthOpen = Math.max(0, Math.min(1, this.smoothedMouthOpen));
      this.smoothedMouthForm = Math.max(0, Math.min(1, this.smoothedMouthForm));

      this.onMouthOpen(this.smoothedMouthOpen);
      if (this.onMouthForm) {
        this.onMouthForm(this.smoothedMouthForm);
      }
    } catch (err) {
      console.warn("LipSyncAnalyser: analyse error, stopping", err);
      this.isRunning = false;
      this.onMouthOpen(0);
      if (this.onMouthForm) this.onMouthForm(0.5);
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.analyse);
  };

  setMouthOpenCallback(callback: (value: number) => void) {
    this.onMouthOpen = callback;
  }

  disconnect(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch { /* */ }
      this.source = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch { /* */ }
      this.analyser = null;
    }
    this.onMouthOpen(0);
    if (this.onMouthForm) this.onMouthForm(0.5);
  }

  destroy(): void {
    this.disconnect();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}