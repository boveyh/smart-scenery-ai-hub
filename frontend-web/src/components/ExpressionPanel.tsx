import { useState } from "react";
import { VrmViewer } from "../features/vrm/VrmViewer";

interface ExpressionPanelProps {
  viewer: VrmViewer | null;
  availableExpressions: string[];
  onLog: (message: string, level?: "info" | "warn" | "error") => void;
}

const EXPRESSION_LIST = [
  "neutral",
  "happy",
  "angry",
  "sad",
  "relaxed",
  "blink",
  "aa",
  "ih",
  "ou",
];

export default function ExpressionPanel({
  viewer,
  availableExpressions,
  onLog,
}: ExpressionPanelProps) {
  const [activeExpression, setActiveExpression] = useState<string | null>(null);

  const handleExpression = (name: string) => {
    if (!viewer) return;

    const isSupported = availableExpressions.includes(name);
    if (!isSupported) {
      onLog(`模型不支持 expression: ${name}`, "warn");
      return;
    }

    // If already active, deactivate; otherwise activate with value 1
    if (activeExpression === name) {
      viewer.setExpression(name, 0);
      setActiveExpression(null);
      onLog(`取消表情: ${name}`, "info");
    } else {
      // Reset previous expression
      if (activeExpression) {
        viewer.setExpression(activeExpression, 0);
      }
      viewer.setExpression(name, 1);
      setActiveExpression(name);
      onLog(`激活表情: ${name}`, "info");
    }
  };

  const handleResetAll = () => {
    if (!viewer) return;
    viewer.resetAllExpressions();
    setActiveExpression(null);
    onLog("重置所有表情", "info");
  };

  return (
    <div className="panel-section">
      <div className="panel-section-header">
        <span>表情调试</span>
      </div>
      <div className="panel-section-body">
        <div className="expression-grid">
          {EXPRESSION_LIST.map((name) => {
            const supported = availableExpressions.includes(name);
            const isActive = activeExpression === name;
            return (
              <button
                key={name}
                className={`expression-btn ${isActive ? "active" : ""} ${!supported && availableExpressions.length > 0 ? "unsupported" : ""}`}
                onClick={() => handleExpression(name)}
                title={
                  !supported && availableExpressions.length > 0
                    ? "不支持"
                    : name
                }
                disabled={!viewer}
              >
                {name}
                {!supported && availableExpressions.length > 0 ? (
                  <span style={{ fontSize: 9, display: "block" }}>不支持</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button className="btn-sm btn-warning" onClick={handleResetAll} disabled={!viewer}>
          重置所有表情
        </button>
      </div>
    </div>
  );
}