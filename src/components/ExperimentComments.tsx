/**
 * 实验讨论面板 — 团队协作评论（RLS：能看实验就能看评论；删除限本人/团队管理员）
 */
import { useEffect, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchComments,
  insertComment,
  deleteComment,
  fetchMemberEmails,
  type ExperimentCommentRow,
} from "../lib/supabase";

export function ExperimentComments({ experimentId }: { experimentId: string }) {
  const [rows, setRows] = useState<ExperimentCommentRow[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetchComments(experimentId);
    setRows(r);
    const ids = [...new Set(r.map((c) => c.user_id))];
    if (ids.length > 0) setEmails(await fetchMemberEmails(ids));
  };

  useEffect(() => {
    load();
  }, [experimentId]);

  const submit = async () => {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    try {
      const ok = await insertComment(experimentId, content);
      if (!ok) throw new Error("发送失败");
      setText("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发送失败");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await deleteComment(id);
    if (ok) {
      toast.success("已删除");
      await load();
    } else {
      toast.error("删除失败（仅本人或团队管理员可删除）");
    }
  };

  const author = (userId: string) => {
    const email = emails[userId];
    return email ? email.split("@")[0] : "成员";
  };

  return (
    <div className="card-soft mt-3 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquare size={14} className="text-primary" /> 讨论（{rows.length}）
      </h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">暂无讨论。留下第一条评论，与团队交流实验细节。</p>
        )}
        {rows.map((c) => (
          <div key={c.id} className="rounded-lg bg-secondary/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium">{author(c.user_id)}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(c.created_at).toLocaleString("zh-CN", { hour12: false })}
              </span>
              <button
                onClick={() => remove(c.id)}
                aria-label="删除评论"
                className="ml-auto rounded p-0.5 text-muted-foreground transition hover:text-destructive"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{c.content}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="写下评论…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none transition focus:border-primary/60"
        />
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Send size={12} /> 发送
        </button>
      </div>
    </div>
  );
}
