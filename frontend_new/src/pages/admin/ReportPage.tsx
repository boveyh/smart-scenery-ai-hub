import React, { useEffect, useState, useRef, useCallback } from 'react';

// ─── 可交互 SVG 工具 ───────────────────────────────────
function Tooltip({ x, y, visible, children }: { x: number; y: number; visible: boolean; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', left: x + 12, top: y - 10, zIndex: 999,
      background: 'rgba(61,44,42,0.92)', backdropFilter: 'blur(6px)',
      color: '#F7F2E6', borderRadius: 10, padding: '6px 12px',
      fontSize: '0.7rem', lineHeight: 1.5, whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)', pointerEvents: 'none',
      transform: 'translateY(-50%)',
    }}>
      {children}
    </div>
  );
}

function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const show = useCallback((e: React.MouseEvent, content: React.ReactNode) => {
    setTip({ x: e.clientX, y: e.clientY, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return { tip, show, hide };
}

// ─── 可交互饼图 ───
function InteractivePie({ data, colors, size = 160, showTip, hideTip }: {
  data: { label: string; value: number }[]; colors: string[]; size?: number;
  showTip: (e: React.MouseEvent, c: React.ReactNode) => void; hideTip: () => void;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  let cur = 0;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const a1 = cur * 360, a2 = (cur + pct) * 360;
    cur += pct;
    const rad = (a: number) => [cx + r * Math.cos((a - 90) * Math.PI / 180), cy + r * Math.sin((a - 90) * Math.PI / 180)];
    const [x1, y1] = rad(a1), [x2, y2] = rad(a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    const dAttr = pct < 0.001 ? '' : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
    return { d: dAttr, fill: colors[i % colors.length], label: d.label, value: d.value, pct };
  });
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    {slices.map((s, i) =>
      <path key={i} d={s.d} fill={s.fill}
        onMouseMove={e => showTip(e, <><strong>{s.label}</strong><br/>{s.value.toLocaleString()}条 ({(s.pct*100).toFixed(1)}%)</>)}
        onMouseLeave={hideTip}
        style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
        onMouseEnter={e => (e.target as SVGPathElement).style.opacity = '0.8'}
        onMouseLeaveCapture={e => { (e.target as SVGPathElement).style.opacity = '1'; hideTip(); }}
      />
    )}
    <text x={cx} y={cy + 4} textAnchor="middle" fill="#3D2C2A" fontSize={size * 0.09} fontWeight={700}>{total.toLocaleString()}</text>
  </svg>;
}

// ─── 可交互柱状图 ───
function InteractiveBar({ data, width = 280, height = 120, showTip, hideTip }: {
  data: { label: string; value: number; color?: string }[]; width?: number; height?: number;
  showTip: (e: React.MouseEvent, c: React.ReactNode) => void; hideTip: () => void;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const ph = { t: 8, r: 8, b: 20, l: 4 };
  const iw = width - ph.l - ph.r, ih = height - ph.t - ph.b;
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    {data.map((d, i) => {
      const bw = iw / data.length * 0.7, gap = iw / data.length;
      const x = ph.l + i * gap + (gap - bw) / 2;
      const bh = (d.value / max) * ih;
      return <g key={i}>
        <rect x={x} y={ph.t + ih - bh} width={bw} height={bh} rx={3} fill={d.color || '#8B6E57'}
          onMouseMove={e => showTip(e, <><strong>{d.label}</strong><br/>{d.value.toLocaleString()}</>)}
          onMouseLeave={hideTip}
          style={{ cursor: 'pointer' }}
        />
        <text x={x + bw / 2} y={ph.t + ih + 12} textAnchor="middle" fill="rgba(61,44,42,0.4)" fontSize={9}>{d.label}</text>
      </g>;
    })}
  </svg>;
}

// ─── 可交互折线图 ───
function InteractiveLine({ data, width = 280, height = 100, showTip, hideTip }: {
  data: { label: string; value: number }[]; width?: number; height?: number;
  showTip: (e: React.MouseEvent, c: React.ReactNode) => void; hideTip: () => void;
}) {
  const min = Math.min(...data.map(d => d.value), 0);
  const max = Math.max(...data.map(d => d.value), 1);
  const range = max - min || 1;
  const ph = { t: 4, r: 8, b: 16, l: 4 };
  const iw = width - ph.l - ph.r, ih = height - ph.t - ph.b;
  const pts = data.map((d, i) => {
    const x = ph.l + i * iw / (data.length - 1);
    const y = ph.t + ih - ((d.value - min) / range) * ih;
    return [x, y];
  });
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <path d={pathD} fill="none" stroke="#B88864" strokeWidth={2} strokeLinejoin="round" />
    {pts.map((p, i) =>
      <g key={i}>
        <circle cx={p[0]} cy={p[1]} r={4} fill="#fff" stroke="#B88864" strokeWidth={1.5}
          onMouseMove={e => showTip(e, <><strong>{data[i].label}</strong><br/>满意度 {data[i].value.toFixed(2)}</>)}
          onMouseLeave={hideTip}
          style={{ cursor: 'pointer' }}
        />
        <text x={p[0]} y={p[1] - 8} textAnchor="middle" fill="rgba(61,44,42,0.5)" fontSize={9}>{data[i].value.toFixed(1)}</text>
      </g>
    )}
    {data.map((d, i) => {
      const x = ph.l + i * iw / (data.length - 1);
      return <text key={`l${i}`} x={x} y={height - 2} textAnchor="middle" fill="rgba(61,44,42,0.35)" fontSize={8}>{d.label}</text>;
    })}
  </svg>;
}

// ─── 可交互横向条形图 ───
function InteractiveHBar({ data, width = 260, showTip, hideTip }: {
  data: { label: string; value: number; sub?: string; color?: string }[]; width?: number;
  showTip: (e: React.MouseEvent, c: React.ReactNode) => void; hideTip: () => void;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {data.map((d, i) => (
      <div key={i}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 2 }}>
          <span style={{ color: 'rgba(61,44,42,0.6)' }}>{d.label}</span>
          <span style={{ color: 'rgba(61,44,42,0.4)' }}>{d.sub || d.value.toLocaleString()}</span>
        </div>
        <div style={{ position: 'relative' }}
          onMouseMove={e => showTip(e, <><strong>{d.label}</strong><br/>{d.value.toLocaleString()}{d.sub ? ` · ${d.sub}` : ''}</>)}
          onMouseLeave={hideTip}>
          <svg width={width} height={10} viewBox={`0 0 ${width} 10`}>
            <rect x={0} y={2} width={width} height={6} rx={3} fill="rgba(180,136,100,0.10)" />
            <rect x={0} y={2} width={(d.value / max) * width} height={6} rx={3} fill={d.color || '#8B6E57'} />
          </svg>
        </div>
      </div>
    ))}
  </div>;
}

export default function AdminReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { tip, show, hide } = useTooltip();

  useEffect(() => {
    fetch('/data/report_analysis.json')
      .then(r => r.ok ? r.json() : null)
      .then(j => { setData(j || mock()); })
      .catch(() => setData(mock()))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner spinner-lg" /></div>;
  if (!data) return <div className="empty-state"><span className="empty-state__text">暂无数据</span></div>;

  const ov = data.overview;
  const costItems = Object.entries(data.cost_breakdown).map(([k, v]: any) => ({
    label: ({ ticket_cost:'门票', food_cost:'餐饮', shopping_cost:'购物', transport_cost:'交通', entertainment_cost:'娱乐' } as any)[k] || k,
    value: v.avg,
  }));
  const satDist = Object.entries(data.satisfaction_dist).filter(([k]) => k !== '0').sort(([a]: any, [b]: any) => Number(a) - Number(b)).map(([k, v]) => ({ label: `${k}分`, value: v as number }));
  const ageSat = data.satisfaction_trend || [];
  const staySat = data.stay_analysis || [];
  const SAT_COLORS = ['#ef4444','#f59e0b','rgba(61,44,42,0.5)','#22c55e','#16a34a'];

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>
      <Tooltip x={tip?.x ?? 0} y={tip?.y ?? 0} visible={!!tip}>{tip?.content}</Tooltip>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize:'1.3rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif", letterSpacing:1, marginBottom:4 }}>游客感受度报告</h1>
        <p style={{ fontSize:'0.8rem', color:'rgba(61,44,42,0.5)' }}>
          基于 <strong style={{ color:'#8B6E57' }}>{ov.total_records.toLocaleString()}</strong> 条行为记录 · <strong style={{ color:'#8B6E57' }}>{ov.unique_tourists.toLocaleString()}</strong> 位游客
          · 数据文件: 景点景区旅游数据行为分析数据.csv
        </p>
      </div>

      {/* 4 key cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'综合满意度', value:ov.avg_satisfaction.toFixed(2), sub:`/ 5.0 · 共${ov.unique_tourists.toLocaleString()}位游客`, color:'#3D2C2A' },
          { label:'平均停留', value:`${ov.avg_stay_hours}h`, sub:`平均同行 ${ov.avg_group_size}人`, color:'#8B6E57' },
          { label:'平均消费', value:`¥${ov.avg_total_cost.toLocaleString()}`, sub:`男${ov.male_ratio}% / 女${ov.female_ratio}%`, color:'#B88864' },
          { label:'数据总量', value:ov.total_records.toLocaleString(), sub:`男女比 ${ov.male_ratio}:${ov.female_ratio}`, color:'#8B6E57' },
        ].map((c,i) => (
          <div key={i} style={{ borderRadius:18, padding:'16px 18px', background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', color:'rgba(61,44,42,0.5)', marginBottom:6 }}>{c.label}</div>
            <div style={{ fontSize:'1.6rem', fontWeight:700, color:c.color, lineHeight:1.1 }}>{c.value}</div>
            <div style={{ fontSize:'0.65rem', color:'rgba(61,44,42,0.4)', marginTop:4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Satisfaction pie + Age sat line */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ borderRadius:18, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12 }}>满意度分布（悬停查看数据）</div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <InteractivePie data={satDist} colors={SAT_COLORS} size={140} showTip={show} hideTip={hide} />
            <div style={{ flex:1 }}>
              {satDist.map((d,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, fontSize:'0.7rem' }}
                  onMouseMove={e => show(e, <><strong>{d.label}</strong><br/>{d.value.toLocaleString()}条</>)}
                  onMouseLeave={hide}>
                  <span style={{ width:10, height:10, borderRadius:3, background:SAT_COLORS[i], display:'inline-block' }} />
                  <span style={{ color:'rgba(61,44,42,0.6)' }}>{d.label}</span>
                  <span style={{ color:'rgba(61,44,42,0.4)' }}>{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderRadius:18, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12 }}>各年龄段满意度趋势（悬停查看详情）</div>
          <InteractiveLine data={ageSat.map((a:any) => ({ label: a.age_group, value: a.avg_sat }))} width={300} height={110} showTip={show} hideTip={hide} />
        </div>
      </div>

      {/* Row 2: Age breakdown + Stay analysis */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ borderRadius:18, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12 }}>年龄分布（悬停查看数据）</div>
          <InteractiveHBar data={Object.entries(data.age_gender).map(([k,v]:any) => ({
            label: `${k}岁`, value: v.count,
            sub: `¥${v.avg_cost} · 满意度${v.avg_sat.toFixed(1)}`,
            color: v.avg_sat >= 4 ? '#22c55e' : v.avg_sat >= 3.5 ? '#8B6E57' : '#f59e0b',
          }))} width={280} showTip={show} hideTip={hide} />
        </div>
        <div style={{ borderRadius:18, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12 }}>停留时长分布（悬停查看数据）</div>
          <InteractiveBar data={staySat.map((s:any) => ({ label: s.hours, value: s.count, color: s.avg_sat >= 4 ? '#22c55e' : s.avg_sat >= 3.5 ? '#8B6E57' : '#ef4444' }))} width={300} height={120} showTip={show} hideTip={hide} />
          <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:6 }}>
            {staySat.map((s:any,i:number) => (
              <span key={i} style={{ fontSize:'0.6rem', padding:'2px 6px', borderRadius:6, background:'rgba(180,136,100,0.08)', color:'rgba(61,44,42,0.5)' }}
                onMouseMove={e => show(e, <>{s.hours}<br/>{s.count.toLocaleString()}人 · 满意度{s.avg_sat.toFixed(1)}<br/>平均消费¥{s.avg_cost}</>)}
                onMouseLeave={hide}>
                {s.hours} · {s.avg_sat.toFixed(1)}分
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Cost breakdown + Group */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div style={{ borderRadius:18, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12 }}>人均消费结构（悬停查看数据）</div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <InteractivePie data={costItems} colors={['#3D2C2A','#8B6E57','#B88864','#D4A574','#A0845B']} size={130} showTip={show} hideTip={hide} />
            <div>
              {costItems.map((c,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, fontSize:'0.7rem' }}
                  onMouseMove={e => show(e, <><strong>{c.label}</strong><br/>人均 ¥{c.value.toLocaleString()}</>)}
                  onMouseLeave={hide}>
                  <span style={{ width:10, height:10, borderRadius:3, background:['#3D2C2A','#8B6E57','#B88864','#D4A574','#A0845B'][i], display:'inline-block' }} />
                  <span style={{ color:'rgba(61,44,42,0.6)' }}>{c.label}</span>
                  <span style={{ color:'rgba(61,44,42,0.4)' }}>¥{c.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderRadius:18, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12 }}>同行人数分析（悬停查看数据）</div>
          <InteractiveBar data={data.group_analysis.map((g:any) => ({ label: `${g.size}人`, value: g.count, color: g.avg_sat >= 3.7 ? '#22c55e' : g.avg_sat >= 3.5 ? '#f59e0b' : '#ef4444' }))} width={300} height={120} showTip={show} hideTip={hide} />
          <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:4 }}>
            {data.group_analysis.map((g:any,i:number) => (
              <span key={i} style={{ fontSize:'0.6rem', padding:'2px 6px', borderRadius:6, background:'rgba(180,136,100,0.08)', color:'rgba(61,44,42,0.5)' }}
                onMouseMove={e => show(e, <>{g.size}人同行<br/>{g.count.toLocaleString()}组 · 满意度{g.avg_sat.toFixed(1)}<br/>平均消费¥{g.avg_cost.toLocaleString()}</>)}
                onMouseLeave={hide}>
                {g.size}人 · {g.avg_sat.toFixed(1)}分
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Cost tier */}
      <div style={{ borderRadius:18, padding:20, marginBottom:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
        <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12 }}>消费分层 · 满意度（悬停查看数据）</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:24 }}>
          <InteractiveBar data={data.cost_tier_analysis.map((t:any) => ({ label: `¥${t.tier}`, value: t.count, color: t.avg_sat >= 4 ? '#22c55e' : t.avg_sat >= 3.5 ? '#8B6E57' : '#ef4444' }))} width={360} height={120} showTip={show} hideTip={hide} />
          <div style={{ flex:1 }}>
            {data.cost_tier_analysis.map((t:any,i:number) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', padding:'4px 0', borderBottom:'1px solid rgba(180,136,100,0.06)' }}
                onMouseMove={e => show(e, <><strong>¥{t.tier}</strong><br/>{t.count.toLocaleString()}人 · 满意度 {t.avg_sat.toFixed(1)}</>)}
                onMouseLeave={hide}>
                <span style={{ color:'rgba(61,44,42,0.6)' }}>¥{t.tier}</span>
                <span style={{ color:'rgba(61,44,42,0.4)' }}>{t.count.toLocaleString()}人 · 满意度 {t.avg_sat.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div style={{ borderRadius:18, padding:20, marginBottom:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
        <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>💡 服务建议</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {data.suggestions.map((s:string,i:number) => (
            <div key={i} style={{ padding:'10px 14px', borderRadius:12, background:'rgba(180,136,100,0.06)', fontSize:'0.75rem', lineHeight:1.5, color:'rgba(61,44,42,0.6)', display:'flex', gap:6 }}>
              <span style={{ color:'#8B6E57', fontWeight:600, flexShrink:0 }}>{i+1}.</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Five cost detail cards */}
      <div style={{ borderRadius:18, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
        <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12 }}>消费明细</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
          {costItems.map((c,i) => {
            const total = Object.values(data.cost_breakdown).reduce((s:any, x:any) => s + x.total, 0);
            const pct = total > 0 ? ((Object.values(data.cost_breakdown) as any[])[i].total / total * 100).toFixed(1) : '0';
            const colors = ['#3D2C2A','#8B6E57','#B88864','#D4A574','#A0845B'];
            return (
              <div key={i} style={{ textAlign:'center', padding:12, borderRadius:12, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.4)', marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:'1.1rem', fontWeight:700, color:colors[i] }}>¥{c.value.toLocaleString()}</div>
                <div style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.35)', marginTop:2 }}>占消费 {pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function mock() {
  return {
    overview: { total_records:140447, unique_tourists:50000, avg_satisfaction:3.72, avg_stay_hours:4.2, avg_total_cost:693, avg_group_size:2.6, male_ratio:50.1, female_ratio:49.9 },
    satisfaction_dist: { "2":6565, "3":56819, "4":45908, "5":31155, "1":0 },
    age_gender: {
      "19-30":{ count:49866, avg_sat:3.7, avg_cost:520, avg_stay:4.2, male_pct:48.8, female_pct:51.2 },
      "31-45":{ count:55674, avg_sat:3.56, avg_cost:1011, avg_stay:4.2, male_pct:51, female_pct:49 },
      "46-60":{ count:24030, avg_sat:3.83, avg_cost:489, avg_stay:4.2, male_pct:50.9, female_pct:49.1 },
      "60+":{ count:10877, avg_sat:4.47, avg_cost:305, avg_stay:4.3, male_pct:48.9, female_pct:51.1 },
    },
    stay_analysis: [
      { hours:"0-2h", count:13505, avg_sat:4.19, avg_cost:355 },
      { hours:"2-4h", count:67788, avg_sat:3.84, avg_cost:524 },
      { hours:"4-6h", count:41770, avg_sat:3.57, avg_cost:708 },
      { hours:"6-8h", count:5913, avg_sat:3.27, avg_cost:1582 },
      { hours:"8-10h", count:5833, avg_sat:3.26, avg_cost:1588 },
      { hours:"10h+", count:5638, avg_sat:3.26, avg_cost:1562 },
    ],
    cost_breakdown: { ticket_cost:{ avg:101, total:14149442 }, food_cost:{ avg:196, total:27539216 }, shopping_cost:{ avg:210, total:29525870 }, transport_cost:{ avg:73, total:10183860 }, entertainment_cost:{ avg:113, total:15915444 } },
    group_analysis: [
      { size:1, count:20197, avg_sat:3.84, avg_cost:538 },
      { size:2, count:50908, avg_sat:3.78, avg_cost:587 },
      { size:3, count:36003, avg_sat:3.69, avg_cost:734 },
      { size:4, count:28213, avg_sat:3.63, avg_cost:846 },
      { size:5, count:5126, avg_sat:3.48, avg_cost:1227 },
    ],
    cost_tier_analysis: [
      { tier:"0-100", count:17473, avg_sat:4.8 },
      { tier:"100-300", count:30387, avg_sat:4.33 },
      { tier:"300-500", count:24668, avg_sat:4.09 },
      { tier:"500-1000", count:36237, avg_sat:3.02 },
      { tier:"1000-2000", count:23613, avg_sat:3.05 },
      { tier:"2000+", count:8069, avg_sat:3.11 },
    ],
    satisfaction_trend: [
      { age_group:"19-30", avg_sat:3.7 },
      { age_group:"31-45", avg_sat:3.56 },
      { age_group:"46-60", avg_sat:3.83 },
      { age_group:"60+", avg_sat:4.47 },
    ],
    suggestions: [
      "低满意度记录(评分≤2)共6565条，占比4.7%，需重点关注",
      "19-30年龄段游客低满意度占比5%，建议优化该群体服务体验",
      "31-45年龄段游客低满意度占比6%，建议优化该群体服务体验",
      "高消费群体(前10%)满意度(3.1)低于平均(3.7)，建议提升高端服务品质",
      "团队游客(5人+)满意度(3.5)低于均值，建议优化团队接待流程和讲解服务",
    ],
    topic_hotwords: [],
  };
}
