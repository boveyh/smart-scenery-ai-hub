import { useState, useCallback } from "react";
import { streamDigitalHumanChat } from "../api/digitalHumanClient";
import type { DigitalHumanChunk } from "../api/types";
import { config } from "../config";
import { AudioQueue } from "../features/audio/audioQueue";
import { VrmViewer } from "../features/vrm/VrmViewer";

interface BackendPanelProps {
  viewer: VrmViewer | null;
  audioQueue: AudioQueue;
  onLog: (message: string, level?: "info" | "warn" | "error") => void;
  onRawLine: (line: string) => void;
  onChunkReceived: (chunk: DigitalHumanChunk) => void;
  onEnd: (reason: string) => void;
  onUpdateQueueLength: (length: number) => void;
}

export default function BackendPanel({
  viewer,
  audioQueue,
  onLog,
  onRawLine,
  onChunkReceived,
  onEnd,
  onUpdateQueueLength,
}: BackendPanelProps) {
  const [tenantId, setTenantId] = useState(config.defaultTenantId);
  const [question, setQuestion] = useState("请介绍一下灵山胜境");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const handleSend = useCallback(async () => {
    if (!question.trim()) {
      onLog("请输入问题", "warn");
      return;
    }

    setIsStreaming(true);
    onLog(`发送请求: "${question}" to tenant=${tenantId}`, "info");

    try {
      await streamDigitalHumanChat(
        {
          session_id: sessionId,
          content: question,
          timestamp: Date.now(),
          tenantId,
        },
        {
          onRawLine: (line) => {
            onRawLine(line);
          },
          onChunk: (chunk) => {
            onChunkReceived(chunk);
            if (chunk.audio_url) {
              audioQueue.enqueue([
                {
                  seq: chunk.seq,
                  text_chunk: chunk.text_chunk,
                  audio_url: chunk.audio_url,
                },
              ]);
              onUpdateQueueLength(audioQueue.getQueueLength());
            }
          },
          onEnd: (reason) => {
            setIsStreaming(false);
            onEnd(reason);
            onLog(`流式接口结束: ${reason}`, "info");
          },
          onError: (error) => {
            setIsStreaming(false);
            onLog(`后端请求失败: ${error.message}`, "error");
          },
        }
      );
    } catch (error) {
      setIsStreaming(false);
      onLog(
        `请求异常: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
    }
  }, [
    question,
    tenantId,
    sessionId,
    audioQueue,
    onLog,
    onRawLine,
    onChunkReceived,
    onEnd,
    onUpdateQueueLength,
  ]);

  const handleStop = useCallback(() => {
    audioQueue.clear();
    setIsStreaming(false);
    onLog("停止播放队列", "warn");
  }, [audioQueue, onLog]);

  return (
    <div className="panel-section">
      <div className="panel-section-header">
        <span>后端接口调试</span>
        {isStreaming && <span className="spinner" />}
      </div>
      <div className="panel-section-body">
        <label>
          Tenant ID
          <input
            type="text"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          />
        </label>

        <label>
          问题内容
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
          />
        </label>

        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="btn-success"
            onClick={handleSend}
            disabled={isStreaming || !question.trim()}
          >
            发送请求
          </button>
          <button className="btn-warning" onClick={handleStop} disabled={!isStreaming}>
            停止
          </button>
        </div>

        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          接口: POST /api/v1/digitalhuman/chat
        </div>
      </div>
    </div>
  );
}