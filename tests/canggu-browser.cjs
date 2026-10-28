// Canggu edition in the browser: team moments bar, pings, cancel sheet, difficulty presets.
// Needs a static server on :8765 (BASE_URL to override) and Playwright.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.QA_OUTPUT || '/tmp/canggu-edition'; fs.mkdirSync(out, { recursive: true });
const URL = (process.env.BASE_URL || 'http://localhost:8765/') + 'canggu/?dev';
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1194, height: 834 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const w = ms => page.waitForTimeout(ms);
  try {
    await page.goto(URL);
    // A running restaurant 3 with three chefs; the shift started 5 s ago. A birthday party arrives.
    await page.evaluate(() => {
      const g = __kc.loadScenario(3, 3); g.settings.strict = false; g.settings.level = 'normal';
      Engine.apply(g, { type: 'start' }, Date.now() - 5000);
      g.moments = [{ id: 7, kind: 'birthday', at: Date.now() - 100, state: 'planned', shift: 1 }];
      g.seats.forEach(x => { x.dish = null; });
      Engine.tick(g, Date.now()); __kc.render();
    });
    await w(300);
    assert.equal(await page.locator('.moments .mom.queued').count(), 1, 'queued party in the bar');
    assert.equal(await page.locator('.nextline .nl.grp').count(), 1, 'party shown next in line');
    assert.equal(await page.locator('[data-a="serveMoment"]').count(), 0, 'no orders before seating');
    await page.screenshot({ path: out + '/party-queued.png' });
    // The front desk offers seat or turn away.
    await page.locator('.board .reception [data-a="place"]').first().click(); await w(250);
    assert.equal(await page.locator('.reception-card [data-a="turnAway"]').count(), 1, 'turn away offered');
    await page.screenshot({ path: out + '/front-desk.png' });
    await page.locator('.reception-card [data-a="seatGuests"]').click(); await w(250);
    assert.equal(await page.locator('.seat.grpseat').count(), 1, 'party at one table');
    await page.screenshot({ path: out + '/party-seated.png' });
    // My chef takes one order from the party; the others take theirs.
    await page.evaluate(() => {
      const g = __kc.wrap.game, seat = g.seats.findIndex(x => x.group);
      g.workers[__kc.me.pid] = g.workers[__kc.me.pid].map(() => null); g.spaces.reception = [null];
      __kc.act({ type: 'place', area: 'dining', idx: 0 }); __kc.act({ type: 'takeOrder', seat });
      ['qa1', 'qa2'].forEach((pid, i) => { Engine.apply(g, { pid, type: 'place', area: 'dining', idx: 1 + i }, Date.now()); Engine.apply(g, { pid, type: 'takeOrder', seat }, Date.now()); });
      __kc.render();
    });
    await w(250);
    assert.equal(await page.locator('[data-a="serveMoment"]').count(), 1, 'my serve button');
    await page.locator('[data-a="serveMoment"]').first().click(); await w(200);
    assert.ok((await page.locator('.mpart.done').count()) >= 1, 'served part ticked');
    await page.screenshot({ path: out + '/birthday.png' });
    console.log('PASS party queues, front desk choice, one table, orders per chef, serving from the bar');

    // Long-press on the plan sends a ping with a ripple and a row in the bar.
    const box = await page.locator('.board .stove').boundingBox();
    await page.mouse.move(box.x + 40, box.y + 30); await page.mouse.down(); await w(700); await page.mouse.up(); await w(200);
    const pings = await page.evaluate(() => (__kc.wrap.game.pings || []).length);
    assert.equal(pings, 1, 'ping in state');
    assert.equal(await page.locator('.board .ping').count(), 1, 'ripple on plan');
    assert.equal(await page.locator('.pingrow').count(), 1, 'ping row');
    await page.screenshot({ path: out + '/ping.png' });
    // Another chef answers "On it!".
    await page.evaluate(() => { const g = __kc.wrap.game; Engine.apply(g, { pid: 'qa1', type: 'claim', ping: g.pings[0].id }, Date.now()); __kc.render(); });
    await w(150);
    assert.match(await page.locator('.pingrow').innerText(), /👍 Maya/);
    console.log('PASS long-press ping, ripple and claim');

    // An empty shelf calls for that ingredient.
    await page.evaluate(() => { const g = __kc.wrap.game; g.storage.A.cheese = 0; __kc.render(); });
    await w(100);
    await page.locator('.board .st1 [data-a="shout"][data-ing="cheese"]').click(); await w(150);
    const shout = await page.evaluate(() => __kc.wrap.game.pings.slice(-1)[0]);
    assert.equal(shout.ing, 'cheese');
    console.log('PASS empty shelf shout');

    // The stove opens a cook menu; set-aside meals live in a side drawer.
    await page.evaluate(() => {
      const g = __kc.wrap.game; g.ui = null;
      g.workers[__kc.me.pid] = g.workers[__kc.me.pid].map(() => null); Object.keys(g.spaces).forEach(k => { if (k !== 'van') g.spaces[k] = g.spaces[k].map(() => null); }); g.open = {};
      ['pizza', 'toast'].forEach((d, i) => g.orders.push({ id: g.nextOrder++, pid: __kc.me.pid, dish: d, plate: null, ing: {}, sp: {}, src: [], row: 0, parked: i === 1 }));
      __kc.render(); __kc.act({ type: 'place', area: 'stove', idx: 0 });
    });
    await w(250);
    assert.ok(await page.locator('.cooksheet .cook-row').count() >= 1, 'cook menu opens at the stove');
    await page.screenshot({ path: out + '/cook-menu.png' });
    await page.locator('.cooksheet .cook-row').first().click(); await w(200);
    assert.equal(await page.locator('.cooksheet').count(), 0, 'cooking closes the menu');
    assert.equal(await page.locator('.mytks .shelf').count(), 0, 'no set-aside row between the tickets');
    await page.locator('[data-a="asideOpen"]').click(); await w(200);
    assert.ok(await page.locator('.drawer .shchip').count() >= 1, 'set-aside meal in the drawer');
    console.log('PASS cook menu at the stove, set-aside drawer');

    // Difficulty presets set the timer, goal and practice mode together.
    const L = await page.evaluate(() => Engine.LEVELS);
    assert.deepEqual(Object.keys(L), ['chill', 'normal', 'hectic', 'canggu']);
    assert.equal(L.chill.workerSec, 40); assert.equal(L.canggu.workerSec, 20);
    console.log('PASS difficulty presets');

    assert.deepEqual(errors, []);
    console.log('Canggu browser checks passed.');
  } catch (e) { console.error(e); console.error('page errors', errors); process.exitCode = 1; }
  await b.close();
})();
