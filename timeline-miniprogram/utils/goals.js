/**
 * 目标维护
 * 目标不是用户填的表单，而是从一句句当下的话里自动长出来的：
 *   同一件事反复被提起 -> 归拢成一个目标
 *   汇报了数字 -> 自动累计进度
 *   长时间没动静 -> 自动给出提醒与建议
 */
const engine = require('./engine.js')
const date = require('./date.js')

const WEEK = 7 * 86400000

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/* ------------------------------ 创建目标 ------------------------------ */

function createGoal(analysis) {
  const need = engine.parseNeed(analysis.text)
  const qty = analysis.quantity
  const isTarget = analysis.metricKind === 'target'
  return {
    id: uid(),
    title: analysis.suggestedTitle || analysis.goalTitle,
    criterion: analysis.criterion,
    categoryKey: analysis.category.key,
    categoryName: analysis.category.name,
    color: analysis.category.color,
    target: isTarget && qty ? { value: qty.value, unit: qty.unit } : null,
    current: 0,
    horizonDays: need.horizon.days || 0,
    horizonLabel: need.horizon.label,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastMentionAt: Date.now(),
    mentions: [{ text: analysis.text, ts: Date.now(), intent: analysis.intent }],
    progress: 0,
    momentum: 0,
    stalledDays: 0,
    advice: ''
  }
}

/* ------------------------------ 目标匹配 ------------------------------ */

