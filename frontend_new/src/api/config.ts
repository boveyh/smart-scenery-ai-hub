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
export const DEFAULT_TENANT_ID = 'west_lake';

// 后端基础地址（Vite proxy 会将 /api 转发到 Java 后端 :9000）
export const API_BASE = '/api/v1';

// AI 引擎地址（数字人流式接口，直连 Python :8000）
export const AI_ENGINE_BASE = 'http://localhost:8000';

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
