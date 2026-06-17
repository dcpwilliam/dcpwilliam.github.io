/**
 * AI Service — Multi-persona AI expert engine
 * Supports: OpenAI-compatible API + Ollama local LLM
 */

const AIService = (() => {
  const API_BASE = window.CP_CONFIG?.apiBase || 'http://localhost:8000';
  let config = {
    apiUrl: localStorage.getItem('cp_api_url') || 'http://localhost:11434/v1',
    model: localStorage.getItem('cp_model') || 'qwen2.5:7b',
    apiKey: localStorage.getItem('cp_api_key') || '',
  };

  const EXPERTS = [
    {
      id: 'value_investor',
      name: '价值分析师',
      role: 'Value Investor',
      emoji: '📈',
      color: '#3b82f6',
      systemPrompt: `你是一位资深价值投资分析师，擅长基本面分析、财务报表解读和估值模型。
你的分析风格：
- 关注企业内在价值、护城河、ROE、自由现金流
- 偏好长期持有优质标的
- 对高估值保持警惕
- 使用 DCF、PE/PB 对比等估值方法
回答要简洁专业，给出明确的投资判断。`
    },
    {
      id: 'quant_trader',
      name: '量化策略师',
      role: 'Quant Trader',
      emoji: '🧮',
      color: '#8b5cf6',
      systemPrompt: `你是一位量化交易策略师，擅长因子挖掘、统计套利和风险模型。
你的分析风格：
- 关注技术因子、量价关系、波动率、相关性
- 善于发现统计规律和异常信号
- 重视仓位管理和风控
- 使用多因子模型和回测框架
回答要数据驱动，给出可量化的信号。`
    },
    {
      id: 'macro_strategist',
      name: '宏观策略师',
      role: 'Macro Strategist',
      emoji: '🌍',
      color: '#f59e0b',
      systemPrompt: `你是一位宏观策略分析师，擅长货币政策、行业周期和资金面分析。
你的分析风格：
- 关注央行政策、利率走势、M2/社融数据
- 善于判断行业轮动和风格切换
- 重视资金流向和市场情绪
- 从宏观视角把握大趋势
回答要有宏观视野，给出趋势性判断。`
    }
  ];

  async function callLLM(messages, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    try {
      const resp = await fetch(`${config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: options.model || config.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 500,
          stream: false,
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`LLM API error: ${resp.status} - ${err}`);
      }

      const data = await resp.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (e) {
      console.error('AI call failed:', e);
      throw e;
    }
  }

  async function callLLMStreaming(messages, onChunk, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    try {
      const resp = await fetch(`${config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: options.model || config.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 500,
          stream: true,
        }),
      });

      if (!resp.ok) throw new Error(`LLM API error: ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            full += token;
            onChunk(token, full);
          } catch {}
        }
      }
      return full;
    } catch (e) {
      console.error('Streaming AI call failed:', e);
      throw e;
    }
  }

  return {
    getExperts() { return EXPERTS; },

    getConfig() { return { ...config }; },

    updateConfig(newConfig) {
      config = { ...config, ...newConfig };
      localStorage.setItem('cp_api_url', config.apiUrl);
      localStorage.setItem('cp_model', config.model);
      localStorage.setItem('cp_api_key', config.apiKey);
    },

    async discussStock(stockCode, stockName) {
      const userMsg = `请分析股票 ${stockCode}（${stockName || stockCode}）的投资机会和风险，给出你的策略建议。`;

      const results = [];
      for (const expert of EXPERTS) {
        try {
          const response = await callLLM([
            { role: 'system', content: expert.systemPrompt },
            { role: 'user', content: userMsg }
          ]);
          results.push({ expertId: expert.id, response, error: null });
        } catch (e) {
          results.push({
            expertId: expert.id,
            response: null,
            error: e.message,
            fallback: getMockResponse(expert.id, stockCode, stockName)
          });
        }
      }
      return results;
    },

    async discussStockStreaming(stockCode, stockName, onExpertUpdate) {
      const userMsg = `请分析股票 ${stockCode}（${stockName || stockCode}）的投资机会和风险，给出你的策略建议。约200字。`;

      const results = [];
      for (const expert of EXPERTS) {
        const expertResult = { expertId: expert.id, response: '', error: null };
        results.push(expertResult);

        try {
          onExpertUpdate(expert.id, 'thinking');
          await callLLMStreaming(
            [
              { role: 'system', content: expert.systemPrompt },
              { role: 'user', content: userMsg }
            ],
            (token, full) => {
              expertResult.response = full;
              onExpertUpdate(expert.id, 'streaming', full);
            }
          );
          onExpertUpdate(expert.id, 'done', expertResult.response);
        } catch (e) {
          expertResult.error = e.message;
          expertResult.fallback = getMockResponse(expert.id, stockCode, stockName);
          expertResult.response = expertResult.fallback;
          onExpertUpdate(expert.id, 'fallback', expertResult.fallback);
        }
      }
      return results;
    },

    async crossDiscuss(stockCode, stockName, previousResponses) {
      const summary = previousResponses.map(r =>
        `[${r.expertId}]: ${r.response || r.fallback}`
      ).join('\n\n');

      const userMsg = `基于以上三位专家的分析，请针对 ${stockCode}（${stockName || stockCode}）给出一个综合策略建议，包括：
1. 入场时机和价位
2. 仓位建议
3. 止损止盈点
4. 需要关注的关键信号`;

      try {
        return await callLLM([
          { role: 'system', content: '你是一位综合投资顾问，需要综合以上多位专家的观点，给出具体可执行的策略。' },
          { role: 'user', content: summary + '\n\n---\n\n' + userMsg }
        ]);
      } catch (e) {
        return getMockCrossResponse(stockCode);
      }
    }
  };

  function getMockResponse(expertId, code, name) {
    const stockLabel = name ? `${code}(${name})` : code;
    const responses = {
      value_investor: `${stockLabel} 当前估值处于合理区间。从基本面看，公司ROE保持在15%以上，自由现金流稳定增长。建议在PE低于25倍时分批建仓，长期持有。关注下季度财报中的营收增速是否维持。`,
      quant_trader: `${stockLabel} 量价信号显示短期动能增强。20日均线刚上穿60日均线形成金叉，MACD红柱放大。波动率收缩后面临方向选择，建议突破前高后追多，止损设在20日均线下方2%。`,
      macro_strategist: `${stockLabel} 受益于当前宽松货币环境。北向资金持续流入该板块，行业景气度处于上行周期。但需关注本周美联储议息会议可能带来的短期扰动。中期趋势仍然看多。`
    };
    return responses[expertId] || '分析暂时不可用，请检查 AI 模型配置。';
  }

  function getMockCrossResponse(code) {
    return `综合策略（${code}）：
1. 入场时机：建议在回调至20日均线附近时分批买入
2. 仓位建议：总仓位控制在30%，分3次建仓
3. 止损：跌破60日均线或亏损8%止损
4. 止盈：第一目标+15%减半仓，第二目标+30%再减
5. 关键信号：关注北向资金流向变化、季度财报业绩、行业政策动向

⚠️ 以上为AI分析参考，不构成投资建议`;
  }
})();
