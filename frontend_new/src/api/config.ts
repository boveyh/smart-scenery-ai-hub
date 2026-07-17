/**
 * API 配置文件
 * 智慧景区导览系统 v2.0
 *
 * 后端服务端口：
 * - Java 后端（主要 REST API）：localhost:9000
 * - Python AI 引擎（数字人流式接口）：localhost:8000
 * - 开发时通过 Vite proxy 转发 /api -> 9000
 */

// 默认租户 ID
export const DEFAULT_TENANT_ID = 'ling_shan';

// 后端基础地址（Vite proxy 会将 /api 转发到 Java 后端 :9000）
export const API_BASE = '/api/v1';

// AI 引擎地址（数字人流式接口，直连 Python :8000）
export const AI_ENGINE_BASE = 'http://localhost:8000';

// 高德地图天气 API — 灵山胜境位于无锡市滨湖区马山镇
export const AMAP_WEATHER_KEY = import.meta.env.VITE_AMAP_KEY || '6f4379a49d50b370c389a365e407f49f';
export const AMAP_WEATHER_URL = 'https://restapi.amap.com/v3/weather/weatherInfo';
export const LINGSHAN_CITY = '无锡';

// WebSocket 地址（极速文本模式）
export function getWsUrl(tenantId: string, sessionId: string): string {
  return `ws://localhost:9000/ws/chat?tenant_id=${tenantId}&session_id=${sessionId}&mode=text`;
}

// 请求头
export function getHeaders(tenantId?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }
  return headers;
}
