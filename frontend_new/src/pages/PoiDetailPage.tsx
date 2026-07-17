import React, { useState, useRef } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getPoiWebp } from '@/map/lingshanAssets';

const POI_IDS = ['LS-001','LS-002','LS-003','LS-004','LS-005','LS-006','LS-007','LS-008','LS-009','LS-010','LS-011','LS-012','LS-013','LS-014','LS-015','LS-016'];

const ALL_POIS_DATA: Record<string, any> = {
  'LS-001':{name:'灵山大照壁',category:'历史文化',description:'被誉为"华夏第一壁"，赵朴初题写"湖光万顷净琉璃"。',detail:'进入无锡灵山胜境，首先映入眼帘的是气势恢宏，被誉为"华夏第一壁"的灵山大照壁。照壁正面是原政协副主席、中国佛教协会会长赵朴初先生题写的"湖光万顷净琉璃"诗句。赵老认为灵山胜境与太湖相互辉映，好似佛教中的琉璃世界。在照壁的北立面，刻有赵老所写的一首诗《小灵山》："昔游天竺访灵鹫，叹息空荒忆法华；不意鹫峰飞到此，天花烂漫散吾家"。1997年赵朴初老先生考察灵山胜境，看到灵山大佛庄严慈祥，香火鼎盛，欣然提笔写下了这首诗。照壁采用优质青石雕刻，长39.8米高7米。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'适合打卡合影、拍摄湖光壁影同框美景'},
  'LS-002':{name:'五明桥',category:'历史文化',description:'五座汉白玉石拱桥，象征佛教声明、因明等五种智慧。',detail:'五明桥是灵山胜境的第一道标志性景观，坐落于大照壁后方的玉带河上，由五座并列的汉白玉三孔石桥组成，形制庄重典雅，效仿金水桥规制建造，纯白的汉白玉栏杆尽显肃穆圣洁，是游客进入灵山核心景区的必经之路。桥名源自佛教"五明"智慧体系，"明"即智慧与学问，寓意大乘佛教入世修行、广学博览、济世度人的理念。五座桥梁自东向西依次对应五门学问：声明为语言文字之学，因明为逻辑思辨之学，居中的内明为核心佛学智慧，医方明为医药养生之学，工巧明涵盖技艺科技。走过五明桥，寓意摒弃浮躁、勤学修心、增益智慧。',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放免费通行',tips:'过桥寓意开启智慧走向觉悟'},
  'LS-003':{name:'佛足坛',category:'佛教文化',description:'佛祖真身足印青铜铸造，刻有32种吉祥瑞相。',detail:'佛足坛坐落于灵山胜境进门的朝圣道路上…',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'可亲手触摸足心吉祥图案寄托祈福心愿'},
  'LS-004':{name:'五智门',category:'历史文化',description:'高15.5m宽38.4m花岗岩石牌楼…',detail:'灵山胜境标志性建筑五智门…',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'夜间有灯光点缀'},
  'LS-005':{name:'菩提大道',category:'自然风光',description:'长约200米…',detail:'菩提大道是前往灵山大佛的必经之路…',avgStayMin:20,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'四季景致各异'},
  'LS-006':{name:'九龙灌浴',category:'佛教文化',description:'国内最大音乐动态青铜群雕…',detail:'灵山胜境闻名中外的九龙灌浴…',avgStayMin:25,crowdedness:4,ticketPrice:0,openingInfo:'场次10:00/11:30/13:30/15:00',tips:'建议提前10分钟到场'},
  'LS-007':{name:'降魔浮雕',category:'佛教文化',description:'花岗岩浮雕再现佛陀战胜魔王觉悟成佛的历程。',detail:'降魔浮雕坐落于前往大佛的山道石壁之上…',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'雕刻细节极为丰富'},
  'LS-008':{name:'阿育王柱',category:'历史文化',description:'高16.9米重200多吨整块花岗岩雕成…',detail:'眼前巍峨耸立的石柱便是灵山著名的阿育王柱…',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'与灵山大佛形成中轴线核心景观序列'},
  'LS-009':{name:'百子戏弥勒',category:'休闲娱乐',description:'重9吨青铜群雕…',detail:'百子戏弥勒坐落于阿育王柱广场旁…',avgStayMin:15,crowdedness:3,ticketPrice:0,openingInfo:'全天开放',tips:'可触摸弥勒佛肚皮'},
  'LS-010':{name:'祥符禅寺',category:'佛教文化',description:'唐贞观年间千年古刹…',detail:'祥符禅寺坐落于秦履峰半山腰…',avgStayMin:30,crowdedness:3,ticketPrice:0,openingInfo:'全天开放',tips:'钟楼定时有钟声表演'},
  'LS-011':{name:'灵山大佛',category:'佛教文化',description:'通高88米用铜725吨…',detail:'灵山大佛屹立在无锡马山秦履峰南侧…',avgStayMin:45,crowdedness:4,ticketPrice:210,openingInfo:'8:00-17:00',tips:'登顶抱佛脚俯瞰太湖全景'},
  'LS-012':{name:'佛教文化博览馆',category:'历史文化',description:'大佛基座内10000㎡…',detail:'佛教文化博览馆坐落于灵山大佛基座内部…',avgStayMin:40,crowdedness:2,ticketPrice:0,openingInfo:'8:00-17:00',tips:'免费讲解时段9:30/11:00/14:30/16:00'},
  'LS-013':{name:'灵山梵宫',category:'佛教文化',description:'72000㎡东方卢浮宫…',detail:'灵山梵宫毗邻灵山大佛…',avgStayMin:60,crowdedness:4,ticketPrice:0,openingInfo:'9:00-17:00',tips:'《灵山吉祥颂》演出每日10:35/11:30/14:00/16:00'},
  'LS-014':{name:'五印坛城',category:'佛教文化',description:'藏传佛教建筑…',detail:'五印坛城坐落于香水海中央…',avgStayMin:30,crowdedness:3,ticketPrice:0,openingInfo:'9:00-17:00',tips:'登顶观全景'},
  'LS-015':{name:'曼飞龙塔',category:'佛教文化',description:'南传佛教九塔组合白塔…',detail:'曼飞龙塔坐落在灵山梵宫东南侧…',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'夜间有灯光亮化'},
  'LS-016':{name:'无尽意斋',category:'历史文化',description:'赵朴初纪念馆…',detail:'无尽意斋坐落于灵山大佛西侧…',avgStayMin:20,crowdedness:1,ticketPrice:0,openingInfo:'9:00-17:00',tips:'免费禅茶品鉴'},
};

const POI_EXTENDED: Record<string, { story: string; highlights: string[]; visit: string }> = {
  'LS-001': { story: '这里是灵山胜境游线的序章…', highlights: ['赵朴初题写"灵山胜境"', '适合拍摄景区入口纪念照'], visit: '建议入园后先在照壁前停留5到10分钟。' },
  'LS-002': { story: '五明桥把游客从入口区引向佛教文化主轴…', highlights: ['五座汉白玉桥并列', '香水海水面开阔'], visit: '桥面平缓，适合慢行观景。' },
  'LS-003': { story: '佛足坛以佛足印作为礼敬对象…', highlights: ['青铜佛足印', '祈福互动感强'], visit: '可顺路衔接菩提大道。' },
  'LS-004': { story: '五智门是进入核心礼佛区的重要门户…', highlights: ['汉白玉牌坊造型', '中轴线仪式感'], visit: '适合站在门前中轴位置拍摄。' },
  'LS-005': { story: '菩提大道用树阵和步道构成过渡空间…', highlights: ['约250米禅意步道', '四季景致变化'], visit: '建议放慢脚步游览。' },
  'LS-006': { story: '九龙灌浴是灵山最具动态效果的景观之一…', highlights: ['定时动态表演', '可接取祈福圣水'], visit: '表演前10到15分钟到场。' },
  'LS-007': { story: '降魔浮雕把成道故事浓缩在石刻中…', highlights: ['花岗岩大型浮雕', '雕刻细节丰富'], visit: '适合边走边看。' },
  'LS-008': { story: '阿育王柱借鉴古印度佛教传播符号…', highlights: ['整块花岗岩雕成', '四狮柱头'], visit: '可与五智门、灵山大佛连成一组。' },
  'LS-009': { story: '百子戏弥勒以欢喜、亲近为主题…', highlights: ['弥勒佛卧姿群雕', '适合亲子拍照'], visit: '拍照后继续前往祥符禅寺方向。' },
  'LS-010': { story: '祥符禅寺承接小灵山古刹传统…', highlights: ['唐代古刹传承', '祥符禅钟'], visit: '入寺保持安静。' },
  'LS-011': { story: '灵山大佛是景区精神核心…', highlights: ['88米露天青铜大佛', '抱佛脚体验'], visit: '体力允许可登顶抱佛脚。' },
  'LS-012': { story: '佛教文化博览馆位于大佛座基内…', highlights: ['大佛座基展馆', '万佛殿'], visit: '雨天或高温时适合安排较长停留。' },
  'LS-013': { story: '灵山梵宫以宏大建筑展示佛教艺术…', highlights: ['72000平方米建筑', '吉祥颂演出'], visit: '建议预留至少1小时。' },
  'LS-014': { story: '五印坛城融合藏式建筑…', highlights: ['藏式坛城建筑', '转经筒祈福'], visit: '转经时顺时针行进。' },
  'LS-015': { story: '曼飞龙塔呈现南传佛教建筑风格…', highlights: ['九塔组合白塔', '南传佛教风格'], visit: '光线充足时白塔拍照效果更好。' },
  'LS-016': { story: '无尽意斋纪念赵朴初先生…', highlights: ['赵朴初纪念空间', '禅茶体验'], visit: '适合避开主景区人流后安静参观。' },
};

function getDetailImageFit(poiId: string) {
  return (poiId === 'LS-011' ? 'contain' : 'cover') as React.CSSProperties['objectFit'];
}

function getDetailImagePosition(poiId: string) {
  const map: Record<string, string> = {
    'LS-006': 'center center', 'LS-010': 'center center', 'LS-011': 'center center',
    'LS-013': 'center center', 'LS-014': 'center center',
  };
  return map[poiId] || 'center center';
}

function ImageCarousel({ images, poiName, poiId }: { images: string[]; poiName: string; poiId: string }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [current, setCurrent] = useState(0);
  const thumbRef = useRef<HTMLDivElement>(null);
  const total = images.length;

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= total || idx === current) return;
    setCurrent(idx);
    if (thumbRef.current) {
      const child = thumbRef.current.children[idx] as HTMLElement;
      if (child) child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  return (
    <div style={{ borderRadius: isMobile ? 18 : 24, overflow: 'hidden', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,136,100,0.10)', padding: isMobile ? 10 : 16 }}>
      <div style={{ position: 'relative', borderRadius: isMobile ? 14 : 18, overflow: 'hidden', background: '#F2EBDA' }}>
        <div style={{ overflow: 'hidden', width: '100%', height: isMobile ? 280 : 570 }}>
          <div style={{
            display: 'flex', width: `${total * 100}%`, height: '100%',
            transform: `translateX(-${(current / total) * 100}%)`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}>
            {images.map((src, i) => (
              <div key={i} style={{ width: `${100 / total}%`, height: '100%', flexShrink: 0 }}>
                <img src={src} alt={`${poiName} ${i + 1}`}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: getDetailImageFit(poiId),
                    objectPosition: getDetailImagePosition(poiId),
                    background: '#F2EBDA', display: 'block',
                  }}
                  onError={e => { (e.target as HTMLImageElement).style.background = '#F2EBDA'; }}
                />
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => goTo(current - 1)} disabled={current === 0}
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '50%', border: 'none',
            background: 'rgba(61,44,42,0.55)', color: '#fff', fontSize: 18,
            cursor: current === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: current === 0 ? 0.3 : 1,
          }}>‹</button>
        <button onClick={() => goTo(current + 1)} disabled={current >= total - 1}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '50%', border: 'none',
            background: 'rgba(61,44,42,0.55)', color: '#fff', fontSize: 18,
            cursor: current >= total - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: current >= total - 1 ? 0.3 : 1,
          }}>›</button>
        <div style={{
          position: 'absolute', bottom: 12, right: 16,
          padding: '3px 12px', borderRadius: 20,
          background: 'rgba(61,44,42,0.55)', backdropFilter: 'blur(4px)',
          fontSize: '0.75rem', color: '#fff',
        }}>{current + 1} / {total}</div>
      </div>
      <div ref={thumbRef} style={{
        display: 'flex', gap: 8, marginTop: 10, padding: '4px 0',
        overflowX: 'auto', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch',
      }}>
        {images.map((src, i) => (
          <img key={i} src={src} alt={`${poiName} thumb ${i + 1}`}
            onClick={() => goTo(i)}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{
              width: isMobile ? 64 : 80, height: isMobile ? 44 : 56, borderRadius: 10,
              objectFit: getDetailImageFit(poiId), objectPosition: getDetailImagePosition(poiId),
              background: '#F2EBDA', flexShrink: 0,
              cursor: 'pointer', opacity: i === current ? 1 : 0.4,
              border: i === current ? '2px solid #8B6E57' : '2px solid transparent',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PoiDetailPage({ poiId, onNavigate }: { poiId: string; onNavigate?: (page: string, poiId?: string) => void }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const poiData = ALL_POIS_DATA[poiId];
  const [showAll, setShowAll] = useState(false);
  if (!poiData) return <div className="empty-state"><span className="empty-state__text">景点不存在</span></div>;

  const poi = { ...poiData, poiId };
  const extended = POI_EXTENDED[poiId];
  const images = [1, 2, 3].map(i => getPoiWebp(poiId, i)).filter(Boolean);

  const badge = (l: number) => {
    if (l <= 2) return { bg:'#dcfce7', text:'#166534', label:'畅通' };
    if (l <= 3) return { bg:'#fef3c7', text:'#92400e', label:'适中' };
    return { bg:'#fee2e2', text:'#991b1b', label:'拥挤' };
  };
  const b = badge(poi.crowdedness);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => onNavigate?.('pois')} className="btn btn-sm btn-secondary" style={{ marginBottom: 16, fontSize:'0.7rem', padding:'4px 14px' }}>
        ← 返回景点列表
      </button>

      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 14 : 24 }}>
        <div style={{ flex: isMobile ? 'none' : '0 0 55%', display:'flex', flexDirection:'column', gap: isMobile ? 12 : 16 }}>
          <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:8 }}>详细介绍</div>
            <p style={{ fontSize: isMobile ? '0.82rem' : '0.95rem', color:'rgba(61,44,42,0.65)', lineHeight:1.9 }}>
              {showAll ? poi.detail : poi.detail.slice(0, isMobile ? 80 : 120) + (poi.detail.length > (isMobile ? 80 : 120) ? '...' : '')}
            </p>
            {poi.detail.length > (isMobile ? 80 : 120) && (
              <button className="btn-text" onClick={() => setShowAll(!showAll)} style={{ marginTop:8 }}>
                {showAll ? '收起' : '展开全部'}
              </button>
            )}
          </div>
          {extended && (
            <>
              <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
                <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:8 }}>文化解读</div>
                <p style={{ fontSize: '0.82rem', color:'rgba(61,44,42,0.62)', lineHeight:1.85 }}>{extended.story}</p>
              </div>
              <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
                <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:10 }}>核心看点</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:8 }}>
                  {extended.highlights.map((item, i) => (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:'0.78rem', color:'rgba(61,44,42,0.62)', lineHeight:1.6 }}>
                      <span style={{ width:20, height:20, borderRadius:'50%', background:'rgba(180,136,100,0.12)', color:'#8B6E57', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.62rem', flexShrink:0 }}>{i + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
                <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:8 }}>游览建议</div>
                <p style={{ fontSize:'0.8rem', color:'rgba(61,44,42,0.62)', lineHeight:1.8 }}>{extended.visit}</p>
              </div>
            </>
          )}
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', gap: isMobile ? 10 : 14 }}>
          <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 14 : 20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <h1 style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif" }}>{poi.name}</h1>
            <span style={{ fontSize:'0.65rem', padding:'2px 10px', borderRadius:9999, background:'rgba(180,136,100,0.08)', color:'#8B6E57' }}>{poi.category}</span>
          </div>

          <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 12 : 16, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#8B6E57', marginBottom:10 }}>实用信息</div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap:8, fontSize:'0.72rem' }}>
              <div style={{ padding:'8px 10px', borderRadius:10, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ color:'rgba(61,44,42,0.4)', marginBottom:2 }}>开放时间</div>
                <div style={{ fontWeight:600, color:'#3D2C2A' }}>{poi.openingInfo}</div>
              </div>
              <div style={{ padding:'8px 10px', borderRadius:10, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ color:'rgba(61,44,42,0.4)', marginBottom:2 }}>游览时长</div>
                <div style={{ fontWeight:600, color:'#3D2C2A' }}>约 {poi.avgStayMin} 分钟</div>
              </div>
              <div style={{ padding:'8px 10px', borderRadius:10, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ color:'rgba(61,44,42,0.4)', marginBottom:2 }}>门票</div>
                <div style={{ fontWeight:600, color:poi.ticketPrice > 0 ? '#f59e0b' : '#22c55e' }}>
                  {poi.ticketPrice > 0 ? `¥${poi.ticketPrice}` : '免费'}
                </div>
              </div>
              <div style={{ padding:'8px 10px', borderRadius:10, background:'rgba(180,136,100,0.06)' }}>
                <div style={{ color:'rgba(61,44,42,0.4)', marginBottom:2 }}>拥挤度</div>
                <div style={{ fontWeight:600, color:b.text }}>{b.label} {poi.crowdedness}/5</div>
              </div>
            </div>
          </div>

          <div style={{ borderRadius: isMobile ? 16 : 20, padding: isMobile ? 12 : 16, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#8B6E57', marginBottom:6 }}>游览小贴士</div>
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ fontSize:'0.85rem' }}>💡</span>
              <span style={{ fontSize:'0.72rem', color:'rgba(61,44,42,0.55)', lineHeight:1.6 }}>{poi.tips}</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-secondary" onClick={() => onNavigate?.('route', poiId)} style={{ flex:1, padding:'10px 16px', fontSize:'0.8rem' }}>📍 导航到这里</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: isMobile ? 14 : 20 }}>
        <ImageCarousel images={images} poiName={poi.name} poiId={poiId} />
      </div>
    </div>
  );
}