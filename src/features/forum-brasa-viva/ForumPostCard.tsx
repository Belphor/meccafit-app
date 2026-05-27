"use client";

import { memo } from "react";
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
  const phaseStyle = FORUM_PHASE_CARD_STYLES[topic.authorCardPhase];

  return (
    <article
      className={[
        "forum-post-card rounded-[1.35rem] border p-4 backdrop-blur-md",
        phaseStyle.borderClass,
        phaseStyle.gradientClass,
        phaseStyle.glowClass,
      ].join(" ")}
      data-author-phase={topic.authorCardPhase}
      data-author-tier={topic.authorPhaseTier}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
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
            {topic.series} séries · VTC{" "}
            {topic.weightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
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
