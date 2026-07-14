/**
 * HTTP API 客户端
 * 封装所有 RESTful 接口调用（对齐 API 文档 v2.0 §4）
 */
import { API_BASE, AI_ENGINE_BASE, getHeaders, DEFAULT_TENANT_ID } from './config';
import type {
  ApiResponse,
  PoiItem,
  RouteRecommendRequest,
  RouteRecommendResult,
  VisionRecognizeResult,
  RealtimeInfo,
  OfflineKnowledge,
  DigitalHumanRequest,
  DigitalHumanChunk,
  MonitorMetrics,
  AdminDashboard,
  KnowledgeChunkItem,
  FaqItem,
  DigitalHumanConfigItem,
  TenantItem,
} from './types';

class ApiClient {
  private tenantId: string;

  constructor(tenantId: string = DEFAULT_TENANT_ID) {
    this.tenantId = tenantId;
  }

  setTenantId(id: string) {
    this.tenantId = id;
  }

  private async request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(this.tenantId),
        ...options?.headers,
      },
    });
    return res.json();
  }

  // ===== 4.1 获取景点POI列表 =====
  async getPois(lat?: number, lng?: number): Promise<ApiResponse<PoiItem[]>> {
    const params = new URLSearchParams();
    if (lat !== undefined) params.set('lat', String(lat));
    if (lng !== undefined) params.set('lng', String(lng));
    const qs = params.toString();
    return this.request<PoiItem[]>(`${API_BASE}/pois${qs ? '?' + qs : ''}`);
  }

  // ===== 4.2 个性化游览路线推荐 =====
  async recommendRoute(req: RouteRecommendRequest): Promise<ApiResponse<RouteRecommendResult>> {
    return this.request<RouteRecommendResult>(`${API_BASE}/route/recommend`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // ===== 4.3 拍照识物 =====
  async recognizeImage(image: Blob, question?: string): Promise<ApiResponse<VisionRecognizeResult>> {
    const formData = new FormData();
    formData.append('image', image, 'photo.jpg');
    if (question) formData.append('question', question);

    const res = await fetch(`${API_BASE}/vision/recognize`, {
      method: 'POST',
      headers: { 'X-Tenant-Id': this.tenantId },
      body: formData,
    });
    return res.json();
  }

  // ===== 4.4 实时资讯 =====
  async getRealtimeInfo(): Promise<ApiResponse<RealtimeInfo>> {
    return this.request<RealtimeInfo>(`${API_BASE}/info/realtime`);
  }

  // ===== 4.5 离线知识库 =====
  async getOfflineKnowledge(): Promise<ApiResponse<OfflineKnowledge>> {
    return this.request<OfflineKnowledge>(`${API_BASE}/knowledge/offline`);
  }

  // ===== 健康检查 =====
  async healthCheck(): Promise<{ status: string; model: string; tts_dir: string; timestamp: number }> {
    const res = await fetch(`${AI_ENGINE_BASE}/api/v1/health`);
    return res.json();
  }

  // ===== 数字人模式流式接口 =====
  async *digitalHumanChatStream(
    req: DigitalHumanRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<DigitalHumanChunk> {
    const res = await fetch(`${AI_ENGINE_BASE}/api/v1/digitalhuman/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': this.tenantId,
      },
      body: JSON.stringify(req),
      signal,
    });

    if (!res.ok) {
      throw new Error(`数字人接口请求失败: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的行

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as DigitalHumanChunk;
        } catch {
          // 忽略解析失败的行
        }
      }
    }
  }

  // ===== 5.3 服务监控 =====
  async getMonitorMetrics(): Promise<ApiResponse<MonitorMetrics>> {
    return this.request<MonitorMetrics>(`/api/admin/monitor/metrics`);
  }

  // ========== 管理后台 ==========

  async getAdminDashboard(): Promise<ApiResponse<AdminDashboard>> {
    return this.request<AdminDashboard>('/api/admin/dashboard');
  }

  async getAdminConversations(limit?: number): Promise<ApiResponse<unknown[]>> {
    const qs = limit ? `?limit=${limit}` : '';
    return this.request(`/api/admin/conversations${qs}`);
  }

  async getKnowledgeChunks(): Promise<ApiResponse<KnowledgeChunkItem[]>> {
    return this.request('/api/admin/knowledge/chunks');
  }

  async searchKnowledge(keyword: string): Promise<ApiResponse<KnowledgeChunkItem[]>> {
    return this.request(`/api/admin/knowledge/chunks/search?keyword=${encodeURIComponent(keyword)}`);
  }

  async createKnowledgeChunk(chunk: Partial<KnowledgeChunkItem>): Promise<ApiResponse<KnowledgeChunkItem>> {
    return this.request('/api/admin/knowledge/chunks', {
      method: 'POST', body: JSON.stringify(chunk),
    });
  }

  async updateKnowledgeChunk(id: number, chunk: Partial<KnowledgeChunkItem>): Promise<ApiResponse<KnowledgeChunkItem>> {
    return this.request(`/api/admin/knowledge/chunks/${id}`, {
      method: 'PUT', body: JSON.stringify(chunk),
    });
  }

  async deleteKnowledgeChunk(id: number): Promise<ApiResponse<void>> {
    return this.request(`/api/admin/knowledge/chunks/${id}`, { method: 'DELETE' });
  }

  async getFaqList(): Promise<ApiResponse<FaqItem[]>> {
    return this.request('/api/admin/knowledge/faq');
  }

  async createFaq(faq: Partial<FaqItem>): Promise<ApiResponse<FaqItem>> {
    return this.request('/api/admin/knowledge/faq', {
      method: 'POST', body: JSON.stringify(faq),
    });
  }

  async updateFaq(id: number, faq: Partial<FaqItem>): Promise<ApiResponse<FaqItem>> {
    return this.request(`/api/admin/knowledge/faq/${id}`, {
      method: 'PUT', body: JSON.stringify(faq),
    });
  }

  async deleteFaq(id: number): Promise<ApiResponse<void>> {
    return this.request(`/api/admin/knowledge/faq/${id}`, { method: 'DELETE' });
  }

  async getDigitalHumanConfigs(): Promise<ApiResponse<DigitalHumanConfigItem[]>> {
    return this.request('/api/admin/digital-human');
  }

  async saveDigitalHumanConfig(config: DigitalHumanConfigItem): Promise<ApiResponse<DigitalHumanConfigItem>> {
    return this.request('/api/admin/digital-human', {
      method: 'POST', body: JSON.stringify(config),
    });
  }

  async getTenants(): Promise<ApiResponse<TenantItem[]>> {
    return this.request('/api/admin/tenants');
  }

  async updateTenant(tenantId: string, data: Partial<TenantItem>): Promise<ApiResponse<TenantItem>> {
    return this.request(`/api/admin/tenants/${tenantId}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
