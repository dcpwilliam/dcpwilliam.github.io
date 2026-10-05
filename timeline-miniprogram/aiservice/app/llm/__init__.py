"""LLM 适配层：统一接口，echo（本地规则，默认）与 openai 兼容两种实现。

选择逻辑在 config.llm_provider()：没配 Key 就一律走 echo，保证服务永远可跑。
"""
from ..config import config
from .base import LLMProvider
from .echo_provider import EchoProvider
from .openai_compatible import OpenAICompatibleProvider

_cache = {}


def get_provider(name=None):
    name = name or config.llm_provider()
    if name in _cache:
        return _cache[name]
    if name == "openai":
        provider = OpenAICompatibleProvider()
        if not provider.available:
            provider = EchoProvider()
    else:
        provider = EchoProvider()
    _cache[name] = provider
    return provider


def complete(system, user, expect_json=False, provider=None, **kw):
    return get_provider(provider).complete(system, user, expect_json=expect_json, **kw)


def complete_json(system, user, provider=None, **kw):
    return get_provider(provider).complete_json(system, user, **kw)


__all__ = ["LLMProvider", "EchoProvider", "OpenAICompatibleProvider",
           "get_provider", "complete", "complete_json"]
