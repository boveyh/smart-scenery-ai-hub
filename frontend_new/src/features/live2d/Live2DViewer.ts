/**
 * Live2DViewer 基于 Live2D Cubism SDK for Web (官方 Framework) 的数字人渲染器
 *
 * 修复版：正确的 loadParameters/saveParameters API 调用 + Shader 路径 + 双参数口型
 */
import { CubismFramework, Option, LogLevel } from "@framework/live2dcubismframework";
import { CubismModelSettingJson } from "@framework/cubismmodelsettingjson";
import type { ICubismModelSetting } from "@framework/icubismmodelsetting";
import { CubismUserModel } from "@framework/model/cubismusermodel";
import { CubismMatrix44 } from "@framework/math/cubismmatrix44";
import { CubismEyeBlink } from "@framework/effect/cubismeyeblink";
import { CubismBreath, BreathParameterData } from "@framework/effect/cubismbreath";
import { CubismPose } from "@framework/effect/cubismpose";
import { CubismDefaultParameterId } from "@framework/cubismdefaultparameterid";
import { CubismRenderer_WebGL } from "@framework/rendering/cubismrenderer_webgl";
import { CubismWebGLOffscreenManager } from "@framework/rendering/cubismoffscreenmanager";
import { CubismShaderManager_WebGL } from "@framework/rendering/cubismshader_webgl";
import { CubismUpdateScheduler } from "@framework/motion/cubismupdatescheduler";
import { CubismEyeBlinkUpdater } from "@framework/motion/cubismeyeblinkupdater";
import { CubismBreathUpdater } from "@framework/motion/cubismbreathupdater";
import { CubismExpressionUpdater } from "@framework/motion/cubismexpressionupdater";
import { CubismPhysicsUpdater } from "@framework/motion/cubismphysicsupdater";
import { CubismMotion } from "@framework/motion/cubismmotion";
import { ACubismMotion } from "@framework/motion/acubismmotion";
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue,
} from "@framework/motion/cubismmotionqueuemanager";

const MOTION_GROUP_IDLE = "Idle";
const PRIORITY_IDLE = 1;

// Shader files are served from public/assets/live2d/shaders/WebGL/
const SHADER_PATH = "/assets/live2d/shaders/WebGL/";

