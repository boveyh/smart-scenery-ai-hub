import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { RealtimeInfo, PoiItem } from '@/api/types';

const crowdednessStyle = (level: number) => {
  if (level <= 2) return { cls: 'badge-green', label: '畅通' };
  if (level <= 3) return { cls: 'badge-yellow', label: '适中' };
  return { cls: 'badge-red', label: '拥挤' };
};

export default function HomePage() {
  const [info, setInfo] = useState<RealtimeInfo | null>(null);
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.getRealtimeInfo().then(r => r.data ?? null),
      apiClient.getPois().then(r => r.data ?? []),
    ]).then(([infoData, poisData]) => {
      setInfo(infoData);
      setPois(poisData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-10)', maxWidth: 1100, margin: '0 auto' }}>


      {/* 统计卡片 */}
      {info && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          {[
            { icon: '🌤️', label: '天气', value: `${info.weather} ${info.temperature}°C`, color: '#8B6E57' },
            { icon: '👥', label: '总体拥挤度', value: `${info.crowdednessLevel}/5`, color: '#f59e0b' },
            { icon: '📍', label: '景点总数', value: `${pois.length} 个`, color: '#22c55e' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', borderLeft: `3px solid ${s.color}` }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{s.label}</div><div style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginTop: 2 }}>{s.value}</div></div>
            </div>
          ))}
        </div>
      )}

      {/* 公告 */}
      {info && (info.announcements ?? []).length > 0 && (
        <div style={{ marginBottom: 'var(--space-8)', padding: 'var(--space-4) var(--space-5)', background: '#fef3c7', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: '#92400e' }}>
          <span style={{ fontSize: 20 }}>📢</span><span>{(info.announcements ?? []).join('；')}</span>
        </div>
      )}

      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-3)', borderBottom: '2px solid var(--primary)' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 20 }}>📍</span> 热门景点</h2>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>共 {pois.length} 个景点</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        {pois.slice(0, 6).map((poi: PoiItem) => {
          const badge = crowdednessStyle(poi.crowdedness);
          return (
            <div key={poi.poiId} className="card" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{poi.name}</h3>
                <span className={`badge ${badge.cls}`}>{badge.label} {poi.crowdedness}/5</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span className="badge badge-blue">{poi.category}</span>
                <span className="badge badge-gray">⏱ {poi.avgStayMin}分钟</span>
                {poi.ticketPrice !== undefined && poi.ticketPrice > 0 && <span className="badge badge-yellow">¥{poi.ticketPrice}</span>}
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {poi.description.length > 60 ? poi.description.slice(0, 60) + '...' : poi.description}
              </p>
            </div>
          );
        })}
      </div>

      {pois.length === 0 && <div className="empty-state"><span className="empty-state__icon">📍</span><span className="empty-state__text">暂无景点数据</span></div>}
    </div>
  );
}
