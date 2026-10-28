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
    // A running restaurant 3 with three chefs; the shift started 5 s ago.
    await page.evaluate(() => {
      const g = __kc.loadScenario(3, 3); g.settings.strict = false; g.settings.level = 'normal';
      Engine.apply(g, { type: 'start' }, Date.now() - 5000);
      g.moments = [{ id: 7, kind: 'birthday', at: Date.now() - 100, state: 'planned', shift: 1 }];
      Engine.tick(g, Date.now()); __kc.render();
    });
    await w(300);
    assert.equal(await page.locator('.moments .mom.live').count(), 1, 'birthday bar shows');
    assert.ok(await page.locator('[data-a="serveMoment"]').count() >= 1, 'my serve button');
    await page.screenshot({ path: out + '/birthday.png' });
    await page.locator('[data-a="serveMoment"]').first().click(); await w(200);
    assert.ok((await page.locator('.mpart.done').count()) >= 1, 'served part ticked');
    console.log('PASS birthday bar and serving from it');

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
    assert.match(await page.locator('.pingrow').innerText(), /Maya is on it/);
    console.log('PASS long-press ping, ripple and claim');

    // An empty shelf calls for that ingredient.
    await page.evaluate(() => { const g = __kc.wrap.game; g.storage.A.cheese = 0; __kc.render(); });
    await w(100);
    await page.locator('.board .st1 [data-a="shout"][data-ing="cheese"]').click(); await w(150);
    const shout = await page.evaluate(() => __kc.wrap.game.pings.slice(-1)[0]);
    assert.equal(shout.ing, 'cheese');
    console.log('PASS empty shelf shout');

    // Cancel: tapping my own working chef offers to cancel; cancelling frees the chef.
    await page.evaluate(() => { __kc.act({ type: 'place', area: 'storB', idx: 0 }); });
    await w(200);
    await page.locator('.board .st2 .spot.taken.mine').first().click(); await w(200);
    assert.match(await page.locator('.worker-card').innerText(), /still working/);
    await page.screenshot({ path: out + '/cancel.png' });
    await page.locator('[data-a="cancelGo"]').first().click(); await w(200);
    const free = await page.evaluate(() => __kc.wrap.game.workers[__kc.me.pid].every(x => !x || x.area !== 'storB'));
    assert.ok(free, 'chef left storage 2');
    console.log('PASS cancel sheet frees a working chef');

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
