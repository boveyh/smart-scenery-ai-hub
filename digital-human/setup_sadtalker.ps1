# ============================================================
# SadTalker 一键部署脚本 (Windows PowerShell)
# 
# SadTalker: 生成头部姿态 + 面部表情动态（眨眼、微表情等）
# 与 Wav2Lip 组合：Wav2Lip 处理口型，SadTalker 提供面部动态
#
# 用法：在 digital-human/ 目录下右键 → "使用 PowerShell 运行"
# 或：powershell -ExecutionPolicy Bypass -File setup_sadtalker.ps1
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎭 SadTalker 面部动态模块 — 一键部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$SADTALKER_DIR = "sadtalker-src"

# ─── Step 1: 克隆 SadTalker 仓库 ────────────────────────────
if (Test-Path $SADTALKER_DIR) {
    Write-Host "[1/5] ✅ SadTalker 仓库已存在，跳过克隆" -ForegroundColor Green
} else {
    Write-Host "[1/5] 📥 克隆 SadTalker 仓库..." -ForegroundColor Yellow
    git clone https://github.com/OpenTalker/SadTalker.git $SADTALKER_DIR
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 克隆失败！请检查网络或手动下载：" -ForegroundColor Red
        Write-Host "   https://github.com/OpenTalker/SadTalker/archive/refs/heads/main.zip" -ForegroundColor Red
        Write-Host "   解压到: $PWD\$SADTALKER_DIR" -ForegroundColor Red
        pause
        exit 1
    }
}

# ─── Step 2: 创建权重目录结构 ────────────────────────────────
Write-Host "[2/5] 📁 创建权重目录结构..." -ForegroundColor Yellow

$CHECKPOINTS_DIR = "$SADTALKER_DIR\checkpoints"
$GFPGAN_DIR = "$SADTALKER_DIR\gfpgan\weights"

if (-not (Test-Path $CHECKPOINTS_DIR)) { New-Item -ItemType Directory -Path $CHECKPOINTS_DIR -Force }
if (-not (Test-Path $GFPGAN_DIR)) { New-Item -ItemType Directory -Path $GFPGAN_DIR -Force }

Write-Host "   ✅ 权重目录已创建" -ForegroundColor Green

# ─── Step 3: 安装 pip 依赖 ──────────────────────────────────
Write-Host "[3/5] 📦 安装 SadTalker Python 依赖..." -ForegroundColor Yellow
Write-Host "   (在 digital-human/.venv 中安装)"

$VENV_PYTHON = "$PWD\.venv\Scripts\python.exe"
if (-not (Test-Path $VENV_PYTHON)) {
    Write-Host "   ⚠️  虚拟环境不存在，请先运行: uv sync" -ForegroundColor Yellow
    Write-Host "   然后重新运行本脚本。" -ForegroundColor Yellow
    pause
    exit 1
}