function grams(s) {
  const set = {}
  const t = String(s || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
  if (t.length < 2) {
    set[t] = 1
    return set
  }
  for (let i = 0; i < t.length - 1; i++) set[t.substr(i, 2)] = 1
  return set
}

function similarity(a, b) {
  const A = grams(a)
  const B = grams(b)
  let inter = 0
  let na = 0
  let nb = 0
  Object.keys(A).forEach(function (k) {
    na++
    if (B[k]) inter++
  })
  Object.keys(B).forEach(function () {
    nb++
  })
  if (!na || !nb) return 0
  return inter / (na + nb - inter)
}

/**
 * 这句话该归到哪个目标？同领域 + 有字面重合即算命中
 * @returns { goal, score } | null
 */
function matchGoal(text, categoryKey, goals) {
  let best = null
  let bestScore = 0
  goals.forEach(function (g) {
    let s = 0.55 * similarity(text, g.title) + (g.categoryKey === categoryKey ? 0.45 : 0)
    if (g.status === 'done') s -= 0.2
    // 最近提过的目标优先吸附
    const days = Math.round((Date.now() - (g.lastMentionAt || 0)) / 86400000)
    if (days <= 3) s += 0.05
    if (s > bestScore) {
      bestScore = s
      best = g
    }
  })
  return bestScore >= 0.42 ? { goal: best, score: bestScore } : null
}

/**
 * 「最近在忙的那个目标」——抱怨或提问往往说的是它
 * @param {number} days 只在 N 天内被提过才算
 */
function recentActiveGoal(goals, days) {
  const limit = Date.now() - (days || 7) * 86400000
  let best = null
  goals.forEach(function (g) {
    if (g.status === 'done') return
    if ((g.lastMentionAt || g.createdAt) < limit) return
    if (!best || (g.lastMentionAt || 0) > (best.lastMentionAt || 0)) best = g
  })
  return best
}

/* --------------------------- 自动维护（重算） --------------------------- */

function composeAdvice(goal, progress, done, total, recent, stalledDays) {
  if (progress >= 100) return '目标已经达成了。可以说一句复盘，或者直接立个新的。'
  if (total === 0) return '还没有落地的行动，从下面的建议里挑一条放进时间线。'
  if (stalledDays >= 5) return '已经 ' + stalledDays + ' 天没有动静了，今天做一件 10 分钟能完成的事，把惯性接回来。'
  if (stalledDays >= 2) return '有 ' + stalledDays + ' 天没推进，先别追求质量，做最小的一步。'
  if (recent >= 4) return '近七天完成了 ' + recent + ' 项，节奏很稳，可以考虑加一档强度。'
  if (progress >= 50) return '已经过半，后半程通常比前半程快，保持现在的节奏。'
  return '保持每天一个小动作，先把连续记录攒起来。'
}

/** 用时间线上的真实完成情况重算目标状态 */
function syncGoal(goal, records) {
  // 手动标记达成的目标锁定，不再被自动重算覆盖
  if (goal.status === 'done') {
    goal.progress = 100
    goal.advice = '这个目标已经完成了，剩下的就是别让它反弹。'
    return goal
  }

  const now = Date.now()
  let total = 0
  let done = 0
  let recent = 0
  let lastDoneAt = 0

  records.forEach(function (r) {
    if (r.goalId !== goal.id) return
    r.tasks.forEach(function (t) {
      total++
      if (t.done) {
        done++
        if (t.doneAt && now - t.doneAt < WEEK) recent++
        if (t.doneAt > lastDoneAt) lastDoneAt = t.doneAt
      }
    })
  })

  let progress = 0
  if (goal.target && goal.target.value) {
    const byNumber = Math.min(100, Math.round((goal.current / goal.target.value) * 100))
    progress = total ? Math.round(byNumber * 0.5 + (done / total) * 100 * 0.5) : byNumber
  } else if (total) {
    progress = Math.round((done / total) * 100)
  }

  const lastActive = Math.max(goal.lastMentionAt || 0, lastDoneAt) || goal.createdAt
  const stalledDays = Math.max(0, date.diffDays(date.fmt(new Date(lastActive)), date.today()))

  goal.progress = progress
  goal.taskTotal = total
  goal.taskDone = done
  goal.momentum = recent
  goal.stalledDays = stalledDays
  goal.status = progress >= 100 ? 'done' : 'active'
  goal.advice = composeAdvice(goal, progress, done, total, recent, stalledDays)
  return goal
}

function syncAll(goals, records) {
  goals.forEach(function (g) {
    syncGoal(g, records)
  })
  return goals
}

// 货币单位换算（用于「存了 2000 元」累计到「5 万」这类目标）
const CURRENCY = { 万: 10000, 千: 1000, 元: 1, 块: 1 }

function round1(n) {
  return Math.round(n * 10) / 10
}

/** 汇报了数字 -> 累计到目标进度（单位不一致时尽量换算，换不了就忽略） */
function applyMetric(goal, analysis) {
  const qty = analysis.quantity
  if (!qty) return goal

  if (analysis.metricKind !== 'done') {
    if (!goal.target) goal.target = { value: qty.value, unit: qty.unit }
    return goal
  }

  if (!goal.target) {
    goal.current = round1(goal.current + qty.value)
    goal.currentUnit = qty.unit
    return goal
  }

  if (goal.target.unit === qty.unit) {
    goal.current = round1(goal.current + qty.value)
    return goal
  }

  const from = CURRENCY[qty.unit]
  const to = CURRENCY[goal.target.unit]
  if (from && to) {
    goal.current = round1(goal.current + (qty.value * from) / to)
  }
  return goal
}

/** 记录一次提及 */
function mention(goal, analysis) {
  goal.mentions.unshift({ text: analysis.text, ts: Date.now(), intent: analysis.intent })
  if (goal.mentions.length > 20) goal.mentions.length = 20
  goal.lastMentionAt = Date.now()
  goal.updatedAt = Date.now()
  return goal
}

/* ------------------------------ 目标 -> 其它页 ------------------------------ */

/** 目标转成「需求」，供选择页生成三条路径 */
function needFromGoal(goal) {
  return {
    raw: goal.title,
    goal: goal.title,
    category: engine.findCategory(goal.categoryKey),
    horizon: {
      days: goal.horizonDays || 90,
      label: goal.horizonDays ? goal.horizonLabel || goal.horizonDays + '天' : '未设时限'
    },
    quantity: goal.target ? { value: goal.target.value, unit: goal.target.unit } : null,
    vague: false
  }
}

/** 目标 + 若干条即时行动 -> 一条时间线记录（行动按天依次排开） */
function buildActionRecord(goal, actions, startDate) {
  const start = startDate || date.today()
  const tasks = actions.map(function (a, i) {
    return {
      id: uid(),
      index: i,
      date: date.addDays(start, i),
      phase: '行动',
      title: a.title,
      tip: a.tip,
      minutes: a.minutes || 15,
      done: false,
      doneAt: 0
    }
  })

  return {
    id: uid(),
    kind: 'action',
    goalId: goal.id,
    need: goal.title,
    goal: goal.title,
    categoryKey: goal.categoryKey,
    categoryName: goal.categoryName,
    categoryColor: goal.color,
    option: {
      id: 'action',
      tag: '即时',
      name: '即时行动',
      emoji: '⚡',
      way: '从你当下这句话里拆出来的下一步',
      probability: 0,
      hasProbability: false,
      cost: '共 ' + tasks.length + ' 条',
      risk: ''
    },
    horizonLabel: goal.horizonLabel || '未设时限',
    createdAt: Date.now(),
    start: start,
    end: date.addDays(start, tasks.length - 1),
    tasks: tasks
  }
}

module.exports = {
  uid: uid,
  createGoal: createGoal,
  matchGoal: matchGoal,
  recentActiveGoal: recentActiveGoal,
  similarity: similarity,
  syncGoal: syncGoal,
  syncAll: syncAll,
  applyMetric: applyMetric,
  mention: mention,
  needFromGoal: needFromGoal,
  buildActionRecord: buildActionRecord
}
