const app = getApp()

Page({
  data: {
    industries: [],
    stocks: [],
    filteredStocks: [],
    currentFilter: 'all',
    searchKeyword: '',
    lang: 'zh',
    t: {}
  },
  
  onLoad: function () {
    const data = app.getData((data) => {
      if (data) {
        this.setData({
          industries: data.industries,
          stocks: data.stocks,
          filteredStocks: data.stocks
        })
      }
    })
    this.setData({
      industries: data.industries,
      stocks: data.stocks,
      filteredStocks: data.stocks
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
  
  onSearchInput: function (e) {
    const keyword = e.detail.value.toLowerCase()
    this.setData({
      searchKeyword: keyword
    })
    this.filterStocks()
  },
  
  setFilter: function (e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({
      currentFilter: filter
    })
    this.filterStocks()
  },
  
  filterStocks: function () {
    const { stocks, currentFilter, searchKeyword } = this.data
    let filtered = stocks
    
    if (currentFilter !== 'all') {
      filtered = filtered.filter(s => s.industry === currentFilter)
    }
    
    if (searchKeyword) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchKeyword) ||
        s.code.toLowerCase().includes(searchKeyword)
      )
    }
    
    this.setData({
      filteredStocks: filtered
    })
  },
  
  viewStockDetail: function (e) {
    const index = e.currentTarget.dataset.index
    const stock = this.data.filteredStocks[index]
    const t = this.data.t
    wx.showModal({
      title: stock.name,
      content: `${t.stockCode}: ${stock.code}\n${t.stockPrice}: ¥${stock.price.toFixed(2)}\n${t.peLabel}: ${stock.pe.toFixed(1)}\n${t.roeLabel}: ${stock.roe.toFixed(1)}%\n${t.marketCapLabel}: ${stock.marketCap}${t.capUnit}`,
      showCancel: false
    })
  }
})
