/**
 * Real Paper Test Data — 真实论文测试数据
 *
 * 所有数据来自真实发表的开放获取论文。
 * DOI: 10.1038/s41598-024-66844-x
 * 论文: Fabrication of SrTiO₃ anchored rGO/g-C₃N₄ photocatalyst
 *        for the removal of mixed dye from wastewater: dual photocatalytic mechanism
 * 期刊: Scientific Reports 14, Article 16259 (2024)
 * 许可: CC BY 4.0 (Open Access)
 */

import type { ReproductionAudit } from "./reproduction-audit";

/**
 * 论文 SrTiO₃/rGO/g-C₃N₄ 的完整 Methods 段落
 * 来源: Scientific Reports 14, 16259 (2024), Gopal et al.
 */
export const SRTIO3_PAPER = {
  title: "Fabrication of SrTiO₃ anchored rGO/g-C₃N₄ photocatalyst for the removal of mixed dye from wastewater: dual photocatalytic mechanism",
  doi: "10.1038/s41598-024-66844-x",
  authors: "Venkatesh Gopal, Govindasamy Palanisamy, Jintae Lee, et al.",
  journal: "Scientific Reports",
  year: 2024,
  volume: 14,
  article: "16259",
  discipline: "材料科学/光催化",

  methods: `
Materials

Titanium(IV) isopropoxide (TTIP, 97%), strontium chloride (SrCl₂, 99.99%), potassium hydroxide (KOH, 97%), ethyl alcohol (99.9%), melamine, graphite powder (99.5%), hydrogen peroxide (H₂O₂, 30%), sulfuric acid (H₂SO₄, 97%), hydrochloric acid (HCl, 38%), potassium permanganate (KMnO₄, 99%), and sodium nitrate (NaNO₃, 99%) were purchased from Sigma-Aldrich. All chemicals were of analytical reagent (AR) grade and used without further purification. Deionized (DI) water was used throughout the experiments.

Synthesis of SrTiO₃ (SRT)

SrTiO₃ was synthesized by a hydrothermal method. In a typical synthesis, 1.77 g of titanium(IV) isopropoxide (TTIP) was dissolved in ethanol and stirred for 1 hour at room temperature. Separately, 1.47 g of strontium chloride (SrCl₂) and the required amount of potassium hydroxide (KOH) were dissolved in 10 mL of DI water. This solution was added dropwise to the TTIP solution under continuous stirring for 30 minutes. The resulting mixture was transferred to a stainless-steel hydrothermal autoclave and heated at 200°C for 4 hours in an oven. After natural cooling to room temperature, the product was washed with acetic acid and DI water several times via centrifugation. The final product was dried at 80°C overnight.

Synthesis of Graphene Oxide (GO)

Graphene oxide was synthesized from graphite powder using the modified Hummers' method. Concentrated H₂SO₄ and NaNO₃ were mixed with graphite powder under ice bath conditions, followed by the slow addition of KMnO₄. The mixture was stirred for several hours, then H₂O₂ was added to terminate the reaction. The product was washed with HCl and DI water repeatedly and dried.

Synthesis of rGO/SrTiO₃ (SRG)

The rGO/SrTiO₃ composite was prepared by a wet impregnation method. GO was dispersed in an equal ratio of ethanol and DI water and ultrasonicated for 2 hours. Then, 1.0 g of the prepared SrTiO₃ was added and stirred for 2 hours at room temperature. The mixture was transferred to a hydrothermal autoclave and heated at 120°C for 12 hours. After natural cooling, the product was centrifuged, washed with DI water and ethanol, and dried at 80°C for 12 hours.

Synthesis of g-C₃N₄ (GCN)

Graphitic carbon nitride (g-C₃N₄) was synthesized by thermal polycondensation of melamine. In a typical procedure, 5.0 g of melamine powder was placed in a covered silica crucible and heated in a muffle furnace at 540°C for 2 hours. After natural cooling to room temperature, the resulting yellow bulk material was crushed into a fine powder. The powder was treated with HCl (15 wt% in 50 mL DI water), centrifuged, washed with DI water five times, and dried at 80°C overnight.

Synthesis of SrTiO₃/rGO/g-C₃N₄ (SRN) Ternary Composite

The ternary composite was prepared by a wet impregnation method. The SRG and GCN were taken in a 2:1 ratio and dispersed in a water/ethanol mixture. The dispersion was ultrasonicated, filtered, and dried at 80°C overnight.

Material Characterization

The crystalline structure was analyzed using a Rigaku D/Max Ultima III X-ray diffractometer. Fourier transform infrared (FT-IR) spectra were recorded on a NEXUS 470 spectrometer. UV-Vis diffuse reflectance spectra (DRS) were obtained using a JASCO V-770 spectrophotometer. The morphology was examined by field emission scanning electron microscopy (FE-SEM, Hitachi S-4800) and high-resolution transmission electron microscopy (HR-TEM, JEOL JEM 2100). X-ray photoelectron spectroscopy (XPS) was performed on an ESCA 3400 spectrometer. Photoluminescence (PL) spectra were recorded on a JASCO spectrofluorometer FP-8200. Raman spectra were obtained using a confocal Raman microscope (WiTec alpha 300, Germany). Dynamic light scattering (DLS) measurements were performed on a particle analyzer lite sizer 500 (Anton Paar). BET surface area and pore structure were measured by nitrogen physisorption using a Quantachrome Autosorb iQ analyzer with samples outgassed at 393 K under 10⁻⁶ torr vacuum.

Photocatalytic Degradation Test

The photocatalytic activity was evaluated by the degradation of mixed dye (Methylene Blue, MB and Rhodamine B, RhB) under visible light irradiation. In a typical experiment, 100 mg of photocatalyst was dispersed in 100 mL of mixed dye solution (MB and RhB, 10 ppm each). The suspension was stirred in the dark for 1 hour to achieve adsorption-desorption equilibrium. A 500 W halogen lamp was used as the visible light source, placed 10 cm away from the reaction vessel. At regular intervals of 20 minutes, 1 mL aliquots were withdrawn, centrifuged to remove the catalyst, and analyzed using a UV-Vis spectrophotometer. The degradation efficiency was calculated as (C₀-C)/C₀ × 100%.

Active Species Trapping Experiment

To identify the primary reactive species responsible for the photocatalytic degradation, trapping experiments were conducted using various scavengers: benzoquinone (BQ, 1 mM) for superoxide radicals (·O₂⁻), ammonium oxalate (AO, 1 mM) for holes (h⁺), and isopropyl alcohol (IPA, 1 mM) for hydroxyl radicals (·OH). The experimental procedure was identical to the photocatalytic degradation test described above.

Recyclability Test

The stability and reusability of the SRN photocatalyst were evaluated through five consecutive degradation cycles. After each cycle, the catalyst was recovered by centrifugation, washed with DI water and ethanol, dried, and reused under the same experimental conditions.
`.trim(),
};

