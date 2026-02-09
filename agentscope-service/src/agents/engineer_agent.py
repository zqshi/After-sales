"""
EngineerAgent - 售后工程师主Agent

职责：
- 故障诊断（根据症状分析根本原因）
- 知识库检索（TaxKB相似案例、技术文档）
- 工单检索（历史类似问题）
- 故障报告输出（技术细节、解决方案）

触发时机：故障场景（报错、异常、功能失效）
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


# EngineerAgent的系统Prompt
ENGINEER_AGENT_PROMPT = prompt_registry.get(
    "agents/engineer/base.md",
    fallback="""你是专业的售后工程师。

目标：
- 快速定位根因，评估影响与严重性
- 给出可执行、分步骤的解决方案
- 输出结构化技术报告，便于交付与升级

工作流程：
1. 关键信息收集（现象/时间/环境/错误码/影响范围）
2. 结合上下文与工具结果进行排查
3. 根因分析（前端/后端/网络/数据/配置）
4. 方案生成（临时方案 + 根本修复）
5. 严重性评级与是否升级

严重性分级：
- P0: 系统宕机或关键业务大面积不可用
- P1: 核心功能严重受损，影响部分用户
- P2: 非核心功能异常，有替代或临时方案
- P3: 小问题，可绕过，不影响主流程
- P4: 优化建议/体验提升

可用工具（按需使用）：
- searchKnowledge: TaxKB知识库检索（MCP）
- searchTickets: 历史工单检索（MCP）
- getSystemStatus: 系统状态查询（MCP）
- createTask: 创建工单（P0/P1自动创建）（MCP）

输出要求（强制）：
- 只输出JSON，禁止额外解释或Markdown
- solution_steps 必须可执行、可验证
- technical_report 使用Markdown，但作为JSON字段值输出
- 信息不足时，在 suggested_reply 中提出最关键的补充问题

JSON格式：

{
  "fault_diagnosis": {
    "severity": "P0/P1/P2/P3/P4",
    "root_cause": "根本原因分析",
    "affected_scope": "影响范围（用户数、功能）",
    "solution_steps": ["步骤1", "步骤2", "步骤3"],
    "temporary_solution": "临时解决方案（可选）",
    "estimated_time": "预计解决时间",
    "need_escalation": true/false
  },
  "knowledge_results": [
    {
      "title": "知识库标题",
      "content": "内容摘要",
      "relevance": 0.0-1.0
    }
  ],
  "similar_tickets": [
    {
      "ticket_id": "工单ID",
      "resolution": "解决方案",
      "time_spent": "耗时"
    }
  ],
  "technical_report": "详细技术报告（Markdown格式）",
  "suggested_reply": "给客户的技术回复",
  "confidence": 0.0-1.0
}

示例对话：

用户："系统报500错误，无法登录"
工程师输出：
{
  "fault_diagnosis": {
    "severity": "P0",
    "root_cause": "认证服务宕机，数据库连接池耗尽",
    "affected_scope": "所有用户，登录功能完全不可用",
    "solution_steps": [
      "1. 重启认证服务（容器：auth-service）",
      "2. 扩容数据库连接池（从50→200）",
      "3. 检查Redis缓存状态"
    ],
    "temporary_solution": "清理浏览器缓存后重试",
    "estimated_time": "15分钟",
    "need_escalation": true
  },
  "knowledge_results": [
    {
      "title": "认证服务故障排查指南",
      "content": "认证服务常见故障原因包括数据库连接池耗尽、Redis缓存失效等...",
      "relevance": 0.95
    }
  ],
  "similar_tickets": [
    {
      "ticket_id": "ISSUE-1234",
      "resolution": "重启服务+扩容连接池",
      "time_spent": "20分钟"
    }
  ],
  "technical_report": "## 故障分析报告\\n\\n### 根本原因\\n认证服务在高并发下数据库连接池耗尽...",
  "suggested_reply": "这是认证服务问题，技术团队已紧急处理。预计15分钟内恢复，请稍候重试。",
  "confidence": 0.88
}

