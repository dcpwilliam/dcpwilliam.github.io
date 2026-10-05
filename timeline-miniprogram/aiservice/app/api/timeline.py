"""时间线接口：七天窗口 / 统计 / 记录增删 / 任务勾选 / 目标进度重算。

路径里的 {user_id} 是用户 id；不传也可以，用 query 里的 user_id 会落到默认用户。
"""
from ..core.errors import BadRequest
from ..services import goal_service, timeline_service

DEFAULT_USER = "anonymous"


def _uid(req, user_id=None):
    return user_id or req.query.get("user_id") or DEFAULT_USER


def register(router):
    # ---------------- 时间线 ----------------

    @router.get("/api/timeline")
    def timeline(req):
        """GET /api/timeline?user_id=&start=&days=&goal_id="""
        return timeline_service.get_timeline(
            _uid(req),
            start=req.arg("start"),
            days=int(req.arg("days", 7)),
            goal_id=req.arg("goal_id"),
        )

    @router.get("/api/timeline/stats")
    def stats(req):
        return timeline_service.stats(_uid(req), days=int(req.arg("days", 7)))

    @router.get("/api/timeline/records")
    def records(req):
        return timeline_service.list_records(_uid(req))

    @router.post("/api/timeline/records")
    def add_record(req):
        body = req.json(default={})
        if not body.get("tasks"):
            raise BadRequest("tasks 不能为空")
        return timeline_service.add_record(_uid(req), body)

    @router.delete("/api/timeline/records/{record_id}")
    def remove_record(req, record_id):
        return timeline_service.remove_record(_uid(req), record_id)

    @router.patch("/api/timeline/tasks/{task_id}")
    def toggle_task(req, task_id):
        """body: { record_id, done? } —— done 不传就是取反"""
        body = req.json(default={})
        record_id = body.get("record_id") or body.get("recordId")
        if not record_id:
            raise BadRequest("缺少 record_id")
        return timeline_service.toggle_task(_uid(req), record_id, task_id, body.get("done"))

    @router.post("/api/timeline/sync")
    def sync(req):
        return timeline_service.sync(_uid(req))

    # ---------------- 目标 ----------------

    @router.get("/api/timeline/goals")
    def goals(req):
        return goal_service.list_goals(_uid(req))

    @router.post("/api/timeline/goals")
    def create_goal(req):
        body = req.json(default={})
        if not body.get("text") and not body.get("title"):
            raise BadRequest("text 或 title 至少给一个")
        return goal_service.create(_uid(req), body)

    @router.get("/api/timeline/goals/{goal_id}")
    def goal_detail(req, goal_id):
        return goal_service.get(_uid(req), goal_id)

    @router.post("/api/timeline/goals/{goal_id}/actions")
    def add_action(req, goal_id):
        """body: { actions: [{title,tip,minutes}], start? }"""
        body = req.json(default={})
        return goal_service.add_action(_uid(req), goal_id, body.get("actions"), body.get("start"))

    @router.post("/api/timeline/goals/{goal_id}/finish")
    def finish(req, goal_id):
        return goal_service.finish(_uid(req), goal_id)

    @router.delete("/api/timeline/goals/{goal_id}")
    def remove_goal(req, goal_id):
        return goal_service.remove(_uid(req), goal_id)

    # ---------------- 一句话归拢（需求页主流程） ----------------

    @router.post("/api/timeline/ingest")
    def ingest(req):
        """body: { text } —— 归拢到已有目标或冒出新目标"""
        body = req.json(default={})
        text = (body.get("text") or "").strip()
        if not text:
            raise BadRequest("text 不能为空")
        return goal_service.ingest(_uid(req), text)

    return router
