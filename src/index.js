/**
 * Prism Launchpad: Clawnch + ClawnchMarketCap + optional BaseScan.
 * GET /latest → fresh data; ?fresh=1 bypasses cache.
 * FIRST_TIME_AGENTS_ONLY: only show agents who have deployed exactly once (default true).
 * Insight: agent_launch_count, is_first_launch, launchpad_insight summary.
 */
import http from 'node:http';
import { fetchClawnch } from './fetchers/clawnch.js';
import { fetchClawnchMarketCap } from './fetchers/clawnchmarketcap.js';
import { fetchContractVerified } from './fetchers/basescan.js';

const PORT = Number(process.env.PORT) || 3003;
const NEW_AGENT_LAUNCHES_MAX = parseInt(process.env.NEW_AGENT_LAUNCHES_MAX || '80', 10) || 80;
const BASESCAN_BATCH = Math.min(parseInt(process.env.BASESCAN_BATCH || '10', 10) || 10, 20);
const CACHE_MS = Math.min(parseInt(process.env.LAUNCHPAD_CACHE_MS || '30000', 10) || 30000, 120_000); // default 30s so requests get fresher data
const FIRST_TIME_AGENTS_ONLY = process.env.FIRST_TIME_AGENTS_ONLY !== 'false'; // default true: only agents who deployed once

function agentKey(x) {
  const n = (x.agentName ?? x.agent ?? '').toString().trim();
  return n || null;
}

async function run() {
  const basescanKey = process.env.BASESCAN_API_KEY;

  const [clawnch, clawnchmarketcap] = await Promise.all([
    fetchClawnch().catch(() => ({ tokens: [], launches: [], debug: {} })),
    fetchClawnchMarketCap().catch(() => ({ tokens: [], debug: {} })),
  ]);

  const clawnchLaunchesNorm = (clawnch.launches ?? []).map((l) => ({
    source: 'clawnch',
    platform: 'base',
    symbol: l.symbol ?? null,
    name: l.name ?? null,
    agentName: l.agentName ?? null,
    contractAddress: l.contractAddress ?? null,
    launchedAt: l.launchedAt ?? null,
    postUrl: l.clankerUrl ?? null,
  }));
  const clawnchTokensNorm = (clawnch.tokens ?? []).map((t) => ({
    source: 'clawnch',
    platform: 'base',
    symbol: t.symbol ?? null,
    name: t.name ?? null,
    agentName: t.agent ?? null,
    contractAddress: t.address ?? null,
    launchedAt: t.launchedAt ?? null,
    postUrl: t.source_url ?? t.clanker_url ?? null,
  }));
  const clawnchmarketcapNorm = (clawnchmarketcap.tokens ?? []).map((t) => ({
    source: 'clawnchmarketcap',
    platform: 'base',
    symbol: t.symbol ?? null,
    name: t.name ?? null,
    agentName: t.agentName ?? null,
    contractAddress: t.contractAddress ?? null,
    launchedAt: t.launchedAt ?? null,
    postUrl: t.postUrl ?? null,
    mc: t.mc ?? null,
  }));

  const all = [...clawnchLaunchesNorm, ...clawnchTokensNorm, ...clawnchmarketcapNorm].filter(
    (x) => x.symbol && (x.launchedAt || x.contractAddress)
  );
  const agentLaunchCount = {};
  for (const x of all) {
    const k = agentKey(x);
    if (k != null) agentLaunchCount[k] = (agentLaunchCount[k] || 0) + 1;
  }

  let new_agent_launches = all
    .sort((a, b) => {
      const ta = a.launchedAt ? new Date(a.launchedAt).getTime() : 0;
      const tb = b.launchedAt ? new Date(b.launchedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, NEW_AGENT_LAUNCHES_MAX * 2);

  // Add insight per launch: agent_launch_count, is_first_launch
  new_agent_launches = new_agent_launches.map((x) => {
    const k = agentKey(x);
    const count = k != null ? agentLaunchCount[k] || 0 : 0;
    return {
      ...x,
      agent_launch_count: count,
      is_first_launch: count === 1,
    };
  });

  if (FIRST_TIME_AGENTS_ONLY) {
    new_agent_launches = new_agent_launches.filter((x) => x.is_first_launch).slice(0, NEW_AGENT_LAUNCHES_MAX);
  } else {
    new_agent_launches = new_agent_launches.slice(0, NEW_AGENT_LAUNCHES_MAX);
  }

  const firstTimeSet = new Set(Object.keys(agentLaunchCount).filter((k) => agentLaunchCount[k] === 1));
  const launchpad_insight = {
    total_agents: Object.keys(agentLaunchCount).length,
    first_time_agents_count: firstTimeSet.size,
    repeat_agents_count: Object.keys(agentLaunchCount).length - firstTimeSet.size,
    first_time_agents_only: FIRST_TIME_AGENTS_ONLY,
    new_agent_launches_count: new_agent_launches.length,
  };

  const payload = {
    timestamp: new Date().toISOString(),
    service: 'prism-launchpad',
    clawnch_tokens: clawnch.tokens ?? [],
    clawnch_launches: clawnch.launches ?? [],
    clawnchmarketcap_tokens: clawnchmarketcap.tokens ?? [],
    new_agent_launches,
    launchpad_insight,
  };

  if (basescanKey && new_agent_launches.length > 0) {
    const addrs = [...new Set(new_agent_launches.map((x) => x.contractAddress).filter(Boolean))].slice(0, BASESCAN_BATCH);
    const verified = {};
    await Promise.all(
      addrs.map(async (addr) => {
        const r = await fetchContractVerified(basescanKey, addr).catch(() => ({ verified: false }));
        verified[addr.toLowerCase()] = r.verified;
      })
    );
    payload.contract_verified = verified;
  }

  return payload;
}

let cached = null;
let cacheTs = 0;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'prism-launchpad', endpoint: '/latest', query: '?fresh=1 to bypass cache' }));
    return;
  }
  if (path === '/latest' && req.method === 'GET') {
    const fresh = url.searchParams.get('fresh') === '1' || url.searchParams.get('nocache') === '1';
    const now = Date.now();
    if (!fresh && cached && now - cacheTs < CACHE_MS) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cached));
      return;
    }
    try {
      cached = await run();
      cacheTs = Date.now();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cached));
    } catch (e) {
      console.error(e);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'run_failed', message: e?.message }));
    }
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(PORT, () => console.log('prism-launchpad listening on', PORT));
