# LabNote Agent MCP — 比赛提交说明

## 公网 Streamable HTTP 地址

```text
https://labnote-vault-main.vercel.app/mcp
```

该端点实现 JSON-RPC 2.0 MCP Streamable HTTP 协议：`initialize`、`notifications/initialized`、`tools/list`、`tools/call`。请求使用 `POST` 和 `Content-Type: application/json`，不要求自定义请求头。

## LabNote MCP 能力

MCP 与 Web 前端共享同一套 TypeScript 领域模块，而非复制简化规则：

1. `list_labnote_templates`：完整动态模板目录（27 个模板、字段组、字段类型、单位、必填字段和约束）。
2. `match_labnote_template`：用现有关键词评分匹配实验类型。
3. `create_experiment_card_draft`：用真实 `ExperimentDoc`、`properties._meta.templateId` 和深度合并语义创建未保存草稿。
4. `validate_experiment_properties`：执行模板必填字段检查和物理/数值约束校验。
5. `build_experiment_rag_chunks`：使用 Web 端同一模板驱动的 RAG 分块逻辑。
6. `build_experiment_graph`：使用 Web 端同一实验图谱数据构建逻辑。
7. `apply_experiment_property_patches`：用动态点路径更新未保存实验草稿。
8. `parse_experiment_content`：复用现有 AI 文本/CSV 解析、动态模板 Prompt、脱敏和 JSON 归一化，返回未保存草稿。

所有工具默认只生成、校验或分析用户明确传入的内容；不会匿名写入、删除 Supabase 数据或上传附件。AI 解析工具按来源 IP 限制为每小时 5 次，输入长度最多 12,000 个字符；敏感数据先经现有脱敏器处理。

## 本地验证

```bash
bun run dev -- --host 127.0.0.1 --port 3001
curl.exe -X POST http://127.0.0.1:3001/mcp -H "content-type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-03-26\",\"capabilities\":{},\"clientInfo\":{\"name\":\"verifier\",\"version\":\"1.0.0\"}}}"
```

## 源码提交安全清单

可提交：应用源码、`docs/`、`.env.example`（仅占位符）、`package.json`、锁文件、Supabase 迁移文件。

不得提交或打包：

- `.env.local`、`.env`、`.env.production`
- `.vercel/`、`.output/`、`dist/`、`node_modules/`
- 任何真实 API key、service-role JWT、OIDC token、私钥、导出的生产数据
- 临时本地 MCP 验证输出、截图或包含请求凭据的日志

仓库 `.gitignore` 已排除上述环境变量、Vercel、依赖和构建目录。生成源码 ZIP 前应再次运行：

```bash
git ls-files -z | python -c "import sys; paths=sys.stdin.buffer.read().decode('utf-8','replace').split(chr(0)); blocked=('.env.local','.vercel/','node_modules/','dist/','.venv/','__pycache__/'); bad=[p for p in paths if p and any(x in p.lower() for x in blocked)]; print('BLOCKED PATHS:\\n'+'\\n'.join(bad) if bad else 'PASS')"
```
