/**
 * 属性路径工具 — 对 DocProperties 进行点号路径读写
 *
 * 支持嵌套路径: "model.architecture", "params[0].value"
 * 支持数组索引: "steps[2]", "materials[0].name"
 */

import type { DocProperties, PropValue, FieldType } from "./exp-core";

// ═══════════════════════════════════════════════════════
// 路径解析
// ═══════════════════════════════════════════════════════

type PathSegment = { key: string; index?: number };

function parsePath(path: string): PathSegment[] {
  return path.split(".").map((seg) => {
    const m = seg.match(/^(.+?)\[(\d+)\]$/);
    if (m) return { key: m[1], index: parseInt(m[2], 10) };
    return { key: seg };
  });
}

// ═══════════════════════════════════════════════════════
// 读取
// ═══════════════════════════════════════════════════════

/**
 * 从 DocProperties 中读取指定路径的值
 * 返回 undefined 表示路径不存在
 */
export function getProperty(props: DocProperties, path: string): PropValue | undefined {
  const segs = parsePath(path);
  let current: unknown = props;
  for (const seg of segs) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    const obj = current as Record<string, unknown>;
    const val = obj[seg.key];
    if (seg.index !== undefined) {
      if (!Array.isArray(val) || seg.index >= val.length) return undefined;
      current = val[seg.index];
    } else {
      current = val;
    }
  }
  return current as PropValue | undefined;
}

/** 读取并转为字符串，undefined 返回 "" */
export function getString(props: DocProperties, path: string): string {
  const v = getProperty(props, path);
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/** 读取并转为数字，无效返回 undefined */
export function getNumber(props: DocProperties, path: string): number | undefined {
  const v = getProperty(props, path);
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

/** 读取并转为布尔 */
export function getBool(props: DocProperties, path: string): boolean | undefined {
  const v = getProperty(props, path);
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return undefined;
}

// ═══════════════════════════════════════════════════════
// 写入
// ═══════════════════════════════════════════════════════

/**
 * 在 DocProperties 中设置指定路径的值
 * 返回新的 properties 对象（不可变更新）
 */
export function setProperty(
  props: DocProperties,
  path: string,
  value: PropValue,
): DocProperties {
  const segs = parsePath(path);
  if (segs.length === 0) return props;

  // 递归构建
  function build(segs: PathSegment[], idx: number, source: unknown): unknown {
    if (idx >= segs.length) return value;
    const seg = segs[idx];
    const isLast = idx === segs.length - 1;

    if (seg.index !== undefined) {
      // 数组路径
      const arr = Array.isArray(source) ? [...source] : [];
      if (isLast) {
        arr[seg.index] = value;
      } else {
        arr[seg.index] = build(segs, idx + 1, arr[seg.index]);
      }
      return arr;
    } else {
      // 对象路径
      const obj = source && typeof source === "object" && !Array.isArray(source)
        ? { ...(source as Record<string, unknown>) }
        : {};
      if (isLast) {
        obj[seg.key] = value;
      } else {
        obj[seg.key] = build(segs, idx + 1, obj[seg.key]);
      }
      return obj;
    }
  }

  return build(segs, 0, props) as DocProperties;
}

/**
 * 删除指定路径的属性
 */
export function deleteProperty(props: DocProperties, path: string): DocProperties {
  const segs = parsePath(path);
  if (segs.length === 0) return props;
  if (segs.length === 1) {
    const { [segs[0].key]: _, ...rest } = props as Record<string, unknown>;
    return rest as DocProperties;
  }
  // 多层路径：获取父级，删除子级
  const parentPath = segs.slice(0, -1).map((s) => s.key).join(".");
  const lastSeg = segs[segs.length - 1];
  const parent = getProperty(props, parentPath);
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return props;
  const { [lastSeg.key]: _, ...rest } = parent as Record<string, unknown>;
  return setProperty(props, parentPath, rest as PropValue);
}

// ═══════════════════════════════════════════════════════
// 扁平化 — field_patterns 输入 + AI prompt 输入
// ═══════════════════════════════════════════════════════

export type FlatEntry = {
  path: string;
  value: PropValue;
  type: "string" | "number" | "boolean" | "array" | "object" | "null";
};

/**
 * 将嵌套 DocProperties 扁平化为 path→value 列表
 * 跳过 _meta 和 extra（特殊处理）
 */
export function flattenProperties(props: DocProperties, prefix = ""): FlatEntry[] {
  const result: FlatEntry[] = [];
  for (const [key, val] of Object.entries(props)) {
    if (key === "_meta") continue;
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (key === "extra" && typeof val === "object" && val !== null && !Array.isArray(val)) {
      // extra 内的键也扁平化，保留 extra. 前缀
      for (const [ek, ev] of Object.entries(val as Record<string, unknown>)) {
        result.push({
          path: `extra.${ek}`,
          value: ev as PropValue,
          type: valueType(ev),
        });
      }
      continue;
    }

    if (Array.isArray(val)) {
      result.push({ path: fullPath, value: val as PropValue, type: "array" });
      // 数组元素也递归
      val.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          result.push(...flattenProperties(item as DocProperties, `${fullPath}[${i}]`));
        }
      });
    } else if (typeof val === "object" && val !== null) {
      // 空对象仍然保留 key
      if (Object.keys(val as Record<string, unknown>).length === 0) {
        result.push({ path: fullPath, value: val as PropValue, type: "object" });
      } else {
        result.push(...flattenProperties(val as DocProperties, fullPath));
      }
    } else {
      result.push({ path: fullPath, value: val as PropValue, type: valueType(val) });
    }
  }
  return result;
}

