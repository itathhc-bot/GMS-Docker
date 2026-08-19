import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera, RefreshCw, Loader2, CheckCircle, VideoOff, Repeat, RotateCw, Lock, Sparkles, ScanLine,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import {
  isOcrPayload,
  getOcrErrorMessage,
  getOcrErrorCode,
  isValidMunicipalPlate,
  OCR_RETRY_COOLDOWN_MS,
  type OcrPayload,
} from "@/lib/ocr";
import { submitAttempt } from "@/api/scanning";

interface Props {
  onPlateConfirmed: (plate: string, confidence: number, source: string | null) => void;
  onPlateDetected?: (plate: string, confidence: number, source: string | null) => void;
  sessionId?: string | null;
  disabled?: boolean;
}

const AUTO_INTERVAL_MS = 2500;
const HIGH_CONFIDENCE = 80;

interface OcrResult {
  plate: string;
  confidence: number;
  source: string | null;
  at: number;
}

interface FailureState {
  message: string;
  code: string | null;
  at: number;
  attempt: number;
}

// Generate a small JPEG data URL thumbnail (~ max 240px wide) for history.
function makeThumbnail(canvas: HTMLCanvasElement, maxWidth = 240): string | null {
  try {
    const ratio = canvas.height / canvas.width;
    const w = Math.min(maxWidth, canvas.width);
    const h = Math.round(w * ratio);
    const thumb = document.createElement("canvas");
    thumb.width = w;
    thumb.height = h;
    const ctx = thumb.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, w, h);
    return thumb.toDataURL("image/jpeg", 0.6);
  } catch {
    return null;
  }
}

