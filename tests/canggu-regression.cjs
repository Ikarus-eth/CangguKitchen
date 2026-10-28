// Rules for the Canggu edition (canggu/index.html). Run: node tests/canggu-regression.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../canggu/index.html'), 'utf8');
const engine = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).find(x => x.includes('function newGame'));
const ctx = vm.createContext({}); vm.runInContext(engine, ctx);
const E = ctx.Engine;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
function game(scenario = 3, n = 3, extra = {}) {
  const s = E.newGame(Object.assign({ scenario, strict: false, workerSec: 30, shiftSec: 240 }, extra), Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Chef ' + i, color: ['blue', 'yellow', 'red', 'green'][i] })));
  E.apply(s, { type: 'start' }, 1000); return s;
}
function act(s, type, args = {}, now = 4000) { return E.apply(s, Object.assign({ pid: 'p0', type }, args), now); }
function ok(s, type, args, now) { assert.equal(act(s, type, args, now), null); }
function order(s, dish = 'mie', extra = {}) {
  const o = Object.assign({ id: s.nextOrder++, pid: 'p0', dish, plate: null, ing: {}, sp: {}, src: [], row: 0 }, extra); s.orders.push(o); return o;
}
const slotOf = (s, area) => s.workers.p0.findIndex(w => w && w.area === area);

test('Cancel: a running chef is refused without cancel, freed with it', () => {
  const s = game();
  ok(s, 'place', { area: 'storA', idx: 0 }, 5000);
  const t = slotOf(s, 'storA');
  assert.match(act(s, 'recall', { owner: 'p0', t }, 8000), /still working/);
  ok(s, 'recall', { owner: 'p0', t, cancel: true }, 8000);
  assert.equal(s.workers.p0[t], null);
  assert.equal(s.spaces.storA[0], null);
  assert.equal(s.open.p0, null);
});

test('Cancel at the stove loses the cooking step of that visit', () => {
  const s = game();
  const o = order(s, 'mie', { row: 1 });
  ok(s, 'place', { area: 'stove', idx: 0 }, 5000);
  ok(s, 'cook', { order: o.id }, 5500);
  assert.equal(o.row, 2);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'stove'), cancel: true }, 9000);
  assert.equal(o.row, 1);
  assert.match(s.errs.p0.msg, /cooking step on/);
});

test('Cancel at the sink sends the plates washed on that visit back to dirty', () => {
  const s = game(3);
  const size = E.PLATES.find(x => s.dirty[x] >= 2) || E.PLATES.find(x => s.dirty[x] > 0);
  s.dirty[size] = 3; const clean = s.cupboard[size];
  ok(s, 'place', { area: 'sink', idx: 0 }, 5000);
  ok(s, 'wash', { size }, 5200); ok(s, 'wash', { size }, 5400);
  assert.equal(s.cupboard[size], clean + 2);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'sink'), cancel: true }, 9000);
  assert.equal(s.cupboard[size], clean);
  assert.equal(s.dirty[size], 3);
});

test('Cancel in a fridge puts the ingredients taken on that visit back', () => {
  const s = game();
  const o = order(s, 'mie');
  ok(s, 'place', { area: 'storA', idx: 0 }, 5000);
  const ing = E.ING.find(i => s.storage.A[i] > 0), before = s.storage.A[ing];
  ok(s, 'takeIng', { order: o.id, ing }, 5200); ok(s, 'takeIng', { order: o.id, ing }, 5300);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'storA'), cancel: true }, 9000);
  assert.equal(o.ing[ing], 0); assert.equal(s.storage.A[ing], before); assert.equal(o.src.length, 0);
});

test('Cancel at the superfood bar puts the superfoods back', () => {
  const s = game(3);
  const o = order(s, 'mie');
  ok(s, 'place', { area: 'green', idx: 0 }, 5000);
  const sp = E.SPICES.find(i => s.bag[i] > 0), before = s.bag[sp];
  ok(s, 'takeSpice', { order: o.id, spice: sp }, 5200);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'green'), cancel: true }, 9000);
  assert.equal(o.sp[sp], 0); assert.equal(s.bag[sp], before);
});

