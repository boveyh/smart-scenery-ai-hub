// pages/index/index.js
const config = require('../../config.js');

Page({
  data: {
    tenantName: '西湖景区'
  },

  onLoad() {
    this.updateTenantName();
  },
  onShow() {
    this.updateTenantName();
  },

  updateTenantName() {
    const tenantId = wx.getStorageSync('tenantId') || config.DEFAULT_TENANT_ID;
    const tenant = config.tenants[tenantId];
    this.setData({ tenantName: tenant ? tenant.name : '西湖景区' });
  },

  gotoChat(e) {
    const mode = e.currentTarget.dataset.mode;
    const tenantId = wx.getStorageSync('tenantId') || config.DEFAULT_TENANT_ID;
    wx.navigateTo({ url: `/pages/chat/chat?mode=${mode}&tenantId=${tenantId}` });
  },

  gotoPOIs() {
    wx.navigateTo({ url: '/pages/pois/pois' });
  },

  gotoRealtimeInfo() {
    wx.navigateTo({ url: '/pages/realtime-info/realtime-info' });
  },

  gotoARScan() {
    wx.navigateTo({ url: '/pages/ar-scan/ar-scan' });
  },

  switchTenant() {
    const keys = Object.keys(config.tenants);
    const names = keys.map(k => `${config.tenants[k].name} (${k})`);
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const tenantId = keys[res.tapIndex];
        wx.setStorageSync('tenantId', tenantId);
        this.updateTenantName();
        wx.showToast({ title: `已切换到${config.tenants[tenantId].name}`, icon: 'success' });
      }
    });
  }
});