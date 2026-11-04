// Plain-words how-to topics, little ⓘ buttons, and the Help screen.
import { h, dialog } from './ui.js';
import { emit } from './store.js';

export const HELP = {
  start: { icon: '🌟', title: 'How Mind Movie works', steps: [
    'Write a few affirmations — short, first person, present tense: “I am…”, “I have…”.',
    'Add things that make you feel good: photos of the life you want, short videos, your own voice, music you love.',
    'Tap a Template. It builds a looping movie for you in one tap.',
    'Press ▶ Play. While it loops, keep adding — new pieces appear on the next pass.',
    'Watch it every day. Feel it as if it is already true. Your streak grows on the Progress tab.'] },
  affirmations: { icon: '✍️', title: 'Writing affirmations that feel true', steps: [
    'Use “I am…”, “I have…”, “I choose…” — first person, present tense, as if it is already done.',
    'Make it specific and emotional: “I feel proud walking into my new home.”',
    'Type {name} to put your name in: “{name}, you did it!” (set your name in Settings).',
    'Tap ✨ Ideas for ready-made lines on money, health, love, confidence and peace.',
    'Use ↑ ↓ to change the order, and “+ Timeline” to put one line on the movie.'] },
  media: { icon: '📸', title: 'Adding photos, video, voice and music', steps: [
    'Upload photos & videos: pick from your gallery.',
    'Take a photo / Film a video: opens your camera. Live camera lets you snap and record right here.',
    'Record my voice: speak your affirmations. Your own voice is powerful — you can layer several copies and speed them up.',
    'Upload music: mp3, m4a or wav. Mind Movie can find the beat so flashes land on it.',
    '“Add to movie” puts the item on the timeline at the playhead (the gold line).'] },
  templates: { icon: '🎬', title: 'Templates and live loops', steps: [
    'A template builds a whole movie from your own affirmations, photos, voice and music.',
    'No photos yet? Templates use built-in sunrise, starfield, aurora and golden-light visuals.',
    'Template movies loop. Press ▶ and leave it running.',
    'While it runs, use the Quick Add bar (+ Words, + Photo, + Voice, + Flash, + Sparkle) — each drops in where the gold line is.',
    'Everything you add stays. Undo (↶) takes back the last change.'] },
  timeline: { icon: '🎚', title: 'The timeline', steps: [
    'Each row is a track. Rows on top are drawn in front.',
    'Tap a clip to open its sliders. Drag a clip to move it; drag its gold edges to make it shorter or longer.',
    'Pinch with two fingers to zoom in (all the way to single frames) or out. On a Chromebook, Ctrl + scroll.',
    'Tap the ruler at the top to move the gold playhead. −1f / +1f moves one frame.',
    'Track buttons: 🔈 mute, S solo (only this track), 🔒 lock, 👁 hide, ◇ keyframe lanes, ⋯ more (rename, color, duplicate, delete).',
    'Drag the ⠿ handle up or down to change which track is in front.',
    'Snap keeps edges on a grid: 1 frame, 10 ms, 100 ms or 1 s.'] },
  sliders: { icon: '🎛', title: 'Sliders, number boxes and keyframes', steps: [
    'Every setting has a slider, a live readout and a number box you can type in. They always match.',
    'Times show as minutes:seconds.milliseconds plus the frame number for your screen.',
    'Tap ◇ next to a slider to set a keyframe at the gold line. Move the gold line, change the slider — the app smoothly changes between keyframes.',
    'Open ◇ on the track to see the curve. Tap a keyframe dot to choose linear, ease or step, or delete it.',
    'Save any clip’s settings as a preset to reuse.'] },
  layers: { icon: '🌀', title: 'Subconscious layers', steps: [
    'Flash text: words shown very briefly (from 17 ms = one frame). Optional mask frame after each flash.',
    'Speed-scroll text: affirmations streaming across or up the screen.',
    'Pattern: spirals, rings, mandala, stars, aurora, bokeh, hearts — usually at low opacity (15%).',
    'Color / Flash: soft color breathing or white/black flash frames.',
    'Voice under music: your recorded voice mixed low, in several layered copies.',
    'Speed-up voice: 1.5x–4x with pitch kept natural.',
    'Binaural tone: needs headphones. 4 Hz (deep), 6 Hz (theta), 10 Hz (alpha) or your own.'] },
  pulse: { icon: '⚡', title: 'On-time, off-time and Hz', steps: [
    'On time = how long each flash shows. Off time = the gap. Frequency (Hz) = flashes per second.',
    'Change any one and the others update.',
    'Waveform: square is hard on/off, sine is a smooth breathing pulse, sawtooth ramps, random jitters.',
    'Safe Mode keeps flashing at 3 per second or less. The Hz number turns red if a setting is faster.',
    'Follow pattern: make flashes land on the beat of your music, with an offset in ms.'] },
  feel: { icon: '💫', title: 'Making it feel real', steps: [
    'Feel-it-first: before the movie, three slow breaths. Picture the moment it comes true.',
    'While watching, smile, relax your shoulders, and feel the gratitude as if it already happened.',
    'Afterwards, rate how you feel and write any “evidence” — wins, signs, coincidences. Belief grows when you notice proof.',
    'Watch daily. Milestones at 3, 7, 21, 30, 66 and 100 days get a celebration.'] },
  safety: { icon: '🛡', title: 'Safety', steps: [
    'Flashing can trigger seizures in people with photosensitive epilepsy. Safe Mode is on by default.',
    'Safe Mode limits flashing to 3 per second and softens fast red flashing.',
    'Binaural tones: headphones only, low volume, never while driving.',
    'Mind Movie is for inspiration and motivation. It is not medical or psychological treatment.'] },
  export: { icon: '💾', title: 'Saving and sharing', steps: [
    'Export makes a video file (MP4 where your phone supports it, otherwise WebM). It plays once in real time while recording.',
    'Save project file keeps everything (with your media) so you can reopen and edit later or move it to another device.',
    'Everything also saves automatically on this device.'] },
};

export function helpBtn(topic, label = 'How this works') {
  return h('button', { class: 'help-i', 'aria-label': label + ': ' + HELP[topic].title, title: HELP[topic].title, onclick: (e) => { e.stopPropagation(); showHelp(topic); } }, 'i');
}

export function showHelp(topic) {
  const t = HELP[topic];
  return dialog({ title: t.icon + ' ' + t.title, body: h('ol', { class: 'help-steps' }, t.steps.map((s) => h('li', {}, s))), buttons: [{ label: 'Got it', value: true, primary: true }] });
}

export async function helpCenter() {
  let go = null;
  const body = h('div', { class: 'help-center' },
    h('button', { class: 'btn primary big wide-btn', onclick: () => { go = 'tour'; body.closest('.scrim').querySelector('.dialog-btns button').click(); } }, '🧭  Guide me — step by step'),
    h('button', { class: 'btn gold wide-btn', onclick: () => { go = 'templates'; body.closest('.scrim').querySelector('.dialog-btns button').click(); } }, '🎬  Start from a template'),
    h('div', { class: 'help-grid' }, Object.entries(HELP).map(([k, t]) => h('button', { class: 'help-card', onclick: () => showHelp(k) }, h('span', { class: 'hc-ic' }, t.icon), h('span', {}, t.title)))));
  await dialog({ title: 'Help & how-to', body, buttons: [{ label: 'Close', value: true }], cls: 'wide' });
  if (go === 'tour') emit('start-tour');
  if (go === 'templates') emit('show-templates');
}
