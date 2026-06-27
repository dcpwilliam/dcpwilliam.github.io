Page({
  data: {
    lang: 'zh',
    t: {},
    factorCategories: [],
    factors: []
  },
  
  onLoad: function () {
    console.log('因子探究页面加载')
    this.initLang()
  },
  
  onShow: function () {
    console.log('因子探究页面显示')
    this.initLang()
  },
  
  initLang: function () {
    const app = getApp()
    const lang = app.getLang()
    const t = app.translations[lang]
    
    const factorCategoryNames = t.factorCategories || ['价值因子', '动量因子', '质量因子', '波动率因子', '流动性因子', '成长因子']
    const factorCategoryDescs = t.factorCategoryDescs || ['衡量股票估值水平', '捕捉价格趋势', '评估公司基本面', '衡量风险水平', '评估交易活跃度', '衡量增长潜力']
    
    const factorCategories = [
      { name: factorCategoryNames[0], desc: factorCategoryDescs[0], icon: '📊', count: 8 },
      { name: factorCategoryNames[1], desc: factorCategoryDescs[1], icon: '🚀', count: 6 },
      { name: factorCategoryNames[2], desc: factorCategoryDescs[2], icon: '🏢', count: 10 },
      { name: factorCategoryNames[3], desc: factorCategoryDescs[3], icon: '📈', count: 4 },
      { name: factorCategoryNames[4], desc: factorCategoryDescs[4], icon: '💧', count: 5 },
      { name: factorCategoryNames[5], desc: factorCategoryDescs[5], icon: '🌱', count: 7 }
    ]
    
    const factors = [
      { name: lang === 'zh' ? '市盈率 (PE)' : lang === 'ja' ? 'PER' : 'PE Ratio', type: lang === 'zh' ? '价值' : lang === 'ja' ? 'バリュー' : 'Value', desc: lang === 'zh' ? '股价与每股收益之比，衡量估值水平' : lang === 'ja' ? '株価と一株当たり利益の比率、価値水準を測定' : 'Ratio of stock price to earnings per share', ic: 0.087, icir: 2.34, annualReturn: 15.6 },
      { name: lang === 'zh' ? '市净率 (PB)' : lang === 'ja' ? 'PBR' : 'PB Ratio', type: lang === 'zh' ? '价值' : lang === 'ja' ? 'バリュー' : 'Value', desc: lang === 'zh' ? '股价与每股净资产之比，反映资产估值' : lang === 'ja' ? '株価と一株当たり純資産の比率、資産価値を反映' : 'Ratio of stock price to book value per share', ic: 0.072, icir: 1.98, annualReturn: 12.3 },
      { name: lang === 'zh' ? 'ROE' : lang === 'ja' ? 'ROE' : 'ROE', type: lang === 'zh' ? '质量' : lang === 'ja' ? 'クオリティ' : 'Quality', desc: lang === 'zh' ? '净资产收益率，衡量盈利能力' : lang === 'ja' ? '純資産利益率、収益性を測定' : 'Return on equity, measures profitability', ic: 0.095, icir: 2.67, annualReturn: 18.7 },
      { name: lang === 'zh' ? '营收增长率' : lang === 'ja' ? '売上高成長率' : 'Revenue Growth', type: lang === 'zh' ? '成长' : lang === 'ja' ? 'グロース' : 'Growth', desc: lang === 'zh' ? '营业收入同比增长幅度' : lang === 'ja' ? '営業収入の前年比増加率' : 'Year-over-year revenue growth rate', ic: 0.068, icir: 1.82, annualReturn: 11.2 },
      { name: lang === 'zh' ? '净利润增长率' : lang === 'ja' ? '純利益成長率' : 'Net Profit Growth', type: lang === 'zh' ? '成长' : lang === 'ja' ? 'グロース' : 'Growth', desc: lang === 'zh' ? '净利润同比增长幅度' : lang === 'ja' ? '純利益の前年比増加率' : 'Year-over-year net profit growth rate', ic: 0.076, icir: 2.05, annualReturn: 13.4 },
      { name: lang === 'zh' ? '资产负债率' : lang === 'ja' ? '資産負債率' : 'Debt Ratio', type: lang === 'zh' ? '质量' : lang === 'ja' ? 'クオリティ' : 'Quality', desc: lang === 'zh' ? '总负债与总资产之比，衡量财务风险' : lang === 'ja' ? '総負債と総資産の比率、財務リスクを測定' : 'Ratio of total debt to total assets', ic: -0.054, icir: 1.45, annualReturn: 8.9 },
      { name: lang === 'zh' ? '6个月收益率' : lang === 'ja' ? '6ヶ月収益率' : '6-Month Return', type: lang === 'zh' ? '动量' : lang === 'ja' ? 'モメンタム' : 'Momentum', desc: lang === 'zh' ? '过去6个月累计收益率' : lang === 'ja' ? '過去6ヶ月の累計収益率' : 'Cumulative return over past 6 months', ic: 0.102, icir: 2.89, annualReturn: 20.1 },
      { name: lang === 'zh' ? '换手率' : lang === 'ja' ? '売買代金比率' : 'Turnover Rate', type: lang === 'zh' ? '流动性' : lang === 'ja' ? 'リキディティ' : 'Liquidity', desc: lang === 'zh' ? '股票交易活跃度指标' : lang === 'ja' ? '株式の取引活発度指標' : 'Trading activity indicator', ic: 0.034, icir: 0.92, annualReturn: 5.6 }
    ]
    
    this.setData({
      lang: lang,
      t: t,
      factorCategories: factorCategories,
      factors: factors
    })
  },
  
  selectCategory: function (e) {
    const index = e.currentTarget.dataset.index
    const category = this.data.factorCategories[index]
    const app = getApp()
    const t = app.translations[app.getLang()]
    wx.showToast({
      title: `${t.selected}: ${category.name}`,
      icon: 'none'
    })
  }
})
