/**
 * 新建实验模板选择器 — 快速新建（通用模板）/ 27 预置模板 / 团队模板
 * 团队工作空间下显示团队模板；选择后按模板的 fieldGroups 渲染实验卡片。
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { LayoutTemplate, Zap, Users } from "lucide-react";
import { ALL_PRESET_TEMPLATES } from "../lib/templates/presets";
import { useLab } from "../lib/labStore";
import type { Template } from "../lib/exp-core";

export function TemplatePickerDialog(props: {
  open: boolean;
  onClose: () => void;
  /** undefined = 快速新建（通用模板） */
  onPick: (template: Template | undefined) => void;
}) {
  const { open, onClose, onPick } = props;
  const { teamTemplates, workspace } = useLab();
  const isTeam = workspace.mode === "team" && !!workspace.teamId;

  const pick = (tpl: Template | undefined) => {
    onPick(tpl);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建实验 — 选择模板</DialogTitle>
          <DialogDescription>
            模板决定实验卡片的字段结构（标签、单位、物理约束），创建后仍可自由增删字段。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 快速新建 */}
          <button
            onClick={() => pick(undefined)}
            className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft/40 px-4 py-3 text-left transition hover:border-primary/60"
          >
            <Zap size={18} className="text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">快速新建（通用模板）</p>
              <p className="text-xs text-muted-foreground">空白通用结构，字段随时自增</p>
            </div>
          </button>

          {/* 团队模板 */}
          {isTeam && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users size={12} /> 团队模板
              </p>
              {teamTemplates.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                  暂无团队模板 — 管理员可在「团队 → 模板」页创建
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {teamTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => pick(t)}
                      className="rounded-lg border border-border px-3 py-2 text-left transition hover:border-primary/60"
                    >
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.experimentType}
                        {t.domain ? ` · ${t.domain}` : ""} · {t.fieldGroups.length} 组
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 预置模板 */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <LayoutTemplate size={12} /> 预置模板（{ALL_PRESET_TEMPLATES.length}）
            </p>
            <div className="grid max-h-[38vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {ALL_PRESET_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pick(t)}
                  className="rounded-lg border border-border px-3 py-2 text-left transition hover:border-primary/60"
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.experimentType}
                    {t.domain ? ` · ${t.domain}` : ""} · {t.fieldGroups.length} 组
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
