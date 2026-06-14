// pages/index/index.js
const config = require('../../config.js');

Page({
  data: {
    tenantName: '西湖景区'
  },

  onLoad() {
    const tenantId = wx.getStorageSync('tenantId') || config.defaultTenantId;
    const tenant = config.tenants[tenantId];
    this.setData({
      tenantName: tenant ? tenant.name : '西湖景区'
    });
  },

  onShow() {
    // 每次返回首页时刷新租户名
    const tenantId = wx.getStorageSync('tenantId') || config.defaultTenantId;
    const tenant = config.tenants[tenantId];
    this.setData({
      tenantName: tenant ? tenant.name : '西湖景区'
    });
  },

  gotoChat(e) {
    const mode = e.currentTarget.dataset.mode;
    const tenantId = wx.getStorageSync('tenantId') || config.defaultTenantId;
    wx.navigateTo({
      url: `/pages/chat/chat?mode=${mode}&tenantId=${tenantId}`,
      fail: (err) => {
        console.error('跳转失败', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  },

  /** 跳转景点列表 */
  gotoPOIs() {
    wx.navigateTo({
      url: '/pages/pois/pois',
      fail: () => wx.showToast({ title: '页面跳转失败', icon: 'none' })
    });
  },

  /** 跳转实时资讯 */
  gotoRealtimeInfo() {
    wx.navigateTo({
      url: '/pages/realtime-info/realtime-info',
      fail: () => wx.showToast({ title: '页面跳转失败', icon: 'none' })
    });
  },

  /** 跳转拍照识物 */
  gotoARScan() {
    wx.navigateTo({
      url: '/pages/ar-scan/ar-scan',
      fail: () => wx.showToast({ title: '页面跳转失败', icon: 'none' })
    });
  },

  switchTenant() {
    const tenantKeys = Object.keys(config.tenants);
    const tenantNames = tenantKeys.map(k => `${config.tenants[k].name} (${k})`);

    wx.showActionSheet({
      itemList: tenantNames,
      success: (res) => {
        const tenantId = tenantKeys[res.tapIndex];
        const tenant = config.tenants[tenantId];
        wx.setStorageSync('tenantId', tenantId);
        this.setData({ tenantName: tenant.name });
        wx.showToast({ title: `已切换到${tenant.name}`, icon: 'success' });
      }
    });
  }
});

