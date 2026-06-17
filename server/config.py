"""
EBI 循证投资 — Configuration
"""

import os
from typing import Optional


class Settings:
    # API
    API_HOST: str = os.getenv("EBI_API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("EBI_API_PORT", "8000"))

    # AI
    OPENAI_API_URL: str = os.getenv("EBI_OPENAI_API_URL", "http://localhost:11434/v1")
    OPENAI_API_KEY: str = os.getenv("EBI_OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("EBI_OPENAI_MODEL", "qwen2.5:7b")

    # Market Data
    YAHOO_FINANCE_ENABLED: bool = True
    FINNHUB_API_KEY: Optional[str] = os.getenv("EBI_FINNHUB_API_KEY")
    FINNHUB_ENABLED: bool = bool(FINNHUB_API_KEY)

    # CORS
    CORS_ORIGINS: list = ["http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:8080"]

    # P2P
    GUN_RELAY: str = os.getenv("EBI_GUN_RELAY", "https://gun-manhattan.herokuapp.com/gun")

    # Factor Engine
    FACTOR_UPDATE_INTERVAL: int = 300  # seconds
    TOP_N_FACTORS: int = 20

    # Authing OIDC
    AUTHING_OIDC_ISSUER: str = os.getenv("EBI_AUTHING_OIDC_ISSUER", "https://weinvest.authing.cn/oidc")
    AUTHING_DOMAIN: str = os.getenv("EBI_AUTHING_DOMAIN", "https://weinvest.authing.cn")
    AUTHING_APP_ID: str = os.getenv("EBI_AUTHING_APP_ID", "")
    AUTHING_APP_SECRET: str = os.getenv("EBI_AUTHING_APP_SECRET", "")
    AUTHING_USERPOOL_ID: str = os.getenv("EBI_AUTHING_USERPOOL_ID", "")


settings = Settings()
