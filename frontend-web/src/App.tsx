import { useState, useCallback, useRef, useEffect } from "react";
import { Live2DViewer } from "./features/live2d/Live2DViewer";
import { AudioEngine } from "./features/audio/AudioEngine";
import { modelManifest, ModelEntry } from "./features/live2d/modelManifest";
import type { DigitalHumanChunk, LogEntry } from "./api/types";
import { streamDigitalHumanChat } from "./api/digitalHumanClient";
import { config } from "./config";

import Live2DStage from "./components/Live2DStage";

let logIdCounter = 0;

function pickExpressionForText(text: string, expressions: string[]): string | null {
  if (!text || expressions.length === 0) return null;
  const lowerText = text.toLowerCase();
  const candidates: Array<[string[], string[]]> = [
    [["开心", "高兴", "喜欢", "欢迎", "太好了", "美", "精彩", "love", "happy"], ["happy", "smile", "love", "excited", "kira", "blush"]],
    [["抱歉", "遗憾", "难过", "可惜", "伤心", "sad"], ["sad", "cry"]],
    [["注意", "小心", "危险", "禁止", "不要", "震惊", "惊", "shock"], ["angry", "mad", "shock", "scared", "confuse"]],
  ];

  for (const [textKeys, expressionKeys] of candidates) {
    if (!textKeys.some((key) => lowerText.includes(key))) continue;
    const match = expressions.find((name) => expressionKeys.some((key) => name.toLowerCase().includes(key)));
    if (match) return match;
  }
  return null;
}

