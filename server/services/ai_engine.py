"""
EBI 循证投资 — AI Expert Engine
Multi-persona strategy analysis with LLM
"""

import json
from typing import Optional

import httpx
from config import settings


EXPERTS = [
    {
        "id": "value_investor",
        "name": "价值分析师",
        "role": "Value Investor",
        "system_prompt": (
            "你是一位资深价值投资分析师，擅长基本面分析、财务报表解读和估值模型。"
            "关注企业内在价值、护城河、ROE、自由现金流。"
            "偏好长期持有优质标的，对高估值保持警惕。"
            "回答要简洁专业，给出明确的投资判断。约200字。"
        ),
    },
    {
        "id": "quant_trader",
        "name": "量化策略师",
        "role": "Quant Trader",
        "system_prompt": (
            "你是一位量化交易策略师，擅长因子挖掘、统计套利和风险模型。"
            "关注技术因子、量价关系、波动率、相关性。"
            "重视仓位管理和风控，使用多因子模型。"
            "回答要数据驱动，给出可量化的信号。约200字。"
        ),
    },
    {
        "id": "macro_strategist",
        "name": "宏观策略师",
        "role": "Macro Strategist",
        "system_prompt": (
            "你是一位宏观策略分析师，擅长货币政策、行业周期和资金面分析。"
            "关注央行政策、利率走势、M2/社融数据。"
            "善于判断行业轮动和风格切换，从宏观视角把握大趋势。"
            "回答要有宏观视野，给出趋势性判断。约200字。"
        ),
    },
]

MOCK_RESPONSES = {
    "value_investor": (
        "从价值投资角度分析，该标的ROE保持在15%以上，自由现金流稳定增长。"
        "当前估值处于合理区间，PE相对行业均值略有折价。"
        "建议在回调时分批建仓，长期持有。关注下季度财报中的营收增速是否维持。"
        "止损可设在内在价值的80%位置。"
    ),
    "quant_trader": (
        "量价信号显示短期动能增强。20日均线刚上穿60日均线形成金叉，MACD红柱放大。"
        "波动率收缩后面临方向选择，布林带收窄至近期低点。"
        "建议突破前高后追多，止损设在20日均线下方2%。"
        "仓位建议：初始30%，突破加至50%。"
    ),
    "macro_strategist": (
        "当前宏观环境对该标的整体利好。宽松货币环境持续，北向资金流入趋势未改。"
        "行业景气度处于上行周期中段，仍有空间。"
        "需关注本周美联储议息会议可能带来的短期扰动。"
        "中期趋势仍然看多，建议持有或逢低加仓。"
    ),
}


class AIEngine:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)

    async def analyze_stock(
        self,
        stock_code: str,
        stock_name: Optional[str] = None,
        expert_id: Optional[str] = None,
    ) -> dict:
        """Run AI analysis for a stock, optionally with a specific expert."""
        experts = [e for e in EXPERTS if e["id"] == expert_id] if expert_id else EXPERTS
        results = []

        for expert in experts:
            try:
                response = await self._call_llm(
                    system=expert["system_prompt"],
                    user=f"请分析股票 {stock_code}（{stock_name or stock_code}）的投资机会和风险。",
                )
                results.append({
                    "expert_id": expert["id"],
                    "expert_name": expert["name"],
                    "response": response,
                    "error": None,
                })
            except Exception as e:
                results.append({
                    "expert_id": expert["id"],
                    "expert_name": expert["name"],
                    "response": MOCK_RESPONSES.get(expert["id"], "分析暂时不可用"),
                    "error": str(e),
                    "fallback": True,
                })

        return {
            "stock_code": stock_code,
            "stock_name": stock_name,
            "results": results,
        }

    async def cross_discussion(
        self,
        stock_code: str,
        stock_name: Optional[str] = None,
        previous_results: Optional[list] = None,
    ) -> dict:
        """Generate cross-expert synthesis."""
        summary = ""
        if previous_results:
            for r in previous_results:
                name = r.get("expert_name", r.get("expert_id"))
                resp = r.get("response", "")
                summary += f"[{name}]: {resp}\n\n"

        prompt = (
            f"基于以上三位专家的分析，请针对 {stock_code}（{stock_name or stock_code}）"
            f"给出一个综合策略建议，包括：1.入场时机和价位 2.仓位建议 "
            f"3.止损止盈点 4.需要关注的关键信号。"
        )

        try:
            response = await self._call_llm(
                system="你是一位综合投资顾问，需要综合多位专家的观点，给出具体可执行的策略。",
                user=f"{summary}\n---\n\n{prompt}",
            )
        except Exception:
            response = (
                f"综合策略（{stock_code}）：\n"
                "1. 入场时机：建议在回调至20日均线附近时分批买入\n"
                "2. 仓位建议：总仓位控制在30%，分3次建仓\n"
                "3. 止损：跌破60日均线或亏损8%止损\n"
                "4. 止盈：第一目标+15%减半仓，第二目标+30%再减\n"
                "5. 关键信号：关注北向资金流向变化、季度财报业绩、行业政策动向\n\n"
                "⚠️ 以上为AI分析参考，不构成投资建议"
            )

        return {
            "stock_code": stock_code,
            "cross_discussion": response,
        }

    async def _call_llm(self, system: str, user: str, temperature: float = 0.7) -> str:
        """Call OpenAI-compatible LLM API."""
        headers = {"Content-Type": "application/json"}
        if settings.OPENAI_API_KEY:
            headers["Authorization"] = f"Bearer {settings.OPENAI_API_KEY}"

        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": 500,
        }

        resp = await self.client.post(
            f"{settings.OPENAI_API_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    def get_experts(self) -> list:
        """Return expert configurations."""
        return EXPERTS


ai_engine = AIEngine()
