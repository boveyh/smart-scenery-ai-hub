export const config = {
  aiEngineBaseUrl:
    import.meta.env.VITE_AI_ENGINE_BASE_URL || "http://localhost:8000",
  defaultTenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || "ling_shan",
};

// 暴露 base URL 到 window 对象，供 AudioEngine 等纯逻辑模块使用（避免循环依赖）
if (typeof window !== "undefined") {
  (window as any).__AI_ENGINE_BASE_URL__ = config.aiEngineBaseUrl;
}

export function resolveAudioUrl(audioUrl: string | undefined): string {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }
  const base = config.aiEngineBaseUrl.replace(/\/+$/, "");
  const path = audioUrl.startsWith("/") ? audioUrl : "/" + audioUrl;
  return base + path;
}