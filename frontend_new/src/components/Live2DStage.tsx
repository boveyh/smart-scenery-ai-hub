import { useEffect, useRef, useCallback } from "react";
import { Live2DViewer } from "../features/live2d/Live2DViewer";

interface Live2DStageProps {
  onViewerReady: (viewer: Live2DViewer) => void;
  onLog: (message: string, level?: "info" | "warn" | "error") => void;
}

export default function Live2DStage({ onViewerReady, onLog }: Live2DStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Live2DViewer | null>(null);

  const handleResize = useCallback(() => {
    viewerRef.current?.onResize();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    let viewer: Live2DViewer;
    try {
      viewer = new Live2DViewer(canvasRef.current, {
        onLoadStart: () => {
          onLog("开始加载 Live2D 模型...", "info");
        },
        onLoadProgress: (loaded: number, total: number) => {
          onLog(
            `加载中: ${(loaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB`,
            "info"
          );
        },
        onLoadComplete: (info: { fileName: string; expressions: string[] }) => {
          onLog(`Live2D 模型加载完成: ${info.fileName}`, "info");
        },
        onLoadError: (error: Error) => {
          onLog(`Live2D 模型加载错误: ${error.message}`, "error");
        },
        onBlink: () => {
          // Blink occurred (silent)
        },
      });
    } catch (err) {
      onLog(`Live2D 初始化失败: ${err instanceof Error ? err.message : String(err)}`, "error");
      return;
    }

    viewerRef.current = viewer;
    onViewerReady(viewer);
    onLog("Live2D 渲染器已初始化", "info");

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    const parent = canvasRef.current.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    const initialTimer = setTimeout(() => {
      handleResize();
    }, 50);

    const pointerMargin = 96;
    const handleWindowPointerMove = (event: PointerEvent) => {
      const element = canvasRef.current?.parentElement ?? canvasRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left - pointerMargin &&
        event.clientX <= rect.right + pointerMargin &&
        event.clientY >= rect.top - pointerMargin &&
        event.clientY <= rect.bottom + pointerMargin;

      if (!inside) {
        viewerRef.current?.clearPointerTarget();
        return;
      }

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      viewerRef.current?.setPointerTarget(x, y);
    };

    const handleWindowPointerLeave = () => {
      viewerRef.current?.clearPointerTarget();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerleave", handleWindowPointerLeave);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerleave", handleWindowPointerLeave);
      resizeObserver.disconnect();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []); // Intentionally run once

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
