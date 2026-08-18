# LabNote Agent

面向高校实验室与科研课题组的 AI 实验数据治理与论文复现平台。

> **生产环境**：https://labnote.tech
> **仓库**：[DiqingTang25/labnote-agent](https://github.com/DiqingTang25/labnote-agent)

---

## 1. 项目介绍

### 1.1 是什么

LabNote Agent 解决科研数据的三个核心痛点：**记录乱**（实验散落在文件/纸质/个人电脑）、**不可复现**（数据缺上下文无法复算）、**知识不流动**（课题组内经验无法复用）。

系统将任意格式的实验记录（PDF/DOCX/XLSX/CSV/图片/音频等）经 AI 解析为结构化实验卡片，提供物理约束校验、论文复现审计、知识图谱与 RAG 问答，并支持课题组级协作（团队空间、权限、模板库）。

### 1.2 核心功能

| 功能 | 页面 | 说明 |
|------|------|------|
| 实验工作台 | `/workbench` | 文件拖拽 → 多模态 AI 解析 → 结构化实验卡片（动态模板驱动） |
| 实验复现 | `/checklist` | 论文拆解 + 缺口分析 + 置信度推断 + 复现协议 |
| 知识图谱 | `/graph` | 实验/方法/设备/材料实体关系图（d3-force） |
| 知识问答 | 工作台右侧 | RAG 检索（向量 + BM25 混合 + Rerank + Query 改写） |
| 论文辅助 | `/paper` | 论文解析与结构化提取 |
| 实验资产 | `/assets` | 实验卡片检索与浏览 |
| 团队协作 | `/team` | 课题组空间：成员/邀请码/成果墙/项目/公告/动态/**团队模板库** |
| MCP 接口 | `/mcp` | 8 个工具，向外部 AI Agent 暴露模板/校验/分块/图谱能力 |

### 1.3 核心机制

- **零硬编码字段**：实验数据存 `properties JSONB`，27 个模板的 `fieldGroups` 同时驱动卡片 UI 与 AI 提取 prompt；字段从 `field_patterns` 统计中自演化
- **物理约束引擎**：61 条模板约束 + 11 条通用物理定律（温度 ≥ 0K、产率 ∈ [0,100%] 等），硬违反拒绝入库、范围偏离警告
- **四模型矩阵**：文本对话 / Embedding / 视觉 / Reranker，各自独立 API Key，全部经服务端代理（浏览器不持有 Key）
- **团队权限**：RLS 行级安全 + 服务端校验（owner/admin/member 三级）；团队模板库可复制预置模板并自定义字段
- **数据安全**：31 条脱敏正则（姓名/身份证/电话等）+ 服务端二次扫描 + API Key 隔离

### 1.4 技术栈

| 层 | 选型 |
|----|------|
| 框架 | TanStack Start（React 19 + SSR，文件路由 + Server Functions） |
| 构建 | Vite 7 + Nitro 3（Vercel preset） |
| 语言 | TypeScript（strict） |
| 样式 | Tailwind CSS v4 + Radix UI |
| 数据库 | Supabase（PostgreSQL 15 + pgvector + Storage + Auth + RLS） |
| AI | 自建 OpenAI 兼容网关（4 模型独立 Key）；Materials Project / NIST 公共 API |
| 测试 | Playwright（双账号 E2E）+ tsc 类型检查 |

### 1.5 架构

```
浏览器（文件上传）
  → 客户端脱敏扫描（31 条规则）
  → TanStack Server Function（Nitro handler，服务端持 AI Key）
  → AI Gateway / Supabase
  → 响应返回浏览器
```

文件上传直传 Supabase Storage（绕开 serverless 4.5MB body 限制）。

### 1.6 目录结构

```
src/
|-- server.ts                 # MCP Streamable HTTP 端点
|-- routes/                   # 文件路由（__root / workbench / checklist / graph /
|                             #   paper / compare / assets / team / login / help ...）
|-- lib/
|   |-- api/                  # Server Functions（AI 转发 / RAG / 团队 / 模板）
|   |-- exp-core.ts           # 核心类型：ExperimentDoc / Template / FieldGroup
|   |-- property-utils.ts     # 动态属性路径 get/set/merge
|   |-- templates/presets.ts  # 27 个预置模板（NOMAD/MLflow/CDISC 等标准）
|   |-- constraint-validator.ts  # 物理约束引擎
|   |-- labStore.tsx          # 全局状态（实验/工作空间/团队模板）
|   +-- mcp-tools.ts          # MCP 工具定义
|-- components/
|   |-- fields/DynamicCardEditor.tsx   # 模板驱动卡片编辑器
|   |-- TeamTemplatesTab.tsx           # 团队模板库（含字段编辑器）
|   +-- ui/                   # shadcn 风格基础组件
supabase/migrations/          # SQL 迁移（SQL Editor 手动执行，见 2.4）
test-harness/                 # Playwright E2E（团队双账号流程 + 截图脚本）
scripts/                      # 工具脚本（seed 模板 / 测试账号 / 数据清理）
docs/                         # 使用指南 / MCP 说明 / 产品介绍
```

---

## 2. 快速使用

### 2.1 前置条件

- [Bun](https://bun.sh) >= 1.1（或 npm 亦可，命令等价）
- Supabase 项目（含 pgvector 扩展）
- AI 网关 API Key（或任意 OpenAI 兼容端点 ×4 个模型）

### 2.2 安装与启动

```bash
git clone <repo-url>
cd labnote-vault-main
bun install
cp .env.example .env.local
# 编辑 .env.local 填入实际值（见 2.3）
bun run dev        # http://localhost:8080（端口被占会自动 +1）
```

### 2.3 环境变量（`.env.local`，不提交）

```env
# Supabase（VITE_ 前缀对浏览器可见，其余仅服务端）
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# AI 网关（每个模型独立 Key：对话 / Embedding / 视觉 / Rerank）
AI_API_KEY=<chat-key>
AI_EMBEDDING_KEY=<embedding-key>
AI_VISION_KEY=<vision-key>
AI_RERANK_KEY=<reranker-key>

# Materials Project（论文拆解材料属性查询，可选）
MP_API_KEY=<mp-key>

# 中国大陆访问外部 API 需要代理（Clash 默认端口 7897）
HTTP_PROXY=http://127.0.0.1:7897
HTTPS_PROXY=http://127.0.0.1:7897
```

### 2.4 数据库迁移

本项目不使用 Supabase CLI 迁移，SQL 文件在 `supabase/migrations/` 中按日期命名，**在 Supabase SQL Editor 手动执行**（新库按时间顺序全部执行；已有库只执行缺失部分）。关键文件：

| 文件 | 内容 |
|------|------|
| `20260810_dynamic_store.sql` | properties/files JSONB、templates、field_patterns |
| `20260816_teams.sql` | 团队表 + 成员/邀请码/成果/项目/公告 + RLS |
| `20260817_rag_fix_overloads.sql` | 修复 RAG 函数重载 + hybrid 类型错误 |
| `20260817_teams_rls_recursion_fix.sql` | 修复团队 RLS 无限递归（42P17） |
| `20260817_teams_slug_founded.sql` | teams.slug 唯一索引 + 成立年份 |

预置模板 seed：`bunx tsx --env-file=.env.local scripts/seed-presets.ts`（或登录后由服务端函数触发）。

### 2.5 测试

```bash
# 类型检查
bunx tsc --noEmit

# 团队双账号 E2E（需要先重置测试账号密码）
bunx tsx --env-file=.env.local scripts/reset-test-passwords.ts
E2E_BASE_URL=http://localhost:8080 bunx playwright test test-harness/team-e2e.spec.ts
# E2E_HEADLESS=1 静默运行；默认有头（可人工观看流程）

# UI 审阅截图（创建团队向导等）
E2E_BASE_URL=http://localhost:8080 bunx playwright test test-harness/ui-review-create-form.spec.ts
```

E2E 覆盖：建团 → 邀请码 → 输码加入 → 团队模板建/编辑/只读 → 团队实验可见 → 权限拦截 → 团队 RAG 问答 → 个人资产转团队 → 成果墙权限 → 移除成员，测试数据自动清理。

### 2.6 部署

- **平台**：Vercel（Hobby plan），Nitro `vercel` preset
- **触发**：push 到 `master` → 自动构建部署
- **环境变量**：2.3 节全部变量在 Vercel Dashboard 配置
- **分支**：`master`（生产）/ `demo`（演示快照与调研报告）

---

## 3. 进展与待办

### 3.1 已完成

| 时间 | 内容 |
|------|------|
| 2026-08 | **团队模式**：课题组空间、邀请码加入、三级权限、成果墙/项目/公告/动态、**团队模板库**（字段编辑器）、双账号 E2E（12 步全通过） |
| 2026-08 | RAG 混合检索（向量 + BM25 + Rerank + 查询改写）、团队范围问答 |
| 2026-08 | 数据模型迁移：40+ 固定列 → 8 索引列 + properties JSONB；27 个预置模板 seed |
| 2026-07 | 物理约束引擎（61+11 条）、动态卡片编辑器、模板驱动 AI Prompt |
| 2026-07 | MCP 端点上线（8 工具）、复现审计工作台、知识图谱、多模态解析流水线 |

### 3.2 待办

| 优先级 | 任务 | 说明 |
|:----:|------|------|
| P0 | 帮助页截图 | `public/help/` 的 fig-01~14 截图待补 |
| P1 | 多 Agent 流水线深度集成 | validator/corrector 循环已实现，待端到端联调 |
| P1 | 团队功能发布 | 团队代码已本地完成并 E2E 通过，待推送部署 |
| P2 | 技能库自演化联调 | `field_patterns` → 模板自动更新，UI 联调 |
| P2 | 零样本 CSV 列语义识别 | LLM 辅助列类型理解（TabFM 思路） |
| P3 | 真实邮箱验证 | 产品化前再启用（当前注册为假验证，方便测试） |
| P3 | MCP 仪器连接 | 端点已就绪，接入真实仪器协议 |

### 3.3 已调研待融合方向

多 Agent 自纠错（The AI Scientist v2 / Robin）、技能库演化（SkillTFM）、零样本列理解（Google TabFM）、结构化提取（HARMON-E F1=0.93 / nanoMINER）、FAIR 自动合规（Herbie）。详见 `docs/` 与 `demo` 分支调研报告。

### 3.4 相关文档

- `docs/agent-usage-guide.md` — 用户使用指南
- `docs/mcp-competition-submission.md` — MCP 比赛提交说明
- `docs/product-intro.md` — 产品介绍
