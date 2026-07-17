import React, { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  isLingshanSegment, getScenicPath, generateFallbackPath, calcGeoDistance,
} from '@/map/mapRouteUtil';

interface Spot {
  id: string; name: string; description: string; openingInfo: string;
  lng: number; lat: number; image: string;
}

const SPOTS: Spot[] = [
  { id:'LS-001', name:'灵山大照壁', description:'灵山胜境标志性入口…', openingInfo:'全天开放', lng:120.102498, lat:31.421388, image:'/assets/scenic/lingshan/ls-001.jpg' },
  { id:'LS-002', name:'五明桥', description:'五座汉白玉石桥…', openingInfo:'全天开放', lng:120.102243, lat:31.421745, image:'/assets/scenic/lingshan/ls-002.jpg' },
  { id:'LS-003', name:'佛足坛', description:'佛祖真身足印…', openingInfo:'全天开放', lng:120.101497, lat:31.422728, image:'/assets/scenic/lingshan/ls-003.jpg' },
  { id:'LS-004', name:'五智门', description:'汉白玉牌坊门户…', openingInfo:'全天开放', lng:120.101302, lat:31.423051, image:'/assets/scenic/lingshan/ls-004.jpg' },
  { id:'LS-005', name:'菩提大道', description:'250米中轴步道…', openingInfo:'全天开放', lng:120.101142, lat:31.42318, image:'/assets/scenic/lingshan/ls-005.jpg' },
  { id:'LS-006', name:'九龙灌浴', description:'标志性动态景观…', openingInfo:'场次10:00/11:30/13:30/15:00', lng:120.099979, lat:31.424595, image:'/assets/scenic/lingshan/ls-006.jpg' },
  { id:'LS-007', name:'降魔浮雕', description:'佛陀成道历程浮雕…', openingInfo:'全天开放', lng:120.099566, lat:31.425553, image:'/assets/scenic/lingshan/ls-007.jpg' },
  { id:'LS-008', name:'阿育王柱', description:'古印度石柱复刻…', openingInfo:'全天开放', lng:120.099263, lat:31.426179, image:'/assets/scenic/lingshan/ls-008.jpg' },
  { id:'LS-009', name:'百子戏弥勒', description:'弥勒佛与百童群雕…', openingInfo:'全天开放', lng:120.098842, lat:31.427189, image:'/assets/scenic/lingshan/ls-009.jpg' },
  { id:'LS-010', name:'祥符禅寺', description:'唐代古刹…', openingInfo:'全天开放', lng:120.098014, lat:31.427944, image:'/assets/scenic/lingshan/ls-010.jpg' },
  { id:'LS-011', name:'灵山大佛', description:'高88米世界最高青铜立佛…', openingInfo:'8:00-17:00', lng:120.096477, lat:31.430194, image:'/assets/scenic/lingshan/ls-011.jpg' },
  { id:'LS-012', name:'佛教文化博览馆', description:'大佛座基内10000㎡…', openingInfo:'8:00-17:00', lng:120.096394, lat:31.430365, image:'/assets/scenic/lingshan/ls-012.jpg' },
  { id:'LS-013', name:'灵山梵宫', description:'72000㎡佛教艺术殿堂…', openingInfo:'9:00-17:00', lng:120.102418, lat:31.428207, image:'/assets/scenic/lingshan/ls-013.jpg' },
  { id:'LS-014', name:'五印坛城', description:'藏式碉楼…', openingInfo:'9:00-17:00', lng:120.103055, lat:31.424678, image:'/assets/scenic/lingshan/ls-014.jpg' },
  { id:'LS-015', name:'曼飞龙塔', description:'南传佛教白塔…', openingInfo:'全天开放', lng:120.10461, lat:31.426046, image:'/assets/scenic/lingshan/ls-015.jpg' },
  { id:'LS-016', name:'无尽意斋', description:'赵朴初纪念馆…', openingInfo:'9:00-17:00', lng:120.09699, lat:31.428766, image:'/assets/scenic/lingshan/ls-016.jpg' },
];

