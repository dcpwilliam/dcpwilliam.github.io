const app = getApp()
const engine = require('../../utils/engine.js')
const store = require('../../utils/store.js')
const goalsUtil = require('../../utils/goals.js')
const date = require('../../utils/date.js')

Page({
  data: {
    need: null,
    goal: null,
    options: [],
    loading: false,
    cachedKey: ''
  },

  onShow() {
    // 选择页围绕「目标」工作：目标来自需求页的对话或目标页的选择
    let goal = app.globalData.activeGoal
    if (!goal || !store.getGoal(goal.id)) {
      const goals = store.getGoals().filter(function (g) {
        return g.status !== 'done'
      })
      goal = goals.length ? goals[0] : null
    }
    if (!goal) {
      this.setData({ need: null, goal: null, options: [], cachedKey: '' })
      return
    }
    app.globalData.activeGoal = goal

    const seed = app.globalData.seed || 0
    const key = goal.id + '|' + seed
    if (key === this.data.cachedKey && this.data.options.length) return

    const parsed = goalsUtil.needFromGoal(goal)
    this.setData({
      goal: { id: goal.id, title: goal.title, progress: goal.progress || 0 },
      need: {
        raw: parsed.raw,
        categoryName: parsed.category.name,
        color: parsed.category.color,
        horizon: parsed.horizon.label,
        quantity: parsed.quantity ? parsed.quantity.value : 0,
        unit: parsed.quantity ? parsed.quantity.unit : ''
      },
      loading: true,
      cachedKey: key
    })

    // 模拟一次思考过程
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      const options = engine.buildOptions(parsed, seed).map((o, i) => {
        return Object.assign({}, o, {
          top: i === 0,
          open: false,
          preview: o.plan.map((p, idx) => {
            const d = date.addDays(date.today(), idx)
            return {
              dateLabel: date.relative(d) + ' ' + d.slice(5).replace('-', '/'),
              title: p.t.replace(/\{goal\}/g, parsed.goal),
              tip: p.tip,
              minutes: p.m
            }
          })
        })
      })
      this.setData({ options: options, loading: false })
    }, 900)
  },

  onUnload() {
    clearTimeout(this.timer)
  },

  onPeek(e) {
    const i = e.currentTarget.dataset.index
    const key = 'options[' + i + '].open'
    this.setData({ [key]: !this.data.options[i].open })
  },

  onReroll() {
    app.globalData.seed = (app.globalData.seed || 0) + 1
    this.setData({ cachedKey: '', options: [] })
    this.onShow()
    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
  },

  onPick(e) {
    const i = e.currentTarget.dataset.index
    const option = this.data.options[i]
    const goal = app.globalData.activeGoal
    if (!goal) return

    const parsed = goalsUtil.needFromGoal(goal)
    const record = engine.buildRecord(parsed, option, date.today())
    record.goalId = goal.id
    store.addRecord(record)

    // 目标进度随之重算
    store.setGoals(goalsUtil.syncAll(store.getGoals(), store.getRecords()))
    app.globalData.dataVersion++
    app.globalData.lastRecordId = record.id

    wx.showToast({ title: '已加入时间线', icon: 'success' })
    wx.vibrateShort && wx.vibrateShort({ type: 'medium' })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/timeline/index' })
    }, 500)
  },

  goInput() {
    wx.switchTab({ url: '/pages/input/index' })
  },

  goGoal() {
    wx.switchTab({ url: '/pages/goal/index' })
  }
})
