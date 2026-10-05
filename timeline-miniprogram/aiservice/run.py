#!/usr/bin/env python3
"""aiservice 入口。

    python run.py                 启动（默认 127.0.0.1:8100）
    python run.py --port 8200
    python run.py --host 0.0.0.0
    python run.py --selftest      起临时服务，把所有接口跑一遍后退出
    python run.py --routes        只打印接口清单
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import __version__                                    # noqa: E402
from app.api import build_router                               # noqa: E402
from app.config import config                                  # noqa: E402
from app.core import setup_logging as _setup, tail_logs        # noqa: E402
from app.core.logging import log_path                          # noqa: E402
from app.core.server import serve                              # noqa: E402


def setup_logging(level=None, log_dir=None):
    """控制台 + 滚动文件；返回 logger。"""
    return _setup(
        level=level or config.LOG_LEVEL,
        log_dir=log_dir or config.LOG_DIR,
        console=True,
    )


def print_routes(router):
    print("aiservice v%s 接口清单（%d 个）\n" % (__version__, len(router.routes)))
    width = max(len(r.path) for r in router.routes) + 2
    for r in sorted(router.routes, key=lambda x: (x.path, x.method)):
        print("  %-6s %-*s %s" % (r.method, width, r.path, r.doc))


def selftest():
    """起一个临时服务，用标准库跑一遍所有接口。不想装 curl / httpie 也能验证。"""
    import json
    import threading
    import urllib.error
    import urllib.request
    from app.core.server import create_server

    router = build_router()
    httpd = create_server(router, "127.0.0.1", 0)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%d" % port

    def call(method, path, body=None):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(
            base + path, data=data, method=method,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode("utf-8", "ignore") or "{}")

    passed, failed = 0, 0

    def check(name, cond, extra=""):
        nonlocal passed, failed
        if cond:
            passed += 1
            print("  ✓ %s %s" % (name, extra))
        else:
            failed += 1
            print("  ✗ %s %s" % (name, extra))

    print("aiservice 自测 v%s\n" % __version__)

    code, data = call("GET", "/health")
    check("GET /health", code == 200 and data.get("ok"), "llm=%s" % data.get("llmProvider"))

    code, data = call("GET", "/api/info")
    check("GET /api/info", code == 200 and len(data.get("routes", [])) > 10,
          "%d 个接口" % len(data.get("routes", [])))

    # ---- prompt ----
    code, data = call("GET", "/api/prompt/templates")
    check("GET /api/prompt/templates", code == 200 and len(data.get("templates", [])) >= 4)

    code, data = call("POST", "/api/prompt/render", {"template": "analyze", "variables": {"text": "三个月内减重10斤"}})
    check("POST /api/prompt/render", code == 200 and "三个月内减重10斤" in data.get("user", ""))

    code, data = call("POST", "/api/prompt/analyze", {"text": "三个月内减重 10 斤"})
    cat = data.get("category")
    cat_key = cat.get("key") if isinstance(cat, dict) else cat
    check("POST /api/prompt/analyze", code == 200 and cat_key == "fitness",
          "意图=%s 领域=%s" % (data.get("intentLabel"), cat_key))

    code, data = call("POST", "/api/prompt/complete", {"template": "reframe", "variables": {"text": "最近又没坚持下来"}})
    check("POST /api/prompt/complete", code == 200 and bool(data.get("text")))

    # ---- 用户 ----
    code, data = call("POST", "/api/users", {"name": "自测用户", "email": "selftest@timeline.dev"})
    uid = (data.get("user") or {}).get("id")
    check("POST /api/users", code == 200 and bool(uid), "user_id=%s" % uid)

    code, data = call("GET", "/api/users")
    check("GET /api/users", code == 200 and data.get("total", 0) >= 1)

    code, data = call("GET", "/api/users/%s" % uid)
    check("GET /api/users/{id}", code == 200 and data["user"]["name"] == "自测用户")

    code, data = call("PATCH", "/api/users/%s" % uid, {"name": "自测用户改名"})
    check("PATCH /api/users/{id}", code == 200 and data["user"]["name"] == "自测用户改名")

    # ---- 时间线：一句话 -> 目标 -> 行动 ----
    code, data = call("POST", "/api/timeline/ingest?user_id=%s" % uid, {"text": "三个月内减重 10 斤"})
    goal_id = (data.get("goal") or {}).get("id")
    check("POST /api/timeline/ingest（新目标）", code == 200 and bool(goal_id),
          "isNew=%s 目标=%s" % (data.get("isNew"), (data.get("goal") or {}).get("title")))

    code, data = call("POST", "/api/timeline/ingest?user_id=%s" % uid, {"text": "今天跑了 3 公里"})
    check("POST /api/timeline/ingest（归拢）", code == 200 and data.get("isNew") is False,
          "匹配分=%s" % data.get("score"))

    code, data = call("POST", "/api/timeline/goals/%s/actions?user_id=%s" % (goal_id, uid),
                      {"actions": [{"title": "跑 3 公里", "tip": "配速随意，跑完就行", "minutes": 30}]})
    record_id = (data.get("record") or {}).get("id")
    task_id = ((data.get("record") or {}).get("tasks") or [{}])[0].get("id")
    check("POST 目标加行动", code == 200 and bool(task_id))

    code, data = call("GET", "/api/timeline?user_id=%s&days=7" % uid)
    days = data.get("days") or []
    check("GET /api/timeline", code == 200 and len(days) == 7 and sum(d["total"] for d in days) >= 1,
          "完成 %s/%s" % (data["stats"]["done"], data["stats"]["total"]))

    code, data = call("PATCH", "/api/timeline/tasks/%s?user_id=%s" % (task_id, uid),
                      {"record_id": record_id, "done": True})
    check("PATCH 勾选任务", code == 200 and data["task"]["done"] is True,
          "记录进度 %s%%" % data["progress"]["percent"])

    code, data = call("POST", "/api/timeline/sync?user_id=%s" % uid)
    check("POST /api/timeline/sync", code == 200 and data["total"] >= 1)

    code, data = call("GET", "/api/timeline/stats?user_id=%s" % uid)
    check("GET /api/timeline/stats", code == 200 and data["stats"]["done"] >= 1,
          "%s 分钟" % data["stats"]["minutes"])

    code, data = call("GET", "/api/timeline/goals?user_id=%s" % uid)
    check("GET /api/timeline/goals", code == 200 and len(data["goals"]) >= 1,
          "进度 %s%%" % data["goals"][0]["progress"])

    code, data = call("GET", "/api/users/%s/export" % uid)
    check("GET 导出", code == 200 and len(data.get("goals", [])) >= 1)

    code, data = call("POST", "/api/users/%s/import" % uid,
                      {"goals": data.get("goals", []), "records": data.get("records", []), "mode": "replace"})
    check("POST 导入", code == 200 and data["counts"]["goals"] >= 1)

    # ---- 兼容层 ----
    code, _ = call("GET", "/api/state")
    check("GET /api/state 无 token -> 401", code == 401)

    code, data = call("PUT", "/api/state?user_id=legacy_demo", {"goals": [], "records": []})
    check("PUT /api/state（调试模式）", code == 200 and data.get("sub") == "legacy_demo")

    # ---- 清理 ----
    code, _ = call("DELETE", "/api/users/%s" % uid)
    check("DELETE /api/users/{id}", code == 200)

    httpd.shutdown()
    print("\n通过 %d 项，失败 %d 项" % (passed, failed))
    return 0 if failed == 0 else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description="aiservice · Timeline 的 Python 侧服务")
    parser.add_argument("--host", default=config.HOST)
    parser.add_argument("--port", type=int, default=config.PORT)
    parser.add_argument("--data-dir", dest="data_dir")
    parser.add_argument("--log", dest="log_level")
    parser.add_argument("--routes", action="store_true", help="只打印接口清单")
    parser.add_argument("--selftest", action="store_true", help="起临时服务跑一遍所有接口")
    parser.add_argument("--logs", type=int, nargs="?", const=50, metavar="N",
                        help="打印最近 N 行日志")
    args = parser.parse_args(argv)

    if args.data_dir:
        config.DATA_DIR = args.data_dir
        config.LOG_DIR = os.path.join(args.data_dir, "logs")
    setup_logging(args.log_level)

    if args.logs is not None:
        path = log_path()
        print("日志文件:", path or "（未启用文件日志）")
        for line in tail_logs(args.logs):
            print(line)
        return 0

    if args.selftest:
        return selftest()

    router = build_router()
    if args.routes:
        print_routes(router)
        return 0

    serve(router, host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    sys.exit(main())
