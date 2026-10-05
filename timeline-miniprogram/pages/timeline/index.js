const app = getApp()
const store = require('../../utils/store.js')
const engine = require('../../utils/engine.js')
const oidc = require('../../utils/oidc.js')
const date = require('../../utils/date.js')

const WINDOW = 7

Page({
  data: {
    records: [],
    days: [],
    stats: { done: 0, total: 0, percent: 0, minutes: 0 },
    windowStart: '',
    rangeLabel: '',
    isCurrent: true,
    filterId: '',
    allOpen: false,
    user: null,
    displayName: '',
    initial: '',
    syncLabel: '云端未备份'
  },

  openMap: {},
  inited: false,

  onShow() {
    if (!this.inited) {
      this.openMap = {}
      this.inited = true
    }
    this.refresh()
    this.renderAuth()
  },

  /* ---------------- 登录 / 云端备份 ---------------- */

  renderAuth() {
    const user = app.globalData.user || (oidc.getSession() || {}).user || null
    if (!user) {
      this.setData({ user: null, displayName: '', initial: '' })
      return
    }
    const name = user.name || user.nickname || user.email || user.phone || '已登录'
    this.setData({
      user: user,
      displayName: name,
      initial: String(name).trim().charAt(0) || 'U'
    })
  },

  goAuth() {
    wx.navigateTo({ url: '/pages/auth/index' })
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/index' })
  },

  onBackup() {
    wx.showLoading({ title: '备份中…' })
    oidc
      .pushState(store.getGoals(), store.getRecords())
      .then((res) => {
        wx.hideLoading()
        this.setData({ syncLabel: '已备份 ' + date.friendlyTime(res.updatedAt || Date.now()) })
        wx.showToast({ title: '已备份到云端', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        wx.showToast({ title: err.message || '备份失败', icon: 'none' })
      })
  },

  onRestore() {
    wx.showLoading({ title: '读取中…' })
    oidc
      .pullState()
      .then((remote) => {
        wx.hideLoading()
        if (!remote || (!remote.goals || !remote.goals.length) && (!remote.records || !remote.records.length)) {
          wx.showToast({ title: '云端还没有备份', icon: 'none' })
          return
        }
        wx.showModal({
          title: '从云端恢复',
          content: '云端有 ' + (remote.goals || []).length + ' 个目标、' + (remote.records || []).length + ' 条行动，恢复后会覆盖本机的目标与时间线',
          confirmText: '恢复',
          success: (res) => {
            if (!res.confirm) return
            store.setGoals(remote.goals || [])
            store.setRecords(remote.records || [])
            this.setData({ syncLabel: '来自云端 ' + date.friendlyTime(remote.updatedAt || Date.now()) })
            this.openMap = {}
            this.refresh()
            wx.showToast({ title: '已恢复', icon: 'success' })
          }
        })
      })
      .catch((err) => {
        wx.hideLoading()
        wx.showToast({ title: err.message || '读取失败', icon: 'none' })
      })
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  },

  defaultStart() {
    const records = store.getRecords()
    let start = date.today()
    records.forEach(function (r) {
      if (r.start && date.diffDays(r.start, start) > 0) start = r.start
    })
    return start
  },

  refresh() {
    const records = store.getRecords()
    const start = this.data.windowStart || this.defaultStart()
    const today = date.today()
    const filterId = this.data.filterId
    const dates = date.range(start, WINDOW)

    const days = dates.map((d) => {
      const tasks = []
      records.forEach((r) => {
        if (filterId && r.id !== filterId) return
        r.tasks.forEach((t) => {
          if (t.date !== d) return
          tasks.push({
            id: t.id,
            recordId: r.id,
            title: t.title,
            tip: t.tip,
            phase: t.phase,
            minutes: t.minutes,
            done: t.done,
            color: r.categoryColor,
            optionName: r.option.emoji + ' ' + r.option.name,
            goalName: r.goal || r.need
          })
        })
      })
      const done = tasks.filter((t) => t.done).length
      const open = this.openMap[d] === undefined ? date.diffDays(today, d) >= 0 && date.diffDays(today, d) <= 1 : this.openMap[d]
      return {
        date: d,
        rel: date.relative(d),
        md: date.md(d),
        isToday: d === today,
        tasks: tasks,
        done: done,
        total: tasks.length,
        open: open
      }
    }, this)

    let total = 0
    let done = 0
    let minutes = 0
    days.forEach(function (d) {
      total += d.total
      done += d.done
      d.tasks.forEach(function (t) {
        if (t.done) minutes += t.minutes
      })
    })

    const list = records.map((r) => {
      const p = engine.progressOf(r)
      return {
        id: r.id,
        need: r.goal || r.need,
        color: r.categoryColor,
        optionName: r.option.name,
        optionEmoji: r.option.emoji,
        probability: r.option.probability,
        hasProbability: r.option.hasProbability !== false,
        done: p.done,
        total: p.total,
        percent: p.percent
      }
    })

    this.setData({
      records: list,
      days: days,
      stats: {
        done: done,
        total: total,
        percent: total ? Math.round((done / total) * 100) : 0,
        minutes: minutes
      },
      windowStart: start,
      rangeLabel: date.md(start).replace(/\s.*$/, '') + ' - ' + date.md(date.addDays(start, WINDOW - 1)).replace(/\s.*$/, ''),
      isCurrent: start === today,
      allOpen: days.every((d) => d.open)
    })
  },

  onToggleDay(e) {
    const d = e.currentTarget.dataset.date
    const cur = this.data.days.filter((x) => x.date === d)[0]
    this.openMap[d] = cur ? !cur.open : true
    this.refresh()
  },

  onFoldAll() {
    const target = !this.data.allOpen
    this.data.days.forEach((d) => {
      this.openMap[d.date] = target
    })
    this.refresh()
  },

  onPrev() {
    this.setData({ windowStart: date.addDays(this.data.windowStart, -WINDOW) })
    this.refresh()
  },

  onNext() {
    this.setData({ windowStart: date.addDays(this.data.windowStart, WINDOW) })
    this.refresh()
  },

  onToday() {
    this.setData({ windowStart: date.today() })
    this.refresh()
  },

  onFilter(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ filterId: this.data.filterId === id ? '' : id })
    this.refresh()
  },

  onToggleTask(e) {
    const rid = e.currentTarget.dataset.rid
    const tid = e.currentTarget.dataset.tid
    store.toggleTask(rid, tid)
    // 勾选即回写目标进度
    const goalsUtil = require('../../utils/goals.js')
    store.setGoals(goalsUtil.syncAll(store.getGoals(), store.getRecords()))
    app.globalData.dataVersion++
    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
    this.refresh()
  },

  onRemove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除这条需求',
      content: '连同它的七天行动一起删除，无法恢复',
      confirmColor: '#E64980',
      success: (res) => {
        if (!res.confirm) return
        store.removeRecord(id)
        if (this.data.filterId === id) this.setData({ filterId: '' })
        app.globalData.dataVersion++
        this.refresh()
      }
    })
  },

  goInput() {
    wx.switchTab({ url: '/pages/input/index' })
  }
})
