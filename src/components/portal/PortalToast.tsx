"use client";

import { useEffect } from "react";

export type PortalToastVariant = "error" | "success" | "info";

type PortalToastProps = {
  message: string;
  variant?: PortalToastVariant;
  visible: boolean;
  onDismiss: () => void;
  autoDismissMs?: number;
};

const variantStyles: Record<PortalToastVariant, string> = {
  error:
    "border-red-400/35 bg-red-950/90 text-red-100 shadow-[0_0_32px_rgba(239,68,68,0.22)]",
  success:
    "border-emerald-400/35 bg-emerald-950/90 text-emerald-100 shadow-[0_0_32px_rgba(16,185,129,0.18)]",
  info: "border-amber-400/35 bg-neutral-950/92 text-amber-100 shadow-[0_0_32px_rgba(245,158,11,0.18)]",
};

export function PortalToast({
  message,
  variant = "error",
  visible,
  onDismiss,
  autoDismissMs = 5200,
}: PortalToastProps) {
  useEffect(() => {
    if (!visible) return;

    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss, visible, message]);

  if (!visible || !message.trim()) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-50 flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto max-w-md rounded-2xl border px-4 py-3 text-center text-sm leading-relaxed backdrop-blur-md transition-all duration-300 ${variantStyles[variant]}`}
      >
        {message}
      </div>
    </div>
  );
}
