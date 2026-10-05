# aiservice · Timeline 的 Python 侧服务

给 `timeline` 小程序提供 **prompt 处理 / 时间线数据 / 用户数据** 三类接口。
**纯标准库，零第三方依赖**，clone 下来就能跑。

```bash
./start.sh                    # 默认 http://127.0.0.1:8100，自动加载 env.sh
PORT=8200 ./start.sh
python run.py --selftest      # 不起服务也能验证：跑完 23 个断言再退出
python run.py --routes        # 打印接口清单
python run.py --logs 50       # 看最近 50 行日志
```

Windows 用 `start.bat`，或 `python run.py`。

**模型默认走本机 ollama**（`http://127.0.0.1:1337/v1`）。`env.sh` 里集中管理所有环境变量，
`start.sh` 会自动 source 它；直接在 shell 里 `source env.sh` 也能用，
`./env.sh --print` 则只打印 `export ...` 行方便复制：

```bash
source env.sh          # 当前 shell 生效
./env.sh               # 同上，直接执行等价于打印 export 行（可 eval）
./env.sh --print       # 只打印，不 export
```

---

## 目录结构

```
aiservice/
├─ run.py                  入口（--port / --host / --selftest / --routes / --logs）
├─ start.sh / start.bat    快速启动脚本（start.sh 会 source env.sh）
├─ env.sh                  环境变量集中配置（默认指向本机 ollama）
├─ requirements.txt        说明：零依赖，接 LLM 也不用装 SDK
├─ app/
│  ├─ config.py            配置（全部环境变量可覆盖）
│  ├─ core/                HTTP 内核，与业务无关
│  │  ├─ http.py           Request / Response 封装
│  │  ├─ router.py         路由（支持 {id} 路径参数）
│  │  ├─ server.py         ThreadingHTTPServer + CORS + 统一异常
│  │  └─ errors.py         ApiError / NotFound / BadRequest / Unauthorized
│  ├─ storage/             存储层
│  │  ├─ schema.py         数据结构与字段补齐（对齐小程序三个 Storage key）
│  │  └─ json_store.py     一个用户一个 JSON 文件，原子写 + 线程锁
│  ├─ domain/              领域逻辑（与小程序 utils 算法一致）
│  │  ├─ dates.py          日期工具（对齐 utils/date.js）
│  │  ├─ categories.py     六大领域词库
│  │  ├─ analyzer.py       一句话分析：意图 / 领域 / 数值 / 中文数字时限
│  │  └─ goals.py          目标归拢、数值累计、进度重算（对齐 utils/goals.js）
│  ├─ prompts/             Prompt 模板库（analyze / suggest / review / reframe）
│  ├─ llm/                 模型适配
│  │  ├─ base.py           抽象接口
│  │  ├─ echo_provider.py  本地规则实现，默认，不联网
│  │  └─ openai_compatible.py  OpenAI 兼容，配了 Key 才启用
│  ├─ services/            业务服务（不碰 HTTP）
│  │  ├─ prompt_service.py
│  │  ├─ timeline_service.py
│  │  ├─ goal_service.py
│  │  └─ user_service.py
│  └─ api/                 路由层（只接参数、调 service）
│     ├─ health.py  prompt.py  timeline.py  users.py  legacy_state.py
└─ data/users/<user_id>.json    运行生成
```

分层约定：**api → services → domain / storage**，反向依赖不允许。

---

## 接口

### 通用

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查（含存储统计、当前 LLM provider） |
| GET | `/api/info` | 配置 + 全部路由清单 |
| GET | `/api/logs?lines=100` | 最近日志（也可 `python run.py --logs 50`） |

### Prompt 处理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/prompt/templates` | 模板列表与变量 |
| POST | `/api/prompt/render` | `{template, variables}` → 渲染后的 system/user（不调模型） |
| POST | `/api/prompt/analyze` | `{text, user_id?, use_llm?}` → 意图 / 领域 / 理解 / 建议 |
| POST | `/api/prompt/complete` | `{template, variables}` 或 `{system, user}` → 模型输出 |

内置模板：`analyze`（分析一句话）、`suggest`（给下一步）、`review`（复盘时间线）、`reframe`（抱怨重构）。

