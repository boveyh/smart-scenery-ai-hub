import React, { useState } from 'react';
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

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('login_mode'));
  const [mode, setMode] = useState<'client' | 'admin'>(() => (localStorage.getItem('login_mode') as 'client' | 'admin') || 'client');
  const [currentPage, setCurrentPage] = useState('home');
  const [currentPoi, setCurrentPoi] = useState(POI_LIST[0]);
  const [detailPoiId, setDetailPoiId] = useState<string | null>(null);

  const handleLogin = (m: 'client' | 'admin') => {
    localStorage.setItem('login_mode', m);
    setMode(m);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('login_mode');
    setLoggedIn(false);
    setCurrentPage('home');
  };

  const navigateTo = (page: string, poiId?: string) => {
    setCurrentPage(page);
    if (poiId) setDetailPoiId(poiId);
  };

  const renderPage = () => {
    if (mode === 'client') {
      switch (currentPage) {
        case 'home': return <HomePage />;
        case 'digital-human': return <DigitalHumanPage />;
        case 'text-chat': return <TextChatPage />;
        case 'pois': return <PoiListPage onNavigate={(id) => navigateTo('poi-detail', id)} />;
        case 'route': return <RoutePage />;
        case 'vision': return <VisionPage />;
        case 'info': return <InfoPage />;
        case 'poi-detail': return <PoiDetailPage poiId={detailPoiId || 'LS-001'} onNavigate={(page) => setCurrentPage(page)} />;
        default: return <HomePage />;
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

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isClient = mode === 'client';
  const navPages = isClient
    ? ['home', 'digital-human', 'text-chat', 'pois', 'route', 'vision', 'info']
    : ['admin-dashboard', 'admin-knowledge', 'admin-digital-human', 'admin-report'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#EDE4D3' }}>
      <aside style={{
        width: 220, height: '100vh', position: 'fixed', left: 0, top: 0,
        background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(180,136,100,0.10)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
      }}>
        <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(180,136,100,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🏔️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#3D2C2A', letterSpacing: 2, fontFamily: "'Noto Serif SC',serif" }}>
                {isClient ? '灵山胜景' : '管理后台'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(61,44,42,0.4)', marginTop: 1 }}>
                {isClient ? '智慧景区导览' : '运营管理系统'}
              </div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {(() => {
            const items = isClient ? [
              { id:'home', label:'首页总览', icon:'🏠' },
              { id:'digital-human', label:'数字人导览', icon:'🎭' },
              { id:'pois', label:'景点列表', icon:'📍' },
              { id:'route', label:'路线规划', icon:'🗺️' },
              { id:'text-chat', label:'智能咨询', icon:'💬' },
              { id:'vision', label:'拍照识物', icon:'📷' },
              { id:'info', label:'实时资讯', icon:'📊' },
            ] : [
              { id:'admin-dashboard', label:'数据大屏', icon:'📈' },
              { id:'admin-knowledge', label:'知识库管理', icon:'📚' },
              { id:'admin-digital-human', label:'数字人配置', icon:'🎭' },
              { id:'admin-report', label:'游客报告', icon:'📋' },
            ];
            return items.map(page => {
              const isActive = currentPage === page.id;
              return (
                <button key={page.id} onClick={() => navigateTo(page.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:14,
                    background: isActive ? 'rgba(180,136,100,0.12)' : 'transparent',
                    color: isActive ? '#8B6E57' : 'rgba(61,44,42,0.55)',
                    fontWeight: isActive ? 600 : 400, fontSize:'0.8125rem', border:'none', cursor:'pointer',
                    transition:'all 150ms ease', width:'100%', textAlign:'left',
                    fontFamily:"'Noto Sans SC',sans-serif",
                  }}>
                  <span style={{ fontSize:15, width:22, textAlign:'center', opacity: isActive ? 1 : 0.6 }}>{page.icon}</span>
                  <span>{page.label}</span>
                </button>
              );
            });
          })()}
        </nav>

        <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(180,136,100,0.08)', fontSize:'0.65rem', color:'rgba(61,44,42,0.4)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>{isClient ? '灵山胜景 v2.0' : '管理后台 v2.0'}</span>
          <button onClick={handleLogout}
            style={{ background:'none', border:'none', color:'rgba(61,44,42,0.3)', cursor:'pointer', fontSize:'0.6rem', padding:0, fontFamily:'inherit' }}>
            退出登录
          </button>
        </div>
      </aside>

      <main style={{ flex:1, marginLeft:220, minHeight:'100vh', display:'flex', flexDirection:'column', backgroundColor:'#F7F2E6' }}>
        <div style={{ flex:1, padding:'20px 28px 28px', maxWidth:1360, width:'100%', margin:'0 auto' }}>
          {renderPage()}
        </div>
        <footer style={{ textAlign:'center', padding:'12px', fontSize:'0.7rem', color:'rgba(61,44,42,0.35)',
          borderTop:'1px solid rgba(180,136,100,0.08)', background:'rgba(255,255,255,0.3)' }}>
          灵山胜景 · 智慧景区导览 &copy; {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
