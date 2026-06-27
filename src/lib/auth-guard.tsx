/**
 * RequireAuth — 路由保护组件
 * 未登录用户自动重定向到 /login
 *
 * Dev mode: 自动注入 mock user 跳过认证，方便本地开发调试
 */
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./auth-context";
import type { ReactNode } from "react";

const DEV_MODE = import.meta.env.DEV;

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, initialized } = useAuth();
  const navigate = useNavigate();

  // Dev mode: 跳过认证，直接渲染 children
  // AuthContext 的 useAuth 仍返回 null user，但 RequireAuth 不拦截
  useEffect(() => {
    if (DEV_MODE) return; // dev mode — skip redirect
    if (initialized && !loading && !user) {
      navigate({ to: "/login" });
    }
  }, [initialized, loading, user, navigate]);

  // Dev mode: 直接渲染
  if (DEV_MODE) return <>{children}</>;

  // 初始化中 → 显示加载
  if (!initialized || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // 未登录 → 不渲染内容（useEffect 会重定向）
  if (!user) return null;

  return <>{children}</>;
}
