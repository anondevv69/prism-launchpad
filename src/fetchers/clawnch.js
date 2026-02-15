/**
 * Clawnch API — https://clawn.ch (agent-only token launches via Clanker on Base)
 * Public: GET https://clawn.ch/api/tokens, GET https://clawn.ch/api/launches
 * New tokens, new agents emerging from Moltbook, 4claw, Moltx.
 */

const CLAWNCH_BASE = 'https://clawn.ch/api';
const FETCH_TIMEOUT_MS = parseInt(process.env.CLAWNCH_FETCH_TIMEOUT_MS || '15000', 10) || 15000;
const USER_AGENT = 'Mozilla/5.0 (compatible; PrismAlpha/1.0; +https://github.com/anondevv69/PrismAlpha)';
const TOKENS_LIMIT = Math.min(parseInt(process.env.CLAWNCH_TOKENS_LIMIT || '80', 10) || 80, 150);
const LAUNCHES_LIMIT = Math.min(parseInt(process.env.CLAWNCH_LAUNCHES_LIMIT || '50', 10) || 50, 100);

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * GET /api/tokens — all agent-launched tokens (symbol, address, agent, source, launchedAt, etc.)
 */
async function fetchTokens() {
  try {
    const url = `${CLAWNCH_BASE}/tokens`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { tokens: [], debug: { status: res.status, tokens_count: 0 } };
    const data = await safeJson(res);
    const raw = data?.tokens ?? (Array.isArray(data) ? data : []);
    const tokens = (Array.isArray(raw) ? raw : []).slice(0, TOKENS_LIMIT).map((t) => ({
      symbol: t.symbol ?? null,
      address: t.address ?? null,
      name: t.name ?? null,
      agent: t.agent ?? null,
      source: t.source ?? null,
      launchedAt: t.launchedAt ?? null,
      description: (t.description ?? '').slice(0, 300),
      postId: t.postId ?? null,
      source_url: t.source_url ?? null,
      clanker_url: t.clanker_url ?? null,
      explorer_url: t.explorer_url ?? null,
    }));
    return { tokens, count: data?.count ?? tokens.length, debug: { count: tokens.length } };
  } catch (e) {
    const msg = e?.message ?? (e?.name === 'AbortError' ? 'timeout' : 'fetch failed');
    console.warn('Clawnch tokens error:', msg);
    return { tokens: [], debug: { error: msg, tokens_count: 0 } };
  }
}

/**
 * GET /api/launches — recent launches (newest first)
 */
async function fetchLaunches() {
  try {
    const url = `${CLAWNCH_BASE}/launches`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { launches: [], debug: { status: res.status, launches_count: 0 } };
    const data = await safeJson(res);
    const raw = data?.launches ?? (Array.isArray(data) ? data : []);
    const launches = (Array.isArray(raw) ? raw : []).slice(0, LAUNCHES_LIMIT).map((l) => ({
      symbol: l.symbol ?? null,
      name: l.name ?? null,
      contractAddress: l.contractAddress ?? l.address ?? null,
      agentName: l.agentName ?? l.agent ?? null,
      source: l.source ?? null,
      launchedAt: l.launchedAt ?? l.createdAt ?? null,
      postId: l.postId ?? null,
      clankerUrl: l.clankerUrl ?? l.clanker_url ?? null,
      chainId: l.chainId ?? null,
    }));
    return { launches, debug: { count: launches.length } };
  } catch (e) {
    const msg = e?.message ?? (e?.name === 'AbortError' ? 'timeout' : 'fetch failed');
    console.warn('Clawnch launches error:', msg);
    return { launches: [], debug: { error: msg, launches_count: 0 } };
  }
}

/**
 * Fetch Clawnch tokens + recent launches (agent alpha — new tokens, new agents).
 * No API key required.
 */
export async function fetchClawnch() {
  const [tokensRes, launchesRes] = await Promise.all([fetchTokens(), fetchLaunches()]);
  const tokens = tokensRes.tokens ?? [];
  const launches = launchesRes.launches ?? [];
  const debug = {
    tokens_count: tokens.length,
    launches_count: launches.length,
    ...tokensRes.debug,
    ...launchesRes.debug,
  };
  return { tokens, launches, debug };
}
