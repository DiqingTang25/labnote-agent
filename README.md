# LabNote Agent

面向高校实验室与科研课题组的 AI 驱动实验数据治理平台。

**生产环境**: https://labnote-vault-main.vercel.app
**仓库**: github.com/DiqingTang25/labnote-agent (private)

---

## 当前状态 (2026-08-11) — Dynamic Document Store 架构重构 + MCP 上线

### ✅ 已完成：零硬编码字段架构

**Phase 1 的 50+ 固定字段方案已废弃。** 新架构核心原则：**结构跟着内容走，模板只是建议，字段从数据统计中涌现。**

#### 架构变更

| 维度 | 旧架构 | 新架构 |
|------|--------|--------|
| 数据模型 | 40+ TypeScript 字段 → 40+ PostgreSQL 列 | 8 核心索引列 + `properties JSONB`（无模式） |
| 字段定义 | 手写在 7 个文件中 | 27 个 Template 的 `fieldGroups` 驱动 UI + AI |
| AI Prompt | 40+ 字段硬编码在 4 个 prompt 中 | 从 Template 动态生成 JSON shape |
| 卡片 UI | ~300 行手写 JSX 按字段 | `DynamicCardEditor` 按 fieldGroups 配置渲染 |
| 字段校验 | 无 | 物理约束引擎：61 条模板约束 + 11 条通用物理定律 |
| 模板匹配 | 25 行硬编码正则 | 模板自带 `keywords` 数组，按匹配评分 |
| 全文检索 | 写死 8 个字段拼接 search_text | 动态遍历 properties 所有文本值 |

#### 数据库

`experiments` 表已从 40+ 列减至 14 列：

| 列 | 类型 | 说明 |
|----|------|------|
| id, name, date, operator, user_id | text/uuid | 核心索引 |
| experiment_type, version | text/int | 实验分类 |
| created_at, updated_at | timestamptz | 时间戳 |
| properties | JSONB | **所有实验数据** |
| files | JSONB | 附件元数据 |
| embedding | VECTOR(1024) | pgvector |
| search_text, knowledge_tags | text/array | RAG 检索 |

新增表：
- `field_patterns` — 自演化字段统计引擎
- `templates` — 实验模板库（27 个预设模板）

#### 27 个实验模板（6 大领域）

| 领域 | 数量 | 模板 |
|------|:----:|------|
| 计算化学 | 7 | 结构优化、能带、声子、NEB、AIMD、光学、弹性常数 |
| 分子动力学 | 4 | 蛋白水溶液、结合自由能、材料拉伸、Martini粗粒化 |
| 机器学习 | 5 | 图像分类、NLP微调、GNN预测、强化学习、时序预测 |
| 统计分析 | 3 | 临床试验、流行病学、生存分析 |
| 数据工程 | 1 | ETL流水线与数据质量 |
| 湿实验 | 5 | 水热合成、溶胶凝胶、XRD、SEM/TEM、电化学 |
| 通用回退 | 2 | 通用实验（覆盖旧字段）、通用干实验 |

所有模板来源：NOMAD, Materials Project, MLflow, ISA-TAB, LabIMotion, Allotrope ASM, CDISC ODM, Great Expectations 等开源标准。由 Gemini 调研并转换为 LabNote field_groups 格式。

#### 物理约束引擎

- **通用物理定律**：温度≥0K, 产率∈[0,100%], p值∈[0,1], 泊松比∈[-1,0.5] 等 11 条
- **模板约束**：61 条领域边界（来源标注：VASP manual, NOMAD, Allotrope ASM, CDISC ODM 等）
- 硬边界违反 = 拒绝入库（error），常见范围偏离 = 警告但允许（warning）

#### MCP 集成

LabNote 通过 **Model Context Protocol (MCP)** 向外部 AI Agent 暴露实验治理能力。端点：`https://labnote-vault-main.vercel.app/mcp`（JSON-RPC 2.0 Streamable HTTP）。

8 个 MCP 工具与 Web 前端共享同一套 TypeScript 领域模块：

| 工具 | 功能 |
|------|------|
| `list_labnote_templates` | 完整动态模板目录（27 模板、字段组、约束） |
| `match_labnote_template` | 关键词评分匹配实验类型 |
| `create_experiment_card_draft` | 用真实 `ExperimentDoc` 创建未保存草稿 |
| `validate_experiment_properties` | 模板必填字段 + 物理/数值约束校验 |
| `build_experiment_rag_chunks` | 模板驱动的 RAG 分块 |
| `build_experiment_graph` | 实验图谱数据构建 |
| `apply_experiment_property_patches` | 动态点路径更新实验草稿 |
| `parse_experiment_content` | 复用 AI 文本/CSV 解析 + 脱敏 + JSON 归一化 |

详见 [MCP 比赛提交说明](docs/mcp-competition-submission.md)

#### 待完成

