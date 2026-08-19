import { z } from "zod";

/**
 * Runtime schema for the `parts-cache-stats` GET response.
 * Used to guard the cache-health UI from malformed / missing fields.
 */
export const cacheStatsSchema = z.object({
  hits: z.number().int().min(0),
  misses: z.number().int().min(0),
  total: z.number().int().min(0),
  hit_rate: z.number().min(0).max(1),
});

export type CacheStats = z.infer<typeof cacheStatsSchema>;

/** Returns a valid CacheStats or null when the payload is invalid. */
export function parseCacheStats(value: unknown): CacheStats | null {
  const result = cacheStatsSchema.safeParse(value);
  return result.success ? result.data : null;
}
