/**
 * 智慧景区导览系统 - 全局配置
 * 基于接口文档 v2.0（轻量化音视解耦版）
 */
module.exports = {
  // API 基础地址（生产环境需替换为真实域名）
  baseURL: 'https://api-domain.com',

  // WebSocket 地址
  wsURL: 'wss://api-domain.com',

  // 多租户配置
  tenants: {
    west_lake: { id: 'west_lake', name: '西湖景区' },
    gugong: { id: 'gugong', name: '故宫景区' }
  },

  // 默认租户
  defaultTenantId: 'west_lake',

  // 视频资源（数字人模式）
  digitalHuman: {
    idleVideo: '/assets/video/idle.mp4',
    speakingVideo: '/assets/video/speaking.mp4'
  },

  // 心跳间隔（毫秒）
  heartbeatInterval: 30000,

  // 音频加载超时（毫秒）
  audioTimeout: 10000,

  // 离线知识库
  offlineFAQ: {
    "西湖": "西湖是杭州著名的风景名胜区，被誉为\"人间天堂\"。包括苏堤春晓、断桥残雪等十景。",
    "门票": "景区门票价格为80元，学生半价。",
    "厕所": "前方50米游客中心旁有卫生间。",
    "雷峰塔": "雷峰塔是西湖十景之一，始建于公元977年，白蛇传传说发生地。",
    "苏堤": "苏堤春晓是西湖十景之首，由北宋苏轼主持修建。"
  }
};
