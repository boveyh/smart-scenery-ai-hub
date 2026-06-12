"""
🎭 全自动数字人 Demo
===================
AI 自主生成文本 → TTS 语音合成 → Wav2Lip 唇形同步 → 窗口播放

一句话：你问一句，数字人看着你的眼睛回答你，全程自动。

工作原理（逐句流水线）：
  游客提问
   │
   ▼
  LLM 流式生成回答 ──句级切片──→ 句子1, 句子2, 句子3 ...
   │
   ▼
  每拿到一个完整句子:
    ① edge-tts → 生成该句的 MP3 音频
    ② Wav2Lip → 根据音频 + 人脸照片 → 生成唇形同步视频帧
    ③ OpenCV 窗口 → 播放视频帧（数字人张嘴说话）
   │
   ▼
  句子间间隙 → 窗口回到静态照片（闭嘴待机）
   │
   ▼
  所有句子播完 → 等待下一个问题

启动方式：
  conda activate wav2lip
  pip install openai edge-tts python-dotenv httpx   # 一次性
  python full_pipeline.py --face "你的照片.png" --tenant west_lake

操作：
  在终端输入问题，回车发送
  输入 quit 退出
"""

import argparse
import asyncio
import os
import sys
import time
import threading
import tempfile
import wave
from pathlib import Path

# ─── 路径设置 ────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # smart-scenery-ai-hub/
AI_ENGINE_DIR = os.path.join(PROJECT_ROOT, "ai-engine-python")
WAV2LIP_SRC = os.path.join(SCRIPT_DIR, "wav2lip-src")

sys.path.insert(0, AI_ENGINE_DIR)
sys.path.insert(0, WAV2LIP_SRC)

# ─── 导入 AI 引擎组件 ───────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(os.path.join(AI_ENGINE_DIR, ".env"))

from core.llm_client import LLMStreamClient
from core.tts_generator import TTSGenerator
from core.rag_processor import RAGProcessor


# ═══════════════════════════════════════════════════════════
#  全自动数字人引擎
# ═══════════════════════════════════════════════════════════

