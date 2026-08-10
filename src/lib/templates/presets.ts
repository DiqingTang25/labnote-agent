/**
 * LabNote Agent — 实验模板库
 *
 * 25 个细分模板 + 1 个通用回退模板。
 * 来源：NOMAD, Materials Project, MLflow, ISA-TAB, LabIMotion, Allotrope ASM 等开源标准。
 * 全部由 Gemini 调研并转换为 LabNote field_groups 格式。
 */

import type { Template } from "../exp-core";

// ═══════════════════════════════════════════════════════
// 通用回退模板
// ═══════════════════════════════════════════════════════

export const GENERIC_TEMPLATE: Template = {
  id: "tpl_generic", name: "通用实验", experimentType: "other", domain: "通用", version: 1, isPreset: true,
  fieldGroups: [
    { id: "meta", label: "基本信息", chunkType: "meta", fields: [
      { path: "purpose", label: "实验目的", type: "textarea", required: true },
      { path: "hypothesis", label: "实验假设", type: "textarea" },
      { path: "background", label: "背景说明", type: "textarea" },
      { path: "conclusion", label: "实验结论", type: "textarea" },
      { path: "discipline", label: "学科", type: "text" },
    ]},
    { id: "equipment", label: "仪器与设备", chunkType: "device_sample", fields: [
      { path: "device.name", label: "设备名称", type: "text" },
      { path: "device.model", label: "型号", type: "text" },
    ]},
    { id: "materials", label: "试剂与材料", chunkType: "device_sample", fields: [
      { path: "sample.id", label: "样品编号", type: "text" },
      { path: "sample.batch", label: "批次", type: "text" },
    ]},
    { id: "params", label: "实验参数", chunkType: "params_steps", fields: [
      { path: "environment.temperature", label: "温度", type: "text" },
      { path: "environment.humidity", label: "湿度", type: "text" },
    ]},
    { id: "results", label: "结果与备注", chunkType: "results", fields: [
      { path: "results", label: "结果数据", type: "textarea" },
      { path: "notes", label: "异常与备注", type: "textarea" },
    ]},
  ],
};

// ═══════════════════════════════════════════════════════
// 计算化学 — 7 个模板
// ═══════════════════════════════════════════════════════

export const TPL_STRUCTURE_OPTIMIZATION: Template = {
  id: "tpl_structure_optimization", name: "DFT结构优化", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["dft", "vasp", "quantum espresso", "structure opt", "relax", "optimization", "geometry optimization", "encut", "kpoints", "isif"],,
  fieldGroups: [
    { id: "input_structure", label: "输入结构", fields: [
      { path: "structure.cifFileRef", label: "CIF文件路径", type: "text", required: true, placeholder: "s3://dft-data/structures/init_POSCAR.cif" },
      { path: "structure.spaceGroup", label: "空间群", type: "text", placeholder: "如：Fm-3m" },
    ]},
    { id: "parameters", label: "计算参数", fields: [
      { path: "parameters.codeVersion", label: "软件及版本", type: "select", required: true, options: ["VASP 6.4.2", "Quantum ESPRESSO 7.2", "CP2K 2024.1"] },
      { path: "parameters.xcFunctional", label: "交换关联泛函", type: "select", required: true, options: ["PBE", "PBEsol", "HSE06", "SCAN"] },
      { path: "parameters.encut", label: "截断能", type: "number",
      constraints: { min: 100, max: 2000, typicalRange: [300, 600], source: 'VASP manual ENCUT; NOMAD Metainfo' }, unit: "eV", required: true, placeholder: "520" },
      { path: "parameters.isif", label: "弛豫模式 (ISIF)", type: "select", required: true, options: ["2 (仅原子位置)", "3 (全弛豫)", "4 (形状+原子)"] },
      { path: "parameters.ediffg", label: "力收敛标准", type: "number",
      constraints: { min: -1, max: -1e-8, typicalRange: [-0.05, -0.001], source: 'VASP manual EDIFFG; NOMAD Metainfo' }, unit: "eV/Å", required: true, placeholder: "-0.01" },
    ]},
    { id: "outputs", label: "计算结果", fields: [
      { path: "outputs.relaxedEnergy", label: "弛豫后总能", type: "number", unit: "eV", required: true, placeholder: "-34.512" },
      { path: "outputs.isConverged", label: "是否收敛", type: "boolean", required: true },
      { path: "outputs.finalVolume", label: "终态晶胞体积", type: "number",
      constraints: { min: 0, typicalRange: [10, 10000], source: 'NOMAD Metainfo; positive cell volume' }, unit: "Å³", placeholder: "172.4" },
    ]},
  ],
};

export const TPL_BAND_STRUCTURE: Template = {
  id: "tpl_band_structure", name: "能带结构计算", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["band structure", "band gap", "dos", "density of states", "fermi", "conduction", "valence", "k-path", "brillouin"],,
  fieldGroups: [
    { id: "kpath_config", label: "K路径配置", fields: [
      { path: "kpath.highSymmetryPath", label: "高对称路径", type: "text", required: true, placeholder: "G-X-W-K-G-L-U-W-L-K" },
      { path: "kpath.numKpointsPerSegment", label: "每段K点数", type: "number",
      constraints: { min: 1, typicalRange: [20, 200], source: 'NOMAD Metainfo; band-path sampling' }, required: true, placeholder: "50" },
    ]},
    { id: "electronic_properties", label: "电子学性质", fields: [
      { path: "properties.bandGap", label: "带隙大小", type: "number",
      constraints: { min: 0, max: 50, typicalRange: [0, 5], source: 'NOMAD Metainfo; electronic band-gap' }, unit: "eV", required: true, placeholder: "1.12" },
      { path: "properties.isDirectGap", label: "是否直接带隙", type: "boolean", required: true },
      { path: "properties.fermiEnergy", label: "费米能级", type: "number", unit: "eV", required: true, placeholder: "5.88" },
    ]},
  ],
};

