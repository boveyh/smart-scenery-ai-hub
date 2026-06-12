# ============================================================
# Wav2Lip 一键部署脚本 (Windows PowerShell)
# 
# 用法：在 digital-human/ 目录下右键 → "使用 PowerShell 运行"
# 或：powershell -ExecutionPolicy Bypass -File setup_wav2lip.ps1
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎭 Wav2Lip 数字人模块 — 一键部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$WAV2LIP_DIR = "wav2lip-src"

# ─── Step 1: 克隆 Wav2Lip 仓库 ────────────────────────────
if (Test-Path $WAV2LIP_DIR) {
    Write-Host "[1/4] ✅ Wav2Lip 仓库已存在，跳过克隆" -ForegroundColor Green
} else {
    Write-Host "[1/4] 📥 克隆 Wav2Lip 仓库..." -ForegroundColor Yellow
    git clone https://github.com/Rudrabha/Wav2Lip.git $WAV2LIP_DIR
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 克隆失败！请检查网络或手动下载：" -ForegroundColor Red
        Write-Host "   https://github.com/Rudrabha/Wav2Lip/archive/refs/heads/master.zip" -ForegroundColor Red
        Write-Host "   解压到: $PWD\$WAV2LIP_DIR" -ForegroundColor Red
        pause
        exit 1
    }
}

# ─── Step 2: 下载预训练模型 ────────────────────────────────
Write-Host "[2/4] 📥 检查预训练模型..." -ForegroundColor Yellow

$CHECKPOINT_DIR = "$WAV2LIP_DIR\checkpoints"
$SFD_DIR = "$WAV2LIP_DIR\face_detection\detection\sfd"

if (-not (Test-Path $CHECKPOINT_DIR)) { New-Item -ItemType Directory -Path $CHECKPOINT_DIR -Force }
if (-not (Test-Path $SFD_DIR)) { New-Item -ItemType Directory -Path $SFD_DIR -Force }

# wav2lip_gan.pth
$GAN_MODEL = "$CHECKPOINT_DIR\wav2lip_gan.pth"
if (Test-Path $GAN_MODEL) {
    Write-Host "   ✅ wav2lip_gan.pth 已存在" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  wav2lip_gan.pth 需要手动下载（约 400MB）：" -ForegroundColor Yellow
    Write-Host "      1. 打开: https://drive.google.com/drive/folders/1tBwPspQY9RSMaKGYp4kCJC6w6P3V3qo0" -ForegroundColor White
    Write-Host "      2. 下载 wav2lip_gan.pth" -ForegroundColor White
    Write-Host "      3. 放入: $PWD\$GAN_MODEL" -ForegroundColor White
    Write-Host ""
}

# s3fd.pth（人脸检测）
$SFD_MODEL = "$SFD_DIR\s3fd.pth"
if (Test-Path $SFD_MODEL) {
    Write-Host "   ✅ s3fd.pth 已存在" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  s3fd.pth 需要下载（约 50MB）：" -ForegroundColor Yellow
    Write-Host "      URL: https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth" -ForegroundColor White
    Write-Host "      放入: $PWD\$SFD_MODEL" -ForegroundColor White
    try {
        Invoke-WebRequest -Uri "https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth" -OutFile $SFD_MODEL
        Write-Host "   ✅ s3fd.pth 下载成功" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  自动下载失败，请手动下载" -ForegroundColor Red
    }
    Write-Host ""
}

# ─── Step 3: 创建 conda 环境 ───────────────────────────────
Write-Host "[3/4] 🐍 创建 conda 环境 'wav2lip'..." -ForegroundColor Yellow

$CONDA_CHECK = conda --version 2>$null
if (-not $CONDA_CHECK) {
    Write-Host "   ⚠️  未检测到 conda，请先安装 Miniconda：" -ForegroundColor Red
    Write-Host "      https://docs.conda.io/en/latest/miniconda.html" -ForegroundColor White
    Write-Host "   安装后重新运行本脚本。" -ForegroundColor White
    pause
    exit 1
}

# 检查环境是否已存在
$ENV_EXISTS = conda env list | Select-String "wav2lip"
if ($ENV_EXISTS) {
    Write-Host "   ✅ conda 环境 'wav2lip' 已存在" -ForegroundColor Green
} else {
    Write-Host "   正在创建 conda 环境（可能需要几分钟）..." -ForegroundColor Yellow
    conda create -n wav2lip python=3.10 -y
    Write-Host "   ✅ conda 环境创建完成" -ForegroundColor Green
}

# ─── Step 4: 安装依赖 ─────────────────────────────────────
Write-Host "[4/4] 📦 安装 Python 依赖..." -ForegroundColor Yellow
Write-Host "   激活环境并安装 PyTorch + Wav2Lip 依赖..."
Write-Host ""

# 输出手动安装指令（自动安装可能因网络原因失败）
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎯 部署完成！请手动执行以下命令完成安装：" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  conda activate wav2lip" -ForegroundColor Green
Write-Host ""
Write-Host "  # 安装 PyTorch（CUDA 11.8）" -ForegroundColor White
Write-Host "  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118" -ForegroundColor Green
Write-Host ""
Write-Host "  # 安装 Wav2Lip 依赖" -ForegroundColor White
Write-Host "  cd $PWD\$WAV2LIP_DIR" -ForegroundColor Green
Write-Host "  pip install -r requirements.txt" -ForegroundColor Green
Write-Host "  pip install opencv-python tqdm numpy librosa matplotlib" -ForegroundColor Green
Write-Host ""
Write-Host "  # 验证安装" -ForegroundColor White
Write-Host "  python -c 'import torch; print(f\"CUDA: {torch.cuda.is_available()}\")'" -ForegroundColor Green
Write-Host ""

pause