# 安装 SadTalker 额外依赖
& $VENV_PYTHON -m pip install `
    imageio `
    imageio-ffmpeg `
    face-alignment `
    kornia `
    yacs `
    dominate `
    dlib `
    pyyaml `
    scikit-image `
    opencv-python `
    tqdm `
    numpy `
    easydict `
    einops `
    av 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  部分依赖安装可能失败，请手动安装" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ SadTalker 依赖安装完成" -ForegroundColor Green
}

# ─── Step 4: 权重下载指引 ───────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[4/5] 📥 权重文件下载指引" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  以下权重文件需要手动下载（总计约 2.5GB）：" -ForegroundColor Yellow
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "  A. SadTalker 主模型（必选其一）" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""

$WEIGHT_256 = "$CHECKPOINTS_DIR\SadTalker_V0.0.2_256.safetensors"
if (Test-Path $WEIGHT_256) {
    Write-Host "   ✅ SadTalker_V0.0.2_256.safetensors 已存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ 缺失: SadTalker_V0.0.2_256.safetensors" -ForegroundColor Red
    Write-Host "      下载: https://huggingface.co/vinthony/SadTalker/resolve/main/SadTalker_V0.0.2_256.safetensors"
    Write-Host "      放入: $PWD\$WEIGHT_256" -ForegroundColor Yellow
    Write-Host ""
}

$WEIGHT_512 = "$CHECKPOINTS_DIR\SadTalker_V0.0.2_512.safetensors"
if (Test-Path $WEIGHT_512) {
    Write-Host "   ✅ SadTalker_V0.0.2_512.safetensors 已存在（可选，更高质量）" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  可选: SadTalker_V0.0.2_512.safetensors (更高分辨率)" -ForegroundColor Gray
    Write-Host "      下载: https://huggingface.co/vinthony/SadTalker/resolve/main/SadTalker_V0.0.2_512.safetensors"
    Write-Host "      放入: $PWD\$WEIGHT_512" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "  B. 3D 人脸重建模型" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""

$MAPPING_109 = "$CHECKPOINTS_DIR\mapping_00109-model.pth.tar"
if (Test-Path $MAPPING_109) {
    Write-Host "   ✅ mapping_00109-model.pth.tar 已存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ 缺失: mapping_00109-model.pth.tar" -ForegroundColor Red
    Write-Host "      下载: https://huggingface.co/vinthony/SadTalker/resolve/main/mapping_00109-model.pth.tar"
    Write-Host "      放入: $PWD\$MAPPING_109" -ForegroundColor Yellow
    Write-Host ""
}

$MAPPING_229 = "$CHECKPOINTS_DIR\mapping_00229-model.pth.tar"
if (Test-Path $MAPPING_229) {
    Write-Host "   ✅ mapping_00229-model.pth.tar 已存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ 缺失: mapping_00229-model.pth.tar" -ForegroundColor Red
    Write-Host "      下载: https://huggingface.co/vinthony/SadTalker/resolve/main/mapping_00229-model.pth.tar"
    Write-Host "      放入: $PWD\$MAPPING_229" -ForegroundColor Yellow
    Write-Host ""
}

$FACEVID = "$CHECKPOINTS_DIR\facevid2vid_00189-model.pth.tar"
if (Test-Path $FACEVID) {
    Write-Host "   ✅ facevid2vid_00189-model.pth.tar 已存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ 缺失: facevid2vid_00189-model.pth.tar" -ForegroundColor Red
    Write-Host "      下载: https://huggingface.co/vinthony/SadTalker/resolve/main/facevid2vid_00189-model.pth.tar"
    Write-Host "      放入: $PWD\$FACEVID" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "  C. GFPGAN 面部增强（可选但推荐）" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""

$GFPGAN_MODEL = "$GFPGAN_DIR\GFPGANv1.3.pth"
if (Test-Path $GFPGAN_MODEL) {
    Write-Host "   ✅ GFPGANv1.3.pth 已存在" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  可选: GFPGANv1.3.pth（面部增强，提升清晰度）" -ForegroundColor Gray
    Write-Host "      下载: https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth"
    Write-Host "      放入: $PWD\$GFPGAN_MODEL" -ForegroundColor Yellow
    Write-Host ""
}

$DETECTION_MODEL = "$GFPGAN_DIR\detection_Resnet50_Final.pth"
if (Test-Path $DETECTION_MODEL) {
    Write-Host "   ✅ detection_Resnet50_Final.pth 已存在" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  可选: detection_Resnet50_Final.pth" -ForegroundColor Gray
    Write-Host "      下载: https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth"
    Write-Host "      放入: $PWD\$DETECTION_MODEL" -ForegroundColor Yellow
    Write-Host ""
}

$PARSING_MODEL = "$GFPGAN_DIR\parsing_parsenet.pth"
if (Test-Path $PARSING_MODEL) {
    Write-Host "   ✅ parsing_parsenet.pth 已存在" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  可选: parsing_parsenet.pth" -ForegroundColor Gray
    Write-Host "      下载: https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth"
    Write-Host "      放入: $PWD\$PARSING_MODEL" -ForegroundColor Yellow
    Write-Host ""
}

# ─── Step 5: 修复 SadTalker 兼容性问题 ──────────────────────
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[5/5] 🔧 兼容性修复..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 创建 SadTalker 源码的 __init__.py（使其可被导入）
$SRC_INIT = "$SADTALKER_DIR\src\__init__.py"
if (-not (Test-Path $SRC_INIT)) {
    New-Item -ItemType File -Path $SRC_INIT -Force | Out-Null
    Write-Host "   ✅ 创建 src/__init__.py" -ForegroundColor Green
}

# 创建 sadtalker 顶层 __init__.py
$ROOT_INIT = "$SADTALKER_DIR\__init__.py"
if (-not (Test-Path $ROOT_INIT)) {
    New-Item -ItemType File -Path $ROOT_INIT -Force | Out-Null
    Write-Host "   ✅ 创建 sadtalker-src/__init__.py" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎯 SadTalker 部署完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  接下来请：" -ForegroundColor Yellow
Write-Host "  1. 按上方指引下载权重文件到对应位置" -ForegroundColor White
Write-Host "  2. 运行 combined_pipeline.py 体验 Wav2Lip+SadTalker 组合效果" -ForegroundColor White
Write-Host ""
Write-Host "  启动命令：" -ForegroundColor Green
Write-Host "  .venv\Scripts\python.exe combined_pipeline.py --face `"你的照片.png`" --audio `"音频.wav`" --output `"output.mp4`"" -ForegroundColor White
Write-Host ""

pause