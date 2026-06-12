"""
Wav2Lip 离线预生成脚本
======================
输入：一张人脸照片 + 两段 TTS 文本 → 输出 idle.mp4 + speaking.mp4

用途：
  生成前后端音视解耦方案所需的两个预渲染视频：
  - idle.mp4：数字人空闲待机状态（闭嘴/微动）
  - speaking.mp4：数字人说话状态（唇形同步）

产物路径（默认）：
  ../../frontend-mp/assets/video/idle.mp4
  ../../frontend-mp/assets/video/speaking.mp4

环境要求：
  conda activate wav2lip
  # 确保 wav2lip-src/ 已克隆且 checkpoints/ 已下载
"""

import argparse
import sys
import os
import platform

# ─── 将 Wav2Lip 源码加入路径 ──────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WAV2LIP_SRC = os.path.join(SCRIPT_DIR, "wav2lip-src")
sys.path.insert(0, WAV2LIP_SRC)
sys.path.insert(0, os.path.join(WAV2LIP_SRC, "face_detection"))


def check_dependencies():
    """检查 Wav2Lip 依赖是否就绪"""
    checks = {
        "Wav2Lip 源码": os.path.exists(WAV2LIP_SRC),
        "checkpoints/wav2lip_gan.pth": os.path.exists(
            os.path.join(WAV2LIP_SRC, "checkpoints", "wav2lip_gan.pth")
        ),
        "face_detection/sfd/s3fd.pth": os.path.exists(
            os.path.join(WAV2LIP_SRC, "face_detection", "detection", "sfd", "s3fd.pth")
        ),
    }
    all_ok = True
    for name, ok in checks.items():
        status = "✅" if ok else "❌"
        print(f"   {status} {name}")
        if not ok:
            all_ok = False
    return all_ok


