"""一句话分析器：本地规则版，对应小程序 utils/engine.js 的 analyze()。

输出与小程序保持一致，方便两端对拍：
    {
      intent, intentLabel, category{key,name,color},
      quantity{value,unit}, metricKind, horizon{days,label},
      goalTitle, suggestedTitle, summary, suggestions[], criterion
    }
"""
import re

from . import categories, dates

# ---------------- 中文数字 ----------------

_CN_DIGIT = {"零": 0, "一": 1, "两": 2, "二": 2, "三": 3, "四": 4, "五": 5,
             "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}


def to_number(s):
    """'十' -> 10, '二十' -> 20, '一百' -> 100, '3' -> 3"""
    s = str(s).strip()
    if re.fullmatch(r"\d+", s):
        return int(s)
    if not s:
        return 0
    if "十" in s:
        left, _, right = s.partition("十")
        return (_CN_DIGIT.get(left, 1) if left else 1) * 10 + (_CN_DIGIT.get(right, 0) if right else 0)
    if "百" in s:
        left, _, right = s.partition("百")
        return (_CN_DIGIT.get(left, 1) if left else 1) * 100 + (_CN_DIGIT.get(right, 0) if right else 0)
    total = 0
    for ch in s:
        if ch in _CN_DIGIT:
            total = total * 10 + _CN_DIGIT[ch]
    return total


# ---------------- 时限 ----------------

_UNIT_DAYS = {"天": 1, "日": 1, "周": 7, "星期": 7, "月": 30, "年": 365}


def parse_horizon(text):
    """'三个月内减重10斤' -> {days: 90, label: '3个月'}"""
    raw = str(text or "")

    if "年底" in raw or "年末" in raw or "今年" in raw:
        d = dates.parse(dates.today())
        end = dates.parse("%d-12-31" % d.year)
        days = max(1, (end - d).days)
        return {"days": days, "label": "年底（约 %d 天）" % days}
    if "半年" in raw:
        return {"days": 180, "label": "半年"}

    m = re.search(r"([\d]{1,4}|[零一二两三四五六七八九十百]+)\s*(天|日|周|星期|个月|月|年)(?:之内|以内|内|后|之前|前)?", raw)
    if m:
        num = to_number(m.group(1))
        unit = m.group(2)
        if unit == "个月":
            days, label = num * 30, "%d个月" % num
        else:
            days = num * _UNIT_DAYS.get(unit, 1)
            label = "%d%s" % (num, unit)
        return {"days": days, "label": label}
    return {"days": 0, "label": "未设时限"}


# ---------------- 数值 ----------------

_QTY = re.compile(r"([\d]+(?:\.\d+)?|[零一二两三四五六七八九十百]+)\s*(万|千|公里|km|页|斤|公斤|kg|元|块|个|次|小时|分钟|天)")

_UNITS = ["万", "千", "公里", "km", "页", "斤", "公斤", "kg", "元", "块", "个", "次", "小时", "分钟", "天"]


def parse_quantity(text):
    """抓出句子里的数字 + 单位；判断它是「目标量」还是「已完成量」。"""
    raw = str(text or "")
    m = _QTY.search(raw)
    if not m:
        return None
    value = float(to_number(m.group(1)))
    unit = m.group(2)
    # 汇报语气的词出现在数字前，说明这是"已经做了多少"
    done_words = ["了", "完成", "跑完", "读完", "存下", "背完", "做了", "写完"]
    metric_kind = "target"
    for w in done_words:
        idx = raw.find(w)
        if idx != -1 and idx < m.start():
            metric_kind = "done"
            break
    return {"value": value, "unit": unit, "kind": metric_kind}


# ---------------- 意图 ----------------

INTENT_RULES = [
    ("setback", ["没坚持", "又没", "没做到", "放弃", "坚持不下来", "懒", "拖延", "失败",
                 "太难", "做不到", "卡住", "没动力", "又拖延", "崩了", "又拖"]),
    ("ask", ["怎么办", "如何", "怎么", "求建议", "有没有办法", "该不该", "要不要", "迷茫",
             "不知道", "从哪开始", "求助", "?", "？"]),
    ("progress", ["今天", "刚刚", "刚才", "这周", "昨天", "已经", "完成了", "做了", "跑了",
                  "读了", "存了", "写完", "背完", "进展", "搞定"]),
    ("new", ["想", "要", "打算", "准备", "计划", "目标", "希望", "决定", "立个", "开始"]),
]

INTENT_LABEL = {
    "progress": "汇报进展",
    "ask": "想问办法",
    "setback": "遇到阻力",
    "new": "冒出新目标",
}


def detect_intent(text):
    raw = str(text or "")
    for intent, words in INTENT_RULES:
        for w in words:
            if w in raw:
                return intent
    return "new"


# ---------------- 建议 ----------------

ACTION_POOL = {
    "fitness": [
        {"title": "做一次 20 分钟的基础训练", "tip": "先动起来，强度以后再加", "minutes": 20},
        {"title": "记录今天三餐，算一次热量缺口", "tip": "看不见的数字最容易失控", "minutes": 10},
    ],
    "study": [
        {"title": "完成今天的一个最小学习单元", "tip": "一章或 20 页，先完成再谈质量", "minutes": 35},
        {"title": "整理一份错题/笔记", "tip": "输出一遍，记忆才真的归你", "minutes": 25},
    ],
    "career": [
        {"title": "列出 3 个目标公司或岗位", "tip": "先有靶子，简历才知道怎么写", "minutes": 20},
        {"title": "改写简历里的一条经历，带上数字结果", "tip": "没有数字的成果等于没成果", "minutes": 30},
    ],
    "money": [
        {"title": "导出近 30 天账单，找出前 3 个漏点", "tip": "省钱从看见开始", "minutes": 20},
        {"title": "设置工资日自动转账到储蓄账户", "tip": "自动化比自律可靠", "minutes": 10},
    ],
    "create": [
        {"title": "写出一个 300 字的毛坯稿", "tip": "先有草稿，才有修改", "minutes": 30},
        {"title": "发布一件半成品，收集一次反馈", "tip": "反馈比完美重要", "minutes": 15},
    ],
    "social": [
        {"title": "主动联系一位久未联络的人", "tip": "一句具体的关心就够", "minutes": 10},
        {"title": "为这周安排一次线下见面", "tip": "写进日历才算数", "minutes": 10},
    ],
    "generic": [
        {"title": "把目标写成一句可验收的话", "tip": "有数字、有截止日、有验收方式", "minutes": 15},
        {"title": "拆出今天能完成的最小一步", "tip": "能在 30 分钟内做完才算", "minutes": 15},
    ],
}

DEFAULT_TITLE = {
    "fitness": "把身体状态拉回正轨",
    "study": "把学习进度推起来",
    "career": "推进职业上的下一步",
    "money": "把钱攒下来",
    "create": "持续产出作品",
    "social": "经营好重要关系",
    "generic": "推进这件在意的事",
}


def suggest(category_key):
    return ACTION_POOL.get(category_key) or ACTION_POOL["generic"]


def suggested_title(text, intent, category_key):
    """新目标才用原话当标题；汇报/阻力用领域默认名，避免'今天跑了3公里'变成目标名。"""
    if intent == "new":
        cleaned = re.sub(r"^(我想|我要|我打算|打算|准备|希望|计划)", "", str(text or "").strip())
        return cleaned[:24] or DEFAULT_TITLE.get(category_key, "新目标")
    return DEFAULT_TITLE.get(category_key, "新目标")


def criterion_of(text, horizon, quantity):
    bits = []
    if quantity:
        bits.append("%g%s" % (quantity["value"], quantity["unit"]))
    if horizon.get("days"):
        bits.append(horizon["label"])
    head = ("在" + " · ".join(bits) + "之内") if bits else ""
    return head + "，我能明确说出它已经完成了"


def summarize(intent, category, horizon, quantity):
    name = category["name"]
    if intent == "progress":
        base = "记下了：你在往前走。%s这类事最怕断档，连续性比强度更值钱 —— 今天这一笔已经算数了。"
    elif intent == "setback":
        base = "听起来卡住了。%s上出现阻力，通常不是意志力问题，而是下一步定得太大。先挑一件 10 分钟能做完的。"
    elif intent == "ask":
        base = "你想知道怎么开始。%s的第一步几乎总是同一个：把它写成一个能验收的小目标，然后今天做掉它的最小一块。"
    else:
        base = "你要的是一件%s的事。先别定大计划：把它拆成今天就能做完的最小一步，成败通常在第一周就决定了。"
    text = base % name
    if horizon.get("days"):
        text += " 时限：%s。" % horizon["label"]
    return text


# ---------------- 主入口 ----------------

def analyze(text):
    raw = str(text or "").strip()
    intent = detect_intent(raw)
    category = categories.detect(raw)
    horizon = parse_horizon(raw)
    quantity = parse_quantity(raw)
    metric_kind = quantity["kind"] if quantity else None
    title = suggested_title(raw, intent, category["key"])
    return {
        "text": raw,
        "intent": intent,
        "intentLabel": INTENT_LABEL.get(intent, "一句话"),
        "category": categories.short(category),
        "quantity": quantity,
        "metricKind": metric_kind,
        "horizon": horizon,
        "goalTitle": title,
        "suggestedTitle": title,
        "summary": summarize(intent, category, horizon, quantity),
        "suggestions": suggest(category["key"]),
        "criterion": criterion_of(raw, horizon, quantity),
    }
