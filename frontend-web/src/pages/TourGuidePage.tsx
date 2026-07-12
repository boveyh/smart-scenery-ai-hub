import { useState, useCallback, useEffect, useRef } from "react";
import Live2DStage from "../components/Live2DStage";
import { Live2DViewer } from "../features/live2d/Live2DViewer";
import { modelManifest } from "../features/live2d/modelManifest";

const pois = [
  { title: "古街牌坊", desc: "老街入口，明清石雕工艺精湛", btn: "讲解古街牌坊" },
  { title: "临江戏台", desc: "百年古戏台，倚江而建", btn: "讲解临江戏台" },
  { title: "书院巷", desc: "文人墨客聚集的清幽小巷", btn: "讲解书院巷" },
  { title: "城西茶楼", desc: "品茗赏景，俯瞰古城全貌", btn: "讲解城西茶楼" },
];

export default function TourGuidePage() {
  const [viewer, setViewer] = useState<Live2DViewer | null>(null);
  const [, setLoadError] = useState<string | null>(null);
  const initialLoaded = useRef(false);

  const handleViewerReady = useCallback((v: Live2DViewer) => {
    setViewer(v);
  }, []);

  useEffect(() => {
    if (viewer && !initialLoaded.current) {
      initialLoaded.current = true;
      const entry = modelManifest[0];
      if (entry) {
        viewer.loadModel(entry.modelPath, entry.name).catch((e) => {
          setLoadError(e instanceof Error ? e.message : String(e));
        });
      }
    }
  }, [viewer]);

  const s = (obj: Record<string, unknown>): Record<string, unknown> => obj;

  return (
    <div style={s({
      width: "100%", height: "100vh", background: "#EDE4D3",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "'Noto Serif SC','Songti SC','SimSun',serif",
      color: "#3D2C2A",
    })}>
      <div style={s({
        width: "100%", maxWidth: 1360, height: "calc(100vh - 48px)", background: "#F7F2E6",
        borderRadius: 32, boxShadow: "0 8px 40px rgba(61,44,42,0.10),0 2px 8px rgba(61,44,42,0.06)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      })}>
        {/* top bar */}
        <div style={s({
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 28px", borderBottom: "1px solid rgba(61,44,42,0.06)",
        })}>
          <span style={s({ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: "#E46767" })} />
          <span style={s({ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: "#F0B34A" })} />
          <span style={s({ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: "#6BC46B" })} />
          <div style={s({
            flex: 1, marginLeft: 8, background: "rgba(61,44,42,0.04)", borderRadius: 20,
            padding: "6px 18px", fontSize: "0.8125rem", color: "rgba(61,44,42,0.45)",
            fontFamily: "'SF Mono','Consolas',monospace",
          })}>yunling · 古城半日游</div>
        </div>

        {/* body */}
        <div style={s({
          flex: 1, display: "flex", padding: "20px 28px 28px", gap: 24, overflow: "hidden",
        })}>
          {/* LEFT */}
          <div style={s({
            flex: "0 0 62%", display: "flex", flexDirection: "column", gap: 16, minWidth: 0,
          })}>
            {/* title area */}
            <div style={s({ display: "flex", gap: 18, alignItems: "flex-start", flexShrink: 0 })}>
              <div style={s({ flex: 1 })}>
                <div style={s({
                  display: "inline-block", padding: "3px 14px", borderRadius: 20,
                  background: "rgba(180,136,100,0.15)", color: "#8B6E57",
                  fontSize: "0.75rem", fontWeight: 600, letterSpacing: 1, marginBottom: 10,
                  fontFamily: "'Noto Sans SC','PingFang SC',sans-serif",
                })}>景区服务</div>
                <h1 style={s({ fontSize: "1.75rem", fontWeight: 700, letterSpacing: 2, marginBottom: 6 })}>古城半日游路线</h1>
                <div style={s({ fontSize: "0.85rem", color: "rgba(61,44,42,0.55)", lineHeight: 1.6 })}>漫步千年古城，感受历史温度与市井烟火的人文之旅</div>
              </div>
              <div style={s({
                flexShrink: 0, width: 200,
                background: "rgba(244,237,226,0.85)", backdropFilter: "blur(4px)",
                border: "1px solid rgba(180,136,100,0.15)", borderRadius: 18,
                padding: "12px 16px", boxShadow: "0 2px 10px rgba(61,44,42,0.05)",
              })}>
                <div style={s({ fontSize: "0.8rem", fontWeight: 600, color: "#8B6E57", marginBottom: 4 })}>游览建议</div>
                <div style={s({ fontSize: "0.75rem", color: "rgba(61,44,42,0.5)", lineHeight: 1.5 })}>建议时长 3-4 小时 · 午后出发最佳 · 穿舒适步鞋方便行走</div>
              </div>
            </div>

            {/* canvas area with Live2D */}
            <div style={s({
              flex: 1, borderRadius: 28,
              background: "linear-gradient(145deg,#F2EBDA 0%,#F7F2E6 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              position: "relative", minHeight: 0,
              boxShadow: "inset 0 2px 6px rgba(61,44,42,0.03)", overflow: "hidden",
            })}>
              <div style={s({ width: "100%", height: "100%", position: "relative" })}>
                <Live2DStage onViewerReady={handleViewerReady} onLog={() => {}} />
              </div>
              <div style={s({
                position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
                background: "rgba(61,44,42,0.06)", backdropFilter: "blur(4px)",
                border: "1px solid rgba(61,44,42,0.05)", borderRadius: 30,
                padding: "10px 48px", fontSize: "0.9rem", color: "#8B6E57",
                fontWeight: 500, letterSpacing: 3, cursor: "pointer", whiteSpace: "nowrap",
                zIndex: 10,
              })}>建立整体印象</div>
            </div>

            {/* bottom cards */}
            <div style={s({ display: "flex", gap: 12, flexShrink: 0 })}>
              {[{t:"古街牌坊",s:"明清石雕 · 老街入口"},{t:"临江戏台",s:"百年古戏 · 江风徐来"},{t:"城西茶楼",s:"一壶香茗 · 半日浮生"}].map((item, i) => (
                <div key={i} style={s({
                  flex: 1, borderRadius: 20, background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(180,136,100,0.10)", padding: "12px 14px",
                  textAlign: "center", cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(61,44,42,0.03)",
                })}>
                  <div style={s({ fontSize: "0.85rem", fontWeight: 600, marginBottom: 2 })}>{item.t}</div>
                  <div style={s({ fontSize: "0.7rem", color: "rgba(61,44,42,0.4)" })}>{item.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div style={s({
            flex: 1, display: "flex", flexDirection: "column", gap: 18, minWidth: 0,
            overflowY: "auto", paddingRight: 2,
          })}>
            {/* header */}
            <div style={s({ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 })}>
              <h2 style={s({ fontSize: "1.2rem", fontWeight: 700, letterSpacing: 3 })}>云岭慢游</h2>
              <button style={s({
                padding: "5px 18px", borderRadius: 20, border: "1px solid rgba(139,110,87,0.25)",
                background: "transparent", fontSize: "0.75rem", color: "#8B6E57", fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Noto Sans SC','PingFang SC',sans-serif",
              })}>在线讲解</button>
            </div>

            {/* timeline */}
            <div>
              <div style={s({ fontSize: "0.8rem", fontWeight: 600, color: "#8B6E57", marginBottom: 10 })}>半日游路线</div>
              <div style={s({ padding: "4px 0 6px" })}>
                <div style={s({ display: "flex", justifyContent: "space-between", marginBottom: 6, padding: "0 4px" })}>
                  {["古街入口","临江戏台","书院巷","城西茶楼"].map((l,i) => (
                    <span key={i} style={s({ fontSize: "0.65rem", color: "rgba(61,44,42,0.4)", whiteSpace: "nowrap" })}>{l}</span>
                  ))}
                </div>
                <div style={s({ position: "relative", height: 4, background: "rgba(180,136,100,0.15)", borderRadius: 4, margin: "0 4px" })}>
                  <div style={s({ position: "absolute", left: 0, top: 0, height: "100%", width: "66%", background: "linear-gradient(90deg,#B88864,#D4A574)", borderRadius: 4 })} />
                </div>
                <div style={s({ display: "flex", justifyContent: "space-between", padding: "0 4px", marginTop: -12 })}>
                  {[true,true,false,false].map((a,i) => (
                    <span key={i} style={s({
                      width: a ? 14 : 12, height: a ? 14 : 12, borderRadius: "50%",
                      background: a ? "#B88864" : "#D9CBB8",
                      border: "2px solid #F7F2E6",
                      boxShadow: a ? "0 0 0 3px rgba(184,136,100,0.15)" : "0 1px 3px rgba(61,44,42,0.06)",
                    })} />
                  ))}
                </div>
              </div>
            </div>

            {/* poi grid */}
            <div>
              <div style={s({
                fontSize: "0.8rem", fontWeight: 600, color: "#8B6E57", marginBottom: 10,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              })}>
                <span>景点卡片</span>
                <span style={s({
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(180,136,100,0.10)", border: "1px solid rgba(180,136,100,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", color: "#8B6E57", cursor: "pointer",
                  fontFamily: "'Noto Sans SC',sans-serif",
                })}>⊕</span>
              </div>
              <div style={s({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 })}>
                {pois.map((poi, i) => (
                  <div key={i} style={s({
                    borderRadius: 16, padding: "12px 14px", background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(180,136,100,0.08)", cursor: "pointer",
                  })}>
                    <div style={s({ fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 })}>{poi.title}</div>
                    <div style={s({ fontSize: "0.7rem", color: "rgba(61,44,42,0.4)", lineHeight: 1.4, marginBottom: 8 })}>{poi.desc}</div>
                    <button style={s({
                      fontSize: "0.65rem", color: "#8B6E57", fontWeight: 500,
                      padding: "2px 0", background: "none", border: "none", cursor: "pointer",
                      fontFamily: "'Noto Sans SC','PingFang SC',sans-serif",
                      letterSpacing: 0.5,
                    })}>{poi.btn}</button>
                  </div>
                ))}
              </div>
            </div>

            {/* route suggestion */}
            <div>
              <div style={s({ fontSize: "0.8rem", fontWeight: 600, color: "#8B6E57", marginBottom: 8 })}>路线建议</div>
              <div style={s({ fontSize: "0.75rem", color: "rgba(61,44,42,0.5)", lineHeight: 1.7 })}>
                推荐从古街牌坊出发，沿青石板路漫步至临江戏台观看民俗表演，<br />
                途经书院巷感受书香气息，最后抵达城西茶楼品茗赏景。<br />
                全程约 3 公里，步行轻松，适合各年龄段游客。
              </div>
            </div>

            {/* actions */}
            <div style={s({ display: "flex", gap: 12, marginTop: "auto", paddingTop: 4 })}>
              <button style={s({
                flex: 1, padding: "12px 20px", borderRadius: 24, background: "#3D2C2A",
                color: "#F7F2E6", border: "none", fontSize: "0.85rem", fontWeight: 600,
                cursor: "pointer", letterSpacing: 2,
                fontFamily: "'Noto Sans SC','PingFang SC',sans-serif",
              })}>顾问已接入</button>
              <button style={s({
                flex: 1, padding: "12px 20px", borderRadius: 24, background: "transparent",
                color: "#8B6E57", border: "1px solid rgba(139,110,87,0.2)",
                fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", letterSpacing: 2,
                fontFamily: "'Noto Sans SC','PingFang SC',sans-serif",
              })}>推荐半日游</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
