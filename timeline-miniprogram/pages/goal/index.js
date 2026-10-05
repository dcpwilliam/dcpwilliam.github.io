const app = getApp()
const store = require('../../utils/store.js')
const engine = require('../../utils/engine.js')
const goalsUtil = require('../../utils/goals.js')
const date = require('../../utils/date.js')

const INTENT_LABEL = {
  progress: '汇报进展',
  ask: '想问办法',
  setback: '遇到阻力',
  new: '冒出新目标'
}

Page({
  data: {
    goals: [],
    stat: { active: 0, done: 0, weekDone: 0 }
  },

  openMap: {},

  onShow() {
    const goals = goalsUtil.syncAll(store.getGoals(), store.getRecords())
    store.setGoals(goals)
    this.render(goals)
  },

  render(goals) {
    const weekDone = this.weekDone(goals)
    const list = goals.map((g) => {
      const metric =
        g.target && g.target.value
          ? '进度 ' + g.current + ' / ' + g.target.value + g.target.unit
          : g.taskTotal
          ? '行动 ' + g.taskDone + ' / ' + g.taskTotal + ' 项'
          : ''
      return {
        id: g.id,
        title: g.title,
        criterion: g.criterion || '',
        categoryName: g.categoryName,
        color: g.color,
        status: g.status,
        progress: g.progress || 0,
        stalledDays: g.stalledDays || 0,
        advice: g.advice || '',
        metricLabel: metric,
        lastLabel: this.lastLabel(g),
        mentionCount: (g.mentions || []).length,
        mentions: (g.mentions || [])
          .slice(0, 3)
          .map((m) => ({
            text: m.text,
            timeLabel: date.friendlyTime(m.ts),
            intentLabel: INTENT_LABEL[m.intent] || '一句话'
          })),
        open: !!this.openMap[g.id]
      }
    })

    this.setData({
      goals: list,
      stat: {
        active: goals.filter((g) => g.status !== 'done').length,
        done: goals.filter((g) => g.status === 'done').length,
        weekDone: weekDone
      }
    })
  },

  weekDone(goals) {
    const now = Date.now()
    let n = 0
    store.getRecords().forEach((r) => {
      r.tasks.forEach((t) => {
        if (t.done && t.doneAt && now - t.doneAt < 7 * 86400000) n++
      })
    })
    return n
  },

  lastLabel(g) {
    const days = Math.round((Date.now() - (g.lastMentionAt || g.createdAt)) / 86400000)
    if (days === 0) return '今天提到过'
    if (days === 1) return '昨天提到过'
    return days + ' 天前提到过'
  },

  onToggle(e) {
    const id = e.currentTarget.dataset.id
    this.openMap[id] = !this.openMap[id]
    this.render(store.getGoals())
  },

  onPaths(e) {
    const goal = store.getGoal(e.currentTarget.dataset.id)
    if (!goal) return
    app.globalData.activeGoal = goal
    app.globalData.options = null
    app.globalData.seed = 0
    wx.switchTab({ url: '/pages/choice/index' })
  },

  onAddAction(e) {
    const goal = store.getGoal(e.currentTarget.dataset.id)
    if (!goal) return
    const pool = engine.ACTION_POOL[goal.categoryKey] || engine.ACTION_POOL.generic
    const a = pool[Math.floor(Math.random() * pool.length)]
    const record = goalsUtil.buildActionRecord(
      goal,
      [{ title: a.t.replace(/\{goal\}/g, goal.title), tip: a.tip, minutes: a.m }],
      date.today()
    )
    store.addRecord(record)
    this.onShow()
    wx.showToast({ title: '已加进今天', icon: 'success' })
  },

  onFinish(e) {
    const id = e.currentTarget.dataset.id
    store.updateGoal(id, function (g) {
      g.status = 'done'
      g.progress = 100
      g.updatedAt = Date.now()
    })
    this.onShow()
    wx.showToast({ title: '达成，漂亮', icon: 'success' })
  },

  onRemove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除这个目标',
      content: '连同它在时间线上的行动一起删除，无法恢复',
      confirmColor: '#E64980',
      success: (res) => {
        if (!res.confirm) return
        store.removeGoal(id)
        app.globalData.dataVersion++
        this.onShow()
      }
    })
  },

  goInput() {
    wx.switchTab({ url: '/pages/input/index' })
  }
})
