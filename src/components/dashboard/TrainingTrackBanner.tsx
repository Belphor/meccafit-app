"use client";

import { BRASA_PANEL } from "@/lib/dashboard-config";
import {
  TREINO_VIP_BANNER_BODY,
  TREINO_VIP_BANNER_CHIP,
  TREINO_VIP_PRESCRIPTION_EMPTY,
  TREINO_VIP_PRESCRIPTION_TITLE,
} from "@/lib/client-lore-copy";
import type { PersonalPrescriptionRow, TrainingTrackState } from "@/lib/training-track";

type TrainingTrackBannerProps = {
  trainingTrack: TrainingTrackState;
};

export function TrainingTrackBanner({ trainingTrack }: TrainingTrackBannerProps) {
  if (trainingTrack.track !== "personal") {
    return null;
  }

  return (
    <div
      className={`${BRASA_PANEL} mb-4 rounded-2xl border px-4 py-3 text-center sm:px-5`}
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-500/90">
        {TREINO_VIP_BANNER_CHIP}
      </p>
      <p className="mt-1 font-serif text-sm text-amber-100/90 sm:text-base">
        {TREINO_VIP_BANNER_BODY}
      </p>
    </div>
  );
}

type PersonalPrescriptionsPanelProps = {
  prescriptions: PersonalPrescriptionRow[];
};

export function PersonalPrescriptionsPanel({ prescriptions }: PersonalPrescriptionsPanelProps) {
  if (prescriptions.length === 0) {
    return (
      <div className={`${BRASA_PANEL} mb-4 rounded-2xl border px-4 py-4 text-center`}>
        <p className="text-sm text-amber-200/80">{TREINO_VIP_PRESCRIPTION_EMPTY}</p>
      </div>
    );
  }

  return (
    <div className={`${BRASA_PANEL} mb-4 rounded-2xl border px-4 py-4`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/90">
        {TREINO_VIP_PRESCRIPTION_TITLE}
      </p>
      <ul className="mt-3 space-y-2">
        {prescriptions.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-orange-500/15 bg-black/30 px-3 py-2 text-left"
          >
            <p className="text-sm font-medium text-amber-50">
              Exercício #{item.exercicio_id}
            </p>
            <p className="mt-1 text-xs text-amber-200/85">
              {item.series_alvo}×{item.repeticoes_alvo} · {item.peso_prescrito} kg
            </p>
            {item.observacoes ? (
              <p className="mt-1 text-xs text-amber-100/70">{item.observacoes}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
