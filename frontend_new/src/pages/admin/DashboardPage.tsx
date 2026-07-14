import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { AdminDashboard } from '@/api/types';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getAdminDashboard().then(r => {
      if (r.code === 200) setData(r.data ?? null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;
  if (!data) return <div className="empty-state"><span className="empty-state__text">暂无数据</span></div>;

  const ov = data.overview;
  const cards = [
    { label: '今日服务人次', value: ov.todayServiceCount, sub: `较昨日 ${ov.serviceCountChange >= 0 ? '+' : ''}${ov.serviceCountChange}`, color: '#8B6E57' },
    { label: '本周服务人次', value: ov.weeklyServiceCount, sub: `景点 ${ov.totalPois} 个`, color: '#B88864' },
    { label: '平均满意度', value: `${ov.avgSatisfaction}`, sub: `趋势 ${ov.satisfactionTrend >= 0 ? '+' : ''}${ov.satisfactionTrend}%`, color: '#3D2C2A' },
    { label: '知识库条目', value: ov.totalKnowledge, sub: `${ov.activeTenants} 个活跃景区`, color: '#8B6E57' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif", letterSpacing: 1 }}>数据大屏概览</h1>
        <span style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.4)' }}>实时数据 · 自动更新</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            borderRadius: 20, padding: '18px 20px',
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(180,136,100,0.10)',
            boxShadow: '0 1px 4px rgba(61,44,42,0.03)',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.5)', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: c.color, lineHeight: 1.1 }}>{c.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)', marginTop: 6 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ borderRadius: 20, padding: 20, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 14 }}>近7日服务趋势</div>
          {data.dailyTrend.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.4)', textAlign: 'center', padding: 20 }}>暂无趋势数据</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, paddingTop: 10 }}>
              {data.dailyTrend.map((d, i) => {
                const max = Math.max(...data.dailyTrend.map(x => x.count), 1);
                const h = (d.count / max) * 100;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(61,44,42,0.4)' }}>{d.count}</span>
                    <div style={{
                      width: '100%', borderRadius: '6px 6px 0 0',
                      background: 'linear-gradient(180deg,#B88864,#8B6E57)',
                      height: `${h}%`, minHeight: 4, transition: 'height 0.3s',
                    }} />
                    <span style={{ fontSize: '0.55rem', color: 'rgba(61,44,42,0.3)', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ borderRadius: 20, padding: 20, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 14 }}>热门话题</div>
          {data.hotTopics.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.4)', textAlign: 'center', padding: 20 }}>暂无话题数据</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.hotTopics.slice(0, 6).map((t, i) => {
                const max = Math.max(...data.hotTopics.map(x => x.count), 1);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.5)', width: 20 }}>{i + 1}</span>
                    <div style={{
                      flex: 1, height: 22, borderRadius: 11,
                      background: 'rgba(180,136,100,0.10)',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${(t.count / max) * 100}%`, height: '100%',
                        borderRadius: 11, background: 'linear-gradient(90deg,#8B6E57,#B88864)',
                        display: 'flex', alignItems: 'center', paddingLeft: 10,
                        color: '#fff', fontSize: '0.65rem', whiteSpace: 'nowrap',
                        minWidth: t.count / max > 0.3 ? undefined : undefined,
                      }}>
                        {t.count / max > 0.15 ? t.topic : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.4)', width: 30, textAlign: 'right' }}>{t.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ borderRadius: 20, padding: 20, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 14 }}>景点游览排行</div>
          {data.poiStats.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.4)', textAlign: 'center', padding: 20 }}>暂无数据</div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(180,136,100,0.10)', color: 'rgba(61,44,42,0.5)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 500 }}>景点</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 500 }}>访问量</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 500 }}>满意度</th>
                </tr>
              </thead>
              <tbody>
                {data.poiStats.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(180,136,100,0.06)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 500 }}>{p.poiName}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>{p.visitCount}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>{(p.avgSatisfaction).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ borderRadius: 20, padding: 20, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 14 }}>游客年龄分布</div>
          {data.ageGroupStats.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.4)', textAlign: 'center', padding: 20 }}>暂无数据</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.ageGroupStats.map((a, i) => {
                const max = Math.max(...data.ageGroupStats.map(x => x.count), 1);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4 }}>
                      <span style={{ color: 'rgba(61,44,42,0.6)' }}>{a.ageGroup}</span>
                      <span style={{ color: 'rgba(61,44,42,0.4)' }}>{a.count}人 · 满意度{a.avgSatisfaction.toFixed(1)}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(180,136,100,0.10)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${(a.count / max) * 100}%`, height: '100%',
                        borderRadius: 4, background: 'linear-gradient(90deg,#8B6E57,#D4A574)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
