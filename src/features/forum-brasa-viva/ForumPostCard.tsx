"use client";

import Image from "next/image";
import { memo } from "react";
import {
  FORUM_PHASE_BLUR_DATA_URL,
  FORUM_PHASE_BADGE_SIZE_PX,
  resolveForumPhaseAssetPath,
  toForumThermalPhase,
} from "@/features/forum-brasa-viva/forum-phase-assets";
import { FORUM_PHASE_CARD_STYLES } from "@/features/forum-brasa-viva/forum-phase-styles";
import type { ForumBrasaVivaTopic } from "@/features/forum-brasa-viva/types";
import {
  DASHBOARD_ITEM_NAME,
  DASHBOARD_META_CHIP,
  EXERCISE_RECORD_TERM,
} from "@/lib/dashboard-config";

type ForumPostCardProps = {
  topic: ForumBrasaVivaTopic;
};

function formatPostedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recente";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ForumPostCard = memo(function ForumPostCard({ topic }: ForumPostCardProps) {
  const phase = topic.authorCardPhase;
  const phaseStyle = FORUM_PHASE_CARD_STYLES[phase];
  const phaseAssetPath = resolveForumPhaseAssetPath(phase);
  const thermalPhase = toForumThermalPhase(phase);

  return (
    <article
      className={[
        "forum-post-card rounded-[1.35rem] border p-4 backdrop-blur-md",
        phaseStyle.borderClass,
        phaseStyle.gradientClass,
        phaseStyle.glowClass,
      ].join(" ")}
      data-author-phase={phase}
      data-author-thermal-phase={thermalPhase}
      data-author-tier={topic.authorPhaseTier}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <Image
            src={phaseAssetPath}
            alt={`Badge fase térmica ${phaseStyle.label}`}
            width={FORUM_PHASE_BADGE_SIZE_PX}
            height={FORUM_PHASE_BADGE_SIZE_PX}
            sizes={`${FORUM_PHASE_BADGE_SIZE_PX}px`}
            placeholder="blur"
            blurDataURL={FORUM_PHASE_BLUR_DATA_URL[phase]}
            className="size-12 shrink-0 object-contain"
            priority={false}
          />
          <div className="min-w-0">
            <span
              className={[
                "inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em]",
                phaseStyle.chipClass,
              ].join(" ")}
            >
              Fase {phaseStyle.label}
            </span>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-amber-200/85">
              {topic.authorName}
              {topic.authorLineage ? ` · ${topic.authorLineage}` : ""}
            </p>
          </div>
        </div>
        <time
          className="text-[10px] uppercase tracking-[0.14em] text-neutral-500"
          dateTime={topic.createdAt}
        >
          {formatPostedAt(topic.createdAt)}
        </time>
      </header>

      <h3 className={`${DASHBOARD_ITEM_NAME} mt-4 text-left`}>{topic.title}</h3>
      <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">{topic.body}</p>

      {topic.weightKg > 0 ? (
        <p className="mt-3">
          <span className={DASHBOARD_META_CHIP}>
            {topic.weightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg ·{" "}
            {topic.series} séries · ascensão validada
          </span>
        </p>
      ) : null}

      <p className="mt-2 text-[10px] normal-case leading-snug tracking-normal text-neutral-500">
        <span className={EXERCISE_RECORD_TERM}>Recorde histórico</span> validado no fórum — ascensão
        visível para a linhagem.
      </p>
    </article>
  );
});
