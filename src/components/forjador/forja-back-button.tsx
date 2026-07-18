import Link from "next/link";
import { FORJA_GHOST_BUTTON } from "@/lib/forja-config";

type ForjaBackButtonProps = {
  href: string;
  label?: string;
};

export function ForjaBackButton({ href, label = "Voltar à lista" }: ForjaBackButtonProps) {
  return (
    <Link href={href} className={FORJA_GHOST_BUTTON}>
      <span aria-hidden className="mr-1.5">
        ←
      </span>
      {label}
    </Link>
  );
}
