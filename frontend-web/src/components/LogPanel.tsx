import { useEffect, useRef } from "react";
import type { DigitalHumanChunk, LogEntry } from "../api/types";

interface LogPanelProps {
  rawLines: string[];
  chunks: DigitalHumanChunk[];
  logs: LogEntry[];
  endReason: string | null;
}

export default function LogPanel({
  rawLines,
  chunks,
  logs,
  endReason,
}: LogPanelProps) {
  const rawLogRef = useRef<HTMLDivElement>(null);
  const sysLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (rawLogRef.current) {
      rawLogRef.current.scrollTop = rawLogRef.current.scrollHeight;
    }
  }, [rawLines]);

  useEffect(() => {
    if (sysLogRef.current) {
      sysLogRef.current.scrollTop = sysLogRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <>
      {/* NDJSON Raw Lines */}
      <div className="panel-section">
        <div className="panel-section-header">
          <span>NDJSON 原始日志 ({rawLines.length})</span>
        </div>
        <div className="panel-section-body" style={{ padding: 4 }}>
          <div className="log-area" ref={rawLogRef}>
            {rawLines.length === 0 && (
              <div className="log-line info">等待后端请求...</div>
            )}
            {rawLines.map((line, i) => (
              <div key={i} className="log-line info">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parsed Chunks Queue */}
      <div className="panel-section">
        <div className="panel-section-header">
          <span>分句队列 ({chunks.length})</span>
          {endReason && (
            <span className="status-badge success">完成</span>
          )}
        </div>
        <div className="panel-section-body" style={{ padding: 4 }}>
          <div className="log-area">
            {chunks.length === 0 && (
              <div className="log-line info">暂无解析数据</div>
            )}
            {chunks.map((chunk, i) => (
              <div key={i} className="log-line info">
                seq={chunk.seq} {chunk.text_chunk || ""}{" "}
                {chunk.audio_url ? `[audio]` : ""}
              </div>
            ))}
            {endReason && (
              <div className="log-line success">{endReason}</div>
            )}
          </div>
        </div>
      </div>

      {/* System Logs */}
      <div className="panel-section">
        <div className="panel-section-header">
          <span>系统日志</span>
        </div>
        <div className="panel-section-body" style={{ padding: 4 }}>
          <div className="log-area" ref={sysLogRef}>
            {logs.length === 0 && (
              <div className="log-line info">系统就绪</div>
            )}
            {logs.map((entry) => (
              <div key={entry.id} className={`log-line ${entry.level}`}>
                [{new Date(entry.timestamp).toLocaleTimeString()}] {entry.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}