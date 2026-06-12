// pages/chat/chat.js
const config = require('../../config.js');
const api = require('../../utils/api.js');
const util = require('../../utils/util.js');

Page({
  data: {
    mode: 'text',               // text / digital_human
    messages: [],               // [{role, content, finished?, textChunks?}]
    inputText: '',
    lastMsgId: '',
    isTyping: false,
    offlineMode: false,
    // 数字人模式专用
    videoSrc: '',               // 当前播放的视频
    subtitleText: '',           // 字幕文本
    isSpeaking: false,          // 是否正在说话（控制idle/speaking视频切换）
    // 离线知识库
    offlineFAQ: config.offlineFAQ
  },

  onLoad(options) {
    this.tenantId = options.tenantId || config.defaultTenantId;
    this.modeFromUrl = options.mode || 'text';
    // 同步API模块的租户ID
    const app = getApp();
    api.initApi(app.getSessionId(), this.tenantId);

    this.setData({ mode: this.modeFromUrl });

    // 数字人模式初始化
    if (this.modeFromUrl === 'digital_human') {
      this.initDigitalHumanMode();
    }

    console.log('[Chat] 加载, 租户:', this.tenantId, '模式:', this.modeFromUrl);
  },

  // ==================== 模式切换 ====================

  switchMode(e) {
    const newMode = e.currentTarget.dataset.mode;
    if (newMode === this.data.mode) return;

    // 清理当前模式资源
    this.cleanupCurrentMode();

    if (newMode === 'digital_human') {
      this.initDigitalHumanMode();
    } else {
      // 切回文本模式关闭WS
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

  /** 清理当前模式的资源 */
  cleanupCurrentMode() {
    // 关闭 WebSocket（文本模式）
    this.closeWebSocket();
    // 停止心跳
    this.stopHeartbeat();
    // 销毁音频
    util.destroyAudio(this.audioCtx);
    this.audioCtx = null;
    // 清理流式请求
    this.clearChunkBuffer();
    // 清理定时器
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  },

  /** 初始化数字人模式 */
  initDigitalHumanMode() {
    // 加载空闲视频
    this.setData({
      videoSrc: config.digitalHuman.idleVideo,
      isSpeaking: false
    });
  },

  // ==================== 文本模式：WebSocket ====================

  /** 连接WebSocket */
  connectWebSocket() {
    if (this.wsTask) return;

    this.wsTask = api.connectTextWebSocket();

    // 接收消息
    this.wsTask.onMessage((res) => {
      const raw = typeof res.data === 'string' ? res.data : '';
      this.parseWSChunk(raw);
    });

    // 连接成功
    this.wsTask.onOpen(() => {
      console.log('[WS] 连接成功');
      this.startHeartbeat();
      // 重连后清除标记
      this.wsReconnecting = false;
      // 发送积压消息
      this.flushPendingMessage();
    });

    // 连接关闭
    this.wsTask.onClose((res) => {
      console.log('[WS] 连接关闭', res.code, res.reason);
      this.stopHeartbeat();
      this.wsTask = null;

      // 非主动关闭时尝试重连（仅文本模式在线）
      if (!this._manualClose && this.data.mode === 'text' && !this.data.offlineMode) {
        this.tryReconnectWS();
      }
    });

    // 连接错误
    this.wsTask.onError((err) => {
      console.error('[WS] 连接错误:', err);
      this.wsTask = null;
      this.stopHeartbeat();
      // 降级离线模式
      this.handleServiceError({ code: 503, message: 'AI服务不可用，已切换离线模式' });
    });
  },

  /** 尝试重连WebSocket */
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

  /** 关闭WebSocket */
  closeWebSocket() {
    this._manualClose = true;
    if (this.wsTask) {
      this.wsTask.close({ code: 1000, reason: 'user_close' });
      this.wsTask = null;
    }
  },

  /** 启动心跳 */
  startHeartbeat() {
    this.stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this.wsTask) {
        api.sendHeartbeat(this.wsTask);
      }
    }, config.heartbeatInterval);
  },

  /** 停止心跳 */
  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  },

  /** 解析WebSocket接收的NDJSON分片 */
  parseWSChunk(raw) {
    // 累积buffer，按行解析
    this._wsBuffer = (this._wsBuffer || '') + raw;

    const lines = this._wsBuffer.split('\n');
    // 最后一行可能不完整，保留等待下一chunk
    this._wsBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const obj = JSON.parse(trimmed);

        if (obj.type === 'text') {
          // 文本分片：追加到当前助手消息
          this.appendTextChunk(obj.content, obj.seq);
        } else if (obj.type === 'end') {
          // 对话结束
          this.finishAssistantMessage();
          this.setData({ isTyping: false });
          console.log('[WS] 对话结束, reason:', obj.reason, 'usage:', obj.usage);
        } else if (obj.type === 'error') {
          // 错误处理
          this.handleServiceError(obj);
        }
      } catch (e) {
        console.error('[WS] JSON解析失败:', line);
      }
    }
  },

  /** 追加文本分片到助手消息 */
  appendTextChunk(content, seq) {
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
      lastMsg.content += content;
      lastMsg.seq = seq;
    } else {
      // 创建新的助手消息
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

  /** 标记助手消息已完成 */
  finishAssistantMessage() {
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
      lastMsg.finished = true;
      this.setData({ messages, lastMsgId: `msg-${messages.length - 1}` });
    }
  },

  // ==================== 数字人模式：HTTP流式 ====================

  /** 发送数字人模式消息 */
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

  /** 处理数字人模式单个分片 */
  handleDigitalHumanChunk(chunk) {
    if (!chunk.text_chunk) return;

    // 保存分片信息
    this._allChunks.push(chunk);

    // 添加到音频队列
    if (chunk.audio_url) {
      this._audioQueue.push({
        seq: chunk.seq,
        text_chunk: chunk.text_chunk,
        audio_url: chunk.audio_url
      });
    }

    // 添加助手消息（以text_chunk为粒度）
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
      // 追加文本
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

    // 开始播放音频（仅触发第一个）
    if (this._audioQueue.length === 1) {
      this.playNextAudio();
    }
  },

  /** 处理数字人模式结束 */
  handleDigitalHumanEnd(endObj) {
    const messages = this.data.messages;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
      lastMsg.finished = true;
      this.setData({ messages, lastMsgId: `msg-${messages.length - 1}` });
    }

    // 等待音频全部播放完后恢复idle
    if (!this.isAudioPlaying) {
      this.finishDigitalHumanSession();
    }

    console.log('[DH] 对话结束, reason:', endObj.reason);
  },

  // ==================== 数字人音频播放 + 视频切换 ====================

  /** 播放下一个音频 */
  playNextAudio() {
    if (this._currentAudioIndex >= this._audioQueue.length) {
      // 全部播放完毕
      this.isAudioPlaying = false;
      this.finishDigitalHumanSession();
      return;
    }

    const item = this._audioQueue[this._currentAudioIndex];
    this.isAudioPlaying = true;

    // 显示当前字幕
    this.setData({ subtitleText: item.text_chunk });

    // 创建音频上下文
    util.destroyAudio(this.audioCtx);
    this.audioCtx = wx.createInnerAudioContext({ useWebAudioImplement: true });

    const ctx = this.audioCtx;
    let loadTimeout;

    // 音频开始播放 → 切换到 speaking 视频
    ctx.onPlay(() => {
      if (loadTimeout) clearTimeout(loadTimeout);
      this.setData({
        videoSrc: config.digitalHuman.speakingVideo,
        isSpeaking: true
      });
    });

    // 音频播放结束 → 切换到 idle 视频，播放下一个
    ctx.onEnded(() => {
      if (loadTimeout) clearTimeout(loadTimeout);
      this.setData({
        videoSrc: config.digitalHuman.idleVideo,
        isSpeaking: false
      });
      this._currentAudioIndex++;
      // 短暂间隔后播放下一个
      setTimeout(() => this.playNextAudio(), 300);
    });

    // 音频播放错误 → 降级纯文本，跳下一个
    ctx.onError((err) => {
      if (loadTimeout) clearTimeout(loadTimeout);
      console.error('[Audio] 播放失败:', item.audio_url, err);
      this._currentAudioIndex++;
      util.destroyAudio(this.audioCtx);
      this.audioCtx = null;
      setTimeout(() => this.playNextAudio(), 300);
    });

    // 音频加载超时
    loadTimeout = setTimeout(() => {
      console.warn('[Audio] 加载超时:', item.audio_url);
      this._currentAudioIndex++;
      util.destroyAudio(this.audioCtx);
      this.audioCtx = null;
      setTimeout(() => this.playNextAudio(), 300);
    }, config.audioTimeout);

    // 开始加载音频
    ctx.src = item.audio_url;
    ctx.play();
  },

  /** 数字人模式播放完毕 */
  finishDigitalHumanSession() {
    this.setData({
      isTyping: false,
      videoSrc: config.digitalHuman.idleVideo,
      isSpeaking: false,
      subtitleText: ''
    });
    util.destroyAudio(this.audioCtx);
    this.audioCtx = null;
    this._audioQueue = [];
    this._allChunks = [];
  },

  /** 清理流式缓冲区 */
  clearChunkBuffer() {
    this._rawResponse = '';
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

  /** 文本模式发送 */
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

    // 确保WebSocket已连接
    if (!this.wsTask) {
      this.connectWebSocket();
      // WebSocket连接是异步的，消息在onOpen中发送
      this._pendingMessage = content;
      return;
    }

    // 检查WebSocket状态
    const state = this.wsTask.readyState;
    if (state === 1) { // OPEN
      api.sendTextMessage(this.wsTask, content);
    } else if (state === 0) { // CONNECTING
      this._pendingMessage = content;
    } else {
      // 重连
      this.connectWebSocket();
      this._pendingMessage = content;
    }
  },

  /** 发送积压消息（WebSocket连接建立后） */
  flushPendingMessage() {
    if (this._pendingMessage && this.wsTask) {
      api.sendTextMessage(this.wsTask, this._pendingMessage);
      this._pendingMessage = null;
    }
  },

  // ==================== 离线模式 ====================

  /** 匹配离线知识库 */
  matchOfflineFAQ(question) {
    const faq = this.data.offlineFAQ;
    for (const keyword in faq) {
      if (question.includes(keyword)) {
        return faq[keyword];
      }
    }
    return '抱歉，当前处于离线模式，无法回答此问题。请联网后重试。';
  },

  /** 尝试从服务器获取离线知识库（弱网兜底） */
  fetchOfflineKnowledge() {
    api.getOfflineKnowledge().then(res => {
      if (res?.code === 200 && res?.data) {
        this.setData({ offlineFAQ: res.data });
        wx.setStorageSync('offlineKnowledge', res.data);
        console.log('[离线知识库] 已更新');
      }
    }).catch(err => {
      console.warn('[离线知识库] 获取失败，使用本地缓存', err);
      // 尝试本地缓存
      const cached = wx.getStorageSync('offlineKnowledge');
      if (cached) {
        this.setData({ offlineFAQ: cached });
      }
    });
  },

  /** 手动触发弱网降级 */
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

  /** 服务异常处理（按错误码） */
  handleServiceError(error) {
    const result = api.handleErrorCode(error);

    if (result.fallback) {
      // 需要降级离线
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

  /** 语音输入 */
  startVoice() {
    wx.showToast({ title: '语音功能开发中', icon: 'none' });
  },

  // ==================== 生命周期 ====================

  onUnload() {
    this.cleanupCurrentMode();
    this._manualClose = true;
    if (this.wsTask) {
      this.wsTask.close({ code: 1000, reason: 'page_unload' });
      this.wsTask = null;
    }
  }
});
