# EBI 循证投资平台

> Evidence-Based Investing Platform

基于数据和策略的循证投资分析工具，助您做出更明智的投资决策。

---

## 🎯 功能模块

### 1. 因子探究 (factor.html)
深入分析各类投资因子，发现市场规律与投资机会：
- 价值因子（PE、PB）
- 动量因子（收益率趋势）
- 质量因子（ROE、资产负债率）
- 股息因子（股息率）

### 2. 市场雷达 (map.html)
多维度可视化股票市场分析：
- 散点图展示股票分布
- 支持按行业/概念分类筛选
- 自定义 X/Y 轴维度（市盈率、市净率、ROE、市值等）
- 股票搜索与详情查看
- 市场概览统计面板

### 3. 策略模拟 (simback.html)
模拟交易与回测验证：
- 策略建议生成
- 手动买卖操作
- 收益追踪与对比
- 回测结果分析

### 4. 个人信息 (me.html)
个人投资管理中心：
- 用户资料管理
- 投资组合表现
- 交易记录查看
- 策略表现统计

---

## 📁 工程结构

```
dcpwilliam.github.io/
├── index.html          # 主页面 - 四大模块入口
├── map.html            # 市场雷达 - 股票多维度散点图分析
├── factor.html         # 因子探究 - 投资因子分析
├── simback.html        # 策略模拟 - 模拟交易与回测
├── me.html             # 个人信息 - 用户资料与权益
├── stock-data.json     # 股票数据（40只股票、8个行业、6个概念）
├── ebi-app-builder/    # macOS DMG 打包目录
│   ├── build-dmg.sh    # DMG 打包脚本
│   ├── build/          # 构建产物
│   └── dist/           # 分发目录（.dmg 文件）
└── .vscode/            # VS Code 配置
```

### 文件说明

| 文件 | 类型 | 说明 |
|------|------|------|
| `index.html` | HTML | 应用主入口，四大模块导航 |
| `map.html` | HTML | 核心功能页面，ECharts 散点图分析 |
| `factor.html` | HTML | 因子分析页面 |
| `simback.html` | HTML | 策略模拟页面 |
| `me.html` | HTML | 个人信息页面 |
| `stock-data.json` | JSON | 股票数据（行业、概念、股票列表） |

---

## 🚀 快速开始

### 方式一：直接打开

```bash
# 双击打开主页面
open index.html
```

### 方式二：HTTP 服务器（推荐）

```bash
# 启动本地服务器
python3 -m http.server 8080

# 在浏览器中访问
open http://localhost:8080
```

### 方式三：macOS 应用

```bash
# 挂载 DMG
open ebi-app-builder/dist/EBI\ 循证投资-1.0.0.dmg

# 将应用拖入 Applications 文件夹
# 在启动台打开应用
```

---

## 🛠️ 技术栈

- **前端框架**: 纯 HTML + CSS + JavaScript
- **图表库**: ECharts 5.x
- **数据格式**: JSON
- **打包工具**: macOS 内置 hdiutil
- **服务器**: Python 内置 http.server

---

## 📊 数据说明

`stock-data.json` 包含：

- **8个行业**: 半导体、新能源、医药生物、白酒、银行、人工智能、消费电子、化工
- **6个概念**: 高股息、成长股、价值股、周期股、科技股、消费股
- **40只股票**: 每行业5只，包含完整财务数据（市值、PE、PB、ROE、营收、净利润等）

---

## 🔧 开发指南

### 更新数据

编辑 `stock-data.json` 文件，更新股票数据。

### 添加新功能

1. 在 `index.html` 中添加新模块入口
2. 创建对应的 HTML 页面
3. 保持深色主题风格一致

### 重新打包 DMG

```bash
cd ebi-app-builder
bash build-dmg.sh
```

---

## 📝 License

MIT License

---

## 📧 联系方式

- GitHub: [dcpwilliam](https://github.com/dcpwilliam)
