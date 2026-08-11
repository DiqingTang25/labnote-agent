# LabNote Agent — Contributor Access Policy

本文档定义外部协作者的权限边界。任何违反此策略的行为应立即报告并撤销访问权限。

---

## 1. GitHub 仓库权限

### 协作者应获得的角色：**Read（只读）或 Triage**

在 `Settings → Collaborators` 中，为两位团队成员的 GitHub 账户分配以下权限：

| 角色 | 能做什么 | 不能做什么 |
|------|----------|------------|
| **Read** (推荐) | 查看代码、克隆仓库、打开 Issues | 推送任何分支、合并 PR、修改 Settings |
| **Triage** | Read + 管理 Issues/PR + 创建 Wiki | 推送任何分支、合并 PR、修改 Settings |
| **Write** ⚠️ | Read + 推送分支 + 直接合并 PR | 删除仓库、修改保护规则、管理协作者 |
| **Admin** 🔴 | 一切 | — |

**要求：绝对不要给 Write 或 Admin 权限。**

如果他们需要提交代码：
- 让他们 Fork 仓库
- 从 Fork 向 `master` 开 Pull Request
- 你作为唯一拥有 merge 权限的人做最终审查和合并

### GitHub Free 限制说明

当前仓库为 GitHub Free 私人仓库，不支持 API 配置分支保护规则。
以下策略手动执行可达到同等效果：

1. **不授予 Write/Admin 权限** → 没人能直接推送 master
2. **CODEOWNERS 文件**（`.github/CODEOWNERS`）→ 文档记录每份代码的负责人
3. **只接受 PR 贡献** → 所有外部变更必须经过你的审查

---

## 2. Vercel 部署控制

Vercel 部署与你的个人 Vercel 账户绑定。

**确保：**
- [ ] 不在 Vercel `Settings → Team` 中邀请这两位成员
- [ ] 不在 Vercel `Settings → Git Integration` 中更改关联的 GitHub 仓库
- [ ] 定期检查 `Vercel Dashboard → Deployments` 确认无异常部署

**他们即使有 GitHub Write 权限也做不到的：**
- 不能触发 Vercel 部署（Vercel 用的 service account 与你的账户绑定）
- 不能查看或修改 Vercel 环境变量（API Key 存在那里）
- 不能回滚或删除部署

---

## 3. Supabase 隔离

Supabase 项目 `kwwjdrwcvgjbjxtewbnk` 与你的 Supabase 账户绑定。

**确保：**
- [ ] 不在 Supabase `Project Settings → Team` 中邀请这两位成员
- [ ] 定期检查 `Supabase Dashboard → SQL Editor → Query History` 确认无未授权 SQL
- [ ] Service Role Key 仅存在于 Vercel 环境变量中（不在任何 `.env` 文件中提交）

**他们即使有 GitHub 源码也做不到的：**
- 不能连接数据库（anon key 仅限 RLS 过滤后的数据，service_role key 他们不知）
- 不能运行 SQL 迁移
- 不能修改 RLS 策略
- 不能访问 Storage

---

## 4. 审计检查清单（每月一次）

```bash
# 检查仓库协作者
gh api repos/DiqingTang25/labnote-agent/collaborators --jq '.[].login'

# 检查最近合并的 PR（确认都是你批准的）
gh pr list --state merged --limit 10

# 检查是否有非你本人的 commit 直接提交到 master
git log --format="%h %an %s" --since="1 month ago" origin/master | grep -v "DiqingTang"

# 检查 Vercel 部署历史
# 在浏览器中打开: https://vercel.com/diqing-tang/labnote-vault-main/deployments
```

---

## 5. 如果升级到 GitHub Pro

升级后（$4/月），可通过以下命令启用完整分支保护：

```bash
gh api repos/DiqingTang25/labnote-agent/branches/master/protection -X PUT -F '{
  "required_status_checks": { "strict": true, "contexts": [] },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": true,
  "required_conversation_resolution": true
}'
```

---

最后更新: 2026-08-11
所有者: @DiqingTang25
