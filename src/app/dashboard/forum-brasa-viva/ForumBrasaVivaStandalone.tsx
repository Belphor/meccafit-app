"use client";

import Link from "next/link";
import { PhoenixPhaseEngine } from "@/components/dashboard/PhoenixPhaseEngine";
import { ForumBrasaVivaView } from "@/features/forum-brasa-viva/ForumBrasaVivaView";
import { DASHBOARD_SHELL } from "@/lib/dashboard-config";

type ForumBrasaVivaStandaloneProps = {
  userId: string;
  profileRow: Record<string, unknown> | null;
};

export function ForumBrasaVivaStandalone({ userId, profileRow }: ForumBrasaVivaStandaloneProps) {
  return (
    <main className={DASHBOARD_SHELL}>
      <div className="relative z-10 mx-auto w-full max-w-6xl px-1 py-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/90 hover:text-amber-200"
        >
          ← Voltar ao altar
        </Link>
        <PhoenixPhaseEngine userId={userId} profileRow={profileRow}>
          {(phase) => <ForumBrasaVivaView userId={userId} phase={phase} />}
        </PhoenixPhaseEngine>
      </div>
    </main>
  );
}
