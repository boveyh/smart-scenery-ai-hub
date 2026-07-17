import React, { useEffect, useState } from 'react';

const BG_IMAGES = [
  '/assets/scenic/lingshan-webp/aerial-lingshan.jpg',
  '/assets/scenic/lingshan-webp/灵山梵宫2.webp',
  '/assets/scenic/lingshan-webp/五印坛城1.webp',
  '/assets/scenic/lingshan-webp/五印坛城2.webp',
  '/assets/scenic/lingshan-webp/九龙灌浴3.webp',
  '/assets/scenic/lingshan-webp/九龙灌浴1.webp',
  '/assets/scenic/lingshan-webp/百子戏弥勒1.webp',
  '/assets/scenic/lingshan-webp/降魔浮雕2.webp',
  '/assets/scenic/lingshan-webp/佛教文化博览馆1.webp',
  '/assets/scenic/lingshan-webp/灵山大佛2.webp',
];

export default function LoginPage({ onLogin }: { onLogin: (mode: 'client' | 'admin') => void }) {
  const [bgIndex, setBgIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (bgIndex + 1) % BG_IMAGES.length;
      setNextIndex(next);
      setFadeIn(true);
      setTimeout(() => {
        setBgIndex(next);
        setFadeIn(false);
      }, 1200);
    }, 5000);
    return () => clearInterval(interval);
  }, [bgIndex]);

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Noto Sans SC','PingFang SC',sans-serif",
    }}>
      <img src={BG_IMAGES[bgIndex]} alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: fadeIn ? 0 : 1,
          transition: 'opacity 1.2s ease-in-out',
          zIndex: 1,
        }}
      />
      <img src={BG_IMAGES[nextIndex]} alt=""
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 1.2s ease-in-out',
          zIndex: 2,
        }}
      />
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 3,
        background: 'linear-gradient(90deg, rgba(24,18,15,0.12), rgba(24,18,15,0.02) 45%, rgba(24,18,15,0.3))',
      }} />

      {/* 入口选择面板 */}
      <div style={{
        position: 'relative',
        zIndex: 4,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '40px clamp(24px, 4vw, 56px) 40px 40px',
      }}>
        <div style={{
          width: 'min(360px, 92vw)',
          borderRadius: 32,
          padding: '40px 36px',
          background: 'rgba(255,255,255,0.28)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.34)',
          boxShadow: '0 20px 70px rgba(24,18,15,0.28)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏔️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif", letterSpacing: 3, marginBottom: 4 }}>
            灵山胜境
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(61,44,42,0.45)', marginBottom: 28 }}>智慧景区导览系统</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => onLogin('client')} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px',
              borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.24)', cursor: 'pointer',
              transition: 'all 0.2s', textAlign: 'left', width: '100%',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.38)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.24)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
            >
              <span style={{ fontSize: 28 }}>🎒</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#3D2C2A' }}>游客入口</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(61,44,42,0.4)', marginTop: 2 }}>景区导览 · AI 讲解 · 路线规划 · 智能咨询</div>
              </div>
            </button>

            <button onClick={() => onLogin('admin')} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px',
              borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.24)', cursor: 'pointer',
              transition: 'all 0.2s', textAlign: 'left', width: '100%',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.38)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.24)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
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
