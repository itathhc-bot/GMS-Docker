import type { ExportColumns } from "./partsExport";

export interface PreviewCacheEntry {
  rows: Array<Record<string, string | number>>;
  at: number;
}

const DEFAULT_TTL_MS = 60_000; // 1 minute
const cache = new Map<string, PreviewCacheEntry>();

interface CacheConfig {
  enabled: boolean;
  ttlMs: number;
}

let config: CacheConfig = { enabled: true, ttlMs: DEFAULT_TTL_MS };

/**
 * Update runtime cache config from app_settings + per-user override.
 * Pass `null` for either field to fall back to admin default / built-in default.
 */
export function configurePreviewCache(input: {
  adminEnabled?: boolean | null;
  adminTtlSeconds?: number | null;
  userEnabled?: boolean | null;
  userTtlSeconds?: number | null;
}): void {
  const enabled =
    input.userEnabled !== null && input.userEnabled !== undefined
      ? input.userEnabled
      : input.adminEnabled !== null && input.adminEnabled !== undefined
        ? input.adminEnabled
        : true;
  const ttlSec =
    input.userTtlSeconds !== null && input.userTtlSeconds !== undefined
      ? input.userTtlSeconds
      : input.adminTtlSeconds !== null && input.adminTtlSeconds !== undefined
        ? input.adminTtlSeconds
        : 60;
  config = { enabled, ttlMs: Math.max(0, ttlSec) * 1000 };
  if (!enabled) cache.clear();
}

export function getPreviewCacheConfig(): CacheConfig {
  return { ...config };
}

export function previewCacheKey(input: {
  columns: ExportColumns;
  locationFilter: string;
  lng: string;
}): string {
  const { columns, locationFilter, lng } = input;
  return [
    lng,
    locationFilter || "__all__",
    columns.location ? "L1" : "L0",
    columns.status ? "S1" : "S0",
    columns.sku ? "K1" : "K0",
  ].join("|");
}

export function getCachedPreview(key: string): PreviewCacheEntry | null {
  if (!config.enabled || config.ttlMs === 0) return null;
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.at > config.ttlMs) {
    cache.delete(key);
    return null;
  }
  return v;
}

export function setCachedPreview(
  key: string,
  rows: Array<Record<string, string | number>>,
): void {
  if (!config.enabled) return;
  cache.set(key, { rows, at: Date.now() });
}

export function clearPreviewCache(): void {
  cache.clear();
}

/** Run an async fn with retries + exponential backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 300;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, base * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}
