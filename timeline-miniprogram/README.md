# Timeline · 把当下的每一句话，变成正在推进的目标

一个四 Tab 的微信小程序。核心不是"规划未来"，而是：**你说当下的这一句 → 系统理解它 → 归拢/长出一个目标 → 目标被持续自动维护**。

## 四个 Tab

| Tab | 页面 | 做什么 |
| --- | --- | --- |
| 需求 | `pages/input` | 对话式输入（文字 / 键盘语音）。说一句，系统判断是**汇报进展 / 遇到阻力 / 想问办法 / 冒出新目标**，给出理解、归入的目标和 2 条可立即执行的下一步 |
| 目标 | `pages/goal` | 自动维护的目标列表：进度、停滞天数、建议、最近提到的原话 |
| 选择 | `pages/choice` | 围绕某个目标给**三条未来路径** + 达成概率，选中后铺成七天行动 |
| 时间线 | `pages/timeline` | **近七天**行动时间线，按天折叠，勾选即回写目标进度；按目标筛选、按周翻页；顶部是登录状态与云端**备份 / 恢复** |

## 一句话进来之后发生了什么

```
说一句 ──▶ engine.analyze() 判定意图 + 领域 + 数值
       ──▶ goals.matchGoal() 看能不能归到已有目标
             ├─ 命中  ─▶ 累计数值、记一次提及、给出这个目标下的下一步
             └─ 没命中 ─▶ 生成目标草稿（确认即「立为目标」）
       ──▶ 点「加入时间线」──▶ buildActionRecord() 落成具体行动
       ──▶ 每次勾选 / 每次对话 ──▶ goals.syncAll() 重算进度、停滞、建议、状态
```

**自动维护的四件事**

1. **归拢**：同领域 + 字面重合即归入已有目标；抱怨/提问若匹配不上，就归到"最近在忙的那个目标"
2. **累计**：汇报了数字就累计（支持万元/元换算），如"今天又存了 2000 元" → 自动加到"年底存 5 万"
3. **重算**：目标进度 = 数值进度与任务完成率的加权；近七天完成数、停滞天数每次同步
4. **建议**：停滞 ≥5 天、节奏很稳、已过半……不同状态给不同的建议话术

## 目录

```
timeline-miniprogram/
├─ app.js / app.json / app.wxss      全局 + tabBar（4 项）
├─ pages/
│  ├─ input/      对话式需求输入（文本 + 语音）
│  ├─ goal/       目标自动维护 ★新增
│  ├─ choice/     围绕目标的三条路径
│  └─ timeline/   七天行动时间线
├─ pages/auth/    登录页 + web-view 承载页（OIDC）
├─ utils/
│  ├─ engine.js   意图分析 / 领域词库 / 建议池 / 三条路径与概率  ★核心
│  ├─ goals.js    目标归拢、匹配、数值累计、自动重算          ★核心
│  ├─ oidc.js     OIDC 客户端（PKCE、会话、备份同步）
│  ├─ store.js    Storage（目标 / 会话 / 时间线记录）
│  └─ date.js     日期工具
├─ aiservice/     Python 侧服务：prompt 处理 / 时间线 / 用户数据（见其 README）
├─ server/        登录后端（零依赖 Node，持有 App Secret）
│  ├─ index.js    /oidc/* 与 /api/state
│  ├─ config.js   OIDC 配置（Secret 只在这里）
│  └─ public/     回调页
├─ images/tab/    tabBar 图标（tools/gen_icons.py 生成）
├─ preview/       浏览器 1:1 交互预览（node preview/build.js 重建）
└─ tools/         图标脚本 + 引擎/目标自测
```

## 登录：OIDC（Authing）

### 为什么要一个后端

App Secret **不能放进小程序**（包体可被反编译）。所以换 token 这一步必须由服务端完成：

```
小程序 ──① 要授权地址（服务端生成 PKCE）──▶ server
       ◀── url + code_verifier ──────────┘
       ──② web-view 打开 Authing 登录 ──▶ Authing
       ──③ 回调页把 code 带回小程序 ─────┘
       ──④ code + verifier ────────────▶ server ──⑤ code + verifier + Secret ──▶ Authing
       ◀── access_token / id_token ─────┘
```

