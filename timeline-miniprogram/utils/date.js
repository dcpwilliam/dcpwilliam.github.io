const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/** Date / 时间戳 -> 'YYYY-MM-DD' */
function fmt(input) {
  const d = input instanceof Date ? input : new Date(input)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

/** 'YYYY-MM-DD' -> Date（本地零点） */
function parse(s) {
  const p = String(s).split('-')
  return new Date(+p[0], +p[1] - 1, +p[2])
}

/** 今天的 'YYYY-MM-DD' */
function today() {
  return fmt(new Date())
}

function addDays(s, n) {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return fmt(d)
}

/** 相隔天数 b - a */
function diffDays(a, b) {
  const A = parse(a).getTime()
  const B = parse(b).getTime()
  return Math.round((B - A) / 86400000)
}

function weekday(s) {
  return WEEK[parse(s).getDay()]
}

/** '10月3日 周六' */
function md(s) {
  const d = parse(s)
  return d.getMonth() + 1 + '月' + d.getDate() + '日 ' + WEEK[d.getDay()]
}

/** 今天 / 明天 / 后天 / 昨天 / 周X */
function relative(s) {
  const t = today()
  const n = diffDays(t, s)
  if (n === 0) return '今天'
  if (n === 1) return '明天'
  if (n === 2) return '后天'
  if (n === -1) return '昨天'
  if (n === -2) return '前天'
  return weekday(s)
}

/** 生成以 start 开头、共 len 天的日期数组 */
function range(start, len) {
  const out = []
  for (let i = 0; i < len; i++) out.push(addDays(start, i))
  return out
}

function friendlyTime(ts) {
  const d = new Date(ts)
  const n = diffDays(fmt(d), today())
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
  if (n === 0) return '今天 ' + hm
  if (n === 1) return '昨天 ' + hm
  if (n < 7) return n + '天前'
  return d.getMonth() + 1 + '月' + d.getDate() + '日'
}

module.exports = { fmt, parse, today, addDays, diffDays, weekday, md, relative, range, friendlyTime, pad }
