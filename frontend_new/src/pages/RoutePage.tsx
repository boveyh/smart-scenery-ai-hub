import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { PoiItem, RouteRecommendResult } from '@/api/types';

export default function RoutePage() {
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [loadingPois, setLoadingPois] = useState(true);
  const [startPoiId, setStartPoiId] = useState('');
  const [interest, setInterest] = useState('全部');
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'fast'>('moderate');
  const [companions, setCompanions] = useState<'alone' | 'couple' | 'with_children' | 'with_elderly' | 'group'>('alone');
  const [durationMin, setDurationMin] = useState(180);
  const [route, setRoute] = useState<RouteRecommendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getPois().then(res => {
      if (res.code === 200) setPois(res.data ?? []);
    }).finally(() => setLoadingPois(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startPoiId) return;
    setLoading(true);
    setError(null);
    setRoute(null);
    try {
      const res = await apiClient.recommendRoute({
        preferences: { interest, pace, companions, durationMin },
        startPoiId,
      });
      if (res.code === 200) setRoute(res.data ?? null);
      else setError(res.message || '路线推荐失败');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getPoiName = (id: string) => pois.find(p => p.poiId === id)?.name || id;

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-10)', maxWidth: 720, margin: '0 auto' }}>
      {/* 标题栏 */}
      <div style={{
        marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-3)',
        borderBottom: '2px solid var(--primary)',
      }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🗺️</span> 路线规划
        </h2>
      </div>

      {/* 参数表单 */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text)' }}>
                起始景点 <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select className="input" value={startPoiId} onChange={e => setStartPoiId(e.target.value)} required>
                <option value="">请选择起始景点</option>
                {loadingPois ? <option disabled>加载中...</option> : pois.map(p => (
                  <option key={p.poiId} value={p.poiId}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 6 }}>兴趣偏好</label>
                <select className="input" value={interest} onChange={e => setInterest(e.target.value)}>
                  <option value="全部">全部</option>
                  <option value="历史文化">历史文化</option>
                  <option value="自然风光">自然风光</option>
                  <option value="休闲娱乐">休闲娱乐</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 6 }}>同行人</label>
                <select className="input" value={companions} onChange={e => setCompanions(e.target.value as typeof companions)}>
                  <option value="alone">独自</option>
                  <option value="couple">情侣</option>
                  <option value="with_children">带小孩</option>
                  <option value="with_elderly">带老人</option>
                  <option value="group">团队</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 6 }}>游览节奏</label>
                <select className="input" value={pace} onChange={e => setPace(e.target.value as typeof pace)}>
                  <option value="relaxed">悠闲 🐢</option>
                  <option value="moderate">适中 🚶</option>
                  <option value="fast">紧凑 🏃</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  游览时长: <strong style={{ color: 'var(--primary)' }}>{durationMin}</strong> 分钟
                </label>
                <input
                  type="range" min={30} max={480} step={30}
                  value={durationMin} onChange={e => setDurationMin(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', height: 6, marginTop: 8 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>30分钟</span><span>8小时</span>
                </div>
              </div>
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading || !startPoiId} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> 规划中...</> : '🚀 生成推荐路线'}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>❌ {error}</div>}

      {route && (
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📍</span> 推荐路线
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            {route.poiSequence.map((id, idx) => (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: idx === 0 ? 'rgba(180,136,100,0.12)' : 'var(--bg-hover)',
                border: idx === 0 ? '1px solid rgba(139,110,87,0.15)' : '1px solid transparent',
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: idx === 0 ? 'var(--primary)' : 'var(--border)',
                  color: idx === 0 ? '#fff' : 'var(--text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--text-xs)', fontWeight: 700, flexShrink: 0,
                }}>{idx + 1}</span>
                <span style={{ flex: 1, fontSize: 'var(--text-base)', fontWeight: 500 }}>{getPoiName(id)}</span>
                {idx < route.poiSequence.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>↓</span>}
              </div>
            ))}
          </div>
          <div style={{
            padding: 'var(--space-3) var(--space-4)', background: 'var(--bg)',
            borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-base)', color: 'var(--text-secondary)',
          }}>
            ⏱ 预计游览时间: <strong style={{ color: 'var(--text)' }}>{route.estimatedTimeMin}</strong> 分钟
          </div>
          {route.tips.length > 0 && (
            <div style={{ padding: 'var(--space-4)', background: '#fef3c7', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                💡 出行提示
              </h4>
              <ul style={{ paddingLeft: 'var(--space-5)', fontSize: 'var(--text-sm)', lineHeight: 1.8, color: '#92400e' }}>
                {route.tips.map((tip, idx) => <li key={idx}>{tip}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
