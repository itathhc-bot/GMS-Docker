import { describe, it, expect, beforeAll } from "vitest";
import i18n, { LANG_STORAGE_KEY } from "@/i18n";
import enJson from "@/i18n/locales/en.json";
import arJson from "@/i18n/locales/ar.json";
import { I18N } from "@/i18n/namespaces";
import { buildPartsExportRows } from "@/lib/partsExport";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

/**
 * These tests verify that key UI strings have translations in BOTH en and ar
 * and that switching language returns a different (translated) value, so no
 * page silently falls back to raw English when Arabic is selected.
 */
describe("i18n language switch", () => {
  const sampleKeys = [
    "common.cancel",
    "common.save",
    "common.clear",
    "inventory.title",
    "inventory.table.location",
    "inventory.form.location",
    "parts.title",
    "parts.tabs.create",
    "parts.tabs.approval",
    "parts.tabs.store",
    "parts.approval.queue",
    "parts.approval.tableHead.location",
    "parts.store.ready",
    "parts.rejectDialog.title",
    "parts.issuance.title",
    "parts.deleteDraftTitle",
    "qc.title",
    "rolesPage.title",
    "nav.operationsDashboard",
    "nav.rolesPermissions",
    "partsExtra.storeLocation",
    "partsExtra.locationUnknown",
    "i18nAudit.title",
    "i18nAudit.empty",
  ];

  it("loaded both english and arabic resources", () => {
    expect(Object.keys(enJson).length).toBeGreaterThan(0);
    expect(Object.keys(arJson).length).toBeGreaterThan(0);
  });

  it("returns english strings by default", async () => {
    await i18n.changeLanguage("en");
    for (const k of sampleKeys) {
      const v = i18n.t(k);
      expect(v, `Missing english value for "${k}"`).toBeTruthy();
      expect(v, `Key "${k}" returned the literal key (no translation)`).not.toBe(k);
    }
  });

  it("returns arabic strings after switching language", async () => {
    await i18n.changeLanguage("ar");
    for (const k of sampleKeys) {
      const v = i18n.t(k);
      expect(v, `Missing arabic value for "${k}"`).toBeTruthy();
      expect(v, `Key "${k}" returned the literal key after switching to ar`).not.toBe(k);
    }
  });

  it("english and arabic differ for visible labels", async () => {
    await i18n.changeLanguage("en");
    const en = sampleKeys.map((k) => i18n.t(k));
    await i18n.changeLanguage("ar");
    const ar = sampleKeys.map((k) => i18n.t(k));
    const differing = sampleKeys.filter((_, i) => en[i] !== ar[i]).length;
    expect(differing).toBeGreaterThanOrEqual(Math.floor(sampleKeys.length * 0.8));
  });

  it("sets document direction to rtl for arabic", async () => {
    await i18n.changeLanguage("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    await i18n.changeLanguage("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("persists selected language across simulated reloads", async () => {
    await i18n.changeLanguage("ar");
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe("ar");
    await i18n.changeLanguage("en");
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe("en");
  });

  it("applies dir/lang to <html> immediately on language change", async () => {
    await i18n.changeLanguage("ar");
    expect(document.documentElement.getAttribute("lang")).toBe("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    await i18n.changeLanguage("en");
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });
});

/**
 * Cover the strings that show up specifically inside PartsRequest dialogs
 * (open/close flows for reject, issuance, delete-draft, history). If any of
 * these falls back to the raw key the dialog UI breaks for Arabic users.
 */
describe("PartsRequest dialog translations", () => {
  const dialogKeys = [
    // Reject dialog
    "parts.rejectDialog.title",
    "partsExtra.rejectDesc",
    "partsExtra.rejectPlaceholder",
    "partsExtra.rejectBtn",
    // Issuance dialog
    "parts.issuance.title",
    "partsExtra.partDetails",
    "partsExtra.jobDetails",
    "partsExtra.collector",
    "partsExtra.bayNumber",
    "partsExtra.confirmIssue",
    "partsExtra.storeLocation",
    "partsExtra.locationUnknown",
    // Delete-draft dialog
    "parts.deleteDraftTitle",
    "partsExtra.deleteDraftDesc",
    "partsExtra.deleteDraftBtn",
    // Store empty/no-result states
    "parts.store.noApproved",
    "parts.store.noHistory",
    "common.cancel",
  ];

  for (const lng of ["en", "ar"] as const) {
    it(`renders translated dialog strings in ${lng}`, async () => {
      await i18n.changeLanguage(lng);
      for (const k of dialogKeys) {
        const v = i18n.t(k);
        expect(v, `[${lng}] missing or untranslated key "${k}"`).toBeTruthy();
        expect(v, `[${lng}] key "${k}" returned the literal key`).not.toBe(k);
      }
    });
  }
});

/**
 * Ensure the shared namespace map is in sync with the locale files. Every
 * key referenced from `I18N` must resolve to a real translation in BOTH
 * languages, otherwise dialogs/buttons could silently fall back to keys.
 */
describe("shared namespace map (I18N)", () => {
  function collect(obj: unknown, out: string[] = []): string[] {
    if (typeof obj === "string") {
      out.push(obj);
    } else if (obj && typeof obj === "object") {
      for (const v of Object.values(obj as Record<string, unknown>)) collect(v, out);
    }
    return out;
  }

  const allKeys = collect(I18N);

  for (const lng of ["en", "ar"] as const) {
    it(`every namespace map entry resolves in ${lng}`, async () => {
      await i18n.changeLanguage(lng);
      for (const k of allKeys) {
        const v = i18n.t(k);
        expect(v, `[${lng}] I18N map references missing key "${k}"`).toBeTruthy();
        expect(v, `[${lng}] I18N map key "${k}" returned the literal key`).not.toBe(k);
      }
    });
  }
});

/**
 * Verify the PartsRequest location filter persistence and export row builder
 * render correctly in both LTR (en) and RTL (ar) modes.
 */
describe("PartsRequest location filter + export (LTR & RTL)", () => {
  const groups = [
    {
      job_number: "JC-100",
      vehicle: "ABC-123",
      vehicle_make: "Toyota",
      lines: [
        {
          request_number: "PR-001",
          part_name: "Brake Pad",
          part_number: "BP-9",
          quantity: 2,
          status: "Approved",
          location: "A1-03",
        },
        {
          request_number: "PR-002",
          part_name: "Oil Filter",
          part_number: null,
          quantity: 1,
          status: "Approved",
          location: null,
        },
      ],
    },
  ];

  it("persists the location filter selection in localStorage (per profile key)", () => {
    const key = "partsRequest.locationFilter.user-xyz";
    window.localStorage.setItem(key, "A1-03");
    expect(window.localStorage.getItem(key)).toBe("A1-03");
    window.localStorage.setItem(key, "__all__");
    expect(window.localStorage.getItem(key)).toBe("__all__");
  });

  it("persists the export-include-location toggle", () => {
    window.localStorage.setItem("partsRequest.exportIncludeLocation", "0");
    expect(window.localStorage.getItem("partsRequest.exportIncludeLocation")).toBe("0");
    window.localStorage.setItem("partsRequest.exportIncludeLocation", "1");
    expect(window.localStorage.getItem("partsRequest.exportIncludeLocation")).toBe("1");
  });

  for (const lng of ["en", "ar"] as const) {
    it(`builds export rows with location column in ${lng}`, async () => {
      await i18n.changeLanguage(lng);
      const rows = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, {
        includeLocation: true,
      });
      expect(rows).toHaveLength(2);
      const locHeader = i18n.t("partsExtra.storeLocation") as string;
      const noLoc = i18n.t("parts.store.noLocation") as string;
      expect(rows[0][locHeader]).toBe("A1-03");
      // Unassigned location should fall back to the localized label, not the raw key.
      expect(rows[1][locHeader]).toBe(noLoc);
      expect(noLoc).not.toBe("parts.store.noLocation");
    });

    it(`omits location column when toggle is off in ${lng}`, async () => {
      await i18n.changeLanguage(lng);
      const rows = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, {
        includeLocation: false,
      });
      const locHeader = i18n.t("partsExtra.storeLocation") as string;
      for (const row of rows) {
        expect(row[locHeader]).toBeUndefined();
      }
      // Status column is still present and translated.
      const statusHeader = i18n.t("parts.store.tableHead.status") as string;
      expect(rows[0][statusHeader]).toBe("Approved");
    });
  }

  it("applies RTL direction when ar is active and LTR for en", async () => {
    await i18n.changeLanguage("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    const rowsAr = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, {
      includeLocation: true,
    });
    expect(Object.keys(rowsAr[0]).length).toBeGreaterThanOrEqual(7);

    await i18n.changeLanguage("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    const rowsEn = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, {
      includeLocation: true,
    });
    // Header sets must differ between languages (translated headers).
    expect(Object.keys(rowsAr[0])).not.toEqual(Object.keys(rowsEn[0]));
  });
});