export const TPL_PHONON_SPECTRUM: Template = {
  id: "tpl_phonon_spectrum", name: "声子谱计算", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["phonon", "phonopy", "vibrational", "thermal", "heat capacity", "entropy", "born", "dynamical matrix"],,
  fieldGroups: [
    { id: "supercell_params", label: "超胞参数", fields: [
      { path: "supercell.dimension", label: "超胞尺寸", type: "text", required: true, placeholder: "2x2x2" },
      { path: "displacement.distance", label: "有限位移距离", type: "number",
      constraints: { min: 0.000001, max: 1, typicalRange: [0.005, 0.05], source: 'Phonopy documentation; finite-displacement' }, unit: "Å", required: true, placeholder: "0.01" },
    ]},
    { id: "phonon_outputs", label: "声子谱结果", fields: [
      { path: "outputs.hasImaginaryModes", label: "是否存在虚频", type: "boolean", required: true },
      { path: "outputs.minFrequency", label: "最低频率", type: "number",
      constraints: { min: -50, max: 200, typicalRange: [0, 30], source: 'NOMAD Metainfo; lattice-dynamics' }, unit: "THz", required: true, placeholder: "0.12" },
      { path: "outputs.heatCapacityCv", label: "定容热容 Cv", type: "number",
      constraints: { min: 0, typicalRange: [0, 200], source: 'Statistical thermodynamics; Dulong-Petit limit' }, unit: "J/(mol·K)", placeholder: "24.8" },
    ]},
  ],
};

export const TPL_NEB_SEARCH: Template = {
  id: "tpl_neb_search", name: "NEB过渡态搜索", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["neb", "nudged elastic band", "transition state", "saddle point", "barrier", "activation energy", "climbing image", "reaction path"],,
  fieldGroups: [
    { id: "images_setup", label: "构型插值设定", fields: [
      { path: "images.numImages", label: "中间构型数量", type: "number",
      constraints: { min: 1, max: 100, typicalRange: [3, 20], source: 'ASE/VASP NEB practice' }, required: true, placeholder: "7" },
      { path: "images.initialStateRef", label: "初态结构路径", type: "text", required: true, placeholder: "s3://neb/init.cif" },
      { path: "images.finalStateRef", label: "终态结构路径", type: "text", required: true, placeholder: "s3://neb/final.cif" },
    ]},
    { id: "barrier_results", label: "能垒计算结果", fields: [
      { path: "results.climbingImageEnabled", label: "开启攀爬模式 (CI-NEB)", type: "boolean", required: true },
      { path: "results.activationEnergyForward", label: "正向反应能垒", type: "number",
      constraints: { min: 0, max: 20, typicalRange: [0.1, 3], source: 'Transition-state theory; NEB barrier literature' }, unit: "eV", required: true, placeholder: "0.45" },
      { path: "results.reactionEnergy", label: "反应热 ΔE", type: "number",
      constraints: { typicalRange: [-5, 5], source: 'Thermochemistry; system-dependent' }, unit: "eV", placeholder: "-0.75" },
    ]},
  ],
};

export const TPL_AIMD: Template = {
  id: "tpl_aimd", name: "从头算分子动力学 (AIMD)", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["aimd", "ab initio md", "molecular dynamics", "born oppenheimer", "cp2k", "car parrinello", "diffusion", "rdf", "vaf"],,
  fieldGroups: [
    { id: "ensemble_control", label: "系综控制", fields: [
      { path: "ensemble.type", label: "系综类型", type: "select", required: true, options: ["NVT", "NPT", "NVE"] },
      { path: "ensemble.temperature", label: "模拟温度", type: "number",
      constraints: { min: 0, typicalRange: [100, 2000], source: 'AIMD practice; NOMAD MD schema' }, unit: "K", required: true, placeholder: "500" },
      { path: "ensemble.timeStep", label: "时间步长", type: "number",
      constraints: { min: 0.01, max: 10, typicalRange: [0.5, 2], source: 'AIMD stability; VASP MD' }, unit: "fs", required: true, placeholder: "0.5" },
      { path: "ensemble.totalSteps", label: "总步数", type: "number",
      constraints: { min: 1, typicalRange: [1000, 1000000], source: 'MD production practice; NOMAD MD schema' }, required: true, placeholder: "20000" },
    ]},
    { id: "trajectory_analysis", label: "轨迹与分析", fields: [
      { path: "analysis.trajectoryRef", label: "轨迹文件路径", type: "text", required: true, placeholder: "s3://aimd/traj.xyz" },
      { path: "analysis.diffusionCoefficient", label: "扩散系数", type: "number",
      constraints: { min: 0, typicalRange: [1e-10, 1e-3], source: 'MD transport-coefficient ranges' }, unit: "cm²/s", placeholder: "1.2e-5" },
    ]},
  ],
};

