const config = require('../../config.js');
const api = require('../../utils/api.js');
const { generateUUID } = require('../../utils/util.js');

Page({
  data: {
    mode: 'text',              // text / digital_human
    messages: [],              // [{role, content, finished?, textChunks?}]
    inputText: '',
    lastMsgId: '',
    isTyping: false,
    offlineMode: false,
    // 数字人模式（视频展示 - 备用视觉方案）
    videoSrc: '',
    subtitleText: '',
    isSpeaking: false,
    // 离线知识库
    offlineFAQ: config.offlineFAQ
  },

  onLoad(options) {
    this.tenantId = options.tenantId || config.defaultTenantId;
    this.modeFromUrl = options.mode || 'text';
    this.sessionId = wx.getStorageSync('sessionId') || generateUUID();
    wx.setStorageSync('sessionId', this.sessionId);

    // 同步 API 模块的租户和会话
    api.initApi(this.sessionId, this.tenantId);

    this.setData({ mode: this.modeFromUrl });

    if (this.modeFromUrl === 'digital_human') {
      this.initDigitalHumanMode();
    }

    console.log('[Chat] 加载, 租户:', this.tenantId, '模式:', this.modeFromUrl);
  },

  onUnload() {
    this.cleanupCurrentMode();
    this._manualClose = true;
    if (this.wsTask) {
      this.wsTask.close({ code: 1000, reason: 'page_unload' });
      this.wsTask = null;
    }
  },

  // ==================== 模式切换 ====================

  switchMode(e) {
    const newMode = e.currentTarget.dataset.mode;
    if (newMode === this.data.mode) return;

    this.cleanupCurrentMode();

    if (newMode === 'digital_human') {
      this.initDigitalHumanMode();
    } else {
      this.closeWebSocket();
    }

    this.setData({
      mode: newMode,
      messages: [],
      isTyping: false,
      subtitleText: '',
      isSpeaking: false
    });
  },

  cleanupCurrentMode() {
    this.closeWebSocket();
    this.stopHeartbeat();
    if (this.audioCtx) {
      this.audioCtx.destroy();
      this.audioCtx = null;
    }
    this.clearChunkBuffer();
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  },

  initDigitalHumanMode() {
    // 加载空闲视频（作为视觉展示）
    this.setData({
      videoSrc: config.digitalHuman.idleVideo,
      isSpeaking: false
    });
  },

  // ==================== 文本模式：WebSocket ====================

  connectWebSocket() {
    if (this.wsTask) return;

    this.wsTask = api.connectTextWebSocket();

    this.wsTask.onMessage((res) => {
      const raw = typeof res.data === 'string' ? res.data : '';
      this.parseWSChunk(raw);
    });

    this.wsTask.onOpen(() => {
      console.log('[WS] 连接成功');
      this.startHeartbeat();
      this.wsReconnecting = false;
      this.flushPendingMessage();
    });

    this.wsTask.onClose((res) => {
      console.log('[WS] 连接关闭', res.code, res.reason);
      this.stopHeartbeat();
      this.wsTask = null;
      if (!this._manualClose && this.data.mode === 'text' && !this.data.offlineMode) {
        this.tryReconnectWS();
      }
    });

    this.wsTask.onError((err) => {
      console.error('[WS] 连接错误:', err);
      this.wsTask = null;
      this.stopHeartbeat();
      this.handleServiceError({ code: 503, message: 'AI服务不可用，已切换离线模式' });
    });
  },

  tryReconnectWS() {
    if (this.wsReconnecting) return;
    this.wsReconnecting = true;
    console.log('[WS] 尝试重连...');
    setTimeout(() => {
      this.wsReconnecting = false;
      if (this.data.mode === 'text' && !this.data.offlineMode) {
        this.connectWebSocket();
      }
    }, 2000);
  },

  closeWebSocket() {
    this._manualClose = true;
    if (this.wsTask) {
      this.wsTask.close({ code: 1000, reason: 'user_close' });
      this.wsTask = null;
    }
  },

  startHeartbeat() {
    this.stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this.wsTask) {
        api.sendHeartbeat(this.wsTask);
      }
    }, config.heartbeatInterval);
  },

  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  },

  parseWSChunk(raw) {
    this._wsBuffer = (this._wsBuffer || '') + raw;
    const lines = this._wsBuffer.split('\n');
    this._wsBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj.type === 'text') {
          this.appendTextChunk(obj.content, obj.seq);
        } else if (obj.type === 'end') {
          this.finishAssistantMessage();
          this.setData({ isTyping: false });
          console.log('[WS] 对话结束, reason:', obj.reason);
        } else if (obj.type === 'error') {
          this.handleServiceError(obj);
        }
      } catch (e) {
        console.error('[WS] JSON解析失败:', line);
      }
    }
  },

  appendTextChunk(content, seq) {
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
      lastMsg.content += content;
      lastMsg.seq = seq;
    } else {
      messages.push({
        role: 'assistant',
        content: content,
        finished: false,
        seq: seq
      });
    }

    this.setData({
      messages,
      lastMsgId: `msg-${messages.length - 1}`
    });
  },

  finishAssistantMessage() {
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
      lastMsg.finished = true;
      this.setData({ messages, lastMsgId: `msg-${messages.length - 1}` });
    }
  },

  // ==================== 数字人模式：HTTP流式 ====================

  sendDigitalHumanMessage(content) {
    // 添加用户消息
    const userMsg = { role: 'user', content };
    const messages = [...this.data.messages, userMsg];
    this.setData({
      messages,
      inputText: '',
      isTyping: true,
      lastMsgId: `msg-${messages.length - 1}`
    });

    // 初始化音频队列
    this._audioQueue = [];
    this._currentAudioIndex = 0;
    this._allChunks = [];
    this._chunkBuffer = '';

    // 发起流式请求
    this._streamRequest = api.digitalHumanChat(content, {
      onChunk: (chunk) => this.handleDigitalHumanChunk(chunk),
      onEnd: (endObj) => this.handleDigitalHumanEnd(endObj),
      onError: (err) => this.handleServiceError(err)
    });
  },

  handleDigitalHumanChunk(chunk) {
    if (!chunk.text_chunk) return;

    this._allChunks.push(chunk);

    // 音频队列
    if (chunk.audio_url) {
      this._audioQueue.push({
        seq: chunk.seq,
        text_chunk: chunk.text_chunk,
        audio_url: chunk.audio_url
      });
    }

    // 追加文本到消息
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
      if (!lastMsg.textChunks) lastMsg.textChunks = [];
      lastMsg.textChunks.push(chunk.text_chunk);
      lastMsg.content = lastMsg.textChunks.join('');
    } else {
      messages.push({
        role: 'assistant',
        content: chunk.text_chunk,
        textChunks: [chunk.text_chunk],
        finished: false
      });
    }

    this.setData({
      messages,
      lastMsgId: `msg-${messages.length - 1}`
    });

    // 播放下一个音频
    if (this._audioQueue.length === 1) {
      this.playNextAudio();
    }
  },

  handleDigitalHumanEnd(endObj) {
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
      lastMsg.finished = true;
      this.setData({ messages, lastMsgId: `msg-${messages.length - 1}` });
    }

    if (!this.isAudioPlaying) {
      this.finishDigitalHumanSession();
    }
    console.log('[DH] 对话结束, reason:', endObj.reason);
  },

  // ==================== 数字人音频播放 + 视频切换 ====================

  playNextAudio() {
    if (this._currentAudioIndex >= this._audioQueue.length) {
      this.isAudioPlaying = false;
      this.finishDigitalHumanSession();
      return;
    }

    const item = this._audioQueue[this._currentAudioIndex];
    this.isAudioPlaying = true;

    // 显示字幕
    this.setData({ subtitleText: item.text_chunk });

    // 播放音频
    if (this.audioCtx) {
      this.audioCtx.destroy();
    }
    this.audioCtx = wx.createInnerAudioContext({ useWebAudioImplement: true });

    const ctx = this.audioCtx;
    let loadTimeout;

    ctx.onPlay(() => {
      if (loadTimeout) clearTimeout(loadTimeout);
      this.setData({
        videoSrc: config.digitalHuman.speakingVideo,
        isSpeaking: true
      });
    });

    ctx.onEnded(() => {
      if (loadTimeout) clearTimeout(loadTimeout);
      this.setData({
        videoSrc: config.digitalHuman.idleVideo,
        isSpeaking: false
      });
      this._currentAudioIndex++;
      setTimeout(() => this.playNextAudio(), 300);
    });

    ctx.onError((err) => {
      if (loadTimeout) clearTimeout(loadTimeout);
      console.error('[Audio] 播放失败:', item.audio_url, err);
      this._currentAudioIndex++;
      if (this.audioCtx) {
        this.audioCtx.destroy();
        this.audioCtx = null;
      }
      setTimeout(() => this.playNextAudio(), 300);
    });

    loadTimeout = setTimeout(() => {
      console.warn('[Audio] 加载超时:', item.audio_url);
      this._currentAudioIndex++;
      if (this.audioCtx) {
        this.audioCtx.destroy();
        this.audioCtx = null;
      }
      setTimeout(() => this.playNextAudio(), 300);
    }, config.audioTimeout);

    ctx.src = item.audio_url;
    ctx.play();
  },

  finishDigitalHumanSession() {
    this.setData({
      isTyping: false,
      videoSrc: config.digitalHuman.idleVideo,
      isSpeaking: false,
      subtitleText: ''
    });
    if (this.audioCtx) {
      this.audioCtx.destroy();
      this.audioCtx = null;
    }
    this._audioQueue = [];
    this._allChunks = [];
  },

  clearChunkBuffer() {
    this._wsBuffer = '';
    this._audioQueue = [];
    this._allChunks = [];
    if (this._streamRequest) {
      try { this._streamRequest.abort(); } catch (e) { /* ignore */ }
      this._streamRequest = null;
    }
  },

  // ==================== 发送消息入口 ====================

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  sendText() {
    const content = this.data.inputText.trim();
    if (!content || this.data.isTyping) return;

    if (this.data.mode === 'text') {
      this.sendTextMessageWS(content);
    } else if (this.data.mode === 'digital_human') {
      this.sendDigitalHumanMessage(content);
    }
  },

  sendTextMessageWS(content) {
    // 添加用户消息
    const userMsg = { role: 'user', content };
    const messages = [...this.data.messages, userMsg];
    this.setData({
      messages,
      inputText: '',
      isTyping: true,
      lastMsgId: `msg-${messages.length - 1}`
    });

    if (this.data.offlineMode) {
      // 离线模式：本地匹配FAQ
      const answer = this.matchOfflineFAQ(content);
      messages.push({ role: 'assistant', content: answer, finished: true });
      this.setData({
        messages,
        isTyping: false,
        lastMsgId: `msg-${messages.length - 1}`
      });
      return;
    }

    // 确保 WebSocket 已连接
    if (!this.wsTask) {
      this.connectWebSocket();
      this._pendingMessage = content;
      return;
    }

    const state = this.wsTask.readyState;
    if (state === 1) { // OPEN
      api.sendTextMessage(this.wsTask, content);
    } else if (state === 0) { // CONNECTING
      this._pendingMessage = content;
    } else {
      this.connectWebSocket();
      this._pendingMessage = content;
    }
  },

  flushPendingMessage() {
    if (this._pendingMessage && this.wsTask) {
      api.sendTextMessage(this.wsTask, this._pendingMessage);
      this._pendingMessage = null;
    }
  },

  // ==================== 离线模式 ====================

  matchOfflineFAQ(question) {
    const faq = this.data.offlineFAQ;
    for (const keyword in faq) {
      if (question.includes(keyword)) {
        return faq[keyword];
      }
    }
    return '抱歉，当前处于离线模式，无法回答此问题。请联网后重试。';
  },

  triggerOfflineFallback() {
    if (this.data.offlineMode) {
      wx.showToast({ title: '已是离线模式', icon: 'none' });
      return;
    }

    if (this.data.mode === 'digital_human') {
      this.cleanupCurrentMode();
    }

    this.closeWebSocket();
    this.stopHeartbeat();
    this.setData({
      offlineMode: true,
      mode: 'text',
      isTyping: false
    });

    this.addSystemMessage('网络不稳定，已自动切换至离线问答模式。您可以尝试提问：西湖、门票、厕所、雷峰塔、苏堤等。');
    wx.showModal({
      title: '离线模式已启用',
      content: '当前网络不可用，已切换到本地知识库。',
      showCancel: false
    });
  },

  handleServiceError(error) {
    const result = api.handleErrorCode(error);

    if (result.fallback) {
      this.setData({ offlineMode: true, isTyping: false });
      this.addSystemMessage(result.message);
    } else {
      wx.showToast({ title: result.message, icon: 'none', duration: 2500 });
      this.setData({ isTyping: false });
    }
  },

  // ==================== 辅助方法 ====================

  addSystemMessage(content) {
    const messages = this.data.messages;
    messages.push({ role: 'system', content });
    this.setData({
      messages,
      lastMsgId: `msg-${messages.length - 1}`
    });
  },

  addMessage(role, content, finished = true) {
    const msg = { role, content, finished };
    this.data.messages.push(msg);
    this.setData({
      messages: this.data.messages,
      lastMsgId: `msg-${this.data.messages.length - 1}`
    });
  },

  startVoice() {
    wx.showToast({ title: '语音功能开发中', icon: 'none' });
  }
});