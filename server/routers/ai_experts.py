"""
EBI 循证投资 — AI Experts Router
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from services.ai_engine import ai_engine

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AnalyzeRequest(BaseModel):
    stock_code: str
    stock_name: str | None = None
    expert_id: str | None = None


class CrossDiscussRequest(BaseModel):
    stock_code: str
    stock_name: str | None = None
    previous_results: list | None = None


@router.get("/experts")
async def get_experts():
    """Get available AI experts."""
    return {"experts": ai_engine.get_experts()}


@router.post("/analyze")
async def analyze_stock(req: AnalyzeRequest):
    """Run AI analysis for a stock."""
    return await ai_engine.analyze_stock(
        stock_code=req.stock_code,
        stock_name=req.stock_name,
        expert_id=req.expert_id,
    )


@router.post("/cross-discuss")
async def cross_discuss(req: CrossDiscussRequest):
    """Generate cross-expert synthesis."""
    return await ai_engine.cross_discussion(
        stock_code=req.stock_code,
        stock_name=req.stock_name,
        previous_results=req.previous_results,
    )