用户："导出Excel一直失败"
工程师输出：
{
  "fault_diagnosis": {
    "severity": "P2",
    "root_cause": "大数据量导出超时，未启用异步导出",
    "affected_scope": "部分用户，导出大数据量时失败",
    "solution_steps": [
      "1. 启用异步导出功能",
      "2. 设置数据量上限（5000条/次）",
      "3. 添加导出进度提示"
    ],
    "temporary_solution": "使用筛选功能减少导出数据量",
    "estimated_time": "2小时",
    "need_escalation": false
  },
  "knowledge_results": [
    {
      "title": "Excel导出性能优化",
      "content": "大数据量导出建议使用异步导出...",
      "relevance": 0.88
    }
  ],
  "similar_tickets": [
    {
      "ticket_id": "ISSUE-567",
      "resolution": "启用异步导出",
      "time_spent": "2小时"
    }
  ],
  "technical_report": "## 故障分析\\n\\n导出功能在数据量超过1000条时超时...",
  "suggested_reply": "导出大量数据时可能会超时。临时方案：请使用筛选功能减少导出数据量。我们会尽快优化导出功能。",
  "confidence": 0.82
}
""",
)


class EngineerAgent(ReActAgent):
    """
    工程师Agent - 技术专家

    负责故障诊断和技术问题解决
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
        max_iters: int = 10,
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
        self._prompt_filename = "agents/engineer/base.md"

    async def __call__(self, msg: Msg) -> Msg:
        base_prompt = prompt_registry.get(self._prompt_filename, fallback=ENGINEER_AGENT_PROMPT)
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
        combined_prompt = build_agent_prompt(base_prompt, "engineer", msg.metadata or {})
        self.sys_prompt = self._inject_prefetch_context(combined_prompt, msg.metadata or {})
        start = time.time()
        try:
            response = await super().__call__(msg)
            if self.persistence:
                await self.persistence.record_agent_call(
                    conversation_id=msg.metadata.get("conversationId") if msg.metadata else None,
                    agent_name=self.name,
                    agent_role="engineer",
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
                    agent_role="engineer",
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
            prefetch["system_status"] = await self.mcp_client.call_tool(
                "getSystemStatus",
                includeStats=False,
            )
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
        try:
            prefetch["similar_tickets"] = await self.mcp_client.call_tool(
                "searchTickets",
                query=msg.content,
                limit=5,
                offset=0,
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
    ) -> "EngineerAgent":
        """
        创建EngineerAgent实例

        Args:
            toolkit: 工具集（包含MCP工具）
            mcp_client: MCP客户端

        Returns:
            EngineerAgent实例
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
            name="EngineerAgent",
            sys_prompt=prompt_registry.get("agents/engineer/base.md", fallback=ENGINEER_AGENT_PROMPT),
            model=model,
            formatter=formatter,
            toolkit=toolkit,
            mcp_client=mcp_client,
            persistence=persistence,
            memory=InMemoryMemory(),
            max_iters=10,  # 故障诊断可能需要更多轮推理
        )

    async def search_knowledge(
        self,
        query: str,
        category: str = "fault"
    ) -> list[dict[str, Any]]:
        """
        检索知识库

        Args:
            query: 检索关键词
            category: 知识库分类（fault/faq/guide）

        Returns:
            知识库检索结果
        """
        try:
            results = await self.mcp_client.call_tool(
                "searchKnowledge",
                query=query,
                filters={"category": category},
                mode="semantic",
            )
            return results if isinstance(results, list) else [results]
        except Exception as e:
            return []

    async def search_similar_tickets(self, issue_desc: str) -> list[dict[str, Any]]:
        """
        检索历史类似工单

        Args:
            issue_desc: 问题描述

        Returns:
            类似工单列表
        """
        try:
            # 注意：searchTickets工具可能尚未实现，需要在MCP中添加
            results = await self.mcp_client.call_tool(
                "searchTickets",
                query=issue_desc,
                limit=5
            )
            return results if isinstance(results, list) else []
        except Exception:
            # 降级：返回空列表
            return []

    async def create_ticket_if_needed(
        self,
        fault_diagnosis: dict[str, Any],
        conversation_id: str
    ) -> str | None:
        """
        根据故障严重性自动创建工单

        Args:
            fault_diagnosis: 故障诊断结果
            conversation_id: 对话ID

        Returns:
            工单ID（如果创建了）或None
        """
        severity = fault_diagnosis.get("severity")

        # P0/P1自动创建工单
        if severity in ["P0", "P1"]:
            try:
                task_result = await self.mcp_client.call_tool(
                    "createTask",
                    title=f"{severity}故障-{fault_diagnosis.get('root_cause', '未知原因')}",
                    priority="urgent" if severity == "P0" else "high",
                    conversationId=conversation_id,
                    requirementId=None,
                )
                return task_result.get("taskId")
            except Exception:
                return None

        return None

    def assess_severity(self, fault_description: str) -> str:
        """
        评估故障严重性（简单启发式）

        Args:
            fault_description: 故障描述

        Returns:
            严重性等级（P0-P4）
        """
        # P0关键词
        p0_keywords = ["宕机", "崩溃", "所有用户", "完全不可用", "无法访问"]
        # P1关键词
        p1_keywords = ["核心功能", "无法", "失败", "500", "错误"]
        # P2关键词
        p2_keywords = ["异常", "问题", "不正常"]

        desc_lower = fault_description.lower()

        if any(kw in desc_lower for kw in p0_keywords):
            return "P0"
        if any(kw in desc_lower for kw in p1_keywords):
            return "P1"
        if any(kw in desc_lower for kw in p2_keywords):
            return "P2"

        return "P3"
