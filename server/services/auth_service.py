"""
EBI 循证投资 — Authing Auth Service
Proxies Authing Management API for listing active users
"""

import os
import time
import httpx
from typing import Optional, Dict, Any


class AuthingConfig:
    """Authing connection configuration"""
    # OIDC endpoint
    OIDC_ISSUER = os.getenv("EBI_AUTHING_OIDC_ISSUER", "https://weinvest.authing.cn/oidc")

    # Management API
    AUTHING_DOMAIN = os.getenv("EBI_AUTHING_DOMAIN", "https://weinvest.authing.cn")
    AUTHING_APP_ID = os.getenv("EBI_AUTHING_APP_ID", "")
    AUTHING_APP_SECRET = os.getenv("EBI_AUTHING_APP_SECRET", "")
    AUTHING_USERPOOL_ID = os.getenv("EBI_AUTHING_USERPOOL_ID", "")

    # Management API endpoints
    TOKEN_ENDPOINT = f"{AUTHING_DOMAIN}/oidc/token"
    ACTIVE_USERS_ENDPOINT = f"{AUTHING_DOMAIN}/api/v3/get-application-active-users"


authing_config = AuthingConfig()


class AuthingManagementToken:
    """Manages Authing management API access token"""

    _token: Optional[str] = None
    _expires_at: float = 0

    @classmethod
    async def get_token(cls) -> Optional[str]:
        """Get a valid management token, refreshing if necessary"""
        if cls._token and cls._expires_at > time.time() + 60:
            return cls._token

        if not authing_config.AUTHING_APP_ID or not authing_config.AUTHING_APP_SECRET:
            return None

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    authing_config.TOKEN_ENDPOINT,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": authing_config.AUTHING_APP_ID,
                        "client_secret": authing_config.AUTHING_APP_SECRET,
                        "audience": f"{authing_config.AUTHING_DOMAIN}/api/v3/",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                response.raise_for_status()
                data = response.json()
                cls._token = data.get("access_token")
                cls._expires_at = time.time() + data.get("expires_in", 3600)
                return cls._token
        except Exception as e:
            print(f"[Auth] Failed to get management token: {e}")
            return None


async def get_active_users(
    page: int = 1,
    limit: int = 20,
) -> Dict[str, Any]:
    """
    List application active users via Authing Management API.
    Falls back to mock data if not configured.
    """
    token = await AuthingManagementToken.get_token()

    if not token:
        return _mock_active_users(page, limit)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            headers = {
                "Authorization": f"Bearer {token}",
            }
            if authing_config.AUTHING_USERPOOL_ID:
                headers["x-authing-userpool-id"] = authing_config.AUTHING_USERPOOL_ID

            params = {
                "appId": authing_config.AUTHING_APP_ID,
                "page": page,
                "limit": limit,
            }

            response = await client.get(
                authing_config.ACTIVE_USERS_ENDPOINT,
                headers=headers,
                params=params,
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"[Auth] Failed to fetch active users: {e}")
        return _mock_active_users(page, limit)


def _mock_active_users(page: int = 1, limit: int = 20) -> Dict[str, Any]:
    """Mock data for development / when Authing is not configured"""
    all_users = [
        {"id": "1", "displayName": "Trader_Xiao", "name": "Trader_Xiao", "photo": "", "lastLogin": "2026-06-17T11:30:00Z", "online": True},
        {"id": "2", "displayName": "FactorHunter", "name": "FactorHunter", "photo": "", "lastLogin": "2026-06-17T11:25:00Z", "online": True},
        {"id": "3", "displayName": "ValueSeeker", "name": "ValueSeeker", "photo": "", "lastLogin": "2026-06-17T11:20:00Z", "online": True},
        {"id": "4", "displayName": "QuantJia", "name": "QuantJia", "photo": "", "lastLogin": "2026-06-17T11:15:00Z", "online": True},
        {"id": "5", "displayName": "AlphaTrader", "name": "AlphaTrader", "photo": "", "lastLogin": "2026-06-17T10:45:00Z", "online": False},
        {"id": "6", "displayName": "BetaAnalyst", "name": "BetaAnalyst", "photo": "", "lastLogin": "2026-06-17T10:30:00Z", "online": False},
        {"id": "7", "displayName": "MomentumKing", "name": "MomentumKing", "photo": "", "lastLogin": "2026-06-17T09:00:00Z", "online": False},
        {"id": "8", "displayName": "DeepValue", "name": "DeepValue", "photo": "", "lastLogin": "2026-06-17T08:45:00Z", "online": False},
    ]

    start = (page - 1) * limit
    end = start + limit
    page_users = all_users[start:end]

    return {
        "totalCount": len(all_users),
        "list": page_users,
    }
