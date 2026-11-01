const { chromium, devices } = require('playwright');
const OUT = process.argv[2];
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const origWait = (pg, sel, o) => pg.waitForSelector(sel, o);
  global.W = async (pg, sel, label) => { try { return await pg.waitForSelector(sel, { timeout: 15000 }); } catch (e) { console.log('STUCK at', label || sel, '| url', pg.url().split('#')[1], '| main:', (await pg.evaluate(() => document.querySelector('main').innerText)).slice(0, 400).replace(/\n/g, ' / ')); throw e; } };
  async function person(sub, nick) {
    const ctx = await b.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    await ctx.route(/tile\.openstreetmap\.org/, r => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }));
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(nick + ' PAGEERR ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|permission|Missing or insufficient/i.test(m.text())) errs.push(nick + ' ' + m.text()); });
    await p.goto('http://localhost:8080/#/account'); await p.waitForSelector('#google-btn');
    await p.evaluate((s) => window.__no2TestSignIn(s), sub); await p.waitForSelector('#join-form');
    await p.fill('#nick', nick); await p.check('#ok-co'); await p.check('#ok-age'); await p.check('#ok-rules');
    await p.click('text=Join No2'); await p.waitForSelector('text=See my public profile');
    const uid = (await p.getAttribute('a:has-text("See my public profile")', 'href')).split('/').pop();
    return { p, uid };
  }
  const go = async (p, h, sel) => { if (p.url().endsWith(h)) await p.evaluate(() => { location.hash = '#/more'; }); await p.goto('http://localhost:8080/' + h); if (sel) { try { await p.waitForSelector(sel, { timeout: 15000 }); } catch (e) { console.log('WAIT FAIL', h, sel, '| main:', (await p.evaluate(() => document.querySelector('main').innerText)).slice(0, 300).replace(/\n/g, ' / ')); throw e; } } else await p.waitForTimeout(800); };

  const A = await person('seller-1', 'FrontRangeFred');
  const B = await person('buyer-1', 'PuebloPam');
  log('joined:', A.uid.slice(0, 6), B.uid.slice(0, 6));
  // make Fred an admin (as the owner would in the Firebase console)
  const r = await fetch(`http://localhost:8085/v1/projects/demo-no2/databases/(default)/documents/admins?documentId=${A.uid}`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { note: { stringValue: 'owner' } } }) });
  log('admin doc:', r.status);

  // areas
  await go(A.p, '#/account', '#town'); await A.p.selectOption('#town', { label: 'Denver' }); await A.p.click('#town-save'); await A.p.waitForSelector('text=Your area is set');
  await go(B.p, '#/account', '#town'); await B.p.selectOption('#town', { label: 'Castle Rock' }); await B.p.click('#town-save'); await B.p.waitForSelector('text=Your area is set');
  log('areas set');

  // empty trading post
  await go(B.p, '#/trade', '#results .empty, #results .listing'); await B.p.waitForTimeout(500); log('empty post shows:', await B.p.evaluate(() => document.querySelector('#results') ? document.querySelector('#results').innerText.split('\n')[0] : 'NO RESULTS EL: ' + document.querySelector('main').innerText.slice(0, 200)));

  // Fred posts a shotgun and a knife
  await go(A.p, '#/sell', '#sell-form');
  await A.p.selectOption('#cat', 'shotguns'); log('gun note visible:', await A.p.isVisible('#gun-note'));
  await A.p.fill('#title', 'Remington 870 Express 12 ga'); await A.p.fill('#desc', 'Good shape, 28 inch barrel.'); await A.p.fill('#price', '300');
  await A.p.click('text=Post it'); await A.p.waitForURL(/#\/listing\//);
  const listingUrl = A.p.url(); log('posted:', listingUrl.split('#')[1]);
  await go(A.p, '#/sell', '#sell-form'); await A.p.selectOption('#cat', 'knives'); await A.p.fill('#title', 'Buck 119 fixed blade'); await A.p.selectOption('#deal', 'Trade'); await A.p.click('text=Post it'); await A.p.waitForURL(/#\/listing\//);

  // Pam sees it with rough distance + map circle
  await go(B.p, '#/trade', '.listing'); await B.p.waitForTimeout(800);
  log('pam sees listings:', await B.p.locator('.listing').count(), '|', (await B.p.locator('.listing').first().innerText()).replace(/\n/g, ' | '));
  log('fuzzy circles on map:', await B.p.locator('#map path.leaflet-interactive').count());
  await B.p.locator('#radius').fill('0'); await B.p.locator('#radius').dispatchEvent('change'); await B.p.waitForTimeout(600);
  log('within 10 miles:', await B.p.locator('.listing').count(), '| empty msg:', (await B.p.locator('#results').innerText()).split('\n')[0]);
  await B.p.screenshot({ path: OUT + '/e2-trade-10mi.png', fullPage: true });
  await B.p.locator('#radius').fill('1'); await B.p.locator('#radius').dispatchEvent('change'); await B.p.waitForTimeout(600);
  log('within 50 miles:', await B.p.locator('.listing').count());
  await B.p.screenshot({ path: OUT + '/e2-trade-50mi.png', fullPage: true });

  // Deal on the shotgun
  await B.p.goto(listingUrl); await W(B.p, '#offer-form', "B #offer-form");
  await B.p.fill('#offer', '$260'); await B.p.click('text=Send Offer'); await B.p.waitForURL(/#\/deal\//);
  const dealUrl = B.p.url(); await W(B.p, 'text=Waiting for FrontRangeFred', "B text=Waiting for FrontRangeFred");
  await A.p.goto(dealUrl); await W(A.p, '#counter-form', "A #counter-form"); await A.p.fill('#counter', '$290'); await A.p.click('text=Send Counter');
  await W(B.p, '[data-act=accept]', "B [data-act=accept]"); await B.p.click('[data-act=accept]');
  await W(B.p, '[data-act=lock]', "B [data-act=lock]"); await B.p.click('[data-act=lock]');
  await W(A.p, '[data-act=lock]', "A [data-act=lock]"); await A.p.click('[data-act=lock]');
  await W(A.p, '.ticket', "A .ticket"); log('ticket:', (await A.p.locator('.ticket').innerText()).replace(/\n/g, ' '));
  log('gun shop step shown:', await A.p.isVisible('[data-act=shop]'));
  await A.p.screenshot({ path: OUT + '/e2-deal-gunshop.png', fullPage: true });
  await A.p.click('[data-act=shop]'); await W(B.p, '[data-act=shop]', "B [data-act=shop]"); await B.p.click('[data-act=shop]');
  await W(B.p, '[data-act=met]', "B [data-act=met]"); await B.p.click('[data-act=met]'); await W(A.p, '[data-act=met]', "A [data-act=met]"); await A.p.click('[data-act=met]');
  await W(A.p, '[data-act=done]', "A [data-act=done]"); await A.p.click('[data-act=done]'); await W(B.p, '[data-act=done]', "B [data-act=done]"); await B.p.click('[data-act=done]');
  await W(B.p, '#rate-form', "B #rate-form"); await B.p.click('label[for=s2]'); await B.p.fill('#review', 'Late, but item ok.'); await B.p.click('text=Send Rating');
  await W(B.p, 'text=All finished', "B text=All finished"); log('pam rated fred');
  await W(A.p, '#rate-form', "A #rate-form"); await A.p.click('label[for=s5]'); await A.p.click('text=Send Rating'); await W(A.p, 'text=All finished', "A text=All finished");
  // listing closed after done
  await go(B.p, '#/trade', '#results'); await B.p.waitForTimeout(800); log('open listings after deal:', await B.p.locator('.listing').count());

  // profile shows rating + review
  await go(B.p, `#/member/${A.uid}`, '.profile-head'); log('fred profile:', (await B.p.locator('#member .card').first().innerText()).replace(/\n/g, ' | ').slice(0, 200));

  // messages
  await go(B.p, `#/member/${A.uid}`, '#msg'); await B.p.click('#msg'); await B.p.waitForSelector('#send');
  log('chat safety strip:', await B.p.isVisible('.safety-strip'));
  await B.p.fill('#msg-text', 'Thanks again Fred! Want the Buck knife too?'); await B.p.click('#send button');
  await B.p.waitForSelector('.bubble.you');
  await go(A.p, '#/messages', '.inbox'); log('fred inbox:', (await A.p.locator('.inbox').first().innerText()).replace(/\n/g, ' | '));
  await A.p.click('.inbox a >> nth=0'); await A.p.waitForSelector('.bubble.them'); log('fred reads:', await A.p.locator('.bubble.them').first().innerText());
  await A.p.fill('#msg-text', 'Sure. Meet at the same shop Saturday?'); await A.p.click('#send button');
  await B.p.waitForSelector('text=Meet at the same shop Saturday?'); log('pam got reply live: yes');
  await B.p.screenshot({ path: OUT + '/e2-chat.png', fullPage: true });

  // contest
  await go(A.p, '#/suggest', '#sug-form'); await A.p.fill('#sug', 'The Constitution does not grant rights. It guards the ones we were born with.'); await A.p.click('text=Send my entry'); await A.p.waitForSelector('text=Your entry is in');
  await go(B.p, '#/suggest', '#sug-form'); await B.p.fill('#sug', 'Learn it, live it, teach it.'); await B.p.check('input[value=anonymous]'); await B.p.click('text=Send my entry'); await B.p.waitForSelector('text=Your entry is in');
  log('pam unverified vote buttons:', await B.p.locator('[data-vote]').count());
  // Fred (admin) verifies Pam
  await go(A.p, '#/admin', '#v-form'); await A.p.fill('#v-nick', 'PuebloPam'); await A.p.selectOption('#v-level', 'phone'); await A.p.click('text=Save label'); await A.p.waitForTimeout(1200);
  await go(B.p, '#/suggest', '.entries'); log('pam verified vote buttons:', await B.p.locator('[data-vote]').count());
  await B.p.click('[data-vote]'); await B.p.waitForSelector('text=You voted this month'); 
  log('ranked entries:', (await B.p.locator('.entries').innerText()).replace(/\n/g, ' | '));
  await B.p.screenshot({ path: OUT + '/e2-contest.png', fullPage: true });

  // admin adds an event; sponsors form from a signed-out visitor
  await go(A.p, '#/admin', '#e-form'); await A.p.fill('#e-title', 'Test event'); await A.p.fill('#e-date', '2026-12-05'); await A.p.fill('#e-url', 'https://cpw.state.co.us/'); await A.p.click('text=Add event'); await A.p.waitForTimeout(1000);
  await go(B.p, '#/events', '#events .inbox'); log('events list:', (await B.p.locator('#events').innerText()).replace(/\n/g, ' | '));
  const V = await (await b.newContext({ serviceWorkers: 'block' })).newPage();
  await V.goto('http://localhost:8080/#/sponsors'); await V.waitForSelector('#sp-form');
  await V.fill('#sp-name', 'Pat'); await V.fill('#sp-biz', 'Test Range LLC'); await V.fill('#sp-contact', 'pat@example.com'); await V.check('input[value="150"]'); await V.click('#sp-form button[type=submit]');
  await V.waitForSelector('text=Thank you!'); log('sponsor request sent by visitor');
  await go(A.p, '#/admin', '#admin'); await A.p.waitForTimeout(800); log('admin sees sponsor request:', (await A.p.locator('section:has-text("Sponsor requests")').innerText()).includes('Test Range LLC'));
  // newsletter trading post line
  await go(B.p, '#/newsletter', '#news-tp p'); await B.p.waitForTimeout(800); log('newsletter TP:', (await B.p.locator('#news-tp').innerText()).split('\n')[0]);
  // pam profile caution check not triggered by 1 low rating
  await go(A.p, `#/member/${B.uid}`, '.profile-head'); log('pam verify shown:', (await A.p.locator('.profile-head').innerText()).replace(/\n/g, ' '));
  log('errors:', errs);
  await b.close();
})().catch(e => { console.error('E2E ERROR', e.message.split('\n')[0]); process.exit(1); });
