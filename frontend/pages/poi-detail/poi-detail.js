// pages/poi-detail/poi-detail.js
const api = require('../../utils/api.js');

Page({
  data: {
    poi: {},
    history: []
  },

  onLoad(options) {
    this.poiId = options.poiId;
    if (!this.poiId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    this.loadData();
  },

  async loadData() {
    try {
      const poi = await api.getPOIDetail(this.poiId);
      const history = await api.getCrowdednessHistory(this.poiId);
      this.setData({ poi, history });
      this.drawChart(history);
    } catch (err) {
      console.error('加载详情失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  drawChart(data) {
    const ctx = wx.createCanvasContext('crowdChart');
    const width = 300, height = 200;
    const padding = 20;
    const maxVal = 5;
    const barWidth = (width - padding * 2) / (data.length || 1);
    ctx.setFillStyle('#f0f0f0');
    ctx.fillRect(0, 0, 300, 200);
    data.forEach((item, index) => {
      const x = padding + index * barWidth;
      const barHeight = (item.crowdedness / maxVal) * (height - padding * 2);
      ctx.setFillStyle('#3B82F6');
      ctx.fillRect(x, height - padding - barHeight, barWidth - 4, barHeight);
      ctx.setFillStyle('#666');
      ctx.setFontSize(12);
      ctx.fillText(item.crowdedness, x + 2, height - padding - barHeight - 6);
    });
    ctx.draw();
  },

  goChat(e) {
    const mode = e.currentTarget.dataset.mode;
    const tenantId = wx.getStorageSync('tenantId') || 'west_lake';
    wx.navigateTo({ url: `/pages/chat/chat?mode=${mode}&tenantId=${tenantId}` });
  },
  goRoute() {
    wx.navigateTo({ url: '/pages/route-recommend/route-recommend' });
  },
  goScan() {
    wx.navigateTo({ url: '/pages/ar-scan/ar-scan' });
  }
});