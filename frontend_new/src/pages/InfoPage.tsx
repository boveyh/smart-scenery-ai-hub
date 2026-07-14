import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import { AMAP_WEATHER_KEY, AMAP_WEATHER_URL, LINGSHAN_CITY } from '@/api/config';
import type { RealtimeInfo, PoiItem } from '@/api/types';

interface AmapWeather {
  status: string; lives: { weather: string; temperature: string; winddirection: string; windpower: string; humidity: string; reporttime: string }[];
}

function wIcon(w: string) {
  const map: Record<string, string> = { '晴':'☀️','多云':'⛅','阴':'☁️','小雨':'🌦️','中雨':'🌧️','大雨':'🌧️','雷阵雨':'⛈️','雪':'❄️' };
  for (const [k, v] of Object.entries(map)) if (w.includes(k)) return v;
  return '🌤️';
}

function badge(l: number) {
  if (l <= 2) return { bg:'#dcfce7', text:'#166534', label:'畅通' };
  if (l <= 3) return { bg:'#fef3c7', text:'#92400e', label:'适中' };
  return { bg:'#fee2e2', text:'#991b1b', label:'拥挤' };
}

const ALL_POIS = [
  { poiId:'LS-001', name:'灵山大照壁', crowdedness:2 },
  { poiId:'LS-002', name:'五明桥', crowdedness:2 },
  { poiId:'LS-003', name:'佛足坛', crowdedness:2 },
  { poiId:'LS-004', name:'五智门', crowdedness:2 },
  { poiId:'LS-005', name:'菩提大道', crowdedness:2 },
  { poiId:'LS-006', name:'九龙灌浴', crowdedness:4 },
  { poiId:'LS-007', name:'降魔浮雕', crowdedness:2 },
  { poiId:'LS-008', name:'阿育王柱', crowdedness:2 },
  { poiId:'LS-009', name:'百子戏弥勒', crowdedness:3 },
  { poiId:'LS-010', name:'祥符禅寺', crowdedness:3 },
  { poiId:'LS-011', name:'灵山大佛', crowdedness:4 },
  { poiId:'LS-012', name:'佛教文化博览馆', crowdedness:2 },
  { poiId:'LS-013', name:'灵山梵宫', crowdedness:4 },
  { poiId:'LS-014', name:'五印坛城', crowdedness:3 },
  { poiId:'LS-015', name:'曼飞龙塔', crowdedness:2 },
  { poiId:'LS-016', name:'无尽意斋', crowdedness:1 },
];

