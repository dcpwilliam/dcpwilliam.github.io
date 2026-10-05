const oidc = require('./utils/oidc.js')

App({
  globalData: {
    // 登录态（OIDC）
    session: null,
    user: null,
    // 待分析的原始需求（由输入页写入，选择页消费）
    draft: null,
    // 生成批次的随机种子，用于「换一组」
    seed: 0,
    // 选择页当前围绕的目标
    activeGoal: null,
    // 选择页生成的候选方案
    options: null,
    // 时间线数据版本号，任一页改动后自增，其他页 onShow 时刷新
    dataVersion: 0,
    systemInfo: null
  },

  onLaunch() {
    try {
      const info = wx.getSystemInfoSync()
      this.globalData.systemInfo = info
      this.globalData.safeBottom = info.safeArea
        ? info.screenHeight - info.safeArea.bottom
        : 0
    } catch (e) {
      this.globalData.safeBottom = 0
    }
    // 恢复登录态
    const session = oidc.getSession()
    if (session && session.user) {
      this.globalData.session = session
      this.globalData.user = session.user
    }

    // 恢复上次未完成的需求草稿
    const draft = wx.getStorageSync('tl_draft_v1')
    if (draft && draft.text) this.globalData.draft = draft
  }
})