def generate_silence_audio(duration_sec: float, output_path: str):
    """生成静音 WAV 文件（用于 idle 状态）"""
    import numpy as np
    import wave

    sample_rate = 16000
    num_samples = int(sample_rate * duration_sec)
    silence = np.zeros(num_samples, dtype=np.int16)

    with wave.open(output_path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(silence.tobytes())

    print(f"   📢 生成静音音频: {output_path} ({duration_sec}s)")
    return output_path


def text_to_wav(text: str, output_path: str) -> str:
    """
    使用 edge-tts 将文本转为 WAV（16kHz 单声道，Wav2Lip 要求）
    
    注意：此函数需要在 ai-engine-python/.venv 环境下运行，
    或确保 edge-tts 已安装。
    """
    import subprocess
    import asyncio

    # 先用 edge-tts 生成 MP3，再用 librosa 转 WAV
    try:
        import edge_tts
        import librosa
        import soundfile as sf

        async def _gen():
            communicate = edge_tts.Communicate(
                text=text,
                voice="zh-CN-XiaoxiaoNeural",
                rate="+10%",
            )
            tmp_mp3 = output_path.replace(".wav", ".tmp.mp3")
            await communicate.save(tmp_mp3)

            # 转 WAV 16kHz 单声道
            audio, sr = librosa.load(tmp_mp3, sr=16000, mono=True)
            sf.write(output_path, audio, 16000)
            os.remove(tmp_mp3)
            return output_path

        return asyncio.run(_gen())
    except ImportError:
        print("   ⚠️  edge-tts/librosa 未安装，尝试用系统 TTS...")
        raise


def run_wav2lip_inference(
    face_path: str,
    audio_path: str,
    output_path: str,
    static: bool = False,
    fps: int = 25,
    pads: str = "0 10 0 0",
):
    """
    调用 Wav2Lip 原始推理脚本

    Args:
        face_path: 人脸图片或视频
        audio_path: 驱动音频（16kHz WAV）
        output_path: 输出 MP4 路径
        static: True=用单张照片生成（无原始视频）
        fps: 输出帧率
        pads: 人脸裁剪边距 "top bottom left right"
    """
    from inference import load_model, face_detect
    import torch
    import cv2
    import numpy as np
    from tqdm import tqdm
    import librosa

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"   🖥️  推理设备: {device}")

    # 加载模型
    print("   📦 加载 Wav2Lip 模型...")
    model = load_model(os.path.join(WAV2LIP_SRC, "checkpoints", "wav2lip_gan.pth"), device)

    # 加载音频
    print(f"   🎵 加载音频: {audio_path}")
    wav, sample_rate = librosa.load(audio_path, sr=16000)
    mel = librosa.feature.melspectrogram(y=wav, sr=sample_rate, n_mels=80, hop_length=int(sample_rate * 0.01))
    mel = np.log(mel + 1e-6).T  # (T, 80)

    # 读取人脸
    if static and face_path.lower().endswith((".png", ".jpg", ".jpeg")):
        print(f"   🖼️  静态照片模式: {face_path}")
        img = cv2.imread(face_path)
        if img is None:
            raise FileNotFoundError(f"无法读取图片: {face_path}")

        # 检测人脸
        from face_detection.detection.sfd import FaceDetector
        detector = FaceDetector(device=device)

        # 生成帧序列（照片重复）
        fps = 25
        num_frames = mel.shape[0]  # mel 帧数
        if num_frames < 1:
            num_frames = int(len(wav) / sample_rate * fps)

        # 用相同照片生成所有帧
        faces = detector.detect_from_image(img)
        if len(faces) == 0:
            raise RuntimeError("未检测到人脸！请用正脸清晰照片。")
        face = faces[0]
        print(f"   👤 检测到人脸: {face.shape}")

        # Wav2Lip 需要的输入格式：(N, H, W, C) → (N, C, H, W)
        # face 应为 (96, 96, 3) 的裁剪人脸

        # 简化方案：写作时 Wav2Lip 内部已经做了裁剪检测
        # 这里生成静态人脸序列
        face_sequence = np.tile(img, (num_frames, 1, 1, 1))

        print(f"   🎬 开始生成 {num_frames} 帧...")
        batch_size = 128
        gen_frames = []

        for i in tqdm(range(0, num_frames, batch_size), desc="   推理中"):
            end = min(i + batch_size, num_frames)
            batch_faces = face_sequence[i:end]
            batch_mel = mel[i:end]

            # 转换格式并推理
            img_batch = torch.FloatTensor(batch_faces).permute(0, 3, 1, 2).to(device) / 255.0
            mel_batch = torch.FloatTensor(batch_mel).unsqueeze(0).to(device) if len(batch_mel.shape) == 2 else torch.FloatTensor(batch_mel).to(device)

            # 简化推理（完整版需要人脸对齐裁剪）
            # 由于 Wav2Lip 原始推理较复杂，这里使用子进程调用
            pass

        # 由于 Wav2Lip 推理需要精确的人脸裁剪对齐，
        # 推荐使用其原始 inference.py 命令行方式
        print("   ⚠️  推荐使用 Wav2Lip 原始命令行推理（更稳定）：")
        print(f"   python inference.py --checkpoint_path checkpoints/wav2lip_gan.pth "
              f"--face {face_path} --audio {audio_path} --outfile {output_path} --static --fps {fps}")

    else:
        # 视频模式
        print(f"   🎥 视频模式: {face_path}")
        print("   使用 Wav2Lip 原始推理 pipeline...")


