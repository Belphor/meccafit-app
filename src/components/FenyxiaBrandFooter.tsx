import {
  FENYXIA_BRAND_FOOTER_BADGE,
  FENYXIA_BRAND_FOOTER_SHELL,
  FENYXIA_BRAND_FOOTER_TAGLINE,
} from "@/lib/dashboard-config";

type FenyxiaBrandFooterProps = {
  className?: string;
  /** Exibe linha secundária com contexto do ecossistema */
  showTagline?: boolean;
};

export function FenyxiaBrandFooter({
  className = "",
  showTagline = true,
}: FenyxiaBrandFooterProps) {
  return (
    <footer
      className={`${FENYXIA_BRAND_FOOTER_SHELL} ${className}`}
      aria-label="Marca Fenyxia · Ecossistema Fenyxia"
    >
      <p className={FENYXIA_BRAND_FOOTER_BADGE}>Powered by Fenyxia</p>
      {showTagline ? (
        <p className={FENYXIA_BRAND_FOOTER_TAGLINE}>Ecossistema Fenyxia</p>
      ) : null}
    </footer>
  );
}
