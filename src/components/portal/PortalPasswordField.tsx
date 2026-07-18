"use client";

import { useId, useState, type ChangeEvent, type FocusEventHandler } from "react";
import { PORTAL_INPUT, PORTAL_PASSWORD_MANAGER_ATTRS } from "@/lib/portal-theme";

type PortalPasswordFieldProps = {
  id: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  name?: string;
  className?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

function EyeOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3 3.75 21 20.25"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9.9 9.95A3.25 3.25 0 0 0 14 14.1M7.2 7.35C5.1 8.55 3.5 10.4 2.5 12c0 0 3.5 6.5 9.5 6.5 1.55 0 2.95-.35 4.2-.9M16.8 15.7c1.55-1 2.8-2.4 3.7-3.7 0 0-3.5-6.5-9.5-6.5-.85 0-1.65.1-2.4.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Campo secreto com olho.
 * Usa type="text" + máscara CSS (nunca type="password") para o Chrome/Safari
 * não tratarem como formulário de senha e não exibirem "salvar / check passwords".
 */
export function PortalPasswordField({
  id,
  value,
  disabled = false,
  placeholder = "Digite sua senha",
  minLength,
  required,
  name,
  className = PORTAL_INPUT,
  onChange,
  onFocus,
  onBlur,
}: PortalPasswordFieldProps) {
  const generatedName = useId().replace(/:/g, "");
  const fieldName = name ?? `fenyxia-secret-${generatedName}`;
  const [visible, setVisible] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  return (
    <div className="relative w-full">
      <input
        id={id}
        name={fieldName}
        type="text"
        inputMode="text"
        value={value}
        onChange={onChange}
        onFocus={(event) => {
          setUnlocked(true);
          onFocus?.(event);
        }}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`${className} pr-14 ${visible ? "" : "portal-secret-masked"}`}
        minLength={minLength}
        required={required}
        readOnly={!unlocked}
        aria-label={placeholder}
        {...PORTAL_PASSWORD_MANAGER_ATTRS}
      />
      <button
        type="button"
        tabIndex={0}
        disabled={disabled}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-neutral-500 transition hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {visible ? <EyeClosedIcon /> : <EyeOpenIcon />}
      </button>
    </div>
  );
}
