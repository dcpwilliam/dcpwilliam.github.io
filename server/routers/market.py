"""
EBI 循证投资 — Market Data Router
"""

from fastapi import APIRouter, Query

from services.market_data import market_data_service

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/flow")
async def get_market_flow(market: str = Query("cn", description="Market: cn, hk, us")):
    """Get capital flow data for a market."""
    return await market_data_service.get_market_flow(market)


@router.get("/hot-sectors")
async def get_hot_sectors(market: str = Query("cn")):
    """Get hot sectors for a market."""
    return await market_data_service.get_hot_sectors(market)


@router.get("/search")
async def search_stocks(q: str = Query(..., description="Search query")):
    """Search stocks by code or name."""
    return await market_data_service.search_stocks(q)


@router.get("/stock/{code}")
async def get_stock_info(code: str):
    """Get stock information."""
    return await market_data_service.get_stock_info(code)


@router.get("/stock/{code}/history")
async def get_stock_history(
    code: str,
    period: str = Query("1mo", description="Period: 1d, 5d, 1mo, 3mo, 6mo, 1y"),
):
    """Get stock price history."""
    return await market_data_service.get_stock_history(code, period)