export const TPL_OPTICAL_PROPERTIES: Template = {
  id: "tpl_optical_properties", name: "光学性质计算", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["optical", "dielectric", "absorption", "bse", "bethe salpeter", "gw", "exciton", "reflectance", "refractive", "extinction"],,
  fieldGroups: [
    { id: "methodology", label: "方法配置", fields: [
      { path: "method.type", label: "理论方法", type: "select", required: true, options: ["BSE", "RPA", "TD-DFT"] },
      { path: "method.broadening", label: "展宽因子", type: "number",
      constraints: { min: 0, max: 5, typicalRange: [0.01, 0.5], source: 'VASP/NOMAD optical post-processing' }, unit: "eV", placeholder: "0.1" },
    ]},
    { id: "optical_outputs", label: "光学响应结果", fields: [
      { path: "outputs.staticDielectricConstant", label: "静态介电常数 (实部)", type: "number",
      constraints: { min: 0, typicalRange: [1, 100], source: 'Dielectric-constant data; NOMAD/MP' }, required: true, placeholder: "11.7" },
      { path: "outputs.absorptionPeak", label: "主吸收峰位置", type: "number",
      constraints: { min: 0, typicalRange: [0.1, 10], source: 'Optical spectroscopy energy ranges' }, unit: "eV", required: true, placeholder: "3.2" },
    ]},
  ],
};

export const TPL_ELASTIC_CONSTANTS: Template = {
  id: "tpl_elastic_constants", name: "弹性常数计算", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["elastic", "stiffness", "bulk modulus", "shear modulus", "young modulus", "poisson", "voigt", "reuss", "hill", "stress strain"],,
  fieldGroups: [
    { id: "strain_setup", label: "应变设定", fields: [
      { path: "strain.maxStrain", label: "最大微应变幅度", type: "number",
      constraints: { min: 0, max: 20, typicalRange: [0.1, 2], source: 'Linear-elastic DFT strain; NOMAD' }, unit: "%", required: true, placeholder: "1.0" },
    ]},
    { id: "derived_moduli", label: "宏观模量结果", fields: [
      { path: "moduli.bulkModulusVrh", label: "体积模量 (VRH)", type: "number",
      constraints: { min: 0, typicalRange: [10, 400], source: 'Elastic-moduli data; MP/NOMAD' }, unit: "GPa", required: true, placeholder: "97.6" },
      { path: "moduli.shearModulusVrh", label: "剪切模量 (VRH)", type: "number",
      constraints: { min: 0, typicalRange: [1, 300], source: 'Elastic-moduli data; MP/NOMAD' }, unit: "GPa", required: true, placeholder: "68.2" },
      { path: "moduli.poissonRatio", label: "泊松比", type: "number",
      constraints: { min: -1, max: 0.5, typicalRange: [0.1, 0.4], source: 'Elastic stability bounds for isotropic solids' }, placeholder: "0.22" },
    ]},
  ],
};

// ═══════════════════════════════════════════════════════
// 分子动力学 — 4 个模板
// ═══════════════════════════════════════════════════════

export const TPL_PROTEIN_SOLVATION_MD: Template = {
  id: "tpl_protein_solvation_md", name: "蛋白质水中平衡模拟", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["protein", "solvation", "gromacs", "amber", "rmsd", "rmsf", "water model", "tip3p", "spce", "equilibration", "nvt", "npt"],,
  fieldGroups: [
    { id: "system_prep", label: "体系构建", fields: [
      { path: "system.pdbId", label: "PDB ID", type: "text", required: true, placeholder: "1AKI" },
      { path: "system.forcefield", label: "力场名称", type: "select", required: true, options: ["AMBER99SB-ILDN", "CHARMM36", "OPLS-AA"] },
      { path: "system.waterModel", label: "水模型", type: "select", required: true, options: ["TIP3P", "SPC/E", "TIP4P"] },
    ]},
    { id: "production_md", label: "成品MD参数", fields: [
      { path: "production.duration", label: "模拟时长", type: "number",
      constraints: { min: 0, typicalRange: [1, 1000], source: 'Biomolecular MD practice; GROMACS/AMBER' }, unit: "ns", required: true, placeholder: "100" },
      { path: "production.temperature", label: "模拟温度", type: "number",
      constraints: { min: 0, typicalRange: [280, 320], source: 'Biomolecular MD practice; GROMACS/AMBER' }, unit: "K", required: true, placeholder: "300" },
      { path: "analysis.backboneRmsd", label: "骨架 RMSD 平均值", type: "number",
      constraints: { min: 0, typicalRange: [0.05, 1], source: 'Protein MD RMSD analysis; GROMACS' }, unit: "nm", required: true, placeholder: "0.18" },
    ]},
  ],
};

