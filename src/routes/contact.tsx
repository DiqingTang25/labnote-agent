/**
 * 联系我们页面：左右分屏布局
 * 左侧：产品动态宣传区（渐变背景 + 亮点轮播）
 * 右侧：ELN 风格联系表单（咨询类型/邮箱必填，其他选填）
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle2,
  Mail,
  Phone,
  MessageSquare,
  FileSearch,
  Brain,
  Database,
  Network,
  ShieldCheck,
  GitBranch,
  ChevronDown,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { submitGeneralFeedback } from "../lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "联系我们 – LabNote Agent" },
      { name: "description", content: "有任何问题或合作意向？填写表单或匿名提交，我们会尽快回复。" },
    ],
  }),
  component: ContactPage,
});

const highlights = [
  {
    icon: <FileSearch size={20} />,
    title: "多模态解析",
    desc: "PDF · DOCX · 图像 · 语音 · 仪器日志联合解析",
  },
  {
    icon: <Brain size={20} />,
    title: "AI 信息抽取",
    desc: "大模型自动抽取实验关键字段，归一化术语与单位",
  },
  {
    icon: <Database size={20} />,
    title: "RAG 知识问答",
    desc: "基于实验向量库的自然语言追溯与对比",
  },
  {
    icon: <Network size={20} />,
    title: "关系图谱",
    desc: "实验-样品-设备-参数-结果的关联可视化",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "完整性检查",
    desc: "按学科模板验证实验记录是否可复现",
  },
  {
    icon: <GitBranch size={20} />,
    title: "复现实验",
    desc: "自动生成复现清单与 Methods 草稿",
  },
];

const inquiryTypes = [
  { value: "support", label: "技术支持" },
  { value: "business", label: "商务合作" },
  { value: "suggestion", label: "产品建议" },
  { value: "other", label: "其他" },
];

function ContactPage() {
  const [inquiryType, setInquiryType] = useState("support");
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [hlIndex, setHlIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHlIndex((i) => (i + 1) % highlights.length), 2400);
    return () => clearInterval(t);
  }, []);

  const canSubmit =
    email.trim().length >= 3 && message.trim().length >= 5 && !sending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSending(true);
    try {
      const isAnonymous = !name.trim();
      const title = `${inquiryTypeLabel(inquiryType)} · ${name.trim() || "匿名用户"} <${email.trim()}>`;
      const description =
        `类型：${inquiryTypeLabel(inquiryType)}\n姓名：${name.trim() || "未填"}\n单位：${affiliation.trim() || "未填"}\n邮箱：${email.trim()}\n电话：${phone.trim() || "未填"}\n\n${message.trim()}`;

      const ok = await submitGeneralFeedback({ type: "other", title, description });
      if (ok) {
        setSent(true);
        toast.success("消息已送达，感谢你的联系！");
      } else {
        toast.error("提交失败，请稍后重试或直接邮件联系我们");
      }
    } catch {
      toast.error("网络错误，请检查连接");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="text-primary" size={56} />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">消息已送达</h1>
        <p className="mt-3 text-sm text-muted-foreground">感谢你的联系，我们会尽快回复你。</p>
        <Link to="/" className="mt-8 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:border-primary/40 transition">
          <ArrowLeft size={14} /> 返回首页
        </Link>
      </div>
    );
  }

  const current = highlights[hlIndex];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6">
        <ArrowLeft size={12} /> 返回首页
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
        {/* ========== 左侧：产品动态宣传区 ========== */}
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-primary-soft via-card to-primary-soft/60 p-8">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
                <FileSearch size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold">LabNote Agent</div>
                <div className="text-[10px] text-muted-foreground">科研数据治理 · 实验复现</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex-1 flex items-center justify-center my-8">
            <div key={hlIndex} className="animate-fade-in text-center max-w-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                {current.icon}
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-tight">{current.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{current.desc}</p>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {highlights.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === hlIndex ? "w-6 bg-primary" : "w-1.5 bg-border"
                    }`}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              让每一次实验都成为<span className="font-medium text-foreground">可复用</span>的科研资产
            </p>
          </div>
        </div>

        {/* ========== 右侧：联系表单 ========== */}
        <div className="flex flex-col justify-center">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              联系<span className="brand-gradient-text">我们</span>
            </h1>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="text-4xl font-bold tracking-tight">
              联系<span className="brand-gradient-text">我们</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              有任何问题或合作意向？请告诉我们，我们会尽快回复。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 咨询类型（必填） */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                咨询类型 <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 pr-10 text-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {inquiryTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* 姓名 + 单位 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="姓名" value={name} onChange={setName} optional />
              <TextField label="单位 / 学校" value={affiliation} onChange={setAffiliation} optional />
            </div>

            {/* 邮箱（必填）+ 电话（选填） */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="邮箱"
                value={email}
                onChange={setEmail}
                type="email"
                required
                icon={<Mail size={14} />}
              />
              <TextField
                label="电话"
                value={phone}
                onChange={setPhone}
                type="tel"
                optional
                icon={<Phone size={14} />}
              />
            </div>

            {/* 留言内容 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                留言内容 <span className="text-destructive">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="请描述你的问题、建议或合作意向…"
                rows={5}
                required
                minLength={5}
                className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit || sending}
              className="w-full rounded-xl text-sm font-medium"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" /> 发送中…
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" /> 发送消息
                </>
              )}
            </Button>
          </form>

          {/* 交流群二维码 + 备用联系方式 */}
          <div className="mt-8 border-t border-border pt-6">
            <div className="rounded-xl bg-card/60 p-4">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MessageSquare size={14} className="text-primary" />
                    联系我们
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    扫码加入 LabNote Agent 用户交流群，与团队直接沟通
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <a href="mailto:2662001087@qq.com" className="inline-flex items-center gap-1 hover:text-foreground transition">
                  <Mail size={11} /> 2662001087@qq.com
                </a>
                <a href="tel:+8618927748977" className="inline-flex items-center gap-1 hover:text-foreground transition">
                  <Phone size={11} /> 189-2774-8977
                </a>
                <Link to="/help" className="inline-flex items-center gap-1 hover:text-foreground transition">
                  <MessageSquare size={11} /> 使用指南
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function inquiryTypeLabel(value: string) {
  return inquiryTypes.find((t) => t.value === value)?.label ?? "其他";
}

/** 带图标的输入字段 */
function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  optional = false,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  optional?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {optional && <span className="ml-1 text-muted-foreground/50">（选填）</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={`w-full rounded-xl border border-border bg-card py-3 text-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 ${icon ? "pl-9 pr-4" : "px-4"
            }`}
        />
      </div>
    </div>
  );
}
