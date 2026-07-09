import { useState, useRef, useCallback } from "react";
import { modelManifest, ModelEntry } from "../features/vrm/modelManifest";
import { VrmViewer } from "../features/vrm/VrmViewer";

interface ModelPanelProps {
  viewer: VrmViewer | null;
  currentModelId: string;
  currentModelUrl: string;
  currentModelName: string;
  isLoading: boolean;
  loadError: string | null;
  availableExpressions: string[];
  onSwitchModel: (entry: ModelEntry) => void;
  onLoadLocalFile: (file: File) => void;
  onLog: (message: string, level?: "info" | "warn" | "error") => void;
}

export default function ModelPanel({
  viewer,
  currentModelId,
  currentModelName,
  isLoading,
  loadError,
  availableExpressions,
  onSwitchModel,
  onLoadLocalFile,
  onLog,
}: ModelPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.name.endsWith(".vrm")) {
        onLoadLocalFile(file);
      } else {
        onLog("请选择 .vrm 格式的模型文件", "warn");
      }
    },
    [onLoadLocalFile, onLog]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".vrm")) {
        onLoadLocalFile(file);
      } else {
        onLog("请拖入 .vrm 格式的模型文件", "warn");
      }
    },
    [onLoadLocalFile, onLog]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePlayIdle = useCallback(
    (entry: ModelEntry) => {
      if (viewer && entry.idleAnimationUrl) {
        viewer.playIdleAnimation(entry.idleAnimationUrl);
        onLog(`尝试加载待机动画: ${entry.idleAnimationUrl}`, "info");
      } else {
        onLog("无待机动画配置", "warn");
      }
    },
    [viewer, onLog]
  );

  const handlePauseIdle = useCallback(() => {
    viewer?.pauseIdleAnimation();
  }, [viewer]);

  const handleResumeIdle = useCallback(() => {
    viewer?.resumeIdleAnimation();
  }, [viewer]);

  return (
    <div className="panel-section">
      <div className="panel-section-header">
        <span>模型调试</span>
        {isLoading && <span className="spinner" />}
      </div>
      <div className="panel-section-body">
        {/* Model List */}
        <div className="model-list">
          {modelManifest.map((entry) => (
            <div
              key={entry.id}
              className={`model-item ${currentModelId === entry.id ? "active" : ""}`}
            >
              <span className="model-item-name">{entry.name}</span>
              <div className="model-item-actions">
                <button
                  className="btn-sm"
                  onClick={() => onSwitchModel(entry)}
                >
                  {currentModelId === entry.id ? "当前" : "切换"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Local File */}
        <div
          className={`drop-zone ${isDragging ? "dragover" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <p>拖入 .vrm 文件或点击选择</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".vrm"
            onChange={handleFileSelect}
          />
        </div>

        {/* Current model status */}
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          <div>当前: {currentModelName || "未加载"}</div>
          {loadError && (
            <div style={{ color: "var(--error)", marginTop: 4 }}>
              {loadError}
            </div>
          )}
          {availableExpressions.length > 0 && (
            <div style={{ marginTop: 4 }}>
              Expressions: {availableExpressions.join(", ")}
            </div>
          )}
        </div>

        {/* Idle Animation Controls */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button
            className="btn-sm"
            onClick={() => {
              const current = modelManifest.find(
                (m) => m.id === currentModelId
              );
              if (current) handlePlayIdle(current);
            }}
            disabled={!viewer}
          >
            ▶ 待机动画
          </button>
          <button className="btn-sm" onClick={handlePauseIdle} disabled={!viewer}>
            ⏸ 暂停
          </button>
          <button className="btn-sm" onClick={handleResumeIdle} disabled={!viewer}>
            ▶ 恢复
          </button>
        </div>
      </div>
    </div>
  );
}