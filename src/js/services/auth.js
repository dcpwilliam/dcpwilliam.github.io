/**
 * EBI 循证投资 — OIDC Authentication Service
 * Authing OIDC integration (Authorization Code + PKCE)
 */

const AuthService = (() => {
  // ---- OIDC Configuration ----
  const OIDC_CONFIG = {
    issuer: 'https://weinvest.authing.cn/oidc',
    authorizationEndpoint: 'https://weinvest.authing.cn/oidc/auth',
    tokenEndpoint: 'https://weinvest.authing.cn/oidc/token',
    userinfoEndpoint: 'https://weinvest.authing.cn/oidc/me',
    endSessionEndpoint: 'https://weinvest.authing.cn/oidc/session/end',
    jwksUri: 'https://weinvest.authing.cn/oidc/.well-known/jwks.json',
    // ⚠️ 以下值需在 Authing 控制台获取后填入
    clientId: localStorage.getItem('ebi_auth_client_id') || '',
    redirectUri: window.location.origin + window.location.pathname,
    scope: 'openid profile email phone',
    responseType: 'code',
  };

  // ---- State ----
  let currentUser = null;
  let accessToken = null;
  let idToken = null;
  let refreshToken = null;
  let tokenExpiresAt = 0;
  let onAuthChange = null;
  let refreshTimer = null;

  // ---- PKCE Helpers ----
  function generateRandomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return hash;
  }

  function base64URLEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    bytes.forEach(b => str += String.fromCharCode(b));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function generatePKCE() {
    const verifier = generateRandomString(43);
    const challengeBuffer = await sha256(verifier);
    const challenge = base64URLEncode(challengeBuffer);
    return { verifier, challenge, method: 'S256' };
  }

  // ---- Token Storage ----
  function saveTokens(tokens) {
    accessToken = tokens.access_token || null;
    idToken = tokens.id_token || null;
    refreshToken = tokens.refresh_token || null;
    const expiresIn = tokens.expires_in || 3600;
    tokenExpiresAt = Date.now() + expiresIn * 1000;

    localStorage.setItem('ebi_access_token', accessToken || '');
    localStorage.setItem('ebi_id_token', idToken || '');
    localStorage.setItem('ebi_refresh_token', refreshToken || '');
    localStorage.setItem('ebi_token_expires', tokenExpiresAt.toString());

    // Auto refresh at 80% of expiry
    scheduleRefresh(expiresIn);
  }

  function loadSavedTokens() {
    accessToken = localStorage.getItem('ebi_access_token') || null;
    idToken = localStorage.getItem('ebi_id_token') || null;
    refreshToken = localStorage.getItem('ebi_refresh_token') || null;
    tokenExpiresAt = parseInt(localStorage.getItem('ebi_token_expires') || '0', 10);
  }

  function clearTokens() {
    accessToken = null;
    idToken = null;
    refreshToken = null;
    tokenExpiresAt = 0;
    currentUser = null;

    localStorage.removeItem('ebi_access_token');
    localStorage.removeItem('ebi_id_token');
    localStorage.removeItem('ebi_refresh_token');
    localStorage.removeItem('ebi_token_expires');
    localStorage.removeItem('ebi_pkce_verifier');
    localStorage.removeItem('ebi_auth_state');
    localStorage.removeItem('ebi_user_profile');

    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  function scheduleRefresh(expiresIn) {
    if (refreshTimer) clearTimeout(refreshTimer);
    if (!refreshToken) return;

    const refreshAt = Math.max(expiresIn * 0.8, 60) * 1000;
    refreshTimer = setTimeout(() => refreshAccessToken(), refreshAt);
  }

  // ---- OIDC Flow ----
  async function login() {
    if (!OIDC_CONFIG.clientId) {
      showClientIdPrompt();
      return;
    }

    const pkce = await generatePKCE();
    const state = generateRandomString(16);

    localStorage.setItem('ebi_pkce_verifier', pkce.verifier);
    localStorage.setItem('ebi_auth_state', state);

    const params = new URLSearchParams({
      client_id: OIDC_CONFIG.clientId,
      redirect_uri: OIDC_CONFIG.redirectUri,
      response_type: OIDC_CONFIG.responseType,
      scope: OIDC_CONFIG.scope,
      state: state,
      code_challenge: pkce.challenge,
      code_challenge_method: pkce.method,
      prompt: 'login',
    });

    window.location.href = `${OIDC_CONFIG.authorizationEndpoint}?${params.toString()}`;
  }

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      console.error('[Auth] OIDC error:', error, params.get('error_description'));
      clearTokens();
      notifyAuthChange();
      return;
    }

    if (!code) return; // Not a callback

    // Verify state
    const savedState = localStorage.getItem('ebi_auth_state');
    if (state !== savedState) {
      console.error('[Auth] State mismatch');
      clearTokens();
      return;
    }

    const verifier = localStorage.getItem('ebi_pkce_verifier');

    try {
      const tokens = await exchangeCode(code, verifier);
      saveTokens(tokens);

      // Clean URL
      const url = new URL(window.location);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      url.searchParams.delete('session_state');
      window.history.replaceState({}, document.title, url.toString());

      // Fetch user info
      await fetchUserInfo();
      notifyAuthChange();
    } catch (e) {
      console.error('[Auth] Token exchange failed:', e);
      clearTokens();
      notifyAuthChange();
    }
  }

  async function exchangeCode(code, verifier) {
    const response = await fetch(OIDC_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: OIDC_CONFIG.clientId,
        code: code,
        redirect_uri: OIDC_CONFIG.redirectUri,
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  async function refreshAccessToken() {
    if (!refreshToken) return;

    try {
      const response = await fetch(OIDC_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: OIDC_CONFIG.clientId,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        console.warn('[Auth] Token refresh failed, logging out');
        logout();
        return;
      }

      const tokens = await response.json();
      saveTokens(tokens);
      console.log('[Auth] Token refreshed');
    } catch (e) {
      console.warn('[Auth] Token refresh error:', e);
      logout();
    }
  }

  async function fetchUserInfo() {
    if (!accessToken) return null;

    try {
      const response = await fetch(OIDC_CONFIG.userinfoEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('[Auth] Access token expired');
          clearTokens();
          notifyAuthChange();
          return null;
        }
        throw new Error(`UserInfo fetch failed: ${response.status}`);
      }

      currentUser = await response.json();
      localStorage.setItem('ebi_user_profile', JSON.stringify(currentUser));
      return currentUser;
    } catch (e) {
      console.error('[Auth] Fetch user info error:', e);
      return null;
    }
  }

  async function logout() {
    const idTokenHint = idToken;
    clearTokens();
    notifyAuthChange();

    // Redirect to Authing end_session_endpoint
    if (idTokenHint) {
      const params = new URLSearchParams({
        id_token_hint: idTokenHint,
        post_logout_redirect_uri: OIDC_CONFIG.redirectUri,
      });
      window.location.href = `${OIDC_CONFIG.endSessionEndpoint}?${params.toString()}`;
    }
  }

  // ---- Online Users (via Authing Management API proxy) ----
  async function fetchOnlineUsers(page = 1, limit = 20) {
    const apiBase = window.CP_CONFIG?.apiBase || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${apiBase}/api/auth/online-users?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch online users');
      return await response.json();
    } catch (e) {
      console.warn('[Auth] Fetch online users failed:', e);
      // Return mock data for demo
      return getMockOnlineUsers();
    }
  }

  function getMockOnlineUsers() {
    return {
      totalCount: 12,
      list: [
        { id: '1', displayName: 'Trader_Xiao', photo: '', lastLogin: new Date().toISOString(), online: true },
        { id: '2', displayName: 'FactorHunter', photo: '', lastLogin: new Date().toISOString(), online: true },
        { id: '3', displayName: 'ValueSeeker', photo: '', lastLogin: new Date(Date.now() - 300000).toISOString(), online: true },
        { id: '4', displayName: 'QuantJia', photo: '', lastLogin: new Date(Date.now() - 600000).toISOString(), online: true },
        { id: '5', displayName: 'AlphaTrader', photo: '', lastLogin: new Date(Date.now() - 900000).toISOString(), online: false },
        { id: '6', displayName: 'BetaAnalyst', photo: '', lastLogin: new Date(Date.now() - 1800000).toISOString(), online: false },
        { id: '7', displayName: 'MomentumKing', photo: '', lastLogin: new Date(Date.now() - 3600000).toISOString(), online: false },
      ],
    };
  }

  // ---- Client ID Prompt ----
  function showClientIdPrompt() {
    const existing = document.getElementById('auth-client-id-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'auth-client-id-modal';
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h3>配置 Authing 应用</h3>
          <button class="auth-modal-close" onclick="this.closest('.auth-modal-overlay').remove()">&times;</button>
        </div>
        <div class="auth-modal-body">
          <p class="text-sm text-secondary mb-4">
            请在 <a href="https://weinvest.authing.cn" target="_blank" style="color:var(--accent)">Authing 控制台</a> 
            获取应用的 App ID，并确保回调地址设置为 <code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;font-size:12px">${OIDC_CONFIG.redirectUri}</code>
          </p>
          <div class="flex flex-col gap-3">
            <div>
              <label class="text-sm font-medium" style="display:block;margin-bottom:4px;">Authing App ID</label>
              <input type="text" id="authClientIdInput" placeholder="如：64a1b2c3d4e5f6..."
                style="width:100%;height:40px;padding:0 12px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:13px;font-family:var(--font-mono);" />
            </div>
          </div>
        </div>
        <div class="auth-modal-footer">
          <button class="btn btn-sm" onclick="this.closest('.auth-modal-overlay').remove()">取消</button>
          <button class="btn btn-sm btn-primary" id="authClientIdSave">保存并登录</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('authClientIdSave').addEventListener('click', () => {
      const clientId = document.getElementById('authClientIdInput').value.trim();
      if (clientId) {
        OIDC_CONFIG.clientId = clientId;
        localStorage.setItem('ebi_auth_client_id', clientId);
        modal.remove();
        login();
      }
    });
  }

  // ---- Init ----
  function init() {
    loadSavedTokens();

    // Check if this is an OIDC callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) {
      handleCallback();
      return;
    }

    // Try to restore session
    if (accessToken && tokenExpiresAt > Date.now()) {
      const savedProfile = localStorage.getItem('ebi_user_profile');
      if (savedProfile) {
        try {
          currentUser = JSON.parse(savedProfile);
        } catch (e) {
          currentUser = null;
        }
      }
      // Refresh user info in background
      fetchUserInfo();
      scheduleRefresh((tokenExpiresAt - Date.now()) / 1000);
      notifyAuthChange();
    } else if (refreshToken) {
      refreshAccessToken();
    } else {
      clearTokens();
      notifyAuthChange();
    }
  }

  function notifyAuthChange() {
    if (onAuthChange) onAuthChange(currentUser, accessToken);
    updateUI();
  }

  function updateUI() {
    const loginBtn = document.getElementById('authLoginBtn');
    const userAvatar = document.getElementById('authUserAvatar');
    const userName = document.getElementById('authUserName');
    const userMenu = document.getElementById('authUserMenu');

    if (currentUser) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (userAvatar) {
        userAvatar.style.display = 'flex';
        if (currentUser.picture) {
          userAvatar.innerHTML = `<img src="${currentUser.picture}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
        } else {
          const name = currentUser.nickname || currentUser.name || currentUser.email || 'U';
          userAvatar.textContent = name.charAt(0).toUpperCase();
        }
      }
      if (userName) {
        userName.style.display = 'block';
        userName.textContent = currentUser.nickname || currentUser.name || currentUser.email || '用户';
      }
      if (userMenu) userMenu.style.display = 'block';
    } else {
      if (loginBtn) loginBtn.style.display = 'flex';
      if (userAvatar) userAvatar.style.display = 'none';
      if (userName) userName.style.display = 'none';
      if (userMenu) userMenu.style.display = 'none';
    }
  }

  return {
    init,
    login,
    logout,
    fetchOnlineUsers,

    isAuthenticated() { return !!accessToken && tokenExpiresAt > Date.now(); },
    getUser() { return currentUser; },
    getAccessToken() { return accessToken; },
    getIdToken() { return idToken; },

    onAuthChange(cb) { onAuthChange = cb; },

    setClientId(clientId) {
      OIDC_CONFIG.clientId = clientId;
      localStorage.setItem('ebi_auth_client_id', clientId);
    },
    getClientId() { return OIDC_CONFIG.clientId; },
  };
})();
