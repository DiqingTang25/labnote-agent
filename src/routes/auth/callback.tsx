/**
 * Auth 回调路由 — Supabase OAuth / Email 确认后的回调
 * 客户端自动处理 code → session 交换
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getBrowserSupabase } from "../../lib/auth-client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth
      .exchangeCodeForSession(window.location.search)
      .then(({ error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          navigate({ to: "/workbench" });
        }
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">验证失败：{error}</p>
          <a href="/login" className="mt-4 inline-block text-primary hover:underline">
            返回登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
