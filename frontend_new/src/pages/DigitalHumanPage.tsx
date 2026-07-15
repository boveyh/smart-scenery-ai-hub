import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  return {
    tts_voice: ttsVoice || config.ttsVoice,
    tts_rate: config.ttsRate,
    tts_pitch: config.ttsPitch,
    persona_prompt: config.personaPrompt,
  };
}

function compactSubtitle(text: string) {
  const normalized = cleanDisplayText(text).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const parts = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [normalized];
  return parts.slice(0, 2).join('').trim();
}

function cleanDisplayText(text: string) {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#>`[\]()]/g, '')
    .replace(/^\s*[-+•\d.、]+\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
  images?: string[];
}

function loadChatHistory(): ChatMsg[] {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === 'reload') {
      sessionStorage.removeItem(CHAT_HISTORY_KEY);
      return [];
    }
    const saved = sessionStorage.getItem(CHAT_HISTORY_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is ChatMsg =>
      (m?.role === 'user' || m?.role === 'ai') && typeof m.text === 'string',
    ).map(m => ({
      ...m,
      images: Array.isArray(m.images) ? m.images.filter((img): img is string => typeof img === 'string') : undefined,
    }));
  } catch {
    return [];
  }
}

export default function DigitalHumanPage() {
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
  const lipSyncRef = useRef<{ ctx: AudioContext | null; src: MediaElementAudioSourceNode | null; raf: number }>({ ctx: null, src: null, raf: 0 });
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

  useEffect(() => {
    cancelRef.current = cancel;
  }, [cancel]);

  useEffect(() => {
    sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages]);

  const playNextRef = useRef<() => void>(() => {});
  const playNext = useCallback(() => { playNextRef.current(); }, []);
  const startLipSync = (audio: HTMLAudioElement, v: Live2DViewer) => {
    const ls = lipSyncRef.current;
    if (ls.raf) cancelAnimationFrame(ls.raf);
    if (ls.ctx) ls.ctx.close();
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        const norm = Math.min(avg / 100, 1);
        v.setMouthOpen(norm);
        ls.raf = requestAnimationFrame(tick);
      };
      ls.ctx = ctx;
      ls.src = src;
      tick();
    } catch { /* cross-origin or no audio context */ }
  };
  const stopLipSync = () => {
    const ls = lipSyncRef.current;
    if (ls.raf) { cancelAnimationFrame(ls.raf); ls.raf = 0; }
    if (ls.ctx) { ls.ctx.close(); ls.ctx = null; ls.src = null; }
  };

  playNextRef.current = () => {
    const queue = audioQueueRef.current;
    if (queue.length === 0) return;
    const next = queue.shift()!;
    currentSeqRef.current = next.seq;
    setCurrentText(compactSubtitle(next.text));
    setTtsError(null);
    setIsSpeaking(true);
    const activeViewer = viewerRef.current || viewer;
    if (activeViewer) activeViewer.setSpeaking(true);
    const audio = new Audio(next.url);
    audioRef.current = audio;
    audio.onended = () => {
      stopLipSync();
      const currentViewer = viewerRef.current || viewer;
      if (currentViewer) currentViewer.setMouthOpen(0);
      setIsSpeaking(false);
      if (currentViewer) currentViewer.setSpeaking(false);
      if (audioQueueRef.current.length === 0) setCurrentText('');
      playNextRef.current();
    };
    audio.onerror = () => {
      stopLipSync();
      setIsSpeaking(false);
      setTtsError('语音播放失败，已跳过当前句');
      const currentViewer = viewerRef.current || viewer;
      if (currentViewer) { currentViewer.setMouthOpen(0); currentViewer.setSpeaking(false); }
      if (audioQueueRef.current.length === 0) setCurrentText('');
      playNextRef.current();
    };
    audio.play().then(() => {
      const currentViewer = viewerRef.current || viewer;
      if (currentViewer) startLipSync(audio, currentViewer);
    }).catch(() => {
      stopLipSync();
      setIsSpeaking(false);
      setTtsError('浏览器阻止了语音播放，请再点一次发送或检查自动播放权限');
      const currentViewer = viewerRef.current || viewer;
      if (currentViewer) { currentViewer.setMouthOpen(0); currentViewer.setSpeaking(false); }
    });
  };

  const stopSpeaking = useCallback(() => {
    stopLipSync();
    audioQueueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsPaused(false);
    const activeViewer = viewerRef.current || viewer;
    if (activeViewer) { activeViewer.setMouthOpen(0); activeViewer.setSpeaking(false); }
  }, [viewer]);

  const handleStopAll = useCallback(() => {
    stopSpeaking();
    visionAbortRef.current?.abort();
    visionAbortRef.current = null;
    setIsVisionLoading(false);
    cancel();
  }, [stopSpeaking, cancel]);

  const synthesizeAndPlay = useCallback(async (text: string, sid: string, seq: number) => {
    const cleanText = cleanDisplayText(text);
    if (!cleanText) return false;
    try {
      const res = await fetch('/api/v1/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'ling_shan' },
        body: JSON.stringify({
          text: cleanText,
          session_id: sid,
          seq,
          ...toDigitalHumanOptions(activeConfig, selectedVoice),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.audio_url) throw new Error(data.detail || 'TTS 生成失败');
      audioQueueRef.current.push({ seq, text: cleanText, url: data.audio_url });
      if (!audioRef.current || audioRef.current.paused) playNext();
      return true;
    } catch (e) {
      setTtsError(e instanceof Error ? `图片讲解语音生成失败：${e.message}` : '图片讲解语音生成失败');
      return false;
    }
  }, [activeConfig, playNext, selectedVoice]);

  useEffect(() => {
    return () => {
      stopLipSync();
      audioQueueRef.current = [];
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      visionAbortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
      if (viewerRef.current) {
        viewerRef.current.setMouthOpen(0);
        viewerRef.current.setSpeaking(false);
      }
      cancelRef.current();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && selectedImages.length === 0) || loading || isVisionLoading) return;
    audioQueueRef.current = [];
    queuedSeqs.current.clear();
    currentSeqRef.current = 0;
    setCurrentText('');
    setIsSpeaking(false);
    setIsPaused(false);
    setTtsError(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    lastProcessedSeq.current = 0;
    aiFullText.current = '';
    const attachedImages = [...selectedImages];
    const msgText = input.trim() || '请识别这张图片';
    setMessages(prev => [...prev, { role: 'user', text: msgText, images: attachedImages }]);
    const newSid = generateSessionId();
    setSessionId(newSid);

    if (selectedImages.length > 0) {
      // 图片模式：调用 vision 接口
      const images = attachedImages.map(img => img.split(',')[1] || img);
      const controller = new AbortController();
      visionAbortRef.current = controller;
      setIsVisionLoading(true);
      setSelectedImages([]);
      setInput('');
      // 直接 fetch vision 端点，流式追加到聊天框
      fetch('/api/v1/vision/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'ling_shan' },
        signal: controller.signal,
        body: JSON.stringify({
          content: input.trim(),
          images,
          session_id: newSid,
          ...toDigitalHumanOptions(activeConfig, selectedVoice),
        }),
      }).then(async res => {
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let aiText = '';
        let buffer = '';
        let hasVisionAudio = false;
        const missingAudioTexts: string[] = [];
        const handleVisionLine = (line: string) => {
          const payload = line.trim().startsWith('data: ') ? line.trim().slice(6) : line.trim();
          if (!payload) return;
          try {
            const data = JSON.parse(payload);
            const chunkText = cleanDisplayText(data.text_chunk || data.content || '');
            if (data.type === 'text' && chunkText) {
              aiText += chunkText;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'ai') {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...last, text: aiText };
                  return updated;
                }
                return [...prev, { role: 'ai', text: aiText }];
              });
              if (data.audio_url) {
                hasVisionAudio = true;
                audioQueueRef.current.push({
                  seq: Number(data.seq) || Date.now(),
                  text: chunkText,
                  url: data.audio_url,
                });
                if (!audioRef.current || audioRef.current.paused) playNext();
              } else {
                missingAudioTexts.push(chunkText);
                setCurrentText(compactSubtitle(chunkText));
              }
            }
          } catch {}
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach(handleVisionLine);
        }
        if (buffer.trim()) handleVisionLine(buffer);
        if (!hasVisionAudio && missingAudioTexts.length > 0) {
          await synthesizeAndPlay(missingAudioTexts.join('。'), newSid, 9000);
        }
      }).catch(e => {
        if (e?.name !== 'AbortError') setAsrError('图片识别失败，请稍后重试');
      }).finally(() => {
        if (visionAbortRef.current === controller) visionAbortRef.current = null;
        setIsVisionLoading(false);
      });
    } else {
      sendMessage(newSid, input.trim(), toDigitalHumanOptions(activeConfig, selectedVoice));
      setInput('');
    }
  };

  const queuedSeqs = useRef(new Set<number>());
  useEffect(() => {
    const textChunksWithoutAudio = chunks.filter(c => c.text_chunk && !c.audio_url && !c.type && !queuedSeqs.current.has(c.seq));
    if (textChunksWithoutAudio.length > 0) {
      textChunksWithoutAudio.forEach(c => queuedSeqs.current.add(c.seq));
      setCurrentText(compactSubtitle(textChunksWithoutAudio[textChunksWithoutAudio.length - 1].text_chunk!));
      setTtsError('语音生成失败，当前仅显示文本');
    }

    const newChunks = chunks
      .filter(c => c.text_chunk && c.audio_url && !queuedSeqs.current.has(c.seq))
      .map(c => ({
        seq: c.seq, text: c.text_chunk!,
        url: c.audio_url!.startsWith('/') ? c.audio_url! : c.audio_url!,
      }));
    if (newChunks.length > 0) {
      newChunks.forEach(c => queuedSeqs.current.add(c.seq));
      audioQueueRef.current.push(...newChunks);
      if (!audioRef.current || audioRef.current.paused) playNext();
    }
  }, [chunks, playNext]);

  useEffect(() => {
    apiClient.getDigitalHumanConfigs().then(r => {
      if (r.code === 200 && r.data) {
        setConfigs(r.data);
        const savedId = localStorage.getItem(ACTIVE_CONFIG_KEY);
        const target = savedId ? r.data.find(c => c.tenantId === savedId) : null;
        setActiveConfig(target || r.data[0] || null);
      }
    }).catch(() => {});
  }, []);

  const handleViewerReady = useCallback((v: Live2DViewer) => {
    viewerRef.current = v;
    setViewer(v);
  }, []);

  useEffect(() => {
    if (viewer && activeConfig && !viewerLoaded.current) {
      viewerLoaded.current = true;
      if (activeConfig.live2dModel) {
        const entry = modelManifest.find(m => m.id === activeConfig.live2dModel);
        if (entry) viewer.loadModel(entry.modelPath, activeConfig.personaName || entry.name, {
          scale: entry.scale,
          offsetX: entry.offsetX,
          offsetY: entry.offsetY,
        }).catch(() => {});
      }
    }
  }, [viewer, activeConfig]);

  useEffect(() => {
    setSelectedVoice(activeConfig?.ttsVoice || '');
  }, [activeConfig?.tenantId, activeConfig?.ttsVoice]);

  const handleActivateConfig = useCallback((cfg: DigitalHumanConfigItem) => {
    setActiveConfig(cfg);
    localStorage.setItem(ACTIVE_CONFIG_KEY, cfg.tenantId);
    viewerLoaded.current = false;
    if (viewer && cfg.live2dModel) {
      const entry = modelManifest.find(m => m.id === cfg.live2dModel);
      if (entry) viewer.loadModel(entry.modelPath, cfg.personaName || entry.name, {
        scale: entry.scale,
        offsetX: entry.offsetX,
        offsetY: entry.offsetY,
      }).then(() => {
        viewerLoaded.current = true;
      }).catch(() => {});
    }
  }, [viewer]);

  // 流式文本累加 — 每当有新 chunk 到来时追加到聊天框
  const lastProcessedSeq = useRef(0);
  const aiFullText = useRef('');

  const sendTextQuestion = useCallback((text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    stopSpeaking();
    queuedSeqs.current.clear();
    currentSeqRef.current = 0;
    setCurrentText('');
    setTtsError(null);
    setAsrError(null);
    lastProcessedSeq.current = 0;
    aiFullText.current = '';
    const newSid = generateSessionId();
    setSessionId(newSid);
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    sendMessage(newSid, q, toDigitalHumanOptions(activeConfig, selectedVoice));
  }, [activeConfig, loading, selectedVoice, sendMessage, stopSpeaking]);

  const transcribeAndSend = useCallback(async (blob: Blob) => {
    if (blob.size < 800) {
      setAsrError('录音太短，请按住说完整问题');
      return;
    }
    setIsTranscribing(true);
    setAsrError(null);
    try {
      const form = new FormData();
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      form.append('audio', blob, `speech.${ext}`);
      const res = await fetch('/api/v1/asr/transcribe', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || '语音识别失败');
      const text = String(data.text || '').trim();
      if (!text) throw new Error('没有识别到有效文字');
      setInput(text);
      sendTextQuestion(text);
    } catch (e) {
      setAsrError(e instanceof Error ? e.message : '语音识别失败');
    } finally {
      setIsTranscribing(false);
    }
  }, [sendTextQuestion]);

  const startRecording = useCallback(async () => {
    if (loading || isTranscribing || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setAsrError('当前浏览器不支持录音输入');
      return;
    }
    try {
      setAsrError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordedChunksRef.current = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type });
        recordedChunksRef.current = [];
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        setIsRecording(false);
        transcribeAndSend(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      setIsRecording(false);
      setAsrError(e instanceof Error ? e.message : '无法启动麦克风');
    }
  }, [isRecording, isTranscribing, loading, transcribeAndSend]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    const newOnes = chunks.filter(c => c.text_chunk && c.seq > lastProcessedSeq.current);
    if (newOnes.length === 0) return;
    const textToAdd = newOnes.map(c => c.text_chunk).join('');
    lastProcessedSeq.current = Math.max(...newOnes.map(c => c.seq));
    aiFullText.current += textToAdd;
    
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'ai') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, text: aiFullText.current };
        return updated;
      }
      return [...prev, { role: 'ai', text: aiFullText.current }];
    });
  }, [chunks]);

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', gap: 20 }}>
      {/* LEFT: Live2D canvas 3:4 */}
      <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          flex: 1, borderRadius: 28, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(145deg,#F2EBDA 0%,#F7F2E6 100%)',
          boxShadow: 'inset 0 2px 6px rgba(61,44,42,0.03)',
          aspectRatio: '3 / 4', minHeight: 400, maxHeight: '100%',
        }}>
          <Live2DStage onViewerReady={handleViewerReady} onLog={() => {}} />
          {currentText && (
            <div style={{
              position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
              maxWidth: '80%', background: 'rgba(61,44,42,0.75)', backdropFilter: 'blur(8px)',
              borderRadius: 16, padding: '10px 20px', color: '#F7F2E6',
              fontSize: '0.85rem', lineHeight: 1.5, textAlign: 'center', zIndex: 10,
            }}>
              {currentText}
            </div>
          )}
          {isSpeaking && (
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.7rem',
                background: '#22c55e', color: '#fff', fontWeight: 500,
              }}>
                🔊 正在讲解
              </div>
              <button onClick={stopSpeaking} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem',
                background: 'rgba(239,68,68,0.85)', color: '#fff', fontWeight: 500,
                border: 'none', cursor: 'pointer',
              }}>
                ⏹ 停止
              </button>
            </div>
          )}
          {(loading || isVisionLoading) && (
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(61,44,42,0.58)', backdropFilter: 'blur(6px)',
              borderRadius: 999, padding: '5px 10px',
            }}>
              <div className="spinner" style={{ width: 12, height: 12 }} />
              <span style={{ fontSize: '0.68rem', color: '#F7F2E6' }}>思考中</span>
              <button onClick={cancel} style={{
                padding: 0, color: 'rgba(247,242,230,0.75)', fontSize: '0.68rem',
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}>取消</button>
            </div>
          )}
          {ttsError && (
            <div style={{
              position: 'absolute', top: (loading || isVisionLoading) ? 46 : 12, right: 12, zIndex: 10,
              maxWidth: 240, borderRadius: 999, padding: '5px 10px',
              background: 'rgba(146,64,14,0.72)', color: '#fff7ed',
              fontSize: '0.68rem',
            }}>
              {ttsError}
            </div>
          )}
          {error && (
            <div style={{
              position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
              background: '#fee2e2', borderRadius: 14, padding: '8px 16px',
              fontSize: '0.75rem', color: '#991b1b',
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: chat panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3D2C2A', fontFamily: "'Noto Serif SC',serif" }}>
              灵山胜景 · {activeConfig?.personaName || '数字人导览'}
            </h2>
            {activeConfig && (
              <div style={{ fontSize: '0.62rem', color: 'rgba(61,44,42,0.35)', marginTop: 1 }}>
                {(selectedVoice || activeConfig.ttsVoice)} · {activeConfig.ttsRate} · {activeConfig.ttsPitch}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <select
              value={activeConfig?.tenantId || ''}
              onChange={e => {
                const cfg = configs.find(c => c.tenantId === e.target.value);
                if (cfg) handleActivateConfig(cfg);
              }}
              style={{
                padding: '4px 10px', borderRadius: 14, border: '1px solid rgba(180,136,100,0.12)',
                background: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', color: '#3D2C2A',
                fontFamily: "'Noto Sans SC',sans-serif", outline: 'none', cursor: 'pointer',
                maxWidth: 130,
              }}
            >
              {configs.map(c => (
                <option key={c.tenantId} value={c.tenantId}>{c.personaName || c.tenantId}</option>
              ))}
            </select>
            <select
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
              disabled={!activeConfig}
              style={{
                padding: '4px 10px', borderRadius: 14, border: '1px solid rgba(180,136,100,0.12)',
                background: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', color: '#3D2C2A',
                fontFamily: "'Noto Sans SC',sans-serif", outline: 'none', cursor: 'pointer',
                maxWidth: 150,
              }}
            >
              <option value="" disabled>选择音色</option>
              {EDGE_TTS_VOICES.map(v => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* chat messages */}
        <div style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
          padding: '8px 4px 8px 0',
          background: 'rgba(255,255,255,0.3)', borderRadius: 18,
        }}>
          {messages.length === 0 && !loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              flex: 1, color: 'rgba(61,44,42,0.25)', gap: 6,
            }}>
              <span style={{ fontSize: '2rem' }}>💬</span>
              <span style={{ fontSize: '0.8rem' }}>向 {activeConfig?.personaName || 'AI'}导游提问开始对话</span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              padding: '0 10px',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem',
                background: m.role === 'user' ? '#3D2C2A' : 'rgba(180,136,100,0.15)',
                color: m.role === 'user' ? '#F7F2E6' : '#8B6E57',
              }}>
                {m.role === 'user' ? '我' : 'AI'}
              </div>
              <div style={{
                maxWidth: '80%',
                padding: '8px 14px', borderRadius: 16,
                background: m.role === 'user' ? '#3D2C2A' : 'rgba(255,255,255,0.7)',
                color: m.role === 'user' ? '#F7F2E6' : '#3D2C2A',
                fontSize: '0.78rem', lineHeight: 1.6,
                borderTopRightRadius: m.role === 'user' ? 4 : 16,
                borderTopLeftRadius: m.role === 'user' ? 16 : 4,
              }}>
                {m.images && m.images.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                    gap: 6,
                    marginBottom: m.text ? 8 : 0,
                    maxWidth: 230,
                  }}>
                    {m.images.map((img, imgIndex) => (
                      <img
                        key={imgIndex}
                        src={img}
                        alt="uploaded"
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          objectFit: 'cover',
                          borderRadius: 10,
                          border: '1px solid rgba(247,242,230,0.28)',
                          display: 'block',
                        }}
                      />
                    ))}
                  </div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* quick prompts */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
          {['介绍一下灵山胜景', '九龙灌浴几点表演', '灵山大佛有多高'].map((q, i) => (
            <button key={i} className="btn btn-sm" style={{
              fontSize: '0.65rem', padding: '4px 10px', borderRadius: 14,
              border: '1px solid rgba(180,136,100,0.10)',
            }} onClick={() => {
              sendTextQuestion(q);
            }}>
              {q}
            </button>
          ))}
        </div>

        {/* 图片预览 */}
        {selectedImages.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, padding: '4px 0' }}>
            {selectedImages.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={img} alt="preview" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(180,136,100,0.15)' }} />
                <button onClick={() => setSelectedImages(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}
        {asrError && (
          <div style={{
            flexShrink: 0, padding: '6px 10px', borderRadius: 12,
            background: 'rgba(254,226,226,0.75)', color: '#991b1b',
            fontSize: '0.7rem',
          }}>
            {asrError}
          </div>
        )}
        {/* input */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => {
              const files = e.target.files;
              if (!files) return;
              Array.from(files).forEach(f => {
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result as string;
                  setSelectedImages(prev => [...prev, result]);
                };
                reader.readAsDataURL(f);
              });
              e.target.value = '';
            }}
          />
          <button className="btn btn-sm btn-secondary" onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: '0.7rem', padding: '6px 10px', borderRadius: 14 }}>📷</button>
          {(isSpeaking || loading || isVisionLoading) && (
            <button className="btn btn-danger" onClick={handleStopAll}
              style={{ fontSize: '0.7rem', padding: '8px 12px', borderRadius: 18, flexShrink: 0 }}>
              ⏹ 停止
            </button>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input className="input" value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="输入您的问题..."
              disabled={loading || isVisionLoading || isTranscribing}
              style={{ flex: 1, fontSize: '0.78rem', borderRadius: 18 }}
            />
            <button
              type="button"
              onPointerDown={e => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startRecording();
              }}
              onPointerUp={e => {
                e.preventDefault();
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                stopRecording();
              }}
              onPointerCancel={stopRecording}
              onContextMenu={e => e.preventDefault()}
              disabled={loading || isVisionLoading || isTranscribing}
              style={{
                fontSize: '0.72rem',
                padding: '8px 12px',
                borderRadius: 18,
                border: 'none',
                cursor: loading || isVisionLoading || isTranscribing ? 'not-allowed' : 'pointer',
                background: isRecording ? '#ef4444' : 'rgba(180,136,100,0.16)',
                color: isRecording ? '#fff' : '#3D2C2A',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                touchAction: 'none',
              }}
            >
              {isTranscribing ? '识别中' : isRecording ? '松开发送' : '🎙 按住说'}
            </button>
            <button className="btn btn-primary" type="submit"
              disabled={loading || isVisionLoading || isTranscribing || (!input.trim() && selectedImages.length === 0)}
              style={{ fontSize: '0.78rem', padding: '8px 18px', borderRadius: 18 }}>
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
