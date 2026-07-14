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

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Live2DViewerCallbacks {
  onLoadStart: () => void;
  onLoadProgress: (loaded: number, total: number) => void;
  onLoadComplete: (info: { fileName: string; expressions: string[] }) => void;
  onLoadError: (error: Error) => void;
  onBlink: () => void;
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
  textureFiles: string[];
  expressionDefs: { name: string; fileName: string }[];
  motionDefs: { group: string; index: number; fileName: string }[];
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
  async loadModel(jsonPath: string, fileName: string): Promise<void> {
    if ((this as any)._loading) return;
    (this as any)._loading = true;
    this.unloadModel();
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
      (this as any)._modelName = fileName;

      await this.loadTextures(gl, data, renderer);
      this.expressionNames = await this.loadExpressions(model, data);
      this.setupEffects(model, data.setting);
      await this.preloadMotions(model, data);

      const layout = new Map<string, number>();
      data.setting.getLayoutMap(layout);
      model.getModelMatrix().setupFromLayout(layout);
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

  private cbust(url: string): string {
    return url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
  }

  private async fetchModelData(path: string): Promise<ModelData> {
    const i = path.lastIndexOf("/"), home = path.substring(0, i + 1);
    const r = await fetch(this.cbust(path));
    if (!r.ok) throw new Error(`配置读取失败: ${r.status}`);
    const buf = await r.arrayBuffer();
    const s = new CubismModelSettingJson(buf, buf.byteLength);

    const mf = s.getModelFileName();
    if (!mf) throw new Error("未找到.moc3");
    const mr = await fetch(this.cbust(home + mf));
    if (!mr.ok) throw new Error(`.moc3 读取失败: ${mr.status}`);
    const moc = await mr.arrayBuffer();

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
    return { setting: s, homeDir: home, mocBuffer: moc, textureFiles: tex, expressionDefs: exp, motionDefs: mot };
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
        const m = model.loadExpression(buf, buf.byteLength, d.name);
        if (m) { this.expressionMotions.set(d.name, m); names.push(d.name); }
      } catch (e) { console.warn(`[Live2D] exp "${d.name}":`, e); }
    }));
    return names;
  }

  private setupEffects(model: CubismUserModel, s: ICubismModelSetting): void {
    this.updateScheduler = new CubismUpdateScheduler();
    if (s.getEyeBlinkParameterCount() > 0) {
      this.eyeBlink = CubismEyeBlink.create(s);
      this.updateScheduler.addUpdatableList(
        new CubismEyeBlinkUpdater(() => (model as any)._motionUpdated ?? false, this.eyeBlink!)
      );
    }
    this.breath = CubismBreath.create();
    const im = CubismFramework.getIdManager();
    this.breath.setParameters([
      new BreathParameterData(im.getId(CubismDefaultParameterId.ParamAngleX), 0, 15, 6.5345, 0.5),
      new BreathParameterData(im.getId(CubismDefaultParameterId.ParamAngleY), 0, 8, 3.5345, 0.5),
      new BreathParameterData(im.getId(CubismDefaultParameterId.ParamAngleZ), 0, 10, 5.5345, 0.5),
      new BreathParameterData(im.getId(CubismDefaultParameterId.ParamBodyAngleX), 0, 4, 15.5345, 0.5),
      new BreathParameterData(im.getId(CubismDefaultParameterId.ParamBreath), 0.5, 0.5, 3.2345, 1),
    ]);
    this.updateScheduler.addUpdatableList(new CubismBreathUpdater(this.breath));
    this.lipSyncIds = [];
    for (let i = 0; i < s.getLipSyncParameterCount(); i++) this.lipSyncIds.push(s.getLipSyncParameterId(i));
    this.updateScheduler.sortUpdatableList();
  }

  private async preloadMotions(model: CubismUserModel, data: ModelData): Promise<void> {
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

  setExpression(name: string, value: number) {
    if (!this.model) return;
    const m = this.expressionMotions.get(name);
    if (m && value > 0) (this.model as any)._expressionManager?.startMotion(m, false);
    try {
      const id = CubismFramework.getIdManager().getId(name);
      (this.model as any)._model.setParameterValueById(id, value);
    } catch { /* */ }
  }

  setSpeaking(_speaking: boolean) { /* stub */ }
  getAvailableExpressions() { return this.expressionNames; }
  getAvailableMotionGroups() {
    if (!this.modelData) return [];
    return Array.from(new Set(this.modelData.motionDefs.map(d => d.group)));
  }
  playMotionGroup(group: string) {
    return this.startRandomMotion(group, 2) !== InvalidMotionQueueEntryHandleValue;
  }
  onResize() { this.resize(); }

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
    this.expressionNames = []; this.lipSyncIds = [];
    if (this.eyeBlink) { CubismEyeBlink.delete(this.eyeBlink); this.eyeBlink = null; }
    if (this.pose) { CubismPose.delete(this.pose); this.pose = null; }
    if (this.breath) { CubismBreath.delete(this.breath); this.breath = null; }
    if (this.updateScheduler) { this.updateScheduler.release(); this.updateScheduler = null; }
    if (this.model) { this.model.release(); this.model = null; }
    this.renderer = null; this.modelData = null; this.mouthOpenValue = 0; this.mouthFormValue = 0.5;
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

    // 4. Lip-sync override — WRITTEN AFTER motions/effects to prevent idle animation overwrite
    //    This ensures TTS-driven mouth parameters always win over animation-driven values
    const idMgr = CubismFramework.getIdManager();
    model.setParameterValueById(
      idMgr.getId(CubismDefaultParameterId.ParamMouthOpenY), this.mouthOpenValue);
    model.setParameterValueById(
      idMgr.getId(CubismDefaultParameterId.ParamMouthForm), this.mouthFormValue);

    // 5. Save state + finalize
    model.saveParameters();
    model.update();
  }

    private render() {
      const gl = this.gl;
      if (!gl || !this.renderer || !this.model || !this.isModelLoaded || gl.isContextLost()) return;
      if (this.cw <= 0 || this.ch <= 0) return;

      const proj = new CubismMatrix44();
      const mw = this.model.getModel().getCanvasWidth();
      const mh = this.model.getModel().getCanvasHeight();

      if (mw > 0 && mh > 0) {
        const targetPortion = 0.75;
        let sx = (2.0 * targetPortion) / mw;
        let sy = (2.0 * targetPortion) / mh;

        const modelName = (this as any)._modelName as string | undefined;

        if (modelName === 'Z' || modelName === '871') {
          const hiw = 2.0,
                hih = 2.85;
          const hix = (2.0 * targetPortion) / hiw;
          const hiy = (2.0 * targetPortion) / hih;
          sx = hix;
          sy = hiy;
        }

        const scale = Math.min(sx, sy);
        proj.scale(scale, scale);
      }
      proj.multiplyByMatrix(this.model.getModelMatrix());

      const modelName = (this as any)._modelName as string | undefined;
      if (modelName === 'Z' || modelName === '871') {
        proj.translate(0, -0.05);
      } else {
        proj.translate(0, -0.05);
      }

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
