/**
 * In-memory Prometheus-compatible metrics for the cache-health flow.
 *
 * The values are exposed via two paths:
 *   1. `getPrometheusExposition()` — a string in the standard
 *      text-based exposition format that a scrape endpoint can return.
 *   2. `shipMetrics()` — POSTs the same payload to a configured OTLP/Loki
 *      shipper (`VITE_METRICS_ENDPOINT`) for environments without a
 *      scrapeable endpoint (e.g. browsers).
 *
 * Counters: cache_health_retry_attempts_total{outcome=…},
 *           cache_health_timeout_aborts_total
 * Histogram: cache_health_audit_write_latency_ms (simple bucketed)
 */

type RetryOutcome = "success" | "error" | "timeout" | "schema" | "401" | "500";

const retryAttempts: Record<RetryOutcome, number> = {
  success: 0, error: 0, timeout: 0, schema: 0, "401": 0, "500": 0,
};
let timeoutAborts = 0;
const auditLatencyBuckets = [5, 25, 100, 500, 1000, 5000];
const auditLatencyCounts = new Array(auditLatencyBuckets.length + 1).fill(0);
let auditLatencySum = 0;
let auditLatencyCount = 0;

export function recordRetryAttempt(outcome: RetryOutcome) {
  retryAttempts[outcome] = (retryAttempts[outcome] ?? 0) + 1;
}

export function recordTimeoutAbort() {
  timeoutAborts += 1;
}

export function recordAuditLatency(ms: number) {
  auditLatencySum += ms;
  auditLatencyCount += 1;
  let placed = false;
  for (let i = 0; i < auditLatencyBuckets.length; i++) {
    if (ms <= auditLatencyBuckets[i]) {
      auditLatencyCounts[i] += 1;
      placed = true;
      break;
    }
  }
  if (!placed) auditLatencyCounts[auditLatencyCounts.length - 1] += 1;
}

export function resetMetrics() {
  (Object.keys(retryAttempts) as RetryOutcome[]).forEach((k) => (retryAttempts[k] = 0));
  timeoutAborts = 0;
  auditLatencyCounts.fill(0);
  auditLatencySum = 0;
  auditLatencyCount = 0;
}

export function snapshotMetrics() {
  return {
    retryAttempts: { ...retryAttempts },
    timeoutAborts,
    auditLatency: {
      buckets: [...auditLatencyBuckets],
      counts: [...auditLatencyCounts],
      sum: auditLatencySum,
      count: auditLatencyCount,
    },
  };
}

export function getPrometheusExposition(): string {
  const lines: string[] = [];
  lines.push("# HELP cache_health_retry_attempts_total Cache-health retry attempts by outcome.");
  lines.push("# TYPE cache_health_retry_attempts_total counter");
  for (const [outcome, value] of Object.entries(retryAttempts)) {
    lines.push(`cache_health_retry_attempts_total{outcome="${outcome}"} ${value}`);
  }
  lines.push("# HELP cache_health_timeout_aborts_total Cache-health requests aborted by client timeout.");
  lines.push("# TYPE cache_health_timeout_aborts_total counter");
  lines.push(`cache_health_timeout_aborts_total ${timeoutAborts}`);

  lines.push("# HELP cache_health_audit_write_latency_ms Audit-log write latency in milliseconds.");
  lines.push("# TYPE cache_health_audit_write_latency_ms histogram");
  let cumulative = 0;
  for (let i = 0; i < auditLatencyBuckets.length; i++) {
    cumulative += auditLatencyCounts[i];
    lines.push(`cache_health_audit_write_latency_ms_bucket{le="${auditLatencyBuckets[i]}"} ${cumulative}`);
  }
  cumulative += auditLatencyCounts[auditLatencyCounts.length - 1];
  lines.push(`cache_health_audit_write_latency_ms_bucket{le="+Inf"} ${cumulative}`);
  lines.push(`cache_health_audit_write_latency_ms_sum ${auditLatencySum}`);
  lines.push(`cache_health_audit_write_latency_ms_count ${auditLatencyCount}`);
  return lines.join("\n") + "\n";
}

export async function shipMetrics(endpoint?: string) {
  const url = endpoint ?? (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_METRICS_ENDPOINT;
  if (!url) return { shipped: false, reason: "no-endpoint" as const };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: getPrometheusExposition(),
      keepalive: true,
    });
    return { shipped: true as const };
  } catch (e) {
    return { shipped: false, reason: (e as Error).message };
  }
}
