/**
 * Runtime registry for missing translation keys.
 *
 * The i18n missingKeyHandler pushes entries here whenever a t() call
 * resolves to a key that isn't present in the active resource bundle.
 * The audit panel (`/i18n-audit`) reads this registry to surface gaps
 * to developers and QA.
 */

export interface MissingKeyEntry {
  /** Fully qualified key including namespace prefix, e.g. "translation:parts.title". */
  key: string;
  /** Bare key without namespace prefix, e.g. "parts.title". */
  bareKey: string;
  /** The i18next namespace the key was looked up in. */
  namespace?: string;
  languages: string[];
  fallback?: string;
  /** Best-effort component / file source from JS stack at record time. */
  component?: string;
  /** Latest navigation route (window.location.pathname) when the key was hit. */
  route?: string;
  /** First time this key was reported during this session. */
  firstSeen: number;
  /** Most recent time this key was reported. */
  lastSeen: number;
  /** How many times t() has been called with this key. */
  count: number;
}

type Listener = (entries: MissingKeyEntry[]) => void;

const registry = new Map<string, MissingKeyEntry>();
const listeners = new Set<Listener>();

function inferComponent(): string | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;
  const lines = stack.split("\n");
  for (const line of lines) {
    const match =
      line.match(/\/src\/([^\s)]+\.(?:tsx|jsx|ts|js))/) ||
      line.match(/at\s+([A-Z][A-Za-z0-9_]+)\s/);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

function currentRoute(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.location.pathname + (window.location.hash || "");
  } catch {
    return undefined;
  }
}

export function recordMissingKey(
  key: string,
  languages: string[],
  fallback?: string,
  namespace?: string,
) {
  const ns = namespace || "translation";
  const fullKey = `${ns}:${key}`;
  const existing = registry.get(fullKey);
  const now = Date.now();
  const route = currentRoute();
  if (existing) {
    existing.count += 1;
    existing.lastSeen = now;
    if (route) existing.route = route;
    for (const l of languages) {
      if (!existing.languages.includes(l)) existing.languages.push(l);
    }
  } else {
    registry.set(fullKey, {
      key: fullKey,
      bareKey: key,
      namespace: ns,
      languages: [...languages],
      fallback,
      component: inferComponent(),
      route,
      firstSeen: now,
      lastSeen: now,
      count: 1,
    });
  }
  emit();
}

export function getMissingKeys(): MissingKeyEntry[] {
  return Array.from(registry.values()).sort((a, b) => b.count - a.count);
}

export function clearMissingKeys() {
  registry.clear();
  emit();
}

export function subscribeMissingKeys(listener: Listener): () => void {
  listeners.add(listener);
  listener(getMissingKeys());
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  const snapshot = getMissingKeys();
  listeners.forEach((l) => l(snapshot));
}
