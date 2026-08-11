# LabNote Agent — Contributor Access Policy

本文档定义外部协作者的权限边界与协作工作流。

---

## 推荐方案：GitHub Pro + Protected Branch（$4/月）

升级后所有人都可以享有 **Write 权限 + 强制 PR Review** 的标准开发体验：

1. 你升级到 GitHub Pro
2. 给他们 Write 权限（可以推送 feature 分支）
3. 运行下面的命令配置分支保护，强制 master 必须 PR + 你审批才能合入

```bash
# 升级 GitHub Pro 后，运行此命令启用完整保护
gh api repos/DiqingTang25/labnote-agent/branches/master/protection \
  -X PUT \
  -F "required_status_checks[strict]=true" \
  -F "required_status_checks[contexts][]=vercel" \
  -F "enforce_admins=true" \
  -F "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "required_pull_request_reviews[require_code_owner_reviews]=true" \
  -F "required_pull_request_reviews[dismiss_stale_reviews]=true" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false" \
  -F "block_creations=true" \
  -F "required_conversation_resolution=true"
```

**效果：**
- ✅ 他们可以随意 push feature 分支
- ✅ 任何合入 master 的代码必须通过 PR
- ✅ PR 必须经过你（CODEOWNER）审批才能 merge
- ✅ 不允许 force push、不允许删除分支
- ✅ 对话未解决时不允许 merge

---

## 免费替代方案（不需要花钱）

如果不上 GitHub Pro，唯一能在技术上强制执行的方案是 **Fork 工作流**：

### 设置

1. 给他们 **Read** 权限（不要给 Write）
2. 他们 Fork 你的仓库
3. 他们在自己的 Fork 上开发
4. 从 Fork 向 `DiqingTang25/labnote-agent:master` 开 PR
5. 你 Review → 你 Merge

### 效果：
- ✅ 他们绝对无法写入你的仓库
- ✅ 所有代码合入必须经过你
- ❌ 略增加协作摩擦（fork sync 等问题）

---

## 不推荐的方式

**不要**给他们 Write 权限同时依赖口头约定"不能直接 push master"。GitHub Free 私人仓库无分支保护，有 Write 权限的人可以直接 push master 绕过审查。技术上不防人，全靠信任。

---

## Vercel 部署控制

Vercel 部署与你的个人 Vercel 账户绑定。

**确保：**
- [ ] 不在 Vercel `Settings → Team` 中邀请这两位成员
- [ ] 不在 Vercel `Settings → Git Integration` 中更改关联
- [ ] 定期检查 `Vercel Dashboard → Deployments` 确认无异常

他们即使有 GitHub Write 权限也**不能**触发 Vercel 部署，因为 Vercel 项目绑定的是你的账户。

---

## Supabase 隔离

Supabase 项目与你的个人账户绑定。

- [ ] 不分享 Supabase Dashboard 登录凭据
- [ ] Service Role Key 仅存在于 Vercel 环境变量中
- [ ] 所有 API Key 通过 Vercel 注入，不存于代码库

他们即使有全部源码也**不能**连接数据库或修改 Supabase 配置。

---

## 审计检查清单（每月一次）

```bash
# 1. 检查仓库协作者权限
gh api repos/DiqingTang25/labnote-agent/collaborators --jq '.[].login'

# 2. 检查最近合入的 PR（确认都是你批准的）
gh pr list --state merged --limit 10

# 3. 检查是否有人直接 push master（应该只有 PR merge commit）
git log --format="%h %an %s" --since="1 month ago" origin/master \
  | grep -v "DiqingTang" | grep -v "dependabot"

# 4. 检查 Vercel 部署历史
# 浏览器打开: https://vercel.com/diqing-tang/labnote-vault-main/deployments
```

---

最后更新: 2026-08-11
所有者: @DiqingTang25
