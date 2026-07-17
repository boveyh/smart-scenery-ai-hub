import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDigitalHuman } from '@/hooks/useDigitalHuman';
import { DEFAULT_TENANT_ID, AI_ENGINE_BASE } from '@/api/config';
import Live2DStage from '@/components/Live2DStage';
import { Live2DViewer } from '@/features/live2d/Live2DViewer';
import { modelManifest } from '@/features/live2d/modelManifest';
import apiClient from '@/api/client';
import type { DigitalHumanConfigItem } from '@/api/types';

const ACTIVE_CONFIG_KEY = 'active_digital_human_config';
const CHAT_HISTORY_KEY = 'digital_human_chat_history';

const EDGE_TTS_VOICES = [
  { value: 'zh-CN-XiaoxiaoNeural', label: '晓晓 · 女声' },
  { value: 'zh-CN-XiaoyiNeural', label: '晓伊 · 女声' },
  { value: 'zh-CN-XiaohanNeural', label: '晓涵 · 女声' },
  { value: 'zh-CN-XiaomengNeural', label: '晓梦 · 女声' },
  { value: 'zh-CN-XiaoshuangNeural', label: '晓双 · 女声' },
  { value: 'zh-CN-YunxiNeural', label: '云希 · 男声' },
  { value: 'zh-CN-YunjianNeural', label: '云健 · 男声' },
  { value: 'zh-CN-YunyangNeural', label: '云扬 · 男声' },
];

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, () => (Math.random() * 16 | 0).toString(16));
}

function toDigitalHumanOptions(config: DigitalHumanConfigItem | null, ttsVoice?: string) {
  if (!config) return undefined;
  return { tts_voice: ttsVoice || config.ttsVoice, tts_rate: config.ttsRate, tts_pitch: config.ttsPitch, persona_prompt: config.personaPrompt };
}

function compactSubtitle(text: string) {
  const normalized = cleanDisplayText(text).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const parts = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [normalized];
  return parts.slice(0, 2).join('').trim();
}

