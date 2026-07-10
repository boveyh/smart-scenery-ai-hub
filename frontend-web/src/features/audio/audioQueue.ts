import { resolveAudioUrl } from "../../config";
import { LipSyncAnalyser } from "./lipSyncAnalyser";

export interface AudioQueueItem {
  seq: number;
  text_chunk?: string;
  audio_url: string;
}

export interface AudioQueueCallbacks {
  onPlayStart: (item: AudioQueueItem) => void;
  onPlayEnd: (item: AudioQueueItem) => void;
  onPlayError: (item: AudioQueueItem, error: Error) => void;
  onQueueEmpty: () => void;
  onLog: (message: string, level?: "info" | "warn" | "error") => void;
}

export class AudioQueue {
  private queue: AudioQueueItem[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private callbacks: AudioQueueCallbacks;
  private lipSyncAnalyser: LipSyncAnalyser;
  private isStopped = false;
  private consecutiveFailures = 0;
  private static readonly MAX_CONSECUTIVE_FAILURES = 3;

  constructor(
    callbacks: AudioQueueCallbacks,
    lipSyncAnalyser: LipSyncAnalyser
  ) {
    this.callbacks = callbacks;
    this.lipSyncAnalyser = lipSyncAnalyser;
  }

  async ensureAudioContextResumed(): Promise<boolean> {
    return this.lipSyncAnalyser.ensureResumed();
  }

  enqueue(items: AudioQueueItem[]) {
    for (const item of items) {
      if (item.audio_url) {
        this.queue.push(item);
      }
    }
    this.callbacks.onLog(`队列添加 ${items.length} 项, 当前队列长度 ${this.queue.length}`, "info");
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  clear() {
    this.isStopped = true;
    this.queue = [];
    this.consecutiveFailures = 0;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.lipSyncAnalyser.disconnect();
    this.isPlaying = false;
    this.callbacks.onLog("队列已清空", "info");
  }

  stop() {
    this.isStopped = true;
    this.queue = [];
    this.consecutiveFailures = 0;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.lipSyncAnalyser.disconnect();
    this.isPlaying = false;
  }

  destroy() {
    this.isStopped = true;
    this.clear();
    this.lipSyncAnalyser.destroy();
  }

  private async playNext() {
    if (this.isStopped || this.queue.length === 0) {
      this.isPlaying = false;
      this.callbacks.onQueueEmpty();
      return;
    }

    this.isPlaying = true;
    const item = this.queue.shift()!;
    this.callbacks.onPlayStart(item);
    this.callbacks.onLog(`播放 seq=${item.seq}: ${item.text_chunk || ""} [${item.audio_url}]`, "info");

    const url = resolveAudioUrl(item.audio_url);
    if (!url) {
      const err = new Error(`无效的音频URL: ${item.audio_url}`);
      this.callbacks.onPlayError(item, err);
      this.incrementFailureAndContinue();
      return;
    }

    let audio: HTMLAudioElement;
    try {
      audio = new Audio();
      // crossOrigin MUST be set BEFORE src — otherwise CORS headers won't be requested
      // and Web Audio API will output zeroes due to CORS access restrictions
      audio.crossOrigin = "anonymous";
      audio.src = url;
    } catch (constructErr) {
      const err = new Error(`创建音频元素失败: ${(constructErr as Error).message}, url=${url}`);
      this.callbacks.onPlayError(item, err);
      this.incrementFailureAndContinue();
      return;
    }
    this.currentAudio = audio;

    await new Promise<void>((resolve) => {
      const onEnded = () => {
        cleanup();
        this.consecutiveFailures = 0;
        this.callbacks.onPlayEnd(item);
        resolve();
      };

      const onError = () => {
        cleanup();
        const mediaErr = audio.error;
        let errMsg = `音频播放失败: ${url}`;
        if (mediaErr) {
          switch (mediaErr.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errMsg += ` [用户中断]`;
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errMsg += ` [网络错误]`;
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errMsg += ` [解码错误]`;
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errMsg += ` [格式不支持]`;
              break;
            default:
              errMsg += ` [未知错误 code=${mediaErr.code}]`;
          }
        }
        this.callbacks.onPlayError(item, new Error(errMsg));
        this.incrementFailureAndContinue();
        resolve();
      };

      const cleanup = () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
        this.lipSyncAnalyser.disconnect();
      };

      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);

      const connectAndPlay = async () => {
        let lipSyncActive = false;
        try {
          lipSyncActive = await this.lipSyncAnalyser.connect(audio);
        } catch (connectErr) {
          this.callbacks.onLog(
            `口型分析器连接失败: ${(connectErr as Error).message}，降级为原生播放`,
            "warn"
          );
          lipSyncActive = false;
        }

        if (!lipSyncActive) {
          this.callbacks.onLog("口型同步未激活，使用原生音频播放", "info");
        }

        audio.play().catch((playErr) => {
          cleanup();
          let detail = (playErr as Error).message || String(playErr);
          if (playErr instanceof DOMException) {
            switch (playErr.name) {
              case "NotAllowedError":
                detail = "浏览器阻止了自动播放（需要用户手势）";
                break;
              case "NotSupportedError":
                detail = "音频格式不支持";
                break;
              case "AbortError":
                detail = "播放被中断";
                break;
            }
          }
          this.callbacks.onPlayError(item, new Error(`音频启动失败: ${detail}`));
          this.incrementFailureAndContinue();
          resolve();
        });
      };
      connectAndPlay();
    });

    this.currentAudio = null;
    if (!this.isStopped) {
      this.playNext();
    }
  }

  private incrementFailureAndContinue(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= AudioQueue.MAX_CONSECUTIVE_FAILURES) {
      this.callbacks.onLog(
        `连续 ${this.consecutiveFailures} 次播放失败，自动停止队列`,
        "error"
      );
      this.clear();
      return;
    }
    this.currentAudio = null;
    if (!this.isStopped) {
      this.playNext();
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}