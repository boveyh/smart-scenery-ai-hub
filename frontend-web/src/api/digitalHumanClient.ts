import { config } from "../config";
import type { DigitalHumanRequest, StreamCallbacks } from "./types";

export async function streamDigitalHumanChat(
  params: DigitalHumanRequest & { tenantId: string },
  callbacks: StreamCallbacks
): Promise<void> {
  const url = `${config.aiEngineBaseUrl}/api/v1/digitalhuman/chat`;
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Id": params.tenantId,
      },
      body: JSON.stringify({
        session_id: params.session_id,
        content: params.content,
        timestamp: params.timestamp,
      }),
    });

    if (!response.ok) {
      const elapsed = (performance.now() - startTime).toFixed(0);
      throw new Error(
        `HTTP ${response.status} ${response.statusText} (耗时 ${elapsed}ms)`
      );
    }

    if (!response.body) {
      throw new Error("响应体为空");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        callbacks.onRawLine(trimmed);

        try {
          const chunk = JSON.parse(trimmed);

          if (chunk.type === "end") {
            const elapsed = (performance.now() - startTime).toFixed(0);
            callbacks.onEnd(
              `complete (耗时 ${elapsed}ms, reason: ${chunk.reason || "complete"})`
            );
            return;
          }

          callbacks.onChunk(chunk);
        } catch {
          callbacks.onError(
            new Error(`NDJSON 解析失败: ${trimmed.substring(0, 100)}`)
          );
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      callbacks.onRawLine(buffer.trim());
      try {
        const chunk = JSON.parse(buffer.trim());
        if (chunk.type === "end") {
          const elapsed = (performance.now() - startTime).toFixed(0);
          callbacks.onEnd(`complete (耗时 ${elapsed}ms)`);
        } else {
          callbacks.onChunk(chunk);
        }
      } catch {
        // ignore trailing incomplete line
      }
    }

    const elapsed = (performance.now() - startTime).toFixed(0);
    callbacks.onEnd(`stream ended (耗时 ${elapsed}ms)`);
  } catch (error) {
    callbacks.onError(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}