### 时间线

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/timeline?user_id=&start=&days=&goal_id=` | 按天折叠的时间线 + 窗口信息 |
| GET | `/api/timeline/stats` | 完成数 / 总数 / 百分比 / 累计分钟 |
| GET | `/api/timeline/records` | 行动记录列表 |
| POST | `/api/timeline/records` | 直接建一条记录 |
| DELETE | `/api/timeline/records/{record_id}` | 删记录 |
| PATCH | `/api/timeline/tasks/{task_id}` | `{record_id, done?}` 勾选 / 取消 |
| POST | `/api/timeline/sync` | 重算所有目标进度 |
| GET/POST | `/api/timeline/goals` | 目标列表 / 新建 |
| GET | `/api/timeline/goals/{goal_id}` | 目标详情 |
| POST | `/api/timeline/goals/{goal_id}/actions` | 加行动，自动落进时间线 |
| POST | `/api/timeline/goals/{goal_id}/finish` | 标记达成 |
| DELETE | `/api/timeline/goals/{goal_id}` | 删目标（连带时间线） |
| POST | `/api/timeline/ingest` | **核心**：一句话 → 归拢到已有目标或冒出新目标 |

### 用户数据

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST | `/api/users` | 列表 / 新建 |
| GET/PATCH/DELETE | `/api/users/{user_id}` | 详情 / 改 / 删 |
| GET | `/api/users/{user_id}/export` | 全量导出 |
| POST | `/api/users/{user_id}/import` | 导入（`mode: replace\|merge`） |

### 兼容层

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/PUT | `/api/state` | 对齐小程序 `utils/oidc.js` 的 `pullState/pushState`，用 Bearer token 派生成 user_id |

所有接口都带 CORS，`user_id` 可放 query（调试方便），不传走 `anonymous`。

---

## 三段 curl

```bash
# 1. 分析一句话（本地规则，不联网）
curl -s localhost:8100/api/prompt/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"三个月内减重 10 斤"}' | python3 -m json.tool

# 2. 建用户 + 让一句话长成目标
UID=$(curl -s localhost:8100/api/users -H 'Content-Type: application/json' \
      -d '{"name":"小明"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["user"]["id"])')

curl -s "localhost:8100/api/timeline/ingest?user_id=$UID" \
  -H 'Content-Type: application/json' -d '{"text":"三个月内减重 10 斤"}'

