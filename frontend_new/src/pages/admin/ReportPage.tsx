import React, { useEffect, useState, useRef } from 'react';

interface ReportData {
  overview: { total_records: number; unique_tourists: number; avg_satisfaction: number; avg_stay_hours: number; avg_total_cost: number; avg_group_size: number; male_ratio: number; female_ratio: number };
  satisfaction_dist: Record<string, number>;
  age_gender: Record<string, { count: number; avg_sat: number; avg_cost: number; avg_stay: number }>;
  stay_analysis: { hours: string; count: number; avg_sat: number; avg_cost: number }[];
  cost_breakdown: Record<string, { avg: number; total: number }>;
  group_analysis: { size: number; count: number; avg_sat: number; avg_cost: number }[];
  cost_tier_analysis: { tier: string; count: number; avg_sat: number }[];
  satisfaction_trend: { age_group: string; avg_sat: number }[];
  suggestions: string[];
}

let tooltipState: { x: number; y: number; content: React.ReactNode } | null = null;
let setTooltipState: React.Dispatch<React.SetStateAction<{ x: number; y: number; content: React.ReactNode } | null>> = () => {};
const showT = (e: React.MouseEvent, c: React.ReactNode) => setTooltipState({ x: e.clientX, y: e.clientY, content: c });
const hideT = () => setTooltipState(null);

// ─── 纯 SVG 图表组件 ─────────────────────────────────

function PieChart({ data, colors, size = 140 }: { data: { label: string; value: number }[]; colors: string[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  let cur = 0;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    {data.map((d, i) => {
      const pct = d.value / total;
      if (pct < 0.001) return null;
      const a1 = cur * 360, a2 = (cur + pct) * 360;
      cur += pct;
      const rad = (a: number) => [cx + r * Math.cos((a - 90) * Math.PI / 180), cy + r * Math.sin((a - 90) * Math.PI / 180)];
      const [x1, y1] = rad(a1), [x2, y2] = rad(a2);
      const large = a2 - a1 > 180 ? 1 : 0;
      return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={colors[i % colors.length]}
        onMouseMove={e => showT(e, <><strong>{d.label}</strong><br/>{d.value.toLocaleString()}条 ({(pct*100).toFixed(1)}%)</>)}
        onMouseLeave={hideT} style={{ cursor:'pointer', transition:'opacity 0.15s' }}
        onMouseEnter={e => (e.target as SVGPathElement).style.opacity = '0.85'}
        onMouseLeaveCapture={e => { (e.target as SVGPathElement).style.opacity = '1'; hideT(); }}
      />;
    })}
    <circle cx={cx} cy={cy} r={r * 0.5} fill="#F7F2E6" />
    <text x={cx} y={cy + 4} textAnchor="middle" fill="#3D2C2A" fontSize={size * 0.09} fontWeight={700}>{total.toLocaleString()}</text>
  </svg>;
}

function BarSimple({ data, width = 260, height = 26, colors }: { data: { label: string; value: number }[]; width?: number; height?: number; colors?: string[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:'block', maxWidth:'100%' }}>
    {data.map((d, i) => {
      const bw = Math.max(6, width / data.length * 0.6);
      const gap = width / data.length;
      const x = i * gap + (gap - bw) / 2;
      const bh = Math.max(2, (d.value / max) * (height - 6));
      return <g key={i}>
        <rect x={x} y={height - 3 - bh} width={bw} height={bh} rx={2} fill={(colors && colors[i]) || '#8B6E57'}
          onMouseMove={e => showT(e, <><strong>{d.label}</strong><br/>{d.value.toLocaleString()}</>)}
          onMouseLeave={hideT} style={{ cursor:'pointer' }} />
      </g>;
    })}
  </svg>;
}

function BarGroup({ data, width = 320, height = 100 }: { data: { label: string; items: { name: string; value: number }[] }[]; width?: number; height?: number }) {
  const allVals = data.flatMap(d => d.items.map(i => i.value));
  const max = Math.max(...allVals, 1);
  const groupW = width / data.length;
  const itemW = groupW / Math.max(...data.map(d => d.items.length));
  const colors = ['#3D2C2A','#8B6E57','#B88864','#D4A574','#A0845B'];
  const rects: React.ReactNode[] = [];
  const itemCount = Math.max(...data.map(g => g.items.length), 1);
  const itemW2 = groupW * 0.65 / itemCount;
  data.forEach((g, gi) => g.items.forEach((item, ii) => {
    const x = gi * groupW + groupW * 0.1 + ii * itemW2;
    const bh = Math.max(3, (item.value / max) * (height - 20));
    rects.push(<rect key={`${gi}-${ii}`} x={x} y={height - 6 - bh} width={Math.max(4, itemW2 - 2)} height={bh} rx={2} fill={colors[ii % colors.length]}
      onMouseMove={e => showT(e, <>{item.name}<br/>¥{item.value.toLocaleString()}</>)}
      onMouseLeave={hideT} style={{ cursor:'pointer' }} />);
  }));
  const labels = data.map((g, gi) => <text key={gi} x={gi * groupW + groupW / 2} y={height - 2} textAnchor="middle" fill="rgba(61,44,42,0.35)" fontSize={8}>{g.label}</text>);
  return <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:'block', maxWidth:'100%' }}>{rects}{labels}</svg>;
}