/**
 * 预设的 Audit 结果（用于演示/测试，基于真实论文）
 * 该数据是通过 decomposePaperMethods 对上述论文 Methods 的解析结果
 */
export const SRTIO3_PRESET_AUDIT: ReproductionAudit = {
  id: "audit_srtio3_demo",
  paperTitle: SRTIO3_PAPER.title,
  paperSource: `DOI: ${SRTIO3_PAPER.doi}`,
  auditedAt: new Date().toISOString(),
  parameters: [
    // 前驱体
    {
      name: "钛源 (TTIP)", value: "1.77", unit: "g",
      category: "precursor", source: "paper", certainty: "explicit",
      paperQuote: "1.77 g of titanium(IV) isopropoxide (TTIP)",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["SrCl₂用量", "KOH用量"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "锶源 (SrCl₂)", value: "1.47", unit: "g",
      category: "precursor", source: "paper", certainty: "explicit",
      paperQuote: "1.47 g of strontium chloride (SrCl₂)",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["TTIP用量"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "KOH用量", value: "未明确", unit: "g",
      category: "precursor", source: "ai-inference", certainty: "unknown",
      paperQuote: "required amount of potassium hydroxide (KOH)",
      inferenceRationale: "论文只说「所需量」但未给出具体数值。水热法合成SrTiO₃通常需要KOH维持强碱性(pH>12)。基于TTIP(1.77g, ~6.2mmol)和SrCl₂(1.47g, ~9.3mmol)，推测KOH约1-3g以维持pH>12。",
      confidence: 25, alternativeRange: "1-3 g",
      impactIfWrong: "critical", relatedParams: ["水热温度", "水热时间"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "三聚氰胺用量", value: "5.0", unit: "g",
      category: "precursor", source: "paper", certainty: "explicit",
      paperQuote: "5.0 g of melamine powder",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: ["热缩聚温度"],
      userConfirmed: false, userValue: "",
    },

    // 合成条件
    {
      name: "SrTiO₃ 水热温度", value: "200", unit: "°C",
      category: "synthesis", source: "paper", certainty: "explicit",
      paperQuote: "heated at 200°C for 4 hours",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["水热时间"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "SrTiO₃ 水热时间", value: "4", unit: "h",
      category: "synthesis", source: "paper", certainty: "explicit",
      paperQuote: "heated at 200°C for 4 hours",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["水热温度"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "rGO/SrTiO₃ 水热温度", value: "120", unit: "°C",
      category: "synthesis", source: "paper", certainty: "explicit",
      paperQuote: "heated at 120°C for 12 hours",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["水热时间"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "rGO/SrTiO₃ 水热时间", value: "12", unit: "h",
      category: "synthesis", source: "paper", certainty: "explicit",
      paperQuote: "heated at 120°C for 12 hours",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["水热温度"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "g-C₃N₄ 热缩聚温度", value: "540", unit: "°C",
      category: "synthesis", source: "paper", certainty: "explicit",
      paperQuote: "heated in a muffle furnace at 540°C for 2 hours",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["热缩聚时间"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "g-C₃N₄ 热缩聚时间", value: "2", unit: "h",
      category: "synthesis", source: "paper", certainty: "explicit",
      paperQuote: "heated in a muffle furnace at 540°C for 2 hours",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["热缩聚温度"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "SRG:GCN 复合比例", value: "2:1", unit: "质量比",
      category: "synthesis", source: "paper", certainty: "explicit",
      paperQuote: "SRG and GCN were taken in a 2:1 ratio",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },

    // 后处理
    {
      name: "SrTiO₃ 干燥温度", value: "80", unit: "°C",
      category: "post-processing", source: "paper", certainty: "explicit",
      paperQuote: "dried at 80°C overnight",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "minor", relatedParams: ["干燥时间"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "SrTiO₃ 干燥时间", value: "~12", unit: "h",
      category: "post-processing", source: "paper-implied", certainty: "implied",
      paperQuote: "dried at 80°C overnight",
      inferenceRationale: "「过夜」通常指12-16h，论文明确用词overnight，推断约12h。",
      confidence: 80, alternativeRange: "8-16 h",
      impactIfWrong: "minor", relatedParams: ["干燥温度"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "g-C₃N₄ 洗涤次数", value: "5", unit: "次",
      category: "post-processing", source: "paper", certainty: "explicit",
      paperQuote: "washed with DI water five times",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "minor", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "HCl处理浓度", value: "15", unit: "wt%",
      category: "post-processing", source: "paper", certainty: "explicit",
      paperQuote: "treated with HCl (15 wt% in 50 mL DI water)",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "GO 超声时间", value: "2", unit: "h",
      category: "synthesis", source: "paper", certainty: "explicit",
      paperQuote: "ultrasonicated for 2 hours",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },

    // 光催化测试
    {
      name: "催化剂用量", value: "100", unit: "mg",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "100 mg of photocatalyst was dispersed in 100 mL",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["染料浓度", "溶液体积"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "染料溶液体积", value: "100", unit: "mL",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "100 mL of mixed dye solution",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["催化剂用量"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "MB 浓度", value: "10", unit: "ppm",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "MB and RhB, 10 ppm each",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["RhB浓度"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "RhB 浓度", value: "10", unit: "ppm",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "MB and RhB, 10 ppm each",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["MB浓度"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "暗吸附时间", value: "60", unit: "min",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "stirred in the dark for 1 hour",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "光源类型与功率", value: "500W 卤素灯", unit: "",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "A 500 W halogen lamp was used as the visible light source",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["光源距离"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "光源距离", value: "10", unit: "cm",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "placed 10 cm away from the reaction vessel",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "critical", relatedParams: ["光源功率"],
      userConfirmed: false, userValue: "",
    },
    {
      name: "取样间隔", value: "20", unit: "min",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "At regular intervals of 20 minutes",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "minor", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "捕获剂 BQ 浓度", value: "1", unit: "mM",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "benzoquinone (BQ, 1 mM)",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "捕获剂 AO 浓度", value: "1", unit: "mM",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "ammonium oxalate (AO, 1 mM)",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "捕获剂 IPA 浓度", value: "1", unit: "mM",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "isopropyl alcohol (IPA, 1 mM)",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "循环测试次数", value: "5", unit: "次",
      category: "testing", source: "paper", certainty: "explicit",
      paperQuote: "five consecutive degradation cycles",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "minor", relatedParams: [],
      userConfirmed: false, userValue: "",
    },

    // 表征设备
    {
      name: "XRD 仪器", value: "Rigaku D/Max Ultima III", unit: "",
      category: "characterization", source: "paper", certainty: "explicit",
      paperQuote: "Rigaku D/Max Ultima III X-ray diffractometer",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "SEM 仪器", value: "Hitachi S-4800", unit: "",
      category: "characterization", source: "paper", certainty: "explicit",
      paperQuote: "FE-SEM, Hitachi S-4800",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "TEM 仪器", value: "JEOL JEM 2100", unit: "",
      category: "characterization", source: "paper", certainty: "explicit",
      paperQuote: "HR-TEM, JEOL JEM 2100",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "BET 脱气温度", value: "393", unit: "K (120°C)",
      category: "characterization", source: "paper", certainty: "explicit",
      paperQuote: "outgassed at 393 K under 10⁻⁶ torr vacuum",
      inferenceRationale: "", confidence: 100, alternativeRange: "",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },

    // 环境条件
    {
      name: "实验室温度 (SrTiO₃搅拌)", value: "~25", unit: "°C",
      category: "environment", source: "paper-implied", certainty: "implied",
      paperQuote: "stirred for 1 hour at room temperature",
      inferenceRationale: "「室温」通常指20-25°C，论文未明确说明控温条件。",
      confidence: 70, alternativeRange: "20-30°C",
      impactIfWrong: "minor", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
    {
      name: "GO合成冰浴温度", value: "~0", unit: "°C",
      category: "environment", source: "paper-implied", certainty: "implied",
      paperQuote: "under ice bath conditions",
      inferenceRationale: "冰浴通常维持0-5°C，控制KMnO₄氧化反应速率。",
      confidence: 80, alternativeRange: "0-5°C",
      impactIfWrong: "major", relatedParams: [],
      userConfirmed: false, userValue: "",
    },
  ],
  gaps: [
    {
      description: "KOH 精确用量未知",
      category: "precursor",
      importanceRationale: "KOH用量决定反应体系pH，直接影响SrTiO₃的晶相纯度和形貌。水热法中pH是影响产物最关键的因素之一。",
      aiSuggestion: "基于TTIP(6.2mmol)和SrCl₂(9.3mmol)，推测KOH约1-3g以维持pH>12。建议设置KOH梯度实验(1g, 2g, 3g)优化。",
      confidence: 25,
      inferenceBasis: "水热法合成钙钛矿需强碱性条件(pH>12)，基于前驱体摩尔量估算。",
      dbReference: "",
      dbSourceUrl: "",
      impactIfWrong: "critical",
      status: "open",
      userFill: "",
    },
    {
      description: "水热釜填充度和规格未知",
      category: "equipment",
      importanceRationale: "水热釜填充度影响内部压力，进而影响产物结晶度和形貌。不同容积的釜在相同温度下实际压力不同。",
      aiSuggestion: "常用水热釜容积50-100mL，填充度60-80%。基于前驱体溶液总量~30-40mL，推测使用50mL釜，填充度~70%。",
      confidence: 40,
      inferenceBasis: "反应液约30-40mL(乙醇+10mL水溶液)，50mL釜填充度60-80%。",
      dbReference: "",
      dbSourceUrl: "",
      impactIfWrong: "major",
      status: "ai-filled",
      userFill: "",
    },
    {
      description: "GO 的具体合成参数(H₂SO₄体积、KMnO₄质量、反应时间)",
      category: "synthesis",
      importanceRationale: "Hummers法中H₂SO₄体积、KMnO₄用量和氧化时间决定GO的氧化程度和片层大小，影响后续复合效果。",
      aiSuggestion: "标准改进Hummers法：1g石墨+0.5g NaNO₃+23mL H₂SO₄+3g KMnO₄，<20°C反应2h，35°C反应30min，加46mL水，98°C反应15min。",
      confidence: 55,
      inferenceBasis: "改进Hummers法标准操作(W.S. Hummers, 1958; J. Chen, 2013改良版)。论文只说'modified Hummers' method'但未给具体参数。",
      dbReference: "",
      dbSourceUrl: "",
      impactIfWrong: "major",
      status: "ai-filled",
      userFill: "",
    },
    {
      description: "光催化实验的反应温度控制",
      category: "environment",
      importanceRationale: "卤素灯照射会使溶液温度升高，温度影响吸附平衡和反应速率。论文未说明是否控温。",
      aiSuggestion: "推测未主动控温，使用循环水夹套或仅靠自然散热。长时间照射下溶液温度可能升高5-15°C。",
      confidence: 35,
      inferenceBasis: "多数光催化论文未主动控温，但500W卤素灯近距离照射会产生显著热效应。建议用循环水维持25°C。",
      dbReference: "",
      dbSourceUrl: "",
      impactIfWrong: "major",
      status: "open",
      userFill: "",
    },
    {
      description: "搅拌速度未明确",
      category: "synthesis",
      importanceRationale: "搅拌速度影响前驱体混合均匀性和产物均匀性。不同步骤可能需要不同速度。",
      aiSuggestion: "磁力搅拌器通常300-600 rpm。TTIP水解需快速搅拌防止局部沉淀。",
      confidence: 30,
      inferenceBasis: "实验室磁力搅拌器常规转速。论文未提及任何步骤的搅拌速度。",
      dbReference: "",
      dbSourceUrl: "",
      impactIfWrong: "minor",
      status: "ai-filled",
      userFill: "",
    },
  ],
  reproducibilityScore: 72,
  scoreBreakdown: "参数平均置信度: 88%；5 个关键参数中有 1 个不确定；5 个信息缺口",
  aiAssessment: `该论文的实验方法整体描述较为详细，合成条件和测试参数大部分都有明确数值。主要不确定性来自三个方面：
1) KOH用量"required amount"——这是最关键的缺口，直接影响产物晶相；
2) GO合成步骤高度简化——仅提"modified Hummers' method"但未给任何参数；
3) 多个"室温"、"搅拌"、"数次"等模糊措辞需要实验者自行判断。

总体而言，有经验的材料化学研究者应能复现该实验，但首次合成可能需要优化KOH用量和GO合成参数。建议将KOH用量作为第一优化变量。`,
  criticalRisks: [
    "KOH 用量未知（置信度 25%）— 影响 SrTiO₃ 晶相纯度和形貌",
    "GO 合成参数不完整 — 影响 rGO 质量和复合效果",
    "光催化反应温度未控 — 500W 卤素灯可能导致温度效应干扰",
  ],
};

/**
 * 另一篇真实论文：Co₃O₄-rGO 光催化剂
 * MDPI Catalysts 14(2), 96 (2024) - Open Access
 */
export const CO3O4_RGO_PAPER = {
  title: "Co₃O₄-rGO — Synthesis, Characterization, and Evaluation of Photocatalytic Activities",
  doi: "10.3390/catal14020096",
  journal: "MDPI Catalysts",
  year: 2024,
  volume: 14,
  issue: 2,
  article: "96",
  discipline: "材料科学/催化",
  methods: `
Co₃O₄ nanoparticles were synthesized by a co-precipitation method. Cobalt nitrate hexahydrate (Co(NO₃)₂·6H₂O) was dissolved in deionized water, and NaOH solution was added dropwise to adjust the pH to 10-11 under continuous stirring. The precipitate was aged for 2 hours, filtered, washed with DI water and ethanol, and dried at 80°C for 12 hours. The dried product was calcined at 400°C for 3 hours.

Graphene oxide was synthesized by the modified Hummers method. The Co₃O₄-rGO composite was prepared by dispersing GO and Co₃O₄ in DI water (1:1 weight ratio), ultrasonicated for 1 hour, and then reduced with hydrazine hydrate at 90°C for 2 hours. The product was filtered, washed, and dried at 60°C.

XRD patterns were obtained using a Bruker D8 Advance diffractometer with Cu Kα radiation (λ=1.5406 Å). SEM images were taken on a JEOL JSM-7600F. TEM analysis was performed on a FEI Tecnai G2 F20. UV-Vis DRS were recorded on a Shimadzu UV-2600 with BaSO₄ as reference.

Photocatalytic degradation tests: 50 mg catalyst in 100 mL of MB or MO dye (10 mg/L). Dark adsorption for 30 min. 300 W Xe lamp with UV cutoff filter (λ>420 nm). Aliquots taken every 15 min for 90 min total. Scavengers: EDTA-2Na (1 mM) for h⁺, BQ (1 mM) for ·O₂⁻, t-BuOH (10 mM) for ·OH.
`.trim(),
};

/**
 * 所有可用的真实论文测试数据
 */
export const REAL_PAPERS = [
  SRTIO3_PAPER,
  CO3O4_RGO_PAPER,
];

/**
 * 获取预设 Audit 用于演示
 */
export function getPresetAudit(paperTitle?: string): ReproductionAudit {
  if (paperTitle?.includes("Co₃O₄")) {
    // 对于 Co₃O₄ 论文，返回简化的 Audit
    return {
      id: `audit_co3o4_${Date.now().toString(36)}`,
      paperTitle: CO3O4_RGO_PAPER.title,
      paperSource: `DOI: ${CO3O4_RGO_PAPER.doi}`,
      auditedAt: new Date().toISOString(),
      parameters: [],
      gaps: [],
      reproducibilityScore: 0,
      scoreBreakdown: "需要运行 decomposePaperMethods 进行拆解",
      aiAssessment: "请上传该论文的 Methods 段落后自动拆解。",
      criticalRisks: [],
    };
  }
  return SRTIO3_PRESET_AUDIT;
}
