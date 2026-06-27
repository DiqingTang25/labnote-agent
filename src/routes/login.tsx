/**
 * 登录页面
 * Email + Password 登录表单
 */
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FlaskConical, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 如果已登录，重定向到工作台
  if (user) {
    navigate({ to: "/workbench" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("请输入邮箱地址");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }

    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (err) {
      setError(err === "Invalid login credentials"
        ? "邮箱或密码错误，请重试"
        : err);
    } else {
      navigate({ to: "/workbench" });
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FlaskConical size={20} />
          </div>
          <CardTitle className="text-lg">登录 LabNote Agent</CardTitle>
          <CardDescription>使用邮箱和密码登录</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="researcher@lab.edu.cn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "登录中…" : "登录"}
            </Button>
            <p className="text-xs text-muted-foreground">
              还没有账号？{" "}
              <Link to="/signup" className="text-primary hover:underline">
                注册
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
