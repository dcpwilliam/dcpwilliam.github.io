/**
 * OIDC 配置（服务端专用）
 * ------------------------------------------------------------
 * App Secret 只出现在这里，永远不要写进小程序端代码。
 * 生产环境请用环境变量覆盖，不要把这个文件提交到公开仓库：
 *   OIDC_CLIENT_SECRET=xxx PUBLIC_BASE_URL=https://your.domain node server/index.js
 * ------------------------------------------------------------
 */
const PORT = Number(process.env.PORT || 3000)
// 未显式指定公网地址时，跟随 PORT（便于本地换端口调试）
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:' + PORT

module.exports = {
  port: PORT,

  clientId: process.env.OIDC_CLIENT_ID || '69ba3eccdb057f1398c742c5',
  clientSecret: process.env.OIDC_CLIENT_SECRET || 'f398511d8451b745b5a7aed683e9680d',

  issuer: 'https://weinvest.authing.cn/oidc',
  authorizationEndpoint: 'https://weinvest.authing.cn/oidc/auth',
  tokenEndpoint: 'https://weinvest.authing.cn/oidc/token',
  userInfoEndpoint: 'https://weinvest.authing.cn/oidc/me',
  jwksUri: 'https://weinvest.authing.cn/oidc/.well-known/jwks.json',
  endSessionEndpoint: 'https://weinvest.authing.cn/oidc/session/end',
  discoveryUrl: 'https://weinvest.authing.cn/oidc/.well-known/openid-configuration',

  scopes: 'openid profile email offline_access',

  // 回调地址：必须是公网可访问的地址，且要在 Authing 应用的「回调地址」白名单里
  publicBaseUrl: PUBLIC_BASE_URL,
  redirectPath: '/oidc/callback',
  get redirectUri() {
    return this.publicBaseUrl + this.redirectPath
  }
}
