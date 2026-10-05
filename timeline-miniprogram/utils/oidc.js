/**
 * OIDC 登录客户端（Authing）
 * ------------------------------------------------------------
 * 小程序端只持有公开信息：client_id / issuer / 各端点地址。
 * App Secret 放在 server/ 目录的服务端，code → token 的交换必须由服务端完成。
 *
 * 流程：
 *   1. fetchAuthorize()      服务端生成 PKCE，返回授权地址
 *   2. web-view 打开授权地址，用户在 Authing 登录
 *   3. 回调页把 code 带回小程序（或手动粘贴 code）
 *   4. exchange(code, verifier) 用 code 换 token
 *   5. fetchUserInfo() 拿用户信息，本地保存会话
 *
 * 服务地址不再写死在这里，改 utils/settings.js 的 oidcBase（设置页里可配）。
 * ------------------------------------------------------------
 */
const settings = require('./settings.js')

const KEY_SESSION = 'tl_session_v1'
const KEY_PENDING = 'tl_oidc_pending_v1'

function setApiBase(base) {
  settings.save({ oidcBase: base })
}

function getApiBase() {
  return settings.get().oidcBase
}

function req(pathname, method, data, header) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: getApiBase() + pathname,
      method: method || 'GET',
      data: data || {},
      header: Object.assign({ 'Content-Type': 'application/json' }, header || {}),
      timeout: 15000,
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const body = res.data || {}
          reject(new Error(body.error || ('请求失败 ' + res.statusCode)))
        }
      },
      fail: function (err) {
        reject(new Error((err && err.errMsg) || '网络请求失败'))
      }
    })
  })
}

/* ------------------------------ 授权 ------------------------------ */

/** 取授权地址（服务端生成 PKCE，verifier 由小程序保管） */
function fetchAuthorize() {
  return req('/oidc/authorize-url', 'GET').then(function (data) {
    if (!data || !data.url) throw new Error('服务端未返回授权地址')
    savePending({ state: data.state, codeVerifier: data.codeVerifier, at: Date.now() })
    return data
  })
}

function savePending(pending) {
  try {
    wx.setStorageSync(KEY_PENDING, pending)
  } catch (e) {}
}

function getPending() {
  try {
    return wx.getStorageSync(KEY_PENDING) || null
  } catch (e) {
    return null
  }
}

function clearPending() {
  try {
    wx.removeStorageSync(KEY_PENDING)
  } catch (e) {}
}

/** code 换 token */
function exchange(code, codeVerifier) {
  return req('/oidc/token', 'POST', { code: code, codeVerifier: codeVerifier })
}

/** 刷新 token */
function refresh(refreshToken) {
  return req('/oidc/refresh', 'POST', { refreshToken: refreshToken })
}

/** 用户信息 */
function fetchUserInfo(accessToken) {
  return req('/oidc/me', 'GET', {}, { Authorization: 'Bearer ' + accessToken })
}

/** 登出地址（web-view 打开，清掉 Authing 的会话） */
function fetchLogoutUrl(idToken) {
  return req('/oidc/logout-url', 'GET', { idTokenHint: idToken || '' })
}

/* ------------------------------ 备份同步 ------------------------------ */

/** 拉取云端备份 */
function pullState() {
  const s = getSession()
  if (!s || !s.accessToken) return Promise.reject(new Error('未登录'))
  return req('/api/state', 'GET', {}, { Authorization: 'Bearer ' + s.accessToken })
}

/** 把本地数据备份到云端 */
function pushState(goals, records) {
  const s = getSession()
  if (!s || !s.accessToken) return Promise.reject(new Error('未登录'))
  return req('/api/state', 'PUT', { goals: goals || [], records: records || [] }, { Authorization: 'Bearer ' + s.accessToken })
}

/* ------------------------------ 会话 ------------------------------ */

function saveSession(session) {
  try {
    wx.setStorageSync(KEY_SESSION, session)
  } catch (e) {}
  return session
}

function getSession() {
  try {
    return wx.getStorageSync(KEY_SESSION) || null
  } catch (e) {
    return null
  }
}

function clearSession() {
  try {
    wx.removeStorageSync(KEY_SESSION)
  } catch (e) {}
}

function isExpired(session) {
  if (!session || !session.expiresAt) return false
  return Date.now() > session.expiresAt - 60000
}

/** 只解析 payload 做展示，真正的验签在服务端 */
function parseJwt(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = payload.length % 4
    if (pad) payload += new Array(5 - pad).join('=')
    return JSON.parse(decodeBase64(payload))
  } catch (e) {
    return null
  }
}

function decodeBase64(b64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  let buffer = 0
  let bits = 0
  for (let i = 0; i < b64.length; i++) {
    const idx = chars.indexOf(b64[i])
    if (idx < 0) continue
    buffer = (buffer << 6) | idx
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out += String.fromCharCode((buffer >> bits) & 0xff)
    }
  }
  return decodeURIComponent(escape(out))
}

/** 把 token 响应整理成本地会话 */
function buildSession(tokens, user) {
  const claims = parseJwt(tokens.id_token) || {}
  const session = {
    accessToken: tokens.access_token || '',
    refreshToken: tokens.refresh_token || '',
    idToken: tokens.id_token || '',
    expiresIn: tokens.expires_in || 0,
    expiresAt: Date.now() + (tokens.expires_in || 0) * 1000,
    loginAt: Date.now(),
    sub: claims.sub || (user && user.sub) || '',
    user: user || normalizeUser(claims)
  }
  return saveSession(session)
}

function normalizeUser(claims) {
  return {
    sub: claims.sub || '',
    name: claims.name || claims.nickname || claims.preferred_username || claims.username || '',
    nickname: claims.nickname || claims.name || '',
    email: claims.email || '',
    phone: claims.phone_number || '',
    picture: claims.picture || ''
  }
}

/** 已登录且未过期 */
function currentUser() {
  const s = getSession()
  if (!s) return null
  return s.user || null
}

module.exports = {
  setApiBase: setApiBase,
  getApiBase: getApiBase,
  fetchAuthorize: fetchAuthorize,
  getPending: getPending,
  clearPending: clearPending,
  exchange: exchange,
  refresh: refresh,
  fetchUserInfo: fetchUserInfo,
  fetchLogoutUrl: fetchLogoutUrl,
  pullState: pullState,
  pushState: pushState,
  saveSession: saveSession,
  getSession: getSession,
  clearSession: clearSession,
  isExpired: isExpired,
  buildSession: buildSession,
  parseJwt: parseJwt,
  currentUser: currentUser
}
