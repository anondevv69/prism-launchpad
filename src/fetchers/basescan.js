/**
 * BaseScan API — contract verification (Step 3).
 * GET ?module=contract&action=getabi&address=0x... — verified if ABI returned.
 * Docs: https://docs.basescan.org/api-endpoints/contracts
 */

const BASESCAN_API = 'https://api.basescan.org/api';
const FETCH_TIMEOUT_MS = parseInt(process.env.BASESCAN_FETCH_TIMEOUT_MS || '8000', 10) || 8000;

/**
 * Check if contract at address is verified on BaseScan.
 * Returns { verified: boolean } or { verified: false } on error/rate limit.
 */
export async function fetchContractVerified(apiKey, address) {
  if (!address || typeof address !== 'string') return { verified: false };
  const addr = String(address).trim().toLowerCase();
  if (!addr.startsWith('0x') || addr.length < 40) return { verified: false };
  if (!apiKey) return { verified: false };
  try {
    const url = `${BASESCAN_API}?module=contract&action=getabi&address=${encodeURIComponent(addr)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await res.json();
    const result = data?.result;
    const verified = result != null && result !== '' && result !== 'Contract source code not verified';
    return { verified: !!verified };
  } catch (e) {
    return { verified: false };
  }
}
