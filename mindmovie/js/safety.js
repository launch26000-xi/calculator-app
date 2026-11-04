// Photosensitive seizure warnings, Safe Mode, binaural warnings.
import { h, dialog } from './ui.js';
import { state, emit } from './store.js';
import { db } from './db.js';
import { TRACK_TYPES } from './model.js';
import { SAFE_HZ } from './core.js';

const session = { flashOk: false, toneOk: false };

const seizureText = () => h('div', { class: 'warn-body' },
  h('p', {}, h('strong', {}, 'Photosensitive seizure warning. '), 'A very small percentage of people may have a seizure when exposed to flashing lights, flashing text or certain visual patterns — even people with no history of epilepsy.'),
  h('p', {}, 'Stop watching immediately and talk to a doctor if you feel dizzy, have blurred vision, eye or face twitching, jerking of arms or legs, disorientation, confusion or any involuntary movement.'),
  h('p', {}, 'Watch in a well-lit room, sit back from the screen, and take breaks.'),
  h('p', { class: 'muted small' }, `Safe Mode is ON by default: flashing is capped at ${SAFE_HZ} flashes per second and fast saturated-red flashing is blocked, following the WCAG “three flashes” guideline.`));

export async function firstLaunch() {
  if (await db.kvGet('warnedSeizure', false)) return;
  await dialog({ title: 'Before you begin', body: seizureText(), dismissable: false, buttons: [{ label: 'I understand', value: true, primary: true }] });
  await db.kvSet('warnedSeizure', true);
}

export function hasFlashing(project) {
  return project.tracks.some((t) => !t.hidden && t.clips.length && (t.type === 'flash' || t.type === 'color' || (t.type === 'pattern' && t.clips.some((c) => c.props.pulseOn))));
}
export function hasTones(project) { return project.tracks.some((t) => t.type === 'binaural' && !t.mute && t.clips.length); }

// Call before playback. Resolves true if the user agreed to continue.
export async function beforePlay(project) {
  if (hasFlashing(project) && !session.flashOk) {
    const ok = await dialog({ title: 'This movie contains flashing', body: seizureText(), dismissable: true,
      buttons: [{ label: 'Cancel', value: false }, { label: state.safe ? 'Play (Safe Mode on)' : 'Play (Safe Mode OFF)', value: true, primary: true }] });
    if (!ok) return false;
    session.flashOk = true;
  }
  if (hasTones(project) && !session.toneOk) {
    const ok = await toneWarning();
    if (!ok) return false;
  }
  return true;
}

export async function toneWarning() {
  const ok = await dialog({ title: 'Binaural tone', body: h('div', {},
    h('p', {}, '🎧 Binaural tones only work with headphones (a slightly different pitch in each ear).'),
    h('p', {}, h('strong', {}, 'Do not listen while driving, operating machinery, or doing anything that needs your full attention.')),
    h('p', { class: 'muted small' }, 'Keep the volume low. Stop if you feel unwell. Not recommended if you have epilepsy, a heart condition, or are pregnant, unless your doctor agrees.')),
  buttons: [{ label: 'Cancel', value: false }, { label: 'I understand', value: true, primary: true }] });
  if (ok) session.toneOk = true;
  return !!ok;
}

export async function setSafeMode(on) {
  if (!on) {
    const ok = await dialog({ title: 'Turn Safe Mode off?', body: h('div', {},
      h('p', {}, 'With Safe Mode off, flashes can run faster than 3 per second and saturated red can flash. This can trigger seizures in people with photosensitive epilepsy.'),
      h('p', {}, 'Only turn it off if you are sure no one watching is sensitive to flashing light.')),
    buttons: [{ label: 'Keep Safe Mode on', value: false, primary: true }, { label: 'Turn it off', value: true, danger: true }] });
    if (!ok) return false;
    session.flashOk = false;
  }
  state.safe = on;
  await db.kvSet('safeMode', on);
  emit('safe'); emit('change');
  return true;
}
export async function loadSafeMode() { state.safe = await db.kvGet('safeMode', true); }
export function trackNeedsToneWarning(type) { return type === 'binaural' && !session.toneOk; }
export { TRACK_TYPES };
