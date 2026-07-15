import React, { useState, useRef } from 'react';

export default function VisionPage() {
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    const newFiles: File[] = [];
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        newImages.push(reader.result as string);
        if (newImages.length === files.length) {
          setImages(prev => [...prev, ...newImages]);
          setImageFiles(prev => [...prev, ...newFiles]);
          setResult('');
          setError(null);
        }
      };
      reader.readAsDataURL(f);
      newFiles.push(f);
    });
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);
    setResult('');

    try {
      const base64List = images.map(img => img.split(',')[1] || img);
      const res = await fetch('/api/v1/vision/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'ling_shan' },
        body: JSON.stringify({ content: question.trim() || '请识别这张图片的内容', images: base64List }),
      });
      if (!res.ok) throw new Error(`识别接口请求失败: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) { setError('无法读取响应'); setLoading(false); return; }
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      const handleLine = (line: string) => {
        const payload = line.trim().startsWith('data: ') ? line.trim().slice(6) : line.trim();
        if (!payload) return;
        try {
          const data = JSON.parse(payload);
          if (data.type === 'text' && data.content) {
            fullText += data.content;
            setResult(fullText);
          }
          if (data.type === 'error') {
            setError(data.message || '识别失败');
          }
        } catch {}
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(handleLine);
      }
      if (buffer.trim()) handleLine(buffer);
    } catch (err: unknown) {
      setError((err as Error).message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImages([]); setImageFiles([]); setResult(''); setError(''); setQuestion('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, paddingBottom:14, borderBottom:'2px solid rgba(180,136,100,0.15)' }}>
        <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif", display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>📷</span> 拍照识物
        </h2>
        <span style={{ fontSize:'0.7rem', color:'rgba(61,44,42,0.4)' }}>支持 JPG / PNG / WebP</span>
      </div>

      {/* 上传区 */}
      <div style={{ borderRadius:22, padding:0, overflow:'hidden', background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)', marginBottom:16 }}>
        <div
          style={{
            border:'2px dashed rgba(180,136,100,0.15)', borderRadius:22,
            padding:'40px 20px', textAlign:'center', cursor:'pointer', margin:6,
            background: images.length > 0 ? 'transparent' : '#F7F2E6',
            transition:'all 200ms',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
        >
          {images.length > 0 ? (
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              {images.map((img, i) => (
                <div key={i} style={{ position:'relative' }}>
                  <img src={img} alt={`预览${i}`} style={{ width:160, height:120, borderRadius:14, objectFit:'cover', border:'1px solid rgba(180,136,100,0.10)' }} />
                  <button onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', border:'none', background:'#ef4444', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                </div>
              ))}
              <div onClick={() => fileInputRef.current?.click()} style={{ width:160, height:120, borderRadius:14, border:'2px dashed rgba(180,136,100,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', color:'rgba(61,44,42,0.25)', cursor:'pointer' }}>+</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:48, marginBottom:12, opacity:0.5 }}>📸</div>
              <p style={{ fontSize:'0.85rem', color:'rgba(61,44,42,0.5)', marginBottom:4 }}>点击上传或拖拽图片到这里</p>
              <p style={{ fontSize:'0.7rem', color:'rgba(61,44,42,0.3)' }}>支持 JPG / PNG / WebP 格式</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display:'none' }} />
        </div>
      </div>

      {/* 自定义问题 */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:'0.75rem', fontWeight:600, color:'#8B6E57', marginBottom:6 }}>自定义问题（可选）</div>
        <div style={{ display:'flex', gap:10 }}>
          <input className="input" value={question} onChange={e => setQuestion(e.target.value)} placeholder="例如：这是什么植物？" style={{ fontSize:'0.8rem', flex:1, borderRadius:16 }} />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={images.length === 0 || loading}
            style={{ fontSize:'0.8rem', padding:'8px 20px', borderRadius:16 }}>
            {loading ? <><span className="spinner" style={{ width:14, height:14 }} /> 识别中...</> : '🔍 开始识别'}
          </button>
          {images.length > 0 && <button className="btn btn-secondary" onClick={handleReset} style={{ fontSize:'0.8rem', padding:'8px 16px', borderRadius:16 }}>重置</button>}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom:16 }}>❌ {error}</div>}

      {/* 识别结果 */}
      {result && (
        <div style={{ borderRadius:22, padding:20, background:'rgba(255,255,255,0.55)', border:'1px solid rgba(180,136,100,0.10)' }}>
          <div style={{ fontSize:'0.75rem', fontWeight:600, color:'#8B6E57', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
            <span>🔍</span> 识别结果
          </div>
          <p style={{ fontSize:'0.85rem', lineHeight:1.8, color:'rgba(61,44,42,0.6)', whiteSpace:'pre-wrap' }}>{result}</p>
        </div>
      )}

      {/* 快捷问题 */}
      <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
        {['这是什么景点？', '介绍一下这个建筑', '这里有什么故事？'].map((q, i) => (
          <button key={i} className="btn btn-sm" onClick={() => setQuestion(q)}
            style={{ fontSize:'0.65rem', padding:'4px 10px', borderRadius:14, border:'1px solid rgba(180,136,100,0.10)' }}>{q}</button>
        ))}
      </div>
    </div>
  );
}