# 3. 取近七天时间线
curl -s "localhost:8100/api/timeline?user_id=$UID&days=7" | python3 -m json.tool
```

---

## 接真实大模型

### 默认：本机 ollama / llama.cpp

`env.sh` 已经把模型指向本机的 OpenAI 兼容端点，**开箱即用**：

```bash
LLM_PROVIDER=openai
LLM_BASE_URL=http://127.0.0.1:1337/v1
LLM_API_KEY=ollama          # 本地服务不校验，随便填个非空值即可
LLM_MODEL=LiquidAI/LFM2_5-2_6B-Q4_K_M
LLM_TIMEOUT=120             # 本地小模型一次 20~30 秒，超时要给足
LLM_TEMPERATURE=0.3
LLM_JSON_MODE=1             # 服务端不认 response_format 时改 0
```

改模型前先确认它在不在：

```bash
curl -s --noproxy '*' http://127.0.0.1:1337/v1/models | python3 -m json.tool
# 然后把拿到的 id 填进 env.sh 的 LLM_MODEL
```

跑起来后 `/health` 里 `llmProvider` 应为 `openai`；调一次：

```bash
curl -s --noproxy '*' localhost:8100/api/prompt/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"三个月内减重 10 斤","use_llm":true}'
```

日志里能看到 `provider=openai model=... ` 和耗时。

### 换云端模型

```bash
export LLM_API_KEY=sk-xxx
export LLM_BASE_URL=https://api.deepseek.com/v1   # 也支持 moonshot / 通义
export LLM_MODEL=deepseek-chat
./start.sh
```

### 三个坑（本机推理模型实测）

1. **别开 `response_format`**。LFM2.5 这类推理模型带上 `json_object` 语法会陷入无限
   chain-of-thought：实测 `content` 是空字符串、token 全烧在 `reasoning_content` 里直到超时。
   所以 `LLM_JSON_MODE` 默认 **0**，靠 `app/llm/base.py` 的 `parse_loose()` 从回答里抽 JSON。
2. **必须给 `max_tokens`**。不设上限，模型会把 chain-of-thought 一直写下去。
   但设了上限又可能把 JSON 截在半路 —— `parse_loose()` 会把最后那个不完整的元素砍掉、
   补齐括号，把前面的字段保下来（比如只剩 1 条建议也算数）。
3. **慢**。2.6B 模型一次 40~85 秒，偶尔会在某句话上写嗨了触发超时。
   想快就在小程序设置页把「服务端再调真实大模型」关掉，走本地规则（< 1ms）。

### 两条兜底，保证服务永远可用

1. **没配 Key 自动回落 echo**：`config.llm_provider()` 只在 `LLM_PROVIDER=openai` 且 Key 非空时才返回 `openai`。
2. **模型调用失败也回落**：超时 / 连不上 / 返回结构异常，一律不返回 500，
   而是给一份本地规则结果 + `llmFallback: true` + `llmFallbackReason`，
   前端照常渲染，日志打 `WARNING ... 回退本地规则`。
3. **模型输出无效也回落**：小模型经常把模板里的字段说明原样抄回来（比如 `criterion: "怎么算达成"`、
   `suggestions[0].title: "下一步"`）。`prompt_service._placeholder_reason()` 会识别这种占位输出，
   同样整条回退。
4. **建议字段清洗**：`_sanitize_suggestions()` 把模型给的 `minutes` 转整数、限幅 5~240、
   标题截断、补上缺失字段，不足 3 条时用本地建议补齐。前端永远拿得到结构一致的数据。

调用侧在 body 里加 `"use_llm": true` 才走模型，否则一律走规则。
小程序设置页里那个「服务端再调真实大模型」开关就是这个参数。

---

## 日志

每个请求都带 8 位 request id，前后日志能串起来：

```
2026-10-04 21:07:06.161 INFO  [aiservice.access] → #1fdd24cb POST /api/prompt/analyze
2026-10-04 21:07:06.161 DEBUG [aiservice.access] → #1fdd24cb body {"text":"三个月内减重 10 斤",…}
2026-10-04 21:07:06.162 INFO  [aiservice.prompt] analyze 规则引擎 | user=anonymous len=11 意图=new 领域=fitness 耗时=0.6ms
2026-10-04 21:07:06.169 INFO  [aiservice.access] ← #1fdd24cb POST /api/prompt/analyze 200 8.7ms
```

- **控制台**：按 `AISERVICE_LOG` 级别（默认 INFO）
- **滚动文件**：`data/logs/aiservice.log`，单文件 2MB、留 3 个备份，级别固定 DEBUG
- **HTTP 查看**：`GET /api/logs?lines=100`（最多 2000 行）
- **命令行**：`python run.py --logs 50`
- 响应头里也带 `X-Request-Id`

有业务日志的地方：`aiservice.prompt`（analyze/complete 走了哪个 provider、耗时）、
`aiservice.goal`（ingest 是新建还是归拢、匹配分）、`aiservice.timeline`（勾选任务、进度）。
调试时把 `AISERVICE_LOG=DEBUG` 打开，能看到请求体与命中的处理函数名。

## 配置（环境变量）

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `AISERVICE_PORT` | 8100 | 端口 |
| `AISERVICE_HOST` | 127.0.0.1 | 监听地址 |
| `AISERVICE_DATA_DIR` | ./data | 数据目录 |
| `AISERVICE_LOG` | INFO | 控制台日志级别（DEBUG 会打印请求体） |
| `AISERVICE_LOG_DIR` | ./data/logs | 日志文件目录 |
| `LLM_PROVIDER` | openai | `echo`（本地规则） / `openai`（兼容端点） |
| `LLM_BASE_URL` | http://127.0.0.1:1337/v1 | OpenAI 兼容地址，**默认本机 ollama** |
| `LLM_API_KEY` | ollama | 空则回落 echo；本地服务随便填非空值 |
| `LLM_MODEL` | LiquidAI/LFM2_5-2_6B-Q4_K_M | 模型名，用 `/v1/models` 查实际 id |
| `LLM_TIMEOUT` | 120 | 超时秒（本地小模型要给足） |
| `LLM_TEMPERATURE` | 0.3 | 采样温度 |
| `LLM_MAX_TOKENS` | 2048 | 最大生成 token，必须设（推理模型不给上限会写嗨） |
| `LLM_JSON_MODE` | 0 | 是否发 `response_format`；推理模型开了会死循环，默认关 |

以上全部写在 `env.sh` 里，`start.sh` 会自动加载；已存在的同名环境变量优先（不会被覆盖）。

---

## 与小程序的关系

| 能力 | 小程序端 | aiservice |
| --- | --- | --- |
| 一句话分析 | `utils/engine.js` | `domain/analyzer.py`（同一套算法，精简版） |
| 目标维护 | `utils/goals.js` | `domain/goals.py`（归拢 / 累计 / 重算一致） |
| 备份恢复 | `utils/oidc.js` → `/api/state` | `api/legacy_state.py`（协议已对齐） |
| 登录 | `server/`（Node，持有 App Secret） | 不涉及，两个服务各管一段 |

小程序不用改代码：设置页（时间线 tab 右上角 ⚙）里的「aiservice 地址」填什么，
`utils/settings.js` 就用什么，`utils/ai.js` 每次请求都现取。
真机预览要在「开发设置 → request 合法域名」里加上，或在开发者工具里勾「不校验合法域名」。

注意本地小模型慢，`utils/ai.js` 里 analyze 的超时已经放到 120 秒（`ANALYZE_TIMEOUT`），
跟 `env.sh` 的 `LLM_TIMEOUT` 对齐。
