"""
下载 Wav2Lip 预训练模型
"""
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(SCRIPT_DIR, "wav2lip-src", "checkpoints", "wav2lip_gan.pth")

if os.path.exists(DEST):
    print(f"✅ 已存在: {DEST}")
    print(f"   大小: {os.path.getsize(DEST) / 1024 / 1024:.1f} MB")
    sys.exit(0)

# 方法1: gdown
try:
    import gdown
    file_id = "15G3U08c8xsCkOqQxE38Z2XXDnPcOptNk"
    url = f"https://drive.google.com/uc?id={file_id}"
    print(f"📥 正在从 Google Drive 下载...")
    gdown.download(url, DEST, quiet=False)
    if os.path.exists(DEST):
        print(f"✅ 下载完成: {os.path.getsize(DEST) / 1024 / 1024:.1f} MB")
        sys.exit(0)
except Exception as e:
    print(f"gdown 下载失败: {e}")

# 方法2: 提示手动下载
print(f"\n❌ 自动下载失败。请手动下载：")
print(f"   链接: https://drive.google.com/file/d/15G3U08c8xsCkOqQxE38Z2XXDnPcOptNk/view")
print(f"   放入: {DEST}")