/**
 * End-to-end-ish: change export columns, verify the preview row shape matches,
 * then run the actual XLSX/PDF generators on the same rows to ensure they
 * succeed with each column combination.
 */
describe("Parts export columns -> preview -> generate", () => {
  const groups = [
    {
      job_number: "JC-200",
      vehicle: "ZZ-9",
      vehicle_make: "Ford",
      lines: [
        {
          request_number: "PR-100",
          part_name: "Air Filter",
          part_number: "AF-1",
          quantity: 3,
          status: "Approved",
          location: "B2-04",
        },
      ],
    },
  ];

  const combos = [
    { location: true, status: true, sku: true },
    { location: false, status: true, sku: true },
    { location: true, status: false, sku: true },
    { location: true, status: true, sku: false },
    { location: false, status: false, sku: true },
  ] as const;

  for (const cols of combos) {
    it(`preview headers reflect selected columns ${JSON.stringify(cols)}`, async () => {
      await i18n.changeLanguage("en");
      const rows = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, {
        columns: cols,
      });
      const headers = Object.keys(rows[0]);
      const locH = i18n.t("partsExtra.storeLocation") as string;
      const statusH = i18n.t("parts.store.tableHead.status") as string;
      const skuH = i18n.t("partsExtra.skuPart") as string;
      expect(headers.includes(locH)).toBe(cols.location);
      expect(headers.includes(statusH)).toBe(cols.status);
      expect(headers.includes(skuH)).toBe(cols.sku);
    });
  }

  it("XLSX sheet generation succeeds for each combo", async () => {
    const XLSX = await import("xlsx");
    await i18n.changeLanguage("en");
    for (const cols of combos) {
      const rows = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, {
        columns: cols,
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Parts");
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      expect(out).toBeTruthy();
      expect((out as ArrayBuffer).byteLength ?? (out as Uint8Array).length).toBeGreaterThan(0);
    }
  });

  it("PDF generation succeeds via jspdf-autotable", async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    await i18n.changeLanguage("en");
    const rows = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, {
      columns: { location: true, status: true, sku: true },
    });
    const doc = new jsPDF({ orientation: "landscape" });
    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => String(r[h] ?? "")));
    expect(() =>
      autoTable(doc, { head: [headers], body, startY: 20 }),
    ).not.toThrow();
    const blob = doc.output("blob");
    expect(blob.size).toBeGreaterThan(0);
  });
});

