"""
InspectorAgent - 质检专员Agent

职责：
- 对话获取（从数据库获取完整对话历史）
- 质检评分（处理质量、合规性、专业度、语气）
- 质检报告生成（问题识别、改进建议）
- 客户调研回访（识别需要回访的对话）

触发时机：对话结束后（异步执行）
"""

from __future__ import annotations

from typing import Any
import json
import os
import os

from agentscope.agent import ReActAgent
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import OpenAIChatModel
from agentscope.tool import Toolkit

from src.tools.mcp_tools import BackendMCPClient
from src.prompts.loader import prompt_registry


# InspectorAgent的系统Prompt
INSPECTOR_AGENT_PROMPT = prompt_registry.get(
    "inspector_agent.md",
    fallback="""你是专业的质检专员。

核心职责：
1. 对话质量评估（处理质量、合规性、专业度）
2. 客户情绪分析（情绪变化、满意度预测）
3. 生成质检报告（问题识别、改进建议）
4. 客户回访建议

评估维度：
1. 处理质量（0-100分）
   - 回复完整性：30%
   - 专业度：30%
   - 合规性：20%
   - 语气语调：20%

2. 情绪改善（0-100%）
   - 对话前后情绪变化
   - 问题解决程度

3. 客户满意度（1-5星）
   - 基于对话质量预测

输出要求：
你必须输出JSON格式的结构化结果：

{
  "quality_score": 0-100,
  "dimensions": {
    "completeness": 0-100,
    "professionalism": 0-100,
    "compliance": 0-100,
    "tone": 0-100
  },
  "sentiment_improvement": 0-100,
  "customer_satisfaction_prediction": 1-5,
  "risk_indicators": ["标志1", "标志2"],
  "improvement_suggestions": ["建议1", "建议2"],
  "need_follow_up": true/false,
  "follow_up_reason": "回访原因",
  "survey_questions": ["问题1", "问题2"]
}

评分标准：

**完整性（Completeness）**：
- 90-100分：完整解决问题，提供详细信息
- 70-89分：基本解决问题，但缺少部分细节
- 50-69分：部分解决问题，存在明显遗漏
- <50分：未能有效解决问题

**专业度（Professionalism）**：
- 90-100分：专业术语使用准确，解释清晰
- 70-89分：专业度良好，偶尔有不当表述
- 50-69分：专业度一般，使用过多术语或表达不清
- <50分：专业度不足

**合规性（Compliance）**：
- 90-100分：完全符合规范，无违规内容
- 70-89分：基本合规，有轻微不规范
- 50-69分：存在明显不规范表述
- <50分：严重违规

**语气（Tone）**：
- 90-100分：友好、耐心、同理心强
- 70-89分：礼貌但略显生硬
- 50-69分：语气不当或缺少温度
- <50分：语气不佳

示例对话质检：

对话记录：
客户："系统报错了，怎么办？"
客服："请提供具体错误码。"
客户："500错误"
客服："这是服务器问题，我们已经在处理了。"

质检输出：
{
  "quality_score": 65,
  "dimensions": {
    "completeness": 60,
    "professionalism": 70,
    "compliance": 80,
    "tone": 50
  },
  "sentiment_improvement": 20,
  "customer_satisfaction_prediction": 2.5,
  "risk_indicators": [
    "回复过于简短，缺少安抚",
    "未提供预计解决时间"
  ],
  "improvement_suggestions": [
    "应主动安抚客户情绪：'非常抱歉给您带来不便'",
    "应提供更详细信息：预计解决时间、临时方案等",
    "语气应更友好，增加同理心表达"
  ],
  "need_follow_up": true,
  "follow_up_reason": "客户问题未完全解决，情绪改善不明显",
  "survey_questions": [
    "本次服务是否解决了您的问题？",
    "您对我们的响应速度是否满意？"
  ]
}
""",
)


