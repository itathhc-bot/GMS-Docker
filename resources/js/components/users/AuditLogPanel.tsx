import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/api/client";
import { formatDistanceToNow } from "date-fns";
import { ar as arLocale } from "date-fns/locale";

type ActionType =
  | "user_created"
  | "role_assigned"
  | "role_removed"
  | "user_deactivated"
  | "user_reactivated"
  | "password_reset_sent"
  | "password_set"
  | "preview_retry"
  | "preview_local_fallback";

interface AuditEntry {
  id: string;
  actor_user_id: string;
  actor_name: string | null;
  target_user_id: string | null;
  target_name: string | null;
  action: ActionType;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLOR: Record<ActionType, string> = {
  user_created: "bg-green-500/10 text-green-600",
  role_assigned: "bg-primary/10 text-primary",
  role_removed: "bg-orange-500/10 text-orange-600",
  user_deactivated: "bg-destructive/10 text-destructive",
  user_reactivated: "bg-green-500/10 text-green-600",
  password_reset_sent: "bg-blue-500/10 text-blue-600",
  password_set: "bg-blue-500/10 text-blue-600",
  preview_retry: "bg-amber-500/10 text-amber-600",
  preview_local_fallback: "bg-muted text-muted-foreground",
};

interface Props {
  refreshKey?: number;
}

export default function AuditLogPanel({ refreshKey = 0 }: Props) {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/admin-audit-log', { params: { limit: 20, sort: '-created_at' } });
        if (!active) return;
        setEntries(data as AuditEntry[]);
      } catch (error) {
        // Handle error
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const dateLocale = i18n.language === "ar" ? arLocale : undefined;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{t("users.audit.title")}</h2>
        <span className="text-xs text-muted-foreground ml-auto">{t("users.audit.last")}</span>
      </div>

      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">{t("users.audit.loading")}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          {t("users.audit.empty")}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => {
            const details = (e.details ?? {}) as { role?: string; email?: string };
            return (
              <li key={e.id} className="py-2.5 flex items-start gap-3 text-sm">
                <Badge
                  variant="outline"
                  className={`${ACTION_COLOR[e.action]} border-none text-[10px] shrink-0 mt-0.5`}
                >
                  {t(`users.audit.actions.${e.action}`)}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    <span className="font-medium">{e.actor_name ?? t("users.roles.admin")}</span>
                    {e.target_name && (
                      <>
                        <span className="text-muted-foreground"> → </span>
                        <span className="font-medium">{e.target_name}</span>
                      </>
                    )}
                    {details.role && (
                      <span className="text-muted-foreground"> ({t(`users.roles.${details.role}`, details.role)})</span>
                    )}
                  </div>
                  {details.email && (
                    <div className="text-xs text-muted-foreground truncate">{details.email}</div>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: dateLocale })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
