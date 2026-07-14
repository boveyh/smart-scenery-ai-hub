import React, { useEffect, useState, useRef } from 'react';
import apiClient from '@/api/client';
import type { DigitalHumanConfigItem } from '@/api/types';
import { modelManifest } from '@/features/live2d/modelManifest';
import { Live2DViewer } from '@/features/live2d/Live2DViewer';

function PreviewCanvas({ config }: { config: DigitalHumanConfigItem }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Live2DViewer | null>(null);
  const loadedKey = useRef('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const key = `${config.live2dModel}_${config.personaName}`;
    if (loadedKey.current === key) return;
    loadedKey.current = key;

    const entry = modelManifest.find(m => m.id === config.live2dModel);
    if (!entry) return;

    const init = async () => {
      if (viewerRef.current) { viewerRef.current.destroy(); viewerRef.current = null; }
      try {
        const v = new Live2DViewer(canvas, {
          onLoadStart: () => {},
          onLoadProgress: () => {},
          onLoadComplete: () => {},
          onLoadError: (e) => { console.error('[DHPreview] load error:', e); },
          onBlink: () => {},
        });
        viewerRef.current = v;
        await v.loadModel(entry.modelPath, config.personaName || entry.name);
      } catch (e) {
        console.error('[DHPreview] init error:', e);
      }
    };

    const timer = setTimeout(init, 150);

    const ro = new ResizeObserver(() => {
      viewerRef.current?.onResize();
    });
    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
      if (viewerRef.current) { viewerRef.current.destroy(); viewerRef.current = null; }
      loadedKey.current = '';
    };
  }, [config.live2dModel, config.personaName]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

export default function AdminDigitalHumanPage() {
  const [configs, setConfigs] = useState<DigitalHumanConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<DigitalHumanConfigItem | null>(null);
  const [editing, setEditing] = useState<DigitalHumanConfigItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = () => {
    setLoading(true);
    apiClient.getDigitalHumanConfigs().then(r => {
      if (r.code === 200) setConfigs(r.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const saveConfig = async () => {
    if (!editing) return;
    await apiClient.saveDigitalHumanConfig(editing);
    setShowForm(false);
    setEditing(null);
    loadData();
  };

  const voiceOptions = [
    'zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural', 'zh-CN-YunjianNeural',
    'zh-CN-XiaoyiNeural', 'zh-CN-YunyangNeural', 'zh-CN-XiaohanNeural',
    'zh-CN-XiaomengNeural', 'zh-CN-XiaoshuangNeural',
  ];

  return (
    <div style={{ display: 'flex', gap: 24, maxWidth: 1400, margin: '0 auto', height: 'calc(100vh - 140px)' }}>
      {/* Left: config list */}
      <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif", letterSpacing: 1 }}>数字人形象管理</h1>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
          ) : configs.length === 0 ? (
            <div className="empty-state"><span className="empty-state__text">暂无数字人配置</span></div>
          ) : configs.map(c => (
            <div key={c.id} onClick={() => setPreviewItem(c)} style={{
              borderRadius: 18, padding: 14, cursor: 'pointer',
              background: previewItem?.tenantId === c.tenantId ? 'rgba(180,136,100,0.12)' : 'rgba(255,255,255,0.55)',
              border: `1px solid ${previewItem?.tenantId === c.tenantId ? 'rgba(180,136,100,0.25)' : 'rgba(180,136,100,0.08)'}`,
              transition: 'all 150ms',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🎭</span>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#3D2C2A' }}>{c.personaName || '未命名'}</strong>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.35)', marginLeft: 6 }}>{c.live2dModel}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {previewItem?.tenantId === c.tenantId && <span style={{ fontSize: '0.6rem', color: '#8B6E57', fontWeight: 600 }}>预览中</span>}
                  <button className="btn-text" onClick={e => { e.stopPropagation(); setEditing({ ...c }); setShowForm(true); }}>编辑</button>
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.4)', marginTop: 6, lineHeight: 1.4 }}>
                {c.personaPrompt ? (c.personaPrompt.length > 80 ? c.personaPrompt.slice(0, 80) + '...' : c.personaPrompt) : '暂无提示词'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Live2D preview — fixed portrait aspect */}
      <div style={{
        flex: 1, borderRadius: 28, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(145deg,#F2EBDA 0%,#F7F2E6 100%)',
        boxShadow: 'inset 0 2px 6px rgba(61,44,42,0.03)',
      }}>
        {!previewItem?.live2dModel ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', minHeight: 420, color: 'rgba(61,44,42,0.3)', gap: 8,
          }}>
            <span style={{ fontSize: '2.5rem' }}>🎭</span>
            <span style={{ fontSize: '0.85rem' }}>点击左侧配置预览数字人</span>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%' }} key={previewItem.tenantId}>
            <PreviewCanvas config={previewItem} />
          </div>
        )}
        {previewItem && (
          <div style={{
            position: 'absolute', bottom: 14, left: 14, right: 14,
            background: 'rgba(61,44,42,0.7)', backdropFilter: 'blur(8px)',
            borderRadius: 14, padding: '10px 14px', color: '#F7F2E6',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{previewItem.personaName || '数字人'}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(215,200,180,0.6)', marginTop: 2 }}>
              {previewItem.live2dModel} · {previewItem.ttsVoice}
            </div>
          </div>
        )}
      </div>

      {/* Edit modal — no model selector, only text/prompt */}
      {showForm && editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: '#F7F2E6', borderRadius: 24, padding: 28, width: 520,
            maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 8px 40px rgba(61,44,42,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>🎭</span>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#3D2C2A' }}>{editing.personaName || '未命名'}</h3>
                <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)' }}>
                  模型: {editing.live2dModel} · TTS: {editing.ttsVoice} · {editing.ttsRate} · {editing.ttsPitch}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input" placeholder="人设名称" value={editing.personaName || ''}
                  onChange={e => setEditing({ ...editing, personaName: e.target.value })} />
                <select className="input" value={editing.ttsVoice}
                  onChange={e => setEditing({ ...editing, ttsVoice: e.target.value })}>
                  {voiceOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input" placeholder="语速" value={editing.ttsRate || ''}
                  onChange={e => setEditing({ ...editing, ttsRate: e.target.value })} />
                <input className="input" placeholder="音调" value={editing.ttsPitch || ''}
                  onChange={e => setEditing({ ...editing, ttsPitch: e.target.value })} />
              </div>
              <textarea className="input" placeholder="人设提示词（描述数字人的性格、语气和讲解风格）" rows={5}
                value={editing.personaPrompt || ''}
                onChange={e => setEditing({ ...editing, personaPrompt: e.target.value })}
                style={{ resize: 'vertical', minHeight: 100, fontSize: '0.78rem' }} />
              <div style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.35)' }}>
                提示词将作为 AI 对话的系统指令，决定数字人的性格、语气和讲解风格。
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-sm btn-primary" onClick={saveConfig}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
