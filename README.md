# LabNote Agent

> AI 驱动的实验数据治理平台 — 面向高校实验室与科研课题组

**Slogan**：让每一次实验都成为可复用的科研资产

---

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 框架 | TanStack Start (React 19 + SSR) + Vite 7 | 文件路由，Nitro 3 服务端 |
| UI | Radix UI + shadcn/ui + Tailwind CSS v4 | 科技蓝主题 |
| 语言 | TypeScript 5.8 strict | 全量类型检查 |
| 包管理 | Bun | 24h 供应链安全策略 |
| 数据库 | Supabase (PostgreSQL + pgvector) | 云端，RLS 行级安全 |
| 文件存储 | Supabase Storage | 客户端直传，bucket: `experiment-files` |
| AI 服务 | XJTLU AI Gateway (`aiagent.xjtlu.edu.cn`) | OpenAI 兼容接口 |
| 部署 | Vercel | GitHub push → 自动构建上线 |
| 代码仓库 | GitHub: `DiqingTang25/labnote-agent` (Private) | — |

---

## AI 模型矩阵

| 模型 | 模型ID | 用途 | 延迟 | 状态 |
|------|--------|------|:--:|:--:|
| DeepSeek V4 Pro | `d8j2d4r9dhtg6s3fevfg` | 文本理解/推理/生成/RAG | ~3s | ✅ |
| Qwen3-VL-8B-Instruct | `d95koqj7u3anoctav5sg` | 图像识别（SEM/TEM/仪器照片） | ~2.2s | ✅ |
| Qwen3-Embedding-8B | `d8egv6v9ohgtar18hvrg` | 文本→向量（1024维） | ~0.9s | ⚠️ 网关经常返回空 |
| Qwen3-Reranker-8B | `d8efv05lt96sitl7kjcg` | 搜索结果精排 | ~0.3s | ✅ |
| ASR（语音转文字） | — | 实验口述→文本 | — | ❌ 网关不支持 WSS |

> **重要限制**：Embedding 模型在当前网关上经常返回空数组。代码会自动降级为 PostgreSQL ILIKE 关键词搜索（`rag.functions.ts` 有显式降级逻辑）。语义边（知识图谱）和向量相似度搜索在 embedding 不可用时不生效。

所有 AI 调用通过 TanStack Server Functions 代理（`src/lib/api/ai.functions.ts`），API Key 仅服务端可见，浏览器不可获取。

---

## 页面功能 — 真实实现程度

> 以下百分比基于 2026-08-04 源代码完整审计。**不做任何夸大。**

### 核心功能页（生产可用）

#### `/workbench` — 实验工作台（~90% 真实）

**真实实现：**
- [x] 三栏响应式布局（左：数据入口+历史 / 中：卡片编辑 / 右：RAG+关系）
- [x] 实验 CRUD → Supabase `experiments` 表（增删改查 + Storage 文件级联删除）
- [x] AI 解析流水线 `runPipeline()`（4阶段：reading → analyzing → extracting → merging）
  - 文本文件（TXT/MD/LOG/JSON/XML）：DeepSeek V4 Pro 提取结构化字段
  - 表格（CSV）：先本地统计分析 + DeepSeek 提取
  - 图片（PNG/JPG）：Qwen3-VL 视觉识别
  - **已知限制**：PDF/DOCX/XLSX 用 `file.text()` 读取，不能正确提取二进制内容
- [x] 文件上传到 Supabase Storage（客户端直传，路径 `{userId}/{expId}/{timestamp}-{name}`）
- [x] RAG 知识问答（完整管道：查询改写 → embedding/关键词搜索 → reranker → DeepSeek SSE 流式生成）
- [x] 一键补全 `autoFillExperiment()`（真实 DeepSeek 调用，推断缺失字段）
- [x] 重新解析 `reparseExperimentFiles()`（真实 DeepSeek 调用）
- [x] Token-level 置信度校准 `calibrateExperimentFields()`
  - logprobs 可用时：字段值→token 段定位→聚合平均 logprob→0-100 分数
  - logprobs 不可用时：降级为启发式（空=0, <10字符=60, 其余=85, `fromLogprobs: false`）
