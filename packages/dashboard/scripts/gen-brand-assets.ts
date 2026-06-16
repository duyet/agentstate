/**
 * Regenerate the AgentState brand PNG assets + favicon.ico from the
 * "stacked state layers" mark.
 *
 * Mark source of truth: src/components/logo-mark.tsx
 *   (3 rounded rects, ascending fill-opacity 0.35 / 0.65 / 1.0, viewBox 0 0 24 24)
 *
 * Run:
 *   cd packages/dashboard && bun run scripts/gen-brand-assets.ts
 *
 * Requires @resvg/resvg-js (devDependency).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const BRAND = resolve("public/brand");
const PUBLIC = resolve("public");
mkdirSync(BRAND, { recursive: true });

const BASE = "#09090b"; // app canvas / dark tile
const INK = "#0a0a0a"; // mark on light backgrounds
const WHITE = "#fafafa"; // mark on dark backgrounds

/** Standalone mark — 3 stacked state layers, ascending opacity. viewBox 24. */
function markSvg(fill: string, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
  <rect x="3" y="4" width="18" height="4" rx="2" fill="${fill}" fill-opacity="0.35"/>
  <rect x="3" y="10" width="18" height="4" rx="2" fill="${fill}" fill-opacity="0.65"/>
  <rect x="3" y="16" width="18" height="4" rx="2" fill="${fill}"/>
</svg>`;
}

/** Mark centered in a rounded-square tile. viewBox 32. */
function tileSvg(bg: string, fg: string, size: number, radius = 7): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" rx="${radius}" fill="${bg}"/>
  <g transform="translate(4 4)">
    <rect x="3" y="4" width="18" height="4" rx="2" fill="${fg}" fill-opacity="0.35"/>
    <rect x="3" y="10" width="18" height="4" rx="2" fill="${fg}" fill-opacity="0.65"/>
    <rect x="3" y="16" width="18" height="4" rx="2" fill="${fg}"/>
  </g>
</svg>`;
}

function raster(svg: string, size: number): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  return Buffer.from(resvg.render().asPng());
}

function write(rel: string, dir: string, data: Buffer): void {
  const p = resolve(dir, rel);
  mkdirSync(resolve(p, ".."), { recursive: true });
  writeFileSync(p, data);
  console.log(
    `✓ ${resolve(dir, rel).replace(resolve(""), "./").replace("/public/", "/")} (${data.length} bytes)`,
  );
}

// --- standalone mark PNGs (transparent) ---
write("agentstate-logo.png", BRAND, raster(markSvg(INK, 512), 512)); // light bg
write("agentstate-logo-dark.png", BRAND, raster(markSvg(WHITE, 512), 512)); // dark bg

// --- tile PNGs ---
write("app-icon.png", BRAND, raster(tileSvg(BASE, WHITE, 1024), 1024));
write("apple-touch-icon.png", BRAND, raster(tileSvg(BASE, WHITE, 180), 180));
write("favicon-light-32.png", BRAND, raster(tileSvg(WHITE, INK, 32), 32)); // light chrome
write("favicon-dark-32.png", BRAND, raster(tileSvg(BASE, WHITE, 32), 32)); // dark chrome

// --- favicon.ico (multi-res, dark tile) → replaces stale public/favicon.ico ---
const ico = buildIco([
  { size: 32, png: raster(tileSvg(BASE, WHITE, 32), 32) },
  { size: 16, png: raster(tileSvg(BASE, WHITE, 16), 16) },
]);
write("favicon.ico", PUBLIC, ico);
write("favicon.ico", BRAND, ico); // also downloadable from the brand page

/** Minimal PNG-based .ico container (Vista+, supports PNG entries directly). */
function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const count = images.length;
  const dirBytes = 6 + 16 * count;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);

  const entries: Buffer[] = [];
  const blobs: Buffer[] = [];
  let offset = dirBytes;
  for (const img of images) {
    const e = Buffer.alloc(16);
    const dim = img.size >= 256 ? 0 : img.size;
    e.writeUInt8(dim, 0); // width
    e.writeUInt8(dim, 1); // height
    e.writeUInt8(0, 2); // colorCount (0 = ≥8bpp)
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(img.png.length, 8); // image size
    e.writeUInt32LE(offset, 12); // image offset
    entries.push(e);
    blobs.push(img.png);
    offset += img.png.length;
  }
  return Buffer.concat([header, ...entries, ...blobs]);
}

console.log("\nDone. PNGs in public/brand/, favicon.ico updated.");
