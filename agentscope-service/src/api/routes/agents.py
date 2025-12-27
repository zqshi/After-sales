from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.api.state import agent_manager

router = APIRouter()


class InspectConversationRequest(BaseModel):
    """质检请求模型"""
    conversation_id: str


class InspectConversationResponse(BaseModel):
    """质检响应模型"""
    success: bool
    conversation_id: str
    quality_score: int
    report: dict


@router.get("/list")
async def list_agents() -> dict[str, list[str]]:
    return {"agents": ["AssistantAgent", "EngineerAgent", "InspectorAgent", "HumanAgent"]}


@router.post("/inspect", response_model=InspectConversationResponse)
async def inspect_conversation(request: InspectConversationRequest) -> InspectConversationResponse:
    """
    触发InspectorAgent对指定对话进行质检

    该接口由后端EventBus在ConversationClosedEvent触发时调用
    """
    inspector_agent = agent_manager.get("inspector_agent")

    if not inspector_agent:
        raise HTTPException(status_code=500, detail="InspectorAgent not initialized")

    try:
        # 调用InspectorAgent的inspect_conversation方法
        report = await inspector_agent.inspect_conversation(request.conversation_id)

        return InspectConversationResponse(
            success=True,
            conversation_id=request.conversation_id,
            quality_score=report.get("quality_score", 0),
            report=report
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Quality inspection failed: {str(e)}"
        )
