/**
 * Checklist 复现模式 — 人工逐项勾选 + 详细指导 + AI 动态提醒
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useLab, checkCompleteness } from "../lib/labStore";
import {
  ListChecks, CheckCircle2, AlertTriangle, Lightbulb,
  RotateCcw, ChevronDown, ChevronUp, ArrowRight, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checklist")({
  head: () => ({
    meta: [
      { title: "复现 Checklist – LabNote Agent" },
      { name: "description", content: "人工逐项验证的实验复现清单，含详细操作指导和 AI 动态提醒。" },
    ],
  }),
  component: ChecklistPage,
});

// 每步不仅有标题，还有详细操作指导
type StepItem = {
  text: string;
  guidance: string; // 详细操作指导
};

type Group = {
  key: string;
  title: string;
  icon: string;
  items: StepItem[];
};

function ChecklistPage() {
  const { experiments, updateExperiment } = useLab();
  const [activeId, setActiveId] = useState(experiments[0]?.id);
  const active = experiments.find((e) => e.id === activeId) ?? experiments[0];
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [expandedGuidance, setExpandedGuidance] = useState<Record<string, boolean>>({});

  const missing = useMemo(() => active ? checkCompleteness(active) : [], [active]);

  const groups: Group[] = useMemo(() => active ? [
    {
      key: "prep", title: "实验准备", icon: "🔬",
      items: [
        {
          text: "查阅 SOP 与上一次实验记录",
          guidance: "打开实验室标准操作流程文档，对比上次相同实验的记录，确认本次实验的参数是否有调整。如果参数有变化，在工作台的实验卡片中注明变更原因。",
        },
        {
          text: `确认样品 ${active.sample.id || ""} 信息正确`,
          guidance: `核对样品编号「${active.sample.id || "待填写"}」、批次「${active.sample.batch || "待填写"}」是否与实物标签一致。检查来源「${active.sample.source || "待填写"}」，确保样品在有效期内、储存条件正确。如信息缺失，请先到工作台补全。`,
        },
        {
          text: "明确实验目的与预期结果",
          guidance: `本次实验目的：${active.purpose || "（待填写）"}。请在实验记录本中写下 2-3 个明确的预期结果，例如"预计降解率 ≥ 85%"、"预计晶粒尺寸 10-20nm"。这有助于实验后判断结果是否合理。`,
        },
        {
          text: "准备安全防护装备并检查实验室环境",
          guidance: "穿好实验服、戴防护手套和护目镜。检查通风橱是否正常、废液桶是否有空余容量、灭火器是否在位。记录实验室温湿度：温度约 25℃，湿度约 50%。",
        },
      ],
    },
    {
      key: "device", title: "设备校准", icon: "⚙️",
      items: [
        {
          text: `校准 ${active.device.name || "主要设备"}`,
          guidance: `检查 ${active.device.name || "设备"}（型号 ${active.device.model || "未知"}）上次校准日期是否在有效期内。运行设备自检程序，确认所有指示灯正常、无报错代码。预热至少 30 分钟（根据设备类型调整）。`,
        },
        {
          text: "设置实验参数并运行空白对照",
          guidance: `按实验方案设置参数：${active.params.slice(0, 4).map(p => `${p.name}=${p.value}${p.unit}`).join("，") || "（待填写）"}。运行一次空白测试（不加样品），确认基线平稳、无异常波动。`,
        },
        {
          text: "记录设备信息与软件版本",
          guidance: `在工作台的「设备信息」区域填完整：设备名称「${active.device.name || ""}」、型号「${active.device.model || ""}」、厂家「${active.device.vendor || ""}」。拍照保存设备序列号标签，记录控制软件的版本号。`,
        },
      ],
    },
    {
      key: "sample", title: "样品处理", icon: "🧪",
      items: [
        {
          text: "核对样品编号与批次，拍摄留档照片",
          guidance: `用手机拍摄样品瓶标签（含编号「${active.sample.id || ""}」和批次「${active.sample.batch || ""}」）。照片需清晰显示标签文字，存入实验文件夹的「样品照片」子目录。`,
        },
        {
          text: `精确称量 ${active.sample.id || "样品"} 并记录质量`,
          guidance: "使用分析天平（精度 0.1mg），先校准天平，然后称量。记录初始质量到工作台的实验参数中。建议称量 3 次取平均值，减少称量误差。",
        },
        {
          text: "检查样品外观与储存条件",
          guidance: "观察样品颜色、状态是否正常（如 Fe₃O₄ 应为黑色粉末，无结块）。检查储存容器的密封性，确认未受潮或氧化。如有异常，拍照并在工作台备注中记录。",
        },
      ],
    },
    {
      key: "steps", title: "实验操作", icon: "📋",
      items: active.steps.length
        ? active.steps.map((s, i) => ({
            text: `步骤 ${i + 1}：${s}`,
            guidance: `执行本步骤时注意：① 严格按照操作顺序 ② 实时记录任何偏离计划的操作 ③ 使用计时器确保时间准确 ④ 在实验记录本上打勾标记完成。如遇异常（如颜色变化异常、温度波动），立即在工作台「异常与备注」中记录。`,
          }))
        : [{ text: "实验步骤待补全", guidance: "当前实验卡片尚未填写步骤。请先到工作台完善实验步骤，然后再进行复现验证。步骤应包含：具体操作、时间、用量、条件等关键信息。" }],
    },
    {
      key: "qc", title: "数据核验", icon: "✅",
      items: [
        {
          text: "保存所有仪器原始数据文件",
          guidance: "从仪器电脑导出原始数据文件（如 CSV、TXT、仪器专用格式），不要只保存处理后的数据。文件名应包含日期和样品编号，例如「UV-Vis-20260515-Fe3O4-MB.csv」。备份到实验文件夹和云盘各一份。",
        },
        {
          text: "核对结果数据与实验预期",
          guidance: `将实测结果与实验目的对比：${active.purpose || "（待填写）"}。如果结果与预期偏差超过 15%，检查是否存在操作失误、设备故障或试剂问题，并在备注中记录可能原因。`,
        },
        {
          text: "将数据与发现更新到实验卡片",
          guidance: "在工作台中找到本次实验卡片，更新「结果数据」和「异常与备注」字段。补充新的参数（如发现额外的重要条件），确保卡片内容完整、可用于后续论文写作。",
        },
        {
          text: "标记复现完成并生成复现报告",
          guidance: "确认所有步骤已完成、数据已保存、卡片已更新后，点击「导出复现包」下载包含完整实验条件、步骤和结果的 Markdown 文件，作为复现凭证。",
        },
      ],
    },
  ] : [], [active]);

  // 展开所有步骤到扁平列表
  const allSteps = useMemo(() => {
    const flat: Array<{ groupKey: string; groupTitle: string; item: StepItem; globalIdx: number }> = [];
    groups.forEach((g) => {
      g.items.forEach((item, i) => {
        flat.push({ groupKey: g.key, groupTitle: g.title, item, globalIdx: flat.length });
      });
    });
    return flat;
  }, [groups]);

  const totalItems = allSteps.length;
  const doneCount = Object.values(done).filter(Boolean).length;
  const pct = totalItems ? Math.round((doneCount / totalItems) * 100) : 0;

  // 哪些分组已完成/进行中
  const groupProgress = useMemo(() => {
    return groups.map((g) => {
      const total = g.items.length;
      const finished = g.items.filter((it) => done[g.key + it.text]).length;
      return { key: g.key, title: g.title, total, finished, done: finished === total };
    });
  }, [groups, done]);

  const allDone = doneCount === totalItems && totalItems > 0;

  // 切换指导展开
  const toggleGuidance = (key: string) => {
    setExpandedGuidance((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ===== AI 动态提醒：随勾选进度变化 =====
  const aiReminder = useMemo(() => {
    if (!active) return null;
    const items = allSteps;

    if (doneCount === 0) {
      return {
        tone: "info" as const,
        title: "👋 开始复现验证",
        lines: [
          "请从「实验准备」开始，逐项勾选完成。每项都配有详细操作指导，点击「查看指导」展开。",
          `当前实验卡片有 ${missing.length} 项字段待补全，建议先完善卡片再开始复现。`,
          "预计完整复现需要 4-6 小时，请合理安排时间。",
        ],
      };
    }

    if (doneCount < totalItems) {
      // 找到第一个未完成的分组
      const nextGroup = groupProgress.find((g) => !g.done);
      const nextItem = items.find((it) => !done[it.groupKey + it.item.text]);

      const lines: string[] = [];
      if (nextGroup) {
        lines.push(`📌 当前进度 ${pct}%，接下来请完成「${nextGroup.title}」分组（${nextGroup.finished}/${nextGroup.total}）。`);
      }
      if (nextItem) {
        lines.push(`👉 下一步：${nextItem.item.text}`);
      }

      // 根据已完成的内容给出具体建议
      const prepDone = groupProgress.find((g) => g.key === "prep")?.done;
      const deviceDone = groupProgress.find((g) => g.key === "device")?.done;
      const sampleDone = groupProgress.find((g) => g.key === "sample")?.done;
      const stepsDone = groupProgress.find((g) => g.key === "steps")?.done;

      if (prepDone && !deviceDone) {
        lines.push("💡 实验准备已完成，现在确保所有设备在校准有效期内——这会影响数据可靠性。");
      }
      if (deviceDone && !sampleDone) {
        lines.push("💡 设备已就绪，仔细称量样品——称量误差是实验误差的主要来源之一。");
      }
      if (sampleDone && !stepsDone) {
        lines.push("💡 样品已确认，开始操作时注意严格按步骤顺序执行，遇到任何异常立即记录。");
      }
      if (stepsDone && !groupProgress.find((g) => g.key === "qc")?.done) {
        lines.push("💡 实验操作完成！现在是数据核验阶段——原始数据比处理后的数据更有价值，务必保存。");
      }

      // 缺失字段提醒
      const stillMissing = missing.filter((m) => {
        return !Object.entries(done).some(([k, v]) => v && k.includes(m));
      });
      if (stillMissing.length > 0) {
        lines.push(`⚠️ 仍有 ${stillMissing.length} 项卡片字段缺失：${stillMissing.slice(0, 3).join("、")}。`);
      }

      return { tone: "info" as const, title: `进度 ${pct}% — 持续复现中`, lines };
    }

    // all done
    return {
      tone: "success" as const,
      title: "🎉 复现验证完成！",
      lines: [
        `全部 ${totalItems} 项步骤已确认完成。实验「${active.name}」可复现。`,
        "✅ 实验卡片数据完整，可直接用于论文 Materials and Methods 部分。",
        "📦 建议导出复现包（JSON + Markdown），作为课题归档和论文支撑材料。",
        "📊 如果这是重复实验，建议与历史数据进行对比分析。",
      ],
    };
  }, [doneCount, totalItems, pct, allSteps, groupProgress, active, missing]);

  const resetAll = () => {
    setDone({});
    setExpandedGuidance({});
    toast.info("已重置所有步骤");
  };

  if (!active) {
    return (
      <div className="mx-auto max-w-3xl p-12 text-center text-muted-foreground">
        <ListChecks size={40} className="mx-auto opacity-30"/>
        <p className="mt-4">尚无实验，请先到工作台创建或上传实验数据。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white"><ListChecks size={20}/></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">复现 Checklist</h1>
          <p className="text-sm text-muted-foreground">人工逐项验证 · 详细操作指导 · AI 动态提醒</p>
        </div>
        <select value={active.id} onChange={(e) => { setActiveId(e.target.value); setDone({}); }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          {experiments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* 概览进度条 */}
      <div className="card-soft p-5 mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs text-muted-foreground">复现实验</div>
            <div className="text-lg font-semibold mt-0.5">{active.name}</div>
          </div>
          <Stat label="总步骤" value={`${totalItems}`}/>
          <Stat label="已完成" value={`${doneCount}`}/>
          <Stat label="进度" value={`${pct}%`}/>
          <div className="flex-1 min-w-[120px]">
            <div className="h-2.5 rounded-full bg-primary/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allDone ? "bg-[color:var(--color-success)]" : "bg-primary"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <button onClick={resetAll}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary transition">
            <RotateCcw size={14}/> 重置
          </button>
        </div>

        {/* 分组进度条 */}
        <div className="mt-4 flex flex-wrap gap-3">
          {groupProgress.map((g) => (
            <div key={g.key}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] ${
                g.done
                  ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"
                  : g.finished > 0
                  ? "bg-primary-soft text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                g.done ? "bg-[color:var(--color-success)]" : g.finished > 0 ? "bg-primary" : "bg-border"
              }`}/>
              {g.title} {g.finished}/{g.total}
            </div>
          ))}
        </div>
      </div>

      {/* AI 动态提醒 */}
      {aiReminder && (
        <div className={`mb-6 rounded-xl p-4 transition-all ${
          aiReminder.tone === "success"
            ? "bg-[color:var(--color-success)]/5 border border-[color:var(--color-success)]/30"
            : "bg-primary-soft/10 border border-primary/20"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className={
              aiReminder.tone === "success" ? "text-[color:var(--color-success)]" : "text-primary"
            }/>
            <h3 className="text-sm font-semibold">{aiReminder.title}</h3>
          </div>
          <ul className="space-y-1.5">
            {aiReminder.lines.map((line, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 步骤时间线（全展开、可交互） */}
      <div className="card-soft p-5 mb-6">
        <div className="relative pl-8 border-l-2 border-border space-y-0">
          {allSteps.map((step, i) => {
            const key = step.groupKey + step.item.text;
            const isDone = !!done[key];
            const isExpanded = !!expandedGuidance[key];
            // 当前步骤：第一个未完成的
            const isCurrent = !isDone && !allSteps.slice(0, i).some((s) => !done[s.groupKey + s.item.text]);

            return (
              <div key={i} className={`relative -left-[34px] pb-3 last:pb-0`}>
                {/* 圆圈 */}
                <div className="flex items-start gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] border-2 transition-all ${
                    isDone
                      ? "bg-[color:var(--color-success)] border-[color:var(--color-success)] text-white"
                      : isCurrent
                      ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary/20"
                      : "bg-background border-border text-muted-foreground"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </span>

                  <div className="flex-1 min-w-0 pb-1">
                    {/* 标签 + 所属分组 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={(e) => setDone({ ...done, [key]: e.target.checked })}
                          className="mt-0.5 accent-[color:var(--color-primary)]"
                        />
                        <span className={`text-sm leading-relaxed ${
                          isDone ? "line-through text-muted-foreground" : isCurrent ? "font-medium" : ""
                        }`}>
                          {step.item.text}
                        </span>
                      </label>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                        {step.groupTitle}
                      </span>
                    </div>

                    {/* 展开/收起指导按钮 */}
                    <button
                      onClick={() => toggleGuidance(key)}
                      className={`mt-1 flex items-center gap-1 text-[11px] transition ${
                        isCurrent && !isExpanded
                          ? "text-primary font-medium animate-pulse"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                      {isExpanded ? "收起指导" : isCurrent ? "📖 查看详细操作指导" : "查看指导"}
                    </button>

                    {/* 详细指导内容 */}
                    {isExpanded && (
                      <div className={`mt-2 rounded-lg p-3 text-xs leading-relaxed transition-all ${
                        isDone
                          ? "bg-[color:var(--color-success)]/5 border border-[color:var(--color-success)]/20"
                          : "bg-primary-soft/10 border border-primary/15"
                      }`}>
                        <div className="flex items-start gap-2">
                          <Lightbulb size={12} className="text-primary mt-0.5 shrink-0"/>
                          <span>{step.item.guidance}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 缺失字段提醒 */}
      {missing.length > 0 && (
        <div className="mt-6 rounded-xl bg-[color:var(--color-warning)]/5 border border-[color:var(--color-warning)]/30 p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--color-warning)]">
            <AlertTriangle size={15}/> 卡片字段待补全（{missing.length} 项）
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {missing.slice(0, 8).join("、")}{missing.length > 8 ? `等共 ${missing.length} 项` : ""}
            。补全后可提高复现可信度评分。
          </p>
        </div>
      )}

      {/* 全部完成后的大提示 */}
      {allDone && (
        <div className="mt-6 card-soft p-6 border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/5 text-center">
          <CheckCircle2 size={40} className="mx-auto text-[color:var(--color-success)]"/>
          <h3 className="mt-3 text-lg font-bold">复现验证通过</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            实验「{active.name}」的 {totalItems} 项步骤全部确认可复现。建议导出复现包归档。
          </p>
          <button
            onClick={() => {
              const md = `# 复现报告：${active.name}\n\n## 验证日期\n${new Date().toISOString().slice(0, 10)}\n\n## 验证结果\n全部 ${totalItems} 项步骤通过 ✅\n\n## 实验卡片\n见工作台\n`;
              const blob = new Blob([md], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = `复现报告-${active.name}.md`; a.click();
              URL.revokeObjectURL(url);
              toast.success("复现报告已下载");
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90 transition"
          >
            <ArrowRight size={14}/> 导出复现报告
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}
