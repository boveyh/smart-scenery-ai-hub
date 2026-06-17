// utils/api.js
const config = require('../config.js');

// 通用请求封装
const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const tenantId = wx.getStorageSync('tenantId') || config.DEFAULT_TENANT_ID;
    wx.request({
      url: config.API_BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'X-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: config.TIMEOUT_MS,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          resolve(res.data.data);
        } else {
          reject(res.data || res);
        }
      },
      fail: reject
    });
  });
};

// ===== POI =====
function getPOIs(params) {
  return request('/pois', { data: params });
}
function getPOIsByCategory(category) {
  return request(`/pois/category/${category}`);
}
function getPOIDetail(poiId) {
  return request(`/pois/${poiId}`);
}
function getPOIsBatch(poiIds) {
  return request('/pois/batch', { method: 'POST', data: poiIds });
}

// ===== 路线推荐 =====
function recommendRoute(preferences) {
  return request('/route/recommend', { method: 'POST', data: preferences });
}

// ===== 实时资讯 =====
function getRealTimeInfo() {
  return request('/info/realtime');
}

// ===== 拥挤度 =====
function getCrowdednessHistory(poiId, hours = 24) {
  return request(`/crowdedness/history/${poiId}?hours=${hours}`);
}
function getLatestCrowdedness(poiId) {
  return request(`/crowdedness/latest/${poiId}`);
}

// ===== 拍照识别 =====
function recognizeVision(imageFile, question = '') {
  return new Promise((resolve, reject) => {
    const tenantId = wx.getStorageSync('tenantId') || config.DEFAULT_TENANT_ID;
    wx.uploadFile({
      url: config.API_BASE_URL + '/vision/recognize',
      filePath: imageFile,
      name: 'image',
      formData: { question },
      header: { 'X-Tenant-Id': tenantId },
      timeout: config.TIMEOUT_MS,
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200) resolve(data.data);
          else reject(data);
        } catch (e) { reject(e); }
      },
      fail: reject
    });
  });
}

// ===== 离线知识库 =====
function getOfflineKnowledge() {
  return request('/knowledge/offline');
}

// ===== 数字人流接口 =====
function startDigitalHumanStream(sessionId) {
  return new Promise((resolve, reject) => {
    const tenantId = wx.getStorageSync('tenantId') || config.DEFAULT_TENANT_ID;
    wx.request({
      url: config.DIGITAL_HUMAN_BASE + config.START_STREAM_API,
      method: 'POST',
      header: { 'X-Tenant-Id': tenantId, 'Content-Type': 'application/json' },
      data: { sessionId },
      timeout: config.TIMEOUT_MS,
      success: (res) => {
        if (res.data.code === 200) resolve(res.data.data.streamUrl);
        else reject(res.data);
      },
      fail: reject
    });
  });
}
function stopDigitalHumanStream(sessionId) {
  return new Promise((resolve) => {
    const tenantId = wx.getStorageSync('tenantId') || config.DEFAULT_TENANT_ID;
    wx.request({
      url: config.DIGITAL_HUMAN_BASE + config.STOP_STREAM_API,
      method: 'POST',
      header: { 'X-Tenant-Id': tenantId, 'Content-Type': 'application/json' },
      data: { sessionId },
      timeout: 3000,
      complete: resolve
    });
  });
}
function changeClothing(sessionId, clothingId) {
  return new Promise((resolve, reject) => {
    const tenantId = wx.getStorageSync('tenantId') || config.DEFAULT_TENANT_ID;
    wx.request({
      url: config.DIGITAL_HUMAN_BASE + config.CHANGE_CLOTHING_API,
      method: 'POST',
      header: { 'X-Tenant-Id': tenantId, 'Content-Type': 'application/json' },
      data: { sessionId, clothingId },
      timeout: config.TIMEOUT_MS,
      success: (res) => {
        if (res.data.code === 200) resolve(res.data.data.newStreamUrl);
        else reject(res.data);
      },
      fail: reject
    });
  });
}
function getClothingList() {
  return new Promise((resolve, reject) => {
    const tenantId = wx.getStorageSync('tenantId') || config.DEFAULT_TENANT_ID;
    wx.request({
      url: config.DIGITAL_HUMAN_BASE + config.CLOTHING_LIST_API,
      header: { 'X-Tenant-Id': tenantId },
      timeout: config.TIMEOUT_MS,
      success: (res) => {
        if (res.data.code === 200) resolve(res.data.data);
        else reject(res.data);
      },
      fail: reject
    });
  });
}

module.exports = {
  getPOIs,
  getPOIsByCategory,
  getPOIDetail,
  getPOIsBatch,
  recommendRoute,
  getRealTimeInfo,
  getCrowdednessHistory,
  getLatestCrowdedness,
  recognizeVision,
  getOfflineKnowledge,
  startDigitalHumanStream,
  stopDigitalHumanStream,
  changeClothing,
  getClothingList
};