小程序端只有 `client_id` 和端点地址；Secret 只出现在 `server/config.js`。

### 跑起来

```bash
cd server
node index.js                      # 默认 3000
PORT=3100 node index.js            # 换端口
PUBLIC_BASE_URL=https://your.domain node index.js   # 部署时用公网地址
curl http://localhost:3000/health
```

### 三处必须配置的地址

1. **Authing 应用** → 登录回调 URL 白名单加入 `<PUBLIC_BASE_URL>/oidc/callback`（默认 `http://localhost:3000/oidc/callback`）
2. **小程序后台** → 开发设置 → **request 合法域名**：加你的服务域名（开发期可在 devtools 勾选"不校验合法域名"）
3. **小程序后台** → **业务域名**：加回调页所在域名，否则 web-view 里的 JSSDK 无法跳回小程序 —— 这种情况用登录页的「手动粘贴 code」兜底

小程序端的服务地址在 `utils/oidc.js` 顶部的 `API_BASE`（默认 `http://localhost:3000`），部署后改掉，或调用 `oidc.setApiBase()`。

### 安全

- `server/config.js` 里的 App Secret 请**改为环境变量**注入，不要提交到公开仓库：
  ```bash
  OIDC_CLIENT_SECRET=xxx PUBLIC_BASE_URL=https://your.domain node index.js
  ```
- `server/data/` 存放用户备份（按 sub 分文件），已在 `.gitignore` 中忽略
- 服务端目前只解析 token 里的 `sub` 做文件隔离，**没有做 JWT 签名校验**；上生产前请用 JWKS（`https://weinvest.authing.cn/oidc/.well-known/jwks.json`）校验 `access_token`

### 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查 |
| GET | `/oidc/config` | 公开的客户端配置 |
| GET | `/oidc/authorize-url` | 生成 PKCE + 授权地址 |
| POST | `/oidc/token` | `{code, codeVerifier}` → token |
| POST | `/oidc/refresh` | `{refreshToken}` → 新 token |
| GET | `/oidc/me` | `Authorization: Bearer` → 用户信息 |
| GET | `/oidc/logout-url` | 登出地址 |
| GET/PUT | `/api/state` | 按用户隔离的目标备份 / 恢复 |

### 登录后能做什么

「时间线」页顶部会显示登录状态条：**备份**把本机目标与时间线推到服务端，**恢复**从云端拉回并覆盖本机 —— 换设备时数据能跟着账号走。未登录也能正常使用全部功能。

## 运行

1. 微信开发者工具 → 导入项目 → 选本目录（`app.json` 在根目录）
2. AppID 可选「测试号」；`project.config.json` 里 `appid` 目前是 `touristappid`
3. 语音输入走键盘自带话筒，不需要任何权限或插件；用系统/微信输入法即可
4. 两个后端（aiservice / server）的地址在**小程序里配**，见下一节

不开开发者工具时，直接浏览器打开 **`preview/index.html`**（四 Tab 完整交互，数据存 localStorage）。

## 服务地址：在小程序里配

两套后端的地址都不再写死在代码里。入口：**时间线 tab → 顶部登录条右侧的 ⚙**。

| 配置项 | 默认 | 谁在用 |
| --- | --- | --- |
| `aiBase` | `http://127.0.0.1:8100` | aiservice（Python）：prompt 处理 / 时间线 / 用户数据 |
| `oidcBase` | `http://localhost:3000` | server（Node）：OIDC 登录 + 云端备份恢复 |
| `useServer` | **开** | 需求页每句话是否发给 aiservice 分析 |
| `useLlm` | **开** | 服务端再调真实大模型（aiservice 的 `env.sh` 默认指向本机 ollama `127.0.0.1:1337/v1`） |

**需求页的请求链路**（开着 `useServer` 时）：

```
说一句 ──▶ POST {aiBase}/api/prompt/analyze { text, user_id, use_llm }
       ◀── 意图 / 领域 / 理解 / 目标标题 / 验收标准 / 建议
       ──▶ 本地 matchGoal 归拢到已有目标（数据仍存本地）
       ──▶ 连不上服务端：自动回落到本地 engine.analyze()，只提示一次
```

气泡右上角会标这次结果来自**服务端**还是**本地**——绿色「服务端」说明确实打到了你配的那个地址。

