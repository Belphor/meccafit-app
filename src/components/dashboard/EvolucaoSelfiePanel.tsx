"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import {
  DASHBOARD_ACTION_BUTTON,
  DASHBOARD_INNER_FRAME,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_TITLE,
  MAGMA_SPECTRUM,
} from "@/lib/dashboard-config";
import {
  bindStreamToVideo,
  captureVideoFrameDataUrl,
  formatCameraError,
  requestFrontCameraStream,
  stopMediaStream,
} from "@/lib/camera-capture";

const SOLAR_GOLD = MAGMA_SPECTRUM.solarGold;

function applyCinemaFrame(context: CanvasRenderingContext2D, width: number, height: number) {
  const vignette = context.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.2,
    width / 2,
    height / 2,
    height * 0.82,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.68, "rgba(0,0,0,0.18)");
  vignette.addColorStop(1, "rgba(0,0,0,0.68)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  context.font = "600 26px Georgia, serif";
  context.fillStyle = "rgba(255, 184, 0, 0.95)";
  context.textAlign = "center";
  context.fillText("FENYXIA", width / 2, height - 28);
}

export function EvolucaoSelfiePanel({
  onCapture,
  onClose,
}: {
  /** Quando definido, entrega o data URL capturado em vez de só preview local */
  onCapture?: (dataUrl: string) => void;
  onClose?: () => void;
} = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await requestFrontCameraStream();

        if (!mounted) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          await bindStreamToVideo(videoRef.current, stream);
        }
        setIsCameraReady(true);
        setCameraError(null);
      } catch (error) {
        if (!mounted) return;
        setCameraError(formatCameraError(error));
        setIsCameraReady(false);
      }
    }

    void startCamera();

    return () => {
      mounted = false;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const captureSelfie = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const dataUrl = captureVideoFrameDataUrl(video, { mirror: true });
    const snapshot = document.createElement("canvas");
    snapshot.width = video.videoWidth;
    snapshot.height = video.videoHeight;
    const snapshotCtx = snapshot.getContext("2d");
    if (!snapshotCtx) return;

    const snapshotImage = new window.Image();
    snapshotImage.onload = () => {
      snapshotCtx.drawImage(snapshotImage, 0, 0);
      applyCinemaFrame(snapshotCtx, snapshot.width, snapshot.height);
      const framedUrl = snapshot.toDataURL("image/png");
      setCaptureUrl(framedUrl);
      onCapture?.(framedUrl);
    };
    snapshotImage.src = dataUrl;
  }, [onCapture]);

  const downloadSelfie = useCallback(() => {
    if (!captureUrl) return;
    const anchor = document.createElement("a");
    anchor.href = captureUrl;
    anchor.download = "fenyxia-selfie-evolucao.png";
    anchor.click();
  }, [captureUrl]);

  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="evolucao-tab-title"
    >
      <DashboardPanelHeader chip="Selfie de ciclo" meta="Registro visual" />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-b border-orange-500/10 pb-4">
        <div>
          <h2 id="evolucao-tab-title" className={DASHBOARD_SECTION_TITLE}>
            Selfie FENYXIA
          </h2>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-neutral-600">
            Vinheta cinema · Solar Gold
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className={`${DASHBOARD_ACTION_BUTTON} shrink-0 px-4 py-2`}
            aria-label="Fechar selfie FENYXIA"
          >
            Fechar
          </button>
        ) : null}
      </div>

      <div
        className={`relative mt-6 aspect-[4/5] max-h-[min(58vh,480px)] w-full overflow-hidden sm:max-h-[min(72vh,520px)] ${DASHBOARD_INNER_FRAME} p-0`}
        data-particle-anchor="selfie-frame"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full scale-x-[-1] object-cover"
          aria-label="Pré-visualização da câmera frontal"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.62)_100%)]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4 pt-10"
          aria-hidden="true"
        >
          <p className="font-serif text-lg tracking-[0.34em]" style={{ color: SOLAR_GOLD }}>
            FENYXIA
          </p>
        </div>

        {!isCameraReady && !cameraError ? (
          <p
            className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.22em]"
            style={{ color: `${SOLAR_GOLD}b3` }}
          >
            Acendendo câmera...
          </p>
        ) : null}
        {cameraError ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/50">
            {cameraError}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!isCameraReady}
          onClick={captureSelfie}
          className={`${DASHBOARD_ACTION_BUTTON} justify-center`}
        >
          Capturar selfie
        </button>
        <button
          type="button"
          disabled={!captureUrl}
          onClick={downloadSelfie}
          className={`${DASHBOARD_ACTION_BUTTON} justify-center disabled:opacity-40`}
        >
          Salvar no dispositivo
        </button>
      </div>

      {captureUrl ? (
        <Image
          src={captureUrl}
          alt="Selfie FENYXIA capturada"
          width={640}
          height={480}
          unoptimized
          className="mt-4 max-h-52 w-full rounded-xl border border-orange-500/15 object-contain sm:max-h-40"
        />
      ) : null}
    </BrasaVivaCard>
  );
}
