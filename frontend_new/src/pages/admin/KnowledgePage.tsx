import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { KnowledgeChunkItem, FaqItem } from '@/api/types';

type Tab = 'chunks' | 'faq';

export default function AdminKnowledgePage() {
  const [tab, setTab] = useState<Tab>('chunks');
  const [chunks, setChunks] = useState<KnowledgeChunkItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingChunk, setEditingChunk] = useState<Partial<KnowledgeChunkItem> | null>(null);
  const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiClient.getKnowledgeChunks(),
      apiClient.getFaqList(),
    ]).then(([cr, fr]) => {
      if (cr.code === 200) setChunks(cr.data ?? []);
      if (fr.code === 200) setFaqs(fr.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSearch = async () => {
    if (!search.trim()) { loadData(); return; }
    setLoading(true);
    const res = await apiClient.searchKnowledge(search);
    if (res.code === 200) setChunks(res.data ?? []);
    setLoading(false);
  };

  const saveChunk = async () => {
    if (!editingChunk) return;
    if (editingChunk.id) {
      await apiClient.updateKnowledgeChunk(editingChunk.id, editingChunk);
    } else {
      await apiClient.createKnowledgeChunk(editingChunk);
    }
    setShowForm(false);
    setEditingChunk(null);
    loadData();
  };

  const deleteChunk = async (id: number) => {
    if (!confirm('确认删除该知识条目？')) return;
    await apiClient.deleteKnowledgeChunk(id);
    loadData();
  };

  const saveFaq = async () => {
    if (!editingFaq) return;
    if (editingFaq.id) {
      await apiClient.updateFaq(editingFaq.id, editingFaq);
    } else {
      await apiClient.createFaq(editingFaq);
    }
    setShowForm(false);
    setEditingFaq(null);
    loadData();
  };

  const deleteFaq = async (id: number) => {
    if (!confirm('确认删除该FAQ？')) return;
    await apiClient.deleteFaq(id);
    loadData();
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif", letterSpacing: 1 }}>知识库管理</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${tab === 'chunks' ? 'btn-primary' : ''}`} onClick={() => { setTab('chunks'); setShowForm(false); }}>知识条目</button>
          <button className={`btn btn-sm ${tab === 'faq' ? 'btn-primary' : ''}`} onClick={() => { setTab('faq'); setShowForm(false); }}>FAQ管理</button>
        </div>
      </div>

      {tab === 'chunks' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索知识条目..." style={{ maxWidth: 320 }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button className="btn btn-sm btn-primary" onClick={handleSearch}>搜索</button>
            <button className="btn btn-sm btn-secondary" onClick={() => {
              setEditingChunk({ title: '', content: '', tags: '', poiId: '', source: '' });
              setShowForm(true);
            }}>+ 新增</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chunks.length === 0 && <div className="empty-state"><span className="empty-state__text">暂无知识条目</span></div>}
              {chunks.map(c => (
                <div key={c.id} style={{
                  borderRadius: 16, padding: 16, background: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(180,136,100,0.08)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#3D2C2A' }}>{c.title}</strong>
                      {c.poiId && <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: '0.65rem' }}>{c.poiId}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-text" onClick={() => { setEditingChunk(c); setShowForm(true); }}>编辑</button>
                      <button className="btn-text" style={{ color: '#ef4444' }} onClick={() => deleteChunk(c.id)}>删除</button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.5)', lineHeight: 1.6, marginBottom: 6 }}>
                    {c.content.length > 200 ? c.content.slice(0, 200) + '...' : c.content}
                  </p>
                  {c.tags && <span className="badge badge-gray" style={{ fontSize: '0.6rem' }}>{c.tags}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'faq' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => {
              setEditingFaq({ question: '', answer: '' });
              setShowForm(true);
            }}>+ 新增FAQ</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {faqs.length === 0 && <div className="empty-state"><span className="empty-state__text">暂无FAQ</span></div>}
              {faqs.map(f => (
                <div key={f.id} style={{
                  borderRadius: 16, padding: 16, background: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(180,136,100,0.08)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3D2C2A' }}>Q: {f.question}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(61,44,42,0.4)' }}>点击 {f.clickCount}</span>
                      <button className="btn-text" onClick={() => { setEditingFaq(f); setShowForm(true); }}>编辑</button>
                      <button className="btn-text" style={{ color: '#ef4444' }} onClick={() => deleteFaq(f.id)}>删除</button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(61,44,42,0.5)', lineHeight: 1.6 }}>A: {f.answer}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit/Create Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: '#F7F2E6', borderRadius: 24, padding: 28, width: 540,
            maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(61,44,42,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#3D2C2A', marginBottom: 16 }}>
              {tab === 'chunks' ? (editingChunk?.id ? '编辑知识条目' : '新增知识条目') : (editingFaq?.id ? '编辑FAQ' : '新增FAQ')}
            </h3>

            {tab === 'chunks' && editingChunk && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="标题" value={editingChunk.title || ''}
                  onChange={e => setEditingChunk({ ...editingChunk, title: e.target.value })} />
                <textarea className="input" placeholder="内容" rows={6}
                  value={editingChunk.content || ''}
                  onChange={e => setEditingChunk({ ...editingChunk, content: e.target.value })}
                  style={{ resize: 'vertical', minHeight: 120 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="input" placeholder="标签（逗号分隔）" value={editingChunk.tags || ''}
                    onChange={e => setEditingChunk({ ...editingChunk, tags: e.target.value })} />
                  <input className="input" placeholder="关联POI编码（可选）" value={editingChunk.poiId || ''}
                    onChange={e => setEditingChunk({ ...editingChunk, poiId: e.target.value })} />
                </div>
              </div>
            )}

            {tab === 'faq' && editingFaq && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="问题" value={editingFaq.question || ''}
                  onChange={e => setEditingFaq({ ...editingFaq, question: e.target.value })} />
                <textarea className="input" placeholder="答案" rows={4}
                  value={editingFaq.answer || ''}
                  onChange={e => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  style={{ resize: 'vertical', minHeight: 80 }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-sm btn-primary" onClick={tab === 'chunks' ? saveChunk : saveFaq}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