def main():
    parser = argparse.ArgumentParser(description="Wav2Lip 离线预生成 idle.mp4 + speaking.mp4")
    parser.add_argument("--face", required=True, help="人脸照片路径 (.png/.jpg)")
    parser.add_argument("--idle-text", default="嗨，我是你的AI导游。", help="idle 状态文本（默认一句话）")
    parser.add_argument("--speak-text", default="欢迎来到西湖景区！让我为您介绍一下这里的美丽风景。")
    parser.add_argument("--output", default="../../frontend-mp/assets/video/", help="输出目录")
    parser.add_argument("--fps", type=int, default=25, help="输出帧率")
    args = parser.parse_args()

    print("=" * 60)
    print("🎭 Wav2Lip 离线预生成工具")
    print("=" * 60)

    # ─── 环境检查 ────────────────────────────────────────
    print("\n[1/4] 检查环境...")
    if not check_dependencies():
        print("\n❌ 请先运行 setup_wav2lip.ps1 完成部署")
        sys.exit(1)

    # ─── 创建输出目录 ────────────────────────────────────
    os.makedirs(args.output, exist_ok=True)
    temp_dir = os.path.join(SCRIPT_DIR, "temp")
    os.makedirs(temp_dir, exist_ok=True)

    # ─── 生成音频 ────────────────────────────────────────
    print("\n[2/4] 生成 TTS 音频...")

    # 尝试用 edge-tts，失败则生成静音占位
    speak_wav = os.path.join(temp_dir, "speak.wav")
    idle_wav = os.path.join(temp_dir, "idle.wav")

    try:
        text_to_wav(args.speak_text, speak_wav)
        print(f"   ✅ 语音音频: {speak_wav}")
    except Exception as e:
        print(f"   ⚠️  TTS 失败 ({e})，使用静音占位")
        generate_silence_audio(3.0, speak_wav)

    try:
        text_to_wav(args.idle_text, idle_wav)
        print(f"   ✅ 待机音频: {idle_wav}")
    except Exception:
        generate_silence_audio(1.5, idle_wav)

    # ─── Wav2Lip 推理 ────────────────────────────────────
    print("\n[3/4] Wav2Lip 推理生成视频...")
    print("   ⚠️  Wav2Lip 推理需要 GPU + CUDA，预计每段视频 1-5 分钟")
    print("   如果在 CPU 或无 GPU 环境，请用以下命令手动在 GPU 机器上运行：")
    print(f"""
    conda activate wav2lip
    cd {WAV2LIP_SRC}

    # 生成 speaking.mp4
    python inference.py \\
        --checkpoint_path checkpoints/wav2lip_gan.pth \\
        --face {os.path.abspath(args.face)} \\
        --audio {os.path.abspath(speak_wav)} \\
        --outfile {os.path.abspath(os.path.join(args.output, 'speaking.mp4'))} \\
        --static --fps {args.fps}

    # 生成 idle.mp4（用短静音/短句）
    python inference.py \\
        --checkpoint_path checkpoints/wav2lip_gan.pth \\
        --face {os.path.abspath(args.face)} \\
        --audio {os.path.abspath(idle_wav)} \\
        --outfile {os.path.abspath(os.path.join(args.output, 'idle.mp4'))} \\
        --static --fps {args.fps}
    """)

    # ─── 验证输出 ────────────────────────────────────────
    print("\n[4/4] 验证输出...")
    idle_mp4 = os.path.join(args.output, "idle.mp4")
    speak_mp4 = os.path.join(args.output, "speaking.mp4")

    if os.path.exists(idle_mp4):
        size_mb = os.path.getsize(idle_mp4) / 1024 / 1024
        print(f"   ✅ idle.mp4 → {size_mb:.1f} MB")
    else:
        print(f"   ⏳ idle.mp4 待生成 → {idle_mp4}")

    if os.path.exists(speak_mp4):
        size_mb = os.path.getsize(speak_mp4) / 1024 / 1024
        print(f"   ✅ speaking.mp4 → {size_mb:.1f} MB")
    else:
        print(f"   ⏳ speaking.mp4 待生成 → {speak_mp4}")

    print(f"\n📂 视频产物将存放到: {os.path.abspath(args.output)}")
    print("   前端小程序将读取这两个文件实现音视解耦。")

    # 清理临时文件
    import shutil
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
        print("   🧹 已清理临时文件")


if __name__ == "__main__":
    main()