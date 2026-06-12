"""精确定位 TorchScript 模型输入格式"""
import torch
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ckpt = os.path.join(SCRIPT_DIR, "wav2lip-src", "checkpoints", "Wav2Lip-SD-GAN.pt")

model = torch.jit.load(ckpt)
model.eval()

# 获取模型的 graph 信息
print("=== Model code ===")
try:
    print(model.code[:3000])
except:
    print("No .code attribute")

print("\n=== Model graph inputs ===")
graph = model.graph
for inp in graph.inputs():
    print(f"  Input: {inp}, type={inp.type()}")

print("\n=== Model graph outputs ===")
for out in graph.outputs():
    print(f"  Output: {out}, type={out.type()}")

# 用 graph 推导输入形状
print("\n=== Trying to infer input format from graph ===")
for inp in graph.inputs():
    t = inp.type()
    print(f"  {inp.debugName()}: {t}")
    if hasattr(t, 'sizes'):
        print(f"    sizes: {t.sizes()}")
    if hasattr(t, 'scalarType'):
        print(f"    scalarType: {t.scalarType()}")

# 尝试 trace 看看调用签名
print("\n=== Tracing callable ===")
try:
    traced = torch.jit.trace(model, (torch.randn(1,6,96,96), torch.randn(1,6,96,96)))
    for inp in traced.graph.inputs():
        print(f"  {inp}")
except Exception as e:
    print(f"  Trace failed: {e}")