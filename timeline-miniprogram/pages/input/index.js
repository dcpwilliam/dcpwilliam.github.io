const app = getApp()
const store = require('../../utils/store.js')
const engine = require('../../utils/engine.js')
const goalsUtil = require('../../utils/goals.js')
const settings = require('../../utils/settings.js')
const ai = require('../../utils/ai.js')
const date = require('../../utils/date.js')

Page({
  data: {
    text: '',
    canSend: false,
    msgs: [],
    currentGoal: null,
    focused: false,
    chips: [
      '今天跑了 3 公里',
      '最近想跳槽，但不知道从哪开始',
      '三个月内减重 10 斤',
      '这周又没坚持下来',
      '年底前存下 5 万块'
    ]
  },

  onShow() {
    this.loadMsgs()
    this.refreshGoalBar()
  },

  /* ---------------- 渲染 ---------------- */

  loadMsgs() {
    const msgs = store
      .getMessages()
      .slice(0, 30)
      .reverse()
      .map(function (m) {
        return Object.assign({}, m, { timeLabel: date.friendlyTime(m.ts) })
      })
    this.setData({ msgs: msgs })
  },

  refreshGoalBar() {
    const goals = store.getGoals()
    if (!goals.length) {
      this.setData({ currentGoal: null })
      return
    }
    const active = goals.filter(function (g) {
      return g.status !== 'done'
    })
    const g = (active.length ? active : goals)[0]
    this.setData({
      currentGoal: {
        id: g.id,
        title: g.title,
        color: g.color,
        progress: g.progress || 0
      }
    })
  },

  scrollBottom() {
    wx.pageScrollTo({ scrollTop: 99999, duration: 220 })
  },

  /* ---------------- 发送与分析 ---------------- */

  onInput(e) {
    const v = e.detail.value
    this.setData({ text: v, canSend: String(v).trim().length >= 2 })
  },

  onChip(e) {
    const t = e.currentTarget.dataset.text
    this.setData({ text: t, canSend: true })
    this.onSend()
  },

  onSend() {
    const text = String(this.data.text || '').trim()
    if (text.length < 2) {
      wx.showToast({ title: '说点什么吧', icon: 'none' })
      return
    }
    const id = goalsUtil.uid()
    store.addMessage({ id: id, ts: Date.now(), text: text, analyzing: true })
    this.setData({ text: '', canSend: false })
    this.loadMsgs()
    this.scrollBottom()

    // 先跑一遍本地分析，用它兜底，也用来跟服务端结果做合并
    const local = engine.analyze(text)

    if (!settings.get().useServer) {
      setTimeout(() => this.applyAnalysis(id, text, local, 'local'), 500)
      return
    }

    // 发给 aiservice 的 /api/prompt/analyze；连不上就用本地结果
    ai.analyze(text)
      .then((remote) => {
        this.applyAnalysis(id, text, this.mergeAnalysis(remote, local), 'server')
      })
      .catch((err) => {
        this.applyAnalysis(id, text, local, 'local')
        this.warnServer(err)
      })
  },

  /** 服务端结果为准，缺失的字段用本地结果补上 */
  mergeAnalysis(remote, local) {
    const r = remote || {}
    const category =
      typeof r.category === 'string'
        ? engine.findCategory(r.category)
        : (r.category && r.category.key ? r.category : local.category) || local.category
    return Object.assign({}, local, r, {
      category: category,
      quantity: r.quantity || local.quantity,
      metricKind: r.metricKind || local.metricKind,
      goalTitle: r.goalTitle || local.goalTitle,
      suggestedTitle: r.suggestedTitle || local.suggestedTitle,
      summary: r.summary || local.summary,
      criterion: r.criterion || local.criterion,
      intent: r.intent || local.intent,
      intentLabel: r.intentLabel || local.intentLabel,
      suggestions: (r.suggestions && r.suggestions.length ? r.suggestions : local.suggestions),
      provider: r.provider || ''
    })
  },

  /** 连不上服务端只提示一次，避免每句都弹 */
  warnServer(err) {
    if (this._srvWarned) return
    this._srvWarned = true
    wx.showToast({
      title: '连不上 aiservice，先用本地分析',
      icon: 'none',
      duration: 2200
    })
    console.warn('[timeline] aiservice 调用失败:', err && err.message)
  },

  applyAnalysis(msgId, text, analysis, source) {
    const goals = store.getGoals()
    let match = goalsUtil.matchGoal(text, analysis.category.key, goals)

    // 抱怨或提问通常指的就是最近在忙的那件事，字面匹配不上时也归过去
    if (!match && (analysis.intent === 'setback' || analysis.intent === 'ask')) {
      const recent = goalsUtil.recentActiveGoal(goals, 7)
      if (recent) match = { goal: recent, score: 0.4 }
    }

    let isNew = false
    let goal = null
    if (match) {
      goal = match.goal
      goalsUtil.applyMetric(goal, analysis)
      goalsUtil.mention(goal, analysis)
      store.updateGoal(goal.id, function (g) {
        g.current = goal.current
        g.mentions = goal.mentions
        g.lastMentionAt = goal.lastMentionAt
        g.updatedAt = Date.now()
        if (!g.target && goal.target) g.target = goal.target
      })
    } else {
      isNew = true
    }

    const metricLabel = this.metricLabel(analysis, goal)

    store.updateMessage(msgId, function (m) {
      m.analyzing = false
      m.source = source
      m.intent = analysis.intent
      m.intentLabel = analysis.intentLabel
      m.categoryName = analysis.category.name
      m.color = analysis.category.color
      m.summary = analysis.summary
      m.goalTitle = goal ? goal.title : analysis.suggestedTitle
      m.criterion = analysis.criterion
      m.suggestions = analysis.suggestions
      m.metricLabel = metricLabel
      m.isNew = isNew
      m.created = !isNew
      m.goalId = goal ? goal.id : ''
      m.draft = {
        text: analysis.text || text,
        goalTitle: analysis.suggestedTitle,
        criterion: analysis.criterion,
        categoryKey: analysis.category.key,
        metricKind: analysis.metricKind,
        quantity: analysis.quantity,
        intent: analysis.intent
      }
    })

    this.syncGoals()
    this.loadMsgs()
    this.refreshGoalBar()
    this.scrollBottom()
  },

  metricLabel(analysis, goal) {
    if (analysis.quantity && analysis.metricKind === 'done') {
      const same = goal && goal.target && goal.target.unit === analysis.quantity.unit
      return (
        '本次 +' +
        analysis.quantity.value +
        analysis.quantity.unit +
        (same ? ' · 累计 ' + goal.current + '/' + goal.target.value + goal.target.unit : '')
      )
    }
    if (goal && goal.target) {
      return '目标 ' + goal.target.value + goal.target.unit + ' · 当前 ' + goal.current + goal.target.unit
    }
    if (analysis.quantity) {
      return '目标量 ' + analysis.quantity.value + analysis.quantity.unit
    }
    return ''
  },

  /** 每次会话后，用时间线的真实完成情况重算所有目标 */
  syncGoals() {
    const goals = goalsUtil.syncAll(store.getGoals(), store.getRecords())
    store.setGoals(goals)
    app.globalData.dataVersion++
  },

  /* ---------------- 气泡上的动作 ---------------- */

  findMsg(id) {
    return store.getMessages().filter(function (m) {
      return m.id === id
    })[0]
  },

  onMakeGoal(e) {
    const msg = this.findMsg(e.currentTarget.dataset.id)
    if (!msg || !msg.draft) return
    const d = msg.draft
    const analysis = {
      text: d.text,
      goalTitle: d.goalTitle,
      criterion: d.criterion,
      category: engine.findCategory(d.categoryKey),
      quantity: d.quantity,
      metricKind: d.metricKind,
      intent: d.intent
    }
    const goal = goalsUtil.createGoal(analysis)
    store.addGoal(goal)
    store.updateMessage(msg.id, function (m) {
      m.goalId = goal.id
      m.created = true
    })
    this.syncGoals()
    this.loadMsgs()
    this.refreshGoalBar()
    wx.showToast({ title: '已立为目标', icon: 'success' })
  },

  onAdd(e) {
    const msg = this.findMsg(e.currentTarget.dataset.id)
    if (!msg || !msg.goalId) return
    const goal = store.getGoal(msg.goalId)
    if (!goal) return
    const actions = (msg.suggestions || []).map(function (s) {
      return { title: s.title, tip: s.tip, minutes: s.minutes }
    })
    if (!actions.length) return
    const record = goalsUtil.buildActionRecord(goal, actions, date.today())
    store.addRecord(record)
    store.updateMessage(msg.id, function (m) {
      m.added = true
    })
    this.syncGoals()
    this.loadMsgs()
    wx.vibrateShort && wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '已加入时间线', icon: 'success' })
  },

  onPaths(e) {
    const msg = this.findMsg(e.currentTarget.dataset.id)
    if (!msg || !msg.goalId) return
    const goal = store.getGoal(msg.goalId)
    if (!goal) return
    app.globalData.activeGoal = goal
    app.globalData.options = null
    app.globalData.seed = 0
    wx.switchTab({ url: '/pages/choice/index' })
  },

  goGoal() {
    wx.switchTab({ url: '/pages/goal/index' })
  },

  /* ---------------- 语音（键盘自带，零依赖） ---------------- */

  /** 唤起键盘，然后点键盘上的话筒说话 —— 不需要插件 / 录音权限 / 服务端 */
  onVoice() {
    this.setData({ focused: true })
    wx.showToast({ title: '点键盘上的话筒说话', icon: 'none', duration: 1800 })
    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
  },

  onBlur() {
    this.setData({ focused: false })
  }
})