export const TPL_BINDING_FREE_ENERGY: Template = {
  id: "tpl_binding_free_energy", name: "配体-蛋白结合自由能", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["binding", "free energy", "mmpbsa", "mmgbsa", "delta g", "umbrella sampling", "ligand", "receptor", "affinity", "docking"],,
  fieldGroups: [
    { id: "method_config", label: "计算方法配置", fields: [
      { path: "method.type", label: "计算方法", type: "select", required: true, options: ["MM/PBSA", "MM/GBSA", "Umbrella Sampling"] },
      { path: "method.framesSampled", label: "抽样帧数", type: "number",
      constraints: { min: 1, typicalRange: [100, 10000], source: 'MM-PBSA/free-energy sampling practice' }, required: true, placeholder: "500" },
    ]},
    { id: "energy_components", label: "自由能分解结果", fields: [
      { path: "energy.vanDerWaals", label: "范德华作用贡献", type: "number",
      constraints: { typicalRange: [-100, 0], source: 'MM-PBSA/nonbonded energy-component' }, unit: "kcal/mol", placeholder: "-35.4" },
      { path: "energy.totalDeltaG", label: "总结合自由能 ΔG", type: "number",
      constraints: { typicalRange: [-30, 0], source: 'Binding free-energy literature; MM-PBSA' }, unit: "kcal/mol", required: true, placeholder: "-29.4" },
    ]},
  ],
};

export const TPL_LAMMPS_TENSILE: Template = {
  id: "tpl_lammps_tensile", name: "材料拉伸力学模拟", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["lammps", "tensile", "strain rate", "yield", "deformation", "eam", "meam", "reaxff", "stress strain", "mechanical"],,
  fieldGroups: [
    { id: "deform_params", label: "加载参数", fields: [
      { path: "deform.strainRate", label: "应变速率", type: "number",
      constraints: { min: 1e-12, typicalRange: [1e6, 1e10], source: 'MD deformation practice; LAMMPS' }, unit: "1/s", required: true, placeholder: "1e8" },
      { path: "deform.direction", label: "拉伸方向", type: "select", required: true, options: ["x", "y", "z"] },
    ]},
    { id: "mechanical_outputs", label: "力学响应", fields: [
      { path: "outputs.yieldStrength", label: "屈服强度", type: "number",
      constraints: { min: 0, typicalRange: [0.1, 20], source: 'Material strength data; MD tensile' }, unit: "GPa", required: true, placeholder: "8.5" },
      { path: "outputs.stressStrainCurveRef", label: "应力-应变数据路径", type: "text", required: true, placeholder: "s3://lammps/ss.csv" },
    ]},
  ],
};

export const TPL_COARSE_GRAINED_MARTINI: Template = {
  id: "tpl_coarse_grained_martini", name: "Martini 粗粒化膜蛋白模拟", experimentType: "simulation", domain: "computational_chemistry", version: 1, isPreset: true,
  keywords: ["martini", "coarse grained", "cg", "membrane", "lipid", "bilayer", "area per lipid", "cholesterol", "popc"],,
  fieldGroups: [
    { id: "cg_config", label: "粗粒化配置", fields: [
      { path: "cg.martiniVersion", label: "Martini 版本", type: "select", required: true, options: ["v3.0.0", "v2.2"] },
      { path: "cg.duration", label: "模拟时长", type: "number",
      constraints: { min: 0, typicalRange: [0.1, 100], source: 'Martini CG-MD practice' }, unit: "μs", required: true, placeholder: "10.0" },
    ]},
    { id: "membrane_properties", label: "脂质膜结构性质", fields: [
      { path: "properties.areaPerLipid", label: "单脂分子面积", type: "number",
      constraints: { min: 0.01, max: 5, typicalRange: [0.45, 0.8], source: 'Lipid-bilayer/Martini simulation literature' }, unit: "nm²", required: true, placeholder: "0.64" },
      { path: "properties.membraneThickness", label: "膜厚度", type: "number",
      constraints: { min: 0.1, typicalRange: [2.5, 5.5], source: 'Lipid-bilayer thickness literature' }, unit: "nm", placeholder: "3.9" },
    ]},
  ],
};

// ═══════════════════════════════════════════════════════
// 机器学习 — 5 个模板
// ═══════════════════════════════════════════════════════

export const TPL_IMAGE_CLASSIFICATION: Template = {
  id: "tpl_image_classification", name: "图像分类模型训练", experimentType: "other", domain: "machine_learning", version: 1, isPreset: true,
  keywords: ["image", "classification", "resnet", "vit", "cnn", "vision transformer", "efficientnet", "top1", "accuracy", "augmentation", "imagenet"],,
  fieldGroups: [
    { id: "architecture", label: "模型架构", fields: [
      { path: "model.backbone", label: "骨干网络", type: "text", required: true, placeholder: "ResNet-50 / ViT-B/16" },
      { path: "model.pretrainedWeights", label: "预训练权重", type: "text", placeholder: "ImageNet-1k" },
    ]},
    { id: "hyperparameters", label: "训练超参数", fields: [
      { path: "hyperparams.optimizer", label: "优化器", type: "select", required: true, options: ["AdamW", "SGD", "Adam"] },
      { path: "hyperparams.lr", label: "学习率", type: "number",
      constraints: { min: 0, typicalRange: [1e-6, 0.1], source: 'Deep-learning optimizer practice; MLflow' }, required: true, placeholder: "0.0005" },
      { path: "hyperparams.batchSize", label: "批次大小 (Batch Size)", type: "number",
      constraints: { min: 1, typicalRange: [16, 1024], source: 'Deep-learning training practice; MLflow' }, required: true, placeholder: "128" },
    ]},
    { id: "metrics", label: "评估指标", fields: [
      { path: "metrics.top1Accuracy", label: "Top-1 准确率", type: "number",
      constraints: { min: 0, max: 1, source: 'Classification metric definition' }, required: true, placeholder: "0.894" },
    ]},
  ],
};

