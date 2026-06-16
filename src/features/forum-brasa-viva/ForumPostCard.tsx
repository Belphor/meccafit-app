"use client";

import { MuralAuthorAvatar } from "@/components/comunidade/mural-author-avatar";
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
          ? "forum-post-card rounded-2xl border border-amber-500/20 bg-gradient-to-br from-neutral-950/90 via-amber-950/10 to-neutral-950/90 p-4 shadow-[inset_0_1px_0_rgba(251,191,36,0.08)] backdrop-blur-sm sm:p-4"
          : "forum-post-card rounded-[1.35rem] border border-orange-500/12 bg-neutral-950/55 p-4 backdrop-blur-md"
      }
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <MuralAuthorAvatar
            authorName={topic.authorName}
            temCinturaoDuelo={topic.temCinturaoDuelo}
            isReiDasChamas={topic.isReiDasChamas}
            isPilarCooperativo={topic.isPilarCooperativo}
            size="md"
          />
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-amber-200/90">
              {topic.authorName}
            </p>
            {topic.authorLineage ? (
              <p className="mt-0.5 truncate text-[10px] text-neutral-500">{topic.authorLineage}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isComunidade ? (
            <span className="rounded-full border border-emerald-500/25 bg-emerald-950/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-200/90">
              Recorde
            </span>
          ) : null}
          <time
            className="text-[10px] uppercase tracking-[0.12em] text-neutral-500"
            dateTime={topic.createdAt}
          >
            {formatPostedAt(topic.createdAt)}
          </time>
        </div>
      </header>

      <h3
        className={`${DASHBOARD_ITEM_NAME} mt-3 text-left ${isComunidade ? "text-amber-50/95" : ""}`}
      >
        {topic.title}
      </h3>
      <p
        className={`mt-2 text-[11px] leading-relaxed sm:text-[12px] ${
          isComunidade ? "text-neutral-300" : "text-neutral-400"
        }`}
      >
        {topic.body}
      </p>

      {topic.weightKg > 0 ? (
        <p className="mt-3">
          <span
            className={
              isComunidade
                ? "inline-flex rounded-full border border-amber-500/25 bg-amber-950/35 px-2.5 py-1 font-mono text-[10px] tabular-nums text-amber-100/90"
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
