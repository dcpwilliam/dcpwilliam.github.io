# EBI 循证投资 ⚡

> Evidence Based Investment — 循证投资 · 分布式投资智能平台 — 开源 · 免费 · 可信

EBI 循证投资 是一个开源的跨市场投资分析桌面应用，基于循证投资理念，集四大核心能力于一体：

| 模块 | 功能 |
|------|------|
| 📈 **资金趋势** | 跨市场资金流向可视化（A股/港股/美股），D3 力导向网络图 |
| 🔬 **投资机会** | 多因子挖掘与综合评分，ECharts 散点图/雷达图 |
| 🤖 **AI 专家组** | 多角色策略圆桌讨论（价值/量化/宏观），支持 Ollama 本地 LLM |
| 💬 **社区聊天** | P2P 分布式聊天，基于 Gun.js，每个客户端都是节点 |

---

## 快速启动

### 方式一：Web 开发模式（推荐）

```bash
# 终端 1：启动 Python 后端
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 终端 2：启动前端 HTTP 服务
cd src
python3 -m http.server 8080

# 浏览器打开
open http://localhost:8080
```

### 方式二：一键启动脚本

```bash
bash start.sh
# 自动启动后端 (:8000) + 前端 (:8080)
```

### 方式三：Electron 桌面应用

```bash
npm install
npm run electron
```

### 方式四：一键构建 DMG 安装包

```bash
# 生成最新 DMG（自动处理图标、依赖、构建）
bash build-dmg.sh

# 可选参数
bash build-dmg.sh --skip-icon     # 跳过图标生成（已有时）
bash build-dmg.sh --only-arm64    # 仅构建 Apple Silicon 版
bash build-dmg.sh --only-x64      # 仅构建 Intel 版

# 或用 npm
npm run build:dmg
```

构建完成后，DMG 文件在 `dist/` 目录中，双击即可安装。

---

## 配置

### AI 模型（设置页面）

支持两种后端，在「设置」页面配置：

| 模式 | API URL | 模型 |
|------|---------|------|
| **Ollama 本地** | `http://localhost:11434/v1` | `qwen2.5:7b` |
| **OpenAI API** | `https://api.openai.com/v1` | `gpt-4o` |

```bash
# 安装并启动 Ollama（推荐本地使用）
brew install ollama
ollama serve
ollama pull qwen2.5:7b
```

### 数据源

- **Yahoo Finance**：免费，无需 API Key（默认开启）
- **Finnhub**：需 API Key，在 `server/config.py` 中配置 `CP_FINNHUB_API_KEY`
- **通达信**：本地数据，需配置路径

### P2P 网络

默认使用公共 Gun.js relay。如需私有部署：

```python
# server/config.py
CP_GUN_RELAY = "https://your-relay.example.com/gun"
```

---

## 项目结构

```
ebi-investment/
├── src/                  # 前端（HTML/CSS/JS）
│   ├── index.html        # 主页面
│   ├── css/main.css     # 全局样式系统
│   └── js/
│       ├── app.js               # 应用入口
│       ├── services/            # 数据服务层
│       │   ├── market-data.js   # 市场数据（含 Mock）
│       │   ├── ai-service.js    # AI 调用封装
│       │   └── gun-sync.js     # Gun.js P2P 同步
│       └── modules/            # 四大功能模块
│           ├── market-flow.js   # 资金趋势（D3）
│           ├── factor.js        # 投资机会（ECharts）
│           ├── ai-experts.js   # AI 专家组
│           └── chat.js         # 社区聊天
├── server/               # Python 后端
│   ├── main.py                # FastAPI 入口
│   ├── config.py              # 配置
│   ├── services/             # 业务服务
│   │   ├── market_data.py    # 市场数据引擎
│   │   ├── ai_engine.py      # AI 专家引擎
│   │   └── factor_calc.py   # 因子计算引擎
│   └── routers/             # API 路由
│       ├── market.py
│       ├── ai_experts.py
│       └── factors.py
├── electron/             # Electron 桌面封装
│   ├── main.js
│   └── entitlements.mac.plist  # macOS 权限声明
├── src/assets/icons/     # 应用图标
│   ├── icon.svg          # 原始 SVG（EBI 循证投资）
│   ├── icon.icns         # macOS 图标（iconset 生成）
│   ├── icon.iconset/     # 各尺寸 PNG
│   └── icon.png          # Electron 512px 图标
├── package.json
├── build-dmg.sh          # 一键构建 DMG 脚本
├── start.sh              # 一键启动脚本
└── README.md
```

---

## API 文档

后端启动后访问：`http://localhost:8000/docs`

| 接口 | 说明 |
|------|------|
| `GET /api/market/flow?market=cn` | 获取资金流向数据 |
| `GET /api/market/hot-sectors?market=cn` | 获取热点板块 |
| `GET /api/market/search?q=茅台` | 搜索股票 |
| `GET /api/market/stock/{code}` | 股票详情 |
| `POST /api/ai/analyze` | AI 分析股票 |
| `POST /api/ai/cross-discuss` | 跨专家综合讨论 |
| `GET /api/factors/` | 获取因子评分 |
| `POST /api/factors/refresh` | 刷新因子 |
| `GET /api/factors/opportunities/scan` | 扫描投资机会 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | HTML5 / CSS3 / Vanilla JS（无框架依赖） |
| 可视化 | D3.js v7（力导向图）+ ECharts 5（散点/雷达图） |
| 分布式 DB | Gun.js（CRDT P2P，每客户端即节点） |
| 桌面封装 | Electron 28 |
| 后端 | Python 3.11+ / FastAPI |
| AI | OpenAI 兼容接口（Ollama / OpenAI / 自定义） |
| 数据源 | Yahoo Finance / Finnhub |

---

## Roadmap

- [x] MVP：四大模块基础功能 + Mock 数据
- [ ] 接入真实行情数据（通达信 / Yahoo Finance）
- [ ] 因子引擎接入历史数据回测
- [ ] AI 专家组支持更多角色（技术分析师、行业研究员）
- [ ] P2P 知识图谱可视化
- [ ] 持仓管理 + 模拟交易
- [ ] 多语言支持（中文/英文）
- [ ] 移动端适配

---

## License

MIT — 免费使用，欢迎贡献 🚀

---

## 问题反馈

GitHub Issues：https://github.com/dcpwilliam/ebi-investment/issues