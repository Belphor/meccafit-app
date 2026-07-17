import type { Metadata } from "next";
import QRCode from "qrcode";
import { PrintButton } from "./PrintButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cartaz do Balcão — FENYXIA Meccafit",
  robots: { index: false, follow: false },
};

/** URL do handshake que o QR físico do balcão dispara ao ser escaneado. */
const HANDSHAKE_QR_URL =
  process.env.FENYXIA_HANDSHAKE_QR_URL?.trim() ||
  "https://www.fenyxia.com.br/api/counter-handshake";

/**
 * Cartaz imprimível para o balcão da academia.
 * QR (preto sobre branco, para leitura garantida) + instruções para iPhone
 * logo abaixo. Fundo IRIS na tela; layout limpo na impressão.
 */
export default async function BalcaoPage() {
  const qrSvg = await QRCode.toString(HANDSHAKE_QR_URL, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-black px-6 py-12 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 12mm; }
        }
      `}</style>

      <section className="flex w-full max-w-md flex-col items-center border border-[#ffb800]/30 px-8 py-10 print:border-0">
        <p className="text-3xl font-bold uppercase tracking-[0.28em] text-[#ff4500] print:text-black">
          FENYXIA
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.4em] text-[#ffb800] print:text-black">
          Meccafit
        </p>

        <p className="mt-8 text-center text-sm font-bold uppercase tracking-[0.16em] text-[#ffb800] print:text-black">
          Escaneie para instalar o app
        </p>

        <div
          className="mt-5 w-full max-w-[16rem] bg-white p-4"
          aria-label="QR Code de instalação"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb800]/70 print:text-black">
          Aproxime a câmera do celular do código acima
        </p>

        <div className="mt-8 w-full border-t border-[#ffb800]/25 pt-6 print:border-black/30">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[#ff4500] print:text-black">
            iPhone (Safari)
          </p>
          <ol className="mt-3 flex flex-col gap-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#ffb800] print:text-black">
            <li>1. Toque no botão Compartilhar</li>
            <li>2. Escolha &quot;Adicionar à Tela de Início&quot;</li>
            <li>3. Confirme em &quot;Adicionar&quot;</li>
          </ol>
          <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ffb800]/70 print:text-black">
            Android: o navegador oferece &quot;Instalar app&quot; automaticamente
          </p>
        </div>
      </section>

      <PrintButton />
    </main>
  );
}
