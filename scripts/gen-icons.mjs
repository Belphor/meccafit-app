/**
 * Gera um conjunto de ícones nítidos a partir de public/icon-512.png (mark 1024²).
 * Uso: node scripts/gen-icons.mjs
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pub = resolve(process.cwd(), "public");
const SRC = readFileSync(resolve(pub, "icon-512.png")); // buffer do original (1024²)
const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };

async function square(size, out) {
  await sharp(SRC)
    .resize(size, size, { fit: "cover", kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toFile(resolve(pub, out));
  console.log(`OK ${out} (${size}x${size})`);
}

/** Maskable: mark reduzido dentro da zona de segurança (~82%) sobre fundo preto. */
async function maskable(size, out, ratio = 0.82) {
  const inner = Math.round(size * ratio);
  const fg = await sharp(SRC).resize(inner, inner, { kernel: "lanczos3" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BLACK } })
    .composite([{ input: fg, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(pub, out));
  console.log(`OK ${out} (maskable ${size}x${size})`);
}

await square(512, "icon-512.png");
await square(192, "icon-192.png");
await square(180, "apple-touch-icon.png");
await square(32, "favicon-32.png");
await square(16, "favicon-16.png");
await maskable(512, "icon-maskable-512.png");

console.log("\nÍcones gerados.");
