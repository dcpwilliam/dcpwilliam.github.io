Page({
  data: {
    url: ''
  },

  onLoad(options) {
    const url = options && options.url ? decodeURIComponent(options.url) : ''
    if (!url) {
      wx.showToast({ title: '缺少登录地址', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 600)
      return
    }
    this.setData({ url: url })
  }
})