- 存 `tl_settings_v1`，改完**立即生效，不用重新编译**
- 地址会自动规范化：去尾部斜杠、没写协议时补 `http://`
- 本地小模型一次要 20~30 秒，分析请求超时已放宽到 120 秒；嫌慢就把 `useLlm` 关掉走规则引擎
- 每个地址都有「测试连接」，通了会显示服务名 + 版本 + 耗时，并可一键「就用这个」
- 有「恢复默认地址」

**真机预览必须换局域网 IP**（`127.0.0.1` 在手机上指的是手机自己）：

```bash
ipconfig getifaddr en0        # macOS，拿到如 192.168.1.23
# 然后填 http://192.168.1.23:8100 和 http://192.168.1.23:3000
```

小程序后台 → 开发设置 → **request 合法域名** 加上这两个地址；开发期可在开发者工具里勾选「不校验合法域名」。

相关代码：

| 文件 | 作用 |
| --- | --- |
| `utils/settings.js` | 配置读写、地址规范化、连通性探测 |
| `utils/ai.js` | aiservice 客户端（地址取自 settings，登录后用 sub 作 user_id） |
| `utils/oidc.js` | 登录客户端，地址改为每次请求时从 settings 读 |
| `pages/settings/` | 设置页 |

## 语音输入：用键盘自带的话筒（零依赖）

**不装插件、不申请录音权限、不跑任何 ASR 服务。**

小程序本身没有内置的自绘语音识别能力，但输入框唤起键盘后，**键盘上自带话筒**（微信输入法 / 系统输入法都支持），说完文字直接进输入框。所以「语音输入」按钮做的事是：

```
点话筒 ──▶ 聚焦 textarea 弹出键盘 ──▶ 点键盘上的 🎤 说话 ──▶ 文字落在输入框 ──▶ 发送
```

对应代码只有 `pages/input/index.js` 里的 `onVoice()`（一行 `setData({ focused: true })` + 一句 toast 引导）。

### 为什么不用别的方案

| 方案 | 代价 |
| --- | --- |
| 键盘话筒（当前） | 零依赖，但录音入口在键盘上，样式不可控 |
| 「微信同声传译」插件 | 能自绘按住说话，但要到公众平台添加插件 + `app.json` 声明 `plugins` |
| 自录音频 + 服务端 ASR（Whisper / 腾讯云） | 完全可控，但要自建服务、申请录音权限、处理音频上传 |

想改成后两种：`utils/asr.js` 的历史版本（WechatSI 版）在 git 里；要接插件就把 `app.json` 加回 `plugins` 声明，并把 `onVoice()` 换成 `manager.start()` 那套回调即可。

## 两个后端

| 服务 | 语言 | 管什么 |
| --- | --- | --- |
| `aiservice/` | Python | prompt 处理、时间线数据、用户数据；算法与小程序 `utils/` 对齐 |
| `server/` | Node | OIDC 登录（持有 App Secret）+ 备份恢复 |

两个服务互不依赖，可单独启动：

```bash
cd aiservice && ./start.sh      # http://127.0.0.1:8100
cd server && node index.js      # http://localhost:3000
```

## 数据

本地 Storage：

| key | 内容 |
| --- | --- |
| `tl_goals_v1` | 目标（标题、领域、目标量、当前值、提及历史、进度、建议） |
| `tl_msgs_v1` | 会话（原话、意图、理解、建议、归属目标） |
| `tl_records_v1` | 时间线记录（七天计划 / 即时行动） |

换设备不同步。要云同步只改 `utils/store.js` 的读写，页面层不用动。

## 自测

```bash
node tools/check_exports.js # 静态体检：utils 导出是否漏、WXML 事件是否有处理函数
node tools/test_engine.js   # 需求解析 / 时限 / 概率 / 七天计划
node tools/test_goals.js    # 意图判定 / 目标归拢 / 数值累计 / 自动维护
node preview/build.js       # 重建浏览器预览
python tools/gen_icons.py   # 重新生成 tabBar 图标
```

`check_exports.js` 专门防「真机才炸」的两类错误：utils 里定义了却忘了 `module.exports`（如 `store.setGoals` 曾漏导出，点「立为目标」才报 `e.setGoals is not a function`），以及 WXML 绑定了 JS 里不存在的处理函数。