function cleanDisplayText(text: string) {
  return text.replace(/https?:\/\/\S+/g, '').replace(/[*_#>`[\]()]/g, '').replace(/^\s*[-+•\d.、]+\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

interface ChatMsg { role: 'user' | 'ai'; text: string; images?: string[]; }

function loadChatHistory(): ChatMsg[] {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === 'reload') { sessionStorage.removeItem(CHAT_HISTORY_KEY); return []; }
    const saved = sessionStorage.getItem(CHAT_HISTORY_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is ChatMsg => (m?.role === 'user' || m?.role === 'ai') && typeof m.text === 'string')
      .map(m => ({ ...m, images: Array.isArray(m.images) ? m.images.filter((img): img is string => typeof img === 'string') : undefined }));
  } catch { return []; }
}

export default function DigitalHumanPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMsg[]>(loadChatHistory);
  const { chunks, loading, error, finished, sendMessage, cancel } = useDigitalHuman(DEFAULT_TENANT_ID);
  const cancelRef = useRef(cancel);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<{ seq: number; text: string; url: string }[]>([]);
  const currentSeqRef = useRef(0);
  const [currentText, setCurrentText] = useState('');
  const lipSyncRef = useRef<{ ctx: AudioContext | null; raf: number }>({ ctx: null, raf: 0 });
  const gestureCtxRef = useRef<AudioContext | null>(null);
  const [viewer, setViewer] = useState<Live2DViewer | null>(null);
  const viewerRef = useRef<Live2DViewer | null>(null);
  const [configs, setConfigs] = useState<DigitalHumanConfigItem[]>([]);
  const [activeConfig, setActiveConfig] = useState<DigitalHumanConfigItem | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [asrError, setAsrError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const visionAbortRef = useRef<AbortController | null>(null);
  const viewerLoaded = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { cancelRef.current = cancel; }, [cancel]);
  useEffect(() => { sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-50))); }, [messages]);

  const startLipSync = (audio: HTMLAudioElement, v: Live2DViewer) => {
    const ls = lipSyncRef.current; if (ls.raf) cancelAnimationFrame(ls.raf); if (ls.ctx) ls.ctx.close();
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser(); analyser.fftSize = 128;
      const src = ctx.createMediaElementSource(audio); src.connect(analyser); analyser.connect(ctx.destination);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => { analyser.getByteFrequencyData(buf); v.setMouthOpen(Math.min(buf.reduce((a,b)=>a+b,0)/buf.length/100,1)); ls.raf = requestAnimationFrame(tick); };
      ls.ctx = ctx; tick();
    } catch {}
  };
  const stopLipSync = () => { const ls = lipSyncRef.current; if (ls.raf) { cancelAnimationFrame(ls.raf); ls.raf = 0; } if (ls.ctx) { ls.ctx.close(); ls.ctx = null; } };

  const playNextRef = useRef<() => void>(() => {});
  playNextRef.current = () => {
    const queue = audioQueueRef.current; if (queue.length === 0) return;
    const next = queue.shift()!; currentSeqRef.current = next.seq; setCurrentText(compactSubtitle(next.text)); setTtsError(null); setIsSpeaking(true);
    const activeViewer = viewerRef.current || viewer; if (activeViewer) activeViewer.setSpeaking(true);
    const audio = new Audio(next.url); audioRef.current = audio;
    audio.onended = () => { stopLipSync(); const cv = viewerRef.current || viewer; if (cv) cv.setMouthOpen(0); setIsSpeaking(false); if (cv) cv.setSpeaking(false); if (audioQueueRef.current.length === 0) setCurrentText(''); playNextRef.current(); };
    audio.onerror = () => { stopLipSync(); setIsSpeaking(false); setTtsError('语音播放失败'); const cv = viewerRef.current || viewer; if (cv) { cv.setMouthOpen(0); cv.setSpeaking(false); } if (audioQueueRef.current.length === 0) setCurrentText(''); playNextRef.current(); };
    audio.play().then(() => { const cv = viewerRef.current || viewer; if (cv) startLipSync(audio, cv); }).catch(() => { stopLipSync(); setIsSpeaking(false); setTtsError('浏览器阻止了语音播放'); const cv = viewerRef.current || viewer; if (cv) { cv.setMouthOpen(0); cv.setSpeaking(false); } });
  };
  const playNext = useCallback(() => { playNextRef.current(); }, []);

  const stopSpeaking = useCallback(() => { stopLipSync(); audioQueueRef.current = []; if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } setIsSpeaking(false); setIsPaused(false); const av = viewerRef.current || viewer; if (av) { av.setMouthOpen(0); av.setSpeaking(false); } }, [viewer]);
  const handleStopAll = useCallback(() => { stopSpeaking(); visionAbortRef.current?.abort(); visionAbortRef.current = null; setIsVisionLoading(false); cancel(); }, [stopSpeaking, cancel]);

  const synthesizeAndPlay = useCallback(async (text: string, sid: string, seq: number) => {
    const ct = cleanDisplayText(text); if (!ct) return false;
    try {
      const res = await fetch('/api/v1/tts/synthesize', { method:'POST', headers:{'Content-Type':'application/json','X-Tenant-Id':'ling_shan'}, body: JSON.stringify({ text: ct, session_id: sid, seq, ...toDigitalHumanOptions(activeConfig, selectedVoice) }) });
      const data = await res.json().catch(()=>({})); if (!res.ok || !data.audio_url) throw new Error(data.detail || 'TTS 失败');
      audioQueueRef.current.push({ seq, text: ct, url: data.audio_url }); if (!audioRef.current || audioRef.current.paused) playNext();
      return true;
    } catch (e) { setTtsError('语音生成失败'); return false; }
  }, [activeConfig, playNext, selectedVoice]);

  useEffect(() => { return () => { stopLipSync(); audioQueueRef.current = []; mediaStreamRef.current?.getTracks().forEach(t => t.stop()); visionAbortRef.current?.abort(); if (audioRef.current) { audioRef.current.pause(); } cancelRef.current(); }; }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if ((!input.trim() && selectedImages.length === 0) || loading || isVisionLoading) return;
    try { if (!gestureCtxRef.current) gestureCtxRef.current = new AudioContext(); if (gestureCtxRef.current.state === 'suspended') gestureCtxRef.current.resume(); } catch {}
    audioQueueRef.current = []; queuedSeqs.current.clear(); currentSeqRef.current = 0; setCurrentText(''); setIsSpeaking(false); setIsPaused(false); setTtsError(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    lastProcessedSeq.current = 0; aiFullText.current = '';
    const attachedImages = [...selectedImages]; const msgText = input.trim() || '请识别这张图片';
    setMessages(prev => [...prev, { role:'user', text: msgText, images: attachedImages }]);
    const newSid = generateSessionId(); setSessionId(newSid);
    if (selectedImages.length > 0) {
      const images = attachedImages.map(img => img.split(',')[1] || img);
      const controller = new AbortController(); visionAbortRef.current = controller; setIsVisionLoading(true); setSelectedImages([]); setInput('');
      fetch('/api/v1/vision/recognize', { method:'POST', headers:{'Content-Type':'application/json','X-Tenant-Id':'ling_shan'}, signal: controller.signal, body: JSON.stringify({ content: input.trim(), images, session_id: newSid, ...toDigitalHumanOptions(activeConfig, selectedVoice) }) })
        .then(async res => {
          const reader = res.body?.getReader(); if (!reader) return; const decoder = new TextDecoder(); let aiText = ''; let buffer = '';
          while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; lines.forEach(l => { const p = l.trim().startsWith('data: ') ? l.trim().slice(6) : l.trim(); if (!p) return; try { const d = JSON.parse(p); if (d.text_chunk || d.content) { aiText += (d.text_chunk || d.content); setMessages(prev => { const last = prev[prev.length-1]; if (last?.role==='ai') { const u = [...prev]; u[u.length-1] = {...last, text: aiText}; return u; } return [...prev, { role:'ai', text: aiText }]; }); } } catch {} }); }
        }).catch(e => { if (e?.name !== 'AbortError') setAsrError('图片识别失败'); }).finally(() => { if (visionAbortRef.current === controller) visionAbortRef.current = null; setIsVisionLoading(false); });
    } else { sendMessage(newSid, input.trim(), toDigitalHumanOptions(activeConfig, selectedVoice)); setInput(''); }
  };

  const queuedSeqs = useRef(new Set<number>());
  useEffect(() => {
    const newChunks = chunks.filter(c => c.text_chunk && c.audio_url && !queuedSeqs.current.has(c.seq));
    if (newChunks.length > 0) { newChunks.forEach(c => queuedSeqs.current.add(c.seq)); audioQueueRef.current.push(...newChunks.map(c=>({ seq:c.seq, text:c.text_chunk!, url:c.audio_url! }))); if (!audioRef.current || audioRef.current.paused) playNext(); }
  }, [chunks, playNext]);

  useEffect(() => { apiClient.getDigitalHumanConfigs().then(r => { if (r.code === 200 && r.data) { setConfigs(r.data); const savedId = localStorage.getItem(ACTIVE_CONFIG_KEY); const target = savedId ? r.data.find((c: DigitalHumanConfigItem) => c.tenantId === savedId) : null; setActiveConfig(target || r.data[0] || null); } }).catch(()=>{}); }, []);
  const handleViewerReady = useCallback((v: Live2DViewer) => { viewerRef.current = v; setViewer(v); }, []);
  useEffect(() => { if (viewer && activeConfig && !viewerLoaded.current) { viewerLoaded.current = true; if (activeConfig.live2dModel) { const entry = modelManifest.find(m => m.id === activeConfig.live2dModel); if (entry) viewer.loadModel(entry.modelPath, activeConfig.personaName || entry.name, { scale: entry.scale, offsetX: entry.offsetX, offsetY: entry.offsetY }).catch(()=>{}); } } }, [viewer, activeConfig]);
  useEffect(() => { setSelectedVoice(activeConfig?.ttsVoice || ''); }, [activeConfig?.tenantId, activeConfig?.ttsVoice]);

  const handleActivateConfig = useCallback((cfg: DigitalHumanConfigItem) => { setActiveConfig(cfg); localStorage.setItem(ACTIVE_CONFIG_KEY, cfg.tenantId); viewerLoaded.current = false; if (viewer && cfg.live2dModel) { const entry = modelManifest.find(m => m.id === cfg.live2dModel); if (entry) viewer.loadModel(entry.modelPath, cfg.personaName || entry.name, { scale: entry.scale, offsetX: entry.offsetX, offsetY: entry.offsetY }).then(()=>{ viewerLoaded.current = true; }).catch(()=>{}); } }, [viewer]);

  const lastProcessedSeq = useRef(0);
  const aiFullText = useRef('');

  const sendTextQuestion = useCallback((text: string) => { const q = text.trim(); if (!q || loading) return; stopSpeaking(); queuedSeqs.current.clear(); currentSeqRef.current = 0; setCurrentText(''); setTtsError(null); setAsrError(null); lastProcessedSeq.current = 0; aiFullText.current = ''; const newSid = generateSessionId(); setSessionId(newSid); setMessages(prev => [...prev, { role:'user', text: q }]); sendMessage(newSid, q, toDigitalHumanOptions(activeConfig, selectedVoice)); }, [activeConfig, loading, selectedVoice, sendMessage, stopSpeaking]);

  const transcribeAndSend = useCallback(async (blob: Blob) => { if (blob.size < 800) { setAsrError('录音太短'); return; } setIsTranscribing(true); setAsrError(null); try { const form = new FormData(); form.append('audio', blob, 'speech.webm'); const res = await fetch('/api/v1/asr/transcribe', { method:'POST', body: form }); const data = await res.json().catch(()=>({})); if (!res.ok) throw new Error(data.detail || '识别失败'); const text = String(data.text || '').trim(); if (!text) throw new Error('没有识别到有效文字'); setInput(text); sendTextQuestion(text); } catch(e) { setAsrError(e instanceof Error ? e.message : '识别失败'); } finally { setIsTranscribing(false); } }, [sendTextQuestion]);
  const startRecording = useCallback(async () => { if (loading || isTranscribing || isRecording) return; try { setAsrError(null); const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaStreamRef.current = stream; const recorder = new MediaRecorder(stream); recordedChunksRef.current = []; recorder.ondataavailable = e => { if (e.data.size>0) recordedChunksRef.current.push(e.data); }; recorder.onstop = () => { const blob = new Blob(recordedChunksRef.current); recordedChunksRef.current = []; mediaStreamRef.current?.getTracks().forEach(t=>t.stop()); mediaStreamRef.current = null; setIsRecording(false); transcribeAndSend(blob); }; mediaRecorderRef.current = recorder; recorder.start(); setIsRecording(true); } catch(e) { setIsRecording(false); setAsrError('无法启动麦克风'); } }, [isRecording, isTranscribing, loading, transcribeAndSend]);
  const stopRecording = useCallback(() => { const r = mediaRecorderRef.current; if (r && r.state !== 'inactive') { r.stop(); return; } mediaStreamRef.current?.getTracks().forEach(t=>t.stop()); mediaStreamRef.current = null; setIsRecording(false); }, []);

  useEffect(() => { const newOnes = chunks.filter(c => c.text_chunk && c.seq > lastProcessedSeq.current); if (newOnes.length === 0) return; const textToAdd = newOnes.map(c => c.text_chunk).join(''); lastProcessedSeq.current = Math.max(...newOnes.map(c => c.seq)); aiFullText.current += textToAdd; setMessages(prev => { const last = prev[prev.length-1]; if (last?.role === 'ai') { const u = [...prev]; u[u.length-1] = { ...last, text: aiFullText.current }; return u; } return [...prev, { role:'ai', text: aiFullText.current }]; }); }, [chunks]);

  const live2dHeight = isMobile ? '420px' : '100%';

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 20, height: isMobile ? 'auto' : 'calc(100vh - 130px)' }}>
      {/* Live2D canvas */}
      <div style={{ flex: isMobile ? 'none' : '0 0 55%', display:'flex', flexDirection:'column', gap: 10 }}>
        <div style={{
          flex:1, borderRadius: isMobile ? 20 : 28, overflow:'hidden', position:'relative',
          background: 'linear-gradient(145deg,#F2EBDA 0%,#F7F2E6 100%)',
          boxShadow: 'inset 0 2px 6px rgba(61,44,42,0.03)',
          height: live2dHeight, minHeight: isMobile ? 350 : 400,
        }}>
          <Live2DStage onViewerReady={handleViewerReady} onLog={() => {}} />
          {currentText && (
            <div style={{ position:'absolute', bottom:60, left:'50%', transform:'translateX(-50%)', maxWidth:'80%', background:'rgba(61,44,42,0.75)', backdropFilter:'blur(8px)', borderRadius:16, padding:'10px 20px', color:'#F7F2E6', fontSize:'0.85rem', lineHeight:1.5, textAlign:'center', zIndex:10 }}>
              {currentText}
            </div>
          )}
          {isSpeaking && (
            <div style={{ position:'absolute', top:12, left:12, zIndex:10, display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ padding:'4px 12px', borderRadius:20, fontSize:'0.7rem', background:'#22c55e', color:'#fff', fontWeight:500 }}>🔊 正在讲解</div>
              <button onClick={stopSpeaking} style={{ padding:'4px 10px', borderRadius:20, fontSize:'0.7rem', background:'rgba(239,68,68,0.85)', color:'#fff', fontWeight:500, border:'none', cursor:'pointer' }}>⏹ 停止</button>
            </div>
          )}
          {(loading || isVisionLoading) && (
            <div style={{ position:'absolute', top:12, right:12, zIndex:10, display:'flex', alignItems:'center', gap:7, background:'rgba(61,44,42,0.58)', backdropFilter:'blur(6px)', borderRadius:999, padding:'5px 10px' }}>
              <div className="spinner" style={{ width:12, height:12 }} />
              <span style={{ fontSize:'0.68rem', color:'#F7F2E6' }}>思考中</span>
              <button onClick={cancel} style={{ padding:0, color:'rgba(247,242,230,0.75)', fontSize:'0.68rem', background:'transparent', border:'none', cursor:'pointer' }}>取消</button>
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, flexWrap:'wrap', gap:6 }}>
          <div>
            <h2 style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight:700, color:'#3D2C2A', fontFamily:"'Noto Serif SC',serif" }}>
              {activeConfig?.personaName || '数字人导览'}
            </h2>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <select value={activeConfig?.tenantId || ''} onChange={e => { const cfg = configs.find(c => c.tenantId === e.target.value); if (cfg) handleActivateConfig(cfg); }}
              style={{ padding:'4px 8px', borderRadius:12, border:'1px solid rgba(180,136,100,0.12)', background:'rgba(255,255,255,0.6)', fontSize:'0.65rem', color:'#3D2C2A', outline:'none', maxWidth:110 }}>
              {configs.map(c => (<option key={c.tenantId} value={c.tenantId}>{c.personaName || c.tenantId}</option>))}
            </select>
            <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} disabled={!activeConfig}
              style={{ padding:'4px 8px', borderRadius:12, border:'1px solid rgba(180,136,100,0.12)', background:'rgba(255,255,255,0.6)', fontSize:'0.65rem', color:'#3D2C2A', outline:'none', maxWidth:130 }}>
              <option value="" disabled>选择音色</option>
              {EDGE_TTS_VOICES.map(v => (<option key={v.value} value={v.value}>{v.label}</option>))}
            </select>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, padding:'8px 4px 8px 0', background:'rgba(255,255,255,0.3)', borderRadius:18, maxHeight: isMobile ? '300px' : undefined }}>
          {messages.length === 0 && !loading && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, color:'rgba(61,44,42,0.25)', gap:6 }}>
              <span style={{ fontSize:'2rem' }}>💬</span>
              <span style={{ fontSize:'0.8rem' }}>向 {activeConfig?.personaName || 'AI'}导游提问开始对话</span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', flexDirection: m.role==='user'?'row-reverse':'row', padding:'0 10px' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', background: m.role==='user'?'#3D2C2A':'rgba(180,136,100,0.15)', color: m.role==='user'?'#F7F2E6':'#8B6E57' }}>{m.role==='user'?'我':'AI'}</div>
              <div style={{ maxWidth:'80%', padding:'8px 14px', borderRadius:16, background: m.role==='user'?'#3D2C2A':'rgba(255,255,255,0.7)', color: m.role==='user'?'#F7F2E6':'#3D2C2A', fontSize:'0.78rem', lineHeight:1.6, borderTopRightRadius: m.role==='user'?4:16, borderTopLeftRadius: m.role==='user'?16:4 }}>
                {m.images && m.images.length>0 && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(56px, 1fr))', gap:6, marginBottom: m.text?8:0 }}>{m.images.map((img, j)=> <img key={j} src={img} alt="" style={{ width:'100%', aspectRatio:'1/1', objectFit:'cover', borderRadius:10, display:'block' }} />)}</div>}
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', flexShrink:0 }}>
          {['介绍一下灵山胜境', '九龙灌浴几点表演', '灵山大佛有多高'].map((q, i) => (
            <button key={i} className="btn btn-sm" style={{ fontSize:'0.65rem', padding:'4px 10px', borderRadius:14, border:'1px solid rgba(180,136,100,0.10)' }} onClick={() => sendTextQuestion(q)}>{q}</button>
          ))}
        </div>

        {selectedImages.length > 0 && (
          <div style={{ display:'flex', gap:6, flexShrink:0, padding:'4px 0' }}>{selectedImages.map((img, i) => (
            <div key={i} style={{ position:'relative' }}>
              <img src={img} alt="" style={{ width:56, height:56, borderRadius:10, objectFit:'cover' }} />
              <button onClick={() => setSelectedImages(prev => prev.filter((_,j)=>j!==i))} style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', border:'none', background:'#ef4444', color:'#fff', fontSize:10, cursor:'pointer' }}>×</button>
            </div>
          ))}</div>
        )}
        {asrError && <div style={{ flexShrink:0, padding:'6px 10px', borderRadius:12, background:'rgba(254,226,226,0.75)', color:'#991b1b', fontSize:'0.7rem' }}>{asrError}</div>}
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e => { const files = e.target.files; if (!files) return; Array.from(files).forEach(f => { const reader = new FileReader(); reader.onload = () => setSelectedImages(prev => [...prev, reader.result as string]); reader.readAsDataURL(f); }); e.target.value = ''; }} />
          <button className="btn btn-sm btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ fontSize:'0.7rem', padding:'6px 10px', borderRadius:14 }}>📷</button>
          {(isSpeaking || loading || isVisionLoading) && <button className="btn btn-danger" onClick={handleStopAll} style={{ fontSize:'0.7rem', padding:'8px 12px', borderRadius:18, flexShrink:0 }}>⏹ 停止</button>}
          <form onSubmit={handleSubmit} style={{ display:'flex', gap:8, flex:1 }}>
            <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder="输入您的问题..." disabled={loading || isVisionLoading || isTranscribing} style={{ flex:1, fontSize:'0.78rem', borderRadius:18 }} />
            <button type="button" onPointerDown={e => { e.preventDefault(); startRecording(); }} onPointerUp={e => { e.preventDefault(); stopRecording(); }} onPointerCancel={stopRecording} onContextMenu={e => e.preventDefault()} disabled={loading || isVisionLoading || isTranscribing}
              style={{ fontSize:'0.72rem', padding:'8px 12px', borderRadius:18, border:'none', cursor: loading||isVisionLoading||isTranscribing?'not-allowed':'pointer', background: isRecording?'#ef4444':'rgba(180,136,100,0.16)', color: isRecording?'#fff':'#3D2C2A', fontWeight:600, whiteSpace:'nowrap', touchAction:'none' }}>
              {isTranscribing?'识别中':isRecording?'松开发送':'🎙 按住说'}
            </button>
            <button className="btn btn-primary" type="submit" disabled={loading||isVisionLoading||isTranscribing||(!input.trim()&&selectedImages.length===0)} style={{ fontSize:'0.78rem', padding:'8px 18px', borderRadius:18 }}>发送</button>
          </form>
        </div>
      </div>
    </div>
  );
}