"""测试 TorchScript 模型的实际输入输出形状"""
import torch
import sys, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ckpt = os.path.join(SCRIPT_DIR, "wav2lip-src", "checkpoints", "Wav2Lip-SD-GAN.pt")

print(f"Loading TorchScript model...")
model = torch.jit.load(ckpt)
model.eval()

# 尝试各种可能的输入形状
test_shapes = [
    # (audio_shape, face_shape) - 基于 Wav2Lip 原版推理逻辑
    {"audio": (1, 1, 80, 16), "face": (1, 6, 96, 96)},
    {"audio": (1, 6, 80, 16), "face": (1, 6, 96, 96)},
    {"audio": (1, 6, 96, 96), "face": (1, 6, 96, 96)},   # 都是 image
    
    # 标准 Wav2Lip 格式：mel (batch, 1, mel_bins, mel_step) + face (batch, C, H, W)
    {"audio": (1, 1, 80, 16), "face": (1, 6, 96, 96)},
    {"audio": (2, 1, 80, 16), "face": (2, 6, 96, 96)},
    
    # mel 是 80x16 拉平了？
    {"audio": (1, 16, 80), "face": (1, 6, 96, 96)},      # (B, T, mel_bins)
    
    # 这可能是 mel shape (T, 1, 80, 16) - 常见于 SD 版本
    {"audio": (16, 1, 80, 16), "face": (16, 6, 96, 96)},
    {"audio": (16, 1, 96, 96), "face": (16, 6, 96, 96)},
]

print("\n--- Testing input shapes ---")
for i, shapes in enumerate(test_shapes):
    try:
        audio = torch.randn(*shapes['audio']).float()
        face = torch.randn(*shapes['face']).float()
        
        with torch.no_grad():
            result = model(audio, face)
        
        print(f"✅ Shape {i}: audio={list(shapes['audio'])}, face={list(shapes['face'])} → output={list(result.shape)}")
    except Exception as e:
        err_msg = str(e).split('\n')[0][:120]
        print(f"❌ Shape {i}: audio={list(shapes['audio'])}, face={list(shapes['face'])} → {err_msg}")