export const TPL_NLP_FINETUNING: Template = {
  id: "tpl_nlp_finetuning", name: "NLP 文本模型微调", experimentType: "other", domain: "machine_learning", version: 1, isPreset: true,
  keywords: ["nlp", "bert", "gpt", "llm", "finetune", "bleu", "rouge", "transformer", "language model", "token", "prompt", "lora"],,
  fieldGroups: [
    { id: "model_config", label: "模型与微调配置", fields: [
      { path: "model.baseModel", label: "基座模型", type: "text", required: true, placeholder: "chembert-base-uncased" },
      { path: "model.promptTemplate", label: "Prompt 模板", type: "textarea", required: true, placeholder: "Extract chemical synthesis steps from: {text}" },
    ]},
    { id: "metrics", label: "生成质量指标", fields: [
      { path: "metrics.bleu4", label: "BLEU-4 分数", type: "number",
      constraints: { min: 0, max: 100, typicalRange: [0, 60], source: 'BLEU-4 metric scale' }, required: true, placeholder: "38.5" },
      { path: "metrics.rougeL", label: "ROUGE-L 分数", type: "number",
      constraints: { min: 0, max: 100, typicalRange: [0, 80], source: 'ROUGE-L metric scale' }, placeholder: "52.1" },
    ]},
  ],
};

export const TPL_GNN_MOLECULE_PREDICTION: Template = {
  id: "tpl_gnn_molecule_prediction", name: "GNN 分子性质预测", experimentType: "other", domain: "machine_learning", version: 1, isPreset: true,
  keywords: ["gnn", "graph neural", "schnet", "dimenet", "qm9", "molecule", "homo", "lumo", "mae", "rmse", "atomic", "bond"],,
  fieldGroups: [
    { id: "dataset", label: "数据集设定", fields: [
      { path: "dataset.name", label: "数据集名称", type: "text", required: true, placeholder: "QM9" },
      { path: "dataset.targetProperty", label: "目标预测性质", type: "text", required: true, placeholder: "homo_lumo_gap" },
    ]},
    { id: "gnn_performance", label: "GNN 性能表现", fields: [
      { path: "model.type", label: "图网络类型", type: "select", required: true, options: ["SchNet", "DimeNet", "EGNN"] },
      { path: "metrics.mae", label: "平均绝对误差 (MAE)", type: "number",
      constraints: { min: 0, typicalRange: [0.01, 1], source: 'GNN molecular-property benchmark' }, unit: "eV", required: true, placeholder: "0.035" },
    ]},
  ],
};

export const TPL_REINFORCEMENT_LEARNING: Template = {
  id: "tpl_reinforcement_learning", name: "强化学习分子设计", experimentType: "other", domain: "machine_learning", version: 1, isPreset: true,
  keywords: ["reinforcement", "rl", "ppo", "sac", "dqn", "agent", "reward", "policy", "environment", "action", "state", "q learning"],,
  fieldGroups: [
    { id: "rl_environment", label: "强化学习环境", fields: [
      { path: "env.envId", label: "环境标识符", type: "text", required: true, placeholder: "MolecularDesign-v0" },
      { path: "env.rewardFunction", label: "奖励函数公式", type: "textarea", required: true, placeholder: "QED + SA_Score - Toxicity" },
    ]},
    { id: "rl_results", label: "收敛结果", fields: [
      { path: "algorithm.agentType", label: "Agent 算法", type: "select", required: true, options: ["PPO", "SAC", "DQN"] },
      { path: "results.meanRewardLast100", label: "近100轮平均 Reward", type: "number", required: true, placeholder: "8.45" },
    ]},
  ],
};

export const TPL_TIME_SERIES_FORECASTING: Template = {
  id: "tpl_time_series_forecasting", name: "时间序列预测", experimentType: "other", domain: "machine_learning", version: 1, isPreset: true,
  keywords: ["time series", "forecast", "mape", "sliding window", "temporal", "lstm", "arima", "prophet", "tft", "seasonal", "trend"],,
  fieldGroups: [
    { id: "window_config", label: "窗口设定", fields: [
      { path: "window.inputChunkLength", label: "历史观察窗口", type: "number",
      constraints: { min: 1, typicalRange: [1, 720], source: 'Time-series forecasting practice; MLflow' }, unit: "小时", required: true, placeholder: "168" },
      { path: "window.outputChunkLength", label: "预测跨度", type: "number",
      constraints: { min: 1, typicalRange: [1, 168], source: 'Time-series forecasting practice; MLflow' }, unit: "小时", required: true, placeholder: "24" },
    ]},
    { id: "ts_evaluation", label: "预测误差评估", fields: [
      { path: "metrics.mapePercentage", label: "平均绝对百分比误差 (MAPE)", type: "number",
      constraints: { min: 0, typicalRange: [0, 50], source: 'MAPE definition; forecasting metrics' }, unit: "%", required: true, placeholder: "3.2" },
    ]},
  ],
};

// ═══════════════════════════════════════════════════════
// 统计分析 — 3 个模板
// ═══════════════════════════════════════════════════════

