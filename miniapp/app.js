App({
  onLaunch: function () {
    console.log('EBI 循证投资小程序启动')
    const lang = wx.getStorageSync('ebi-lang') || 'zh'
    this.globalData.lang = lang
  },
  
  onShow: function () {
    console.log('小程序显示')
  },
  
  onHide: function () {
    console.log('小程序隐藏')
  },
  
  globalData: {
    userInfo: null,
    stocks: [],
    lang: 'zh',
    cachedData: null,
    dataFetched: false,
    dataUrl: 'https://console.authing.cn/webhook/2fd05435-b258-44f7-b5ae-760565ff646a'
  },
  
  translations: {
    zh: {
      appTitle: 'EBI 循证投资',
      appSubtitle: 'Evidence-Based Investing',
      welcomeTitle: '欢迎使用',
      welcomeDesc: '基于数据和策略的循证投资分析工具',
      moduleFactor: '因子探究',
      moduleFactorDesc: '深入分析各类投资因子，发现市场规律与投资机会',
      moduleMap: '市场雷达',
      moduleMapDesc: '多维度可视化股票市场，把握市场脉搏与热点轮动',
      moduleSimback: '策略模拟',
      moduleSimbackDesc: '模拟交易与回测验证，检验策略有效性，降低实盘风险',
      moduleMe: '个人信息',
      moduleMeDesc: '管理个人资料与偏好设置，查看投资组合表现',
      statsTitle: '市场概览',
      statStocks: '股票数量',
      statIndustries: '行业分类',
      statThemes: '概念主题',
      statAvgReturn: '平均收益',
      searchPlaceholder: '搜索股票名称或代码',
      filterAll: '全部',
      marketSummary: '市场概览',
      upCount: '上涨家数',
      downCount: '下跌家数',
      flatCount: '平盘',
      stockList: '股票列表',
      stockName: '名称',
      stockCode: '代码',
      stockPrice: '价格',
      stockChange: '涨跌',
      peLabel: 'PE',
      roeLabel: 'ROE',
      marketCapLabel: '市值',
      stockCountSuffix: '只',
      capUnit: '亿',
      factorCategories: ['价值因子', '动量因子', '质量因子', '波动率因子', '流动性因子', '成长因子'],
      factorCategoryDescs: ['衡量股票估值水平', '捕捉价格趋势', '评估公司基本面', '衡量风险水平', '评估交易活跃度', '衡量增长潜力'],
      factorCountSuffix: '个因子',
      hotFactors: '热门因子',
      icMean: 'IC均值',
      icir: 'ICIR',
      selected: '已选择',
      strategyMA: '均线策略',
      strategyMomentum: '动量策略',
      strategyMeanReversion: '均值回归',
      selectStrategy: '选择策略',
      selectStock: '选择股票',
      initialCapital: '初始资金',
      backtestPeriod: '回测周期',
      runBacktest: '运行回测',
      runningBacktest: '回测中...',
      backtestParams: '回测参数',
      backtestResults: '回测结果',
      currencyUnit: '元',
      periodUnit: '天',
      totalReturn: '总收益率',
      annualizedReturn: '年化收益',
      maxDrawdown: '最大回撤',
      sharpeRatio: '夏普比率',
      winRate: '胜率',
      tradeCount: '交易次数',
      myAssets: '我的资产',
      totalAssets: '总资产',
      totalReturn: '总收益',
      tradeCount: '交易次数',
      portfolio: '持仓',
      strategies: '策略',
      holdings: '持仓管理',
      tradeHistory: '交易记录',
      strategyManage: '策略管理',
      fundDetail: '资金明细',
      myRights: '我的权益',
      settings: '设置',
      userName: 'EBI 用户',
      userLevel: 'Lv.3 投资达人',
      userDesc: '专注价值投资，追求稳健收益',
      viewAll: '查看全部',
      holdShares: '持仓',
      sharesUnit: '股',
      marketValue: '市值',
      running: '运行中',
      stopped: '已停止',
      entering: '即将进入',
      langChinese: '中文',
      langJapanese: '日本語',
      langEnglish: 'English'
    },
    ja: {
      appTitle: 'EBI 証拠に基づく投資',
      appSubtitle: 'Evidence-Based Investing',
      welcomeTitle: 'ようこそ',
      welcomeDesc: 'データと戦略に基づく証拠に基づく投資分析ツール',
      moduleFactor: 'ファクター分析',
      moduleFactorDesc: '各種投資ファクターを深く分析し、市場の法則と投資機会を発見',
      moduleMap: '市場レーダー',
      moduleMapDesc: '多次元的に株式市場を可視化し、市場のパルスとホットスポットの輪動を把握',
      moduleSimback: '戦略シミュレーション',
      moduleSimbackDesc: '模擬取引とバックテスト検証を行い、戦略の有効性を検証',
      moduleMe: '個人情報',
      moduleMeDesc: '個人データと設定を管理し、投資ポートフォリオのパフォーマンスを確認',
      statsTitle: '市場概要',
      statStocks: '株式数',
      statIndustries: '業界分類',
      statThemes: 'コンセプト',
      statAvgReturn: '平均収益',
      searchPlaceholder: '株式名称またはコードを検索',
      filterAll: '全て',
      marketSummary: '市場概要',
      upCount: '上昇株数',
      downCount: '下落株数',
      flatCount: '横ばい',
      stockList: '株式リスト',
      stockName: '名称',
      stockCode: 'コード',
      stockPrice: '価格',
      stockChange: '騰落',
      peLabel: 'PER',
      roeLabel: 'ROE',
      marketCapLabel: '時価総額',
      stockCountSuffix: '銘柄',
      capUnit: '億円',
      factorCategories: ['バリューファクター', 'モメンタムファクター', 'クオリティファクター', 'ボラティリティファクター', 'リキディティファクター', 'グロースファクター'],
      factorCategoryDescs: ['株式の価値水準を測定', '価格トレンドを捉える', '企業の基本面を評価', 'リスク水準を測定', '取引の活発度を評価', '成長力を測定'],
      factorCountSuffix: '個のファクター',
      hotFactors: '人気ファクター',
      icMean: 'IC平均',
      icir: 'ICIR',
      selected: '選択',
      strategyMA: '移動平均戦略',
      strategyMomentum: 'モメンタム戦略',
      strategyMeanReversion: '平均回帰',
      selectStrategy: '戦略を選択',
      selectStock: '株式を選択',
      initialCapital: '初期資金',
      backtestPeriod: 'バックテスト期間',
      runBacktest: 'バックテスト実行',
      runningBacktest: 'バックテスト中...',
      backtestParams: 'バックテストパラメータ',
      backtestResults: 'バックテスト結果',
      currencyUnit: '円',
      periodUnit: '日',
      totalReturn: '総収益率',
      annualizedReturn: '年間収益率',
      maxDrawdown: '最大ドローダウン',
      sharpeRatio: 'シャープレシオ',
      winRate: '勝率',
      tradeCount: '取引回数',
      myAssets: '私の資産',
      totalAssets: '総資産',
      totalReturn: '総収益',
      tradeCount: '取引回数',
      portfolio: 'ポートフォリオ',
      strategies: '戦略',
      holdings: 'ポートフォリオ管理',
      tradeHistory: '取引履歴',
      strategyManage: '戦略管理',
      fundDetail: '資金明細',
      myRights: '私の権益',
      settings: '設定',
      userName: 'EBI ユーザー',
      userLevel: 'Lv.3 投資達人',
      userDesc: 'バリュー投資に特化、安定的な収益を追求',
      viewAll: 'すべてを表示',
      holdShares: '保有',
      sharesUnit: '株',
      marketValue: '時価総額',
      running: '実行中',
      stopped: '停止',
      entering: '入る',
      langChinese: '中文',
      langJapanese: '日本語',
      langEnglish: 'English'
    },
    en: {
      appTitle: 'EBI Evidence-Based Investing',
      appSubtitle: 'Evidence-Based Investing',
      welcomeTitle: 'Welcome',
      welcomeDesc: 'Data-driven investment analysis tool based on evidence',
      moduleFactor: 'Factor Analysis',
      moduleFactorDesc: 'Deeply analyze investment factors, discover market patterns and opportunities',
      moduleMap: 'Market Radar',
      moduleMapDesc: 'Multi-dimensional visualization of stock market, capture market pulse',
      moduleSimback: 'Strategy Simulation',
      moduleSimbackDesc: 'Simulated trading and backtesting, verify strategy effectiveness',
      moduleMe: 'Profile',
      moduleMeDesc: 'Manage personal data and preferences, view portfolio performance',
      statsTitle: 'Market Overview',
      statStocks: 'Stock Count',
      statIndustries: 'Industries',
      statThemes: 'Themes',
      statAvgReturn: 'Avg Return',
      searchPlaceholder: 'Search stock name or code',
      filterAll: 'All',
      marketSummary: 'Market Summary',
      upCount: 'Up',
      downCount: 'Down',
      flatCount: 'Flat',
      stockList: 'Stock List',
      stockName: 'Name',
      stockCode: 'Code',
      stockPrice: 'Price',
      stockChange: 'Change',
      peLabel: 'PE',
      roeLabel: 'ROE',
      marketCapLabel: 'Market Cap',
      stockCountSuffix: 'stocks',
      capUnit: 'B',
      factorCategories: ['Value Factor', 'Momentum Factor', 'Quality Factor', 'Volatility Factor', 'Liquidity Factor', 'Growth Factor'],
      factorCategoryDescs: ['Measure stock valuation', 'Capture price trends', 'Evaluate fundamentals', 'Measure risk level', 'Evaluate trading activity', 'Measure growth potential'],
      factorCountSuffix: ' factors',
      hotFactors: 'Hot Factors',
      icMean: 'IC Mean',
      icir: 'ICIR',
      selected: 'Selected',
      strategyMA: 'Moving Average',
      strategyMomentum: 'Momentum',
      strategyMeanReversion: 'Mean Reversion',
      selectStrategy: 'Select Strategy',
      selectStock: 'Select Stock',
      initialCapital: 'Initial Capital',
      backtestPeriod: 'Backtest Period',
      runBacktest: 'Run Backtest',
      runningBacktest: 'Running...',
      backtestParams: 'Backtest Params',
      backtestResults: 'Backtest Results',
      currencyUnit: 'USD',
      periodUnit: 'days',
      totalReturn: 'Total Return',
      annualizedReturn: 'Annualized Return',
      maxDrawdown: 'Max Drawdown',
      sharpeRatio: 'Sharpe Ratio',
      winRate: 'Win Rate',
      tradeCount: 'Trade Count',
      myAssets: 'My Assets',
      totalAssets: 'Total Assets',
      totalReturn: 'Total Return',
      tradeCount: 'Trade Count',
      portfolio: 'Portfolio',
      strategies: 'Strategies',
      holdings: 'Holdings',
      tradeHistory: 'Trade History',
      strategyManage: 'Strategy Management',
      fundDetail: 'Fund Details',
      myRights: 'My Rights',
      settings: 'Settings',
      userName: 'EBI User',
      userLevel: 'Lv.3 Investment Expert',
      userDesc: 'Focus on value investing, pursue steady returns',
      viewAll: 'View All',
      holdShares: 'Hold',
      sharesUnit: 'shares',
      marketValue: 'Market Value',
      running: 'Running',
      stopped: 'Stopped',
      entering: 'Entering',
      langChinese: '中文',
      langJapanese: '日本語',
      langEnglish: 'English'
    }
  },
  
  setLang: function (lang) {
    this.globalData.lang = lang
    wx.setStorageSync('ebi-lang', lang)
  },
  
  getLang: function () {
    return this.globalData.lang
  },
  
  t: function (key) {
    const lang = this.globalData.lang
    return this.translations[lang][key] || key
  },
  
  fetchData: function (callback) {
    const url = this.globalData.dataUrl
    wx.request({
      url: url,
      method: 'GET',
      success: (res) => {
        try {
          const responseData = res.data
          if (responseData.code === 200 && responseData.data && responseData.data.output && responseData.data.output.data && responseData.data.output.data.data) {
            const content = responseData.data.output.data.data.content
            const parsedData = this.parseContentData(content)
            if (parsedData) {
              this.globalData.cachedData = parsedData
              if (callback) callback(parsedData)
            } else {
              if (callback) callback(this.getFallbackData())
            }
          } else {
            if (callback) callback(this.getFallbackData())
          }
        } catch (e) {
          console.error('解析数据失败:', e)
          if (callback) callback(this.getFallbackData())
        }
      },
      fail: (err) => {
        console.error('请求失败:', err)
        if (callback) callback(this.getFallbackData())
      }
    })
  },
  
  parseContentData: function (content) {
    try {
      const industriesMatch = content.match(/industries:\s*\[([\s\S]*?)\]/)
      const themesMatch = content.match(/themes:\s*\[([\s\S]*?)\]/)
      const stocksMatch = content.match(/stocks:\s*\[([\s\S]*?)\]/)
      
      if (!industriesMatch || !themesMatch || !stocksMatch) {
        return null
      }
      
      const industries = this.parseArrayData(industriesMatch[1])
      const themes = this.parseArrayData(themesMatch[1])
      const stocks = this.parseStockData(stocksMatch[1])
      
      return { industries, themes, stocks }
    } catch (e) {
      console.error('解析内容失败:', e)
      return null
    }
  },
  
  parseArrayData: function (str) {
    const items = []
    const regex = /\{\s*name:\s*'([^']+)',\s*color:\s*'([^']+)'\s*\}/g
    let match
    while ((match = regex.exec(str)) !== null) {
      items.push({ name: match[1], color: match[2] })
    }
    return items
  },
  
  parseStockData: function (str) {
    try {
      const cleanStr = str.replace(/\s+/g, ' ')
      const stockObjects = cleanStr.match(/\{[^}]+\}/g)
      const stocks = []
      
      for (const obj of stockObjects) {
        try {
          const jsonStr = obj.replace(/(\w+):/g, '"$1":')
          const stock = JSON.parse(jsonStr)
          stocks.push(stock)
        } catch (e) {
          continue
        }
      }
      
      return stocks
    } catch (e) {
      console.error('解析股票数据失败:', e)
      return []
    }
  },
  
  getData: function (callback) {
    if (this.globalData.cachedData) {
      return this.globalData.cachedData
    }
    
    if (!this.globalData.dataFetched) {
      this.globalData.dataFetched = true
      this.fetchData(callback)
    }
    
    return this.getFallbackData()
  },
  
  getFallbackData: function() {
    return {
      industries: [
        { name: '半导体', color: '#00d4ff' },
        { name: '新能源', color: '#00d4aa' },
        { name: '医药生物', color: '#ff6b6b' },
        { name: '白酒', color: '#ffd93d' },
        { name: '银行', color: '#7b61ff' },
        { name: '人工智能', color: '#ff9f43' },
        { name: '消费电子', color: '#54a0ff' },
        { name: '化工', color: '#5f27cd' }
      ],
      themes: [
        { name: '高股息', color: '#00d4aa' },
        { name: '成长股', color: '#ff6b6b' },
        { name: '价值股', color: '#7b61ff' },
        { name: '周期股', color: '#ffd93d' },
        { name: '科技股', color: '#00d4ff' },
        { name: '消费股', color: '#ff9f43' }
      ],
      stocks: [
        {"name":"中芯国际","code":"601.SH","industry":"半导体","theme":"科技股","marketCap":6542,"pe":45.23,"pb":3.85,"roe":12.45,"revenue":896.52,"profit":156.32,"change":15.67,"dividend":0.85,"debt":45.23,"volume":4567800,"price":52.35},
        {"name":"韦尔股份","code":"602.SZ","industry":"半导体","theme":"科技股","marketCap":2345,"pe":32.18,"pb":4.23,"roe":15.67,"revenue":345.67,"profit":67.89,"change":-8.23,"dividend":1.23,"debt":32.15,"volume":2345600,"price":89.67},
        {"name":"北方华创","code":"603.SH","industry":"半导体","theme":"科技股","marketCap":1876,"pe":56.78,"pb":8.92,"roe":18.34,"revenue":234.56,"profit":45.67,"change":23.45,"dividend":0.56,"debt":28.45,"volume":1876500,"price":156.78},
        {"name":"兆易创新","code":"604.SZ","industry":"半导体","theme":"成长股","marketCap":1567,"pe":42.34,"pb":6.78,"roe":16.78,"revenue":187.65,"profit":38.90,"change":-5.67,"dividend":0.98,"debt":22.34,"volume":1567800,"price":78.90},
        {"name":"紫光国微","code":"605.SH","industry":"半导体","theme":"成长股","marketCap":1234,"pe":58.90,"pb":7.23,"roe":14.56,"revenue":156.78,"profit":32.12,"change":8.90,"dividend":1.12,"debt":35.67,"volume":1234500,"price":123.45},
        {"name":"宁德时代","code":"611.SH","industry":"新能源","theme":"成长股","marketCap":7890,"pe":28.76,"pb":4.56,"roe":19.87,"revenue":2134.56,"profit":456.78,"change":-12.34,"dividend":2.34,"debt":55.67,"volume":5678900,"price":187.65},
        {"name":"隆基绿能","code":"612.SZ","industry":"新能源","theme":"价值股","marketCap":3456,"pe":18.34,"pb":3.23,"roe":16.56,"revenue":1234.56,"profit":234.56,"change":5.67,"dividend":3.45,"debt":42.34,"volume":3456700,"price":45.67},
        {"name":"通威股份","code":"613.SH","industry":"新能源","theme":"周期股","marketCap":2134,"pe":12.45,"pb":2.34,"roe":18.78,"revenue":896.54,"profit":187.65,"change":-15.67,"dividend":4.56,"debt":38.78,"volume":2134500,"price":32.45},
        {"name":"比亚迪","code":"614.SZ","industry":"新能源","theme":"成长股","marketCap":5678,"pe":42.34,"pb":5.67,"roe":15.45,"revenue":3234.56,"profit":345.67,"change":18.78,"dividend":1.23,"debt":62.34,"volume":4567800,"price":234.56},
        {"name":"阳光电源","code":"615.SH","industry":"新能源","theme":"成长股","marketCap":1567,"pe":52.34,"pb":6.78,"roe":17.89,"revenue":456.78,"profit":78.90,"change":25.34,"dividend":0.78,"debt":48.56,"volume":1567800,"price":134.56},
        {"name":"恒瑞医药","code":"621.SZ","industry":"医药生物","theme":"价值股","marketCap":4567,"pe":38.76,"pb":5.67,"roe":14.34,"revenue":345.67,"profit":89.67,"change":-2.34,"dividend":2.89,"debt":18.78,"volume":3456700,"price":56.78},
        {"name":"药明康德","code":"622.SH","industry":"医药生物","theme":"成长股","marketCap":2890,"pe":35.45,"pb":4.34,"roe":15.67,"revenue":567.89,"profit":112.34,"change":-8.90,"dividend":1.56,"debt":28.45,"volume":2890100,"price":98.76},
        {"name":"迈瑞医疗","code":"623.SZ","industry":"医药生物","theme":"价值股","marketCap":3234,"pe":42.34,"pb":6.78,"roe":20.34,"revenue":389.67,"profit":134.56,"change":6.78,"dividend":3.23,"debt":15.67,"volume":3234500,"price":298.76},
        {"name":"爱尔眼科","code":"624.SH","industry":"医药生物","theme":"成长股","marketCap":1567,"pe":56.78,"pb":7.89,"roe":18.67,"revenue":145.67,"profit":34.56,"change":12.34,"dividend":0.89,"debt":32.15,"volume":1567800,"price":45.67},
        {"name":"智飞生物","code":"625.SZ","industry":"医药生物","theme":"成长股","marketCap":2134,"pe":34.56,"pb":5.45,"roe":16.78,"revenue":323.45,"profit":67.89,"change":-18.78,"dividend":1.78,"debt":25.67,"volume":2134500,"price":78.90},
        {"name":"贵州茅台","code":"631.SH","industry":"白酒","theme":"价值股","marketCap":21345,"pe":35.45,"pb":9.87,"roe":25.34,"revenue":1345.67,"profit":678.90,"change":-5.67,"dividend":15.67,"debt":12.34,"volume":1234500,"price":1890.00},
        {"name":"五粮液","code":"632.SZ","industry":"白酒","theme":"价值股","marketCap":6543,"pe":28.76,"pb":6.78,"roe":22.34,"revenue":789.67,"profit":345.67,"change":-8.90,"dividend":8.90,"debt":15.45,"volume":2345600,"price":167.89},
        {"name":"泸州老窖","code":"633.SH","industry":"白酒","theme":"价值股","marketCap":3456,"pe":32.34,"pb":7.89,"roe":24.56,"revenue":389.67,"profit":187.65,"change":-3.45,"dividend":7.65,"debt":18.34,"volume":1567800,"price":234.56},
        {"name":"山西汾酒","code":"634.SZ","industry":"白酒","theme":"成长股","marketCap":2890,"pe":45.67,"pb":8.76,"roe":21.34,"revenue":289.67,"profit":123.45,"change":4.56,"dividend":4.56,"debt":22.45,"volume":1890100,"price":189.67},
        {"name":"洋河股份","code":"635.SH","industry":"白酒","theme":"价值股","marketCap":3123,"pe":26.78,"pb":6.34,"roe":23.45,"revenue":345.67,"profit":156.78,"change":-6.78,"dividend":9.87,"debt":16.78,"volume":1234500,"price":123.45},
        {"name":"招商银行","code":"641.SH","industry":"银行","theme":"高股息","marketCap":9876,"pe":8.76,"pb":1.45,"roe":16.34,"revenue":3234.56,"profit":1123.45,"change":3.45,"dividend":6.78,"debt":85.67,"volume":5678900,"price":35.67},
        {"name":"平安银行","code":"642.SZ","industry":"银行","theme":"高股息","marketCap":3456,"pe":9.87,"pb":1.34,"roe":12.45,"revenue":1234.56,"profit":345.67,"change":-2.34,"dividend":4.56,"debt":88.78,"volume":3456700,"price":18.78},
        {"name":"兴业银行","code":"643.SH","industry":"银行","theme":"高股息","marketCap":4567,"pe":6.78,"pb":1.23,"roe":14.56,"revenue":1876.54,"profit":567.89,"change":5.67,"dividend":5.67,"debt":86.45,"volume":4567800,"price":23.45},
        {"name":"宁波银行","code":"644.SZ","industry":"银行","theme":"成长股","marketCap":2345,"pe":12.34,"pb":1.78,"roe":18.78,"revenue":456.78,"profit":156.78,"change":12.34,"dividend":3.45,"debt":82.34,"volume":2345600,"price":34.56},
        {"name":"江苏银行","code":"645.SH","industry":"银行","theme":"高股息","marketCap":1876,"pe":7.89,"pb":1.12,"roe":13.45,"revenue":389.67,"profit":123.45,"change":8.90,"dividend":5.12,"debt":85.67,"volume":1876500,"price":12.34},
        {"name":"科大讯飞","code":"651.SH","industry":"人工智能","theme":"成长股","marketCap":3456,"pe":156.78,"pb":8.76,"roe":5.45,"revenue":345.67,"profit":23.45,"change":45.67,"dividend":0.23,"debt":38.78,"volume":4567800,"price":78.90},
        {"name":"海康威视","code":"652.SZ","industry":"人工智能","theme":"价值股","marketCap":4567,"pe":24.56,"pb":3.45,"roe":18.34,"revenue":896.54,"profit":187.65,"change":-8.90,"dividend":4.56,"debt":22.34,"volume":3456700,"price":34.56},
        {"name":"中科曙光","code":"653.SH","industry":"人工智能","theme":"科技股","marketCap":1567,"pe":45.67,"pb":5.67,"roe":10.34,"revenue":234.56,"profit":23.45,"change":32.34,"dividend":0.56,"debt":35.67,"volume":1567800,"price":45.67},
        {"name":"浪潮信息","code":"654.SZ","industry":"人工智能","theme":"科技股","marketCap":1876,"pe":38.76,"pb":4.34,"roe":12.45,"revenue":567.89,"profit":45.67,"change":28.45,"dividend":0.34,"debt":42.34,"volume":1876500,"price":56.78},
        {"name":"寒武纪","code":"655.SH","industry":"人工智能","theme":"成长股","marketCap":1234,"pe":-234.56,"pb":12.34,"roe":-15.67,"revenue":34.56,"profit":-45.67,"change":56.78,"dividend":0,"debt":28.45,"volume":1234500,"price":89.67},
        {"name":"立讯精密","code":"661.SZ","industry":"消费电子","theme":"周期股","marketCap":2890,"pe":28.76,"pb":3.45,"roe":14.56,"revenue":896.54,"profit":67.89,"change":-12.34,"dividend":1.89,"debt":45.67,"volume":2890100,"price":28.76},
        {"name":"传音控股","code":"662.SH","industry":"消费电子","theme":"成长股","marketCap":1567,"pe":34.56,"pb":4.56,"roe":16.78,"revenue":567.89,"profit":89.67,"change":15.67,"dividend":2.34,"debt":28.78,"volume":1567800,"price":89.67},
        {"name":"歌尔股份","code":"663.SZ","industry":"消费电子","theme":"周期股","marketCap":1876,"pe":22.34,"pb":3.23,"roe":11.34,"revenue":678.90,"profit":45.67,"change":-18.78,"dividend":1.56,"debt":42.34,"volume":1876500,"price":35.67},
        {"name":"蓝思科技","code":"664.SZ","industry":"消费电子","theme":"周期股","marketCap":1234,"pe":18.76,"pb":2.34,"roe":10.45,"revenue":389.67,"profit":34.56,"change":-5.67,"dividend":1.23,"debt":52.34,"volume":1234500,"price":23.45},
        {"name":"领益智造","code":"665.SZ","industry":"消费电子","theme":"周期股","marketCap":1456,"pe":25.45,"pb":3.56,"roe":13.56,"revenue":456.78,"profit":56.78,"change":8.90,"dividend":1.78,"debt":48.56,"volume":1456700,"price":18.78},
        {"name":"万华化学","code":"671.SH","industry":"化工","theme":"周期股","marketCap":3234,"pe":15.45,"pb":2.34,"roe":22.34,"revenue":1567.89,"profit":234.56,"change":-22.34,"dividend":6.78,"debt":45.67,"volume":3234500,"price":78.90},
        {"name":"恒力石化","code":"672.SZ","industry":"化工","theme":"周期股","marketCap":2345,"pe":8.76,"pb":1.67,"roe":14.56,"revenue":1876.54,"profit":187.65,"change":-28.45,"dividend":5.67,"debt":68.78,"volume":2345600,"price":34.56},
        {"name":"荣盛石化","code":"673.SH","industry":"化工","theme":"周期股","marketCap":2134,"pe":7.89,"pb":1.45,"roe":15.67,"revenue":1678.90,"profit":156.78,"change":-32.34,"dividend":4.34,"debt":72.34,"volume":2134500,"price":25.67},
        {"name":"龙佰集团","code":"674.SH","industry":"化工","theme":"周期股","marketCap":1234,"pe":12.34,"pb":2.23,"roe":18.78,"revenue":289.67,"profit":56.78,"change":-15.67,"dividend":3.89,"debt":38.78,"volume":1234500,"price":28.76},
        {"name":"国瓷材料","code":"675.SH","industry":"化工","theme":"成长股","marketCap":890,"pe":35.45,"pb":5.67,"roe":16.34,"revenue":45.67,"profit":12.34,"change":5.67,"dividend":1.45,"debt":25.45,"volume":890100,"price":45.67}
      ]
    }
  }
})
