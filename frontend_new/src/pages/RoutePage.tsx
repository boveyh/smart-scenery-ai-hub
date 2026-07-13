import React, { useEffect, useRef, useState } from 'react';
import {
  isLingshanSegment, getScenicPath, generateFallbackPath, calcGeoDistance,
} from '@/map/mapRouteUtil';

interface Spot {
  id: string; name: string; description: string; openingInfo: string;
  lng: number; lat: number; image: string;
}

const SPOTS: Spot[] = [
  { id:'LS-001', name:'灵山大照壁', description:'灵山胜境标志性入口，赵朴初题写鎏金"灵山胜境"。', openingInfo:'全天开放', lng:120.102498, lat:31.421388, image:'/assets/scenic/lingshan/ls-001.jpg' },
  { id:'LS-002', name:'五明桥', description:'五座汉白玉石桥横跨香水海，象征佛教五种智慧。', openingInfo:'全天开放免费通行', lng:120.102243, lat:31.421745, image:'/assets/scenic/lingshan/ls-002.jpg' },
  { id:'LS-003', name:'佛足坛', description:'佛祖真身足印青铜铸造，刻有32种吉祥瑞相。', openingInfo:'全天开放', lng:120.101497, lat:31.422728, image:'/assets/scenic/lingshan/ls-003.jpg' },
  { id:'LS-004', name:'五智门', description:'汉白玉牌坊门户，五门六柱象征五方五佛与六度波罗蜜。', openingInfo:'全天开放', lng:120.101302, lat:31.423051, image:'/assets/scenic/lingshan/ls-004.jpg' },
  { id:'LS-005', name:'菩提大道', description:'250米中轴步道，两侧印度菩提树成拱廊。', openingInfo:'全天开放', lng:120.101142, lat:31.42318, image:'/assets/scenic/lingshan/ls-005.jpg' },
  { id:'LS-006', name:'九龙灌浴', description:'标志性动态景观，莲花绽放九龙喷水再现佛陀诞生。', openingInfo:'场次10:00/11:30/13:30/15:00', lng:120.099979, lat:31.424595, image:'/assets/scenic/lingshan/ls-006.jpg' },
  { id:'LS-007', name:'降魔浮雕', description:'佛陀战胜魔王波旬成道历程的花岗岩浮雕。', openingInfo:'全天开放', lng:120.099566, lat:31.425553, image:'/assets/scenic/lingshan/ls-007.jpg' },
  { id:'LS-008', name:'阿育王柱', description:'古印度阿育王石柱复刻，四狮柱头象征佛法广传。', openingInfo:'全天开放', lng:120.099263, lat:31.426179, image:'/assets/scenic/lingshan/ls-008.jpg' },
  { id:'LS-009', name:'百子戏弥勒', description:'弥勒佛与百名孩童青铜群雕，寓意欢喜包容。', openingInfo:'全天开放', lng:120.098842, lat:31.427189, image:'/assets/scenic/lingshan/ls-009.jpg' },
  { id:'LS-010', name:'祥符禅寺', description:'唐代古刹，江南千年禅宗祖庭，有古井银杏祥符禅钟。', openingInfo:'全天开放', lng:120.098014, lat:31.427944, image:'/assets/scenic/lingshan/ls-010.jpg' },
  { id:'LS-011', name:'灵山大佛', description:'高88米世界最高露天青铜立佛，登顶抱佛脚俯瞰太湖。', openingInfo:'8:00-17:00', lng:120.096477, lat:31.430194, image:'/assets/scenic/lingshan/ls-011.jpg' },
  { id:'LS-012', name:'佛教文化博览馆', description:'大佛座基内10000㎡，三层展厅万佛殿9999尊小佛。', openingInfo:'8:00-17:00', lng:120.096394, lat:31.430365, image:'/assets/scenic/lingshan/ls-012.jpg' },
  { id:'LS-013', name:'灵山梵宫', description:'72000㎡佛教艺术殿堂，被誉为东方卢浮宫。', openingInfo:'9:00-17:00', lng:120.102418, lat:31.428207, image:'/assets/scenic/lingshan/ls-013.jpg' },
  { id:'LS-014', name:'五印坛城', description:'藏式碉楼有小布达拉宫之称，壁画唐卡转经筒祈福。', openingInfo:'9:00-17:00', lng:120.103055, lat:31.424678, image:'/assets/scenic/lingshan/ls-014.jpg' },
  { id:'LS-015', name:'曼飞龙塔', description:'南传佛教九塔组合白塔，复刻西双版纳曼飞龙塔。', openingInfo:'全天开放', lng:120.10461, lat:31.426046, image:'/assets/scenic/lingshan/ls-015.jpg' },
  { id:'LS-016', name:'无尽意斋', description:'赵朴初纪念馆，四合院风格复刻故居，免费禅茶。', openingInfo:'9:00-17:00', lng:120.09699, lat:31.428766, image:'/assets/scenic/lingshan/ls-016.jpg' },
];