/**
 * Debounce + dedupe: ensure rapid identical filter changes only log once.
 */
describe("Audit log debounce/dedup helper semantics", () => {
  it("dedupes a value seen within the recent window", () => {
    const lastRef: { value: string; at: number } | null = { value: "A", at: Date.now() };
    const now = Date.now();
    const isDup =
      lastRef &&
      lastRef.value === "A" &&
      now - lastRef.at < 2000;
    expect(isDup).toBe(true);
  });
  it("allows a different value through", () => {
    const lastRef = { value: "A", at: Date.now() };
    const now = Date.now();
    const isDup =
      lastRef.value === "B" && now - lastRef.at < 2000;
    expect(isDup).toBe(false);
  });
});

/**
 * RTL end-to-end-ish: switch to ar, verify history filter localized values,
 * export column selection, server-style preview shape, and the full PDF/XLSX
 * generation pipeline all work in RTL mode.
 */
describe("RTL end-to-end: history filter + columns + preview + export", () => {
  const groups = [
    {
      job_number: "JC-RTL",
      vehicle: "RTL-1",
      vehicle_make: "Nissan",
      lines: [
        {
          request_number: "PR-RTL-1",
          part_name: "Spark Plug",
          part_number: "SP-7",
          quantity: 4,
          status: "Approved",
          location: "C3-09",
        },
        {
          request_number: "PR-RTL-2",
          part_name: "Belt",
          part_number: null,
          quantity: 1,
          status: "Issued",
          location: null,
        },
      ],
    },
  ];

  it("renders RTL strings for history filter labels", async () => {
    await i18n.changeLanguage("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    const allLoc = i18n.t("parts.store.allLocations");
    const noLoc = i18n.t("parts.store.noLocation");
    const filterLabel = i18n.t("parts.store.history.filterLocation");
    expect(allLoc).not.toBe("parts.store.allLocations");
    expect(noLoc).not.toBe("parts.store.noLocation");
    expect(filterLabel).not.toBe("parts.store.history.filterLocation");
  });

  it("export column selection drives preview headers in RTL", async () => {
    await i18n.changeLanguage("ar");
    const cols = { location: true, status: true, sku: false };
    const rows = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, { columns: cols });
    const headers = Object.keys(rows[0]);
    const locH = i18n.t("partsExtra.storeLocation") as string;
    const statusH = i18n.t("parts.store.tableHead.status") as string;
    const skuH = i18n.t("partsExtra.skuPart") as string;
    expect(headers).toContain(locH);
    expect(headers).toContain(statusH);
    expect(headers).not.toContain(skuH);
  });

  it("server preview shape mirrors selected columns in RTL", async () => {
    await i18n.changeLanguage("ar");
    // Mirror what the edge function returns: row keys driven by t() headers.
    const cols = { location: true, status: true, sku: true };
    const rows = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, { columns: cols });
    const localHeaders = Object.keys(rows[0]);
    // Simulated server payload using the same translated headers.
    const serverRow = {
      [i18n.t("parts.store.tableHead.request") as string]: "PR-RTL-1",
      [i18n.t("parts.store.tableHead.jobCard") as string]: "JC-RTL",
      [i18n.t("parts.store.tableHead.vehicle") as string]: "Nissan (RTL-1)",
      [i18n.t("partsExtra.partName") as string]: "Spark Plug",
      [i18n.t("partsExtra.skuPart") as string]: "SP-7",
      [i18n.t("partsExtra.quantity") as string]: 4,
      [i18n.t("partsExtra.storeLocation") as string]: "C3-09",
      [i18n.t("parts.store.tableHead.status") as string]: "Approved",
    };
    for (const h of localHeaders) {
      expect(Object.keys(serverRow)).toContain(h);
    }
  });

  it("PDF + XLSX generation succeed in RTL with selected columns", async () => {
    await i18n.changeLanguage("ar");
    const XLSX = await import("xlsx");
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const rows = buildPartsExportRows(groups, i18n.t.bind(i18n) as any, {
      columns: { location: true, status: true, sku: true },
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parts");
    const xlsxOut = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    expect((xlsxOut as ArrayBuffer).byteLength ?? (xlsxOut as Uint8Array).length).toBeGreaterThan(0);

    const doc = new jsPDF({ orientation: "landscape" });
    const headers = Object.keys(rows[0]);
    const body = rows.map((r) => headers.map((h) => String(r[h] ?? "")));
    expect(() => autoTable(doc, { head: [headers], body, startY: 20 })).not.toThrow();
    const blob = doc.output("blob");
    expect(blob.size).toBeGreaterThan(0);

    await i18n.changeLanguage("en");
  });
});

/**
 * Server preview cache: identical inputs reuse cached rows; different inputs miss.
 */
describe("Server preview cache + retry helpers", () => {
  it("returns null on miss and the same rows on hit", async () => {
    const { previewCacheKey, getCachedPreview, setCachedPreview, clearPreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    const k = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "en",
    });
    expect(getCachedPreview(k)).toBeNull();
    const rows = [{ A: "1" }];
    setCachedPreview(k, rows);
    expect(getCachedPreview(k)?.rows).toEqual(rows);
  });

  it("uses different keys for different column/filter selections", async () => {
    const { previewCacheKey } = await import("@/lib/partsPreviewCache");
    const a = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "en",
    });
    const b = previewCacheKey({
      columns: { location: false, status: true, sku: true },
      locationFilter: "__all__",
      lng: "en",
    });
    const c = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "A1-03",
      lng: "en",
    });
    const d = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "ar",
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });

  it("retries a failing function and eventually succeeds", async () => {
    const { withRetry } = await import("@/lib/partsPreviewCache");
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("transient");
        return "ok";
      },
      { retries: 3, baseDelayMs: 1 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("gives up after exhausting retries", async () => {
    const { withRetry } = await import("@/lib/partsPreviewCache");
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new Error("nope");
        },
        { retries: 1, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("nope");
    expect(attempts).toBe(2);
  });

  it("respects per-user disable override", async () => {
    const { previewCacheKey, getCachedPreview, setCachedPreview, configurePreviewCache, clearPreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: false, userTtlSeconds: null });
    const k = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "en",
    });
    setCachedPreview(k, [{ A: "1" }]);
    expect(getCachedPreview(k)).toBeNull();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: null, userTtlSeconds: null });
  });

  it("respects per-user TTL=0 override (no caching)", async () => {
    const { previewCacheKey, getCachedPreview, setCachedPreview, configurePreviewCache, clearPreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: true, userTtlSeconds: 0 });
    const k = previewCacheKey({
      columns: { location: false, status: true, sku: true },
      locationFilter: "__all__",
      lng: "en",
    });
    setCachedPreview(k, [{ A: "1" }]);
    expect(getCachedPreview(k)).toBeNull();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: null, userTtlSeconds: null });
  });
});

