import { WALK_PATHS, DRIVE_PATHS, PathMap } from './scenicRouteData';

/**
 * 判断两点是否都在灵山景区内（使用 SPOTS 中的 id 判断）
 */
export function isLingshanSegment(fromId: string, toId: string): boolean {
  const lingshanIds = [
    'LS-001','LS-002','LS-003','LS-004','LS-005','LS-006',
    'LS-007','LS-008','LS-009','LS-010','LS-011','LS-012',
    'LS-013','LS-014','LS-015','LS-016',
  ];
  return lingshanIds.includes(fromId) && lingshanIds.includes(toId);
}

/**
 * 获取景区内部预设路线坐标
 * 
 * @param fromId 起点 POI ID (eg. 'LS-001')
 * @param toId   终点 POI ID (eg. 'LS-011')
 * @param mode   出行模式 'walk' | 'drive'
 * @returns 坐标点数组，不存在则返回 null
 */
export function getScenicPath(
  fromId: string,
  toId: string,
  mode: 'walk' | 'drive'
): [number, number][] | null {
  const key1 = `${fromId}_${toId}`;
  const key2 = `${toId}_${fromId}`;

  const routeMap: PathMap = mode === 'walk' ? WALK_PATHS : DRIVE_PATHS;

  // 正向查找
  if (routeMap[key1]) return [...routeMap[key1]];
  // 反向查找（翻转坐标）
  if (routeMap[key2]) return [...routeMap[key2]].reverse();

  return null;
}

/**
 * 生成两点之间的插值路径（当本地坐标缺失且高德无返回时 fallback）
 * 使用 20 个插值点，路径比直线略弯曲以适配地图视觉
 */
export function generateFallbackPath(
  from: [number, number],
  to: [number, number],
  steps: number = 20
): [number, number][] {
  const path: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // 轻微正弦偏移使路径略微弯曲，避免看起来像几何直线
    const offset = Math.sin(t * Math.PI) * 0.00008;
    path.push([
      from[0] + (to[0] - from[0]) * t + offset * (to[1] - from[1]),
      from[1] + (to[1] - from[1]) * t + offset * (from[0] - to[0]),
    ]);
  }
  return path;
}

/**
 * 计算两点间距离（米）
 */
export function calcGeoDistance(
  p1: [number, number],
  p2: [number, number]
): number {
  const R = 6371000;
  const dLat = (p2[1] - p1[1]) * Math.PI / 180;
  const dLng = (p2[0] - p1[0]) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1[1] * Math.PI / 180) *
      Math.cos(p2[1] * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
