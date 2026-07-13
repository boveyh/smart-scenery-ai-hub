import React, { useEffect, useRef, useState } from 'react';

interface Spot {
  id: string; name: string; description: string; openingInfo: string;
  lng: number; lat: number; image: string;
}

const SCENIC_SPOTS: Spot[] = [
  { id:'LS-001', name:'灵山大照壁', description:'灵山胜境标志性入口，赵朴初题写鎏金"灵山胜境"，游客打卡首处景观。', openingInfo:'全天开放', lng:120.102498, lat:31.421388, image:'/assets/scenic/lingshan/ls-001.jpg' },
  { id:'LS-002', name:'五明桥', description:'五座汉白玉石桥横跨香水海，象征佛教五种智慧，进入核心景区必经通道。', openingInfo:'全天开放免费通行', lng:120.102243, lat:31.421745, image:'/assets/scenic/lingshan/ls-002.jpg' },
  { id:'LS-003', name:'佛足坛', description:'佛祖真身足印青铜铸造，刻有32种吉祥瑞相，重要祈福朝圣点。', openingInfo:'全天开放', lng:120.101497, lat:31.422728, image:'/assets/scenic/lingshan/ls-003.jpg' },
  { id:'LS-004', name:'五智门', description:'汉白玉牌坊门户，五门六柱象征五方五佛与六度波罗蜜。', openingInfo:'全天开放', lng:120.101302, lat:31.423051, image:'/assets/scenic/lingshan/ls-004.jpg' },
  { id:'LS-005', name:'菩提大道', description:'250米中轴步道，两侧印度菩提树成拱廊，寓意走向觉悟。', openingInfo:'全天开放', lng:120.101142, lat:31.42318, image:'/assets/scenic/lingshan/ls-005.jpg' },
  { id:'LS-006', name:'九龙灌浴', description:'标志性动态景观，莲花绽放太子佛升起九条飞龙喷水，再现佛陀诞生祥瑞。', openingInfo:'场次10:00/11:30/13:30/15:00', lng:120.099979, lat:31.424595, image:'/assets/scenic/lingshan/ls-006.jpg' },
  { id:'LS-007', name:'降魔浮雕', description:'佛陀战胜魔王波旬成道历程的花岗岩浮雕，雕刻精美。', openingInfo:'全天开放', lng:120.099566, lat:31.425553, image:'/assets/scenic/lingshan/ls-007.jpg' },
  { id:'LS-008', name:'阿育王柱', description:'古印度阿育王石柱复刻，四狮柱头象征佛法广传四方。', openingInfo:'全天开放', lng:120.099263, lat:31.426179, image:'/assets/scenic/lingshan/ls-008.jpg' },
  { id:'LS-009', name:'百子戏弥勒', description:'弥勒佛与百名孩童青铜群雕，寓意欢喜包容多福安康。', openingInfo:'全天开放', lng:120.098842, lat:31.427189, image:'/assets/scenic/lingshan/ls-009.jpg' },
  { id:'LS-010', name:'祥符禅寺', description:'唐代古刹，江南千年禅宗祖庭，有古井银杏祥符禅钟。', openingInfo:'全天开放', lng:120.098014, lat:31.427944, image:'/assets/scenic/lingshan/ls-010.jpg' },
  { id:'LS-011', name:'灵山大佛', description:'高88米世界最高露天青铜立佛，登顶抱佛脚俯瞰太湖。', openingInfo:'8:00-17:00', lng:120.096477, lat:31.430194, image:'/assets/scenic/lingshan/ls-011.jpg' },
  { id:'LS-012', name:'佛教文化博览馆', description:'大佛座基内10000㎡，三层展厅万佛殿9999尊小佛免费参观。', openingInfo:'8:00-17:00', lng:120.096394, lat:31.430365, image:'/assets/scenic/lingshan/ls-012.jpg' },
  { id:'LS-013', name:'灵山梵宫', description:'72000㎡佛教艺术殿堂，被誉为东方卢浮宫，世界佛教论坛会址。', openingInfo:'9:00-17:00', lng:120.102418, lat:31.428207, image:'/assets/scenic/lingshan/ls-013.jpg' },
  { id:'LS-014', name:'五印坛城', description:'藏式碉楼有小布达拉宫之称，壁画唐卡转经筒祈福。', openingInfo:'9:00-17:00', lng:120.103055, lat:31.424678, image:'/assets/scenic/lingshan/ls-014.jpg' },
  { id:'LS-015', name:'曼飞龙塔', description:'南传佛教九塔组合白塔，复刻西双版纳曼飞龙塔异域风情。', openingInfo:'全天开放', lng:120.10461, lat:31.426046, image:'/assets/scenic/lingshan/ls-015.jpg' },
  { id:'LS-016', name:'无尽意斋', description:'赵朴初纪念馆，四合院风格复刻故居，免费禅茶品鉴。', openingInfo:'9:00-17:00', lng:120.09699, lat:31.428766, image:'/assets/scenic/lingshan/ls-016.jpg' },
];