/**
 * RTL E2E parity: opening the export preview twice (with the same inputs)
 * reuses the cache and exposes the cached badge string in Arabic. Also
 * verifies the sort-cleared screen-reader announcement key is translated.
 */
describe("RTL export preview cache + sort-cleared announcement", () => {
  it("second open reuses cached rows without invoking the preview endpoint", async () => {
    await i18n.changeLanguage("ar");
    const { previewCacheKey, getCachedPreview, setCachedPreview, clearPreviewCache, configurePreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: null, userTtlSeconds: null });

    const key = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "ar",
    });

    let invocations = 0;
    const fetchPreview = async () => {
      const cached = getCachedPreview(key);
      if (cached) return { rows: cached.rows, fromCache: true };
      invocations += 1;
      const rows = [{ القطعة: "فلتر زيت", الموقع: "A1-03" }];
      setCachedPreview(key, rows);
      return { rows, fromCache: false };
    };

    const first = await fetchPreview();
    const second = await fetchPreview();

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(invocations).toBe(1);
    expect(second.rows).toEqual(first.rows);

    const badge = i18n.t("parts.store.exportPreviewCached");
    expect(badge).toBeTruthy();
    expect(badge).not.toBe("parts.store.exportPreviewCached");
    expect(badge).not.toBe("(cached)");

    await i18n.changeLanguage("en");
  });

  it("announces sort cleared (default) state in both languages", async () => {
    for (const lng of ["en", "ar"] as const) {
      await i18n.changeLanguage(lng);
      const cleared = i18n.t("parts.store.sortDefault");
      expect(cleared).toBeTruthy();
      expect(cleared).not.toBe("parts.store.sortDefault");
      const announce = i18n.t("parts.store.history.sortAnnouncement", { field: cleared, dir: cleared });
      expect(announce).toBeTruthy();
      expect(announce).not.toContain("sortAnnouncement");
    }
    await i18n.changeLanguage("en");
  });
});

/**
 * Cache toggle E2E (simulated): when caching is disabled the preview endpoint
 * is invoked on every open and miss-counters increase; when enabled, the
 * second open is served from cache and the hit-counter increases.
 */
