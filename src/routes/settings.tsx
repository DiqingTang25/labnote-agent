/**
 * 用户设置：个人资料 + 默认学科模板
 */
import { createFileRoute } from "@tanstack/react-router";
import { useLab } from "../lib/labStore";
import { useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "个人设置 – LabNote Agent" }, { name: "description", content: "配置个人资料与默认学科模板。" }],
  }),
  component: SettingsPage,
});

const disciplineFields: Record<string, string[]> = {
  材料科学: ["晶体结构", "退火温度", "XRD 峰位", "粒径分布"],
  化学: ["反应温度", "反应时间", "pH 值", "产率"],
  生物: ["菌株 / 细胞系", "培养温度", "传代次数", "OD 值"],
  电子: ["供电电压", "工作频率", "信噪比", "测试通道"],
};

function SettingsPage() {
  const { profile, setProfile } = useLab();
  const [draft, setDraft] = useState(profile);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white"><User size={20}/></div>
        <div>
          <h1 className="text-2xl font-bold">个人设置</h1>
          <p className="text-sm text-muted-foreground">配置默认实验模板与学科领域</p>
        </div>
      </div>

      <div className="card-soft p-6 space-y-4">
        <label className="block">
          <span className="text-xs text-muted-foreground">姓名</span>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"/>
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">所属课题组 / 机构</span>
          <input value={draft.org} onChange={(e) => setDraft({ ...draft, org: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"/>
        </label>
        <div>
          <span className="text-xs text-muted-foreground">默认学科领域</span>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(Object.keys(disciplineFields) as Array<keyof typeof disciplineFields>).map((d) => (
              <button key={d} onClick={() => setDraft({ ...draft, discipline: d as never })}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  draft.discipline === d ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary/40"
                }`}>{d}</button>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground mb-1">「{draft.discipline}」默认建议字段：</div>
            {disciplineFields[draft.discipline].join(" · ")}
          </div>
        </div>
        <div className="pt-2">
          <button
            onClick={() => { setProfile(draft); toast.success("设置已保存"); }}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >保存设置</button>
        </div>
      </div>
    </div>
  );
}
