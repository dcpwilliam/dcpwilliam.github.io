/**
 * AI Experts Module — Multi-persona strategy discussion
 */

const AIExpertsModule = (() => {
  let isDiscussing = false;

  function renderExpertCards() {
    const container = document.getElementById('expertPanel');
    if (!container) return;

    const experts = AIService.getExperts();

    container.innerHTML = experts.map(expert => `
      <div class="expert-card" id="expert-${expert.id}">
        <div class="expert-header">
          <div class="expert-avatar" style="background:${expert.color}20; color:${expert.color};">
            ${expert.emoji}
          </div>
          <div>
            <div class="expert-name">${expert.name}</div>
            <div class="expert-role">${expert.role}</div>
          </div>
          <span class="expert-thinking" id="status-${expert.id}" style="margin-left:auto;"></span>
        </div>
        <div class="expert-response" id="response-${expert.id}">
          <span class="text-secondary text-sm">等待讨论启动...</span>
        </div>
      </div>
    `).join('');
  }

  async function startDiscussion(stockCode) {
    if (isDiscussing) return;
    isDiscussing = true;

    const thread = document.getElementById('discussionThread');
    const statusEl = document.getElementById('discussionStatus');
    if (statusEl) statusEl.textContent = '讨论进行中...';
    if (thread) {
      thread.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <div style="font-size:24px; animation:pulse 1s infinite;">🤖</div>
          <p class="text-secondary text-sm mt-2">AI 专家组正在分析 ${stockCode}...</p>
        </div>
      `;
    }

    // Clear previous responses
    const experts = AIService.getExperts();
    experts.forEach(e => {
      const resp = document.getElementById(`response-${e.id}`);
      const stat = document.getElementById(`status-${e.id}`);
      if (resp) resp.innerHTML = '<span class="text-secondary text-sm">思考中...</span>';
      if (stat) stat.textContent = '🤔 分析中';
    });

    const stockName = getStockName(stockCode);

    // Start streaming discussion
    try {
      const results = await AIService.discussStockStreaming(
        stockCode,
        stockName,
        (expertId, state, content) => {
          const resp = document.getElementById(`response-${expertId}`);
          const stat = document.getElementById(`status-${expertId}`);
          const card = document.getElementById(`expert-${expertId}`);

          if (state === 'thinking') {
            if (stat) stat.textContent = '🤔 分析中';
            if (resp) resp.innerHTML = '<span class="text-secondary text-sm">思考中...</span>';
          } else if (state === 'streaming') {
            if (stat) stat.textContent = '✍️ 生成中';
            if (resp) {
              resp.innerHTML = formatResponse(content);
            }
          } else if (state === 'done') {
            if (stat) stat.textContent = '✅ 完成';
            if (resp) resp.innerHTML = formatResponse(content);
          } else if (state === 'fallback') {
            if (stat) stat.textContent = '📋 模拟分析';
            if (resp) resp.innerHTML = formatResponse(content);
          }
        }
      );

      // Render cross-discussion
      renderCrossDiscussion(stockCode, stockName, results);
    } catch (e) {
      console.error('Discussion failed:', e);
    }

    isDiscussing = false;
    if (statusEl) statusEl.textContent = '讨论完成';
  }

  function renderCrossDiscussion(stockCode, stockName, results) {
    const thread = document.getElementById('discussionThread');
    if (!thread) return;

    const experts = AIService.getExperts();

    let html = '';

    // Individual expert responses
    results.forEach((r, i) => {
      const expert = experts.find(e => e.id === r.expertId);
      if (!expert) return;
      const content = r.response || r.fallback || '分析不可用';
      const isFallback = r.error && r.fallback;

      html += `
        <div style="display:flex; gap:12px; margin-bottom:16px;">
          <div class="chat-avatar" style="background:${expert.color}20; color:${expert.color}; width:36px; height:36px; min-width:36px; font-size:16px;">
            ${expert.emoji}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span style="font-weight:600; font-size:13px;">${expert.name}</span>
              <span style="font-size:10px; color:var(--text-tertiary);">${expert.role}</span>
              ${isFallback ? '<span style="font-size:10px; background:var(--warn-bg); color:var(--warn); padding:1px 6px; border-radius:8px;">模拟</span>' : ''}
            </div>
            <div style="font-size:13px; line-height:1.6; color:var(--text-primary);">${formatResponse(content)}</div>
          </div>
        </div>
      `;
    });

    // Separator
    html += `
      <div style="display:flex; align-items:center; gap:12px; margin:20px 0;">
        <div style="flex:1; height:1px; background:var(--border);"></div>
        <span style="font-size:12px; color:var(--accent); font-weight:500;">综合策略</span>
        <div style="flex:1; height:1px; background:var(--border);"></div>
      </div>
    `;

    // Cross-discussion summary (render placeholder, then load)
    html += `
      <div id="crossDiscussion" style="background:var(--accent-light); border-radius:var(--radius-lg); padding:16px;">
        <div style="font-weight:600; font-size:14px; margin-bottom:8px; color:var(--accent);">综合策略建议</div>
        <div id="crossDiscussionContent">
          <span class="text-secondary text-sm">综合分析生成中...</span>
        </div>
      </div>
    `;

    thread.innerHTML = html;

    // Load cross-discussion async
    AIService.crossDiscuss(stockCode, stockName, results).then(summary => {
      const el = document.getElementById('crossDiscussionContent');
      if (el) el.innerHTML = formatResponse(summary);
    });
  }

  function formatResponse(text) {
    if (!text) return '';
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:var(--bg-tertiary); padding:1px 4px; border-radius:3px; font-size:12px;">$1</code>')
      .replace(/\n/g, '<br/>')
      .replace(/⚠️/g, '<span style="color:var(--warn);">⚠️</span>');
  }

  function getStockName(code) {
    const names = {
      '600519': '贵州茅台', '000858': '五粮液', '300750': '宁德时代',
      '00700': '腾讯控股', '09988': '阿里巴巴',
      'NVDA': 'NVIDIA', 'AAPL': 'Apple', 'MSFT': 'Microsoft',
    };
    return names[code] || code;
  }

  return {
    render() {
      renderExpertCards();
    },

    startDiscussion,

    isDiscussing() { return isDiscussing; }
  };
})();