class FullDigitalHumanPipeline:
    """
    AI 生成文本 → TTS → Wav2Lip → 播放，全自动流水线

    每个句子的处理耗时（在 GPU 上）：
      LLM 流式出字  →  0.5 - 2 秒（取决于句子长度）
      edge-tts      →  0.3 - 1 秒
      Wav2Lip 推理  →  1 - 3 秒（取决于句子时长）
      总延迟约       →  2 - 6 秒 / 句
    """

    def __init__(
        self,
        face_path: str,
        tenant_id: str = "west_lake",
        fps: int = 25,
        display_size: int = 512,
    ):
        self.face_path = face_path
        self.tenant_id = tenant_id
        self.fps = fps
        self.display_size = display_size
        self.running = True

        # Wav2Lip 组件（延迟初始化在 load_models）
        self.device = None
        self.model = None
        self.detector = None
        self.face_img = None

        # AI 引擎组件
        self.llm: LLMStreamClient | None = None
        self.tts: TTSGenerator | None = None
        self.rag: RAGProcessor | None = None

        # 临时文件目录
        self.temp_dir = os.path.join(SCRIPT_DIR, "temp")
        os.makedirs(self.temp_dir, exist_ok=True)

    # ─── 初始化 ─────────────────────────────────────────

    def load_models(self):
        """加载 Wav2Lip 模型 + 初始化 AI 引擎"""
        import torch

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🖥️  Wav2Lip 推理设备: {self.device}")

        # Wav2Lip 模型
        print("📦 加载 Wav2Lip 模型...")
        from models import Wav2Lip as Wav2LipModel
        ckpt = os.path.join(WAV2LIP_SRC, "checkpoints", "wav2lip_gan.pth")
        if not os.path.exists(ckpt):
            raise FileNotFoundError(f"模型缺失: {ckpt}\n请运行 setup_wav2lip.ps1")

        # 直接加载模型（避免导入 inference.py 触发 argparse 冲突）
        self.model = Wav2LipModel()
        print(f"Load checkpoint from: {ckpt}")
        if self.device == "cuda":
            checkpoint = torch.load(ckpt)
        else:
            checkpoint = torch.load(ckpt, map_location=lambda storage, loc: storage)
        s = checkpoint["state_dict"]
        new_s = {}
        for k, v in s.items():
            new_s[k.replace("module.", "")] = v
        self.model.load_state_dict(new_s)
        self.model = self.model.to(self.device)
        self.model = self.model.eval()

        # 人脸检测
        from face_detection.detection.sfd import FaceDetector
        self.detector = FaceDetector(device=self.device)

        # 人脸照片
        import cv2
        self.face_img = cv2.imread(self.face_path)
        if self.face_img is None:
            raise FileNotFoundError(f"照片不存在: {self.face_path}")
        faces = self.detector.detect_from_image(self.face_img)
        if len(faces) == 0:
            raise RuntimeError("未检测到人脸，请使用正脸清晰照片")
        print(f"✅ Wav2Lip 模型就绪，检测到人脸: {faces[0].shape}")

        # AI 引擎
        print("🤖 初始化 AI 引擎...")
        self.llm = LLMStreamClient(
            api_key=os.getenv("LLM_API_KEY", ""),
            base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
            model=os.getenv("LLM_MODEL", "deepseek-chat"),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "2048")),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
        )
        self.tts = TTSGenerator(output_dir=self.temp_dir)
        self.rag = RAGProcessor(
            backend_base_url=os.getenv("BACKEND_BASE_URL", "http://localhost:9000")
        )
        print("✅ AI 引擎就绪")

    # ─── 语音生成（同步包装） ────────────────────────────

    def tts_text_to_wav(self, text: str, seq: int) -> str:
        """
        edge-tts 文本 → 16kHz WAV（Wav2Lip 要求）

        注意：edge-tts 是异步的，这里用 asyncio.run 包装
        """
        import edge_tts
        import librosa
        import soundfile as sf

        async def _gen():
            mp3_path = os.path.join(self.temp_dir, f"sentence_{seq:04d}.mp3")
            wav_path = os.path.join(self.temp_dir, f"sentence_{seq:04d}.wav")

            communicate = edge_tts.Communicate(
                text=text,
                voice="zh-CN-XiaoxiaoNeural",
                rate="+10%",
            )
            await communicate.save(mp3_path)

            # MP3 → WAV 16kHz 单声道
            audio, sr = librosa.load(mp3_path, sr=16000, mono=True)
            sf.write(wav_path, audio, 16000)
            os.remove(mp3_path)
            return wav_path

        try:
            return asyncio.run(_gen())
        except Exception as e:
            print(f"   ⚠️  TTS 失败: {e}")
            return self._generate_silence_wav(seq, duration_sec=1.0)

    def _generate_silence_wav(self, seq: int, duration_sec: float = 1.0) -> str:
        """生成静音 WAV（TTS 失败时的降级方案）"""
        import numpy as np
        wav_path = os.path.join(self.temp_dir, f"sentence_{seq:04d}.wav")
        sample_rate = 16000
        samples = np.zeros(int(sample_rate * duration_sec), dtype=np.int16)
        with wave.open(wav_path, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(samples.tobytes())
        return wav_path

    # ─── Wav2Lip 推理（核心） ────────────────────────────

    def generate_lip_sync_frames(self, audio_path: str) -> list:
        """
        输入：16kHz WAV 音频文件
        输出：唇形同步帧列表 [numpy_array, ...]
        """
        import torch
        import cv2
        import numpy as np
        import librosa

        # 加载音频，提取 mel spectrogram
        wav, sr = librosa.load(audio_path, sr=16000)
        mel = librosa.feature.melspectrogram(
            y=wav, sr=16000, n_mels=80,
            hop_length=int(16000 * 0.01)
        )
        mel = np.log(mel + 1e-6)

        # 按帧切 mel
        mel_chunks = []
        mel_idx_multiplier = 80.0 / self.fps
        mel_step_size = 16

        for i in range(0, mel.shape[1], int(mel_idx_multiplier)):
            start = i
            end = min(i + mel_step_size, mel.shape[1])
            if end - start < mel_step_size:
                break
            mel_chunks.append(mel[:, start:end].T)  # (16, 80)

        num_frames = len(mel_chunks)
        if num_frames == 0:
            return []

        print(f"   🎬 生成 {num_frames} 帧...")

        # 预计算所有人脸帧（静态照片重复）
        face_96 = cv2.resize(self.face_img, (96, 96))
        face_tensor_base = (
            torch.FloatTensor(face_96)
            .permute(2, 0, 1)          # (3, 96, 96)
            .to(self.device)
            / 255.0
        )

        # 批量推理
        gen_frames = []
        batch_size = 64

        with torch.no_grad():
            for i in range(0, num_frames, batch_size):
                end = min(i + batch_size, num_frames)
                batch_count = end - i

                # 人脸 batch
                face_batch = face_tensor_base.unsqueeze(0).repeat(batch_count, 1, 1, 1)

                # mel batch
                mel_batch = np.array(mel_chunks[i:end])
                mel_tensor = torch.FloatTensor(mel_batch).to(self.device)

                # 推理
                pred = self.model(mel_tensor, face_batch)
                pred = pred.cpu().numpy().transpose(0, 2, 3, 1) * 255.0
                pred = pred.astype(np.uint8)

                gen_frames.extend([f for f in pred])

        return gen_frames

    # ─── 播放视频帧 ──────────────────────────────────────

    def play_lip_sync(self, frames: list, sentence_text: str):
        """
        在 OpenCV 窗口中播放唇形同步帧

        显示内容：
          - 数字人脸部（唇形同步）
          - 底部字幕（当前说出的文字）
          - 进度条
        """
        import cv2

        if not frames:
            return

        frame_delay = int(1000 / self.fps)
        size = self.display_size

        for i, frame in enumerate(frames):
            if not self.running:
                break

            # 放大到显示尺寸
            display = cv2.resize(frame, (size, size))

            # 底部黑条 + 字幕
            subtitle_h = 60
            subtitle_bg = display.copy()
            cv2.rectangle(subtitle_bg, (0, size - subtitle_h), (size, size), (0, 0, 0), -1)

            # 文字（自动换行）
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.7
            thickness = 2
            text = sentence_text
            # 简单换行：每15个字符一行
            lines = [text[i:i+15] for i in range(0, len(text), 15)]
            y0 = size - subtitle_h + 25
            for line in lines[:2]:  # 最多两行
                cv2.putText(subtitle_bg, line, (10, y0), font, font_scale, (255, 255, 255), thickness)
                y0 += 25

            # 进度条
            progress = int((i / max(len(frames) - 1, 1)) * size)
            cv2.line(subtitle_bg, (0, size - 3), (progress, size - 3), (0, 255, 0), 3)

            cv2.imshow("🎭 AI 数字人导游", subtitle_bg)

            key = cv2.waitKey(frame_delay) & 0xFF
            if key == ord('q'):
                self.running = False
                break

    def show_idle(self):
        """显示待机状态（静态照片）"""
        import cv2
        size = self.display_size
        display = cv2.resize(self.face_img, (size, size))
        # 底部提示
        cv2.rectangle(display, (0, size - 40), (size, size), (0, 0, 0), -1)
        cv2.putText(display, "请输入问题... (quit 退出)",
                    (10, size - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        cv2.imshow("🎭 AI 数字人导游", display)

    # ─── 全流程主循环 ───────────────────────────────────

    async def process_one_query(self, user_input: str):
        """
        处理一条游客提问的完整流程

        流程：
          LLM 流式生成 → 逐句 TTS → 逐句 Wav2Lip → 逐句播放
        """
        print(f"\n{'='*60}")
        print(f"👤 游客: {user_input}")
        print(f"{'='*60}")

        # Step 1: RAG 构建 System Prompt
        system_prompt = await self.rag.build_system_prompt(
            tenant_id=self.tenant_id,
            user_query=user_input,
        )
        print(f"📚 System Prompt 已构建（{len(system_prompt)} 字符）")

        # Step 2: LLM 流式生成 + 句级切片
        seq = 0
        async for sentence in self.llm.stream_with_sentence_splitting(
            system_prompt=system_prompt,
            user_message=user_input,
        ):
            trimmed = sentence.strip()
            if not trimmed:
                continue
            seq += 1

            print(f"\n💬 [句子 {seq}] {trimmed}")

            # Step 3: TTS 生成 WAV
            print(f"   🔊 TTS 生成中...")
            wav_path = self.tts_text_to_wav(trimmed, seq)
            if not wav_path or not os.path.exists(wav_path):
                print(f"   ⚠️  TTS 失败，跳过本句")
                continue
            print(f"   ✅ 音频: {os.path.basename(wav_path)}")

            # Step 4: Wav2Lip 生成唇形同步帧
            print(f"   👄 Wav2Lip 推理中...")
            t0 = time.time()
            frames = self.generate_lip_sync_frames(wav_path)
            elapsed = time.time() - t0
            if frames:
                print(f"   ✅ {len(frames)} 帧 ({elapsed:.1f}s)")

                # Step 5: 播放
                print(f"   ▶️  播放中...")
                self.play_lip_sync(frames, trimmed)
            else:
                print(f"   ⚠️  生成失败，跳过")

            # 清理临时音频
            if os.path.exists(wav_path):
                os.remove(wav_path)

            if not self.running:
                break

        print(f"\n{'='*60}")
        print(f"✅ 回答完成（共 {seq} 句）")
        print(f"{'='*60}")

    async def run_loop(self):
        """交互式主循环"""
        import cv2

        # 初始化
        self.load_models()
        cv2.namedWindow("🎭 AI 数字人导游", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("🎭 AI 数字人导游", self.display_size, self.display_size)

        print("\n" + "=" * 60)
        print("  🎭 全自动 AI 数字人导游 - 交互式 Demo")
        print("=" * 60)
        print("  操作：输入问题 → 回车 → AI 思考 → 数字人回答")
        print("  输入 quit 退出")
        print("=" * 60)
        print()

        self.show_idle()
        cv2.waitKey(100)

        while self.running:
            # 终端读取用户输入
            try:
                user_input = input("\n👤 你: ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input:
                continue
            if user_input.lower() in ("quit", "exit", "q"):
                break

            # 处理
            await self.process_one_query(user_input)

            # 回到待机状态
            self.show_idle()
            cv2.waitKey(100)

        cv2.destroyAllWindows()
        print("👋 Demo 结束")

    def run(self):
        """同步入口"""
        asyncio.run(self.run_loop())


# ═══════════════════════════════════════════════════════════
#  入口
# ═══════════════════════════════════════════════════════════

def check_environment():
    """快速环境检查"""
    checks = {}

    try:
        import torch
        checks["PyTorch"] = True
        checks["CUDA 可用"] = torch.cuda.is_available()
    except ImportError:
        checks["PyTorch"] = False

    checks["Wav2Lip 模型"] = os.path.exists(
        os.path.join(WAV2LIP_SRC, "checkpoints", "wav2lip_gan.pth")
    )
    checks["人脸检测模型"] = os.path.exists(
        os.path.join(WAV2LIP_SRC, "face_detection", "detection", "sfd", "s3fd.pth")
    )

    try:
        import edge_tts
        checks["edge-tts"] = True
    except ImportError:
        checks["edge-tts"] = False

    try:
        from openai import AsyncOpenAI
        checks["openai"] = True
    except ImportError:
        checks["openai"] = False

    dotenv_path = os.path.join(AI_ENGINE_DIR, ".env")
    checks[".env 配置"] = os.path.exists(dotenv_path)

    print("=" * 60)
    print("  环境检查")
    print("=" * 60)
    all_ok = True
    for name, ok in checks.items():
        status = "✅" if ok else "❌"
        if not ok:
            all_ok = False
        print(f"   {status} {name}")

    if not all_ok:
        print("\n❌ 缺少依赖，请运行：")
        print("   conda activate wav2lip")
        print("   pip install openai edge-tts python-dotenv httpx")
        return False
    return True


def main():
    parser = argparse.ArgumentParser(
        description="🎭 全自动 AI 数字人导游",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python full_pipeline.py --face "photo.png" --tenant west_lake

首次运行前:
  conda activate wav2lip
  pip install openai edge-tts python-dotenv httpx
        """,
    )
    parser.add_argument("--face", required=True, help="数字人人脸照片 (.png/.jpg)")
    parser.add_argument("--tenant", default="west_lake", help="租户ID")
    parser.add_argument("--fps", type=int, default=25)
    parser.add_argument("--size", type=int, default=512, help="窗口大小（像素）")
    args = parser.parse_args()

    if not os.path.exists(args.face):
        print(f"❌ 照片不存在: {args.face}")
        sys.exit(1)

    if not check_environment():
        sys.exit(1)

    pipeline = FullDigitalHumanPipeline(
        face_path=args.face,
        tenant_id=args.tenant,
        fps=args.fps,
        display_size=args.size,
    )

    try:
        pipeline.run()
    except KeyboardInterrupt:
        print("\n👋 用户中断")
    except Exception as e:
        print(f"\n❌ 运行异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()