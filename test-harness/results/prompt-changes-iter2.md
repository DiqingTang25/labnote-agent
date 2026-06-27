# Prompt Improvement Suggestions — Iteration 2

Date: 2026-06-27T18:40:32.311Z

## Weak Spots Found

- **disciplineMatch** (medium, score=40): 在系统提示中增加学科推断规则：'如果文件涉及电信号/电位记录→电生理学，如果涉及细胞迁移/免疫→免疫细胞生物学，如果涉及基因表达空间分布→空间转录组学'
- **operatorMatch** (medium, score=40): 在 EXTRACT_PROMPT 中强调：'operator字段必须提取操作人姓名（中文或英文），如果文件中有Dr./Prof./姓名等信息，必须提取'
- **deviceMatch** (medium, score=40): 强化设备提取：'device字段必须从文件内容中提取仪器名称、型号、厂商，如果提到了仪器品牌/型号（如Axopatch、Zeiss、JEOL等），必须填写'

## Recommended Changes

- // LOOP-I2: disciplineMatch score=40 — 在系统提示中增加学科推断规则：'如果文件涉及电信号/电位记录→电生理学，如果涉及细胞迁移/免疫→免疫细胞生物学，如果涉及基因表达空间分布→空间转录组学'
- // LOOP-I2: operatorMatch score=40 — 在 EXTRACT_PROMPT 中强调：'operator字段必须提取操作人姓名（中文或英文），如果文件中有Dr./Prof./姓名等信息，必须提取'
- // LOOP-I2: deviceMatch score=40 — 强化设备提取：'device字段必须从文件内容中提取仪器名称、型号、厂商，如果提到了仪器品牌/型号（如Axopatch、Zeiss、JEOL等），必须填写'

## Manual Steps Required

1. Apply the above changes to `src/lib/siliconflow.ts` (EXTRACT_PROMPT) or `src/lib/multimodal-parser.ts` (merge prompt)
2. Re-run the loop to verify improvements
