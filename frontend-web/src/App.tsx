import { useState, useCallback, useRef } from "react";
import { VrmViewer } from "./features/vrm/VrmViewer";
import { LipSyncAnalyser } from "./features/audio/lipSyncAnalyser";
import { AudioQueue } from "./features/audio/audioQueue";
import { modelManifest, ModelEntry } from "./features/vrm/modelManifest";
import type { DigitalHumanChunk, LogEntry } from "./api/types";
import { streamDigitalHumanChat } from "./api/digitalHumanClient";
import { config } from "./config";

import VrmStage from "./components/VrmStage";

let logIdCounter = 0;

const MOUTH_EMOJIS = ["😐", "🙂", "😀", "😃", "😄", "😮"];

function getMouthEmoji(open: number): string {
  const idx = Math.min(Math.floor(open * 5), MOUTH_EMOJIS.length - 1);
  return MOUTH_EMOJIS[idx];
}

export default function App() {
  const [viewer, setViewer] = useState<VrmViewer | null>(null);
  const [currentModelId, setCurrentModelId] = useState("");
  const [currentModelName, setCurrentModelName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableExpressions, setAvailableExpressions] = useState<string[]>([]);
  const [mouthOpenValue, setMouthOpenValue] = useState(0);

  // Backend state
  const [isStreaming, setIsStreaming] = useState(false);
  const [tenantId, setTenantId] = useState(config.defaultTenantId);
  const [question, setQuestion] = useState("请介绍一下灵山胜境");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [currentAudioUrl, setCurrentAudioUrl] = useState("");
  const [queueLength, setQueueLength] = useState(0);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [ndjsonLines, setNdjsonLines] = useState<string[]>([]);
  const [chunks, setChunks] = useState<DigitalHumanChunk[]>([]);

  const lipSyncRef = useRef<LipSyncAnalyser | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);

  // Logger
  const log = useCallback((message: string, level: "info" | "warn" | "error" = "info") => {
    const entry: LogEntry = { id: ++logIdCounter, timestamp: Date.now(), message, level };
    setLogs((prev) => [...prev.slice(-80), entry]);
  }, []);

  // VRM ready
  const handleViewerReady = useCallback(
    (vrmViewer: VrmViewer) => {
      setViewer(vrmViewer);
      const analyser = new LipSyncAnalyser((value) => {
        vrmViewer.setMouthOpen(value);
        setMouthOpenValue(value);
      });
      lipSyncRef.current = analyser;
      const queue = new AudioQueue(
        {
          onPlayStart: (item) => {
            setCurrentSubtitle(item.text_chunk || "");
            setCurrentAudioUrl(item.audio_url);
            vrmViewer.setSpeaking(true);
          },
          onPlayEnd: () => {
            setCurrentSubtitle("");
            setCurrentAudioUrl("");
            setMouthOpenValue(0);
            vrmViewer.setMouthOpen(0);
            vrmViewer.setSpeaking(false);
          },
          onPlayError: (item, error) => {
            log(`播放失败 seq=${item.seq}: ${error.message}`, "error");
            setAudioError(`音频播放失败: ${error.message}`);
          },
          onQueueEmpty: () => setQueueLength(0),
          onLog: (msg, lvl) => log(msg, lvl || "info"),
        },
        analyser
      );
      audioQueueRef.current = queue;
      log("VRM 渲染器已初始化", "info");
    },
    [log]
  );

  // Switch model
  const handleSwitchModel = useCallback(
    async (entry: ModelEntry) => {
      if (!viewer) return;
      setCurrentModelId(entry.id);
      setCurrentModelName(entry.name);
      setLoadError(null);
      setIsLoading(true);
      try {
        await viewer.loadVrm(entry.url, entry.name);
        setAvailableExpressions(viewer.getAvailableExpressions());
      } catch {
        // reported by viewer callbacks
      } finally {
        setIsLoading(false);
      }
    },
    [viewer]
  );

  // Load local file
  const handleLoadLocalFile = useCallback(
    async (file: File) => {
      if (!viewer) return;
      const url = URL.createObjectURL(file);
      setCurrentModelId("local");
      setCurrentModelName(file.name);
      setLoadError(null);
      setIsLoading(true);
      try {
        await viewer.loadVrm(url, file.name);
        setAvailableExpressions(viewer.getAvailableExpressions());
        log(`本地模型: ${file.name}`, "info");
      } catch {
        // reported
      } finally {
        setIsLoading(false);
      }
    },
    [viewer, log]
  );

  // Send backend request
  const handleSend = useCallback(async () => {
    if (!question.trim()) return;
    // Resume AudioContext while we're inside the user-gesture context — MUST await!
    setAudioError(null);
    const acResumed = audioQueueRef.current ? await audioQueueRef.current.ensureAudioContextResumed() : false;
    if (!acResumed) {
      log("AudioContext 未能恢复，音频可能无法播放（将使用降级模式）", "warn");
    }
    setIsStreaming(true);
    setChunks([]);
    setNdjsonLines([]);
    setEndReason(null);
    log(`发送: "${question}"`, "info");

    try {
      await streamDigitalHumanChat(
        { session_id: sessionId, content: question, timestamp: Date.now(), tenantId },
        {
          onRawLine: (line) => setNdjsonLines((prev) => [...prev, line]),
          onChunk: (chunk) => {
            setChunks((prev) => [...prev, chunk]);
            if (chunk.audio_url && audioQueueRef.current) {
              audioQueueRef.current.enqueue([{ seq: chunk.seq, text_chunk: chunk.text_chunk, audio_url: chunk.audio_url }]);
              setQueueLength(audioQueueRef.current.getQueueLength());
            }
          },
          onEnd: (reason) => {
            setIsStreaming(false);
            setEndReason(reason);
            log(`完成: ${reason}`, "info");
          },
          onError: (error) => {
            setIsStreaming(false);
            log(`请求失败: ${error.message}`, "error");
          },
        }
      );
    } catch (error) {
      setIsStreaming(false);
      log(`异常: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }, [question, tenantId, sessionId, log]);

  const handleStop = useCallback(() => {
    audioQueueRef.current?.clear();
    setIsStreaming(false);
    setCurrentSubtitle("");
    setQueueLength(0);
    setAudioError(null);
    viewer?.setSpeaking(false);
    log("已停止", "warn");
  }, [log, viewer]);

  // Expression toggle
  const [activeExpressions, setActiveExpressions] = useState<Record<string, number>>({});
  const toggleExpression = useCallback(
    (name: string) => {
      if (!viewer) return;
      const current = activeExpressions[name] || 0;
      const next = current > 0 ? 0 : 1;
      setActiveExpressions((prev) => ({ ...prev, [name]: next }));
      viewer.setExpression(name, next);
    },
    [viewer, activeExpressions]
  );

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <h1>
          <span>🎭</span> VRM 数字人调试台
        </h1>
        <div className="status-row">
          <div className="status-pill">
            <span className={`dot ${viewer ? "green" : "red"}`} />
            <span>VRM {viewer ? (currentModelName || "就绪") : "未连接"}</span>
          </div>
          <div className="status-pill">
            <span className={`dot ${isStreaming ? "yellow" : "blue"}`} />
            <span>AI {isStreaming ? "生成中" : "待机"}</span>
          </div>
          <div className="status-pill">
            <span className={`dot ${queueLength > 0 ? "green" : "blue"}`} />
            <span>音频 {queueLength > 0 ? `${queueLength}句` : "空闲"}</span>
          </div>
          <div className="status-pill">
            <span className={`dot ${loadError ? "red" : "green"}`} />
            <span>{loadError ? "错误" : "就绪"}</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="main-grid">
        {/* Left: VRM Stage + Visual feedback */}
        <div className="main-grid-left">
          {/* VRM Stage */}
          <div className="vrm-stage-wrapper">
            <div className="vrm-stage-header">
              <span>VRM 舞台</span>
              <span className="server-status">
                <code>{currentModelName || "未加载"}</code>
              </span>
            </div>
            <VrmStage onViewerReady={handleViewerReady} onLog={log} />
          </div>

          {/* Audio & Mouth visualizer */}
          <div className="card">
            <div className="card-header">
              <span>🔊 音频 & 口型可视化</span>
              <code style={{ fontWeight: 400 }}>{mouthOpenValue.toFixed(3)}</code>
            </div>
            <div className="card-body">
              <div className="mouth-indicator">
                <div className="mouth-icon" style={{ transform: `scale(${1 + mouthOpenValue * 0.5})` }}>
                  {getMouthEmoji(mouthOpenValue)}
                </div>
                <div className="mouth-info">
                  <div className="mouth-label">Mouth Open</div>
                  <div className="mouth-value">{mouthOpenValue.toFixed(4)}</div>
                </div>
              </div>
              <div className="audio-visualizer">
                <div
                  className="audio-bar-fill"
                  style={{ width: `${mouthOpenValue * 100}%` }}
                >
                  {mouthOpenValue > 0.1 ? `${(mouthOpenValue * 100).toFixed(0)}%` : ""}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                当前音频: {currentAudioUrl ? currentAudioUrl.split("/").pop() : "—"}
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <div className={`subtitle-bar ${currentSubtitle ? "" : "empty"}`}>
            {currentSubtitle || "等待专家系统生成回答..."}
          </div>

          {/* Audio error banner */}
          {audioError && (
            <div className="audio-error-banner">
              ⚠️ {audioError}
            </div>
          )}
        </div>

        {/* Right: Controls + Logs */}
        <div className="main-grid-right">
          {/* Model control */}
          <div className="card">
            <div className="card-header">
              <span>👤 模型管理</span>
              {isLoading && <span className="spinner" />}
            </div>
            <div className="card-body">
              <div className="model-list">
                {modelManifest.map((entry) => (
                  <div
                    key={entry.id}
                    className={`model-item ${currentModelId === entry.id ? "active" : ""}`}
                  >
                    <span className="model-item-name">{entry.name}</span>
                    <button
                      className="btn-sm btn-outline"
                      onClick={() => handleSwitchModel(entry)}
                      disabled={isLoading}
                    >
                      加载
                    </button>
                  </div>
                ))}
              </div>
              <div className="drop-zone">
                <input
                  type="file"
                  accept=".vrm"
                  id="vrm-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLoadLocalFile(file);
                  }}
                />
                <label htmlFor="vrm-file-input" style={{ cursor: "pointer" }}>
                  📁 拖拽或点击上传 .vrm 模型
                </label>
              </div>
              {loadError && <div style={{ color: "var(--error)", fontSize: 12 }}>❌ {loadError}</div>}
            </div>
          </div>

          {/* Expressions */}
          <div className="card">
            <div className="card-header">
              <span>😊 表情控制</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {availableExpressions.length} 可用
              </span>
            </div>
            <div className="card-body">
              <div className="expression-grid">
                {["neutral", "happy", "angry", "sad", "relaxed", "surprised", "aa", "ih", "ou", "ee", "oh", "blink"].map(
                  (name) => {
                    const supported = availableExpressions.includes(name);
                    const active = (activeExpressions[name] || 0) > 0;
                    return (
                      <button
                        key={name}
                        className={`expression-btn ${active ? "active" : ""} ${!supported ? "unsupported" : ""}`}
                        onClick={() => supported && toggleExpression(name)}
                        disabled={!supported}
                        title={supported ? name : `${name} (不支持)`}
                      >
                        {active ? "●" : "○"} {name}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* Mouth manual slider */}
          <div className="card">
            <div className="card-header">
              <span>👄 手动口型</span>
            </div>
            <div className="card-body">
              <div className="slider-group">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mouthOpenValue}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setMouthOpenValue(v);
                    viewer?.setMouthOpen(v);
                  }}
                />
                <span className="slider-value">{mouthOpenValue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Backend request */}
          <div className="card">
            <div className="card-header">
              <span>🤖 后端专家系统</span>
              {isStreaming && <span className="spinner" />}
            </div>
            <div className="card-body">
              <label>
                Tenant ID
                <input type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
              </label>
              <label>
                问题内容
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-success" onClick={handleSend} disabled={isStreaming || !question.trim()}>
                  发送请求
                </button>
                <button className="btn-warning" onClick={handleStop} disabled={!isStreaming}>
                  停止
                </button>
              </div>
              {endReason && (
                <div style={{ fontSize: 12, color: "var(--success)" }}>✅ {endReason}</div>
              )}
            </div>
          </div>

          {/* NDJSON Log */}
          <div className="card">
            <div className="card-header">
              <span>📋 NDJSON 日志 ({ndjsonLines.length})</span>
            </div>
            <div className="card-body" style={{ padding: 4 }}>
              <div className="log-area">
                {ndjsonLines.length === 0 && <div className="log-line info">等待请求...</div>}
                {ndjsonLines.map((line, i) => (
                  <div key={i} className="log-line info">{line}</div>
                ))}
              </div>
            </div>
          </div>

          {/* System log */}
          <div className="card">
            <div className="card-header">
              <span>📝 系统日志</span>
            </div>
            <div className="card-body" style={{ padding: 4 }}>
              <div className="log-area">
                {logs.length === 0 && <div className="log-line info">就绪</div>}
                {logs.map((entry) => (
                  <div key={entry.id} className={`log-line ${entry.level}`}>
                    [{new Date(entry.timestamp).toLocaleTimeString()}] {entry.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}