"""时间线服务：七天窗口、按天聚合、任务勾选、统计。

与小程序 pages/timeline 的渲染结构对齐：
    days: [{ date, rel, md, isToday, tasks[], done, total, open }]
"""
import logging

from ..core.errors import NotFound
from ..domain import dates, goals as g
from ..storage import update

log = logging.getLogger("aiservice.timeline")


def _default_start(records):
    """窗口起点：有更早的记录就从那条开始，否则今天。"""
    start = dates.today()
    for r in records:
        if r.get("start") and dates.diff_days(r["start"], start) > 0:
            start = r["start"]
    return start


def get_timeline(user_id, start=None, days=7, goal_id=None, open_map=None):
    """返回按天折叠好的时间线 + 窗口信息。"""
    open_map = open_map or {}

    def build(state):
        records = state["records"]
        if goal_id:
            records = [r for r in records if r.get("goalId") == goal_id]
        win_start = start or _default_start(records)
        today = dates.today()

        out_days = []
        for d in dates.date_range(win_start, days):
            tasks = []
            for r in records:
                for t in r.get("tasks", []):
                    if t.get("date") != d:
                        continue
                    tasks.append({
                        "id": t["id"],
                        "recordId": r["id"],
                        "title": t.get("title", ""),
                        "tip": t.get("tip", ""),
                        "phase": t.get("phase", "行动"),
                        "minutes": t.get("minutes", 15),
                        "done": bool(t.get("done")),
                        "doneAt": t.get("doneAt", 0),
                        "color": r.get("categoryColor", "#5B6CFF"),
                        "goalName": r.get("goal") or r.get("need", ""),
                    })
            done = sum(1 for t in tasks if t["done"])
            opened = open_map.get(d)
            if opened is None:
                offset = dates.diff_days(today, d)
                opened = 0 <= offset <= 1
            out_days.append({
                "date": d,
                "rel": dates.relative(d),
                "md": dates.md(d),
                "isToday": d == today,
                "tasks": tasks,
                "done": done,
                "total": len(tasks),
                "open": opened,
            })

        total = sum(x["total"] for x in out_days)
        done = sum(x["done"] for x in out_days)
        minutes = sum(t["minutes"] for x in out_days for t in x["tasks"] if t["done"])

        return {
            "windowStart": win_start,
            "rangeLabel": "%s - %s" % (
                dates.md(win_start).split(" ")[0],
                dates.md(dates.add_days(win_start, days - 1)).split(" ")[0],
            ),
            "isCurrent": win_start == today,
            "days": out_days,
            "stats": {
                "done": done,
                "total": total,
                "percent": round(done / total * 100) if total else 0,
                "minutes": minutes,
            },
            "filters": [{"id": r["id"], "need": r.get("goal") or r.get("need", ""),
                         "color": r.get("categoryColor", "#5B6CFF")} for r in state["records"]],
        }

    return update(user_id, build)


def stats(user_id, days=7):
    data = get_timeline(user_id, days=days)
    return {"stats": data["stats"], "windowStart": data["windowStart"], "rangeLabel": data["rangeLabel"]}


def list_records(user_id):
    def build(state):
        out = []
        for r in state["records"]:
            p = g.progress_of(r)
            out.append({
                "id": r["id"],
                "need": r.get("goal") or r.get("need", ""),
                "goalId": r.get("goalId", ""),
                "color": r.get("categoryColor", "#5B6CFF"),
                "option": r.get("option", {}),
                "start": r.get("start"),
                "end": r.get("end"),
                "done": p["done"],
                "total": p["total"],
                "percent": p["percent"],
            })
        return {"records": out, "total": len(out)}
    return update(user_id, build)


def add_record(user_id, payload):
    """直接塞一条记录（小程序端已经排好任务时用）。"""
    def mutate(state):
        from ..storage import schema
        record = schema.normalize_record(dict(payload or {}))
        state["records"].insert(0, record)
        g.sync_all(state["goals"], state["records"])
        return {"record": record}
    return update(user_id, mutate)


def toggle_task(user_id, record_id, task_id, done=None):
    """勾选 / 取消勾选，并回写目标进度。"""
    def mutate(state):
        record = next((r for r in state["records"] if r["id"] == record_id), None)
        if not record:
            raise NotFound("没有这条记录: %s" % record_id)
        task = next((t for t in record.get("tasks", []) if t["id"] == task_id), None)
        if not task:
            raise NotFound("没有这个任务: %s" % task_id)
        import time
        task["done"] = (not task["done"]) if done is None else bool(done)
        task["doneAt"] = int(time.time() * 1000) if task["done"] else 0
        g.sync_all(state["goals"], state["records"])
        log.info("勾选任务 | user=%s task=%s done=%s 记录进度=%s%%",
                 user_id, task_id, task["done"], g.progress_of(record)["percent"])
        return {"task": task, "progress": g.progress_of(record)}
    return update(user_id, mutate)


def remove_record(user_id, record_id):
    def mutate(state):
        before = len(state["records"])
        state["records"] = [r for r in state["records"] if r["id"] != record_id]
        if len(state["records"]) == before:
            raise NotFound("没有这条记录: %s" % record_id)
        g.sync_all(state["goals"], state["records"])
        return {"removed": record_id}
    return update(user_id, mutate)


def sync(user_id):
    """重算所有目标进度（小程序每次对话 / 勾选后都会调一次）。"""
    def mutate(state):
        g.sync_all(state["goals"], state["records"])
        return {"goals": state["goals"], "total": len(state["goals"])}
    return update(user_id, mutate)
