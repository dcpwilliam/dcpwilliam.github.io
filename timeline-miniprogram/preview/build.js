/**
 * 把 utils 里的引擎代码注入模板，产出自包含的 preview/index.html
 * 用法: node preview/build.js
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8')
const dateSrc = fs.readFileSync(path.join(root, 'utils', 'date.js'), 'utf8')
const engineSrc = fs.readFileSync(path.join(root, 'utils', 'engine.js'), 'utf8')
const goalsSrc = fs.readFileSync(path.join(root, 'utils', 'goals.js'), 'utf8')

// 每个模块单独包一层 IIFE，避免同名的 const 互相冲突
function wrap(name, src) {
  return [
    '/* ---- ' + name + ' ---- */',
    '__mods["' + name + '"] = (function () {',
    'var module = { exports: {} }, exports = module.exports;',
    src,
    'return module.exports;',
    '})();'
  ].join('\n')
}

const injected = [
  'var __mods = {};',
  'var require = function (p) { return __mods[p]; };',
  wrap('./date.js', dateSrc),
  wrap('./engine.js', engineSrc),
  wrap('./goals.js', goalsSrc),
  'var engine = __mods["./engine.js"];',
  'var date = __mods["./date.js"];',
  'var goals = __mods["./goals.js"];'
].join('\n')

const out = tpl.replace('/*__UTILS__*/', injected)
fs.writeFileSync(path.join(__dirname, 'index.html'), out, 'utf8')
console.log('preview/index.html 已生成', out.length, 'bytes')
