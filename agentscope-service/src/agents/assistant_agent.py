"""
AssistantAgent - 辅助Agent

职责：
- 情感分析（正面/中性/负面，风险等级）
- 需求提取（产品/技术/服务类需求）
- 需求澄清（通过追问明确意图）
- 回复生成（友好、专业、简洁）

触发时机：所有对话场景
"""

from __future__ import annotations

from typing import Any
import json
import os
import time

from agentscope.agent import ReActAgent
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import OpenAIChatModel
from agentscope.tool import Toolkit

from src.tools.mcp_tools import BackendMCPClient
from src.tools.persistence import PersistenceClient
from src.memory.persistent_memory import PersistentMemory
from src.prompts.loader import prompt_registry
from src.prompts.agent_prompt import build_agent_prompt


# AssistantAgent的系统Prompt
ASSISTANT_AGENT_PROMPT = prompt_registry.get(
    "agents/assistant/base.md",
    fallback="""你是专业的售后客服助手。

目标：
- 快速识别情绪与风险
- 抽取客户需求与优先级
- 用最少的追问澄清关键缺口
- 生成可直接发送的友好回复

工作原则：
- 礼貌、有温度、同理心
- 简洁、易懂、避免堆叠术语
- 关键信息缺失时用问题最小化补齐
- 风险/投诉场景优先建议升级人工

可用工具（按需使用，默认不调用）：
- getCustomerProfile: 查看客户画像（MCP）
- searchKnowledge: 知识库检索（MCP）

说明：
- 情感/风险分析由模型自身推理完成，无需依赖外部工具。
- 只有在需要补充客户画像或知识库内容时才调用工具。

输出要求（强制）：
- 只输出JSON，禁止额外解释或Markdown
- 字段必须完整，类型必须正确
- clarification_questions 仅在需要时填写，否则为空数组
- suggested_reply 可直接发给客户，避免承诺无法保证的时效

JSON格式：

{
  "sentiment_analysis": {
    "sentiment": "positive/neutral/negative",
    "intensity": "calm/urgent/angry",
    "score": 0.0-1.0,
    "risk_level": "low/medium/high"
  },
  "requirement_extraction": [
    {
      "title": "需求名称",
      "category": "product/technical/service",
      "priority": "urgent/high/medium/low",
      "confidence": 0.0-1.0,
      "clarification_needed": true/false
    }
  ],
  "clarification_questions": ["问题1", "问题2"],
  "suggested_reply": "给客户的回复文本",
  "confidence": 0.0-1.0
}

示例对话：

用户："开票功能怎么用？"
助手输出：
{
  "sentiment_analysis": {
    "sentiment": "neutral",
    "intensity": "calm",
    "score": 0.8,
    "risk_level": "low"
  },
  "requirement_extraction": [
    {
      "title": "了解开票功能使用方法",
      "category": "product",
      "priority": "medium",
      "confidence": 0.9,
      "clarification_needed": false
    }
  ],
  "clarification_questions": [],
  "suggested_reply": "您可以在【财务管理】→【开票申请】中使用开票功能。选择发票类型后，填写开票信息即可提交。",
  "confidence": 0.92
}

用户："你们系统怎么这么烂！！！"
助手输出：
{
  "sentiment_analysis": {
    "sentiment": "negative",
    "intensity": "angry",
    "score": 0.2,
    "risk_level": "high"
  },
  "requirement_extraction": [
    {
      "title": "投诉系统问题",
      "category": "service",
      "priority": "urgent",
      "confidence": 0.8,
      "clarification_needed": true
    }
  ],
  "clarification_questions": [
    "请问您具体遇到了什么问题？",
    "是否可以描述一下错误提示或异常现象？"
  ],
  "suggested_reply": "非常抱歉给您带来不便！请问您具体遇到了什么问题？我会立即为您处理并上报。",
  "confidence": 0.65
}
""",
)


