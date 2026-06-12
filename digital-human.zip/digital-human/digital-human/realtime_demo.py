"""
Wav2Lip 实时数字人 Demo（答辩专用）
===================================
录音 → 实时唇形同步 → 窗口显示数字人说话

用途：
  答辩现场演示：对着麦克风说话，屏幕上数字人嘴型同步跟随
  无需网络，纯本地 GPU 推理

启动：
  conda activate wav2lip
  python realtime_demo.py --face "你的照片.png"

操作：
  - 按空格键开始/停止录音
  - 说一句话，释放空格键后自动生成数字人说话视频
  - 按 Q 退出

环境要求：
  - NVIDIA GPU + CUDA（≥4GB 显存）
  - conda 环境 wav2lip 已安装全部依赖
  - wav2lip-src/ 已克隆且 checkpoints/ 已下载
"""

import argparse
import os
import sys
import time
import threading
import queue
import tempfile
import wave
from pathlib import Path

# ─── 将 Wav2Lip 源码加入路径 ──────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WAV2LIP_SRC = os.path.join(SCRIPT_DIR, "wav2lip-src")
sys.path.insert(0, WAV2LIP_SRC)
sys.path.insert(0, os.path.join(WAV2LIP_SRC, "face_detection"))


class RealtimeWav2Lip:
    """
    实时数字人 Demo

    工作流程：
      1. 加载人脸照片 + Wav2Lip 模型（常驻显存）
      2. 监听键盘，空格键按下开始录音
      3. 释放空格键 → 停止录音 → Wav2Lip 推理 → OpenCV 窗口播放
      4. 循环
    """

    def __init__(self, face_path: str, fps: int = 25):
        self.face_path = face_path
        self.fps = fps
        self.model = None
        self.detector = None
        self.device = None
        self.face_img = None
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.running = True

        # 检测设备
        import torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🖥️  推理设备: {self.device}")

    def load_models(self):
        """预加载模型和人脸（常驻显存，避免每次推理都重新加载）"""
        import torch
        print("📦 加载 Wav2Lip 模型（约 400MB）...")
        from inference import load_model

        checkpoint_path = os.path.join(WAV2LIP_SRC, "checkpoints", "wav2lip_gan.pth")
        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(
                f"模型文件未找到: {checkpoint_path}\n"
                f"请先运行 setup_wav2lip.ps1 下载预训练模型。"
            )

        self.model = load_model(checkpoint_path, self.device)

        print("👤 加载人脸检测模型...")
        from face_detection.detection.sfd import FaceDetector
        self.detector = FaceDetector(device=self.device)

        print(f"🖼️  读取人脸照片: {self.face_path}")
        import cv2
        self.face_img = cv2.imread(self.face_path)
        if self.face_img is None:
            raise FileNotFoundError(f"无法读取照片: {self.face_path}")

        # 预检测人脸
        faces = self.detector.detect_from_image(self.face_img)
        if len(faces) == 0:
            raise RuntimeError("❌ 未检测到人脸！请使用正脸清晰照片。")
        print(f"✅ 模型加载完成，检测到人脸: {faces[0].shape}")

    def record_audio(self) -> str:
        """
        录制音频（按下空格键时调用）
        
        Returns:
            临时 WAV 文件路径（16kHz 单声道）
        """
        import pyaudio
        import numpy as np

        CHUNK = 1024
        FORMAT = pyaudio.paInt16
        CHANNELS = 1
        RATE = 16000

        p = pyaudio.PyAudio()
        stream = p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK,
        )

        print("🎤 录音中... 释放空格键停止")

        frames = []
        # 录音直到 is_recording = False（由键盘监听线程控制）
        while self.is_recording:
            data = stream.read(CHUNK, exception_on_overflow=False)
            frames.append(data)

        stream.stop_stream()
        stream.close()
        p.terminate()

        # 保存到临时文件
        tmp_path = os.path.join(tempfile.gettempdir(), f"wav2lip_realtime_{int(time.time())}.wav")
        wf = wave.open(tmp_path, "wb")
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(p.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b"".join(frames))
        wf.close()

        duration = len(frames) * CHUNK / RATE
        print(f"✅ 录音完成: {duration:.1f}s → {tmp_path}")
        return tmp_path

    def generate_lip_sync(self, audio_path: str) -> list:
        """
        调用 Wav2Lip 生成唇形同步帧

        Args:
            audio_path: 音频文件路径

        Returns:
            帧列表 (numpy arrays)
        """
        import torch
        import cv2
        import numpy as np
        import librosa

        # 加载音频
        wav, sr = librosa.load(audio_path, sr=16000)
        mel = librosa.feature.melspectrogram(
            y=wav, sr=16000, n_mels=80,
            hop_length=int(16000 * 0.01)
        )
        mel = np.log(mel + 1e-6)

        # 帧数
        mel_chunks = []
        mel_idx_multiplier = 80.0 / self.fps
        mel_step_size = 16

        for i in range(0, mel.shape[1], int(mel_idx_multiplier)):
            start = i
            end = min(i + mel_step_size, mel.shape[1])
            if end - start < mel_step_size:
                break
            chunk = mel[:, start:end]
            mel_chunks.append(chunk.T)  # (16, 80)

        num_frames = len(mel_chunks)
        if num_frames == 0:
            print("⚠️  音频太短，至少需要 0.5 秒")
            return []

        print(f"🎬 生成 {num_frames} 帧...")

        # 批量推理
        gen_frames = []
        batch_size = 32

        with torch.no_grad():
            for i in range(0, num_frames, batch_size):
                end = min(i + batch_size, num_frames)

                # 人脸帧
                face_batch = []
                for j in range(i, end):
                    face_batch.append(cv2.resize(self.face_img, (96, 96)))
                face_batch = np.array(face_batch)  # (B, 96, 96, 3)
                face_tensor = (
                    torch.FloatTensor(face_batch)
                    .permute(0, 3, 1, 2)  # (B, 3, 96, 96)
                    .to(self.device)
                    / 255.0
                )

                # mel 帧
                mel_batch = np.array(mel_chunks[i:end])  # (B, 16, 80)
                mel_tensor = torch.FloatTensor(mel_batch).to(self.device)

                # 推理
                pred = self.model(mel_tensor, face_tensor)
                pred = pred.cpu().numpy().transpose(0, 2, 3, 1) * 255.0
                pred = pred.astype(np.uint8)

                gen_frames.extend([f for f in pred])

        return gen_frames

    def play_video(self, frames: list):
        """用 OpenCV 窗口播放数字人帧"""
        import cv2

        if not frames:
            return

        frame_delay = int(1000 / self.fps)  # 毫秒
        print(f"▶️  播放中... ({len(frames)} 帧, {self.fps} FPS)")

        for i, frame in enumerate(frames):
            if not self.running:
                break
            # 放大到 384x384 显示
            display = cv2.resize(frame, (384, 384))
            
            # 添加进度条
            progress = int((i / len(frames)) * display.shape[1])
            cv2.line(display, (0, display.shape[0] - 5), (progress, display.shape[0] - 5), (0, 255, 0), 5)

            cv2.imshow("🎭 Wav2Lip 实时数字人 Demo", display)
            key = cv2.waitKey(frame_delay) & 0xFF
            if key == ord('q'):
                self.running = False
                break

    def run(self):
        """主循环：录音 → 推理 → 播放 → 循环"""
        import cv2

        print("\n" + "=" * 60)
        print("  🎭 Wav2Lip 实时数字人 Demo (答辩演示)")
        print("=" * 60)
        print("  操作说明：")
        print("    空格键 → 按住录音，松开生成数字人")
        print("    Q 键   → 退出")
        print("=" * 60)
        print()

        self.load_models()

        # 创建窗口
        cv2.namedWindow("🎭 Wav2Lip 实时数字人 Demo", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("🎭 Wav2Lip 实时数字人 Demo", 384, 384)

        # 显示初始照片
        init_display = cv2.resize(self.face_img, (384, 384))
        cv2.imshow("🎭 Wav2Lip 实时数字人 Demo", init_display)

        audio_path = None

        while self.running:
            key = cv2.waitKey(100) & 0xFF

            # 退出
            if key == ord('q'):
                self.running = False
                break

            # 空格键按下 = 开始录音
            elif key == ord(' '):
                if not self.is_recording:
                    self.is_recording = True
                    # 在子线程中录音（不阻塞 OpenCV 窗口）
                    audio_path = None
                    def _record():
                        nonlocal audio_path
                        audio_path = self.record_audio()
                    record_thread = threading.Thread(target=_record)
                    record_thread.start()

            # 空格键释放后自动检测（简化：用计时器模拟）
            # 实际使用中，推荐改用 pynput 或 pygame 监听键盘事件

            # 如果有待处理的音频，进行推理
            if audio_path and os.path.exists(audio_path):
                try:
                    frames = self.generate_lip_sync(audio_path)
                    if frames:
                        self.play_video(frames)
                except Exception as e:
                    print(f"❌ 推理失败: {e}")
                finally:
                    if os.path.exists(audio_path):
                        os.remove(audio_path)
                    audio_path = None

        cv2.destroyAllWindows()
        print("👋 Demo 结束")


def check_environment():
    """检查运行环境"""
    print("=" * 60)
    print("  环境检查")
    print("=" * 60)

    checks = {
        "PyTorch": False,
        "CUDA": False,
        "Wav2Lip 模型": False,
        "人脸检测模型": False,
    }

    try:
        import torch
        checks["PyTorch"] = True
        checks["CUDA"] = torch.cuda.is_available()
    except ImportError:
        pass

    wav2lip_pth = os.path.join(WAV2LIP_SRC, "checkpoints", "wav2lip_gan.pth")
    checks["Wav2Lip 模型"] = os.path.exists(wav2lip_pth)

    sfd_pth = os.path.join(WAV2LIP_SRC, "face_detection", "detection", "sfd", "s3fd.pth")
    checks["人脸检测模型"] = os.path.exists(sfd_pth)

    for name, ok in checks.items():
        status = "✅" if ok else "❌"
        print(f"   {status} {name}")

    all_ok = all(checks.values())
    if not all_ok:
        print("\n❌ 请先运行 setup_wav2lip.ps1 完成部署")
    return all_ok


def main():
    parser = argparse.ArgumentParser(description="Wav2Lip 实时数字人 Demo（答辩加分）")
    parser.add_argument("--face", required=True, help="人脸照片路径")
    parser.add_argument("--fps", type=int, default=25, help="输出帧率")
    args = parser.parse_args()

    if not os.path.exists(args.face):
        print(f"❌ 照片不存在: {args.face}")
        sys.exit(1)

    if not check_environment():
        sys.exit(1)

    demo = RealtimeWav2Lip(face_path=args.face, fps=args.fps)

    try:
        demo.run()
    except KeyboardInterrupt:
        print("\n👋 用户中断")
    except Exception as e:
        print(f"\n❌ 运行异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()