/**
 * 灵山胜境 16 个 POI 的图片映射
 * webp 文件命名规则: {景点中文名}{序号}.webp
 */

export const POI_NAME_TO_ID: Record<string, string> = {
  '灵山大照壁': 'LS-001',
  '五明桥': 'LS-002',
  '佛足坛': 'LS-003',
  '五智门': 'LS-004',
  '菩提大道': 'LS-005',
  '九龙灌浴': 'LS-006',
  '降魔浮雕': 'LS-007',
  '阿育王柱': 'LS-008',
  '百子戏弥勒': 'LS-009',
  '祥符禅寺': 'LS-010',
  '灵山大佛': 'LS-011',
  '佛教文化博览馆': 'LS-012',
  '灵山梵宫': 'LS-013',
  '五印坛城': 'LS-014',
  '曼飞龙塔': 'LS-015',
  '无尽意斋': 'LS-016',
};

export const POI_ID_TO_NAME: Record<string, string> = {};
Object.entries(POI_NAME_TO_ID).forEach(([name, id]) => { POI_ID_TO_NAME[id] = name; });

/**
 * 获取景点 webp 图片路径（返回首张图）
 */
export function getPoiWebp(poiId: string, index: number = 1): string {
  const name = POI_ID_TO_NAME[poiId];
  if (!name) return '';
  return `/assets/scenic/lingshan-webp/${name}${index}.webp`;
}