class AssistantAgent(ReActAgent):
    """
    辅助Agent - 通用客服助手

    负责常规对话的情感分析、需求识别和回复生成
    """

    def __init__(
        self,
        name: str,
        sys_prompt: str,
        model: OpenAIChatModel,
        formatter: OpenAIChatFormatter,
        toolkit: Toolkit,
        mcp_client: BackendMCPClient,
        persistence: PersistenceClient | None = None,
        memory: InMemoryMemory | None = None,
        max_iters: int = 6,
    ) -> None:
        super().__init__(
            name=name,
            sys_prompt=sys_prompt,
            model=model,
            formatter=formatter,
            toolkit=toolkit,
            memory=memory or InMemoryMemory(),
            max_iters=max_iters,
        )
        self.mcp_client = mcp_client
        self.persistence = persistence
        self._prompt_filename = "agents/assistant/base.md"

    async def __call__(self, msg: Msg) -> Msg:
        # Hot reload prompt on each call
        base_prompt = prompt_registry.get(self._prompt_filename, fallback=ASSISTANT_AGENT_PROMPT)
        if self.persistence:
            memory = PersistentMemory(
                self.persistence,
                msg.metadata.get("conversationId") if msg.metadata else None,
                self.name,
            )
            await memory.hydrate()
            self.memory = memory
        if os.getenv("AGENTSCOPE_PREFETCH_ENABLED", "false").lower() == "true":
            await self._prefetch_context(msg)
        combined_prompt = build_agent_prompt(base_prompt, "assistant", msg.metadata or {})
        self.sys_prompt = self._inject_prefetch_context(combined_prompt, msg.metadata or {})
        start = time.time()
        try:
            response = await super().__call__(msg)
            if self.persistence:
                await self.persistence.record_agent_call(
                    conversation_id=msg.metadata.get("conversationId") if msg.metadata else None,
                    agent_name=self.name,
                    agent_role="assistant",
                    mode=msg.metadata.get("mode") if msg.metadata else None,
                    status="success",
                    duration_ms=int((time.time() - start) * 1000),
                    input_payload={"content": msg.content},
                    output_payload={"content": response.content},
                    metadata=msg.metadata or {},
                )
            return response
        except Exception as exc:
            if self.persistence:
                await self.persistence.record_agent_call(
                    conversation_id=msg.metadata.get("conversationId") if msg.metadata else None,
                    agent_name=self.name,
                    agent_role="assistant",
                    mode=msg.metadata.get("mode") if msg.metadata else None,
                    status="error",
                    duration_ms=int((time.time() - start) * 1000),
                    input_payload={"content": msg.content},
                    error_message=str(exc),
                    metadata=msg.metadata or {},
                )
            raise

    async def _prefetch_context(self, msg: Msg) -> None:
        metadata = msg.metadata or {}
        prefetch: dict[str, Any] = {}
        try:
            prefetch["sentiment"] = await self.analyze_sentiment(msg)
        except Exception:
            pass
        customer_id = metadata.get("customerId")
        if customer_id:
            try:
                prefetch["customer_profile"] = await self.get_customer_profile(customer_id)
            except Exception:
                pass
        try:
            prefetch["knowledge"] = await self.mcp_client.call_tool(
                "searchKnowledge",
                query=msg.content,
                mode="semantic",
                filters={"limit": 5},
            )
        except Exception:
            pass
        if prefetch:
            metadata["prefetch"] = {**metadata.get("prefetch", {}), **prefetch}
            msg.metadata = metadata

    def _inject_prefetch_context(self, base_prompt: str, metadata: dict[str, Any]) -> str:
        prefetch = metadata.get("prefetch")
        if not prefetch:
            return base_prompt
        try:
            payload = json.dumps(prefetch, ensure_ascii=False, indent=2)
        except Exception:
            payload = str(prefetch)
        if len(payload) > 2000:
            payload = payload[:2000] + "...(truncated)"
        return (
            f"{base_prompt}\n\n已加载上下文(自动获取):\n```json\n{payload}\n```"
        )

    @classmethod
    async def create(
        cls,
        toolkit: Toolkit,
        mcp_client: BackendMCPClient,
        persistence: PersistenceClient | None = None,
    ) -> "AssistantAgent":
        """
        创建AssistantAgent实例

        Args:
            toolkit: 工具集（包含MCP工具）
            mcp_client: MCP客户端

        Returns:
            AssistantAgent实例
        """
        from src.config.settings import settings

        cfg = settings.deepseek_config
        model = OpenAIChatModel(
            model_name=cfg["model_name"],
            api_key=cfg["api_key"],
            stream=cfg.get("stream", True),
            client_kwargs={
                "base_url": cfg["base_url"],
                "timeout": cfg["timeout"]
            },
        )
        formatter = OpenAIChatFormatter()

        return cls(
            name="AssistantAgent",
            sys_prompt=prompt_registry.get("agents/assistant/base.md", fallback=ASSISTANT_AGENT_PROMPT),
            model=model,
            formatter=formatter,
            toolkit=toolkit,
            mcp_client=mcp_client,
            persistence=persistence,
            memory=InMemoryMemory(),
            max_iters=6,  # 最多6轮对话
        )

    async def analyze_sentiment(self, msg: Msg) -> dict[str, Any]:
        """
        情感分析（模型侧推理，无需MCP）

        Args:
            msg: 用户消息

        Returns:
            情感分析结果
        """
        content = msg.content or ""
        negative_keywords = ["烂", "差", "垃圾", "投诉", "退款", "不满意", "太差", "欺骗", "生气", "愤怒"]
        positive_keywords = ["谢谢", "很好", "满意", "赞", "表扬", "不错"]
        if any(kw in content for kw in negative_keywords):
            return {
                "sentiment": "negative",
                "intensity": "angry",
                "score": 0.2,
                "risk_level": "high",
            }
        if any(kw in content for kw in positive_keywords):
            return {
                "sentiment": "positive",
                "intensity": "calm",
                "score": 0.85,
                "risk_level": "low",
            }
        return {
            "sentiment": "neutral",
            "intensity": "calm",
            "score": 0.7,
            "risk_level": "low",
        }

    async def get_customer_profile(self, customer_id: str) -> dict[str, Any]:
        """
        获取客户画像

        Args:
            customer_id: 客户ID

        Returns:
            客户画像信息
        """
        try:
            profile = await self.mcp_client.call_tool(
                "getCustomerProfile",
                customerId=customer_id
            )
            return profile
        except Exception:
            return {}

    def should_escalate_to_human(self, analysis_result: dict[str, Any]) -> bool:
        """
        判断是否需要升级人工

        Args:
            analysis_result: 分析结果（包含情感、需求、置信度）

        Returns:
            是否需要升级人工
        """
        # 规则1: 高风险情感
        sentiment = analysis_result.get("sentiment_analysis", {})
        if sentiment.get("risk_level") == "high":
            return True
        if sentiment.get("sentiment") == "negative":
            return True

        # 规则2: 低置信度
        confidence = analysis_result.get("confidence", 1.0)
        if confidence < 0.7:
            return True

        # 规则3: 紧急需求
        requirements = analysis_result.get("requirement_extraction", [])
        for req in requirements:
            if req.get("priority") == "urgent":
                return True

        return False
