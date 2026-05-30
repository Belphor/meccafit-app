"use client";

import { DashboardTreinoWorkspace } from "@/components/dashboard/DashboardTreinoWorkspace";
import type { DashboardTreinoWorkspaceProps } from "@/components/dashboard/DashboardTreinoWorkspace";
import {
  PersonalPrescriptionsPanel,
  TrainingTrackBanner,
} from "@/components/dashboard/TrainingTrackBanner";
import type { PersonalPrescriptionRow, TrainingTrackState } from "@/lib/training-track";

export type PersonalTreinoWorkspaceProps = DashboardTreinoWorkspaceProps & {
  trainingTrack: TrainingTrackState;
  subgroupPrescriptions: PersonalPrescriptionRow[];
};

export function PersonalTreinoWorkspace({
  trainingTrack,
  subgroupPrescriptions,
  ...workspaceProps
}: PersonalTreinoWorkspaceProps) {
  return (
    <div className="space-y-0">
      <TrainingTrackBanner trainingTrack={trainingTrack} />
      <PersonalPrescriptionsPanel prescriptions={subgroupPrescriptions} />
      <DashboardTreinoWorkspace {...workspaceProps} />
    </div>
  );
}
