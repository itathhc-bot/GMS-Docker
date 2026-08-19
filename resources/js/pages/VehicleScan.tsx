import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Camera, Wifi, Monitor, Smartphone, Keyboard, AlertTriangle, CheckCircle, Search, XCircle,
  Loader2, Plus, Copy, History as HistoryIcon, Sparkles, Lightbulb, ScanLine, RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import VehicleHistoryDialog from "@/components/vehicles/VehicleHistoryDialog";
import QuickRegisterVehicleDialog from "@/components/vehicles/QuickRegisterVehicleDialog";
import WebcamOcrCapture from "@/components/scan/WebcamOcrCapture";
import { getVehicles } from "@/api/vehicles";
import { createSession, confirmPlate } from "@/api/scanning";
import { useEcho } from "@/hooks/useEcho";

interface ScanAttempt {
  id: string;
  plate: string | null;
  confidence: number | null;
  source: string | null;
  confirmed: boolean;
  created_at: string;
  thumbnail_url: string | null;
}

interface VehicleRow {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  asset_id: string | null;
  department: string | null;
  status: string;
  mileage: number | null;
  updated_at: string;
}

export default function VehicleScan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const canRegister = hasRole("admin") || hasRole("supervisor");

  const [manualPlate, setManualPlate] = useState("");
  const [scanMode, setScanMode] = useState<"ocr" | "device" | "manual">("ocr");
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [notFoundPlate, setNotFoundPlate] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [quickRegOpen, setQuickRegOpen] = useState(false);

  // Real device pairing via scan_sessions + realtime
  const [pairOpen, setPairOpen] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [paired, setPaired] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string>("");
  const channelRef = useRef<any>(null);

  // Auto session bootstrap state — feeds the OCR component and pairing flows
  const [autoSessionState, setAutoSessionState] = useState<
    "idle" | "creating" | "ready" | "error"
  >("idle");
  const [attempts, setAttempts] = useState<ScanAttempt[]>([]);
  const attemptsChannelRef = useRef<any>(null);
  const [confirmedPlate, setConfirmedPlate] = useState<string | null>(null);

  // The base URL for the companion scan QR.
  // Falls back to the current window origin.
  const PUBLIC_SCAN_HOST =
    (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, "") ||
    window.location.origin;

  const scanUrl = useMemo(() => {
    if (!pairCode) return "";
    return `${PUBLIC_SCAN_HOST}/scan/${pairCode}`;
  }, [pairCode]);

  const lookupPlate = async (rawPlate: string) => {
    const plate = rawPlate.trim().toUpperCase();
    if (!plate) return;
    setLooking(true);
    setNotFoundPlate(null);
    try {
      const data = await getVehicles({ plate_number: plate });
      const vehicleData = data[0];
      if (!vehicleData) {
        setVehicle(null);
        setNotFoundPlate(plate);
        toast.error(t("scan.notFoundToast", { plate }));
        return;
      }
      setVehicle(vehicleData as any);
    } catch (error) {
      toast.error(t("scan.lookupFailed"));
    } finally {
      setLooking(false);
    }
  };

  const handleManualLookup = () => lookupPlate(manualPlate);

  // Real device pairing — listen via realtime
  useEcho(pairCode ? `scan.${pairCode}` : null, 'ScanSessionUpdated', (payload: any) => {
    const row = payload.session || payload;
    if (row.status === "connected" && !paired) {
      setPaired(true);
      setPairing(false);
      setPairOpen(false);
      toast.success(t("scan.device.paired"));
    }
    if (row.last_plate) {
      setPairOpen(false);
      setPaired(true);
      setPairing(false);
      toast.success(t("scan.device.platePushed", { plate: row.last_plate }));
      lookupPlate(row.last_plate);
    }
  });

  useEcho(pairCode ? `scan.${pairCode}` : null, 'ScanAttemptCreated', (payload: any) => {
    const row = payload.attempt || payload;
    setAttempts((prev) => {
      if (prev.some((a) => a.id === row.id)) return prev;
      return [row, ...prev].slice(0, 20);
    });
  });

  const startPairing = async () => {
    if (paired) {
      setPaired(false);
      setSessionId(null);
      setPairCode("");
      toast.info(t("scan.device.unpaired"));
      return;
    }
    if (!user) {
      toast.error(t("scan.device.loginRequired"));
      return;
    }
    setPairing(true);
    try {
      const data = await createSession();
      setSessionId(data.sessionId);
      setPairCode(data.pairCode);
    } catch (error) {
      console.error(error);
      setPairing(false);
      toast.error(t("scan.device.startFailed"));
    }
  };

  // Regenerate the pairing QR / session
  const regeneratePairing = async () => {
    if (!user) {
      toast.error(t("scan.device.loginRequired"));
      return;
    }
    setPairing(true);
    try {
      const data = await createSession();
      setSessionId(data.sessionId);
      setPairCode(data.pairCode);
      setPaired(false);
      toast.success(t("scan.device.qrRegenerated"));
    } catch(e) {
      toast.error(t("scan.device.startFailed"));
    } finally {
      setPairing(false);
    }
  };

  // Bootstrap a scan session as soon as the user is known so OCR can run
  useEffect(() => {
    if (!user || sessionId || autoSessionState === "creating") return;
    let cancelled = false;
    (async () => {
      setAutoSessionState("creating");
      try {
        const data = await createSession();
        if (cancelled) return;
        setSessionId(data.sessionId);
        setPairCode(data.pairCode);
        setAutoSessionState("ready");
      } catch (error) {
        console.error("auto session create failed", error);
        setAutoSessionState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  // Attempt inserts are handled via useEcho above.
  useEffect(() => {
    if (!pairCode) {
      setAttempts([]);
      return;
    }
  }, [pairCode]);

  // Derived pairing state for the badge
  const pairingState: "creating" | "pairing" | "connected" | "ready" | "error" = paired
    ? "connected"
    : autoSessionState === "creating"
    ? "creating"
    : autoSessionState === "error"
    ? "error"
    : pairOpen && sessionId && !paired
    ? "pairing"
    : "ready";

  const pairingTone =
    pairingState === "connected"
      ? "bg-success text-success-foreground"
      : pairingState === "error"
      ? "bg-destructive text-destructive-foreground"
      : pairingState === "creating" || pairingState === "pairing"
      ? "bg-warning text-warning-foreground"
      : "bg-primary/10 text-primary";

  const pairingLabel = t(`scan.pairingState.${pairingState}`);

  const handlePlateConfirmed = async (plate: string) => {
    setConfirmedPlate(plate);
    if (pairCode) {
      try {
        const attempt = attempts.find(a => a.plate === plate);
        if (attempt) {
          await confirmPlate(pairCode, attempt.id);
          setAttempts((prev) =>
            prev.map((a) => (a.id === attempt.id ? { ...a, confirmed: true } : a)),
          );
        }
      } catch (e) {
        console.warn("Could not mark attempt confirmed", e);
      }
    }
    void lookupPlate(plate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("scan.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("scan.subtitle")}</p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
          {t("scan.screenId")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold">{t("scan.entryScan")}</CardTitle>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge className={`text-[10px] uppercase tracking-wider ${pairingTone}`}>
                  {pairingState === "creating" || pairingState === "pairing" ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : pairingState === "connected" ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : pairingState === "error" ? (
                    <XCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <ScanLine className="w-3 h-3 mr-1" />
                  )}
                  {pairingLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <WebcamOcrCapture
                sessionId={sessionId}
                disabled={autoSessionState !== "ready" && autoSessionState !== "idle"}
                onPlateDetected={() => { /* preview only */ }}
                onPlateConfirmed={(plate) => handlePlateConfirmed(plate)}
              />
              {confirmedPlate && (
                <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-success/10 border border-success/30">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                    <span className="text-muted-foreground">{t("scan.ocrCam.lockedFor")}:</span>
                    <span className="font-mono font-bold text-foreground">{confirmedPlate}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setConfirmedPlate(null)}
                  >
                    {t("scan.ocrCam.clearLock")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as typeof scanMode)}>
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="ocr" className="flex flex-col items-center gap-1 py-3 text-xs">
                <Camera className="w-4 h-4" />
                <span className="font-semibold">{t("scan.modes.ocr")}</span>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{t("scan.modes.ocrSub")}</span>
              </TabsTrigger>
              <TabsTrigger value="device" className="flex flex-col items-center gap-1 py-3 text-xs">
                <Smartphone className="w-4 h-4" />
                <span className="font-semibold">{t("scan.modes.device")}</span>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{t("scan.modes.deviceSub")}</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex flex-col items-center gap-1 py-3 text-xs">
                <Keyboard className="w-4 h-4" />
                <span className="font-semibold">{t("scan.modes.manual")}</span>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{t("scan.modes.manualSub")}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ocr" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-warning" />
                    {t("scan.ocrCam.howTo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <p>{t("scan.ocrCam.howStep1")}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <p>{t("scan.ocrCam.howStep2")}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <p>{t("scan.ocrCam.howStep3")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <HistoryIcon className="w-3.5 h-3.5" />
                    {t("scan.ocrCam.sessionHistory")}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {attempts.length}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {attempts.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-4 text-center">
                      {t("scan.ocrCam.historyEmpty")}
                    </p>
                  ) : (
                    <ScrollArea className="h-[220px]">
                      <ul className="divide-y divide-border">
                        {attempts.map((a) => (
                          <li
                            key={a.id}
                            className="px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-muted/40 cursor-pointer"
                            onClick={() => a.plate && lookupPlate(a.plate)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {a.thumbnail_url ? (
                                <img
                                  src={a.thumbnail_url}
                                  alt={a.plate ?? "scan attempt thumbnail"}
                                  loading="lazy"
                                  className="w-10 h-10 rounded object-cover border border-border shrink-0 bg-muted"
                                />
                              ) : a.confirmed ? (
                                <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                              ) : a.plate ? (
                                <ScanLine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-mono font-semibold truncate">
                                  {a.plate ?? t("scan.ocrCam.noPlate")}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(a.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {a.source && (
                                <Badge variant="outline" className="text-[9px] uppercase">
                                  {a.source === "gemini" && (
                                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                                  )}
                                  {a.source === "plate_recognizer"
                                    ? t("scan.ocrCam.sourcePR")
                                    : a.source === "gemini"
                                    ? t("scan.ocrCam.sourceAI")
                                    : a.source}
                                </Badge>
                              )}
                              {a.confidence != null && (
                                <span
                                  className={
                                    a.confidence >= 80
                                      ? "text-success"
                                      : a.confidence >= 60
                                      ? "text-warning"
                                      : "text-destructive"
                                  }
                                >
                                  {Math.round(a.confidence)}%
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="device" className="mt-4">
              <Card>
                <CardContent className="p-4 text-center space-y-3">
                  <Smartphone className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("scan.deviceHint")}</p>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant={paired ? "default" : "outline"} className={paired ? "bg-success text-success-foreground" : ""}>
                      {paired ? t("scan.device.connected") : t("scan.device.notConnected")}
                    </Badge>
                  </div>
                  <Button variant={paired ? "outline" : "default"} onClick={() => setPairOpen(true)}>
                    <Monitor className="w-4 h-4 mr-2" />
                    {paired ? t("scan.device.unpair") : t("scan.pairDevice")}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">{t("scan.manualHint")}</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("scan.platePlaceholder")}
                      className="font-mono text-lg tracking-wider"
                      value={manualPlate}
                      onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
                    />
                    <Button onClick={handleManualLookup} disabled={looking}>
                      {looking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      {t("scan.lookup")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("scan.protocols")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="text-primary font-bold mt-0.5">1.</span>
                <p>{t("scan.protocol1")}</p>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="text-primary font-bold mt-0.5">2.</span>
                <p>{t("scan.protocol2")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 text-warning">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t("scan.alerts")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-semibold text-foreground">{t("scan.lowVisibility")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{t("scan.lowVisibilityDesc")}</p>
            </CardContent>
          </Card>

          {notFoundPlate && !vehicle && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5" />
                  {t("scan.notFoundTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-foreground font-mono">{notFoundPlate}</p>
                <p className="text-[11px] text-muted-foreground">{t("scan.notFoundDesc")}</p>
                {canRegister && (
                  <Button
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setQuickRegOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {t("scan.quickRegister.action")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => navigate("/vehicles")}
                >
                  {t("scan.registerVehicle")}
                </Button>
              </CardContent>
            </Card>
          )}

          {vehicle && (
            <Card className="border-success/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-success flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {t("scan.vehicleFound")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div>
                  <p className="text-xl font-bold font-mono tracking-widest text-foreground">{vehicle.plate_number}</p>
                  <Badge className="mt-1 bg-success/10 text-success text-[10px]">{vehicle.status}</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  {[
                    [t("scan.fields.assetId"), vehicle.asset_id || "—"],
                    [t("scan.fields.makeModel"), [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"],
                    [t("scan.fields.department"), vehicle.department || "—"],
                    [t("scan.fields.vin"), vehicle.vin || "—"],
                    [t("scan.fields.lastService"), new Date(vehicle.updated_at).toLocaleDateString()],
                    [t("scan.fields.mileage"), vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} km` : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground font-mono truncate">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() =>
                      navigate("/job-cards", {
                        state: { openWizard: true, prefillPlate: vehicle.plate_number },
                      })
                    }
                  >
                    {t("scan.createJob")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => setHistoryOpen(true)}
                  >
                    {t("scan.viewHistory")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <VehicleHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        vehicleId={vehicle?.id ?? null}
        plateNumber={vehicle?.plate_number}
      />

      <QuickRegisterVehicleDialog
        open={quickRegOpen}
        onOpenChange={setQuickRegOpen}
        initialPlate={notFoundPlate ?? undefined}
        onCreated={(v) => {
          setNotFoundPlate(null);
          lookupPlate(v.plate_number);
        }}
      />

      <Dialog
        open={pairOpen}
        onOpenChange={(v) => {
          if (!v && sessionId && !paired) {
            setSessionId(null);
            setPairCode("");
            setPairing(false);
          }
          setPairOpen(v);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("scan.device.pairTitle")}</DialogTitle>
            <DialogDescription>{t("scan.device.pairDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!sessionId ? (
              <div className="text-center py-6">
                <Button onClick={startPairing} disabled={pairing} size="lg">
                  {pairing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("scan.device.starting")}
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 mr-2" />
                      {t("scan.device.startPairing")}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border bg-background p-4 flex justify-center">
                  <QRCodeSVG value={scanUrl} size={180} level="M" includeMargin />
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    {t("scan.device.pairCode")}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-2xl font-bold font-mono tracking-widest text-foreground">
                      {pairCode}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard?.writeText(scanUrl);
                        toast.success(t("scan.device.linkCopied"));
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 break-all">{scanUrl}</p>
                </div>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>{t("scan.device.step1qr")}</li>
                  <li>{t("scan.device.step2qr")}</li>
                  <li>{t("scan.device.step3qr")}</li>
                </ol>
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t("scan.device.waitingForPhone")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={regeneratePairing}
                  disabled={pairing}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-2 ${pairing ? "animate-spin" : ""}`} />
                  {t("scan.device.regenerateQr")}
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPairOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
