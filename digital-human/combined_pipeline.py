"""
🎭 Wav2Lip + SadTalker 组合流水线
=================================
分工明确：
  - Wav2Lip  ⮕ 口型同步（下1/3面部 + 嘴唇精度）
  - SadTalker ⮕ 面部动态表情（上2/3面部 + 眨眼 + 头部姿态）

原理：
  1. SadTalker 先生成完整的面部动态帧序列（含头部运动、眨眼、表情）
  2. Wav2Lip 根据音频生成精确的唇形同步帧
  3. 唇形融合：将 Wav2Lip 生成的嘴部区域替换到 SadTalker 帧上
  4. 最终输出 = SadTalker 面部动态 + Wav2Lip 精准口型

融合策略（唇形区域复用）：
  ┌──────────────────────────┐
  │  SadTalker 帧             │
  │  ┌─────────────────────┐ │
  │  │ 眉毛/眼睛 (SadTalker) │ │
  │  ├─────────────────────┤ │
  │  │ 鼻子                  │ │
  │  ├─────────────────────┤ │
  │  │ 嘴巴 (Wav2Lip 替换)   │ │  ← 关键区域
  │  └─────────────────────┘ │
  │  下巴 (羽化过渡)          │
  └──────────────────────────┘

启动方式：
  .venv\Scripts\python.exe combined_pipeline.py --face "photo.jpg" --audio "speech.wav" --output "output.mp4"

交互式模式（接入 AI 引擎）：
  .venv\Scripts\python.exe combined_pipeline.py --face "photo.jpg" --interactive --tenant west_lake
"""

import argparse
import asyncio
import os
import sys
import time
import warnings
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np

# ─── 路径设置 ──────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
AI_ENGINE_DIR = os.path.join(PROJECT_ROOT, "ai-engine-python")
WAV2LIP_SRC = os.path.join(SCRIPT_DIR, "wav2lip-src")

sys.path.insert(0, AI_ENGINE_DIR)
sys.path.insert(0, WAV2LIP_SRC)


