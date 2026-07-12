import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { DigitalHumanConfigItem } from '@/api/types';

export default function AdminDigitalHumanPage() {
  const [configs, setConfigs] = useState<DigitalHumanConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif", letterSpacing: 1 }}>数字人形象管理</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {configs.length === 0 && <div className="empty-state"><span className="empty-state__text">暂无数字人配置</span></div>}
          {configs.map(c => (
            <div key={c.id} style={{
              borderRadius: 20, padding: 20, background: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(180,136,100,0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.5rem' }}>🎭</span>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#3D2C2A' }}>{c.personaName || '未命名'}</strong>
                      <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: '0.65rem' }}>{c.tenantId}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-text" onClick={() => { setEditing(c); setShowForm(true); }}>编辑</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: '0.75rem', color: 'rgba(61,44,42,0.6)' }}>
                <div><span style={{ color: 'rgba(61,44,42,0.4)' }}>语音：</span>{c.ttsVoice}</div>
                <div><span style={{ color: 'rgba(61,44,42,0.4)' }}>语速：</span>{c.ttsRate}</div>
                <div><span style={{ color: 'rgba(61,44,42,0.4)' }}>音调：</span>{c.ttsPitch}</div>
                <div><span style={{ color: 'rgba(61,44,42,0.4)' }}>Live2D模型：</span>{c.live2dModel || '默认'}</div>
                <div><span style={{ color: 'rgba(61,44,42,0.4)' }}>服装：</span>{c.costume || '默认'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: '#F7F2E6', borderRadius: 24, padding: 28, width: 560,
            maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(61,44,42,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#3D2C2A', marginBottom: 16 }}>编辑数字人配置</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input" placeholder="人设名称" value={editing.personaName || ''}
                  onChange={e => setEditing({ ...editing, personaName: e.target.value })} />
                <input className="input" placeholder="租户ID" value={editing.tenantId}
                  onChange={e => setEditing({ ...editing, tenantId: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <select className="input" value={editing.ttsVoice} onChange={e => setEditing({ ...editing, ttsVoice: e.target.value })}>
                  {voiceOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <input className="input" placeholder="语速 (如 +10%)" value={editing.ttsRate || ''}
                  onChange={e => setEditing({ ...editing, ttsRate: e.target.value })} />
                <input className="input" placeholder="音调 (如 +0Hz)" value={editing.ttsPitch || ''}
                  onChange={e => setEditing({ ...editing, ttsPitch: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input" placeholder="Live2D模型" value={editing.live2dModel || ''}
                  onChange={e => setEditing({ ...editing, live2dModel: e.target.value })} />
                <input className="input" placeholder="服装" value={editing.costume || ''}
                  onChange={e => setEditing({ ...editing, costume: e.target.value })} />
              </div>

              <input className="input" placeholder="面部贴图URL" value={editing.faceImage || ''}
                onChange={e => setEditing({ ...editing, faceImage: e.target.value })} />

              <input className="input" placeholder="背景贴图URL" value={editing.backgroundImage || ''}
                onChange={e => setEditing({ ...editing, backgroundImage: e.target.value })} />

              <textarea className="input" placeholder="人设提示词（persona prompt）" rows={4}
                value={editing.personaPrompt || ''}
                onChange={e => setEditing({ ...editing, personaPrompt: e.target.value })}
                style={{ resize: 'vertical', minHeight: 80 }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-sm btn-primary" onClick={saveConfig}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
