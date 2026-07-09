export class LipSyncAnalyser {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private onMouthOpen: (value: number) => void;
  private isRunning = false;

  // EMA asymmetric smoothing (ChatVRM-style)
  // Fast onset (attack), slow decay — mimics real human mouth dynamics
  private smoothedMouth = 0;
  private readonly ATTACK = 0.3;   // how fast mouth opens
  private readonly DECAY = 0.08;   // how slow mouth closes
  private readonly NOISE_FLOOR = 0.03; // silence threshold — below this → 0
  private readonly CURVE_POWER = 0.7;  // non-linear curvature (sqrt-like)
  private readonly GAIN = 2.5;         // post-curve gain

  constructor(onMouthOpen: (value: number) => void) {
    this.onMouthOpen = onMouthOpen;
    try {
      this.audioContext = new AudioContext();
    } catch {
      console.error("LipSyncAnalyser: Failed to create AudioContext");
    }
  }

  // Call during user gesture to unlock AudioContext, returns whether it's now running
  async ensureResumed(): Promise<boolean> {
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch (err) {
        console.error("LipSyncAnalyser: Failed to create AudioContext", err);
        return false;
      }
    }

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
        console.log("LipSyncAnalyser: AudioContext resumed, state =", this.audioContext.state);
      } catch (err) {
        console.error("LipSyncAnalyser: Failed to resume AudioContext", err);
        return false;
      }
    }
    return this.audioContext.state === "running";
  }

  // Returns true if lip sync can be used (AudioContext is running)
  canSync(): boolean {
    return this.audioContext !== null && this.audioContext.state === "running";
  }

  /**
   * Connect an HTMLAudioElement for lip-sync analysis.
   *
   * @returns `true` if lip-sync is active (Web Audio routing succeeded).
   *          `false` if it fell back to native playback (no lip-sync, but audio plays).
   */
  async connect(audioElement: HTMLAudioElement): Promise<boolean> {
    this.disconnect();

    if (!this.audioContext) {
      console.warn("LipSyncAnalyser: No AudioContext available, falling back to native playback");
      this.onMouthOpen(0);
      return false;
    }

    try {
      // If AudioContext is still suspended, try one final resume
      if (this.audioContext.state === "suspended") {
        try {
          await this.audioContext.resume();
        } catch (resumeErr) {
          console.error("LipSyncAnalyser: AudioContext resume failed in connect", resumeErr);
          this.onMouthOpen(0);
          return false; // fallback to native playback
        }
      }

      // Double-check: only route through AudioContext if truly running
      if (this.audioContext.state !== "running") {
        console.warn(
          "LipSyncAnalyser: AudioContext not running (state=" +
            this.audioContext.state +
            "), falling back to native playback (no lip sync)"
        );
        this.onMouthOpen(0);
        return false; // fallback to native playback — audio plays without lip-sync
      }

      // Create analyser node
      try {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.85;
      } catch (analyserErr) {
        console.error("LipSyncAnalyser: Failed to create AnalyserNode", analyserErr);
        this.onMouthOpen(0);
        return false;
      }

      // Create media element source — can throw if already connected elsewhere
      try {
        this.source = this.audioContext.createMediaElementSource(audioElement);
      } catch (sourceErr) {
        console.error(
          "LipSyncAnalyser: createMediaElementSource failed (audio element may already be connected to another AudioContext)",
          sourceErr
        );
        this.onMouthOpen(0);
        return false; // fallback to native playback
      }

      // Build the audio graph: source → analyser → destination
      try {
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      } catch (graphErr) {
        console.error("LipSyncAnalyser: Failed to build audio graph", graphErr);
        // Clean up partial connections
        try { this.source.disconnect(); } catch {}
        this.source = null;
        try { this.analyser.disconnect(); } catch {}
        this.analyser = null;
        this.onMouthOpen(0);
        return false; // fallback to native playback
      }

      this.isRunning = true;
      this.analyse();
      console.log("LipSyncAnalyser: Lip-sync active");
      return true; // lip-sync is active
    } catch (error) {
      console.error("LipSyncAnalyser connect error:", error);
      this.onMouthOpen(0);
      return false; // fallback to native playback
    }
  }

  private analyse = () => {
    if (!this.isRunning || !this.analyser) {
      return;
    }

    try {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteTimeDomainData(dataArray);

      // Compute RMS volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Noise gate: treat very low volume as silence
      const raw = rms < this.NOISE_FLOOR ? 0 : rms;

      // Non-linear curvature mapping (sqrt-like) + gain
      const curved = Math.pow(raw, this.CURVE_POWER) * this.GAIN;
      const target = Math.min(1, curved);

      // Asymmetric EMA: fast onset, slow decay (ChatVRM-style)
      if (target > this.smoothedMouth) {
        this.smoothedMouth += (target - this.smoothedMouth) * this.ATTACK;
      } else {
        this.smoothedMouth += (target - this.smoothedMouth) * this.DECAY;
      }

      this.onMouthOpen(this.smoothedMouth);
    } catch (err) {
      // Analyser may have been garbage-collected mid-playback
      console.warn("LipSyncAnalyser: analyse error, stopping lip sync", err);
      this.isRunning = false;
      this.onMouthOpen(0);
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
      try {
        this.source.disconnect();
      } catch {
        // ignore
      }
      this.source = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // ignore
      }
      this.analyser = null;
    }
    // Do NOT close AudioContext — reuse across audio queue items
    this.onMouthOpen(0);
  }

  // Called once at app teardown
  destroy(): void {
    this.disconnect();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}