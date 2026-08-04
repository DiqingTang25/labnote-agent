/**
 * AI Agent 控制台：MCP 服务器配置、Agent 状态面板、工具注册表
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Server, Wifi, WifiOff, Power, CheckCircle2, Cpu, Zap, Database, FileText, Brain, Download, Search, BookOpen } from "lucide-react";

export const Route = createFileRoute("/agent")({
  head: () => ({
    meta: [
      { title: "AI Agent 控制台 – LabNote Agent" },
      { name: "description", content: "AI Agent 控制台：MCP 服务器配置、运行状态监控、工具注册表管理。" },
    ],
  }),
  component: AgentConsole,
});

const mcpServers = [
  { name: "LabNote Data Server", status: "connected", version: "v1.2", tools: 12 },
  { name: "Experiment Search", status: "connected", version: "v1.0", tools: 5 },
  { name: "Device Gateway", status: "disconnected", version: "v0.9", tools: 0 },
];

const toolRegistry = [
  { id: "search_experiments", name: "搜索历史实验数据", icon: <Search size={16} /> },
  { id: "create_card", name: "创建结构化实验卡片", icon: <FileText size={16} /> },
  { id: "analyze_data", name: "多模态数据分析", icon: <Brain size={16} /> },
  { id: "generate_report", name: "生成实验报告", icon: <FileText size={16} /> },
  { id: "export_protocol", name: "导出复现协议", icon: <Download size={16} /> },
  { id: "query_knowledge_base", name: "检索领域知识库", icon: <BookOpen size={16} /> },
];

function AgentConsole() {
  const [servers, setServers] = useState(mcpServers);

  const toggleServer = (index: number) => {
    const newServers = [...servers];
    newServers[index] = {
      ...newServers[index],
      status: newServers[index].status === "connected" ? "disconnected" : "connected",
    };
    setServers(newServers);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
          <Cpu size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Agent 控制台</h1>
          <p className="text-sm text-muted-foreground">管理 MCP 服务器连接与 Agent 运行状态</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="card-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Server size={18} className="text-primary" />
                MCP 服务器配置
              </h2>
              <span className="text-xs text-muted-foreground">3 台服务器</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">服务器名称</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">版本</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">工具数</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {servers.map((server, index) => (
                    <tr key={index} className="border-b border-border last:border-0 hover:bg-secondary/50 transition">
                      <td className="py-4 px-4">
                        <div className="font-medium">{server.name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${server.status === "connected" ? "bg-[color:var(--color-success)]" : "bg-muted-foreground/40"}`} />
                          <span className={server.status === "connected" ? "text-[color:var(--color-success)]" : "text-muted-foreground"}>
                            {server.status === "connected" ? "已连接" : "未连接"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">{server.version}</td>
                      <td className="py-4 px-4">
                        {server.tools > 0 ? `${server.tools} 个工具` : "-"}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => toggleServer(index)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            server.status === "connected"
                              ? "border border-destructive/30 text-destructive hover:bg-destructive/10"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          {server.status === "connected" ? (
                            <span className="flex items-center gap-1">
                              <WifiOff size={12} /> 断开
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Wifi size={12} /> 连接
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card-soft p-6 mt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Database size={18} className="text-primary" />
              工具注册表
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {toolRegistry.map((tool) => (
                <div key={tool.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    {tool.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{tool.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{tool.id}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div>
          <section className="card-soft p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Power size={18} className="text-primary" />
              Agent 状态面板
            </h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">运行状态</div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[color:var(--color-success)] animate-pulse" />
                    <span className="font-medium text-[color:var(--color-success)]">空闲</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">上次活跃</div>
                  <div className="text-sm font-medium">2 分钟前</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">今日任务</div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[color:var(--color-success)]" />
                      <span className="font-medium">3 个已完成</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">共 5 个任务</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full w-[60%] rounded-full bg-[color:var(--color-success)]" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Token 用量</div>
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" />
                      <span className="font-medium">12,840 / 50,000</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">25.7%</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full w-[25.7%] rounded-full bg-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-primary-soft/50 text-center">
                  <div className="text-xl font-bold text-primary">12</div>
                  <div className="text-xs text-muted-foreground">已加载工具</div>
                </div>
                <div className="p-3 rounded-xl bg-[color:var(--color-success)]/10 text-center">
                  <div className="text-xl font-bold text-[color:var(--color-success)]">0</div>
                  <div className="text-xs text-muted-foreground">排队任务</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}