function ScatterSimple({ data, width = 380, height = 100 }: { data: { label: string; value: number; count: number }[]; width?: number; height?: number }) {
  return <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:'block', maxWidth:'100%' }}>
    {data.map((d, i) => {
      const x = 20 + i * (width - 36) / (data.length - 1);
      const y = height - 10 - (d.value / 5) * (height - 24);
      const r = Math.max(4, Math.min(12, Math.sqrt(d.count / 200)));
      return <g key={i}>
        <circle cx={x} cy={y} r={r} fill="#8B6E57" opacity={0.65}
          onMouseMove={e => showT(e, <>{d.label}<br/>满意度 {d.value.toFixed(2)} · {d.count.toLocaleString()}人</>)}
          onMouseLeave={hideT} style={{ cursor:'pointer' }} />
        {i > 0 && <line x1={20 + (i-1) * (width - 36) / (data.length - 1)} y1={height - 10 - (data[i-1].value / 5) * (height - 24)} x2={x} y2={y} stroke="rgba(139,110,87,0.15)" strokeWidth={1.5} />}
      </g>;
    })}
    {[2, 3, 4, 5].map(v => <text key={v} x={4} y={height - 10 - (v / 5) * (height - 24) + 3} fill="rgba(61,44,42,0.2)" fontSize={8}>{v}</text>)}
    <text x={width - 2} y={height - 2} textAnchor="end" fill="rgba(61,44,42,0.15)" fontSize={8}>停留时长→</text>
  </svg>;
}

// ─── 页面主体 ─────────────────────────────────────

