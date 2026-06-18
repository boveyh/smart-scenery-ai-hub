// app.js
const { generateUUID } = require('./utils/util.js');
const config = require('./config.js');

App({
  onLaunch() {
    // 初始化租户
    const storedTenant = wx.getStorageSync('tenantId') || config.defaultTenantId;
    this.globalData.tenantId = storedTenant;
    // 初始化会话ID
    this.globalData.sessionId = generateUUID();
    // 日志
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
    console.log('[App] 启动, session:', this.globalData.sessionId, 'tenant:', this.globalData.tenantId);
  },

  getSessionId() {
    return this.globalData.sessionId;
  },
  getTenantId() {
    return this.globalData.tenantId;
  },
  newSessionId() {
    this.globalData.sessionId = generateUUID();
    return this.globalData.sessionId;
  },

  globalData: {
    userInfo: null,
    sessionId: '',
    tenantId: config.defaultTenantId
  }
});