const PARAM_IDS = {
  angleX: [CubismDefaultParameterId.ParamAngleX, "PARAM_ANGLE_X"],
  angleY: [CubismDefaultParameterId.ParamAngleY, "PARAM_ANGLE_Y"],
  angleZ: [CubismDefaultParameterId.ParamAngleZ, "PARAM_ANGLE_Z"],
  bodyAngleX: [CubismDefaultParameterId.ParamBodyAngleX, "PARAM_BODY_ANGLE_X"],
  bodyAngleY: [CubismDefaultParameterId.ParamBodyAngleY, "PARAM_BODY_ANGLE_Y"],
  eyeBallX: [CubismDefaultParameterId.ParamEyeBallX, "PARAM_EYE_BALL_X"],
  eyeBallY: [CubismDefaultParameterId.ParamEyeBallY, "PARAM_EYE_BALL_Y"],
  eyeLOpen: [CubismDefaultParameterId.ParamEyeLOpen, "PARAM_EYE_L_OPEN"],
  eyeROpen: [CubismDefaultParameterId.ParamEyeROpen, "PARAM_EYE_R_OPEN"],
  mouthOpenY: [CubismDefaultParameterId.ParamMouthOpenY, "PARAM_MOUTH_OPEN_Y"],
  mouthForm: [CubismDefaultParameterId.ParamMouthForm, "PARAM_MOUTH_FORM"],
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Live2DViewerCallbacks {
  onLoadStart: () => void;
  onLoadProgress: (loaded: number, total: number) => void;
  onLoadComplete: (info: { fileName: string; expressions: string[] }) => void;
  onLoadError: (error: Error) => void;
  onBlink: () => void;
}

export interface Live2DDisplayOptions {
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

// ─── Framework init (sync, once) ──────────────────────────────────────────────
let frameworkReady = false;
function initFrameworkOnce(): void {
  if (frameworkReady) return;
  const option = new Option();
  option.logFunction = (msg: string) => console.log("[CubismFramework]", msg);
  option.loggingLevel = LogLevel.LogLevel_Off;
  CubismFramework.startUp(option);
  CubismFramework.initialize();
  void CubismDefaultParameterId.ParamAngleX;
  frameworkReady = true;
}

// ─── ModelData ─────────────────────────────────────────────────────────────────
interface ModelData {
  setting: ICubismModelSetting;
  homeDir: string;
  mocBuffer: ArrayBuffer;
  physicsBuffer: ArrayBuffer | null;
  textureFiles: string[];
  expressionDefs: { name: string; fileName: string }[];
  motionDefs: { group: string; index: number; fileName: string }[];
}

type ExpressionBlend = "Add" | "Multiply" | "Overwrite";
interface ExpressionParam {
  id: string;
  value: number;
  blend: ExpressionBlend;
}

// ─── Main class ────────────────────────────────────────────────────────────────
export class Live2DViewer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private cb: Live2DViewerCallbacks;

  private model: CubismUserModel | null = null;
  private renderer: CubismRenderer_WebGL | null = null;
  private modelData: ModelData | null = null;

  private eyeBlink: CubismEyeBlink | null = null;
  private breath: CubismBreath | null = null;
  private pose: CubismPose | null = null;
  private updateScheduler: CubismUpdateScheduler | null = null;

  private motions = new Map<string, CubismMotion>();
  private expressionMotions = new Map<string, ACubismMotion>();
  private expressionParams = new Map<string, ExpressionParam[]>();
  private activeExpressions = new Set<string>();

  private isModelLoaded = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private destroyed = false;
  private mouthOpenValue = 0;   // ParamMouthOpenY (0-1) vertical jaw
  private mouthFormValue = 0.5; // ParamMouthForm (0-1) horizontal stretch (0.5=neutral)
  private cw = 0;
  private ch = 0;
  private defaultFbo: WebGLFramebuffer | null = null;

  private lipSyncIds: any[] = [];
  private expressionNames: string[] = [];
  private fallbackIdleTime = 0;
  private hasAuthoredMotions = false;
  private hasEyeBlink = false;
  private blinkTime = 0;
  private nextBlinkTime = 2 + Math.random() * 2;
  private idleGazeTime = 0;
  private idleGazeX = 0;
  private idleGazeY = 0;
  private idleGazeTargetX = 0;
  private idleGazeTargetY = 0;
  private pointerX = 0;
  private pointerY = 0;
  private pointerTargetX = 0;
  private pointerTargetY = 0;
  private isSpeaking = false;
  private speakingTime = 0;
  private displayScale = 1;
  private displayOffsetX = 0;
  private displayOffsetY = 0;
  private frameErrorCount = 0;
  private readonly MAX_FRAME_ERRORS = 10;

  constructor(canvas: HTMLCanvasElement, cb: Live2DViewerCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.initGL();
    this.startLoop();
  }

  // ─── Init GL ──────────────────────────────────────────────────────────────────
  private initGL(): void {
    // 1) Ensure non-zero canvas size before creating GL context
    if (this.canvas.width <= 0 || this.canvas.height <= 0) {
      const parent = this.canvas.parentElement;
      this.cw = parent?.clientWidth || 640;
      this.ch = parent?.clientHeight || 480;
    } else {
      this.cw = this.canvas.width;
      this.ch = this.canvas.height;
    }
    // Always set canvas dimensions explicitly
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;

    // 2) Get GL context directly on the React-managed canvas
    //    (No canvas cloning - avoids duplicate canvases on React StrictMode double-mount)
    const gl = this.canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    }) as WebGLRenderingContext | null;

    this.gl = gl;
    if (!this.gl) throw new Error("WebGL not available");

    // Drain stale errors
    while (this.gl.getError() !== this.gl.NO_ERROR) { /* drain */ }

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.clearColor(0, 0, 0, 0);
    this.defaultFbo = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    this.gl.viewport(0, 0, this.cw, this.ch);
    while (this.gl.getError() !== this.gl.NO_ERROR) { /* drain */ }
  }

  // ─── Load Model ───────────────────────────────────────────────────────────────
  async loadModel(jsonPath: string, fileName: string, display: Live2DDisplayOptions = {}): Promise<void> {
    if ((this as any)._loading) return;
    (this as any)._loading = true;
    this.unloadModel();
    this.displayScale = display.scale ?? 1;
    this.displayOffsetX = display.offsetX ?? 0;
    this.displayOffsetY = display.offsetY ?? 0;
    this.cb.onLoadStart();

    try {
      const gl = this.gl!;
      if (!gl || gl.isContextLost()) {
        if (gl && gl.isContextLost()) {
          const ext = gl.getExtension("WEBGL_lose_context");
          ext?.restoreContext();
        }
        if (!gl || gl.isContextLost()) throw new Error("WebGL context lost");
      }

      this.resize();
      initFrameworkOnce();

      // Fetch & parse
      const data = await this.fetchModelData(jsonPath);
      this.modelData = data;

      // Create model
      const model = new CubismUserModel();
      model.loadModel(data.mocBuffer, true);
      if (data.physicsBuffer) {
        model.loadPhysics(data.physicsBuffer, data.physicsBuffer.byteLength);
      }
      model.createRenderer(this.cw > 0 ? this.cw : 640, this.ch > 0 ? this.ch : 480);

      const renderer = model.getRenderer() as CubismRenderer_WebGL;
      if (!renderer) throw new Error("getRenderer() returned null");

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.defaultFbo);
      renderer.startUp(gl);

      // ** CRITICAL: Register GL context with shader manager, then set shader path **
      const shaderMgr = CubismShaderManager_WebGL.getInstance();
      shaderMgr.setGlContext(gl);
      const shader = shaderMgr.getShader(gl);
      if (shader) {
        shader.setShaderPath(SHADER_PATH);
      }

      this.renderer = renderer;

      await this.loadTextures(gl, data, renderer);
      this.expressionNames = await this.loadExpressions(model, data);
      this.setupEffects(model, data.setting);
      await this.preloadMotions(model, data);

      const layout = new Map<string, number>();
      data.setting.getLayoutMap(layout);
      model.getModelMatrix().setupFromLayout(layout);
      model.getModel().saveParameters();
      this.model = model;
      this.isModelLoaded = true;
      this.lastTime = performance.now();
      this.cb.onLoadComplete({ fileName, expressions: this.expressionNames });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("[Live2D] loadModel:", err);
      this.cb.onLoadError(err);
      this.unloadModel();
    } finally {
      (this as any)._loading = false;
    }
  }

  private async fetchModelData(path: string): Promise<ModelData> {
    const i = path.lastIndexOf("/"), home = path.substring(0, i + 1);
    const r = await fetch(path);
    if (!r.ok) throw new Error(`配置读取失败: ${r.status}`);
    const buf = await r.arrayBuffer();
    const s = new CubismModelSettingJson(buf, buf.byteLength);

    const mf = s.getModelFileName();
    if (!mf) throw new Error("未找到.moc3");
    const mr = await fetch(home + mf);
    if (!mr.ok) throw new Error(`.moc3 读取失败: ${mr.status}`);
    const moc = await mr.arrayBuffer();

    let physicsBuffer: ArrayBuffer | null = null;
    const physicsFileName = s.getPhysicsFileName();
    if (physicsFileName) {
      try {
        const physicsResp = await fetch(home + physicsFileName);
        if (physicsResp.ok) {
          physicsBuffer = await physicsResp.arrayBuffer();
          console.log("[Live2D] Physics loaded:", physicsFileName);
        }
      } catch (e) {
        console.warn("[Live2D] Failed to load physics:", e);
      }
    }

    // Load pose3.json for part visibility control (arm layer switching)
    const poseFileName = s.getPoseFileName();
    if (poseFileName) {
      try {
        const poseResp = await fetch(home + poseFileName);
        if (poseResp.ok) {
          const poseBuf = await poseResp.arrayBuffer();
          this.pose = CubismPose.create(poseBuf, poseBuf.byteLength);
          console.log("[Live2D] Pose loaded:", poseFileName);
        }
      } catch (e) {
        console.warn("[Live2D] Failed to load pose:", e);
      }
    }

    const tex: string[] = [];
    for (let i = 0; i < s.getTextureCount(); i++) {
      const f = s.getTextureFileName(i); if (f) tex.push(home + f);
    }
    const exp = [] as { name: string; fileName: string }[];
    for (let i = 0; i < s.getExpressionCount(); i++) {
      const n = s.getExpressionName(i), fn = s.getExpressionFileName(i);
      if (n && fn) exp.push({ name: n, fileName: home + fn });
    }
    const mot = [] as { group: string; index: number; fileName: string }[];
    for (let g = 0; g < s.getMotionGroupCount(); g++) {
      const gn = s.getMotionGroupName(g);
      for (let m = 0; m < s.getMotionCount(gn); m++) {
        const fn = s.getMotionFileName(gn, m);
        if (fn) mot.push({ group: gn, index: m, fileName: home + fn });
      }
    }
    return { setting: s, homeDir: home, mocBuffer: moc, physicsBuffer, textureFiles: tex, expressionDefs: exp, motionDefs: mot };
  }

  private async loadTextures(gl: WebGLRenderingContext, data: ModelData, r: CubismRenderer_WebGL): Promise<void> {
    await Promise.all(data.textureFiles.map((url, i) => this.loadTex(gl, url).then(t => r.bindTexture(i, t))));
    r.setIsPremultipliedAlpha(true);
  }

  private loadTex(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => {
        const t = gl.createTexture();
        if (!t) return reject(new Error("createTexture null"));
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        resolve(t);
      };
      img.onerror = () => reject(new Error(`纹理加载失败: ${url}`));
      img.src = url;
    });
  }

  private async loadExpressions(model: CubismUserModel, data: ModelData): Promise<string[]> {
    const names: string[] = [];
    await Promise.all(data.expressionDefs.map(async d => {
      try {
        const r = await fetch(d.fileName);
        if (!r.ok) { console.warn(`[Live2D] exp fail: ${d.fileName}`); return; }
        const buf = await r.arrayBuffer();
        this.expressionParams.set(d.name, this.parseExpressionParams(buf));
        const m = model.loadExpression(buf, buf.byteLength, d.name);
        if (m) { this.expressionMotions.set(d.name, m); names.push(d.name); }
      } catch (e) { console.warn(`[Live2D] exp "${d.name}":`, e); }
    }));
    return names;
  }

  private parseExpressionParams(buf: ArrayBuffer): ExpressionParam[] {
    try {
      const json = JSON.parse(new TextDecoder().decode(buf));
      return (json.Parameters ?? [])
        .filter((p: any) => typeof p.Id === "string" && typeof p.Value === "number")
        .map((p: any) => ({
          id: p.Id,
          value: p.Value,
          blend: p.Blend === "Multiply" || p.Blend === "Overwrite" ? p.Blend : "Add",
        }));
    } catch {
      return [];
    }
  }

  private setupEffects(model: CubismUserModel, s: ICubismModelSetting): void {
    this.updateScheduler = new CubismUpdateScheduler();
    const expressionManager = (model as any)._expressionManager;
    if (expressionManager) {
      this.updateScheduler.addUpdatableList(new CubismExpressionUpdater(expressionManager));
    }
    const physics = (model as any)._physics;
    if (physics) {
      this.updateScheduler.addUpdatableList(new CubismPhysicsUpdater(physics));
    }
    if (s.getEyeBlinkParameterCount() > 0) {
      this.hasEyeBlink = true;
      this.eyeBlink = CubismEyeBlink.create(s);
      this.updateScheduler.addUpdatableList(
        new CubismEyeBlinkUpdater(() => (model as any)._motionUpdated ?? false, this.eyeBlink!)
      );
    }
    this.breath = CubismBreath.create();
    const im = CubismFramework.getIdManager();
    this.breath.setParameters([
      new BreathParameterData(im.getId(CubismDefaultParameterId.ParamBodyAngleX), 0, 1.5, 15.5345, 0.35),
      new BreathParameterData(im.getId(CubismDefaultParameterId.ParamBreath), 0.5, 0.5, 3.2345, 1),
    ]);
    this.updateScheduler.addUpdatableList(new CubismBreathUpdater(this.breath));
    this.lipSyncIds = [];
    for (let i = 0; i < s.getLipSyncParameterCount(); i++) this.lipSyncIds.push(s.getLipSyncParameterId(i));
    this.updateScheduler.sortUpdatableList();
  }

  private async preloadMotions(model: CubismUserModel, data: ModelData): Promise<void> {
    this.hasAuthoredMotions = data.motionDefs.length > 0;
    for (const d of data.motionDefs) {
      const name = `${d.group}_${d.index}`;
      try {
        const r = await fetch(d.fileName);
        if (!r.ok) { console.warn(`[Live2D] motion fail: ${d.fileName}`); continue; }
        const buf = await r.arrayBuffer();
        const m = (model as any).loadMotion(buf, buf.byteLength, name, undefined, undefined, data.setting, d.group, d.index, true) as CubismMotion;
        if (m) {
          const ids: any[] = [];
          for (let i = 0; i < data.setting.getEyeBlinkParameterCount(); i++) ids.push(data.setting.getEyeBlinkParameterId(i));
          m.setEffectIds(ids, this.lipSyncIds);
          this.motions.set(name, m);
        }
      } catch (e) { console.warn(`[Live2D] motion: ${d.fileName}`, e); }
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────
  /** 垂直开口 (ParamMouthOpenY): 0=闭 1=全开 */
  setMouthOpen(v: number) { this.mouthOpenValue = Math.max(0, Math.min(1, v)); }

  /** 水平拉伸 (ParamMouthForm): 0=噘嘴/圆唇 0.5=自然 1=咧嘴/拉伸 */
  setMouthForm(v: number) { this.mouthFormValue = Math.max(0, Math.min(1, v)); }

  setExpression(name: string, value: number): boolean {
    if (!this.model) return false;
    if (this.expressionParams.has(name) && value > 0) {
      if (this.activeExpressions.has(name)) this.activeExpressions.delete(name);
      else this.activeExpressions.add(name);
      return this.activeExpressions.has(name);
    }
    const m = this.expressionMotions.get(name);
    if (m && value > 0) (this.model as any)._expressionManager?.startMotion(m, false);
    return false;
  }

  playExpression(name: string) {
    if (!this.model) return false;
    const m = this.expressionMotions.get(name);
    if (!m) return false;
    (this.model as any)._expressionManager?.startMotion(m, false);
    return true;
  }

  setSpeaking(speaking: boolean) { this.isSpeaking = speaking; }
  setPointerTarget(x: number, y: number) {
    this.pointerTargetX = Math.max(-1, Math.min(1, x));
    this.pointerTargetY = Math.max(-1, Math.min(1, y));
  }
  clearPointerTarget() { this.setPointerTarget(0, 0); }
  getAvailableExpressions() { return this.expressionNames; }
  getActiveExpressions() { return Array.from(this.activeExpressions); }
  getAvailableMotionGroups() {
    if (!this.modelData) return [];
    return Array.from(new Set(this.modelData.motionDefs.map(d => d.group)));
  }
  playMotionGroup(group: string) {
    return this.startRandomMotion(group, 2) !== InvalidMotionQueueEntryHandleValue;
  }
  onResize() { this.resize(); }

  private addParameterByAliases(model: any, ids: string[], value: number, weight = 1) {
    const idMgr = CubismFramework.getIdManager();
    for (const id of ids) {
      try { model.addParameterValueById(idMgr.getId(id), value, weight); } catch { /* parameter absent */ }
    }
  }

  private setParameterByAliases(model: any, ids: string[], value: number, weight = 1) {
    const idMgr = CubismFramework.getIdManager();
    for (const id of ids) {
      try { model.setParameterValueById(idMgr.getId(id), value, weight); } catch { /* parameter absent */ }
    }
  }

  destroy() {
    this.destroyed = true;
    if (this.animFrameId !== null) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
    this.unloadModel();
    this.gl = null;
  }

  // ─── Internal ─────────────────────────────────────────────────────────────────
  private resize() {
    const p = this.canvas.parentElement;
    if (!p) return;
    const w = p.clientWidth, h = p.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.cw = w; this.ch = h;
    this.canvas.width = w; this.canvas.height = h;
    this.gl?.viewport(0, 0, w, h);
  }

  private unloadModel() {
    this.isModelLoaded = false;
    for (const [, m] of this.motions) ACubismMotion.delete(m);
    this.motions.clear();
    for (const [, m] of this.expressionMotions) ACubismMotion.delete(m);
    this.expressionMotions.clear();
    this.expressionParams.clear();
    this.activeExpressions.clear();
    this.expressionNames = []; this.lipSyncIds = [];
    if (this.eyeBlink) { CubismEyeBlink.delete(this.eyeBlink); this.eyeBlink = null; }
    if (this.pose) { CubismPose.delete(this.pose); this.pose = null; }
    if (this.breath) { CubismBreath.delete(this.breath); this.breath = null; }
    if (this.updateScheduler) { this.updateScheduler.release(); this.updateScheduler = null; }
    if (this.model) { this.model.release(); this.model = null; }
    this.renderer = null; this.modelData = null; this.mouthOpenValue = 0; this.mouthFormValue = 0.5;
    this.fallbackIdleTime = 0; this.hasAuthoredMotions = false; this.hasEyeBlink = false;
    this.blinkTime = 0; this.nextBlinkTime = 2 + Math.random() * 2;
    this.idleGazeTime = 0; this.idleGazeX = 0; this.idleGazeY = 0; this.idleGazeTargetX = 0; this.idleGazeTargetY = 0;
    this.displayScale = 1; this.displayOffsetX = 0; this.displayOffsetY = 0;
  }

  // ─── Loop ──────────────────────────────────────────────────────────────────
  private startLoop() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (this.destroyed) return;
      this.animFrameId = requestAnimationFrame(loop);
      try {
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.update(dt);
        this.render();
        this.frameErrorCount = 0;
      } catch (e) {
        this.frameErrorCount++;
        if (this.frameErrorCount <= 3) {
          console.error(`[Live2D] Frame error #${this.frameErrorCount}:`, e);
        }
        if (this.frameErrorCount >= this.MAX_FRAME_ERRORS) {
          console.error("[Live2D] Too many frame errors, stopping loop");
          this.destroyed = true;
        }
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    const m = this.model;
    if (!m || !this.isModelLoaded) return;

    const model = m.getModel();
    if (!model) return;

    // 1. Restore from previous frame
    model.loadParameters();

    // 2. Motions (idle animation — runs first so lip-sync can override mouth)
    const mm = (m as any)._motionManager;
    if (mm) {
      if (mm.isFinished()) this.startRandomMotion(MOTION_GROUP_IDLE, PRIORITY_IDLE);
      (m as any)._motionUpdated = mm.updateMotion(model, dt);
    }

    // 3. Effects (blink, breath, pose part visibility)
    this.updateScheduler?.onLateUpdate(model, dt);
    if (this.pose) {
      this.pose.updateParameters(model, dt);
    }

    // 4. Minimal procedural idle for models without authored motions.
    if (!this.hasAuthoredMotions) {
      this.applyFallbackIdle(model, dt);
    }

    // 5. Eye fallback for models without authored blink.
    if (!this.hasEyeBlink) {
      this.applyFallbackEyes(model, dt);
    }

    // 6. Pointer-driven gaze/head/body tracking.
    this.applyPointerLook(model, dt);

    // 7. Speaking gesture layer.
    this.applySpeakingGesture(model, dt);

    // 8. Persistent expression toggles for outfits/accessories from VTS-style models.
    this.applyActiveExpressions(model);

    // 9. Lip-sync override — WRITTEN AFTER motions/effects to prevent idle animation overwrite
    //    This ensures TTS-driven mouth parameters always win over animation-driven values
    this.setParameterByAliases(model, PARAM_IDS.mouthOpenY, this.mouthOpenValue);
    this.setParameterByAliases(model, PARAM_IDS.mouthForm, this.mouthFormValue);

    // 10. Finalize. Do not save dynamic parameters here; that would make head tilt drift into the next frame baseline.
    model.update();
  }

  private applyFallbackEyes(model: any, dt: number) {
    this.blinkTime += dt;
    let eyeOpen = 1;
    if (this.blinkTime >= this.nextBlinkTime) {
      const phase = Math.min(1, (this.blinkTime - this.nextBlinkTime) / 0.16);
      eyeOpen = phase < 0.5 ? 1 - phase * 2 : (phase - 0.5) * 2;
      if (phase >= 1) {
        this.blinkTime = 0;
        this.nextBlinkTime = 2.2 + Math.random() * 3.2;
        this.cb.onBlink();
      }
    }

    this.setParameterByAliases(model, PARAM_IDS.eyeLOpen, eyeOpen, 0.9);
    this.setParameterByAliases(model, PARAM_IDS.eyeROpen, eyeOpen, 0.9);

    this.idleGazeTime -= dt;
    if (this.idleGazeTime <= 0) {
      this.idleGazeTargetX = (Math.random() - 0.5) * 0.22;
      this.idleGazeTargetY = (Math.random() - 0.5) * 0.12;
      this.idleGazeTime = 1.2 + Math.random() * 2.4;
    }
    const follow = 1 - Math.exp(-dt * 3);
    this.idleGazeX += (this.idleGazeTargetX - this.idleGazeX) * follow;
    this.idleGazeY += (this.idleGazeTargetY - this.idleGazeY) * follow;
    this.addParameterByAliases(model, PARAM_IDS.eyeBallX, this.idleGazeX, 0.45);
    this.addParameterByAliases(model, PARAM_IDS.eyeBallY, this.idleGazeY, 0.45);
  }

  private applySpeakingGesture(model: any, dt: number) {
    if (!this.isSpeaking) {
      this.speakingTime = 0;
      return;
    }

    this.speakingTime += dt;
    const t = this.speakingTime;
    const energy = Math.min(1, 0.25 + this.mouthOpenValue * 0.75);
    this.addParameterByAliases(model, PARAM_IDS.angleY, Math.sin(t * 5.2) * 1.6 * energy, 0.35);
    this.addParameterByAliases(model, PARAM_IDS.angleZ, Math.sin(t * 3.4 + 0.6) * 1.0 * energy, 0.25);
    this.addParameterByAliases(model, PARAM_IDS.bodyAngleX, Math.sin(t * 2.8 + 1.1) * 1.8 * energy, 0.35);
    this.addParameterByAliases(model, ["Param15"], Math.sin(t * 4.4) * 0.08 * energy, 0.7);
  }

  private applyPointerLook(model: any, dt: number) {
    const follow = 1 - Math.exp(-dt * 7);
    this.pointerX += (this.pointerTargetX - this.pointerX) * follow;
    this.pointerY += (this.pointerTargetY - this.pointerY) * follow;

    this.addParameterByAliases(model, PARAM_IDS.eyeBallX, this.pointerX * 0.55, 0.9);
    this.addParameterByAliases(model, PARAM_IDS.eyeBallY, -this.pointerY * 0.32, 0.9);
    this.addParameterByAliases(model, PARAM_IDS.angleX, this.pointerX * 14, 0.78);
    this.addParameterByAliases(model, PARAM_IDS.angleY, -this.pointerY * 9.5, 0.68);
    this.addParameterByAliases(model, PARAM_IDS.angleZ, -this.pointerX * 4.8, 0.38);
    this.addParameterByAliases(model, PARAM_IDS.bodyAngleX, this.pointerX * 4.2, 0.48);
    this.addParameterByAliases(model, PARAM_IDS.bodyAngleY, -this.pointerY * 2.4, 0.38);
  }

  private applyActiveExpressions(model: any) {
    const idMgr = CubismFramework.getIdManager();
    for (const name of this.activeExpressions) {
      const params = this.expressionParams.get(name) ?? [];
      for (const p of params) {
        try {
          const id = idMgr.getId(p.id);
          if (p.blend === "Multiply") model.multiplyParameterValueById(id, p.value, 1);
          else if (p.blend === "Overwrite") model.setParameterValueById(id, p.value, 1);
          else model.addParameterValueById(id, p.value, 1);
        } catch { /* parameter absent */ }
      }
    }
  }

  private applyFallbackIdle(model: any, dt: number) {
    this.fallbackIdleTime += dt;
    const t = this.fallbackIdleTime;
    this.addParameterByAliases(model, PARAM_IDS.angleX, Math.sin(t * 0.75) * 4.0, 0.45);
    this.addParameterByAliases(model, PARAM_IDS.angleY, Math.sin(t * 0.52 + 1.3) * 2.0, 0.35);
    this.addParameterByAliases(model, PARAM_IDS.angleZ, Math.sin(t * 0.38 + 0.7) * 1.0, 0.25);
    this.addParameterByAliases(model, PARAM_IDS.bodyAngleX, Math.sin(t * 0.55 + 2.1) * 2.0, 0.35);
    this.addParameterByAliases(model, PARAM_IDS.eyeBallX, Math.sin(t * 0.32) * 0.35, 0.6);
    this.addParameterByAliases(model, PARAM_IDS.eyeBallY, Math.sin(t * 0.41 + 1.7) * 0.18, 0.6);
    this.addParameterByAliases(model, ["Param4"], 0.08 + Math.sin(t * 0.42 + 0.4) * 0.04, 0.7);
    this.addParameterByAliases(model, ["Param9"], 0.10 + Math.sin(t * 0.36 + 1.2) * 0.05, 0.7);
    this.addParameterByAliases(model, ["Param15"], Math.sin(t * 0.82) * 0.10, 0.8);
  }

    private render() {
      const gl = this.gl;
      if (!gl || !this.renderer || !this.model || !this.isModelLoaded || gl.isContextLost()) return;
      if (this.cw <= 0 || this.ch <= 0) return;

      // Let the SDK's doDrawModel handle framebuffer binding and clearing internally.
      // The SDK will either draw to an offscreen render target (if blend mode enabled)
      // and then copy to the default FBO, or draw directly to the default FBO.
      // We just need to set the render state and let the SDK do its work.
      const proj = new CubismMatrix44();
      const modelWidth = this.model.getModel().getCanvasWidth();
      const modelHeight = this.model.getModel().getCanvasHeight();

      if (modelWidth > 0 && modelHeight > 0) {
        // Map model canvas coordinates to clip space [-1, 1]
        // SDK standard: scale = 2 / canvasSize
        const sx = 2.0 / modelWidth;
        const sy = 2.0 / modelHeight;
        const s = Math.min(sx, sy);
        proj.scale(s * 0.6 * this.displayScale, s * 0.6 * this.displayScale);
        proj.translateRelative(this.displayOffsetX, this.displayOffsetY);
      }
      proj.multiplyByMatrix(this.model.getModelMatrix());

      this.renderer.setMvpMatrix(proj);
      this.renderer.setRenderState(this.defaultFbo!, [0, 0, this.cw, this.ch]);
      this.renderer.drawModel();
    }

  private startRandomMotion(group: string, priority: number): CubismMotionQueueEntryHandle {
    if (!this.model || !this.modelData) return InvalidMotionQueueEntryHandleValue;
    const mm = (this.model as any)._motionManager;
    if (!mm) return InvalidMotionQueueEntryHandleValue;
    const g = this.modelData.motionDefs.filter(d => d.group === group);
    if (!g.length) return InvalidMotionQueueEntryHandleValue;
    // Pick a random motion from the group
    const picked = g[Math.floor(Math.random() * g.length)];
    const motion = this.motions.get(`${picked.group}_${picked.index}`);
    if (!motion || !mm.reserveMotion(priority)) return InvalidMotionQueueEntryHandleValue;
    return mm.startMotionPriority(motion, false, priority);
  }
}