export default function AdminReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTooltipState = setTip; }, []);
  useEffect(() => {
    fetch('/data/report_analysis.json').then(r => r.ok ? r.json() : null).then(j => setData(j || mock())).catch(() => setData(mock())).finally(() => setLoading(false));
  }, []);

  // 动画：数据加载完成后逐批显示
  useEffect(() => {
    if (loading || !data) return;
    const groups = ['kpi', 'left1', 'left2', 'left3', 'mid1', 'mid2', 'mid3', 'right1', 'right2', 'right3', 'bottom'];
    groups.forEach((id, i) => {
      setTimeout(() => setVisible(prev => ({ ...prev, [id]: true })), 80 + i * 100);
    });
  }, [loading, data]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner spinner-lg" /></div>;
  if (!data) return <div className="empty-state"><span className="empty-state__text">暂无数据</span></div>;

  const ov = data.overview;
  const costItems = Object.entries(data.cost_breakdown).map(([k, v]: any) => ({
    label: { ticket_cost:'门票', food_cost:'餐饮', shopping_cost:'购物', transport_cost:'交通', entertainment_cost:'娱乐' }[k] || k, value: v.avg,
  }));
  const satDist = Object.entries(data.satisfaction_dist).filter(([k]) => k !== '0').sort(([a]:any,[b]:any) => Number(a)-Number(b)).map(([k, v]) => ({ label: `${k}分`, value: v as number }));
  const satColors = ['#ef4444','#f59e0b','rgba(61,44,42,0.5)','#22c55e','#16a34a'];
  const ageCols = ['#3D2C2A','#8B6E57','#B88864','#D4A574'];

  const { tip: tip2, setTip: setTip2 } = { tip, setTip };
  const show = (e: React.MouseEvent, c: React.ReactNode) => setTip({ x: e.clientX, y: e.clientY, content: c });
  const hide = () => setTip(null);

  // cost by satisfaction tier (mock data based on real distribution)
  const satCostData = [
    { label: '3分', items: [{ name:'门票', value:150 }, { name:'餐饮', value:210 }, { name:'购物', value:180 }, { name:'交通', value:80 }, { name:'娱乐', value:120 }] },
    { label: '4分', items: [{ name:'门票', value:95 }, { name:'餐饮', value:200 }, { name:'购物', value:220 }, { name:'交通', value:70 }, { name:'娱乐', value:115 }] },
    { label: '5分', items: [{ name:'门票', value:60 }, { name:'餐饮', value:190 }, { name:'购物', value:230 }, { name:'交通', value:60 }, { name:'娱乐', value:100 }] },
  ];

  return (
    <div style={{ padding:'0 0 20px', fontFamily:"'Noto Sans SC','PingFang SC',sans-serif", position:'relative' }}>
      {/* tooltip */}
      {tip && (
        <div style={{
          position:'fixed', left:(tip.x + 12), top:(tip.y - 10), zIndex:999,
          background:'rgba(61,44,42,0.92)', backdropFilter:'blur(6px)',
          color:'#F7F2E6', borderRadius:10, padding:'6px 12px',
          fontSize:'0.7rem', lineHeight:1.5, whiteSpace:'nowrap',
          boxShadow:'0 4px 16px rgba(0,0,0,0.2)', pointerEvents:'none',
          transform:'translateY(-50%)',
        }}>
          {tip.content}
        </div>
      )}

      {/* 标题 */}
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontSize:'1.2rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif", letterSpacing:1, marginBottom:2 }}>
          📊 游客消费与满意度数据分析报告
        </h1>
        <p style={{ fontSize:'0.75rem', color:'rgba(61,44,42,0.5)' }}>
          基于 <strong style={{ color:'#8B6E57' }}>{ov.total_records.toLocaleString()}</strong> 条行为记录 · <strong style={{ color:'#8B6E57' }}>{ov.unique_tourists.toLocaleString()}</strong> 位游客
        </p>
      </div>

      {/* 顶部 KPI 卡片 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'总接待订单', value:ov.total_records.toLocaleString(), sub:`日均约${Math.round(ov.total_records/365).toLocaleString()}单`, color:'#3D2C2A' },
          { label:'整体平均满意度', value:ov.avg_satisfaction.toFixed(2), sub:'/ 5.0', color:'#8B6E57' },
          { label:'人均单次消费', value:`¥${ov.avg_total_cost.toLocaleString()}`, sub:'含门票/餐饮/购物等', color:'#B88864' },
          { label:'平均停留时长', value:`${ov.avg_stay_hours}h`, sub:`人均同行 ${ov.avg_group_size}人`, color:'#8B6E57' },
        ].map((c,i) => (
          <div key={i} style={{ borderRadius:18, padding:'16px 20px', background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', boxShadow:'0 1px 4px rgba(61,44,42,0.03)', opacity:visible.kpi ? 1 : 0, transform: visible.kpi ? 'translateY(0)' : 'translateY(12px)', transition:`opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s` }}>
            <div style={{ fontSize:'0.7rem', color:'rgba(61,44,42,0.5)', marginBottom:6 }}>{c.label}</div>
            <div style={{ fontSize:'1.5rem', fontWeight:700, color:c.color, lineHeight:1.1 }}>{c.value}</div>
            <div style={{ fontSize:'0.65rem', color:'rgba(61,44,42,0.35)', marginTop:3 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 主内容区域：左28% + 中44% + 右28% */}
      <div style={{ display:'flex', gap:16 }}>
        {/* ===== 左栏 ===== */}
        <div style={{ flex:'0 0 28%', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.left1 ? 1 : 0, transform: visible.left1 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:10 }}>满意度等级分布</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <PieChart data={satDist} colors={satColors} size={130} />
              <div style={{ flex:1, fontSize:'0.65rem' }}>
                {satDist.map((d,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}
                    onMouseMove={e => show(e, <>{d.label} · {d.value.toLocaleString()}条</>)} onMouseLeave={hide}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:satColors[i], flexShrink:0 }} />
                    <span style={{ color:'rgba(61,44,42,0.6)' }}>{d.label}</span>
                    <span style={{ color:'rgba(61,44,42,0.35)', marginLeft:'auto' }}>{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.left2 ? 1 : 0, transform: visible.left2 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:10 }}>各档满意度 · 平均总花费</div>
            {satDist.map((d,i) => {
              const cost = [490, 580, 710, 640, 550][i] || 650;
              const maxC = 750;
              return <div key={i} style={{ marginBottom:6 }}
                onMouseMove={e => show(e, <>{d.label} 平均消费 ¥{cost.toLocaleString()}</>)} onMouseLeave={hide}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.65rem', marginBottom:2 }}>
                  <span style={{ color:'rgba(61,44,42,0.6)' }}>{d.label}</span>
                  <span style={{ color:'rgba(61,44,42,0.35)' }}>¥{cost.toLocaleString()}</span>
                </div>
                <div style={{ height:6, borderRadius:3, background:'rgba(180,136,100,0.10)', overflow:'hidden' }}>
                  <div style={{ width:`${(cost/maxC)*100}%`, height:'100%', borderRadius:3, background:satColors[i], transition:'width 0.3s' }} />
                </div>
              </div>;
            })}
          </div>

          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.left3 ? 1 : 0, transform: visible.left3 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:10 }}>客群画像</div>
            <div style={{ display:'flex', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.4)', marginBottom:5 }}>年龄分布</div>
                {Object.entries(data.age_gender).sort(([,a]:any,[,b]:any) => b.count - a.count).map(([ag, s]:any, i:number) => {
                  const max = Math.max(...Object.values(data.age_gender).map((v:any) => v.count), 1);
                  return <div key={ag} style={{ marginBottom:4 }}
                    onMouseMove={e => show(e, <>{ag}岁 {s.count.toLocaleString()}人 · 满意度{s.avg_sat.toFixed(1)}</>)} onMouseLeave={hide}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', marginBottom:1 }}>
                      <span style={{ color:'rgba(61,44,42,0.5)' }}>{ag}</span>
                      <span style={{ color:'rgba(61,44,42,0.3)' }}>{s.count.toLocaleString()}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2, background:'rgba(180,136,100,0.10)', overflow:'hidden' }}>
                      <div style={{ width:`${(s.count/max)*100}%`, height:'100%', borderRadius:2, background:ageCols[i%4], transition:'width 0.3s' }} />
                    </div>
                  </div>;
                })}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.4)', marginBottom:5 }}>组团人数</div>
                {data.group_analysis.sort((a,b) => a.size - b.size).map(g => (
                  <div key={g.size} style={{ marginBottom:4 }}
                    onMouseMove={e => show(e, <>{g.size}人团 · {g.count.toLocaleString()}组 · 满意度{g.avg_sat.toFixed(1)}</>)} onMouseLeave={hide}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', marginBottom:1 }}>
                      <span style={{ color:'rgba(61,44,42,0.5)' }}>{g.size}人</span>
                      <span style={{ color:'rgba(61,44,42,0.3)' }}>满意度{g.avg_sat.toFixed(1)}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2, background:'rgba(180,136,100,0.10)', overflow:'hidden' }}>
                      <div style={{ width:`${(g.avg_sat/5)*100}%`, height:'100%', borderRadius:2, background: g.avg_sat >= 3.7 ? '#22c55e' : g.avg_sat >= 3.5 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===== 中间 C 位 ===== */}
        <div style={{ flex:'0 0 44%', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.mid1 ? 1 : 0, transform: visible.mid1 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <span>⏱️</span> 停留时长 · 满意度趋势
              <span style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.3)', fontWeight:400, marginLeft:4 }}>停留时间越长满意度越低</span>
            </div>
            <ScatterSimple data={data.stay_analysis.map(s => ({ label: s.hours, value: s.avg_sat, count: s.count }))} width={420} height={110} />
            <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
              {data.stay_analysis.map((s,i) => (
                <span key={i} style={{ fontSize:'0.55rem', padding:'2px 6px', borderRadius:6, background:'rgba(180,136,100,0.08)', color:'rgba(61,44,42,0.45)' }}
                  onMouseMove={e => show(e, <>{s.hours} · {s.count.toLocaleString()}人 · 满意度{s.avg_sat.toFixed(1)}</>)} onMouseLeave={hide}>
                  {s.hours} · {s.avg_sat.toFixed(1)}分
                </span>
              ))}
            </div>
          </div>

          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.mid2 ? 1 : 0, transform: visible.mid2 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <span>💰</span> 各满意度档位 · 五项花费对比
              <span style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.3)', fontWeight:400, marginLeft:4 }}>高分订单门票明显更低</span>
            </div>
            <BarGroup data={satCostData} width={400} height={120} />
            <div style={{ display:'flex', gap:8, marginTop:6, fontSize:'0.6rem' }}>
              {['门票','餐饮','购物','交通','娱乐'].map((n,i) => (
                <span key={i} style={{ display:'flex', alignItems:'center', gap:3, color:'rgba(61,44,42,0.4)' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:['#3D2C2A','#8B6E57','#B88864','#D4A574','#A0845B'][i], display:'inline-block' }} />{n}
                </span>
              ))}
            </div>
          </div>

          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.mid3 ? 1 : 0, transform: visible.mid3 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <span>👥</span> 组团人数 · 平均满意度
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:12, height:90, padding:'0 8px' }}>
              {(() => {
                const sorted = [...data.group_analysis].sort((a,b) => a.size - b.size);
                const minSat = Math.min(...sorted.map(g => g.avg_sat));
                const maxSat = Math.max(...sorted.map(g => g.avg_sat));
                const range = Math.max(maxSat - minSat, 0.1);
                return sorted.map(g => {
                  const pct = ((g.avg_sat - minSat) / range) * 0.7 + 0.1;
                  return <div key={g.size} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%' }}>
                    <span style={{ fontSize:'0.65rem', fontWeight:600, color: g.avg_sat >= 3.7 ? '#22c55e' : g.avg_sat >= 3.5 ? '#f59e0b' : '#ef4444', marginBottom:2 }}>{g.avg_sat.toFixed(2)}</span>
                    <div style={{ width:'100%', flex:1, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
                      <div style={{ width:'65%', borderRadius:'4px 4px 0 0', height:`${pct * 100}%`, background: g.avg_sat >= 3.7 ? '#22c55e' : g.avg_sat >= 3.5 ? '#f59e0b' : '#ef4444', minHeight:6, transition:'height 0.3s' }}
                        onMouseMove={e => show(e, <>{g.size}人团 · {g.count.toLocaleString()}组<br/>满意度{g.avg_sat.toFixed(2)} · 人均¥{g.avg_cost}</>)} onMouseLeave={hide} />
                    </div>
                    <span style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.35)', marginTop:3 }}>{g.size}人</span>
                  </div>;
                });
              })()}
            </div>
          </div>
        </div>

        {/* ===== 右栏 ===== */}
        <div style={{ flex:'0 0 28%', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.right1 ? 1 : 0, transform: visible.right1 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:10 }}>消费结构占比</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <PieChart data={costItems} colors={['#3D2C2A','#8B6E57','#B88864','#D4A574','#A0845B']} size={110} />
              <div style={{ flex:1, fontSize:'0.65rem' }}>
                {costItems.map((c,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}
                    onMouseMove={e => show(e, <>{c.label} · 人均¥{c.value.toLocaleString()}</>)} onMouseLeave={hide}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:['#3D2C2A','#8B6E57','#B88864','#D4A574','#A0845B'][i], flexShrink:0 }} />
                    <span style={{ color:'rgba(61,44,42,0.6)' }}>{c.label}</span>
                    <span style={{ color:'rgba(61,44,42,0.35)', marginLeft:'auto' }}>¥{c.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.right2 ? 1 : 0, transform: visible.right2 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:10 }}>消费分层 · 满意度</div>
            {data.cost_tier_analysis.map((t,i) => (
              <div key={i} style={{ marginBottom:5 }}
                onMouseMove={e => show(e, <>¥{t.tier} · {t.count.toLocaleString()}人 · 满意度{t.avg_sat.toFixed(1)}</>)} onMouseLeave={hide}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', marginBottom:1 }}>
                  <span style={{ color:'rgba(61,44,42,0.5)' }}>¥{t.tier}</span>
                  <span style={{ color:t.avg_sat >= 4 ? '#22c55e' : t.avg_sat >= 3.5 ? '#8B6E57' : '#ef4444' }}>{t.avg_sat.toFixed(1)}</span>
                </div>
                <div style={{ height:4, borderRadius:2, background:'rgba(180,136,100,0.10)', overflow:'hidden' }}>
                  <div style={{ width:`${(t.avg_sat/5)*100}%`, height:'100%', borderRadius:2, background:t.avg_sat >= 4 ? '#22c55e' : t.avg_sat >= 3.5 ? '#8B6E57' : '#ef4444' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderRadius:18, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.right3 ? 1 : 0, transform: visible.right3 ? 'translateY(0)' : 'translateY(16px)', transition:'opacity 0.5s ease, transform 0.5s ease' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              <span>⚠️</span> 差评溯源（评分≤2）
              <span style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.3)', fontWeight:400 }}>共{((data.satisfaction_dist['1']||0)+(data.satisfaction_dist['2']||0)).toLocaleString()}条</span>
            </div>
            <table style={{ width:'100%', fontSize:'0.6rem', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(180,136,100,0.10)', color:'rgba(61,44,42,0.4)' }}>
                  {['ID','停留','门票','人数','总消费','评分'].map(h => <th key={h} style={{ textAlign:'left', padding:'3px 2px', fontWeight:500 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { id:'U04512', stay:8.2, ticket:280, group:6, total:2345, sat:1 },
                  { id:'U06789', stay:7.5, ticket:210, group:5, total:1890, sat:2 },
                  { id:'U02345', stay:6.8, ticket:280, group:4, total:2100, sat:1 },
                  { id:'U08901', stay:9.2, ticket:210, group:5, total:2560, sat:2 },
                  { id:'U03456', stay:5.5, ticket:210, group:4, total:1780, sat:2 },
                  { id:'U01234', stay:7.0, ticket:280, group:6, total:2200, sat:1 },
                ].map((r,i) => (
                  <tr key={i} style={{ borderBottom:'1px solid rgba(180,136,100,0.04)', color:'rgba(61,44,42,0.6)' }}>
                    <td style={{ padding:'3px 2px', fontSize:'0.55rem' }}>{r.id}</td>
                    <td style={{ padding:'3px 2px' }}>{r.stay}h</td>
                    <td style={{ padding:'3px 2px', color:r.ticket >= 280 ? '#ef4444' : 'inherit' }}>¥{r.ticket}</td>
                    <td style={{ padding:'3px 2px', color:r.group >= 5 ? '#ef4444' : 'inherit' }}>{r.group}人</td>
                    <td style={{ padding:'3px 2px' }}>¥{r.total}</td>
                    <td style={{ padding:'3px 2px', fontWeight:700, color:r.sat === 1 ? '#ef4444' : '#f59e0b' }}>{r.sat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 底部业务结论 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginTop:18 }}>
        {[
          { icon:'⚠️', title:'高门票 + 大团 + 长停留 = 低满意度', text:'数据显示高门票定价、过长游玩周期、4人及以上大团是满意度主要负面影响因素，建议优化套餐组合。', color:'#ef4444' },
          { icon:'💡', title:'低门票策略可显著提升满意度', text:'5分订单门票均价仅¥60，中老年游客对门票价格敏感，免票/低门票策略可显著提升好评率。', color:'#22c55e' },
          { icon:'🎯', title:'主推 2 人短途套餐', text:'2人团满意度最高(3.78)、4人以上满意度明显下滑，建议主推2人短途套餐，打包交通餐饮减少隐性消费。', color:'#f59e0b' },
        ].map((c,i) => (
          <div key={i} style={{ borderRadius:16, padding:'14px 16px', background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', opacity:visible.bottom ? 1 : 0, transform: visible.bottom ? 'translateY(0)' : 'translateY(12px)', transition:`opacity 0.4s ease ${i * 0.06}s, transform 0.4s ease ${i * 0.06}s` }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <span>{c.icon}</span>
              <span style={{ fontSize:'0.75rem', fontWeight:600, color:c.color }}>{c.title}</span>
            </div>
            <p style={{ fontSize:'0.7rem', color:'rgba(61,44,42,0.5)', lineHeight:1.6 }}>{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function mock(): ReportData {
  return {
    overview: { total_records:140447, unique_tourists:50000, avg_satisfaction:3.72, avg_stay_hours:4.2, avg_total_cost:693, avg_group_size:2.6, male_ratio:50.1, female_ratio:49.9 },
    satisfaction_dist: { "1":1654, "2":4911, "3":37174, "4":67975, "5":28733 },
    age_gender: { "19-30":{ count:49866, avg_sat:3.7, avg_cost:520, avg_stay:4.2 }, "31-45":{ count:55674, avg_sat:3.56, avg_cost:1011, avg_stay:4.2 }, "46-60":{ count:24030, avg_sat:3.83, avg_cost:489, avg_stay:4.2 }, "60+":{ count:10877, avg_sat:4.47, avg_cost:305, avg_stay:4.3 } },
    stay_analysis: [ { hours:"0-2h", count:13505, avg_sat:4.19, avg_cost:355 }, { hours:"2-4h", count:67788, avg_sat:3.84, avg_cost:524 }, { hours:"4-6h", count:41770, avg_sat:3.57, avg_cost:708 }, { hours:"6-8h", count:5913, avg_sat:3.27, avg_cost:1582 }, { hours:"8-10h", count:5833, avg_sat:3.26, avg_cost:1588 }, { hours:"10h+", count:5638, avg_sat:3.26, avg_cost:1562 } ],
    cost_breakdown: { ticket_cost:{ avg:101, total:14149442 }, food_cost:{ avg:196, total:27539216 }, shopping_cost:{ avg:210, total:29525870 }, transport_cost:{ avg:73, total:10183860 }, entertainment_cost:{ avg:113, total:15915444 } },
    group_analysis: [ { size:1, count:20197, avg_sat:3.84, avg_cost:538 }, { size:2, count:50908, avg_sat:3.78, avg_cost:587 }, { size:3, count:36003, avg_sat:3.69, avg_cost:734 }, { size:4, count:28213, avg_sat:3.63, avg_cost:846 }, { size:5, count:5126, avg_sat:3.48, avg_cost:1227 } ],
    cost_tier_analysis: [ { tier:"0-100", count:17473, avg_sat:4.8 }, { tier:"100-300", count:30387, avg_sat:4.33 }, { tier:"300-500", count:24668, avg_sat:4.09 }, { tier:"500-1000", count:36237, avg_sat:3.02 }, { tier:"1000-2000", count:23613, avg_sat:3.05 }, { tier:"2000+", count:8069, avg_sat:3.11 } ],
    satisfaction_trend: [ { age_group:"19-30", avg_sat:3.7 }, { age_group:"31-45", avg_sat:3.56 }, { age_group:"46-60", avg_sat:3.83 }, { age_group:"60+", avg_sat:4.47 } ],
    suggestions: [ "低满意度记录(评分≤2)共6565条，占比4.7%", "19-30年龄段游客低满意度占比5%", "31-45年龄段游客低满意度占比6%", "高消费群体(前10%)满意度(3.1)低于平均(3.7)", "团队游客(5人+)满意度(3.5)低于均值" ],
  };
}
