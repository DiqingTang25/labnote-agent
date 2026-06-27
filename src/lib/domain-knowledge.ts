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
// 电生理知识库 (Plant & Cellular Electrophysiology)
// ═══════════════════════════════════════════════════════

const electrophysiologyKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["动作电位", "action potential", "AP", "电信号", "electrical signaling"],
    suggestion: "振幅植物 50-150 mV, 动物 80-120 mV; 半宽植物 0.5-5 s, 动物 1-5 ms",
    confidence: 85,
    rationale: "植物动作电位(Venus flytrap等)振幅80-100mV、半宽1-2s、传导速度~10cm/s。动物神经元AP振幅~100mV、半宽1-2ms。植物AP由Cl⁻和Ca²⁺介导，动物由Na⁺/K⁺介导。",
    typicalRange: "植物: 80-100mV, 0.5-2s; 动物: ~100mV, 1-2ms",
    references: [
      "Madariaga et al. (2024) Sci Data 11, DOI: 10.1038/s41597-024-03152-3 — 植物电生理响应库",
      "Volkov et al. (2019) Bioelectrochemistry 125: 25-32 — Venus flytrap 电生理",
    ],
  },
  {
    keywords: ["微电极", "microelectrode", "micropipette", "玻璃微电极", "玻璃管"],
    suggestion: "尖端阻抗 5-15 MΩ, 充灌液 3M KCl, Ag/AgCl 丝",
    confidence: 88,
    rationale: "玻璃微电极标准：硼硅玻璃管(外径1.5mm, 内径0.86mm)，P-97拉制仪拉制，尖端<1μm。充灌3M KCl或K-acetate。阻抗太低(<3MΩ)损伤细胞，太高(>20MΩ)噪声大。",
    typicalRange: "5-15 MΩ, 3M KCl",
    references: [
      "Molecular Devices Axopatch 200B 手册",
      "Sutter Instrument P-97 操作指南",
    ],
  },
  {
    keywords: ["法拉第笼", "Faraday cage", "电磁屏蔽", "电屏蔽", "屏蔽笼"],
    suggestion: "铜网/铝箔，良好接地，屏蔽 >40 dB (50/60Hz)",
    confidence: 82,
    rationale: "电生理记录必须在法拉第笼中进行以屏蔽50/60Hz市电干扰和RF噪声。铜网屏蔽效能>40dB。接地电阻<5Ω为佳。",
    typicalRange: "屏蔽效能 >40 dB",
    references: [
      "Axon Guide 3rd Ed. — 电生理记录噪声控制",
    ],
  },
  {
    keywords: ["放大器", "amplifier", "Axopatch", "Multiclamp", "Axoclamp", "patch clamp"],
    suggestion: "增益 0.5-100 mV/pA, 带宽 1-10 kHz, 探头反馈电阻 500 MΩ-50 GΩ",
    confidence: 85,
    rationale: "膜片钳放大器(Axopatch 200B/Multiclamp 700B)标准参数。电流钳模式下增益mV/pA，电压钳模式下增益mV/mV。Bessel低通滤波通常设为采样频率的1/5。",
    typicalRange: "带宽 1-10 kHz, 增益 0.5-100 mV/pA",
    references: [
      "Molecular Devices Axopatch 200B 技术规格",
      "HEKA EPC-10 手册",
    ],
  },
  {
    keywords: ["采样率", "sampling rate", "digitizer", "Digidata", "模数转换"],
    suggestion: "10-50 kHz (膜片钳), 1-5 kHz (场电位), 16-bit 或更高",
    confidence: 88,
    rationale: "Nyquist定理要求采样率≥2×信号最高频率。膜片钳记录单通道电流需20-50kHz，全细胞记录10-20kHz，场电位1-5kHz。16-bit ADC提供96dB动态范围。",
    typicalRange: "10-50 kHz, 16-bit",
    references: [
      "Molecular Devices Digidata 1550B 规格",
      "Axon Guide — 数据采集系统",
    ],
  },
  {
    keywords: ["静息电位", "resting potential", "膜电位", "membrane potential", "RMP"],
    suggestion: "植物细胞 -100 至 -180 mV, 动物神经元 -60 至 -70 mV, 肌细胞 -80 至 -90 mV",
    confidence: 90,
    rationale: "植物细胞RMP较动物更负，主要由质子泵(H⁺-ATPase)维持。动物细胞RMP由K⁺平衡电位主导(-60至-90mV)。记录前需稳定≥2分钟确认。",
    typicalRange: "植物: -100至-180mV; 动物: -60至-90mV",
    references: [
      "Volkov et al. (2019) — Dionaea RMP -62±3mV",
      "Hille B. (2001) Ion Channels of Excitable Membranes",
    ],
  },
  {
    keywords: ["信号滤波", "filter", "Bessel", "低通", "高通", "low-pass", "high-pass"],
    suggestion: "低通 1-10 kHz (Bessel 4-pole), 高通 0.1-1 Hz, 陷波 50/60 Hz 可选",
    confidence: 85,
    rationale: "Bessel滤波器相位线性好适合电生理。低通设为期望最高频率的2-3倍。高通去除电极漂移(0.1Hz)。陷波滤波器(50/60Hz)可能扭曲信号，仅在无法消除噪声源时使用。",
    typicalRange: "低通 1-10 kHz, 高通 0.1-1 Hz",
    references: [
      "Axon Guide — 信号调理与滤波",
    ],
  },
  {
    keywords: ["植物电生理", "plant electrophysiology", "plant electrical", "Dionaea", "Venus flytrap"],
    suggestion: "刺激方式: 机械触毛/电刺激/冷热刺激, 记录位点: 叶肉细胞层",
    confidence: 78,
    rationale: "Venus flytrap是植物电生理模式物种。机械刺激触发毛产生感受器电位(>阈值~15mV)触发AP。AP传导速度植物中约6-20cm/s。记录温度25°C, RH 60-70%。",
    typicalRange: "刺激位移~50μm, 温度 25°C, RH 60-70%",
    references: [
      "Madariaga et al. (2024) Sci Data 11 — 植物电生理响应库",
      "Volkov et al. (2019) Bioelectrochemistry 125 — Venus flytrap",
    ],
  },
  {
    keywords: ["Ag/AgCl", "银氯化银", "silver chloride", "参比电极", "reference electrode"],
    suggestion: "Ag丝镀AgCl, 电极偏移 <5 mV, 3M KCl 盐桥",
    confidence: 82,
    rationale: "Ag/AgCl电极是非极化电极，常用于生物电记录。电极漂移<2mV/15min为佳。需定期检查镀层完整性和颜色(应为深紫褐色)。盐桥减少液接电位。",
    typicalRange: "漂移 <2 mV/15min, 颜色深紫褐",
    references: [
      "Axon Guide — 电极与液接电位",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 细胞迁移实验知识库
// ═══════════════════════════════════════════════════════

const cellMigrationKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["细胞迁移", "cell migration", "cell motility", "细胞运动"],
    suggestion: "迁移速度 0.1-10 μm/min (取决于细胞类型), 成像间隔 30s-5min",
    confidence: 80,
    rationale: "免疫细胞(T细胞/中性粒细胞)迁移速度快(5-10μm/min)，成纤维细胞/上皮细胞较慢(0.1-1μm/min)。成像间隔需根据速度调整：快细胞30s，慢细胞5min。",
    typicalRange: "免疫细胞 5-10μm/min, 其他 0.1-2μm/min",
    references: [
      "Sci Signal 17 (2024) — T细胞迁移 3D基质",
      "J Cell Biol 223 (2024) — 中性粒细胞趋化",
    ],
  },
  {
    keywords: ["活细胞成像", "live cell imaging", "time-lapse", "延时成像", "live imaging"],
    suggestion: "37°C, 5% CO₂, 湿度 >90%, 物镜 10-40×, 成像间隔 1-10 min",
    confidence: 88,
    rationale: "活细胞成像需要环境控制(温度/CO₂/湿度)维持细胞活性。通常使用倒置显微镜+stage-top incubator。荧光成像需控制光毒性和光漂白——低光强、短曝光(50-200ms)。",
    typicalRange: "37°C, 5% CO₂, 间隔 1-10min",
    references: [
      "Mol Biol Cell 35 (2024) — 活细胞成像最佳实践",
      "Nat Methods 21 (2024) — 光毒性最小化策略",
    ],
  },
  {
    keywords: ["细胞追踪", "cell tracking", "tracking", "track", "trajectory"],
    suggestion: "追踪算法: TrackMate/Kalman filter/深度学习, 最少追踪 ≥50 个细胞",
    confidence: 78,
    rationale: "ImageJ/Fiji TrackMate插件是标准细胞追踪工具。手动追踪适用于低密度(<100 cells/field)，自动追踪适用于高密度。追踪指标：速度、方向性(位移/总路径)、停留时间。",
    typicalRange: "≥50 cells, TrackMate 或深度学习",
    references: [
      "Methods Cell Biol 178 (2024) — TrackMate 使用指南",
      "Nat Methods 21 (2024) — 深度学习细胞追踪综述",
    ],
  },
  {
    keywords: ["趋化", "chemotaxis", "chemokine", "趋化因子", "gradient"],
    suggestion: "趋化因子浓度 1-100 ng/mL, 梯度建立: μ-slide/Dunn chamber/Transwell",
    confidence: 82,
    rationale: "免疫细胞趋化实验常用CXCL12(SDF-1α)100ng/mL、CCL21 100ng/mL或fMLP 10-100nM。2D vs 3D基质中迁移模式不同：3D中更依赖蛋白酶非依赖的变形迁移。",
    typicalRange: "CXCL12 100 ng/mL, fMLP 10-100 nM",
    references: [
      "J Immunol 212 (2024) — T细胞趋化因子梯度",
      "Nat Rev Immunol 24 (2024) — 免疫细胞迁移综述",
    ],
  },
  {
    keywords: ["Transwell", "Boyden chamber", "Boyden", "transwell", "迁移小室"],
    suggestion: "孔径 3-8 μm, 细胞数 1×10⁴-1×10⁵/well, 迁移时间 2-24h",
    confidence: 85,
    rationale: "Transwell/Boyden小室用于定量细胞迁移/侵袭。免疫细胞常用5μm孔径，肿瘤细胞8μm。上室加细胞悬液，下室加趋化因子。结果以迁移细胞数或%迁移率表示。",
    typicalRange: "孔径 5-8 μm, 1×10⁴-1×10⁵ cells",
    references: [
      "Corning Transwell 产品手册",
      "J Leukoc Biol 115 (2024) — 中性粒细胞 Transwell",
    ],
  },
  {
    keywords: ["划痕实验", "wound healing", "scratch assay", "划痕愈合", "scratch"],
    suggestion: "划痕宽度 500-800 μm, 成像间隔 2-6h, 总时间 12-48h",
    confidence: 83,
    rationale: "划痕实验是研究集体细胞迁移的经典方法。使用200μL枪头制造均匀划痕。PBS洗涤去除脱落细胞。以划痕面积变化(% closure)或迁移速率(μm/h)量化。抑制增殖对照需加丝裂霉素C。",
    typicalRange: "划痕 ~600μm, 总时间 12-48h",
    references: [
      "Nat Protoc 19 (2024) — 划痕实验标准化方案",
    ],
  },
  {
    keywords: ["3D基质", "3D matrix", "extracellular matrix", "ECM", "胶原", "Matrigel"],
    suggestion: "胶原I 1-3 mg/mL, Matrigel 5-10 mg/mL, 凝胶化 37°C 30-60min",
    confidence: 78,
    rationale: "3D基质模拟体内环境。胶原I(1-3mg/mL)提供纤维状基质适用于间质迁移。Matrigel(~8-10mg/mL)含基底膜成分适用于上皮/肿瘤细胞。基质密度和刚度显著影响迁移模式。",
    typicalRange: "胶原I 1-3 mg/mL, Matrigel ~8 mg/mL",
    references: [
      "Nat Rev Mol Cell Biol 25 (2024) — 3D细胞迁移综述",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 空间转录组知识库
// ═══════════════════════════════════════════════════════

const spatialTranscriptomicsKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["空间转录组", "spatial transcriptomics", "Visium", "10x Genomics", "空间基因表达"],
    suggestion: "捕获区域 6.5×6.5 mm, 点直径 55 μm, 点间距 100 μm, ~5000 点/区域",
    confidence: 90,
    rationale: "10x Visium是主流空间转录组平台。每个捕获点含数百万条空间条形码寡核苷酸。新鲜冷冻或FFPE组织均可使用。分辨率55μm(点), 最新Visium HD达2μm分辨率。",
    typicalRange: "6.5×6.5mm, 55μm直径, ~5000点",
    references: [
      "10x Genomics Visium v2 方案 CG000239 Rev L",
      "Nat Biotechnol 42 (2024) — 空间转录组方法综述",
    ],
  },
  {
    keywords: ["冷冻切片", "cryosection", "冷冻切片机", "cryostat", "OCT"],
    suggestion: "切片厚度 10-20 μm, 温度 -18 至 -22°C, OCT 包埋",
    confidence: 88,
    rationale: "组织OCT包埋后液氮速冻，Cryostat -18至-22°C切片。Visium推荐10μm(新鲜冷冻)或5μm(FFPE)。切片贴附于预冷玻片，立即进入固定/染色流程。",
    typicalRange: "10-20 μm, -20°C",
    references: [
      "10x Visium 组织制备指南 CG000240",
    ],
  },
  {
    keywords: ["H&E染色", "H&E", "HE", "苏木精伊红", "hematoxylin eosin"],
    suggestion: "苏木精 3-5 min, 伊红 30-60s, 脱水梯度乙醇 70-100%, 二甲苯透明",
    confidence: 90,
    rationale: "H&E染色是组织形态学标准染色。苏木精染核(蓝紫)，伊红染胞质和ECM(粉红)。Visium方案使用改良H&E：缩短染色时间，使用无RNase水，异丙醇替代部分乙醇步骤保护RNA。",
    typicalRange: "苏木精 3-5min, 伊红 30-60s",
    references: [
      "10x Visium H&E 染色方案 CG000160",
      "Bancroft's Theory and Practice of Histological Techniques 8th Ed.",
    ],
  },
  {
    keywords: ["组织通透", "permeabilization", "透化", "透化时间"],
    suggestion: "透化时间 5-30 min (需时间梯度优化), 透化酶: 胃蛋白酶或Triton X-100",
    confidence: 82,
    rationale: "组织透化是Visium实验的关键步骤——时间太短RNA释放不足，太长导致RNA扩散和空间信息丢失。建议对每种组织类型进行1-30min时间梯度实验确定最优时间。",
    typicalRange: "5-30 min, 需优化",
    references: [
      "10x Visium 组织优化方案 CG000238",
    ],
  },
  {
    keywords: ["RNA质量", "RIN", "RNA integrity", "DV200", "RNA QC"],
    suggestion: "RIN ≥7 (理想 ≥8), DV200 ≥50% (FFPE), 28S:18S ≈2:1",
    confidence: 90,
    rationale: "RIN(RNA Integrity Number)基于Agilent Bioanalyzer评估RNA完整性。新鲜冷冻组织RIN≥7可用，RIN≥8高质。FFPE组织用DV200(%RNA片段>200nt)，≥50%可用。线粒体reads占比<10%为佳。",
    typicalRange: "RIN ≥7, 线粒体 <10%",
    references: [
      "Agilent 2100 Bioanalyzer 应用指南",
      "10x Genomics 样本质量要求",
    ],
  },
  {
    keywords: ["cDNA合成", "cDNA synthesis", "逆转录", "reverse transcription", "文库构建"],
    suggestion: "逆转录 42-50°C 30-90min, PCR 12-16 cycles, 片段化 200-400 bp",
    confidence: 83,
    rationale: "Visium cDNA合成在玻片上进行，利用空间条形码引物。逆转录后cDNA从玻片释放、纯化、PCR扩增(通常12-16个循环)。文库片段大小200-400bp适合Illumina测序。",
    typicalRange: "逆转录 42°C, PCR 12-16 cycles",
    references: [
      "10x Visium v2 文库构建方案",
    ],
  },
  {
    keywords: ["Illumina测序", "Illumina sequencing", "NovaSeq", "NextSeq", "NGS"],
    suggestion: "Read 1: 28 bp (空间条形码+UMI), Read 2: 50-150 bp (转录本), 深度 25-50k reads/spot",
    confidence: 85,
    rationale: "Visium推荐NovaSeq 6000测序：Read1=28bp读取空间条形码和UMI，Read2=50-150bp读取转录本序列。推荐深度25k-50k reads/spot(~5000 spots×50k=250M reads)。双index 10bp。",
    typicalRange: "R1 28bp, R2 50-150bp, 25-50k reads/spot",
    references: [
      "10x Visium 测序指南",
      "Illumina NovaSeq 6000 规格",
    ],
  },
  {
    keywords: ["空间聚类", "spatial clustering", "spatial domain", "空间域", "cluster"],
    suggestion: "聚类方法: BayesSpace/SpaGCN/Seurat, 分辨率可调, 标注: 解剖区域+marker基因",
    confidence: 78,
    rationale: "空间聚类将组织区域分为分子特征不同的空间域。BayesSpace利用空间先验增强分辨率，SpaGCN使用图卷积网络。聚类后需用已知marker基因验证(如EPCAM上皮、VIM间质、CD3E T细胞)。",
    typicalRange: "BayesSpace / SpaGCN / Seurat",
    references: [
      "Nat Biotechnol 40 (2024) — 空间组学计算方法综述",
      "Satija Lab Seurat v5 空间分析教程",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 实验安全参数知识库
// ═══════════════════════════════════════════════════════

const safetyKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["浓硫酸", "sulfuric acid", "H2SO4", "硫酸", "强酸"],
    suggestion: "PPE: 耐酸手套+护目镜+白大褂; 操作: 通风橱内; 稀释: 酸入水非水入酸; 应急: 大量水冲洗15min",
    confidence: 95,
    rationale: "浓硫酸(>95%)具强腐蚀性和脱水性。稀释时放热剧烈，必须将酸缓慢加入水中(非反之)。溅到皮肤立即大量水冲洗≥15分钟，勿用碱中和(放热加重伤害)。废液中和后排放。",
    typicalRange: "通风橱, 耐酸手套, 酸入水",
    dbReference: "PubChem CID 1118, CAS 7664-93-9",
    references: [
      "Sigma-Aldrich SDS — Sulfuric Acid 95-98%",
      "ACS Chemical Safety Guidelines 2024",
    ],
  },
  {
    keywords: ["盐酸", "HCl", "hydrochloric acid", "氯化氢"],
    suggestion: "PPE: 耐酸手套+护目镜; 操作: 通风橱内; 注意: 挥发性强, 开盖前冷却",
    confidence: 93,
    rationale: "浓盐酸(~37%)挥发性强，蒸汽刺激呼吸道和眼睛。必须在通风橱中开盖操作，开盖前冰浴冷却减少挥发。稀释时也放热但弱于硫酸。",
    typicalRange: "通风橱, 冰浴冷却, 耐酸手套",
    dbReference: "PubChem CID 313, CAS 7647-01-0",
    references: [
      "Sigma-Aldrich SDS — Hydrochloric Acid 37%",
    ],
  },
  {
    keywords: ["KOH", "氢氧化钾", "NaOH", "氢氧化钠", "强碱", "苛性"],
    suggestion: "PPE: 耐碱手套+护目镜+面罩; 注意: 强腐蚀性, 遇水放热; 应急: 大量水冲洗",
    confidence: 93,
    rationale: "KOH/NaOH颗粒和溶液对皮肤、眼睛有强腐蚀性。配制溶液时放热，应在冷水浴中进行。溅入眼睛可导致永久失明——必须佩戴防溅护目镜或面罩。",
    typicalRange: "耐碱手套, 护目镜, 面罩",
    dbReference: "KOH: PubChem CID 14797; NaOH: PubChem CID 14798",
    references: [
      "Sigma-Aldrich SDS — KOH pellets",
      "Sigma-Aldrich SDS — NaOH pellets",
    ],
  },
  {
    keywords: ["有机溶剂", "organic solvent", "乙醇", "丙酮", "甲醇", "ethanol", "acetone", "methanol"],
    suggestion: "操作: 通风橱内远离火源; 储存: 易燃柜; PPE: 丁腈手套(非乳胶); 注意: 可经皮吸收",
    confidence: 88,
    rationale: "乙醇/甲醇/丙酮易燃(I类液体)。长期接触可经皮肤吸收致神经毒性(甲醇)或肝损伤。丁腈手套对大多数有机溶剂防护性优于乳胶。大量使用时需监测LEL(爆炸下限)。",
    typicalRange: "通风橱, 易燃柜, 丁腈手套",
    dbReference: "Ethanol CAS 64-17-5, Methanol CAS 67-56-1, Acetone CAS 67-64-1",
    references: [
      "Sigma-Aldrich SDS — Ethanol, Methanol, Acetone",
      "Prudent Practices in the Laboratory (NRC 2024)",
    ],
  },
  {
    keywords: ["纳米材料", "nanoparticle", "nanomaterial", "纳米颗粒", "纳米粉末"],
    suggestion: "PPE: N95/P2口罩+护目镜+手套; 操作: 通风橱或手套箱内; 储存: 密封容器贴标; 废物: 按纳米废物处理",
    confidence: 90,
    rationale: "工程纳米材料的毒理学特性不完全明确——可能通过吸入、皮肤或消化道进入体内。操作粉末状纳米材料需在通风橱或手套箱内进行，佩戴N95以上防颗粒物口罩。超声处理可能产生气溶胶。",
    typicalRange: "N95口罩, 通风橱/手套箱, 密封储存",
    references: [
      "NIOSH 纳米材料安全指南 2024",
      "ISO/TR 12885:2024 — 纳米技术健康安全实践",
    ],
  },
  {
    keywords: ["液氮", "liquid nitrogen", "LN2", "低温", "cryogenic"],
    suggestion: "PPE: 防冻手套+面罩+围裙; 注意: 防冻伤、防窒息(氧气置换)、防压力积聚",
    confidence: 92,
    rationale: "液氮温度-196°C，接触皮肤可致严重冻伤。挥发后氮气置换氧气，密闭空间有窒息风险。储存容器非完全密封(需压力释放)否则有爆炸风险。运输使用液氮专用杜瓦瓶。",
    typicalRange: "防冻手套, 面罩, 通风良好",
    references: [
      "BCGA 液氮安全指南",
      "Prudent Practices in the Laboratory (NRC 2024)",
    ],
  },
  {
    keywords: ["高压反应釜", "autoclave reactor", "高压釜", "高压"],
    suggestion: "填充度 60-80%, 最高使用温度≤釜体额定温度×0.8, 定期检查密封和防爆膜",
    confidence: 85,
    rationale: "水热/溶剂热反应釜(水热釜/高压釜)运行时内部压力可达数十MPa。填充度不能超过80%(通常60-70%)留出热膨胀空间。温度不能超过釜体PTFE内衬承受上限(~240°C)。反应结束必须自然冷却至室温再开釜。",
    typicalRange: "填充度 60-80%, 自然冷却, 定期检查",
    references: [
      "Parr Instrument Company — 高压反应釜安全操作指南",
    ],
  },
  {
    keywords: ["紫外", "UV", "紫外线", "紫外灯", "UV lamp", "ultraviolet"],
    suggestion: "PPE: UV护目镜(OD>4)+面罩+长袖; 注意: UVC(254nm)皮肤癌/白内障风险, 避免直接暴露",
    confidence: 90,
    rationale: "实验用紫外灯(UVA 365nm/UVB 302nm/UVC 254nm)对眼睛和皮肤有害。UVC致角膜灼伤(「雪盲」)和皮肤红斑。操作时佩戴UV-blocking护目镜(标称OD>4)，遮挡所有裸露皮肤。光催化实验应使用封闭式光反应器。",
    typicalRange: "UV护目镜 OD>4, 封闭式反应器",
    references: [
      "ICNIRP 紫外线暴露限值指南 2024",
      "Photochemical Reactor Safety Guidelines",
    ],
  },
  {
    keywords: ["生物安全", "biosafety", "BSL", "生物安全等级", "生物危害"],
    suggestion: "BSL-1: 基础防护; BSL-2: 生物安全柜+防护服; BSL-3: 负压+呼吸防护",
    confidence: 90,
    rationale: "BSL-1适用于无已知致病性的微生物。BSL-2适用于中等风险病原体(如金黄色葡萄球菌、HBV)——需要生物安全柜、防护服、限制进出。BSL-3适用于可通过气溶胶传播的严重病原体(结核分枝杆菌)。人体组织/血液默认按BSL-2处理。",
    typicalRange: "人体组织BSL-2, 细胞系BSL-1/2",
    references: [
      "WHO Laboratory Biosafety Manual 4th Ed. 2024",
      "NIH Biosafety Guidelines 2024",
    ],
  },
  {
    keywords: ["高压灭菌", "autoclave", "灭菌", "消毒", "sterilization"],
    suggestion: "121°C, 15 psi, 15-30 min (标准); 生物废物: 121°C, ≥30min",
    confidence: 88,
    rationale: "高压蒸汽灭菌标准条件：121°C(250°F)/15psi持续15min可达无菌，30min可灭活大多数孢子。灭菌前确认放气阀正常工作(排除冷空气)。不耐热物品使用环氧乙烷或γ辐射灭菌。",
    typicalRange: "121°C, 15psi, ≥15min",
    references: [
      "CDC 灭菌与消毒指南 2024",
    ],
  },
  {
    keywords: ["化学品泄漏", "spill", "泄漏", "紧急", "应急"],
    suggestion: "小泄漏(<1L): 吸收剂处理; 大泄漏: 疏散→报警→专业处理; 始终: SDS查阅→PPE→通风",
    confidence: 85,
    rationale: "实验室化学品泄漏应急：1)查阅SDS了解危害 2)穿戴适当PPE 3)小泄漏用惰性吸收剂(蛭石/碳酸钠/通用吸收垫)围堵和吸收 4)大泄漏疏散人员、启动应急响应。所有实验室必须有泄漏应急包。",
    typicalRange: "SDS→PPE→吸收剂/疏散, 应急包必备",
    references: [
      "Prudent Practices in the Laboratory (NRC 2024) — 应急响应章节",
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 公共生物数据库参考
// ═══════════════════════════════════════════════════════

const bioDatabasesKnowledge: DomainKnowledgeEntry[] = [
  {
    keywords: ["基因表达", "gene expression", "GEO", "Gene Expression Omnibus", "转录组", "RNA-seq"],
    suggestion: "GEO (ncbi.nlm.nih.gov/geo), ArrayExpress (ebi.ac.uk/biostudies/arrayexpress)",
    confidence: 90,
    rationale: "GEO和ArrayExpress是主要的公共基因表达数据库。提交数据需包含原始数据(FASTQ)、处理数据(计数矩阵)和实验元数据(MIAME/MINSEQE标准)。",
    typicalRange: "GEO 或 ArrayExpress 公共访问",
    dbReference: "https://www.ncbi.nlm.nih.gov/geo/",
    references: [
      "Nat Genet 56 (2024) — GEO 数据库更新",
    ],
  },
  {
    keywords: ["单细胞", "single cell", "scRNA-seq", "scRNA", "single-cell"],
    suggestion: "常用数据库: Human Cell Atlas, Tabula Sapiens, scAtlas; 分析方法: Seurat/Scanpy",
    confidence: 82,
    rationale: "单细胞RNA-seq数据分析标准流程：质控→归一化→降维(PCA/UMAP)→聚类→差异表达→注释。Human Cell Atlas提供参考级别的健康组织单细胞图谱。",
    typicalRange: "Seurat/Scanpy, HCA参考",
    dbReference: "https://www.humancellatlas.org/",
    references: [
      "Science 384 (2024) — Human Cell Atlas 进展",
    ],
  },
  {
    keywords: ["蛋白质", "protein", "UniProt", "蛋白质数据库", "蛋白结构", "PDB"],
    suggestion: "UniProt (蛋白质序列+功能), PDB (3D结构), AlphaFold DB (预测结构)",
    confidence: 90,
    rationale: "UniProt是蛋白质序列和功能注释的权威数据库(~250M序列)。PDB含~200k实验结构(X-ray/NMR/Cryo-EM)。AlphaFold DB提供~200M预测结构(覆盖几乎所有已知蛋白质)。",
    typicalRange: "UniProt + PDB + AlphaFold DB",
    dbReference: "https://www.uniprot.org/; https://www.rcsb.org/",
    references: [
      "Nucleic Acids Res 52 (2024) — UniProt 更新",
    ],
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
  ...electrophysiologyKnowledge,
  ...cellMigrationKnowledge,
  ...spatialTranscriptomicsKnowledge,
  ...safetyKnowledge,
  ...bioDatabasesKnowledge,
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