const ROUTES: Record<string, { name: string; spots: string[]; travel: 'walk' | 'drive' | 'transit'; tips: string[] }> = {
  culture: { name: '历史文化深度游', spots: ['LS-001','LS-004','LS-010','LS-011','LS-013','LS-014'], travel: 'walk', tips: ['建议上午9点前入园','梵宫吉祥颂演出10:35/11:30/14:00/16:00','祥符禅寺可撞钟祈福'] },
  nature: { name: '自然风光全景游', spots: ['LS-003','LS-005','LS-006','LS-011','LS-015'], travel: 'walk', tips: ['九龙灌浴表演可接取祈福圣水','灵山大佛登顶俯瞰太湖日落'] },
  family: { name: '亲子家庭轻松游', spots: ['LS-006','LS-009','LS-013','LS-014'], travel: 'walk', tips: ['百子戏弥勒适合亲子互动拍照','景区有素面套餐适合孩子口味'] },
  pilgrimage: { name: '朝圣祈福专线', spots: ['LS-003','LS-010','LS-011','LS-013','LS-014'], travel: 'walk', tips: ['佛足坛可触摸祈福','五印坛城转经筒祈福'] },
};

const TRAVEL_LABELS: Record<string, string> = { walk: '步行', drive: '驾车', transit: '公交' };
const TRAVEL_COLORS: Record<string, string> = { walk: '#C43A31', drive: '#C43A31', transit: '#C43A31' };

function routeImageFit(spotId: string) { return (spotId === 'LS-011' ? 'contain' : 'cover') as React.CSSProperties['objectFit']; }
function formatMeters(m: number): string { return m >= 1000 ? `${(m/1000).toFixed(1)}km` : `${Math.round(m)}m`; }
function getTravelTime(distance: number, travel: string): number {
  const speeds: Record<string, number> = { walk: 5000, drive: 20000, transit: 15000 };
  return Math.ceil(distance / (speeds[travel] || 5000) * 60);
}

