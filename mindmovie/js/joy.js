// Feeling & belief boosters: affirmation idea packs, Feel-it-first breathing, feeling check-in, celebrations.
import { h, dialog, toast } from './ui.js';
import { db } from './db.js';
import { emit } from './store.js';

export const IDEAS = {
  '💰 Wealth & abundance': ['I am a magnet for money and opportunity.', 'Money flows to me easily and often.', 'I have more than enough, and I share it freely.', 'I am grateful for my growing income.', 'I live in my dream home, and it feels wonderful.', 'I am financially free.'],
  '💪 Health & energy': ['I am healthy, strong and full of energy.', 'My body heals and renews itself every day.', 'I love how I feel when I move my body.', 'I sleep deeply and wake up refreshed.', 'I choose foods that make me feel amazing.', 'Every cell in my body is vibrant and alive.'],
  '❤️ Love & relationships': ['I am loved, and I give love freely.', 'I attract kind, loving, supportive people.', 'My relationships are healthy and joyful.', 'I am worthy of deep, lasting love.', 'My home is full of laughter and warmth.', 'I forgive easily and feel light.'],
  '🦁 Confidence': ['I am confident, capable and calm.', 'I believe in myself completely.', 'I speak with power and clarity.', 'I take bold action toward my dreams.', 'I am proud of who I am becoming.', '{name}, you can do this — and you are doing it!'],
  '🚀 Career & purpose': ['I do work I love, and I am well paid for it.', 'Opportunities find me every day.', 'I am a leader others trust.', 'My ideas create real value in the world.', 'I finish what I start.', 'I am living my purpose.'],
  '🕊 Peace & gratitude': ['I am calm, centered and at peace.', 'I am grateful for this moment.', 'Everything is working out for me.', 'I let go of what I cannot control.', 'I am safe, and I am supported.', 'Thank you, thank you, thank you.'],
};

export async function ideasDialog() {
  const picked = new Set();
  const body = h('div', { class: 'ideas' },
    h('p', { class: 'muted small' }, 'Tap the lines that feel good to you, then “Add selected”. You can edit them afterwards.'),
    Object.entries(IDEAS).map(([cat, lines]) => h('details', { class: 'idea-cat' }, h('summary', {}, cat),
      lines.map((l) => { const b = h('button', { class: 'idea', 'aria-pressed': 'false', onclick: () => { const on = !picked.has(l); on ? picked.add(l) : picked.delete(l); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); } }, l); return b; }))));
  body.querySelector('details').open = true;
  const ok = await dialog({ title: '✨ Affirmation ideas', body, buttons: [{ label: 'Cancel', value: false }, { label: 'Add selected', value: true, primary: true }], cls: 'wide' });
  return ok ? [...picked] : [];
}

// ---------- Feel it first (breathing primer before playback) ----------
export async function primeEnabled() { return db.kvGet('prime', true); }
export function setPrime(v) { return db.kvSet('prime', !!v); }

export function prime(container, { breaths = 3 } = {}) {
  return new Promise((resolve) => {
    const words = ['Breathe in… picture it done', 'Hold… feel how good it is', 'Breathe out… say thank you'];
    const label = h('div', { class: 'prime-text' }, 'Get comfortable…');
    const count = h('div', { class: 'prime-count' }, '');
    const circle = h('div', { class: 'prime-circle' });
    const skip = h('button', { class: 'btn ghost sm', onclick: () => finish() }, 'Skip ⏭');
    const never = h('button', { class: 'btn ghost sm', onclick: () => { setPrime(false); toast('Breathing intro off — turn it back on in Settings'); finish(); } }, 'Don’t show again');
    const ov = h('div', { class: 'prime' }, circle, label, count, h('div', { class: 'row' }, skip, never));
    container.append(ov);
    let n = 0, timers = [];
    const phases = [['in', 4000], ['hold', 2000], ['out', 5000]];
    function cycle() {
      if (n >= breaths) return finish();
      count.textContent = `Breath ${n + 1} of ${breaths}`;
      let t = 0;
      phases.forEach(([ph, ms], k) => {
        timers.push(setTimeout(() => { circle.dataset.phase = ph; circle.style.transitionDuration = ms + 'ms'; label.textContent = words[k]; }, t));
        t += ms;
      });
      timers.push(setTimeout(() => { n++; cycle(); }, t));
    }
    timers.push(setTimeout(cycle, 600));
    function finish() { timers.forEach(clearTimeout); ov.remove(); resolve(); }
  });
}

// ---------- check-in after watching ----------
const FACES = ['😞', '😕', '😐', '🙂', '😊', '😄', '🤩'];
export async function checkIn() {
  let feel = 0;
  const faces = h('div', { class: 'faces', role: 'radiogroup', 'aria-label': 'How do you feel' }, FACES.map((f, i) => {
    const b = h('button', { class: 'face', role: 'radio', 'aria-checked': 'false', 'aria-label': `${i + 1} of 7`, onclick: () => { feel = i + 1; faces.querySelectorAll('.face').forEach((x, j) => { x.classList.toggle('on', j === i); x.setAttribute('aria-checked', String(j === i)); }); } }, f);
    return b;
  }));
  const note = h('textarea', { rows: 3, placeholder: 'Any evidence it’s working? A win, a sign, a coincidence, a good feeling… (optional)' });
  const ok = await dialog({ title: 'How do you feel right now?', body: h('div', { class: 'form' }, faces, h('label', {}, 'Evidence journal', note)),
    buttons: [{ label: 'Skip', value: false }, { label: 'Save', value: true, primary: true }] });
  if (!ok || (!feel && !note.value.trim())) return null;
  const entry = { at: Date.now(), feel, note: note.value.trim() };
  await addJournal(entry);
  toast(feel >= 5 ? 'Beautiful — hold onto that feeling ✨' : 'Saved. Every day it gets easier 💛');
  return entry;
}
export async function journal() { return db.kvGet('journal', []); }
export async function addJournal(e) { const j = await journal(); j.push(e); await db.kvSet('journal', j); emit('journal'); }
export async function removeJournal(at) { const j = (await journal()).filter((x) => x.at !== at); await db.kvSet('journal', j); emit('journal'); }
export const faceOf = (n) => FACES[Math.max(0, Math.min(6, n - 1))] || '·';

// ---------- celebrations ----------
export const MILESTONES = [3, 7, 14, 21, 30, 50, 66, 100, 150, 200, 365];
export function celebrate(title, text) {
  const cv = h('canvas', { class: 'confetti' });
  document.body.append(cv);
  cv.width = innerWidth; cv.height = innerHeight;
  const g = cv.getContext('2d');
  const cols = ['#e8c26a', '#f5dfa0', '#ff9fb8', '#5ad1ff', '#c58cff', '#7be07b'];
  const parts = Array.from({ length: 160 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: 3 + Math.random() * 5, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6 }));
  const t0 = performance.now();
  (function step(t) {
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.1; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }
    if (t - t0 < 3500) requestAnimationFrame(step); else cv.remove();
  })(t0);
  return dialog({ title, body: h('div', { class: 'celebrate' }, h('div', { class: 'cel-star' }, '🏆'), h('p', {}, text)), buttons: [{ label: 'Keep going! ✨', value: true, primary: true }] });
}
