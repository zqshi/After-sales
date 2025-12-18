from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from src.api.state import agent_manager
from src.events.bridge import NodeEventLedger

router = APIRouter()


class BridgeEventRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event_id: str | None = Field(None, alias="eventId")
    event_type: str = Field(..., alias="eventType")
    aggregate_id: str = Field(..., alias="aggregateId")
    payload: Dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime | None = Field(None, alias="occurredAt")
    version: int = Field(1, alias="version")

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump(by_alias=True)


@router.post("/bridge")
async def bridge_event(payload: BridgeEventRequest) -> dict[str, str]:
    event_data = payload.to_dict()
    ledger = agent_manager.get("node_event_ledger")
    if isinstance(ledger, NodeEventLedger):
        ledger.record(event_data)

    ws_manager = agent_manager.get("ws_manager")
    if ws_manager and payload.aggregate_id:
        await ws_manager.send_to_client(
            payload.aggregate_id,
            {
                "type": "domain_event",
                "event": event_data,
            },
        )

    return {"status": "accepted"}
