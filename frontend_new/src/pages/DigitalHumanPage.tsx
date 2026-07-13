import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDigitalHuman } from '@/hooks/useDigitalHuman';
import { DEFAULT_TENANT_ID, AI_ENGINE_BASE } from '@/api/config';
import Live2DStage from '@/components/Live2DStage';
import { Live2DViewer } from '@/features/live2d/Live2DViewer';
import { modelManifest } from '@/features/live2d/modelManifest';
import apiClient from '@/api/client';
import type { DigitalHumanConfigItem } from '@/api/types';

const ACTIVE_CONFIG_KEY = 'active_digital_human_config';

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, () => (Math.random() * 16 | 0).toString(16));
}

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
}

export default function DigitalHumanPage() {
  const [sessionId] = useState(() => generateSessionId());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { chunks, loading, error, finished, sendMessage, cancel } = useDigitalHuman(DEFAULT_TENANT_ID);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<{ seq: number; text: string; url: string }[]>([]);
  const currentSeqRef = useRef(0);
  const [currentText, setCurrentText] = useState('');
  const [viewer, setViewer] = useState<Live2DViewer | null>(null);
  const [configs, setConfigs] = useState<DigitalHumanConfigItem[]>([]);
  const [activeConfig, setActiveConfig] = useState<DigitalHumanConfigItem | null>(null);
  const viewerLoaded = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const playNextRef = useRef<() => void>(() => {});
  const playNext = useCallback(() => { playNextRef.current(); }, []);
  playNextRef.current = () => {
    const queue = audioQueueRef.current;
    if (queue.length === 0) return;
    const next = queue.shift()!;
    currentSeqRef.current = next.seq;
    setCurrentText(next.text);
    setIsSpeaking(true);
    if (viewer) viewer.setSpeaking(true);
    const audio = new Audio(next.url);
    audioRef.current = audio;
    audio.onended = () => {
      setIsSpeaking(false);
      if (viewer) viewer.setSpeaking(false);
      playNextRef.current();
    };
    audio.onerror = () => { setIsSpeaking(false); if (viewer) viewer.setSpeaking(false); playNextRef.current(); };
    audio.play().catch(() => {});
  };

  const stopSpeaking = useCallback(() => {
    audioQueueRef.current = [];
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
    setIsPaused(false);
    if (viewer) viewer.setSpeaking(false);
  }, [viewer]);

  const handleStopAll = useCallback(() => {
    stopSpeaking();
    cancel();
  }, [stopSpeaking, cancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    audioQueueRef.current = [];
    currentSeqRef.current = 0;
    setCurrentText('');
    setIsSpeaking(false);
    setIsPaused(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setMessages(prev => [...prev, { role: 'user', text: input.trim() }]);
    sendMessage(sessionId, input.trim());
    setInput('');
  };

  useEffect(() => {
    const newChunks = chunks
      .filter(c => c.text_chunk && c.audio_url && c.seq > currentSeqRef.current)
      .map(c => ({
        seq: c.seq, text: c.text_chunk!,
        url: c.audio_url!.startsWith('/') ? AI_ENGINE_BASE + c.audio_url! : c.audio_url!,
      }));
    if (newChunks.length > 0) {
      audioQueueRef.current.push(...newChunks);
      if (!audioRef.current || audioRef.current.paused) playNext();
    }
  }, [chunks, playNext]);

  useEffect(() => {
    apiClient.getDigitalHumanConfigs().then(r => {
      if (r.code === 200 && r.data) {
        setConfigs(r.data);
        const savedId = localStorage.getItem(ACTIVE_CONFIG_KEY);
        const target = savedId ? r.data.find(c => c.tenantId === savedId) : null;
        setActiveConfig(target || r.data[0] || null);
      }
    }).catch(() => {});
  }, []);

  const handleViewerReady = useCallback((v: Live2DViewer) => {
    setViewer(v);
  }, []);

  useEffect(() => {
    if (viewer && activeConfig && !viewerLoaded.current) {
      viewerLoaded.current = true;
      if (activeConfig.live2dModel) {
        const entry = modelManifest.find(m => m.id === activeConfig.live2dModel);
        if (entry) viewer.loadModel(entry.modelPath, activeConfig.personaName || entry.name).catch(() => {});
      }
    }
  }, [viewer, activeConfig]);

  const handleActivateConfig = useCallback((cfg: DigitalHumanConfigItem) => {
    setActiveConfig(cfg);
    localStorage.setItem(ACTIVE_CONFIG_KEY, cfg.tenantId);
    viewerLoaded.current = false;
    if (viewer && cfg.live2dModel) {
      const entry = modelManifest.find(m => m.id === cfg.live2dModel);
      if (entry) viewer.loadModel(entry.modelPath, cfg.personaName || entry.name).then(() => {
        viewerLoaded.current = true;
      }).catch(() => {});
    }
  }, [viewer]);

  useEffect(() => {
    if (finished && currentText) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'ai') {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, text: last.text + currentText };
          return updated;
        }
        return [...prev, { role: 'ai', text: currentText }];
      });
      setCurrentText('');
    }
  }, [finished]);

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', gap: 20 }}>
      {/* LEFT: Live2D canvas 3:4 */}
      <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          flex: 1, borderRadius: 28, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(145deg,#F2EBDA 0%,#F7F2E6 100%)',
          boxShadow: 'inset 0 2px 6px rgba(61,44,42,0.03)',
          aspectRatio: '3 / 4', minHeight: 400, maxHeight: '100%',
        }}>
          <Live2DStage onViewerReady={handleViewerReady} onLog={() => {}} />
          {currentText && (
            <div style={{
              position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
              maxWidth: '80%', background: 'rgba(61,44,42,0.75)', backdropFilter: 'blur(8px)',
              borderRadius: 16, padding: '10px 20px', color: '#F7F2E6',
              fontSize: '0.85rem', lineHeight: 1.5, textAlign: 'center', zIndex: 10,
            }}>
              {currentText}
            </div>
          )}
          {isSpeaking && (
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.7rem',
                background: '#22c55e', color: '#fff', fontWeight: 500,
              }}>
                🔊 正在讲解
              </div>
              <button onClick={stopSpeaking} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem',
                background: 'rgba(239,68,68,0.85)', color: '#fff', fontWeight: 500,
                border: 'none', cursor: 'pointer',
              }}>
                ⏹ 停止
              </button>
            </div>
          )}
          {loading && (
            <div style={{
              position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)',
              borderRadius: 16, padding: '8px 18px',
            }}>
              <div className="spinner" />
              <span style={{ fontSize: '0.8rem', color: '#8B6E57' }}>AI 思考中...</span>
              <button className="btn btn-sm btn-danger" onClick={cancel}>取消</button>
            </div>
          )}
          {error && (
            <div style={{
              position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
              background: '#fee2e2', borderRadius: 14, padding: '8px 16px',
              fontSize: '0.75rem', color: '#991b1b',
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: chat panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif" }}>
              灵山胜景 · {activeConfig?.personaName || '数字人导览'}
            </h2>
            {activeConfig && (
              <div style={{ fontSize: '0.62rem', color: 'rgba(61,44,42,0.35)', marginTop: 1 }}>
                {activeConfig.ttsVoice} · {activeConfig.ttsRate} · {activeConfig.ttsPitch}
              </div>
            )}
          </div>
          <select
            value={activeConfig?.tenantId || ''}
            onChange={e => {
              const cfg = configs.find(c => c.tenantId === e.target.value);
              if (cfg) handleActivateConfig(cfg);
            }}
            style={{
              padding: '4px 10px', borderRadius: 14, border: '1px solid rgba(180,136,100,0.12)',
              background: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', color: '#3D2C2A',
              fontFamily: "'Noto Sans SC',sans-serif", outline: 'none', cursor: 'pointer',
              maxWidth: 130,
            }}
          >
            {configs.map(c => (
              <option key={c.tenantId} value={c.tenantId}>{c.personaName || c.tenantId}</option>
            ))}
          </select>
        </div>

        {/* chat messages */}
        <div style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
          padding: '8px 4px 8px 0',
          background: 'rgba(255,255,255,0.3)', borderRadius: 18,
        }}>
          {messages.length === 0 && !loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              flex: 1, color: 'rgba(61,44,42,0.25)', gap: 6,
            }}>
              <span style={{ fontSize: '2rem' }}>💬</span>
              <span style={{ fontSize: '0.8rem' }}>向 AI 导游提问开始对话</span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              padding: '0 10px',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem',
                background: m.role === 'user' ? '#3D2C2A' : 'rgba(180,136,100,0.15)',
                color: m.role === 'user' ? '#F7F2E6' : '#8B6E57',
              }}>
                {m.role === 'user' ? '我' : 'AI'}
              </div>
              <div style={{
                maxWidth: '80%',
                padding: '8px 14px', borderRadius: 16,
                background: m.role === 'user' ? '#3D2C2A' : 'rgba(255,255,255,0.7)',
                color: m.role === 'user' ? '#F7F2E6' : '#3D2C2A',
                fontSize: '0.78rem', lineHeight: 1.6,
                borderTopRightRadius: m.role === 'user' ? 4 : 16,
                borderTopLeftRadius: m.role === 'user' ? 16 : 4,
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0 10px' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                background: 'rgba(180,136,100,0.15)', color: '#8B6E57',
              }}>AI</div>
              <div style={{
                padding: '8px 14px', borderRadius: 16, borderTopLeftRadius: 4,
                background: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', color: 'rgba(61,44,42,0.4)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                正在思考...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* quick prompts */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
          {['介绍一下灵山胜景', '九龙灌浴几点表演', '灵山大佛有多高'].map((q, i) => (
            <button key={i} className="btn btn-sm" style={{
              fontSize: '0.65rem', padding: '4px 10px', borderRadius: 14,
              border: '1px solid rgba(180,136,100,0.10)',
            }} onClick={() => {
              setMessages(prev => [...prev, { role: 'user', text: q }]);
              sendMessage(sessionId, q);
            }}>
              {q}
            </button>
          ))}
        </div>

        {/* input */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {(isSpeaking || loading) && (
            <button className="btn btn-danger" onClick={handleStopAll}
              style={{ fontSize: '0.7rem', padding: '8px 12px', borderRadius: 18, flexShrink: 0 }}>
              ⏹ 停止
            </button>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input className="input" value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="输入您的问题..."
              disabled={loading}
              style={{ flex: 1, fontSize: '0.78rem', borderRadius: 18 }}
            />
            <button className="btn btn-primary" type="submit"
              disabled={loading || !input.trim()}
              style={{ fontSize: '0.78rem', padding: '8px 18px', borderRadius: 18 }}>
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
