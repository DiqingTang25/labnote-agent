/**
 * 上传前后对比页：原始材料 → AI 自动治理 → 结构化资产
 */
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileText, FileSpreadsheet, Image as ImageIcon, MessageCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { RequireAuth } from "../lib/auth-guard";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "AI 治理前后对比 – LabNote Agent" },
      { name: "description", content: "查看 Word/Excel/照片/聊天记录如何被 AI Agent 一步治理为结构化实验卡片。" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  return (
    <RequireAuth>
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">上传前 vs AI 治理后</h1>
        <p className="mt-2 text-sm text-muted-foreground">从分散原始记录到结构化、可复现的科研资产，AI Agent 一步完成。</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start">
        {/* 左：原始材料 */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">原始材料</div>

          <RawCard icon={<FileText size={16}/>} title="实验日志.docx" badge="Word 文档">
            <p className="text-xs text-muted-foreground italic">
              "今天做了 Fe2309 退火，大概 550 度左右，时间 1 小时，气氛是惰性气体，
              结果颜色变了，等下做 XRD。师弟说升温过程有一点波动……"
            </p>
          </RawCard>

          <RawCard icon={<FileSpreadsheet size={16}/>} title="参数表.xlsx" badge="Excel 表格">
            <pre className="text-[11px] font-mono text-muted-foreground bg-secondary/60 rounded p-2 overflow-x-auto">
{`Temp    Time   Rate    Atm
550     60     5       Ar
560     60     5       Ar
540     60     5       Ar`}
            </pre>
          </RawCard>

          <RawCard icon={<ImageIcon size={16}/>} title="炉腔照片_IMG0721.jpg" badge="实验照片">
            <div className="h-20 rounded-lg bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-xs text-muted-foreground">
              [仪器面板截图：温度显示 550℃]
            </div>
          </RawCard>

          <RawCard icon={<MessageCircle size={16}/>} title="微信群聊片段" badge="即时消息">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>张子萱：样品放进去了</div>
              <div>李文博：管式炉那个对吧 OTF1200X</div>
              <div>张子萱：是的，已经通氩气 15min</div>
              <div>张子萱：40min 时温度抖了一下 ±3℃</div>
            </div>
          </RawCard>
        </div>

        {/* 中：AI 箭头 */}
        <div className="hidden lg:flex flex-col items-center justify-center pt-32 gap-3 px-4">
          <div className="brand-gradient h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Sparkles size={22}/>
          </div>
          <div className="text-xs font-semibold text-primary">AI 自动治理</div>
          <div className="text-[10px] text-muted-foreground text-center max-w-[120px]">多模态抽取 · 术语对齐 · 单位规整</div>
          <ArrowRight size={28} className="text-primary mt-2"/>
        </div>
        <div className="lg:hidden flex items-center justify-center gap-2 text-primary text-sm font-semibold">
          <Sparkles size={16}/> AI 自动治理 <ArrowRight size={16}/>
        </div>

        {/* 右：治理后 */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">AI 治理后 · 实验卡片</div>

          <div className="card-soft p-5 border-primary/30 bg-primary-soft/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Fe-2309 管式炉退火工艺</h3>
              <span className="text-[10px] rounded-md bg-primary text-primary-foreground px-2 py-0.5">结构化</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
              <KV k="样品编号" v="Fe-2309"/>
              <KV k="批次" v="B-20260520"/>
              <KV k="设备" v="管式炉 OTF-1200X"/>
              <KV k="厂家" v="合肥科晶"/>
              <KV k="操作人员" v="张子萱"/>
              <KV k="实验时间" v="2026-05-28 14:30"/>
            </div>
          </div>

          <div className="card-soft p-5">
            <h4 className="text-sm font-semibold">参数列表</h4>
            <table className="mt-2 w-full text-xs">
              <thead className="text-muted-foreground">
                <tr><th className="text-left py-1">参数</th><th className="text-left">值</th><th className="text-left">单位</th></tr>
              </thead>
              <tbody>
                {[["退火温度","550","℃"],["保温时间","60","min"],["升温速率","5","℃/min"],["气氛","Ar","—"]].map(([n,v,u])=>(
                  <tr key={n} className="border-t border-border"><td className="py-1.5">{n}</td><td>{v}</td><td>{u}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-soft p-5">
            <h4 className="text-sm font-semibold">实验步骤（自动编号）</h4>
            <ol className="mt-2 space-y-1 text-xs list-decimal pl-5 text-muted-foreground">
              <li>称取 Fe-2309 样品 0.5g 放入瓷舟</li>
              <li>通入氩气置换炉腔空气 15 min</li>
              <li>以 5 ℃/min 升温至 550 ℃</li>
              <li>保温 60 min</li>
              <li>自然冷却至室温后取出</li>
            </ol>
          </div>

          <div className="card-soft p-5">
            <h4 className="text-sm font-semibold">实验结果 & 异常</h4>
            <p className="mt-2 text-xs text-muted-foreground">样品颜色由灰黑色转为银灰色；第 40 min 出现温度波动 ±3℃。</p>
          </div>

          <div className="card-soft p-5 border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/5">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-[color:var(--color-success)]">
              <CheckCircle2 size={14}/> Checklist 已自动生成
            </h4>
            <ul className="mt-2 text-xs space-y-1 text-muted-foreground">
              <li>✓ 设备校准记录</li>
              <li>✓ 气氛流量确认</li>
              <li>✓ 升降温曲线核对</li>
              <li>✓ 样品批次溯源</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}

function RawCard({ icon, title, badge, children }: { icon: React.ReactNode; title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="card-soft p-4 border-dashed">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-sm font-medium"><span className="text-muted-foreground">{icon}</span>{title}</div>
        <span className="text-[10px] rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">{badge}</span>
      </div>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </>
  );
}
