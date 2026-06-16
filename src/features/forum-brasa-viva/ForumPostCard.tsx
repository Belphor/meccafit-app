"use client";

import { MuralAuthorAvatar } from "@/components/comunidade/mural-author-avatar";
import type { ForumBrasaVivaTopic } from "@/features/forum-brasa-viva/types";
import {
  DASHBOARD_ITEM_NAME,
  DASHBOARD_META_CHIP,
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

export function ForumPostCard({ topic }: ForumPostCardProps) {
  return (
    <article className="forum-post-card rounded-[1.35rem] border border-orange-500/12 bg-neutral-950/55 p-4 backdrop-blur-md">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <MuralAuthorAvatar
            authorName={topic.authorName}
            temCinturaoDuelo={topic.temCinturaoDuelo}
            isReiDasChamas={topic.isReiDasChamas}
            isPilarCooperativo={topic.isPilarCooperativo}
            size="md"
          />
          <div className="min-w-0 pt-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/85">
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
            {topic.series} séries
          </span>
        </p>
      ) : null}
    </article>
  );
}
