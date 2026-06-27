import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useLab } from "./router-DTtIwz4c.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { W as User } from "../_libs/lucide-react.mjs";
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
const disciplineFields = {
  材料科学: ["晶体结构", "退火温度", "XRD 峰位", "粒径分布"],
  化学: ["反应温度", "反应时间", "pH 值", "产率"],
  生物: ["菌株 / 细胞系", "培养温度", "传代次数", "OD 值"],
  电子: ["供电电压", "工作频率", "信噪比", "测试通道"]
};
function SettingsPage() {
  const {
    profile,
    setProfile
  } = useLab();
  const [draft, setDraft] = reactExports.useState(profile);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { size: 20 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: "个人设置" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "配置默认实验模板与学科领域" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-soft p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "姓名" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.name, onChange: (e) => setDraft({
          ...draft,
          name: e.target.value
        }), className: "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "所属课题组 / 机构" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: draft.org, onChange: (e) => setDraft({
          ...draft,
          org: e.target.value
        }), className: "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "默认学科领域" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid grid-cols-4 gap-2", children: Object.keys(disciplineFields).map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDraft({
          ...draft,
          discipline: d
        }), className: `rounded-lg border px-3 py-2 text-sm transition ${draft.discipline === d ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary/40"}`, children: d }, d)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-medium text-foreground mb-1", children: [
            "「",
            draft.discipline,
            "」默认建议字段："
          ] }),
          disciplineFields[draft.discipline].join(" · ")
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
        setProfile(draft);
        toast.success("设置已保存");
      }, className: "rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90", children: "保存设置" }) })
    ] })
  ] });
}
export {
  SettingsPage as component
};
