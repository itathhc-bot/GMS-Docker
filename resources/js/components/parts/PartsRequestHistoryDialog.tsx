import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle, RefreshCw, FileText, Truck, CheckCircle, Clock, MapPin } from "lucide-react";

import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/partsAuditLog";
import { createPartsRequest } from "@/api/partsRequests";

interface RequestLine {
  id: string;
  request_number: string;
  base_request_number: string;
  job_card_id: string | null;
  job_number: string;
  vehicle: string;
  vehicle_make: string;
  mechanic: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  urgency: string;
  status: string;
  reason: string | null;
  supervisor_remarks: string | null;
  created_at: string;
  rejection_note: string | null;
  bay_number?: string | null;
  collected_by_name?: string | null;
  location?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseRequestNumber: string | null;
  lines: RequestLine[];
  onChanged: () => void;
}

const statusTone: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Pending: "bg-warning/15 text-warning",
  Approved: "bg-primary/15 text-primary",
  Rejected: "bg-destructive/15 text-destructive",
  Issued: "bg-success/15 text-success",
  "Partially Issued": "bg-warning/15 text-warning",
};

export default function PartsRequestHistoryDialog({
  open, onOpenChange, baseRequestNumber, lines, onChanged,
}: Props) {
  const { user, profile, updatePartsHistoryLocationFilter } = useAuth();
  const { t } = useTranslation();
  const [reRequestNote, setReRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "location" | "status">("default");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [locationFilter, setLocationFilter] = useState<string>(
    () => profile?.parts_history_location_filter || "__all__",
  );
  const profileHydratedRef = useRef(false);
  useEffect(() => {
    if (profileHydratedRef.current) return;
    if (profile?.parts_history_location_filter) {
      profileHydratedRef.current = true;
      setLocationFilter(profile.parts_history_location_filter);
    }
  }, [profile?.parts_history_location_filter]);

  // Debounced + dedup audit
  const lastAuditRef = useRef<{ value: string; at: number } | null>(null);
  const auditTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auditPendingRef = useRef<{ value: string; label: string } | null>(null);
  useEffect(() => () => {
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
  }, []);
  const scheduleFilterAudit = (value: string, label: string) => {
    auditPendingRef.current = { value, label };
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    auditTimerRef.current = setTimeout(() => {
      const pending = auditPendingRef.current;
      auditPendingRef.current = null;
      if (!pending) return;
      const last = lastAuditRef.current;
      if (last && last.value === pending.value && Date.now() - last.at < 2000) return;
      lastAuditRef.current = { value: pending.value, at: Date.now() };
      logAudit({
        userId: user?.id ?? null,
        action: "parts.store.audit.historyLocationFilterChanged",
        details: { value: pending.value, label: pending.label, scope: "history", baseRequestNumber },
      });
      toast.message(t("parts.store.audit.historyLocationFilterChanged", { value: pending.label }));
    }, 600);
  };
  const [liveMessage, setLiveMessage] = useState("");

  const groupLines = useMemo(
    () => (baseRequestNumber ? lines.filter((l) => l.base_request_number === baseRequestNumber) : []),
    [lines, baseRequestNumber],
  );
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    groupLines.forEach((l) => {
      const v = (l.location || "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [groupLines]);
  const filteredLines = useMemo(() => {
    if (locationFilter === "__all__") return groupLines;
    if (locationFilter === "__none__") return groupLines.filter((l) => !(l.location || "").trim());
    return groupLines.filter((l) => (l.location || "").trim() === locationFilter);
  }, [groupLines, locationFilter]);
  const sortedLines = useMemo(() => {
    if (sortBy === "default") return filteredLines;
    const arr = [...filteredLines];
    arr.sort((a, b) => {
      const av = sortBy === "location" ? (a.location || "").toLowerCase() : a.status.toLowerCase();
      const bv = sortBy === "location" ? (b.location || "").toLowerCase() : b.status.toLowerCase();
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredLines, sortBy, sortDir]);
  const first = groupLines[0];
  const isRejected = groupLines.some((l) => l.status === "Rejected");
  const rejectionNote = groupLines.find((l) => l.rejection_note)?.rejection_note ?? null;

  const toggleSort = (key: "location" | "status") => {
    let nextDir: "asc" | "desc" = "asc";
    let nextKey: "location" | "status" | "default" = key;
    if (sortBy === key) {
      if (sortDir === "asc") {
        nextDir = "desc";
        setSortDir("desc");
      } else {
        // 3rd press: clear sort
        nextKey = "default";
        setSortBy("default");
        setSortDir("asc");
      }
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    const fieldLabel = t(key === "location" ? "parts.store.sortLocation" : "parts.store.sortStatus");
    if (nextKey === "default") {
      setLiveMessage(t("parts.store.history.sortCleared", "Sorting cleared, default order restored"));
    } else {
      const dirLabel = t(nextDir === "asc" ? "parts.store.history.asc" : "parts.store.history.desc");
      setLiveMessage(t("parts.store.history.sortAnnouncement", { field: fieldLabel, dir: dirLabel }));
    }
    scheduleSortAudit(`${nextKey}:${nextDir}`);
  };

  const handleHistoryLocationFilterChange = (next: string) => {
    if (next === locationFilter) return;
    setLocationFilter(next);
    const label =
      next === "__all__"
        ? t("parts.store.allLocations")
        : next === "__none__"
        ? t("parts.store.noLocation")
        : next;
    setLiveMessage(t("parts.store.history.filterLocationCurrent", { value: label }));
    scheduleFilterAudit(next, label);
    // Persist per-profile (best-effort) so it restores after login.
    void updatePartsHistoryLocationFilter(next === "__all__" ? null : next);
  };

  // Also debounce/dedupe sort changes so rapid toggling logs once.
  const lastSortAuditRef = useRef<{ key: string; at: number } | null>(null);
  const sortAuditTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (sortAuditTimerRef.current) clearTimeout(sortAuditTimerRef.current);
  }, []);
  const scheduleSortAudit = (sortKey: string) => {
    if (sortAuditTimerRef.current) clearTimeout(sortAuditTimerRef.current);
    sortAuditTimerRef.current = setTimeout(() => {
      const last = lastSortAuditRef.current;
      if (last && last.key === sortKey && Date.now() - last.at < 2000) return;
      lastSortAuditRef.current = { key: sortKey, at: Date.now() };
      logAudit({
        userId: user?.id ?? null,
        action: "parts.store.audit.historySortChanged",
        details: { sort: sortKey, scope: "history", baseRequestNumber },
      });
    }, 600);
  };

  const handleReRequest = async () => {
    if (!user || !first || groupLines.length === 0) return;
    setSubmitting(true);
    const baseNum = Date.now().toString().slice(-6);
    const inserts = groupLines.map((l, idx) => ({
      request_number: groupLines.length > 1 ? `PR-${baseNum}-${idx + 1}` : `PR-${baseNum}`,
      job_card_id: l.job_card_id,
      part_name: l.part_name,
      part_number: l.part_number,
      quantity: l.quantity,
      urgency: l.urgency,
      reason: [
        reRequestNote.trim() || null,
        `Re-requested from ${first.base_request_number}.`,
        rejectionNote ? `Previous rejection: ${rejectionNote}` : null,
      ].filter(Boolean).join("\n"),
      requested_by: user.id,
      status: "Pending",
    }));
    try {
      for (const row of inserts) {
        await createPartsRequest(row as any);
      }
      setSubmitting(false);
      toast.success(`Re-submitted ${inserts.length} part line(s) for approval.`);
      setReRequestNote("");
      onOpenChange(false);
      onChanged();
    } catch (e) {
      setSubmitting(false);
      toast.error("Failed to re-submit request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Request {baseRequestNumber || "—"}
          </DialogTitle>
          <DialogDescription>
            Full history, status, and re-submission for this parts request.
          </DialogDescription>
        </DialogHeader>

        {!first ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No data for this request.</div>
        ) : (
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 bg-muted/30">
              <div>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Job Card</p>
                <p className="text-sm font-mono text-primary">{first.job_number}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Vehicle</p>
                <p className="text-sm font-medium">{first.vehicle_make} ({first.vehicle})</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Mechanic</p>
                <p className="text-sm">{first.mechanic}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Created</p>
                <p className="text-sm">{new Date(first.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Urgency</p>
                <Badge variant="outline" className="text-[10px]">{first.urgency}</Badge>
              </div>
              {first.bay_number && (
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Bay</p>
                  <p className="text-sm">{first.bay_number}</p>
                </div>
              )}
            </div>

            {/* Rejection reason */}
            {isRejected && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-semibold">Request was rejected</p>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {rejectionNote || "No reason was provided by the supervisor."}
                </p>
              </div>
            )}

            {/* Mechanic notes */}
            {first.reason && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-1">Mechanic Notes</p>
                <p className="text-sm whitespace-pre-wrap">{first.reason}</p>
              </div>
            )}

            {/* Supervisor remarks */}
            {first.supervisor_remarks && (
              <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
                <p className="text-[10px] font-bold tracking-wider text-primary uppercase mb-1">Supervisor Remarks</p>
                <p className="text-sm whitespace-pre-wrap">{first.supervisor_remarks}</p>
              </div>
            )}

            {/* Live region for screen-reader announcements */}
            <div role="status" aria-live="polite" className="sr-only" data-testid="history-filter-live">
              {liveMessage}
            </div>

            {/* Lines */}
            <div className="flex flex-wrap items-center justify-end gap-2 -mb-2">
              <label
                id="history-location-filter-label"
                htmlFor="history-location-filter"
                className="text-[11px] text-muted-foreground inline-flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" aria-hidden />
                {t("parts.store.history.filterLocation")}
              </label>
              <Select value={locationFilter} onValueChange={handleHistoryLocationFilterChange}>
                <SelectTrigger
                  id="history-location-filter"
                  className="h-8 w-[180px] text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-labelledby="history-location-filter-label"
                  aria-label={t("parts.store.history.filterLocationCurrent", {
                    value:
                      locationFilter === "__all__"
                        ? t("parts.store.allLocations")
                        : locationFilter === "__none__"
                        ? t("parts.store.noLocation")
                        : locationFilter,
                  })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("parts.store.allLocations")}</SelectItem>
                  <SelectItem value="__none__">{t("parts.store.noLocation")}</SelectItem>
                  {availableLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-[11px] text-muted-foreground">{t("parts.store.sortBy")}</span>
              <Select
                value={sortBy === "default" ? "default" : `${sortBy}:${sortDir}`}
                onValueChange={(v) => {
                  if (v === "default") {
                    setSortBy("default");
                    setSortDir("asc");
                  } else {
                    const [key, dir] = v.split(":") as ["location" | "status", "asc" | "desc"];
                    setSortBy(key);
                    setSortDir(dir);
                  }
                }}
              >
                <SelectTrigger
                  className="h-8 w-[180px] text-xs"
                  aria-label={t("parts.store.history.sortByA11y", { field: t("parts.store.sortBy") })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("parts.store.sortDefault")}</SelectItem>
                  <SelectItem value="location:asc">{t("parts.store.sortLocation")} ↑</SelectItem>
                  <SelectItem value="location:desc">{t("parts.store.sortLocation")} ↓</SelectItem>
                  <SelectItem value="status:asc">{t("parts.store.sortStatus")} ↑</SelectItem>
                  <SelectItem value="status:desc">{t("parts.store.sortStatus")} ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="text-left px-3 py-2">Part</th>
                    <th scope="col" className="text-left px-3 py-2">SKU</th>
                    <th scope="col" className="text-left px-3 py-2">Qty</th>
                    <th
                      scope="col"
                      className="text-left px-3 py-2"
                      aria-sort={sortBy === "location" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort("location")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSort("location");
                          }
                        }}
                        aria-pressed={sortBy === "location"}
                        aria-keyshortcuts="Enter Space"
                        aria-label={t("parts.store.history.toggleSortA11y", {
                          field: t("parts.store.sortLocation"),
                          dir:
                            sortBy === "location"
                              ? t(sortDir === "asc" ? "parts.store.history.asc" : "parts.store.history.desc")
                              : t("parts.store.sortDefault"),
                        })}
                        className="inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm px-1 -mx-1"
                      >
                        {t("parts.store.sortLocation")}{" "}
                        {sortBy === "location" ? (
                          sortDir === "asc" ? <ArrowUp className="w-3 h-3" aria-hidden /> : <ArrowDown className="w-3 h-3" aria-hidden />
                        ) : (
                          <ArrowUpDown className="w-3 h-3" aria-hidden />
                        )}
                      </button>
                    </th>
                    <th
                      scope="col"
                      className="text-left px-3 py-2"
                      aria-sort={sortBy === "status" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort("status")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSort("status");
                          }
                        }}
                        aria-pressed={sortBy === "status"}
                        aria-keyshortcuts="Enter Space"
                        aria-label={t("parts.store.history.toggleSortA11y", {
                          field: t("parts.store.sortStatus"),
                          dir:
                            sortBy === "status"
                              ? t(sortDir === "asc" ? "parts.store.history.asc" : "parts.store.history.desc")
                              : t("parts.store.sortDefault"),
                        })}
                        className="inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm px-1 -mx-1"
                      >
                        {t("parts.store.sortStatus")}{" "}
                        {sortBy === "status" ? (
                          sortDir === "asc" ? <ArrowUp className="w-3 h-3" aria-hidden /> : <ArrowDown className="w-3 h-3" aria-hidden />
                        ) : (
                          <ArrowUpDown className="w-3 h-3" aria-hidden />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedLines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 font-medium">{l.part_name}</td>
                      <td className="px-3 py-2 font-mono text-primary">{l.part_number || "—"}</td>
                      <td className="px-3 py-2">{l.quantity}</td>
                      <td className="px-3 py-2">
                        {l.location ? (
                          <span className="font-mono text-[11px] text-primary">{l.location}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] ${statusTone[l.status] ?? "bg-muted text-muted-foreground"}`}>
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Re-request box (only if rejected) */}
            {isRejected && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Re-submit this request</p>
                </div>
                <Textarea
                  rows={3}
                  value={reRequestNote}
                  onChange={(e) => setReRequestNote(e.target.value)}
                  placeholder="Add additional comments or context for the supervisor (optional)…"
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground">
                  A new pending request will be created with the same parts. The previous rejection reason will be
                  attached for context.
                </p>
              </div>
            )}

            {/* Quick status legend */}
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
              <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3 text-primary" /> Approved</span>
              <span className="inline-flex items-center gap-1"><Truck className="w-3 h-3 text-success" /> Issued</span>
              <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-destructive" /> Rejected</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {isRejected && (
            <Button onClick={handleReRequest} disabled={submitting} className="gap-1.5">
              <RefreshCw className="w-4 h-4" /> {submitting ? "Submitting…" : "Re-submit request"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
