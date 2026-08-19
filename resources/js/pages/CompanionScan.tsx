import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { getSession, submitAttempt } from "@/api/scanning";

interface SessionRow {
  id: string;
  status: string;
  last_plate: string | null;
  last_confidence: number | null;
  expires_at: string;
}

export default function CompanionScan() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [lastResult, setLastResult] = useState<{ plate: string; confidence: number } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const data = await getSession(sessionId);
        setSession(data as any);
      } catch (error) {
        setSession(null);
      } finally {
        setLoadingSession(false);
      }
    })();
  }, [sessionId]);

  // Start camera
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch (e) {
        console.error("getUserMedia failed", e);
        setCameraError(t("companionScan.cameraDenied"));
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
      }
    };
  }, [t]);

  const captureAndSend = async () => {
    if (!videoRef.current || !sessionId) return;
    const video = videoRef.current;
    if (!video.videoWidth) {
      toast.error(t("companionScan.notReady"));
      return;
    }
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      // Cap longest side at 1280 to keep payload small
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      const formData = new FormData();
      formData.append("imageBase64", dataUrl);
      
      const payload: any = await submitAttempt(sessionId, formData);

      if (!payload || !payload.plateNumber) {
        toast.error(t("companionScan.noPlate"));
        return;
      }
      const result = { plate: payload.plateNumber, confidence: payload.confidence || 99 };
      setLastResult(result);
      toast.success(t("companionScan.sent", { plate: result.plate }));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || t("companionScan.failed"));
    } finally {
      setCapturing(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="text-lg font-semibold">{t("companionScan.invalidTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("companionScan.invalidDesc")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expired = new Date(session.expires_at).getTime() < Date.now();
  const closed = session.status === "closed" || expired;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{t("companionScan.title")}</h1>
          <p className="text-[11px] text-muted-foreground">
            {t("companionScan.session")}: {session.id.slice(0, 8)}
          </p>
        </div>
        <Badge variant={closed ? "destructive" : "default"} className="text-[10px]">
          {closed ? t("companionScan.closed") : t("companionScan.active")}
        </Badge>
      </header>

      <main className="flex-1 flex flex-col">
        <div className="relative bg-foreground/95 aspect-[3/4] sm:aspect-video w-full overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center text-primary-foreground/70">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-primary-foreground">
              <p className="text-sm">{cameraError}</p>
            </div>
          )}
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-24 border-2 border-dashed border-primary/70 rounded-lg pointer-events-none" />
        </div>

        <div className="p-4 space-y-3">
          {lastResult && (
            <Card className="border-success/40">
              <CardContent className="pt-4 space-y-1 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("companionScan.lastSent")}
                </p>
                <p className="text-2xl font-bold font-mono tracking-widest">{lastResult.plate}</p>
                <p className="text-xs text-muted-foreground">
                  {t("companionScan.confidence")}: {Math.round(lastResult.confidence)}%
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            className="w-full h-14 text-base"
            onClick={captureAndSend}
            disabled={capturing || closed || !cameraReady}
          >
            {capturing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t("companionScan.processing")}
              </>
            ) : lastResult ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                {t("companionScan.scanAgain")}
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                {t("companionScan.capture")}
              </>
            )}
          </Button>

          {closed && (
            <p className="text-xs text-center text-destructive">
              {t("companionScan.sessionClosed")}
            </p>
          )}

          <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {t("companionScan.tip")}
          </p>
        </div>
      </main>
    </div>
  );
}
