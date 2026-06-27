/**
 * 项目交接助手：突出团队知识传承能力
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLab } from "../lib/labStore";
import { UserCheck, FileText, ListChecks, BookOpen, AlertTriangle, ArrowRight, Clock, Sparkles } from "lucide-react";
import { RequireAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/handoff")({
  head: () => ({
    meta: [
      { title: "项目交接助手 – LabNote Agent" },
      { name: "description", content: "面向科研项目交接的 AI 助手：完成实验、卡片、Checklist、经验总结、异常实验一目了然。" },
    ],
  }),
  component: HandoffPage,
});

function HandoffPage() {
  const { experiments } = useLab();
  const handoverStats = {
    owner: "李同学",
    completed: 18,
    cards: 18,
    checklists: 18,
    lessons: 6,
    abnormal: 3,
  };
  const readingOrder = ["MAT-041", "MAT-052", "MAT-056"];

  return (
    <RequireAuth>
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white"><UserCheck size={20}/></div>
        <div>
          <h1 className="text-2xl font-bold">科研项目交接助手</h1>
          <p className="text-sm text-muted-foreground">让团队知识在毕业 / 轮岗时不再丢失</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        {/* 左：交接概要 */}
        <div className="space-y-5">
          <div className="card-soft p-6 bg-gradient-to-br from-primary-soft to-transparent">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">李</div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">交接负责人</div>
                <div className="text-xl font-semibold">{handoverStats.owner}</div>
                <div className="text-xs text-muted-foreground mt-1">智能材料课题组 · 即将毕业</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Clock size={12}/>预计完成</div>
                <div className="text-lg font-bold text-primary">30 分钟</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
              <Mini label="完成实验" value={handoverStats.completed} icon={<FileText size={14}/>}/>
              <Mini label="实验卡片" value={handoverStats.cards} icon={<FileText size={14}/>}/>
              <Mini label="Checklist" value={handoverStats.checklists} icon={<ListChecks size={14}/>}/>
              <Mini label="经验总结" value={handoverStats.lessons} icon={<BookOpen size={14}/>}/>
              <Mini label="异常实验" value={handoverStats.abnormal} tone="warn" icon={<AlertTriangle size={14}/>}/>
            </div>
          </div>

          <div className="card-soft p-5">
            <h3 className="text-sm font-semibold mb-3">关键实验记录（节选）</h3>
            <ul className="divide-y divide-border">
              {experiments.slice(0, 5).map((e) => (
                <li key={e.id} className="py-2.5 flex items-center gap-3">
                  <span className="text-xs font-mono rounded bg-secondary px-2 py-0.5">{e.sample.id || "—"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-[11px] text-muted-foreground">{e.date} · {e.operator}</div>
                  </div>
                  <Link to="/workbench" search={{ id: e.id }} className="text-xs text-primary hover:underline">查看 →</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-soft p-5">
            <h3 className="text-sm font-semibold mb-3">经验总结（AI 提炼）</h3>
            <ul className="space-y-2 text-sm">
              {[
                "管式炉退火升温速率 >8℃/min 会显著降低晶粒均匀性",
                "Pt/C 电极 N2 鼓泡时间不足 30 min 易导致 CV 异常尖峰",
                "水热反应釜填充率超过 80% 存在安全风险，建议 60-70%",
                "XRD 样品制备粒径需 <50μm 以避免择优取向",
                "电化学测试前务必校准参比电极电位（每周一次）",
                "原始数据应在实验当天上传至课题组云盘并打标签",
              ].map((t, i) => (
                <li key={i} className="flex gap-2 text-muted-foreground">
                  <span className="text-primary mt-1">●</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 右：AI 阅读建议 */}
        <div className="space-y-5">
          <div className="card-soft p-5 border-primary/30">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Sparkles size={16}/> AI 建议阅读顺序
            </h3>
            <p className="text-xs text-muted-foreground mt-1">基于依赖关系与重要性自动排序</p>
            <ol className="mt-4 space-y-2">
              {readingOrder.map((id, i) => (
                <li key={id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary/40 transition">
                  <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i+1}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{id}</div>
                    <div className="text-[11px] text-muted-foreground">{["基础工艺","参数优化","异常分析"][i]}</div>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground"/>
                </li>
              ))}
            </ol>
          </div>

          <div className="card-soft p-5">
            <h3 className="text-sm font-semibold">交接 Checklist</h3>
            <ul className="mt-3 space-y-2 text-xs">
              {["原始数据已归档","实验卡片已审核","Checklist 已确认","Methods 草稿已交付","样品已转交","设备权限已交接"].map((t)=>(
                <li key={t} className="flex items-center gap-2"><input type="checkbox" defaultChecked className="accent-[color:var(--color-primary)]"/>{t}</li>
              ))}
            </ul>
          </div>

          <div className="card-soft p-5 bg-[color:var(--color-warning)]/5 border-[color:var(--color-warning)]/30">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[color:var(--color-warning)]">
              <AlertTriangle size={14}/> 异常实验提醒
            </h3>
            <ul className="mt-2 text-xs space-y-1 text-muted-foreground">
              <li>MAT-019：升温曲线异常（5/12）</li>
              <li>MAT-027：样品污染待复查（5/18）</li>
              <li>MAT-035：仪器漂移（5/25）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}

function Mini({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone?: "warn" }) {
  return (
    <div className="rounded-xl bg-white/70 p-3">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${tone === "warn" ? "text-[color:var(--color-warning)]" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
