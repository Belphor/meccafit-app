"use client";

import { useState } from "react";
import {
  demoteClientFromVip,
  promoteClientToVip,
} from "@/app/actions/forja-vip-bond";
import {
  FORJA_COMMAND_INNER,
  FORJA_DANGER_BUTTON,
  FORJA_FEEDBACK_ERROR,
  FORJA_FEEDBACK_OK,
  FORJA_META,
  FORJA_PRIMARY_BUTTON,
  FORJA_SECTION_CHIP,
  FORJA_SECTION_TITLE,
} from "@/lib/forja-config";
import { FORJA_COPY } from "@/lib/forja-copy";
import type { ForjaBondedAthlete } from "@/lib/forja-dashboard";
import { isAccountSuspended } from "@/lib/account-access-status";

type ForjaVipBondPanelProps = {
  athlete: ForjaBondedAthlete | null;
  operatorId: string;
  isSovereign: boolean;
  onChanged: () => void;
};

export function ForjaVipBondPanel({
  athlete,
  operatorId,
  isSovereign,
  onChanged,
}: ForjaVipBondPanelProps) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  if (!athlete) {
    return (
      <section className={FORJA_COMMAND_INNER}>
        <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.vipBond.chip}</p>
        <h2 className={`${FORJA_SECTION_TITLE} mt-1`}>{FORJA_COPY.vipBond.title}</h2>
        <p className={`${FORJA_META} mt-2`}>{FORJA_COPY.selectAthlete}</p>
      </section>
    );
  }

  const clientId = athlete.clientId;
  const suspended = isAccountSuspended(athlete.statusAltar);
  const isOwnVip = athlete.hasVipBond && athlete.forgerId === operatorId;
  const canPromote = !athlete.hasVipBond && !suspended;
  const canDemote =
    athlete.hasVipBond && !suspended && (isSovereign || isOwnVip);

  async function handlePromote() {
    setBusy(true);
    setFeedback(null);
    const result = await promoteClientToVip(clientId);
    setBusy(false);
    if (!result.ok) {
      setFeedback({ ok: false, message: result.message });
      return;
    }
    setFeedback({ ok: true, message: FORJA_COPY.vipBond.promoteSuccess });
    onChanged();
  }

  async function handleDemote() {
    setBusy(true);
    setFeedback(null);
    const result = await demoteClientFromVip(clientId);
    setBusy(false);
    if (!result.ok) {
      setFeedback({ ok: false, message: result.message });
      return;
    }
    setFeedback({ ok: true, message: FORJA_COPY.vipBond.demoteSuccess });
    onChanged();
  }

  return (
    <section className={FORJA_COMMAND_INNER}>
      <p className={FORJA_SECTION_CHIP}>{FORJA_COPY.vipBond.chip}</p>
      <h2 className={`${FORJA_SECTION_TITLE} mt-1`}>{FORJA_COPY.vipBond.title}</h2>
      <p className={`${FORJA_META} mt-2`}>
        {athlete.displayName}
        {" · "}
        {athlete.hasVipBond ? FORJA_COPY.athleteVipBadge : FORJA_COPY.athleteStandardBadge}
        {athlete.hasVipBond && athlete.forgerName ? ` · ${athlete.forgerName}` : null}
      </p>
      <p className={`${FORJA_META} mt-1 text-zinc-500`}>{FORJA_COPY.vipBond.hint}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {canPromote ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handlePromote()}
            className={FORJA_PRIMARY_BUTTON}
          >
            {busy ? FORJA_COPY.vipBond.working : FORJA_COPY.vipBond.promote}
          </button>
        ) : null}
        {canDemote ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDemote()}
            className={FORJA_DANGER_BUTTON}
          >
            {busy ? FORJA_COPY.vipBond.working : FORJA_COPY.vipBond.demote}
          </button>
        ) : null}
        {!canPromote && !canDemote ? (
          <p className={`${FORJA_META} text-zinc-500`}>
            {suspended
              ? FORJA_COPY.vipBond.suspended
              : athlete.hasVipBond
                ? FORJA_COPY.vipBond.ownedByOther
                : FORJA_COPY.vipBond.unavailable}
          </p>
        ) : null}
      </div>

      {feedback ? (
        <p className={`mt-3 text-xs ${feedback.ok ? FORJA_FEEDBACK_OK : FORJA_FEEDBACK_ERROR}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
