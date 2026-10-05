// 引擎自测：node tools/test_engine.js
const e = require('../utils/engine.js')
const d = require('../utils/date.js')

const cases = [
  '我想在三个月内减重10斤',
  '两个月内拿到理想的offer',
  '年底前存下5万块',
  '每天读书30页',
  '随便做点什么'
]

cases.forEach(function (t) {
  const n = e.parseNeed(t)
  const opts = e.buildOptions(n, 0)
  const rec = e.buildRecord(n, opts[0], d.today())
  console.log('需求:', t, '| 领域:', n.category.name, '| 时限:', n.horizon.label, '| 量化:', n.quantity ? n.quantity.value + n.quantity.unit : '无')
  console.log('  三选:', opts.map((o) => o.emoji + o.name + ' ' + o.probability + '%').join(' / '))
  console.log('  七天:', rec.tasks.length, '项 |', rec.tasks.map((x) => x.date.slice(5) + ' ' + x.title).join(' | ').slice(0, 150))
})

const a = e.buildOptions(e.parseNeed('三个月内减重10斤'), 0).map((o) => o.probability).join()
const b = e.buildOptions(e.parseNeed('三个月内减重10斤'), 0).map((o) => o.probability).join()
const c = e.buildOptions(e.parseNeed('三个月内减重10斤'), 1).map((o) => o.probability).join()
console.log('稳定:', a === b, '| 换一组有变化:', a !== c, '|', a, '->', c)

// 时限解析补充用例
;['三个月内减重10斤', '两周内复习完', '一年内买房', '年底前存下5万', '半年内转行', '一百天内跑完马拉松'].forEach((t) => {
  console.log('时限:', t, '=>', JSON.stringify(e.parseNeed(t).horizon))
})
