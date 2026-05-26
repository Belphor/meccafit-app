export function DashboardLoading({ message = "Acendendo o altar..." }: { message?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-black px-5 text-amber-500/70">
      <p className="text-[10px] uppercase tracking-[0.3em]">{message}</p>
    </main>
  );
}
