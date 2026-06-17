// pages/pois/pois.js
const api = require('../../utils/api.js');

Page({
  data: {
    categories: ['全部', '历史文化', '自然风光', '休闲娱乐', '宗教场所', '现代建筑', '特色街区'],
    currentCategory: '全部',
    sortBy: 'default',
    pois: [],
    loading: true
  },

  onLoad() {
    this.loadPOIs();
  },

  async loadPOIs() {
    this.setData({ loading: true });
    try {
      let data;
      if (this.data.currentCategory === '全部') {
        data = await api.getPOIs();
      } else {
        data = await api.getPOIsByCategory(this.data.currentCategory);
      }
      // 排序
      if (this.data.sortBy === 'crowdedness') {
        data.sort((a, b) => b.crowdedness - a.crowdedness);
      } else if (this.data.sortBy === 'distance') {
        // 需要获取当前位置，这里简单模拟
        // 实际可调用 wx.getLocation 后传入 lat/lng
      }
      this.setData({ pois: data, loading: false });
    } catch (err) {
      console.error('加载景点失败', err);
      this.setData({ pois: [], loading: false });
    }
  },

  selectCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ currentCategory: cat }, () => {
      this.loadPOIs();
    });
  },

  setSort(e) {
    const sort = e.currentTarget.dataset.sort;
    this.setData({ sortBy: sort }, () => {
      this.loadPOIs();
    });
  },

  gotoDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/poi-detail/poi-detail?poiId=${id}` });
  }
});