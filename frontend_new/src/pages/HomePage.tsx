import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import { AMAP_WEATHER_KEY, AMAP_WEATHER_URL, LINGSHAN_CITY } from '@/api/config';
import type { RealtimeInfo } from '@/api/types';

interface AmapWeather {
  status: string;
  lives: { province: string; city: string; adcode: string; weather: string; temperature: string; winddirection: string; windpower: string; humidity: string; reporttime: string }[];
}

const FIVE_HOT_POIS = [
  { id:'LS-006', name:'九龙灌浴', subtitle:'动态喷泉 · 花开见佛', badge:'必看表演',
    desc:'总高27.5米，260吨青铜铸造，中央7.2米鎏金太子佛。每日4-5场表演，莲花瓣缓缓开启，九龙吐水为太子沐浴，水幕与阳光交织出七彩佛光，再现释迦牟尼诞生时"九龙吐水"的神圣场景。',
    highlight:'表演结束可接取祈福圣水', image:'/assets/scenic/lingshan/ls-006.jpg' },
  { id:'LS-011', name:'灵山大佛', subtitle:'世界最高青铜立佛', badge:'核心地标',
    desc:'通高88米（佛体79米+莲花9米），总高101.5米，用铜725吨，佛体由1560块铜壁板构成。右手施无畏印，左手施与愿印，216级登云道暗合108烦恼与108愿望。',
    highlight:'登顶抱佛脚，俯瞰太湖全景', image:'/assets/scenic/lingshan/ls-011.jpg' },
  { id:'LS-013', name:'灵山梵宫', subtitle:'佛教艺术的卢浮宫', badge:'艺术殿堂',
    desc:'建筑面积7.2万平方米，造价18亿。28米高星空穹顶用100公斤纯金绘制，148尊飞天姿态各异；《华藏世界》琉璃壁画由160块琉璃构件熔铸而成；东阳木雕群采用金丝楠木，堪称当代佛教艺术巅峰。',
    highlight:'观看《吉祥颂》全息演出', image:'/assets/scenic/lingshan/ls-013.jpg' },
  { id:'LS-014', name:'五印坛城', subtitle:'藏传佛教 · 小布达拉宫', badge:'异域风情',
    desc:'占地5000㎡，藏式碉楼风格建筑，金顶红墙，四面环香水海。坛城内供奉五方五佛，壁画由纯手工绘制达1500㎡。转经廊设有转经筒，顺时针转动寓意"转经一圈，福慧双增"。',
    highlight:'登顶层观景台俯瞰全景', image:'/assets/scenic/lingshan/ls-014.jpg' },
  { id:'LS-010', name:'祥符禅寺', subtitle:'千年古刹 · 江南禅宗祖庭', badge:'历史遗迹',
    desc:'始建于唐贞观年间（公元627-649年），由玄奘法师弟子窥基大师开坛讲经。寺内保留千年银杏、六角古井等珍贵遗迹，悬挂重12.8吨"祥符禅钟"，钟声浑厚洪亮，响彻太湖之滨。',
    highlight:'撞钟祈福，聆听江南第一钟', image:'/assets/scenic/lingshan/ls-010.jpg' },
];

function getImageFit(poiId: string) {
  return (poiId === 'LS-011' ? 'contain' : 'cover') as React.CSSProperties['objectFit'];
}

function getImagePosition(poiId: string) {
  const map: Record<string, string> = {
    'LS-006': 'center center',
    'LS-010': 'center center',
    'LS-011': 'center center',
    'LS-013': 'center center',
    'LS-014': 'center center',
  };
  return map[poiId] || 'center center';
}

