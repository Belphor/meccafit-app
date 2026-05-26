import {
  DASHBOARD_SIGN_OUT_BUTTON,
  DASHBOARD_SIGN_OUT_GLOW,
} from "@/lib/dashboard-config";

type DashboardSignOutButtonProps = {
  onClick: () => void;
  className?: string;
  label?: string;
};

export function DashboardSignOutButton({
  onClick,
  className = "",
  label = "Sair",
}: DashboardSignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${DASHBOARD_SIGN_OUT_BUTTON} ${className}`}
      aria-label={label}
    >
      <span className={DASHBOARD_SIGN_OUT_GLOW} aria-hidden="true" />
      <span className="relative z-[1]">{label}</span>
    </button>
  );
}
