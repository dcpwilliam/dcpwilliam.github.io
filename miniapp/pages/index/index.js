Page({
  data: {
    userInfo: null,
    lang: 'zh',
    t: {}
  },
  
  onLoad: function () {
    console.log('首页加载')
    this.initLang()
  },
  
  onShow: function () {
    console.log('首页显示')
    this.initLang()
  },
  
  initLang: function () {
    const app = getApp()
    const lang = app.getLang()
    const t = app.translations[lang]
    this.setData({
      lang: lang,
      t: t
    })
  },
  
  switchLang: function (e) {
    const lang = e.currentTarget.dataset.lang
    const app = getApp()
    app.setLang(lang)
    const t = app.translations[lang]
    this.setData({
      lang: lang,
      t: t
    })
    wx.showToast({
      title: lang === 'zh' ? '已切换为中文' : lang === 'ja' ? '日本語に切り替えました' : 'Switched to English',
      icon: 'success'
    })
  },
  
  goToFactor: function () {
    wx.switchTab({
      url: '/pages/factor/factor'
    })
  },
  
  goToMap: function () {
    wx.switchTab({
      url: '/pages/map/map'
    })
  },
  
  goToSimback: function () {
    wx.switchTab({
      url: '/pages/simback/simback'
    })
  },
  
  goToMe: function () {
    wx.switchTab({
      url: '/pages/me/me'
    })
  }
})
