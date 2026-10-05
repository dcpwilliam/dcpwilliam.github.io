"""API 层：只负责接参数、调 service、回 JSON。"""
from ..core.router import Router
from . import health, legacy_state, prompt, timeline, users

MODULES = [health, prompt, timeline, users, legacy_state]


def build_router():
    """按模块顺序注册路由，返回可直接交给 server 的 Router。"""
    router = Router()
    for module in MODULES:
        module.register(router)
    return router


__all__ = ["build_router", "MODULES"]
