// Barter Kings — live in-app camera. No gallery uploads, ever.
// Every photo is stamped with the date and time it was taken.

export function stampText(time) {
  const d = new Date(time);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + '  ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function stamp(ctx, w, h, time, label) {
  const size = Math.round(w / 26);
  const band = size * 2.9;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, h - band, w, band);
  ctx.font = `bold ${Math.round(size * 1.15)}px system-ui, sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText(stampText(time), size * 0.6, h - band * 0.62);
  ctx.font = `bold ${Math.round(size * 0.8)}px system-ui, sans-serif`;
  ctx.fillStyle = '#F2B705';
  ctx.fillText(label || 'Barter Kings live photo', size * 0.6, h - band * 0.24);
  ctx.restore();
}

// mode: 'item' (back camera) or 'offer' (front camera, you must be in the shot)
export function takeLivePhoto(mode = 'item') {
  return new Promise(resolve => {
    let facing = mode === 'offer' ? 'user' : 'environment';
    let stream = null;

    const wrap = document.createElement('div');
    wrap.className = 'cam';
    wrap.innerHTML = `
      <div class="cam-top">
        <button class="cam-x" aria-label="Close camera">✕</button>
        <span>${mode === 'offer' ? 'Offer photo' : 'Item photo'}</span>
        <button class="cam-flip" aria-label="Switch camera">🔄</button>
      </div>
      <div class="cam-view"><video playsinline autoplay muted></video>
        <div class="cam-prompt">${mode === 'offer'
          ? '🙋 <b>Be in the shot!</b> Hold up or stand next to ALL the items you are offering.'
          : '📸 Get the whole item in the picture. Live photos only.'}</div>
        <div class="cam-err" hidden></div>
      </div>
      <div class="cam-bottom"><button class="cam-shoot" aria-label="Take photo"></button></div>`;
    document.body.appendChild(wrap);

    const video = wrap.querySelector('video');
    const err = wrap.querySelector('.cam-err');

    async function start() {
      if (stream) stream.getTracks().forEach(t => t.stop());
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } }, audio: false });
        video.srcObject = stream;
        video.style.transform = facing === 'user' ? 'scaleX(-1)' : '';
        err.hidden = true;
      } catch (e) {
        err.hidden = false;
        err.innerHTML = `<p><b>The camera is blocked.</b></p>
          <p>To turn it on: tap the small icon to the left of the web address at the top of the screen,
          tap <b>Permissions</b> (or <b>Site settings</b>), then set <b>Camera</b> to <b>Allow</b>. Then tap ✕ and try again.</p>
          <button class="btn ghost cam-test">No camera? Use a test photo (test version only)</button>`;
        err.querySelector('.cam-test').onclick = () => finish(testPhoto(mode));
      }
    }

    function finish(result) {
      if (stream) stream.getTracks().forEach(t => t.stop());
      wrap.remove();
      resolve(result);
    }

    wrap.querySelector('.cam-x').onclick = () => finish(null);
    wrap.querySelector('.cam-flip').onclick = () => { facing = facing === 'user' ? 'environment' : 'user'; start(); };
    wrap.querySelector('.cam-shoot').onclick = () => {
      if (!video.videoWidth) return;
      // Crop the centre to 4:3 so the saved photo matches what members see.
      const w = 900, h = 675, vw = video.videoWidth, vh = video.videoHeight;
      let sw = vw, sh = vw * 3 / 4;
      if (sh > vh) { sh = vh; sw = vh * 4 / 3; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      if (facing === 'user') { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const time = Date.now();
      stamp(ctx, w, h, time);
      finish({ dataUrl: c.toDataURL('image/jpeg', 0.7), time });
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      err.hidden = false;
      err.innerHTML = '<p>This browser has no camera access. Open the link in Chrome.</p><button class="btn ghost cam-test">Use a test photo (test version only)</button>';
      err.querySelector('.cam-test').onclick = () => finish(testPhoto(mode));
    } else start();
  });
}

// Clearly-labelled placeholder so a camera-less Chromebook can still test the flow.
function testPhoto(mode) {
  const w = 900, h = 675, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#4B1D8F'); g.addColorStop(1, '#2A0F55');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#F2B705';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TEST PHOTO', w / 2, h / 2 - 20);
  ctx.font = '32px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(mode === 'offer' ? '(real version: you + your items)' : '(real version: live camera only)', w / 2, h / 2 + 40);
  ctx.textAlign = 'left';
  const time = Date.now();
  stamp(ctx, w, h, time, 'TEST — not a live photo');
  return { dataUrl: c.toDataURL('image/jpeg', 0.7), time, test: true };
}
