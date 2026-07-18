/**
 * Validação estática das correções responsivas do plano pré-lançamento.
 * Não sobe browser — garante que as classes/tokens críticos estão no código.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (err) {
    checks.push({ name, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

// —— Onda 0 ——
check("nav fixa (não sticky)", () => {
  const src = read("src/components/navigation/fenyxia-app-nav.tsx");
  assert(src.includes("fixed inset-x-0 bottom-0"), "esperado fixed inset-x-0 bottom-0");
  assert(!src.includes("sticky bottom-0"), "sticky bottom-0 ainda presente");
});

check("AppShell reserva 5.5rem", () => {
  const src = read("src/components/navigation/app-shell.tsx");
  assert(src.includes("pb-[calc(5.5rem+env(safe-area-inset-bottom))]"), "reserva 5.5rem ausente");
});

check("phoenix-anchor clearance mobile", () => {
  const css = read("src/app/globals.css");
  assert(css.includes("5.5rem + env(safe-area-inset-bottom)") || css.includes("calc(5.5rem + env(safe-area-inset-bottom))"), "clearance orb ausente");
});

check("greeting acima do orb no mobile", () => {
  const css = read("src/app/globals.css");
  assert(css.includes("phoenix-orb-greeting-revealed-in-mobile"), "keyframes mobile ausente");
  assert(css.includes("bottom: calc(100% + 0.65rem)"), "posição acima do orb ausente");
});

check("HUD ANYMA min-w-0 no mobile", () => {
  const src = read("src/components/dashboard/PhoenixHelper.tsx");
  assert(src.includes("w-[min(100vw-2rem,24rem)]"), "largura mobile HUD ausente");
  assert(src.includes("min-w-0"), "min-w-0 ausente");
});

check("toast fase acima da nav", () => {
  const src = read("src/components/dashboard/PhoenixPhaseEngine.tsx");
  assert(src.includes("max-sm:bottom-[max(6.25rem"), "inset toast mobile ausente");
});

check("tour callout margem inferior", () => {
  const src = read("src/components/dashboard/AnimaTourCallout.tsx");
  assert(src.includes("resolveViewportBottomMargin"), "helper de margem ausente");
});

check("padding shell/painéis reduzido", () => {
  const src = read("src/lib/dashboard-config.ts");
  assert(src.includes("p-2.5 max-[359px]:p-2"), "padding base reduzido ausente");
  assert(src.includes("pb-4"), "shell pb-4 mobile esperado");
});

// —— Onda 1 ——
check("mapa corporal min-h mobile", () => {
  const src = read("src/components/evolution/human-body-svg.tsx");
  assert(src.includes("min-h-[min(38dvh,280px)]"), "min-h mapa não baixou");
});

check("selfie CTAs 1 col até sm", () => {
  const src = read("src/components/dashboard/EvolucaoSelfiePanel.tsx");
  assert(src.includes("grid-cols-1 gap-2 sm:grid-cols-3"), "grid selfie incorreto");
  assert(!src.includes("xs:grid-cols-3"), "xs:grid-cols-3 ainda presente");
});

check("réguas em cards no mobile", () => {
  const src = read("src/components/evolution/EvolutionLevelsTable.tsx");
  assert(src.includes("md:hidden"), "lista mobile ausente");
  assert(src.includes("hidden overflow-x-auto md:block") || src.includes("hidden w-full min-w-[400px]") || src.includes("hidden overflow-x-auto md:block"), "tabela md+ ausente");
});

check("comunidade nav 2 cols", () => {
  const src = read("src/components/comunidade/comunidade-layout.ts");
  assert(src.includes("grid-cols-2"), "grid-cols-2 ausente");
  assert(src.includes("sm:grid-cols-5"), "sm:grid-cols-5 ausente");
  assert(src.includes('COMUNIDADE_SCROLL_MT = "scroll-mt-4 sm:scroll-mt-24"'), "scroll-mt mobile alto");
});

// —— Onda 2 ——
check("FORJA_COMMAND_PANEL sem min-h forçado no mobile", () => {
  const src = read("src/lib/forja-config.ts");
  assert(src.includes("min-h-0"), "min-h-0 ausente");
  assert(src.includes("sm:min-h-[min(72vh,720px)]") || src.includes("md:min-h-[min(72vh,720px)]"), "min-h desktop ausente");
});

check("FORJA_EMPTY_STATE compacto", () => {
  const src = read("src/lib/forja-config.ts");
  assert(src.includes("py-8"), "py-8 empty ausente");
  assert(!src.match(/FORJA_EMPTY_STATE =\n\s*"flex min-h-\[min\(48vh/), "empty ainda com min-h alto na base");
});

check("nav forjador scroll horizontal", () => {
  const src = read("src/components/forjador/forja-workspace-nav.tsx");
  assert(src.includes("overflow-x-auto"), "overflow-x-auto ausente");
  assert(src.includes("shrink-0"), "shrink-0 ausente");
});

check("medidas cards mobile", () => {
  const src = read("src/components/forjador/scientific-metrics-table.tsx");
  assert(src.includes("md:hidden"), "cards mobile ausentes");
  assert(src.includes("hidden overflow-x-auto rounded-xl border border-zinc-800/80 md:block"), "tabela md+ ausente");
});

check("VTC feed cards mobile", () => {
  const src = read("src/app/dashboard/forja/ForjaVtcFeedPanel.tsx");
  assert(src.includes("md:hidden"), "cards VTC ausentes");
  assert(src.includes("hidden overflow-x-auto md:block"), "tabela VTC md+ ausente");
});

check("fase referência cards", () => {
  const src = read("src/app/dashboard/forja/ForjaVtcPhaseReferencePanel.tsx");
  assert(src.includes("md:hidden"), "lista fase mobile ausente");
  assert(src.includes("md:table"), "tabela fase md+ ausente");
});

check("FALHA stack mobile", () => {
  const src = read("src/app/dashboard/forja/ForjaCommandPanel.tsx");
  assert(src.includes("flex-col gap-2 sm:flex-row"), "stack FALHA ausente");
  assert(src.includes("w-full sm:w-auto"), "CTA full-width ausente");
});

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.ok ? "" : ` — ${c.error}`}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks ok`);
if (failed.length) process.exit(1);
