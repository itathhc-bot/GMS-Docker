/**
 * Lightweight audit trail for Parts Request UI preference changes
 * (location filter, export column toggles, etc).
 *
 * Stored client-side in localStorage so it survives reloads, and exposed via
 * a tiny pub/sub so React components can subscribe and re-render.
 */
export interface PartsAuditEntry {
  id: string;
  at: string; // ISO timestamp
  userId: string | null;
  action: string; // i18n-friendly key, eg "partsRequest.audit.locationFilterChanged"
  details: Record<string, unknown>;
}

const STORAGE_KEY = "partsRequest.auditLog";
const MAX_ENTRIES = 100;

type Listener = (entries: PartsAuditEntry[]) => void;
const listeners = new Set<Listener>();

function readAll(): PartsAuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PartsAuditEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: PartsAuditEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l(entries));
}

export function getAuditLog(): PartsAuditEntry[] {
  return readAll();
}

export function logAudit(entry: Omit<PartsAuditEntry, "id" | "at">) {
  const next: PartsAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...entry,
  };
  const all = [next, ...readAll()].slice(0, MAX_ENTRIES);
  writeAll(all);
  return next;
}

export function clearAuditLog() {
  writeAll([]);
}

export function subscribeAudit(listener: Listener): () => void {
  listeners.add(listener);
  listener(readAll());
  return () => {
    listeners.delete(listener);
  };
}
