/**
 * Proxy-aware fetch — server only (.server.ts)
 *
 * Node.js built-in fetch() (undici) doesn't respect system HTTP_PROXY settings.
 * This module provides a fetch wrapper that routes through a proxy when configured.
 *
 * Set HTTP_PROXY or HTTPS_PROXY environment variable to enable.
 * Example: HTTP_PROXY=http://127.0.0.1:7897
 */

import { getServerConfig } from "./config.server";

/** Cached proxied fetch instance */
let _proxiedFetch: typeof fetch | null = null;

export function getProxiedFetch(): typeof fetch {
  if (_proxiedFetch) return _proxiedFetch;

  const config = getServerConfig();
  const proxyUrl = config.httpProxy;

  if (!proxyUrl) {
    _proxiedFetch = fetch;
    return _proxiedFetch;
  }

  try {
    // Use undici ProxyAgent (built into Node.js 18+)
    // Dynamic import to avoid bundling issues
    const { ProxyAgent } = require("undici") as typeof import("undici");
    const dispatcher = new ProxyAgent({ uri: proxyUrl });

    _proxiedFetch = (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      return fetch(url, { ...init, dispatcher } as RequestInit & { dispatcher: typeof dispatcher });
    };

    console.log(`[ProxyFetch] Using proxy: ${proxyUrl}`);
  } catch {
    console.warn(`[ProxyFetch] undici ProxyAgent not available, falling back to direct connection`);
    _proxiedFetch = fetch;
  }

  return _proxiedFetch;
}

/**
 * Reset cached proxy fetch (for testing or config changes)
 */
export function resetProxyFetch(): void {
  _proxiedFetch = null;
}