const ROUTES: Record<string, { name: string; spots: string[]; travel: 'walk' | 'drive' | 'transit'; tips: string[] }> = {
  culture: { name: '历史文化深度游', spots: ['LS-001','LS-004','LS-010','LS-011','LS-013','LS-014'], travel: 'walk', tips: ['建议上午9点前入园','梵宫吉祥颂演出10:35/11:30/14:00/16:00','祥符禅寺可撞钟祈福'] },
  nature: { name: '自然风光全景游', spots: ['LS-003','LS-005','LS-006','LS-011','LS-015'], travel: 'walk', tips: ['九龙灌浴表演可接取祈福圣水','灵山大佛登顶俯瞰太湖日落','菩提大道四季景色各异'] },
  family: { name: '亲子家庭轻松游', spots: ['LS-006','LS-009','LS-013','LS-014'], travel: 'walk', tips: ['百子戏弥勒适合亲子互动拍照','梵宫演出孩子也会喜欢','景区有素面套餐适合孩子口味'] },
  pilgrimage: { name: '朝圣祈福专线', spots: ['LS-003','LS-010','LS-011','LS-013','LS-014'], travel: 'walk', tips: ['佛足坛可触摸祈福','祥符禅寺礼佛聆听钟声','五印坛城转经筒祈福'] },
};

const TRAVEL_LABELS: Record<string, string> = { walk: '步行', drive: '驾车', transit: '公交' };
const TRAVEL_COLORS: Record<string, string> = { walk: '#22c55e', drive: '#3b82f6', transit: '#f59e0b' };

