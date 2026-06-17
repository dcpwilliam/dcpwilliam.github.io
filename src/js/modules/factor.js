/**
 * Factor Discovery Module — Multi-factor analysis and investment opportunity scoring
 * Uses ECharts for visualization
 */

const FactorDiscoveryModule = (() => {
  let chartInstance = null;
  let currentView = 'scatter';

  const mockFactors = [
    { id: 1, name: '动量因子', score: 82, category: '技术', description: '20日动量信号', stocks: ['宁德时代', '比亚迪'], change: 5.2 },
    { id: 2, name: '北向资金因子', score: 78, category: '资金', description: '北向持股变化率', stocks: ['贵州茅台', '中国平安'], change: 3.1 },
    { id: 3, name: 'ROE因子', score: 71, category: '基本面', description: '近4季度ROE趋势', stocks: ['海天味业', '片仔癀'], change: 1.4 },
    { id: 4, name: '波动率因子', score: 65, category: '风险', description: '20日波动率分位', stocks: ['中芯国际'], change: -2.3 },
    { id: 5, name: '估值因子', score: 58, category: '基本面', description: 'PE/PB分位数', stocks: ['招商银行', '兴业银行'], change: -0.8 },
    { id: 6, name: '成交量因子', score: 74, category: '技术', description: '量价背离度', stocks: ['隆基绿能', '通威股份'], change: 4.1 },
    { id: 7, name: '产业链因子', score: 69, category: '产业', description: '上下游景气传导', stocks: ['北方华创', '中微公司'], change: 2.7 },
    { id: 8, name: '机构持仓因子', score: 76, category: '资金', description: '基金重仓变化', stocks: ['药明康德', '迈瑞医疗'], change: 1.9 },
    { id: 9, name: '情绪因子', score: 62, category: '情绪', description: '市场情绪综合指标', stocks: ['全市场'], change: -1.2 },
    { id: 10, name: '盈利预测因子', score: 73, category: '基本面', description: '分析师盈利修正', stocks: ['贵州茅台', '泸州老窖'], change: 3.5 },
  ];

  function renderMetrics() {
    const container = document.getElementById('factorMetrics');
    if (!container) return;

    const highScore = mockFactors.filter(f => f.score >= 70).length;
    const avgScore = Math.round(mockFactors.reduce((s, f) => s + f.score, 0) / mockFactors.length);
    const topFactor = mockFactors.sort((a, b) => b.score - a.score)[0];

    container.innerHTML = `
      <div class="metric-card">
        <div class="metric-label">活跃因子</div>
        <div class="metric-value">${mockFactors.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">高信号因子</div>
        <div class="metric-value text-up">${highScore}</div>
        <div class="metric-change up">score >= 70</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">平均评分</div>
        <div class="metric-value">${avgScore}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">最强因子</div>
        <div class="metric-value" style="font-size:18px;">${topFactor.name}</div>
        <div class="metric-change up">+${topFactor.change}%</div>
      </div>
    `;
  }

  function renderScatterChart() {
    const container = document.getElementById('factorChart');
    if (!container) return;
    if (chartInstance) chartInstance.dispose();

    chartInstance = echarts.init(container);

    const categoryColors = {
      '技术': '#3b82f6',
      '资金': '#f59e0b',
      '基本面': '#22c55e',
      '风险': '#ef4444',
      '产业': '#8b5cf6',
      '情绪': '#ec4899',
    };

    const scatterData = {};
    mockFactors.forEach(f => {
      if (!scatterData[f.category]) scatterData[f.category] = [];
      scatterData[f.category].push([f.score, f.change, f.name, f.stocks.join(', ')]);
    });

    const series = Object.entries(scatterData).map(([cat, data]) => ({
      name: cat,
      type: 'scatter',
      data: data,
      symbolSize: val => Math.max(20, val[0] / 3),
      itemStyle: { color: categoryColors[cat] || '#64748b' },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' }
      },
    }));

    chartInstance.setOption({
      tooltip: {
        trigger: 'item',
        formatter: p => {
          const d = p.data;
          return `<strong>${d[2]}</strong><br/>评分: ${d[0]}<br/>变化: ${d[1] >= 0 ? '+' : ''}${d[1]}%<br/>关联: ${d[3]}`;
        }
      },
      legend: {
        data: Object.keys(scatterData),
        bottom: 0,
        textStyle: { fontSize: 11 },
      },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: {
        name: '因子评分',
        nameLocation: 'center',
        nameGap: 30,
        min: 40,
        max: 100,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        name: '变化率(%)',
        nameLocation: 'center',
        nameGap: 40,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      series,
    });
  }

  function renderRadarChart() {
    const container = document.getElementById('factorChart');
    if (!container) return;
    if (chartInstance) chartInstance.dispose();

    chartInstance = echarts.init(container);

    const top5 = [...mockFactors].sort((a, b) => b.score - a.score).slice(0, 5);

    chartInstance.setOption({
      tooltip: {},
      legend: {
        data: top5.map(f => f.name),
        bottom: 0,
        textStyle: { fontSize: 11 },
      },
      radar: {
        indicator: top5.map(f => ({ name: f.name, max: 100 })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e2e8f0' } },
        splitArea: { areaStyle: { color: ['transparent'] } },
      },
      series: [{
        type: 'radar',
        data: [
          {
            value: top5.map(f => f.score),
            name: '当前评分',
            areaStyle: { opacity: 0.15 },
            lineStyle: { width: 2 },
            itemStyle: { color: '#3b82f6' },
          },
          {
            value: top5.map(f => f.score - Math.random() * 15),
            name: '上周评分',
            areaStyle: { opacity: 0.08 },
            lineStyle: { width: 1, type: 'dashed' },
            itemStyle: { color: '#94a3b8' },
          }
        ]
      }]
    });
  }

  function renderFactorRanking() {
    const container = document.getElementById('factorRanking');
    if (!container) return;

    const sorted = [...mockFactors].sort((a, b) => b.score - a.score);

    container.innerHTML = sorted.map((f, i) => {
      const barClass = f.score >= 75 ? 'high' : f.score >= 60 ? 'mid' : 'low';
      return `
        <div style="display:flex; align-items:center; gap:10px; padding:10px 0; ${i < sorted.length - 1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
          <span style="width:20px; font-size:12px; font-weight:600; color:${i < 3 ? 'var(--accent)' : 'var(--text-tertiary)'};">${i + 1}</span>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:13px; font-weight:500;">${f.name}</span>
              <span style="font-size:10px; color:var(--text-tertiary); background:var(--bg-tertiary); padding:1px 6px; border-radius:8px;">${f.category}</span>
            </div>
            <div class="factor-score mt-2">
              <div class="score-bar">
                <div class="score-fill ${barClass}" style="width:${f.score}%;"></div>
              </div>
              <span style="font-size:12px; font-weight:500; color:${f.change >= 0 ? 'var(--up)' : 'var(--down)'};">${f.score}</span>
            </div>
          </div>
          <span style="font-size:12px; color:${f.change >= 0 ? 'var(--up)' : 'var(--down)'};">${f.change >= 0 ? '+' : ''}${f.change}%</span>
        </div>
      `;
    }).join('');
  }

  return {
    render() {
      renderMetrics();
      if (currentView === 'scatter') {
        renderScatterChart();
      } else {
        renderRadarChart();
      }
      renderFactorRanking();
    },

    setView(view) {
      currentView = view;
      if (view === 'scatter') renderScatterChart();
      else renderRadarChart();
    },

    refresh() {
      // Simulate factor score changes
      mockFactors.forEach(f => {
        f.score = Math.min(99, Math.max(40, f.score + Math.round((Math.random() - 0.45) * 6)));
        f.change = Math.round((Math.random() - 0.3) * 8 * 10) / 10;
      });
      this.render();
    },

    resize() {
      if (chartInstance) chartInstance.resize();
    }
  };
})();
