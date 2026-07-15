import React, { useEffect, useState } from 'react';
import { AMAP_WEATHER_KEY, AMAP_WEATHER_URL, LINGSHAN_CITY } from '@/api/config';

const MOCK_ANNOUNCEMENTS = [
  '今日九龙灌浴表演正常，场次10:00/11:30/13:30/15:00',
  '灵山梵宫《吉祥颂》演出今日暂停，明日恢复正常',
  '景区观光车运营时间延长至18:00',
  '祥符禅寺千年古银杏进入最佳观赏期',
  '景区停车场已饱和，建议乘坐公交前往',
];

const ALL_POIS_CROWD = [
  { name:'灵山大佛', crowdedness:4 }, { name:'灵山梵宫', crowdedness:4 }, { name:'九龙灌浴', crowdedness:3 },
  { name:'祥符禅寺', crowdedness:3 }, { name:'百子戏弥勒', crowdedness:3 }, { name:'五印坛城', crowdedness:3 },
  { name:'灵山大照壁', crowdedness:2 }, { name:'五明桥', crowdedness:2 }, { name:'佛足坛', crowdedness:2 },
  { name:'五智门', crowdedness:2 }, { name:'菩提大道', crowdedness:2 }, { name:'降魔浮雕', crowdedness:2 },
  { name:'阿育王柱', crowdedness:2 }, { name:'佛教文化博览馆', crowdedness:2 }, { name:'曼飞龙塔', crowdedness:2 },
  { name:'无尽意斋', crowdedness:1 },
];

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

export default function InfoPage() {
  const [weather, setWeather] = useState<{ temp: string; w: string; humidity: string; wind: string; time: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${AMAP_WEATHER_URL}?key=${AMAP_WEATHER_KEY}&city=${encodeURIComponent(LINGSHAN_CITY)}&extensions=base`)
      .then(r => r.json() as Promise<any>)
      .then(d => {
        if (d?.status === '1' && d.lives?.length > 0) {
          const l = d.lives[0];
          setWeather({ temp: l.temperature, w: l.weather, humidity: l.humidity, wind: l.winddirection + l.windpower + '级', time: l.reporttime });
        }
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const displayWeather = weather?.w || '晴';
  const overallCrowd = 3;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, paddingBottom:14, borderBottom:'2px solid rgba(180,136,100,0.15)' }}>
        <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif", display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>📊</span> 实时资讯 · 灵山胜境
        </h2>
      </div>

      <div style={{ borderRadius:24, padding:0, marginBottom:20, overflow:'hidden', background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
        <div style={{ display:'flex' }}>
          <div style={{ width:180, flexShrink:0, background:'linear-gradient(135deg,#3D2C2A,#4E3A37)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 0', color:'#F7F2E6' }}>
            <span style={{ fontSize:48 }}>{wIcon(displayWeather)}</span>
            <div style={{ fontSize:'1.8rem', fontWeight:700, marginTop:4 }}>{weather?.temp || '28'}°C</div>
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
              </div>
            )}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', marginBottom:4 }}>
                <span style={{ fontWeight:600, color:'#3D2C2A' }}>景区拥挤度</span>
                <span style={{ color:'rgba(61,44,42,0.4)' }}>适中 · {overallCrowd}/5</span>
              </div>
              <div style={{ height:8, borderRadius:4, background:'rgba(180,136,100,0.10)', overflow:'hidden' }}>
                <div style={{ width:`${(overallCrowd/5)*100}%`, height:'100%', borderRadius:4, background: overallCrowd <= 2 ? '#22c55e' : overallCrowd <= 3 ? '#f59e0b' : '#ef4444' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', color:'rgba(61,44,42,0.3)', marginTop:3 }}>
                <span>畅通</span><span>适中</span><span>拥挤</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:16, marginBottom:20 }}>
        <div style={{ borderRadius:20, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <span>📢</span> 景区公告
          </div>
          {MOCK_ANNOUNCEMENTS.map((ann,i) => (
            <div key={i} style={{ padding:'8px 12px', marginBottom:6, borderRadius:12, lineHeight:1.5,
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
            {ALL_POIS_CROWD.map(poi => {
              const b = badge(poi.crowdedness);
              return (
                <div key={poi.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'5px 10px', borderRadius:10,
                  background: poi.crowdedness >= 4 ? 'rgba(239,68,68,0.06)' : 'rgba(180,136,100,0.04)',
                  border: poi.crowdedness >= 4 ? '1px solid rgba(239,68,68,0.12)' : '1px solid transparent',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.72rem', fontWeight:500, color:'#3D2C2A' }}>
                    {poi.name}
                    {poi.crowdedness >= 4 && <span style={{ fontSize:'0.55rem', padding:'1px 6px', borderRadius:6, background:'rgba(239,68,68,0.1)', color:'#ef4444' }}>高峰</span>}
                  </div>
                  <span style={{ fontSize:'0.6rem', padding:'2px 8px', borderRadius:9999, background:b.bg, color:b.text, fontWeight:500, flexShrink:0 }}>
                    {b.label} {poi.crowdedness}/5
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ borderRadius:20, padding:18, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
        <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
          <span>⏰</span> 错峰建议
        </div>
        <div style={{ padding:'10px 14px', borderRadius:12, fontSize:'0.72rem', lineHeight:1.6, color:'rgba(61,44,42,0.55)',
          background: overallCrowd >= 3 ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
        }}>
          {overallCrowd >= 3
            ? '当前景区拥挤度较高，建议错峰游览。灵山大佛、灵山梵宫、九龙灌浴为热门点位，建议优先前往其他景点，待人流高峰过后再游览核心区域。'
            : '当前景区客流适中，是游览的好时机。建议按推荐路线依次游览，九龙灌浴表演建议提前10分钟到场占位。'}
        </div>
      </div>
    </div>
  );
}
