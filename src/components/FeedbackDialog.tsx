/**
 * 用户反馈弹窗 — Bug反馈 / 功能建议
 */
import { useState } from "react";
import { X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { submitGeneralFeedback } from "../lib/supabase";
import { toast } from "sonner";

const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug 反馈" },
  { value: "feature", label: "功能建议" },
  { value: "other", label: "其他" },
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number]["value"];

type Props = { open: boolean; onClose: () => void };

export function FeedbackDialog({ open, onClose }: Props) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;

    setSending(true);
    try {
      const ok = await submitGeneralFeedback({ type, title: title.trim(), description: desc.trim() });
      if (ok) {
        setSent(true);
        toast.success("感谢反馈！我们会尽快处理 🙏");
        setTimeout(() => {
          onClose();
          // 延迟重置，避免关闭时看到空白
          setTimeout(() => {
            setType("bug");
            setTitle("");
            setDesc("");
            setSent(false);
          }, 200);
        }, 1500);
      } else {
        toast.error("发送失败，请稍后重试");
      }
    } catch {
      toast.error("网络错误，请检查连接");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        {/* 头部 */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base flex items-center gap-2">
            {sent ? (
              <>
                <CheckCircle2 size={18} className="text-green-500" />
                已收到反馈
              </>
            ) : (
              "📬 反馈与建议"
            )}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            感谢你的反馈，我们会认真对待每一条建议 ❤️
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* 类型选择 */}
            <div className="flex gap-2">
              {FEEDBACK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    type === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 标题 */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="一句话描述你的问题或建议"
              className="text-sm"
              maxLength={120}
              required
            />

            {/* 描述 */}
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="详细描述…"
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              maxLength={2000}
              required
            />

            {/* 按钮 */}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={sending}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={sending || !title.trim() || !desc.trim()}>
                {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                提交
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
