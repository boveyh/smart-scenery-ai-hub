const api = require('../../utils/api.js');
const config = require('../../config.js');

Page({
  data: {
    startPoiId: '',
    submitting: false,
    loading: false,
    result: null,
    form: {
      interest: '全部',
      pace: 'normal',
      companions: 'alone',
      durationMin: 180
    },
    interestOptions: [
      { label: '全部', value: '全部' },
      { label: '历史文化', value: '历史文化' },
      { label: '自然风光', value: '自然风光' },
      { label: '休闲娱乐', value: '休闲娱乐' }
    ],
    paceOptions: [
      { label: '悠闲逛', value: 'relaxed' },
      { label: '刚刚好', value: 'normal' },
      { label: '紧凑游', value: 'hurried' }
    ],
    companionOptions: [
      { label: '独自一人', value: 'alone' },
      { label: '情侣/朋友', value: 'solo' },
      { label: '带小孩', value: 'with_children' },
      { label: '带老人', value: 'with_elderly' },
      { label: '团队出游', value: 'group' }
    ],
    durationOptions: [
      { label: '1小时', value: 60 },
      { label: '2小时', value: 120 },
      { label: '3小时', value: 180 },
      { label: '半天', value: 240 },
      { label: '全天', value: 480 }
    ]
  },

  onLoad(options) {
    if (options.startPoiId) {
      this.setData({ startPoiId: options.startPoiId });
    }
  },

  /** 选项选择 */
  onOptionSelect(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: field === 'durationMin' ? parseInt(value) : value
    });
  },

  /** 提交路线推荐请求 */
  submitRoute() {
    const { form, startPoiId } = this.data;
    if (!startPoiId) {
      // 如果没有起始景点，选第一个景点作为起点
      wx.showToast({ title: '请从景点详情进入', icon: 'none' });
      return;
    }

    const app = getApp();
    api.initApi(app.getSessionId(), app.getTenantId());

    this.setData({ submitting: true, loading: true, result: null });

    const requestData = {
      preferences: {
        interest: form.interest,
        pace: form.pace,
        companions: form.companions,
        duration_min: form.durationMin
      },
      start_poi_id: startPoiId
    };

    api.recommendRoute(requestData).then(res => {
      if (res && res.code === 200 && res.data) {
        const data = res.data;
        const result = {
          routeId: data.routeId || data.route_id,
          estimatedTimeMin: data.estimatedTimeMin || data.estimated_time_min || 0,
          tips: data.tips || [],
          poiDetails: [],
          poiSequence: data.poiSequence || data.poi_sequence || []
        };

        // 如果后端返回了 poiDetails 直接用，否则通过 poiSequence 加载
        if (data.poiDetails && data.poiDetails.length > 0) {
          result.poiDetails = data.poiDetails.map(this.normalizePOI);
          this.setData({ result, submitting: false, loading: false });
        } else if (result.poiSequence.length > 0) {
          // 批量加载景点详情
          this.loadPOIDetails(result.poiSequence, result);
        } else {
          this.loadMockResult(startPoiId);
        }
      } else {
        this.loadMockResult(startPoiId);
      }
    }).catch(err => {
      console.error('[Route] 推荐失败:', err);
      this.loadMockResult(startPoiId);
    });
  },

  /** 批量加载 POI 详情 */
  loadPOIDetails(poiIds, result) {
    api.getPOIsBatch(poiIds).then(res => {
      if (res && res.code === 200 && res.data) {
        const poiMap = res.data;
        result.poiDetails = poiIds.map(id => {
          const item = poiMap[id];
          return item ? this.normalizePOI(item) : { poiId: id, name: id, description: '' };
        });
      } else {
        result.poiDetails = poiIds.map(id => ({ poiId: id, name: `景点 ${id}`, description: '' }));
      }
      this.setData({ result, submitting: false, loading: false });
    }).catch(() => {
      result.poiDetails = poiIds.map(id => ({ poiId: id, name: `景点 ${id}`, description: '' }));
      this.setData({ result, submitting: false, loading: false });
    });
  },

  /** Mock 路线结果兜底 */
  loadMockResult(startPoiId) {
    const mockPOIs = [
      { poiId: 'poi_001', name: '雷峰塔', category: '历史文化', description: '始建于977年，白蛇传传说发生地', avgStayMin: 45, crowdedness: 4 },
      { poiId: 'poi_002', name: '苏堤春晓', category: '自然风光', description: '苏堤贯穿西湖南北，全长约3公里', avgStayMin: 60, crowdedness: 3 },
      { poiId: 'poi_003', name: '断桥残雪', category: '历史文化', description: '西湖最著名的桥，白娘子许仙相遇处', avgStayMin: 30, crowdedness: 5 },
      { poiId: 'poi_004', name: '曲院风荷', category: '自然风光', description: '以夏日荷花闻名，景色优美', avgStayMin: 40, crowdedness: 2 },
      { poiId: 'poi_005', name: '三潭印月', category: '自然风光', description: '西湖中最大岛屿，三座石塔闻名', avgStayMin: 50, crowdedness: 3 }
    ];

    // 找到起点，然后组合路线
    const startIdx = mockPOIs.findIndex(p => p.poiId === startPoiId);
    const ordered = [];
    if (startIdx >= 0) {
      for (let i = 0; i < mockPOIs.length; i++) {
        ordered.push(mockPOIs[(startIdx + i) % mockPOIs.length]);
      }
    } else {
      ordered.push(...mockPOIs);
    }

    const result = {
      routeId: 'route_mock_001',
      estimatedTimeMin: 180,
      tips: [
        '建议早上8点前出发，避开人流高峰',
        '雷峰塔10点后人流较大，建议先游览',
        '带上防晒霜和饮用水，夏季日照强烈',
        '景区内有免费WiFi，可随时使用AI导览'
      ],
      poiDetails: ordered.slice(0, 4)
    };

    this.setData({ result, submitting: false, loading: false });
  },

  /** 标准化 POI */
  normalizePOI(item) {
    return {
      poiId: item.poiId || item.poi_id,
      name: item.name,
      category: item.category,
      description: item.description || item.detail_content || '',
      avgStayMin: item.avgStayMin || item.avg_stay_min || 30,
      crowdedness: item.crowdedness || 1
    };
  },

  /** 重置表单 */
  resetForm() {
    this.setData({
      result: null,
      form: { interest: '全部', pace: 'normal', companions: 'alone', durationMin: 180 }
    });
  },

  /** 跳转聊天 */
  goToChat() {
    const app = getApp();
    wx.navigateTo({
      url: `/pages/chat/chat?mode=text&tenantId=${app.getTenantId()}`,
      fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
    });
  }
});