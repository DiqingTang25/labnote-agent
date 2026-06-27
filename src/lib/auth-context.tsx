/**
 * Auth Context — 全局认证状态管理
 *
 * 提供：user, session, loading, initialized, signIn, signUp, signOut
 * 在 __root.tsx 中使用，包裹整个应用
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getBrowserSupabase } from "./auth-client";
import type { User, Session } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; emailConfirmationRequired?: boolean }>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    // 检查已有 session（用户已登录）
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      setInitialized(true);
    });

    // 监听 auth 状态变化（登录/登出/令牌刷新）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message };
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      // Supabase 可能要求邮箱确认
      const emailConfirmationRequired =
        data.user != null &&
        data.user.identities != null &&
        data.user.identities.length === 0;
      return { error: error?.message, emailConfirmationRequired };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // 清理 localStorage 缓存 — 下一个用户从 Supabase 重新加载
    const { clearStorage } = await import("./persistence");
    clearStorage();
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        loading,
        initialized,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
