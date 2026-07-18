"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CYCLE_SELFIE_DAY_IDS,
  CYCLE_SELFIE_SLOTS,
  CYCLE_SELFIE_UPDATED_EVENT,
  dataUrlToFile,
  getCycleSelfiePathById,
  resolveCycleSelfieDayLabel,
  saveCycleSelfie,
  type CycleSelfieDay,
} from "@/services/local-storage";
import { DashboardClientInfoBlock } from "@/components/dashboard/DashboardClientInfoBlock";
import {
  bindStreamToVideo,
  captureVideoFrameDataUrl,
  formatCameraError,
  requestAnyCameraStream,
  stopMediaStream,
} from "@/lib/camera-capture";
import {
  DASHBOARD_INNER_FRAME,
  DASHBOARD_TAP_TARGET,
} from "@/lib/dashboard-config";
import { LoreEm } from "@/lib/lore-emphasis";

type CycleSlotState = Record<CycleSelfieDay, string | null>;

type StorageStatus = "loading" | "ready" | "blocked";

const DEFAULT_SLOT_STATE: CycleSlotState = {
  1: null,
  30: null,
};

function HudSelfiePlaceholder({ label, animate }: { label: string; animate?: boolean }) {
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#050508] ${animate ? "animate-pulse" : ""
        }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 280"
        className="h-[68%] w-auto max-w-[72%] text-cyan-500/35"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="100" cy="52" rx="28" ry="34" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M72 92 C58 118 52 156 54 198 C56 228 62 252 68 264 M128 92 C142 118 148 156 146 198 C144 228 138 252 132 264"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M78 96 C88 88 112 88 122 96 C128 118 126 148 100 158 C74 148 72 118 78 96 Z"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.7"
        />
        <path
          d="M100 52 L100 158 M72 120 L128 120 M80 188 L120 188"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.45"
        />
        <circle cx="100" cy="210" r="22" stroke="currentColor" strokeWidth="0.9" opacity="0.35" />
        <path
          d="M88 210 L100 198 L112 210 L100 222 Z"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.5"
        />
      </svg>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400/55">
        {label}
      </p>
      <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-neutral-600">
        HUD · aguardando captura local
      </p>
    </div>
  );
}

function SlotPhotoOrPlaceholder({
  src,
  label,
  animate,
}: {
  src: string | null;
  label: string;
  animate?: boolean;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- src local blob:// capacitor://
      <img
        src={src}
        alt={`Selfie ${label}`}
        className="h-full w-full object-cover"
        draggable={false}
      />
    );
  }
  return <HudSelfiePlaceholder label={label} animate={animate} />;
}

async function loadCycleSlots(): Promise<{ slots: CycleSlotState; blocked: boolean }> {
  const slots: CycleSlotState = { ...DEFAULT_SLOT_STATE };
  let blocked = false;

  try {
    const entries = await Promise.all(
      (Object.keys(CYCLE_SELFIE_DAY_IDS) as unknown as CycleSelfieDay[]).map(async (day) => {
        const id = CYCLE_SELFIE_DAY_IDS[day];
        const src = await getCycleSelfiePathById(id);
        return [day, src] as const;
      }),
    );

    for (const [day, src] of entries) {
      slots[day] = src;
    }
  } catch {
    blocked = true;
  }

  return { slots, blocked };
}

type SelfieComparisonProps = {
  className?: string;
};