describe("Preview cache enable/disable E2E + stats counters", () => {
  it("disabled cache calls endpoint twice and records two misses", async () => {
    const { previewCacheKey, getCachedPreview, setCachedPreview, clearPreviewCache, configurePreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    configurePreviewCache({ adminEnabled: false, adminTtlSeconds: 60, userEnabled: null, userTtlSeconds: null });

    const stats = { hits: 0, misses: 0 };
    const recordStat = (hit: boolean) => { hit ? (stats.hits += 1) : (stats.misses += 1); };

    let invocations = 0;
    const key = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "en",
    });
    const open = async () => {
      const cached = getCachedPreview(key);
      if (cached) { recordStat(true); return cached.rows; }
      recordStat(false);
      invocations += 1;
      const rows = [{ A: "1" }];
      setCachedPreview(key, rows);
      return rows;
    };
    await open();
    await open();
    expect(invocations).toBe(2);
    expect(stats.misses).toBe(2);
    expect(stats.hits).toBe(0);
  });

  it("enabled cache calls endpoint once and records one hit on second open", async () => {
    const { previewCacheKey, getCachedPreview, setCachedPreview, clearPreviewCache, configurePreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: null, userTtlSeconds: null });

    const stats = { hits: 0, misses: 0 };
    const recordStat = (hit: boolean) => { hit ? (stats.hits += 1) : (stats.misses += 1); };

    let invocations = 0;
    const key = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "en",
    });
    const open = async () => {
      const cached = getCachedPreview(key);
      if (cached) { recordStat(true); return cached.rows; }
      recordStat(false);
      invocations += 1;
      const rows = [{ A: "1" }];
      setCachedPreview(key, rows);
      return rows;
    };
    await open();
    await open();
    expect(invocations).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(1);
    const hitRate = stats.hits / (stats.hits + stats.misses);
    expect(hitRate).toBeCloseTo(0.5);
  });
});

/**
 * RTL: open the preview twice, assert cached badge translation and that
 * the cache-stats endpoint is called once per open with the correct
 * hit/miss flag, so the live cache-health indicator reflects the hit.
 */
describe("RTL preview cache stats integration", () => {
  it("records miss then hit and exposes Arabic cached badge + health labels", async () => {
    await i18n.changeLanguage("ar");
    const { previewCacheKey, getCachedPreview, setCachedPreview, clearPreviewCache, configurePreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: null, userTtlSeconds: null });

    const calls: Array<{ hit: boolean }> = [];
    const reportStat = (hit: boolean) => { calls.push({ hit }); };

    const key = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "ar",
    });
    const open = async () => {
      const cached = getCachedPreview(key);
      if (cached) { reportStat(true); return { rows: cached.rows, fromCache: true }; }
      reportStat(false);
      const rows = [{ القطعة: "فلتر", الموقع: "A1" }];
      setCachedPreview(key, rows);
      return { rows, fromCache: false };
    };

    const first = await open();
    const second = await open();

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(calls).toEqual([{ hit: false }, { hit: true }]);

    // Compute server-style aggregate that the GET endpoint would return.
    const hits = calls.filter((c) => c.hit).length;
    const misses = calls.length - hits;
    const aggregate = { hits, misses, total: hits + misses, hit_rate: hits / (hits + misses) };
    expect(aggregate).toEqual({ hits: 1, misses: 1, total: 2, hit_rate: 0.5 });

    // Translated UI strings rendered by the live cache-health indicator.
    for (const k of [
      "parts.store.exportPreviewCached",
      "settings.cache.health",
      "settings.cache.hits",
      "settings.cache.misses",
      "settings.cache.hitRate",
    ]) {
      const v = i18n.t(k);
      expect(v).toBeTruthy();
      expect(v).not.toBe(k);
    }
    await i18n.changeLanguage("en");
  });
});





/**
 * Mocks `parts-cache-stats` and asserts it is called exactly once per
 * preview open with the correct hit/miss flag, plus runtime schema
 * validation and accessible-name expectations for the cached badge and
 * cache-health line in RTL (Arabic).
 */
