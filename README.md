# prism-launchpad

Clawnch + ClawnchMarketCap + BaseScan. Exposes `GET /latest` for the PrismAlpha gateway.

## Env

- `BASESCAN_API_KEY` — optional; for contract_verified map (first N addresses, see BASESCAN_BATCH)
- `BASESCAN_BATCH` — max addresses to check (default 10)
- `NEW_AGENT_LAUNCHES_MAX` — cap for new_agent_launches (default 80)
- `PORT` — default 3003

## Gateway

Set `LAUNCHPAD_URL=https://your-app.up.railway.app` in the PrismAlpha gateway. Gateway will apply MC/age filter and merge with Zapper/Farcaster and Molt/Claw payloads.
