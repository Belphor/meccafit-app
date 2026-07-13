"use client";

import { motion } from "framer-motion";
import { DASHBOARD_TAP_TARGET } from "@/lib/dashboard-config";

type TermsStepProps = {
  onAccept: () => void;
};

const TERMS_SECTIONS = [
  {
    title: "Exclusividade do altar",
    body: "O MECCAFIT é um ambiente soberano da FENYXIA. Seu acesso é pessoal, intransferível e vinculado à sua linhagem. Compartilhar conta, credenciais ou sessões viola o contrato e pode resultar em banimento imediato.",
  },
  {
    title: "Verdade no registro, o VTC",
    body: "O Volume Total de Carga, o VTC, é a medida sagrada do braseiro. Registrar pesos, séries ou sessões falsas, ou manipular dados para simular progresso, é fraude. A Fênix não perdoa cinzas inventadas.",
  },
  {
    title: "Conduta e comunidade",
    body: "No mural, no ranking e em qualquer superfície do produto, vale o rigor: respeito, honestidade e disciplina. Assédio, sabotagem ou tentativas de burlar os sistemas de pureza e anti-fraude são infrações graves.",
  },
  {
    title: "Punições e banimento",
    body: "Infrações, trapaça de dados de VTC ou violação destes termos resultam em punições severas, incluindo suspensão do altar e banimento permanente do produto, sem aviso prévio prolongado.",
  },
  {
    title: "Aceite único",
    body: "Ao avançar, você declara ter lido e compreendido estas diretrizes. Este aceite fica registrado na sua sessão e não será solicitado novamente enquanto permanecer válido.",
  },
] as const;

export function TermsStep({ onAccept }: TermsStepProps) {
  return (
    <motion.div
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-black px-4 py-10 sm:px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(245,158,11,0.09),rgba(0,0,0,0.88)_46%,#000_82%)]" />
      <div className="pointer-events-none absolute inset-x-[-18%] bottom-[-30%] h-[46vh] bg-gradient-to-t from-orange-950/25 via-orange-600/10 to-transparent blur-3xl" />

      <div className="relative z-[1] flex w-full max-w-lg flex-col gap-6">
        <header className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/70">
            Contrato da linhagem
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-orange-300 via-amber-100 to-amber-500 bg-clip-text text-3xl font-black uppercase tracking-[0.12em] text-transparent sm:text-4xl">
            Diretrizes FENYXIA
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            Leia com atenção. Um único aceite libera o altar.
          </p>
        </header>

        <div
          className="max-h-[min(52vh,420px)] overflow-y-auto rounded-3xl border border-orange-500/20 bg-neutral-950/55 p-5 shadow-[inset_0_1px_0_rgba(251,191,36,0.06),0_0_48px_rgba(249,115,22,0.1)] backdrop-blur-xl sm:p-6"
          role="region"
          aria-label="Políticas e contrato FENYXIA"
        >
          <ul className="flex flex-col gap-5">
            {TERMS_SECTIONS.map((section) => (
              <li
                key={section.title}
                className="border-b border-orange-500/10 pb-5 last:border-b-0 last:pb-0"
              >
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/90">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-300">{section.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={onAccept}
          className={`${DASHBOARD_TAP_TARGET} w-full rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-black transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[inset_0_0_34px_rgba(255,255,255,0.42),0_0_52px_rgba(249,115,22,0.42)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 sm:text-sm`}
        >
          Li e concordo com as diretrizes da FENYXIA
        </button>
      </div>
    </motion.div>
  );
}
