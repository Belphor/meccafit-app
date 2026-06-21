"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";
import { FORJA_COPY } from "@/lib/forja-copy";
import { clearThermicSessionCache } from "@/lib/session-cache-cleanup";
import { supabase } from "@/lib/supabase";

type ForjaSignOutButtonProps = {
  className?: string;
  label?: string;
};

export function ForjaSignOutButton({
  className,
  label = FORJA_COPY.signOut,
}: ForjaSignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    clearThermicSessionCache();
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  return (
    <DashboardSignOutButton
      onClick={() => void handleSignOut()}
      className={className}
      label={label}
    />
  );
}