- [x] 实验关系图集成（fetch/add/delete/suggest relations → Supabase + AI）
- [x] 导出 JSON/MD；打印 PDF（`window.print()`）
- [x] RAG 反馈（👍/👎 → Supabase `rag_feedback` 表）

**未实现/占位：**
- [ ] 「重新解析」按钮在已存储文件上只弹 toast，不实际重新处理
- [ ] Electron 文件夹监听在浏览器环境为 no-op（需桌面客户端）
- [ ] 文件附加/移除操作仅更新本地 state，不单独持久化

---

#### `/checklist` — 复现审计（~88% 真实）

**真实实现：**
- [x] 6 步 AI 拆解管道（`paper-decomposer.ts`）：
  1. 化学式提取（正则）
  2. 论文拆解（DeepSeek V3，~800字 system prompt）
  3. 领域知识增强（69 条静态知识条目，含真实文献引用如 Sci Rep 2024）
  4. **Materials Project API**（`materialsproject.org`，15万+材料数据，需 MP_API_KEY）
  5. **NIST Chemistry WebBook API**（`webbook.nist.gov`，免费，300ms 节流）
  6. 审计生成 → 存入 Supabase `reproduction_audits` 表
- [x] 复现可行性评分算法（纯函数，非 AI）：
  ```
  score = avgConfidence - criticalUncertainPenalty(≤20) - gapPenalty(5/gap, ≤30)
  ```
- [x] 参数四级确定性分类：explicit(100%) → implied(85%) → inferred(55%) → unknown(0%)
- [x] 复现协议生成（Markdown，含安全防护章节）
- [x] 数据脱敏集成（31 条规则，客户端检测+服务端二次扫描）
- [x] 使用量仪表盘（读取脱敏审计日志，模型定价表）

**占位/说明：**
- 7 篇预设论文的 Audit 数据是手工编写的演示数据（`paper-test-data.ts`，显式标注"快速演示"）
- 进度条显示 MP/NIST 阶段是装饰性的（服务端无实时进度回调，仅轮询 `fetchAudits`）
- `userId` 在未登录时降级为 `"dev-user"`

---

#### `/graph` — 知识图谱（~90% 真实）

**真实实现：**
- [x] d3-force 力导向布局（模拟引力/斥力）
- [x] SVG 渲染 + d3-zoom（缩放平移）
- [x] 节点类型：实验/样品/设备/操作人/学科/发现
- [x] 实体去重（同一样品/设备只建一个节点）
- [x] 边来源：Supabase `experiment_relations` 表 + 客户端计算（共享实体/时间/语义）
- [x] 语义边：embedding 余弦相似度 > 0.75（仅在 embedding API 正常时有效）
- [x] 交互：拖拽节点/悬停高亮 1-hop/搜索定位/N-hop 本地图/SVG 导出

**限制：** 语义边密度取决于 embedding API 可用性。embedding 失败时图谱仅显示显式关系。

---

#### `/settings` — 设置（~90% 真实）
- [x] Supabase `profiles` 表 upsert（姓名/机构/学科），跨设备同步
- 学科模板建议是静态内容（4 学科 × 4 字段硬编码）

#### `/assets` — 实验资产包（~95% 真实）
- [x] 全量 Supabase 实验列表 + 统计（卡片数/完整度/参数字段/学科分布）
- [x] 导出 JSON / Markdown（客户端 Blob 下载）

#### `/login` `/signup` — 登录/注册（~100% 真实）
- [x] Supabase Auth：邮箱+密码注册登录
- [x] 邮箱确认流程 + 自动重定向
- [x] 路由保护 `RequireAuth`：**生产环境**未登录→重定向 `/login`；**开发环境**跳过认证

---

### 部分实现页

#### `/` — 首页（~35% 真实）

