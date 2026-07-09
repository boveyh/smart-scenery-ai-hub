import * as THREE from "three";
import { VRM, VRMUtils, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface VrmViewerCallbacks {
  onLoadStart: () => void;
  onLoadProgress: (loaded: number, total: number) => void;
  onLoadComplete: (info: { fileName: string; expressions: string[] }) => void;
  onLoadError: (error: Error) => void;
  onBlink: () => void;
}

const BLINK_INTERVAL_MS = 4000;
const BLINK_DURATION_MS = 150;

const TWO_PI = 2 * Math.PI;

// ─── Bone-driven idle motion controller ───────────────────

class IdleMotionController {
  private vrm: VRM;
  private time = 0;
  private isSpeaking = false;

  // Base A-pose: rotate arms down from T-pose (VRM normalized bones start in T-pose)
  private readonly BASE_ARM_X = -0.6;
  private readonly BASE_FOREARM_X = -0.12;

  // Speaking gesture: right forearm gentle lift + lower
  private readonly GESTURE_AMP = 0.14;
  private readonly GESTURE_PERIOD = 2.5;

  // Head nod
  private nodDuration = 0;
  private nodAmp = 0;
  private nextNodIn = 3.0 + Math.random() * 4.0;
  private readonly NOD_AMP = 0.04;
  private readonly NOD_DURATION = 0.8;

  // Spine sway
  private readonly SPINE_AMP = 0.018;
  private readonly SPINE_PERIOD = 5.5;

  constructor(vrm: VRM) {
    this.vrm = vrm;
  }

  update(delta: number, speaking: boolean) {
    this.time += delta;
    this.isSpeaking = speaking;

    this.applyBasePose();
    if (this.isSpeaking) this.applyGesture();
    this.applySpine();
    this.applyHeadNod(delta);
  }

  private bone(name: string): THREE.Object3D | null {
    return this.vrm.humanoid?.getNormalizedBoneNode(name as any) ?? null;
  }

  private applyBasePose() {
    const lu = this.bone("leftUpperArm");
    if (lu) lu.rotation.x = this.BASE_ARM_X;
    const ru = this.bone("rightUpperArm");
    if (ru) ru.rotation.x = this.BASE_ARM_X;
    const ll = this.bone("leftLowerArm");
    if (ll) ll.rotation.x = this.BASE_FOREARM_X;
    const rl = this.bone("rightLowerArm");
    if (rl) rl.rotation.x = this.BASE_FOREARM_X;
  }

  private applyGesture() {
    const phase = this.time * (TWO_PI / this.GESTURE_PERIOD);
    const env = 0.5 + 0.5 * Math.sin(phase);

    const rf = this.bone("rightLowerArm");
    if (rf) rf.rotation.x = this.BASE_FOREARM_X + this.GESTURE_AMP * env;

    const ru = this.bone("rightUpperArm");
    if (ru) ru.rotation.x = this.BASE_ARM_X + this.GESTURE_AMP * env * 0.3;
  }

  private applySpine() {
    const sMul = this.isSpeaking ? 0.3 : 1.0;
    const s = this.bone("spine");
    if (s) {
      s.rotation.z = Math.sin(this.time * (TWO_PI / this.SPINE_PERIOD)) * this.SPINE_AMP * sMul;
    }
  }

  private applyHeadNod(delta: number) {
    const head = this.bone("head");
    if (!head) return;

    this.nextNodIn -= delta;

    if (this.nodDuration > 0) {
      this.nodDuration -= delta;
      const progress = 1 - this.nodDuration / this.NOD_DURATION;
      const curve = Math.sin(progress * Math.PI);
      head.rotation.x = this.nodAmp * curve;
      return;
    }

    if (this.nextNodIn <= 0) {
      this.nodDuration = this.NOD_DURATION;
      this.nodAmp = this.NOD_AMP * (0.5 + Math.random() * 0.5);
      this.nextNodIn = 3.0 + Math.random() * 5.0;
      if (this.isSpeaking) this.nextNodIn *= 0.6;
    }
  }
}

// ─── Main VrmViewer class ─────────────────────────────────

export class VrmViewer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private currentVrm: VRM | null = null;
  private vrmGroup: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private idleClip: THREE.AnimationClip | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  private blinkTimer: ReturnType<typeof setInterval> | null = null;
  private blinkTimeout: ReturnType<typeof setTimeout> | null = null;
  private animationFrameId: number | null = null;
  private mouthOpenValue = 0;
  private callbacks: VrmViewerCallbacks;
  private isDestroyed = false;
  private isSpeaking = false;
  private idleTime = 0;
  private motionController: IdleMotionController | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: VrmViewerCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 3);
    this.camera.lookAt(0, 0.9, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(0, 2, 2);
    this.scene.add(directionalLight);

    this.clock = new THREE.Clock();
    this.resize();
    this.startLoop();
    this.startBlink();
  }

  private resize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
  };

  onResize() { this.resize(); }

  private startLoop() {
    const animate = () => {
      if (this.isDestroyed) return;
      this.animationFrameId = requestAnimationFrame(animate);
      this.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private update() {
    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta);
    this.idleTime += delta;

    if (this.vrmGroup) {
      this.vrmGroup.position.y =
        Math.sin(this.idleTime * (TWO_PI / 4.0)) * 0.005;
    }

    if (this.currentVrm) {
      // MUST set normalized bones BEFORE vrm.update() so
      // autoUpdateHumanBones (default true) copies them to raw bones
      this.motionController?.update(delta, this.isSpeaking);
      this.currentVrm.update(delta);

      if (this.hasExpression("aa")) {
        this.currentVrm.expressionManager?.setValue("aa", this.mouthOpenValue);
      }
    }
  }

  private startBlink() {
    this.blinkTimer = setInterval(() => {
      if (!this.currentVrm || this.isDestroyed) return;
      try {
        if (this.hasExpression("blink")) {
          this.currentVrm.expressionManager?.setValue("blink", 1);
          this.callbacks.onBlink();
          if (this.blinkTimeout) clearTimeout(this.blinkTimeout);
          this.blinkTimeout = setTimeout(() => {
            if (this.currentVrm && !this.isDestroyed) {
              this.currentVrm.expressionManager?.setValue("blink", 0);
            }
          }, BLINK_DURATION_MS);
        }
      } catch { /* ignore */ }
    }, BLINK_INTERVAL_MS);
  }

  private stopBlink() {
    if (this.blinkTimer) { clearInterval(this.blinkTimer); this.blinkTimer = null; }
    if (this.blinkTimeout) { clearTimeout(this.blinkTimeout); this.blinkTimeout = null; }
  }

  setMouthOpen(value: number) {
    this.mouthOpenValue = Math.max(0, Math.min(1, value));
  }

  setSpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
  }

  setExpression(name: string, value: number) {
    if (!this.currentVrm) return;
    try {
      if (this.hasExpression(name)) {
        this.currentVrm.expressionManager?.setValue(name, value);
      }
    } catch { /* ignore */ }
  }

  resetAllExpressions() {
    if (!this.currentVrm) return;
    for (const name of this.getAvailableExpressions()) {
      try {
        if (name !== "blink" && name !== "aa") {
          this.currentVrm.expressionManager?.setValue(name, 0);
        }
      } catch { /* ignore */ }
    }
  }

  getAvailableExpressions(): string[] {
    if (!this.currentVrm) return [];
    return Object.keys(this.currentVrm.expressionManager?.expressionMap || {});
  }

  private hasExpression(name: string): boolean {
    if (!this.currentVrm) return false;
    try {
      return this.currentVrm.expressionManager?.getExpression(name) != null;
    } catch {
      return false;
    }
  }

  async loadVrm(url: string, fileName: string): Promise<void> {
    this.unloadVrm();
    this.callbacks.onLoadStart();

    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await new Promise<GLTF>((resolve, reject) => {
        loader.load(
          url,
          (gltf) => resolve(gltf),
          (progress) => {
            if (progress.lengthComputable) {
              this.callbacks.onLoadProgress(progress.loaded, progress.total);
            }
          },
          (error) => {
            reject(new Error(`模型加载失败: ${(error as Error).message || error}`));
          }
        );
      });

      const vrm: VRM = gltf.userData.vrm;
      if (!vrm) throw new Error("文件中未找到 VRM 数据，请确认是有效的 VRM 文件");

      VRMUtils.rotateVRM0(vrm);
      this.currentVrm = vrm;

      this.vrmGroup = new THREE.Group();
      this.vrmGroup.add(vrm.scene);
      this.scene.add(this.vrmGroup);

      this.mixer = new THREE.AnimationMixer(vrm.scene);
      this.motionController = new IdleMotionController(vrm);

      const expressions = this.getAvailableExpressions();
      this.callbacks.onLoadComplete({ fileName, expressions });
    } catch (error) {
      this.callbacks.onLoadError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  unloadVrm() {
    if (this.currentVrm) {
      if (this.vrmGroup) {
        this.vrmGroup.remove(this.currentVrm.scene);
        this.scene.remove(this.vrmGroup);
        this.vrmGroup = null;
      }
      this.currentVrm = null;
    }
    this.mixer = null;
    this.motionController = null;
    this.stopIdleAnimation();
    this.mouthOpenValue = 0;
    this.idleTime = 0;
    this.setSpeaking(false);
  }

  private stopIdleAnimation() {
    if (this.idleAction) {
      this.idleAction.stop();
      this.idleAction = null;
    }
    this.idleClip = null;
  }

  destroy() {
    this.isDestroyed = true;
    this.stopBlink();
    this.unloadVrm();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.dispose();
    this.scene.clear();
  }
}