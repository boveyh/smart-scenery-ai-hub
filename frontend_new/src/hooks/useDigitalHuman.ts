/**
 * 数字人模式 Hook
 * 对齐 API 文档 v2.0 §3 — 音视解耦核心链路
 */
import { useState, useRef, useCallback } from 'react';
import apiClient from '../api/client';
import { DEFAULT_TENANT_ID } from '../api/config';
import type { DigitalHumanChunk, DigitalHumanRequest } from '../api/types';

interface DigitalHumanState {
  chunks: DigitalHumanChunk[];
  currentSeq: number;
  loading: boolean;
  error: string | null;
  finished: boolean;
}

export function useDigitalHuman(tenantId: string = DEFAULT_TENANT_ID) {
  const [state, setState] = useState<DigitalHumanState>({
    chunks: [],
    currentSeq: 0,
    loading: false,
    error: null,
    finished: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    sessionId: string,
    content: string,
    options?: Pick<DigitalHumanRequest, 'tts_voice' | 'tts_rate' | 'tts_pitch' | 'persona_prompt'>,
  ) => {
    // 取消之前的请求
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      chunks: [],
      currentSeq: 0,
      loading: true,
      error: null,
      finished: false,
    });

    try {
      const req = {
        session_id: sessionId,
        content,
        timestamp: Date.now(),
        ...options,
      };

      for await (const chunk of apiClient.digitalHumanChatStream(req, controller.signal)) {
        setState(prev => ({
          ...prev,
          chunks: [...prev.chunks, chunk],
          currentSeq: chunk.seq,
          loading: !chunk.type || chunk.type !== 'end',
          finished: chunk.type === 'end',
          error: chunk.type === 'error' ? chunk.message || '未知错误' : null,
        }));
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        loading: false,
        error: (err as Error).message || '请求失败',
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState({
      chunks: [],
      currentSeq: 0,
      loading: false,
      error: null,
      finished: false,
    });
  }, []);

  return { ...state, sendMessage, cancel };
}