export default function InfoPage() {
  const [info, setInfo] = useState<RealtimeInfo | null>(null);
  const [weather, setWeather] = useState<{ temp: string; w: string; humidity: string; wind: string; time: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [infoRes, amapRes] = await Promise.all([
        apiClient.getRealtimeInfo().catch(() => null),
        fetch(`${AMAP_WEATHER_URL}?key=${AMAP_WEATHER_KEY}&city=${encodeURIComponent(LINGSHAN_CITY)}&extensions=base`)
          .then(r => r.json() as Promise<AmapWeather>).catch(() => null),
      ]);
      if (infoRes && infoRes.code === 200) setInfo(infoRes.data ?? null);
      if (amapRes?.status === '1' && amapRes.lives?.length > 0) {
        const l = amapRes.lives[0];
        setWeather({ temp: l.temperature, w: l.weather, humidity: l.humidity, wind: l.winddirection + l.windpower + '级', time: l.reporttime });
      }
      setLastUpdate(new Date());
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 120000); return () => clearInterval(i); }, []);

  const displayTemp = weather?.temp || info?.temperature?.toString();
  const displayWeather = weather?.w || info?.weather || '';
  const displayCrowd = info?.crowdednessLevel ?? 2;

  if (loading && !info && !weather) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, paddingBottom:14, borderBottom:'2px solid rgba(180,136,100,0.15)' }}>
        <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif", display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>📊</span> 实时资讯 · 灵山胜境
        </h2>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:'0.7rem', color:'rgba(61,44,42,0.4)' }}>更新 {lastUpdate.toLocaleTimeString()}</span>
          <button className="btn btn-sm btn-primary" onClick={fetchData} disabled={loading}
            style={{ fontSize:'0.7rem', padding:'4px 12px' }}>
            {loading ? <><span className="spinner" style={{ width:12, height:12 }} /> 刷新</> : '🔄 刷新'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {/* 天气 + 拥挤度概览 */}
      <div style={{
        borderRadius:24, padding:0, marginBottom:20, overflow:'hidden',
        background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)',
      }}>
        <div style={{ display:'flex' }}>
          <div style={{
            width:180, flexShrink:0,
            background:'linear-gradient(135deg,#3D2C2A,#4E3A37)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            padding:'24px 0', color:'#F7F2E6',
          }}>
            <span style={{ fontSize:48 }}>{wIcon(displayWeather)}</span>
            <div style={{ fontSize:'1.8rem', fontWeight:700, marginTop:4 }}>{displayTemp}°C</div>
            <div style={{ fontSize:'0.75rem', color:'rgba(215,200,180,0.7)', marginTop:2 }}>{displayWeather}</div>
          </div>
          <div style={{ flex:1, padding:'18px 20px' }}>
            {weather && (
              <div style={{ display:'flex', gap:14, marginBottom:14, flexWrap:'wrap' }}>
                <div style={{ padding:'8px 14px', borderRadius:12, background:'rgba(180,136,100,0.06)', textAlign:'center', minWidth:80 }}>
                  <div style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.4)' }}>湿度</div>
                  <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#3D2C2A', marginTop:2 }}>{weather.humidity}%</div>
                </div>
                <div style={{ padding:'8px 14px', borderRadius:12, background:'rgba(180,136,100,0.06)', textAlign:'center', minWidth:80 }}>
                  <div style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.4)' }}>风力</div>
                  <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#3D2C2A', marginTop:2 }}>{weather.wind}</div>
                </div>
                <div style={{ padding:'8px 14px', borderRadius:12, background:'rgba(180,136,100,0.06)', textAlign:'center', minWidth:80 }}>
                  <div style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.4)' }}>更新</div>
                  <div style={{ fontSize:'0.7rem', fontWeight:500, color:'#3D2C2A', marginTop:2 }}>{weather.time.slice(11, 16)}</div>
                </div>
                <div style={{ flex:1, padding:'8px 14px', borderRadius:12, background:'rgba(180,136,100,0.06)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.4)' }}>数据来源</span>
                  <span style={{ fontSize:'0.65rem', color:'#8B6E57' }}>高德气象</span>
                  <span style={{ fontSize:'0.6rem', color:'rgba(61,44,42,0.25)' }}>· 无锡</span>
                </div>
              </div>
            )}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', marginBottom:4 }}>
                <span style={{ fontWeight:600, color:'#3D2C2A' }}>景区拥挤度</span>
                <span style={{ color:'rgba(61,44,42,0.4)' }}>{badge(displayCrowd).label} · {displayCrowd}/5</span>
              </div>
              <div style={{ height:8, borderRadius:4, background:'rgba(180,136,100,0.10)', overflow:'hidden' }}>
                <div style={{
                  width:`${(displayCrowd / 5) * 100}%`, height:'100%', borderRadius:4,
                  background: displayCrowd <= 2 ? '#22c55e' : displayCrowd <= 3 ? '#f59e0b' : '#ef4444',
                  transition:'width 0.5s',
                }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', color:'rgba(61,44,42,0.3)', marginTop:3 }}>
                <span>畅通</span><span>适中</span><span>拥挤</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 景区公告 + 景点拥挤度 左右布局 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:16, marginBottom:20 }}>
        <div style={{ borderRadius:20, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <span>📢</span> 景区公告
          </div>
          {(info?.announcements ?? []).length === 0 ? (
            <div style={{ fontSize:'0.7rem', color:'rgba(61,44,42,0.35)', textAlign:'center', padding:20 }}>暂无公告</div>
          ) : (info?.announcements ?? []).map((ann,i) => (
            <div key={i} style={{
              padding:'8px 12px', marginBottom:6, borderRadius:12, lineHeight:1.5,
              background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.12)',
              fontSize:'0.7rem', color:'rgba(61,44,42,0.6)',
            }}>
              <span style={{ fontWeight:600, color:'#92400e', marginRight:6 }}>#{i+1}</span>
              {ann}
            </div>
          ))}
        </div>

        <div style={{ borderRadius:20, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <span>📍</span> 景点拥挤度
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {ALL_POIS.sort((a,b) => b.crowdedness - a.crowdedness).map(poi => {
              const b = badge(poi.crowdedness);
              const isPeak = poi.crowdedness >= 4;
              return (
                <div key={poi.poiId} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                  padding:'6px 10px', borderRadius:10,
                  background: isPeak ? 'rgba(239,68,68,0.06)' : 'rgba(180,136,100,0.04)',
                  border: isPeak ? '1px solid rgba(239,68,68,0.12)' : '1px solid transparent',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.72rem', fontWeight:500, color:'#3D2C2A' }}>
                    {poi.name}
                    {isPeak && <span style={{ fontSize:'0.55rem', padding:'1px 6px', borderRadius:6, background:'rgba(239,68,68,0.1)', color:'#ef4444' }}>高峰</span>}
                  </div>
                  <span style={{
                    fontSize:'0.6rem', padding:'2px 8px', borderRadius:9999,
                    background:b.bg, color:b.text, fontWeight:500, flexShrink:0,
                  }}>
                    {b.label} {poi.crowdedness}/5
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 拥挤度动态标签 */}
      <div style={{ borderRadius:20, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
        <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
          <span>⏰</span> 错峰建议
        </div>
        <div style={{
          padding:'10px 14px', borderRadius:12, fontSize:'0.72rem', lineHeight:1.6, color:'rgba(61,44,42,0.55)',
          background: displayCrowd >= 3 ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
        }}>
          {displayCrowd >= 3
            ? '当前景区拥挤度较高，建议错峰游览。灵山大佛、灵山梵宫、九龙灌浴为热门点位，建议优先前往其他景点，待人流高峰过后再游览核心区域。'
            : '当前景区客流适中，是游览的好时机。建议按推荐路线依次游览，九龙灌浴表演建议提前10分钟到场占位。'}
        </div>
      </div>
    </div>
  );
}