| 组件 | 数据来源 | 状态 |
|------|----------|:--:|
| Hero + 拖拽上传 | 真实上传流程 → workbench | ✅ |
| 最近实验列表 | Supabase `experiments` 前 4 条 | ✅ |
| 待补全实验列表 | Supabase `experiments` 前 4 条 | ✅ |
| Dashboard 4 个统计数字 | `experiments.length + 96/84/312` 等硬编码 | ❌ 虚假 |
| 最近 AI 问答（4 条） | 硬编码字符串 | ❌ 虚假 |
| 最新知识沉淀（4 条） | 硬编码字符串 | ❌ 虚假 |
| AI 工作流动画 | 静态营销内容 | ❌ 无实际功能 |

#### `/compare` — 治理对比（~70% 真实）
- [x] 实验数据从 Supabase 选取（优先多模态文件）
- [x] 字段完整度/参数/步骤/结果/AI 洞察 = 真实计算
- [ ] 媒体预览用 `/media/` 本地路径（用户上传文件会 404）
- [ ] 音频元数据硬编码

#### `/paper` — 论文辅助（~50% 真实）
- [x] 实验列表从 Supabase 读取
- [ ] **「AI 生成 Methods」是 1.1 秒 `setTimeout` + 本地模板拼接**（非 AI 调用）
- [ ] 「导出 Word」是 Markdown 文本以 `.doc` 扩展名下载（非真 Word 文件）

---

### 纯演示页（无实际功能）

#### `/agent` — AI Agent 控制台（0% 真实）
> **全部硬编码。** MCP 服务器列表（3 条）、工具注册表（6 条）、状态面板（Token 用量/任务计数等）均为静态常量。开关按钮仅翻转本地 React state。无任何 API 调用或持久化。

#### `/handoff` — 项目交接（~12% 真实）
> 仅「关键实验记录」列表从 Supabase 读取。其余全部硬编码：负责人"李同学"、统计数据 18/18/18/6/3、经验总结 6 条、异常实验 3 条。这是产品愿景的概念展示。

---

## 已知限制 & 技术债务

### AI/API 层
- **Embedding 经常不可用**：返回空数组，RAG 降级关键词搜索（`rag.functions.ts` 显式处理）
- **PDF/DOCX/XLSX 解析为伪实现**：用 `file.text()` 读二进制文件，输出乱码给 AI
- **logprobs 依赖网关支持**：不可用时降级启发式校准
- **ASR 语音转文字**：网关不支持 WebSocket，完全不可用

### 前端
- **首页 Dashboard 数字造假**：`+128`/`+96`/`+84`/`312` 等硬编码偏移
- **`/paper` AI 生成造假**：`setTimeout` 模拟延迟，实际是模板拼接
- **`/agent` 纯静态**：无后端
- **`/handoff` 纯静态**：除实验列表外全硬编码
- **Electron 集成**：前端代码就绪（`useElectron.ts` + `FolderWatcherPanel.tsx`），但 `package.json` 无 electron 依赖，无 main process/preload，`window.labnote` 永不为 true
- **`RequireAuth`**：`import.meta.env.DEV` 时跳过认证

### 数据层
- **embedding 列常为 null**：因为 generateEmbedding 返回空
- **文件附加/移除本地 state 不与 DB 同步**
- **RAG 关键词降级模式的 similarity 硬编码为 0.5**

---

## 项目结构