export const TPL_CLINICAL_TRIAL: Template = {
  id: "tpl_clinical_trial", name: "临床试验统计模型", experimentType: "measurement", domain: "statistics", version: 1, isPreset: true,
  keywords: ["clinical", "trial", "non inferiority", "itt", "per protocol", "randomization", "blinding", "placebo", "margin", "alpha", "临床"],,
  fieldGroups: [
    { id: "trial_design", label: "试验设计规范", fields: [
      { path: "design.randomization", label: "随机化与盲法设置", type: "text", required: true, placeholder: "1:1 Double-Blind" },
      { path: "design.dropoutHandledBy", label: "脱落处理数据集", type: "select", required: true, options: ["ITT (Intention-To-Treat)", "PP (Per-Protocol)"] },
    ]},
    { id: "hypothesis", label: "假设检验与界值", fields: [
      { path: "hypothesis.type", label: "检验类型", type: "select", required: true, options: ["Non-Inferiority", "Superiority", "Equivalence"] },
      { path: "hypothesis.marginDelta", label: "非劣效界值 Margin Δ", type: "number", required: true, placeholder: "-0.10" },
      { path: "results.pValue", label: "显著性 p 值", type: "number",
      constraints: { min: 0, max: 1, source: 'Statistical hypothesis testing; ICH E9' }, required: true, placeholder: "0.003" },
    ]},
  ],
};

export const TPL_EPIDEMIOLOGY_STUDY: Template = {
  id: "tpl_epidemiology_study", name: "流行病学调查统计", experimentType: "measurement", domain: "statistics", version: 1, isPreset: true,
  keywords: ["epidemiology", "case control", "cohort", "cross sectional", "odds ratio", "relative risk", "confounding", "exposure", "流行病"],,
  fieldGroups: [
    { id: "study_design", label: "研究类型", fields: [
      { path: "design.studyType", label: "调查方法", type: "select", required: true, options: ["Case-Control", "Cohort", "Cross-Sectional"] },
    ]},
    { id: "associations", label: "关联性分析结果", fields: [
      { path: "results.oddsRatioOr", label: "比值比 (OR)", type: "number",
      constraints: { min: 0, typicalRange: [0.1, 10], source: 'Epidemiology odds-ratio reporting' }, required: true, placeholder: "2.45" },
      { path: "results.adjustedConfounders", label: "校正的混杂因素", type: "text", required: true, placeholder: "Age, Smoking, BMI" },
    ]},
  ],
};

export const TPL_SURVIVAL_ANALYSIS: Template = {
  id: "tpl_survival_analysis", name: "生存分析", experimentType: "measurement", domain: "statistics", version: 1, isPreset: true,
  keywords: ["survival", "kaplan meier", "cox", "log rank", "censoring", "hazard ratio", "median survival", "time to event"],,
  fieldGroups: [
    { id: "method_summary", label: "方法与删失", fields: [
      { path: "method.type", label: "分析模型", type: "select", required: true, options: ["Kaplan-Meier", "Cox PH"] },
      { path: "summary.censoredPercentage", label: "删失数据比例", type: "number",
      constraints: { min: 0, max: 100, typicalRange: [0, 90], source: 'Survival-analysis censoring proportion' }, unit: "%", required: true, placeholder: "18.5" },
    ]},
    { id: "survival_outputs", label: "生存指标", fields: [
      { path: "outputs.medianSurvivalTime", label: "中位生存时间", type: "number",
      constraints: { min: 0, typicalRange: [1, 120], source: 'Clinical survival analysis; CDISC ADaM' }, unit: "月", required: true, placeholder: "24.5" },
      { path: "outputs.logRankPValue", label: "Log-Rank p 值", type: "number",
      constraints: { min: 0, max: 1, source: 'Log-rank test; survival analysis' }, required: true, placeholder: "0.008" },
    ]},
  ],
};

// ═══════════════════════════════════════════════════════
// 数据工程 — 1 个模板
// ═══════════════════════════════════════════════════════

export const TPL_ETL_PIPELINE_DQ: Template = {
  id: "tpl_etl_pipeline_dq", name: "ETL流水线与数据质量评估", experimentType: "other", domain: "data_engineering", version: 1, isPreset: true,
  keywords: ["etl", "pipeline", "data quality", "great expectations", "bronze", "silver", "gold", "dq", "schema", "validation", "row count", "null"],,
  fieldGroups: [
    { id: "pipeline_metadata", label: "流水线基本信息", fields: [
      { path: "pipeline.name", label: "Pipeline 标识", type: "text", required: true, placeholder: "raw_lab_sensor_etl" },
      { path: "pipeline.stage", label: "架构数据层", type: "select", required: true, options: ["Bronze", "Silver", "Gold"] },
    ]},
    { id: "quality_assertion", label: "数据质量断言", fields: [
      { path: "quality.passedExpectationsRatio", label: "断言通过率", type: "number",
      constraints: { min: 0, max: 100, typicalRange: [90, 100], source: 'Great Expectations data-quality metrics' }, unit: "%", required: true, placeholder: "99.8" },
      { path: "quality.reportRef", label: "质量报告文件路径", type: "text", placeholder: "s3://etl-reports/dq_20260810.html" },
    ]},
  ],
};

// ═══════════════════════════════════════════════════════
// 湿实验 — 5 个模板
// ═══════════════════════════════════════════════════════

