import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const target = env.VITE_AI_ENGINE_BASE_URL || "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@framework": path.resolve(__dirname, "../CubismSdkForWeb-5-r.5/Framework/src"),
      },
    },
    optimizeDeps: {
      // Only scan project source, exclude Cubism SDK Samples which also use @framework alias
      entries: ["src/main.tsx"],
    },
    server: {
      fs: {
        // Only allow Cubism Framework source, NOT the Samples directory
        allow: [".", "../CubismSdkForWeb-5-r.5/Framework"],
      },
      watch: {
        ignored: ["../CubismSdkForWeb-5-r.5/Samples/**"],
      },
      port: 5173,
      proxy: {
        "/static": {
          target,
          changeOrigin: true,
        },
        "/api/v1/digitalhuman": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});