/**
 * 数据类型定义（对齐 API 文档 v2.0 §8 数据字段规范）
 * 
 * 注意：Java 后端返回的是驼峰格式（poiId, avgStayMin），
 * 前端的接口定义为了便于映射也使用驼峰格式，
 * 但在代码中通过配置能同时支持 api 文档的 snake_case。
 */

// ===== 通用响应 =====
export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message?: string;
}

// ===== POI 景点 (后端返回驼峰格式) =====
export interface PoiItem {
  poiId: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description: string;
  avgStayMin: number;
  crowdedness: number; // 1-5
  imageUrl?: string;
  openingHours?: string;
  ticketPrice?: number;
}

// ===== 游览路线推荐 =====
export interface RoutePreferences {
  interest: string;
  pace: 'relaxed' | 'moderate' | 'fast';
  companions: 'alone' | 'couple' | 'with_children' | 'with_elderly' | 'group';
  durationMin: number;
}

export interface RouteRecommendRequest {
  preferences: RoutePreferences;
  startPoiId: string;
}

export interface RouteRecommendResult {
  routeId: string;
  poiSequence: string[];
  estimatedTimeMin: number;
  tips: string[];
}

// ===== 拍照识物 =====
export interface VisionRecognizeResult {
  object: string;
  confidence: number;
  description: string;
}

// ===== 实时资讯 =====
export interface RealtimeInfo {
  weather: string;
  temperature: number;
  crowdednessLevel: number; // 1-5
  peakPois?: string[] | null;
  announcements?: string[] | null;
}

// ===== 离线知识库 =====
export interface OfflineKnowledge {
  [question: string]: string;
}

// ===== 数字人模式 =====
export interface DigitalHumanRequest {
  session_id: string;
  content: string;
  timestamp: number;
}

// NDJSON 流式行
export interface DigitalHumanChunk {
  seq: number;
  text_chunk?: string;
  audio_url?: string;
  type?: 'end' | 'error';
  reason?: string;
  code?: number;
  message?: string;
}

// ===== WebSocket 文本模式 =====
export interface WsClientMessage {
  action: 'send_message' | 'heartbeat';
  content?: string;
  timestamp?: number;
}

export interface WsServerMessage {
  type: 'text' | 'end';
  content?: string;
  seq?: number;
  reason?: string;
  usage?: { tokens: number };
}

// ===== 管理后台接口 =====
export interface MonitorMetrics {
  cpuUsage: number;
  memoryUsageMb: number;
  activeSessions: number;
  digitalhumanSessions: number;
}

export interface AdminDashboard {
  overview: {
    todayServiceCount: number;
    weeklyServiceCount: number;
    totalPois: number;
    totalKnowledge: number;
    avgSatisfaction: number;
    activeTenants: number;
    satisfactionTrend: number;
    serviceCountChange: number;
  };
  dailyTrend: { date: string; count: number }[];
  hotTopics: { topic: string; count: number }[];
  sentimentStats: { sentiment: string; count: number }[];
  poiStats: { poiId: string; poiName: string; visitCount: number; avgSatisfaction: number; avgCost: number; avgStay: number }[];
  ageGroupStats: { ageGroup: string; count: number; avgSatisfaction: number; avgCost: number }[];
}

export interface KnowledgeChunkItem {
  id: number;
  tenantId: string;
  chunkId: string;
  poiId?: string;
  title: string;
  content: string;
  tags?: string;
  source?: string;
  chunkOrder?: number;
  enabled?: boolean;
  createdAt?: string;
}

export interface FaqItem {
  id: number;
  tenantId: string;
  question: string;
  answer: string;
  clickCount: number;
  createdAt?: string;
}

export interface DigitalHumanConfigItem {
  id?: number;
  tenantId: string;
  personaName: string;
  ttsVoice: string;
  ttsRate: string;
  ttsPitch: string;
  faceImage?: string;
  backgroundImage?: string;
  personaPrompt?: string;
  live2dModel?: string;
  costume?: string;
  enabled?: boolean;
}

export interface TenantItem {
  id: number;
  tenantId: string;
  name: string;
  description?: string;
  province?: string;
  city?: string;
  status: number;
}