const ROUTE_RECOMMENDATIONS: Record<string, { name: string; duration: string; spots: string[]; tips: string[] }> = {
  'culture': {
    name: '历史文化深度游',
    duration: '约6小时',
    spots: ['LS-001','LS-004','LS-010','LS-011','LS-013','LS-014'],
    tips: ['建议上午9点前入园', '梵宫吉祥颂演出10:35/11:30/14:00/16:00', '祥符禅寺可撞钟祈福'],
  },
  'nature': {
    name: '自然风光全景游',
    duration: '约5小时',
    spots: ['LS-003','LS-005','LS-006','LS-011','LS-015'],
    tips: ['九龙灌浴表演可接取祈福圣水', '灵山大佛登顶俯瞰太湖日落', '菩提大道四季景色各异'],
  },
  'family': {
    name: '亲子家庭轻松游',
    duration: '约4小时',
    spots: ['LS-006','LS-009','LS-013','LS-014'],
    tips: ['百子戏弥勒适合亲子互动拍照', '梵宫演出孩子也会喜欢', '景区有素面套餐适合孩子口味'],
  },
  'pilgrimage': {
    name: '朝圣祈福专线',
    duration: '约5小时',
    spots: ['LS-003','LS-010','LS-011','LS-013','LS-014'],
    tips: ['佛足坛可触摸祈福', '祥符禅寺礼佛聆听钟声', '五印坛城转经筒祈福'],
  },
};

