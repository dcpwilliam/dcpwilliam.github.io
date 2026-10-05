const app = getApp()
const settings = require('../../utils/settings.js')
const oidc = require('../../utils/oidc.js')

Page({
  data: {
    aiBase: '',
    oidcBase: '',
    useServer: true,
    useLlm: true,
    dirty: false,
    aiPing: null,   // {ok, msg} | null
    oidcPing: null,
    testing: false,
    defaults: settings.DEFAULTS,
    saved: false
  },

  onLoad() {
    const cur = settings.get()
    this.setData({
      aiBase: cur.aiBase,
      oidcBase: cur.oidcBase,
      useServer: cur.useServer,
      useLlm: cur.useLlm
    })
  },

  /* ---------------- 输入 ---------------- */

  onInput(e) {
    const key = e.currentTarget.dataset.key
    const patch = { dirty: true, saved: false }
    patch[key] = e.detail.value
    if (key === 'aiBase') patch.aiPing = null
    if (key === 'oidcBase') patch.oidcPing = null
    this.setData(patch)
  },

  onToggleLlm(e) {
    this.setData({ useLlm: e.detail.value, dirty: true, saved: false })
  },

  onToggleServer(e) {
    this.setData({ useServer: e.detail.value, dirty: true, saved: false })
  },

  /* ---------------- 保存 / 恢复 ---------------- */

  onSave() {
    const next = settings.save({
      aiBase: this.data.aiBase,
      oidcBase: this.data.oidcBase,
      useServer: this.data.useServer,
      useLlm: this.data.useLlm
    })
    // 让已在内存里的 oidc 客户端立刻用上新地址
    oidc.setApiBase(next.oidcBase)
    this.setData({
      aiBase: next.aiBase,
      oidcBase: next.oidcBase,
      dirty: false,
      saved: true,
      aiPing: null,
      oidcPing: null
    })
    wx.showToast({ title: '已保存', icon: 'success' })
    wx.vibrateShort && wx.vibrateShort({ type: 'light' })
  },

  onReset() {
    wx.showModal({
      title: '恢复默认地址',
      content: '两个地址都会改回默认值，你改过的会丢失',
      success: (res) => {
        if (!res.confirm) return
        const def = settings.reset()
        oidc.setApiBase(def.oidcBase)
        this.setData({
          aiBase: def.aiBase,
          oidcBase: def.oidcBase,
          useServer: def.useServer,
          useLlm: def.useLlm,
          dirty: false,
          saved: false,
          aiPing: null,
          oidcPing: null
        })
        wx.showToast({ title: '已恢复默认', icon: 'none' })
      }
    })
  },

  /* ---------------- 测试连接 ---------------- */

  onTest(e) {
    const which = e.currentTarget.dataset.which
    const raw = which === 'ai' ? this.data.aiBase : this.data.oidcBase
    const url = settings.normalizeBase(raw)
    if (!url) {
      wx.showToast({ title: '先填地址', icon: 'none' })
      return
    }
    this.setData({ testing: true })
    settings.ping(url).then((res) => {
      const patch = { testing: false }
      patch[which + 'Ping'] = res
      this.setData(patch)
      wx.showToast({
        title: res.ok ? '连上了' : '连不上',
        icon: res.ok ? 'success' : 'none'
      })
    })
  },

  /** 测试通过的地址直接存下来 */
  onUseIt(e) {
    const which = e.currentTarget.dataset.which
    const patch = {}
    if (which === 'ai') patch.aiBase = settings.normalizeBase(this.data.aiBase)
    else patch.oidcBase = settings.normalizeBase(this.data.oidcBase)
    this.setData(Object.assign({ dirty: true }, patch), () => this.onSave())
  },

  /* ---------------- 提示 ---------------- */

  onFillLan() {
    wx.showModal({
      title: '真机怎么填',
      content:
        '1. 电脑与手机连同一个 Wi-Fi\n' +
        '2. 在电脑终端执行 ipconfig getifaddr en0（macOS）或 ipconfig（Windows）拿到局域网 IP\n' +
        '3. 把 127.0.0.1 / localhost 换成这个 IP，端口不变\n' +
        '4. 小程序后台把该域名加进 request 合法域名，或在开发者工具勾选「不校验合法域名」',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/timeline/index' })
    })
  }
})
