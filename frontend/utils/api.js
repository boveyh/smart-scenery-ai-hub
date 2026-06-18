/**
 * 智慧景区导览系统 - API 封装
 * 统一前端的 HTTP REST / WebSocket / 数字人 HTTP 流式接口
 */
const config = require('../config.js');

let _sessionId = '';
let _tenantId = config.defaultTenantId;

/**
 * 初始化会话与租户
 */
function initApi(sessionId, tenantId) {
  if (sessionId) _sessionId = sessionId;
  if (tenantId) _tenantId = tenantId;
}

function getSessionId() {
  return _sessionId;
}

function getTenantId() {
  return _tenantId;
}

// ==================== 通用 HTTP 请求 ====================

function request(method, path, params = {}, data = null) {
  return new Promise((resolve, reject) => {
    let url = `${config.baseURL}/api/v1${path}`;

    // 拼接 query 参数
    const queryKeys = Object.keys(params);
    if (queryKeys.length > 0) {
      const query = queryKeys
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join('&');
      url += `?${query}`;
    }

    wx.request({
      url,
      method,
      header: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': _tenantId
      },
      data,
      success(res) {
        if (res.statusCode === 200 && res.data) {
          // 统一 ApiResult 格式：{ code, message, data }
          if (res.data.code === 200) {
            resolve(res.data.data);
          } else {
            reject({ code: res.data.code || 500, message: res.data.message || '服务异常' });
          }
        } else {
          reject({ code: res.statusCode, message: 'HTTP 错误' });
        }
      },
      fail(err) {
        reject({ code: 503, message: '网络请求失败', raw: err });
      }
    });
  });
}

function get(path, params = {}) {
  return request('GET', path, params);
}

function post(path, data = {}) {
  return request('POST', path, {}, data);
}

// ==================== WebSocket 文本模式 ====================

/**
 * 连接极速文本模式 WebSocket
 * @returns {WechatMiniprogram.SocketTask}
 */
function connectTextWebSocket() {
  const url = `${config.wsURL}/ws/chat?tenant_id=${_tenantId}&session_id=${_sessionId}&mode=text`;
  console.log('[WS] 连接:', url);

  const socketTask = wx.connectSocket({
    url,
    header: { 'content-type': 'application/json' },
    protocols: [],
    tcpNoDelay: true,
    fail(err) {
      console.error('[WS] 连接失败:', err);
    }
  });

  return socketTask;
}

/**
 * 发送文本消息（WebSocket）
 */
function sendTextMessage(socketTask, content) {
  const msg = {
    action: 'send_message',
    content: content,
    timestamp: Date.now()
  };
  socketTask.send({
    data: JSON.stringify(msg),
    fail(err) {
      console.error('[WS] 发送失败:', err);
    }
  });
}

/**
 * 发送心跳
 */
function sendHeartbeat(socketTask) {
  socketTask.send({
    data: JSON.stringify({ action: 'heartbeat', timestamp: Date.now() }),
    fail(err) {
      console.error('[WS] 心跳发送失败:', err);
    }
  });
}

// ==================== 数字人 HTTP 流式聊天 ====================

/**
 * 数字人模式 HTTP 流式聊天（NDJSON）
 * @param {string} content 用户输入
 * @param {object} callbacks 回调 { onChunk, onEnd, onError }
 * @returns {WechatMiniprogram.RequestTask}
 */
function digitalHumanChat(content, callbacks = {}) {
  const { onChunk, onEnd, onError } = callbacks;
  let buffer = '';

  const requestTask = wx.request({
    url: `${config.baseURL}/api/v1/digitalhuman/chat`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': _tenantId
    },
    data: {
      session_id: _sessionId,
      content: content,
      timestamp: Date.now()
    },
    enableChunked: true,
    responseType: 'arraybuffer',
    success(res) {
      if (buffer.trim()) {
        parseNDJSONLines(buffer, onChunk, onEnd, onError);
        buffer = '';
      }
    },
    fail(err) {
      console.error('[DH] 请求失败:', err);
      if (onError) onError({ code: 503, message: '数字人服务不可用' });
    }
  });

  requestTask.onChunkReceived((res) => {
    const chunk = arrayBufferToString(res.data);
    buffer += chunk;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj.type === 'end') {
          if (onEnd) onEnd(obj);
          return;
        }
        if (obj.type === 'error') {
          if (onError) onError(obj);
          return;
        }
        // type === 'chunk' 数字人分片
        if (onChunk) onChunk(obj);
      } catch (e) {
        console.error('[DH][NDJSON] 解析失败:', trimmed);
      }
    }
  });

  return requestTask;
}

/**
 * ArrayBuffer 转 UTF-8 字符串
 */
function arrayBufferToString(buffer) {
  if (typeof buffer === 'string') return buffer;
  if (buffer instanceof ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    try {
      return decodeURIComponent(escape(str));
    } catch (e) {
      return str;
    }
  }
  return String(buffer || '');
}

/**
 * 解析 NDJSON 多行数据
 */
