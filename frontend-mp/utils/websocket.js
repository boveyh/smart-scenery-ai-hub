// utils/websocket.js
// 封装微信 WebSocket，支持 NDJSON 流式响应、心跳、自动重连（可选）

class WSClient {
  /**
   * @param {string} url WebSocket 地址（已携带 tenant_id, session_id 等参数）
   * @param {object} handlers 回调函数
   * @param {function} handlers.onMessage 收到单条 JSON 消息时触发（参数为解析后的对象）
   * @param {function} handlers.onError 发生错误时触发（参数为错误对象）
   * @param {function} handlers.onClose 连接关闭时触发（参数为 CloseEvent）
   * @param {boolean} autoReconnect 是否开启自动重连（默认 false，简单模式暂不开启）
   * @param {number} heartbeatInterval 心跳间隔毫秒（默认 30000，传 0 则不发送心跳）
   */
  constructor(url, handlers, autoReconnect = false, heartbeatInterval = 30000) {
    this.url = url;
    this.onMessage = handlers.onMessage || (() => {});
    this.onError = handlers.onError || (() => {});
    this.onClose = handlers.onClose || (() => {});
    this.autoReconnect = autoReconnect;
    this.heartbeatInterval = heartbeatInterval;
    
    this.socket = null;
    this.isClosed = false;       // 手动关闭标志，防止自动重连
    this.heartbeatTimer = null;
    this.buffer = '';            // 用于累积 NDJSON 数据
  }

  connect() {
    this.isClosed = false;
    this.socket = wx.connectSocket({
      url: this.url,
      success: () => {
        console.log('[WS] 连接成功:', this.url);
      },
      fail: (err) => {
        console.error('[WS] 连接失败:', err);
        this.onError(err);
        if (this.autoReconnect && !this.isClosed) {
          setTimeout(() => this.connect(), 3000);
        }
      }
    });

    this.socket.onOpen(() => {
      console.log('[WS] onOpen');
      this.startHeartbeat();
    });

    this.socket.onMessage((res) => {
      // 将收到的数据追加到缓冲区
      this.buffer += res.data;
      // 按换行符切割
      const lines = this.buffer.split('\n');
      // 最后一行可能不完整，保留回缓冲区
      this.buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          this.onMessage(data);
        } catch (e) {
          console.error('[WS] JSON 解析失败:', line, e);
        }
      }
    });

    this.socket.onError((err) => {
      console.error('[WS] 错误:', err);
      this.stopHeartbeat();
      this.onError(err);
      if (this.autoReconnect && !this.isClosed) {
        setTimeout(() => this.connect(), 5000);
      }
    });

    this.socket.onClose((closeEvent) => {
      console.log('[WS] 关闭:', closeEvent);
      this.stopHeartbeat();
      this.onClose(closeEvent);
      if (this.autoReconnect && !this.isClosed) {
        setTimeout(() => this.connect(), 3000);
      }
    });
  }

  // 发送消息（自动 JSON 序列化）
  send(data) {
    if (!this.socket || this.isClosed) {
      console.warn('[WS] 连接未就绪，无法发送');
      return;
    }
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    this.socket.send({
      data: str,
      fail: (err) => console.error('[WS] 发送失败:', err)
    });
  }

  // 关闭连接（手动调用时禁止自动重连）
  close() {
    this.isClosed = true;
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // 启动心跳（如果 interval > 0）
  startHeartbeat() {
    if (this.heartbeatInterval <= 0) return;
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && !this.isClosed) {
        this.send({ action: 'heartbeat', timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

module.exports = WSClient;