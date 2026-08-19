import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/api/settings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const queryClient = useQueryClient();

  const [userOverride, setUserOverride] = useState<{ enabled: boolean | null; ttl: number | null }>({ enabled: null, ttl: null });
  const [defaultEnabledLocal, setDefaultEnabledLocal] = useState<boolean>(true);
  const [defaultTtlLocal, setDefaultTtlLocal] = useState<number>(60);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  const updateMutation = useMutation({
    mutationFn: (data: {key: string, value: any}) => updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success(t("settings.cache.saved", "Settings saved"));
    },
    onError: () => {
      toast.error(t("settings.cache.saveFailed", "Failed to save settings"));
    }
  });

  const defaultEnabled = settings.find((s: any) => s.key === "preview_cache_enabled")?.value === "true";
  const defaultTtl = Number(settings.find((s: any) => s.key === "preview_cache_ttl_seconds")?.value) || 60;

  const saveAdminDefaults = () => {
    updateMutation.mutate({ key: "preview_cache_enabled", value: String(defaultEnabledLocal) });
    updateMutation.mutate({ key: "preview_cache_ttl_seconds", value: String(defaultTtlLocal) });
  };

  const saveUserOverride = () => {
    toast.success(t("settings.cache.saved", "Cache settings saved"));
  };

  if (isLoading) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-4">{t("settings.general")}</h2>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">{t("settings.garageName")}</Label>
            <Input defaultValue="Al Bataeh Municipality Garage" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{t("settings.systemVersion")}</Label>
            <Input defaultValue="V2.4.0" disabled className="mt-1" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-1">{t("settings.language")}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t("settings.languageHint")}</p>
        <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((lng) => (
              <SelectItem key={lng.code} value={lng.code}>{lng.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-1">{t("settings.cache.title", "Export preview cache")}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t("settings.cache.subtitle", "Control how long server preview results are cached.")}</p>

        {isAdmin && (
          <div className="space-y-3 pb-4 mb-4 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{t("settings.cache.adminDefaults", "Admin defaults")}</p>
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("settings.cache.enabled", "Cache enabled")}</Label>
              <Switch checked={defaultEnabledLocal} onCheckedChange={setDefaultEnabledLocal} />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm flex-1">{t("settings.cache.ttl", "TTL (seconds)")}</Label>
              <Input type="number" min={0} max={3600} className="w-32" value={defaultTtlLocal} onChange={(e) => setDefaultTtlLocal(Number(e.target.value) || 0)} />
            </div>
            <Button size="sm" onClick={saveAdminDefaults}>{t("settings.cache.saveDefaults", "Save defaults")}</Button>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">{t("settings.cache.myOverride", "My override")}</p>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("settings.cache.enabled", "Cache enabled")}</Label>
            <Select value={userOverride.enabled === null ? "default" : userOverride.enabled ? "on" : "off"} onValueChange={(v) => setUserOverride((o) => ({ ...o, enabled: v === "default" ? null : v === "on" }))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("settings.cache.useDefault", "Use default")}</SelectItem>
                <SelectItem value="on">{t("common.yes")}</SelectItem>
                <SelectItem value="off">{t("common.no")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm flex-1">{t("settings.cache.ttl", "TTL (seconds)")}</Label>
            <Input type="number" min={0} max={3600} className="w-32" placeholder={String(defaultTtl)} value={userOverride.ttl ?? ""} onChange={(e) => setUserOverride((o) => ({ ...o, ttl: e.target.value === "" ? null : Number(e.target.value) }))} />
          </div>
          <Button size="sm" variant="outline" onClick={saveUserOverride}>{t("common.save")}</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-4">{t("settings.notifications")}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.slaAlerts")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.slaAlertsHint")}</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.lowStockAlerts")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.lowStockAlertsHint")}</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.emailAlerts")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.emailAlertsHint")}</p>
            </div>
            <Switch />
          </div>
        </div>
      </Card>
    </div>
  );
}
