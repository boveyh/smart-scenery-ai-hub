"""检查 TorchScript 模型的输入输出签名"""
import torch
import sys, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ckpt = os.path.join(SCRIPT_DIR, "wav2lip-src", "checkpoints", "Wav2Lip-SD-GAN.pt")

print(f"Loading: {ckpt}")
model = torch.jit.load(ckpt, map_location="cpu")
print(f"Model: {model}")

# 尝试获取模型结构信息
print("\n--- Model attributes ---")
for name in dir(model):
    if not name.startswith("_"):
        try:
            attr = getattr(model, name)
            if hasattr(attr, "forward"):
                print(f"  {name}: callable")
            elif hasattr(attr, "training"):
                print(f"  {name}: module")
        except:
            pass

# 检查 named_parameters 看看有哪些关键层
print("\n--- Top-level named modules ---")
for name, mod in model.named_modules():
    if name.count('.') <= 1 and name:
        print(f"  {name}: {type(mod).__name__}")

# 检查参数 shape
print("\n--- Key parameter shapes ---")
for name, param in model.named_parameters():
    if any(k in name for k in ['face_encoder', 'audio_encoder', 'face_decoder']):
        if '.' not in name.split(name)[-1] if '.' in name else True:
            print(f"  {name}: {param.shape}")
    # 只打印顶层的一些
    if name.count('.') <= 1:
        print(f"  {name}: {param.shape}")