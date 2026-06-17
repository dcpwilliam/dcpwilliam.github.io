"""
EBI 循证投资 — Factor Discovery Router
"""

from fastapi import APIRouter, Query

from services.factor_calc import factor_engine

router = APIRouter(prefix="/api/factors", tags=["factors"])


@router.get("/")
async def get_factors(
    market: str = Query("cn"),
    top_n: int = Query(20, ge=1, le=50),
):
    """Get current factor scores."""
    return {"factors": factor_engine.get_factors(market, top_n)}


@router.get("/{factor_id}")
async def get_factor_detail(factor_id: str):
    """Get detailed info for a specific factor."""
    factor = factor_engine.get_factor_detail(factor_id)
    if not factor:
        return {"error": "Factor not found"}, 404
    return factor


@router.post("/refresh")
async def refresh_factors(market: str = Query("cn")):
    """Force refresh factor calculations."""
    factors = factor_engine.refresh_factors(market)
    return {"factors": factors, "count": len(factors)}


@router.get("/opportunities/scan")
async def scan_opportunities(
    market: str = Query("cn"),
    min_score: int = Query(70, ge=0, le=100),
):
    """Scan for investment opportunities based on factor scores."""
    opportunities = factor_engine.scan_opportunities(market, min_score)
    return {"opportunities": opportunities, "count": len(opportunities)}
