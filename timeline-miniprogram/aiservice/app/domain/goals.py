"""目标维护：归拢、累计、重算。与小程序 utils/goals.js 的算法保持一致。"""
import time
import uuid
from datetime import datetime

from . import categories, dates

WEEK_MS = 7 * 86400000
CURRENCY = {"万": 10000, "千": 1000, "元": 1, "块": 1}


def uid():
    return "%s%s" % (int(time.time() * 1000), str(int(time.time() * 1e6) % 100000))


def new_id(prefix=""):
    return (prefix or "") + uuid.uuid4().hex[:12]


def round1(n):
    return round(n * 10) / 10


# ---------------- 相似度 ----------------

def _grams(s):
    import re
    t = re.sub(r"[^一-龥a-zA-Z0-9]", "", str(s or ""))
    if len(t) < 2:
        return {t} if t else set()
    return {t[i:i + 2] for i in range(len(t) - 1)}


def similarity(a, b):
    """2-gram Jaccard"""
    A, B = _grams(a), _grams(b)
    if not A or not B:
        return 0.0
    inter = len(A & B)
    return inter / (len(A) + len(B) - inter)


def match_goal(text, category_key, goals, threshold=0.42):
    """这句话该归到哪个目标？同领域 + 字面重合即命中。"""
    now = time.time() * 1000
    best, best_score = None, 0.0
    for g in goals:
        score = 0.55 * similarity(text, g.get("title", ""))
        if g.get("categoryKey") == category_key:
            score += 0.45
        if g.get("status") == "done":
            score -= 0.2
        last = g.get("lastMentionAt") or 0
        if last and (now - last) / 86400000 <= 3:
            score += 0.05
        if score > best_score:
            best, best_score = g, score
    if best is not None and best_score >= threshold:
        return {"goal": best, "score": round(best_score, 3)}
    return None


def recent_active_goal(goals, days=7):
    """「最近在忙的那个目标」——抱怨或提问往往说的是它。"""
    limit = time.time() * 1000 - days * 86400000
    best = None
    for g in goals:
        if g.get("status") == "done":
            continue
        if (g.get("lastMentionAt") or g.get("createdAt") or 0) < limit:
            continue
        if best is None or (g.get("lastMentionAt") or 0) > (best.get("lastMentionAt") or 0):
            best = g
    return best


# ---------------- 创建 ----------------

def create_goal(analysis):
    cat = categories.find(analysis["category"]["key"])
    qty = analysis.get("quantity")
    is_target = analysis.get("metricKind") == "target"
    now = int(time.time() * 1000)
    return {
        "id": new_id("g_"),
        "title": analysis.get("suggestedTitle") or analysis.get("goalTitle"),
        "criterion": analysis.get("criterion", ""),
        "categoryKey": cat["key"],
        "categoryName": cat["name"],
        "color": cat["color"],
        "target": {"value": qty["value"], "unit": qty["unit"]} if (is_target and qty) else None,
        "current": 0,
        "currentUnit": None,
        "horizonDays": analysis.get("horizon", {}).get("days", 0),
        "horizonLabel": analysis.get("horizon", {}).get("label", "未设时限"),
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
        "lastMentionAt": now,
        "mentions": [{"text": analysis.get("text", ""), "ts": now, "intent": analysis.get("intent")}],
        "progress": 0,
        "momentum": 0,
        "stalledDays": 0,
        "advice": "",
        "taskDone": 0,
        "taskTotal": 0,
    }


# ---------------- 累计 ----------------

def apply_metric(goal, analysis):
    """汇报了数字 -> 累计到目标进度（单位不一致时按货币表换算）。"""
    qty = analysis.get("quantity")
    if not qty:
        return goal
    if analysis.get("metricKind") != "done":
        if not goal.get("target"):
            goal["target"] = {"value": qty["value"], "unit": qty["unit"]}
        return goal
    target = goal.get("target")
    if not target:
        goal["current"] = round1(goal.get("current", 0) + qty["value"])
        goal["currentUnit"] = qty["unit"]
        return goal
    if target.get("unit") == qty["unit"]:
        goal["current"] = round1(goal.get("current", 0) + qty["value"])
        return goal
    src, dst = CURRENCY.get(qty["unit"]), CURRENCY.get(target.get("unit"))
    if src and dst:
        goal["current"] = round1(goal.get("current", 0) + qty["value"] * src / dst)
    return goal


