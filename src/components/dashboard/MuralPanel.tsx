import { BrasaVivaCard } from "@/components/BrasaVivaCard";
import { DashboardPanelHeader } from "@/components/dashboard/DashboardPanelHeader";
import type { MuralPost } from "@/lib/mock-data";
import {
  DASHBOARD_EMPTY_STATE,
  DASHBOARD_ITEM_CARD,
  DASHBOARD_ITEM_NAME,
  DASHBOARD_META_CHIP,
  DASHBOARD_MURAL_LIST,
  DASHBOARD_PANEL_FRAME,
  DASHBOARD_SECTION_CHIP,
  DASHBOARD_SECTION_TITLE,
  EXERCISE_RECORD_TERM,
} from "@/lib/dashboard-config";

type MuralPanelProps = {
  posts: MuralPost[];
};

export function MuralPanel({ posts }: MuralPanelProps) {
  return (
    <BrasaVivaCard
      as="section"
      variant="treino"
      className={DASHBOARD_PANEL_FRAME}
      aria-labelledby="mural-tab-title"
    >
      <DashboardPanelHeader chip="Aba 6 · Mural" meta="Comunidade Meccafit" />

      <h2 id="mural-tab-title" className={`${DASHBOARD_SECTION_TITLE} mt-4`}>
        Mural da Ascensão
      </h2>
      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
        Superações da comunidade de clientes e forjadores de linhagem. Forjadores soberanos observam, mas não competem neste mural.
      </p>

      {posts.length === 0 ? (
        <p className={DASHBOARD_EMPTY_STATE}>
          Nenhuma ascensão na comunidade ainda. Supere seu recorde histórico para acender o mural.
        </p>
      ) : (
        <ul className={`mt-6 ${DASHBOARD_MURAL_LIST}`}>
          {posts.map((post) => (
            <li key={post.id} className={DASHBOARD_ITEM_CARD}>
              {post.shareImageUrl ? (
                <img
                  src={post.shareImageUrl}
                  alt={`Ascensão registrada: ${post.exerciseName}`}
                  className="mb-3 max-h-40 w-full rounded-xl border border-orange-500/15 object-contain"
                />
              ) : null}
              <span className={DASHBOARD_SECTION_CHIP}>Ascensão registrada</span>
              {post.athleteName ? (
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
                  {post.athleteName}
                  {post.lineageName ? ` · ${post.lineageName}` : ""}
                </p>
              ) : null}
              <p className={`${DASHBOARD_ITEM_NAME} mt-2`}>{post.exerciseName}</p>
              <p className="mt-2">
                <span className={DASHBOARD_META_CHIP}>
                  {post.weight} kg · {post.series} séries · VTC{" "}
                  {post.weight.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                </span>
              </p>
              <p className="mt-2 text-[10px] normal-case leading-snug tracking-normal text-neutral-500">
                <span className={EXERCISE_RECORD_TERM}>Recorde histórico</span> superado nesta ascensão.
              </p>
            </li>
          ))}
        </ul>
      )}
    </BrasaVivaCard>
  );
}
