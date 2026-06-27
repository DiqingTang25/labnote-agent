# Prompt Improvement Suggestions — Iteration 1

Date: 2026-06-27T18:27:58.923Z

## Weak Spots Found

- **operatorMatch** (high, score=20): 在 EXTRACT_PROMPT 中强调：'operator字段必须提取操作人姓名（中文或英文），如果文件中有Dr./Prof./姓名等信息，必须提取'
- **purposeMatch** (medium, score=45): 强化 purpose 字段提取要求：'必须包含研究目标+研究对象+实验方法，至少20字'
- **nameMatch** (medium, score=48): 在用户消息中增加提示：'请为实验取一个具体、描述性的中文名称（如：小鼠海马体LTP电生理记录）'

## Recommended Changes

- // LOOP-I1: operatorMatch score=20 — 在 EXTRACT_PROMPT 中强调：'operator字段必须提取操作人姓名（中文或英文），如果文件中有Dr./Prof./姓名等信息，必须提取'
- // LOOP-I1: purposeMatch score=45 — 强化 purpose 字段提取要求：'必须包含研究目标+研究对象+实验方法，至少20字'
- // LOOP-I1: nameMatch score=48 — 在用户消息中增加提示：'请为实验取一个具体、描述性的中文名称（如：小鼠海马体LTP电生理记录）'

## Manual Steps Required

1. Apply the above changes to `src/lib/siliconflow.ts` (EXTRACT_PROMPT) or `src/lib/multimodal-parser.ts` (merge prompt)
2. Re-run the loop to verify improvements