export const TPL_HYDROTHERMAL_SYNTHESIS: Template = {
  id: "tpl_hydrothermal_synthesis", name: "水热/溶剂热合成", experimentType: "synthesis", domain: "wet_lab", version: 1, isPreset: true,
  keywords: ["hydrothermal", "solvothermal", "autoclave", "precursor", "yield", "水热", "溶剂热", "反应釜", "产率", "保温"],,
  fieldGroups: [
    { id: "precursors", label: "前驱体与溶剂", fields: [
      { path: "materials.precursorsText", label: "前驱体及用量清单", type: "textarea", required: true, placeholder: "Cobalt Nitrate Hexahydrate (2.91g); 2-Methylimidazole (3.28g)" },
      { path: "materials.solventVolume", label: "溶剂体积", type: "number",
      constraints: { min: 0.001, typicalRange: [5, 200], source: 'Hydrothermal synthesis lab practice' }, unit: "mL", required: true, placeholder: "50" },
    ]},
    { id: "process_conditions", label: "反应温度控制", fields: [
      { path: "process.autoclaveFillFactor", label: "反应釜填充度", type: "text", placeholder: "60%" },
      { path: "process.targetTemp", label: "反应保温温度", type: "number",
      constraints: { min: 0, max: 500, typicalRange: [80, 250], source: 'Hydrothermal synthesis; autoclave limits' }, unit: "°C", required: true, placeholder: "180" },
      { path: "process.holdingTime", label: "保温时间", type: "number",
      constraints: { min: 0, typicalRange: [1, 48], source: 'Hydrothermal synthesis practice' }, unit: "小时", required: true, placeholder: "12" },
      { path: "outputs.yieldPercentage", label: "产率", type: "number",
      constraints: { min: 0, max: 100, typicalRange: [10, 100], source: 'Chemical yield definition' }, unit: "%", required: true, placeholder: "84.5" },
    ]},
  ],
};

export const TPL_SOL_GEL_PROCESS: Template = {
  id: "tpl_sol_gel_process", name: "溶胶-凝胶法", experimentType: "synthesis", domain: "wet_lab", version: 1, isPreset: true,
  keywords: ["sol gel", "teos", "hydrolysis", "aging", "drying", "supercritical", "aerogel", "xerogel", "溶胶", "凝胶", "水解", "陈化"],,
  fieldGroups: [
    { id: "sol_chemistry", label: "水解反应控制", fields: [
      { path: "chemistry.precursor", label: "前驱体", type: "text", required: true, placeholder: "TEOS (Tetraethyl orthosilicate)" },
      { path: "chemistry.hydrolysisRatio", label: "水解比 (H₂O/前驱体)", type: "number",
      constraints: { min: 0, max: 100, typicalRange: [2, 10], source: 'Sol-gel hydrolysis molar-ratio practice' }, required: true, placeholder: "4.0" },
    ]},
    { id: "aging_drying", label: "陈化与干燥", fields: [
      { path: "aging.time", label: "陈化时间", type: "number",
      constraints: { min: 0, typicalRange: [1, 168], source: 'Sol-gel aging practice' }, unit: "小时", required: true, placeholder: "48" },
      { path: "drying.method", label: "干燥方式", type: "select", required: true, options: ["Supercritical CO2 Drying", "Ambient Pressure Drying", "Freeze Drying"] },
    ]},
  ],
};

export const TPL_XRD_CHARACTERIZATION: Template = {
  id: "tpl_xrd_characterization", name: "XRD 表征测试", experimentType: "characterization", domain: "wet_lab", version: 1, isPreset: true,
  keywords: ["xrd", "x ray diffraction", "rietveld", "2theta", "crystallite", "phase", "lattice", "powder", "衍射", "精修"],,
  fieldGroups: [
    { id: "instrument_params", label: "扫描参数", fields: [
      { path: "instrument.targetRadiation", label: "靶材/辐射波长", type: "select", required: true, options: ["Cu K-alpha", "Co K-alpha", "Mo K-alpha"] },
      { path: "scan.start2Theta", label: "起始 2θ 角", type: "number",
      constraints: { min: -180, max: 180, typicalRange: [5, 40], source: 'Allotrope ASM; XRD instrument parameters' }, unit: "°", required: true, placeholder: "10.0" },
      { path: "scan.end2Theta", label: "终止 2θ 角", type: "number",
      constraints: { min: -180, max: 180, typicalRange: [20, 120], source: 'Allotrope ASM; XRD instrument parameters' }, unit: "°", required: true, placeholder: "80.0" },
      { path: "scan.stepSize", label: "扫描步长", type: "number",
      constraints: { min: 0.000001, max: 10, typicalRange: [0.005, 0.1], source: 'Allotrope ASM; XRD scan-step practice' }, unit: "°", required: true, placeholder: "0.02" },
    ]},
    { id: "phase_identification", label: "物相鉴定与精修", fields: [
      { path: "results.identifiedPhases", label: "检索物相列表", type: "textarea", required: true, placeholder: "LiFePO4 (Pnma), Fe2O3 trace" },
      { path: "refinement.rWpPercentage", label: "精修残差 Rwp", type: "number",
      constraints: { min: 0, max: 100, typicalRange: [1, 20], source: 'Rietveld refinement Rwp practice' }, unit: "%", placeholder: "6.2" },
    ]},
  ],
};

