"""
EBI 循证投资 — Auth Router
OIDC token validation and online users API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from ..services.auth_service import get_active_users

router = APIRouter(prefix="/api/auth", tags=["auth"])

security = HTTPBearer(auto_error=False)


@router.get("/online-users")
async def list_online_users(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    获取应用在线用户列表。
    需要 OIDC access_token 或使用 Mock 数据。
    代理 Authing Management API: listApplicationActiveUsers
    """
    # In production, validate the access_token against Authing JWKS
    # For MVP, we allow requests without auth but log a warning
    if credentials:
        token = credentials.credentials
        # TODO: Validate token against Authing JWKS
        # For now, pass through
        pass

    result = await get_active_users(page=page, limit=limit)
    return result


@router.get("/me")
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    获取当前登录用户信息。
    使用 OIDC access_token 调用 Authing userinfo 端点。
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import httpx
    from ..services.auth_service import authing_config

    token = credentials.credentials

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{authing_config.OIDC_ISSUER}/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Token expired or invalid")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user info: {e}")


@router.post("/logout")
async def logout(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """登出（客户端应同时清除本地 token）"""
    return {"message": "Logged out successfully"}
