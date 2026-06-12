// pages/chat/chat.js
const config = require('../../config.js');
const WSClient = require('../../utils/websocket.js');
const DigitalHumanStream = require('../../utils/digitalHuman.js');
const offlineFAQ = require('../../utils/offlineFAQ.js');

Page({
  data: {
    mode: 'text',             // text / digital_human
    messages: [],
    inputText: '',
    // 数字人相关
    videoSrc: config.VIDEO.IDLE,
    currentSubtitle: '',
    audioContext: null,
    videoContext: null,
    currentAudioQueue: [],    // 待播放音频队列
    isPlaying: false
  },

  onLoad(options) {
    this.tenantId = options.tenantId || config.DEFAULT_TENANT_ID;
    this.sessionId = wx.getStorageSync('sessionId') || this.generateUUID();
    wx.setStorageSync('sessionId', this.sessionId);
    this.initOfflineFAQ();   // 预加载离线知识库
    // 默认为极速文本模式，连接WebSocket
    this.initTextMode();
  },

  onUnload() {
    if (this.ws) this.ws.close();
    if (this.digitalHumanAbort) this.digitalHumanAbort();
  },

  // ---------- 双模态切换 ----------
  switchMode(e) {
    const newMode = e.currentTarget.dataset.mode;
    if (newMode === this.data.mode) return;
    // 清理旧模式资源
    if (this.data.mode === 'text') {
      if (this.ws) this.ws.close();
    } else {
      // 数字人模式清理音频队列、停止当前播放、视频切回待机
      if (this.data.audioContext) this.data.audioContext.stop();
      this.setData({ videoSrc: config.VIDEO.IDLE, currentAudioQueue: [], isPlaying: false });
      if (this.digitalHumanAbort) this.digitalHumanAbort();
    }
    this.setData({ mode: newMode, messages: [], currentSubtitle: '' });
    if (newMode === 'text') this.initTextMode();
    else this.initDigitalHumanMode();
  },

  // ---------- 极速文本模式 ----------
  initTextMode() {
    const wsUrl = `${config.WS_BASE_URL}/chat?tenant_id=${this.tenantId}&session_id=${this.sessionId}&mode=text`;
    this.ws = new WSClient(wsUrl, {
      onMessage: (data) => {
        if (data.type === 'text') {
          // 流式追加消息
          let lastMsg = this.data.messages[this.data.messages.length-1];
          if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.finished) {
            lastMsg.content += data.content;
            this.setData({ [`messages[${this.data.messages.length-1}]`]: lastMsg });
          } else {
            this.data.messages.push({ role: 'assistant', content: data.content, finished: false });
            this.setData({ messages: this.data.messages });
          }
        } else if (data.type === 'end') {
          // 标记最后一条消息结束
          let last = this.data.messages[this.data.messages.length-1];
          if (last) last.finished = true;
          this.setData({ messages: this.data.messages });
        }
      },
      onError: (err) => {
        console.error('WebSocket错误', err);
        this.fallbackToOffline();
      }
    });
    this.ws.connect();
  },

  sendText() {
    const content = this.data.inputText.trim();
    if (!content) return;
    this.data.messages.push({ role: 'user', content: content });
    this.setData({ messages: this.data.messages, inputText: '' });
    this.ws.send({ action: 'send_message', content, timestamp: Date.now() });
  },

  startVoice() {
    const recorder = wx.getRecorderManager();
    recorder.start({ format: 'mp3' });
    recorder.onStop((res) => {
      wx.uploadFile({
        url: `${config.API_BASE_URL}/asr`,
        filePath: res.tempFilePath,
        name: 'audio',
        header: { 'X-Tenant-Id': this.tenantId },
        success: (uploadRes) => {
          const text = JSON.parse(uploadRes.data).text;
          this.setData({ inputText: text });
          this.sendText();
        }
      });
    });
    setTimeout(() => recorder.stop(), 3000); // 示例3秒录音
  },

  // ---------- 数字人模式 ----------
  initDigitalHumanMode() {
    // 初始化音频和视频上下文
    this.audioCtx = wx.createInnerAudioContext();
    this.videoCtx = wx.createVideoContext('avatarVideo', this);
    this.audioCtx.onPlay(() => {
      // 音频开始播放 -> 切换为说话视频
      this.setData({ videoSrc: config.VIDEO.SPEAKING });
    });
    this.audioCtx.onEnded(() => {
      // 音频结束 -> 切回待机视频，并播放下一个音频
      this.setData({ videoSrc: config.VIDEO.IDLE });
      this.playNextAudio();
    });
    this.audioCtx.onError((err) => {
      console.warn('音频播放失败', err);
      this.setData({ videoSrc: config.VIDEO.IDLE });
      this.playNextAudio(); // 跳过失败的，继续
    });
  },

  startVoiceDigital() {
    // 类似录音，但发送到数字人接口
    const recorder = wx.getRecorderManager();
    recorder.start({ format: 'mp3' });
    recorder.onStop(async (res) => {
      wx.showLoading({ title: 'AI思考中...' });
      // 先上传语音转文字（或直接发送音频流，按文档：前端只发送文本，所以先ASR）
      wx.uploadFile({
        url: `${config.API_BASE_URL}/asr`,
        filePath: res.tempFilePath,
        name: 'audio',
        header: { 'X-Tenant-Id': this.tenantId },
        success: (uploadRes) => {
          const text = JSON.parse(uploadRes.data).text;
          this.sendDigitalHumanMessage(text);
        }
      });
    });
    recorder.start();
  },

  async sendDigitalHumanMessage(content) {
    this.digitalHumanAbort = new AbortController();
    try {
      const response = await fetch(`${config.API_BASE_URL}/digitalhuman/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': this.tenantId
        },
        body: JSON.stringify({ session_id: this.sessionId, content, timestamp: Date.now() }),
        signal: this.digitalHumanAbort.signal
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const obj = JSON.parse(line);
          if (obj.type === 'end') {
            // 结束，关闭连接标记
            this.digitalHumanAbort = null;
            break;
          } else if (obj.text_chunk && obj.audio_url) {
            // 添加到音频队列
            const queueItem = { text: obj.text_chunk, url: obj.audio_url };
            this.data.currentAudioQueue.push(queueItem);
            this.setData({ currentSubtitle: obj.text_chunk });
            if (!this.data.isPlaying) {
              this.playNextAudio();
            }
          }
        }
      }
    } catch (err) {
      console.error('数字人请求失败', err);
      this.fallbackToOffline();
    } finally {
      wx.hideLoading();
    }
  },

  playNextAudio() {
    if (this.data.currentAudioQueue.length === 0) {
      this.setData({ isPlaying: false });
      return;
    }
    const next = this.data.currentAudioQueue.shift();
    this.setData({ currentSubtitle: next.text, isPlaying: true });
    this.audioCtx.src = next.url;
    this.audioCtx.play();
  },

  // ---------- 柔性降级 ----------
  fallbackToOffline() {
    wx.showToast({ title: '网络不稳定，已切换离线模式', icon: 'none' });
    // 切换到文本模式
    this.setData({ mode: 'text' });
    // 关闭数字人相关资源
    if (this.audioCtx) this.audioCtx.stop();
    this.initTextMode();
    // 注入离线问答：在用户发送时拦截
    this.offlineActive = true;
  },

  async initOfflineFAQ() {
    try {
      const res = await wx.request({
        url: `${config.API_BASE_URL}/knowledge/offline`,
        header: { 'X-Tenant-Id': this.tenantId }
      });
      if (res.data.code === 200) {
        offlineFAQ.set(res.data.data);
      }
    } catch(e) {
      // 若连离线知识库都获取失败，使用内置静态fallback
      offlineFAQ.setDefault({
        "厕所在哪里": "前方100米游客中心旁",
        "门票多少钱": "请咨询景区售票处"
      });
    }
  },

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
});