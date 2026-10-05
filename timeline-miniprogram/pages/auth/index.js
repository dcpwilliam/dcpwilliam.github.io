const app = getApp()
const oidc = require('../../utils/oidc.js')
const date = require('../../utils/date.js')

Page({
  data: {
    user: null,
    displayName: '',
    initial: '',
    accent: '#5B6CFF',
    loginAtLabel: '',
    expiresLabel: '',
    busy: false,
    busyText: '处理中…',
    error: '',
    manualOpen: false,
    codeInput: ''
  },

  onLoad(options) {
    if (options && options.logout === '1') {
      wx.showToast({ title: '已退出登录', icon: 'none' })
    }
    if (options && options.error) {
      this.setData({ error: '认证服务返回错误：' + decodeURIComponent(options.error) })
    }
    if (options && options.code) {
      // 从回调页带着 code 回来
      const code = decodeURIComponent(options.code)
      this.setData({ codeInput: code })
      this.finishLogin(code)
    }
  },

  onShow() {
    const session = oidc.getSession()
    if (session && session.user) {
      this.renderUser(session)
    } else {
      this.setData({ user: null, error: this.data.error })
    }
  },

  renderUser(session) {
    const u = session.user || {}
    const name = u.name || u.nickname || u.email || u.phone || '已登录用户'
    this.setData({
      user: u,
      displayName: name,
      initial: String(name).trim().charAt(0) || 'U',
      accent: u.picture ? 'transparent' : '#5B6CFF',
      loginAtLabel: date.friendlyTime(session.loginAt || Date.now()),
      expiresLabel: session.expiresAt ? date.friendlyTime(session.expiresAt) : ''
    })
  },

  /* ---------------- 登录 ---------------- */

  onLogin() {
    this.setData({ busy: true, busyText: '正在准备登录…', error: '' })
    oidc
      .fetchAuthorize()
      .then((data) => {
        this.setData({ busy: false })
        wx.navigateTo({
          url: '/pages/auth/web?url=' + encodeURIComponent(data.url)
        })
      })
      .catch((err) => {
        this.setData({ busy: false, error: '无法连接登录服务：' + err.message })
      })
  },

  /** code -> token -> userinfo */
  finishLogin(code) {
    const pending = oidc.getPending()
    const verifier = pending && pending.codeVerifier
    if (!verifier) {
      this.setData({
        error: '没有找到本次登录的 code_verifier，请重新发起登录（同一台设备、同一次授权内有效）',
        manualOpen: true
      })
      return
    }
    this.setData({ busy: true, busyText: '正在换取凭证…', error: '' })

    oidc
      .exchange(code, verifier)
      .then((tokens) => {
        this.setData({ busyText: '正在读取用户信息…' })
        return oidc.fetchUserInfo(tokens.access_token).catch(() => null).then((user) => {
          const session = oidc.buildSession(tokens, user)
          oidc.clearPending()
          app.globalData.user = session.user
          app.globalData.session = session
          this.renderUser(session)
          this.setData({ busy: false, codeInput: '' })
          wx.showToast({ title: '登录成功', icon: 'success' })
        })
      })
      .catch((err) => {
        this.setData({ busy: false, error: '换取凭证失败：' + err.message })
      })
  },

  onToggleManual() {
    this.setData({ manualOpen: !this.data.manualOpen })
  },

  onCodeInput(e) {
    this.setData({ codeInput: e.detail.value })
  },

  onSubmitCode() {
    const code = String(this.data.codeInput || '').trim()
    if (!code) {
      wx.showToast({ title: '先粘贴 code', icon: 'none' })
      return
    }
    this.finishLogin(code)
  },

  /* ---------------- 其它 ---------------- */

  onRefreshInfo() {
    const session = oidc.getSession()
    if (!session) return
    this.setData({ busy: true, busyText: '正在刷新…' })
    const load = oidc.isExpired(session) && session.refreshToken
      ? oidc.refresh(session.refreshToken).then((tokens) => oidc.saveSession(Object.assign({}, session, {
          accessToken: tokens.access_token || session.accessToken,
          refreshToken: tokens.refresh_token || session.refreshToken,
          idToken: tokens.id_token || session.idToken,
          expiresAt: Date.now() + (tokens.expires_in || 0) * 1000
        })))
      : Promise.resolve(session)

    load
      .then((s) => oidc.fetchUserInfo(s.accessToken))
      .then((info) => {
        const updated = oidc.saveSession(Object.assign({}, oidc.getSession(), { user: info }))
        app.globalData.user = updated.user
        this.renderUser(updated)
        this.setData({ busy: false })
        wx.showToast({ title: '已更新', icon: 'success' })
      })
      .catch((err) => {
        this.setData({ busy: false, error: '刷新失败：' + err.message })
      })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '会清除本机凭证，云端备份仍然保留',
      confirmColor: '#E64980',
      success: (res) => {
        if (!res.confirm) return
        const session = oidc.getSession()
        oidc.clearSession()
        oidc.clearPending()
        app.globalData.user = null
        app.globalData.session = null
        this.setData({ user: null, error: '' })

        // 顺带清掉 Authing 侧的会话（可选，失败不影响本地退出）
        if (session && session.idToken) {
          oidc
            .fetchLogoutUrl(session.idToken)
            .then((data) => {
              if (data && data.url) {
                wx.navigateTo({ url: '/pages/auth/web?url=' + encodeURIComponent(data.url) })
              }
            })
            .catch(() => {})
        }
        wx.showToast({ title: '已退出', icon: 'none' })
      }
    })
  }
})