function formatMeters(m: number): string {
  return m >= 1000 ? `${(m/1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

function getTravelTime(distance: number, travel: string): number {
  const speeds: Record<string, number> = { walk: 5000, drive: 20000, transit: 15000 };
  return Math.ceil(distance / (speeds[travel] || 5000) * 60);
}

export default function RoutePage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLinesRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [routeDetail, setRouteDetail] = useState<{ segIdx: number; distance: number; time: number; path: [number,number][] }[] | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).AMap) { setMapLoaded(true); return; }
    (window as any)._AMapSecurityConfig = { securityJsCode: 'bc348939baaa34701862ebc09c248651' };
    const s = document.createElement('script');
    s.src = 'https://webapi.amap.com/maps?v=2.0&key=59982361fb3905c4f72bedc5c6dfafae&plugin=AMap.ControlBar,AMap.Scale,AMap.Walking,AMap.Driving,AMap.Transfer,AMap.Polyline';
    s.async = true; s.onload = () => setMapLoaded(true);
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return;
    const A = (window as any).AMap;
    const m = new A.Map(mapRef.current, {
      viewMode: '3D', zoom: 16, zooms: [15,19], pitch: 58, rotation: -18,
      center: [120.1005, 31.426], rotateEnable: true, pitchEnable: true,
      showBuildingBlock: true, mapStyle: 'amap://styles/normal',
    });
    m.addControl(new A.ControlBar({ position: { right:'16px', top:'16px' } }));
    m.addControl(new A.Scale());
    mapInstance.current = m;
  }, [mapLoaded]);

  // Markers
  useEffect(() => {
    const m = mapInstance.current; if (!m) return;
    const A = (window as any).AMap;
    markersRef.current.forEach(({marker,info}) => { m.remove(marker); m.remove(info); });
    markersRef.current = [];
    const routeSpots: string[] = activeRoute ? ROUTES[activeRoute].spots : [];
    SPOTS.forEach(spot => {
      const pos = [spot.lng, spot.lat];
      const idx = routeSpots.indexOf(spot.id);
      const marker = new A.Marker({
        position: pos, anchor: 'bottom-center',
        content: `<div style="display:flex;align-items:center;gap:4px;padding:3px 9px 3px 4px;background:#fff;border:1px solid ${idx>=0?'#8B6E57':'rgba(180,136,100,0.25)'};border-radius:18px;box-shadow:0 3px 12px rgba(0,0,0,0.12)"><img src="${spot.image}" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'"><span style="font-size:11px;font-weight:${idx>=0?700:400};color:#3D2C2A;max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${idx>=0?`${idx+1}.${spot.name}`:spot.name}</span></div>`,
        offset: new A.Pixel(0, -8),
      });
      const info = new A.InfoWindow({
        content: `<div style="width:250px;padding:4px"><img src="${spot.image}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:10px" onerror="this.style.display='none'"><h3 style="margin:8px 0 4px;font-size:15px;color:#3D2C2A">${spot.name}</h3><p style="font-size:11px;color:#666;line-height:1.5">${spot.description}</p><div style="font-size:10px;color:#8B6E57">${spot.openingInfo}</div></div>`,
        offset: new A.Pixel(0, -35),
      });
      marker.on('click', () => info.open(m, pos));
      m.add(marker);
      markersRef.current.push({marker, info});
    });
  }, [mapLoaded, activeRoute]);

  // Route drawing — three-layer fallback
  useEffect(() => {
    const m = mapInstance.current; if (!m) return;
    const A = (window as any).AMap;
    routeLinesRef.current.forEach(l => m.remove(l));
    routeLinesRef.current = [];
    setRouteDetail(null);

    if (!activeRoute) return;
    const route = ROUTES[activeRoute];
    const spotList = route.spots.map(id => SPOTS.find(s => s.id === id)).filter(Boolean) as Spot[];
    if (spotList.length < 2) return;

    const color = TRAVEL_COLORS[route.travel] || '#22c55e';
    const details: { segIdx: number; distance: number; time: number; path: [number,number][] }[] = [];
    let pendingSegments = spotList.length - 1;

    const drawSegment = (i: number, path: [number, number][], distance: number, time: number) => {
      const polyline = new A.Polyline({
        path, strokeColor: color,
        strokeWeight: route.travel === 'walk' ? 4 : 5,
        strokeOpacity: 0.85,
        strokeStyle: route.travel === 'transit' ? 'dashed' : 'solid',
        lineJoin: 'round',
      });
      m.add(polyline);
      routeLinesRef.current.push(polyline);

      const mid = path[Math.floor(path.length / 2)] || path[0];
      const label = new A.Marker({
        position: mid, anchor: 'center',
        content: `<div style="background:#fff;border-radius:10px;padding:2px 8px;font-size:10px;color:#3D2C2A;box-shadow:0 1px 6px rgba(0,0,0,0.12);white-space:nowrap;border:1px solid ${color}">${formatMeters(distance)} · ${time}分钟</div>`,
        offset: new A.Pixel(0, -10),
      });
      m.add(label);
      routeLinesRef.current.push(label);

      details[i] = { segIdx: i, distance, time, path };
      pendingSegments--;
      if (pendingSegments === 0) {
        setRouteDetail([...details]);
        try { m.setFitView(null, false, [40, 40, 40, 40]); } catch {}
      }
    };

    const fromId = (idx: number) => spotList[idx].id;
    const fromCoord = (idx: number): [number, number] => [spotList[idx].lng, spotList[idx].lat];
    const toCoord = (idx: number): [number, number] => [spotList[idx + 1].lng, spotList[idx + 1].lat];

    for (let i = 0; i < spotList.length - 1; i++) {
      const f = spotList[i], t = spotList[i + 1];
      const fa = fromId(i), ta = fromId(i + 1);

      // Layer 1: 景区内部路段 → 使用本地预设坐标（无需调用 Amap 路线服务）
      if (isLingshanSegment(fa, ta)) {
        const localPath = getScenicPath(fa, ta, route.travel === 'drive' ? 'drive' : 'walk');
        if (localPath && localPath.length >= 2) {
          const dist = calcGeoDistance(fromCoord(i), toCoord(i));
          const time = getTravelTime(dist, route.travel);
          drawSegment(i, localPath, dist, time);
          continue;
        }
      }

      // Layer 2: 外部城市路段 → 调用 Amap Walking/Driving/Transfer
      const fromPt = new A.LngLat(f.lng, f.lat);
      const toPt = new A.LngLat(t.lng, t.lat);

      const searchCb = (idx: number, svc: string) => (status: string, result: any) => {
        let path: [number, number][] = [];
        let distance = 0, time = 0;

        if (status === 'complete' && result.routes?.length > 0) {
          const rt = result.routes[0];
          distance = rt.distance || 0;
          time = Math.ceil((rt.time || rt.distance / (svc === 'walking' ? 5000 : 20000) * 60) / 60);
          const steps: any[] = rt.steps || [];
          for (const step of steps) {
            const road = step.path || step.road || '';
            if (typeof road === 'string') {
              road.split(';').filter(Boolean).forEach((p: string) => {
                const [lng, lat] = p.split(',').map(Number);
                if (!isNaN(lng) && !isNaN(lat)) path.push([lng, lat]);
              });
            }
          }
        } else if (status === 'complete' && result.plans?.length > 0) {
          const plan = result.plans[0];
          distance = plan.distance || 0;
          time = Math.ceil((plan.time || plan.distance / 15000 * 60) / 60);
        }

        // Layer 3: 高德也无路线 → fallback 带弯曲的插值线
        if (path.length < 2) {
          distance = calcGeoDistance(fromCoord(idx), toCoord(idx));
          time = getTravelTime(distance, svc === 'transit' ? 'transit' : route.travel);
          path = generateFallbackPath(fromCoord(idx), toCoord(idx));
        }

        drawSegment(idx, path, distance, time);
      };

      if (route.travel === 'walk') new A.Walking({ hideMarkers: true }).search(fromPt, toPt, searchCb(i, 'walking'));
      else if (route.travel === 'drive') new A.Driving({ hideMarkers: true }).search(fromPt, toPt, searchCb(i, 'driving'));
      else new A.Transfer({ hideMarkers: true }).search(fromPt, toPt, searchCb(i, 'transit'));
    }
  }, [activeRoute]);

  const totalDistance = routeDetail ? routeDetail.reduce((s, d) => s + d.distance, 0) : 0;
  const totalTime = routeDetail ? routeDetail.reduce((s, d) => s + d.time, 0) : 0;

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', gap: 24 }}>
      <div ref={mapRef} style={{ flex: '0 0 62%', borderRadius: 28, overflow: 'hidden', height: '100%', background: '#e8e4d8' }}>
        {!mapLoaded && <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'rgba(61,44,42,0.4)',fontSize:'0.85rem' }}>加载地图中...</div>}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 2 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <h2 style={{ fontSize:'1.05rem',fontWeight:700,color:'#3D2C2A',fontFamily:"'Noto Serif SC',serif" }}>🗺️ 路线规划</h2>
          <span style={{ fontSize:'0.65rem',color:'rgba(61,44,42,0.35)' }}>灵山胜境 · 16景点</span>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          <div style={{ fontSize:'0.8rem',fontWeight:600,color:'#8B6E57' }}>推荐路线</div>
          {Object.entries(ROUTES).map(([key, r]) => (
            <div key={key} onClick={() => setActiveRoute(key)} style={{
              borderRadius:16,padding:'12px 14px',cursor:'pointer',
              background: activeRoute===key ? 'rgba(180,136,100,0.12)' : 'rgba(255,255,255,0.55)',
              border: `1px solid ${activeRoute===key ? 'rgba(180,136,100,0.25)' : 'rgba(180,136,100,0.08)'}`,
            }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4 }}>
                <div style={{ fontSize:'0.85rem',fontWeight:600,color:'#3D2C2A',display:'flex',alignItems:'center',gap:6 }}>
                  {r.name}
                  <span style={{ fontSize:'0.6rem',padding:'1px 8px',borderRadius:10, background:`${TRAVEL_COLORS[r.travel]}15`, color:TRAVEL_COLORS[r.travel], fontWeight:500 }}>{TRAVEL_LABELS[r.travel]}</span>
                </div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:3,flexWrap:'wrap',marginBottom:activeRoute===key?8:0 }}>
                {r.spots.map((sid, i) => {
                  const spot = SPOTS.find(s => s.id === sid);
                  return <React.Fragment key={sid}>
                    <span style={{ padding:'2px 7px',borderRadius:10,fontSize:'0.6rem', background:'rgba(180,136,100,0.08)',color:'#8B6E57',whiteSpace:'nowrap' }}>{spot?.name || sid}</span>
                    {i<r.spots.length-1 && <span style={{color:'rgba(61,44,42,0.2)',fontSize:'0.6rem'}}>→</span>}
                  </React.Fragment>;
                })}
              </div>
              {activeRoute===key && routeDetail && (
                <>
                  <div style={{ display:'flex',gap:12,marginBottom:8 }}>
                    <div style={{ flex:1,padding:'8px 10px',borderRadius:10,background:'rgba(255,255,255,0.6)',textAlign:'center' }}>
                      <div style={{fontSize:'0.6rem',color:'rgba(61,44,42,0.4)'}}>总里程</div>
                      <div style={{fontSize:'0.9rem',fontWeight:700,color:'#3D2C2A'}}>{formatMeters(totalDistance)}</div>
                    </div>
                    <div style={{ flex:1,padding:'8px 10px',borderRadius:10,background:'rgba(255,255,255,0.6)',textAlign:'center' }}>
                      <div style={{fontSize:'0.6rem',color:'rgba(61,44,42,0.4)'}}>预计时长</div>
                      <div style={{fontSize:'0.9rem',fontWeight:700,color:'#3D2C2A'}}>{totalTime}分钟</div>
                    </div>
                    <div style={{ flex:1,padding:'8px 10px',borderRadius:10,background:`${TRAVEL_COLORS[r.travel]}12`,textAlign:'center' }}>
                      <div style={{fontSize:'0.6rem',color:'rgba(61,44,42,0.4)'}}>交通方式</div>
                      <div style={{fontSize:'0.9rem',fontWeight:700,color:TRAVEL_COLORS[r.travel]}}>{TRAVEL_LABELS[r.travel]}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                    {routeDetail.map((seg, i) => {
                      const from = SPOTS.find(s => s.id === r.spots[i]);
                      const to = SPOTS.find(s => s.id === r.spots[i + 1]);
                      return <div key={i} style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:10,background:'rgba(255,255,255,0.5)' }}>
                        <div style={{ width:24,height:24,borderRadius:'50%',background:TRAVEL_COLORS[r.travel],color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:700,flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1,fontSize:'0.7rem',lineHeight:1.3 }}>
                          <span style={{fontWeight:500,color:'#3D2C2A'}}>{from?.name||'起点'}</span>
                          <span style={{color:'rgba(61,44,42,0.3)',margin:'0 4px'}}>→</span>
                          <span style={{fontWeight:500,color:'#3D2C2A'}}>{to?.name||'终点'}</span>
                        </div>
                        <div style={{textAlign:'right',fontSize:'0.6rem',color:'rgba(61,44,42,0.4)',flexShrink:0}}>
                          <div>{formatMeters(seg.distance)}</div>
                          <div>{seg.time}分钟</div>
                        </div>
                      </div>;
                    })}
                  </div>
                  <div style={{marginTop:8,padding:'8px 10px',borderRadius:10,background:'rgba(255,255,255,0.5)',fontSize:'0.68rem',lineHeight:1.5,color:'rgba(61,44,42,0.55)'}}>
                    {r.tips.map((t,i) => <div key={i} style={{display:'flex',gap:4}}><span>💡</span><span>{t}</span></div>)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div>
          <div style={{fontSize:'0.8rem',fontWeight:600,color:'#8B6E57',marginBottom:6}}>全部景点</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
            {SPOTS.map(spot => (
              <div key={spot.id} style={{borderRadius:10,padding:'6px 8px',cursor:'pointer',display:'flex',alignItems:'center',gap:6,border:'1px solid transparent',
                background: activeRoute && ROUTES[activeRoute].spots.includes(spot.id) ? 'rgba(180,136,100,0.1)' : 'transparent',
                borderColor: activeRoute && ROUTES[activeRoute].spots.includes(spot.id) ? 'rgba(180,136,100,0.2)' : 'transparent',
              }}>
                <img src={spot.image} alt={spot.name} style={{width:32,height:32,borderRadius:8,objectFit:'cover',flexShrink:0}}
                  onError={e => {(e.target as HTMLImageElement).style.display='none'}} />
                <div style={{fontSize:'0.7rem',fontWeight:500,color:'#3D2C2A',lineHeight:1.2}}>
                  <div>{spot.name}</div>
                  <div style={{fontSize:'0.6rem',color:'rgba(61,44,42,0.35)'}}>{spot.id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
