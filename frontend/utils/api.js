/**
 * 智慧景区导览系统 - API 封装
 * 基于接口文档 v2.0（轻量化音视解耦版）
 */
const config = require('../config.js');

let _sessionId = '';
let _tenantId = config.defaultTenantId;

/**
 * 设置当前会话ID和租户ID
 */
function initApi(sessionId, tenantId) {
  if (sessionId) _sessionId = sessionId;
  if (tenantId) _tenantId = tenantId;
}

/**
 * 获取当前会话ID
 */
function getSessionId() {
  return _sessionId;
}

/**
 * 获取当前租户ID
 */
function getTenantId() {
  return _tenantId;
}

// ==================== 极速文本模式：WebSocket ====================

/**
 * 连接极速文本模式WebSocket
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
 * @param {WechatMiniprogram.SocketTask} socketTask
 * @param {string} content 用户输入内容
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
 * @param {WechatMiniprogram.SocketTask} socketTask
 */
function sendHeartbeat(socketTask) {
  socketTask.send({
    data: JSON.stringify({ action: 'heartbeat', timestamp: Date.now() }),
    fail(err) {
      console.error('[WS] 心跳发送失败:', err);
    }
  });
}

// ==================== HTTP 通用请求 ====================

/**
 * 通用GET请求
 * @param {string} path 接口路径（不含 /api/v1 前缀）
 * @param {object} params query参数
 * @returns {Promise}
 */
function get(path, params = {}) {
  return request('GET', path, params);
}

/**
 * 通用POST请求
 * @param {string} path 接口路径
 * @param {object} data 请求体
 * @returns {Promise}
 */
function post(path, data = {}) {
  return request('POST', path, {}, data);
}

/**
 * 通用请求封装
 */
function request(method, path, params = {}, data = null) {
  return new Promise((resolve, reject) => {
    let url = `${config.baseURL}/api/v1${path}`;

    // 拼接query参数
    if (Object.keys(params).length > 0) {
      const query = Object.keys(params)
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
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(parseError(res));
        }
      },
      fail(err) {
        reject({ code: 503, message: '网络请求失败', raw: err });
      }
    });
  });
}

// ==================== 数字人模式：HTTP流式请求 ====================

/**
 * 数字人模式流式聊天
 * @param {string} content 用户输入
 * @param {object} callbacks 回调 {onChunk, onEnd, onError}
 * @returns {WechatMiniprogram.RequestTask}
 */
function digitalHumanChat(content, callbacks = {}) {
  const { onChunk, onEnd, onError } = callbacks;

  // 用于累积当前已接收的原始文本，从换行符分割处提取完整行
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
      // 流式完成后确保解析剩余buffer
      if (buffer.trim()) {
        parseNDJSONLines(buffer, onChunk, onEnd, onError);
        buffer = '';
      }
      // 如果 success 先于 onChunkReceived 触发，也解析完整响应
      if (res.data && !buffer) {
        const text = arrayBufferToString(res.data);
        if (text.trim()) {
          parseNDJSONLines(text, onChunk, onEnd, onError);
        }
      }
    },
    fail(err) {
      console.error('[DH] 请求失败:', err);
      if (onError) onError({ code: 503, message: '数字人服务不可用' });
    }
  });

  // 监听流式分片
  requestTask.onChunkReceived((res) => {
    const chunk = arrayBufferToString(res.data);
    buffer += chunk;

    // 按换行分割，每次保留最后一行不完整数据
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
        // 有 text_chunk 和 audio_url 的分片
        if (onChunk) onChunk(obj);
      } catch (e) {
        console.error('[DH][NDJSON] 解析失败:', trimmed);
      }
    }
  });

  return requestTask;
}

/**
 * ArrayBuffer 转 UTF-8 字符串（小程序兼容）
 */
function arrayBufferToString(buffer) {
  if (typeof buffer === 'string') return buffer;
  if (buffer instanceof ArrayBuffer) {
    // 小程序中可用 Uint8Array + decodeURIComponent 或手动转换
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

// ==================== 业务接口 ====================

/**
 * 获取景点POI列表
 * @param {number} lat 纬度（可选）
 * @param {number} lng 经度（可选）
 */
function getPOIs(lat, lng) {
  const params = {};
  if (lat !== undefined) params.lat = lat;
  if (lng !== undefined) params.lng = lng;
  return get('/pois', params);
}

/**
 * 个性化路线推荐
 * @param {object} params 推荐参数
 */
function recommendRoute(params) {
  return post('/route/recommend', params);
}

/**
 * 拍照识物（多模态视觉问答）
 * @param {string} imagePath 图片临时路径
 * @param {string} question 可选问题
 */
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
            reject(parseError({ statusCode: res.statusCode, data }));
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

/**
 * 获取景区实时资讯
 */
function getRealTimeInfo() {
  return get('/info/realtime');
}

/**
 * 获取离线知识库（弱网兜底）
 */
function getOfflineKnowledge() {
  return get('/knowledge/offline');
}

// ==================== NDJSON 解析工具 ====================

/**
 * 解析 NDJSON 格式的多行数据
 * @param {string} raw 原始文本
 * @param {Function} onLine 每行解析回调(jsonObj)
 * @param {Function} onEnd 结束回调
 * @param {Function} onError 错误回调
 */
function parseNDJSONLines(raw, onLine, onEnd, onError) {
  if (!raw || !raw.trim()) return;

  const lines = raw.split('\n').filter(l => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const obj = JSON.parse(line);

      if (obj.type === 'end') {
        if (onEnd) onEnd(obj);
        return;
      }

      if (obj.type === 'error') {
        if (onError) onError(obj);
        return;
      }

      // 文本分片 / 数字人分片
      if (onLine) onLine(obj);
    } catch (e) {
      console.error('[NDJSON] 解析行失败:', line, e);
      if (onError) onError({ code: 500, message: '数据解析失败' });
    }
  }
}

/**
 * 解析WebSocket Message中的NDJSON
 * @param {string} raw 原始文本
 */
function parseWSMessage(raw, onText, onEnd, onError) {
  parseNDJSONLines(raw, onText, onEnd, onError);
}

// ==================== 错误处理 ====================

/**
 * 解析API错误响应
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

/**
 * 根据HTTP状态码获取错误信息
 */
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
 * 将API错误码转为用户提示文案和处理建议
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
  connectTextWebSocket,
  sendTextMessage,
  sendHeartbeat,
  get,
  post,
  digitalHumanChat,
  getPOIs,
  recommendRoute,
  recognizeVision,
  getRealTimeInfo,
  getOfflineKnowledge,
  parseNDJSONLines,
  parseWSMessage,
  handleErrorCode
};