def mention(goal, analysis, keep=20):
    now = int(time.time() * 1000)
    goal.setdefault("mentions", []).insert(0, {
        "text": analysis.get("text", ""),
        "ts": now,
        "intent": analysis.get("intent"),
    })
    goal["mentions"] = goal["mentions"][:keep]
    goal["lastMentionAt"] = now
    goal["updatedAt"] = now
    return goal


# ---------------- 重算 ----------------

def compose_advice(progress, done, total, recent, stalled_days):
    if progress >= 100:
        return "目标已经达成了。可以说一句复盘，或者直接立个新的。"
    if total == 0:
        return "还没有落地的行动，从下面的建议里挑一条放进时间线。"
    if stalled_days >= 5:
        return "已经 %d 天没有动静了，今天做一件 10 分钟能完成的事，把惯性接回来。" % stalled_days
    if stalled_days >= 2:
        return "有 %d 天没推进，先别追求质量，做最小的一步。" % stalled_days
    if recent >= 4:
        return "近七天完成了 %d 项，节奏很稳，可以考虑加一档强度。" % recent
    if progress >= 50:
        return "已经过半，后半程通常比前半程快，保持现在的节奏。"
    return "保持每天一个小动作，先把连续记录攒起来。"


def sync_goal(goal, records):
    """用时间线上的真实完成情况重算目标状态。手动标记达成后锁定，不再被覆盖。"""
    if goal.get("status") == "done":
        goal["progress"] = 100
        goal["advice"] = "这个目标已经完成了，剩下的就是别让它反弹。"
        return goal

    now = time.time() * 1000
    total = done = recent = 0
    last_done_at = 0
    for r in records:
        if r.get("goalId") != goal["id"]:
            continue
        for t in r.get("tasks", []):
            total += 1
            if t.get("done"):
                done += 1
                if t.get("doneAt") and now - t.get("doneAt", 0) < WEEK_MS:
                    recent += 1
                last_done_at = max(last_done_at, t.get("doneAt") or 0)

    target = goal.get("target")
    if target and target.get("value"):
        by_number = min(100, round((goal.get("current", 0) / target["value"]) * 100))
        progress = round(by_number * 0.5 + (done / total) * 100 * 0.5) if total else by_number
    elif total:
        progress = round(done / total * 100)
    else:
        progress = 0

    last_active = max(goal.get("lastMentionAt") or 0, last_done_at) or goal.get("createdAt", now)
    last_active_day = dates.fmt(datetime.fromtimestamp(last_active / 1000.0))
    stalled = max(0, dates.diff_days(last_active_day, dates.today()))

    goal["progress"] = progress
    goal["taskTotal"] = total
    goal["taskDone"] = done
    goal["momentum"] = recent
    goal["stalledDays"] = stalled
    goal["status"] = "done" if progress >= 100 else "active"
    goal["advice"] = compose_advice(progress, done, total, recent, stalled)
    return goal


def sync_all(goals, records):
    for g in goals:
        sync_goal(g, records)
    return goals


# ---------------- 行动记录 ----------------

def build_action_record(goal, actions, start_date=None):
    """目标 + 若干条即时行动 -> 一条时间线记录（行动按天依次排开）"""
    start = start_date or dates.today()
    tasks = []
    for i, a in enumerate(actions):
        tasks.append({
            "id": new_id("t_"),
            "index": i,
            "date": dates.add_days(start, i),
            "phase": "行动",
            "title": a.get("title", ""),
            "tip": a.get("tip", ""),
            "minutes": a.get("minutes", 15),
            "done": False,
            "doneAt": 0,
        })
    return {
        "id": new_id("r_"),
        "kind": "action",
        "goalId": goal["id"],
        "need": goal.get("title", ""),
        "goal": goal.get("title", ""),
        "categoryKey": goal.get("categoryKey"),
        "categoryName": goal.get("categoryName"),
        "categoryColor": goal.get("color"),
        "option": {
            "id": "action",
            "tag": "即时",
            "name": "即时行动",
            "emoji": "⚡",
            "way": "从你当下这句话里拆出来的下一步",
            "probability": 0,
            "hasProbability": False,
            "cost": "共 %d 条" % len(tasks),
            "risk": "",
        },
        "horizonLabel": goal.get("horizonLabel", "未设时限"),
        "createdAt": int(time.time() * 1000),
        "start": start,
        "end": dates.add_days(start, max(0, len(tasks) - 1)),
        "tasks": tasks,
    }


def progress_of(record):
    tasks = record.get("tasks", [])
    total = len(tasks)
    done = sum(1 for t in tasks if t.get("done"))
    return {"done": done, "total": total, "percent": round(done / total * 100) if total else 0}
