import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useLab, c as checkCompleteness } from "./router-DTtIwz4c.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { a as ListChecks, a3 as RotateCcw, n as Sparkles, a9 as ChevronUp, aa as ChevronDown, a4 as Lightbulb, a0 as TriangleAlert, p as CircleCheck, Z as ArrowRight } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/zod.mjs";
function ChecklistPage() {
  const {
    experiments,
    updateExperiment
  } = useLab();
  const [activeId, setActiveId] = reactExports.useState(experiments[0]?.id);
  const active = experiments.find((e) => e.id === activeId) ?? experiments[0];
  const [done, setDone] = reactExports.useState({});
  const [expandedGuidance, setExpandedGuidance] = reactExports.useState({});
  const missing = reactExports.useMemo(() => active ? checkCompleteness(active) : [], [active]);
  const groups = reactExports.useMemo(() => active ? [{
    key: "prep",
    title: "实验准备",
    icon: "🔬",
    items: [{
      text: "查阅 SOP 与上一次实验记录",
      guidance: "打开实验室标准操作流程文档，对比上次相同实验的记录，确认本次实验的参数是否有调整。如果参数有变化，在工作台的实验卡片中注明变更原因。"
    }, {
      text: `确认样品 ${active.sample.id || ""} 信息正确`,
      guidance: `核对样品编号「${active.sample.id || "待填写"}」、批次「${active.sample.batch || "待填写"}」是否与实物标签一致。检查来源「${active.sample.source || "待填写"}」，确保样品在有效期内、储存条件正确。如信息缺失，请先到工作台补全。`
    }, {
      text: "明确实验目的与预期结果",
      guidance: `本次实验目的：${active.purpose || "（待填写）"}。请在实验记录本中写下 2-3 个明确的预期结果，例如"预计降解率 ≥ 85%"、"预计晶粒尺寸 10-20nm"。这有助于实验后判断结果是否合理。`
    }, {
      text: "准备安全防护装备并检查实验室环境",
      guidance: "穿好实验服、戴防护手套和护目镜。检查通风橱是否正常、废液桶是否有空余容量、灭火器是否在位。记录实验室温湿度：温度约 25℃，湿度约 50%。"
    }]
  }, {
    key: "device",
    title: "设备校准",
    icon: "⚙️",
    items: [{
      text: `校准 ${active.device.name || "主要设备"}`,
      guidance: `检查 ${active.device.name || "设备"}（型号 ${active.device.model || "未知"}）上次校准日期是否在有效期内。运行设备自检程序，确认所有指示灯正常、无报错代码。预热至少 30 分钟（根据设备类型调整）。`
    }, {
      text: "设置实验参数并运行空白对照",
      guidance: `按实验方案设置参数：${active.params.slice(0, 4).map((p) => `${p.name}=${p.value}${p.unit}`).join("，") || "（待填写）"}。运行一次空白测试（不加样品），确认基线平稳、无异常波动。`
    }, {
      text: "记录设备信息与软件版本",
      guidance: `在工作台的「设备信息」区域填完整：设备名称「${active.device.name || ""}」、型号「${active.device.model || ""}」、厂家「${active.device.vendor || ""}」。拍照保存设备序列号标签，记录控制软件的版本号。`
    }]
  }, {
    key: "sample",
    title: "样品处理",
    icon: "🧪",
    items: [{
      text: "核对样品编号与批次，拍摄留档照片",
      guidance: `用手机拍摄样品瓶标签（含编号「${active.sample.id || ""}」和批次「${active.sample.batch || ""}」）。照片需清晰显示标签文字，存入实验文件夹的「样品照片」子目录。`
    }, {
      text: `精确称量 ${active.sample.id || "样品"} 并记录质量`,
      guidance: "使用分析天平（精度 0.1mg），先校准天平，然后称量。记录初始质量到工作台的实验参数中。建议称量 3 次取平均值，减少称量误差。"
    }, {
      text: "检查样品外观与储存条件",
      guidance: "观察样品颜色、状态是否正常（如 Fe₃O₄ 应为黑色粉末，无结块）。检查储存容器的密封性，确认未受潮或氧化。如有异常，拍照并在工作台备注中记录。"
    }]
  }, {
    key: "steps",
    title: "实验操作",
    icon: "📋",
    items: active.steps.length ? active.steps.map((s, i) => ({
      text: `步骤 ${i + 1}：${s}`,
      guidance: `执行本步骤时注意：① 严格按照操作顺序 ② 实时记录任何偏离计划的操作 ③ 使用计时器确保时间准确 ④ 在实验记录本上打勾标记完成。如遇异常（如颜色变化异常、温度波动），立即在工作台「异常与备注」中记录。`
    })) : [{
      text: "实验步骤待补全",
      guidance: "当前实验卡片尚未填写步骤。请先到工作台完善实验步骤，然后再进行复现验证。步骤应包含：具体操作、时间、用量、条件等关键信息。"
    }]
  }, {
    key: "qc",
    title: "数据核验",
    icon: "✅",
    items: [{
      text: "保存所有仪器原始数据文件",
      guidance: "从仪器电脑导出原始数据文件（如 CSV、TXT、仪器专用格式），不要只保存处理后的数据。文件名应包含日期和样品编号，例如「UV-Vis-20260515-Fe3O4-MB.csv」。备份到实验文件夹和云盘各一份。"
    }, {
      text: "核对结果数据与实验预期",
      guidance: `将实测结果与实验目的对比：${active.purpose || "（待填写）"}。如果结果与预期偏差超过 15%，检查是否存在操作失误、设备故障或试剂问题，并在备注中记录可能原因。`
    }, {
      text: "将数据与发现更新到实验卡片",
      guidance: "在工作台中找到本次实验卡片，更新「结果数据」和「异常与备注」字段。补充新的参数（如发现额外的重要条件），确保卡片内容完整、可用于后续论文写作。"
    }, {
      text: "标记复现完成并生成复现报告",
      guidance: "确认所有步骤已完成、数据已保存、卡片已更新后，点击「导出复现包」下载包含完整实验条件、步骤和结果的 Markdown 文件，作为复现凭证。"
    }]
  }] : [], [active]);
  const allSteps = reactExports.useMemo(() => {
    const flat = [];
    groups.forEach((g) => {
      g.items.forEach((item, i) => {
        flat.push({
          groupKey: g.key,
          groupTitle: g.title,
          item,
          globalIdx: flat.length
        });
      });
    });
    return flat;
  }, [groups]);
  const totalItems = allSteps.length;
  const doneCount = Object.values(done).filter(Boolean).length;
  const pct = totalItems ? Math.round(doneCount / totalItems * 100) : 0;
  const groupProgress = reactExports.useMemo(() => {
    return groups.map((g) => {
      const total = g.items.length;
      const finished = g.items.filter((it) => done[g.key + it.text]).length;
      return {
        key: g.key,
        title: g.title,
        total,
        finished,
        done: finished === total
      };
    });
  }, [groups, done]);
  const allDone = doneCount === totalItems && totalItems > 0;
  const toggleGuidance = (key) => {
    setExpandedGuidance((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const aiReminder = reactExports.useMemo(() => {
    if (!active) return null;
    const items = allSteps;
    if (doneCount === 0) {
      return {
        tone: "info",
        title: "👋 开始复现验证",
        lines: ["请从「实验准备」开始，逐项勾选完成。每项都配有详细操作指导，点击「查看指导」展开。", `当前实验卡片有 ${missing.length} 项字段待补全，建议先完善卡片再开始复现。`, "预计完整复现需要 4-6 小时，请合理安排时间。"]
      };
    }
    if (doneCount < totalItems) {
      const nextGroup = groupProgress.find((g) => !g.done);
      const nextItem = items.find((it) => !done[it.groupKey + it.item.text]);
      const lines = [];
      if (nextGroup) {
        lines.push(`📌 当前进度 ${pct}%，接下来请完成「${nextGroup.title}」分组（${nextGroup.finished}/${nextGroup.total}）。`);
      }
      if (nextItem) {
        lines.push(`👉 下一步：${nextItem.item.text}`);
      }
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
      const stillMissing = missing.filter((m) => {
        return !Object.entries(done).some(([k, v]) => v && k.includes(m));
      });
      if (stillMissing.length > 0) {
        lines.push(`⚠️ 仍有 ${stillMissing.length} 项卡片字段缺失：${stillMissing.slice(0, 3).join("、")}。`);
      }
      return {
        tone: "info",
        title: `进度 ${pct}% — 持续复现中`,
        lines
      };
    }
    return {
      tone: "success",
      title: "🎉 复现验证完成！",
      lines: [`全部 ${totalItems} 项步骤已确认完成。实验「${active.name}」可复现。`, "✅ 实验卡片数据完整，可直接用于论文 Materials and Methods 部分。", "📦 建议导出复现包（JSON + Markdown），作为课题归档和论文支撑材料。", "📊 如果这是重复实验，建议与历史数据进行对比分析。"]
    };
  }, [doneCount, totalItems, pct, allSteps, groupProgress, active, missing]);
  const resetAll = () => {
    setDone({});
    setExpandedGuidance({});
    toast.info("已重置所有步骤");
  };
  if (!active) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl p-12 text-center text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { size: 40, className: "mx-auto opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4", children: "尚无实验，请先到工作台创建或上传实验数据。" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl px-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ListChecks, { size: 20 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "复现 Checklist" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "人工逐项验证 · 详细操作指导 · AI 动态提醒" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: active.id, onChange: (e) => {
        setActiveId(e.target.value);
        setDone({});
      }, className: "rounded-lg border border-border bg-card px-3 py-2 text-sm", children: experiments.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: e.id, children: e.name }, e.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-5 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "复现实验" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-semibold mt-0.5", children: active.name })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "总步骤", value: `${totalItems}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "已完成", value: `${doneCount}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "进度", value: `${pct}%` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-w-[120px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2.5 rounded-full bg-primary/10 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-full rounded-full transition-all duration-500 ${allDone ? "bg-[color:var(--color-success)]" : "bg-primary"}`, style: {
          width: `${pct}%`
        } }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: resetAll, className: "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary transition", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 14 }),
          " 重置"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex flex-wrap gap-3", children: groupProgress.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] ${g.done ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]" : g.finished > 0 ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-2 h-2 rounded-full ${g.done ? "bg-[color:var(--color-success)]" : g.finished > 0 ? "bg-primary" : "bg-border"}` }),
        g.title,
        " ",
        g.finished,
        "/",
        g.total
      ] }, g.key)) })
    ] }),
    aiReminder && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mb-6 rounded-xl p-4 transition-all ${aiReminder.tone === "success" ? "bg-[color:var(--color-success)]/5 border border-[color:var(--color-success)]/30" : "bg-primary-soft/10 border border-primary/20"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 15, className: aiReminder.tone === "success" ? "text-[color:var(--color-success)]" : "text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: aiReminder.title })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5", children: aiReminder.lines.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-xs text-muted-foreground leading-relaxed", children: line }, i)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-soft p-5 mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative pl-8 border-l-2 border-border space-y-0", children: allSteps.map((step, i) => {
      const key = step.groupKey + step.item.text;
      const isDone = !!done[key];
      const isExpanded = !!expandedGuidance[key];
      const isCurrent = !isDone && !allSteps.slice(0, i).some((s) => !done[s.groupKey + s.item.text]);
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `relative -left-[34px] pb-3 last:pb-0`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] border-2 transition-all ${isDone ? "bg-[color:var(--color-success)] border-[color:var(--color-success)] text-white" : isCurrent ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary/20" : "bg-background border-border text-muted-foreground"}`, children: isDone ? "✓" : i + 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0 pb-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2.5 cursor-pointer flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: isDone, onChange: (e) => setDone({
                ...done,
                [key]: e.target.checked
              }), className: "mt-0.5 accent-[color:var(--color-primary)]" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-sm leading-relaxed ${isDone ? "line-through text-muted-foreground" : isCurrent ? "font-medium" : ""}`, children: step.item.text })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0", children: step.groupTitle })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => toggleGuidance(key), className: `mt-1 flex items-center gap-1 text-[11px] transition ${isCurrent && !isExpanded ? "text-primary font-medium animate-pulse" : "text-muted-foreground hover:text-foreground"}`, children: [
            isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 12 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 12 }),
            isExpanded ? "收起指导" : isCurrent ? "📖 查看详细操作指导" : "查看指导"
          ] }),
          isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-2 rounded-lg p-3 text-xs leading-relaxed transition-all ${isDone ? "bg-[color:var(--color-success)]/5 border border-[color:var(--color-success)]/20" : "bg-primary-soft/10 border border-primary/15"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, { size: 12, className: "text-primary mt-0.5 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: step.item.guidance })
          ] }) })
        ] })
      ] }) }, i);
    }) }) }),
    missing.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-xl bg-[color:var(--color-warning)]/5 border border-[color:var(--color-warning)]/30 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2 text-[color:var(--color-warning)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 15 }),
        " 卡片字段待补全（",
        missing.length,
        " 项）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [
        missing.slice(0, 8).join("、"),
        missing.length > 8 ? `等共 ${missing.length} 项` : "",
        "。补全后可提高复现可信度评分。"
      ] })
    ] }),
    allDone && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 card-soft p-6 border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/5 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 40, className: "mx-auto text-[color:var(--color-success)]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-3 text-lg font-bold", children: "复现验证通过" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-sm text-muted-foreground max-w-md mx-auto", children: [
        "实验「",
        active.name,
        "」的 ",
        totalItems,
        " 项步骤全部确认可复现。建议导出复现包归档。"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
        const md = `# 复现报告：${active.name}

## 验证日期
${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}

## 验证结果
全部 ${totalItems} 项步骤通过 ✅

## 实验卡片
见工作台
`;
        const blob = new Blob([md], {
          type: "text/markdown"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `复现报告-${active.name}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("复现报告已下载");
      }, className: "mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90 transition", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 14 }),
        " 导出复现报告"
      ] })
    ] })
  ] });
}
function Stat({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base font-bold tabular-nums", children: value })
  ] });
}
export {
  ChecklistPage as component
};
