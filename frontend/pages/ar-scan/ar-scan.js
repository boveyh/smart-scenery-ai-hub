// pages/ar-scan/ar-scan.js
const api = require('../../utils/api.js');

Page({
  data: {
    imageUrl: '',
    result: null,
    question: ''
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const file = res.tempFiles[0].tempFilePath;
        this.setData({ imageUrl: file, result: null });
        this.recognize(file);
      }
    });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const file = res.tempFiles[0].tempFilePath;
        this.setData({ imageUrl: file, result: null });
        this.recognize(file);
      }
    });
  },

  async recognize(file) {
    wx.showLoading({ title: '识别中...' });
    try {
      const data = await api.recognizeVision(file);
      this.setData({ result: data });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '识别失败', icon: 'none' });
    }
  },

  onQuestionInput(e) {
    this.setData({ question: e.detail.value });
  },

  async askQuestion() {
    if (!this.data.imageUrl) {
      wx.showToast({ title: '请先拍照或选择图片', icon: 'none' });
      return;
    }
    if (!this.data.question.trim()) {
      wx.showToast({ title: '请输入问题', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '处理中...' });
    try {
      const data = await api.recognizeVision(this.data.imageUrl, this.data.question);
      this.setData({ result: data });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提问失败', icon: 'none' });
    }
  }
});