const api = require('../../utils/api.js');
const config = require('../../config.js');

Page({
  data: {
    pois: [],
    categories: ['历史文化', '自然风光', '主题乐园', '博物馆与展馆', '古镇水乡', '风景名胜与休闲度假', '自然公园'],
    currentCategory: '',
    sortBy: 'default',
    loading: true,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadPOIs();
  },

  onShow() {
    // 回到页面时刷新数据
    if (!this.data.loading) {
      this.loadPOIs();
    }
  },

  /** 加载 POI 列表 */
  loadPOIs() {
    const app = getApp();
    api.initApi(app.getSessionId(), app.getTenantId());
    const { currentCategory, sortBy } = this.data;

    this.setData({ loading: true });

    // 如果选择了分类，使用分类接口
    const fetchPromise = currentCategory
      ? api.getPOIsByCategory(currentCategory)
      : api.getPOIs();

    fetchPromise.then(res => {
      if (res && res.code === 200 && res.data) {
        let list = res.data.map(item => ({
          poiId: item.poiId || item.poi_id,
          name: item.name,
          category: item.category,
          subCategory: item.subCategory || item.sub_category,
          lat: item.lat,
          lng: item.lng,
          address: item.address,
          description: item.description,
          avgStayMin: item.avgStayMin || item.avg_stay_min,
          openingHours: item.openingHours || item.opening_hours,
          ticketPrice: item.ticketPrice || item.ticket_price || 0,
          imageUrl: item.imageUrl || item.image_url,
          crowdedness: item.crowdedness || 1,
          distance: item.distance
        }));

        // 排序
        if (sortBy === 'crowdedness') {
          list.sort((a, b) => b.crowdedness - a.crowdedness);
        } else if (sortBy === 'distance') {
          list.sort((a, b) => (a.distance || 99999) - (b.distance || 99999));
        }

        this.setData({
          pois: list,
          loading: false
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: '景点数据加载失败', icon: 'none' });
      }
    }).catch(err => {
      console.error('[POIs] 加载失败:', err);
      this.setData({ loading: false });
      // 使用本地 Mock 数据兜底
      this.loadMockPOIs();
    });
  },

  /** 本地 Mock 数据兜底 */
  loadMockPOIs() {
    const mockData = [
      { poiId: 'poi_001', name: '雷峰塔', category: '历史文化', subCategory: '古塔', lat: 30.232, lng: 120.146, description: '雷峰塔建于公元977年，是西湖十景之一，白蛇传传说发生地。', avgStayMin: 45, openingHours: '08:00-17:00', ticketPrice: 40, imageUrl: '', crowdedness: 4, distance: 120 },
      { poiId: 'poi_002', name: '苏堤春晓', category: '自然风光', subCategory: '堤岸', lat: 30.258, lng: 120.138, description: '苏堤春晓是西湖十景之首，由北宋苏轼主持修建，全长约3公里。', avgStayMin: 60, openingHours: '全天', ticketPrice: 0, imageUrl: '', crowdedness: 3, distance: 350 },
      { poiId: 'poi_003', name: '断桥残雪', category: '历史文化', subCategory: '古桥', lat: 30.264, lng: 120.152, description: '断桥是西湖最著名的桥，传说白娘子与许仙在此相遇。', avgStayMin: 30, openingHours: '全天', ticketPrice: 0, imageUrl: '', crowdedness: 5, distance: 500 },
      { poiId: 'poi_004', name: '曲院风荷', category: '自然风光', subCategory: '园林', lat: 30.248, lng: 120.128, description: '曲院风荷以夏日荷花闻名，是西湖十景之一。', avgStayMin: 40, openingHours: '08:00-17:30', ticketPrice: 0, imageUrl: '', crowdedness: 2, distance: 800 },
      { poiId: 'poi_005', name: '三潭印月', category: '自然风光', subCategory: '湖岛', lat: 30.238, lng: 120.142, description: '三潭印月是西湖中最大的岛屿，湖中有三座石塔。', avgStayMin: 50, openingHours: '08:00-17:00', ticketPrice: 55, imageUrl: '', crowdedness: 3, distance: 600 }
    ];
    this.setData({ pois: mockData, loading: false });
  },

  /** 分类筛选 */
  onFilterCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category, page: 1, pois: [] }, () => {
      this.loadPOIs();
    });
  },

  /** 排序切换 */
  onSortChange(e) {
    const sortBy = e.currentTarget.dataset.sort;
    this.setData({ sortBy }, () => {
      this.loadPOIs();
    });
  },

  /** 跳转详情页 */
  goToDetail(e) {
    const poiId = e.currentTarget.dataset.poiId;
    wx.navigateTo({
      url: `/pages/poi-detail/poi-detail?poiId=${poiId}`,
      fail: () => {
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  }
});