test('Cancel in the dining room hands the order back to the guest, with its plate and food', () => {
  const s = game(3);
  const seat = s.seats.findIndex(x => x.dish), dish = s.seats[seat].dish;
  ok(s, 'place', { area: 'dining', idx: 0 }, 5000);
  ok(s, 'takeOrder', { seat }, 5100);
  const o = s.orders.find(x => x.dish === dish);
  const size = E.PLATES.find(x => s.cupboard[x] > 0), clean = s.cupboard[size];
  ok(s, 'takePlate', { order: o.id, size }, 5200);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'dining'), cancel: true }, 9000);
  assert.ok(!s.orders.some(x => x.id === o.id));
  assert.equal(s.seats[seat].dish, dish);
  assert.equal(s.cupboard[size], clean);
});

test('Front desk, scooter run and office visits cannot be cancelled', () => {
  const s = game(8, 3); s.coins = 20;
  ok(s, 'place', { area: 'reception', idx: 0 }, 5000);
  assert.match(act(s, 'recall', { owner: 'p0', t: slotOf(s, 'reception'), cancel: true }, 6000), /can't be cancelled/);
  const t = game(4, 3); t.coins = 5;
  ok(t, 'place', { area: 'van', idx: 0 }, 5000);
  assert.match(act(t, 'recall', { owner: 'p0', t: slotOf(t, 'van'), cancel: true }, 6000), /can't be cancelled/);
});

test('Cancel never saves time: desk-order-ingredients chain is fully undone', () => {
  const s = game(3);
  const seat = s.seats.findIndex(x => x.dish), dish = s.seats[seat].dish;
  const stock = JSON.stringify(s.storage), bag = JSON.stringify(s.bag);
  ok(s, 'place', { area: 'dining', idx: 0 }, 5000); ok(s, 'takeOrder', { seat }, 5000);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'dining'), cancel: true }, 5100);
  assert.equal(s.orders.length, 0); assert.equal(s.seats[seat].dish, dish);
  assert.equal(JSON.stringify(s.storage), stock); assert.equal(JSON.stringify(s.bag), bag);
});

test('Cancelling a finished timer is a normal recall, nothing is undone', () => {
  const s = game();
  const o = order(s, 'mie', { row: 1 });
  ok(s, 'place', { area: 'stove', idx: 0 }, 5000);
  ok(s, 'cook', { order: o.id }, 5500);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'stove'), cancel: true }, 40000);
  assert.equal(o.row, 2);
});

test('After cancelling, the chef can go somewhere else at once', () => {
  const s = game(1, 3);
  ok(s, 'place', { area: 'storA', idx: 0 }, 5000);
  assert.match(act(s, 'place', { area: 'stove', idx: 0 }, 6000), /still running/);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'storA'), cancel: true }, 6000);
  ok(s, 'place', { area: 'stove', idx: 0 }, 6000);
  assert.equal(s.open.p0.type, 'cook');
});


function withMoment(s, kind, at = 5000) { s.moments = [{ id: 99, kind, at, state: 'planned', shift: s.shift }]; E.tick(s, at); return s.moments[0]; }

test('Difficulty presets: Chill has no team moments, the others plan them', () => {
  const chill = game(3, 3, { level: 'chill' }); assert.equal(chill.moments.length, 0);
  const normal = game(3, 3, { level: 'normal' }); assert.equal(normal.moments.length, 1);
  const crazy = game(3, 3, { level: 'canggu' }); assert.equal(crazy.moments.length, 2);
  crazy.moments.forEach(m => { assert.ok(m.at >= crazy.shiftStart + 15000 && m.at < crazy.shiftEnd); });
  assert.equal(E.LEVELS.hectic.win, 10000);
});

test('Melting delivery: a chef in a storage room in time takes it in', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = withMoment(s, 'delivery');
  assert.equal(m.state, 'live');
  const before = s.storage.A[m.ing];
  ok(s, 'place', { area: 'storB', idx: 0 }, 5000 + 15000);
  assert.equal(m.state, 'met');
  assert.equal(s.storage.A[m.ing], before + E.DELIVERY_N);
});

