import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { MCP_TOOLS, callMcpTool } from "./lib/mcp-tools";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const MCP_PROTOCOL_VERSION = "2025-03-26";
const MCP_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-session-id",
};
const AI_MCP_TOOL = "parse_experiment_content";
const AI_REQUEST_LIMIT = 5;
const AI_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const aiRequestsByClient = new Map<string, number[]>();

function canUseAiTool(request: Request): boolean {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const now = Date.now();
  const requests = (aiRequestsByClient.get(client) ?? []).filter((time) => now - time < AI_REQUEST_WINDOW_MS);
  if (requests.length >= AI_REQUEST_LIMIT) {
    aiRequestsByClient.set(client, requests);
    return false;
  }
  requests.push(now);
  aiRequestsByClient.set(client, requests);
  return true;
}

function mcpResponse(id: JsonRpcRequest["id"], result: unknown, status = 200): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result }), { status, headers: MCP_HEADERS });
}

function mcpError(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } }), { status: 200, headers: MCP_HEADERS });
}

async function handleMcp(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: MCP_HEADERS });
  if (request.method === "GET") {
    return new Response(JSON.stringify({
      name: "LabNote Agent MCP",
      status: "ready",
      protocol: "Streamable HTTP / JSON-RPC 2.0",
      endpoint: "/mcp",
      usage: "Send POST requests with Content-Type: application/json. Browser GET is a health check only.",
    }), { status: 200, headers: MCP_HEADERS });
  }
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: MCP_HEADERS });

  let rpc: JsonRpcRequest;
  try {
    rpc = await request.json() as JsonRpcRequest;
  } catch {
    return mcpError(null, -32700, "Parse error");
  }

  if (rpc.jsonrpc !== "2.0" || !rpc.method) return mcpError(rpc.id, -32600, "Invalid Request");
  if (rpc.method === "initialize") {
    return mcpResponse(rpc.id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "LabNote Agent MCP", version: "1.0.0" },
      instructions: "LabNote MCP exposes the same template, dynamic ExperimentDoc, validation, RAG chunking, and graph analysis domain capabilities as the LabNote web application. Tool calls create drafts or analysis only and never persist or delete user data.",
    });
  }
  if (rpc.method === "notifications/initialized") return new Response(null, { status: 202, headers: MCP_HEADERS });
  if (rpc.method === "tools/list") return mcpResponse(rpc.id, { tools: MCP_TOOLS });
  if (rpc.method === "tools/call") {
    const name = rpc.params?.name;
    if (typeof name !== "string") return mcpError(rpc.id, -32602, "tools/call requires params.name");
    if (name === AI_MCP_TOOL && !canUseAiTool(request)) {
      return mcpResponse(rpc.id, { content: [{ type: "text", text: "AI parsing rate limit reached. Retry after one hour." }], isError: true });
    }
    try {
      const result = await callMcpTool(name, rpc.params?.arguments);
      return mcpResponse(rpc.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool execution failed";
      return mcpResponse(rpc.id, { content: [{ type: "text", text: message }], isError: true });
    }
  }
  return mcpError(rpc.id, -32601, `Method not found: ${rpc.method}`);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    if (new URL(request.url).pathname === "/mcp") return handleMcp(request);

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
