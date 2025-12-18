from fastapi import APIRouter

router = APIRouter()


@router.get("/list")
async def list_agents() -> dict[str, list[str]]:
    return {"agents": ["CustomerServiceAgent", "QualityInspectorAgent"]}
