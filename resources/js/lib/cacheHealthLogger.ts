/**
 * Tiny structured logger for the cache-health flow.
 *
 * Emits JSON lines to console.* so downstream collectors (Datadog, Logtail,
 * Grafana Loki, CloudWatch, …) can parse them without extra config. Each log
 * carries a stable correlation_id so a retry chain can be reconstructed
 * across attempts.
 */
export type CacheHealthEvent =
  | "request_start"
  | "request_success"
  | "request_error"
  | "request_timeout"
  | "retry_scheduled"
  | "retry_fire"
  | "audit_write_start"
  | "audit_write_done";

export interface CacheHealthLog {
  ts: string;
  event: CacheHealthEvent;
  correlation_id: string;
  /** W3C OpenTelemetry trace id (32 hex chars) — present when tracing active. */
  trace_id?: string;
  /** W3C OpenTelemetry span id (16 hex chars) — scoped to the current attempt. */
  span_id?: string;
  attempt: number;
  user_id: string | null;
  duration_ms?: number;
  status?: number | "timeout" | "error" | "schema";
  backoff_ms?: number;
  source: "frontend";
}

export function newCorrelationId(): string {
  // Stable across retries within a single popover open lifecycle.
  return `ch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function logCacheHealth(entry: Omit<CacheHealthLog, "ts" | "source">) {
  const line: CacheHealthLog = {
    ts: new Date().toISOString(),
    source: "frontend",
    ...entry,
  };
  // Errors and timeouts on console.warn so they surface in dev tools and
  // production log shippers; everything else as info.
  const isError = line.event === "request_error" || line.event === "request_timeout";
  // eslint-disable-next-line no-console
  (isError ? console.warn : console.info)("[cache-health]", JSON.stringify(line));
  return line;
}