| 优先级 | 任务 | 状态 |
|:----:|------|:----:|
| P0 | 27 个模板 seed 到 Supabase templates 表（`scripts/seed-presets.ts`） | 待执行 |
| ✅ | Supabase 迁移 Step 1 + Step 2（properties/files 列、templates/field_patterns 表、旧列删除） | 已完成 |
| P1 | 多 Agent 提取流水线（`validator-agent.ts` + `corrector-agent.ts` 已实现） | 待集成测试 |
| P2 | compare/assets/index/graph 适配新 ExperimentDoc 类型 | 待完成 |
| P3 | extra → 技能库自演化（`field-patterns.ts` + `AddFieldDialog` 已实现） | 待集成 |
| P4 | 零样本 CSV 列语义识别（LLM 辅助列类型理解） | 待实现 |
| ✅ | MCP 端点（`https://labnote-vault-main.vercel.app/mcp`，8 个工具） | 已完成 |
| ✅ | 物理约束引擎（`constraint-validator.ts`，61+11 条规则） | 已完成 |
| ✅ | 动态模板 Prompt（`prompt-builder.ts`，从 Template 动态生成） | 已完成 |
| ✅ | DynamicCardEditor + DynamicField 配置驱动 UI | 已完成 |
| ✅ | 数据模型迁移（`exp-core.ts`，8 列 + properties JSONB） | 已完成 |

#### 2026 年前沿参考

项目调研了 38 个 2026 年 AI 前沿项目/标准：

- **多 Agent 科学自动化**: The AI Scientist v2, Robin, AutoLabs, EOS AI Agent, ProtoPilot, EAA, AI X-ray Scientist
- **结构化提取 + 多模态 LLM**: SciDaSynth, HARMON-E (F1=0.93), nanoMINER (precision=0.98), SO-Bench (Apple)
- **表格基础模型**: Google TabFM (zero-shot), Relational Transformer (ICLR 2026), SkillTFM (gate evolution)
- **数据标准**: NOMAD, ISA-TAB, Allotrope ASM, CDISC ODM, NeXus NXxrd, OME-XML, BatteryDataGenome

详见 [调研报告](docs/2026-ai-frontier-research.md)（位于 `demo` 分支）

**已阅读但待融合的方向**：多 Agent 自纠错流水线、SkillTFM 技能库演化、TabFM 零样本列理解、MCP 仪器协议。

---

## 目录

