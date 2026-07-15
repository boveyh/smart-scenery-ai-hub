export interface DigitalHumanChunk {
  seq: number;
  text_chunk?: string;
  audio_url?: string;
  emotion?: string;
  type?: string;
  reason?: string;
}

export interface DigitalHumanRequest {
  session_id: string;
  content: string;
  timestamp: number;
  tts_voice?: string;
  tts_rate?: string;
  tts_pitch?: string;
}

export interface StreamCallbacks {
  onRawLine: (line: string) => void;
  onChunk: (chunk: DigitalHumanChunk) => void;
  onEnd: (reason: string) => void;
  onError: (error: Error) => void;
}

export interface LogEntry {
  id: number;
  timestamp: number;
  message: string;
  level: "info" | "warn" | "error";
}
