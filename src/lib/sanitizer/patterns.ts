/**
 * Data Sanitizer — 敏感信息规则库
 *
 * 所有规则基于正则表达式匹配。
 * 支持中英文双语检测。
 */
import type { SensitivityCategory, RiskLevel } from "./types";

/** 单个检测规则 */
export type DetectionRule = {
  /** 规则名称（用于审计日志） */
  name: string;
  /** 正则表达式 */
  pattern: RegExp;
  /** 敏感信息类别 */
  category: SensitivityCategory;
  /** 风险等级 */
  risk: RiskLevel;
  /** 人类可读标签 */
  label: string;
  /** 推荐替换（支持字符串或函数） */
  replacement: string | ((...args: string[]) => string);
  /** 优先级（数字越小越优先匹配） */
  priority: number;
};

/** ===== PII 规则 ===== */

const PII_RULES: DetectionRule[] = [
  // 邮箱
  {
    name: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    category: "pii",
    risk: "high",
    label: "邮箱地址",
    replacement: "[邮箱已脱敏]",
    priority: 1,
  },
  // 中国手机号
  {
    name: "cn_phone",
    pattern: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
    category: "pii",
    risk: "high",
    label: "中国手机号",
    replacement: "[手机号已脱敏]",
    priority: 1,
  },
  // 国际手机号（通用格式）
  {
    name: "intl_phone",
    pattern: /(?<!\d)\+\d{1,3}[-.\s]?\d{3,14}(?!\d)/g,
    category: "pii",
    risk: "high",
    label: "国际电话号码",
    replacement: "[电话已脱敏]",
    priority: 2,
  },
  // 中国身份证号（18位）
  {
    name: "cn_id",
    pattern: /[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
    category: "pii",
    risk: "high",
    label: "身份证号码",
    replacement: "[身份证号已脱敏]",
    priority: 1,
  },
  // 中国姓名（2-4字中文，前有"患者"/"操作人"/"作者"等标签时更可靠）
  {
    name: "cn_name_tagged",
    pattern: /(?:患者|病人|操作人|实验员|作者|联系人|负责人|姓名|name)[：:\s]*([一-鿿]{2,4})(?=[\s，。,\.;；\n]|$)/g,
    category: "pii",
    risk: "high",
    label: "中文姓名（标签后）",
    replacement: "[姓名已脱敏]",
    priority: 2,
  },
  // 英文姓名（"Dr. First Last" / "Prof. Last" 模式）
  {
    name: "en_name_titled",
    pattern: /(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g,
    category: "pii",
    risk: "medium",
    label: "英文姓名（带称谓）",
    replacement: "[姓名已脱敏]",
    priority: 3,
  },
  // IP 地址
  {
    name: "ip_address",
    pattern: /(?:\d{1,3}\.){3}\d{1,3}/g,
    category: "pii",
    risk: "medium",
    label: "IP 地址",
    replacement: "[IP已脱敏]",
    priority: 4,
  },
];

/** ===== PHI (受保护健康信息) 规则 ===== */

const PHI_RULES: DetectionRule[] = [
  // 年龄 + 疾病术语（英文）
  {
    name: "age_disease_en",
    pattern: /\b(\d{1,3})\s*(?:-year-old|yr|y\.?o\.?|years?\s*old)\b[\s\S]{0,80}?\b(?:carcinoma|tumor|cancer|malignant|metastasis|lymphoma|leukemia|sarcoma|adenocarcinoma|neoplasm|lesion|tumour)\b/gi,
    category: "phi",
    risk: "high",
    label: "年龄-疾病关联（英文）",
    replacement: "[年龄-疾病关联已脱敏]",
    priority: 1,
  },
  // 性别 + 年龄 + 疾病
  {
    name: "gender_age_disease",
    pattern: /\b(?:female|male|woman|man)\b[\s\S]{0,50}?\b(\d{1,3})\s*(?:-year-old|yr|y\.?o\.?)\b[\s\S]{0,80}?\b(?:carcinoma|tumor|cancer|malignant|Grade\s*(?:I+V|IV|III|II|I))\b/gi,
    category: "phi",
    risk: "high",
    label: "性别-年龄-疾病关联",
    replacement: "[患者信息已脱敏]",
    priority: 1,
  },
  // 中文年龄 + 疾病
  {
    name: "age_disease_cn",
    pattern: /(\d{1,3})\s*岁[\s\S]{0,60}?(?:癌|肿瘤|恶性|转移|病变)/g,
    category: "phi",
    risk: "high",
    label: "年龄-疾病关联（中文）",
    replacement: "[年龄-疾病关联已脱敏]",
    priority: 1,
  },
  // 患者编号
  {
    name: "patient_id",
    pattern: /patient[-\s]?(?:id|no|#|number)[-:\s]*\w+/gi,
    category: "phi",
    risk: "high",
    label: "患者编号",
    replacement: "[患者编号已脱敏]",
    priority: 2,
  },
  // 病例号
  {
    name: "case_id_cn",
    pattern: /(?:病例号|住院号|病历号|门诊号)[-:\s]*\w+/g,
    category: "phi",
    risk: "high",
    label: "病例号/住院号",
    replacement: "[病历号已脱敏]",
    priority: 2,
  },
  // 人体组织描述（含来源个体信息）
  {
    name: "tissue_donor",
    pattern: /\b(?:female|male|woman|man)\b\s+\d{1,3}\s*(?:-year-old|yr|y\.?o\.?)\b/gi,
    category: "phi",
    risk: "high",
    label: "组织供体信息",
    replacement: "[供体信息已脱敏]",
    priority: 1,
  },
];

/** ===== 机构信息规则 ===== */

const INSTITUTION_RULES: DetectionRule[] = [
  // 中国医院
  {
    name: "cn_hospital",
    pattern: /[一-鿿]{2,20}(?:医院|附属医院|人民医院|中心医院|肿瘤医院|儿童医院|中医院)/g,
    category: "institution",
    risk: "medium",
    label: "医疗机构名称",
    replacement: "三甲医院",
    priority: 5,
  },
  // 英文医院/诊所
  {
    name: "en_hospital",
    pattern: /[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4}\s+(?:Hospital|Medical Center|Clinic|Cancer Center|University Hospital)/g,
    category: "institution",
    risk: "medium",
    label: "医疗机构名称（英文）",
    replacement: "[医院名称已脱敏]",
    priority: 5,
  },
  // 中国大学
  {
    name: "cn_university",
    pattern: /[一-鿿]{2,20}(?:大学|学院|研究所|研究院)/g,
    category: "institution",
    risk: "low",
    label: "学术机构名称",
    replacement: "[学术机构]",
    priority: 6,
  },
  // 企业 R&D 中心
  {
    name: "corp_rd",
    pattern: /[A-Z][a-zA-Z]+\s+(?:Inc\.|Corp\.|Ltd\.|Co\.|Corporation|LLC)/g,
    category: "institution",
    risk: "medium",
    label: "企业实体",
    replacement: "[企业名称已脱敏]",
    priority: 6,
  },
  // 中国公司
  {
    name: "cn_company",
    pattern: /[一-鿿]{2,30}(?:有限公司|股份公司|集团|科技|制药|生物|化工)/g,
    category: "institution",
    risk: "medium",
    label: "企业名称（中文）",
    replacement: "[企业名称已脱敏]",
    priority: 6,
  },
];

/** ===== 地理位置规则 ===== */

const LOCATION_RULES: DetectionRule[] = [
  // 经纬度（度分秒格式）
  {
    name: "coord_dms",
    pattern: /\d{1,3}°\d{1,2}['′]\d{1,2}(?:\.\d+)?["″]\s*[NSEW]/g,
    category: "location",
    risk: "medium",
    label: "精确经纬度（度分秒）",
    replacement: "[坐标已脱敏]",
    priority: 5,
  },
  // 经纬度（十进制格式）
  {
    name: "coord_decimal",
    pattern: /(?:lat|long|latitude|longitude|纬度|经度)[\s:：]*(\d{1,3}\.\d{2,6})/gi,
    category: "location",
    risk: "medium",
    label: "精确经纬度（十进制）",
    replacement: (_m: string) => {
      const num = parseFloat(_m.match(/\d+\.\d+/)![0]);
      return _m.replace(/\d+\.\d+/, num.toFixed(1));
    },
    priority: 5,
  },
  // GPS 坐标对
  {
    name: "gps_pair",
    pattern: /(\d{1,3}\.\d{4,})\s*[,，]\s*(\d{1,3}\.\d{4,})/g,
    category: "location",
    risk: "medium",
    label: "GPS坐标对",
    replacement: (_m: string) => {
      const [lat, lng] = _m.split(/[,，]\s*/).map((s) => parseFloat(s));
      return `${lat.toFixed(1)}, ${lng.toFixed(1)}`;
    },
    priority: 5,
  },
  // 中国详细地址
  {
    name: "cn_address",
    pattern: /[一-鿿]{2,10}(?:省|市|区|县|镇|乡|村|街道|路|弄|号|楼|室|层|单元)[一-鿿0-9-]*/g,
    category: "location",
    risk: "medium",
    label: "详细地址",
    replacement: "[地址已脱敏]",
    priority: 6,
  },
];

/** ===== 化合物/专利规则 ===== */

const COMPOUND_RULES: DetectionRule[] = [
  // CAS 编号
  {
    name: "cas_number",
    pattern: /CAS[-\s]?\d{2,7}-\d{2}-\d/g,
    category: "compound",
    risk: "low",
    label: "CAS 编号",
    replacement: "[CAS已脱敏]",
    priority: 6,
  },
  // 专利号（WIPO格式）
  {
    name: "patent_wo",
    pattern: /WO\s*\d{4}\s*\/\s*\d{6,}/g,
    category: "compound",
    risk: "medium",
    label: "PCT 专利号",
    replacement: "[专利号已脱敏]",
    priority: 6,
  },
  // 中国专利号
  {
    name: "patent_cn",
    pattern: /CN\s*\d{7,}[A-Z]?/g,
    category: "compound",
    risk: "medium",
    label: "中国专利号",
    replacement: "[专利号已脱敏]",
    priority: 6,
  },
  // 美国专利号
  {
    name: "patent_us",
    pattern: /US\s*\d{6,}(?:B\d)?/g,
    category: "compound",
    risk: "medium",
    label: "美国专利号",
    replacement: "[专利号已脱敏]",
    priority: 6,
  },
  // 化合物批号
  {
    name: "batch_number",
    pattern: /(?:batch|lot|批号)[-\s#:]*[A-Z0-9]{4,}/gi,
    category: "compound",
    risk: "low",
    label: "化合物批号",
    replacement: (_m: string) => _m.replace(/[A-Z0-9]{4,}$/g, "[批号已脱敏]"),
    priority: 7,
  },
];

/** ===== 日期规则 ===== */

const DATE_RULES: DetectionRule[] = [
  // ISO 日期（精确到日）
  {
    name: "iso_date",
    pattern: /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g,
    category: "date",
    risk: "low",
    label: "精确日期(YYYY-MM-DD)",
    replacement: (_m: string) => _m.slice(0, 7),
    priority: 8,
  },
  // 中国日期格式
  {
    name: "cn_date",
    pattern: /(20\d{2})年(0?[1-9]|1[0-2])月(0?[1-9]|[12]\d|3[01])日/g,
    category: "date",
    risk: "low",
    label: "精确日期(年月日)",
    replacement: (_m: string, y: string, mo: string) => `${y}年${mo}月`,
    priority: 8,
  },
];

/** ===== 凭证/密钥规则 ===== */

const CREDENTIAL_RULES: DetectionRule[] = [
  // API Key (常见前缀)
  {
    name: "api_key",
    pattern: /(?:sk|api[_-]?key|token|secret|password|密钥|密码)[=:：]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
    category: "credential",
    risk: "high",
    label: "API密钥/密码",
    replacement: "[密钥已脱敏]",
    priority: 1,
  },
  // Bearer Token
  {
    name: "bearer_token",
    pattern: /Bearer\s+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    category: "credential",
    risk: "high",
    label: "Bearer Token",
    replacement: "[Token已脱敏]",
    priority: 1,
  },
];

/** ===== 全部规则（按优先级排序） ===== */

export const ALL_RULES: DetectionRule[] = [
  ...PII_RULES,
  ...PHI_RULES,
  ...CREDENTIAL_RULES,
  ...INSTITUTION_RULES,
  ...LOCATION_RULES,
  ...COMPOUND_RULES,
  ...DATE_RULES,
].sort((a, b) => a.priority - b.priority);

/** ===== 按类别获取规则 ===== */

export function getRulesByCategory(category: SensitivityCategory): DetectionRule[] {
  return ALL_RULES.filter((r) => r.category === category);
}

/** ===== 按风险等级获取规则 ===== */

export function getRulesByRisk(risk: RiskLevel): DetectionRule[] {
  return ALL_RULES.filter((r) => r.risk === risk);
}
