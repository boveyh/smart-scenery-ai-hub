import React from 'react';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout?: () => void;
  mode?: 'client' | 'admin';
  tenantName?: string;
  pois?: { id: string; name: string; desc: string }[];
  currentPoiId?: string;
  onPoiChange?: (id: string) => void;
}

const visitorNavItems = [
  { id: 'home', label: '首页总览', icon: '🏠' },
  { id: 'digital-human', label: '数字人导览', icon: '🎭' },
  { id: 'pois', label: '景点列表', icon: '📍' },
  { id: 'route', label: '路线规划', icon: '🗺️' },
  { id: 'text-chat', label: '智能咨询', icon: '💬' },
];

const visitorSubNavItems = [
  { id: 'vision', label: '拍照识物', icon: '📷' },
  { id: 'info', label: '实时资讯', icon: '📊' },
];

const adminNavItems = [
  { id: 'admin-dashboard', label: '数据大屏', icon: '📈' },
  { id: 'admin-knowledge', label: '知识库管理', icon: '📚' },
  { id: 'admin-digital-human', label: '数字人配置', icon: '🎭' },
  { id: 'admin-report', label: '游客报告', icon: '📋' },
];

export default function Header({
  onNavigate,
  currentPage,
  onLogout,
  mode = 'client',
  tenantName,
  pois,
  currentPoiId,
}: HeaderProps) {
  const isAdmin = mode === 'admin';
  const activePage = currentPage === 'poi-detail' ? 'pois' : currentPage;
  const primaryItems = isAdmin ? adminNavItems : visitorNavItems;

  const renderNavButton = (page: { id: string; label: string; icon: string }, compact = false) => {
    const isActive = activePage === page.id;
    return (
      <button
        key={page.id}
        onClick={() => onNavigate(page.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: compact ? '8px 12px' : '9px 12px',
          borderRadius: 14,
          background: isActive ? 'rgba(180,136,100,0.12)' : 'transparent',
          color: isActive ? '#8B6E57' : 'rgba(61,44,42,0.55)',
          fontWeight: isActive ? 600 : 400,
          fontSize: compact ? '0.75rem' : '0.8125rem',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          width: '100%',
          textAlign: 'left',
          fontFamily: "'Noto Sans SC',sans-serif",
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.background = 'rgba(180,136,100,0.05)';
        }}
        onMouseLeave={e => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: compact ? 13 : 15, width: 22, textAlign: 'center', opacity: isActive ? 1 : 0.6 }}>
          {page.icon}
        </span>
        <span>{page.label}</span>
      </button>
    );
  };

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
      <div style={{
        padding: '20px 18px',
        borderBottom: '1px solid rgba(180,136,100,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>🏔️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#3D2C2A', letterSpacing: 2, fontFamily: "'Noto Serif SC',serif" }}>
              灵山胜境
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)', marginTop: 1 }}>
              {isAdmin ? '管理后台' : '游客服务端'}
            </div>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(180,136,100,0.08)',
        }}>
          <div
            aria-label="景区标语"
            style={{
              width: '100%',
              padding: '4px 0',
              fontSize: '1rem',
              color: '#6F4E37',
              fontFamily: "'STXingkai','华文行楷','KaiTi','楷体',serif",
              letterSpacing: 1,
              lineHeight: 1.2,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            一念入山水，万象皆导览
          </div>
        </div>
      )}

      <nav style={{
        flex: 1,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '8px 8px 4px', letterSpacing: 2, textTransform: 'uppercase' }}>
          {isAdmin ? '管理端' : '游客端'}
        </div>
        {primaryItems.map(page => renderNavButton(page, isAdmin))}

        {!isAdmin && (
          <>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '14px 8px 4px', letterSpacing: 2, textTransform: 'uppercase' }}>
              辅助
            </div>
            {visitorSubNavItems.map(page => renderNavButton(page))}
          </>
        )}

      </nav>

      <div style={{
        padding: '12px 18px',
        borderTop: '1px solid rgba(180,136,100,0.08)',
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        fontFamily: "'Noto Sans SC',sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>v2.0 · {isAdmin ? '管理员端' : (pois?.find(p => p.id === currentPoiId)?.name || tenantName)}</span>
        {onLogout && (
          <button onClick={onLogout}
            style={{ background:'none', border:'none', color:'rgba(61,44,42,0.3)', cursor:'pointer', fontSize:'0.6rem', padding:0, fontFamily:'inherit' }}>
            退出
          </button>
        )}
      </div>
    </aside>
  );
}
