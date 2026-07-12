import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { PoiItem } from '@/api/types';

export default function PoiListPage() {
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('全部');

  useEffect(() => {
    apiClient.getPois().then(res => {
      if (res.code === 200) setPois(res.data ?? []);
      else setError(res.message || '获取景点列表失败');
    }).catch((err: unknown) => {
      setError((err as Error).message);
    }).finally(() => setLoading(false));
  }, []);

  const categories = ['全部', ...new Set(pois.map(p => p.category))];
  const filtered = category === '全部' ? pois : pois.filter(p => p.category === category);

  const getCrowdednessBadge = (level: number) => {
    if (level <= 2) return { class: 'badge-green', label: '畅通' };
    if (level <= 3) return { class: 'badge-yellow', label: '适中' };
    return { class: 'badge-red', label: '拥挤' };
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-10)', maxWidth: 1100, margin: '0 auto' }}>
      {/* 标题栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-3)',
        borderBottom: '2px solid var(--primary)',
      }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📍</span> 景点列表
        </h2>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', background: 'var(--bg)', padding: '4px 12px', borderRadius: 9999 }}>
          共 {filtered.length} 个景点
        </span>
      </div>

      {/* 分类筛选 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn btn-sm ${category === cat ? 'btn-primary' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 景点列表 */}
      {filtered.length === 0 ? (
        <div className="empty-state"><span className="empty-state__icon">📍</span><span className="empty-state__text">暂无该分类的景点</span></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(poi => {
            const badge = getCrowdednessBadge(poi.crowdedness);
            return (
              <div key={poi.poiId} className="card" style={{
                padding: 'var(--space-5)',
                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-5)',
                cursor: 'pointer',
              }}>
                {/* 左侧图标 */}
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                  background: 'rgba(180,136,100,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  🏞️
                </div>
                {/* 中间内容 */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 6 }}>
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{poi.name}</h3>
                    <span className={`badge ${badge.class}`}>{badge.label} {poi.crowdedness}/5</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{poi.category}</span>
                    <span className="badge badge-gray">⏱ {poi.avgStayMin}分钟</span>
                    {poi.ticketPrice !== undefined && poi.ticketPrice > 0 && (
                      <span className="badge badge-yellow">¥{poi.ticketPrice}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{poi.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
