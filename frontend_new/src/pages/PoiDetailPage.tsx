import React, { useState, useRef } from 'react';
import { getPoiWebp } from '@/map/lingshanAssets';

const POI_IDS = ['LS-001','LS-002','LS-003','LS-004','LS-005','LS-006','LS-007','LS-008','LS-009','LS-010','LS-011','LS-012','LS-013','LS-014','LS-015','LS-016'];

const ALL_POIS_DATA: Record<string, any> = {
  'LS-001':{name:'灵山大照壁',category:'历史文化',description:'长39.8m高7m青石雕刻，赵朴初题写鎏金"灵山胜境"四字，被誉为华夏第一壁。',detail:'灵山大照壁位于景区入口处，面朝太湖，长39.8米高7米，采用优质青石雕刻而成。赵朴初先生亲笔题写鎏金"灵山胜境"四字，北立面刻有赵老诗作《小灵山》。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'适合打卡合影、拍摄湖光壁影同框美景'},
  'LS-002':{name:'五明桥',category:'历史文化',description:'五座汉白玉石拱桥横跨香水海，代表佛教五种智慧。',detail:'五明桥位于大照壁北侧，由5座汉白玉石拱桥组成。代表佛教五种核心智慧：声明、因明、内明、医方明、工巧明。',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放免费通行',tips:'桥面宽阔平坦，适合漫步过桥体悟五明智慧'},
  'LS-003':{name:'佛足坛',category:'佛教文化',description:'巨型青铜佛足印，刻有32种吉祥瑞相。',detail:'佛足坛位于菩提大道起点，巨型佛足印一对，每只长1.2米宽0.6米，整块青铜铸造。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'可亲手触摸足心吉祥图案寄托祈福心愿'},
  'LS-004':{name:'五智门',category:'历史文化',description:'高16.8m宽35m汉白玉牌坊，五门六柱象征五方五佛与六度波罗蜜。',detail:'五智门为五门六柱汉白玉石牌坊造型。五门象征五方五佛，六柱代表六度波罗蜜。',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'夜间有灯光点缀，是进入核心景区的标志性门户'},
  'LS-005':{name:'菩提大道',category:'自然风光',description:'长约250米，两侧近百棵印度菩提树形成天然拱廊。',detail:'菩提大道两侧近百棵印度菩提树，形成天然禅意拱廊。象征佛陀悟道历程。',avgStayMin:20,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'四季景致各异，春季赏菩提花夏季避暑'},
  'LS-006':{name:'九龙灌浴',category:'佛教文化',description:'总高27.2米鎏金太子佛，表演时莲花绽放九龙喷水。',detail:'九龙灌浴总高27.2米，鎏金太子佛高7.2米重12吨，耗铜180吨。再现佛陀诞生祥瑞。',avgStayMin:25,crowdedness:4,ticketPrice:0,openingInfo:'场次10:00/11:30/13:30/15:00',tips:'建议提前10分钟到场，表演后可接取祈福圣水'},
  'LS-007':{name:'降魔浮雕',category:'佛教文化',description:'长26m高4.6m花岗岩浮雕，再现佛陀战胜魔王成道历程。',detail:'降魔浮雕整块花岗岩雕刻，再现佛陀战胜魔王波旬觉悟成佛的历程。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'雕刻细节极为丰富，建议细细品味'},
  'LS-008':{name:'阿育王柱',category:'历史文化',description:'通高16.9m重180吨整块花岗岩雕成，四狮柱头。',detail:'阿育王柱通高16.9米重180吨整块花岗岩雕成。柱头四狮朝向四方。',avgStayMin:10,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'与灵山大佛、五智门形成中轴线核心景观序列'},
  'LS-009':{name:'百子戏弥勒',category:'休闲娱乐',description:'重9吨青铜群雕，弥勒佛卧姿笑容满面。',detail:'百子戏弥勒高3米宽7.8米重9吨，弥勒佛卧姿袒胸露腹，百名孩童形态各异。',avgStayMin:15,crowdedness:3,ticketPrice:0,openingInfo:'全天开放',tips:'可触摸弥勒佛肚皮，寓意"摸弥勒肚皮，享一生福气"'},
  'LS-010':{name:'祥符禅寺',category:'佛教文化',description:'唐贞观年间千年古刹，悬挂12.8吨祥符禅钟。',detail:'祥符禅寺为唐代古刹占地约30亩。寺内有六角井、千年古银杏等遗迹。',avgStayMin:30,crowdedness:3,ticketPrice:0,openingInfo:'全天开放',tips:'钟楼定时有钟声表演，千年古银杏秋季金黄'},
  'LS-011':{name:'灵山大佛',category:'佛教文化',description:'通高88米用铜725吨，世界最高露天青铜释迦牟尼立像。',detail:'灵山大佛通高88米，用铜725吨，1560块铜壁板。右手施无畏印，左手施与愿印。',avgStayMin:45,crowdedness:4,ticketPrice:210,openingInfo:'8:00-17:00',tips:'登顶抱佛脚俯瞰太湖全景，夕阳西下时最美'},
  'LS-012':{name:'佛教文化博览馆',category:'历史文化',description:'大佛座基内10000㎡，三层展厅含万佛殿。',detail:'佛教文化博览馆设于大佛座基内，三层10000㎡。万佛殿9999尊小佛。',avgStayMin:40,crowdedness:2,ticketPrice:0,openingInfo:'8:00-17:00',tips:'免费讲解时段9:30/11:00/14:30/16:00，可领取祈福卡'},
  'LS-013':{name:'灵山梵宫',category:'佛教文化',description:'建筑面积72000㎡造价18亿，被誉为东方卢浮宫。',detail:'灵山梵宫72000㎡造价18亿，五座莲花圣塔。汇集东阳木雕、琉璃等传统工艺。',avgStayMin:60,crowdedness:4,ticketPrice:0,openingInfo:'9:00-17:00',tips:'《灵山吉祥颂》演出每日10:35/11:30/14:00/16:00'},
  'LS-014':{name:'五印坛城',category:'佛教文化',description:'藏式碉楼有布达拉宫之称，壁画1500㎡手工绘制。',detail:'五印坛城五层重檐高30米占地5000㎡，藏式风格有"小布达拉宫"之称。',avgStayMin:30,crowdedness:3,ticketPrice:0,openingInfo:'9:00-17:00',tips:'藏香制作体验需预约，10:00和14:00各一场'},
  'LS-015':{name:'曼飞龙塔',category:'佛教文化',description:'南传佛教九塔组合白塔，复刻西双版纳曼飞龙塔。',detail:'曼飞龙塔主塔高16.9米，九塔白色花岗岩鎏金塔刹。南传佛教建筑风格。',avgStayMin:15,crowdedness:2,ticketPrice:0,openingInfo:'全天开放',tips:'夜间有灯光亮化，塔身轮廓被点亮夜景绝美'},
  'LS-016':{name:'无尽意斋',category:'历史文化',description:'赵朴初纪念馆，四合院风格复刻故居，免费禅茶。',detail:'无尽意斋占地600㎡，复刻赵朴初北京故居。设生平事迹厅、书法作品厅。',avgStayMin:20,crowdedness:1,ticketPrice:0,openingInfo:'9:00-17:00',tips:'免费禅茶品鉴，禁止触摸书法作品和闪光灯拍照'},
};

// ─── 图片轮播组件 ────────────────────────────────────
function ImageCarousel({ images, poiName }: { images: string[]; poiName: string }) {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState(0);
  const thumbRef = useRef<HTMLDivElement>(null);
  const total = images.length;

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= total || idx === current) return;
    setAnimDir(idx > current ? 1 : -1);
    setCurrent(idx);
    // Auto-scroll thumbnails
    if (thumbRef.current) {
      const child = thumbRef.current.children[idx] as HTMLElement;
      if (child) child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  return (
    <div style={{ borderRadius: 24, overflow: 'hidden', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,136,100,0.10)', padding: 16 }}>
      {/* 主大图容器 — 单图显示 */}
      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#F2EBDA' }}>
        <div style={{ overflow: 'hidden', width: '100%', height: 570 }}>
          <div style={{
            display: 'flex', width: `${total * 100}%`, height: '100%',
            transform: `translateX(-${(current / total) * 100}%)`,
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}>
            {images.map((src, i) => (
              <div key={i} style={{ width: `${100 / total}%`, height: '100%', flexShrink: 0 }}>
                <img src={src} alt={`${poiName} ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.background = '#F2EBDA'; }}
                />
              </div>
            ))}
          </div>
        </div>
        {/* 左右箭头 */}
        <button onClick={prev} disabled={current === 0}
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: current === 0 ? 'rgba(61,44,42,0.15)' : 'rgba(61,44,42,0.55)',
            color: current === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 18, cursor: current === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', backdropFilter: 'blur(4px)',
          }}>‹</button>
        <button onClick={next} disabled={current >= total - 1}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: current >= total - 1 ? 'rgba(61,44,42,0.15)' : 'rgba(61,44,42,0.55)',
            color: current >= total - 1 ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 18, cursor: current >= total - 1 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', backdropFilter: 'blur(4px)',
          }}>›</button>
        {/* 页码 */}
        <div style={{
          position: 'absolute', bottom: 12, right: 16,
          padding: '3px 12px', borderRadius: 20,
          background: 'rgba(61,44,42,0.55)', backdropFilter: 'blur(4px)',
          fontSize: '0.75rem', color: '#fff',
        }}>{current + 1} / {total}</div>
      </div>

      {/* 缩略图栏 */}
      <div ref={thumbRef} style={{
        display: 'flex', gap: 8, marginTop: 10, padding: '4px 0',
        overflowX: 'auto', scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
      }}>
        {images.map((src, i) => (
          <img key={i} src={src} alt={`${poiName} thumb ${i + 1}`}
            onClick={() => goTo(i)}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{
              width: 80, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
              cursor: 'pointer', opacity: i === current ? 1 : 0.4,
              border: i === current ? '2px solid #8B6E57' : '2px solid transparent',
              transition: 'all 0.25s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PoiDetailPage({ poiId, onNavigate }: { poiId: string; onNavigate?: (page: string) => void }) {
  const poiData = ALL_POIS_DATA[poiId];
  const [showAll, setShowAll] = useState(false);
  if (!poiData) return <div className="empty-state"><span className="empty-state__text">景点不存在</span></div>;

  const poi = { ...poiData, poiId };
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

      <div style={{ display:'flex', gap: 24 }}>
        {/* 左栏 55% — 详细介绍 */}
        <div style={{ flex:'0 0 55%', display:'flex', flexDirection:'column', gap: 16 }}>
          <div style={{ borderRadius:20, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', color:'#8B6E57', marginBottom:8 }}>详细介绍</div>
            <p style={{ fontSize:'0.85rem', color:'rgba(61,44,42,0.6)', lineHeight:1.8 }}>
              {showAll ? poi.detail : poi.detail.slice(0, 120) + (poi.detail.length > 120 ? '...' : '')}
            </p>
            {poi.detail.length > 120 && (
              <button className="btn-text" onClick={() => setShowAll(!showAll)} style={{ marginTop:8 }}>
                {showAll ? '收起' : '展开全部'}
              </button>
            )}
          </div>
        </div>

        {/* 右栏 45% — 信息卡片 */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ borderRadius:20, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <h1 style={{ fontSize:'1.3rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif" }}>{poi.name}</h1>
            </div>
            <span style={{ fontSize:'0.65rem', padding:'2px 10px', borderRadius:9999, background:'rgba(180,136,100,0.08)', color:'#8B6E57' }}>{poi.category}</span>
          </div>

          <div style={{ borderRadius:20, padding:16, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#8B6E57', marginBottom:10 }}>实用信息</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:'0.72rem' }}>
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

          <div style={{ borderRadius:20, padding:16, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#8B6E57', marginBottom:6 }}>游览小贴士</div>
            <div style={{ display:'flex', gap:6 }}>
              <span style={{ fontSize:'0.85rem' }}>💡</span>
              <span style={{ fontSize:'0.72rem', color:'rgba(61,44,42,0.55)', lineHeight:1.6 }}>{poi.tips}</span>
            </div>
          </div>

          <div style={{ borderRadius:20, padding:16, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
            <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#8B6E57', marginBottom:8 }}>拥挤度</div>
            <div style={{ height:8, borderRadius:4, background:'rgba(180,136,100,0.10)', overflow:'hidden' }}>
              <div style={{ width:`${(poi.crowdedness/5)*100}%`, height:'100%', borderRadius:4, background:poi.crowdedness <= 2 ? '#22c55e' : poi.crowdedness <= 3 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', color:'rgba(61,44,42,0.3)', marginTop:2 }}>
              <span>畅通</span><span>适中</span><span>拥挤</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-primary" style={{ flex:1, padding:'10px 16px', fontSize:'0.8rem' }}>🎧 AI 讲解</button>
            <button className="btn btn-secondary" style={{ flex:1, padding:'10px 16px', fontSize:'0.8rem' }}>📍 导航到这里</button>
          </div>
        </div>
      </div>

      {/* 底部：图片轮播 */}
      <div style={{ marginTop: 20 }}>
        <ImageCarousel images={images} poiName={poi.name} />
      </div>
    </div>
  );
}
