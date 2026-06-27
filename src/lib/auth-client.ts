/**
 * 浏览器端 Supabase Auth 客户端 — 用于登录/注册/登出
 * 使用 @supabase/ssr 的 createBrowserClient 自动管理 cookie
 *
 * 注意：createBrowserClient 访问浏览器 API（cookie），
 * SSR 期间不可用。使用 lazy init + guard 避免 SSR 崩溃。
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _browserClient: SupabaseClient | null = null;

function getUrlAndKey() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  };
}

export function getBrowserSupabase(): SupabaseClient {
  // SSR guard：服务端渲染时返回 dummy，避免访问浏览器 API
  if (typeof window === "undefined") {
    const { url, key } = getUrlAndKey();
    // 返回一个不会发起真实请求的客户端
    return createBrowserClient(
      url ?? "https://placeholder.supabase.co",
      key ?? "placeholder-key",
    );
  }

  if (!_browserClient) {
    const { url, key } = getUrlAndKey();
    _browserClient = createBrowserClient(
      url ?? "https://placeholder.supabase.co",
      key ?? "placeholder-key",
    );
  }
  return _browserClient;
}
