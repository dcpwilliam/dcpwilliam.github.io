/**
 * 静态体检（不启动小程序也能查出运行时才会炸的两类错误）
 *
 *   1. 页面里调用的 utils 方法，是否真的在 module.exports 里
 *      —— 之前 store.setGoals 漏导出，直到真机点「立为目标」才报
 *         "e.setGoals is not a function"
 *   2. WXML 里 bindtap / catchtap 等绑定的处理函数，JS 里是否真的定义了
 *
 * 用法: node tools/check_exports.js
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

// utils 模块在 node 下 require 时用到的全局桩
global.wx = { getStorageSync: () => null, setStorageSync: () => {} }
global.getApp = () => ({ globalData: {} })

let bad = 0
function fail(msg) {
  bad++
  console.log('✗ ' + msg)
}

/* ---------------- 1. utils 导出完整性 ---------------- */

function exportsOf(file) {
  try {
    return Object.keys(require(file) || {})
  } catch (e) {
    return null // 页面文件（顶层 getApp）加载不了，跳过
  }
}

function collectJs(dir, out) {
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) return collectJs(p, out)
    if (p.endsWith('.js')) out.push(p)
  })
  return out
}

const pageFiles = collectJs(path.join(root, 'pages'), [])
pageFiles.push(path.join(root, 'app.js'))

pageFiles.forEach((f) => {
  const raw = fs.readFileSync(f, 'utf8')
  // 先把 require('...') 的路径抹掉，否则 '../../utils/store.js' 里的 store.js 会被当成一次调用
  const src = raw.replace(/require\(['"][^'"]+['"]\)/g, 'require()')
  const declRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(/g
  let m
  while ((m = declRe.exec(src))) {
    const alias = m[1]
    const rawRe = new RegExp("(?:const|let|var)\\s+" + alias + "\\s*=\\s*require\\(['\"]([^'\"]+)['\"]\\)")
    const r2 = rawRe.exec(raw)
    if (!r2) continue
    const target = path.resolve(path.dirname(f), r2[1])
    const keys = exportsOf(target)
    if (!keys) continue
    const callRe = new RegExp('\\b' + alias + '\\.([A-Za-z_$][\\w$]*)', 'g')
    const used = new Set()
    let c
    while ((c = callRe.exec(src))) used.add(c[1])
    used.forEach((fn) => {
      if (keys.indexOf(fn) < 0) {
        fail(
          path.relative(root, f) + ' 调用了 ' + alias + '.' + fn +
          '，但 ' + path.relative(root, target) + ' 没有导出它'
        )
      }
    })
  }
})

/* ---------------- 2. WXML 事件 vs JS 处理函数 ---------------- */

fs.readdirSync(path.join(root, 'pages')).forEach((d) => {
  const dir = path.join(root, 'pages', d)
  if (!fs.statSync(dir).isDirectory()) return
  const wxml = fs.readdirSync(dir).find((f) => f.endsWith('.wxml'))
  const js = fs.readdirSync(dir).find((f) => f.endsWith('.js'))
  if (!wxml || !js) return
  const w = fs.readFileSync(path.join(dir, wxml), 'utf8')
  const j = fs.readFileSync(path.join(dir, js), 'utf8')

  const names = new Set()
  const re = /\b(?:bind|catch|mut-bind|capture-bind):?([a-zA-Z]+)\s*=\s*"([A-Za-z_$][\w$]*)"/g
  let m
  while ((m = re.exec(w))) names.add(m[2])

  names.forEach((n) => {
    const ok = new RegExp('(^|[\\s,{])' + n + '\\s*[:(]', 'm').test(j)
    if (!ok) fail('pages/' + d + '/' + wxml + ' 绑定了 ' + n + '，但 ' + js + ' 里没有定义')
  })
})

if (bad) {
  console.log('\n发现 ' + bad + ' 处问题')
  process.exit(1)
}
console.log('静态体检通过：utils 导出完整、WXML 事件都有处理函数 ✓')
