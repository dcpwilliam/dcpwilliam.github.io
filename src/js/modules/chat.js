/**
 * Community Chat Module — P2P distributed chat via Gun.js
 */

const CommunityChatModule = (() => {
  let messages = [];
  const currentUser = 'User_' + Math.random().toString(36).substr(2, 4);

  const mockUsers = [
    { name: 'Trader_Xiao', color: '#3b82f6' },
    { name: 'FactorHunter', color: '#8b5cf6' },
    { name: 'ValueSeeker', color: '#f59e0b' },
    { name: 'QuantJia', color: '#22c55e' },
    { name: 'MacroChen', color: '#ef4444' },
  ];

  function renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    // Load initial mock messages
    if (messages.length === 0) {
      messages = GunSyncService.getMockChatMessages();
    }

    container.innerHTML = messages.map(msg => {
      const isSelf = msg.author === currentUser;
      const user = mockUsers.find(u => u.name === msg.author) || { color: '#64748b' };

      let tagsHtml = '';
      if (msg.tags && msg.tags.length > 0) {
        tagsHtml = `<div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
          ${msg.tags.map(t => `<span class="stock-tag" style="font-size:10px; padding:1px 6px;">#${t}</span>`).join('')}
        </div>`;
      }

      return `
        <div class="chat-msg ${isSelf ? 'self' : ''}">
          <div class="chat-avatar" style="background:${user.color}20; color:${user.color};">
            ${msg.author.charAt(0)}
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-tertiary); margin-bottom:3px;">
              ${msg.author}
              <span style="margin-left:6px;">${formatTime(msg.timestamp)}</span>
            </div>
            <div class="chat-bubble">
              ${msg.text}
              ${tagsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function sendMessage(text) {
    if (!text.trim()) return;

    // Extract tags
    const tags = [];
    const tagRegex = /#(\S+)/g;
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }

    // Extract stock codes
    const stockRegex = /@(\S+)/g;
    while ((match = stockRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }

    const msg = {
      id: Date.now().toString(),
      author: currentUser,
      text: text.replace(/[#@]\S+\s?/g, '').trim() || text,
      tags,
      type: 'text',
      timestamp: Date.now(),
    };

    messages.push(msg);

    // Send to Gun.js P2P network
    GunSyncService.sendChatMessage('general', msg);

    renderMessages();

    // Simulate reply after delay
    simulateReply(text);
  }

  function simulateReply(originalText) {
    const delay = 2000 + Math.random() * 5000;
    setTimeout(() => {
      const responder = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const replies = [
        '同意这个判断，我在关注类似的信号。',
        '这个角度很有意思，能展开说说吗？',
        '我也有类似的观察，不过还需要更多数据验证。',
        '补充一点：最近北向资金的流入也在支持这个观点。',
        '我持相反看法，这个位置的风险收益比不太好。',
        '可以试试用量化因子来验证这个逻辑。',
        '刚回测了一下，这个策略在历史上胜率约62%。',
      ];

      const reply = {
        id: Date.now().toString(),
        author: responder.name,
        text: replies[Math.floor(Math.random() * replies.length)],
        tags: [],
        type: 'text',
        timestamp: Date.now(),
      };

      messages.push(reply);
      renderMessages();
    }, delay);
  }

  return {
    render() {
      renderMessages();

      // Listen for P2P messages
      GunSyncService.onChatMessage('general', (msg) => {
        // Deduplicate
        if (!messages.find(m => m.id === msg.id)) {
          messages.push(msg);
          renderMessages();
        }
      });
    },

    sendMessage,

    getCurrentUser() { return currentUser; }
  };
})();
