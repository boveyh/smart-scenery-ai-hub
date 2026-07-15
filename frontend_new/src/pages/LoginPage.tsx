import React, { useEffect, useState } from 'react';

const BG_IMAGES = [
  '/assets/bg/door1.webp',
  '/assets/bg/door2.webp',
  '/assets/bg/door3.webp',
  '/assets/bg/door4.webp',
  '/assets/bg/door5.webp',
];

export default function LoginPage({ onLogin }: { onLogin: (mode: 'client' | 'admin') => void }) {
  const [bgIndex, setBgIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNextIndex((bgIndex + 1) % BG_IMAGES.length);
      setFadeIn(true);
      setTimeout(() => {
        setBgIndex(nextIndex);
        setFadeIn(false);
      }, 1200);
    }, 5000);
    return () => clearInterval(interval);
  }, [bgIndex, nextIndex]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: "'Noto Sans SC','PingFang SC',sans-serif",
    }}>
      {/* 左栏 77%：全屏背景图轮播 — 淡入淡出叠化 */}
      <div style={{ flex: '0 0 77%', position: 'relative', overflow: 'hidden', background: '#EDE4D3' }}>
        {/* 基础图（当前显示） */}
        <img src={BG_IMAGES[bgIndex]} alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: fadeIn ? 0 : 1,
            transition: 'opacity 1.2s ease-in-out',
            zIndex: 1,
          }}
        />
        {/* 覆盖图（下一张淡入） */}
        <img src={BG_IMAGES[nextIndex]} alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: fadeIn ? 1 : 0,
            transition: 'opacity 1.2s ease-in-out',
            zIndex: 2,
          }}
        />
      </div>

      {/* 右栏 23%：登录面板 */}
      <div style={{
        flex: '0 0 23%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          borderRadius: 32, padding: '40px 36px',
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 48px rgba(61,44,42,0.12)',
          textAlign: 'center', width: '85%', maxWidth: 340,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏔️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif", letterSpacing: 3, marginBottom: 4 }}>
            灵山胜景
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(61,44,42,0.45)', marginBottom: 28 }}>智慧景区导览系统</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => onLogin('client')} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px',
              borderRadius: 20, border: '1px solid rgba(180,136,100,0.15)',
              background: 'rgba(255,255,255,0.75)', cursor: 'pointer',
              transition: 'all 0.2s', textAlign: 'left', width: '100%',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.95)'; (e.target as HTMLElement).style.borderColor = 'rgba(180,136,100,0.3)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.75)'; (e.target as HTMLElement).style.borderColor = 'rgba(180,136,100,0.15)'; }}
            >
              <span style={{ fontSize: 28 }}>🎒</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#3D2C2A' }}>游客入口</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(61,44,42,0.4)', marginTop: 2 }}>景区导览 · AI 讲解 · 路线规划 · 智能咨询</div>
              </div>
            </button>

            <button onClick={() => onLogin('admin')} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px',
              borderRadius: 20, border: '1px solid rgba(180,136,100,0.15)',
              background: 'rgba(255,255,255,0.75)', cursor: 'pointer',
              transition: 'all 0.2s', textAlign: 'left', width: '100%',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.95)'; (e.target as HTMLElement).style.borderColor = 'rgba(180,136,100,0.3)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.75)'; (e.target as HTMLElement).style.borderColor = 'rgba(180,136,100,0.15)'; }}
            >
              <span style={{ fontSize: 28 }}>🔧</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#3D2C2A' }}>管理员入口</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(61,44,42,0.4)', marginTop: 2 }}>数据大屏 · 知识库管理 · 数字人配置 · 游客报告</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