export default function HomePage({ onNavigate }: { onNavigate?: (poiId: string) => void }) {
  const [info, setInfo] = useState<RealtimeInfo | null>(null);
  const [weather, setWeather] = useState<{ temp: string; weather: string; humidity: string; wind: string; time: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.getRealtimeInfo().catch(() => null),
      fetch(`${AMAP_WEATHER_URL}?key=${AMAP_WEATHER_KEY}&city=${encodeURIComponent(LINGSHAN_CITY)}&extensions=base`)
        .then(r => r.json() as Promise<AmapWeather>)
        .catch(() => null),
    ]).then(([backendInfo, amapData]) => {
      setInfo(backendInfo?.data ?? null);
      if (amapData?.status === '1' && amapData.lives?.length > 0) {
        const live = amapData.lives[0];
        setWeather({
          temp: live.temperature,
          weather: live.weather,
          humidity: live.humidity,
          wind: live.winddirection + live.windpower + '级',
          time: live.reporttime,
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* 景区身份 + 实时天气 */}
      <div style={{
        borderRadius: 28, padding: '24px 28px', marginBottom: 20,
        background: 'linear-gradient(135deg, #3D2C2A 0%, #4E3A37 100%)',
        color: '#F7F2E6',
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <span className="badge-tag" style={{ background:'rgba(255,255,255,0.12)', color:'#D4C5B2', marginBottom:8 }}>
              国家5A级景区 · 世界佛教论坛永久会址
            </span>
            <h1 style={{ fontSize:'1.6rem', fontWeight:700, letterSpacing:2, fontFamily:"'Noto Serif SC',serif", marginBottom:4 }}>灵山胜景</h1>
            <p style={{ fontSize:'0.8rem', color:'rgba(215,200,180,0.7)', lineHeight:1.6, maxWidth:500 }}>
              坐落于无锡太湖之滨，占地面积约30万㎡，三山环抱，面朝太湖三万顷碧波，被誉为"东方佛国"。
            </p>
          </div>
          {weather ? (
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:'0.7rem', color:'rgba(215,200,180,0.5)', marginBottom:2 }}>实时天气 · 高德气象</div>
              <div style={{ fontSize:'1.8rem', fontWeight:700, lineHeight:1 }}>{weather.temp}°C</div>
              <div style={{ fontSize:'0.85rem', color:'#D4C5B2', marginTop:2 }}>{weather.weather}</div>
              <div style={{ fontSize:'0.65rem', color:'rgba(215,200,180,0.5)', marginTop:2 }}>
                湿度{weather.humidity}% · {weather.wind}
              </div>
              {info && (
                <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                  <span style={{ fontSize:'0.7rem', color:'rgba(215,200,180,0.6)' }}>拥挤度</span>
                  <div style={{ height:6, width:80, borderRadius:3, background:'rgba(255,255,255,0.15)', overflow:'hidden' }}>
                    <div style={{
                      width:`${(info.crowdednessLevel / 5) * 100}%`, height:'100%', borderRadius:3,
                      background: info.crowdednessLevel <= 2 ? '#22c55e' : info.crowdednessLevel <= 3 ? '#f59e0b' : '#ef4444',
                    }} />
                  </div>
                </div>
              )}
            </div>
          ) : info ? (
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:'0.75rem', color:'rgba(215,200,180,0.5)', marginBottom:4 }}>当前景区</div>
              <div style={{ fontSize:'1.8rem', fontWeight:700, lineHeight:1 }}>{info.temperature}°C</div>
              <div style={{ fontSize:'0.85rem', color:'#D4C5B2', marginTop:2 }}>{info.weather}</div>
              <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                <span style={{ fontSize:'0.7rem', color:'rgba(215,200,180,0.6)' }}>拥挤度</span>
                <div style={{ height:6, width:80, borderRadius:3, background:'rgba(255,255,255,0.15)', overflow:'hidden' }}>
                  <div style={{
                    width:`${(info.crowdednessLevel / 5) * 100}%`, height:'100%', borderRadius:3,
                    background: info.crowdednessLevel <= 2 ? '#22c55e' : info.crowdednessLevel <= 3 ? '#f59e0b' : '#ef4444',
                  }} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
        {info && (info.announcements ?? []).length > 0 && (
          <div style={{
            marginTop:14, padding:'8px 14px', borderRadius:12,
            background:'rgba(255,255,255,0.06)', fontSize:'0.75rem', color:'#D4C5B2',
            display:'flex', alignItems:'center', gap:8,
          }}>
            <span>📢</span> {(info.announcements ?? []).join('；')}
          </div>
        )}
      </div>

      {/* 游览建议 + 门票信息 */}
      <div style={{ display:'flex', gap:14, marginBottom:24 }}>
        {[
          { icon:'💡', title:'游览建议', text:'建议时长 4-6 小时 · 上午9点前入园避开人流 · 穿舒适运动鞋 · 带好相机记录美景' },
          { icon:'🎫', title:'门票信息', text:'成人票210元 · 网购联票（含观光车）225元 · 半价票105元' },
        ].map((c,i) => (
          <div key={i} style={{
            flex:1, borderRadius:20, padding:'14px 18px',
            background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)',
            display:'flex', alignItems:'center', gap:14,
          }}>
            <span style={{ fontSize:24 }}>{c.icon}</span>
            <div>
              <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#8B6E57', marginBottom:2 }}>{c.title}</div>
              <div style={{ fontSize:'0.72rem', color:'rgba(61,44,42,0.5)', lineHeight:1.5 }}>{c.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 核心景点推荐 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif", letterSpacing:1, display:'flex', alignItems:'center', gap:8 }}>
          <span>⭐</span> 核心景点推荐
        </h2>
        <span style={{ fontSize:'0.7rem', color:'rgba(61,44,42,0.4)' }}>5大必游景点</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {FIVE_HOT_POIS.map((poi, idx) => (
          <div key={poi.id} onClick={() => onNavigate?.(poi.id)} style={{
            borderRadius:22, padding:0, overflow:'hidden',
            background:'rgba(255,255,255,0.55)',
            border:'1px solid rgba(180,136,100,0.10)',
            boxShadow:'0 1px 4px rgba(61,44,42,0.03)',
            cursor:'pointer',
          }}>
            <div style={{ display:'flex' }}>
              <div style={{
                width:160, flexShrink:0,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                padding:'8px 0',
              }}>
                <img src={poi.image} alt={poi.name} style={{
                  width:140, height:90, borderRadius:14,
                  objectFit:getImageFit(poi.id),
                  objectPosition:getImagePosition(poi.id),
                  background:'#F2EBDA',
                  display:'block',
                }} />
                <span style={{
                  marginTop:4, fontSize:'0.6rem', fontWeight:600, letterSpacing:1,
                  color: idx === 0 ? '#8B6E57' : 'rgba(61,44,42,0.4)',
                }}>#{idx + 1} 推荐</span>
              </div>
              <div style={{ flex:1, padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:6 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif" }}>{poi.name}</h3>
                      <span className="badge" style={{
                        background:'rgba(180,136,100,0.12)', color:'#8B6E57',
                        fontSize:'0.6rem', padding:'2px 8px',
                      }}>{poi.badge}</span>
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'rgba(61,44,42,0.45)', marginTop:2 }}>{poi.subtitle}</div>
                  </div>
                </div>
                <p style={{ fontSize:'0.78rem', color:'rgba(61,44,42,0.55)', lineHeight:1.7, marginBottom:8 }}>
                  {poi.desc}
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:'0.65rem', color:'#B88864' }}>✨</span>
                  <span style={{ fontSize:'0.72rem', color:'#8B6E57', fontWeight:500 }}>{poi.highlight}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