export default function RoutePage({ focusPoiId }: { focusPoiId?: string | null }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLinesRef = useRef<any[]>([]);
  const spotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(focusPoiId || null);
  const [routeDetail, setRouteDetail] = useState<{ segIdx: number; distance: number; time: number; path: [number,number][] }[] | null>(null);

  const focusSpot = (spotId: string) => {
    const m = mapInstance.current;
    const spot = SPOTS.find(s => s.id === spotId);
    if (!m || !spot) return;
    const pos: [number, number] = [spot.lng, spot.lat];
    try { m.setZoomAndCenter(18, pos, false, 500); } catch { try { m.setCenter(pos); m.setZoom(18); } catch {} }
    const item = markersRef.current.find(x => x.spotId === spotId);
    if (item?.info) item.info.open(m, pos);
    window.setTimeout(() => { spotRefs.current[spotId]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120);
  };

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
        content: `<div style="display:flex;align-items:center;gap:4px;padding:3px 9px 3px 4px;background:#fff;border:1px solid ${idx>=0?'#C43A31':'rgba(180,136,100,0.25)'};border-radius:18px;box-shadow:0 3px 12px rgba(0,0,0,0.12)${idx>=0?';background:#fef2f2':''}"><img src="${spot.image}" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'"><span style="font-size:11px;font-weight:${idx>=0?700:400};color:#3D2C2A;max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${idx>=0?`${idx+1}.${spot.name}`:spot.name}</span></div>`,
        offset: new A.Pixel(0, -8),
      });
      const info = new A.InfoWindow({
        content: `<div style="width:250px;padding:4px"><img src="${spot.image}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:10px" onerror="this.style.display='none'"><h3 style="margin:8px 0 4px;font-size:15px;color:#3D2C2A">${spot.name}</h3><p style="font-size:11px;color:#666;line-height:1.5">${spot.description}</p><div style="font-size:10px;color:#8B6E57">${spot.openingInfo}</div></div>`,
        offset: new A.Pixel(0, -35),
      });
      marker.on('click', () => info.open(m, pos));
      m.add(marker);
      markersRef.current.push({spotId: spot.id, marker, info, position: pos});
    });
    if (focusPoiId) window.setTimeout(() => focusSpot(focusPoiId), 80);
  }, [mapLoaded, activeRoute, focusPoiId]);

  useEffect(() => { if (focusPoiId) setExpandedSpotId(focusPoiId); }, [focusPoiId]);
  useEffect(() => { if (focusPoiId && mapLoaded && mapInstance.current) focusSpot(focusPoiId); }, [focusPoiId, mapLoaded]);

  useEffect(() => {
    const m = mapInstance.current; if (!m) return;
    const A = (window as any).AMap;
    routeLinesRef.current.forEach(l => m.remove(l)); routeLinesRef.current = []; setRouteDetail(null);
    if (!activeRoute) return;
    const route = ROUTES[activeRoute];
    const spotList = route.spots.map(id => SPOTS.find(s => s.id === id)).filter(Boolean) as Spot[];
    if (spotList.length < 2) return;
    const color = TRAVEL_COLORS[route.travel] || '#22c55e';
    const details: { segIdx: number; distance: number; time: number; path: [number,number][] }[] = [];
    let pendingSegments = spotList.length - 1;
    const drawSegment = (i: number, path: [number, number][], distance: number, time: number) => {
      const polyline = new A.Polyline({ path, strokeColor: color, strokeWeight: 4, strokeOpacity: 0.85, lineJoin: 'round' });
      m.add(polyline); routeLinesRef.current.push(polyline);
      details[i] = { segIdx: i, distance, time, path }; pendingSegments--;
      if (pendingSegments === 0) { setRouteDetail([...details]); try { m.setFitView(null, false, [40,40,40,40]); } catch {} }
    };
    for (let i = 0; i < spotList.length - 1; i++) {
      const f = spotList[i], t = spotList[i+1];
      const fromCoord: [number,number] = [f.lng, f.lat];
      const toCoord: [number,number] = [t.lng, t.lat];
      if (isLingshanSegment(f.id, t.id)) {
        const localPath = getScenicPath(f.id, t.id, 'walk');
        if (localPath?.length >= 2) { drawSegment(i, localPath, calcGeoDistance(fromCoord, toCoord), getTravelTime(calcGeoDistance(fromCoord, toCoord), route.travel)); continue; }
      }
      new A.Walking({ hideMarkers: true }).search(new A.LngLat(f.lng, f.lat), new A.LngLat(t.lng, t.lat), (status: string, result: any) => {
        let path: [number,number][] = []; let distance = 0, time = 0;
        if (status === 'complete' && result.routes?.length > 0) {
          const rt = result.routes[0]; distance = rt.distance || 0; time = Math.ceil(rt.time / 60);
          (rt.steps || []).forEach((step: any) => {
            const road = step.path || ''; road.split(';').forEach((p: string) => { const [lng, lat] = p.split(',').map(Number); if (!isNaN(lng)) path.push([lng, lat]); });
          });
        }
        if (path.length < 2) { distance = calcGeoDistance(fromCoord, toCoord); time = getTravelTime(distance, route.travel); path = generateFallbackPath(fromCoord, toCoord); }
        drawSegment(i, path, distance, time);
      });
    }
  }, [activeRoute]);

  const totalDistance = routeDetail ? routeDetail.reduce((s, d) => s + d.distance, 0) : 0;
  const totalTime = routeDetail ? routeDetail.reduce((s, d) => s + d.time, 0) : 0;

  const mapHeight = isMobile ? '350px' : 'calc(100vh - 130px)';

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 24, height: isMobile ? 'auto' : 'calc(100vh - 130px)' }}>
      <div ref={mapRef} style={{ flex: isMobile ? 'none' : '0 0 62%', height: mapHeight, borderRadius: isMobile ? 20 : 28, overflow: 'hidden', background: '#e8e4d8' }}>
        {!mapLoaded && <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'rgba(61,44,42,0.4)',fontSize:'0.85rem' }}>加载地图中...</div>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: isMobile ? 'visible' : 'auto', paddingRight: 2 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <h2 style={{ fontSize:'1.05rem',fontWeight:700,color:'#3D2C2A',fontFamily:"'Noto Serif SC',serif" }}>🗺️ 路线规划</h2>
          <span style={{ fontSize:'0.65rem',color:'rgba(61,44,42,0.35)' }}>16景点</span>
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
                      const from = SPOTS.find(s => s.id === r.spots[i]); const to = SPOTS.find(s => s.id === r.spots[i+1]);
                      return <div key={i} style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:10,background:'rgba(255,255,255,0.5)' }}>
                        <div style={{ width:24,height:24,borderRadius:'50%',background:TRAVEL_COLORS[r.travel],color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:700,flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1,fontSize:'0.7rem',lineHeight:1.3 }}><span style={{fontWeight:500,color:'#3D2C2A'}}>{from?.name}</span><span style={{color:'rgba(61,44,42,0.3)',margin:'0 4px'}}>→</span><span style={{fontWeight:500,color:'#3D2C2A'}}>{to?.name}</span></div>
                        <div style={{textAlign:'right',fontSize:'0.6rem',color:'rgba(61,44,42,0.4)',flexShrink:0}}><div>{formatMeters(seg.distance)}</div><div>{seg.time}分钟</div></div>
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
          <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:5}}>
            {SPOTS.map(spot => {
              const inRoute = !!(activeRoute && ROUTES[activeRoute].spots.includes(spot.id));
              const expanded = expandedSpotId === spot.id;
              const focused = focusPoiId === spot.id;
              return (
                <div key={spot.id} ref={el => { spotRefs.current[spot.id] = el; }}
                  onClick={() => { setExpandedSpotId(expanded ? null : spot.id); focusSpot(spot.id); }}
                  style={{
                    gridColumn: expanded ? '1 / -1' : undefined,
                    borderRadius:12,padding:expanded?'10px 10px':'6px 8px',cursor:'pointer',display:'flex',alignItems:expanded?'flex-start':'center',gap:8,border:'1px solid transparent',
                    background: focused || expanded ? 'rgba(180,136,100,0.16)' : inRoute ? 'rgba(180,136,100,0.1)' : 'transparent',
                    borderColor: focused || expanded ? 'rgba(180,136,100,0.34)' : inRoute ? 'rgba(180,136,100,0.2)' : 'transparent',
                  }}>
                  <img src={spot.image} alt={spot.name} style={{width:expanded?74:32,height:expanded?58:32,borderRadius:8,objectFit:routeImageFit(spot.id),background:'#F2EBDA',flexShrink:0}}
                    onError={e => {(e.target as HTMLImageElement).style.display='none'}} />
                  <div style={{fontSize:'0.7rem',fontWeight:500,color:'#3D2C2A',lineHeight:1.25, flex:1, minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'space-between'}}>
                      <span>{spot.name}</span>
                      {focused && <span style={{fontSize:'0.58rem',padding:'1px 6px',borderRadius:8,background:'#C43A31',color:'#fff',flexShrink:0}}>目标</span>}
                    </div>
                    <div style={{fontSize:'0.6rem',color:'rgba(61,44,42,0.35)'}}>{spot.id}</div>
                    {expanded && (
                      <div style={{marginTop:6,fontSize:'0.66rem',lineHeight:1.55,color:'rgba(61,44,42,0.56)'}}>
                        <div>{spot.description}</div>
                        <div style={{marginTop:4,color:'#8B6E57'}}>{spot.openingInfo}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}