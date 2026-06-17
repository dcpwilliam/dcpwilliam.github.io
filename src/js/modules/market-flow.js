/**
 * Market Flow Module — D3.js force-directed graph for capital flow visualization
 * Fixed for D3v7 API
 */

const MarketFlowModule = (() => {
  let simulation = null;
  let currentData = null;

  function renderMetrics(metrics) {
    const container = document.getElementById('flowMetrics');
    if (!container) return;

    const netClass = metrics.netFlow >= 0 ? 'up' : 'down';
    const netSign = metrics.netFlow >= 0 ? '+' : '';
    const changeClass = metrics.netFlowChange >= 0 ? 'up' : 'down';
    const changeSign = metrics.netFlowChange >= 0 ? '+' : '';

    container.innerHTML = `
      <div class="metric-card">
        <div class="metric-label">总流入</div>
        <div class="metric-value">${metrics.totalInflow.toFixed(1)}<span style="font-size:14px;">亿</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">总流出</div>
        <div class="metric-value">${metrics.totalOutflow.toFixed(1)}<span style="font-size:14px;">亿</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">净流入</div>
        <div class="metric-value text-${netClass}">${netSign}${metrics.netFlow.toFixed(1)}<span style="font-size:14px;">亿</span></div>
        <div class="metric-change ${changeClass}">${changeSign}${metrics.netFlowChange}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">活跃板块</div>
        <div class="metric-value">${metrics.activeSectors}</div>
      </div>
    `;
  }

  function renderHotSectors(sectors) {
    const container = document.getElementById('hotSectors');
    if (!container) return;

    container.innerHTML = sectors.map(s => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-light);">
        <div>
          <span style="font-weight:500; font-size:13px;">${s.name}</span>
          <div style="font-size:11px; color:var(--text-tertiary); margin-top:2px;">${(s.stocks || []).slice(0, 2).join(' / ')}</div>
        </div>
        <span class="stock-tag ${s.change >= 0 ? 'up' : 'down'}">${s.change >= 0 ? '+' : ''}${s.change}%</span>
      </div>
    `).join('');
  }

  function renderAlerts(alerts) {
    const container = document.getElementById('alerts');
    if (!container) return;

    container.innerHTML = alerts.map(a => `
      <div style="display:flex; align-items:center; gap:8px; padding:6px 0; font-size:12px;">
        <span style="color:var(--text-tertiary); min-width:40px;">${a.time}</span>
        <span style="width:6px; height:6px; border-radius:50%; background:${a.type === 'up' ? 'var(--up)' : 'var(--down)'}; flex-shrink:0;"></span>
        <span>${a.text}</span>
      </div>
    `).join('');
  }

  function renderFlowChart(data) {
    const container = document.getElementById('flowChart');
    if (!container) return;
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = container.clientHeight || 460;

    const svgEl = d3.select('#flowChart')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const tooltip = document.getElementById('tooltip');

    const typeColors = { macro: '#f59e0b', sector: '#3b82f6' };

    // Build nodes with radius
    const nodes = data.nodes.map(d => ({
      ...d,
      radius: 20 + Math.min(30, Math.abs(d.value) / 30),
    }));

    // Build links
    const links = data.links.map(l => ({
      source: l.source,
      target: l.target,
      value: Math.abs(l.value),
      direction: l.value >= 0 ? 'in' : 'out'
    }));

    // Arrow markers
    const defs = svgEl.append('defs');
    ['in', 'out'].forEach(dir => {
      defs.append('marker')
        .attr('id', `arrow-${dir}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', dir === 'in' ? '#ef4444' : '#22c55e');
    });

    // Links layer
    const linkGroup = svgEl.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.direction === 'in' ? '#ef4444' : '#22c55e')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', d => Math.max(1, Math.min(8, d.value / 100)))
      .attr('marker-end', d => `url(#arrow-${d.direction})`);

    // Node group
    const nodeGroup = svgEl.append('g').attr('class', 'nodes');

    const node = nodeGroup.selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer');

    // Node circle
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        const c = typeColors[d.type] || '#64748b';
        return d.change >= 0 ? c : c; // simplified for D3v7 compatibility
      })
      .attr('fill-opacity', 0.15)
      .attr('stroke', d => typeColors[d.type] || '#64748b')
      .attr('stroke-width', 1.5);

    // Change indicator ring
    node.append('circle')
      .attr('r', d => d.radius - 3)
      .attr('fill', 'none')
      .attr('stroke', d => d.change >= 0 ? '#ef4444' : '#22c55e')
      .attr('stroke-width', d => Math.abs(d.change) > 3 ? 2 : 1)
      .attr('stroke-dasharray', d => d.change < 0 ? '3,3' : 'none')
      .attr('stroke-opacity', 0.5);

    // Name label
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('fill', '#1a1a2e')
      .style('pointer-events', 'none');

    // Value label
    node.append('text')
      .text(d => `${d.value >= 0 ? '+' : ''}${Math.round(d.value)}亿`)
      .attr('text-anchor', 'middle')
      .attr('dy', '1.3em')
      .style('font-size', '10px')
      .style('fill', d => d.change >= 0 ? '#ef4444' : '#22c55e')
      .style('pointer-events', 'none');

    // Tooltip
    node.on('mouseenter', function(event, d) {
      if (tooltip) {
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
          <div style="font-weight:600; margin-bottom:4px;">${d.name}</div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>资金:</span>
            <span style="color:${d.value >= 0 ? '#ef4444' : '#22c55e'};">${d.value >= 0 ? '+' : ''}${Math.round(d.value)}亿</span>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>涨跌:</span>
            <span style="color:${d.change >= 0 ? '#ef4444' : '#22c55e'};">${d.change >= 0 ? '+' : ''}${d.change}%</span>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <span>类型:</span><span>${d.type === 'macro' ? '宏观资金' : '行业板块'}</span>
          </div>
        `;
      }
    })
    .on('mousemove', function(event) {
      if (tooltip) {
        tooltip.style.left = (event.clientX + 12) + 'px';
        tooltip.style.top = (event.clientY - 12) + 'px';
      }
    })
    .on('mouseleave', function() {
      if (tooltip) tooltip.style.display = 'none';
    });

    // Drag
    node.call(d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
    );

    // Force simulation (D3v7)
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.radius + 10));

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    currentData = data;
  }

  return {
    async render() {
      const data = await MarketDataService.getMarketFlow();
      renderMetrics(data.metrics);
      renderFlowChart(data);

      const sectors = await MarketDataService.getHotSectors();
      renderHotSectors(sectors);

      const alerts = MarketDataService.getAlerts();
      renderAlerts(alerts);
    },

    destroy() {
      if (simulation) {
        simulation.stop();
        simulation = null;
      }
    }
  };
})();