1. [架构概览](#1-架构概览)
2. [技术栈](#2-技术栈)
3. [AI 模型矩阵](#3-ai-模型矩阵)
4. [各路由实现审计](#4-各路由实现审计)
5. [数据流](#5-数据流)
6. [安全模型](#6-安全模型)
7. [已知限制](#7-已知限制)
8. [项目结构](#8-项目结构)
9. [本地开发](#9-本地开发)
10. [部署](#10-部署)
11. [下一步开发](#11-下一步开发)

---

## 1. 架构概览

### 1.1 分层架构

系统采用四层架构，每层有明确的职责边界。

| 层 | 位置 | 运行时 | 职责 |
|------|----------|---------|----------------|
| 展示层 | `src/routes/`, `src/components/` | 浏览器 | 页面渲染、用户交互、文件拖拽 |
| 业务逻辑层 | `src/lib/`（不含 `api/`） | 浏览器 | 状态管理、流水线编排、数据脱敏 |
| 服务端代理层 | `src/lib/api/` | Nitro (Node.js) | API Key 隔离、AI 网关转发、RAG 检索 |
| MCP 接口层 | `src/server.ts`, `src/lib/mcp-tools.ts` | Nitro (Node.js) | JSON-RPC 2.0 Streamable HTTP，向外部 AI Agent 暴露 8 个工具 |
| 基础设施层 | 外部服务 | 云端 | Supabase (数据库/存储/认证)、XJTLU AI Gateway、Vercel |

### 1.2 请求流转

所有 AI 调用强制走服务端代理——浏览器从不持有 API Key。

```
浏览器（文件上传）
  → 客户端脱敏扫描（31 条正则规则）
  → TanStack Server Function（Nitro handler）
  → 服务端二次扫描（仅告警）
  → XJTLU AI Gateway（从环境变量读取 Bearer token）
  → 响应返回浏览器
```

文件上传绕过服务端代理，从浏览器直传 Supabase Storage，避开 Vercel 的 4.5 MB serverless body 限制。

---

## 2. 技术栈

### 2.1 核心

| 组件 | 选型 | 理由 |
|-----------|-----------|-----------|
| 框架 | TanStack Start (React 19 + SSR) | 文件路由、server functions、Vercel 原生 |
| 构建 | Vite 7 + Nitro 3 | ESM 原生、快速 HMR、Vercel preset |
| 语言 | TypeScript 5.8，strict 模式 | 客户端/服务端全类型安全 |
| 包管理器 | Bun | 更快安装、24h 供应链安全策略（`bunfig.toml`） |
| 样式 | Tailwind CSS v4 + Radix UI | 原子化 CSS、tree-shaken、无障碍组件 |
| 表单/校验 | React Hook Form + Zod | 客户端校验 + 类型推导 |

### 2.2 数据层

| 组件 | 技术 | 用途 |
|-----------|-----------|---------|
| 主数据库 | Supabase (PostgreSQL 15) | 实验、用户、关系、审计、反馈 |
| 向量扩展 | pgvector 0.5+ | 1024 维余弦相似度搜索 |
| 文件存储 | Supabase Storage（S3 兼容） | 原始实验文件，bucket `experiment-files` |
| 认证 | Supabase Auth（邮箱/密码） | 会话管理、RLS 策略执行 |
| 实时 | Supabase Realtime | 当前未使用 |

### 2.3 外部 API

| 服务 | 端点 | 认证 | 速率限制 |
|---------|----------|---------------|------------|
| XJTLU AI Gateway | `aiagent.xjtlu.edu.cn/api/aigw/v1` | 每模型独立 Bearer token | 未知 |
| Materials Project | `api.materialsproject.org` | `MP_API_KEY` header | ~100 req/min |
| NIST Chemistry WebBook | `webbook.nist.gov/api/cgi.cgi` | 无（公开） | 1 req/s（自限流） |

---

## 3. AI 模型矩阵

四模型协同，每个模型独立 API Key，全部通过 XJTLU AI Gateway（火山引擎后端）。

| 模型 | Gateway ID | 功能 | 平均延迟 | 状态 |
|-------|-----------|----------|:-----------:|:------:|
| DeepSeek V4 Pro | `d8j2d4r9dhtg6s3fevfg` | 文本理解、推理、结构化提取、RAG 生成 | 3.0s | 正常 |
| Qwen3-VL-8B-Instruct | `d95koqj7u3anoctav5sg` | 视觉识别（SEM/TEM 显微图像、仪器读数、标尺） | 2.2s | 正常 |
| Qwen3-Embedding-8B | `d8egv6v9ohgtar18hvrg` | 文本转向量（1024 维），语义搜索 | 0.9s | 降级 |
| Qwen3-Reranker-8B | `d8efv05lt96sitl7kjcg` | 搜索结果精排，提升 RAG 精度 | 0.3s | 正常 |
| ASR（语音转文字） | N/A | 语音笔记转录 | N/A | 不可用 |

### 3.1 Embedding 降级

当前网关的 Embedding 端点频繁返回空数组。代码在 `src/lib/api/ai.functions.ts`（`generateEmbedding`）中显式处理：
- 成功：1024 维浮点向量写入 `experiments.embedding`
- 失败：返回 `[]`，下游降级：
  - RAG 回退到 PostgreSQL `ILIKE` 关键词搜索
  - 知识图谱语义边不生成（余弦相似度不可用）
  - `experiment_chunks` 表不填充

### 3.2 Key 隔离

每个模型使用独立 API Key。环境变量在 Vercel Dashboard 按模型配置，客户端永远不可见。`src/lib/config.server.ts` 在请求时读取。

```
AI_API_KEY          → DeepSeek V4 Pro
AI_VISION_KEY       → Qwen3-VL
AI_EMBEDDING_KEY    → Qwen3-Embedding
AI_RERANK_KEY       → Qwen3-Reranker
```

已实测验证：一个模型的 Key 用于另一个模型会返回 HTTP 403。

---

## 4. 各路由实现审计

### 4.1 `/workbench` — 实验工作台

**功能完整度：90%**

主要用户页面。三栏布局：数据输入（左）、卡片编辑器（中）、RAG 问答（右）。

| 功能 | 实现 | 状态 |
|---------|---------------|--------|
| 实验 CRUD | Supabase `experiments` 表，乐观本地状态，fire-and-forget 写库 | 真实 |
| AI 解析流水线 | `multimodal-parser.ts` `runPipeline()`：读取→分析→提取→合并。文本→DeepSeek V4 Pro，图片→Qwen3-VL，CSV→本地统计+DeepSeek。批次大小 5，文件间延迟 200ms | 真实 |
| 文件存储上传 | 客户端直传 Supabase Storage bucket `experiment-files`。路径格式：`{userId}/{expId}/{timestamp}-{filename}`。RLS 强制隔离 | 真实 |
| RAG 问答 | 服务端流水线：query rewrite → embedding/keyword 搜索 → reranker → DeepSeek SSE 流式。返回来源文档引用和置信度。反馈写入 `rag_feedback` | 真实 |
| 一键补全 | `autoFillExperiment()`：DeepSeek 推断缺失字段，推断字段在 UI 中标注 | 真实 |
| 重新解析 | `reparseExperimentFiles()`：DeepSeek 重新分析附件内容，修正遗漏/错误 | 真实 |
| 置信度校准 | `confidence.ts`：带 logprobs 的 API 调用。字段值映射到 token span，聚合平均 logprob，转为 0-100 分数。logprobs 不可用时回退到基于长度的启发式 | 真实，有降级 |
| 实验关系 | `experiment_relations` 表 CRUD。AI 建议通过 `suggestRelations()`（DeepSeek 调用） | 真实 |
| 导出 | JSON/Markdown 客户端 Blob 下载。PDF 通过 `window.print()` | 真实 |
| 历史文件重新解析 | 按钮存在但仅显示 toast 提示，不实际处理已存储文件 | 占位 |
| Electron 文件夹监听 | `useElectron.ts` 检测 `window.labnote` API。浏览器中该 API 不存在（此仓库无 Electron main process），面板始终显示浏览器回退提示 | 浏览器中无效 |

### 4.2 `/checklist` — 复现审计

**功能完整度：88%**

将论文 Methods 拆解为结构化、置信度标注的参数列表。

| 功能 | 实现 | 状态 |
|---------|---------------|--------|
| 论文拆解 | 6 阶段流水线（`paper-decomposer.ts`）：化学式提取(regex) → DeepSeek 拆解 → 领域知识增强(69条目) → Materials Project API → NIST WebBook API → 审计生成。结果写入 Supabase `reproduction_audits` | 真实 |
| 置信度评分 | `calculateReproducibilityScore()`：纯函数。`score = avgConfidence - criticalPenalty(max 20) - gapPenalty(每缺口5分，max 30)`。钳位 0-100 | 真实 |
| 确定性四级分类 | explicit(100%) → implied(85%) → inferred(55%) → unknown(0%)。每个参数带来源标签、论文原文引用、推断依据 | 真实 |
| 外部知识 | Materials Project REST API（材料属性） + NIST WebBook（热力学数据）。均非阻塞：单个失败不阻止审计完成 | 真实 |
| 预设论文 | 7 篇论文的预构建 Audit 数据（`paper-test-data.ts`）。预设数据在 UI 中标注为演示快捷方式。底层 Methods 文本来自真实已发表论文（DOI 已记录） | 演示数据，真实论文 |
| 脱敏 | `sanitizer/` 模块：31 条正则检测规则。客户端扫描+用户确认弹窗；服务端告警级二次扫描 | 真实 |
| 协议生成 | `generateReproductionProtocol()`：纯函数，输出结构化 Markdown（含安全防护、设备清单、分步协议） | 真实 |
| 进度展示 | 六步进度条。步骤 4（MP）和 5（NIST）为视觉展示——服务端无实时进度回调，进度靠轮询 `fetchAudits` 驱动 | 视觉展示 |

### 4.3 `/graph` — 知识图谱

**功能完整度：90%**

实验实体及关系的力导向可视化。

| 功能 | 实现 | 状态 |
|---------|---------------|--------|
| 布局引擎 | d3-force 仿真，可配置电荷/距离/重力参数 | 真实 |
| 渲染 | SVG + React + d3-zoom 缩放平移。节点颜色按类型区分 | 真实 |
| 实体去重 | `buildGraphData()` 合并同 sample ID/device name/operator 的节点。一个实体 = 一个节点 | 真实 |
| 关系类型 | 共享实体边、时序边、语义边（embedding 余弦相似度 > 0.75） | 真实，依赖 embedding |
| 交互 | 节点拖拽、悬停高亮 1-hop 邻居、搜索自定位、N-hop 本地图模式、SVG 导出 | 真实 |

### 4.4 `/assets` — 实验资产库

**功能完整度：95%**

只读的实验卡片清单视图。统计数据（总数、完整率、参数数、学科分布）从 Supabase 实时计算。支持 JSON/Markdown 导出。无写操作，无硬编码数据。

### 4.5 `/settings` — 用户设置

**功能完整度：90%**

个人信息（姓名/机构/学科）从 Supabase `profiles` 加载，保存时 upsert。学科模板为静态配置，非用户可自定义。

### 4.6 `/login`、`/signup` — 认证

**功能完整度：100%**

Supabase Auth 邮箱/密码登录注册。`RequireAuth` 组件保护路由：生产环境重定向到 `/login`，开发模式（`import.meta.env.DEV`）绕过。

### 4.7 `/compare` — 治理对比

**功能完整度：70%**

单个实验的前后对比展示。字段完整性、参数列表、AI 洞察从真实数据计算。媒体预览使用 `/media/` 本地路径而非 Supabase Storage URL，用户上传文件会显示破损预览。

### 4.8 `/paper` — 论文辅助

**功能完整度：50%**

实验选择和草稿编辑区操作真实 Supabase 数据。"AI 生成 Methods" 按钮使用 `setTimeout(1100ms)` + 本地模板函数，未调 AI。导出产生 `.doc` 扩展名的 Markdown 文件，非有效 Word 文档。

### 4.9 `/` — 首页

**功能完整度：35%**

Hero 上传区真实可用（文件转发到 `/workbench` 处理）。最近实验列表从 Supabase 读取。Dashboard 统计、工作流动画、能力卡片、推荐语均为静态营销内容。Dashboard 计数器已去掉硬编码偏移量（`+128`），改为仅展示 `experiments.length` 和计算的完整率。

### 4.10 已移至 demo 分支的页面

| 路由 | 移除原因 | 保留位置 |
|-------|--------|-------------|
| `/agent` | 100% 硬编码：MCP 服务器列表、工具注册表、状态面板、token 计数器，全部静态常量。无 API 调用，无持久化 | `demo` 分支 |
| `/handoff` | 88% 硬编码：仅实验列表（5 条）从 Supabase 读取。负责人姓名、统计数据、经验总结、异常记录均为虚构静态数据 | `demo` 分支 |

---

## 5. 数据流

### 5.1 实验采集流水线

```
用户拖放文件
  → 文件类型检测（扩展名 + MIME）
  → 内容提取（文本：File.text()，图片：FileReader base64）
  → 逐文件 AI 解析（文本→DeepSeek V4 Pro，图片→Qwen3-VL，CSV→本地统计+DeepSeek）
     批次大小：5 文件，文件间延迟：200ms
  → 跨文件合并（DeepSeek 去重+整合）
  → AI 响应 JSON 提取（去除 markdown 代码块、片段修复）
  → 实验卡片创建（多字段 schema）
  → 文件上传到 Supabase Storage（客户端直传）
  → 数据库写入（乐观本地状态 + fire-and-forget Supabase insert）
  → 可选：一键补全缺失字段（DeepSeek）
  → 可选：置信度校准（logprobs 或启发式）
```

### 5.2 RAG 查询流水线

```
用户提交问题
  → Query rewrite（DeepSeek：模糊问题→精确搜索词）
  → Embedding 生成（Qwen3-Embedding，1024 维）
     embedding 成功：
       → pgvector match_experiment_chunks（余弦相似度，阈值 0.55）
       → pgvector hybrid_search_experiments（全文+向量混合检索）
     embedding 失败（空数组）：
       → PostgreSQL ILIKE 关键词搜索
       → 相似度硬编码为 0.5（已记录降级行为）
  → Reranker（Qwen3-Reranker 对检索结果重新打分）
  → LLM 生成（DeepSeek，SSE 流式输出）
     来源文档作为 SSE 首个事件，先于 token 流发送
  → 响应缓存（LRU，100 条，30 分钟 TTL，仅内存）
```

### 5.3 论文拆解流水线

```
用户提交论文 Methods 文本（或选择预设）
  → Stage 1：化学式提取（regex 匹配元素模式）
  → Stage 2：DeepSeek 拆解（system prompt ~800 chars，JSON schema 输出）
  → Stage 3：领域知识增强（69 条目静态知识库，关键词匹配打分）
  → Stage 4：Materials Project API 查询（每个提取的化学式，非阻塞）
  → Stage 5：NIST WebBook API 查询（每个识别的化合物，300ms 限流）
  → Stage 6：Audit 组装 + Supabase 持久化
  → 客户端每 2s 轮询 fetchAudits 直到数据出现
```

---

## 6. 安全模型

### 6.1 API Key 保护

API Key 存储为 Vercel 环境变量，由 `config.server.ts` 在请求时读取，注入 server function handler。浏览器永远无法访问任何 AI API Key。Server functions 使用 TanStack Start 的 `createServerFn`，其 handler 代码仅在 Nitro 服务端运行时执行。

### 6.2 数据隔离

Supabase 行级安全（RLS）在数据库层强制执行用户数据隔离。策略定义在 `experiments`、`profiles`、`reproduction_audits`、`experiment_relations` 表上。每个策略限制 `SELECT/INSERT/UPDATE/DELETE` 仅作用于 `user_id = auth.uid()` 的行。`supabase.ts` 中的应用程序级 `user_id` 过滤提供第二层保护。

`SUPABASE_SERVICE_ROLE_KEY` 仅服务端使用，用于必须绕过 RLS 的操作（Storage 文件删除、审计持久化）。客户端永远不可见。

### 6.3 数据脱敏

`sanitizer/` 模块（`src/lib/sanitizer/`）提供双层防御：

**第一层——客户端（阻塞）：**
- `detector.ts`：31 条正则规则，覆盖身份证号、手机号、邮箱、人名、机构地址、GPS 坐标、CAS 号、专利号、API Key 模式等
- `transformer.ts`：位置感知替换引擎，支持 mask/redact/placeholder/blur/generalize 策略。反向遍历保持字符偏移
- 中风险匹配需用户确认。高风险匹配阻止发送直到人工审核

**第二层——服务端（仅告警）：**
- `chatCompletion` handler 对发出内容重新扫描。高风险匹配详细记录但不阻止——假设客户端扫描已获得用户同意

**审计轨迹：**
- `audit-log.ts`：SHA-256 内容哈希（浏览器端 Web Crypto API，服务端 Node crypto）。条目写入 localStorage（`labnote_api_audit_log`）和 Supabase `api_send_logs` 表。审计日志中不存储原始内容

### 6.4 认证

Supabase Auth 邮箱/密码。会话通过 `@supabase/ssr` cookie 管理。`RequireAuth` 组件包裹所有需认证路由。通过 `onAuthStateChange` 订阅监听认证状态变化。

---

## 7. 已知限制

### 7.1 AI / API

- **Embedding 服务降级**：XJTLU 网关频繁返回空 embedding 数组。语义搜索和知识图谱语义边在这些时段不可用。关键词回退可用但质量较低
- **PDF/DOCX/XLSX 伪解析**：二进制文档格式用 `File.text()` 读取，产生乱码送给 AI。仅纯文本格式（TXT/MD/LOG/JSON/XML/CSV）和图片可正确解析
- **ASR 不可用**：语音识别模型需 WebSocket 连接，XJTLU 网关不支持 WebSocket 转发
- **Logprobs 依赖**：置信度校准引擎依赖网关返回 logprobs。不可用时回退到基于长度的启发式

### 7.2 前端

- **首页**：Dashboard 计数器已改为实时数据，但工作流动画、能力卡片、营销区仍为静态内容
- **论文辅助**：「AI 生成」按钮是 `setTimeout` 套本地模板函数，未调 LLM。导出产生伪 Word 文档
- **治理对比**：媒体预览路径硬编码为 `/media/`，用户上传文件显示破损
- **路由保护**：开发模式绕过。生产行为未在 staging 环境测试

### 7.3 数据

- **Embedding 列**：`experiments.embedding` 仅在 `generateEmbedding` 返回有效向量时填充，当前生产网关罕见成功
- **文件附件持久化**：`addFileToExperiment` 和 `removeFileFromExperiment` 仅更新本地 React 状态，不独立写库。工作台上传流水线在其流程中处理持久化
- **RAG 关键词回退相似度**：embedding 不可用时，所有关键词匹配结果分配固定相似度 0.5（任意值，已在 `rag.functions.ts` 中记录）

### 7.4 基础设施

- **Electron 桌面客户端**：渲染端集成代码存在（`src/lib/electron/`），但无 Electron main process、preload 脚本或 `electron` 依赖。`window.labnote` 从未注入，文件夹监听面板始终显示浏览器回退提示
- **Python 环境**：Day4 device gateway 需 Python 运行时。开发机上 Python 安装有问题（exit code 49），阻止 gateway 运行
- **无 CI/CD 测试**：push 时无自动测试。Playwright E2E 测试存在于 `test-harness/` 但未纳入 Vercel 构建流水线

---

## 8. 项目结构

```
labnote-vault-main/
|
|-- src/
|   |-- server.ts                  # MCP Streamable HTTP 端点
|   |
|   |-- routes/                    # 文件路由（TanStack Start）
|   |   |-- __root.tsx             # 根布局、导航栏、认证包裹
|   |   |-- index.tsx              # /          首页
|   |   |-- workbench.tsx          # /workbench  工作台
|   |   |-- checklist.tsx          # /checklist  复现审计
|   |   |-- graph.tsx              # /graph      知识图谱
|   |   |-- paper.tsx              # /paper      论文辅助
|   |   |-- compare.tsx            # /compare    治理对比
|   |   |-- assets.tsx             # /assets     资产库
|   |   |-- settings.tsx           # /settings   用户设置
|   |   |-- login.tsx              # /login      登录
|   |   |-- signup.tsx             # /signup     注册
|   |   |-- help.tsx               # /help       静态文档
|   |   +-- auth/callback.tsx      # OAuth 回调
|   |
|   |-- lib/
|   |   |-- exp-core.ts            # 核心类型：ExperimentDoc, Template, FieldGroup
|   |   |-- property-utils.ts      # 动态属性路径 get/set/merge/coerce
|   |   |-- prompt-builder.ts      # 从 Template 动态生成 AI prompt
|   |   |-- constraint-validator.ts # 物理约束引擎（61 模板约束 + 11 通用定律）
|   |   |-- validator-agent.ts     # 实验文档校验 Agent
|   |   |-- corrector-agent.ts     # 校验失败后自动修正 Agent
|   |   |-- mcp-tools.ts           # MCP 工具实现（与前端共享领域模块）
|   |   |-- field-patterns.ts      # 自演化字段统计（客户端）
|   |   |
|   |   |-- api/                   # Server Functions（仅 Nitro 运行时）
|   |   |   |-- ai.functions.ts        # chat、embedding、rerank、logprobs
|   |   |   |-- rag.functions.ts       # RAG 搜索、流式回答
|   |   |   |-- decompose.functions.ts # 论文拆解编排
|   |   |   |-- materials-project.functions.ts  # MP API 代理
|   |   |   |-- nist.functions.ts      # NIST API 代理
|   |   |   |-- template.functions.ts  # 模板 CRUD + seed
|   |   |   +-- field-patterns.functions.ts  # 字段模式统计
|   |   |
|   |   |-- templates/
|   |   |   +-- presets.ts          # 27 个预设模板定义
|   |   |
|   |   |-- deepseek.ts            # 客户端 AI 调用封装（调 server fns）
|   |   |-- multimodal-parser.ts   # 多阶段文件解析 + Validator/Corrector 流水线
|   |   |-- confidence.ts          # Token 级 logprobs 校准引擎
|   |   |-- paper-decomposer.ts    # 论文拆解（MP/NIST 增强）
|   |   |-- reproduction-audit.ts  # 审计评分、缺口分析、协议生成
|   |   |-- domain-knowledge.ts    # 69 条目静态知识库（真实引用）
|   |   |-- paper-test-data.ts     # 7 篇预设论文演示数据
|   |   |-- labStore.tsx           # 全局实验状态（React Context，新 ExperimentDoc 类型）
|   |   |-- supabase.ts            # 浏览器 Supabase 客户端
|   |   |-- supabase-server.server.ts  # Service-role 客户端（绕过 RLS）
|   |   |-- storage.server.ts      # 服务端文件上传/删除
|   |   |-- auth-context.tsx       # 认证状态 provider
|   |   |-- auth-client.ts         # 浏览器 Supabase 客户端工厂
|   |   |-- auth-guard.tsx         # 路由保护包裹组件
|   |   |-- config.server.ts       # 环境变量读取（仅服务端）
|   |   |-- proxy-fetch.server.ts  # HTTP_PROXY 感知的 fetch 封装
|   |   |-- experiment-utils.ts    # toRow/fromRow/buildDbPatch（动态映射）
|   |   |-- json-parser.ts         # AI 响应 JSON 提取（通用 asPartialDoc）
|   |   |-- persistence.ts         # 实验持久化层
|   |   |-- graph-types.ts         # 图谱节点/边类型定义
|   |   |-- graph-data.ts          # 图谱构建逻辑（从 properties 提取实体）
|   |   |-- sanitizer/             # 数据脱敏模块
|   |   |   |-- detector.ts        # 31 条正则扫描器
|   |   |   |-- transformer.ts     # 位置感知替换引擎
|   |   |   |-- patterns.ts        # 正则规则定义
|   |   |   |-- audit-log.ts       # SHA-256 哈希审计轨迹
|   |   |   +-- types.ts           # 共享类型
|   |   |-- electron/              # Electron 渲染端集成（无 main process）
|   |   |   |-- useElectron.ts     # window.labnote API 的 React hook
|   |   |   |-- FolderWatcherPanel.tsx  # 监听面板 UI 组件
|   |   |   +-- globals.d.ts       # window.labnote 类型声明
|   |   |
|   |   +-- [legacy files]         # 见 8.1 节
|   |
|   |-- components/
|   |   |-- ui/                    # shadcn/ui 原语（50+ 组件）
|   |   |-- fields/
|   |   |   |-- DynamicCardEditor.tsx  # 配置驱动的实验卡片编辑器
|   |   |   +-- DynamicField.tsx       # FieldDef → 输入控件映射
|   |   |-- ForceGraph.tsx         # d3-force SVG 渲染
|   |   |-- GraphSearch.tsx        # 节点搜索（自动补全）
|   |   |-- ExperimentSummary.tsx  # 实验卡片摘要视图（从 properties 提取）
|   |   |-- FeedbackDialog.tsx     # 全局反馈弹窗
|   |   +-- usage-dashboard.tsx    # API 用量和费用面板
|   |
|   +-- hooks/
|       |-- useGraphData.ts        # 图谱数据获取和缓存
|       +-- useForceSimulation.ts  # d3-force 生命周期管理
|
|-- scripts/                       # 运维脚本
|   |-- p0-migration-step0.sql     # 迁移 Step 0：备份
|   |-- p0-migration-step1.sql     # 迁移 Step 1：回填旧列→properties
|   |-- p0-migration-step2.sql     # 迁移 Step 2：删旧列、建 field_patterns/templates
|   |-- seed-presets.ts            # 27 个模板 seed 到 Supabase
|   |-- template-research-prompt.md # Gemini 调研 prompt
|   +-- download-media.mjs         # 媒体下载脚本
|
|-- supabase/
|   +-- migrations/
|       +-- 20260731_phase1_enriched_experiment.sql  # ⚠️ 不执行
|       +-- 20260810_dynamic_store.sql  # Dynamic Document Store 迁移
|
|-- docs/
|   |-- agent-usage-guide.md       # 最终用户使用指南
|   |-- product-intro.md           # 产品介绍（385 字符）
|   |-- mcp-competition-submission.md  # MCP 比赛提交说明
|   +-- remaining-tasks-for-codex.md   # Codex 执行任务清单
|
|-- test-harness/                  # 测试
|   +-- pipeline-validation.test.ts # 流水线验证测试
|-- public/                        # 静态资源
|-- package.json
|-- vite.config.ts                 # Vite + TanStack Start + Nitro 配置
|-- tsconfig.json
|-- bunfig.toml                    # Bun 供应链安全策略
+-- README.md
```

---

## 9. 本地开发

### 9.1 前置条件

- Bun >= 1.1
- Git
- Supabase CLI（可选，用于本地数据库）

### 9.2 配置

```bash
bun install
cp .env.example .env.local
# 编辑 .env.local 填入实际 key
```

### 9.3 环境变量

所有变量在 `.env.local` 中（不提交）：

```env
# Supabase
VITE_SUPABASE_URL=https://kwwjdrwcvgjbjxtewbnk.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_URL=https://kwwjdrwcvgjbjxtewbnk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# AI Gateway（每个模型独立 key）
AI_API_KEY=<deepseek-key>
AI_EMBEDDING_KEY=<embedding-key>
AI_VISION_KEY=<vision-key>
AI_RERANK_KEY=<reranker-key>

# Materials Project
MP_API_KEY=<mp-key>

# HTTP 代理（中国大陆访问外部 API 必需）
HTTP_PROXY=http://127.0.0.1:7897
HTTPS_PROXY=http://127.0.0.1:7897
```

### 9.4 命令

```bash
bun run dev          # 启动 Vite 开发服务器（默认端口 3000）
npx vite build       # 生产构建 → .output/
npx vite preview     # 本地预览生产构建
```

---

## 10. 部署

### 10.1 生产环境

- **URL**: https://labnote-vault-main.vercel.app
- **平台**: Vercel（Hobby plan）
- **Nitro preset**: `vercel`（在 `vite.config.ts` 中配置）
- **触发**: Push 到 `master` 分支 → 自动构建+部署

### 10.2 环境变量（Vercel Dashboard）

第 9.3 节所有变量在 Vercel Dashboard 中配置。`VITE_*` 前缀变量在构建时和浏览器中可用。非 `VITE_*` 变量仅服务端可用。

### 10.3 构建

Vercel 构建使用 Nitro Vercel preset。TanStack Start 将 server functions 编译为 Nitro handlers。静态资源从 Vercel 边缘 CDN 提供。Server functions 作为 Vercel serverless functions 执行（Node.js 运行时）。

### 10.4 仓库

- **GitHub**: `DiqingTang25/labnote-agent`（private）
- **分支**:
  - `master` — 生产代码，仅真实功能
  - `demo` — 完整项目快照，含演示/mock 页面（`/agent`、`/handoff`）

---

## 11. 下一步开发

### 11.1 当前架构：Dynamic Document Store

**已实现。** 实验数据模型已从 40+ 硬编码字段迁移至 `ExperimentDoc`（8 索引列 + `properties JSONB` + `files JSONB`）。27 个模板的 `fieldGroups` 同时驱动 UI（`DynamicCardEditor`）和 AI prompt（`prompt-builder.ts`）。物理约束引擎（61+11 条）在校验阶段自动执行。字段统计（`field_patterns` 表）在数据积累中持续更新。

### 11.2 优先任务

| 优先级 | 任务 | 说明 |
|:----:|------|------|
| P0 | 执行 Supabase 迁移 | 运行 `scripts/p0-migration-step{0,1,2}.sql`，迁移现有数据 |
| P0 | Seed 27 个模板 | 运行 `scripts/seed-presets.ts`，填充 `templates` 表 |
| P1 | 多 Agent 流水线集成测试 | `validator-agent.ts` + `corrector-agent.ts` 已实现，需在 `runPipeline` 中端到端测试 |
| P2 | 静态页面适配 | `compare.tsx`、`assets.tsx`、`index.tsx`、`graph.tsx` 的旧字段引用（`.purpose`、`.device` 等）→ `getProperty(props, path)` |
| P3 | 技能库自演化集成 | `detectEmergingFields` + `AddFieldDialog` 候选建议已实现，需与 UI 联调 |
| P4 | 零样本 CSV 列语义识别 | LLM 辅助列类型理解（列名→物理含义→单位推断） |
| — | Pipeline 验证测试 | `test-harness/pipeline-validation.test.ts` 58/61 通过，3 个边缘案例待修复 |

### 11.3 自演化架构

系统设计为随数据积累自行演化，无需手动定义字段：

1. **字段涌现** — `field_patterns` 表按 `experiment_type` 统计每个字段的出现频率、值分布、共现关系。同类实验积累 ≥5 个后，高频 extra 字段自动建议纳入模板
2. **模板演化** — 用户确认字段建议后，`templates.field_groups` 更新。下次同类型实验自动按新模板渲染和提取
3. **约束发现** — 从 `field_patterns.value_stats` 中自动推断数值字段的常见范围（均值 ± 3σ），作为软约束补充到模板
4. **冷启动策略** — 27 个预设模板（源自 NOMAD/MLflow/Allotrope ASM/CDISC 等国际标准）提供初始覆盖。种子数据积累后自演化接管

### 11.4 2026 前沿方向（已调研，待融合）

| 方向 | 来源 | 融合点 |
|------|------|--------|
| 多 Agent 自纠错 | The AI Scientist v2, Robin | Validator→Corrector 循环（已实现框架，待深度集成） |
| 技能库演化 | SkillTFM (gate evolution) | `field_patterns` → 模板自动更新 |
| 零样本列理解 | Google TabFM | CSV 列名 → 物理含义（P4 任务） |
| MCP 仪器连接 | MCP 协议 | `/mcp` 端点已上线，下一步连接真实仪器 |
| 结构化提取 | HARMON-E (F1=0.93), nanoMINER (precision=0.98) | 改进多模态提取 prompt 质量 |
| FAIR 自动合规 | Herbie (2026) | 从 Template 自动生成 FAIR 元数据 |

详见 [调研报告](docs/2026-ai-frontier-research.md)（位于 `demo` 分支）

### 11.5 记忆文件

关键设计决策记录在 Claude Memory 中：
- `current-state.md` — 项目整体状态（API 迁移、对象存储、4 模型上线）
- `dynamic-experiment-card.md` — 自演化模型架构讨论（固定模板→字段涌现）
- `knowledge-graph-architecture.md` — d3-force + 实体去重 + Supabase 关系
- `reproduction-audit.md` — 论文拆解 + 置信度推断 + 复现协议
- `ai-analysis-refactor.md` — Token-level 置信度校准引擎
- `实验复现工作台.md` — 复现审计入口（说"实验复现"自动加载）
