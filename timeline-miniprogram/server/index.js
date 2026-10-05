/**
 * Timeline · OIDC 登录后端（零依赖，node server/index.js 即可运行）
 *
 * 职责：
 *   1. 生成 PKCE 与授权 URL（code_verifier 交给小程序保管，服务端不存）
 *   2. 用 App Secret 把 code 换成 token —— secret 只留在服务端
 *   3. 代理 userinfo / refresh / 登出 URL
 *
 * 路由：
 *   GET  /health
 *   GET  /oidc/config
 *   GET  /oidc/authorize-url
 *   POST /oidc/token            { code, codeVerifier }
 *   POST /oidc/refresh          { refreshToken }
 *   GET  /oidc/me               Authorization: Bearer <access_token>
 *   GET  /oidc/logout-url       ?idTokenHint=...
 *   GET  /oidc/callback         给 web-view 用的回调页
 */
const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { URL } = require('url')
const config = require('./config')

/* ------------------------------ 工具 ------------------------------ */

function rand(len) {
  return crypto.randomBytes(len).toString('base64url').slice(0, len)
}

function base64urlSha256(str) {
  return crypto.createHash('sha256').update(str).digest('base64url')
}

function formEncode(obj) {
  return Object.keys(obj)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]))
    .join('&')
}

function request(targetUrl, options) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl)
    const mod = u.protocol === 'https:' ? https : http
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: Object.assign({ Accept: 'application/json' }, options.headers || {}),
        timeout: 15000
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (c) => (body += c))
        res.on('end', () => {
          let data = body
          try {
            data = JSON.parse(body)
          } catch (e) {}
          if (res.statusCode >= 400) {
            reject(Object.assign(new Error('upstream ' + res.statusCode), { status: res.statusCode, body: data }))
          } else {
            resolve(data)
          }
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error('upstream timeout')))
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

function send(res, code, data, headers) {
  const isJson = typeof data !== 'string'
  res.writeHead(code, Object.assign({
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  }, headers || {}))
  res.end(isJson ? JSON.stringify(data) : data)
}

/* --------------------- 用户数据备份（按 sub 隔离） --------------------- */

const DATA_DIR = path.join(__dirname, 'data')

function dataFile(sub) {
  const safe = String(sub || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(DATA_DIR, safe + '.json')
}

function readState(sub) {
  const p = dataFile(sub)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    return null
  }
}

function writeState(sub, state) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const payload = {
    sub: sub,
    goals: Array.isArray(state.goals) ? state.goals : [],
    records: Array.isArray(state.records) ? state.records : [],
    updatedAt: Date.now()
  }
  fs.writeFileSync(dataFile(sub), JSON.stringify(payload), 'utf8')
  return payload
}

/** 从 access_token 解析出 sub（仅用于分文件存储，鉴权请用 Authing 校验） */
function subFromToken(accessToken) {
  const parts = String(accessToken || '').split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return payload.sub || null
  } catch (e) {
    return null
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        resolve({})
      }
    })
  })
}

/* ------------------------------ OIDC ------------------------------ */

function buildAuthorizeUrl(state, codeChallenge) {
  const q = {
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'login'
  }
  return config.authorizationEndpoint + '?' + formEncode(q)
}

async function exchangeCode(code, codeVerifier) {
  const body = formEncode({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier
  })
  return request(config.tokenEndpoint, {
    method: 'POST',
    body: body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}

async function refreshToken(refreshTokenValue) {
  const body = formEncode({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshTokenValue
  })
  return request(config.tokenEndpoint, {
    method: 'POST',
    body: body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}

async function userInfo(accessToken) {
  return request(config.userInfoEndpoint, {
    headers: { Authorization: 'Bearer ' + accessToken }
  })
}

/* ------------------------------ 服务 ------------------------------ */

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, config.publicBaseUrl)
  const route = u.pathname

  if (req.method === 'OPTIONS') return send(res, 204, '')

  try {
    if (route === '/health') {
      return send(res, 200, { ok: true, issuer: config.issuer, redirectUri: config.redirectUri })
    }

    if (route === '/oidc/config') {
      return send(res, 200, {
        clientId: config.clientId,
        issuer: config.issuer,
        authorizationEndpoint: config.authorizationEndpoint,
        endSessionEndpoint: config.endSessionEndpoint,
        scopes: config.scopes,
        redirectUri: config.redirectUri
      })
    }

    if (route === '/oidc/authorize-url') {
      const state = rand(24)
      const codeVerifier = rand(64)
      const codeChallenge = base64urlSha256(codeVerifier)
      return send(res, 200, {
        url: buildAuthorizeUrl(state, codeChallenge),
        state: state,
        codeVerifier: codeVerifier
      })
    }

    if (route === '/oidc/token' && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.code || !body.codeVerifier) {
        return send(res, 400, { error: 'missing code or codeVerifier' })
      }
      const tokens = await exchangeCode(body.code, body.codeVerifier)
      return send(res, 200, tokens)
    }

    if (route === '/oidc/refresh' && req.method === 'POST') {
      const body = await readBody(req)
      if (!body.refreshToken) return send(res, 400, { error: 'missing refreshToken' })
      const tokens = await refreshToken(body.refreshToken)
      return send(res, 200, tokens)
    }

    if (route === '/oidc/me') {
      const auth = req.headers.authorization || ''
      const token = auth.replace(/^Bearer\s+/i, '')
      if (!token) return send(res, 401, { error: 'missing bearer token' })
      const info = await userInfo(token)
      return send(res, 200, info)
    }

    if (route === '/oidc/logout-url') {
      const q = {
        post_logout_redirect_uri: config.publicBaseUrl + '/oidc/callback?logout=1'
      }
      if (u.searchParams.get('idTokenHint')) q.id_token_hint = u.searchParams.get('idTokenHint')
      if (config.clientId) q.client_id = config.clientId
      return send(res, 200, { url: config.endSessionEndpoint + '?' + formEncode(q) })
    }

    // 备份 / 恢复：按登录用户隔离
    if (route === '/api/state') {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
      const sub = subFromToken(token)
      if (!sub) return send(res, 401, { error: 'invalid token' })

      if (req.method === 'GET') {
        return send(res, 200, readState(sub) || { sub: sub, goals: [], records: [], updatedAt: 0 })
      }
      if (req.method === 'PUT') {
        const body = await readBody(req)
        return send(res, 200, writeState(sub, body || {}))
      }
      return send(res, 405, { error: 'method not allowed' })
    }

    if (route === '/oidc/callback' || route === '/') {
      const file = route === '/' ? 'index.html' : 'callback.html'
      const p = path.join(__dirname, 'public', file)
      if (fs.existsSync(p)) return send(res, 200, fs.readFileSync(p, 'utf8'))
      return send(res, 404, 'not found')
    }

    return send(res, 404, { error: 'not found' })
  } catch (err) {
    console.error('[oidc]', route, err.message, err.body || '')
    send(res, err.status || 500, { error: err.message, detail: err.body || null })
  }
})

server.listen(config.port, () => {
  console.log('OIDC 服务已启动:', config.publicBaseUrl)
  console.log('  issuer       :', config.issuer)
  console.log('  redirect_uri :', config.redirectUri)
  console.log('  health       :', config.publicBaseUrl + '/health')
  console.log('\n请确认 Authing 应用的「登录回调 URL」白名单里包含上面的 redirect_uri')
})
