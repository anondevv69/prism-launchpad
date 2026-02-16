# prism-launchpad

Clawnch + ClawnchMarketCap + BaseScan. Exposes `GET /latest` for the PrismAlpha gateway.

## Fresh data

- Cache is **30s** by default so repeated requests get newer data. Override with `LAUNCHPAD_CACHE_MS` (max 120s).
- **Bypass cache:** `GET /latest?fresh=1` or `?nocache=1` always fetches from Clawnch/ClawnchMarketCap so you don’t get the same payload as last time.

## First-time agents only

- **`FIRST_TIME_AGENTS_ONLY`** — default **true**: only agents who have deployed **exactly one** token appear in `new_agent_launches`. Set to `false` to include repeat deployers.
- Each launch includes **`agent_launch_count`** and **`is_first_launch`** for insight.
- Response includes **`launchpad_insight`**: `total_agents`, `first_time_agents_count`, `repeat_agents_count`, `new_agent_launches_count`.

## Env

- `BASESCAN_API_KEY` — optional; for contract_verified map (first N addresses)
- `BASESCAN_BATCH` — max addresses to check (default 10)
- `NEW_AGENT_LAUNCHES_MAX` — cap for new_agent_launches (default 80)
- `LAUNCHPAD_CACHE_MS` — cache TTL in ms (default 30000, max 120000)
- `FIRST_TIME_AGENTS_ONLY` — `true` (default) = only first-time deployers; `false` = all
- `PORT` — default 3003

## Gateway

Set `LAUNCHPAD_URL=https://your-app.up.railway.app` (base URL, no `/latest`) in the PrismAlpha gateway. Use `?fresh=1` when calling if you want no cache.
