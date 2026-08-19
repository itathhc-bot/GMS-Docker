import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import {
  clearMissingKeys,
  getMissingKeys,
  subscribeMissingKeys,
  type MissingKeyEntry,
} from "@/i18n/missingKeys";

/**
 * Developer / QA panel that lists every i18n key that has been requested
 * via t() at runtime but was not found in the loaded resource bundle.
 *
 * Each row also captures a best-effort source (component / file) extracted
 * from the JS stack at the time the key was requested.
 */
export default function I18nAuditPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<MissingKeyEntry[]>(getMissingKeys());

  useEffect(() => subscribeMissingKeys(setEntries), []);

  const handleRefresh = () => setEntries(getMissingKeys());
  const handleClear = () => clearMissingKeys();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {t("i18nAudit.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {t("i18nAudit.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
            {t("i18nAudit.refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5">
            <Trash2 className="w-4 h-4" />
            {t("i18nAudit.clear")}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("i18nAudit.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">{t("i18nAudit.key")}</th>
                  <th className="text-left px-4 py-3">{t("i18nAudit.languages")}</th>
                  <th className="text-left px-4 py-3">{t("i18nAudit.component")}</th>
                  <th className="text-left px-4 py-3">{t("i18nAudit.route")}</th>
                  <th className="text-left px-4 py-3">{t("i18nAudit.count")}</th>
                  <th className="text-left px-4 py-3">{t("i18nAudit.firstSeen")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.key} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-primary break-all max-w-[320px]">
                      <div>{e.key}</div>
                      {e.namespace && e.namespace !== "translation" && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          ns: {e.namespace}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {e.languages.map((l) => (
                          <Badge key={l} variant="outline" className="text-[10px] uppercase">
                            {l}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground break-all max-w-[220px]">
                      {e.component || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground break-all max-w-[220px]">
                      {e.route || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">{e.count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(e.firstSeen).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