test('Melting delivery: too late, it melts and costs reputation where it exists', () => {
  const s = game(6, 3, { level: 'hectic' }); s.rep = 3;
  const m = withMoment(s, 'delivery');
  E.tick(s, 5000 + 10001);
  assert.equal(m.state, 'missed'); assert.equal(s.rep, 2);
  ok(s, 'place', { area: 'storA', idx: 0 }, 16000);
  assert.equal(s.momentLog.length, 1);
});

// A group joins the queue, a chef seats it at the front desk, then each chef takes one order.
function seatGroup(s, kind, now = 6000) {
  const m = withMoment(s, kind);
  assert.equal(m.state, 'queued'); assert.equal(E.headGroup(s), m);
  s.seats.forEach(x => { x.dish = null; });
  ok(s, 'place', { area: 'reception', idx: 0 }, now);
  assert.equal(s.open.p0.type, 'reception');
  ok(s, 'seat', {}, now);
  assert.equal(m.state, 'seated');
  return m;
}
function takeAll(s, m, now = 7000) {
  const seat = s.seats.findIndex(x => x.group === m.id);
  const ids = s.players.map(p => p.id);
  m.dishes.forEach((_, i) => {
    const pid = ids[i % ids.length];
    s.workers[pid] = s.workers[pid].map(() => null); Object.keys(s.spaces).forEach(k => { if (k !== 'van') s.spaces[k] = s.spaces[k].map(() => null); });
    assert.equal(E.apply(s, { pid, type: 'place', area: 'dining', idx: 0 }, now + i * 100), null);
    assert.equal(E.apply(s, { pid, type: 'takeOrder', seat }, now + i * 100), null);
  });
  return E.momentOrders(s, m);
}

test('Groups arrive in the queue, not on the boards', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = withMoment(s, 'birthday');
  assert.equal(m.state, 'queued'); assert.equal(E.momentOrders(s, m).length, 0);
  assert.ok(E.isGroup(s.deck[s.deck.length - 1]));
});

test('Front desk: a group next in line opens the choice even before restaurant 6', () => {
  const s = game(2, 3, { level: 'normal' });
  withMoment(s, 'birthday');
  ok(s, 'place', { area: 'reception', idx: 0 }, 6000);
  assert.equal(s.open.p0.type, 'reception');
});

test('Turning a group away costs nothing and seats ordinary guests', () => {
  const s = game(6, 3, { level: 'normal' }); s.rep = 2;
  const m = withMoment(s, 'influencer');
  s.seats.forEach(x => { x.dish = null; });
  ok(s, 'place', { area: 'reception', idx: 0 }, 6000);
  ok(s, 'turnAway', {}, 6000);
  assert.equal(m.state, 'declined'); assert.equal(s.rep, 2);
  assert.ok(!s.deck.some(E.isGroup));
  assert.ok(s.seats.some(x => x.dish && !x.group));
  assert.equal(s.momentLog[0].declined, true);
});

test('A group nobody seats walks off after a while, no penalty', () => {
  const s = game(6, 3, { level: 'normal' }); s.rep = 2;
  const m = withMoment(s, 'birthday');
  E.tick(s, m.arrivedAt + E.QUEUE_MS + 1);
  assert.equal(m.state, 'declined'); assert.equal(m.walked, true); assert.equal(s.rep, 2);
  assert.ok(!s.deck.some(E.isGroup));
});

test('Leaving the front desk without choosing seats the group', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = withMoment(s, 'birthday');
  s.seats.forEach(x => { x.dish = null; });
  ok(s, 'place', { area: 'reception', idx: 0 }, 6000);
  ok(s, 'done', {}, 6500);
  assert.equal(m.state, 'seated');
});

