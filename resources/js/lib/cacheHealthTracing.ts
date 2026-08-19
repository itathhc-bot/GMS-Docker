/**
 * Minimal OpenTelemetry-compatible tracing shim for the cache-health flow.
 *
 * We intentionally avoid the full @opentelemetry/* SDK in the browser bundle
 * (it adds ~100KB and a lot of init complexity). Instead we generate W3C
 * trace-context-compatible IDs (16-byte trace_id, 8-byte span_id, hex) and
 * push completed spans to an OTLP HTTP endpoint when configured via
 * `VITE_OTLP_ENDPOINT`. The IDs are also surfaced to the structured logger
 * so a single correlation_id ↔ trace_id mapping exists per retry chain.
 */

function rand(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newTraceId(): string { return rand(16); }
export function newSpanId(): string { return rand(8); }

export interface Span {
  name: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  start: number;
  end?: number;
  attributes: Record<string, unknown>;
  status: "unset" | "ok" | "error";
}

const exported: Span[] = [];

export function startSpan(
  name: string,
  parent?: { trace_id: string; span_id: string },
): Span {
  return {
    name,
    trace_id: parent?.trace_id ?? newTraceId(),
    span_id: newSpanId(),
    parent_span_id: parent?.span_id,
    start: Date.now(),
    attributes: {},
    status: "unset",
  };
}

export function endSpan(span: Span, status: "ok" | "error" = "ok") {
  span.end = Date.now();
  span.status = status;
  exported.push(span);
  void exportSpan(span);
}

export function getExportedSpans(): Span[] {
  return [...exported];
}

export function clearExportedSpans() {
  exported.length = 0;
}

async function exportSpan(span: Span) {
  const url = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_OTLP_ENDPOINT;
  if (!url) return;
  // OTLP/HTTP JSON envelope (subset).
  const payload = {
    resourceSpans: [{
      resource: { attributes: [{ key: "service.name", value: { stringValue: "cache-health-frontend" } }] },
      scopeSpans: [{
        scope: { name: "cache-health" },
        spans: [{
          traceId: span.trace_id,
          spanId: span.span_id,
          parentSpanId: span.parent_span_id ?? "",
          name: span.name,
          kind: 1,
          startTimeUnixNano: String(span.start * 1_000_000),
          endTimeUnixNano: String((span.end ?? span.start) * 1_000_000),
          attributes: Object.entries(span.attributes).map(([k, v]) => ({
            key: k, value: { stringValue: String(v) },
          })),
          status: { code: span.status === "error" ? 2 : 1 },
        }],
      }],
    }],
  };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}
