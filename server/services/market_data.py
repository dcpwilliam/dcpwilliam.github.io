"""
EBI 循证投资 — Market Data Service
Supports: Yahoo Finance (yfinance), Finnhub
"""

import json
import random
from datetime import datetime, timedelta
from typing import Optional

import yfinance as yf
import numpy as np

from config import settings


# Sector mapping for Chinese market
CN_SECTORS = {
    "tech": ["999999.SS"],  # placeholder codes
    "finance": ["999999.SS"],
    "consumer": ["999999.SS"],
    "medicine": ["999999.SS"],
    "energy": ["999999.SS"],
    "newenergy": ["999999.SS"],
}

# Market indices
INDICES = {
    "cn": {"main": "000001.SS", "name": "上证指数"},
    "hk": {"main": "^HSI", "name": "恒生指数"},
    "us": {"main": "^GSPC", "name": "S&P 500"},
}


class MarketDataService:
    def __init__(self):
        self._cache = {}
        self._cache_ttl = 60  # seconds

    async def get_market_flow(self, market: str = "cn") -> dict:
        """Get capital flow data for a market."""
        cache_key = f"flow_{market}"
        if self._is_cached(cache_key):
            return self._cache[cache_key]["data"]

        # Try real data first, fall back to mock
        try:
            data = await self._fetch_real_flow(market)
        except Exception:
            data = self._mock_flow(market)

        self._set_cache(cache_key, data)
        return data

    async def get_hot_sectors(self, market: str = "cn") -> list:
        """Get hot sectors for a market."""
        try:
            return await self._fetch_real_sectors(market)
        except Exception:
            return self._mock_sectors(market)

    async def get_stock_info(self, code: str) -> dict:
        """Get stock information by code."""
        try:
            ticker = yf.Ticker(code)
            info = ticker.info
            return {
                "code": code,
                "name": info.get("shortName", code),
                "price": info.get("currentPrice", 0),
                "change": info.get("regularMarketChangePercent", 0),
                "market_cap": info.get("marketCap", 0),
                "pe": info.get("trailingPE", 0),
                "volume": info.get("volume", 0),
            }
        except Exception:
            return {"code": code, "name": code, "price": 0, "change": 0}

    async def search_stocks(self, query: str) -> list:
        """Search stocks by code or name."""
        # MVP: return mock results
        mock_stocks = [
            {"code": "600519.SS", "name": "贵州茅台", "market": "cn"},
            {"code": "000858.SZ", "name": "五粮液", "market": "cn"},
            {"code": "300750.SZ", "name": "宁德时代", "market": "cn"},
            {"code": "0700.HK", "name": "腾讯控股", "market": "hk"},
            {"code": "9988.HK", "name": "阿里巴巴", "market": "hk"},
            {"code": "NVDA", "name": "NVIDIA", "market": "us"},
            {"code": "AAPL", "name": "Apple", "market": "us"},
            {"code": "MSFT", "name": "Microsoft", "market": "us"},
        ]
        q = query.lower()
        return [s for s in mock_stocks if q in s["code"].lower() or q in s["name"]]

    async def get_stock_history(self, code: str, period: str = "1mo") -> dict:
        """Get stock price history."""
        try:
            ticker = yf.Ticker(code)
            hist = ticker.history(period=period)
            if hist.empty:
                return {"code": code, "history": []}
            return {
                "code": code,
                "history": [
                    {
                        "date": str(idx.date()),
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": int(row["Volume"]),
                    }
                    for idx, row in hist.iterrows()
                ],
            }
        except Exception:
            return {"code": code, "history": []}

    # ---- Private helpers ----

    def _is_cached(self, key: str) -> bool:
        if key not in self._cache:
            return False
        age = (datetime.now() - self._cache[key]["ts"]).total_seconds()
        return age < self._cache_ttl

    def _set_cache(self, key: str, data):
        self._cache[key] = {"data": data, "ts": datetime.now()}

    async def _fetch_real_flow(self, market: str) -> dict:
        """Fetch real market flow data from Yahoo Finance."""
        # For MVP, use mock data since yfinance doesn't provide sector flow directly
        raise NotImplementedError("Real flow data requires data provider integration")

    async def _fetch_real_sectors(self, market: str) -> list:
        """Fetch real sector performance."""
        raise NotImplementedError("Real sector data requires data provider integration")

    def _mock_flow(self, market: str) -> dict:
        """Generate mock capital flow data."""
        sectors_by_market = {
            "cn": [
                ("north", "北向资金", "macro"), ("south", "南向资金", "macro"),
                ("tech", "科技", "sector"), ("finance", "金融", "sector"),
                ("consumer", "消费", "sector"), ("medicine", "医药", "sector"),
                ("energy", "能源", "sector"), ("newenergy", "新能源", "sector"),
                ("semiconductor", "半导体", "sector"), ("auto", "汽车", "sector"),
            ],
            "hk": [
                ("southhk", "南向资金", "macro"), ("intl", "国际资金", "macro"),
                ("techhk", "科技", "sector"), ("financehk", "金融", "sector"),
                ("property", "地产", "sector"), ("ev", "新能车", "sector"),
            ],
            "us": [
                ("fed", "美联储", "macro"),
                ("aius", "AI/科技", "sector"), ("semius", "半导体", "sector"),
                ("finus", "金融", "sector"), ("energyus", "能源", "sector"),
            ],
        }

        sectors = sectors_by_market.get(market, sectors_by_market["cn"])
        nodes = []
        for sid, name, stype in sectors:
            value = round(random.uniform(-500, 800), 1)
            change = round(random.uniform(-5, 6), 1)
            nodes.append({"id": sid, "name": name, "type": stype, "value": value, "change": change})

        # Generate links
        links = []
        macro_ids = [n["id"] for n in nodes if n["type"] == "macro"]
        sector_ids = [n["id"] for n in nodes if n["type"] == "sector"]

        for mid in macro_ids:
            targets = random.sample(sector_ids, min(3, len(sector_ids)))
            for t in targets:
                val = round(random.uniform(-200, 400), 1)
                links.append({"source": mid, "target": t, "value": val})

        # Inter-sector links
        for _ in range(min(4, len(sector_ids))):
            s, t = random.sample(sector_ids, 2)
            if not any(l["source"] == s and l["target"] == t for l in links):
                val = round(random.uniform(-150, 200), 1)
                links.append({"source": s, "target": t, "value": val})

        total_in = sum(n["value"] for n in nodes if n["value"] > 0)
        total_out = sum(abs(n["value"]) for n in nodes if n["value"] < 0)

        return {
            "metrics": {
                "totalInflow": round(total_in, 1),
                "totalOutflow": round(total_out, 1),
                "netFlow": round(total_in - total_out, 1),
                "activeSectors": len(sector_ids),
                "netFlowChange": round(random.uniform(-5, 15), 1),
            },
            "nodes": nodes,
            "links": links,
        }

    def _mock_sectors(self, market: str) -> list:
        """Generate mock hot sectors."""
        sector_data = {
            "cn": [
                {"name": "新能源", "stocks": ["宁德时代", "比亚迪"]},
                {"name": "半导体", "stocks": ["中芯国际", "北方华创"]},
                {"name": "消费", "stocks": ["贵州茅台", "五粮液"]},
            ],
            "hk": [
                {"name": "新能车", "stocks": ["理想汽车", "蔚来"]},
                {"name": "科技", "stocks": ["腾讯", "美团"]},
            ],
            "us": [
                {"name": "AI/科技", "stocks": ["NVDA", "MSFT"]},
                {"name": "半导体", "stocks": ["NVDA", "AMD"]},
            ],
        }

        result = []
        for s in sector_data.get(market, sector_data["cn"]):
            change = round(random.uniform(-3, 7), 1)
            result.append({"name": s["name"], "change": change, "stocks": s["stocks"]})

        return sorted(result, key=lambda x: x["change"], reverse=True)


# Singleton
market_data_service = MarketDataService()