test('Birthday party: one table, one order per chef, served together pays a tip', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = seatGroup(s, 'birthday');
  const seat = s.seats.findIndex(x => x.group === m.id);
  assert.equal(s.seats[seat].parts.length, 3);
  // the same chef can't take a second order from the party
  s.workers.p0 = s.workers.p0.map(() => null); s.spaces.reception = [null];
  ok(s, 'place', { area: 'dining', idx: 1 }, 6500); ok(s, 'takeOrder', { seat }, 6500);
  s.workers.p0 = s.workers.p0.map(() => null); s.spaces.dining = s.spaces.dining.map(() => null);
  ok(s, 'place', { area: 'dining', idx: 1 }, 6600);
  assert.match(act(s, 'takeOrder', { seat }, 6600), /one per chef/);
  ['p1', 'p2'].forEach((pid, i) => { assert.equal(E.apply(s, { pid, type: 'place', area: 'dining', idx: 2 + i }, 6700), null); assert.equal(E.apply(s, { pid, type: 'takeOrder', seat }, 6700), null); });
  assert.equal(s.seats[seat].group, null);
  const parts = E.momentOrders(s, m);
  assert.equal(new Set(parts.map(o => o.pid)).size, 3);
  const coins = s.coins;
  parts.forEach((o, i) => ok(s, 'serveMoment', { pid: o.pid, order: o.id }, 9000 + i * 5000));
  assert.equal(m.state, 'met'); assert.equal(s.coins, coins + 3);
});

test('Birthday party: plates too far apart, the guests leave and their orders go', () => {
  const s = game(3, 2, { level: 'hectic' });
  const m = seatGroup(s, 'birthday');
  const parts = takeAll(s, m);
  assert.equal(parts.length, 2);
  ok(s, 'serveMoment', { pid: parts[0].pid, order: parts[0].id }, 8000);
  E.tick(s, 8000 + 10001);
  assert.equal(m.state, 'missed');
  assert.equal(E.momentOrders(s, m).length, 0);
});

test('Solo: one chef may take every order of the party', () => {
  const s = game(2, 1, { level: 'normal' });
  const m = seatGroup(s, 'birthday');
  const parts = takeAll(s, m);
  assert.equal(parts.length, 2); assert.ok(parts.every(o => o.pid === 'p0'));
});

test('Influencer: her slot starts a minute after sitting; both items together inside it', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = seatGroup(s, 'influencer', 6000);
  assert.equal(m.slotStart, 6000 + E.SLOT_LEAD);
  const [a, b] = takeAll(s, m);
  assert.notEqual(a.pid, b.pid);
  assert.match(E.apply(s, { pid: a.pid, type: 'serveMoment', order: a.id }, 8000), /isn't filming yet/);
  ok(s, 'serveMoment', { pid: a.pid, order: a.id }, m.slotStart + 1000);
  ok(s, 'serveMoment', { pid: b.pid, order: b.id }, m.slotStart + 9000);
  assert.equal(m.state, 'met'); assert.equal(m.tip, 2);
});

test('Influencer: missing the slot loses both orders and frees her table', () => {
  const s = game(6, 3, { level: 'normal' }); s.rep = 2;
  const m = seatGroup(s, 'influencer');
  E.tick(s, m.slotEnd + 1);
  assert.equal(m.state, 'missed'); assert.equal(s.rep, 1);
  assert.ok(!s.seats.some(x => x.group === m.id));
});

test('Cancelling a party order puts it back on the table for any chef', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = seatGroup(s, 'birthday');
  const seat = s.seats.findIndex(x => x.group === m.id);
  s.workers.p0 = s.workers.p0.map(() => null); s.spaces.reception = [null];
  ok(s, 'place', { area: 'dining', idx: 1 }, 6500); ok(s, 'takeOrder', { seat }, 6500);
  assert.equal(s.seats[seat].parts.length, 2);
  ok(s, 'recall', { owner: 'p0', t: slotOf(s, 'dining'), cancel: true }, 7000);
  assert.equal(s.seats[seat].parts.length, 3); assert.equal(m.takers.length, 0);
  assert.equal(E.momentOrders(s, m).length, 0);
});

test('Shift end closes open moments, the report lists them', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = seatGroup(s, 'birthday');
  E.apply(s, { type: 'endNow' }, 9000);
  for (let t = 9000; t < 60000 && s.phase !== 'results'; t += 1000) E.tick(s, t);
  assert.equal(m.state, 'missed');
  const r = s.reports[s.reports.length - 1];
  assert.equal(r.moments.length, 1); assert.equal(r.moments[0].kind, 'birthday');
});

test('A pause moves the moment clocks forward', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = withMoment(s, 'delivery');
  const until = m.until;
  E.pause(s, ['p1'], 6000); E.resume(s, 16000);
  assert.equal(m.until, until + 10000);
});

console.log(`${passed} Canggu regressions passed.`);
