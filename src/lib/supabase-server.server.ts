/**
 * 服务端 Supabase 客户端工厂
 *
 * .server.ts 后缀确保 Vite 不会将此文件打包到客户端
 * 两个工厂函数：
 *   - getServiceSupabase()  → 使用 service_role key，绕过 RLS（CRUD 操作）
 *   - getAuthSupabase()     → 使用 anon key + cookie，验证用户会话
 *
 * 限制：TanStack Start 的 createServerFn handler 无法直接访问
 * h3/vinxi 的 cookie API，因此 getAuthSupabase 使用简化的 cookie 解析。
 *
 * 对于需要 auth 验证的 server function，推荐模式：
 *   1. handler 接收 access token 参数
 *   2. getServiceSupabase().auth.getUser(token) 验证身份
 *   3. 使用 service_role 执行数据操作
 */
import { createServerClient } from "@supabase/ssr";
import { getServerConfig } from "./config.server";

/** 使用 service_role key 的 Supabase 客户端（完整数据库权限） */
export function getServiceSupabase() {
  const config = getServerConfig();
  return createServerClient(config.supabaseUrl!, config.supabaseServiceRoleKey!, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}

/** 验证浏览器传入的 access token，并返回可信的 Supabase user id。 */
export async function requireAuthenticatedUser(accessToken: string): Promise<string> {
  const { data, error } = await getServiceSupabase().auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error("未登录或登录已过期");
  }
  return data.user.id;
}

/** 从 cookie 解析用户会话的 Supabase 客户端 */
export function getAuthSupabase(cookieHeader?: string) {
  const config = getServerConfig();

  // 从 cookie header 字符串解析 Supabase auth token
  const cookies = parseCookiesFromHeader(cookieHeader);

  return createServerClient(config.supabaseUrl!, config.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll() {},
    },
  });
}

/** 从请求 cookie header 提取 Supabase auth token cookies */
function parseCookiesFromHeader(cookieHeader?: string): Array<{ name: string; value: string }> {
  if (!cookieHeader) return [];
  const result: Array<{ name: string; value: string }> = [];
  const pairs = cookieHeader.split(";").map((p) => p.trim());
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    // 过滤 Supabase auth token cookies
    if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
      result.push({ name, value });
    }
  }
  return result;
}
