"use client";

import { MuralAuthorAvatar } from "@/components/comunidade/mural-author-avatar";
import { COMUNIDADE_CHIP } from "@/components/comunidade/comunidade-layout";
import type { ForumBrasaVivaTopic } from "@/features/forum-brasa-viva/types";
import { DASHBOARD_ITEM_NAME, DASHBOARD_META_CHIP } from "@/lib/dashboard-config";

type ForumPostCardProps = {
  topic: ForumBrasaVivaTopic;
  /** Estilo compacto para o mural embutido na Comunidade */
  variant?: "default" | "comunidade";
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

export function ForumPostCard({ topic, variant = "default" }: ForumPostCardProps) {
  const isComunidade = variant === "comunidade";

  return (
    <article
      className={
        isComunidade
          ? "forum-post-card box-border min-w-0 max-w-full overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-neutral-950/90 via-amber-950/10 to-neutral-950/90 p-3.5 shadow-[inset_0_1px_0_rgba(251,191,36,0.08)] backdrop-blur-sm xs:p-4"
          : "forum-post-card rounded-[1.35rem] border border-orange-500/12 bg-neutral-950/55 p-4 backdrop-blur-md"
      }
    >
      <header className="flex min-w-0 flex-col gap-2 xs:flex-row xs:items-start xs:justify-between xs:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 xs:gap-3">
          <MuralAuthorAvatar
            authorName={topic.authorName}
            temCinturaoDuelo={topic.temCinturaoDuelo}
            isReiDasChamas={topic.isReiDasChamas}
            isPilarCooperativo={topic.isPilarCooperativo}
            size="md"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="break-words text-pretty text-[11px] font-medium uppercase leading-snug tracking-[0.08em] text-amber-200/90 xs:tracking-[0.12em]">
              {topic.authorName}
            </p>
            {topic.authorLineage ? (
              <p className="mt-0.5 break-words text-pretty text-[10px] text-neutral-500">
                {topic.authorLineage}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex w-full min-w-0 items-center justify-between gap-2 xs:w-auto xs:max-w-[45%] xs:flex-col xs:items-end xs:gap-1.5">
          {isComunidade ? (
            <span className={`${COMUNIDADE_CHIP} border-emerald-500/25 bg-emerald-950/30 text-emerald-200/90`}>
              Recorde
            </span>
          ) : null}
          <time
            className="min-w-0 break-words text-right text-[10px] uppercase tracking-[0.08em] text-neutral-500 xs:tracking-[0.1em]"
            dateTime={topic.createdAt}
          >
            {formatPostedAt(topic.createdAt)}
          </time>
        </div>
      </header>

      <h3
        className={`mt-3 text-left text-balance break-words ${
          isComunidade
            ? "font-serif text-sm font-semibold uppercase leading-snug tracking-wide text-amber-50/95 xs:text-base"
            : DASHBOARD_ITEM_NAME
        }`}
      >
        {topic.title}
      </h3>
      <p
        className={`mt-2 text-pretty break-words text-[10px] leading-relaxed xs:text-[11px] sm:text-[12px] ${
          isComunidade ? "text-neutral-300" : "text-neutral-400"
        }`}
      >
        {topic.body}
      </p>

      {topic.weightKg > 0 ? (
        <p className="mt-3 min-w-0">
          <span
            className={
              isComunidade
                ? `${COMUNIDADE_CHIP} max-w-full border-amber-500/25 bg-amber-950/35 font-mono tabular-nums text-amber-100/90`
                : DASHBOARD_META_CHIP
            }
          >
            {topic.weightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg ·{" "}
            {topic.series} {topic.series === 1 ? "série" : "séries"}
          </span>
        </p>
      ) : null}
    </article>
  );
}
