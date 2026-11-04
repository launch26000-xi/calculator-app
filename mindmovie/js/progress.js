// Progress tab: daily streak, calendar of days watched, daily reminder.
import { h, icon, toast, confirmBox } from './ui.js';
import { db } from './db.js';
import { on, emit } from './store.js';

let root, days = new Set(), month = new Date(), reminder = { on: false, time: '08:00' };

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function loadProgress() {
  days = new Set(await db.kvGet('watched', []));
  reminder = await db.kvGet('reminder', reminder);
  startReminderLoop();
}

export async function markWatched(d = new Date()) {
  const k = dayKey(d);
  const isNew = !days.has(k);
  days.add(k);
  await db.kvSet('watched', [...days]);
  emit('progress');
  if (isNew) toast(`Watched today ✓ — streak ${streak().current} day${streak().current === 1 ? '' : 's'}`);
  render();
}
async function unmark(k) { days.delete(k); await db.kvSet('watched', [...days]); emit('progress'); render(); }

export function streak() {
  const d = new Date();
  let current = 0;
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not yet watched: streak still alive from yesterday
  while (days.has(dayKey(d))) { current++; d.setDate(d.getDate() - 1); }
  const sorted = [...days].sort();
  let best = 0, run = 0, prev = null;
  for (const k of sorted) {
    const t = new Date(k + 'T12:00:00');
    if (prev && Math.round((t - prev) / 86400000) === 1) run++; else run = 1;
    best = Math.max(best, run); prev = t;
  }
  return { current, best, total: days.size, today: days.has(dayKey()) };
}

export function mountProgress(el) { root = el; render(); on('progress', render); }

function calendar() {
  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const n = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(h('span', { class: 'cal-cell empty' }));
  const today = dayKey();
  for (let d = 1; d <= n; d++) {
    const k = dayKey(new Date(y, m, d));
    const done = days.has(k);
    cells.push(h('button', { class: 'cal-cell' + (done ? ' done' : '') + (k === today ? ' today' : ''), 'aria-label': `${k}${done ? ' watched' : ''}`, 'aria-pressed': String(done),
      onclick: async () => {
        if (k > today) return toast('That day hasn’t happened yet');
        if (done) { if (await confirmBox('Remove this day?', k + ' will be unmarked.', 'Remove', true)) unmark(k); }
        else if (await confirmBox('Mark as watched?', 'Mark ' + k + ' as a day you watched your Mind Movie.', 'Mark watched')) { days.add(k); await db.kvSet('watched', [...days]); emit('progress'); render(); }
      } }, String(d)));
  }
  return h('div', { class: 'cal' },
    h('div', { class: 'cal-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Previous month', onclick: () => { month = new Date(y, m - 1, 1); render(); } }, '‹'),
      h('strong', {}, first.toLocaleString(undefined, { month: 'long', year: 'numeric' })),
      h('button', { class: 'icon-btn', 'aria-label': 'Next month', onclick: () => { month = new Date(y, m + 1, 1); render(); } }, '›')),
    h('div', { class: 'cal-dow' }, ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => h('span', {}, d))),
    h('div', { class: 'cal-grid' }, cells));
}

function render() {
  if (!root) return;
  const s = streak();
  const time = h('input', { type: 'time', value: reminder.time, 'aria-label': 'Reminder time' });
  time.addEventListener('change', async () => { reminder.time = time.value || '08:00'; await saveReminder(); toast('Reminder time saved'); });
  const cb = h('input', { type: 'checkbox', checked: reminder.on });
  cb.addEventListener('change', async () => {
    if (cb.checked) {
      if (!('Notification' in window)) { cb.checked = false; return toast('Notifications are not supported here'); }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { cb.checked = false; return toast('Notifications are blocked — allow them in site settings'); }
    }
    reminder.on = cb.checked; await saveReminder();
    toast(reminder.on ? 'Daily reminder on at ' + reminder.time : 'Reminder off');
  });
  root.replaceChildren(h('div', { class: 'prog' },
    h('section', { class: 'card hero center' },
      h('div', { class: 'streak-num' }, String(s.current)),
      h('div', { class: 'streak-label' }, s.current === 1 ? 'day streak' : 'day streak'),
      h('div', { class: 'stats' }, h('span', {}, h('strong', {}, s.best), ' best'), h('span', {}, h('strong', {}, s.total), ' days total'), h('span', {}, s.today ? '✓ watched today' : 'not watched yet today')),
      h('button', { class: 'btn primary', disabled: s.today, onclick: () => markWatched() }, icon('check'), s.today ? ' Done for today' : ' I watched today')),
    h('section', { class: 'card' }, h('h2', {}, 'Days watched'), h('p', { class: 'muted small' }, 'Playing your movie to the end in the Play tab marks the day automatically. Tap a day to fix it by hand.'), calendar()),
    h('section', { class: 'card' }, h('h2', {}, icon('bell'), ' Daily reminder'),
      h('label', { class: 'prop toggle' }, cb, h('span', { class: 'sw' }), h('span', {}, 'Remind me every day')),
      h('div', { class: 'prop' }, h('label', {}, 'Time'), time),
      h('button', { class: 'btn sm', onclick: () => testNotification() }, 'Send a test reminder'),
      h('p', { class: 'muted small' }, 'Reminders appear while the app is open or running in the background. On Android, installing the app to the home screen makes background reminders more reliable.'))));
}

async function saveReminder() {
  await db.kvSet('reminder', reminder);
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && 'periodicSync' in reg) {
      if (reminder.on) await reg.periodicSync.register('mm-reminder', { minInterval: 60 * 60 * 1000 }).catch(() => {});
      else await reg.periodicSync.unregister('mm-reminder').catch(() => {});
    }
  } catch (e) { /* optional */ }
}

async function showReminder(body) {
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-96.png', tag: 'mm-reminder' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification('Mind Movie', opts); else new Notification('Mind Movie', opts);
  } catch (e) {
    try { new Notification('Mind Movie', opts); } catch (e2) { toast(body); }
  }
}
async function testNotification() {
  if (!('Notification' in window)) return toast('Notifications are not supported here');
  if ((await Notification.requestPermission()) !== 'granted') return toast('Notifications are blocked');
  await showReminder('Time to watch your Mind Movie ✨');
  toast('Test reminder sent — check your notifications');
}

let loopStarted = false;
function startReminderLoop() {
  if (loopStarted) return; loopStarted = true;
  setInterval(async () => {
    if (!reminder.on || Notification.permission !== 'granted') return;
    const now = new Date();
    const [hh, mm] = reminder.time.split(':').map(Number);
    if (now.getHours() * 60 + now.getMinutes() < hh * 60 + mm) return;
    const k = dayKey();
    if (days.has(k) || (await db.kvGet('remindedOn', '')) === k) return;
    await db.kvSet('remindedOn', k);
    showReminder('Time to watch your Mind Movie ✨ Keep your streak going.');
  }, 30000);
}