```
labnote-vault-main/
├── src/
│   ├── routes/           # 文件路由（TanStack Start）
│   │   ├── index.tsx         # / 首页
│   │   ├── workbench.tsx     # /workbench 工作台 ★核心
│   │   ├── checklist.tsx     # /checklist 复现审计 ★核心
│   │   ├── graph.tsx         # /graph 知识图谱
│   │   ├── paper.tsx         # /paper 论文辅助
│   │   ├── handoff.tsx       # /handoff 项目交接 [DEMO]
│   │   ├── compare.tsx       # /compare 治理对比
│   │   ├── assets.tsx        # /assets 实验资产包
│   │   ├── agent.tsx         # /agent AI控制台 [DEMO]
│   │   ├── settings.tsx      # /settings 设置
│   │   ├── login.tsx         # /login 登录
│   │   ├── signup.tsx        # /signup 注册
│   │   ├── help.tsx          # /help 帮助
│   │   ├── auth/callback.tsx # OAuth 回调
│   │   └── __root.tsx        # 根布局
│   ├── lib/
│   │   ├── api/
│   │   │   ├── ai.functions.ts           # AI Server Functions（chat/embedding/rerank/logprobs）
│   │   │   ├── rag.functions.ts          # RAG Server Functions（搜索/流式问答）
│   │   │   ├── decompose.functions.ts    # 论文拆解 Server Function
│   │   │   ├── materials-project.functions.ts  # MP API 代理
│   │   │   └── nist.functions.ts         # NIST API 代理
│   │   ├── deepseek.ts           # 客户端 AI 调用封装 + Storage 上传
│   │   ├── multimodal-parser.ts  # 4 阶段 AI 解析流水线
│   │   ├── confidence.ts         # Token-level 置信度校准引擎
│   │   ├── paper-decomposer.ts   # 论文拆解（含 MP/NIST 增强）
│   │   ├── reproduction-audit.ts # 复现审计评分引擎
│   │   ├── domain-knowledge.ts   # 69 条静态领域知识
│   │   ├── paper-test-data.ts    # 7 篇真实论文预设数据
│   │   ├── supabase.ts           # Supabase 客户端（CRUD + Auth + Relations）
│   │   ├── supabase-server.server.ts  # Service Role 客户端（绕过 RLS）
│   │   ├── storage.server.ts     # 服务端文件上传/删除
│   │   ├── labStore.tsx          # 全局实验状态（React Context）
│   │   ├── auth-context.tsx      # Auth Context（Supabase）
│   │   ├── auth-guard.tsx        # 路由保护（dev 模式绕过）
│   │   ├── sanitizer/            # 数据脱敏（31 规则 + 审计日志）
│   │   ├── electron/             # Electron 前端集成（无后端实现）
│   │   ├── graph-types.ts        # 图谱类型定义
│   │   ├── graph-data.ts         # 图谱数据构建
│   │   └── ...
│   ├── components/
│   │   ├── ForceGraph.tsx        # d3-force 力导向图
│   │   ├── GraphSearch.tsx       # 图谱搜索
│   │   ├── ExperimentSummary.tsx # 实验摘要
│   │   ├── FeedbackDialog.tsx    # 反馈弹窗
│   │   ├── usage-dashboard.tsx   # 使用量仪表盘
│   │   └── ui/                   # shadcn/ui 组件库
│   └── hooks/
│       ├── useGraphData.ts       # 图谱数据 Hook
│       └── useForceSimulation.ts # d3-force Hook
├── supabase/
│   └── migrations/               # 数据库迁移文件
├── package.json
├── vite.config.ts                # Vite + TanStack Start + Nitro Vercel preset
└── .env.local                    # 本地环境变量（不提交 Git）
```

---

## 本地开发

```bash
# 安装依赖
bun install

# 启动开发服务器
npx vite dev

# 构建生产版本
npx vite build
```

### 环境变量（`.env.local`）

```env
# Supabase
VITE_SUPABASE_URL=https://kwwjdrwcvgjbjxtewbnk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
SUPABASE_URL=https://kwwjdrwcvgjbjxtewbnk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# AI Gateway (XJTLU)
AI_API_KEY=0cbbaacd...
AI_EMBEDDING_KEY=be86763...
AI_VISION_KEY=2e556d0a...
AI_RERANK_KEY=5d3e03e7...

# Materials Project
MP_API_KEY=...

# HTTP 代理（中国大陆开发环境）
HTTP_PROXY=http://127.0.0.1:7897
HTTPS_PROXY=http://127.0.0.1:7897
```

---

## 部署

**生产 URL**：https://labnote-vault-main.vercel.app

GitHub push → Vercel 自动构建部署。环境变量在 Vercel Dashboard 配置。

---

## 许可证

内部项目，暂未确定开源许可证。
