// pages/realtime-info/realtime-info.js
const api = require('../../utils/api.js');

Page({
  data: {
    info: {
      weather: '晴',
      temperature: 25,
      humidity: 60,
      windSpeed: 10,
      crowdednessLevel: 2,
      peakPois: [],
      announcements: []
    }
  },

  onLoad() {
    this.loadInfo();
  },

  async loadInfo() {
    try {
      const data = await api.getRealTimeInfo();
      this.setData({ info: data });
    } catch (err) {
      console.error('加载实时资讯失败', err);
    }
  },

  async refresh() {
    wx.showLoading({ title: '刷新中...' });
    await this.loadInfo();
    wx.hideLoading();
  }
});