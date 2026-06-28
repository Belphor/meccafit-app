"use client";

import { memo } from "react";
import { FORJA_COMMAND_INNER, FORJA_META, FORJA_SECTION_CHIP } from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import { FORJA_VTC_PHASE_REFERENCE } from "@/lib/forja-vtc-phase-reference";
import { resolveForjaChipClass } from "@/lib/forja-phase-styles";

function ForjaVtcPhaseReferencePanelComponent() {
  return (
    <section aria-label={FORJA_COPY.monitor.vtcPhaseTableTitle} className={FORJA_COMMAND_INNER}>
      <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.monitor.vtcPhaseTableTitle}</p>
      <p className={`${FORJA_META} mt-1`}>{FORJA_COPY.monitor.vtcPhaseTableHint}</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              <th className="px-2 py-2">{FORJA_COPY.monitor.vtcPhaseColPhase}</th>
              <th className="px-2 py-2">{FORJA_COPY.monitor.vtcPhaseColName}</th>
              <th className="px-2 py-2">{FORJA_COPY.monitor.vtcPhaseColVolume}</th>
              <th className="px-2 py-2">{FORJA_COPY.monitor.vtcPhaseColMeaning}</th>
            </tr>
          </thead>
          <tbody>
            {FORJA_VTC_PHASE_REFERENCE.map((row) => (
              <tr key={row.tier} className="border-b border-zinc-900/80">
                <td className="px-2 py-2.5">
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${resolveForjaChipClass(row.tier)}`}
                  >
                    {row.tier}
                  </span>
                </td>
                <td className="px-2 py-2.5 font-medium text-zinc-100">{row.label}</td>
                <td className="px-2 py-2.5 tabular-nums text-zinc-300">{row.vtcRangeLabel}</td>
                <td className="px-2 py-2.5 text-zinc-400">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const ForjaVtcPhaseReferencePanel = memo(ForjaVtcPhaseReferencePanelComponent);
