"""
多租户数字人配置加载器
======================
从 digital_human_profiles.json 读取每个景区的定制配置，
供 AI 引擎（TTS语音、Persona Prompt）和数字人渲染（照片、背景）使用。

使用方式:
  from config.profile_loader import ProfileLoader
  loader = ProfileLoader()
  profile = loader.get("west_lake")
  # → {"face_image": "...", "tts_voice": "zh-CN-XiaoxiaoNeural", ...}
"""

import json
import os
from pathlib import Path
from typing import Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "digital_human_profiles.json")

# 可用的 edge-tts 中文语音列表（供前端选择）
AVAILABLE_VOICES = [
    {"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓", "gender": "女", "style": "活泼自然"},
    {"id": "zh-CN-YunxiNeural", "name": "云希", "gender": "男", "style": "温润青年"},
    {"id": "zh-CN-XiaohanNeural", "name": "晓涵", "gender": "女", "style": "温柔细腻"},
    {"id": "zh-CN-YunyangNeural", "name": "云扬", "gender": "男", "style": "沉稳大气"},
    {"id": "zh-CN-YunjianNeural", "name": "云健", "gender": "男", "style": "活力运动"},
    {"id": "zh-CN-XiaoyiNeural", "name": "晓伊", "gender": "女", "style": "成熟知性"},
    {"id": "zh-CN-XiaochenNeural", "name": "晓辰", "gender": "女", "style": "清新自然"},
    {"id": "zh-CN-XiaoshuangNeural", "name": "晓双", "gender": "女", "style": "甜美可爱"},
]


class ProfileLoader:
    """多租户数字人配置加载器"""

    def __init__(self, config_path: str = CONFIG_PATH):
        self.config_path = config_path
        self._profiles = None

    def _load(self) -> dict:
        """懒加载 JSON 配置文件"""
        if self._profiles is not None:
            return self._profiles

        if not os.path.exists(self.config_path):
            # 返回最小默认配置
            self._profiles = {
                "default": {
                    "tts_voice": "zh-CN-XiaoxiaoNeural",
                    "tts_rate": "+10%",
                    "tts_pitch": "+0Hz",
                    "persona_name": "小灵",
                    "persona_prompt": "你是一个专业的智慧景区AI导览助手。",
                    "face_image": None,
                    "background_image": None,
                    "expression_scale": 1.0,
                    "head_still": False,
                }
            }
            return self._profiles

        with open(self.config_path, "r", encoding="utf-8") as f:
            self._profiles = json.load(f)
        return self._profiles

    def get(self, tenant_id: str = "default") -> dict:
        """
        获取指定租户的数字人配置

        Args:
            tenant_id: 租户ID（如 "west_lake"）

        Returns:
            配置字典，若租户不存在则返回 default 配置
        """
        profiles = self._load()
        return profiles.get(tenant_id, profiles.get("default", {}))

    def get_tts_voice(self, tenant_id: str = "default") -> str:
        """获取租户的 TTS 语音 ID"""
        return self.get(tenant_id).get("tts_voice", "zh-CN-XiaoxiaoNeural")

    def get_tts_rate(self, tenant_id: str = "default") -> str:
        """获取租户的语速"""
        return self.get(tenant_id).get("tts_rate", "+10%")

    def get_tts_pitch(self, tenant_id: str = "default") -> str:
        """获取租户的音高"""
        return self.get(tenant_id).get("tts_pitch", "+0Hz")

    def get_persona_prompt(self, tenant_id: str = "default") -> str:
        """获取租户的人设 Prompt"""
        return self.get(tenant_id).get(
            "persona_prompt",
            "你是一个专业的智慧景区AI导览助手。请用自然口语化的中文回答游客问题。",
        )

    def get_persona_name(self, tenant_id: str = "default") -> str:
        """获取租户的数字人姓名"""
        return self.get(tenant_id).get("persona_name", "小灵")

    def get_face_image(self, tenant_id: str = "default") -> Optional[str]:
        """
        获取租户的数字人头像文件名（相对于 assets/faces/ 目录）

        如果配置的是相对路径，自动拼接完整路径。
        """
        profile = self.get(tenant_id)
        face = profile.get("face_image")
        if not face:
            return None
        # 返回相对于 digital-human 目录的路径
        return os.path.join(SCRIPT_DIR, "..", "assets", "faces", face)

    def get_background_image(self, tenant_id: str = "default") -> Optional[str]:
        """获取租户的背景图文件名"""
        bg = self.get(tenant_id).get("background_image")
        if not bg:
            return None
        return os.path.join(SCRIPT_DIR, "..", "assets", "backgrounds", bg)

    def get_expression_scale(self, tenant_id: str = "default") -> float:
        """获取表情强度"""
        return self.get(tenant_id).get("expression_scale", 1.0)

    def get_head_still(self, tenant_id: str = "default") -> bool:
        """是否减少头部运动"""
        return self.get(tenant_id).get("head_still", False)

    def list_tenants(self) -> list[str]:
        """列出所有已配置的租户"""
        profiles = self._load()
        return [k for k in profiles.keys() if not k.startswith("_")]


# ─── 独立测试 ─────────────────────────────────────────────
if __name__ == "__main__":
    loader = ProfileLoader()
    print("已配置租户:", loader.list_tenants())
    print()

    for tid in loader.list_tenants():
        profile = loader.get(tid)
        print(f"🏛️  {tid}")
        print(f"   人设名称: {profile.get('persona_name')}")
        print(f"   语音: {profile.get('tts_voice')}")
        print(f"   语速: {profile.get('tts_rate')}")
        print(f"   照片: {profile.get('face_image')}")
        print(f"   背景: {profile.get('background_image')}")
        print(f"   表情强度: {profile.get('expression_scale')}")
        print()