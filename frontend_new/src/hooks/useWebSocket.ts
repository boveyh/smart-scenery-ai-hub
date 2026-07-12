/**
 * WebSocket 极速文本模式 Hook
 * 对齐 API 文档 v2.0 §2
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getWsUrl } from '../api/config';
import type { WsClientMessage, WsServerMessage } from '../api/types';

interface UseWebSocketOptions {
  tenantId: string;
  sessionId: string;
  onMessage?: (msg: WsServerMessage) => void;
  onError?: (err: Event) => void;
  onClose?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { tenantId, sessionId, onMessage, onError, onClose } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<string[]>([]);
  const [connected, setConnected] = useState(false);

  const flushPending = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (pendingRef.current.length > 0) {
      const content = pendingRef.current.shift()!;
      const msg: WsClientMessage = {
        action: 'send_message',
        content,
        timestamp: Date.now(),
      };
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = getWsUrl(tenantId, sessionId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      flushPending();
      heartbeatRef.current = setInterval(() => {
        const heartbeat: WsClientMessage = { action: 'heartbeat' };
        ws.send(JSON.stringify(heartbeat));
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const lines = event.data.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg: WsServerMessage = JSON.parse(line);
          onMessage?.(msg);
        }
      } catch {
        // 忽略解析错误
      }
    };

    ws.onerror = (err) => {
      onError?.(err);
    };

    ws.onclose = () => {
      setConnected(false);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      onClose?.();
    };
  }, [tenantId, sessionId, onMessage, onError, onClose, flushPending]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: WsClientMessage = {
        action: 'send_message',
        content,
        timestamp: Date.now(),
      };
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingRef.current.push(content);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    pendingRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, sendMessage, disconnect, connected };
}
