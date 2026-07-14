import React, { useState } from 'react';

const ALL_POIS = [
  { poiId: 'LS-001', name: '灵山大照壁', category: '历史文化', description: '长39.8m高7m青石雕刻，赵朴初题写鎏金"灵山胜境"四字，被誉为华夏第一壁。', avgStayMin: 15, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-001.jpg' },
  { poiId: 'LS-002', name: '五明桥', category: '历史文化', description: '五座汉白玉石拱桥横跨香水海，代表佛教声明、因明等五种智慧。', avgStayMin: 10, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-002.jpg' },
  { poiId: 'LS-003', name: '佛足坛', category: '佛教文化', description: '巨型青铜佛足印，刻有32种吉祥瑞相，象征"佛足所至，佛光普照"。', avgStayMin: 15, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-003.jpg' },
  { poiId: 'LS-004', name: '五智门', category: '历史文化', description: '高16.8m宽35m汉白玉牌坊，五门六柱象征五方五佛与六度波罗蜜。', avgStayMin: 10, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-004.jpg' },
  { poiId: 'LS-005', name: '菩提大道', category: '自然风光', description: '长约250米，两侧近百棵印度菩提树形成天然拱廊，四季景致各异。', avgStayMin: 20, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-005.jpg' },
  { poiId: 'LS-006', name: '九龙灌浴', category: '佛教文化', description: '总高27.2米鎏金太子佛，表演时莲花绽放九条飞龙喷水，再现佛陀诞生祥瑞。', avgStayMin: 25, crowdedness: 4, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-006.jpg' },
  { poiId: 'LS-007', name: '降魔浮雕', category: '佛教文化', description: '长26m高4.6m花岗岩浮雕，生动再现佛陀战胜魔王成道历程。', avgStayMin: 15, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-007.jpg' },
  { poiId: 'LS-008', name: '阿育王柱', category: '历史文化', description: '通高16.9m重180吨整块花岗岩雕成，四狮柱头象征佛法广传四方。', avgStayMin: 10, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-008.jpg' },
  { poiId: 'LS-009', name: '百子戏弥勒', category: '休闲娱乐', description: '重9吨青铜群雕，弥勒佛卧姿笑容满面，百名孩童形态各异生动活泼。', avgStayMin: 15, crowdedness: 3, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-009.jpg' },
  { poiId: 'LS-010', name: '祥符禅寺', category: '佛教文化', description: '唐贞观年间千年古刹，寺内六角古井千年银杏，悬挂12.8吨祥符禅钟。', avgStayMin: 30, crowdedness: 3, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-010.jpg' },
  { poiId: 'LS-011', name: '灵山大佛', category: '佛教文化', description: '通高88米用铜725吨，世界最高露天青铜释迦牟尼立像，登顶可抱佛脚。', avgStayMin: 45, crowdedness: 4, ticketPrice: 210, image: '/assets/scenic/lingshan/ls-011.jpg' },
  { poiId: 'LS-012', name: '佛教文化博览馆', category: '历史文化', description: '大佛座基内10000㎡，三层展厅含万佛殿9999尊小佛，免费参观。', avgStayMin: 40, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-012.jpg' },
  { poiId: 'LS-013', name: '灵山梵宫', category: '佛教文化', description: '建筑面积72000㎡造价18亿，被誉为东方卢浮宫，世界佛教论坛永久会址。', avgStayMin: 60, crowdedness: 4, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-013.jpg' },
  { poiId: 'LS-014', name: '五印坛城', category: '佛教文化', description: '藏式碉楼风格有布达拉宫之称，壁画1500㎡手工绘制，转经筒祈福。', avgStayMin: 30, crowdedness: 3, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-014.jpg' },
  { poiId: 'LS-015', name: '曼飞龙塔', category: '佛教文化', description: '南传佛教九塔组合白塔，复刻云南西双版纳曼飞龙白塔，异域风情。', avgStayMin: 15, crowdedness: 2, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-015.jpg' },
  { poiId: 'LS-016', name: '无尽意斋', category: '历史文化', description: '赵朴初纪念馆，北京四合院风格复刻故居，茶室免费提供灵山禅茶。', avgStayMin: 20, crowdedness: 1, ticketPrice: 0, image: '/assets/scenic/lingshan/ls-016.jpg' },
];

const POI_ICONS: Record<string, string> = {
  '佛教文化': '🪷',
  '历史文化': '🏛️',
  '自然风光': '🏔️',
  '休闲娱乐': '🎭',
};

export default function PoiListPage({ onNavigate }: { onNavigate?: (poiId: string) => void }) {
  const [category, setCategory] = useState('全部');

  const categories = ['全部', ...new Set(ALL_POIS.map(p => p.category))];
  const filtered = category === '全部' ? ALL_POIS : ALL_POIS.filter(p => p.category === category);

  const getCrowdednessBadge = (level: number) => {
    if (level <= 1) return { bg: '#dcfce7', text: '#166534', label: '畅通' };
    if (level <= 2) return { bg: '#dcfce7', text: '#166534', label: '畅通' };
    if (level <= 3) return { bg: '#fef3c7', text: '#92400e', label: '适中' };
    return { bg: '#fee2e2', text: '#991b1b', label: '拥挤' };
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* 标题栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, paddingBottom: 14,
        borderBottom: '2px solid rgba(180,136,100,0.15)',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif", display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📍</span> 灵山胜境 · 景点列表
        </h2>
        <span style={{
          fontSize: '0.75rem', color: '#8B6E57', padding: '4px 12px', borderRadius: 9999,
          background: 'rgba(180,136,100,0.08)',
        }}>
          共 {filtered.length} 个景点
        </span>
      </div>

      {/* 分类筛选 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
              border: category === cat ? 'none' : '1px solid rgba(180,136,100,0.12)',
              background: category === cat ? '#3D2C2A' : 'rgba(255,255,255,0.4)',
              color: category === cat ? '#F7F2E6' : '#8B6E57',
              cursor: 'pointer', transition: 'all 150ms',
              fontFamily: "'Noto Sans SC',sans-serif",
            }}>
            {cat === '全部' ? '🏯 全部' : `${POI_ICONS[cat] || ''} ${cat}`}
          </button>
        ))}
      </div>

      {/* 网格卡片布局 */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: 60 }}><span className="empty-state__text">暂无该分类的景点</span></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {filtered.map(poi => {
            const badge = getCrowdednessBadge(poi.crowdedness);
            return (
              <div key={poi.poiId} onClick={() => onNavigate?.(poi.poiId)} style={{
                borderRadius: 18, overflow: 'hidden',
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(180,136,100,0.08)',
                boxShadow: '0 1px 4px rgba(61,44,42,0.03)',
                cursor: 'pointer', transition: 'all 200ms',
              }}>
                <img src={poi.image} alt={poi.name}
                  style={{
                    width: '100%', height: 130, objectFit: 'cover', display: 'block',
                    borderBottom: '1px solid rgba(180,136,100,0.06)',
                  }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3D2C2A' }}>{poi.name}</h3>
                    <span style={{
                      fontSize: '0.6rem', padding: '2px 8px', borderRadius: 9999,
                      background: badge.bg, color: badge.text, fontWeight: 500,
                    }}>{badge.label} {poi.crowdedness}/5</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 8px', borderRadius: 10,
                      background: 'rgba(180,136,100,0.08)', color: '#8B6E57',
                    }}>{poi.category}</span>
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 8px', borderRadius: 10,
                      background: 'rgba(61,44,42,0.04)', color: 'rgba(61,44,42,0.4)',
                    }}>⏱ {poi.avgStayMin}分钟</span>
                    {poi.ticketPrice > 0 && (
                      <span style={{
                        fontSize: '0.6rem', padding: '1px 8px', borderRadius: 10,
                        background: '#fef3c7', color: '#92400e',
                      }}>¥{poi.ticketPrice}</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(61,44,42,0.5)', lineHeight: 1.6 }}>
                    {poi.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