export default function App() {
  const [viewer, setViewer] = useState<Live2DViewer | null>(null);
  const [currentModelId, setCurrentModelId] = useState("");
  const [currentModelName, setCurrentModelName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableExpressions, setAvailableExpressions] = useState<string[]>([]);
  const [availableMotionGroups, setAvailableMotionGroups] = useState<string[]>([]);
  const [activeExpressions, setActiveExpressions] = useState<string[]>([]);
  const [mouthOpenValue, setMouthOpenValue] = useState(0);
  const [mouthFormValue, setMouthFormValue] = useState(0.5);

  // Backend state
  const [isStreaming, setIsStreaming] = useState(false);
  const [tenantId, setTenantId] = useState(config.defaultTenantId);
  const [question, setQuestion] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [currentAudioUrl, setCurrentAudioUrl] = useState("");
  const [queueLength, setQueueLength] = useState(0);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Conversation messages
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  // Sidebar
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAutoExpressionRef = useRef("");

  // Logger
  const log = useCallback((message: string, level: "info" | "warn" | "error" = "info") => {
    const entry: LogEntry = { id: ++logIdCounter, timestamp: Date.now(), message, level };
    setLogs((prev) => [...prev.slice(-200), entry]);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Live2D ready — create AudioEngine for seamless playback + lip-sync
  const handleViewerReady = useCallback(
    (v: Live2DViewer) => {
      setViewer(v);
      const engine = new AudioEngine({
        onPlayStart: (item) => {
          setCurrentSubtitle(item.text_chunk || "");
          setCurrentAudioUrl(item.audio_url);
          v.setSpeaking(true);
        },
        onPlayEnd: () => {
          setCurrentSubtitle("");
          setCurrentAudioUrl("");
          v.setSpeaking(false);
        },
        onPlayError: (item, error) => {
          log(`播放失败 seq=${item.seq}: ${error.message}`, "error");
          setAudioError(`音频播放失败: ${error.message}`);
        },
        onQueueEmpty: () => setQueueLength(0),
        onLog: (msg, lvl) => log(msg, lvl || "info"),
        // Zero-latency lip-sync: AudioEngine pre-computes PCM envelope
        onLipSync: (mouthOpen, mouthForm) => {
          v.setMouthOpen(mouthOpen);
          v.setMouthForm(mouthForm);
          setMouthOpenValue(mouthOpen);
          setMouthFormValue(mouthForm);
        },
      });
      audioEngineRef.current = engine;
      log("AudioEngine 已初始化（AudioBuffer 预加载 + PCM 口型驱动）", "info");
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
        await viewer.loadModel(entry.modelPath, entry.name, {
          scale: entry.scale,
          offsetX: entry.offsetX,
          offsetY: entry.offsetY,
        });
        setAvailableExpressions(viewer.getAvailableExpressions());
        setAvailableMotionGroups(viewer.getAvailableMotionGroups());
        setActiveExpressions(viewer.getActiveExpressions());
        lastAutoExpressionRef.current = "";
      } catch {
        // reported by viewer callbacks
      } finally {
        setIsLoading(false);
      }
    },
    [viewer]
  );

  // Send backend request
  const handleSend = useCallback(async () => {
    const q = question.trim();
    if (!q) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setAudioError(null);
    setEndReason(null);

    const acResumed = audioEngineRef.current ? await audioEngineRef.current.ensureResumed() : false;
    if (!acResumed) {
      log("AudioContext 未恢复，将使用降级模式", "warn");
    }

    setIsStreaming(true);
    log(`发送: "${q}"`, "info");

    // Collect AI response text
    let aiText = "";

    try {
      await streamDigitalHumanChat(
        { session_id: sessionId, content: q, timestamp: Date.now(), tenantId },
        {
          onRawLine: () => {},
          onChunk: (chunk: DigitalHumanChunk) => {
            if (chunk.audio_url && audioEngineRef.current) {
              audioEngineRef.current.enqueue([{ seq: chunk.seq, text_chunk: chunk.text_chunk, audio_url: chunk.audio_url }]);
              setQueueLength(audioEngineRef.current.getQueueLength());
            }
            if (chunk.text_chunk) {
              aiText += chunk.text_chunk;
              const autoExpression = pickExpressionForText(
                [chunk.emotion, chunk.text_chunk].filter(Boolean).join(" "),
                availableExpressions
              );
              if (autoExpression && autoExpression !== lastAutoExpressionRef.current && viewer?.playExpression(autoExpression)) {
                lastAutoExpressionRef.current = autoExpression;
                log(`Auto expression: ${autoExpression}`, "info");
              }
            }
          },
          onEnd: (reason) => {
            setIsStreaming(false);
            setEndReason(reason);
            if (aiText) {
              setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
            }
            log(`完成: ${reason}`, "info");
          },
          onError: (error) => {
            setIsStreaming(false);
            log(`请求失败: ${error.message}`, "error");
            if (aiText) {
              setMessages((prev) => [...prev, { role: "ai", text: aiText + "\n[错误: " + error.message + "]" }]);
            }
          },
        }
      );
    } catch (error) {
      setIsStreaming(false);
      log(`异常: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }, [question, tenantId, sessionId, log, availableExpressions, viewer]);

  const handleStop = useCallback(() => {
    audioEngineRef.current?.clear();
    setIsStreaming(false);
    setCurrentSubtitle("");
    setQueueLength(0);
    setAudioError(null);
    viewer?.setSpeaking(false);
    log("已停止", "warn");
  }, [log, viewer]);

  const handleExpression = useCallback((name: string) => {
    if (!viewer) return;
    viewer.setExpression(name, 1);
    setActiveExpressions(viewer.getActiveExpressions());
    log(`Expression: ${name}`, "info");
  }, [log, viewer]);

  const handleMotion = useCallback((group: string) => {
    if (!viewer) return;
    if (!viewer.playMotionGroup(group)) {
      log(`Motion group unavailable: ${group}`, "warn");
      return;
    }
    log(`Motion: ${group}`, "info");
  }, [log, viewer]);

  // Auto-load first model on mount
  const [initialLoaded, setInitialLoaded] = useState(false);
  useEffect(() => {
    if (viewer && modelManifest.length > 0 && !initialLoaded) {
      const first = modelManifest[0];
      handleSwitchModel(first);
      setInitialLoaded(true);
    }
  }, [viewer, initialLoaded, handleSwitchModel]);

  return (
    <div className="app-container">
      {/* Background */}
      <div className="app-bg" />

      {/* Main stage — Live2D character */}
      <div className="stage-area">
        <div className="stage-inner">
          <Live2DStage onViewerReady={handleViewerReady} onLog={() => {}} />
        </div>

        {/* Subtitle overlay */}
        <div className={`subtitle-overlay ${currentSubtitle ? "active" : ""}`}>
          <div className="subtitle-text">{currentSubtitle}</div>
        </div>

        {/* Character info badge */}
        <div className="character-badge">
          <span className={`dot ${isStreaming ? "streaming" : ""}`} />
          <span>{currentModelName || "未加载"}</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="chat-area">
        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div className="welcome-icon">🎭</div>
              <h2>智能景区导览</h2>
              <p>我是您的 AI 数字导览员，可以为您介绍灵山胜境的历史文化、景点特色。</p>
              <div className="quick-questions">
                {["请介绍一下灵山胜境", "有哪些必看景点？", "景区有什么特色活动？"].map((q) => (
                  <button
                    key={q}
                    className="quick-btn"
                    onClick={() => {
                      setQuestion(q);
                      // Auto-send after setting question
                      setTimeout(() => {
                        const el = document.getElementById("chat-input") as HTMLTextAreaElement;
                        if (el) {
                          el.value = q;
                          el.dispatchEvent(new Event("input", { bubbles: true }));
                        }
                      }, 0);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message-item ${msg.role}`}>
              <div className={`message-avatar ${msg.role}`}>
                {msg.role === "user" ? "👤" : "🎭"}
              </div>
              <div className="message-bubble">{msg.text}</div>
            </div>
          ))}
          {currentSubtitle && (
            <div className="message-item ai">
              <div className="message-avatar ai">🎭</div>
              <div className="message-bubble speaking">
                {currentSubtitle}
                <span className="typing-indicator">▊</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="input-area">
          <textarea
            id="chat-input"
            className="chat-input"
            placeholder="输入您的问题..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            disabled={isStreaming}
          />
          <div className="input-actions">
            <button
              className="btn-send"
              onClick={handleSend}
              disabled={isStreaming || !question.trim()}
            >
              {isStreaming ? "生成中..." : "发送"}
            </button>
            {isStreaming && (
              <button className="btn-stop" onClick={handleStop}>停止</button>
            )}
          </div>
          {audioError && (
            <div className="input-error">⚠️ {audioError}</div>
          )}
        </div>
      </div>

      {/* Toolbar buttons */}
      <div className="toolbar">
        <button
          className={`toolbar-btn ${showSettings ? "active" : ""}`}
          onClick={() => { setShowSettings(!showSettings); setShowLog(false); }}
          title="设置"
        >
          ⚙️
        </button>
        <button
          className={`toolbar-btn ${showLog ? "active" : ""}`}
          onClick={() => { setShowLog(!showLog); setShowSettings(false); }}
          title="日志"
        >
          📋
        </button>
      </div>

      {/* Settings panel (slide-in) */}
      {showSettings && (
        <div className="side-panel">
          <div className="side-panel-header">
            <span>⚙️ 设置</span>
            <button className="panel-close" onClick={() => setShowSettings(false)}>✕</button>
          </div>

          {/* Models */}
          <div className="panel-section">
            <div className="panel-label">模型选择</div>
            <div className="model-mini-list">
              {modelManifest.map((entry) => (
                <div
                  key={entry.id}
                  className={`model-mini-item ${currentModelId === entry.id ? "active" : ""}`}
                  onClick={() => handleSwitchModel(entry)}
                >
                  {isLoading && currentModelId === entry.id ? "⏳" : "🎭"} {entry.name}
                </div>
              ))}
            </div>
            {loadError && <div className="panel-error">❌ {loadError}</div>}
          </div>

          <div className="panel-section">
            <div className="panel-label">表情 / 配饰 / 换装</div>
            {availableExpressions.length > 0 ? (
              <div className="control-chip-grid">
                {availableExpressions.map((name) => (
                  <button
                    key={name}
                    className={`control-chip ${activeExpressions.includes(name) ? "active" : ""}`}
                    onClick={() => handleExpression(name)}
                    title={name}
                    disabled={!viewer || isLoading}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="panel-empty">当前模型没有登记可切换的表情或配饰。</div>
            )}
          </div>

          <div className="panel-section">
            <div className="panel-label">动作</div>
            {availableMotionGroups.length > 0 ? (
              <div className="control-chip-grid">
                {availableMotionGroups.map((group) => (
                  <button
                    key={group}
                    className="control-chip"
                    onClick={() => handleMotion(group)}
                    disabled={!viewer || isLoading}
                  >
                    {group}
                  </button>
                ))}
              </div>
            ) : (
              <div className="panel-empty">当前模型没有登记动作组。</div>
            )}
          </div>

          {/* Audio State */}
          <div className="panel-section">
            <div className="panel-label">
              音频引擎
              <span style={{ fontSize: 11, marginLeft: 8 }}>
                {(() => {
                  const eng = audioEngineRef.current;
                  if (!eng) return "⏳ 等待初始化";
                  const st = eng.getAudioContextState();
                  const lipOk = eng.isLipSyncActive();
                  let badge = "";
                  if (st === "running") badge += "✅ AudioContext:" + st;
                  else if (st === "suspended") badge += "⚠️ AudioContext:" + st;
                  else if (st === "uncreated") badge += "❌ 未创建";
                  else badge += "❓ " + st;
                  badge += lipOk ? " | 👄 LipSync" : "";
                  return badge;
                })()}
              </span>
            </div>
          </div>

          {/* Mouth status */}
          <div className="panel-section">
            <div className="panel-label">口型参数 (实时)</div>
            <div className="stat-row">
              <span className="stat-label">OpenY</span>
              <div className="stat-bar-bg">
                <div className="stat-bar-fill" style={{ width: `${mouthOpenValue * 100}%` }} />
              </div>
              <span className="stat-val">{mouthOpenValue.toFixed(3)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Form</span>
              <div className="stat-bar-bg">
                <div className="stat-bar-fill form" style={{ width: `${mouthFormValue * 100}%` }} />
              </div>
              <span className="stat-val">{mouthFormValue.toFixed(3)}</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              💡 OpenY=张嘴幅度 | Form=咧嘴/圆唇 | 播放TTS时应有波动
            </div>
          </div>

          {/* Tenant */}
          <div className="panel-section">
            <div className="panel-label">租户 ID</div>
            <input
              type="text"
              className="panel-input"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Log panel (slide-in) */}
      {showLog && (
        <div className="side-panel">
          <div className="side-panel-header">
            <span>📋 系统日志</span>
            <button className="panel-close" onClick={() => setShowLog(false)}>✕</button>
          </div>
          <div className="log-container">
            {logs.length === 0 && <div className="log-item info">就绪</div>}
            {logs.map((entry) => (
              <div key={entry.id} className={`log-item ${entry.level}`}>
                [{new Date(entry.timestamp).toLocaleTimeString()}] {entry.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status footer */}
      <div className="status-footer">
        <span>音频 {queueLength > 0 ? `${queueLength}句排队` : "空闲"}</span>
        {endReason && <span className="status-end">✅ {endReason}</span>}
      </div>
    </div>
  );
}
