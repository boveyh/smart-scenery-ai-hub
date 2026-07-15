import { useState, useRef, useCallback } from 'react';
import apiClient from '../api/client';
import { DEFAULT_TENANT_ID } from '../api/config';
import type { DigitalHumanChunk } from '../api/types';

interface DigitalHumanState {
  chunks: DigitalHumanChunk[];
  loading: boolean;
  error: string | null;
  finished: boolean;
}

export function useDigitalHuman(tenantId: string = DEFAULT_TENANT_ID) {
  const [state, setState] = useState<DigitalHumanState>({
    chunks: [], loading: false, error: null, finished: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    sessionId: string,
    content: string,
    callbacks: { onText: (text: string) => void; onAudio: (seq: number, url: string) => void },
    imageBase64?: string,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ chunks: [], loading: true, error: null, finished: false });

    try {
      const req: any = { session_id: sessionId, content, timestamp: Date.now() };
      if (imageBase64) req.images = [imageBase64];

      for await (const chunk of apiClient.digitalHumanChatStream(req, controller.signal)) {
        setState(prev => ({ ...prev, chunks: [...prev.chunks, chunk], loading: true }));
        if (chunk.text_chunk) callbacks.onText(chunk.text_chunk);
        if (chunk.audio_url) callbacks.onAudio(chunk.seq || 0, chunk.audio_url);
      }
      setState({ chunks: [], loading: false, error: null, finished: true });
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setState(prev => ({ ...prev, loading: false, error: (err as Error).message || '请求失败' }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ chunks: [], loading: false, error: null, finished: false });
  }, []);

  return { ...state, sendMessage, cancel };
}
