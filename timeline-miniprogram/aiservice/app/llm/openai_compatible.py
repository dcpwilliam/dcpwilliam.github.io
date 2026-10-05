"""OpenAI 兼容 Provider：DeepSeek / 通义 /  moonshot / 本地 Ollama(v1) 都能用。

只依赖标准库 urllib。没配 API Key 时 available=False，上层会自动回落到 echo。
"""
import json
import urllib.error
import urllib.request

from ..config import config
from .base import LLMProvider


class OpenAICompatibleProvider(LLMProvider):
    name = "openai"

    def __init__(self, base_url=None, api_key=None, model=None, timeout=None):
        self.base_url = (base_url or config.LLM_BASE_URL).rstrip("/")
        self.api_key = api_key or config.LLM_API_KEY
        self.model = model or config.LLM_MODEL
        self.timeout = timeout or config.LLM_TIMEOUT

    @property
    def available(self):
        return bool(self.api_key)

    def complete(self, system, user, expect_json=False, temperature=None, max_tokens=None):
        if not self.available:
            raise RuntimeError("未配置 LLM_API_KEY")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system or ""},
                {"role": "user", "content": user or ""},
            ],
            "temperature": config.LLM_TEMPERATURE if temperature is None else temperature,
        }
        # 一定要给上限：推理型模型没有 max_tokens 会一直写 chain-of-thought 直到超时
        payload["max_tokens"] = max_tokens or config.LLM_MAX_TOKENS
        # 主流兼容端都支持；ollama / llama.cpp 有些实现会报错，用 LLM_JSON_MODE=0 关掉。
        # 本机 LFM2.5 带 json_object 语法会陷入死循环，默认关。
        if config.LLM_JSON_MODE:
            payload["response_format"] = {"type": "json_object" if expect_json else "text"}

        req = urllib.request.Request(
            self.base_url + "/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer " + self.api_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")[:300]
            raise RuntimeError("LLM 返回 %s: %s" % (e.code, detail))
        except urllib.error.URLError as e:
            raise RuntimeError("连不上 LLM 服务: %s" % e.reason)

        try:
            return body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise RuntimeError("LLM 返回结构异常: %s" % json.dumps(body, ensure_ascii=False)[:300])
