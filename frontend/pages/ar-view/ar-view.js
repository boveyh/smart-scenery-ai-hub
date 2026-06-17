// pages/ar-view/ar-view.js
Page({
  data: {},

  onLoad() {
    // 可选：自动跳转（如果想直接跳转，取消注释下一行）
    // wx.redirectTo({ url: '/pages/ar-scan/ar-scan' });
  },

  goToScan() {
    wx.navigateTo({
      url: '/pages/ar-scan/ar-scan',
      fail: () => {
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  }
});