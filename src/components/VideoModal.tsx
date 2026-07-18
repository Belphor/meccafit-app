"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { resolveVideoSourceKind, toPlayableVideoUrl } from "@/lib/video-source";
import { DASHBOARD_TAP_TARGET, VIDEO_MODAL_PANEL } from "@/lib/dashboard-config";

export type VideoModalProps = {
  isOpen: boolean;
  exerciseName: string;
  videoUrl: string;
  onClose: () => void;
};

export default function VideoModal({ isOpen, exerciseName, videoUrl, onClose }: VideoModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playableUrl = useMemo(
    () => toPlayableVideoUrl(videoUrl, { autoplay: true }),
    [videoUrl],
  );
  const sourceKind = resolveVideoSourceKind(videoUrl);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    const video = videoRef.current;
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (video && sourceKind === "html5") {
      video.muted = true;
      void video.play().catch(() => {
        /* Autoplay pode ser bloqueado; o usuário ainda tem controls. */
      });
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      video?.pause();
    };
  }, [isOpen, handleKeyDown, sourceKind, playableUrl]);

  if (!isOpen) return null;

  const sourceLabel =
    sourceKind === "html5"
      ? "Player nativo"
      : sourceKind === "external"
        ? "Link externo"
        : "Execução embarcada";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-md max-sm:portrait:items-end max-sm:portrait:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <dialog
        open
        aria-labelledby="video-modal-title"
        aria-modal="true"
        className={`${VIDEO_MODAL_PANEL} relative m-0 flex max-h-[min(100dvh,100%)] w-full max-w-2xl flex-col gap-3 overflow-y-auto p-4 sm:gap-4 sm:p-5 max-sm:landscape:max-w-4xl max-sm:landscape:flex-row max-sm:landscape:items-stretch max-sm:landscape:gap-3 max-sm:landscape:p-3`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 max-sm:landscape:w-44 max-sm:landscape:flex-col max-sm:landscape:items-stretch max-sm:landscape:justify-start">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">
              {sourceLabel}
            </p>
            <h2
              id="video-modal-title"
              className="min-w-0 truncate font-serif text-lg text-white sm:text-xl max-sm:landscape:whitespace-normal max-sm:landscape:text-base"
            >
              {exerciseName}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar vídeo"
            className={`${DASHBOARD_TAP_TARGET} shrink-0 rounded-full border border-orange-500/20 bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50`}
          >
            Fechar
          </button>
        </div>

        <div className="relative aspect-video w-full min-h-0 flex-1 overflow-hidden rounded-xl border border-orange-500/15 bg-black max-h-[min(70dvh,480px)] max-sm:landscape:aspect-auto max-sm:landscape:h-[min(78dvh,360px)] max-sm:landscape:max-h-none">
          {!playableUrl ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="text-sm text-neutral-400">
                Este exercício ainda não tem link de vídeo. Peça ao Forjador para colar um link do
                YouTube ou Vimeo.
              </p>
            </div>
          ) : sourceKind === "html5" ? (
            <video
              ref={videoRef}
              src={playableUrl}
              controls
              playsInline
              autoPlay
              muted
              preload="auto"
              className="absolute inset-0 size-full object-contain"
              title={`Execução: ${exerciseName}`}
            />
          ) : sourceKind === "external" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-neutral-300">
                Este link não pode ser exibido dentro do app. Abra no navegador para ver a execução.
              </p>
              <a
                href={playableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${DASHBOARD_TAP_TARGET} rounded-full border border-amber-500/35 bg-amber-950/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100`}
              >
                Abrir vídeo
              </a>
            </div>
          ) : (
            <iframe
              key={playableUrl}
              src={playableUrl}
              title={`Execução: ${exerciseName}`}
              className="absolute inset-0 size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
