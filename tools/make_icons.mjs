// Renders the No2 crate icon to PNGs in every size the manifest needs.
// Run: node tools/make_icons.mjs   (uses the pre-installed Playwright Chromium)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const font = fs.readFileSync(path.join(root, 'fonts/stencil.woff2')).toString('base64');

// pad = how much navy border around the crate (bigger for "maskable" so Android can crop to a circle)
const svg = (pad, rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><style>@font-face{font-family:S;src:url(data:font/woff2;base64,${font})}</style>
<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2A777"/><stop offset="1" stop-color="#B0814F"/></linearGradient>
<filter id="r"><feTurbulence type="fractalNoise" baseFrequency=".35" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.15"/><feComposite in="SourceGraphic" operator="in"/></filter></defs>
<rect width="512" height="512" rx="${rounded ? 104 : 0}" fill="#0B2545"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
  <rect x="16" y="66" width="480" height="380" rx="14" fill="url(#w)" stroke="#6E4826" stroke-width="8"/>
  <g fill="#8A5E35"><rect x="16" y="66" width="34" height="380"/><rect x="462" y="66" width="34" height="380"/></g>
  <path d="M50 166H462M50 256H462M50 346H462" stroke="#7E5631" stroke-width="5" opacity=".7"/>
  <g filter="url(#r)">
    <text x="256" y="312" text-anchor="middle" font-family="S" font-weight="700" font-size="220" fill="#C8102E" transform="rotate(-4 256 256)">No2</text>
    <text x="256" y="410" text-anchor="middle" font-family="S" font-weight="700" font-size="50" fill="#0B2545" letter-spacing="10">COLORADO</text>
  </g>

</g></svg>`;

const out = path.join(root, 'icons');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
async function shot(markup, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, file), omitBackground: true });
}
for (const s of [48, 72, 96, 128, 144, 152, 192, 256, 384, 512]) await shot(svg(10, true), s, `icon-${s}.png`);
for (const s of [192, 512]) await shot(svg(70, false), s, `maskable-${s}.png`);
await shot(svg(10, false), 180, 'apple-touch-icon.png');
await shot(svg(0, true), 32, 'favicon-32.png');
fs.writeFileSync(path.join(out, 'icon-source.svg'), svg(10, true));
await browser.close();
console.log('icons written to', out);
