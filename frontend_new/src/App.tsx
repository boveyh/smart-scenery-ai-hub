import React, { useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import LoginPage from '@/pages/LoginPage';
import Header from '@/components/Header';
import HomePage from '@/pages/HomePage';
import DigitalHumanPage from '@/pages/DigitalHumanPage';
import TextChatPage from '@/pages/TextChatPage';
import PoiListPage from '@/pages/PoiListPage';
import PoiDetailPage from '@/pages/PoiDetailPage';
import RoutePage from '@/pages/RoutePage';
import VisionPage from '@/pages/VisionPage';
import InfoPage from '@/pages/InfoPage';
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import AdminKnowledgePage from '@/pages/admin/KnowledgePage';
import AdminDigitalHumanPage from '@/pages/admin/DigitalHumanConfigPage';
import AdminReportPage from '@/pages/admin/ReportPage';

const POI_LIST = [
  { id: 'LS-001', name: '灵山大照壁', desc: '长39.8m高7m青石雕刻，赵朴初题字' },
  { id: 'LS-002', name: '五明桥', desc: '5座汉白玉石拱桥，五明智慧' },
  { id: 'LS-003', name: '佛足坛', desc: '青铜佛足印1.2m，32吉祥瑞相' },
  { id: 'LS-004', name: '五智门', desc: '高16.8m宽35m汉白玉牌坊，六度波罗蜜' },
  { id: 'LS-005', name: '菩提大道', desc: '250m长，近百棵印度菩提树' },
  { id: 'LS-006', name: '九龙灌浴', desc: '高27.2m，鎏金太子佛7.2m重12吨，动态喷泉' },
  { id: 'LS-007', name: '降魔浮雕', desc: '长26m高4.6m花岗岩浮雕' },
  { id: 'LS-008', name: '阿育王柱', desc: '高16.9m直径1.8m重180吨，四狮柱头' },
  { id: 'LS-009', name: '百子戏弥勒', desc: '高3m宽7.8m重9吨青铜群雕' },
  { id: 'LS-010', name: '祥符禅寺', desc: '唐贞观年间，占地30亩，千年古刹' },
  { id: 'LS-011', name: '灵山大佛', desc: '高88m+9m莲花，耗铜725吨，2000块铜板' },
  { id: 'LS-012', name: '佛教文化博览馆', desc: '三层10000㎡，9999尊小佛' },
  { id: 'LS-013', name: '灵山梵宫', desc: '72000㎡，五座莲花圣塔，鲁班奖' },
  { id: 'LS-014', name: '五印坛城', desc: '五层高30m，藏式碉楼，小布达拉宫' },
  { id: 'LS-015', name: '曼飞龙塔', desc: '主塔16.9m，九塔组合，南传佛教' },
  { id: 'LS-016', name: '无尽意斋', desc: '600㎡，赵朴初纪念馆，四合院' },
];

function EntryPage({ onEnter }: { onEnter: (page: string) => void }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? 20 : 32,
      background: '#EDE4D3',
      backgroundImage: 'linear-gradient(90deg, rgba(61,44,42,0.72), rgba(61,44,42,0.26)), url("/assets/scenic/lingshan/ls-011.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div style={{ width: 'min(920px, 100%)', color: '#F7F2E6' }}>
        <div style={{ marginBottom: isMobile ? 20 : 28 }}>
          <div style={{ fontSize: '0.8rem', letterSpacing: 4, color: 'rgba(247,242,230,0.72)', marginBottom: 8 }}>
            智慧景区导览平台
          </div>
          <h1 style={{ fontSize: isMobile ? '1.6rem' : '2.4rem', lineHeight: 1.1, fontWeight: 700, fontFamily: "'Noto Serif SC',serif", letterSpacing: 2 }}>
            灵山胜境
          </h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: isMobile ? 14 : 18 }}>
          {[
            { title: '游客端', desc: '进入导览、景点、路线、咨询和拍照识物服务', icon: '🏠', page: 'home' },
            { title: '管理员端', desc: '进入数据大屏、知识库、数字人配置和游客报告', icon: '📈', page: 'admin-dashboard' },
          ].map(item => (
            <button
              key={item.page}
              onClick={() => onEnter(item.page)}
              style={{
                minHeight: isMobile ? 120 : 160,
                textAlign: 'left',
                border: '1px solid rgba(247,242,230,0.24)',
                borderRadius: 20,
                padding: isMobile ? 18 : 24,
                background: 'rgba(247,242,230,0.14)',
                color: '#F7F2E6',
                backdropFilter: 'blur(14px)',
                cursor: 'pointer',
                boxShadow: '0 12px 38px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ fontSize: isMobile ? 24 : 28, marginBottom: isMobile ? 12 : 18 }}>{item.icon}</div>
              <div style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: isMobile ? '0.7rem' : '0.78rem', lineHeight: 1.7, color: 'rgba(247,242,230,0.76)' }}>{item.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('login_mode'));
  const [mode, setMode] = useState<'client' | 'admin'>(() => (localStorage.getItem('login_mode') as 'client' | 'admin') || 'client');
  const [currentPage, setCurrentPage] = useState('home');
  const [currentPoi, setCurrentPoi] = useState(POI_LIST[0]);
  const [detailPoiId, setDetailPoiId] = useState<string | null>(null);
  const [routeFocusPoiId, setRouteFocusPoiId] = useState<string | null>(null);
  const isAdminPage = mode === 'admin';

  const handleLogin = (m: 'client' | 'admin') => {
    localStorage.setItem('login_mode', m);
    setMode(m);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('login_mode');
    setLoggedIn(false);
  };

  const navigateTo = (page: string, poiId?: string) => {
    setCurrentPage(page);
    if (page === 'poi-detail' && poiId) setDetailPoiId(poiId);
    setRouteFocusPoiId(page === 'route' ? poiId ?? null : null);
  };

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    if (mode === 'client') {
      switch (currentPage) {
        case 'home': return <HomePage onNavigate={(id) => navigateTo('poi-detail', id)} />;
        case 'digital-human': return <DigitalHumanPage />;
        case 'text-chat': return <TextChatPage />;
        case 'pois': return <PoiListPage onNavigate={(id) => navigateTo('poi-detail', id)} />;
        case 'route': return <RoutePage focusPoiId={routeFocusPoiId} />;
        case 'vision': return <VisionPage />;
        case 'info': return <InfoPage />;
        case 'poi-detail': return <PoiDetailPage poiId={detailPoiId || 'LS-001'} onNavigate={navigateTo} />;
        default: return <HomePage onNavigate={(id) => navigateTo('poi-detail', id)} />;
      }
    }
    switch (currentPage) {
      case 'admin-dashboard': return <AdminDashboardPage />;
      case 'admin-knowledge': return <AdminKnowledgePage />;
      case 'admin-digital-human': return <AdminDigitalHumanPage />;
      case 'admin-report': return <AdminReportPage />;
      default: return <AdminDashboardPage />;
    }
  };

  if (currentPage === 'entry') return renderPage();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#EDE4D3',
    }}>
      <Header
        onNavigate={(page) => navigateTo(page)}
        currentPage={currentPage}
        onLogout={handleLogout}
        mode={mode}
        tenantName="灵山胜境"
        pois={POI_LIST}
        currentPoiId={currentPoi.id}
        onPoiChange={(id) => {
          const p = POI_LIST.find(x => x.id === id);
          if (p) setCurrentPoi(p);
        }}
      />
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 220,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F7F2E6',
        paddingBottom: isMobile ? 72 : 0,
      }}>
        <div style={{
          flex: 1,
          padding: isMobile ? '14px 14px 14px' : '20px 28px 28px',
          maxWidth: 1360,
          width: '100%',
          margin: '0 auto',
        }}>
          {renderPage()}
        </div>
        <footer style={{
          textAlign: 'center', padding: 'var(--space-4)',
          fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-sans)',
        }}>
          灵山胜境 · 智慧景区导览 &copy; {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}