"""目标服务：列表 / 新建 / 一句话归拢 / 加行动 / 标记达成 / 删除。"""
import logging
import time

from ..core.errors import NotFound
from ..domain import analyzer, dates, goals as g
from ..storage import update

log = logging.getLogger("aiservice.goal")


def now():
    return int(time.time() * 1000)


def list_goals(user_id):
    def mutate(state):
        g.sync_all(state["goals"], state["records"])

    state = update(user_id, mutate)
    return {"goals": state["goals"], "total": len(state["goals"])}


def create(user_id, payload):
    """直接按字段建目标，或给一句 text 让服务端分析后再建。"""
    text = (payload or {}).get("text", "").strip()

    def mutate(state):
        if text:
            analysis = analyzer.analyze(text)
            goal = g.create_goal(analysis)
            g.apply_metric(goal, analysis)
        else:
            from ..storage import schema
            goal = schema.normalize_goal(dict(payload or {}))
        state["goals"].insert(0, goal)
        g.sync_all(state["goals"], state["records"])
        return goal

    goal = update(user_id, mutate)
    return {"goal": goal}


def get(user_id, goal_id):
    def mutate(state):
        g.sync_all(state["goals"], state["records"])

    state = update(user_id, mutate)
    for item in state["goals"]:
        if item["id"] == goal_id:
            return {"goal": item}
    raise NotFound("没有这个目标: %s" % goal_id)


def ingest(user_id, text):
    """把一句话归拢进已有目标，或冒出一个新目标 —— 小程序「需求」页的核心动作。"""
    analysis = analyzer.analyze(text)

    def mutate(state):
        goals = state["goals"]
        hit = g.match_goal(text, analysis["category"]["key"], goals)
        is_new = False
        if hit:
            goal = hit["goal"]
            g.apply_metric(goal, analysis)
            g.mention(goal, analysis)
            matched_score = hit["score"]
        elif analysis["intent"] in ("setback", "ask"):
            recent = g.recent_active_goal(goals, 7)
            if recent:
                goal = recent
                g.mention(goal, analysis)
                matched_score = 0.4
            else:
                is_new = True
        else:
            is_new = True

        if is_new:
            goal = g.create_goal(analysis)
            g.apply_metric(goal, analysis)
            goals.insert(0, goal)
            matched_score = 0

        g.sync_all(goals, state["records"])
        log.info("ingest | user=%s %s 目标=%s 意图=%s 分数=%.2f 目标数=%d",
                 user_id, "新建" if is_new else "归拢", goal.get("title"),
                 analysis["intent"], matched_score, len(goals))
        return {
            "analysis": analysis,
            "isNew": is_new,
            "goal": goal,
            "score": matched_score,
        }

    return update(user_id, mutate)


def add_action(user_id, goal_id, actions=None, start=None):
    """给目标追加行动，落进时间线。"""
    def mutate(state):
        goal = next((x for x in state["goals"] if x["id"] == goal_id), None)
        if not goal:
            raise NotFound("没有这个目标: %s" % goal_id)
        if not actions:
            from ..domain import categories as cats
            pool = analyzer.ACTION_POOL.get(goal.get("categoryKey")) or analyzer.ACTION_POOL["generic"]
            actions_in = [dict(pool[0])]
        else:
            actions_in = [
                {"title": a.get("title", ""), "tip": a.get("tip", ""), "minutes": a.get("minutes", 15)}
                for a in actions
            ]
        record = g.build_action_record(goal, actions_in, start or dates.today())
        state["records"].insert(0, record)
        g.sync_all(state["goals"], state["records"])
        return {"record": record, "goal": goal}

    return update(user_id, mutate)


def finish(user_id, goal_id):
    def mutate(state):
        goal = next((x for x in state["goals"] if x["id"] == goal_id), None)
        if not goal:
            raise NotFound("没有这个目标: %s" % goal_id)
        goal["status"] = "done"
        goal["progress"] = 100
        goal["updatedAt"] = now()
        return {"goal": goal}

    return update(user_id, mutate)


def remove(user_id, goal_id):
    def mutate(state):
        before = len(state["goals"])
        state["goals"] = [x for x in state["goals"] if x["id"] != goal_id]
        state["records"] = [r for r in state["records"] if r.get("goalId") != goal_id]
        if len(state["goals"]) == before:
            raise NotFound("没有这个目标: %s" % goal_id)
        return {"removed": goal_id}

    return update(user_id, mutate)
