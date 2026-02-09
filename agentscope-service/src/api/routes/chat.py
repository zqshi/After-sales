from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Dict, Any

from agentscope.message import Msg

from src.api.state import agent_manager

router = APIRouter()


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    customer_id: str
    metadata: Dict[str, Any] = {}


class ChatResponse(BaseModel):
    success: bool
    message: str
    agent_name: str
    mode: str = "agent_auto"
    confidence: float = 1.0
    metadata: Dict[str, Any] = {}


@router.post("/message", response_model=ChatResponse)
async def handle_chat_message(request: ChatRequest) -> ChatResponse:
    router = agent_manager.get("router")
    if not router:
        return ChatResponse(
            success=False,
            message="agent service warming up",
            agent_name="system",
            mode="error",
            confidence=0.0,
        )

    msg = Msg(
        name="user",
        content=request.message,
        role="user",
        metadata={
            "conversationId": request.conversation_id,
            "customerId": request.customer_id,
            "agentName": request.metadata.get("agentName") if request.metadata else None,
            **request.metadata,
        },
    )

    try:
        response_msg = await router.route(msg)
    except Exception as exc:  # pragma: no cover
        return ChatResponse(
            success=False,
            message=str(exc),
            agent_name="system",
            mode="error",
            confidence=0.0,
        )

    return ChatResponse(
        success=True,
        message=response_msg.content,
        agent_name=response_msg.name,
        metadata=response_msg.metadata or {},
        mode=response_msg.metadata.get("mode", "agent_auto"),
        confidence=response_msg.metadata.get("confidence", 1.0),
    )


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str) -> None:
    await websocket.accept()
    ws_manager = agent_manager.get("ws_manager")
    if ws_manager:
        ws_manager.register_client(conversation_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "human_input":
                human_agent = agent_manager.get("human_agent")
                if human_agent:
                    human_agent.receive_human_input(
                        conversation_id,
                        data.get("content", ""),
                        data.get("metadata", {}),
                    )

            elif event_type == "interrupt":
                cs_agent = agent_manager.get("cs_agent")
                if cs_agent:
                    await cs_agent.interrupt()

    except WebSocketDisconnect:
        ws_manager = agent_manager.get("ws_manager")
        if ws_manager:
            ws_manager.unregister_client(conversation_id)


@router.get("/status")
async def status() -> dict[str, str]:
    return {"status": "ready"}
