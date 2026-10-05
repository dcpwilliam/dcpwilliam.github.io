/**
 * 后端地址配置
 * ------------------------------------------------------------
 * 小程序里有两套后端，地址都可以改：
 *   aiBase    aiservice（Python）：prompt 处理 / 时间线数据 / 用户数据
 *   oidcBase  server（Node）：OIDC 登录 + 备份恢复
 *
 * 开发者工具里 127.0.0.1 能用；真机预览必须换成电脑的局域网 IP
 * （系统设置 → 网络里看，如 http://192.168.1.23:8100），并且小程序后台要把
 * 域名加进 request 合法域名，或在开发者工具里勾选「不校验合法域名」。
 * ------------------------------------------------------------
 */
const KEY = 'tl_settings_v1'

const DEFAULTS = {
  aiBase: 'http://127.0.0.1:8100',
  oidcBase: 'http://localhost:3000',
  useServer: true, // 需求页的分析是否发给 aiservice（关掉就纯本地，连不上也不影响）
  // 服务端是否再调真实大模型。默认开：aiservice 的 env.sh 已经指向本机
  // ollama http://127.0.0.1:1337/v1；本地模型慢（20~30 秒），不想等就关掉走规则引擎
  useLlm: true
}

/** 去掉尾部斜杠；没写协议时补 http:// */
function normalizeBase(raw) {
  let s = String(raw || '').trim().replace(/\/+$/, '')
  if (!s) return ''
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s
  return s
}

function get() {
  let saved = {}
  try {
    saved = wx.getStorageSync(KEY) || {}
  } catch (e) {
    saved = {}
  }
  if (typeof saved !== 'object' || !saved) saved = {}
  return {
    aiBase: normalizeBase(saved.aiBase) || DEFAULTS.aiBase,
    oidcBase: normalizeBase(saved.oidcBase) || DEFAULTS.oidcBase,
    useServer: saved.useServer === undefined ? DEFAULTS.useServer : !!saved.useServer,
    useLlm: saved.useLlm === undefined ? DEFAULTS.useLlm : !!saved.useLlm
  }
}

function save(patch) {
  const next = Object.assign(get(), patch || {})
  next.aiBase = normalizeBase(next.aiBase) || DEFAULTS.aiBase
  next.oidcBase = normalizeBase(next.oidcBase) || DEFAULTS.oidcBase
  next.useServer = !!next.useServer
  next.useLlm = !!next.useLlm
  try {
    wx.setStorageSync(KEY, next)
  } catch (e) {}
  return next
}

function reset() {
  try {
    wx.removeStorageSync(KEY)
  } catch (e) {}
  return get()
}

function isDefault() {
  const cur = get()
  return cur.aiBase === DEFAULTS.aiBase && cur.oidcBase === DEFAULTS.oidcBase &&
    cur.useServer === DEFAULTS.useServer && cur.useLlm === DEFAULTS.useLlm
}

/** 探测某个地址上的 /health，超时或失败都返回 {ok:false} */
function ping(base) {
  const url = (normalizeBase(base) || '') + '/health'
  return new Promise(function (resolve) {
    if (!url) {
      resolve({ ok: false, msg: '地址为空' })
      return
    }
    const started = Date.now()
    wx.request({
      url: url,
      method: 'GET',
      timeout: 8000,
      success: function (res) {
        const body = res.data || {}
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // aiservice 返回 service/version；登录服务只返回 ok/issuer，兜一下
          const name = body.service || (body.issuer ? '登录服务' : '服务')
          const ver = body.version ? ' v' + body.version : ''
          resolve({
            ok: true,
            msg: name + ver + ' · ' + (Date.now() - started) + 'ms',
            body: body
          })
        } else {
          resolve({ ok: false, msg: 'HTTP ' + res.statusCode })
        }
      },
      fail: function (err) {
        resolve({ ok: false, msg: (err && err.errMsg) || '连不上' })
      }
    })
  })
}

module.exports = {
  KEY: KEY,
  DEFAULTS: DEFAULTS,
  get: get,
  save: save,
  reset: reset,
  isDefault: isDefault,
  normalizeBase: normalizeBase,
  ping: ping
}
