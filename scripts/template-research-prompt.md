# AI 提示词：搜寻开源实验记录模板

复制以下内容发送给 AI（DeepSeek / Claude / GPT 等）：

---

你是科研数据治理专家。我需要为电子实验记录本 (ELN) 系统构建**实验类型模板库**。

请帮我找到以下领域**真实在用的开源/公开实验记录模板**：

## 目标领域（按优先级）

### 1. 计算化学 / 材料模拟
- DFT 计算（VASP / Quantum ESPRESSO / CP2K 等）
- 分子动力学（GROMACS / LAMMPS / NAMD 等）
- 相场模拟 / 有限元 / 蒙特卡洛

### 2. 机器学习 / AI 实验
- 模型训练记录（类似 W&B / MLflow / Neptune 的 metadata schema）
- 超参数搜索 / 消融实验 / 对比实验

### 3. 统计分析 / 数据科学
- 回归 / ANOVA / 假设检验
- 贝叶斯推断 / 生存分析

### 4. 数据工程 / ETL 流水线
- 数据处理 pipeline 记录
- 数据质量报告

### 5. 湿实验（化学/材料/生物）
- 合成实验（水热、溶胶凝胶、共沉淀等）
- 表征测试（XRD、SEM、TEM、TGA、BET 等）
- 细胞实验 / PCR / 蛋白质纯化

## 我需要你找到

对每个领域，搜索并列出：

1. **开源项目/平台的实际 schema**
   - 比如：NOMAD Oasis 的 schema 定义文件
   - 比如：OpenELN / eLabFTW / RSpace 的字段配置
   - 比如：ISA-TAB 的 investigation/study/assay 模板
   - 比如：Materials Project 的 metadata schema
   - 比如：MLflow / W&B 的 run config 结构

2. **学术论文中发表的标准模板**
   - 比如：LabIMotion (2025, J. Cheminformatics) 的 Element/Segment/Dataset 结构
   - 比如：SContainer (2026, Information Systems) 的材料科学 schema
   - 比如：Herbie (2026, Scientific Data) 的 ontology-based schema

3. **行业规范/标准**
   - ISA-TAB 格式的字段清单
   - Allotrope ADF 的数据模型
   - FAIR 原则的具体字段要求
   - ISO 17025 对实验记录的要求
   - 21 CFR Part 11 对电子记录的字段要求

## 输出格式

对每个找到的模板/schema，请输出：

```markdown
### [模板名称]
- **来源**: [URL / DOI / 项目名]
- **适用领域**: [计算化学 / ML训练 / 合成实验 / ...]
- **字段结构** (JSON or YAML):
  ```json
  {
    "group_name": {
      "field_path": "说明",
      ...
    }
  }
  ```
- **特色**: 这个模板的亮点是什么（比如：自动单位转换、本体论关联、版本追踪）
```

## 特别关注

- 模板中**字段的分组逻辑**（为什么这样分组？按实验阶段？按设备？按数据流？）
- **必填 vs 建议字段**的区别依据
- 如何处理**嵌套/重复结构**（比如：多步反应、多仪器、多表征手段）
- 如何在模板中保留**灵活性的同时保持专业规范**

请优先找**可以直接获取其 JSON/YAML/XML schema 定义文件**的开源项目。
