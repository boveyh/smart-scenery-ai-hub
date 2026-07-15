import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDigitalHuman } from '@/hooks/useDigitalHuman';
import { DEFAULT_TENANT_ID } from '@/api/config';
import Live2DStage from '@/components/Live2DStage';
import { Live2DViewer } from '@/features/live2d/Live2DViewer';
import { modelManifest } from '@/features/live2d/modelManifest';
import apiClient from '@/api/client';
import type { DigitalHumanConfigItem } from '@/api/types';

const ACTIVE_CONFIG_KEY = 'active_digital_human_config';

function genSid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, () => (Math.random() * 16 | 0).toString(16));
}

export default function DigitalHumanPage() {
  const [sessionId, setSessionId] = useState(genSid);
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [viewer, setViewer] = useState<Live2DViewer | null>(null);
  const [configs, setConfigs] = useState<DigitalHumanConfigItem[]>([]);
  const [activeConfig, setActiveConfig] = useState<DigitalHumanConfigItem | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const viewerLoaded = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueue = useRef<{ seq: number; url: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { loading, error, sendMessage, cancel: cancelHook } = useDigitalHuman(DEFAULT_TENANT_ID);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, currentText]);

  // 音频播放 + 口型驱动（PCM 音量分析）
  const lipCtxRef = useRef<AudioContext | null>(null);
  const lipRafRef = useRef(0);

  const playAudio = useCallback((seq: number, url: string) => {
    audioQueue.current.push({ seq, url });
    const tryPlay = () => {
      if (audioRef.current && !audioRef.current.paused) return;
      if (audioQueue.current.length === 0) return;
      const next = audioQueue.current.shift()!;
      const audio = new Audio(next.url);
      audioRef.current = audio;

      const startLipSync = () => {
        try {
          const ctx = new AudioContext();
          const src = ctx.createMediaElementSource(audio);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          src.connect(analyser);
          analyser.connect(ctx.destination);
          const buf = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(buf);
            const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
            viewer?.setMouthOpen(Math.min(avg / 80, 1));
            lipRafRef.current = requestAnimationFrame(tick);
          };
          tick();
          lipCtxRef.current = ctx;
        } catch {}
      };
      const stopLipSync = () => {
        if (lipRafRef.current) cancelAnimationFrame(lipRafRef.current);
        if (lipCtxRef.current) lipCtxRef.current.close();
        lipCtxRef.current = null;
        viewer?.setMouthOpen(0);
        viewer?.setSpeaking(false);
      };

      audio.onended = () => {
        stopLipSync();
        if (audioRef.current === audio) audioRef.current = null;
        setCurrentText('');
        setIsSpeaking(false);
        tryPlay();
      };
      audio.onerror = () => {
        stopLipSync();
        if (audioRef.current === audio) audioRef.current = null;
        tryPlay();
      };
      audio.play().then(() => {
        setIsSpeaking(true);
        viewer?.setSpeaking(true);
        startLipSync();
      }).catch(() => {
        if (audioRef.current === audio) audioRef.current = null;
        tryPlay();
      });
    };
    tryPlay();
  }, [viewer]);

  const stopSpeaking = useCallback(() => {
    if (lipRafRef.current) cancelAnimationFrame(lipRafRef.current);
    if (lipCtxRef.current) lipCtxRef.current.close();
    lipCtxRef.current = null;
    audioQueue.current = [];
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
    if (viewer) { viewer.setMouthOpen(0); viewer.setSpeaking(false); }
  }, [viewer]);

  const handleStopAll = useCallback(() => {
    stopSpeaking();
    cancelHook();
  }, [stopSpeaking, cancelHook]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && selectedImages.length === 0) || loading) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    audioQueue.current = [];
    setIsSpeaking(false);
    setCurrentText('');

    const msgText = input.trim() || '[图片]';
    setMessages(prev => [...prev, { role: 'user', text: msgText }]);
    const newSid = genSid();
    setSessionId(newSid);

    if (selectedImages.length > 0) {
      const images = selectedImages.map(img => img.split(',')[1] || img);
      setSelectedImages([]);
      setInput('');
      fetch('http://localhost:8000/api/v1/vision/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim(), images }),
      }).then(async res => {
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let aiText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          for (const line of text.split('\n').filter(Boolean)) {
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.type === 'text' && d.content) {
                  aiText += d.content;
                  setMessages(prev => {
                    const last = prev[prev.length - 1];
                    return last?.role === 'ai'
                      ? [...prev.slice(0, -1), { ...last, text: aiText }]
                      : [...prev, { role: 'ai', text: aiText }];
                  });
                }
              } catch {}
            }
          }
        }
      }).catch(() => {});
    } else {
      const text = input.trim();
      setInput('');
      sendMessage(newSid, text, {
        onText: (chunkText) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            const newText = (last?.role === 'ai' ? last.text : '') + chunkText;
            return last?.role === 'ai'
              ? [...prev.slice(0, -1), { ...last, text: newText }]
              : [...prev, { role: 'ai', text: chunkText }];
          });
          setCurrentText(prev => prev + chunkText);
        },
        onAudio: (seq, url) => playAudio(seq, url),
      });
    }
  };

  useEffect(() => {
    apiClient.getDigitalHumanConfigs().then(r => {
      if (r.code === 200 && r.data) {
        setConfigs(r.data);
        const saved = localStorage.getItem(ACTIVE_CONFIG_KEY);
        const t = saved ? r.data.find(c => c.tenantId === saved) : null;
        setActiveConfig(t || r.data[0] || null);
      }
    }).catch(() => {});
  }, []);

  const handleViewerReady = useCallback((v: Live2DViewer) => { setViewer(v); }, []);

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

  const isActive = activeConfig?.tenantId || '';

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', gap: 20 }}>
      {/* LEFT: Live2D */}
      <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ flex: 1, borderRadius: 28, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(145deg,#F2EBDA 0%,#F7F2E6 100%)',
          boxShadow: 'inset 0 2px 6px rgba(61,44,42,0.03)',
          aspectRatio: '3 / 4', minHeight: 400, maxHeight: '100%',
        }}>
          <Live2DStage onViewerReady={handleViewerReady} onLog={() => {}} />
          {currentText && (
            <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
              maxWidth: '80%', background: 'rgba(61,44,42,0.75)', backdropFilter: 'blur(8px)',
              borderRadius: 16, padding: '10px 20px', color: '#F7F2E6',
              fontSize: '0.85rem', lineHeight: 1.5, textAlign: 'center', zIndex: 10,
            }}>{currentText}</div>
          )}
          {isSpeaking && (
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.7rem',
                background: '#22c55e', color: '#fff', fontWeight: 500 }}>🔊 正在讲解</div>
              <button onClick={stopSpeaking} style={{ padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem',
                background: 'rgba(239,68,68,0.85)', color: '#fff', fontWeight: 500, border: 'none', cursor: 'pointer' }}>⏹ 停止</button>
            </div>
          )}
          {loading && (
            <div style={{ position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)',
              borderRadius: 16, padding: '8px 18px' }}>
              <div className="spinner" />
              <span style={{ fontSize: '0.8rem', color: '#8B6E57' }}>AI 思考中...</span>
              <button className="btn btn-sm btn-danger" onClick={handleStopAll}>取消</button>
            </div>
          )}
          {error && <div className="alert alert-error" style={{ margin: 12, position: 'absolute', bottom: 110, left: 12, right: 12, zIndex: 10 }}>{error}</div>}
        </div>
      </div>

      {/* RIGHT: Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif" }}>
              灵山胜景 · {activeConfig?.personaName || '数字人导览'}
            </h2>
          </div>
          <select value={isActive} onChange={e => {
            const cfg = configs.find(c => c.tenantId === e.target.value);
            if (cfg) handleActivateConfig(cfg);
          }} style={{ padding: '4px 10px', borderRadius: 14, border: '1px solid rgba(180,136,100,0.12)',
            background: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', color: '#3D2C2A',
            fontFamily: "'Noto Sans SC',sans-serif", outline: 'none', cursor: 'pointer', maxWidth: 130 }}>
            {configs.map(c => <option key={c.tenantId} value={c.tenantId}>{c.personaName || c.tenantId}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
          padding: '8px 4px 8px 0', background: 'rgba(255,255,255,0.3)', borderRadius: 18 }}>
          {messages.length === 0 && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              flex: 1, color: 'rgba(61,44,42,0.25)', gap: 6 }}>
              <span style={{ fontSize: '2rem' }}>💬</span>
              <span style={{ fontSize: '0.8rem' }}>向 {activeConfig?.personaName || 'AI'}导游提问</span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row', padding: '0 10px' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                background: m.role === 'user' ? '#3D2C2A' : 'rgba(180,136,100,0.15)',
                color: m.role === 'user' ? '#F7F2E6' : '#8B6E57' }}>{m.role === 'user' ? '我' : 'AI'}</div>
              <div style={{ maxWidth: '80%', padding: '8px 14px', borderRadius: 16,
                background: m.role === 'user' ? '#3D2C2A' : 'rgba(255,255,255,0.7)',
                color: m.role === 'user' ? '#F7F2E6' : '#3D2C2A',
                fontSize: '0.78rem', lineHeight: 1.6,
                borderTopRightRadius: m.role === 'user' ? 4 : 16,
                borderTopLeftRadius: m.role === 'user' ? 16 : 4 }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0 10px' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, fontSize: '0.75rem',
                background: 'rgba(180,136,100,0.15)', color: '#8B6E57', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>AI</div>
              <div style={{ padding: '8px 14px', borderRadius: 16, borderTopLeftRadius: 4,
                background: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', color: 'rgba(61,44,42,0.4)',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="spinner" style={{ width: 14, height: 14 }} />思考中...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 图片预览 */}
        {selectedImages.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, padding: '4px 0' }}>
            {selectedImages.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={img} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(180,136,100,0.15)' }} />
                <button onClick={() => setSelectedImages(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => {
              const files = e.target.files; if (!files) return;
              Array.from(files).forEach(f => {
                const reader = new FileReader();
                reader.onload = () => setSelectedImages(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(f);
              });
              e.target.value = '';
            }} />
          <button className="btn btn-sm btn-secondary" onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: '0.7rem', padding: '6px 10px', borderRadius: 14 }}>📷</button>
          {(isSpeaking || loading) && (
            <button className="btn btn-danger" onClick={handleStopAll}
              style={{ fontSize: '0.7rem', padding: '8px 12px', borderRadius: 18, flexShrink: 0 }}>⏹ 停止</button>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input className="input" value={input} onChange={e => setInput(e.target.value)}
              placeholder="输入您的问题..." disabled={loading}
              style={{ flex: 1, fontSize: '0.78rem', borderRadius: 18 }} />
            <button className="btn btn-primary" type="submit" disabled={loading || (!input.trim() && selectedImages.length === 0)}
              style={{ fontSize: '0.78rem', padding: '8px 18px', borderRadius: 18 }}>发送</button>
          </form>
        </div>
      </div>
    </div>
  );
}
