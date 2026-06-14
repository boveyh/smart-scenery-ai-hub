const api = require('../../utils/api.js');
const config = require('../../config.js');

Page({
  data: {
    loading: true,
    refreshing: false,
    info: null,
    weatherIcon: '',
    crowdStatusText: '',
    crowdDescText: '',
    updateTime: '',
    popularPOIs: [],
    suggestion: ''
  },

  onLoad() {
    this.loadInfo();
  },

  onShow() {
    // 回到页面时刷新
    this.loadInfo();
  },

  /** 加载实时信息 */
  loadInfo() {
    const app = getApp();
    api.initApi(app.getSessionId(), app.getTenantId());

    this.setData({ loading: true });

    api.getRealTimeInfo().then(res => {
      if (res && res.code === 200 && res.data) {
        this.processInfo(res.data);
      } else {
        this.loadMockInfo();
      }
    }).catch(err => {
      console.error('[RealtimeInfo] 加载失败:', err);
      this.loadMockInfo();
    });
  },

  /** 处理实时信息数据 */
  processInfo(data) {
    const info = {
      weather: data.weather || '晴',
      temperature: data.temperature || 26,
      humidity: data.humidity,
      windSpeed: data.windSpeed || data.wind_speed,
      crowdednessLevel: data.crowdednessLevel || data.crowdedness_level || 1,
      announcements: data.announcements || [],
      peakPois: data.peakPois || data.peak_pois || []
    };

    const now = new Date();
    const updateTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const crowdTexts = {
      1: { status: '景区人流宽松', desc: '游览舒适度高，非常适合出行' },
      2: { status: '景区人流较少', desc: '游客不多，可以悠闲游览' },
      3: { status: '景区人流适中', desc: '热门景点可能有些拥挤' },
      4: { status: '景区人流较多', desc: '建议错峰游览热门景点' },
      5: { status: '景区非常拥挤', desc: '建议避开高峰时段，选择冷门路线' }
    };

    const crowd = crowdTexts[info.crowdednessLevel] || crowdTexts[1];

    // 拥挤景点列表
    const popularPOIs = (info.peakPois || []).map(item => ({
      poiId: item.poiId || item.poi_id || '',
      name: item.name || '未知景点',
      crowdedness: item.crowdedness || item.level || 3
    }));

    // 生成建议
    let suggestion = '';
    if (info.crowdednessLevel >= 4) {
      suggestion = '当前景区人流密集，建议您先前往人流较少的景点游览，或选择错峰出行。推荐使用我们的路线推荐功能获取个性化游览路线。';
    } else if (info.crowdednessLevel >= 3) {
      suggestion = '景区整体人流适中，建议您优先游览热门景点，或查看路线推荐获取最佳游览顺序。';
    } else {
      suggestion = '景区当前人流较少，非常适合游览。祝您旅途愉快！';
    }

    // 天气图标
    const weatherIcons = {
      '晴': '☀️', '多云': '⛅', '阴': '☁️',
      '小雨': '🌦️', '中雨': '🌧️', '大雨': '🌧️',
      '雷阵雨': '⛈️', '雪': '❄️', '雾': '🌫️'
    };

    this.setData({
      info,
      loading: false,
      weatherIcon: weatherIcons[info.weather] || '☀️',
      crowdStatusText: crowd.status,
      crowdDescText: crowd.desc,
      updateTime,
      popularPOIs,
      suggestion
    });
  },

  /** Mock 数据兜底 */
  loadMockInfo() {
    const info = {
      weather: '晴',
      temperature: 28,
      humidity: 65,
      windSpeed: 2.5,
      crowdednessLevel: 3,
      announcements: [
        '今日索道检修，请步行上山',
        '雷峰塔景区10:00-14:00人流较大，建议错峰参观',
        '景区内提供免费WiFi，搜索"SmartScenery"即可连接'
      ],
      peakPois: [
        { poiId: 'poi_001', name: '雷峰塔', crowdedness: 4 },
        { poiId: 'poi_003', name: '断桥残雪', crowdedness: 5 },
        { poiId: 'poi_002', name: '苏堤春晓', crowdedness: 3 }
      ]
    };
    this.processInfo(info);
  },

  /** 刷新信息 */
  refreshInfo() {
    this.setData({ refreshing: true });
    this.loadInfo();
    setTimeout(() => {
      this.setData({ refreshing: false });
      wx.showToast({ title: '已刷新', icon: 'success' });
    }, 1000);
  },

  /** 跳转景点列表 */
  goToPOIs() {
    wx.navigateTo({ url: '/pages/pois/pois' });
  },

  /** 跳转聊天 */
  goToChat() {
    const app = getApp();
    wx.navigateTo({
      url: `/pages/chat/chat?mode=text&tenantId=${app.getTenantId()}`
    });
  }
});