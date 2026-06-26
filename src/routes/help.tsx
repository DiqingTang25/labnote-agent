/**
 * 帮助文档 / 关于：技术架构介绍
 */
import { createFileRoute } from "@tanstack/react-router";
import { Brain, FileSearch, Layers, MessageSquare, GitBranch, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "帮助文档 – LabNote Agent" },
      { name: "description", content: "了解 LabNote Agent 的技术架构与使用方法。" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">帮助文档</h1>
      <p className="mt-2 text-muted-foreground">LabNote Agent 是面向高校实验室与科研课题组的智能数据治理助手。</p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">技术架构</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ArchCard icon={<FileSearch size={18}/>} title="多模态解析" desc="PDF / DOCX / Excel / 图像 / 仪器日志 / 语音 ASR 联合解析"/>
          <ArchCard icon={<Brain size={18}/>} title="大模型信息抽取" desc="LLM 抽取实验关键字段并归一化术语与单位"/>
          <ArchCard icon={<Layers size={18}/>} title="智能清洗与标注" desc="自动识别缺失字段、异常值并提示人工复核"/>
          <ArchCard icon={<ShieldCheck size={18}/>} title="完整性检查" desc="按学科模板验证实验记录是否可复现"/>
          <ArchCard icon={<MessageSquare size={18}/>} title="RAG 问答" desc="基于实验向量库的自然语言追溯与对比"/>
          <ArchCard icon={<GitBranch size={18}/>} title="知识图谱" desc="实验-样品-设备-参数-结果的关联可视化"/>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">快速上手</h2>
        <ol className="mt-4 space-y-2 text-sm list-decimal pl-5 text-muted-foreground">
          <li>进入「实验工作台」，从左栏上传文件或使用语音录入模拟。</li>
          <li>在中栏对自动生成的实验卡片进行复核、补全。</li>
          <li>在右栏查看完整性检查结果，生成复现清单与 Methods 草稿。</li>
          <li>需要追溯历史实验时，使用 RAG 知识问答快速检索。</li>
          <li>在「知识图谱」查看实验间的关联关系。</li>
        </ol>
      </section>

      <section className="mt-10 card-soft p-6 bg-primary-soft/40 border-primary/20">
        <h3 className="font-semibold">关于 LabNote Agent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          LabNote Agent 聚焦真实科研业务场景中的数据治理与实验复现痛点。技术生态层面，可结合
          思必驰（AISpeech）智能语音终端，实现实验现场的自然语言记录与免手操作。
        </p>
      </section>
    </div>
  );
}

function ArchCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
