// pages/chat/chat.js
const config = require('../../config.js');
const api = require('../../utils/api.js');
const { generateUUID } = require('../../utils/util.js');

Page({
  data: {
    mode: 'text',              // text / digital_human
    messages: [],
    inputText: '',
    lastMsgId: '',
    isTyping: false,
    // 数字人
    streamUrl: '',
    currentSubtitle: '',
    isStreamReady: false
  },

  onLoad(options) {
    this.tenantId = options.tenantId || config.DEFAULT_TENANT_ID;
    this.modeFromUrl = options.mode || 'text';
    this.sessionId = wx.getStorageSync('sessionId') || generateUUID();
    wx.setStorageSync('sessionId', this.sessionId);
    this.setData({ mode: this.modeFromUrl });
    if (this.modeFromUrl === 'text') {
      this.initTextMode();
    } else {
      this.initDigitalHumanMode();
    }
  },

  onUnload() {
    this.closeWebSocket();
    this.stopDigitalHuman();
  },

  // ---------- 模式切换 ----------
  switchMode(e) {
    const newMode = e.currentTarget.dataset.mode;
    if (newMode === this.data.mode) return;
    // 清理旧模式
    if (this.data.mode === 'text') {
      this.closeWebSocket();
    } else {
      this.stopDigitalHuman();
      this.setData({ streamUrl: '', isStreamReady: false });
    }
    this.setData({ mode: newMode, messages: [], currentSubtitle: '' });
    if (newMode === 'text') {
      this.initTextMode();
    } else {
      this.initDigitalHumanMode();
    }
  },

  // ---------- 文本模式 ----------
  initTextMode() {
    const wsUrl = `${config.WS_BASE_URL}/chat?tenant_id=${this.tenantId}&session_id=${this.sessionId}`;
    this.ws = wx.connectSocket({ url: wsUrl });
    this.ws.onOpen(() => {
      console.log('WebSocket 已连接');
    });
    this.ws.onMessage((res) => {
      const lines = res.data.split('\n');
      lines.forEach(line => {
        if (!line.trim()) return;
        try {
          const data = JSON.parse(line);
          if (data.type === 'text') {
            this.appendAssistantText(data.content);
          } else if (data.type === 'end') {
            this.setData({ isTyping: false });
          }
        } catch (e) {}
      });
    });
    this.ws.onError(() => {
      this.fallbackToOffline();
    });
    this.ws.onClose(() => {
      console.log('WebSocket 已关闭');
    });
  },

  closeWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  },

  sendText() {
    const content = this.data.inputText.trim();
    if (!content || this.data.isTyping) return;
    this.addMessage('user', content);
    this.setData({ inputText: '', isTyping: true });
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send({ data: JSON.stringify({ action: 'send_message', content }) });
    } else {
      this.fallbackToOffline();
    }
  },

  addMessage(role, content, finished = true) {
    const msg = { role, content, finished };
    this.data.messages.push(msg);
    this.setData({
      messages: this.data.messages,
      lastMsgId: `msg-${this.data.messages.length - 1}`
    });
  },

  appendAssistantText(text) {
    const last = this.data.messages[this.data.messages.length - 1];
    if (last && last.role === 'assistant' && !last.finished) {
      last.content += text;
      this.setData({ messages: this.data.messages });
    } else {
      this.addMessage('assistant', text, false);
    }
  },

  fallbackToOffline() {
    wx.showToast({ title: '网络异常，已切换离线模式', icon: 'none' });
    this.setData({ isTyping: false });
    // 这里可以显示一条系统消息，或使用本地FAQ
    this.addMessage('system', '网络不稳定，部分功能受限。请检查网络后重试。');
  },

  startVoice() {
    wx.showToast({ title: '语音功能开发中', icon: 'none' });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // ---------- 数字人模式 ----------
  async initDigitalHumanMode() {
    wx.showLoading({ title: '连接数字人...' });
    try {
      const streamUrl = await api.startDigitalHumanStream(this.sessionId);
      if (streamUrl) {
        this.setData({ streamUrl });
        // 初始化 live-player
        this.playerContext = wx.createLivePlayerContext('digitalHumanPlayer', this);
        this.setData({ isStreamReady: true });
        wx.hideLoading();
      } else {
        throw new Error('流地址为空');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('数字人启动失败', err);
      wx.showToast({ title: '数字人启动失败，切换至文本模式', icon: 'none' });
      this.setData({ mode: 'text' });
      this.initTextMode();
    }
  },

  stopDigitalHuman() {
    if (this.playerContext) {
      this.playerContext.stop();
      this.playerContext = null;
    }
    api.stopDigitalHumanStream(this.sessionId).catch(() => {});
  },

  onPlayStateChange(e) {
    const { code } = e.detail;
    console.log('播放状态变化:', code);
    if (code === -2301) {
      wx.showToast({ title: '视频流播放失败，切换至文本模式', icon: 'none' });
      this.setData({ mode: 'text' });
      this.initTextMode();
    }
  },

  // ---------- 换装 ----------
  async openClothingPanel() {
    try {
      const list = await api.getClothingList();
      if (!list || list.length === 0) {
        wx.showToast({ title: '暂无可用服装', icon: 'none' });
        return;
      }
      const itemList = list.map(item => item.name);
      wx.showActionSheet({
        itemList,
        success: async (res) => {
          const selected = list[res.tapIndex];
          wx.showLoading({ title: '换装中...' });
          try {
            const newUrl = await api.changeClothing(this.sessionId, selected.id);
            if (newUrl) {
              this.setData({ streamUrl: newUrl });
              // 重新加载播放器
              this.playerContext = wx.createLivePlayerContext('digitalHumanPlayer', this);
              wx.hideLoading();
              wx.showToast({ title: '换装成功', icon: 'success' });
            } else {
              throw new Error('换装后未返回新流地址');
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '换装失败', icon: 'none' });
          }
        }
      });
    } catch (err) {
      wx.showToast({ title: '获取服装列表失败', icon: 'none' });
    }
  }
});