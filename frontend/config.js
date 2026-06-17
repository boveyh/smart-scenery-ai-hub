// config.js
const config = {
  // 通用 API 前缀（所有 REST 接口）
  API_BASE_URL: 'http://localhost:9000/api/v1',
  // WebSocket 地址（文本聊天）
  WS_BASE_URL: 'ws://localhost:9000/ws',

  // 数字人服务（实时视频流）
  DIGITAL_HUMAN_BASE: 'http://localhost:9000',
  START_STREAM_API: '/api/v1/digitalhuman/start',
  CHANGE_CLOTHING_API: '/api/v1/digitalhuman/change_clothing',
  STOP_STREAM_API: '/api/v1/digitalhuman/stop',
  CLOTHING_LIST_API: '/api/v1/digitalhuman/clothing_list',

  // 租户
  DEFAULT_TENANT_ID: 'west_lake',
  tenants: {
    west_lake: { name: '西湖景区' },
    gugong: { name: '故宫景区' }
  },
  TIMEOUT_MS: 5000,
};

module.exports = config;