/**
 * aiservice 客户端（Python 侧服务）
 * ------------------------------------------------------------
 * 地址来自 utils/settings.js，改完设置页立即生效，不需要重新编译。
 *
 * 目前小程序本地已经有一套完整的引擎（utils/engine.js + goals.js），
 * 这个模块用于「想让服务端也参与」的场景：服务端分析、云端时间线、多设备同步。
 * ------------------------------------------------------------
 */
const settings = require('./settings.js')
const oidc = require('./oidc.js')

function base() {
  return settings.get().aiBase
}

/** 服务端用的用户 id：登录后用 sub，未登录用 anonymous */
function userId() {
  const session = oidc.getSession()
  const sub = session && session.user && session.user.sub
  return sub || 'anonymous'
}

// 本地小模型（如 ollama 上的 2.6B）一次要 20~30 秒，超时必须留够
const DEFAULT_TIMEOUT = 60000
const ANALYZE_TIMEOUT = 120000

function req(pathname, method, data, timeout) {
  const verb = method || 'GET'
  const payload = verb === 'GET' || !data ? undefined : data
  return new Promise(function (resolve, reject) {
    wx.request({
      url: base() + pathname,
      method: verb,
      data: payload,
      header: { 'Content-Type': 'application/json' },
      timeout: timeout || DEFAULT_TIMEOUT,
      success: function (res) {
        const body = res.data || {}
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body)
        } else {
          reject(new Error(body.error || ('请求失败 ' + res.statusCode)))
        }
      },
      fail: function (err) {
        reject(new Error((err && err.errMsg) || '连不上 aiservice'))
      }
    })
  })
}

/* ------------------------------ 通用 ------------------------------ */

function health() {
  return req('/health', 'GET')
}

/* ------------------------------ prompt ------------------------------ */

/** 服务端分析一句话（useLlm=true 时才真的调模型） */
function analyze(text, useLlm) {
  return req('/api/prompt/analyze', 'POST', {
    text: text,
    user_id: userId(),
    use_llm: useLlm === undefined ? settings.get().useLlm : !!useLlm
  }, ANALYZE_TIMEOUT)
}

/* ------------------------------ 时间线 ------------------------------ */

function timeline(opts) {
  const o = opts || {}
  const q = []
  q.push('user_id=' + encodeURIComponent(o.userId || userId()))
  if (o.start) q.push('start=' + encodeURIComponent(o.start))
  q.push('days=' + (o.days || 7))
  if (o.goalId) q.push('goal_id=' + encodeURIComponent(o.goalId))
  return req('/api/timeline?' + q.join('&'), 'GET')
}

function timelineStats(days) {
  return req('/api/timeline/stats?user_id=' + encodeURIComponent(userId()) + '&days=' + (days || 7), 'GET')
}

/** 一句话 -> 归拢到已有目标 / 冒出新目标 */
function ingest(text) {
  return req('/api/timeline/ingest?user_id=' + encodeURIComponent(userId()), 'POST', { text: text })
}

function sync() {
  return req('/api/timeline/sync?user_id=' + encodeURIComponent(userId()), 'POST')
}

/* ------------------------------ 用户数据 ------------------------------ */

function createUser(payload) {
  return req('/api/users', 'POST', payload || {})
}

function exportUser(uid) {
  return req('/api/users/' + encodeURIComponent(uid || userId()) + '/export', 'GET')
}

module.exports = {
  base: base,
  userId: userId,
  health: health,
  analyze: analyze,
  timeline: timeline,
  timelineStats: timelineStats,
  ingest: ingest,
  sync: sync,
  createUser: createUser,
  exportUser: exportUser,
  req: req
}
