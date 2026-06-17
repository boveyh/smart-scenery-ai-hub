// pages/route-recommend/route-recommend.js
const api = require('../../utils/api.js');

Page({
  data: {
    interestOptions: ['历史文化', '自然风光', '休闲娱乐', '宗教场所'],
    interest: '历史文化',
    paceOptions: ['悠闲', '适中', '紧凑'],
    pace: '适中',
    companionOptions: ['独自', '情侣', '亲子', '团队'],
    companion: '独自',
    duration: 180,
    route: null
  },

  onInterestChange(e) {
    this.setData({ interest: this.data.interestOptions[e.detail.value] });
  },
  onPaceChange(e) {
    this.setData({ pace: this.data.paceOptions[e.detail.value] });
  },
  onCompanionChange(e) {
    this.setData({ companion: this.data.companionOptions[e.detail.value] });
  },
  onDurationChange(e) {
    this.setData({ duration: e.detail.value });
  },

  async getRecommendation() {
    wx.showLoading({ title: '生成中...' });
    try {
      const preferences = {
        interest: this.data.interest,
        pace: this.data.pace,
        companions: this.data.companion,
        duration_min: this.data.duration
      };
      const route = await api.recommendRoute(preferences);
      this.setData({ route });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '生成失败', icon: 'none' });
    }
  },

  reset() {
    this.setData({ route: null });
  }
});