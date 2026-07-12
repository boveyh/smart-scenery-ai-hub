import React, { useState } from 'react';
import Header from '@/components/Header';
import HomePage from '@/pages/HomePage';
import DigitalHumanPage from '@/pages/DigitalHumanPage';
import TextChatPage from '@/pages/TextChatPage';
import PoiListPage from '@/pages/PoiListPage';
import RoutePage from '@/pages/RoutePage';
import VisionPage from '@/pages/VisionPage';
import InfoPage from '@/pages/InfoPage';
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import AdminKnowledgePage from '@/pages/admin/KnowledgePage';
import AdminDigitalHumanPage from '@/pages/admin/DigitalHumanConfigPage';
import AdminReportPage from '@/pages/admin/ReportPage';

const TENANTS = [
  { id: 'west_lake', name: '西湖景区' },
  { id: 'ling_shan', name: '灵山胜境' },
  { id: 'qingmingqiao', name: '清名桥古运河' },
  { id: 'zhouzhuang', name: '周庄古镇' },
  { id: 'yuyuan', name: '豫园' },
  { id: 'zhujiajiao', name: '朱家角古镇' },
  { id: 'ningbo_fangte', name: '宁波方特' },
  { id: 'suzhou_forest', name: '苏州乐园' },
  { id: 'gucun_park', name: '顾村公园' },
  { id: 'china_navigation_museum', name: '航海博物馆' },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentTenant, setCurrentTenant] = useState(TENANTS[0]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'digital-human': return <DigitalHumanPage />;
      case 'text-chat': return <TextChatPage />;
      case 'pois': return <PoiListPage />;
      case 'route': return <RoutePage />;
      case 'vision': return <VisionPage />;
      case 'info': return <InfoPage />;
      case 'admin-dashboard': return <AdminDashboardPage />;
      case 'admin-knowledge': return <AdminKnowledgePage />;
      case 'admin-digital-human': return <AdminDigitalHumanPage />;
      case 'admin-report': return <AdminReportPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#EDE4D3',
    }}>
      <Header
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        tenantName={currentTenant.name}
        tenants={TENANTS}
        currentTenantId={currentTenant.id}
        onTenantChange={(id) => {
          const t = TENANTS.find(x => x.id === id);
          if (t) setCurrentTenant(t);
        }}
      />
      <main style={{
        flex: 1,
        marginLeft: 220,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F7F2E6',
      }}>
        <div style={{
          flex: 1,
          padding: '20px 28px 28px',
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
          云岭慢游 · 智慧景区导览 &copy; {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
