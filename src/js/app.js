/**
 * EBI 循证投资 — Main Application Shell
 * Router, initialization, event binding
 */

window.CP_CONFIG = {
  apiBase: 'http://localhost:8000',
};

const App = (() => {
  let currentModule = 'market-flow';

  function init() {
    // Initialize Auth (must be first — handles OIDC callback)
    AuthService.init();

    // Initialize P2P
    GunSyncService.init();

    // Set node ID in settings
    const nodeIdInput = document.getElementById('settingNodeId');
    if (nodeIdInput) nodeIdInput.value = GunSyncService.getNodeId();

    // Bind navigation
    document.querySelectorAll('.nav-item[data-module]').forEach(item => {
      item.addEventListener('click', () => {
        const module = item.dataset.module;
        navigateTo(module);
      });
    });

    // Bind market selector
    document.querySelectorAll('.market-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.market-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const market = btn.dataset.market;
        MarketDataService.setMarket(market);
        if (currentModule === 'market-flow') {
          MarketFlowModule.destroy();
          MarketFlowModule.render();
        }
      });
    });

    // Bind search
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query) {
            navigateTo('ai-experts');
            const stockInput = document.getElementById('expertStockInput');
            if (stockInput) {
              stockInput.value = query;
              AIExpertsModule.startDiscussion(query);
            }
          }
        }
      });
    }

    // Factor module events
    document.querySelectorAll('[data-factor-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-factor-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        FactorDiscoveryModule.setView(btn.dataset.factorView);
      });
    });

    const btnRefresh = document.getElementById('btnRefreshFactor');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => FactorDiscoveryModule.refresh());
    }

    const btnScan = document.getElementById('btnScan');
    if (btnScan) {
      btnScan.addEventListener('click', () => {
        btnScan.textContent = '扫描中...';
        btnScan.disabled = true;
        setTimeout(() => {
          FactorDiscoveryModule.refresh();
          btnScan.textContent = '🔍 全市场扫描';
          btnScan.disabled = false;
        }, 1500);
      });
    }

    // AI Expert events
    const btnStart = document.getElementById('btnStartDiscussion');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const stockInput = document.getElementById('expertStockInput');
        if (stockInput && stockInput.value.trim()) {
          AIExpertsModule.startDiscussion(stockInput.value.trim());
        }
      });
    }

    // Chat events
    const chatInput = document.getElementById('chatInput');
    const btnSend = document.getElementById('btnSendChat');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          CommunityChatModule.sendMessage(chatInput.value);
          chatInput.value = '';
        }
      });
    }
    if (btnSend) {
      btnSend.addEventListener('click', () => {
        if (chatInput) {
          CommunityChatModule.sendMessage(chatInput.value);
          chatInput.value = '';
        }
      });
    }

    // Settings events
    const btnSave = document.getElementById('btnSaveSettings');
    if (btnSave) {
      btnSave.addEventListener('click', saveSettings);
    }

    // Auth login in settings page
    const btnAuthLogin = document.getElementById('btnAuthLogin');
    if (btnAuthLogin) {
      btnAuthLogin.addEventListener('click', () => {
        const clientIdInput = document.getElementById('settingAuthClientId');
        if (clientIdInput && clientIdInput.value.trim()) {
          AuthService.setClientId(clientIdInput.value.trim());
        }
        AuthService.login();
      });
    }

    // Restore Authing client ID in settings
    const savedClientId = AuthService.getClientId();
    const clientIdInput = document.getElementById('settingAuthClientId');
    if (clientIdInput && savedClientId) {
      clientIdInput.value = savedClientId;
    }

    // Window resize
    window.addEventListener('resize', () => {
      if (currentModule === 'factor-discovery') {
        FactorDiscoveryModule.resize();
      }
      if (currentModule === 'market-flow') {
        MarketFlowModule.destroy();
        MarketFlowModule.render();
      }
    });

    // Flow chart tab
    document.querySelectorAll('[data-flow]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-flow]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const flowType = btn.dataset.flow;
        if (flowType === 'network') {
          MarketFlowModule.render();
        } else {
          const container = document.getElementById('flowChart');
          if (container) {
            container.innerHTML = `
              <div class="empty-state" style="height:100%;">
                <div class="empty-icon">${flowType === 'sankey' ? '🌊' : '📈'}</div>
                <p>${flowType === 'sankey' ? '桑基图视图' : '时间线视图'}开发中</p>
                <p class="text-sm text-secondary">MVP 版本暂仅支持网络图</p>
              </div>
            `;
          }
        }
      });
    });

    // ---- Auth Events ----
    bindAuthEvents();

    // ---- Online Users Events ----
    bindOnlineUsersEvents();

    // Render initial module
    navigateTo('market-flow');
  }

  // ====== Auth Events ======
  function bindAuthEvents() {
    // Login button
    const loginBtn = document.getElementById('authLoginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => AuthService.login());
    }

    // User menu dropdown
    const menuTrigger = document.getElementById('authMenuTrigger');
    const dropdown = document.getElementById('authDropdown');
    if (menuTrigger && dropdown) {
      menuTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        // Update dropdown header with user info
        const user = AuthService.getUser();
        if (user) {
          const nameEl = dropdown.querySelector('.auth-dropdown-name');
          const emailEl = dropdown.querySelector('.auth-dropdown-email');
          if (nameEl) nameEl.textContent = user.nickname || user.name || '用户';
          if (emailEl) emailEl.textContent = user.email || '';
        }
      });

      // Close dropdown on click outside
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== menuTrigger) {
          dropdown.classList.remove('show');
        }
      });
    }

    // Logout
    const logoutBtn = document.getElementById('authLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const dropdown = document.getElementById('authDropdown');
        if (dropdown) dropdown.classList.remove('show');
        AuthService.logout();
      });
    }

    // Auth state change callback
    AuthService.onAuthChange((user, token) => {
      if (user) {
        console.log('[App] User logged in:', user.nickname || user.name || user.email);
        // Update Gun.js with auth user info
        if (GunSyncService.setUserProfile) {
          GunSyncService.setUserProfile(user);
        }
      }
      // Update settings page auth status
      const authDot = document.getElementById('authStatusDot');
      const authText = document.getElementById('authStatusText');
      const authBtn = document.getElementById('btnAuthLogin');
      if (user) {
        if (authDot) authDot.className = 'p2p-dot connected';
        if (authText) authText.textContent = `已登录: ${user.nickname || user.name || user.email}`;
        if (authBtn) { authBtn.textContent = '退出登录'; authBtn.onclick = () => AuthService.logout(); }
      } else {
        if (authDot) authDot.className = 'p2p-dot disconnected';
        if (authText) authText.textContent = '未登录';
        if (authBtn) { authBtn.textContent = '登录 / 注册'; authBtn.onclick = () => {
          const cid = document.getElementById('settingAuthClientId')?.value.trim();
          if (cid) AuthService.setClientId(cid);
          AuthService.login();
        }; }
      }
    });
  }

  // ====== Online Users ======
  function bindOnlineUsersEvents() {
    const statusArea = document.getElementById('p2pStatusArea');
    const btnOnlineUsers = document.getElementById('btnOnlineUsers');
    const overlay = document.getElementById('onlineUsersOverlay');
    const closeBtn = document.getElementById('closeOnlineUsers');

    const openPanel = () => {
      if (overlay) overlay.style.display = 'block';
      loadOnlineUsers();
    };

    const closePanel = () => {
      if (overlay) overlay.style.display = 'none';
    };

    if (statusArea) statusArea.addEventListener('click', openPanel);
    if (btnOnlineUsers) btnOnlineUsers.addEventListener('click', openPanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePanel();
      });
    }
  }

  async function loadOnlineUsers() {
    const listEl = document.getElementById('onlineUsersList');
    const countEl = document.getElementById('onlineUserCount');
    if (!listEl) return;

    listEl.innerHTML = `
      <div class="skeleton" style="height:40px;margin-bottom:8px;"></div>
      <div class="skeleton" style="height:40px;margin-bottom:8px;"></div>
      <div class="skeleton" style="height:40px;margin-bottom:8px;"></div>
    `;

    try {
      const data = await AuthService.fetchOnlineUsers();
      const users = data.list || data.data?.list || [];
      const total = data.totalCount || data.data?.totalCount || users.length;
      const onlineCount = users.filter(u => u.online !== false).length;

      if (countEl) countEl.textContent = `${onlineCount} 人在线 / ${total} 人总计`;

      if (users.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state" style="padding:30px;">
            <div class="empty-icon">👥</div>
            <p>暂无在线用户</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = users.map(user => {
        const name = user.displayName || user.name || user.nickname || user.username || '匿名用户';
        const initial = name.charAt(0).toUpperCase();
        const isOnline = user.online !== false;
        const lastLogin = user.lastLogin ? formatRelativeTime(user.lastLogin) : '';
        const avatarHtml = user.photo
          ? `<img src="${user.photo}" alt="${name}" />`
          : initial;

        return `
          <div class="online-user-item">
            <div class="online-user-avatar">
              ${avatarHtml}
              <div class="online-user-status-dot ${isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="online-user-info">
              <div class="online-user-name">${name}</div>
              <div class="online-user-time">${isOnline ? '在线' : lastLogin}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:30px;">
          <div class="empty-icon">⚠️</div>
          <p>加载在线用户失败</p>
          <p class="text-sm text-secondary">${e.message || '请检查后端服务'}</p>
        </div>
      `;
    }
  }

  function formatRelativeTime(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  }

  function navigateTo(module) {
    currentModule = module;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-module="${module}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update view
    document.querySelectorAll('.module-view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(`view-${module}`);
    if (view) view.classList.add('active');

    // Render module
    switch (module) {
      case 'market-flow':
        MarketFlowModule.render();
        break;
      case 'factor-discovery':
        FactorDiscoveryModule.render();
        break;
      case 'ai-experts':
        AIExpertsModule.render();
        break;
      case 'community-chat':
        CommunityChatModule.render();
        break;
    }
  }

  function saveSettings() {
    const apiUrl = document.getElementById('settingApiUrl')?.value;
    const model = document.getElementById('settingModel')?.value;
    const apiKey = document.getElementById('settingApiKey')?.value;
    const relay = document.getElementById('settingRelay')?.value;

    if (apiUrl || model || apiKey) {
      AIService.updateConfig({ apiUrl, model, apiKey });
    }
    if (relay) {
      localStorage.setItem('cp_relay', relay);
    }

    // Save Authing client ID if present
    const authClientId = document.getElementById('settingAuthClientId')?.value;
    if (authClientId) {
      AuthService.setClientId(authClientId);
    }

    // Visual feedback
    const btn = document.getElementById('btnSaveSettings');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = '✓ 已保存';
      btn.style.background = 'var(--down)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--down)';
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2000);
    }
  }

  return { init, navigateTo };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
