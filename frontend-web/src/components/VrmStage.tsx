import { useEffect, useRef, useCallback } from "react";
import { VrmViewer } from "../features/vrm/VrmViewer";

interface VrmStageProps {
  onViewerReady: (viewer: VrmViewer) => void;
  onLog: (message: string, level?: "info" | "warn" | "error") => void;
}

export default function VrmStage({ onViewerReady, onLog }: VrmStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<VrmViewer | null>(null);

  const handleResize = useCallback(() => {
    viewerRef.current?.onResize();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new VrmViewer(canvasRef.current, {
      onLoadStart: () => {
        onLog("开始加载模型...", "info");
      },
      onLoadProgress: (loaded, total) => {
        onLog(
          `加载中: ${(loaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB`,
          "info"
        );
      },
      onLoadComplete: (info) => {
        onLog(
          `模型加载完成: ${info.fileName}, expressions: [${info.expressions.join(", ")}]`,
          "info"
        );
      },
      onLoadError: (error) => {
        onLog(`模型加载错误: ${error.message}`, "error");
      },
      onBlink: () => {
        // Blink occurred (silent)
      },
    });

    viewerRef.current = viewer;
    onViewerReady(viewer);
    onLog("VRM 渲染器已初始化", "info");

    const observer = new ResizeObserver(handleResize);
    const parent = canvasRef.current.parentElement;
    if (parent) {
      observer.observe(parent);
    }

    return () => {
      observer.disconnect();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []); // Intentionally run once

  return (
    <div className="vrm-stage">
      <canvas ref={canvasRef} />
    </div>
  );
}