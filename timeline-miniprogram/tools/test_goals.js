// 目标维护自测：node tools/test_goals.js
const engine = require('../utils/engine.js')
const goals = require('../utils/goals.js')
const date = require('../utils/date.js')

let gList = []
let records = []

const utterances = [
  '三个月内减重10斤',
  '今天跑了3公里',
  '这周又没坚持下来，怎么办',
  '年底前存下5万块',
  '今天又存了2000元'
]

utterances.forEach(function (t) {
  const a = engine.analyze(t)
  let m = goals.matchGoal(t, a.category.key, gList)
  if (!m && (a.intent === 'setback' || a.intent === 'ask')) { const r = goals.recentActiveGoal(gList, 7); if (r) m = { goal: r, score: 0.4 } }
  console.log('\n说：' + t)
  console.log('  意图：' + a.intentLabel + ' | 领域：' + a.category.name + ' | 数值：' + (a.quantity ? a.quantity.value + a.quantity.unit : '无') + ' | 类型：' + a.metricKind)
  console.log('  理解：' + a.summary)
  console.log('  建议：' + a.suggestions.map((s) => s.title).join(' ｜ '))

  if (m) {
    const g = m.goal
    goals.applyMetric(g, a)
    goals.mention(g, a)
    console.log('  → 归入目标《' + g.title + '》 匹配分 ' + m.score.toFixed(2) + ' | 累计 ' + g.current + (g.target ? '/' + g.target.value + g.target.unit : ''))
  } else {
    const g = goals.createGoal(a)
    gList.unshift(g)
    console.log('  → 新建目标《' + g.title + '》 ' + (g.target ? '目标量 ' + g.target.value + g.target.unit : '未量化'))
  }
})

// 模拟：给减重目标加一条行动并勾选
const fit = gList.filter((g) => g.categoryKey === 'fitness')[0]
const rec = goals.buildActionRecord(fit, [{ title: '今晚快走 20 分钟', tip: '先续上链条', minutes: 20 }], date.today())
rec.tasks[0].done = true
rec.tasks[0].doneAt = Date.now()
records.push(rec)

goals.syncAll(gList, records)
console.log('\n--- 自动维护后 ---')
gList.forEach(function (g) {
  console.log('《' + g.title + '》 ' + g.progress + '% | 行动 ' + g.taskDone + '/' + g.taskTotal + ' | 停滞 ' + g.stalledDays + ' 天 | ' + g.status)
  console.log('   建议：' + g.advice)
})

// 目标 -> 三条路径
const need = goals.needFromGoal(fit)
console.log('\n目标「' + fit.title + '」转需求：领域=' + need.category.name + ' 时限=' + need.horizon.label + ' 量化=' + (need.quantity ? need.quantity.value + need.quantity.unit : '无'))
console.log('三条路径：' + engine.buildOptions(need, 0).map((o) => o.emoji + o.name + ' ' + o.probability + '%').join(' / '))
