// Draws every visible track onto one canvas for a given project time (ms).
import { TRACK_TYPES } from './model.js';
import { val, internalTime, fadeEnv, pulseAt, isSaturatedRed, desaturate, rand, effectivePulse, thinBeats } from './core.js';

export const ASPECTS = { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [1080, 1080] };

export function activeTracks(project) {
  const anySolo = project.tracks.some((t) => t.solo);
  return project.tracks.filter((t) => (anySolo ? t.solo : true));
}

export function clipAt(track, t) {
  for (const c of track.clips) if (t >= c.start && t < c.start + c.dur) return c;
  return null;
}

// Resolve the pulse settings a clip should use (handles "Follow pattern").
export function pulseSource(project, clip, env) {
  const f = clip.follow;
  if (!f || !f.trackId) return { props: clip.props, beats: null };
  const target = project.tracks.find((t) => t.id === f.trackId);
  if (!target) return { props: clip.props, beats: null };
  if (TRACK_TYPES[target.type].kind === 'audio') {
    const info = env.getBeats ? env.getBeats(target, clip) : null;
    if (!info) return { props: clip.props, beats: null };
    if (f.mode === 'tempo' && info.bpm) {
      const period = 60000 / info.bpm;
      const on = Math.min(clip.props.onMs, period * 0.9);
      return { props: { ...clip.props, onMs: on, offMs: period - on }, beats: null, phase: info.firstBeat };
    }
    return { props: clip.props, beats: info.beats };
  }
  // copy another pulse track's timing
  const src = target.clips[0];
  if (!src || src.props.onMs === undefined) return { props: clip.props, beats: null };
  return { props: { ...clip.props, onMs: src.props.onMs, offMs: src.props.offMs, wave: src.props.wave, repeat: src.props.repeat }, beats: null, phase: src.start - clip.start };
}

export function draw(ctx, W, H, project, t, env = {}) {
  const S = Math.min(W, H) / 720;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const tracks = activeTracks(project);
  const flags = { capped: false, redBlocked: false, flashing: false };
  for (let i = tracks.length - 1; i >= 0; i--) {
    const tr = tracks[i];
    if (tr.hidden || TRACK_TYPES[tr.type].kind !== 'visual') continue;
    const c = clipAt(tr, t);
    if (!c) continue;
    try { drawClip(ctx, W, H, S, project, tr, c, t, env, flags); } catch (e) { console.warn('draw', e); }
  }
  ctx.restore();
  return flags;
}

