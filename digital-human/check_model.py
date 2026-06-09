import torch
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ckpt_path = os.path.join(SCRIPT_DIR, "wav2lip-src", "checkpoints", "Wav2Lip-SD-GAN.pt")
print(f"Loading: {ckpt_path}")
print(f"Exists: {os.path.exists(ckpt_path)}")
c = torch.load(ckpt_path, map_location="cpu")
print(f"Type: {type(c)}")

if isinstance(c, dict):
    keys = list(c.keys())
    print(f"Keys ({len(keys)}): {keys}")
    for k, v in c.items():
        if hasattr(v, "shape"):
            print(f"  {k}: shape={v.shape}")
        else:
            print(f"  {k}: {type(v)}")
else:
    print(f"Content: {str(c)[:500]}")