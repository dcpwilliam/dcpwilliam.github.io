const app = getApp()

Page({
  data: {
    selectedStrategy: 'ma',
    selectedStock: '贵州茅台',
    stockNames: [],
    params: {
      initialCapital: 100000,
      period: 250
    },
    showResults: false,
    backtestResult: {
      totalReturn: 0,
      annualReturn: 0,
      maxDrawdown: 0,
      sharpe: 0,
      winRate: 0,
      trades: 0
    },
    lang: 'zh',
    t: {}
  },
  
  onLoad: function () {
    const data = app.getData((data) => {
      if (data) {
        const stockNames = data.stocks.map(s => s.name)
        this.setData({
          stockNames: stockNames
        })
      }
    })
    const stockNames = data.stocks.map(s => s.name)
    this.setData({
      stockNames: stockNames
    })
    this.initLang()
  },
  
  onShow: function () {
    this.initLang()
  },
  
  initLang: function () {
    const lang = app.getLang()
    const t = app.translations[lang]
    this.setData({
      lang: lang,
      t: t
    })
  },
  
  selectStrategy: function (e) {
    const strategy = e.currentTarget.dataset.strategy
    this.setData({
      selectedStrategy: strategy,
      showResults: false
    })
  },
  
  onStockChange: function (e) {
    const index = e.detail.value
    this.setData({
      selectedStock: this.data.stockNames[index],
      showResults: false
    })
  },
  
  onParamInput: function (e) {
    const key = e.currentTarget.dataset.key
    const value = parseFloat(e.detail.value) || 0
    this.setData({
      [`params.${key}`]: value,
      showResults: false
    })
  },
  
  runBacktest: function () {
    const t = this.data.t
    wx.showLoading({
      title: t.runningBacktest || '回测中...'
    })
    
    setTimeout(() => {
      const result = this.generateMockResult()
      this.setData({
        showResults: true,
        backtestResult: result
      })
      wx.hideLoading()
    }, 1500)
  },
  
  generateMockResult: function () {
    const strategies = {
      ma: { base: 18, vol: 8 },
      momentum: { base: 22, vol: 10 },
      mean: { base: 15, vol: 6 }
    }
    
    const config = strategies[this.data.selectedStrategy]
    const totalReturn = (Math.random() - 0.3) * config.vol + config.base
    
    return {
      totalReturn: totalReturn,
      annualReturn: totalReturn * (250 / this.data.params.period),
      maxDrawdown: Math.random() * 20 + 15,
      sharpe: (Math.random() * 1.5 + 0.5),
      winRate: Math.random() * 20 + 50,
      trades: Math.floor(Math.random() * 50 + 10)
    }
  }
})
