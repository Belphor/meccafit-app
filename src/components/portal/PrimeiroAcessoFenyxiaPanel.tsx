"use client";

import type { ChangeEvent } from "react";
import { PortalPasswordField } from "@/components/portal/PortalPasswordField";
import {
  PORTAL_INPUT,
  PORTAL_LABEL,
  PORTAL_PASSWORD_MANAGER_ATTRS,
} from "@/lib/portal-theme";

export type PrimeiroAcessoFormState = {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
};

type PrimeiroAcessoFenyxiaPanelProps = {
  values: PrimeiroAcessoFormState;
  disabled?: boolean;
  onChange: (field: keyof PrimeiroAcessoFormState, value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function PrimeiroAcessoFenyxiaPanel({
  values,
  disabled = false,
  onChange,
  onFocus,
  onBlur,
}: PrimeiroAcessoFenyxiaPanelProps) {
  const handleChange =
    (field: keyof PrimeiroAcessoFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      onChange(field, event.target.value);
    };

  return (
    <div className="mt-8 flex w-full flex-col gap-4 text-left">
      <div className="w-full">
        <label htmlFor="onboarding-full-name" className={PORTAL_LABEL}>
          Nome completo
        </label>
        <input
          id="onboarding-full-name"
          type="text"
          value={values.fullName}
          onChange={handleChange("fullName")}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="Seu nome completo"
          className={PORTAL_INPUT}
          name="full-name"
          {...PORTAL_PASSWORD_MANAGER_ATTRS}
        />
      </div>

      <div className="w-full">
        <label htmlFor="onboarding-birth-date" className={PORTAL_LABEL}>
          Data de nascimento
        </label>
        <input
          id="onboarding-birth-date"
          type="date"
          value={values.birthDate}
          onChange={handleChange("birthDate")}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          className={PORTAL_INPUT}
          name="birth-date"
          {...PORTAL_PASSWORD_MANAGER_ATTRS}
        />
      </div>

      <div className="w-full">
        <label htmlFor="onboarding-email" className={PORTAL_LABEL}>
          E-mail de acesso
        </label>
        <input
          id="onboarding-email"
          type="email"
          value={values.email}
          onChange={handleChange("email")}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="Digite seu email"
          className={PORTAL_INPUT}
          name="access-email"
          inputMode="email"
          {...PORTAL_PASSWORD_MANAGER_ATTRS}
        />
      </div>

      <div className="w-full">
        <label htmlFor="onboarding-password" className={PORTAL_LABEL}>
          Senha de acesso
        </label>
        <PortalPasswordField
          id="onboarding-password"
          value={values.password}
          onChange={handleChange("password")}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="Digite sua senha"
          minLength={6}
        />
      </div>
    </div>
  );
}
