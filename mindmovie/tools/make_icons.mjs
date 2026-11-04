// Renders the Mind Movie icon to PNGs. Run: node tools/make_icons.mjs (uses pre-installed Playwright Chromium)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const svg = (pad, rx) => {
  let spiral = '';
  for (let i = 0; i <= 600; i++) { const th = i / 600 * Math.PI * 2 * 3.2; const r = 18 + th * 11; spiral += (i ? 'L' : 'M') + (256 + Math.cos(th) * r).toFixed(1) + ' ' + (256 + Math.sin(th) * r).toFixed(1); }
  let stars = '';
  const pts = [[90, 100, 2.4], [420, 80, 2], [440, 400, 2.6], [70, 420, 1.8], [380, 160, 1.6], [130, 300, 1.5], [300, 450, 1.8], [200, 70, 1.4]];
  for (const [x, y, r] of pts) stars += `<circle cx="${x}" cy="${y}" r="${r * 2}" fill="#fff" opacity=".85"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#3a3596"/><stop offset=".55" stop-color="#171e60"/><stop offset="1" stop-color="#0a0e2c"/></radialGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1c4"/><stop offset=".5" stop-color="#e8c26a"/><stop offset="1" stop-color="#b8862e"/></linearGradient>
<filter id="glow"><feGaussianBlur stdDeviation="10"/></filter></defs>
<rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
${stars}
<path d="${spiral}" fill="none" stroke="#e8c26a" stroke-width="7" opacity=".28"/>
<circle cx="256" cy="256" r="120" fill="#e8c26a" opacity=".35" filter="url(#glow)"/>
<circle cx="256" cy="256" r="118" fill="none" stroke="url(#g)" stroke-width="14"/>
<path d="M226 196 L318 256 L226 316 Z" fill="url(#g)" stroke="#fff1c4" stroke-width="6" stroke-linejoin="round"/>
<path d="M256 92 l9 22 22 9 -22 9 -9 22 -9 -22 -22 -9 22 -9z" fill="#fff6d8" transform="translate(110 10) scale(.8)"/>
</g></svg>`;
};
const out = path.join(root, 'icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.svg'), svg(0, 110));
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(file, size, pad, rx) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(pad, rx).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: path.join(out, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
for (const s of [96, 192, 512]) await render(`icon-${s}.png`, s, 0, 0);
await render('apple-touch-icon.png', 180, 0, 0);
await render('maskable-192.png', 192, 70, 0);
await render('maskable-512.png', 512, 70, 0);
await browser.close();
console.log('icons written');