function parseNDJSONLines(raw, onLine, onEnd, onError) {
  if (!raw || !raw.trim()) return;
  const lines = raw.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.type === 'end') {
        if (onEnd) onEnd(obj);
        return;
      }
      if (obj.type === 'error') {
        if (onError) onError(obj);
        return;
      }
      if (onLine) onLine(obj);
    } catch (e) {
      console.error('[NDJSON] 解析失败:', line, e);
    }
  }
}

/**
 * 解析 WebSocket 消息中的 NDJSON
 */
function parseWSMessage(raw, onText, onEnd, onError) {
  parseNDJSONLines(raw, onText, onEnd, onError);
}

// ==================== 业务接口 ====================

/** 获取景点 POI 列表 */
function getPOIs(lat, lng) {
  const params = {};
  if (lat !== undefined) params.lat = lat;
  if (lng !== undefined) params.lng = lng;
  return get('/pois', params);
}

/** 根据分类查询景点 */
function getPOIsByCategory(category) {
  return get(`/pois/category/${encodeURIComponent(category)}`);
}

/** 获取单个景点详情 */
function getPOIDetail(poiId) {
  return get(`/pois/${encodeURIComponent(poiId)}`);
}

/** 批量获取景点详情 */
function getPOIsBatch(poiIds) {
  return post('/pois/batch', poiIds);
}

/** 个性化路线推荐 */
function recommendRoute(params) {
  return post('/route/recommend', params);
}

/** 拍照识物（多模态视觉问答） */
function recognizeVision(imagePath, question = '') {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.baseURL}/api/v1/vision/recognize`,
      filePath: imagePath,
      name: 'image',
      header: { 'X-Tenant-Id': _tenantId },
      formData: question ? { question } : {},
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (res.statusCode === 200 && data.code === 200) {
            resolve(data);
          } else {
            reject({ code: data?.code || 500, message: data?.message || '识别失败' });
          }
        } catch (e) {
          reject({ code: 500, message: '解析响应失败' });
        }
      },
      fail(err) {
        reject({ code: 503, message: '上传失败', raw: err });
      }
    });
  });
}

/** 获取景区实时资讯 */
function getRealTimeInfo() {
  return get('/info/realtime');
}

/** 记录拥挤度 */
function recordCrowdedness(poiId, crowdedness, source = 'manual') {
  return request('POST', `/crowdedness/record`, { poiId, crowdedness, source });
}

/** 获取历史拥挤度 */
function getCrowdednessHistory(poiId, hours = 24) {
  return get(`/crowdedness/history/${encodeURIComponent(poiId)}`, { hours });
}

/** 获取最新拥挤度 */
function getLatestCrowdedness(poiId) {
  return get(`/crowdedness/latest/${encodeURIComponent(poiId)}`);
}

/** 获取离线知识库（弱网兜底） */
function getOfflineKnowledge() {
  return get('/knowledge/offline');
}

// ==================== 错误处理 ====================

/**
 * 解析 API 错误响应
 */
function parseError(res) {
  let data = res.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { /* ignore */ }
  }
  return {
    code: data?.code || res.statusCode,
    message: data?.message || getErrorMessage(res.statusCode)
  };
}

function getErrorMessage(statusCode) {
  const map = {
    400: '请求参数错误',
    401: '租户验证失败，请重新扫码授权',
    429: '请求过于频繁，请稍后重试',
    500: '服务器内部错误',
    503: 'AI服务暂时不可用',
    504: '请求超时，请检查网络后重试'
  };
  return map[statusCode] || `服务异常 (${statusCode})`;
}

/**
 * 将错误码转为用户提示文案
 * @returns {{ message: string, fallback: boolean }}
 */
function handleErrorCode(error) {
  const { code } = error;
  let message = error.message || '未知错误';
  let fallback = false;

  switch (code) {
    case 400:
      message = message || '内容包含敏感词，请重新输入';
      break;
    case 401:
      message = message || '租户验证失败，请重新扫码授权';
      break;
    case 429:
      message = message || '请求过快，请稍后再试';
      break;
    case 500:
      message = message || '服务器内部错误，请重试';
      break;
    case 503:
    case 504:
      message = message || 'AI服务暂时不可用，已切换至离线模式';
      fallback = true;
      break;
  }
  return { message, fallback };
}

module.exports = {
  initApi,
  getSessionId,
  getTenantId,
  // WebSocket 文本模式
  connectTextWebSocket,
  sendTextMessage,
  sendHeartbeat,
  // 数字人 HTTP 流式
  digitalHumanChat,
  parseNDJSONLines,
  parseWSMessage,
  // HTTP 业务接口
  get,
  post,
  getPOIs,
  getPOIsByCategory,
  getPOIDetail,
  getPOIsBatch,
  recommendRoute,
  recognizeVision,
  getRealTimeInfo,
  recordCrowdedness,
  getCrowdednessHistory,
  getLatestCrowdedness,
  getOfflineKnowledge,
  // 错误处理
  handleErrorCode
};