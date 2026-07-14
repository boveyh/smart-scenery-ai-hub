import React from 'react';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  tenantName?: string;
  pois?: { id: string; name: string; desc: string }[];
  currentPoiId?: string;
  onPoiChange?: (id: string) => void;
}

const navItems = [
  { id: 'home',           label: '首页总览', icon: '🏠' },
  { id: 'digital-human',  label: '数字人导览', icon: '🎭' },
  { id: 'pois',           label: '景点列表', icon: '📍' },
  { id: 'route',          label: '路线规划', icon: '🗺️' },
  { id: 'text-chat',      label: '智能咨询', icon: '💬' },
];

const subNavItems = [
  { id: 'vision',         label: '拍照识物', icon: '📷' },
  { id: 'info',           label: '实时资讯', icon: '📊' },
];

const adminNavItems = [
  { id: 'admin-dashboard',    label: '数据大屏', icon: '📈' },
  { id: 'admin-knowledge',    label: '知识库管理', icon: '📚' },
  { id: 'admin-digital-human', label: '数字人配置', icon: '🎭' },
  { id: 'admin-report',      label: '游客报告', icon: '📋' },
];

export default function Header({ onNavigate, currentPage, tenantName, pois, currentPoiId, onPoiChange }: HeaderProps) {
  return (
    <aside style={{
      width: 220,
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      background: 'rgba(255,255,255,0.4)',
      backdropFilter: 'blur(12px)',
      borderRight: '1px solid rgba(180,136,100,0.10)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 18px',
        borderBottom: '1px solid rgba(180,136,100,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>🏔️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#3D2C2A', letterSpacing: 2, fontFamily: "'Noto Serif SC',serif" }}>灵山胜景</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)', marginTop: 1 }}>智慧景区导览</div>
          </div>
        </div>
      </div>

      {/* POI Switcher */}
      {pois && onPoiChange && (
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(180,136,100,0.08)',
        }}>
          <select
            value={currentPoiId}
            onChange={e => onPoiChange(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px',
              borderRadius: 14, border: '1px solid rgba(180,136,100,0.12)',
              background: 'rgba(255,255,255,0.6)',
              fontSize: '0.75rem', color: '#3D2C2A',
              fontFamily: "'Noto Sans SC',sans-serif",
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {pois.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Main nav */}
      <nav style={{
        flex: 1,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '8px 8px 4px', letterSpacing: 2, textTransform: 'uppercase' }}>主要导航</div>
        {navItems.map(page => {
          const isActive = currentPage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 14,
                background: isActive ? 'rgba(180,136,100,0.12)' : 'transparent',
                color: isActive ? '#8B6E57' : 'rgba(61,44,42,0.55)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.8125rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                width: '100%',
                textAlign: 'left',
                fontFamily: "'Noto Sans SC',sans-serif",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.target as HTMLElement).style.background = 'rgba(180,136,100,0.05)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.target as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 15, width: 22, textAlign: 'center', opacity: isActive ? 1 : 0.6 }}>{page.icon}</span>
              <span>{page.label}</span>
            </button>
          );
        })}

        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '14px 8px 4px', letterSpacing: 2, textTransform: 'uppercase' }}>辅助</div>
        {subNavItems.map(page => {
          const isActive = currentPage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 14,
                background: isActive ? 'rgba(180,136,100,0.12)' : 'transparent',
                color: isActive ? '#8B6E57' : 'rgba(61,44,42,0.55)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.8125rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                width: '100%',
                textAlign: 'left',
                fontFamily: "'Noto Sans SC',sans-serif",
              }}
            >
              <span style={{ fontSize: 15, width: 22, textAlign: 'center', opacity: isActive ? 1 : 0.6 }}>{page.icon}</span>
              <span>{page.label}</span>
            </button>
          );
        })}

        <div style={{ fontSize: '0.65rem', color: 'rgba(180,136,100,0.4)', padding: '14px 8px 4px', letterSpacing: 2, textTransform: 'uppercase', borderTop: '1px solid rgba(180,136,100,0.06)', marginTop: 8 }}>管理后台</div>
        {adminNavItems.map(page => {
          const isActive = currentPage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 14,
                background: isActive ? 'rgba(180,136,100,0.12)' : 'transparent',
                color: isActive ? '#8B6E57' : 'rgba(61,44,42,0.45)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                width: '100%',
                textAlign: 'left',
                fontFamily: "'Noto Sans SC',sans-serif",
              }}
            >
              <span style={{ fontSize: 13, width: 22, textAlign: 'center', opacity: isActive ? 1 : 0.5 }}>{page.icon}</span>
              <span>{page.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Version */}
      <div style={{
        padding: '12px 18px',
        borderTop: '1px solid rgba(180,136,100,0.08)',
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        fontFamily: "'Noto Sans SC',sans-serif",
      }}>
v2.0 · {pois?.find(p => p.id === currentPoiId)?.name || tenantName}
      </div>
    </aside>
  );
}
