import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { DEFAULT_TENANT_ID } from '@/api/config';
import type { WsServerMessage } from '@/api/types';

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function TextChatPage() {
  const [sessionId] = useState(() => generateSessionId());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentReply, setCurrentReply] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentReplyRef = useRef('');
  const hasEndedRef = useRef(false);

  const handleMessage = useCallback((msg: WsServerMessage) => {
    if (msg.type === 'text' && msg.content) {
      hasEndedRef.current = false;
      currentReplyRef.current += msg.content;
      setCurrentReply(currentReplyRef.current);
    } else if (msg.type === 'end' && !hasEndedRef.current) {
      hasEndedRef.current = true;
      const fullReply = currentReplyRef.current + (msg.content || '');
      currentReplyRef.current = '';
      setCurrentReply('');
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: fullReply, timestamp: Date.now() }]);
    }
  }, []);

  const { connect, sendMessage, connected } = useWebSocket({
    tenantId: DEFAULT_TENANT_ID, sessionId,
    onMessage: handleMessage,
    onClose: () => setConnectionStatus('disconnected'),
  });

  useEffect(() => { setConnectionStatus(connected ? 'connected' : 'disconnected'); }, [connected]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, currentReply]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!connected) connect();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: Date.now() }]);
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div style={{
      padding: 'var(--space-8) var(--space-8) var(--space-10)',
      maxWidth: 800, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - var(--header-height) - var(--space-4))',
    }}>
      {/* 标题 + 状态栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-3)',
        borderBottom: '2px solid var(--primary)',
      }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>💬</span> 文字咨询
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: connectionStatus === 'connected' ? 'var(--success)' : connectionStatus === 'connecting' ? 'var(--warning)' : 'var(--text-muted)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {connectionStatus === 'connected' ? '已连接' : connectionStatus === 'connecting' ? '连接中...' : '未连接'}
          </span>
          {!connected && <button className="btn btn-sm btn-primary" onClick={connect}>连接</button>}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="card" style={{
        flex: 1, overflowY: 'auto', marginBottom: 'var(--space-4)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
        padding: 'var(--space-5)',
      }}>
        {messages.length === 0 && !currentReply && (
          <div className="empty-state" style={{ flex: 1 }}>
            <span className="empty-state__icon">🏔️</span>
            <span className="empty-state__text">请输入您想了解的景点信息</span>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%', padding: 'var(--space-3) var(--space-4)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-hover)',
              color: msg.role === 'user' ? '#fff' : 'var(--text)',
              fontSize: 'var(--text-base)', lineHeight: 1.6,
              boxShadow: msg.role === 'user' ? '0 2px 8px rgba(139,110,87,0.15)' : 'var(--shadow-sm)',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {currentReply && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              maxWidth: '75%', padding: 'var(--space-3) var(--space-4)',
              borderRadius: '16px 16px 16px 4px',
              background: 'var(--bg-hover)', color: 'var(--text)',
              fontSize: 'var(--text-base)', lineHeight: 1.6,
              boxShadow: 'var(--shadow-sm)',
            }}>
              {currentReply}<span style={{ animation: 'pulse 1s infinite', color: 'var(--primary)' }}>▍</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder="输入您的问题..." style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit" disabled={!input.trim()} style={{ minWidth: 72, fontWeight: 600 }}>发送</button>
      </form>

      <style>{`@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }`}</style>
    </div>
  );
}
