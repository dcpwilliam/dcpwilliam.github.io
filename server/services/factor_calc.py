"""
EBI 循证投资 — Factor Calculation Engine
Multi-factor scoring and discovery
"""

import random
from datetime import datetime
from typing import Optional

import numpy as np

FACTOR_CATEGORIES = {
    "技术": ["动量因子", "成交量因子", "波动率因子", "均线因子", "MACD因子"],
    "资金": ["北向资金因子", "机构持仓因子", "主力资金因子", "融资融券因子"],
    "基本面": ["ROE因子", "估值因子", "盈利预测因子", "现金流因子", "营收增长因子"],
    "风险": ["波动率风险因子", "回撤因子", "贝塔因子", "流动性因子"],
    "产业": ["产业链因子", "景气度因子", "政策因子"],
    "情绪": ["市场情绪因子", "舆情因子", "换手率因子"],
}

FACTOR_DESCRIPTIONS = {
    "动量因子": "20日价格动量信号",
    "北向资金因子": "北向持股变化率",
    "ROE因子": "近4季度ROE趋势",
    "波动率因子": "20日波动率分位",
    "估值因子": "PE/PB历史分位数",
    "成交量因子": "量价背离度",
    "产业链因子": "上下游景气传导",
    "机构持仓因子": "基金重仓变化",
    "情绪因子": "市场情绪综合指标",
    "盈利预测因子": "分析师盈利修正",
}


class FactorEngine:
    def __init__(self):
        self._factors = []
        self._last_update = None
        self._update_interval = 300  # 5 min

    def get_factors(self, market: str = "cn", top_n: int = 20) -> list:
        """Get current factor scores."""
        if not self._factors or self._should_update():
            self._calculate_factors(market)

        factors = sorted(self._factors, key=lambda f: f["score"], reverse=True)
        return factors[:top_n]

    def get_factor_detail(self, factor_id: str) -> Optional[dict]:
        """Get detailed info for a specific factor."""
        for f in self._factors:
            if f["id"] == factor_id:
                return f
        return None

    def refresh_factors(self, market: str = "cn") -> list:
        """Force refresh factor calculations."""
        self._factors = []
        return self.get_factors(market)

    def scan_opportunities(self, market: str = "cn", min_score: int = 70) -> list:
        """Scan for investment opportunities based on factor scores."""
        factors = self.get_factors(market)
        high_factors = [f for f in factors if f["score"] >= min_score]

        opportunities = []
        for factor in high_factors:
            opp = {
                "factor": factor["name"],
                "score": factor["score"],
                "change": factor["change"],
                "related_stocks": self._get_related_stocks(factor["name"], market),
                "action": "买入" if factor["change"] > 2 else ("观望" if factor["change"] > -2 else "回避"),
            }
            opportunities.append(opp)

        return sorted(opportunities, key=lambda o: o["score"], reverse=True)

    def _calculate_factors(self, market: str):
        """Calculate factor scores (MVP: mock calculation)."""
        self._factors = []
        fid = 1

        for category, names in FACTOR_CATEGORIES.items():
            for name in names:
                score = int(np.clip(random.gauss(68, 12), 35, 98))
                change = round(random.gauss(1.5, 3), 1)
                desc = FACTOR_DESCRIPTIONS.get(name, f"{name}分析")

                self._factors.append({
                    "id": f"f_{fid:03d}",
                    "name": name,
                    "category": category,
                    "score": score,
                    "change": change,
                    "description": desc,
                    "market": market,
                    "updated_at": datetime.now().isoformat(),
                })
                fid += 1

        self._last_update = datetime.now()

    def _should_update(self) -> bool:
        if not self._last_update:
            return True
        age = (datetime.now() - self._last_update).total_seconds()
        return age > self._update_interval

    def _get_related_stocks(self, factor_name: str, market: str) -> list:
        """Get stocks related to a factor."""
        stock_map = {
            "cn": {
                "动量因子": ["宁德时代", "比亚迪"],
                "北向资金因子": ["贵州茅台", "中国平安"],
                "ROE因子": ["海天味业", "片仔癀"],
                "估值因子": ["招商银行", "兴业银行"],
            },
            "hk": {
                "动量因子": ["理想汽车", "蔚来"],
                "北向资金因子": ["腾讯", "美团"],
            },
            "us": {
                "动量因子": ["NVDA", "AMD"],
                "估值因子": ["AAPL", "MSFT"],
            },
        }
        return stock_map.get(market, {}).get(factor_name, [])


factor_engine = FactorEngine()
