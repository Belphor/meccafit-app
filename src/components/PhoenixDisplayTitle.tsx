import type { ReactNode } from "react";

type PhoenixDisplayTitleProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
};

export function PhoenixDisplayTitle({
  children,
  as: Tag = "h1",
  className = "",
}: PhoenixDisplayTitleProps) {
  return (
    <Tag
      className={`phoenix-display-magnetic font-serif uppercase tracking-[0.14em] text-white ${className}`}
    >
      {children}
    </Tag>
  );
}
