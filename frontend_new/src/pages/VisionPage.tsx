import React, { useState, useRef } from 'react';
import apiClient from '@/api/client';
import type { VisionRecognizeResult } from '@/api/types';

export default function VisionPage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<VisionRecognizeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    setImageBlob(file);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!imageBlob) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.recognizeImage(imageBlob, question.trim() || undefined);
      if (res.code === 200 && res.data) setResult(res.data);
      else setError(res.message || '识别失败');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null); setImageBlob(null); setResult(null); setError(null); setQuestion('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-10)', maxWidth: 640, margin: '0 auto' }}>
      {/* 标题栏 */}
      <div style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-3)', borderBottom: '2px solid var(--primary)' }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📷</span> 拍照识物
        </h2>
      </div>

      {/* 主卡片 */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        {/* 上传区域 */}
        <div
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-10)',
            textAlign: 'center', cursor: 'pointer',
            marginBottom: 'var(--space-5)',
            background: image ? 'transparent' : 'var(--bg)',
            transition: 'all 150ms ease',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
        >
          {image ? (
            <img src={image} alt="预览" style={{
              maxWidth: '100%', maxHeight: 320,
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow)',
            }} />
          ) : (
            <div>
              <div style={{ fontSize: 48, marginBottom: 'var(--space-3)', opacity: 0.5 }}>📸</div>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>点击上传或拖拽图片到这里</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>支持 JPG / PNG 格式</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>

        {/* 自定义问题 */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 6 }}>自定义问题（可选）</label>
          <input className="input" value={question} onChange={e => setQuestion(e.target.value)} placeholder="例如：这是什么植物？" />
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!imageBlob || loading} style={{ flex: 1, fontWeight: 600 }}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> 识别中...</> : '🔍 开始识别'}
          </button>
          {image && <button className="btn btn-lg" onClick={handleReset}>重新选择</button>}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 'var(--space-4)' }}>❌ {error}</div>}

      {result && (
        <div className="card" style={{ marginTop: 'var(--space-5)', padding: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔍</span> 识别结果
          </h3>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-4)', background: 'var(--bg)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ fontSize: 32 }}>🎯</span>
            <div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{result.object}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                置信度：<strong style={{ color: 'var(--success)' }}>{(result.confidence * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.8, color: 'var(--text)' }}>{result.description}</p>
        </div>
      )}
    </div>
  );
}