function valueType(v: unknown): FlatEntry["type"] {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return "string";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (Array.isArray(v)) return "array";
  return "object";
}

// ═══════════════════════════════════════════════════════
// 合并
// ═══════════════════════════════════════════════════════

/**
 * 深度合并两个 DocProperties
 * source 中的值覆盖 base 中的值（按路径）
 */
export function mergeProperties(base: DocProperties, source: DocProperties): DocProperties {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, val] of Object.entries(source)) {
    if (key === "_meta") {
      result[key] = { ...(result[key] as object ?? {}), ...(val as object) };
      continue;
    }
    if (key === "extra" && typeof val === "object" && val !== null) {
      result[key] = { ...(result[key] as object ?? {}), ...(val as object) };
      continue;
    }
    if (
      typeof val === "object" && val !== null && !Array.isArray(val) &&
      typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key])
    ) {
      result[key] = mergeProperties(
        result[key] as DocProperties,
        val as DocProperties,
      );
    } else {
      result[key] = val;
    }
  }
  return result as DocProperties;
}

// ═══════════════════════════════════════════════════════
// 类型转换
// ═══════════════════════════════════════════════════════

/**
 * 根据 FieldType 强制转换用户输入值
 */
export function coerceValue(type: FieldType, raw: string): PropValue {
  switch (type) {
    case "number": {
      const n = parseFloat(raw);
      return isNaN(n) ? raw : n;
    }
    case "boolean":
      return raw === "true" || raw === "1";
    case "date":
    case "datetime":
      return raw;
    case "select":
      return raw;
    case "text":
    case "textarea":
    case "taglist":
    case "table":
    default:
      return raw;
  }
}

// ═══════════════════════════════════════════════════════
// 清理
// ═══════════════════════════════════════════════════════

/**
 * 移除空值："" / null / [] / {}
 */
export function stripEmpty(
  props: DocProperties,
): DocProperties {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (val === null || val === undefined || val === "") continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (typeof val === "object" && !Array.isArray(val)) {
      const cleaned = stripEmpty(val as DocProperties);
      if (Object.keys(cleaned).length > 0) result[key] = cleaned;
      continue;
    }
    result[key] = val;
  }
  return result as DocProperties;
}
