"use client";

import { useId, useState, type ChangeEvent } from "react";
import { PortalPasswordField } from "@/components/portal/PortalPasswordField";
import { PORTAL_FORM_ATTRS, PORTAL_PASSWORD_MANAGER_ATTRS } from "@/lib/portal-theme";

/**
 * Formulário mínimo de cadastro — só é montado quando o handshake do balcão foi
 * validado no servidor. Estética IRIS: fundo preto, acentos ouro/magma, sem
 * animações ou transições.
 */
export function RegisterForm() {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-black px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold uppercase tracking-[0.18em] text-[#ffb800]">
          Ignição do Altar
        </h1>
        <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#ff4500]">
          Elo do balcão confirmado
        </p>

        <form
          className="mt-10 flex flex-col gap-6"
          action="/api/auth/register"
          method="post"
          {...PORTAL_FORM_ATTRS}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor={emailId}
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffb800]"
            >
              E-mail
            </label>
            <input
              id={emailId}
              name="access-email"
              type="text"
              inputMode="email"
              required
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              className="w-full border border-[#ffb800]/40 bg-black px-4 py-3 text-base text-[#ffb800] outline-none focus:border-[#ffb800]"
              {...PORTAL_PASSWORD_MANAGER_ATTRS}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={passwordId}
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffb800]"
            >
              Senha
            </label>
            <PortalPasswordField
              id={passwordId}
              name="access-secret"
              value={password}
              required
              minLength={8}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              className="w-full border border-[#ffb800]/40 bg-black px-4 py-3 text-base text-[#ffb800] outline-none focus:border-[#ffb800]"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full border border-[#ff4500] bg-[#ff4500] px-4 py-3 text-sm font-bold uppercase tracking-[0.24em] text-black"
          >
            Forjar Conta
          </button>
        </form>
      </div>
    </main>
  );
}
