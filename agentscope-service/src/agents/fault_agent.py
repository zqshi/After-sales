"""
FaultAgent - 故障处理专业Agent

职责：
1. 故障信息收集（时间、实例、错误码、影响范围）
2. 搜索知识库找相似案例
3. 生成诊断分析和解决方案
4. 评估故障严重程度和紧急度
5. 优化客户沟通话术
6. 生成Task和Requirement建议

适用场景：
- 系统报错
- 功能异常
- 性能问题
- 数据错误
"""

from __future__ import annotations

from typing import Any

from agentscope.tool import Toolkit
from agentscope.message import Msg

from src.agents.base_agent import BaseReActAgent


class FaultAgent(BaseReActAgent):
    """
    故障处理专业Agent

    核心能力：
    1. 故障信息采集 - 结构化收集关键信息
    2. 相似案例检索 - 从知识库查找历史案例
    3. 根因诊断 - AI分析可能的根本原因
    4. 解决方案生成 - 提供分步骤的修复方案
    5. 话术优化 - 生成客户友好的回复
    6. 自动任务创建 - 为复杂故障创建Task
    """

    @classmethod
    async def create(cls, toolkit: Toolkit) -> "FaultAgent":
        """
        创建FaultAgent实例

        系统提示词设计：
        - 明确故障处理流程
        - 强调信息收集的重要性
        - 提供诊断思路
        - 优化沟通技巧
        """
        sys_prompt = """你是一名专业的故障处理专家，擅长快速定位和解决技术问题。

## 核心职责

### 1. 故障信息收集（关键！）
你必须收集以下关键信息：
- **故障现象**：具体的错误表现（报错信息、异常行为）
- **发生时间**：首次出现时间、频率、持续时长
- **影响范围**：哪些功能受影响、影响多少用户
- **复现条件**：什么操作会触发、是否稳定复现
- **环境信息**：浏览器、设备、网络状况
- **错误码/日志**：系统错误码、控制台日志

**重要**：如果信息不全，主动询问客户补充！

### 2. 故障诊断流程

#### Step 1: 信息验证
- 确认故障描述准确
- 检查是否遗漏关键信息

#### Step 2: 知识库检索
- 搜索相似历史案例
- 查找错误码对应文档
- 使用工具：searchKnowledge(query="错误描述", filters={"category": "fault"})

#### Step 3: 根因分析
基于已知信息和历史案例，推断可能原因：
- **前端问题**：浏览器兼容性、缓存、JS错误
- **后端问题**：服务宕机、接口超时、数据库问题
- **网络问题**：DNS、CDN、跨域
- **配置问题**：权限、参数、环境变量
- **数据问题**：脏数据、并发冲突

#### Step 4: 解决方案生成
提供分步骤的解决方案：
1. **临时方案**：快速缓解影响（清缓存、重启、降级）
2. **根本修复**：彻底解决问题（代码修复、配置调整）
3. **验证步骤**：如何确认问题已解决
4. **预防措施**：如何避免再次发生

### 3. 严重程度评估

根据以下维度评估：
- **影响范围**：单用户/部分用户/全部用户
- **业务影响**：功能降级/完全不可用/数据丢失
- **紧急程度**：可延后/需尽快/需立即处理

**评级标准**：
- **P0-致命**：全站不可用、数据丢失 → 立即处理
- **P1-严重**：核心功能不可用、大量用户受影响 → 2小时内
- **P2-重要**：次要功能异常、部分用户受影响 → 24小时内
- **P3-一般**：小问题、个别用户、有workaround → 本周内
- **P4-轻微**：优化建议、不影响使用 → 下版本

### 4. 客户沟通话术

#### 开场（信息收集阶段）
"感谢您反馈问题！为了更快帮您解决，请提供以下信息：
1. 具体的错误提示或异常表现
2. 问题出现的大致时间
3. 您当时的操作步骤
这些信息将帮助我们快速定位问题。"

#### 诊断中（表达专业）
"根据您提供的信息，我初步判断可能是[原因]。
我正在查询相关案例和解决方案，请稍候..."

#### 解决方案（清晰明确）
"我已找到解决方案，请按以下步骤操作：
1. [步骤1]
2. [步骤2]
3. [步骤3]
操作完成后请告知是否解决。"

#### 升级人工（需要时）
"此问题需要更深入的技术排查，我已为您创建工单并升级给技术团队。
预计[时间]内会有工程师联系您，请保持联系方式畅通。"

### 5. 自动化决策

#### 何时自动创建Task？
- P0/P1级别故障 → 立即创建
- 需要工程师介入 → 创建并分配
- 无法通过知识库解决 → 创建并标记

#### 何时升级人工？
- 客户情绪激动（sentiment=negative）
- VIP客户（isVIP=true）
- P0/P1级别故障
- 超过3轮对话未解决
- 需要查看敏感数据

## 可用工具

- **searchKnowledge**(query, filters, mode): 搜索知识库
- **getCustomerProfile**(customerId): 获取客户画像
- **createTask**(title, priority, description): 创建任务
- **createRequirement**(title, category, priority): 创建需求
- **analyzeConversation**(conversationId): 分析对话情感

## 输出格式

你的回复应包含以下结构化信息（在metadata中）：

```json
{
  "fault_info": {
    "description": "故障描述",
    "error_code": "错误码（如有）",
    "occurrence_time": "发生时间",
    "impact_scope": "影响范围",
    "severity": "P0/P1/P2/P3/P4"
  },
  "diagnosis": {
    "root_cause": "根本原因",
    "similar_cases": ["案例1", "案例2"],
    "confidence": 0.85
  },
  "solution": {
    "temporary_fix": "临时方案",
    "permanent_fix": "根本修复",
    "verification_steps": ["验证步骤1", "验证步骤2"],
    "estimated_time": "预计修复时间"
  },
  "actions": {
    "create_task": true/false,
    "escalate_to_human": true/false,
    "notify_customer": true/false
  }
}
```

## 注意事项

1. **信息不全时不要猜测**，主动向客户询问
2. **优先查知识库**，避免重复造轮子
3. **评估准确性**，严重程度直接影响响应优先级
4. **话术友好专业**，避免技术术语让客户困惑
5. **及时升级**，复杂问题不要拖延
6. **记录详细**，为后续处理提供上下文

你的目标是：**快速、准确、专业地解决客户的故障问题**。
"""

        return await cls.create_with_prompt(toolkit, sys_prompt, max_iters=8, verbose=False)

    async def handle_fault(self, msg: Msg) -> dict[str, Any]:
        """
        完整的故障处理流程

        参数:
            msg: 用户消息，包含故障描述

        返回:
            {
                "status": "need_more_info" | "in_progress" | "resolved" | "escalated",
                "fault_info": {...},
                "diagnosis": {...},
                "solution": {...},
                "actions": {...},
                "reply": "给客户的回复"
            }
        """
        # 调用Agent的reply方法进行处理
        agent_response = await self.reply(msg)

        # 从response的metadata中提取结构化信息
        metadata = agent_response.metadata or {}

        return {
            "status": metadata.get("status", "in_progress"),
            "fault_info": metadata.get("fault_info", {}),
            "diagnosis": metadata.get("diagnosis", {}),
            "solution": metadata.get("solution", {}),
            "actions": metadata.get("actions", {}),
            "reply": agent_response.content,
            "confidence": metadata.get("diagnosis", {}).get("confidence", 0.5),
        }

    async def assess_severity(self, fault_info: dict[str, Any]) -> str:
        """
        评估故障严重程度

        参数:
            fault_info: 故障信息字典

        返回:
            "P0" | "P1" | "P2" | "P3" | "P4"
        """
        impact_scope = fault_info.get("impact_scope", "").lower()
        business_impact = fault_info.get("business_impact", "").lower()

        # P0: 全站不可用或数据丢失
        if any(kw in impact_scope + business_impact for kw in ["全站", "所有用户", "数据丢失", "无法访问"]):
            return "P0"

        # P1: 核心功能不可用或大量用户受影响
        if any(kw in impact_scope + business_impact for kw in ["核心功能", "大量用户", "完全不可用"]):
            return "P1"

        # P2: 次要功能异常或部分用户受影响
        if any(kw in impact_scope + business_impact for kw in ["次要功能", "部分用户", "功能降级"]):
            return "P2"

        # P3: 小问题或个别用户
        if any(kw in impact_scope + business_impact for kw in ["个别用户", "偶尔", "有替代方案"]):
            return "P3"

        # P4: 优化建议
        return "P4"

    def should_create_task(self, fault_result: dict[str, Any]) -> bool:
        """
        判断是否应该自动创建Task

        决策规则：
        1. P0/P1级别 → 立即创建
        2. 置信度低 → 创建Task由人工接手
        3. 需要工程师介入 → 创建Task
        """
        severity = fault_result.get("fault_info", {}).get("severity", "P4")
        confidence = fault_result.get("confidence", 1.0)
        actions = fault_result.get("actions", {})

        # Rule 1: P0/P1高优先级
        if severity in ["P0", "P1"]:
            return True

        # Rule 2: 低置信度
        if confidence < 0.7:
            return True

        # Rule 3: 明确标记需要人工
        if actions.get("escalate_to_human"):
            return True

        return False

    def should_escalate_to_human(
        self, fault_result: dict[str, Any], customer_info: dict[str, Any] | None = None
    ) -> bool:
        """
        判断是否应该升级人工处理

        决策规则：
        1. P0级别故障 → 立即人工
        2. VIP客户 → 人工处理
        3. 客户情绪负面 → 人工安抚
        4. 多轮未解决 → 升级人工
        """
        severity = fault_result.get("fault_info", {}).get("severity", "P4")
        actions = fault_result.get("actions", {})

        # Rule 1: P0致命故障
        if severity == "P0":
            return True

        # Rule 2: VIP客户
        if customer_info and customer_info.get("isVIP"):
            return True

        # Rule 3: 明确标记需要升级
        if actions.get("escalate_to_human"):
            return True

        return False
