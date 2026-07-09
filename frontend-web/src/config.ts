export const config = {
  aiEngineBaseUrl:
    import.meta.env.VITE_AI_ENGINE_BASE_URL || "http://localhost:8000",
  defaultTenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || "ling_shan",
};

export function resolveAudioUrl(audioUrl: string | undefined): string {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }
  const base = config.aiEngineBaseUrl.replace(/\/+$/, "");
  const path = audioUrl.startsWith("/") ? audioUrl : "/" + audioUrl;
  return base + path;
}