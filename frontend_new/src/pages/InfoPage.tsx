import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { RealtimeInfo, PoiItem } from '@/api/types';

export default function InfoPage() {
  const [info, setInfo] = useState<RealtimeInfo | null>(null);
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [infoRes, poisRes] = await Promise.all([apiClient.getRealtimeInfo(), apiClient.getPois()]);
      if (infoRes.code === 200) setInfo(infoRes.data ?? null);
      else setError(infoRes.message || '获取资讯失败');
      if (poisRes.code === 200) setPois(poisRes.data ?? []);
      setLastUpdate(new Date());
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, []);

  const getBadge = (l: number) => l <= 2 ? { c: 'badge-green', l: '畅通' } : l <= 3 ? { c: 'badge-yellow', l: '适中' } : { c: 'badge-red', l: '拥挤' };
  const wIcon = (w: string) => ({ '晴': '☀️', '多云': '⛅', '阴': '☁️', '小雨': '🌦️', '中雨': '🌧️', '大雨': '🌧️', '雷阵雨': '⛈️', '雪': '❄️' }[w] || '🌤️');

  if (loading && !info) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-10)', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-3)', borderBottom: '2px solid var(--primary)' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 20 }}>📊</span> 实时资讯</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg)', padding: '4px 10px', borderRadius: 9999 }}>{lastUpdate.toLocaleTimeString()}</span>
          <button className="btn btn-sm btn-primary" onClick={fetchData} disabled={loading}>{loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '🔄'} 刷新</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>❌ {error}</div>}

      {info && (
        <>
          <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-6)', padding: 'var(--space-5)', background: 'var(--bg)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ fontSize: 56 }}>{wIcon(info.weather)}</span>
              <div><div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{info.temperature}°C</div><div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{info.weather}</div></div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>总体拥挤度</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{getBadge(info.crowdednessLevel).l}<span style={{ fontSize: 'var(--text-base)', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>({info.crowdednessLevel}/5)</span></div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 6 }}>拥挤程度</div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${(info.crowdednessLevel / 5) * 100}%`, height: '100%', borderRadius: 4, background: info.crowdednessLevel <= 2 ? 'var(--success)' : info.crowdednessLevel <= 3 ? 'var(--warning)' : 'var(--danger)', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}><span>畅通</span><span>适中</span><span>拥挤</span></div>
            </div>
          </div>

          {(info.announcements ?? []).length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}><span>📢</span> 景区公告</h3>
              {(info.announcements ?? []).map((ann, i) => (
                <div key={i} style={{ padding: 'var(--space-3) var(--space-4)', background: '#fef3c7', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--warning)', marginBottom: 8, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>#{i + 1}</span>{ann}
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}><span>📍</span> 景点拥挤度</h3>
            {pois.slice(0, 10).map(poi => {
              const b = getBadge(poi.crowdedness);
              const peak = (info.peakPois ?? []).includes(poi.poiId);
              return (
                <div key={poi.poiId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: peak ? '#fef3c7' : 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: peak ? 'rgba(245,158,11,0.2)' : 'transparent', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontWeight: 500 }}>{poi.name}</span>{peak && <span className="badge badge-yellow">热门</span>}</div>
                  <span className={`badge ${b.c}`} style={{ fontWeight: 500 }}>{b.l} ({poi.crowdedness}/5)</span>
                </div>
              );
            })}
            {pois.length === 0 && <div className="empty-state"><span className="empty-state__text">暂无景点数据</span></div>}
          </div>
        </>
      )}
    </div>
  );
}
