"""
TTS 语音合成引擎 — 基于 edge-tts 的异步轻量化文本转语音

核心职责：
  1. 接收句级切片后的整句文本
  2. 调用 edge-tts 异步生成 MP3 音频
  3. 将音频保存在静态目录，返回公网可访问的相对 URL

设计原则：
  - edge-tts 是纯 Python 包，零 GPU 依赖，调用微软免费 TTS 接口
  - 异步生成，不阻塞 FastAPI 事件循环
  - 生成临时文件按 tenant_id + session_id + seq 命名，便于清理
  - 失败的句子不阻塞流，返回空 URL 静默降级
"""

import asyncio
import logging
import re
from pathlib import Path

import edge_tts

logger = logging.getLogger("ai-engine.tts")

# ─── 中文语音角色预设 ─────────────────────────────────────
# edge-tts --list-voices 可查看完整列表
DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"      # 女声-晓晓，自然流畅
FALLBACK_VOICE = "zh-CN-YunxiNeural"        # 男声-云希，备选
SPEAKABLE_RE = re.compile(r"[\w\u4e00-\u9fff]")
MARKDOWN_RE = re.compile(r"[*_#>`\[\]()]")
URL_RE = re.compile(r"https?://\S+")


def normalize_tts_text(text: str, max_len: int = 220) -> str:
    text = URL_RE.sub("", text)
    text = MARKDOWN_RE.sub("", text)
    text = re.sub(r"^\s*[-+•\d.、]+\s*", "", text.strip())
    text = re.sub(r"\s+", " ", text).strip()
    if not SPEAKABLE_RE.search(text):
        return ""
    return text[:max_len]


class TTSGenerator:
    """
    edge-tts 异步语音合成器

    使用示例：
        gen = TTSGenerator(output_dir="./static/audio")
        url = await gen.generate_audio(
            text="苏堤春晓是西湖十景之首。",
            tenant_id="west_lake",
            session_id="abc123",
            seq=1,
        )
        # → "/static/audio/west_lake/abc123/0001.mp3"
    """

    def __init__(
        self,
        output_dir: str = "./static/audio",
        voice: str = DEFAULT_VOICE,
        rate: str = "+10%",       # 语速微调，使输出更轻快
        pitch: str = "+0Hz",      # 音高不变
        cleanup_after_seconds: int = 1800,  # 30分钟后清理
    ):
        self.output_dir = Path(output_dir)
        self.voice = voice
        self.rate = rate
        self.pitch = pitch
        self.cleanup_after = cleanup_after_seconds
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"TTS 引擎初始化: voice={voice}, output={self.output_dir}")

    async def generate_audio(
        self,
        text: str,
        tenant_id: str,
        session_id: str,
        seq: int,
        voice: str | None = None,
        rate: str | None = None,
        pitch: str | None = None,
    ) -> str:
        """
        异步生成单句 MP3 音频

        Args:
            text: 单句文本（已切片）
            tenant_id: 租户ID
            session_id: 会话ID
            seq: 句子序号

        Returns:
            音频文件相对 URL 路径，失败时返回空字符串 ""
        """
        text = normalize_tts_text(text)
        if not text:
            return ""

        # 构建安全文件名和路径
        tenant_dir = self.output_dir / tenant_id
        session_dir = tenant_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        mp3_path = session_dir / f"{seq:04d}.mp3"

        # 如果已存在则直接返回（幂等）
        if mp3_path.exists() and mp3_path.stat().st_size > 0:
            return self._build_url(tenant_id, session_id, seq)
        if mp3_path.exists():
            mp3_path.unlink(missing_ok=True)

        # ─── 调用 edge-tts ────────────────────────────────
        voices = [voice or self.voice, FALLBACK_VOICE]
        last_error: Exception | None = None
        for voice_name in dict.fromkeys(voices):
            for attempt in range(2):
                mp3_path.unlink(missing_ok=True)
                try:
                    communicate = edge_tts.Communicate(
                        text=text,
                        voice=voice_name,
                        rate=rate or self.rate,
                        pitch=pitch or self.pitch,
                    )
                    await communicate.save(str(mp3_path))
                    file_size = mp3_path.stat().st_size if mp3_path.exists() else 0
                    if file_size <= 0:
                        raise RuntimeError("edge-tts generated empty audio file")
                    if voice_name == FALLBACK_VOICE and voice_name != (voice or self.voice):
                        logger.info(f"TTS 备选语音成功: {mp3_path.name}")
                    logger.debug(f"TTS 生成完成: {mp3_path.name} ({file_size} bytes)")
                    return self._build_url(tenant_id, session_id, seq)
                except Exception as e:
                    last_error = e
                    logger.warning(f"TTS 生成失败 voice={voice_name} attempt={attempt + 1} [{text[:20]}...]: {e}")
                    await asyncio.sleep(0.2)

        if last_error:
            logger.error(f"TTS 全部失败: {last_error}")
        return ""

    def _build_url(self, tenant_id: str, session_id: str, seq: int) -> str:
        """构建音频相对 URL"""
        return f"/static/audio/{tenant_id}/{session_id}/{seq:04d}.mp3"

    async def generate_batch(
        self,
        sentences: list[str],
        tenant_id: str,
        session_id: str,
    ) -> list[tuple[int, str]]:
        """
        批量异步生成（并发，用于预热或批量场景）

        Returns:
            [(seq, audio_url), ...]
        """
        tasks = [
            self.generate_audio(text, tenant_id, session_id, i + 1)
            for i, text in enumerate(sentences)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        output = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                logger.error(f"批量 TTS [{i}] 失败: {r}")
                output.append((i + 1, ""))
            else:
                output.append((i + 1, r))
        return output

    def cleanup_old_files(self):
        """清理超时的临时音频文件（可配合定时任务调用）"""
        import time
        now = time.time()
        deleted = 0
        for mp3_file in self.output_dir.rglob("*.mp3"):
            if now - mp3_file.stat().st_mtime > self.cleanup_after:
                mp3_file.unlink()
                deleted += 1
        if deleted:
            logger.info(f"清理过期音频文件: {deleted} 个")
        return deleted


# ─── 独立测试 ─────────────────────────────────────────────
async def _test():
    gen = TTSGenerator(output_dir="./static/audio")
    url = await gen.generate_audio(
        text="你好，欢迎来到西湖景区！我是您的AI导游。",
        tenant_id="test",
        session_id="demo_session",
        seq=1,
    )
    if url:
        print(f"TTS 测试通过! 音频文件: ./static/audio/test/demo_session/0001.mp3")
    else:
        print("TTS 测试失败")


if __name__ == "__main__":
    asyncio.run(_test())
