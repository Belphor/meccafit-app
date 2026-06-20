import type { ReactNode } from "react";
import {
  DASHBOARD_CLIENT_INFO_BLOCK,
  DASHBOARD_CLIENT_INFO_LABEL,
  DASHBOARD_CLIENT_INFO_TEXT,
} from "@/lib/dashboard-config";

type DashboardClientInfoBlockProps = {
  children: ReactNode;
  label?: string;
  className?: string;
};

export function DashboardClientInfoBlock({
  children,
  label = "Como funciona",
  className = "",
}: DashboardClientInfoBlockProps) {
  return (
    <div className={`${DASHBOARD_CLIENT_INFO_BLOCK} ${className}`.trim()} role="note">
      {label ? <p className={DASHBOARD_CLIENT_INFO_LABEL}>{label}</p> : null}
      <p className={label ? `mt-2 ${DASHBOARD_CLIENT_INFO_TEXT}` : DASHBOARD_CLIENT_INFO_TEXT}>
        {children}
      </p>
    </div>
  );
}