export function SelfieComparison({ className = "" }: SelfieComparisonProps) {
  const rootId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const cameraInputRefs = useRef<Partial<Record<CycleSelfieDay, HTMLInputElement | null>>>({});
  const galleryInputRefs = useRef<Partial<Record<CycleSelfieDay, HTMLInputElement | null>>>({});
  const [slots, setSlots] = useState<CycleSlotState>(DEFAULT_SLOT_STATE);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  const [sliderPercent, setSliderPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [captureBusy, setCaptureBusy] = useState<CycleSelfieDay | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dayStartLabel = resolveCycleSelfieDayLabel(1);
  const dayEndLabel = resolveCycleSelfieDayLabel(30);
  const dayLabels: Record<CycleSelfieDay, string> = {
    1: dayStartLabel,
    30: dayEndLabel,
  };

  const day1Src = slots[1];
  const dayEndSrc = slots[30];
  const canCompare = Boolean(day1Src && dayEndSrc) && storageStatus !== "blocked";
  const hasAnyPhoto = Boolean(day1Src || dayEndSrc);
  const showBlockedPlaceholders = storageStatus === "blocked";

  const refreshSlots = useCallback(async () => {
    setStorageStatus("loading");
    try {
      const { slots: next, blocked } = await loadCycleSlots();
      setSlots(next);
      setStorageStatus(blocked ? "blocked" : "ready");
    } catch {
      setSlots(DEFAULT_SLOT_STATE);
      setStorageStatus("blocked");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refreshSlots();
    });

    return () => {
      cancelled = true;
    };
  }, [refreshSlots]);

  useEffect(() => {
    const onUpdated = () => {
      void refreshSlots();
    };
    window.addEventListener(CYCLE_SELFIE_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(CYCLE_SELFIE_UPDATED_EVENT, onUpdated);
  }, [refreshSlots]);

  const updateSliderFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.min(92, Math.max(8, ratio * 100));
    setSliderPercent(clamped);
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canCompare) return;
      event.preventDefault();
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      updateSliderFromClientX(event.clientX);
    },
    [canCompare, updateSliderFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isDragging) return;
      updateSliderFromClientX(event.clientX);
    },
    [isDragging, updateSliderFromClientX],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const handleCaptureFile = useCallback(
    async (day: CycleSelfieDay, file: File | null | undefined) => {
      if (!file) return;

      if (!file.type.startsWith("image/") && file.type !== "") {
        setFeedback("Selecione um arquivo de imagem.");
        return;
      }

      setCaptureBusy(day);
      setFeedback(null);

      try {
        const id = CYCLE_SELFIE_DAY_IDS[day];
        const saved = await saveCycleSelfie(id, file);
        if (!saved) {
          setStorageStatus("blocked");
          setFeedback("Armazenamento local indisponível. Use o modo normal do navegador.");
          return;
        }
        const src = await getCycleSelfiePathById(id);
        if (!src) {
          setFeedback("Foto gravada, mas não foi possível exibir. Recarregue a aba.");
          await refreshSlots();
          return;
        }
        setSlots((prev) => ({ ...prev, [day]: src }));
        setStorageStatus("ready");
        setFeedback(`${resolveCycleSelfieDayLabel(day)} gravado no disco local.`);
      } catch {
        setStorageStatus("blocked");
        setFeedback("Armazenamento local indisponível. Use o modo normal do navegador.");
      } finally {
        setCaptureBusy(null);
      }
    },
    [refreshSlots],
  );

  const handleDataUrlCapture = useCallback(
    async (day: CycleSelfieDay, dataUrl: string) => {
      try {
        const file = await dataUrlToFile(dataUrl, `selfie_dia_${day}.jpg`);
        if (!file) {
          setFeedback("Falha ao processar a imagem capturada.");
          return;
        }
        await handleCaptureFile(day, file);
      } catch {
        setFeedback("Erro ao persistir selfie localmente.");
      }
    },
    [handleCaptureFile],
  );

  const openCameraForDay = useCallback(
    async (day: CycleSelfieDay) => {
      setFeedback(null);
      setCaptureBusy(day);

      let stream: MediaStream | null = null;
      const video = document.createElement("video");

      try {
        stream = await requestAnyCameraStream();
        await bindStreamToVideo(video, stream);

        const dataUrl = captureVideoFrameDataUrl(video, { mirror: true });
        await handleDataUrlCapture(day, dataUrl);
      } catch (error) {
        setFeedback(
          `${formatCameraError(error)} Abrindo seletor de câmera/galeria…`,
        );
        cameraInputRefs.current[day]?.click();
      } finally {
        stopMediaStream(stream);
        video.srcObject = null;
        setCaptureBusy(null);
      }
    },
    [handleDataUrlCapture],
  );

  return (
    <section
      className={`space-y-4 ${className}`}
      aria-labelledby={`${rootId}-title`}
      data-storage-status={storageStatus}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            id={`${rootId}-title`}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400/85"
          >
            Comparação de Ciclo
          </h3>
          <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
            Zero upload na nuvem
          </p>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          {storageStatus === "blocked"
            ? "IndexedDB bloqueado"
            : canCompare
              ? "Arraste o divisor"
              : hasAnyPhoto
                ? "Capture o outro dia para comparar"
                : `Capture ${dayStartLabel} e ${dayEndLabel}`}
        </p>
      </div>

      <DashboardClientInfoBlock label="Como comparar">
        Espelho do ciclo mensal no calendário de Brasília. Capture no{" "}
        <LoreEm>primeiro dia útil</LoreEm> do mês, de segunda a sexta, e no{" "}
        <LoreEm>último dia do mês</LoreEm>, com a mesma pose e a mesma luz. Se o dia 1 cair no
        domingo ou no sábado, a captura do início passa para a próxima segunda. Com início e fim
        gravados, arraste o divisor para comparar. As fotos ficam só no seu dispositivo.
      </DashboardClientInfoBlock>

      <div
        ref={frameRef}
        className={`relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-cyan-500/20 bg-black/60 shadow-[0_0_24px_rgba(6,182,212,0.08)] backdrop-blur-md ${DASHBOARD_INNER_FRAME} p-0`}
        role="img"
        aria-label="Comparação antes e depois do ciclo de evolução"
      >
        {showBlockedPlaceholders ? (
          <div className="grid h-full w-full grid-cols-2">
            <div className="border-r border-cyan-500/10">
              <HudSelfiePlaceholder label={dayStartLabel} />
            </div>
            <HudSelfiePlaceholder label={dayEndLabel} />
          </div>
        ) : canCompare ? (
          <>
            {/* Base · último dia do mês (direita) */}
            {/* eslint-disable-next-line @next/next/no-img-element -- src local blob:// capacitor:// */}
            <img
              src={dayEndSrc ?? undefined}
              alt={`Selfie ${dayEndLabel}`}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />

            {/* Overlay · Dia 1 (esquerda) com clip dinâmico */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPercent}% 0 0)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={day1Src ?? undefined}
                alt={`Selfie ${dayStartLabel}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>

            {/* Divisor central arrastável */}
            <button
              type="button"
              role="slider"
              className={`absolute top-0 z-20 flex h-full w-11 -translate-x-1/2 cursor-ew-resize touch-none flex-col items-center justify-center border-0 bg-transparent p-0 outline-none ${isDragging ? "scale-105" : ""
                }`}
              style={{ left: `${sliderPercent}%` }}
              aria-label="Arrastar divisor de comparação"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliderPercent)}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <span className="h-full w-px bg-gradient-to-b from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.65)]" />
              <span className="absolute flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/50 bg-black/55 shadow-[0_0_14px_rgba(34,211,238,0.35)] backdrop-blur-md">
                <span className="font-mono text-[10px] text-cyan-200">⇔</span>
              </span>
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-2 max-[359px]:p-1.5 sm:p-3">
              <span className="rounded-full border border-emerald-500/25 bg-black/45 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-emerald-200/90 backdrop-blur-md max-[359px]:px-1.5 sm:px-2.5 sm:py-1 sm:text-[8px] sm:tracking-[0.16em]">
                {dayStartLabel}
              </span>
              <span className="rounded-full border border-cyan-500/25 bg-black/45 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-cyan-200/90 backdrop-blur-md max-[359px]:px-1.5 sm:px-2.5 sm:py-1 sm:text-[8px] sm:tracking-[0.16em]">
                {dayEndLabel}
              </span>
            </div>
          </>
        ) : (
          <div className="grid h-full w-full grid-cols-2">
            <div className="relative border-r border-cyan-500/10">
              <SlotPhotoOrPlaceholder
                src={day1Src}
                label={dayStartLabel}
                animate={storageStatus === "loading"}
              />
              <span className="pointer-events-none absolute left-2 top-2 rounded-full border border-emerald-500/25 bg-black/45 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-emerald-200/90 backdrop-blur-md">
                {dayStartLabel}
              </span>
            </div>
            <div className="relative">
              <SlotPhotoOrPlaceholder
                src={dayEndSrc}
                label={dayEndLabel}
                animate={storageStatus === "loading"}
              />
              <span className="pointer-events-none absolute right-2 top-2 rounded-full border border-cyan-500/25 bg-black/45 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-cyan-200/90 backdrop-blur-md">
                {dayEndLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CYCLE_SELFIE_SLOTS.map((day) => {
          const hasPhoto = Boolean(slots[day]);
          const busy = captureBusy === day;
          const label = dayLabels[day];

          return (
            <div
              key={day}
              className="rounded-xl border border-orange-500/10 bg-neutral-950/50 p-3 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-cyan-500/15 bg-black/50">
                  {slots[day] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slots[day] ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-mono text-[8px] text-neutral-600">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[8px] text-neutral-600">
                    {hasPhoto ? "Gravado neste dispositivo" : "Aguardando captura"}
                  </p>
                </div>
              </div>
              <input
                ref={(node) => {
                  cameraInputRefs.current[day] = node;
                }}
                type="file"
                accept="image/*"
                capture="user"
                className="sr-only"
                tabIndex={-1}
                disabled={busy || storageStatus === "loading"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void handleCaptureFile(day, file);
                  event.target.value = "";
                }}
              />
              <input
                ref={(node) => {
                  galleryInputRefs.current[day] = node;
                }}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                disabled={busy || storageStatus === "loading"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void handleCaptureFile(day, file);
                  event.target.value = "";
                }}
              />
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={busy || storageStatus === "loading"}
                  onClick={() => void openCameraForDay(day)}
                  className={`${DASHBOARD_TAP_TARGET} w-full rounded-full border border-cyan-500/20 bg-black/40 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-100/85 transition-opacity hover:border-cyan-400/35 disabled:opacity-45`}
                >
                  {busy ? "Gravando…" : hasPhoto ? "Recapturar" : "Capturar"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy || storageStatus === "loading"}
                    onClick={() => cameraInputRefs.current[day]?.click()}
                    className={`${DASHBOARD_TAP_TARGET} rounded-full border border-neutral-700/60 bg-neutral-900/70 px-2 py-2 text-[8px] font-bold uppercase tracking-[0.12em] text-neutral-200 disabled:opacity-45`}
                  >
                    Câmera
                  </button>
                  <button
                    type="button"
                    disabled={busy || storageStatus === "loading"}
                    onClick={() => galleryInputRefs.current[day]?.click()}
                    className={`${DASHBOARD_TAP_TARGET} rounded-full border border-cyan-500/25 bg-cyan-950/40 px-2 py-2 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-100 disabled:opacity-45`}
                  >
                    Galeria
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {feedback ? (
        <p
          className={`text-[10px] ${storageStatus === "blocked" ? "text-amber-400/85" : "text-emerald-300/80"
            }`}
          role="status"
        >
          {feedback}
        </p>
      ) : null}

      {storageStatus === "blocked" ? (
        <p className="text-[9px] uppercase tracking-[0.14em] text-amber-500/70" role="alert">
          Modo privado ou quota cheia · exibindo placeholders HUD
        </p>
      ) : null}
    </section>
  );
}
