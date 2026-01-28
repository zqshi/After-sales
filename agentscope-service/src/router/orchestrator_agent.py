"""
OrchestratorAgent - 智能协调器

升级自AdaptiveRouter，新增功能：
1. Agent Chain（链式调用）- 多个Agent按顺序协作
2. Agent Team（团队协作）- 多个Agent并行处理
3. 智能路由决策 - 根据请求复杂度选择执行模式
4. 结果聚合 - 整合多Agent输出

架构模式：
- Simple: 单Agent直接处理
- Chain: Agent1 → Agent2 → Agent3 串行
- Team: Agent1 + Agent2 + Agent3 并行（使用MsgHub）
- Supervised: Agent处理 + Human审核
"""

from __future__ import annotations

import asyncio
from typing import Any

from agentscope.message import Msg
from agentscope.pipeline import MsgHub

from src.agents.assistant_agent import AssistantAgent
from src.agents.engineer_agent import EngineerAgent
from src.agents.human_agent_adapter import HumanAgentAdapter
from src.tools.mcp_tools import BackendMCPClient
from src.prompts.loader import prompt_registry


ORCHESTRATOR_AGENT_PROMPT = prompt_registry.get(
    "orchestrator_agent.md",
    fallback="""你是智能协调器，负责路由与编排多个Agent协作。
核心任务：
1. 识别场景与复杂度
2. 选择执行模式（simple/parallel/agent_supervised/human_first）
3. 汇总结果并输出可执行建议
""",
)