export default function WebcamOcrCapture({
  onPlateConfirmed,
  onPlateDetected,
  sessionId,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);
  const lastClickRef = useRef<number>(0);
  const attemptCountRef = useRef<number>(0);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<FailureState | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const sessionReady = !!sessionId && !disabled;

  const refreshDevices = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((d) => d.kind === "videoinput");
      setDevices(cams);
      if (!deviceId && cams[0]) setDeviceId(cams[0].deviceId);
    } catch {
      /* ignore */
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  };

  const startStream = async (id?: string) => {
    setError(null);
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: id
          ? { deviceId: { exact: id }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
      await refreshDevices();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera unavailable";
      setError(msg);
      toast.error(t("scan.ocrCam.permissionDenied"));
    }
  };

  useEffect(() => {
    refreshDevices();
    return () => {
      stopStream();
      if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
      if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active && deviceId) startStream(deviceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const grabFrame = (): { dataUrl: string; thumb: string | null } | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
      thumb: makeThumbnail(canvas),
    };
  };

  // Telemetry: persist a structured note via console + scan_attempts already
  // captures the raw outcome. This central log makes it easy to grep later.
  const logTelemetry = (
    outcome: "success" | "no-plate" | "error" | "validation",
    extra: Record<string, unknown>,
  ) => {
    const entry = {
      module: "ocr",
      outcome,
      sessionId,
      at: new Date().toISOString(),
      ...extra,
    };
    // eslint-disable-next-line no-console
    console.info("[ocr-telemetry]", entry);
  };

  const startCooldown = () => {
    if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
    setCooldownLeft(Math.ceil(OCR_RETRY_COOLDOWN_MS / 1000));
    const startedAt = Date.now();
    cooldownTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, Math.ceil((OCR_RETRY_COOLDOWN_MS - elapsed) / 1000));
      setCooldownLeft(left);
      if (left === 0 && cooldownTimerRef.current) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }, 250);
  };

  const captureAndRead = async (silent = false) => {
    if (busy) return;
    if (!sessionReady) {
      if (!silent) toast.error(t("scan.ocrCam.sessionNotReady"));
      return;
    }
    const frame = grabFrame();
    if (!frame) {
      if (!silent) toast.error(t("scan.ocrCam.noFrame"));
      return;
    }
    setBusy(true);
    setConfirmed(false);
    attemptCountRef.current += 1;
    const attemptNum = attemptCountRef.current;
    try {
      const formData = new FormData();
      formData.append("imageBase64", frame.dataUrl);
      if (frame.thumb) {
        formData.append("thumbnail", frame.thumb);
      }
      
      let payload: OcrPayload | null = null;
      try {
        const result: any = await submitAttempt(sessionId, formData);
        payload = {
          ok: true,
          plate: result.plateNumber,
          confidence: result.confidence || 99,
          source: result.source || "gemini",
        };
      } catch (e: any) {
        payload = { ok: false, error: e.message || "Failed to process image" };
      }

      if (payload && payload.ok === false) {
        const msg = getOcrErrorMessage(payload, t("scan.ocrCam.noPlate"));
        const code = getOcrErrorCode(payload);
        if (!silent) toast.error(msg);
        setFailure({ message: msg, code, at: Date.now(), attempt: attemptNum });
        logTelemetry(code === "NO_PLATE_DETECTED" ? "no-plate" : "error", {
          code,
          message: msg,
        });
        startCooldown();
        return;
      }

      if (!payload || payload.ok !== true) {
        const msg = t("scan.ocrCam.readFailed");
        if (!silent) toast.error(msg);
        setFailure({ message: msg, code: "INVALID_RESPONSE", at: Date.now(), attempt: attemptNum });
        logTelemetry("error", { code: "INVALID_RESPONSE" });
        startCooldown();
        return;
      }

      const { plate, confidence, source } = payload;
      if (!plate) {
        const msg = t("scan.ocrCam.noPlate");
        if (!silent) toast.error(msg);
        setFailure({ message: msg, code: "NO_PLATE_DETECTED", at: Date.now(), attempt: attemptNum });
        logTelemetry("no-plate", { confidence });
        startCooldown();
        return;
      }
      const next: OcrResult = {
        plate,
        confidence: confidence ?? 0,
        source: source ?? null,
        at: Date.now(),
      };
      setResult(next);
      setFailure(null);
      onPlateDetected?.(plate, next.confidence, next.source);
      logTelemetry("success", { plate, confidence: next.confidence, source: next.source });
      if (silent && next.confidence >= HIGH_CONFIDENCE && isValidMunicipalPlate(plate)) {
        setAuto(false);
        setConfirmed(true);
        onPlateConfirmed(plate, next.confidence, next.source);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("scan.ocrCam.readFailed");
      if (!silent) toast.error(msg);
      setFailure({ message: msg, code: "EXCEPTION", at: Date.now(), attempt: attemptNum });
      logTelemetry("error", { code: "EXCEPTION", message: msg });
      startCooldown();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (auto && active && sessionReady) {
      autoTimerRef.current = window.setInterval(() => {
        void captureAndRead(true);
      }, AUTO_INTERVAL_MS);
    }
    return () => {
      if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, active, sessionReady]);

  useEffect(() => {
    if (!sessionReady && auto) setAuto(false);
  }, [sessionReady, auto]);

  const plateIsValid = result ? isValidMunicipalPlate(result.plate) : false;

  const handleConfirm = () => {
    if (!result) return;
    if (!plateIsValid) {
      toast.error(t("scan.ocrCam.invalidFormat"));
      logTelemetry("validation", { plate: result.plate, code: "INVALID_FORMAT" });
      return;
    }
    setConfirmed(true);
    onPlateConfirmed(result.plate, result.confidence, result.source);
  };

  // Debounce rapid retry clicks (300ms) to prevent double-triggering on touch devices.
  const handleRetry = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    lastClickRef.current = now;
    if (cooldownLeft > 0) return;
    void captureAndRead(false);
  };

  const sourceLabel = (s: string | null) => {
    if (!s) return null;
    if (s === "plate_recognizer") return t("scan.ocrCam.sourcePR");
    if (s === "gemini") return t("scan.ocrCam.sourceAI");
    return s;
  };

  const confidenceTone =
    result == null
      ? "text-muted-foreground"
      : result.confidence >= HIGH_CONFIDENCE
      ? "text-success"
      : result.confidence >= 60
      ? "text-warning"
      : "text-destructive";

  const retryDisabled = busy || !sessionReady || cooldownLeft > 0;

  return (
    <div className="space-y-3">
      <div className="relative bg-muted aspect-video rounded-lg overflow-hidden border">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background/40 backdrop-blur-sm">
            <VideoOff className="w-10 h-10" />
            <p className="text-xs text-center max-w-[80%]">
              {error || t("scan.ocrCam.cameraOff")}
            </p>
            <Button size="sm" onClick={() => startStream(deviceId)} disabled={!sessionReady}>
              <Camera className="w-4 h-4 mr-2" />
              {t("scan.ocrCam.startCamera")}
            </Button>
            {!sessionReady && (
              <p className="text-[10px] text-warning">{t("scan.ocrCam.sessionNotReady")}</p>
            )}
          </div>
        )}

        {active && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-background/80 backdrop-blur text-[10px] font-mono uppercase tracking-wider"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {t("scan.ocrCam.running")}
                </>
              ) : auto ? (
                <>
                  <ScanLine className="w-3 h-3 mr-1 animate-pulse" />
                  {t("scan.ocrCam.scanning")}
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3 mr-1" />
                  {t("scan.ocrCam.idle")}
                </>
              )}
            </Badge>
            {confirmed && result && (
              <Badge className="bg-success text-success-foreground text-[10px]">
                <Lock className="w-3 h-3 mr-1" />
                {t("scan.ocrCam.locked")}
              </Badge>
            )}
          </div>
        )}

        {/* Persistent failure overlay with retry countdown */}
        {active && failure && !result && (
          <div className="absolute top-12 left-3 right-3 bg-destructive/15 backdrop-blur-sm border border-destructive/40 rounded-md px-3 py-2 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-destructive">
                  {t("scan.ocrCam.lastFailure")}
                  {failure.code ? ` · ${failure.code}` : ""}
                </p>
                <p className="text-foreground/90 truncate">{failure.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t("scan.ocrCam.attemptN", { n: failure.attempt })}
                  {cooldownLeft > 0
                    ? ` · ${t("scan.ocrCam.retryIn", { seconds: cooldownLeft })}`
                    : ` · ${t("scan.ocrCam.canRetry")}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2"
                onClick={handleRetry}
                disabled={retryDisabled}
              >
                <RotateCw className="w-3 h-3 mr-1" />
                {cooldownLeft > 0 ? `${cooldownLeft}s` : t("scan.ocrCam.retry")}
              </Button>
            </div>
          </div>
        )}

        {active && result && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border border-primary/40 rounded-md px-3 py-2 text-center min-w-[220px]">
            <div className="flex items-center justify-center gap-2">
              <p className="text-[10px] font-mono text-primary uppercase tracking-wider">
                {t("scan.ocrCam.lastRead")}
              </p>
              {result.source && (
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0"
                >
                  {result.source === "gemini" && <Sparkles className="w-2.5 h-2.5 mr-1" />}
                  {sourceLabel(result.source)}
                </Badge>
              )}
            </div>
            <p className="text-base font-bold font-mono tracking-widest">{result.plate}</p>
            <p className={`text-[10px] ${confidenceTone}`}>
              {t("scan.confidence")}: {result.confidence}%
            </p>
            {!plateIsValid && (
              <p className="text-[10px] text-warning mt-1">{t("scan.ocrCam.invalidFormat")}</p>
            )}
            <div className="flex gap-1.5 mt-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px]"
                onClick={handleRetry}
                disabled={retryDisabled}
              >
                <RotateCw className="w-3 h-3 mr-1" />
                {cooldownLeft > 0
                  ? t("scan.ocrCam.retryIn", { seconds: cooldownLeft })
                  : t("scan.ocrCam.retry")}
              </Button>
              <Button
                size="sm"
                className="h-7 text-[10px]"
                onClick={handleConfirm}
                disabled={confirmed || busy || !plateIsValid}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {confirmed ? t("scan.ocrCam.confirmed") : t("scan.ocrCam.confirm")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex-1 min-w-0">
          <Select
            value={deviceId}
            onValueChange={(v) => setDeviceId(v)}
            disabled={devices.length === 0}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("scan.ocrCam.selectCamera")} />
            </SelectTrigger>
            <SelectContent>
              {devices.length === 0 && (
                <SelectItem value="none" disabled>
                  {t("scan.ocrCam.noCameras")}
                </SelectItem>
              )}
              {devices.map((d, i) => (
                <SelectItem key={d.deviceId || i} value={d.deviceId || `cam-${i}`}>
                  {d.label || `${t("scan.ocrCam.camera")} ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={refreshDevices} type="button">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("scan.ocrCam.refresh")}
        </Button>
        {active ? (
          <Button variant="outline" size="sm" onClick={stopStream} type="button">
            <VideoOff className="w-4 h-4 mr-2" />
            {t("scan.ocrCam.stop")}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => startStream(deviceId)}
            type="button"
            disabled={!sessionReady}
          >
            <Camera className="w-4 h-4 mr-2" />
            {t("scan.ocrCam.startCamera")}
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1 border-t">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-capture"
            checked={auto}
            onCheckedChange={setAuto}
            disabled={!active || !sessionReady}
          />
          <Label htmlFor="auto-capture" className="text-xs cursor-pointer">
            <span className="inline-flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              {t("scan.ocrCam.autoCapture")}
            </span>
          </Label>
          {auto && (
            <Badge variant="outline" className="text-[10px]">
              {t("scan.ocrCam.every", { seconds: Math.round(AUTO_INTERVAL_MS / 1000) })}
            </Badge>
          )}
        </div>
        <Button
          onClick={() => captureAndRead(false)}
          disabled={!active || busy || !sessionReady || cooldownLeft > 0}
          size="sm"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          {cooldownLeft > 0
            ? t("scan.ocrCam.retryIn", { seconds: cooldownLeft })
            : t("scan.ocrCam.capture")}
        </Button>
      </div>
    </div>
  );
}
