/**
 * RequireAuth — 路由保护组件
 * 未登录用户自动重定向到 /login
 */
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./auth-context";
import type { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, initialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized && !loading && !user) {
      navigate({ to: "/login" });
    }
  }, [initialized, loading, user, navigate]);

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
