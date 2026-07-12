import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDigitalHuman } from '@/hooks/useDigitalHuman';
import { DEFAULT_TENANT_ID, AI_ENGINE_BASE } from '@/api/config';
import Live2DStage from '@/components/Live2DStage';
import { Live2DViewer } from '@/features/live2d/Live2DViewer';
import { modelManifest } from '@/features/live2d/modelManifest';
import apiClient from '@/api/client';
import type { PoiItem } from '@/api/types';

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const rStyles = {
  flexRow: { display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
  flexRowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
  subTitle: { fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 10 } as React.CSSProperties,
  poiCard: {
    borderRadius: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(180,136,100,0.08)', cursor: 'pointer', transition: 'all 200ms',
  } as React.CSSProperties,
};

export default function DigitalHumanPage() {
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { chunks, loading, error, finished, sendMessage, cancel } = useDigitalHuman(DEFAULT_TENANT_ID);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<{ seq: number; text: string; url: string }[]>([]);
  const currentSeqRef = useRef(0);
  const [currentText, setCurrentText] = useState('');
  const [fullText, setFullText] = useState('');
  const [viewer, setViewer] = useState<Live2DViewer | null>(null);
  const [pois, setPois] = useState<PoiItem[]>([]);
  const viewerLoaded = useRef(false);
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
      setFullText(prev => prev + next.text);
      playNextRef.current();
    };
    audio.onerror = () => {
      setFullText(prev => prev + next.text);
      setIsSpeaking(false);
      if (viewer) viewer.setSpeaking(false);
      playNextRef.current();
    };
    audio.play().catch(() => {});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    audioQueueRef.current = [];
    currentSeqRef.current = 0;
    setCurrentText('');
    setFullText('');
    setIsSpeaking(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    sendMessage(newSessionId, input.trim());
    setInput('');
  };

  useEffect(() => {
    const newChunks = chunks
      .filter(c => c.text_chunk && c.audio_url && c.seq > currentSeqRef.current)
      .map(c => ({
        seq: c.seq,
        text: c.text_chunk!,
        url: c.audio_url!.startsWith('/') ? AI_ENGINE_BASE + c.audio_url! : c.audio_url!,
      }));
    if (newChunks.length > 0) {
      audioQueueRef.current.push(...newChunks);
      if (!audioRef.current || audioRef.current.paused) playNext();
    }
  }, [chunks, playNext]);

  useEffect(() => {
    apiClient.getPois().then(res => {
      if (res.code === 200) setPois(res.data ?? []);
    }).catch(() => {});
  }, []);

  const handleViewerReady = useCallback((v: Live2DViewer) => {
    setViewer(v);
    if (!viewerLoaded.current) {
      viewerLoaded.current = true;
      const entry = modelManifest[0];
      if (entry) v.loadModel(entry.modelPath, entry.name).catch(() => {});
    }
  }, []);

  const titlePois = pois.slice(0, 4);
  const routeLabels = pois.slice(0, 4).map(p => p.name);
  if (routeLabels.length < 4) {
    const defaults = ['古街入口', '临江戏台', '书院巷', '城西茶楼'];
    while (routeLabels.length < 4) routeLabels.push(defaults[routeLabels.length]);
  }

  return (
    <div className="main-card" style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', gap: 24, padding: '20px 24px 20px', overflow: 'hidden' }}>
        {/* LEFT: Live2D + Title */}
        <div style={{ flex: '0 0 62%', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <span className="badge-tag">景区服务</span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3D2C2A', letterSpacing: 2, margin: '8px 0 4px', fontFamily: "'Noto Serif SC',serif" }}>数字人导览</h1>
              <p style={{ fontSize: '0.85rem', color: 'rgba(61,44,42,0.55)', lineHeight: 1.6 }}>AI 虚拟导游为您讲解景区历史文化</p>
            </div>
            <div style={{
              flexShrink: 0, width: 200,
              background: 'rgba(244,237,226,0.85)', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(180,136,100,0.15)', borderRadius: 18,
              padding: '12px 16px', boxShadow: '0 2px 10px rgba(61,44,42,0.05)',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 4 }}>游览建议</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.5)', lineHeight: 1.5 }}>建议时长 3-4 小时 · 午后出发最佳 · 穿舒适步鞋方便行走</div>
            </div>
          </div>

          <div style={{
            flex: 1, borderRadius: 28, overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(145deg,#F2EBDA 0%,#F7F2E6 100%)',
            minHeight: 0, boxShadow: 'inset 0 2px 6px rgba(61,44,42,0.03)',
          }}>
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Live2DStage onViewerReady={handleViewerReady} onLog={() => {}} />
            </div>
            {currentText && (
              <div style={{
                position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
                maxWidth: '80%', background: 'rgba(61,44,42,0.75)', backdropFilter: 'blur(8px)',
                borderRadius: 16, padding: '10px 20px', color: '#F7F2E6',
                fontSize: '0.9rem', lineHeight: 1.5, textAlign: 'center',
              }}>
                {currentText}
              </div>
            )}
            {isSpeaking && (
              <div style={{
                position: 'absolute', top: 12, left: 12,
                padding: '4px 12px', borderRadius: 20, fontSize: '0.7rem',
                background: '#22c55e', color: '#fff', fontWeight: 500,
              }}>
                🔊 正在讲解
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            {titlePois.slice(0, 3).map((poi, i) => (
              <div key={poi.poiId} style={{
                flex: 1, borderRadius: 20, background: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(180,136,100,0.10)', padding: '12px 14px',
                textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(61,44,42,0.03)', transition: 'all 200ms',
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3D2C2A', marginBottom: 2 }}>{poi.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)' }}>{poi.category}</div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 3 - titlePois.length) }).map((_, i) => (
              <div key={`ph-${i}`} style={{
                flex: 1, borderRadius: 20, background: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(180,136,100,0.10)', padding: '12px 14px',
                textAlign: 'center', boxShadow: '0 1px 4px rgba(61,44,42,0.03)',
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3D2C2A', marginBottom: 2 }}>{['古街牌坊','临江戏台','城西茶楼'][i]}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)' }}>精选景点</div>
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error" style={{ flexShrink: 0 }}>❌ {error}</div>}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, justifyContent: 'center', padding: 6 }}>
              <div className="spinner" />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>AI 正在思考并生成语音...</span>
              <button className="btn btn-sm btn-danger" onClick={cancel}>取消</button>
            </div>
          )}
          {finished && !loading && !error && (
            <div style={{ textAlign: 'center', color: '#22c55e', fontSize: '0.75rem', flexShrink: 0 }}>✅ 回复完成</div>
          )}
        </div>

        {/* RIGHT: Info Panel */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0,
          overflowY: 'auto', paddingRight: 2,
        }}>
          <div style={rStyles.flexRowBetween}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3D2C2A', letterSpacing: 3, fontFamily: "'Noto Serif SC',serif" }}>灵山胜景</h2>
            <button className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 16px' }}>在线讲解</button>
          </div>

          <div>
            <div style={rStyles.subTitle}>半日游路线</div>
            <div style={{ padding: '4px 0 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
                {routeLabels.map((l, i) => (
                  <span key={i} style={{ fontSize: '0.6rem', color: 'rgba(61,44,42,0.4)', whiteSpace: 'nowrap' }}>{l.length > 4 ? l.slice(0, 4) + '..' : l}</span>
                ))}
              </div>
              <div style={{ position: 'relative', height: 4, background: 'rgba(180,136,100,0.15)', borderRadius: 4, margin: '0 4px' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '50%', background: 'linear-gradient(90deg,#B88864,#D4A574)', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginTop: -12 }}>
                {[true, true, false, false].map((a, i) => (
                  <span key={i} style={{
                    width: a ? 14 : 12, height: a ? 14 : 12, borderRadius: '50%',
                    background: a ? '#B88864' : '#D9CBB8', border: '2px solid #F7F2E6',
                    boxShadow: a ? '0 0 0 3px rgba(184,136,100,0.15)' : '0 1px 3px rgba(61,44,42,0.06)',
                  }} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div style={{ ...rStyles.flexRowBetween, marginBottom: 10 }}>
              <span style={rStyles.subTitle}>景点卡片</span>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(180,136,100,0.10)', border: '1px solid rgba(180,136,100,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', color: '#8B6E57', cursor: 'pointer',
                fontFamily: "'Noto Sans SC',sans-serif",
              }}>⊕</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {pois.slice(0, 4).map(poi => (
                <div key={poi.poiId} style={rStyles.poiCard}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3D2C2A', marginBottom: 4 }}>{poi.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)', lineHeight: 1.4, marginBottom: 8 }}>
                    {poi.description.length > 30 ? poi.description.slice(0, 30) + '...' : poi.description}
                  </div>
                  <button className="btn-text">讲解{poi.name}</button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - pois.length) }).map((_, i) => {
                const ph = ['古街牌坊','临江戏台','书院巷','城西茶楼'][i + pois.length] || `景点${i + 1}`;
                return (
                  <div key={`ph-${i}`} style={rStyles.poiCard}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3D2C2A', marginBottom: 4 }}>{ph}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)', lineHeight: 1.4, marginBottom: 8 }}>精选景点介绍</div>
                    <button className="btn-text">讲解{ph}</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={rStyles.subTitle}>路线建议</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.5)', lineHeight: 1.7 }}>
              推荐从{routeLabels[0] || '入口'}出发，沿景区主路漫步游览。<br />
              途经主要景点感受历史文化气息。<br />
              全程步行轻松，适合各年龄段游客。
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 4 }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '12px 20px', fontSize: '0.85rem' }}>顾问已接入</button>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '12px 20px', fontSize: '0.85rem' }}>推荐路线</button>
          </div>

          {/* Input area */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="向 AI 导游提问..."
              disabled={loading}
              style={{ flex: 1, fontSize: '0.8rem' }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()} style={{ fontSize: '0.8rem', padding: '8px 18px' }}>
              {loading ? '...' : '发送'}
            </button>
          </form>

          {fullText && (
            <div style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(180,136,100,0.08)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8B6E57', marginBottom: 4 }}>📝 完整回复</div>
              <p style={{ fontSize: '0.75rem', lineHeight: 1.6, color: 'rgba(61,44,42,0.6)' }}>{fullText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
