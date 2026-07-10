/**
 * AudioEngine — 基于 AudioBuffer 的精准无间隙音频调度 + LiveTalking 风格实时 FFT 口型驱动
 *
 * 借鉴 LiveTalking 方案：在音频链路上插入 AnalyserNode，
 * 每帧通过 getByteFrequencyData() 获取浏览器 C++ 层优化的 FFT 频谱，
 * 分频段提取能量驱动 Live2D 双参数口型同步。
 *
 * 核心特性：
 *   1. fetch → decodeAudioData → AudioBuffer 预加载队列
 *   2. AudioBufferSourceNode.start(when) 实现段间 0 间隙衔接
 *   3. AnalyserNode.getByteFrequencyData() 实时 FFT，零 JS 计算开销
 *   4. 低频 (125-500Hz)  → ParamMouthOpenY  (张嘴 a/o 元音)
 *   5. 中频 (500-2000Hz) → ParamMouthForm   (咧嘴 i/e 元音)
 */

export interface AudioEngineItem {
  seq: number;
  text_chunk?: string;
  audio_url: string;
}

export interface AudioEngineCallbacks {
  onPlayStart: (item: AudioEngineItem) => void;
  onPlayEnd: (item: AudioEngineItem) => void;
  onPlayError: (item: AudioEngineItem, error: Error) => void;
  onQueueEmpty: () => void;
  onLog: (message: string, level?: "info" | "warn" | "error") => void;
  /** 每帧回调：mouthOpen(0-1), mouthForm(0-1) */
  onLipSync: (mouthOpen: number, mouthForm: number) => void;
}

interface ReadyBuffer {
  item: AudioEngineItem;
  buffer: AudioBuffer;
}

interface PlayingState {
  item: AudioEngineItem;
  scheduledStart: number;
  duration: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private callbacks: AudioEngineCallbacks;

  private queue: AudioEngineItem[] = [];
  private readyBuffers: ReadyBuffer[] = [];
  private loadingSeqs = new Set<number>();

  private playing: PlayingState | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  private isStopped = false;
  private destroyRequested = false;

  private static readonly PRELOAD_COUNT = 3;
  private static readonly MAX_CONSECUTIVE_FAILURES = 3;
  private consecutiveFailures = 0;

  private animFrameId: number | null = null;

  // ─── FFT 配置 ────────────────────────────────────────────
  private readonly FFT_SIZE = 1024;    // 1024 → 更高频率分辨率（~23Hz/bin @ 48kHz）
  private sampleRate = 48000;

  // ─── 频段边界 (Hz) ──────────────────────────────────────
  private static readonly LOW_START = 100;
  private static readonly LOW_END = 500;
  private static readonly MID_START = 500;
  private static readonly MID_END = 2500;
  private static readonly HIGH_START = 2500;
  private static readonly HIGH_END = 4500;

  // ─── EMA 平滑系数 ──────────────────────────────────────
  private smoothedMouthOpen = 0;
  private smoothedMouthForm = 0.5;
  private readonly ATTACK = 0.4;
  private readonly DECAY = 0.08;

  // ─── 噪声门限 ───────────────────────────────────────────
  private readonly NOISE_FLOOR = 0.015;

  // ─── 增益（适中，不饱和） ──────────────────────────────
  private readonly GAIN_OPEN = 2.0;
  private readonly GAIN_FORM = 1.5;

  // ─── 预计算的 bin 索引 ─────────────────────────────────
  private lowStartBin = 0;
  private lowEndBin = 0;
  private midStartBin = 0;
  private midEndBin = 0;
  private highStartBin = 0;
  private highEndBin = 0;

  // ─── 调试：帧计数 & 日志节流 ──────────────────────────
  private frameCount = 0;
  private lastDebugLog = 0;