class OrchestratorAgent:
    """
    智能协调Agent - 管理多Agent协作

    职责：
    1. 请求分类和复杂度分析
    2. Agent选择和调度
    3. 执行模式决策（Simple/Chain/Team/Supervised）
    4. 结果聚合和质量控制
    """

    def __init__(
        self,
        assistant_agent: AssistantAgent,
        engineer_agent: EngineerAgent,
        human_agent: HumanAgentAdapter,
        mcp_client: BackendMCPClient,
        ws_manager: Any,
    ) -> None:
        # 核心Agent集合（3个独立Agent）
        self.assistant_agent = assistant_agent
        self.engineer_agent = engineer_agent
        self.human_agent = human_agent

        # 基础设施
        self.mcp_client = mcp_client
        self.ws_manager = ws_manager

    async def route(self, user_msg: Msg) -> Msg:
        """
        智能路由主入口

        决策流程：
        1. 分析请求特征（复杂度、情感、客户类型）
        2. 选择执行模式（Simple/Chain/Team/Supervised）
        3. 执行并返回结果
        """
        # Step 1: 请求分析
        analysis = await self._analyze_request(user_msg)
        metadata = user_msg.metadata or {}
        requested_mode = metadata.get("mode")
        async_review = bool(metadata.get("async_review"))

        # Step 2: 执行模式决策
        mode = self._decide_execution_mode(analysis)
        if requested_mode in ["agent_auto", "agent_supervised", "human_first"]:
            mode = requested_mode

        # Step 3: 根据模式执行
        if mode == "human_first":
            return await self._human_first_mode(user_msg, analysis, async_review)
        elif mode == "parallel":
            # 并行模式：辅助+工程师并行处理
            return await self._execute_parallel(user_msg, analysis)
        elif mode == "agent_supervised":
            return await self._agent_supervised_mode(user_msg, async_review)
        else:  # simple
            return await self._execute_simple(user_msg)

    async def _analyze_request(self, msg: Msg) -> dict[str, Any]:
        """
        全面分析请求

        返回:
        {
            "complexity": 0.0-1.0,  # 复杂度
            "sentiment": {...},      # 情感分析结果
            "customer": {...},       # 客户画像
            "has_requirement": bool, # 是否包含需求
            "risk_level": "low/medium/high"
        }
        """
        # 并行执行多个分析任务
        sentiment_task = self._analyze_sentiment(msg)
        customer_task = self._get_customer_info(msg)
        complexity_task = asyncio.to_thread(self._analyze_complexity, msg)

        sentiment, customer, complexity = await asyncio.gather(
            sentiment_task,
            customer_task,
            complexity_task,
            return_exceptions=True,
        )

        # 处理异常结果
        if isinstance(sentiment, Exception):
            sentiment = {"overallSentiment": "neutral", "riskLevel": "low", "score": 0.7}
        if isinstance(customer, Exception):
            customer = {}
        if isinstance(complexity, Exception):
            complexity = 0.5

        # 简单启发式判断是否包含需求
        has_requirement = any(
            keyword in msg.content for keyword in ["需要", "希望", "想要", "能不能", "可以吗"]
        )

        # 场景识别
        scenario = self._identify_scenario(msg, {
            "complexity": complexity,
            "sentiment": sentiment,
            "has_requirement": has_requirement
        })

        return {
            "complexity": complexity,
            "sentiment": sentiment,
            "customer": customer,
            "has_requirement": has_requirement,
            "risk_level": sentiment.get("riskLevel", "low"),
            "scenario": scenario,
        }

    def _identify_scenario(self, msg: Msg, analysis: dict[str, Any]) -> str:
        """
        场景识别

        Args:
            msg: 用户消息
            analysis: 初步分析结果

        Returns:
            场景类型：
            - "consultation": 常规咨询
            - "fault": 故障诊断
            - "complaint": 投诉
        """
        content = msg.content.lower()

        # 故障关键词
        fault_keywords = [
            "报错", "错误", "异常", "崩溃", "无法", "失败",
            "500", "404", "403", "宕机", "卡顿", "白屏"
        ]

        # 投诉关键词
        complaint_keywords = [
            "投诉", "不满意", "差评", "要求退款", "退款",
            "质量差", "服务差", "太差", "服务太差", "欺骗"
        ]

        # 检查故障场景
        if any(kw in content for kw in fault_keywords):
            return "fault"

        # 检查投诉场景
        if any(kw in content for kw in complaint_keywords):
            return "complaint"

        # 默认：常规咨询
        return "consultation"

    def _decide_execution_mode(self, analysis: dict[str, Any]) -> str:
        """
        决策执行模式（增强版 - 支持场景识别）

        规则：
        1. 高风险/VIP客户 → human_first
        2. 故障场景 → parallel（辅助+工程师并行）
        3. 投诉场景 → human_first
        4. 高复杂度 → agent_supervised（Agent+人工审核）
        5. 低复杂度 → simple（单Assistant处理）
        """
        sentiment = analysis["sentiment"]
        customer = analysis["customer"]
        complexity = analysis["complexity"]
        risk_level = analysis["risk_level"]
        scenario = analysis.get("scenario", "consultation")

        # Rule 1: 高风险场景，人工优先
        if risk_level == "high" or sentiment.get("overallSentiment") == "negative":
            return "human_first"

        # Rule 2: VIP客户，人工优先
        if customer.get("vip") or customer.get("isVIP"):
            return "human_first"

        # Rule 3: 投诉场景，人工优先
        if scenario == "complaint":
            return "human_first"

        # Rule 4: 故障场景 → parallel（辅助+工程师并行）
        if scenario == "fault":
            return "parallel"

        # Rule 5: 高复杂度 → Supervised模式
        if complexity > 0.7:
            return "agent_supervised"

        # Rule 6: 低复杂度 → Simple模式（AssistantAgent）
        if complexity < 0.4:
            return "simple"

        # Rule 7: 其他 → Supervised模式
        return "agent_supervised"

    async def _execute_simple(self, msg: Msg) -> Msg:
        """
        Simple模式：单Agent直接处理

        适用场景：简单咨询、常见问题
        """
        response = await self.assistant_agent(msg)
        response.metadata = {
            **(response.metadata or {}),
            "mode": "agent_auto",
            "execution_mode": "simple",
        }
        return response

    async def _execute_parallel(self, msg: Msg, analysis: dict[str, Any]) -> Msg:
        """
        Parallel模式：并行执行辅助Agent和工程师Agent

        执行流程（故障场景）：
        1. AssistantAgent和EngineerAgent并行处理
        2. AssistantAgent: 情感分析 + 需求提取
        3. EngineerAgent: 故障诊断 + 知识检索
        4. 聚合两个Agent的结果
        """
        # 并行执行两个Agent
        try:
            assistant_result, engineer_result = await asyncio.wait_for(
                asyncio.gather(
                    self.assistant_agent(msg),
                    self.engineer_agent(msg),
                    return_exceptions=True,
                ),
                timeout=20.0  # 20秒超时
            )
        except asyncio.TimeoutError:
            # 超时降级：返回降级回复
            return Msg(
                name="Orchestrator",
                content="抱歉，系统处理超时，已转人工客服处理。",
                role="assistant",
                metadata={
                    **msg.metadata,
                    "execution_mode": "parallel_timeout",
                    "confidence": 0.0
                }
            )

        # 检查结果是否有效
        agent_results = {}
        if assistant_result and not isinstance(assistant_result, Exception):
            agent_results["AssistantAgent"] = assistant_result
        if engineer_result and not isinstance(engineer_result, Exception):
            agent_results["EngineerAgent"] = engineer_result

        # 如果没有有效结果，降级处理
        if not agent_results:
            return Msg(
                name="Orchestrator",
                content="抱歉，系统暂时无法处理您的问题，已转人工客服处理。",
                role="assistant",
                metadata={
                    **msg.metadata,
                    "execution_mode": "parallel_failed",
                    "confidence": 0.0
                }
            )

        # 聚合结果
        aggregated_result = await self._aggregate_results(agent_results, msg)

        return aggregated_result

    async def _aggregate_results(
        self,
        agent_results: dict[str, Msg],
        original_msg: Msg
    ) -> Msg:
        """
        聚合多个Agent的结果

        策略：
        1. 情感分析使用AssistantAgent的结果
        2. 故障诊断使用EngineerAgent的结果
        3. 回复内容优先使用EngineerAgent的技术回复（更专业）
        4. 置信度取最低值（保守策略）
        """
        aggregated_metadata = {
            "execution_mode": "parallel",
            "agents_used": list(agent_results.keys())
        }
        final_reply = ""
        min_confidence = 1.0

        # 提取AssistantAgent的结果
        if "AssistantAgent" in agent_results:
            assistant_result = agent_results["AssistantAgent"]
            metadata = assistant_result.metadata or {}

            # 尝试解析JSON格式的结果
            try:
                import json
                assistant_data = json.loads(assistant_result.content)
                aggregated_metadata["sentiment"] = assistant_data.get("sentiment_analysis")
                aggregated_metadata["requirements"] = assistant_data.get("requirement_extraction")
                aggregated_metadata["clarification"] = assistant_data.get("clarification_questions")

                # 如果没有更专业的回复，用助手的
                if not final_reply:
                    final_reply = assistant_data.get("suggested_reply", "")

                min_confidence = min(min_confidence, assistant_data.get("confidence", 1.0))
            except Exception:
                # 如果不是JSON格式，使用原始内容
                if not final_reply:
                    final_reply = assistant_result.content

        # 提取EngineerAgent的结果
        if "EngineerAgent" in agent_results:
            engineer_result = agent_results["EngineerAgent"]
            metadata = engineer_result.metadata or {}

            # 尝试解析JSON格式的结果
            try:
                import json
                engineer_data = json.loads(engineer_result.content)
                aggregated_metadata["fault_diagnosis"] = engineer_data.get("fault_diagnosis")
                aggregated_metadata["knowledge"] = engineer_data.get("knowledge_results")
                aggregated_metadata["similar_tickets"] = engineer_data.get("similar_tickets")
                aggregated_metadata["technical_report"] = engineer_data.get("technical_report")

                # 工程师的回复覆盖助手的回复（更专业）
                engineer_reply = engineer_data.get("suggested_reply")
                if engineer_reply:
                    final_reply = engineer_reply

                min_confidence = min(min_confidence, engineer_data.get("confidence", 1.0))

                # 如果需要创建工单，标记
                fault_diag = engineer_data.get("fault_diagnosis", {})
                if fault_diag.get("need_escalation"):
                    aggregated_metadata["need_escalation"] = True
            except Exception:
                # 如果不是JSON格式，使用原始内容
                if engineer_result.content:
                    final_reply = engineer_result.content

        # 如果没有任何有效回复，生成降级回复
        if not final_reply:
            final_reply = "抱歉，系统暂时无法处理您的问题，已转人工客服处理。"
            min_confidence = 0.0

        # 生成聚合消息
        metadata = original_msg.metadata or {}
        return Msg(
            name="Orchestrator",
            content=final_reply,
            role="assistant",
            metadata={
                **aggregated_metadata,
                "confidence": min_confidence,
                "mode": "agent_auto",
                "execution_mode": "parallel",
                "conversation_id": metadata.get("conversationId"),
                "customer_id": metadata.get("customerId")
            }
        )

    async def _agent_supervised_mode(self, msg: Msg, async_review: bool = False) -> Msg:
        """
        Supervised模式：Agent处理 + 人工审核

        流程：
        1. Agent生成回复
        2. 检查置信度
        3. 低置信度 → 人工审核
        4. 高置信度 → 直接返回
        """
        async with MsgHub(
            participants=[self.assistant_agent, self.human_agent],
        ) as hub:
            # Agent生成回复
            agent_response = await self.assistant_agent(msg)
            agent_metadata = agent_response.metadata or {}
            confidence = agent_metadata.get("confidence", 1.0)

            # 低置信度需要人工审核
            if confidence < 0.7:
                # 发送审核请求给人工
                feedback_msg = Msg(
                    name="system",
                    content=f"Agent回复置信度低（{confidence:.2f}），请确认或修正：\n\n{agent_response.content}",
                    role="system",
                    metadata={
                        **msg.metadata,
                        "original_query": msg.content,
                        "agent_response": agent_response.content,
                        "confidence": confidence,
                    },
                )

                if async_review:
                    agent_response.metadata = {
                        **agent_metadata,
                        "mode": "agent_supervised",
                        "execution_mode": "agent_supervised_async",
                        "needs_review": True,
                        "confidence": confidence,
                    }
                    return agent_response

                # 推送到前端供人工审核
                await self._send_review_request_to_frontend(msg, agent_response, confidence)

                # 等待人工反馈
                feedback = await self.human_agent(feedback_msg)

                # 如果人工修改了，使用人工版本
                if "修改" in feedback.content or "不对" in feedback.content:
                    return await self.human_agent(msg)

                # 否则使用Agent版本（人工确认）
                agent_response.metadata = {
                    **(agent_response.metadata or {}),
                    "human_reviewed": True,
                    "reviewer_feedback": feedback.content,
                    "mode": "agent_supervised",
                }
                return agent_response

            # 高置信度直接返回
            agent_response.metadata = {
                **agent_metadata,
                "mode": "agent_supervised",
                "execution_mode": "agent_supervised",
            }
            return agent_response

    async def _human_first_mode(
        self, msg: Msg, analysis: dict[str, Any] | None = None, async_review: bool = False
    ) -> Msg:
        """
        Human First模式：人工优先，Agent提供建议

        适用场景：
        - 高风险客户
        - VIP客户
        - 负面情绪
        - 投诉问题

        流程：
        1. 搜索知识库提供建议
        2. 推送建议到前端
        3. 人工处理
        """
        # 搜索相关知识作为建议
        suggestions = []
        try:
            suggestions = await self.mcp_client.call_tool(
                "searchKnowledge",
                query=msg.content,
                filters={"category": "faq"},
                mode="semantic",
            )
        except Exception:
            suggestions = []

        # 如果有分析结果，也作为上下文提供
        context = {}
        if analysis:
            context = {
                "sentiment": analysis.get("sentiment", {}),
                "customer": analysis.get("customer", {}),
                "risk_level": analysis.get("risk_level", "unknown"),
            }

        # 推送建议到前端
        await self._send_suggestions_to_frontend(msg, suggestions, context)

        if async_review:
            return Msg(
                name="Orchestrator",
                content="已转人工处理，稍后由客服跟进。",
                role="assistant",
                metadata={
                    **(msg.metadata or {}),
                    "mode": "human_first",
                    "execution_mode": "human_first_async",
                    "needs_review": True,
                },
            )

        # 人工处理
        response = await self.human_agent(msg)
        response.metadata = {
            **(response.metadata or {}),
            "mode": "human_first",
            "execution_mode": "human_first",
        }
        return response

    # ========== 辅助方法 ==========

    async def _analyze_sentiment(self, user_msg: Msg) -> dict[str, Any]:
        """情感分析"""
        try:
            return await self.mcp_client.call_tool(
                "analyzeConversation",
                conversationId=user_msg.metadata.get("conversationId", user_msg.id),
                context="quality",
                includeHistory=True,
            )
        except Exception:
            return {"overallSentiment": "neutral", "riskLevel": "low", "score": 0.7}

    async def _get_customer_info(self, user_msg: Msg) -> dict[str, Any]:
        """获取客户画像"""
        customer_id = user_msg.metadata.get("customerId")
        if not customer_id:
            return {}
        try:
            return await self.mcp_client.call_tool(
                "getCustomerProfile",
                customerId=customer_id,
            )
        except Exception:
            return {}

    def _analyze_complexity(self, user_msg: Msg) -> float:
        """
        分析请求复杂度

        考虑因素：
        - 消息长度
        - 问题数量
        - 关键词密度
        """
        content = user_msg.content
        words = len(content.split())

        # 基础复杂度（基于长度）
        base_complexity = min(1.0, words / 240)

        # 问题数量（多问题提升复杂度）
        question_count = content.count("?") + content.count("？")
        question_factor = min(0.3, question_count * 0.1)

        # 复杂关键词
        complex_keywords = ["为什么", "怎么办", "如何", "能否", "可以吗"]
        complex_keyword_count = sum(1 for kw in complex_keywords if kw in content)
        keyword_factor = min(0.2, complex_keyword_count * 0.1)

        return min(1.0, base_complexity + question_factor + keyword_factor)

    async def _send_suggestions_to_frontend(
        self, msg: Msg, suggestions: Any, context: dict[str, Any] | None = None
    ) -> None:
        """推送建议到前端"""
        conversation_id = msg.metadata.get("conversationId", "default")
        if not self.ws_manager:
            return

        await self.ws_manager.send_to_client(
            conversation_id,
            {
                "type": "agent_suggestions",
                "suggestions": suggestions,
                "context": context or {},
                "metadata": msg.metadata,
            },
        )

    async def _send_review_request_to_frontend(
        self, msg: Msg, agent_response: Msg, confidence: float
    ) -> None:
        """推送审核请求到前端"""
        conversation_id = msg.metadata.get("conversationId", "default")
        if not self.ws_manager:
            return

        await self.ws_manager.send_to_client(
            conversation_id,
            {
                "type": "review_request",
                "original_query": msg.content,
                "agent_response": agent_response.content,
                "confidence": confidence,
                "metadata": msg.metadata,
            },
        )
