import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { AdminDashboard } from '@/api/types';

export default function AdminReportPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getAdminDashboard().then(r => {
      if (r.code === 200) setData(r.data ?? null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;
  if (!data) return <div className="empty-state"><span className="empty-state__text">暂无数据</span></div>;

  const totalVisits = data.poiStats.reduce((s, p) => s + p.visitCount, 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif", letterSpacing: 1, marginBottom: 4 }}>游客感受度报告</h1>
        <p style={{ fontSize: '0.8rem', color: 'rgba(61,44,42,0.5)' }}>基于交互记录与游客行为数据的综合分析</p>
      </div>

      {/* 满意度总览 */}
      <div style={{
        borderRadius: 20, padding: 24, marginBottom: 20,
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(180,136,100,0.10)',
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 16 }}>游客关注点分析</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 16, background: 'rgba(180,136,100,0.06)' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.5)', marginBottom: 6 }}>综合满意度</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3D2C2A' }}>{data.overview.avgSatisfaction.toFixed(1)}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.4)', marginTop: 4 }}>/ 5.0</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 16, background: 'rgba(180,136,100,0.06)' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.5)', marginBottom: 6 }}>总访问人次</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#B88864' }}>{totalVisits}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.4)', marginTop: 4 }}>条记录</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 16, background: 'rgba(180,136,100,0.06)' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.5)', marginBottom: 6 }}>话题丰富度</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8B6E57' }}>{data.hotTopics.length}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.4)', marginTop: 4 }}>个热点话题</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 16, background: 'rgba(180,136,100,0.06)' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.5)', marginBottom: 6 }}>情感倾向</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>
              {(() => {
                const pos = data.sentimentStats.find(s => s.sentiment === 'positive')?.count || 0;
                const neg = data.sentimentStats.find(s => s.sentiment === 'negative')?.count || 0;
                return pos + neg > 0 ? `${Math.round(pos / (pos + neg) * 100)}%` : '—';
              })()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.4)', marginTop: 4 }}>正面比例</div>
          </div>
        </div>
      </div>

      {/* 情感趋势 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{
          borderRadius: 20, padding: 20,
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(180,136,100,0.10)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 14 }}>情感分析</div>
          {data.sentimentStats.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.4)', textAlign: 'center', padding: 30 }}>暂无情感数据</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.sentimentStats.map((s, i) => {
                const max = Math.max(...data.sentimentStats.map(x => x.count), 1);
                const colors: Record<string, string> = { positive: '#22c55e', neutral: '#8B6E57', negative: '#ef4444' };
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                      <span style={{ color: 'rgba(61,44,42,0.6)' }}>
                        {s.sentiment === 'positive' ? '😊 正面' : s.sentiment === 'negative' ? '😞 负面' : '😐 中性'}
                      </span>
                      <span style={{ color: 'rgba(61,44,42,0.4)' }}>{s.count}条</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(180,136,100,0.10)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${(s.count / max) * 100}%`, height: '100%',
                        borderRadius: 4, background: colors[s.sentiment] || '#8B6E57',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{
          borderRadius: 20, padding: 20,
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(180,136,100,0.10)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 14 }}>服务建议</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.hotTopics.length > 0 && (
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(180,136,100,0.06)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3D2C2A', marginBottom: 4 }}>🏆 最热门话题</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.6)' }}>「{data.hotTopics[0].topic}」被提及 {data.hotTopics[0].count} 次，建议加强该方面的内容建设</div>
              </div>
            )}
            {data.poiStats[0] && (
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(234,179,8,0.06)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: 4 }}>⭐ 最受欢迎景点</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.6)' }}>「{data.poiStats[0].poiName}」访问量最高，建议增加导览讲解频次</div>
              </div>
            )}
            {data.ageGroupStats[0] && (
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(34,197,94,0.06)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: 4 }}>👥 主力游客群体</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.6)' }}>「{data.ageGroupStats[0].ageGroup}」年龄段游客最多，建议针对性优化服务体验</div>
              </div>
            )}
            {data.poiStats.filter(p => p.avgSatisfaction < 3).length > 0 && (
              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.06)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>⚠️ 待改进景点</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.6)' }}>
                  {data.poiStats.filter(p => p.avgSatisfaction < 3).map(p => p.poiName).join('、')}满意度偏低，建议安排实地调研
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 景点详细数据 */}
      <div style={{
        borderRadius: 20, padding: 20,
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(180,136,100,0.10)',
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 14 }}>各景点游客数据明细</div>
        <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(180,136,100,0.10)', color: 'rgba(61,44,42,0.5)' }}>
              <th style={{ textAlign: 'left', padding: '10px 6px', fontWeight: 500 }}>景点名称</th>
              <th style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 500 }}>访问量</th>
              <th style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 500 }}>平均满意度</th>
              <th style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 500 }}>平均消费</th>
              <th style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 500 }}>平均停留(h)</th>
            </tr>
          </thead>
          <tbody>
            {data.poiStats.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(180,136,100,0.06)' }}>
                <td style={{ padding: '10px 6px', fontWeight: 500 }}>{p.poiName}</td>
                <td style={{ padding: '10px 6px', textAlign: 'right' }}>{p.visitCount}</td>
                <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                  <span style={{ color: p.avgSatisfaction >= 4 ? '#22c55e' : p.avgSatisfaction >= 2.5 ? '#8B6E57' : '#ef4444' }}>
                    {p.avgSatisfaction.toFixed(1)}
                  </span>
                </td>
                <td style={{ padding: '10px 6px', textAlign: 'right' }}>¥{p.avgCost.toFixed(0)}</td>
                <td style={{ padding: '10px 6px', textAlign: 'right' }}>{p.avgStay.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