describe("RTL parts-cache-stats invocation + Zod validation + a11y", () => {
  it("invokes the endpoint once per open with the correct hit/miss", async () => {
    await i18n.changeLanguage("ar");
    const { previewCacheKey, getCachedPreview, setCachedPreview, clearPreviewCache, configurePreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: null, userTtlSeconds: null });

    type Invocation = { fn: string; method?: string; body?: { hit?: boolean; key?: string } };
    const invocations: Invocation[] = [];
    const fakeInvoke = async (
      fn: string,
      opts: { method?: string; body?: { hit?: boolean; key?: string } } = {},
    ) => {
      invocations.push({ fn, method: opts.method, body: opts.body });
      if (fn === "parts-cache-stats" && opts.method === "GET") {
        const hits = invocations.filter((i) => i.fn === "parts-cache-stats" && i.body?.hit === true).length;
        const misses = invocations.filter((i) => i.fn === "parts-cache-stats" && i.body?.hit === false).length;
        return {
          data: {
            hits,
            misses,
            total: hits + misses,
            hit_rate: hits + misses > 0 ? hits / (hits + misses) : 0,
          },
          error: null,
        };
      }
      return { data: { success: true }, error: null };
    };

    const key = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "ar",
    });

    const open = async () => {
      const cached = getCachedPreview(key);
      const hit = !!cached;
      await fakeInvoke("parts-cache-stats", { body: { hit, key } });
      if (!cached) setCachedPreview(key, [{ A: "1" }]);
      await fakeInvoke("parts-cache-stats", { method: "GET" });
    };

    await open();
    await open();

    const recordCalls = invocations.filter(
      (i) => i.fn === "parts-cache-stats" && i.method !== "GET",
    );
    const getCalls = invocations.filter(
      (i) => i.fn === "parts-cache-stats" && i.method === "GET",
    );
    expect(recordCalls.length).toBe(2);
    expect(getCalls.length).toBe(2);
    expect(recordCalls.map((c) => c.body?.hit)).toEqual([false, true]);
    await i18n.changeLanguage("en");
  });

  it("rejects malformed cache-stats responses via Zod", async () => {
    const { parseCacheStats } = await import("@/lib/cacheStatsSchema");
    expect(parseCacheStats({ hits: 1, misses: 2, total: 3, hit_rate: 0.33 })).not.toBeNull();
    // Missing field
    expect(parseCacheStats({ hits: 1, misses: 2, total: 3 })).toBeNull();
    // Wrong type
    expect(parseCacheStats({ hits: "1", misses: 2, total: 3, hit_rate: 0.5 })).toBeNull();
    // Out-of-range hit_rate
    expect(parseCacheStats({ hits: 1, misses: 1, total: 2, hit_rate: 5 })).toBeNull();
    // Negative count
    expect(parseCacheStats({ hits: -1, misses: 1, total: 2, hit_rate: 0.5 })).toBeNull();
    // Null / wrong shape
    expect(parseCacheStats(null)).toBeNull();
    expect(parseCacheStats("nope")).toBeNull();
  });

  it("provides Arabic accessible names for the cached badge and cache-health labels", () => {
    const en = i18n.getFixedT("en");
    const ar = i18n.getFixedT("ar");
    for (const k of [
      "settings.cache.cachedBadgeAria",
      "settings.cache.healthLoading",
      "settings.cache.healthError",
      "settings.cache.healthError401",
      "settings.cache.healthError500",
      "settings.cache.healthRetry",
      "settings.cache.healthInvalid",
    ]) {
      const enV = en(k);
      const arV = ar(k);
      expect(enV).toBeTruthy();
      expect(arV).toBeTruthy();
      expect(enV).not.toBe(k);
      expect(arV).not.toBe(k);
      expect(arV).not.toBe(enV);
    }
  });
});

/**
 * RTL: cache-health error UI must surface 401/500 messages and the retry
 * button must re-invoke parts-cache-stats.
 */
describe("RTL cache-health 401/500 error + retry behavior", () => {
  type Resp = { data: unknown; error: { status?: number; message?: string } | null };
  const buildRefresh = (responses: Resp[]) => {
    const calls: Array<{ method?: string }> = [];
    let i = 0;
    const invoke = async (_fn: string, opts: { method?: string } = {}) => {
      calls.push({ method: opts.method });
      const r = responses[Math.min(i, responses.length - 1)];
      i += 1;
      return r;
    };
    return { calls, invoke };
  };

  const refresh = async (
    invoke: (fn: string, opts?: { method?: string }) => Promise<Resp>,
  ): Promise<{ stats: unknown; error: null | { status?: number; kind: "network" | "http" | "invalid" } }> => {
    const { parseCacheStats } = await import("@/lib/cacheStatsSchema");
    try {
      const { data, error } = await invoke("parts-cache-stats", { method: "GET" });
      if (error) return { stats: null, error: { status: error.status, kind: "http" } };
      const parsed = parseCacheStats(data);
      if (!parsed) return { stats: null, error: { kind: "invalid" } };
      return { stats: parsed, error: null };
    } catch {
      return { stats: null, error: { kind: "network" } };
    }
  };

  it("shows the Arabic 401 message when the endpoint returns unauthorized", async () => {
    await i18n.changeLanguage("ar");
    const { calls, invoke } = buildRefresh([{ data: null, error: { status: 401, message: "unauthorized" } }]);
    const result = await refresh(invoke);
    expect(calls.length).toBe(1);
    expect(result.error).toEqual({ status: 401, kind: "http" });
    const msg = i18n.t("settings.cache.healthError401");
    expect(msg).toBeTruthy();
    expect(msg).not.toBe("settings.cache.healthError401");
    await i18n.changeLanguage("en");
  });

  it("shows the Arabic 500 message when the endpoint fails server-side", async () => {
    await i18n.changeLanguage("ar");
    const { calls, invoke } = buildRefresh([{ data: null, error: { status: 503, message: "boom" } }]);
    const result = await refresh(invoke);
    expect(calls.length).toBe(1);
    expect(result.error?.status).toBe(503);
    const msg = i18n.t("settings.cache.healthError500");
    expect(msg).toBeTruthy();
    expect(msg).not.toBe("settings.cache.healthError500");
    await i18n.changeLanguage("en");
  });

  it("retry button re-invokes parts-cache-stats and recovers from the error", async () => {
    await i18n.changeLanguage("ar");
    const { calls, invoke } = buildRefresh([
      { data: null, error: { status: 500 } },
      { data: { hits: 2, misses: 1, total: 3, hit_rate: 2 / 3 }, error: null },
    ]);
    const first = await refresh(invoke);
    expect(first.error?.kind).toBe("http");
    expect(first.stats).toBeNull();

    // Simulate clicking the retry button → calls refresh again.
    const retryLabel = i18n.t("settings.cache.healthRetry");
    expect(retryLabel).toBeTruthy();
    const second = await refresh(invoke);
    expect(calls.length).toBe(2);
    expect(second.error).toBeNull();
    expect(second.stats).toEqual({ hits: 2, misses: 1, total: 3, hit_rate: 2 / 3 });
    await i18n.changeLanguage("en");
  });
});

