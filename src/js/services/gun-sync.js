/**
 * Gun.js Sync Service — Distributed P2P knowledge database
 * Every client is a node, CRDT-based conflict resolution
 */

const GunSyncService = (() => {
  let gun = null;
  let user = null;
  let peerCount = 0;
  let authUser = null;
  const nodeId = 'node_' + Math.random().toString(36).substr(2, 9);
  let onPeerUpdate = null;

  function init(relayUrl) {
    if (gun) return;

    const relay = relayUrl || localStorage.getItem('cp_relay') || 'https://gun-manhattan.herokuapp.com/gun';

    try {
      gun = Gun({
        peers: [relay],
        localStorage: true,
      });

      user = gun.user();
      console.log('[Gun] Initialized with relay:', relay);
      updatePeerStatus(1); // Self

      // Listen for peer connections
      gun.on('hi', () => {
        peerCount++;
        updatePeerStatus(peerCount);
      });

      gun.on('bye', () => {
        peerCount = Math.max(0, peerCount - 1);
        updatePeerStatus(peerCount);
      });

      // Generate pseudo peer count for demo
      simulatePeers();
    } catch (e) {
      console.warn('[Gun] Init failed, running in standalone mode:', e);
      updatePeerStatus(0);
    }
  }

  function simulatePeers() {
    // In real deployment, this would be actual peers
    // For MVP demo, simulate a few peers
    let count = 3;
    updatePeerStatus(count);
    setInterval(() => {
      count = Math.max(1, count + (Math.random() > 0.5 ? 1 : -1));
      if (count > 8) count = 7;
      updatePeerStatus(count);
    }, 15000);
  }

  function setUserProfile(oidcUser) {
    authUser = oidcUser;
    // Announce presence on Gun network
    if (gun) {
      const presenceRef = gun.get('ebi-investment').get('presence');
      presenceRef.get(nodeId).put({
        id: nodeId,
        displayName: oidcUser.nickname || oidcUser.name || oidcUser.email || '匿名',
        picture: oidcUser.picture || '',
        online: true,
        lastSeen: Date.now(),
      });
    }
  }

  function getAuthUser() {
    return authUser;
  }

  function updatePeerStatus(count) {
    peerCount = count;
    const dot = document.getElementById('p2pDot');
    const status = document.getElementById('p2pStatus');
    const settingCount = document.getElementById('settingPeerCount');

    if (dot) {
      dot.className = count > 0 ? 'p2p-dot connected' : 'p2p-dot disconnected';
    }
    if (status) {
      status.textContent = count > 0 ? `${count} peers connected` : 'No peers';
    }
    if (settingCount) {
      settingCount.textContent = count > 0 ? `${count} peers connected` : 'No peers';
    }
    if (onPeerUpdate) onPeerUpdate(count);
  }

  return {
    init,

    getNodeId() { return nodeId; },

    getGun() { return gun; },

    onPeerUpdate(cb) { onPeerUpdate = cb; },

    setUserProfile,
    getAuthUser,

    // ---- Chat ----
    sendChatMessage(room, message) {
      if (!gun) {
        console.warn('[Gun] Not initialized');
        return;
      }
      const author = authUser
        ? (authUser.nickname || authUser.name || authUser.email || 'Anonymous')
        : (message.author || 'Anonymous');
      const chatRef = gun.get('ebi-investment').get('chat').get(room);
      chatRef.set({
        id: nodeId + '_' + Date.now(),
        nodeId,
        text: message.text,
        author: author,
        timestamp: Date.now(),
        tags: message.tags || [],
        type: message.type || 'text',
      });
    },

    onChatMessage(room, callback) {
      if (!gun) return;
      const chatRef = gun.get('ebi-investment').get('chat').get(room);
      chatRef.map().on((msg, key) => {
        if (msg && msg.text && msg.timestamp) {
          callback(msg);
        }
      });
    },

    // ---- Knowledge Graph (distributed) ----
    shareKnowledge(entry) {
      if (!gun) return;
      const kgRef = gun.get('ebi-investment').get('knowledge');
      kgRef.get(entry.id || nodeId + '_' + Date.now()).put({
        type: entry.type, // 'factor', 'operation', 'stock_opinion'
        title: entry.title,
        content: entry.content,
        author: entry.author || nodeId,
        timestamp: Date.now(),
        tags: entry.tags || [],
        upvotes: 0,
      });
    },

    onKnowledgeUpdate(callback) {
      if (!gun) return;
      const kgRef = gun.get('ebi-investment').get('knowledge');
      kgRef.map().on((entry, key) => {
        if (entry && entry.type) callback(entry);
      });
    },

    // ---- Factor Sharing ----
    shareFactor(factor) {
      if (!gun) return;
      const fRef = gun.get('ebi-investment').get('factors');
      fRef.get(factor.id || Date.now().toString()).put({
        name: factor.name,
        score: factor.score,
        description: factor.description,
        author: nodeId,
        timestamp: Date.now(),
      });
    },

    // ---- Stock Operations Sharing ----
    shareOperation(op) {
      if (!gun) return;
      const opRef = gun.get('ebi-investment').get('operations');
      opRef.get(op.id || Date.now().toString()).put({
        stock: op.stock,
        action: op.action, // 'buy', 'sell', 'hold'
        price: op.price,
        reason: op.reason,
        author: nodeId,
        timestamp: Date.now(),
      });
    },

    // ---- Mock Chat Messages ----
    getMockChatMessages() {
      return [
        { id: '1', author: 'Trader_Xiao', text: '今天新能源板块资金流入明显，宁德时代可以考虑', tags: ['新能源', '宁德时代'], type: 'text', timestamp: Date.now() - 3600000 },
        { id: '2', author: 'FactorHunter', text: '刚发现一个有趣的因子：北向资金持股比例变化与未来5日收益相关性达到0.35', tags: ['因子发现', '北向资金'], type: 'factor', timestamp: Date.now() - 2400000 },
        { id: '3', author: 'ValueSeeker', text: '贵州茅台PE回到25倍附近，历史上这个位置胜率超过70%', tags: ['价值分析', '贵州茅台'], type: 'text', timestamp: Date.now() - 1200000 },
        { id: '4', author: 'QuantJia', text: '半导体的动量因子正在加速，可以关注中芯国际', tags: ['半导体', '动量'], type: 'text', timestamp: Date.now() - 600000 },
      ];
    }
  };
})();
