import { useState, useRef, useCallback } from "react";
import { VrmViewer } from "../features/vrm/VrmViewer";
import { LipSyncAnalyser } from "../features/audio/lipSyncAnalyser";

interface LipSyncPanelProps {
  viewer: VrmViewer | null;
  lipSyncAnalyser: LipSyncAnalyser;
  mouthOpenValue: number;
  onMouthOpenChange: (value: number) => void;
  onLog: (message: string, level?: "info" | "warn" | "error") => void;
}

export default function LipSyncPanel({
  viewer,
  lipSyncAnalyser,
  mouthOpenValue,
  onMouthOpenChange,
  onLog,
}: LipSyncPanelProps) {
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const [isPlayingLocal, setIsPlayingLocal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      onMouthOpenChange(value);
      viewer?.setMouthOpen(value);
    },
    [viewer, onMouthOpenChange]
  );

  const handleLocalFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Revoke previous URL
      if (localAudioUrl) {
        URL.revokeObjectURL(localAudioUrl);
      }

      const url = URL.createObjectURL(file);
      setLocalAudioUrl(url);
      onLog(`加载本地音频: ${file.name}`, "info");
    },
    [localAudioUrl, onLog]
  );

  const handlePlayLocal = useCallback(() => {
    if (!localAudioUrl || !viewer) {
      onLog("请先选择本地音频文件", "warn");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(localAudioUrl);
    audioRef.current = audio;

    audio.addEventListener("play", () => {
      setIsPlayingLocal(true);
      try {
        lipSyncAnalyser.connect(audio);
      } catch {
        onLog("口型分析器连接失败", "warn");
      }
      onLog("开始播放本地音频，驱动口型", "info");
    });

    audio.addEventListener("ended", () => {
      setIsPlayingLocal(false);
      lipSyncAnalyser.disconnect();
      onMouthOpenChange(0);
      viewer.setMouthOpen(0);
      onLog("本地音频播放完毕", "info");
    });

    audio.addEventListener("error", () => {
      setIsPlayingLocal(false);
      lipSyncAnalyser.disconnect();
      onLog("本地音频播放失败", "error");
    });

    audio.play().catch((err) => {
      onLog(`音频播放出错: ${(err as Error).message}`, "error");
    });
  }, [localAudioUrl, viewer, lipSyncAnalyser, onMouthOpenChange, onLog]);

  const handleStopLocal = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    lipSyncAnalyser.disconnect();
    setIsPlayingLocal(false);
    onMouthOpenChange(0);
    viewer?.setMouthOpen(0);
    onLog("停止本地音频", "info");
  }, [lipSyncAnalyser, onMouthOpenChange, viewer, onLog]);

  return (
    <div className="panel-section">
      <div className="panel-section-header">
        <span>口型调试</span>
      </div>
      <div className="panel-section-body">
        {/* Manual Slider */}
        <label>
          手动嘴型滑杆
          <div className="slider-group">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mouthOpenValue}
              onChange={handleSliderChange}
            />
            <span className="slider-value">{mouthOpenValue.toFixed(2)}</span>
          </div>
        </label>

        {/* Local Audio */}
        <button
          className="btn-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          选择本地音频 (mp3/wav)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav"
          style={{ display: "none" }}
          onChange={handleLocalFileSelect}
        />

        {localAudioUrl && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            已选择本地音频
          </div>
        )}

        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="btn-sm btn-success"
            onClick={handlePlayLocal}
            disabled={!localAudioUrl || isPlayingLocal || !viewer}
          >
            ▶ 播放本地
          </button>
          <button
            className="btn-sm btn-warning"
            onClick={handleStopLocal}
            disabled={!isPlayingLocal}
          >
            ⏹ 停止
          </button>
        </div>

        {isPlayingLocal && (
          <div className="status-badge success">
            <span className="status-dot success" /> 本地音频驱动中
          </div>
        )}
      </div>
    </div>
  );
}