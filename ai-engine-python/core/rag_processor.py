"""
RAG 检索处理器 — 多租户知识检索 + 错峰调度 Prompt 干预

核心职责：
  1. 根据 tenant_id 动态路由检索对应租户的知识库分区
  2. 从 Java 后端获取景区实时客流热力值
  3. 自动改写 System Prompt 权重，引导游客错峰游览
  4. 将检索到的知识片段注入 Prompt 上下文

设计原则：
  - 多租户隔离：每个 tenant_id 对应独立的知识库分区
  - 错峰调度策略：拥挤度 > 阈值 → 自动推荐替代路线
  - 完全异步 HTTP 调用，不阻塞主流程
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger("ai-engine.rag")

# ─── 错峰调度阈值配置 ─────────────────────────────────────
CROWD_THRESHOLD_HIGH = 4      # 拥挤度 >= 4 触发强错峰
CROWD_THRESHOLD_MEDIUM = 3    # 拥挤度 >= 3 触发温和提示

# ─── 知识库降级提示（仅用于后端完全不可用时的兜底） ─────────
FALLBACK_KNOWLEDGE: list[str] = [
    "欢迎来到智慧景区！我是您的AI导览助手，请随时向我提问。",
    "景区开放时间为每天8:00-18:00，节假日可能延长。",
    "请爱护景区环境，不随手丢弃垃圾。",
]


class RAGProcessor:
    """
    多租户 RAG 处理器

    使用示例：
        rag = RAGProcessor(backend_base_url="http://localhost:9000")
        system_prompt = await rag.build_system_prompt(
            tenant_id="west_lake",
            user_query="推荐一条不挤的路线",
        )
    """

    def __init__(self, backend_base_url: str = "http://localhost:9000"):
        self.backend_base_url = backend_base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """懒加载 httpx 异步客户端"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(2.0))
        return self._client

    async def build_system_prompt(
        self,
        tenant_id: str,
        user_query: str,
        persona_prompt: str | None = None,
    ) -> str:
        """
        构建包含 RAG 知识 + 错峰指令 + 人设的完整 System Prompt

        Args:
            tenant_id: 租户ID（如 "west_lake"）
            user_query: 游客原始提问
            persona_prompt: 景区人设 Prompt（覆盖默认导览角色）

        Returns:
            完整的系统提示词字符串
        """
        # ─── 并行获取：知识 + 客流数据 ─────────────────────
        import asyncio
        knowledge_task = self._retrieve_knowledge(tenant_id, user_query)
        crowd_task = self._fetch_crowd_data(tenant_id)
        knowledge, crowd_data = await asyncio.gather(knowledge_task, crowd_task)

        # ─── 组装 System Prompt ────────────────────────────
        if persona_prompt:
            prompt_parts = [persona_prompt, ""]
        else:
            prompt_parts = [
                "你是一个专业的智慧景区AI导览助手。",
                "请用自然、口语化、热情的中文回答游客问题。",
                "每句话保持简洁，不超过40个字，方便语音播报。",
                "",
            ]

        # 注入租户知识
        if knowledge:
            prompt_parts.append("【景区知识库】")
            prompt_parts.append(f"你服务的景区是：{tenant_id}")
            for i, fact in enumerate(knowledge, 1):
                prompt_parts.append(f"{i}. {fact}")
            prompt_parts.append("")

        # 注入错峰调度指令
        crowd_strategy = self._build_crowd_strategy(crowd_data)
        if crowd_strategy:
            prompt_parts.append(crowd_strategy)

        # 输出格式约束
        prompt_parts.extend([
            "【回答要求】",
            "1. 如果游客在问路线或游览问题，结合知识库信息回答；",
            "2. 如果知识库没有相关信息，请基于常识友好回答；",
            "3. 不要提及'根据知识库'或'我在系统中查到'之类的元信息；",
            "4. 围绕景区导览主题，不要偏离到无关话题。",
            "5. 用自然流畅的口语表达，像真人导游一样娓娓道来，可以讲述完整的段落。",
        ])

        return "\n".join(prompt_parts)

    async def _retrieve_knowledge(
        self,
        tenant_id: str,
        query: str,
    ) -> list[str]:
        """
        检索租户知识库

        策略（三层降级）：
          1. 尝试从 Java 后端 MySQL 全文检索获取知识块
          2. 失败 → 读取本地 import_knowledge.py 生成的 JSON 文件
          3. 再失败 → 使用通用兜底知识（无租户定制信息）
        """
        # ─── Layer 1: Java 后端 ES 检索 ───────────────────
        try:
            client = await self._get_client()
            resp = await client.post(
                f"{self.backend_base_url}/api/admin/knowledge/search",
                json={
                    "tenant_id": tenant_id,
                    "query": query,
                    "top_k": 5,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                chunks = data.get("data", {}).get("chunks", [])
                if chunks:
                    logger.info(f"ES 检索命中: {len(chunks)} 条")
                    return [c.get("content", "") for c in chunks[:5]]
        except Exception as e:
            logger.warning(f"后端 ES 检索不可用: {e}")

        # ─── Layer 2: 本地 JSON 知识库文件 ────────────────
        local_chunks = self._load_local_knowledge_json(tenant_id, query)
        if local_chunks:
            logger.info(f"本地 JSON 知识库命中: {len(local_chunks)} 条")
            return local_chunks

        # ─── Layer 3: 通用兜底知识（无租户定制信息） ───────
        logger.info(f"使用通用兜底知识库: {len(FALLBACK_KNOWLEDGE)} 条")
        return list(FALLBACK_KNOWLEDGE)

    @staticmethod
    def _load_local_knowledge_json(tenant_id: str, query: str, top_k: int = 5) -> list[str]:
        """
        从本地 JSON 知识库文件中检索

        文件路径: data/knowledge/{tenant_id}.json
        检索策略: 关键词匹配（简易版，不做向量检索）
        """
        json_path = Path(f"data/knowledge/{tenant_id}.json")
        if not json_path.exists():
            return []

        try:
            with open(json_path, "r", encoding="utf-8") as f:
                knowledge = json.load(f)

            chunks = knowledge.get("chunks", [])
            if not chunks:
                return []

            # ─── 简易关键词检索 ────────────────────────────
            # 对 query 分词（中英文混合），计算每个 chunk 的命中数
            query_terms = re.findall(r"[\u4e00-\u9fff]+|[a-zA-Z]+", query.lower())

            scored = []
            for chunk in chunks:
                content = chunk.get("content", "")
                if not content:
                    continue
                score = sum(
                    1 for term in query_terms if term in content.lower()
                )
                if score > 0:
                    scored.append((score, content))

            # 按得分降序，取 top_k
            scored.sort(key=lambda x: x[0], reverse=True)
            return [content for _, content in scored[:top_k]]

        except Exception as e:
            logger.warning(f"读取本地知识库失败: {e}")
            return []

    async def _fetch_crowd_data(self, tenant_id: str) -> dict:
        """
        从 Java 后端获取景区实时客流热力数据

        Returns:
            {
                "level": 1-5 拥挤等级,
                "peak_pois": [{"name": "雷峰塔", "level": 5}, ...],
                "recommendations": ["推荐前往孤山", ...],
            }
        """
        try:
            client = await self._get_client()
            resp = await client.get(
                f"{self.backend_base_url}/api/v1/info/realtime",
                headers={"X-Tenant-Id": tenant_id},
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                return {
                    "level": data.get("crowdedness_level", 1),
                    "peak_pois": [
                        {"name": pid, "level": data.get("crowdedness_level", 1)}
                        for pid in data.get("peak_pois", [])
                    ],
                    "recommendations": data.get("announcements", []),
                }
        except Exception as e:
            logger.warning(f"客流数据获取失败（降级为无数据）: {e}")

        # 降级：返回空数据（不影响主流程）
        return {"level": 1, "peak_pois": [], "recommendations": []}

    def _build_crowd_strategy(self, crowd_data: dict) -> str:
        """
        根据客流热力数据生成错峰调度 Prompt 策略

        策略逻辑：
          - crowd_level >= 4：强错峰 → System Prompt 中明确建议绕行
          - crowd_level >= 3：温和提示 → 提醒游客注意
          - crowd_level < 3：不干预
        """
        level = crowd_data.get("level", 1)
        peak_pois = crowd_data.get("peak_pois", [])
        recommendations = crowd_data.get("recommendations", [])

        if level < CROWD_THRESHOLD_MEDIUM:
            return ""  # 不干预

        strategy_lines = ["【实时错峰调度指令 - 高优先级】"]

        if level >= CROWD_THRESHOLD_HIGH:
            strategy_lines.append(
                f"⚠️ 当前景区整体拥挤等级为 {level}/5，部分地区非常拥挤。"
            )
            strategy_lines.append(
                "当游客咨询路线时，你必须主动提醒拥挤情况，并推荐替代景点或错峰时间段。"
            )
        else:
            strategy_lines.append(
                f"当前景区部分区域拥挤度较高（等级 {level}/5）。"
            )
            strategy_lines.append(
                "当游客咨询到拥挤景点时，温和提示他们可以选择稍晚再前往。"
            )

        # 拥挤 POI 列表
        if peak_pois:
            crowded_names = ", ".join(
                [p.get("name", "未知景点") for p in peak_pois[:3]]
            )
            strategy_lines.append(f"当前拥挤的热门景点：{crowded_names}。")

        # 官方推荐公告
        if recommendations:
            rec_text = "；".join(recommendations[:3])
            strategy_lines.append(f"景区官方建议：{rec_text}。")

        strategy_lines.append(
            "请在回答中自然地融入错峰建议，不要让游客觉得是机器人的生硬指令。"
        )

        return "\n".join(strategy_lines)

    async def close(self):
        """关闭 HTTP 客户端"""
        if self._client:
            await self._client.aclose()
            self._client = None


# ─── 独立测试 ─────────────────────────────────────────────
async def _test():
    rag = RAGProcessor(backend_base_url="http://localhost:9000")

    # 测试 1：正常知识检索
    prompt = await rag.build_system_prompt(
        tenant_id="west_lake",
        user_query="介绍一下雷峰塔",
    )
    print("=" * 60)
    print("System Prompt (正常检索):")
    print("=" * 60)
    print(prompt[:500])

    # 测试 2：错峰调度
    print("\n" + "=" * 60)
    print("错峰策略测试:")
    print("=" * 60)
    test_crowd = {
        "level": 5,
        "peak_pois": [
            {"name": "雷峰塔", "level": 5},
            {"name": "断桥", "level": 4},
        ],
        "recommendations": ["推荐前往孤山，人流较少", "下午3点后雷峰塔人流下降"],
    }
    strategy = rag._build_crowd_strategy(test_crowd)
    print(strategy)

    await rag.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(_test())