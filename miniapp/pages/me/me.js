Page({
  data: {
    portfolio: [
      { name: '贵州茅台', code: '600519.SH', price: 1890.00, change: 2.34, shares: 100, marketValue: 189000 },
      { name: '宁德时代', code: '300750.SZ', price: 187.65, change: -1.23, shares: 500, marketValue: 93825 },
      { name: '招商银行', code: '600036.SH', price: 35.67, change: 0.89, shares: 1000, marketValue: 35670 }
    ],
    strategies: [
      { name: '均线策略', status: 'running', totalReturn: 18.56 },
      { name: '价值因子策略', status: 'running', totalReturn: 12.34 },
      { name: '动量策略', status: 'stopped', totalReturn: 8.90 }
    ],
    lang: 'zh',
    t: {}
  },
  
  onLoad: function () {
    console.log('个人信息页面加载')
    this.initLang()
  },
  
  onShow: function () {
    this.initLang()
  },
  
  initLang: function () {
    const app = getApp()
    const lang = app.getLang()
    const t = app.translations[lang]
    
    const strategyNames = lang === 'zh' ? ['均线策略', '价值因子策略', '动量策略'] : lang === 'ja' ? ['移動平均戦略', 'バリューファクター戦略', 'モメンタム戦略'] : ['Moving Average', 'Value Factor', 'Momentum']
    
    this.setData({
      lang: lang,
      t: t,
      strategies: [
        { name: strategyNames[0], status: 'running', totalReturn: 18.56 },
        { name: strategyNames[1], status: 'running', totalReturn: 12.34 },
        { name: strategyNames[2], status: 'stopped', totalReturn: 8.90 }
      ]
    })
  },
  
  goToAction: function (e) {
    const app = getApp()
    const t = app.translations[app.getLang()]
    const actions = [t.holdings, t.tradeHistory, t.strategyManage, t.fundDetail, t.myRights, t.settings]
    const index = e.currentTarget.dataset.index
    const action = actions[index]
    wx.showToast({
      title: `${t.entering}: ${action}`,
      icon: 'none'
    })
  }
})
