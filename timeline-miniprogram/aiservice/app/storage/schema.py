"""数据结构定义与规范化。

与小程序 Storage 里的三个 key 一一对应：
    tl_goals_v1   -> state["goals"]
    tl_records_v1 -> state["records"]
    tl_msgs_v1    -> state["messages"]
"""
import time

from ..domain import dates, new_id

MAX_MENTIONS = 20
MAX_MESSAGES = 60


def now_ms():
    return int(time.time() * 1000)


# ---------------- 用户 ----------------

def make_user(user_id=None, name="", email="", **extra):
    now = now_ms()
    return {
        "id": user_id or new_id("u_"),
        "name": name or ("用户" + (user_id or new_id(""))[:4]),
        "email": email,
        "sub": extra.get("sub") or "",
        "createdAt": now,
        "updatedAt": now,
        "settings": {
            "window": extra.get("window", 7),
            "llmProvider": extra.get("llmProvider", "echo"),
        },
        **{k: v for k, v in extra.items() if k not in ("sub", "window", "llmProvider")},
    }


def normalize_user(data):
    if not isinstance(data, dict):
        return None
    for key in ("name", "email", "sub"):
        data.setdefault(key, "")
    data.setdefault("settings", {})
    data.setdefault("createdAt", now_ms())
    data["updatedAt"] = now_ms()
    return data


# ---------------- 目标 ----------------

def normalize_goal(data):
    """补齐字段，避免前端少传一个字段就炸。"""
    if not isinstance(data, dict):
        return None
    now = now_ms()
    data.setdefault("id", new_id("g_"))
    data.setdefault("title", "未命名目标")
    data.setdefault("criterion", "")
    data.setdefault("categoryKey", "generic")
    data.setdefault("categoryName", "通用目标")
    data.setdefault("color", "#5B6CFF")
    data.setdefault("target", None)
    data["current"] = float(data.get("current") or 0)
    data.setdefault("status", "active")
    data.setdefault("progress", 0)
    data.setdefault("stalledDays", 0)
    data.setdefault("momentum", 0)
    data.setdefault("advice", "")
    data.setdefault("createdAt", now)
    data.setdefault("updatedAt", now)
    data.setdefault("lastMentionAt", data["createdAt"])
    data.setdefault("horizonDays", 0)
    data.setdefault("horizonLabel", "未设时限")
    mentions = data.get("mentions") or []
    data["mentions"] = [m for m in mentions if isinstance(m, dict)][:MAX_MENTIONS]
    return data


# ---------------- 任务 / 记录 ----------------

def normalize_task(task, index=0, start=None):
    if not isinstance(task, dict):
        return None
    task.setdefault("id", new_id("t_"))
    task.setdefault("index", index)
    task.setdefault("date", dates.add_days(start or dates.today(), index))
    task.setdefault("phase", "行动")
    task.setdefault("title", "")
    task.setdefault("tip", "")
    task["minutes"] = int(task.get("minutes") or 15)
    task["done"] = bool(task.get("done"))
    task.setdefault("doneAt", now_ms() if task["done"] else 0)
    return task


def normalize_record(data):
    if not isinstance(data, dict):
        return None
    now = now_ms()
    data.setdefault("id", new_id("r_"))
    data.setdefault("kind", "action")
    data.setdefault("need", data.get("goal") or "")
    data.setdefault("goal", data.get("need") or "")
    data.setdefault("goalId", "")
    data.setdefault("categoryKey", "generic")
    data.setdefault("categoryName", "通用目标")
    data.setdefault("categoryColor", "#5B6CFF")
    data.setdefault("horizonLabel", "未设时限")
    data.setdefault("createdAt", now)
    data.setdefault("option", {
        "id": "action", "tag": "即时", "name": "即时行动", "emoji": "⚡",
        "way": "", "probability": 0, "hasProbability": False, "cost": "", "risk": "",
    })
    tasks = [normalize_task(t, i, data.get("start")) for i, t in enumerate(data.get("tasks") or [])]
    data["tasks"] = [t for t in tasks if t]
    data["start"] = data.get("start") or (data["tasks"][0]["date"] if data["tasks"] else dates.today())
    data["end"] = data.get("end") or (data["tasks"][-1]["date"] if data["tasks"] else data["start"])
    return data


# ---------------- 会话 ----------------

def normalize_message(data):
    if not isinstance(data, dict):
        return None
    data.setdefault("id", new_id("m_"))
    data.setdefault("ts", now_ms())
    data.setdefault("text", "")
    data.setdefault("intent", "")
    data.setdefault("goalId", "")
    return data


# ---------------- 整体 ----------------

def empty_state(user_id):
    return {
        "user": make_user(user_id),
        "goals": [],
        "records": [],
        "messages": [],
        "updatedAt": now_ms(),
    }


def normalize_state(data, user_id=None):
    if not isinstance(data, dict):
        data = {}
    state = {
        "user": normalize_user(data.get("user")) or make_user(user_id),
        "goals": [g for g in (normalize_goal(x) for x in (data.get("goals") or [])) if g],
        "records": [r for r in (normalize_record(x) for x in (data.get("records") or [])) if r],
        "messages": [m for m in (normalize_message(x) for x in (data.get("messages") or [])) if m][:MAX_MESSAGES],
        "updatedAt": now_ms(),
    }
    if user_id and not state["user"].get("id"):
        state["user"]["id"] = user_id
    return state