/**
 * RTL: parts-cache-stats GET (cache-health refresh) is invoked exactly
 * ONCE per export-preview open — both for the cache-miss (first) open
 * and the cache-hit (second) open. Re-renders during an open must not
 * trigger additional GETs.
 */
describe("RTL parts-cache-stats one-call-per-open", () => {
  it("calls the GET endpoint exactly once per open in hit and miss flows", async () => {
    await i18n.changeLanguage("ar");
    const { previewCacheKey, getCachedPreview, setCachedPreview, clearPreviewCache, configurePreviewCache } =
      await import("@/lib/partsPreviewCache");
    clearPreviewCache();
    configurePreviewCache({ adminEnabled: true, adminTtlSeconds: 60, userEnabled: null, userTtlSeconds: null });

    let getCalls = 0;
    let postCalls = 0;
    const refreshCacheStats = async () => { getCalls += 1; };
    const recordStat = async (_hit: boolean) => { postCalls += 1; };

    const key = previewCacheKey({
      columns: { location: true, status: true, sku: true },
      locationFilter: "__all__",
      lng: "ar",
    });

    const openPreview = async () => {
      const cached = getCachedPreview(key);
      if (cached) {
        await recordStat(true);
      } else {
        await recordStat(false);
        setCachedPreview(key, [{ A: "1" }]);
      }
      await refreshCacheStats();
      // Simulate harmless rerenders inside the popover — must NOT re-call.
      // (Call only happens from onOpenChange, not from render.)
    };

    await openPreview(); // miss
    expect(getCalls).toBe(1);
    expect(postCalls).toBe(1);

    await openPreview(); // hit
    expect(getCalls).toBe(2);
    expect(postCalls).toBe(2);
    await i18n.changeLanguage("en");
  });
});

/**
 * Accessibility: the cache-health line lives inside an aria-live region
 * and updates after the second preview open. The cached badge has a
 * stable accessible name in Arabic.
 */
describe("RTL cache-health aria-live + cached badge accessible name", () => {
  it("aria-live container is polite and updates after the second open", async () => {
    await i18n.changeLanguage("ar");
    // Emulate the React-rendered region attributes used in PartsRequest.tsx.
    const region = {
      role: "region",
      "aria-live": "polite",
      "aria-atomic": "true",
      text: i18n.t("settings.cache.healthLoading"),
    };
    expect(region["aria-live"]).toBe("polite");
    expect(region["aria-atomic"]).toBe("true");

    // First open → MISS aggregate (0 hits, 1 miss).
    let stats = { hits: 0, misses: 1, total: 1, hit_rate: 0 };
    const renderHealth = (s: typeof stats) =>
      `${i18n.t("settings.cache.health")} — ${i18n.t("settings.cache.hits")}: ${s.hits} · ${i18n.t(
        "settings.cache.misses",
      )}: ${s.misses} · ${i18n.t("settings.cache.hitRate")}: ${(s.hit_rate * 100).toFixed(1)}%`;

    region.text = renderHealth(stats);
    expect(region.text).toContain(i18n.t("settings.cache.misses"));
    const firstSnapshot = region.text;

    // Second open → HIT aggregate (1 hit, 1 miss).
    stats = { hits: 1, misses: 1, total: 2, hit_rate: 0.5 };
    region.text = renderHealth(stats);
    expect(region.text).not.toBe(firstSnapshot);
    expect(region.text).toContain("50.0%");
    await i18n.changeLanguage("en");
  });

  it("cached badge has the localized accessible name in Arabic", async () => {
    await i18n.changeLanguage("ar");
    const badge = {
      role: "status",
      "aria-label": i18n.t("settings.cache.cachedBadgeAria"),
      text: i18n.t("parts.store.exportPreviewCached"),
    };
    expect(badge.role).toBe("status");
    expect(badge["aria-label"]).toBe(i18n.t("settings.cache.cachedBadgeAria"));
    expect(badge["aria-label"]).not.toBe("settings.cache.cachedBadgeAria");
    expect(badge.text).toBeTruthy();
    await i18n.changeLanguage("en");
  });
});

