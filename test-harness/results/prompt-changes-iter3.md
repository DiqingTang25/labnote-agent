# Prompt Improvement Suggestions — Iteration 3

Date: 2026-06-27T18:56:26.821Z

## Weak Spots Found

- **operatorMatch** (high, score=20): 在 EXTRACT_PROMPT 中强调：'operator字段必须提取操作人姓名（中文或英文），如果文件中有Dr./Prof./姓名等信息，必须提取'
- **nameMatch** (medium, score=38): 添加指令：'实验名称必须反映实验核心内容，如【物种+实验类型+检测方法】'
- **purposeMatch** (medium, score=45): 强化 purpose 字段提取要求：'必须包含研究目标+研究对象+实验方法，至少20字'

## Recommended Changes

- // LOOP-I3: operatorMatch score=20 — 在 EXTRACT_PROMPT 中强调：'operator字段必须提取操作人姓名（中文或英文），如果文件中有Dr./Prof./姓名等信息，必须提取'
- // LOOP-I3: nameMatch score=38 — 添加指令：'实验名称必须反映实验核心内容，如【物种+实验类型+检测方法】'
- // LOOP-I3: purposeMatch score=45 — 强化 purpose 字段提取要求：'必须包含研究目标+研究对象+实验方法，至少20字'

## Manual Steps Required

1. Apply the above changes to `src/lib/siliconflow.ts` (EXTRACT_PROMPT) or `src/lib/multimodal-parser.ts` (merge prompt)
2. Re-run the loop to verify improvements
