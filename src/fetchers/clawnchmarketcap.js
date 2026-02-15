/**
 * ClawnchMarketCap — https://clawnchmarketcap.com
 * BASE token list (new/deployed agent tokens). No promotion tiers or promoted-only filter.
 * We only care: contractAddress, mc, postUrl, isPlatformToken, description, agentName (+ symbol, name, launchedAt).
 */

const BASE_URL = 'https://clawnchmarketcap.com/api';
const FETCH_TIMEOUT_MS = parseInt(process.env.CLAWNCHMARKETCAP_FETCH_TIMEOUT_MS || '10000', 10) || 10000;
const TOKENS_LIMIT = Math.min(parseInt(process.env.CLAWNCHMARKETCAP_TOKENS_LIMIT || '150', 10) || 150, 300);

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * GET /api/tokens — all tokens; return slim list: contractAddress, mc, postUrl, isPlatformToken, description, agentName, symbol, name, launchedAt.
 */
export async function fetchClawnchMarketCap() {
  try {
    const res = await fetch(`${BASE_URL}/tokens`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { tokens: [], debug: { status: res.status } };
    const raw = await safeJson(res);
    const list = Array.isArray(raw) ? raw : [];
    const tokens = list.slice(0, TOKENS_LIMIT).map((t) => ({
      contractAddress: t.contractAddress ?? null,
      mc: t.marketCap != null ? Number(t.marketCap) : null,
      postUrl: t.postUrl ?? null,
      isPlatformToken: !!t.isPlatformToken,
      description: (t.description ?? '').slice(0, 500),
      agentName: t.agentName ?? null,
      symbol: t.symbol ?? null,
      name: t.name ?? null,
      launchedAt: t.launchedAt ?? null,
    }));
    return {
      tokens,
      debug: { count: tokens.length },
    };
  } catch (e) {
    console.warn('ClawnchMarketCap fetch error:', e?.message ?? e);
    return { tokens: [], debug: { error: e?.message ?? 'fetch failed' } };
  }
}
