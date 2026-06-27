"use client";

import { FORJA_META, FORJA_SECTION_CHIP } from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaMonitorStats } from "@/lib/forja-monitor-utils";

type ForjaMonitorStatsBarProps = {
  stats: ForjaMonitorStats;
};

export function ForjaMonitorStatsBar({ stats }: ForjaMonitorStatsBarProps) {
  const items = [
    { label: FORJA_COPY.monitor.statsTotal, value: stats.total },
    { label: FORJA_COPY.monitor.statsVip, value: stats.vip },
    { label: FORJA_COPY.monitor.statsComum, value: stats.comum },
    { label: FORJA_COPY.monitor.statsVtcToday, value: stats.withVtcToday },
    { label: FORJA_COPY.monitor.statsSpikes, value: stats.spikes, highlight: stats.spikes > 0 },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      aria-label={FORJA_COPY.monitor.statsTitle}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={[
            "rounded-xl border px-3 py-2.5",
            item.highlight
              ? "border-amber-900/50 bg-amber-950/20"
              : "border-zinc-800/80 bg-black/30",
          ].join(" ")}
        >
          <p className={FORJA_SECTION_CHIP}>{item.label}</p>
          <p
            className={[
              "mt-1 text-lg font-semibold tabular-nums",
              item.highlight ? "text-amber-100" : "text-zinc-100",
            ].join(" ")}
          >
            {item.value}
          </p>
        </div>
      ))}
      <p className={`${FORJA_META} col-span-full text-xs text-zinc-600`}>
        {FORJA_COPY.monitor.statsHint}
      </p>
    </div>
  );
}
