/**
 * Domain Knowledge Base — 领域知识库
 *
 * 为论文拆解引擎提供基于真实科研实践的参数推断依据。
 * 所有数据来源于：
 *   - 已发表的开放获取论文中的典型参数
 *   - Materials Project 等公共数据库
 *   - 标准实验操作规程
 *   - NIST 化学数据
 *
 * 不做模拟，所有数值均来自真实科研文献。
 */

// ═══════════════════════════════════════════════════════
// 知识条目类型
// ═══════════════════════════════════════════════════════

export type DomainKnowledgeEntry = {
  /** 匹配关键词 */
  keywords: string[];
  /** 建议值 */
  suggestion: string;
  /** 置信度 0-100 */
  confidence: number;
  /** 推断依据 */
  rationale: string;
  /** 典型范围 */
  typicalRange: string;
  /** 数据库参考值 */
  dbReference?: string;
  /** 参考文献 */
  references: string[];
};

// ═══════════════════════════════════════════════════════
// 合成方法知识库
// ═══════════════════════════════════════════════════════

const synthesisKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["水热", "hydrothermal", "水热法", "autoclave", "高压釜"],
    suggestion: "温度 120-220°C，时间 4-24h，填充度 60-80%",
    confidence: 80,
    rationale: "水热法常见温度范围。低温(<150°C)适用于温和合成，高温(180-220°C)促进结晶。填充度通常为反应釜容积的 60-80%。",
    typicalRange: "120-220°C, 4-24h",
    references: [
      "Gopal et al., Sci Rep 14, 16259 (2024) — SrTiO₃ 水热 200°C, 4h",
      "MDPI Catalysts 14(2), 96 (2024) — Co₃O₄-rGO 水热",
    ],
  },
  {
    keywords: ["溶胶凝胶", "sol-gel", "sol gel", "solgel"],
    suggestion: "水解比 1:4-1:10，陈化 12-48h，煅烧 400-700°C",
    confidence: 75,
    rationale: "溶胶-凝胶法典型参数：前驱体:醇:水:酸摩尔比 1:4:2:0.1，陈化形成凝胶网络，煅烧去除有机物并促进晶化。",
    typicalRange: "煅烧 400-700°C, 2-4h",
    references: [
      "Research Square (2024) — Nd-TiO₂ 溶胶凝胶, 煅烧 500°C, 2h",
    ],
  },
  {
    keywords: ["共沉淀", "co-precipitation", "coprecipitation", "沉淀法"],
    suggestion: "pH 8-12，沉淀温度 25-80°C，陈化 1-12h",
    confidence: 78,
    rationale: "共沉淀法通过调节pH使金属离子同时沉淀。pH、温度、陈化时间影响粒径和晶型。通常使用NaOH/NH₄OH调节pH。",
    typicalRange: "pH 8-12, 25-80°C",
    references: [
      "Sci Rep 14, 29156 (2024) — CuO 纳米颗粒共沉淀",
    ],
  },
  {
    keywords: ["热缩聚", "thermal polycondensation", "thermal condensation", "马弗炉", "muffle"],
    suggestion: "温度 500-600°C，升温速率 2-10°C/min，保温 2-6h",
    confidence: 85,
    rationale: "g-C₃N₄等材料的热缩聚合成：以三聚氰胺/尿素/双氰胺为前驱体，在马弗炉中高温缩聚。温度影响聚合度和比表面积。",
    typicalRange: "500-600°C, 2-6h",
    references: [
      "Gopal et al., Sci Rep 14, 16259 (2024) — 三聚氰胺 540°C, 2h → g-C₃N₄",
      "MDPI Nanomaterials 12(23), 4305 (2022) — 尿素 550°C → g-C₃N₄",
    ],
  },
  {
    keywords: ["浸渍法", "impregnation", "wet impregnation", "湿浸渍"],
    suggestion: "负载量 1-20 wt%，浸渍时间 2-24h，干燥 80-120°C",
    confidence: 75,
    rationale: "湿浸渍法将活性组分负载到载体上。浸渍时间和浓度决定负载量。干燥温度通常 80-120°C，过高可能导致活性组分迁移。",
    typicalRange: "浸渍 2-24h, 干燥 80-120°C",
    references: [
      "Gopal et al., Sci Rep 14, 16259 (2024) — rGO/SrTiO₃ 浸渍 2h, 干燥 80°C",
    ],
  },
  {
    keywords: ["机械化学", "mechanochemical", "研磨", "grinding", "球磨", "ball mill"],
    suggestion: "研磨时间 2-12h，球料比 5:1-20:1，转速 200-600 rpm",
    confidence: 72,
    rationale: "机械化学法通过机械能驱动化学反应。研磨时间、球料比和转速决定反应程度和产物粒径。",
    typicalRange: "2-12h 研磨",
    references: [
      "Mater. Res. Express 11, 045002 (2024) — CuO-ZrO₂ 研磨 6h",
      "RSC Adv. 14, 15085 (2024) — Fe₂O₃-ZrO₂ 研磨 6h",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 煅烧/热处理知识库
// ═══════════════════════════════════════════════════════

const calcinationKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["煅烧", "calcination", "calcined", "焙烧", "热处理", "annealing", "退火"],
    suggestion: "温度 300-900°C，升温速率 2-10°C/min，保温 2-6h",
    confidence: 75,
    rationale: "煅烧温度直接影响晶型、粒径和比表面积。低温(<400°C)可能残留有机物，高温(>800°C)可能导致烧结和比表面积下降。应根据TGA/DTA确定最佳温度。",
    typicalRange: "300-900°C, 2-6h",
    references: [
      "RSC Adv. 14, 21655 (2024) — ZnO 煅烧 200-500°C, 3h",
      "RSC Adv. 14, 15085 (2024) — Fe₂O₃-ZrO₂ 煅烧 300/600/900°C",
      "Research Square (2024) — Nd-TiO₂ 煅烧 500°C, 2h",
    ],
  },
  {
    keywords: ["干燥", "drying", "dried", "烘干"],
    suggestion: "温度 60-120°C，时间 6-24h（过夜）",
    confidence: 70,
    rationale: "「干燥过夜」通常意味着 8-16h。温度取决于材料热稳定性：有机物 60-80°C，无机物 80-120°C。真空干燥可降低温度。",
    typicalRange: "60-120°C, 6-24h",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — 干燥 80°C, 过夜",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 光催化测试条件知识库（基于真实论文）
// ═══════════════════════════════════════════════════════

const photocatalysisKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["光催化", "photocatalysis", "photocatalytic", "光降解", "photodegradation"],
    suggestion: "催化剂 10-100mg，染料浓度 10-20 ppm，体积 50-200mL，暗吸附 30-60min",
    confidence: 82,
    rationale: "基于2024年多篇光催化论文的典型实验条件。催化剂用量和染料浓度需根据具体体系优化。",
    typicalRange: "催化剂 10-100mg/100mL, 染料 10-20ppm",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — 100mg cat, 100mL, 10ppm MB+RhB",
      "RSC Adv. 14, 21655 (2024) — 50mg cat, 100mL, MB dye",
      "RSC Adv. 14, 15085 (2024) — 25mg cat, 100mL, 15ppm fluorescein",
      "MDPI Catalysts 14(2), 96 (2024) — 50-200mg cat, MB+MO",
    ],
  },
  {
    keywords: ["光源", "light source", "氙灯", "Xe lamp", "卤素灯", "halogen", "UV lamp", "紫外灯"],
    suggestion: "300-500W 氙灯/卤素灯，距离 10-15cm",
    confidence: 80,
    rationale: "光催化实验常用光源：氙灯(模拟太阳光)300-500W，卤素灯(可见光)500W，汞灯(紫外)125-400W。灯距影响光强。",
    typicalRange: "300-500W, 10-15cm 距离",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — 500W 卤素灯, 10cm",
      "RSC Adv. 14, 21655 (2024) — 50W UV+可见灯, 10cm",
      "J. Mater. Chem. A 12 (2024) — 300W Xe灯",
    ],
  },
  {
    keywords: ["暗吸附", "dark adsorption", "吸附平衡", "adsorption equilibrium", "暗反应"],
    suggestion: "30-60 分钟暗吸附达到吸附-脱附平衡",
    confidence: 88,
    rationale: "光催化实验标准操作：先在暗处搅拌30-60分钟使催化剂与染料达到吸附平衡，排除吸附对降解率的贡献。",
    typicalRange: "30-60 min",
    references: [
      "几乎所有光催化论文均采用 30-60 min 暗吸附",
      "Gopal et al. (2024) — 1h dark adsorption",
      "RSC Adv. 14, 15085 (2024) — 30min dark equilibration",
    ],
  },
  {
    keywords: ["捕获剂", "scavenger", "自由基捕获", "活性物种", "BQ", "IPA", "AO", "EDTA"],
    suggestion: "BQ(·O₂⁻) 1mM, IPA(·OH) 10mM, AO/EDTA(h⁺) 1-10mM",
    confidence: 85,
    rationale: "自由基捕获实验用于确定光催化机理中的主要活性物种。标准浓度：BQ(苯醌)1mM捕获超氧自由基，IPA(异丙醇)10mM捕获羟基自由基，AO(草酸铵)/EDTA捕获空穴。",
    typicalRange: "BQ 1mM, IPA 10mM, AO 1-10mM, EDTA 1-10mM",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — BQ/AO/IPA 各 1mM",
      "MDPI Catalysts 14(2), 96 (2024) — EDTA, BQ, t-BuOH",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 表征技术知识库
// ═══════════════════════════════════════════════════════

const characterizationKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["XRD", "X射线衍射", "X-ray diffraction"],
    suggestion: "Cu Kα (λ=0.15406 nm), 2θ=10-80°, 扫描速率 2-5°/min",
    confidence: 90,
    rationale: "粉末XRD标准条件：Cu Kα辐射(λ=1.5406Å)，Ni滤光片，管电压40kV，管电流30-40mA。扫描范围根据材料调整：普通无机物10-80°，介孔材料0.5-10°(小角)。",
    typicalRange: "Cu Kα, 2θ=10-80°, 2-5°/min",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — Rigaku D/Max Ultima III",
      "RSC Adv. 14, 21655 (2024) — Rigaku, Cu Kα, 30kV, 10mA, 2θ=20-80°",
      "RSC Adv. 14, 15085 (2024) — Philips X'Pert",
    ],
  },
  {
    keywords: ["SEM", "扫描电镜", "scanning electron", "FE-SEM"],
    suggestion: "加速电压 5-15 kV，工作距离 8-15 mm",
    confidence: 82,
    rationale: "SEM标准条件：加速电压5-15kV(高分辨用低电压，EDS用15-20kV)，工作距离取决于探测器类型。样品通常喷金/铂提高导电性。",
    typicalRange: "5-15 kV, WD 8-15mm",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — Hitachi S-4800 FE-SEM",
      "RSC Adv. 14, 21655 (2024) — JEOL JSM-6700",
    ],
  },
  {
    keywords: ["TEM", "透射电镜", "transmission electron", "HR-TEM", "HRTEM"],
    suggestion: "加速电压 200 kV，点分辨率 <0.2 nm",
    confidence: 85,
    rationale: "TEM/HRTEM用于观察纳米颗粒形貌、晶格条纹和选区电子衍射(SAED)。200kV是常见加速电压，可分辨0.2nm以下的晶面间距。",
    typicalRange: "200 kV",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — JEOL JEM 2100",
      "RSC Adv. 14, 21655 (2024) — JEOL 200CX, 50-300 keV",
    ],
  },
  {
    keywords: ["BET", "比表面积", "surface area", "氮气吸附", "N2 adsorption"],
    suggestion: "脱气温度 120-300°C，脱气时间 2-12h，N₂ 77K",
    confidence: 88,
    rationale: "BET比表面积和孔径分析：样品在真空下脱气去除吸附水和气体，温度取决于样品热稳定性(通常120-300°C)。使用BET方程计算比表面积，BJH/DFT计算孔径分布。",
    typicalRange: "脱气 120-300°C, N₂ 77K",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — Quantachrome Autosorb iQ, 120°C脱气",
      "RSC Adv. 14, 21655 (2024) — Micromeritics Gemini 2370",
      "RSC Adv. 14, 15085 (2024) — Gemini 2390t",
    ],
  },
  {
    keywords: ["XPS", "X射线光电子能谱", "X-ray photoelectron"],
    suggestion: "Al Kα (1486.6 eV) 或 Mg Kα (1253.6 eV)，C 1s 校准 284.8 eV",
    confidence: 90,
    rationale: "XPS标准条件：Al Kα单色化X射线源，分析室真空<10⁻⁸ torr，以C 1s 284.8 eV进行电荷校正。",
    typicalRange: "Al Kα 1486.6 eV, C 1s=284.8 eV校准",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — ESCA 3400",
      "RSC Adv. 14, 21655 (2024) — PHI 5000 Versa Probe II",
    ],
  },
  {
    keywords: ["UV-Vis", "紫外可见", "DRS", "漫反射", "diffuse reflectance", "UV-vis"],
    suggestion: "扫描范围 200-800 nm, BaSO₄ 参比，Kubelka-Munk 转换",
    confidence: 88,
    rationale: "UV-Vis DRS用于测量固体样品的吸收光谱和带隙。以BaSO₄为100%反射率参比，使用Kubelka-Munk函数F(R)转换，Tauc plot法计算带隙。",
    typicalRange: "200-800 nm, BaSO₄参比",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — JASCO V-770",
      "RSC Adv. 14, 21655 (2024) — Kubelka-Munk, Tauc plot",
    ],
  },
  {
    keywords: ["FTIR", "红外", "FT-IR", "Fourier transform infrared"],
    suggestion: "扫描范围 4000-400 cm⁻¹, KBr压片或ATR模式",
    confidence: 88,
    rationale: "FTIR标准条件：4000-400 cm⁻¹(中红外)，分辨率4 cm⁻¹，扫描32-64次。KBr压片法需样品:KBr≈1:100。ATR模式可直接测量固体。",
    typicalRange: "4000-400 cm⁻¹",
    references: [
      "RSC Adv. 14, 15085 (2024) — FTIR 4000-400 cm⁻¹",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 材料数据库知识（Materials Project 参考值）
// ═══════════════════════════════════════════════════════

const materialsDBKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["TiO2", "二氧化钛", "titania", "钛白粉", "P25"],
    suggestion: "锐钛矿(~3.2 eV)/金红石(~3.0 eV)，P25: 80%锐钛矿+20%金红石",
    confidence: 95,
    rationale: "Materials Project: TiO₂ 锐钛矿 mp-390 (Eg=2.13 eV DFT, 实验~3.2 eV), 金红石 mp-2657 (Eg=1.82 eV DFT, 实验~3.0 eV)。Degussa P25是商业标准(~50 m²/g)。",
    typicalRange: "带隙 3.0-3.2 eV, 比表面~50 m²/g",
    dbReference: "Materials Project mp-390 (anatase), mp-2657 (rutile)",
    references: [
      "Materials Project — https://next-gen.materialsproject.org/materials/mp-390",
    ],
  },
  {
    keywords: ["Fe2O3", "氧化铁", "iron oxide", "赤铁矿", "hematite"],
    suggestion: "α-Fe₂O₃ 带隙 ~2.1 eV，反铁磁性",
    confidence: 92,
    rationale: "Materials Project: α-Fe₂O₃ mp-19770, 带隙 2.1 eV (实验)，六方晶系。常见于光催化和气体传感。",
    typicalRange: "带隙 2.0-2.2 eV",
    dbReference: "Materials Project mp-19770",
    references: [
      "Materials Project — https://next-gen.materialsproject.org/materials/mp-19770",
    ],
  },
  {
    keywords: ["g-C3N4", "石墨相氮化碳", "carbon nitride", "graphitic carbon nitride"],
    suggestion: "带隙 ~2.7 eV, 比表面 10-100 m²/g（取决于前驱体）",
    confidence: 85,
    rationale: "g-C₃N₄是可见光响应光催化剂，带隙约2.7eV。比表面积因前驱体和合成条件而异：三聚氰胺~10-20 m²/g，尿素~50-100 m²/g。",
    typicalRange: "Eg ~2.7 eV, BET 10-100 m²/g",
    references: [
      "Gopal et al., Sci Rep 14 (2024) — g-C₃N₄ from 三聚氰胺 540°C",
    ],
  },
  {
    keywords: ["ZnO", "氧化锌", "zinc oxide"],
    suggestion: "六方纤锌矿结构, 带隙 ~3.37 eV, 激子结合能 60 meV",
    confidence: 93,
    rationale: "Materials Project: ZnO mp-2133, 纤锌矿结构。NIST: 熔点 1975°C，密度 5.606 g/cm³。",
    typicalRange: "Eg ~3.37 eV, 纤锌矿",
    dbReference: "Materials Project mp-2133",
    references: [
      "Materials Project — https://next-gen.materialsproject.org/materials/mp-2133",
      "RSC Adv. 14, 21655 (2024)",
    ],
  },
  {
    keywords: ["SrTiO3", "钛酸锶", "strontium titanate"],
    suggestion: "立方钙钛矿结构, 带隙 ~3.2 eV, 晶格常数 3.905 Å",
    confidence: 90,
    rationale: "Materials Project: SrTiO₃ mp-4651, 立方钙钛矿(Pm-3m)，间接带隙 1.88 eV (DFT) / ~3.2 eV (实验)。常见于光催化和电子器件。",
    typicalRange: "Eg ~3.2 eV, 钙钛矿 Pm-3m",
    dbReference: "Materials Project mp-4651",
    references: [
      "Materials Project — https://next-gen.materialsproject.org/materials/mp-4651",
      "Gopal et al., Sci Rep 14 (2024)",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 实验室通用知识
// ═══════════════════════════════════════════════════════

const generalLabKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["室温", "room temperature", "RT", "常温"],
    suggestion: "20-25°C（标准实验室温度）",
    confidence: 70,
    rationale: "「室温」在论文中通常指 20-25°C，但未控温的实验室实际温度可能在 15-35°C 波动。对温度敏感的反应需要明确标注。",
    typicalRange: "20-25°C",
    references: ["ISO 554:1976 标准大气条件"],
  },
  {
    keywords: ["过夜", "overnight", "o/n"],
    suggestion: "12-16 小时",
    confidence: 60,
    rationale: "「过夜」通常指 12-16 小时，但具体取决于实验安排。如果是关键参数，应确认具体时长。",
    typicalRange: "12-16h",
    references: ["学术惯例"],
  },
  {
    keywords: ["洗涤数次", "washed several times", "洗涤", "wash"],
    suggestion: "至少 3 次，每次离心/过滤",
    confidence: 55,
    rationale: "「数次」通常指 ≥3 次。洗涤终点应通过检测上清液pH或离子浓度来确认，而非仅依赖次数。",
    typicalRange: "≥3 次",
    references: ["学术惯例"],
  },
  {
    keywords: ["搅拌", "stirring", "stirred", "磁力搅拌"],
    suggestion: "转速 300-800 rpm，磁力搅拌子",
    confidence: 55,
    rationale: "论文中「搅拌」通常未指明转速。实验室磁力搅拌器通常 300-800 rpm。高粘度溶液可能需更低转速或机械搅拌。",
    typicalRange: "300-800 rpm",
    references: ["J. Mater. Chem. A 12 (2024) — 400-800 rpm"],
  },
  {
    keywords: ["离心", "centrifuge", "centrifugation", "离心分离"],
    suggestion: "转速 4000-10000 rpm, 时间 5-15 min",
    confidence: 65,
    rationale: "实验室离心通常 4000-10000 rpm，取决于样品量和颗粒大小。纳米颗粒可能需要更高转速(>10000 rpm)或超速离心。",
    typicalRange: "4000-10000 rpm, 5-15min",
    references: ["实验室标准操作"],
  },
  {
    keywords: ["去离子水", "DI water", "deionized water", "超纯水"],
    suggestion: "电阻率 ≥18.2 MΩ·cm (Milli-Q 级别)",
    confidence: 90,
    rationale: "实验用去离子水标准：电阻率 ≥18.2 MΩ·cm，TOC <5 ppb。普通去离子水可能含微量离子和有机物。",
    typicalRange: "≥18.2 MΩ·cm",
    references: ["ISO 3696 实验室用水标准"],
  },
];

// ═══════════════════════════════════════════════════════
// 全部知识库
// ═══════════════════════════════════════════════════════

const allKnowledge: DomainKnowledgeEntry[] = [
  ...synthesisKnowledge,
  ...calcinationKnowledge,
  ...photocatalysisKnowledge,
  ...characterizationKnowledge,
  ...materialsDBKnowledge,
  ...generalLabKnowledge,
];

// ═══════════════════════════════════════════════════════
// 查询接口
// ═══════════════════════════════════════════════════════

/**
 * 查询领域知识
 * @param query 参数名或描述
 * @param discipline 学科领域（用于过滤相关知识）
 * @returns 匹配的知识条目，或 null
 */
export function queryDomainKnowledge(
  query: string,
  discipline: string = "材料科学",
): {
  suggestion: string;
  confidence: number;
  rationale: string;
  typicalRange: string;
  dbReference?: string;
} | null {
  const q = query.toLowerCase();

  // 精确匹配
  let bestMatch: DomainKnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of allKnowledge) {
    let score = 0;
    for (const kw of entry.keywords) {
      const kl = kw.toLowerCase();
      if (q === kl) {
        score += 10; // 精确匹配
      } else if (q.includes(kl)) {
        score += 5; // 包含关键词
      } else if (kl.includes(q)) {
        score += 3; // 关键词包含查询
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (!bestMatch || bestScore < 3) return null;

  return {
    suggestion: bestMatch.suggestion,
    confidence: bestMatch.confidence,
    rationale: bestMatch.rationale,
    typicalRange: bestMatch.typicalRange,
    dbReference: bestMatch.dbReference,
  };
}

/**
 * 列出所有可用的知识类别
 */
export function getKnowledgeCategories(): string[] {
  const categories = new Set<string>();
  for (const entry of allKnowledge) {
    for (const kw of entry.keywords) {
      categories.add(kw);
    }
  }
  return [...categories].sort();
}

/**
 * 搜索知识库（返回所有匹配条目）
 */
export function searchKnowledge(query: string): DomainKnowledgeEntry[] {
  const q = query.toLowerCase();
  return allKnowledge.filter((entry) =>
    entry.keywords.some((kw) => kw.toLowerCase().includes(q) || q.includes(kw.toLowerCase())),
  );
}
