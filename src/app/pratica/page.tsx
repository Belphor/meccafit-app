"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type EtapaPratica = "nome" | "resultado";

export default function PraticaPage() {
  const [contador, setContador] = useState(10);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [etapa, setEtapa] = useState<EtapaPratica>("nome");
  const [enviando, setEnviando] = useState(false);

  async function simularEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setEnviando(false);
    setEtapa("resultado");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-neutral-800 pb-6">
          <Link href="/" className="text-sm text-orange-400 hover:text-orange-300">
            Voltar para o Phoenix
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Atenas Lab</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Prática para iniciantes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
              Estes exercícios já vêm funcionando para você mexer aos poucos. Mude valores,
              textos e botões para entender como React atualiza a tela.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-neutral-800 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Exercício 1</p>
          <h2 className="mt-2 text-xl font-medium">Contador</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Treino: entender que <code className="text-orange-300">useState</code> guarda um
            valor e <code className="text-orange-300">setContador</code> muda esse valor.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="min-w-12 rounded-lg bg-neutral-900 px-4 py-2 text-center font-mono text-2xl">
              {contador}
            </span>
            <button
              type="button"
              onClick={() => setContador((valorAtual) => valorAtual + 1)}
              className="rounded-lg bg-white px-4 py-2 font-medium text-black transition hover:bg-neutral-200"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => setContador((valorAtual) => valorAtual + 5)}
              className="rounded-lg bg-white px-4 py-2 font-medium text-black transition hover:bg-neutral-200"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => setContador((valorAtual) => valorAtual - 1)}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-200 transition hover:bg-neutral-900"
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => setContador(0)}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-400 transition hover:bg-neutral-900"
            >
              Zerar
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Exercício 2</p>
          <h2 className="mt-2 text-xl font-medium">Mostrar e esconder</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Treino: Treino Concluído.
          </p>

          <button
            type="button"
            onClick={() => setMostrarTexto((valorAtual) => !valorAtual)}
            className="mt-5 rounded-lg bg-orange-600 px-4 py-2 font-medium text-white transition hover:bg-orange-500"
          >
            {mostrarTexto ? "Esconder texto" : "Mostrar texto"}
          </button>

          {mostrarTexto ? (
            <p className="mt-4 rounded-lg bg-neutral-900 p-4 text-sm text-neutral-300">
              Este texto só existe na tela quando <code className="text-orange-300">Apertar o botão</code>{" "}
              está como <strong>true</strong>.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-neutral-800 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Exercício 3</p>
          <h2 className="mt-2 text-xl font-medium">Formulário simples</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Treino: input controlado, envio de formulário e UI travada durante carregamento.
          </p>

          {etapa === "nome" ? (
            <form onSubmit={simularEnvio} className="mt-5 flex max-w-md flex-col gap-3">
              <label htmlFor="nome" className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Seu nome
              </label>
              <input
                id="nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                disabled={enviando}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Digite seu nome"
              />
              <input
                id="idade"
                value={idade}
                onChange={(event) => setIdade(event.target.value)}
                disabled={enviando}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Digite sua idade"
              />
              <button
                type="submit"
                disabled={enviando || nome.trim().length === 0 || idade.trim().length === 0}
                className="rounded-lg bg-red-500 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-lg bg-neutral-900 p-4">
              <p className="text-neutral-300">
                Muito bem, <strong className="text-white">{nome.trim()}, {idade.trim()}</strong>. Você acabou de
                praticar estado, formulário e carregamento.
              </p>
              <button
                type="button"
                onClick={() => {
                  setNome("");
                  setIdade("");
                  setEtapa("nome");
                }}
                className="mt-4 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
              >
                Fazer de novo
              </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-orange-900/50 bg-orange-950/10 p-6">
          <h2 className="text-xl font-medium text-orange-200">Missões para você praticar</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-neutral-300">
            <li>Faça o contador começar em 10 em vez de 0.</li>
            <li>Crie um botão que soma +5.</li>
            <li>Troque a frase do texto escondido.</li>
            <li>Mude a cor do botão de enviar.</li>
            <li>Faça o formulário mostrar também uma idade.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
