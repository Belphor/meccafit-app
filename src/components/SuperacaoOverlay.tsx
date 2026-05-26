import { SUPERACAO_OVERLAY_SUBLINE, SUPERACAO_OVERLAY_TEXT } from "@/lib/dashboard-config";

type SuperacaoOverlayProps = {
  visible: boolean;
};

export function SuperacaoOverlay({ visible }: SuperacaoOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="superacao-plasma-screen pointer-events-none fixed inset-0 z-[100] flex min-h-dvh w-full items-center justify-center bg-black/82 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] backdrop-blur-[2px]"
      role="status"
      aria-live="assertive"
      aria-label="Superação registrada"
    >
      <div className="superacao-plasma-vignette absolute inset-0" aria-hidden="true" />
      <div className="superacao-plasma-edges absolute inset-0" aria-hidden="true" />
      <div className="superacao-plasma-content relative z-[1] flex max-w-[min(100%,28rem)] flex-col items-center text-center sm:max-w-none">
        <p className={SUPERACAO_OVERLAY_TEXT}>SUPERAÇÃO</p>
        <p className={SUPERACAO_OVERLAY_SUBLINE}>em chamas</p>
      </div>
    </div>
  );
}