class CombinedPipeline:
    """
    Wav2Lip + SadTalker 组合引擎

    核心流程：
      输入: face.jpg + audio.wav
        │
        ├──→ SadTalker: 生成完整面部动态帧 [F1, F2, ..., Fn]
        │      (含头部姿态、眨眼、眉毛、表情)
        │
        ├──→ Wav2Lip:  生成唇形同步帧 [L1, L2, ..., Ln]
        │      (精确口型，仅关心嘴部区域)
        │
        └──→ 唇形融合: 每帧 F_i 的嘴部区域 ← L_i 的嘴部区域
                │
                ▼
           输出视频 output.mp4
    """

    # 嘴部区域参数（相对于 256x256 人脸）
    # 从上往下的裁剪区域
    MOUTH_TOP_RATIO = 0.55      # 嘴部上边界 (55% 从上往下)
    MOUTH_BOTTOM_RATIO = 0.95   # 嘴部下边界 (95%)
    MOUTH_LEFT_RATIO = 0.15     # 嘴部左边界
    MOUTH_RIGHT_RATIO = 0.85    # 嘴部右边界
    BLEND_FEATHER = 15          # 羽化像素数（过渡平滑）

    def __init__(
        self,
        face_path: str,
        device: Optional[str] = None,
        sadtalker_size: int = 256,
        wav2lip_size: int = 96,
        output_size: int = 256,
        fps: int = 25,
        sadtalker_still: bool = False,
        expression_scale: float = 1.0,
        blend_method: str = "poisson",  # "poisson" / "feather" / "direct"
    ):
        """
        Args:
            face_path: 人脸照片路径
            device: 推理设备
            sadtalker_size: SadTalker 输出分辨率 (256/512)
            wav2lip_size: Wav2Lip 输出分辨率 (96 固定)
            output_size: 最终输出分辨率
            fps: 帧率
            sadtalker_still: 减少头部运动
            expression_scale: 表情强度
            blend_method: 融合方法
              - "poisson": Poisson 融合（最自然，但慢）
              - "feather": 羽化融合（推荐，平衡速度与效果）
              - "direct":  直接替换（最快，可能有边界）
        """
        self.face_path = face_path
        self.sadtalker_size = sadtalker_size
        self.wav2lip_size = wav2lip_size
        self.output_size = output_size
        self.fps = fps
        self.sadtalker_still = sadtalker_still
        self.expression_scale = expression_scale
        self.blend_method = blend_method

        if device is None:
            import torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        # 组件延迟初始化
        self.sadtalker = None
        self.wav2lip_model = None
        self.wav2lip_detector = None
        self.face_img = None
        self._initialized = False

        # 临时目录
        self.temp_dir = os.path.join(SCRIPT_DIR, "temp_combined")
        os.makedirs(self.temp_dir, exist_ok=True)

    # ─── 初始化 ─────────────────────────────────────────────────

    def initialize(self):
        """初始化两个模型引擎"""
        if self._initialized:
            return

        print("=" * 60)
        print("  🎭 Wav2Lip + SadTalker 组合引擎初始化")
        print("=" * 60)
        print(f"   🖥️  推理设备: {self.device}")
        print(f"   📷 人脸照片: {self.face_path}")
        print()

        # 读取人脸照片
        self.face_img = cv2.imread(self.face_path)
        if self.face_img is None:
            raise FileNotFoundError(f"无法读取照片: {self.face_path}")

        # ── 初始化 SadTalker ──
        print("━" * 60)
        print("  [1/2] 初始化 SadTalker（面部动态表情）...")
        print("━" * 60)
        try:
            from sadtalker_engine import SadTalkerEngine

            self.sadtalker = SadTalkerEngine(
                device=self.device,
                size=self.sadtalker_size,
                still=self.sadtalker_still,
                expression_scale=self.expression_scale,
            )
            self.sadtalker.load_models()
            print("   ✅ SadTalker 就绪")
        except Exception as e:
            print(f"   ⚠️  SadTalker 初始化失败: {e}")
            print("   将以 Wav2Lip-Only 模式运行（仅有唇形同步，无面部动态）")
            self.sadtalker = None

        # ── 初始化 Wav2Lip ──
        print("━" * 60)
        print("  [2/2] 初始化 Wav2Lip（口型同步）...")
        print("━" * 60)
        self._init_wav2lip()

        self._initialized = True
        print("=" * 60)
        print("  ✅ 组合引擎初始化完成")
        print("=" * 60)
        print()

    def _init_wav2lip(self):
        """初始化 Wav2Lip 模型和人脸检测器"""
        import torch

        try:
            ckpt = os.path.join(WAV2LIP_SRC, "checkpoints", "wav2lip_gan.pth")
            if not os.path.exists(ckpt):
                raise FileNotFoundError(f"Wav2Lip 模型不存在: {ckpt}")

            from models import Wav2Lip as Wav2LipModel

            self.wav2lip_model = Wav2LipModel()
            if self.device == "cuda":
                checkpoint = torch.load(ckpt)
            else:
                checkpoint = torch.load(
                    ckpt, map_location=lambda storage, loc: storage
                )
            state = checkpoint["state_dict"]
            new_state = {k.replace("module.", ""): v for k, v in state.items()}
            self.wav2lip_model.load_state_dict(new_state)
            self.wav2lip_model = self.wav2lip_model.to(self.device)
            self.wav2lip_model = self.wav2lip_model.eval()

            # 人脸检测器
            from face_detection.detection.sfd import FaceDetector
            self.wav2lip_detector = FaceDetector(device=self.device)

            # 预检测人脸
            faces = self.wav2lip_detector.detect_from_image(self.face_img)
            if len(faces) == 0:
                raise RuntimeError("未检测到人脸")
            print(f"   ✅ Wav2Lip 就绪，检测到人脸: {faces[0].shape}")

        except Exception as e:
            print(f"   ⚠️  Wav2Lip 初始化失败: {e}")
            raise

    # ─── 核心推理 ───────────────────────────────────────────────

    def generate(
        self,
        audio_path: str,
        output_path: Optional[str] = None,
        show_preview: bool = False,
    ) -> List[np.ndarray]:
        """
        全流程生成：照片 + 音频 → 组合视频

        Args:
            audio_path: 驱动音频路径 (.wav, 16kHz)
            output_path: 输出视频路径（可选）
            show_preview: 是否实时预览

        Returns:
            帧列表 (numpy arrays, BGR)
        """
        self.initialize()

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"音频不存在: {audio_path}")

        print(f"🎬 开始生成组合视频...")
        print(f"   🎵 音频: {audio_path}")
        t_start = time.time()

        # ─── Phase 1: SadTalker 生成面部动态帧 ──────────────
        sadtalker_frames = self._generate_sadtalker_frames(audio_path)

        # ─── Phase 2: Wav2Lip 生成唇形同步帧 ─────────────────
        wav2lip_frames = self._generate_wav2lip_frames(audio_path, len(sadtalker_frames))

        # ─── Phase 3: 唇形融合 ───────────────────────────────
        combined_frames = self._blend_lip_region(sadtalker_frames, wav2lip_frames)

        elapsed = time.time() - t_start
        print(f"\n✅ 组合视频生成完成")
        print(f"   ⏱️  总耗时: {elapsed:.1f}s")
        print(f"   🎞️  总帧数: {len(combined_frames)}")

        # ─── Phase 4: 保存输出 ──────────────────────────────
        if output_path:
            self._save_combined_video(combined_frames, audio_path, output_path)

        # ─── Phase 5: 预览 ──────────────────────────────────
        if show_preview:
            self._preview_frames(combined_frames)

        return combined_frames

    def _generate_sadtalker_frames(self, audio_path: str) -> List[np.ndarray]:
        """
        SadTalker 推理：生成含面部动态的帧序列

        如果 SadTalker 不可用，则用静态照片生成占位帧。
        """
        if self.sadtalker is None:
            print("\n   ⚠️  SadTalker 不可用，使用静态照片占位...")
            return self._generate_wav2lip_frames(audio_path, 0, as_sadtalker=True)

        print(f"\n   [SadTalker] 生成面部动态帧...")
        t0 = time.time()

        try:
            frames = self.sadtalker.generate(
                face_path=self.face_path,
                audio_path=audio_path,
            )
            elapsed = time.time() - t0
            print(f"   [SadTalker] ✅ {len(frames)} 帧 ({elapsed:.1f}s)")
            return frames

        except Exception as e:
            print(f"   [SadTalker] ❌ 推理失败: {e}")
            print(f"   [SadTalker] 降级：使用静态照片序列")
            return self._generate_wav2lip_frames(audio_path, 0, as_sadtalker=True)

    def _generate_wav2lip_frames(
        self,
        audio_path: str,
        target_count: int = 0,
        as_sadtalker: bool = False,
    ) -> List[np.ndarray]:
        """
        Wav2Lip 推理：生成精确唇形同步帧

        Args:
            audio_path: 音频路径
            target_count: 目标帧数（用于与 SadTalker 对齐）
            as_sadtalker: 如果 SadTalker 不可用，这里也生成静态帧
        """
        import torch
        import librosa

        # 如果是静态模式（SadTalker fallback），返回重复照片
        if as_sadtalker:
            if target_count == 0:
                # 根据音频长度估算帧数
                wav, sr = librosa.load(audio_path, sr=16000)
                target_count = max(int(len(wav) / sr * self.fps), self.fps)
            # 返回静态照片重复
            return [self.face_img.copy() for _ in range(target_count)]

        print(f"\n   [Wav2Lip] 生成唇形同步帧...")
        t0 = time.time()

        try:
            # 加载音频
            wav, sr = librosa.load(audio_path, sr=16000)
            mel = librosa.feature.melspectrogram(
                y=wav, sr=16000, n_mels=80,
                hop_length=int(16000 * 0.01)
            )
            mel = np.log(mel + 1e-6)

            # 切分 mel 帧
            mel_chunks = []
            mel_idx_multiplier = 80.0 / self.fps
            mel_step_size = 16

            for i in range(0, mel.shape[1], int(mel_idx_multiplier)):
                start = i
                end = min(i + mel_step_size, mel.shape[1])
                if end - start < mel_step_size:
                    break
                mel_chunks.append(mel[:, start:end].T)

            num_frames = len(mel_chunks)
            if num_frames == 0:
                return []

            # 预计算人脸张量
            face_96 = cv2.resize(self.face_img, (96, 96))
            face_tensor_base = (
                torch.FloatTensor(face_96)
                .permute(2, 0, 1)
                .to(self.device)
                / 255.0
            )

            # 批量推理
            gen_frames = []
            batch_size = 64

            with torch.no_grad():
                for i in range(0, num_frames, batch_size):
                    end = min(i + batch_size, num_frames)
                    batch_len = end - i

                    face_batch = face_tensor_base.unsqueeze(0).repeat(batch_len, 1, 1, 1)
                    mel_batch = np.array(mel_chunks[i:end])
                    mel_tensor = torch.FloatTensor(mel_batch).to(self.device)

                    pred = self.wav2lip_model(mel_tensor, face_batch)
                    pred = pred.cpu().numpy().transpose(0, 2, 3, 1) * 255.0
                    pred = pred.astype(np.uint8)

                    gen_frames.extend([f for f in pred])

            elapsed = time.time() - t0
            print(f"   [Wav2Lip] ✅ {len(gen_frames)} 帧 ({elapsed:.1f}s)")
            return gen_frames

        except Exception as e:
            print(f"   [Wav2Lip] ❌ 推理失败: {e}")
            return []

    # ─── 唇形融合（核心算法） ─────────────────────────────────

    def _blend_lip_region(
        self,
        sadtalker_frames: List[np.ndarray],
        wav2lip_frames: List[np.ndarray],
    ) -> List[np.ndarray]:
        """
        将 Wav2Lip 的嘴部区域融合到 SadTalker 帧上

        融合策略：
          1. 对齐帧数（取较短的一方）
          2. 对每帧：
             a. 从 Wav2Lip 帧中提取嘴部区域
             b. 从 SadTalker 帧中提取相同区域
             c. 按 blend_method 进行融合
             d. 将融合结果写回 SadTalker 帧
          3. 返回融合后的帧列表

        唇形区域定义（mouth mask）：
          只在嘴部周围替换，不影响眼睛、眉毛等 SadTalker 生成的动态。
        """
        # 对齐帧数
        if not sadtalker_frames and not wav2lip_frames:
            return []

        if not sadtalker_frames:
            print("   ⚠️  SadTalker 无帧，直接使用 Wav2Lip 输出")
            # 放大 Wav2Lip 的 96x96 到输出尺寸
            return [
                cv2.resize(f, (self.output_size, self.output_size))
                for f in wav2lip_frames
            ]

        if not wav2lip_frames:
            print("   ⚠️  Wav2Lip 无帧，直接使用 SadTalker 输出")
            return sadtalker_frames

        # 取最小帧数
        num_frames = min(len(sadtalker_frames), len(wav2lip_frames))
        print(f"\n   [融合] 对齐帧数: {num_frames} (SadTalker={len(sadtalker_frames)}, Wav2Lip={len(wav2lip_frames)})")
        print(f"   [融合] 方法: {self.blend_method}")
        t0 = time.time()

        combined = []
        for i in range(num_frames):
            st_frame = sadtalker_frames[i]
            wl_frame = wav2lip_frames[i]

            # 统一到 output_size 分辨率
            st_resized = cv2.resize(st_frame, (self.output_size, self.output_size))
            wl_resized = cv2.resize(wl_frame, (self.output_size, self.output_size))

            # 计算嘴部区域边界
            h, w = st_resized.shape[:2]
            mouth_top = int(h * self.MOUTH_TOP_RATIO)
            mouth_bottom = int(h * self.MOUTH_BOTTOM_RATIO)
            mouth_left = int(w * self.MOUTH_LEFT_RATIO)
            mouth_right = int(w * self.MOUTH_RIGHT_RATIO)

            # 提取嘴部区域
            st_mouth = st_resized[mouth_top:mouth_bottom, mouth_left:mouth_right]
            wl_mouth = wl_resized[mouth_top:mouth_bottom, mouth_left:mouth_right]

            # 确保尺寸一致
            mh, mw = st_mouth.shape[:2]
            wl_mouth = cv2.resize(wl_mouth, (mw, mh))

            # 融合
            if self.blend_method == "poisson":
                blended_mouth = self._poisson_blend(st_mouth, wl_mouth)
            elif self.blend_method == "feather":
                blended_mouth = self._feather_blend(st_mouth, wl_mouth)
            else:
                blended_mouth = wl_mouth  # direct replace

            # 写回
            result = st_resized.copy()
            result[mouth_top:mouth_bottom, mouth_left:mouth_right] = blended_mouth

            combined.append(result)

        elapsed = time.time() - t0
        print(f"   [融合] ✅ 完成 ({elapsed:.1f}s, {num_frames} 帧)")
        return combined

    def _feather_blend(self, background: np.ndarray, foreground: np.ndarray) -> np.ndarray:
        """
        羽化融合：在嘴部边界使用 alpha 渐变，消除拼接痕迹

        mask 中心为 1.0（完全使用 Wav2Lip），边缘渐变到 0（完全使用 SadTalker）
        """
        h, w = background.shape[:2]
        feather = self.BLEND_FEATHER

        # 创建椭圆形羽化 mask
        mask = np.zeros((h, w), dtype=np.float32)
        center = (w // 2, h // 2)
        axes = (max(w // 2 - feather, 1), max(h // 2 - feather, 1))

        cv2.ellipse(mask, center, axes, 0, 0, 360, 1.0, -1)

        # 高斯模糊实现羽化
        mask = cv2.GaussianBlur(mask, (feather * 2 + 1, feather * 2 + 1), 0)
        mask = np.clip(mask, 0, 1)

        # 3 通道扩展
        mask_3ch = np.stack([mask] * 3, axis=-1)

        # Alpha 混合
        blended = (foreground * mask_3ch + background * (1 - mask_3ch)).astype(np.uint8)

        return blended

    def _poisson_blend(self, background: np.ndarray, foreground: np.ndarray) -> np.ndarray:
        """
        Poisson 融合：利用梯度信息进行无缝拼接

        注意：需要 OpenCV 3.0+ 且编译了 opencv_contrib
        """
        h, w = background.shape[:2]
        center = (w // 2, h // 2)

        # 创建椭圆形 mask
        mask = np.zeros((h, w), dtype=np.uint8)
        feather = self.BLEND_FEATHER
        axes = (max(w // 2 - feather, 1), max(h // 2 - feather, 1))
        cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)

        try:
            # cv2.seamlessClone 只在编译了 opencv_contrib 时可用
            blended = cv2.seamlessClone(
                foreground, background, mask, center, cv2.NORMAL_CLONE
            )
            return blended
        except AttributeError:
            # 降级到羽化融合
            return self._feather_blend(background, foreground)

    # ─── 视频保存 ───────────────────────────────────────────────

    def _save_combined_video(
        self,
        frames: List[np.ndarray],
        audio_path: str,
        output_path: str,
    ):
        """保存最终组合视频"""
        if not frames:
            print("   ⚠️  无帧可保存")
            return

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        h, w = frames[0].shape[:2]

        try:
            import imageio

            writer = imageio.get_writer(
                output_path,
                fps=self.fps,
                codec="libx264",
                format="FFMPEG",
                macro_block_size=1,
                ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p"],
            )

            for frame in frames:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                writer.append_data(frame_rgb)

            writer.close()
            print(f"   ✅ 视频已保存: {output_path}")

        except Exception as e:
            print(f"   ⚠️  imageio 失败 ({e})，降级到 OpenCV...")
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(output_path, fourcc, self.fps, (w, h))
            for frame in frames:
                writer.write(frame)
            writer.release()
            print(f"   ✅ 视频已保存: {output_path}")

    # ─── 预览 ───────────────────────────────────────────────────

    def _preview_frames(self, frames: List[np.ndarray]):
        """OpenCV 实时预览"""
        if not frames:
            return

        window_name = "🎭 Wav2Lip + SadTalker 组合效果"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, self.output_size, self.output_size)

        frame_delay = int(1000 / self.fps)

        for i, frame in enumerate(frames):
            # 进度条
            display = frame.copy()
            progress = int((i / max(len(frames) - 1, 1)) * display.shape[1])
            cv2.line(display, (0, display.shape[0] - 3), (progress, display.shape[0] - 3), (0, 255, 0), 3)

            cv2.imshow(window_name, display)

            key = cv2.waitKey(frame_delay) & 0xFF
            if key == ord('q') or key == 27:  # q 或 ESC
                break

        cv2.destroyWindow(window_name)

    # ─── 交互式模式（接入 AI 引擎） ─────────────────────────────

    async def interactive_loop(self, tenant_id: str = "west_lake"):
        """
        交互式 AI 数字人循环

        流程：
          用户输入问题 → LLM 流式生成 → 句级切片
            → 逐句 TTS → Wav2Lip+SadTalker 组合 → OpenCV 窗口播放
        """
        from dotenv import load_dotenv
        load_dotenv(os.path.join(AI_ENGINE_DIR, ".env"))

        from core.llm_client import LLMStreamClient
        from core.tts_generator import TTSGenerator
        from core.rag_processor import RAGProcessor

        self.initialize()

        # AI 引擎
        llm = LLMStreamClient(
            api_key=os.getenv("LLM_API_KEY", ""),
            base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
            model=os.getenv("LLM_MODEL", "deepseek-chat"),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "2048")),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
        )
        tts = TTSGenerator(output_dir=self.temp_dir)
        rag = RAGProcessor(
            backend_base_url=os.getenv("BACKEND_BASE_URL", "http://localhost:9000")
        )

        window_name = "🎭 Wav2Lip + SadTalker AI 数字人"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, self.output_size, self.output_size)

        print("\n" + "=" * 60)
        print("  🎭 Wav2Lip + SadTalker 组合 AI 数字人")
        print("=" * 60)
        print("  Wav2Lip  → 精确口型同步")
        print("  SadTalker → 面部动态表情（头部运动、眨眼）")
        print("=" * 60)
        print("  操作：输入问题 → AI 回答 → 数字人说话")
        print("  输入 quit 退出")
        print()

        # 显示待机照片
        idle_frame = cv2.resize(self.face_img, (self.output_size, self.output_size))
        cv2.putText(idle_frame, "请输入问题... (quit 退出)",
                    (10, self.output_size - 15), cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, (200, 200, 200), 1)
        cv2.imshow(window_name, idle_frame)
        cv2.waitKey(100)

        running = True
        while running:
            try:
                user_input = input("\n👤 你: ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input:
                continue
            if user_input.lower() in ("quit", "exit", "q"):
                break

            print(f"\n{'='*60}")
            print(f"👤 游客: {user_input}")
            print(f"{'='*60}")

            # Step 1: RAG
            system_prompt = await rag.build_system_prompt(
                tenant_id=tenant_id,
                user_query=user_input,
            )
            print(f"📚 System Prompt 已构建 ({len(system_prompt)} 字符)")

            # Step 2: LLM 流式生成 + 逐句处理
            seq = 0
            async for sentence in llm.stream_with_sentence_splitting(
                system_prompt=system_prompt,
                user_message=user_input,
            ):
                trimmed = sentence.strip()
                if not trimmed:
                    continue
                seq += 1

                print(f"\n💬 [句子 {seq}] {trimmed}")

                # Step 3: TTS
                print(f"   🔊 TTS 生成中...")
                wav_path = self._tts_text_to_wav(trimmed, seq)
                if not wav_path:
                    continue

                # Step 4: Wav2Lip + SadTalker 组合推理
                print(f"   🎭 组合推理中...")
                t0 = time.time()

                # 生成 SadTalker 帧
                st_frames = self._generate_sadtalker_frames(wav_path)
                # 生成 Wav2Lip 帧
                wl_frames = self._generate_wav2lip_frames(wav_path, len(st_frames))
                # 融合
                combined = self._blend_lip_region(st_frames, wl_frames)

                elapsed = time.time() - t0
                if combined:
                    print(f"   ✅ {len(combined)} 帧 ({elapsed:.1f}s)")
                    # Step 5: 预览播放
                    self._play_with_subtitle(window_name, combined, trimmed)
                else:
                    print(f"   ⚠️  生成失败，跳过")

                # 清理临时文件
                if os.path.exists(wav_path):
                    os.remove(wav_path)

            print(f"\n✅ 回答完成（共 {seq} 句）")

            # 回到待机
            cv2.imshow(window_name, idle_frame)
            cv2.waitKey(100)

        cv2.destroyAllWindows()
        print("👋 交互结束")

    def _tts_text_to_wav(self, text: str, seq: int) -> Optional[str]:
        """TTS 文本 → WAV"""
        import edge_tts
        import soundfile as sf

        async def _gen():
            mp3_path = os.path.join(self.temp_dir, f"combined_{seq:04d}.mp3")
            wav_path = os.path.join(self.temp_dir, f"combined_{seq:04d}.wav")

            communicate = edge_tts.Communicate(
                text=text,
                voice="zh-CN-XiaoxiaoNeural",
                rate="+10%",
            )
            await communicate.save(mp3_path)

            audio, sr = librosa.load(mp3_path, sr=16000, mono=True)
            sf.write(wav_path, audio, 16000)
            os.remove(mp3_path)
            return wav_path

        try:
            import librosa
            return asyncio.run(_gen())
        except Exception as e:
            print(f"   ⚠️  TTS 失败: {e}")
            return None

    def _play_with_subtitle(
        self,
        window_name: str,
        frames: List[np.ndarray],
        text: str,
    ):
        """带字幕播放帧序列"""
        if not frames:
            return

        frame_delay = int(1000 / self.fps)
        size = self.output_size

        for i, frame in enumerate(frames):
            display = frame.copy()

            # 字幕背景
            subtitle_h = 60
            cv2.rectangle(display, (0, size - subtitle_h), (size, size), (0, 0, 0), -1)

            # 文字换行
            lines = [text[j:j+15] for j in range(0, len(text), 15)]
            y0 = size - subtitle_h + 25
            for line in lines[:2]:
                cv2.putText(display, line, (10, y0),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                y0 += 25

            # 进度条
            progress = int((i / max(len(frames) - 1, 1)) * size)
            cv2.line(display, (0, size - 3), (progress, size - 3), (0, 255, 0), 3)

            cv2.imshow(window_name, display)

            key = cv2.waitKey(frame_delay) & 0xFF
            if key == ord('q'):
                break


# ═══════════════════════════════════════════════════════════════
#  CLI 入口
# ═══════════════════════════════════════════════════════════════

def check_weights():
    """检查关键权重文件"""
    print("=" * 60)
    print("  权重文件检查")
    print("=" * 60)

    checks = {}

    # Wav2Lip
    wl_pth = os.path.join(WAV2LIP_SRC, "checkpoints", "wav2lip_gan.pth")
    sfd_pth = os.path.join(WAV2LIP_SRC, "face_detection", "detection", "sfd", "s3fd.pth")
    checks["Wav2Lip wav2lip_gan.pth"] = os.path.exists(wl_pth)
    checks["Wav2Lip s3fd.pth"] = os.path.exists(sfd_pth)

    # SadTalker
    st_dir = os.path.join(SCRIPT_DIR, "sadtalker-src", "checkpoints")
    checks["SadTalker 256.safetensors"] = os.path.exists(
        os.path.join(st_dir, "SadTalker_V0.0.2_256.safetensors")
    )
    checks["SadTalker mapping_109"] = os.path.exists(
        os.path.join(st_dir, "mapping_00109-model.pth.tar")
    )
    checks["SadTalker mapping_229"] = os.path.exists(
        os.path.join(st_dir, "mapping_00229-model.pth.tar")
    )
    checks["SadTalker facevid2vid"] = os.path.exists(
        os.path.join(st_dir, "facevid2vid_00189-model.pth.tar")
    )

    all_ok = True
    for name, ok in checks.items():
        status = "✅" if ok else "❌"
        if not ok:
            all_ok = False
        icon = "🔴" if not ok else "🟢"
        print(f"   {icon} {status} {name}")

    return all_ok


def main():
    parser = argparse.ArgumentParser(
        description="🎭 Wav2Lip + SadTalker 组合数字人流水线",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 离线生成视频
  python combined_pipeline.py --face photo.jpg --audio speech.wav --output demo.mp4

  # 交互式 AI 数字人
  python combined_pipeline.py --face photo.jpg --interactive --tenant west_lake

  # 预览模式（不保存文件）
  python combined_pipeline.py --face photo.jpg --audio speech.wav --preview

部署前提:
  1. 运行 setup_wav2lip.ps1 下载 Wav2Lip 权重
  2. 运行 setup_sadtalker.ps1 下载 SadTalker 权重
  3. .venv\\Scripts\\python.exe -c "import torch; print(torch.cuda.is_available())"
        """,
    )
    parser.add_argument("--face", required=True, help="人脸照片路径")
    parser.add_argument("--audio", help="驱动音频路径 (.wav)")
    parser.add_argument("--output", help="输出视频路径 (.mp4)")
    parser.add_argument("--interactive", action="store_true", help="交互式 AI 模式")
    parser.add_argument("--tenant", default="west_lake", help="租户 ID（交互模式）")
    parser.add_argument("--preview", action="store_true", help="实时预览")
    parser.add_argument("--size", type=int, default=256, help="输出分辨率")
    parser.add_argument("--fps", type=int, default=25, help="帧率")
    parser.add_argument("--blend", choices=["poisson", "feather", "direct"],
                        default="feather", help="唇形融合方法")
    parser.add_argument("--still", action="store_true", help="减少头部运动")
    parser.add_argument("--expression-scale", type=float, default=1.0,
                        help="表情强度 (0.5-1.5)")

    args = parser.parse_args()

    if not os.path.exists(args.face):
        print(f"❌ 照片不存在: {args.face}")
        sys.exit(1)

    # 权重检查
    if not check_weights():
        print("\n⚠️  部分权重缺失，但仍会尝试运行")
        print("   缺失的权重将导致对应模块降级（唇形同步仅用 Wav2Lip，面部动态仅用静态帧）")
        print()

    pipeline = CombinedPipeline(
        face_path=args.face,
        sadtalker_size=args.size,
        output_size=args.size,
        fps=args.fps,
        sadtalker_still=args.still,
        expression_scale=args.expression_scale,
        blend_method=args.blend,
    )

    try:
        if args.interactive:
            asyncio.run(pipeline.interactive_loop(tenant_id=args.tenant))
        elif args.audio:
            pipeline.generate(
                audio_path=args.audio,
                output_path=args.output,
                show_preview=args.preview,
            )
        else:
            print("❌ 请指定 --audio 或 --interactive 模式")
            parser.print_help()
    except KeyboardInterrupt:
        print("\n👋 用户中断")
    except Exception as e:
        print(f"\n❌ 运行异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()