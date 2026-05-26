"use client";

import { useCallback, useEffect, useRef } from "react";
import { resolveVideoSourceKind } from "@/lib/video-source";
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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      video?.pause();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <dialog
        open
        aria-labelledby="video-modal-title"
        aria-modal="true"
        className={`${VIDEO_MODAL_PANEL} relative m-0 flex w-full max-w-2xl flex-col gap-3 p-4 sm:gap-4 sm:p-5`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">
              {sourceKind === "html5" ? "Player nativo" : "Execução embarcada"}
            </p>
            <h2 id="video-modal-title" className="min-w-0 truncate font-serif text-lg text-white sm:text-xl">
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

        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-orange-500/15 bg-black">
          {sourceKind === "html5" ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 size-full object-contain"
              title={`Execução: ${exerciseName}`}
            />
          ) : (
            <iframe
              src={videoUrl}
              title={`Execução: ${exerciseName}`}
              className="absolute inset-0 size-full border-0"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