class InspectorAgent(ReActAgent):
    """
    质检专员Agent - 质量评估专家

    负责对话质量评估和客户满意度分析（异步执行）
    """

    def __init__(
        self,
        name: str,
        sys_prompt: str,
        model: OpenAIChatModel,
        formatter: OpenAIChatFormatter,
        toolkit: Toolkit,
        mcp_client: BackendMCPClient,
        memory: InMemoryMemory | None = None,
        max_iters: int = 8,
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
        self._prompt_filename = "inspector_agent.md"

    async def __call__(self, msg: Msg) -> Msg:
        base_prompt = prompt_registry.get(self._prompt_filename, fallback=INSPECTOR_AGENT_PROMPT)
        if os.getenv("AGENTSCOPE_PREFETCH_ENABLED", "false").lower() == "true":
            await self._prefetch_context(msg)
        self.sys_prompt = self._inject_prefetch_context(base_prompt, msg.metadata or {})
        return await super().__call__(msg)

    async def _prefetch_context(self, msg: Msg) -> None:
        metadata = msg.metadata or {}
        prefetch: dict[str, Any] = {}
        conversation_id = metadata.get("conversationId") or msg.id
        try:
            prefetch["conversation_history"] = await self.get_conversation_history(conversation_id)
        except Exception:
            pass
        customer_id = metadata.get("customerId")
        if customer_id:
            try:
                prefetch["customer_history"] = await self.get_customer_history(customer_id)
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
        mcp_client: BackendMCPClient
    ) -> "InspectorAgent":
        """
        创建InspectorAgent实例

        Args:
            toolkit: 工具集（包含MCP工具）
            mcp_client: MCP客户端

        Returns:
            InspectorAgent实例
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
            name="InspectorAgent",
            sys_prompt=prompt_registry.get("inspector_agent.md", fallback=INSPECTOR_AGENT_PROMPT),
            model=model,
            formatter=formatter,
            toolkit=toolkit,
            mcp_client=mcp_client,
            memory=InMemoryMemory(),
            max_iters=8,
        )

    async def get_conversation_history(
        self,
        conversation_id: str
    ) -> list[dict[str, Any]]:
        """
        获取完整对话历史

        Args:
            conversation_id: 对话ID

        Returns:
            对话历史记录
        """
        try:
            # 通过MCP调用后端获取对话历史
            history = await self.mcp_client.call_tool(
                "getConversationHistory",
                conversationId=conversation_id,
                includeMetadata=True
            )
            return history if isinstance(history, list) else []
        except Exception as e:
            return [{
                "role": "system",
                "content": f"获取对话历史失败: {str(e)}"
            }]

    async def get_customer_history(self, customer_id: str) -> list[dict[str, Any]]:
        """
        获取客户历史对话记录

        Args:
            customer_id: 客户ID

        Returns:
            历史对话列表
        """
        try:
            history = await self.mcp_client.call_tool(
                "getCustomerHistory",
                customerId=customer_id,
                limit=10  # 最近10条对话
            )
            return history if isinstance(history, list) else []
        except Exception:
            return []

    async def save_quality_report(
        self,
        conversation_id: str,
        report: dict[str, Any]
    ) -> bool:
        """
        保存质检报告

        Args:
            conversation_id: 对话ID
            report: 质检报告

        Returns:
            是否保存成功
        """
        try:
            await self.mcp_client.call_tool(
                "saveQualityReport",
                conversationId=conversation_id,
                report=report
            )
            return True
        except Exception:
            return False

    async def create_survey_if_needed(
        self,
        customer_id: str,
        conversation_id: str,
        survey_questions: list[str]
    ) -> str | None:
        """
        创建客户调研（如果需要回访）

        Args:
            customer_id: 客户ID
            conversation_id: 对话ID
            survey_questions: 调研问题列表

        Returns:
            调研ID或None
        """
        try:
            result = await self.mcp_client.call_tool(
                "createSurvey",
                customerId=customer_id,
                conversationId=conversation_id,
                questions=survey_questions
            )
            return result.get("surveyId")
        except Exception:
            return None

    async def create_improvement_task_if_needed(
        self,
        conversation_id: str,
        quality_score: int,
        suggestions: list[str]
    ) -> str | None:
        """
        创建改进任务（如果质量评分过低）

        Args:
            conversation_id: 对话ID
            quality_score: 质量评分
            suggestions: 改进建议

        Returns:
            任务ID或None
        """
        # 质量评分低于70分创建改进任务
        if quality_score < 70:
            try:
                result = await self.mcp_client.call_tool(
                    "createTask",
                    title=f"质量改进-对话{conversation_id}",
                    priority="medium",
                    conversationId=conversation_id,
                    requirementId=None,
                )
                return result.get("taskId")
            except Exception:
                return None

        return None

    async def inspect_conversation(self, conversation_id: str) -> dict[str, Any]:
        """
        执行完整的质检流程

        Args:
            conversation_id: 对话ID

        Returns:
            质检报告
        """
        try:
            report = await self.mcp_client.call_tool(
                "inspectConversation",
                conversationId=conversation_id,
            )
            if isinstance(report, dict) and report:
                return report
        except Exception:
            pass

        # 1. 获取对话历史
        history = await self.get_conversation_history(conversation_id)

        # 2. 构造质检消息
        history_text = "\n".join([
            f"{msg.get('role', 'unknown')}: {msg.get('content', '')}"
            for msg in history
        ])

        inspect_msg = Msg(
            name="system",
            content=f"请对以下对话进行质检评分：\n\n{history_text}",
            role="system",
            metadata={"conversationId": conversation_id}
        )

        # 3. Agent执行质检（调用父类reply方法，LLM会生成结构化报告）
        result = await self.reply(inspect_msg)

        # 4. 解析结果（假设LLM返回JSON格式）
        try:
            import json
            report = json.loads(result.content)
        except Exception:
            # 如果解析失败，返回默认报告
            report = {
                "quality_score": 0,
                "dimensions": {
                    "completeness": 0,
                    "professionalism": 0,
                    "compliance": 0,
                    "tone": 0
                },
                "sentiment_improvement": 0,
                "customer_satisfaction_prediction": 0,
                "risk_indicators": ["质检失败"],
                "improvement_suggestions": ["无法生成建议"],
                "need_follow_up": False,
                "follow_up_reason": "",
                "survey_questions": []
            }

        # 5. 保存质检报告
        await self.save_quality_report(conversation_id, report)

        # 6. 后续动作
        # 如果需要回访，创建调研
        if report.get("need_follow_up"):
            customer_id = history[0].get("metadata", {}).get("customerId")
            if customer_id:
                await self.create_survey_if_needed(
                    customer_id,
                    conversation_id,
                    report.get("survey_questions", [])
                )

        # 如果质量评分过低，创建改进任务
        await self.create_improvement_task_if_needed(
            conversation_id,
            report.get("quality_score", 0),
            report.get("improvement_suggestions", [])
        )

        return report

    async def generate_report(self, inspection_data: dict[str, Any]) -> dict[str, Any]:
        """
        生成质检报告（调用MCP工具）

        Args:
            inspection_data: 质检数据

        Returns:
            报告内容
        """
        return await self.mcp_client.call_tool(
            "generateQualityReport",
            inspection=inspection_data,
        )

    def should_create_follow_up_task(self, inspection_result: dict[str, Any]) -> bool:
        """
        判断是否需要创建跟进任务

        规则：
        - 质量评分低于0.7
        - 情感改善为负
        - 存在问题项
        """
        quality_score = float(inspection_result.get("quality_score", 1.0))
        sentiment_improvement = float(inspection_result.get("sentiment_improvement", 0.0))
        issues = inspection_result.get("issues") or []
        return quality_score < 0.7 or sentiment_improvement < 0 or len(issues) > 0