function drawClip(ctx, W, H, S, project, tr, c, t, env, flags) {
  const tl = t - c.start;
  const ti = internalTime(c, tl);
  const type = tr.type;
  const v = (k) => val(c, k, tl);
  let alpha = ((v('opacity') ?? 100) / 100) * fadeEnv(c, tl);
  let mask = false, cycle = 0;
  const pulsing = type === 'flash' || type === 'color' || (type === 'pattern' && c.props.pulseOn);
  let pulseProps = c.props;
  if (pulsing) {
    const src = pulseSource(project, c, env);
    pulseProps = src.props;
    let pt = ti - (src.phase || 0);
    let beats = src.beats;
    if (beats && c.follow) beats = beats.map((b) => b + (c.follow.offset || 0));
    if (beats && env.safe) { const thin = thinBeats(beats); if (thin.length < beats.length) flags.capped = true; beats = thin; }
    if (pt < 0 && !beats) pt = -1e9;
    const p = pulseAt(pulseProps, pt, env.safe, beats);
    alpha *= p.level;
    mask = p.mask; cycle = p.cycle;
    const eff = effectivePulse(pulseProps, env.safe);
    if (eff.capped) flags.capped = true;
    if (pulseProps.wave !== 'sine') flags.flashing = true;
  }
  if (alpha <= 0.002 && !mask) return;

  const hardFlash = pulsing && pulseProps.wave !== 'sine';
  const safeColor = (col) => {
    if (env.safe && hardFlash && isSaturatedRed(col)) { flags.redBlocked = true; return desaturate(col); }
    return col;
  };

  if (mask) { drawMask(ctx, W, H, S, c, cycle, project); if (alpha <= 0.002) return; }

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  const filt = [];
  const blur = v('blur'), br = v('brightness'), co = v('contrast'), hue = v('hue');
  if (blur > 0) filt.push(`blur(${blur * S}px)`);
  if (br !== undefined && br !== 100) filt.push(`brightness(${br}%)`);
  if (co !== undefined && co !== 100) filt.push(`contrast(${co}%)`);
  if (hue) filt.push(`hue-rotate(${hue}deg)`);
  ctx.filter = filt.length ? filt.join(' ') : 'none';

  if (type === 'color') {
    ctx.globalCompositeOperation = c.props.blend || 'source-over';
    ctx.fillStyle = safeColor(c.props.ccolor);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  const x = (v('x') || 0) / 100 * (W / 2), y = (v('y') || 0) / 100 * (H / 2);
  const rot = ((v('rotation') || 0) + (v('rotSpeed') || 0) * ti / 1000) * Math.PI / 180;
  const sc = (v('scale') ?? 100) / 100;
  ctx.translate(W / 2 + x, H / 2 + y);
  if (rot) ctx.rotate(rot);
  if (sc !== 1) ctx.scale(sc, sc);

  if (type === 'photo' || type === 'video') {
    const src = type === 'photo' ? env.getImage?.(c.mediaId) : env.getVideo?.(c);
    const ok = src && (type === 'photo' ? src.complete && src.naturalWidth : src.readyState >= 2);
    if (ok) {
      const sw = src.naturalWidth || src.videoWidth, sh = src.naturalHeight || src.videoHeight;
      const k = c.props.fit === 'contain' ? Math.min(W / sw, H / sh) : Math.max(W / sw, H / sh);
      ctx.drawImage(src, -sw * k / 2, -sh * k / 2, sw * k, sh * k);
    } else {
      ctx.fillStyle = '#1a2156'; ctx.fillRect(-W / 2, -H / 2, W, H);
    }
  } else if (type === 'text' || type === 'flash') {
    let text = c.text;
    if (!text && project.affirmations.length) text = project.affirmations[Math.abs(cycle) % project.affirmations.length].text;
    drawText(ctx, personal(text || '', env), W, S, c, v, safeColor);
  } else if (type === 'scroll') {
    drawScroll(ctx, W, H, S, c, v, ti, project, env);
  } else if (type === 'pattern') {
    drawPattern(ctx, W, H, S, c, v, ti, safeColor);
  }
  ctx.restore();
}

export function personal(text, env = {}) { return String(text).replace(/\{name\}/gi, env.name || 'you'); }

function setFont(ctx, c, v, S) {
  const size = (v('fontSize') || 48) * S;
  ctx.font = `600 ${size}px ${c.props.font || 'Georgia, serif'}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(v('letterSpacing') || 0) * S}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  return size;
}

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  }
  return out;
}

function strokeFill(ctx, s, x, y, c, v, S, safeColor) {
  const glow = v('glow') || 0, outline = v('outline') || 0;
  if (glow > 0) { ctx.shadowColor = safeColor(c.props.glowColor || '#e8c26a'); ctx.shadowBlur = glow * S; }
  if (outline > 0) {
    ctx.lineJoin = 'round'; ctx.lineWidth = outline * 2 * S; ctx.strokeStyle = c.props.outlineColor || '#000';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = safeColor(c.props.color || '#fff');
  ctx.fillText(s, x, y);
  ctx.shadowBlur = 0;
}

function drawText(ctx, text, W, S, c, v, safeColor) {
  const size = setFont(ctx, c, v, S);
  const lines = wrap(ctx, text, W * 0.86);
  const lh = size * 1.22;
  lines.forEach((ln, i) => strokeFill(ctx, ln, 0, (i - (lines.length - 1) / 2) * lh, c, v, S, safeColor));
}

function drawScroll(ctx, W, H, S, c, v, ti, project, env = {}) {
  const size = setFont(ctx, c, v, S);
  const items = (c.text ? c.text.split('\n') : project.affirmations.map((a) => a.text)).filter(Boolean).map((t) => personal(t, env));
  if (!items.length) return;
  const speed = (v('scrollSpeed') || 200) * S;
  const d = (ti / 1000) * speed;
  const gap = (c.props.gap ?? 100) * S;
  const dir = c.props.direction || 'left';
  const id = (s) => s;
  ctx.textAlign = 'left';
  if (dir === 'left' || dir === 'right') {
    const widths = items.map((s) => ctx.measureText(s).width);
    const total = widths.reduce((a, w) => a + w + gap, 0);
    let base = W / 2 - d;
    if (base < -W / 2) base = -W / 2 - ((-W / 2 - base) % total);
    for (let start = base; start < W / 2; start += total) {
      let x = start;
      items.forEach((s, i) => {
        const px = dir === 'left' ? x : -x - widths[i];
        if (px < W / 2 && px + widths[i] > -W / 2) strokeFill(ctx, s, px, 0, c, v, S, id);
        x += widths[i] + gap;
      });
    }
  } else {
    ctx.textAlign = 'center';
    const lh = size * 1.3 + gap;
    const total = items.length * lh;
    let base = H / 2 - d;
    if (base < -H / 2) base = -H / 2 - ((-H / 2 - base) % total);
    for (let start = base; start < H / 2 + lh; start += total) {
      items.forEach((s, i) => {
        const yy = start + i * lh;
        const py = dir === 'up' ? yy : -yy;
        if (py > -H / 2 - lh && py < H / 2 + lh) strokeFill(ctx, s, 0, py, c, v, S, id);
      });
    }
  }
}

function drawPattern(ctx, W, H, S, c, v, ti, safeColor) {
  const R = Math.hypot(W, H) / 2 + 20;
  const col = safeColor(c.props.pcolor || '#e8c26a'), col2 = safeColor(c.props.pcolor2 || '#5a4bd6');
  const n = Math.max(1, Math.round(v('density') || 10));
  const lw = (v('lineWidth') || 6) * S;
  const T = ti / 1000;
  ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.fillStyle = col;
  switch (c.props.patternType) {
    case 'sunrise': {
      const sky = ctx.createLinearGradient(0, -R, 0, R);
      sky.addColorStop(0, '#1b1f5e'); sky.addColorStop(0.45, col2); sky.addColorStop(0.62, '#ff9a5a'); sky.addColorStop(1, '#2a1240');
      ctx.fillStyle = sky; ctx.fillRect(-R, -R, 2 * R, 2 * R);
      const sunY = H * 0.12 - Math.min(1, T / 20) * H * 0.08;
      const glow = ctx.createRadialGradient(0, sunY, 0, 0, sunY, Math.min(W, H) * 0.7);
      glow.addColorStop(0, '#fff6d8'); glow.addColorStop(0.12, col); glow.addColorStop(0.4, 'rgba(255,160,80,.35)'); glow.addColorStop(1, 'rgba(255,160,80,0)');
      ctx.fillStyle = glow; ctx.fillRect(-R, -R, 2 * R, 2 * R);
      ctx.save(); ctx.translate(0, sunY); ctx.rotate(T * 0.05);
      ctx.globalAlpha *= 0.18; ctx.fillStyle = '#fff1c4';
      for (let i = 0; i < n * 2; i++) { ctx.rotate(Math.PI / n); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * 0.04); ctx.lineTo(R, R * 0.04); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'starfield': {
      ctx.fillStyle = '#05061a'; ctx.fillRect(-R, -R, 2 * R, 2 * R);
      const count = n * 30; const baseA = ctx.globalAlpha;
      for (let i = 0; i < count; i++) {
        const a = rand(i) * Math.PI * 2;
        const z = ((rand(i + 999) + T * 0.08 * (0.5 + rand(i + 3))) % 1);
        const r = Math.pow(z, 2.2) * R;
        const sz = (0.4 + z * 2.6) * S;
        ctx.globalAlpha = Math.min(1, z * 1.6) * baseA;
        ctx.fillStyle = i % 7 === 0 ? col : '#ffffff';
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, sz, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'aurora': {
      const bg = ctx.createLinearGradient(0, -R, 0, R); bg.addColorStop(0, '#040a24'); bg.addColorStop(1, '#0d1a3a');
      ctx.fillStyle = bg; ctx.fillRect(-R, -R, 2 * R, 2 * R);
      ctx.globalCompositeOperation = 'lighter';
      const bands = Math.max(2, Math.round(n / 3)); const baseA2 = ctx.globalAlpha;
      for (let b = 0; b < bands; b++) {
        const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
        const cc = b % 2 ? col2 : col;
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, cc); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.globalAlpha = 0.22 * baseA2;
        ctx.beginPath(); ctx.moveTo(-R, H / 2);
        for (let x = -R; x <= R; x += 20) ctx.lineTo(x, Math.sin(x / (180 * S) + T * (0.4 + b * 0.15) + b) * H * 0.18 - H * 0.1 + b * 30 * S);
        ctx.lineTo(R, H / 2); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'bokeh': {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n * 4; i++) {
        const x = (rand(i) - 0.5) * W + Math.sin(T * 0.3 + i) * 30 * S;
        const y = ((rand(i + 50) - T * 0.02 * (0.3 + rand(i + 7))) % 1 + 1) % 1 * H - H / 2;
        const r = (12 + rand(i + 9) * 50) * S;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, i % 3 ? col : col2); g.addColorStop(0.6, (i % 3 ? col : col2) + '55'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'hearts': {
      for (let i = 0; i < n * 2; i++) {
        const x = (rand(i) - 0.5) * W;
        const y = H / 2 - (((rand(i + 40) + T * 0.06 * (0.4 + rand(i + 2))) % 1) * (H + 80 * S)) + 40 * S;
        const sz = (10 + rand(i + 5) * 24) * S;
        ctx.save(); ctx.translate(x + Math.sin(T + i) * 12 * S, y); ctx.scale(sz / 20, sz / 20);
        ctx.fillStyle = i % 2 ? col : col2;
        ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-14, -4, -8, -16, 0, -8); ctx.bezierCurveTo(8, -16, 14, -4, 0, 6); ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'spiral': {
      const arms = Math.max(1, Math.round(n / 3));
      const turns = n;
      for (let a = 0; a < arms; a++) {
        ctx.beginPath();
        for (let i = 0; i <= turns * 80; i++) {
          const th = (i / 80) * Math.PI * 2;
          const r = (th / (Math.PI * 2 * turns)) * R;
          const ang = th + (a * Math.PI * 2) / arms;
          const px = Math.cos(ang) * r, py = Math.sin(ang) * r;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.strokeStyle = a % 2 ? col2 : col;
        ctx.stroke();
      }
      break;
    }
    case 'twirl': {
      const arms = Math.max(2, n);
      for (let a = 0; a < arms; a++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const base = (a / arms) * Math.PI * 2;
        for (let r = 0; r <= R; r += 8) ctx.lineTo(Math.cos(base + r / (R / 3)) * r, Math.sin(base + r / (R / 3)) * r);
        for (let r = R; r >= 0; r -= 8) { const b2 = base + Math.PI / arms; ctx.lineTo(Math.cos(b2 + r / (R / 3)) * r, Math.sin(b2 + r / (R / 3)) * r); }
        ctx.closePath();
        ctx.fillStyle = a % 2 ? col2 : col;
        ctx.fill();
      }
      break;
    }
    case 'rings': {
      const sp = R / n;
      const off = (T * sp * 0.5) % sp;
      for (let i = 0; i <= n + 1; i++) {
        const r = i * sp + off;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, r), 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 ? col2 : col; ctx.stroke();
      }
      break;
    }
    case 'mandala': {
      const layers = 4;
      for (let L = 1; L <= layers; L++) {
        const petals = n * L / 2 + 4 | 0;
        const r = (L / layers) * Math.min(W, H) * 0.42;
        for (let p = 0; p < petals; p++) {
          ctx.save();
          ctx.rotate((p / petals) * Math.PI * 2 + (L % 2 ? T * 0.2 : -T * 0.2));
          ctx.beginPath();
          ctx.ellipse(r * 0.6, 0, r * 0.4, r * 0.12 + lw, 0, 0, Math.PI * 2);
          ctx.strokeStyle = L % 2 ? col : col2;
          ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
    default: { // geometric pulse: nested hexagons breathing
      const pulse = 1 + 0.12 * Math.sin(T * Math.PI);
      for (let i = 1; i <= n; i++) {
        const r = (i / n) * R * 0.9 * pulse;
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI * 2 + i * 0.12; k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.strokeStyle = i % 2 ? col : col2; ctx.stroke();
      }
    }
  }
}

function drawMask(ctx, W, H, S, c, cycle, project) {
  ctx.save();
  ctx.globalAlpha = 1; ctx.filter = 'none';
  const style = c.props.maskType || 'scramble';
  if (style === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  else if (style === 'pattern') {
    const sz = 40 * S;
    for (let y = 0; y < H; y += sz) for (let x = 0; x < W; x += sz) {
      ctx.fillStyle = ((x / sz + y / sz) | 0) % 2 ? '#222' : '#ddd';
      ctx.fillRect(x, y, sz, sz);
    }
  } else {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@*';
    ctx.font = `700 ${46 * S}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let k = cycle * 997;
    for (let y = 30 * S; y < H; y += 60 * S) for (let x = 20 * S; x < W; x += 44 * S) {
      const r = rand(k++);
      ctx.fillStyle = r > 0.5 ? '#e0e0e0' : '#777';
      ctx.fillText(chars[(r * chars.length) | 0], x, y);
    }
  }
  ctx.restore();
}