export const TPL_ELECTRON_MICROSCOPY: Template = {
  id: "tpl_electron_microscopy", name: "SEM/TEM 电子显微表征", experimentType: "characterization", domain: "wet_lab", version: 1, isPreset: true,
  keywords: ["sem", "tem", "microscopy", "hrtem", "haadf", "eds", "particle size", "morphology", "accelerating voltage", "扫描", "透射"],,
  fieldGroups: [
    { id: "microscope_setup", label: "显微镜工作条件", fields: [
      { path: "instrument.mode", label: "测试模式", type: "select", required: true, options: ["SEM-SE", "SEM-BSE", "TEM-BF", "HRTEM", "HAADF-STEM"] },
      { path: "instrument.acceleratingVoltage", label: "加速电压", type: "number",
      constraints: { min: 0.1, typicalRange: [1, 300], source: 'Allotrope ASM; TEM/SEM instrument parameters' }, unit: "kV", required: true, placeholder: "200" },
      { path: "instrument.magnification", label: "放大倍数", type: "text", required: true, placeholder: "150000x" },
    ]},
    { id: "morphology_data", label: "形态与尺寸测量", fields: [
      { path: "results.averageParticleSize", label: "平均颗粒尺寸", type: "number",
      constraints: { min: 0.01, typicalRange: [1, 1000], source: 'EM particle-size analysis' }, unit: "nm", required: true, placeholder: "25.4" },
    ]},
  ],
};

export const TPL_ELECTROCHEMICAL_TEST: Template = {
  id: "tpl_electrochemical_test", name: "电化学测试 (CV/EIS)", experimentType: "measurement", domain: "wet_lab", version: 1, isPreset: true,
  keywords: ["cv", "eis", "electrochemical", "impedance", "voltammetry", "battery", "rct", "charge transfer", "nyquist", "电化学", "阻抗"],,
  fieldGroups: [
    { id: "cell_configuration", label: "电解池构型", fields: [
      { path: "cell.technique", label: "测试技术", type: "select", required: true, options: ["CV", "EIS", "GCD"] },
      { path: "cell.workingElectrode", label: "工作电极", type: "text", required: true, placeholder: "NMC811" },
      { path: "cell.electrolyte", label: "电解液体系", type: "text", required: true, placeholder: "1M LiPF6 in EC:DMC" },
    ]},
    { id: "eis_results", label: "阻抗拟合参数", fields: [
      { path: "results.rChargeTransfer", label: "电荷转移阻抗 Rct", type: "number",
      constraints: { min: 0, typicalRange: [0.1, 10000], source: 'Allotrope ASM; EIS spectroscopy' }, unit: "Ω", required: true, placeholder: "42.1" },
    ]},
  ],
};

// ═══════════════════════════════════════════════════════
// 注册表
// ═══════════════════════════════════════════════════════

export const ALL_PRESET_TEMPLATES: Template[] = [
  GENERIC_TEMPLATE,
  // 计算化学 (7)
  TPL_STRUCTURE_OPTIMIZATION, TPL_BAND_STRUCTURE, TPL_PHONON_SPECTRUM,
  TPL_NEB_SEARCH, TPL_AIMD, TPL_OPTICAL_PROPERTIES, TPL_ELASTIC_CONSTANTS,
  // 分子动力学 (4)
  TPL_PROTEIN_SOLVATION_MD, TPL_BINDING_FREE_ENERGY, TPL_LAMMPS_TENSILE, TPL_COARSE_GRAINED_MARTINI,
  // 机器学习 (5)
  TPL_IMAGE_CLASSIFICATION, TPL_NLP_FINETUNING, TPL_GNN_MOLECULE_PREDICTION,
  TPL_REINFORCEMENT_LEARNING, TPL_TIME_SERIES_FORECASTING,
  // 统计分析 (3)
  TPL_CLINICAL_TRIAL, TPL_EPIDEMIOLOGY_STUDY, TPL_SURVIVAL_ANALYSIS,
  // 数据工程 (1)
  TPL_ETL_PIPELINE_DQ,
  // 湿实验 (5)
  TPL_HYDROTHERMAL_SYNTHESIS, TPL_SOL_GEL_PROCESS, TPL_XRD_CHARACTERIZATION,
  TPL_ELECTRON_MICROSCOPY, TPL_ELECTROCHEMICAL_TEST,
];

export const TEMPLATE_MAP: Map<string, Template> = new Map(
  ALL_PRESET_TEMPLATES.map((t) => [t.id, t]),
);

export function getTemplate(id: string): Template | undefined {
  return TEMPLATE_MAP.get(id);
}

/** 根据实验类型标签匹配最佳模板 */
/**
 * 根据输入文本匹配最佳模板
 * 纯数据驱动：每个模板自带 keywords，按匹配数排序取最高分
 * 新增模板只需加 keywords，零代码改动
 */
export function matchTemplate(text: string): Template | undefined {
  const l = text.toLowerCase();
  // 精确 ID 匹配
  for (const t of ALL_PRESET_TEMPLATES) {
    if (t.id === l || t.experimentType === l) return t;
  }
  // 关键词评分
  let best: { tpl: Template; score: number } | null = null;
  for (const t of ALL_PRESET_TEMPLATES) {
    if (!t.keywords || t.keywords.length === 0) continue;
    let score = 0;
    for (const kw of t.keywords) {
      if (l.includes(kw.toLowerCase())) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { tpl: t, score };
    }
  }
  return best?.tpl;
}
