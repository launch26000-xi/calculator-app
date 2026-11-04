// Small DOM helpers: element builder, dialogs, toasts.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

let toastTimer;
export function toast(msg, ms = 2400) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// Modal dialog. buttons: [{label, value, primary, danger}] ; resolves with value (or null on dismiss)
export function dialog({ title, body, buttons = [{ label: 'OK', value: true, primary: true }], dismissable = true, cls = '' }) {
  return new Promise((resolve) => {
    const close = (v) => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(null); };
    const box = h('div', { class: 'dialog ' + cls, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' },
      title ? h('h2', {}, title) : null,
      h('div', { class: 'dialog-body' }, body),
      h('div', { class: 'dialog-btns' }, buttons.map((b) => h('button', {
        class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''),
        'data-value': String(b.value), onclick: () => close(typeof b.value === 'function' ? b.value() : b.value),
      }, b.label))));
    const wrap = h('div', { class: 'scrim', onclick: (e) => { if (e.target === wrap && dismissable) close(null); } }, box);
    document.body.append(wrap);
    document.addEventListener('keydown', onKey);
    const first = box.querySelector('input, select, textarea') || box.querySelector('.btn.primary') || box.querySelector('button');
    if (first) setTimeout(() => first.focus(), 30);
  });
}

export function confirmBox(title, text, okLabel = 'OK', danger = false) {
  return dialog({ title, body: h('p', {}, text), buttons: [{ label: 'Cancel', value: false }, { label: okLabel, value: true, primary: !danger, danger }] });
}

export async function prompt(title, value = '', { multiline = false, placeholder = '' } = {}) {
  const input = multiline ? h('textarea', { rows: 4, placeholder }) : h('input', { type: 'text', placeholder });
  input.value = value;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !multiline) { e.preventDefault(); input.closest('.dialog').querySelector('.btn.primary').click(); } });
  const r = await dialog({ title, body: input, buttons: [{ label: 'Cancel', value: null }, { label: 'Save', value: () => input.value, primary: true }] });
  return r === null ? null : String(r);
}

export function chooseList(title, options, note) {
  return new Promise((resolve) => {
    const list = h('div', { class: 'choose-list' }, note ? h('p', { class: 'muted' }, note) : null,
      options.map((o) => h('button', { class: 'choose-item', onclick: () => { done(o.value); } },
        o.icon ? h('span', { class: 'ci-icon', style: o.color ? { color: o.color } : null }, o.icon) : null,
        h('span', { class: 'ci-text' }, h('strong', {}, o.label), o.desc ? h('small', {}, o.desc) : null))));
    let done;
    const p = dialog({ title, body: list, buttons: [{ label: 'Cancel', value: null }], cls: 'chooser' });
    done = (v) => { const sc = list.closest('.scrim'); sc.remove(); resolve(v); };
    p.then(resolve);
  });
}

export function download(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

export function icon(name) {
  const P = {
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    lib: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    edit: '<path d="M3 6h18M3 12h18M3 18h18"/><rect x="6" y="4" width="6" height="4" rx="1" fill="currentColor"/><rect x="12" y="10" width="7" height="4" rx="1" fill="currentColor"/><rect x="4" y="16" width="9" height="4" rx="1" fill="currentColor"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    zoomin: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6M11 8v6"/>',
    zoomout: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 6.1A10 10 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.8M6.6 6.6A17 17 0 002 12s4 7 10 7a9.6 9.6 0 004.4-1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.5-2"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    diamond: '<path d="M12 3l9 9-9 9-9-9z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1L20 20M8.1 15.9L20 4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
    cam: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    chevup: '<path d="M6 15l6-6 6 6"/>', chevdown: '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12l5 5L20 7"/>', bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    folder: '<path d="M3 6h6l2 2h10v11H3z"/>', save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8M8 21v-7h8v7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  };
  const span = document.createElement('span');
  span.className = 'ic';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
  return span;
}
