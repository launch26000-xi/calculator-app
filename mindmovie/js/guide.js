// "Guide me" tour: spotlights one thing at a time with plain-words instructions.
import { h } from './ui.js';
import { emit } from './store.js';
import { db } from './db.js';

const STEPS = [
  { tab: 'library', sel: '.start-card', title: 'Welcome to your Mind Movie', text: 'This app helps you see, hear and feel the life you want — every day. I’ll show you around in about a minute. Tap Next.' },
  { tab: 'library', sel: '.aff-card', title: 'Write your affirmations', text: 'Type short lines like “I am…” or “I have…”, as if it is already true. Tap ✨ Ideas for ready-made lines.' },
  { tab: 'library', sel: '.action-grid', title: 'Add what makes you feel good', text: 'Photos of your dream life, short videos, your own voice saying your affirmations, and music you love.' },
  { tab: 'library', sel: '.tpl-card', title: 'Pick a template', text: 'One tap builds a whole looping movie from your words, photos, voice and music. No photos yet? It uses beautiful built-in visuals.' },
  { tab: 'edit', sel: '.preview-wrap', title: 'Your movie', text: 'This is the preview. Tap it (or ▶) to play. With ↻ Loop on, it keeps going round.' },
  { tab: 'edit', sel: '.quickadd', title: 'Build it while it plays', text: 'Quick Add drops new words, photos, voice, flashes or sparkles in at the gold line — even while it’s looping.' },
  { tab: 'edit', sel: '.timeline', title: 'The timeline', text: 'Each row is a track. Tap a clip for its sliders. Drag to move, drag the edges to trim. Pinch to zoom.' },
  { tab: 'edit', sel: '.toolbar', title: 'Tools', text: '+ Track adds a new layer. ↶ ↷ undo and redo. ✂ splits a clip. Export saves a video file.' },
  { tab: 'play', sel: '.stage', title: 'Watch daily', text: 'Play full screen. A short breathing moment helps you feel it first. Watching to the end counts toward your streak.' },
  { tab: 'progress', sel: '.streak-card', title: 'Track your progress', text: 'Your streak, the days you watched, how you felt, and your evidence journal of wins and signs.' },
  { tab: null, sel: '.help-top', title: 'Help any time', text: 'Tap ? at the top for this tour and how-to guides. Little ⓘ buttons explain each part. Enjoy creating!' },
];

let i = 0, layer = null, goTab = null;

export function initGuide(go) { goTab = go; }

export async function startTour() {
  i = 0;
  if (layer) layer.remove();
  layer = h('div', { class: 'tour', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Guided tour' });
  document.body.append(layer);
  document.addEventListener('keydown', onKey);
  await show();
}

async function show() {
  const s = STEPS[i];
  if (s.tab && goTab) goTab(s.tab);
  await new Promise((r) => setTimeout(r, 260));
  const target = document.querySelector(s.sel);
  if (target) target.scrollIntoView({ block: 'center', behavior: 'instant' });
  await new Promise((r) => requestAnimationFrame(r));
  const rect = target ? target.getBoundingClientRect() : { left: innerWidth / 2 - 60, top: innerHeight / 2 - 30, width: 120, height: 60 };
  const pad = 6;
  const spot = h('div', { class: 'tour-spot', style: { left: rect.left - pad + 'px', top: rect.top - pad + 'px', width: rect.width + pad * 2 + 'px', height: rect.height + pad * 2 + 'px' } });
  const below = rect.top + rect.height / 2 < innerHeight / 2;
  const bubble = h('div', { class: 'tour-bubble', style: below ? { top: Math.min(innerHeight - 230, rect.top + rect.height + 16) + 'px' } : { bottom: Math.min(innerHeight - 230, innerHeight - rect.top + 16) + 'px' } },
    h('div', { class: 'tour-count' }, `Step ${i + 1} of ${STEPS.length}`),
    h('h2', {}, s.title), h('p', {}, s.text),
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost sm', onclick: end }, 'Skip tour'),
      h('span', { class: 'spacer' }),
      i > 0 ? h('button', { class: 'btn sm', onclick: () => { i--; show(); } }, '← Back') : null,
      h('button', { class: 'btn primary sm tour-next', onclick: () => { if (i < STEPS.length - 1) { i++; show(); } else end(); } }, i < STEPS.length - 1 ? 'Next →' : 'Finish ✓')));
  layer.replaceChildren(spot, bubble);
  bubble.querySelector('.tour-next').focus();
}

function onKey(e) { if (e.key === 'Escape') end(); }
export function end() {
  document.removeEventListener('keydown', onKey);
  if (layer) layer.remove();
  layer = null;
  db.kvSet('toured', true);
  emit('tour-ended');
}
export function tourActive() { return !!layer; }
