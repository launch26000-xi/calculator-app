/* Colorado No2 — shared screen helpers. */
import { CATEGORIES, VERIFY } from './data.js';
import { PYRAMID, PYRAMID_LINE, LESSONS } from './content/foundation.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const main = document.getElementById('main');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => '$' + Number(n).toLocaleString('en-US');

/* Saved on this phone only (safe if storage is blocked) */
export const store = {
  get(k, d) { try { const v = localStorage.getItem('no2.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('no2.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem('no2.' + k); } catch { /* ignore */ } },
};

export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3800);
}

export const fmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
export const fmtTs = (ts) => (ts && ts.toDate ? ts.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'just now');
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function todaysLesson() {
  const t = todayISO();
  const past = LESSONS.filter((l) => l.date <= t);
  return past.length ? past[past.length - 1] : LESSONS[0];
}
/* Education first: a slim link to today's lesson at the top of non-lesson screens */
export function lessonStrip() {
  const l = todaysLesson();
  return `<a class="lesson-strip" href="#/lesson/${l.id}"><span class="ls-tag">Today’s lesson</span><span class="ls-title">${esc(l.title)}</span><span aria-hidden="true">→</span></a>`;
}

/* Logo: "No2" stenciled on a wooden crate, "Colorado" underneath */
let logoN = 0;
export function logoSVG(cls = 'logo') {
  const i = ++logoN;
  return `<svg class="${cls}" viewBox="0 0 320 220" role="img" aria-label="Colorado No2 logo: No2 stenciled on a wooden crate">
  <defs>
    <linearGradient id="wd${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2A777"/><stop offset="1" stop-color="#B0814F"/></linearGradient>
    <filter id="rough${i}"><feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="2" seed="${i + 3}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.15"/><feComposite in="SourceGraphic" operator="in"/></filter>
  </defs>
  <rect x="6" y="6" width="308" height="208" rx="6" fill="url(#wd${i})" stroke="#6E4826" stroke-width="4"/>
  <g stroke="#7E5631" stroke-width="2.5" opacity=".75"><path d="M10 58H310M10 110H310M10 162H310"/></g>
  <g stroke="#9A6E43" stroke-width="1" opacity=".5" fill="none"><path d="M20 30 C90 26 160 36 300 28M24 86 C120 80 200 94 296 84M18 136 C110 132 210 142 300 134M22 190 C100 186 220 196 298 188"/></g>
  <g fill="#8A5E35"><rect x="6" y="6" width="22" height="208"/><rect x="292" y="6" width="22" height="208"/></g>
  <g fill="#4A3018"><circle cx="17" cy="20" r="3"/><circle cx="17" cy="200" r="3"/><circle cx="303" cy="20" r="3"/><circle cx="303" cy="200" r="3"/><circle cx="17" cy="110" r="3"/><circle cx="303" cy="110" r="3"/></g>
  <g filter="url(#rough${i})">
    <text x="160" y="138" text-anchor="middle" font-family="'No2 Stencil', Impact, sans-serif" font-weight="700" font-size="128" fill="#C8102E" transform="rotate(-4 160 110)" letter-spacing="2">No2</text>
    <text x="160" y="196" text-anchor="middle" font-family="'No2 Stencil', Impact, sans-serif" font-weight="700" font-size="34" fill="#0B2545" letter-spacing="8">COLORADO</text>
  </g>
</svg>`;
}

