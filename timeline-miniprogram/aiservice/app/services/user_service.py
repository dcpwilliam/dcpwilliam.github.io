"""用户服务：增删改查 / 全量导出导入 / 与小程序备份协议兼容的 state。"""
import time

from ..core.errors import NotFound
from ..storage import json_store
from ..storage import schema


def now():
    return int(time.time() * 1000)


def list_users():
    return {"users": json_store.list_users(), "total": len(json_store.list_users())}


def create(payload=None):
    payload = payload or {}
    user = schema.make_user(
        payload.get("id"),
        payload.get("name", ""),
        payload.get("email", ""),
        sub=payload.get("sub", ""),
        **{k: v for k, v in payload.items() if k not in ("id", "name", "email", "sub")}
    )
    state = schema.empty_state(user["id"])
    state["user"] = user
    json_store.save(user["id"], state)
    return {"user": user}


def get(user_id):
    state = json_store.load(user_id)
    if not json_store.exists(user_id):
        raise NotFound("没有这个用户: %s" % user_id)
    return {"user": state["user"], "counts": _counts(state)}


def update_user(user_id, payload):
    def mutate(state):
        user = state["user"]
        for key in ("name", "email", "sub"):
            if key in (payload or {}):
                user[key] = payload[key]
        if isinstance(payload.get("settings"), dict):
            user.setdefault("settings", {}).update(payload["settings"])
        user["updatedAt"] = now()
        return {"user": user}
    return json_store.update(user_id, mutate)


def remove(user_id):
    if not json_store.remove(user_id):
        raise NotFound("没有这个用户: %s" % user_id)
    return {"removed": user_id}


def _counts(state):
    goals = state.get("goals") or []
    records = state.get("records") or []
    tasks = [t for r in records for t in r.get("tasks", [])]
    return {
        "goals": len(goals),
        "activeGoals": sum(1 for g in goals if g.get("status") != "done"),
        "records": len(records),
        "tasks": len(tasks),
        "doneTasks": sum(1 for t in tasks if t.get("done")),
        "messages": len(state.get("messages") or []),
        "updatedAt": state.get("updatedAt", 0),
    }


def export(user_id):
    state = json_store.load(user_id)
    return {"user": state["user"], "goals": state["goals"],
            "records": state["records"], "messages": state["messages"],
            "updatedAt": state["updatedAt"]}


def import_data(user_id, payload, mode="replace"):
    """导入：replace 覆盖，merge 追加。"""
    payload = payload or {}

    def mutate(state):
        incoming = schema.normalize_state(payload, user_id)
        if mode == "merge":
            seen = {g["id"] for g in state["goals"]}
            state["goals"].extend([g for g in incoming["goals"] if g["id"] not in seen])
            seen_r = {r["id"] for r in state["records"]}
            state["records"].extend([r for r in incoming["records"] if r["id"] not in seen_r])
            state["messages"] = (incoming["messages"] + state["messages"])[:schema.MAX_MESSAGES]
        else:
            state["goals"] = incoming["goals"]
            state["records"] = incoming["records"]
            state["messages"] = incoming["messages"]
        return {"user": state["user"], "counts": _counts(state), "mode": mode}
    return json_store.update(user_id, mutate)


# ---------- 与小程序 /api/state 协议兼容 ----------

def get_state(user_id):
    """小程序 utils/oidc.js 的 pullState() 直接吃这个结构。"""
    state = json_store.load(user_id)
    return {"sub": user_id, "goals": state["goals"],
            "records": state["records"], "updatedAt": state["updatedAt"]}


def put_state(user_id, payload):
    """对应小程序的 pushState()。"""
    def mutate(state):
        state["goals"] = [schema.normalize_goal(g) for g in (payload.get("goals") or [])]
        state["goals"] = [g for g in state["goals"] if g]
        state["records"] = [schema.normalize_record(r) for r in (payload.get("records") or [])]
        state["records"] = [r for r in state["records"] if r]
        return {"sub": user_id, "goals": state["goals"],
                "records": state["records"], "updatedAt": now()}
    return json_store.update(user_id, mutate)
