// pages/route-recommend/route-recommend.js
const api = require('../../utils/api.js');
const config = require('../../config.js');

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
      // 先获取景点列表，用第一个作为起始点
      const tenantId = wx.getStorageSync('tenantId') || config.defaultTenantId;
      api.initApi('', tenantId);
      const pois = await api.getPOIs();
      const startPoiId = pois && pois.length > 0 ? pois[0].poiId : '';

      const paceMap = { '悠闲': 'relaxed', '适中': 'normal', '紧凑': 'hurried' };
      const companionMap = { '独自': 'alone', '情侣': 'solo', '亲子': 'with_children', '团队': 'group' };
      const requestBody = {
        startPoiId: startPoiId,
        preferences: {
        interest: this.data.interest,
          pace: paceMap[this.data.pace] || 'normal',
          companions: companionMap[this.data.companion] || 'alone',
          durationMin: this.data.duration
        }
      };
      const route = await api.recommendRoute(requestBody);
      this.setData({ route });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('路线推荐失败', err);
      wx.showToast({ title: '生成失败', icon: 'none' });
    }
  },

  reset() {
    this.setData({ route: null });
  }
});