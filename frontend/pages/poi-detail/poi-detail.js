const api = require('../../utils/api.js');
const config = require('../../config.js');

Page({
  data: {
    poi: null,
    loading: true,
    crowdHistory: [],
    crowdText: ''
  },

  onLoad(options) {
    this.poiId = options.poiId || '';
    if (!this.poiId) {
      wx.showToast({ title: '景点ID为空', icon: 'none' });
      this.setData({ loading: false });
      return;
    }
    this.loadDetail();
    this.loadCrowdHistory();
  },

  /** 加载景点详情 */
  loadDetail() {
    const app = getApp();
    api.initApi(app.getSessionId(), app.getTenantId());

    api.getPOIDetail(this.poiId).then(res => {
      if (res && res.code === 200 && res.data) {
        const poi = this.normalizePOI(res.data);
        this.setData({
          poi,
          loading: false,
          crowdText: this.getCrowdText(poi.crowdedness)
        });
        wx.setNavigationBarTitle({ title: poi.name });
      } else {
        this.loadMockDetail();
      }
    }).catch(err => {
      console.error('[POI Detail] 加载失败:', err);
      this.loadMockDetail();
    });
  },

  /** 本地 Mock 详情兜底 */
  loadMockDetail() {
    const mockDB = {
      poi_001: { poiId: 'poi_001', name: '雷峰塔', category: '历史文化', subCategory: '古塔', lat: 30.232, lng: 120.146, address: '杭州市西湖区南山路15号', description: '雷峰塔位于浙江省杭州市西湖风景区南岸夕照山上，始建于北宋太平兴国二年（977年），是吴越国王钱俶为供奉佛螺髻发舍利而建。塔身八面七层，高71米。传说《白蛇传》中白娘子被法海镇压于此塔下，使雷峰塔闻名遐迩。\n\n雷峰夕照是西湖十景之一，每当夕阳西下，塔影横空，金碧辉煌，别有一番意境。', avgStayMin: 45, openingHours: '08:00-17:00', ticketPrice: 40, imageUrl: '', crowdedness: 4 },
      poi_002: { poiId: 'poi_002', name: '苏堤春晓', category: '自然风光', subCategory: '堤岸', lat: 30.258, lng: 120.138, address: '杭州市西湖区苏堤', description: '苏堤是北宋元祐五年（1090年），苏轼任杭州知州时疏浚西湖，利用挖出的淤泥构筑而成。堤长2797米，宽30-40米，贯穿西湖南北。堤上有映波、锁澜、望山、压堤、东浦、跨虹六桥，古朴美观。\n\n苏堤春晓是西湖十景之首，寒冬一过，苏堤便如报春使者，杨柳夹岸，艳桃灼灼，湖波如镜。', avgStayMin: 60, openingHours: '全天', ticketPrice: 0, imageUrl: '', crowdedness: 3 }
    };
    const poi = mockDB[this.poiId] || {
      poiId: this.poiId, name: '景点详情', category: '其他',
      description: '暂无详细信息', avgStayMin: 30, crowdedness: 1
    };
    this.setData({
      poi,
      loading: false,
      crowdText: this.getCrowdText(poi.crowdedness)
    });
  },

  /** 加载拥挤度历史 */
  loadCrowdHistory() {
    const app = getApp();
    api.initApi(app.getSessionId(), app.getTenantId());

    api.getCrowdednessHistory(this.poiId, 24).then(res => {
      if (res && res.code === 200 && res.data && res.data.length > 0) {
        const history = res.data.map(item => ({
          crowdedness: item.crowdedness || 1,
          time: this.formatHour(item.recordTime || item.record_time)
        })).slice(-12); // 取最近12条
        this.setData({ crowdHistory: history });
      }
    }).catch(() => {
      // 生成模拟历史数据
      const hours = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const h = new Date(now - i * 2 * 3600000);
        hours.push({
          crowdedness: Math.floor(Math.random() * 3) + 1,
          time: this.formatHour(h.toISOString())
        });
      }
      this.setData({ crowdHistory: hours });
    });
  },

  /** 格式化时间 */
  formatHour(timeStr) {
    if (!timeStr) return '';
    const d = new Date(timeStr);
    return `${d.getHours().toString().padStart(2, '0')}:00`;
  },

  /** 获取拥挤度文本 */
  getCrowdText(level) {
    const map = { 1: '宽松', 2: '较宽松', 3: '适中', 4: '较拥挤', 5: '非常拥挤' };
    return map[level] || '未知';
  },

  /** 标准化 POI 数据字段 */
  normalizePOI(item) {
    return {
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
      crowdedness: item.crowdedness || 1
    };
  },

  /** 跳转 AI 问答 */
  goToChat() {
    const app = getApp();
    const tenantId = app.getTenantId();
    wx.navigateTo({
      url: `/pages/chat/chat?mode=text&tenantId=${tenantId}`,
      fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
    });
  },

  /** 跳转路线推荐 */
  goToRoute() {
    wx.navigateTo({
      url: `/pages/route-recommend/route-recommend?startPoiId=${this.poiId}`,
      fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
    });
  },

  /** 跳转 AR 识物 */
  goToAR() {
    wx.navigateTo({
      url: '/pages/ar-scan/ar-scan',
      fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
    });
  }
});