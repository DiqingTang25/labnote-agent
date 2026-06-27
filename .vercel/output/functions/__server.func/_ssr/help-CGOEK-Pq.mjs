import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { _ as FileSearch, j as Brain, L as Layers, $ as ShieldCheck, h as MessageSquare, G as GitBranch } from "../_libs/lucide-react.mjs";
function HelpPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-4xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold", children: "帮助文档" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-muted-foreground", children: "LabNote Agent 是面向高校实验室与科研课题组的智能数据治理助手。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mt-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold", children: "技术架构" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArchCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileSearch, { size: 18 }), title: "多模态解析", desc: "PDF / DOCX / Excel / 图像 / 仪器日志 / 语音 ASR 联合解析" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArchCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { size: 18 }), title: "大模型信息抽取", desc: "LLM 抽取实验关键字段并归一化术语与单位" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArchCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { size: 18 }), title: "智能清洗与标注", desc: "自动识别缺失字段、异常值并提示人工复核" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArchCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { size: 18 }), title: "完整性检查", desc: "按学科模板验证实验记录是否可复现" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArchCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { size: 18 }), title: "RAG 问答", desc: "基于实验向量库的自然语言追溯与对比" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArchCard, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranch, { size: 18 }), title: "知识图谱", desc: "实验-样品-设备-参数-结果的关联可视化" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mt-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold", children: "快速上手" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "mt-4 space-y-2 text-sm list-decimal pl-5 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "进入「实验工作台」，从左栏上传文件或使用语音录入模拟。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "在中栏对自动生成的实验卡片进行复核、补全。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "在右栏查看完整性检查结果，生成复现清单与 Methods 草稿。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "需要追溯历史实验时，使用 RAG 知识问答快速检索。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "在「知识图谱」查看实验间的关联关系。" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mt-10 card-soft p-6 bg-primary-soft/40 border-primary/20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "关于 LabNote Agent" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "LabNote Agent 聚焦真实科研业务场景中的数据治理与实验复现痛点。技术生态层面，可结合 思必驰（AISpeech）智能语音终端，实现实验现场的自然语言记录与免手操作。" })
    ] })
  ] });
}
function ArchCard({
  icon,
  title,
  desc
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary", children: icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-sm", children: title })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: desc })
  ] });
}
export {
  HelpPage as component
};
