"use client";

import { FORJA_TAB_ACTIVE, FORJA_TAB_IDLE } from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaMonitorSegment } from "@/lib/forja-monitor-utils";

type ForjaMonitorSegmentFilterProps = {
  value: ForjaMonitorSegment;
  onChange: (segment: ForjaMonitorSegment) => void;
  counts: Record<ForjaMonitorSegment, number>;
};

const SEGMENTS: ForjaMonitorSegment[] = ["vip", "comum", "suspenso"];

export function ForjaMonitorSegmentFilter({
  value,
  onChange,
  counts,
}: ForjaMonitorSegmentFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={FORJA_COPY.monitor.filterLabel}>
      {SEGMENTS.map((segment) => {
        const isActive = value === segment;
        const label = FORJA_COPY.monitor.segments[segment];
        return (
          <button
            key={segment}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(segment)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
              isActive ? FORJA_TAB_ACTIVE : FORJA_TAB_IDLE
            }`}
          >
            {label}
            <span className="ml-1.5 tabular-nums text-[10px] opacity-70">{counts[segment]}</span>
          </button>
        );
      })}
    </div>
  );
}