/* The Pyramid: built from bricks, A RULE (1, red) at the top, THE CONSTITUTION (100, navy) at the base. */
export function pyramidSVG() {
  const W = 360; const brickH = 22; const gap = 2; const unit = 30;
  let y = 6; let out = '';
  PYRAMID.forEach((row, r) => {
    if (row.bricks === 100) {
      const cols = 20; const rows = 5; const bw = (W - 8) / cols; const bh = 14; const x0 = 4;
      const top = y + 4;
      for (let rr = 0; rr < rows; rr++) {
        for (let c = 0; c < cols; c++) {
          out += `<rect x="${(x0 + c * bw + 0.75).toFixed(1)}" y="${top + rr * bh}" width="${(bw - 1.5).toFixed(1)}" height="${bh - 1.5}" rx="1" fill="#0B2545" stroke="#1E3A66" stroke-width=".6"/>`;
        }
      }
      const h = rows * bh;
      out += `<text x="${W / 2}" y="${top + h + 22}" text-anchor="middle" class="py-base">${row.label}</text>`;
      out += `<text x="${W / 2}" y="${top + h + 40}" text-anchor="middle" class="py-sub">${row.sub}</text>`;
      y = top + h + 44;
      return;
    }
    const bw = Math.min(unit, (W - 8) / row.bricks);
    const total = bw * row.bricks; const x0 = (W - total) / 2;
    for (let b = 0; b < row.bricks; b++) {
      out += `<rect x="${(x0 + b * bw + 1).toFixed(1)}" y="${y}" width="${(bw - gap).toFixed(1)}" height="${brickH}" rx="2" fill="${r === 0 ? '#C8102E' : '#D8C49A'}" stroke="${r === 0 ? '#8E0B20' : '#9C8355'}" stroke-width="1"/>`;
    }
    const narrow = total < 110;
    out += narrow
      ? `<text x="${x0 + total + 8}" y="${y + 15.5}" class="py-label">${row.label}</text>`
      : `<rect x="${(W / 2 - row.label.length * 4.4 - 8).toFixed(1)}" y="${y + 3}" width="${(row.label.length * 8.8 + 16).toFixed(1)}" height="${brickH - 6}" rx="8" fill="#FFFDF8" stroke="#9C8355"/><text x="${W / 2}" y="${y + 15.5}" text-anchor="middle" class="py-label">${row.label}</text>`;
    y += brickH + gap;
  });
  return `<figure class="pyramid" aria-labelledby="py-cap">
    <svg viewBox="0 0 ${W} ${y + 8}" role="img" aria-label="The Pyramid. From top to bottom: a rule is one brick; a policy, two; a procedure, three; a statute, five; a law, eight; lawful, ten; and the Constitution, one hundred bricks, the Supreme Law of the Land.">${out}</svg>
    <figcaption id="py-cap"><strong>The Pyramid.</strong> ${esc(PYRAMID_LINE)}</figcaption>
  </figure>`;
}

/* Category pictures */
const GLYPH = {
  handguns: '<path d="M6 16h30v8H22l-3 14h-8l3-14H6z"/><path d="M22 24v5h-5"/>',
  'long-guns': '<path d="M2 20h30l4-3h8v8H34l-6 4H16l-4 6H6l4-8H2z"/>',
  shotguns: '<path d="M2 18h32l10-2v8l-12 2-6 8H8l4-8H2z"/><path d="M2 21h32"/>',
  hunting: '<path d="M2 24h28l4-3h10v7H32l-6 4H16l-4 6H6l4-8H2z"/><rect x="12" y="14" width="16" height="5" rx="2"/><path d="M16 19v5M24 19v5"/>',
  slingshots: '<path d="M24 44V28M24 28L12 8M24 28L36 8"/><path d="M12 8c4 6 20 6 24 0"/>',
  'bear-mace': '<rect x="16" y="14" width="16" height="30" rx="4"/><path d="M19 14V8h10v6M29 8h6"/><path d="M20 26h8M20 31h8"/>',
  'self-defense': '<path d="M24 4l16 6v12c0 11-8 18-16 22C16 40 8 33 8 22V10z"/><path d="M17 24l5 5 9-10"/>',
  bows: '<path d="M14 4c16 8 16 32 0 40"/><path d="M14 4v40"/><path d="M6 24h36M36 20l6 4-6 4"/>',
  accessories: '<circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="4"/><path d="M24 4v10M24 34v10M4 24h10M34 24h10"/>',
  knives: '<path d="M4 30L32 10c6 0 10 2 10 6L20 32z"/><path d="M20 32l-4 4-6-2"/><path d="M4 30l6 4"/>',
  collectors: '<circle cx="24" cy="26" r="14"/><path d="M24 16l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L15 23l6-1z"/><path d="M18 4l6 8 6-8"/>',
};
export const glyph = (cat) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[cat] || ''}</svg>`;
export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || { id, name: id };

export function verifyTag(v) {
  const k = VERIFY[v] ? v : 'none';
  const cls = k === 'none' ? 'gray' : k === 'photoid' ? 'green' : 'navy';
  return `<span class="tag ${cls}" title="${esc(VERIFY[k].label)}">${k === 'none' ? '○' : '✓'} ${esc(VERIFY[k].short)}</span>`;
}
export const cautionOf = (ratings) => ratings.filter((r) => r.stars <= 2).length >= 3;
export const cautionTag = (ratings) => (cautionOf(ratings) ? '<span class="tag caution">⚠ Use Caution</span>' : '');
export const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
export const starText = (n) => { const r = Math.round(n); return '★'.repeat(r) + '☆'.repeat(5 - r); };

export function emptyState(title, text, action = '') {
  return `<div class="card empty"><p class="empty-title">${esc(title)}</p><p>${text}</p>${action}</div>`;
}
export function sourceLink(link, prefix = 'Official source') {
  return link ? `<a class="src" href="${esc(link.url)}" target="_blank" rel="noopener">${esc(prefix)}: ${esc(link.label)} ↗</a>` : '';
}
