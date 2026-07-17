"use client";

import { useEffect, useState } from "react";

type Plataforma = "ios" | "android" | "outro" | "desconhecido";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectarPlataforma(): Plataforma {
  if (typeof navigator === "undefined") return "desconhecido";
  const ua = navigator.userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    // iPadOS moderno se identifica como Mac com toque
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/android/.test(ua)) return "android";
  return "outro";
}

function estaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (
    navigator as Navigator & { standalone?: boolean }
  ).standalone;
  return Boolean(standalone || iosStandalone);
}

export function InstalarClient() {
  const [plataforma, setPlataforma] = useState<Plataforma>("desconhecido");
  const [instalado, setInstalado] = useState(false);
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlataforma(detectarPlataforma());
    setInstalado(estaInstalado());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalado(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const instalarAndroid = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  if (instalado) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-black px-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-[0.18em] text-[#ffb800]">
          Altar instalado
        </h1>
        <p className="mt-4 max-w-md text-sm font-semibold uppercase tracking-[0.16em] text-[#ff4500]">
          Abra o app pelo ícone na tela inicial para acender sua chama.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-black px-6 py-14">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold uppercase tracking-[0.18em] text-[#ffb800]">
          Instale o app FENYXIA
        </h1>
        <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#ff4500]">
          Adicione o altar à sua tela inicial
        </p>

        {plataforma === "android" && promptEvent ? (
          <button
            type="button"
            onClick={instalarAndroid}
            className="mt-10 w-full border border-[#ff4500] bg-[#ff4500] px-4 py-4 text-sm font-bold uppercase tracking-[0.24em] text-black"
          >
            Instalar agora
          </button>
        ) : null}

        {plataforma === "ios" ? (
          <section className="mt-10 border border-[#ffb800]/40 p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffb800]">
              iPhone / iPad (Safari)
            </h2>
            <ol className="mt-4 flex flex-col gap-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#ffb800]">
              <li>1. Toque no botão Compartilhar (o quadrado com a seta para cima).</li>
              <li>2. Escolha &quot;Adicionar à Tela de Início&quot;.</li>
              <li>3. Confirme em &quot;Adicionar&quot;.</li>
              <li>4. Abra o app pelo ícone na tela inicial.</li>
            </ol>
          </section>
        ) : null}

        {plataforma === "android" ? (
          <section className="mt-8 border border-[#ffb800]/40 p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffb800]">
              Android (Chrome)
            </h2>
            <ol className="mt-4 flex flex-col gap-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#ffb800]">
              <li>1. Toque no menu do navegador (os três pontos).</li>
              <li>2. Escolha &quot;Instalar app&quot; ou &quot;Adicionar à tela inicial&quot;.</li>
              <li>3. Confirme em &quot;Instalar&quot;.</li>
              <li>4. Abra o app pelo ícone na tela inicial.</li>
            </ol>
          </section>
        ) : null}

        {plataforma === "outro" || plataforma === "desconhecido" ? (
          <div className="mt-10 flex flex-col gap-6">
            <section className="border border-[#ffb800]/40 p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffb800]">
                iPhone / iPad (Safari)
              </h2>
              <ol className="mt-4 flex flex-col gap-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#ffb800]">
                <li>1. Toque no botão Compartilhar.</li>
                <li>2. Escolha &quot;Adicionar à Tela de Início&quot;.</li>
                <li>3. Confirme em &quot;Adicionar&quot;.</li>
              </ol>
            </section>
            <section className="border border-[#ffb800]/40 p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffb800]">
                Android (Chrome)
              </h2>
              <ol className="mt-4 flex flex-col gap-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#ffb800]">
                <li>1. Toque no menu (três pontos).</li>
                <li>2. Escolha &quot;Instalar app&quot;.</li>
                <li>3. Confirme em &quot;Instalar&quot;.</li>
              </ol>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
