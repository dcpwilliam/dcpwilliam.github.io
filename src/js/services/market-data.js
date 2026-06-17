/**
 * Market Data Service — Market data API client with mock fallback
 * Supports: A股, 港股, 美股 via Yahoo Finance / Finnhub
 */

const MarketDataService = (() => {
  const API_BASE = window.CP_CONFIG?.apiBase || 'http://localhost:8000';
  let currentMarket = 'cn';
  let useMock = true; // Start with mock data for MVP

  // ---- Mock Data ----
  const mockMarketFlow = {
    cn: {
      metrics: {
        totalInflow: 2847.6,
        totalOutflow: 2153.2,
        netFlow: 694.4,
        activeSectors: 23,
        netFlowChange: 12.3
      },
      nodes: [
        { id: 'north', name: '北向资金', type: 'macro', value: 1280, change: 3.2 },
        { id: 'south', name: '南向资金', type: 'macro', value: -520, change: -1.8 },
        { id: 'tech', name: '科技', type: 'sector', value: 456, change: 2.1 },
        { id: 'finance', name: '金融', type: 'sector', value: 312, change: -0.5 },
        { id: 'consumer', name: '消费', type: 'sector', value: 289, change: 1.7 },
        { id: 'medicine', name: '医药', type: 'sector', value: -178, change: -2.3 },
        { id: 'energy', name: '能源', type: 'sector', value: 245, change: 4.1 },
        { id: 'realestate', name: '地产', type: 'sector', value: -89, change: -3.2 },
        { id: 'military', name: '军工', type: 'sector', value: 167, change: 1.5 },
        { id: 'newenergy', name: '新能源', type: 'sector', value: 398, change: 5.2 },
        { id: 'semiconductor', name: '半导体', type: 'sector', value: 234, change: 2.8 },
        { id: 'auto', name: '汽车', type: 'sector', value: 156, change: 1.2 },
      ],
      links: [
        { source: 'north', target: 'tech', value: 380 },
        { source: 'north', target: 'consumer', value: 245 },
        { source: 'north', target: 'newenergy', value: 320 },
        { source: 'north', target: 'finance', value: 180 },
        { source: 'tech', target: 'semiconductor', value: 190 },
        { source: 'energy', target: 'newenergy', value: 165 },
        { source: 'finance', target: 'realestate', value: -120 },
        { source: 'south', target: 'medicine', value: -145 },
        { source: 'consumer', target: 'auto', value: 98 },
        { source: 'military', target: 'semiconductor', value: 87 },
        { source: 'newenergy', target: 'auto', value: 142 },
      ]
    },
    hk: {
      metrics: {
        totalInflow: 1856.3,
        totalOutflow: 1647.8,
        netFlow: 208.5,
        activeSectors: 18,
        netFlowChange: 5.7
      },
      nodes: [
        { id: 'southhk', name: '南向资金', type: 'macro', value: 520, change: 1.8 },
        { id: 'intl', name: '国际资金', type: 'macro', value: -312, change: -0.9 },
        { id: 'techhk', name: '科技', type: 'sector', value: 234, change: 2.4 },
        { id: 'financehk', name: '金融', type: 'sector', value: 178, change: 0.7 },
        { id: 'property', name: '地产', type: 'sector', value: -245, change: -4.1 },
        { id: 'consume', name: '消费', type: 'sector', value: 156, change: 1.2 },
        { id: 'biotech', name: '生物科技', type: 'sector', value: 189, change: 3.1 },
        { id: 'ev', name: '新能车', type: 'sector', value: 267, change: 4.5 },
      ],
      links: [
        { source: 'southhk', target: 'techhk', value: 210 },
        { source: 'southhk', target: 'ev', value: 180 },
        { source: 'intl', target: 'financehk', value: 95 },
        { source: 'intl', target: 'property', value: -190 },
        { source: 'techhk', target: 'biotech', value: 120 },
        { source: 'consume', target: 'ev', value: 87 },
      ]
    },
    us: {
      metrics: {
        totalInflow: 5423.1,
        totalOutflow: 4891.7,
        netFlow: 531.4,
        activeSectors: 24,
        netFlowChange: 8.9
      },
      nodes: [
        { id: 'fed', name: '美联储', type: 'macro', value: 890, change: 0.3 },
        { id: 'aius', name: 'AI/科技', type: 'sector', value: 1240, change: 4.7 },
        { id: 'finus', name: '金融', type: 'sector', value: 345, change: 1.2 },
        { id: 'energyus', name: '能源', type: 'sector', value: -267, change: -2.1 },
        { id: 'healthus', name: '医疗', type: 'sector', value: 189, change: 0.8 },
        { id: 'consus', name: '消费', type: 'sector', value: 234, change: 1.5 },
        { id: 'reitus', name: 'REITs', type: 'sector', value: -156, change: -3.4 },
        { id: 'semius', name: '半导体', type: 'sector', value: 678, change: 5.8 },
        { id: 'crypto', name: '加密', type: 'sector', value: 423, change: 7.2 },
      ],
      links: [
        { source: 'fed', target: 'finus', value: 310 },
        { source: 'fed', target: 'reitus', value: -120 },
        { source: 'aius', target: 'semius', value: 520 },
        { source: 'aius', target: 'crypto', value: 280 },
        { source: 'energyus', target: 'consus', value: -95 },
        { source: 'healthus', target: 'biotech', value: 120 },
        { source: 'semius', target: 'crypto', value: 143 },
      ]
    }
  };

  const mockHotSectors = {
    cn: [
      { name: '新能源', change: 5.2, stocks: ['宁德时代', '比亚迪', '隆基绿能'] },
      { name: '半导体', change: 2.8, stocks: ['中芯国际', '北方华创', '韦尔股份'] },
      { name: '汽车', change: 1.2, stocks: ['比亚迪', '理想汽车', '赛力斯'] },
      { name: '军工', change: 1.5, stocks: ['中航沈飞', '航发动力', '中简科技'] },
    ],
    hk: [
      { name: '新能车', change: 4.5, stocks: ['理想汽车', '蔚来', '小鹏'] },
      { name: '生物科技', change: 3.1, stocks: ['百济神州', '信达生物', '康方生物'] },
      { name: '科技', change: 2.4, stocks: ['腾讯', '美团', '快手'] },
    ],
    us: [
      { name: 'AI/科技', change: 4.7, stocks: ['NVDA', 'MSFT', 'GOOG'] },
      { name: '加密', change: 7.2, stocks: ['COIN', 'MSTR', 'RIOT'] },
      { name: '半导体', change: 5.8, stocks: ['NVDA', 'AMD', 'AVGO'] },
    ]
  };

  const mockAlerts = [
    { time: '14:32', text: '北向资金大幅流入新能源板块', type: 'up' },
    { time: '14:15', text: '地产板块持续流出，注意风险', type: 'down' },
    { time: '13:48', text: '半导体板块异动拉升', type: 'up' },
    { time: '11:20', text: '医药板块资金加速撤离', type: 'down' },
  ];

  const mockStockSearch = [
    { code: '600519', name: '贵州茅台', market: 'cn', price: 1689.00, change: 1.23 },
    { code: '000858', name: '五粮液', market: 'cn', price: 156.80, change: -0.45 },
    { code: '300750', name: '宁德时代', market: 'cn', price: 198.50, change: 3.21 },
    { code: '00700', name: '腾讯控股', market: 'hk', price: 378.40, change: 2.15 },
    { code: '09988', name: '阿里巴巴', market: 'hk', price: 78.90, change: -1.32 },
    { code: 'NVDA', name: 'NVIDIA', market: 'us', price: 875.30, change: 4.56 },
    { code: 'AAPL', name: 'Apple', market: 'us', price: 189.20, change: 0.78 },
  ];

  // ---- Public API ----
  return {
    setMarket(market) {
      currentMarket = market;
    },

    getMarket() {
      return currentMarket;
    },

    async getMarketFlow() {
      if (useMock) {
        return mockMarketFlow[currentMarket];
      }
      try {
        const resp = await fetch(`${API_BASE}/api/market/flow?market=${currentMarket}`);
        if (!resp.ok) throw new Error('API error');
        return await resp.json();
      } catch (e) {
        console.warn('API unavailable, using mock data:', e);
        return mockMarketFlow[currentMarket];
      }
    },

    async getHotSectors() {
      if (useMock) return mockHotSectors[currentMarket];
      try {
        const resp = await fetch(`${API_BASE}/api/market/hot-sectors?market=${currentMarket}`);
        if (!resp.ok) throw new Error('API error');
        return await resp.json();
      } catch {
        return mockHotSectors[currentMarket];
      }
    },

    getAlerts() {
      return mockAlerts;
    },

    async searchStock(query) {
      if (!query) return [];
      const q = query.toLowerCase();
      return mockStockSearch.filter(s =>
        s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    },

    async getStockDetail(code) {
      const stock = mockStockSearch.find(s => s.code === code);
      if (stock) return stock;
      return { code, name: code, market: currentMarket, price: 0, change: 0 };
    }
  };
})();