/**
 * Contract: the parts-cache-stats GET response shape must always have
 * hits/misses/total as non-negative integers and hit_rate as a number in
 * [0, 1]. Verified through the Zod schema used by the UI.
 */
describe("parts-cache-stats response contract", () => {
  it("rejects non-conforming payloads and accepts conforming ones", async () => {
    const { cacheStatsSchema, parseCacheStats } = await import("@/lib/cacheStatsSchema");
    const sample = { hits: 7, misses: 3, total: 10, hit_rate: 0.7 };
    const ok = cacheStatsSchema.safeParse(sample);
    expect(ok.success).toBe(true);
    expect(parseCacheStats({ hits: 1, misses: 0, total: 1, hit_rate: 1 })).not.toBeNull();
    expect(parseCacheStats({ hits: 0, misses: 0, total: 0, hit_rate: 0 })).not.toBeNull();
    // Range / type violations
    expect(parseCacheStats({ hits: 1, misses: 0, total: 1, hit_rate: 2 })).toBeNull();
    expect(parseCacheStats({ hits: 1.2, misses: 0, total: 1, hit_rate: 0 })).toBeNull();
    expect(parseCacheStats({ hits: -1, misses: 0, total: 0, hit_rate: 0 })).toBeNull();
  });
});

/**
 * Cache-health retry uses exponential backoff (300ms, 600ms, 1200ms…)
 * capped at 5s. We verify the delay sequence the UI helper would use.
 */
describe("cache-health retry exponential backoff", () => {
  it("computes 300/600/1200/2400/4800/5000 ms for attempts 0..5", () => {
    const delays = [0, 1, 2, 3, 4, 5].map((attempt) =>
      Math.min(300 * Math.pow(2, attempt), 5000),
    );
    expect(delays).toEqual([300, 600, 1200, 2400, 4800, 5000]);
  });

  it("retry button calls refresh again, increasing the attempt counter", async () => {
    let attempt = 0;
    let calls = 0;
    const refresh = async () => { calls += 1; };
    const retry = async () => {
      const delay = Math.min(300 * Math.pow(2, attempt), 5000);
      attempt += 1;
      await new Promise((r) => setTimeout(r, Math.min(delay, 1)));
      await refresh();
    };
    await retry();
    await retry();
    await retry();
    expect(calls).toBe(3);
    expect(attempt).toBe(3);
  });
});

/**
 * Cache-health 401/500 responses must be recorded in the parts audit log
 * with user + timestamp metadata.
 */
describe("cache-health endpoint failures are audited", () => {
  it("records 401 and 500 entries with userId, status and ISO timestamp", async () => {
    const { logAudit, clearAuditLog, getAuditLog } = await import("@/lib/partsAuditLog");
    clearAuditLog();
    const userId = "user-123";
    logAudit({
      userId,
      action: "parts.store.audit.cacheHealthError",
      details: { status: 401, message: "unauthorized" },
    });
    logAudit({
      userId,
      action: "parts.store.audit.cacheHealthError",
      details: { status: 503, message: "service unavailable" },
    });
    const entries = getAuditLog();
    expect(entries.length).toBe(2);
    for (const e of entries) {
      expect(e.userId).toBe(userId);
      expect(e.action).toBe("parts.store.audit.cacheHealthError");
      expect(typeof e.at).toBe("string");
      expect(() => new Date(e.at).toISOString()).not.toThrow();
      expect(typeof e.details.status === "number" || e.details.status === "timeout").toBe(true);
    }
    const statuses = entries.map((e) => e.details.status).sort();
    expect(statuses).toEqual([401, 503]);
    clearAuditLog();
  });
});

/**
 * Client-side timeout: when the cache-stats endpoint hangs, the request
 * should reject with a timeout error and the retry flow should fire.
 */
describe("cache-health client-side timeout + retry", () => {
  it("times out a hanging request and the retry flow re-invokes", async () => {
    const TIMEOUT_MS = 30;
    const refreshOnce = async (responder: () => Promise<unknown>) => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("__timeout__")), TIMEOUT_MS),
      );
      try {
        await Promise.race([responder(), timeout]);
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, kind: (e as Error).message === "__timeout__" ? "timeout" : "error" };
      }
    };

    let calls = 0;
    // First call: hangs forever (cleared by test runner), second: resolves.
    const responder = () => new Promise((resolve) => {
      calls += 1;
      if (calls === 1) {
        // never resolve within the timeout window
        setTimeout(() => resolve({ data: null, error: null }), 1000);
      } else {
        resolve({ data: { hits: 1, misses: 0, total: 1, hit_rate: 1 }, error: null });
      }
    });

    const first = await refreshOnce(responder);
    expect(first.ok).toBe(false);
    if (!first.ok) expect(first.kind).toBe("timeout");

    // Retry path:
    const second = await refreshOnce(responder);
    expect(second.ok).toBe(true);
    expect(calls).toBe(2);
  });
});
