/**
 * RAG 缓存层 — embedding 缓存 + LLM 响应 LRU 缓存
 *
 * Embedding 缓存: 基于实验内容哈希，跳过未变化的 re-embedding
 * LLM 缓存: 相同 question + contextHash → 缓存答案（LRU 最多 100 条）
 */

// ═══════════════════════════════════════════════════════
// 简单哈希 (FNV-1a, 浏览器兼容)
// ═══════════════════════════════════════════════════════

function fnv1a(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16);
}

export function contentHash(text: string): string {
  return fnv1a(text);
}

// ═══════════════════════════════════════════════════════
// Embedding 缓存 (内存 + localStorage 可选)
// ═══════════════════════════════════════════════════════

type EmbeddingEntry = {
  hash: string;
  embedding: number[];
  timestamp: number;
};

const embeddingCache = new Map<string, EmbeddingEntry>();
const MAX_EMBEDDING_CACHE = 500;

export function getCachedEmbedding(expId: string, currentHash: string): number[] | null {
  const entry = embeddingCache.get(expId);
  if (entry && entry.hash === currentHash) {
    return entry.embedding;
  }
  return null;
}

export function setCachedEmbedding(expId: string, hash: string, embedding: number[]): void {
  // LRU eviction
  if (embeddingCache.size >= MAX_EMBEDDING_CACHE) {
    const first = embeddingCache.keys().next().value;
    if (first) embeddingCache.delete(first);
  }
  embeddingCache.set(expId, { hash, embedding, timestamp: Date.now() });
}

// ═══════════════════════════════════════════════════════
// LLM 响应 LRU 缓存
// ═══════════════════════════════════════════════════════

type LLMCacheEntry = {
  answer: string;
  sources: Array<{
    doc: string;
    page: string;
    confidence: string;
    link: string;
    chunkType?: string;
    snippet?: string;
  }>;
  timestamp: number;
};

const llmCache = new Map<string, LLMCacheEntry>();
const MAX_LLM_CACHE = 100;
const LLM_CACHE_TTL = 30 * 60 * 1000; // 30 分钟

function makeLLMCacheKey(question: string, contextHash: string): string {
  return fnv1a(`${question}::${contextHash}`);
}

export function getCachedAnswer(
  question: string,
  contextHash: string,
): { answer: string; sources: LLMCacheEntry["sources"] } | null {
  const key = makeLLMCacheKey(question, contextHash);
  const entry = llmCache.get(key);
  if (!entry) return null;
  // TTL 过期
  if (Date.now() - entry.timestamp > LLM_CACHE_TTL) {
    llmCache.delete(key);
    return null;
  }
  // LRU refresh: 移到末尾
  llmCache.delete(key);
  llmCache.set(key, entry);
  return { answer: entry.answer, sources: entry.sources };
}

export function setCachedAnswer(
  question: string,
  contextHash: string,
  answer: string,
  sources: LLMCacheEntry["sources"],
): void {
  const key = makeLLMCacheKey(question, contextHash);
  if (llmCache.size >= MAX_LLM_CACHE) {
    const first = llmCache.keys().next().value;
    if (first) llmCache.delete(first);
  }
  llmCache.set(key, { answer, sources, timestamp: Date.now() });
}

// ═══════════════════════════════════════════════════════
// 调试/管理
// ═══════════════════════════════════════════════════════

export function getCacheStats(): {
  embeddingCacheSize: number;
  llmCacheSize: number;
} {
  return {
    embeddingCacheSize: embeddingCache.size,
    llmCacheSize: llmCache.size,
  };
}

export function clearCaches(): void {
  embeddingCache.clear();
  llmCache.clear();
}