  // ─── 诊断：上一次帧的 max freq magnitude（用于检测静默数据） ──
  private lastMaxFreqMag = 0;
  private zeroDataFrameCount = 0;
  private lipSyncActive = false;

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
    // 【修复】延迟创建 AudioContext，不在构造函数中创建
    // 避免浏览器自动播放策略干扰，改为在 ensureResumed() 首次调用时懒初始化
    this.startLipSyncLoop();
    console.log("[AudioEngine] Created (AudioContext deferred)");
  }

  /** 懒初始化 AudioContext + AnalyserNode */
  private initAudioContext(): void {
    if (this.audioContext) return;
    try {
      this.audioContext = new AudioContext();
      this.sampleRate = this.audioContext.sampleRate;
      console.log(
        `[AudioEngine] ✅ AudioContext created: sampleRate=${this.sampleRate}, state=${this.audioContext.state}`
      );
      this.initAnalyser();
      this.callbacks.onLog(
        `AudioContext 已创建: sampleRate=${this.sampleRate}, state=${this.audioContext.state}`,
        "info"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[AudioEngine] ❌ Failed to create AudioContext:", msg);
      this.callbacks.onLog(`AudioContext 创建失败: ${msg}`, "error");
    }
  }

  private initAnalyser(): void {
    if (!this.audioContext) return;

    // 如果已有旧 analyser，先断开
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch { /* */ }
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.5; // 适度平滑

    // ⚠️ 关键：analyser → destination
    this.analyser.connect(this.audioContext.destination);

    // 预计算频段 bin 索引
    const binWidth = this.sampleRate / this.FFT_SIZE;
    const binCount = this.FFT_SIZE / 2;

    this.lowStartBin = Math.max(0, Math.floor(AudioEngine.LOW_START / binWidth));
    this.lowEndBin = Math.min(binCount, Math.ceil(AudioEngine.LOW_END / binWidth));
    this.midStartBin = Math.max(0, Math.floor(AudioEngine.MID_START / binWidth));
    this.midEndBin = Math.min(binCount, Math.ceil(AudioEngine.MID_END / binWidth));
    this.highStartBin = Math.max(0, Math.floor(AudioEngine.HIGH_START / binWidth));
    this.highEndBin = Math.min(binCount, Math.ceil(AudioEngine.HIGH_END / binWidth));

    console.log(
      `[AudioEngine] ✅ Analyser created: fftSize=${this.FFT_SIZE}, ` +
      `binWidth=${binWidth.toFixed(1)}Hz, ` +
      `low=[${this.lowStartBin}..${this.lowEndBin}], ` +
      `mid=[${this.midStartBin}..${this.midEndBin}], ` +
      `high=[${this.highStartBin}..${this.highEndBin}]`
    );
  }

  /** 获取 AudioContext 状态（供 UI 显示） */
  getAudioContextState(): string {
    if (!this.audioContext) return "uncreated";
    return this.audioContext.state;
  }

  /** 是否正在进行 lip-sync（供 UI 显示） */
  isLipSyncActive(): boolean {
    return this.lipSyncActive;
  }

  async ensureResumed(): Promise<boolean> {
    // 【修复】懒初始化 AudioContext
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) {
      this.callbacks.onLog("❌ AudioContext 不可用", "error");
      return false;
    }

    const ac = this.audioContext;

    if (ac.state === "suspended") {
      try {
        console.log("[AudioEngine] 🔄 Resuming AudioContext (was suspended)...");
        this.callbacks.onLog("正在恢复 AudioContext...", "info");
        await ac.resume();
        console.log(`[AudioEngine] AudioContext state after resume: ${ac.state}`);
        this.callbacks.onLog(`AudioContext 恢复后状态: ${ac.state}`, "info");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[AudioEngine] ❌ resume failed: ${msg}`);
        this.callbacks.onLog(`AudioContext 恢复失败: ${msg}`, "error");
        return false;
      }
    }

    const ok = ac.state === "running";
    if (!ok) {
      console.warn(`[AudioEngine] ⚠️ AudioContext not running, state=${ac.state}`);
      this.callbacks.onLog(
        `⚠️ AudioContext 未能进入 running 状态: ${ac.state}（可能需要用户手势交互）`,
        "warn"
      );
    }
    return ok;
  }

  enqueue(items: AudioEngineItem[]): void {
    console.log(`[AudioEngine] 📦 enqueue ${items.length} items, queue=${this.queue.length}, ready=${this.readyBuffers.length}`);
    for (const item of items) {
      if (item.audio_url) {
        this.queue.push(item);
      }
    }
    this.preloadNext();
    this.tryPlayNext();
  }

  private preloadNext(): void {
    let toLoad = 0;
    const needed = AudioEngine.PRELOAD_COUNT - this.readyBuffers.length;

    for (const item of this.queue) {
      if (toLoad >= needed) break;
      const alreadyReady = this.readyBuffers.some((r) => r.item.seq === item.seq);
      if (this.loadingSeqs.has(item.seq) || alreadyReady) continue;

      this.loadingSeqs.add(item.seq);
      this.loadAndDecode(item);
      toLoad++;
    }
  }

  private async loadAndDecode(item: AudioEngineItem): Promise<void> {
    const ctx = this.audioContext;
    if (!ctx) {
      this.loadingSeqs.delete(item.seq);
      this.callbacks.onLog(`❌ 无法加载 seq=${item.seq}: AudioContext 不存在`, "error");
      this.handleLoadError(item, new Error("AudioContext not available"));
      return;
    }

    const url = this.resolveUrl(item.audio_url);
    if (!url) {
      this.loadingSeqs.delete(item.seq);
      this.callbacks.onLog(`❌ 无法加载 seq=${item.seq}: 无效 URL`, "error");
      this.handleLoadError(item, new Error("Invalid audio URL"));
      return;
    }

    console.log(`[AudioEngine] ⬇️  Fetching seq=${item.seq}: ${url}`);
    try {
      const startTime = performance.now();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const elapsed = (performance.now() - startTime).toFixed(0);

      this.readyBuffers.push({ item, buffer: audioBuffer });
      this.loadingSeqs.delete(item.seq);
      this.consecutiveFailures = 0;

      console.log(
        `[AudioEngine] ✅ Decoded seq=${item.seq}: ${audioBuffer.duration.toFixed(2)}s, ${arrayBuffer.byteLength} bytes, ${elapsed}ms`
      );
      this.callbacks.onLog(
        `音频就绪 seq=${item.seq}: ${audioBuffer.duration.toFixed(2)}s (${elapsed}ms)`,
        "info"
      );

      this.tryPlayNext();
      this.preloadNext();
    } catch (err) {
      this.loadingSeqs.delete(item.seq);
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[AudioEngine] ❌ Load failed seq=${item.seq}: ${error.message}, url=${url}`);
      this.callbacks.onLog(`音频加载失败 seq=${item.seq}: ${error.message}`, "error");
      this.handleLoadError(item, error);
    }
  }

  private handleLoadError(item: AudioEngineItem, error: Error): void {
    this.consecutiveFailures++;
    this.callbacks.onPlayError(item, error);
    if (this.consecutiveFailures >= AudioEngine.MAX_CONSECUTIVE_FAILURES) {
      this.callbacks.onLog(`连续 ${this.consecutiveFailures} 次加载失败，自动停止`, "error");
      this.clear();
    }
  }

  private tryPlayNext(): void {
    if (this.isStopped) return;
    if (this.currentSource) return;
    if (this.readyBuffers.length === 0) return;

    if (!this.audioContext) {
      console.warn("[AudioEngine] ⚠️ tryPlayNext: AudioContext not created yet");
      return;
    }
    if (this.audioContext.state !== "running") {
      console.warn(`[AudioEngine] ⚠️ tryPlayNext: AudioContext state=${this.audioContext.state}, not running`);
      this.callbacks.onLog(`⏸️ AudioContext 未运行 (state=${this.audioContext.state})，等待恢复...`, "warn");
      return;
    }

    if (!this.analyser) {
      this.initAnalyser();
    }
    if (!this.analyser) {
      console.error("[AudioEngine] ❌ tryPlayNext: analyser not available");
      return;
    }

    this.readyBuffers.sort((a, b) => a.item.seq - b.item.seq);

    const ready = this.readyBuffers.shift()!;
    const queueIdx = this.queue.findIndex((q) => q.seq === ready.item.seq);
    if (queueIdx >= 0) {
      this.queue.splice(queueIdx, 1);
    }

    this.playReadyBuffer(ready);
  }

  private playReadyBuffer(ready: ReadyBuffer): void {
    const ctx = this.audioContext;
    const analyser = this.analyser;
    if (!ctx || !analyser) {
      console.error("[AudioEngine] ❌ playReadyBuffer: ctx or analyser is null");
      return;
    }

    // 【修复】在创建 source 前确保 analyser 通畅
    const source = ctx.createBufferSource();
    source.buffer = ready.buffer;

    // source → analyser（analyser → destination 已在 initAnalyser 中连接）
    source.connect(analyser);

    const now = ctx.currentTime;

    this.playing = {
      item: ready.item,
      scheduledStart: now,
      duration: ready.buffer.duration,
    };
    this.currentSource = source;

    source.onended = () => {
      try { source.disconnect(); } catch { /* */ }
      this.currentSource = null;
      console.log(`[AudioEngine] 🏁 Ended seq=${ready.item.seq}`);
      this.callbacks.onPlayEnd(ready.item);

      if (!this.isStopped) {
        // 微小延迟让最后一个 lip-sync 帧有数据可用
        setTimeout(() => this.tryPlayNext(), 0);
      }

      if (this.readyBuffers.length === 0 && this.queue.length === 0 && this.loadingSeqs.size === 0) {
        this.callbacks.onQueueEmpty();
      }
    };

    source.start(now);
    this.lipSyncActive = true;
    this.callbacks.onPlayStart(ready.item);
    console.log(
      `[AudioEngine] ▶️ Playing seq=${ready.item.seq}: ` +
      `"${(ready.item.text_chunk || "").slice(0, 40)}" ` +
      `(${ready.buffer.duration.toFixed(2)}s, at ${now.toFixed(2)})`
    );
  }

  // ─── 口型同步循环 ───────────────────────────────────────

  private startLipSyncLoop(): void {
    const loop = () => {
      if (this.destroyRequested) return;
      this.animFrameId = requestAnimationFrame(loop);
      this.updateLipSync();
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateLipSync(): void {
    this.frameCount++;

    if (!this.analyser) {
      // 还没初始化，输出中性值
      this.lipSyncActive = false;
      this.callbacks.onLipSync(0, 0.5);
      return;
    }

    const playing = this.playing;
    if (!playing || !this.currentSource) {
      // 无播放 → 闭嘴归中
      this.lipSyncActive = false;
      this.smoothedMouthOpen += (0 - this.smoothedMouthOpen) * this.DECAY;
      this.smoothedMouthForm += (0.5 - this.smoothedMouthForm) * this.DECAY;
      this.callbacks.onLipSync(this.smoothedMouthOpen, this.smoothedMouthForm);
      return;
    }

    const ctx = this.audioContext;
    if (!ctx) return;

    const elapsed = ctx.currentTime - playing.scheduledStart;
    if (elapsed > playing.duration + 0.1) {
      this.lipSyncActive = false;
      this.smoothedMouthOpen += (0 - this.smoothedMouthOpen) * this.DECAY;
      this.smoothedMouthForm += (0.5 - this.smoothedMouthForm) * this.DECAY;
      this.callbacks.onLipSync(this.smoothedMouthOpen, this.smoothedMouthForm);
      return;
    }

    // ─── 1. 时域信号 → RMS 音量 ──────────────────────────
    const timeData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeData);

    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / timeData.length);

    // ─── 2. 频域信号 → 频谱质心 ──────────────────────────
    const binCount = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(binCount);
    this.analyser.getByteFrequencyData(freqData);

    // 【诊断】检查频域数据是否全零
    let maxMag = 0;
    for (let i = 0; i < binCount; i++) {
      if (freqData[i] > maxMag) maxMag = freqData[i];
    }
    this.lastMaxFreqMag = maxMag;

    // 谱质心计算
    let weightedSum = 0;
    let totalMag = 0;
    const binWidth = this.sampleRate / this.FFT_SIZE;
    for (let i = 0; i < binCount; i++) {
      const mag = freqData[i];
      const freq = i * binWidth + binWidth / 2;
      weightedSum += mag * freq;
      totalMag += mag;
    }
    const centroid = totalMag > 0 ? weightedSum / totalMag : 0;

    // ─── 3. 计算目标值 ──────────────────────────────────
    let targetOpen = 0;
    let targetForm = 0.5;

    if (rms > this.NOISE_FLOOR && maxMag > 0) {
      targetOpen = Math.min(1, rms * this.GAIN_OPEN);

      const centroidNorm = (centroid - 600) / 2000;
      const centroidClamped = Math.max(0, Math.min(1, centroidNorm));
      targetForm = 0.1 + centroidClamped * 0.8;
      targetForm = 0.5 + (targetForm - 0.5) * this.GAIN_FORM;
    }

    // ─── 4. EMA 平滑 ────────────────────────────────────
    this.smoothedMouthOpen +=
      (targetOpen - this.smoothedMouthOpen) *
      (targetOpen > this.smoothedMouthOpen ? this.ATTACK : this.DECAY);
    this.smoothedMouthForm +=
      (targetForm - this.smoothedMouthForm) *
      (targetForm > this.smoothedMouthForm ? this.ATTACK : this.DECAY);

    this.smoothedMouthOpen = Math.max(0, Math.min(1, this.smoothedMouthOpen));
    this.smoothedMouthForm = Math.max(0, Math.min(1, this.smoothedMouthForm));

    // ─── 5. 诊断日志 ─────────────────────────────────────
    // 每 30 帧（约 0.5 秒）输出详细诊断
    if (this.frameCount % 30 === 0) {
      if (rms > this.NOISE_FLOOR && maxMag > 0) {
        this.zeroDataFrameCount = 0;
        console.log(
          `[AudioEngine] 🎤 LipSync #${this.frameCount}: ` +
          `rms=${rms.toFixed(3)} centroid=${centroid.toFixed(0)}Hz maxMag=${maxMag} ` +
          `→ open=${this.smoothedMouthOpen.toFixed(3)} form=${this.smoothedMouthForm.toFixed(3)} ` +
          `| state=${ctx.state}`
        );
      } else {
        this.zeroDataFrameCount++;
        console.log(
          `[AudioEngine] 🔇 LipSync #${this.frameCount}: ` +
          `rms=${rms.toFixed(4)} maxMag=${maxMag} centroid=${centroid.toFixed(0)}Hz ` +
          `(below noise floor or zero data, zeroCount=${this.zeroDataFrameCount}) ` +
          `| state=${ctx.state}`
        );
      }
    }

    this.lipSyncActive = true;
    this.callbacks.onLipSync(this.smoothedMouthOpen, this.smoothedMouthForm);
  }

  // ─── 控制 ─────────────────────────────────────────────────

  stop(): void {
    this.isStopped = true;
    this.clearInternal();
  }

  clear(): void {
    this.clearInternal();
  }

  private clearInternal(): void {
    this.isStopped = true;

    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* */ }
      try { this.currentSource.disconnect(); } catch { /* */ }
      this.currentSource = null;
    }
    this.playing = null;

    this.queue = [];
    this.readyBuffers = [];
    this.loadingSeqs.clear();
    this.consecutiveFailures = 0;

    this.smoothedMouthOpen = 0;
    this.smoothedMouthForm = 0.5;
    this.lipSyncActive = false;
    this.zeroDataFrameCount = 0;

    this.callbacks.onQueueEmpty();
  }

  destroy(): void {
    this.destroyRequested = true;
    this.clearInternal();
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch { /* */ }
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  getQueueLength(): number {
    return this.queue.length + this.readyBuffers.length;
  }

  isCurrentlyPlaying(): boolean {
    return this.currentSource !== null;
  }

  private resolveUrl(audioUrl: string): string {
    if (!audioUrl) return "";
    if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
      return audioUrl;
    }
    const base = (window as any).__AI_ENGINE_BASE_URL__ || "http://localhost:8000";
    const cleanBase = base.replace(/\/+$/, "");
    const path = audioUrl.startsWith("/") ? audioUrl : "/" + audioUrl;
    return cleanBase + path;
  }
}