export default function RoutePage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeSpot, setActiveSpot] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);

  // Load Amap API
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).AMap) {
      setMapLoaded(true);
      return;
    }
    (window as any)._AMapSecurityConfig = { securityJsCode: 'bc348939baaa34701862ebc09c248651' };
    const script = document.createElement('script');
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=59982361fb3905c4f72bedc5c6dfafae&plugin=AMap.ControlBar,AMap.Scale';
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  // Init map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return;
    const AMap = (window as any).AMap;
    const center = [120.1005, 31.426];
    const m = new AMap.Map(mapRef.current, {
      viewMode: '3D',
      zoom: 16, zooms: [16, 19], pitch: 58, rotation: -18,
      center, rotateEnable: true, pitchEnable: true,
      showBuildingBlock: true,
      mapStyle: 'amap://styles/normal',
    });
    m.addControl(new AMap.ControlBar({ position: { right: '16px', top: '16px' } }));
    m.addControl(new AMap.Scale());
    mapInstance.current = m;
  }, [mapLoaded]);

  // Add/replace markers when spots or activeSpot changes
  useEffect(() => {
    const m = mapInstance.current;
    if (!m) return;
    const AMap = (window as any).AMap;

    // Clear old markers
    markersRef.current.forEach(({ marker, info }) => { m.remove(marker); m.remove(info); });
    markersRef.current = [];

    SCENIC_SPOTS.forEach(spot => {
      const pos = [spot.lng, spot.lat];
      const isActive = activeSpot === spot.id;
      const marker = new AMap.Marker({
        position: pos, title: spot.name, anchor: 'bottom-center',
        content: `<div style="display:flex;align-items:center;gap:5px;padding:3px 9px 3px 4px;background:#fff;border:1px solid ${isActive ? '#8B6E57' : 'rgba(180,136,100,0.25)'};border-radius:18px;box-shadow:0 3px 12px rgba(61,44,42,0.15);min-width:80px"><img src="${spot.image}" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:${isActive ? 700 : 500};color:#3D2C2A;max-width:80px">${spot.name}</span></div>`,
        offset: new AMap.Pixel(0, -8),
      });
      const info = new AMap.InfoWindow({
        content: `<div style="width:260px;padding:4px"><img src="${spot.image}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:10px" onerror="this.style.display='none'"><h3 style="margin:10px 0 5px;font-size:16px;color:#3D2C2A">${spot.name}</h3><p style="font-size:12px;color:#666;line-height:1.6">${spot.description}</p><div style="font-size:11px;color:#8B6E57">${spot.openingInfo}</div></div>`,
        offset: new AMap.Pixel(0, -35),
      });
      marker.on('click', () => { setActiveSpot(spot.id); info.open(m, pos); });
      m.add(marker);
      markersRef.current.push({ marker, info });
    });
  }, [mapLoaded, activeSpot]);

  // Select route → animate to show all POIs
  const handleSelectRoute = (key: string) => {
    setActiveRoute(key);
    const route = ROUTE_RECOMMENDATIONS[key];
    if (!route) return;
    const m = mapInstance.current;
    if (!m || route.spots.length === 0) return;
    setActiveSpot(route.spots[0]);
  };

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', gap: 24 }}>
      {/* LEFT: 3D Map */}
      <div ref={mapRef} style={{ flex: '0 0 62%', borderRadius: 28, overflow: 'hidden', height: '100%', background: '#e8e4d8' }}>
        {!mapLoaded && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'rgba(61,44,42,0.4)', fontSize:'0.85rem' }}>加载地图中...</div>}
      </div>

      {/* RIGHT: Route planning panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingRight: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif" }}>
            🗺️ 路线规划
          </h2>
          <span style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.35)' }}>灵山胜境 · 16景点</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57' }}>推荐路线</div>
          {Object.entries(ROUTE_RECOMMENDATIONS).map(([key, r]) => (
            <div key={key} onClick={() => handleSelectRoute(key)} style={{
              borderRadius: 16, padding: '13px 16px', cursor: 'pointer',
              background: activeRoute === key ? 'rgba(180,136,100,0.12)' : 'rgba(255,255,255,0.55)',
              border: `1px solid ${activeRoute === key ? 'rgba(180,136,100,0.25)' : 'rgba(180,136,100,0.08)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3D2C2A' }}>{r.name}</div>
                <span style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.4)' }}>⏱ {r.duration}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                {r.spots.map((sid, i) => {
                  const spot = SCENIC_SPOTS.find(s => s.id === sid);
                  return (
                    <React.Fragment key={sid}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: '0.6rem',
                        background: 'rgba(180,136,100,0.08)', color: '#8B6E57',
                        whiteSpace: 'nowrap',
                      }}>{spot?.name || sid}</span>
                      {i < r.spots.length - 1 && <span style={{ color: 'rgba(61,44,42,0.2)', fontSize: '0.65rem' }}>→</span>}
                    </React.Fragment>
                  );
                })}
              </div>
              {activeRoute === key && (
                <div style={{
                  marginTop: 10, padding: '10px 12px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', lineHeight: 1.6,
                  color: 'rgba(61,44,42,0.55)',
                }}>
                  {r.tips.map((t, i) => <div key={i} style={{ display: 'flex', gap: 4 }}><span>💡</span><span>{t}</span></div>)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8B6E57', marginBottom: 8 }}>全部景点</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {SCENIC_SPOTS.map(spot => (
              <div key={spot.id} onClick={() => setActiveSpot(spot.id)} style={{
                borderRadius: 12, padding: '8px 10px', cursor: 'pointer',
                background: activeSpot === spot.id ? 'rgba(180,136,100,0.12)' : 'transparent',
                border: `1px solid ${activeSpot === spot.id ? 'rgba(180,136,100,0.2)' : 'transparent'}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <img src={spot.image} alt={spot.name}
                  style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#3D2C2A', lineHeight: 1.2 }}>
                  <div>{spot.name}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(61,44,42,0.35)' }}>{spot.id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
