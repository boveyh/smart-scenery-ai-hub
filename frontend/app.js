// app.js
const { generateUUID } = require('./utils/util.js');
const config = require('./config.js');
const api = require('./utils/api.js');

App({
  onLaunch() {
    // 初始化租户
    const storedTenant = wx.getStorageSync('tenantId') || config.defaultTenantId;
    this.globalData.tenantId = storedTenant;

    // 初始化会话ID
    this.globalData.sessionId = generateUUID();

    // 初始化API模块
    api.initApi(this.globalData.sessionId, this.globalData.tenantId);

    // 日志记录
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    console.log('[App] 启动, session_id:', this.globalData.sessionId, 'tenant_id:', this.globalData.tenantId);

    // 微信登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    });
  },

  /** 获取全局会话ID */
  getSessionId() {
    return this.globalData.sessionId;
  },

  /** 获取全局租户ID */
  getTenantId() {
    return this.globalData.tenantId;
  },

  /** 生成新的会话ID（从零开始一轮新对话） */
  newSessionId() {
    this.globalData.sessionId = generateUUID();
    api.initApi(this.globalData.sessionId, null);
    return this.globalData.sessionId;
  },

  globalData: {
    userInfo: null,
    sessionId: '',
    tenantId: config.defaultTenantId
  }
});
