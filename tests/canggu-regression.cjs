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

test('No cancelling: a working chef stays until the sand runs out', () => {
  const s = game();
  ok(s, 'place', { area: 'storA', idx: 0 }, 5000);
  const t = slotOf(s, 'storA');
  assert.match(act(s, 'recall', { owner: 'p0', t, cancel: true }, 8000), /still working/);
  ok(s, 'recall', { owner: 'p0', t }, 40000);
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

test('Solo: one visit takes every order of the party', () => {
  const s = game(2, 1, { level: 'normal' });
  const m = seatGroup(s, 'birthday');
  const seat = s.seats.findIndex(x => x.group === m.id);
  s.workers.p0 = s.workers.p0.map(() => null); s.spaces.reception = [null];
  ok(s, 'place', { area: 'dining', idx: 0 }, 7000); ok(s, 'takeOrder', { seat }, 7000);
  const parts = E.momentOrders(s, m);
  assert.equal(parts.length, 2); assert.ok(parts.every(o => o.pid === 'p0'));
});

test('After the first party order, the others take theirs with one tap within 10 s', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = seatGroup(s, 'birthday');
  const seat = s.seats.findIndex(x => x.group === m.id);
  s.workers.p0 = s.workers.p0.map(() => null); s.spaces.reception = [null];
  ok(s, 'place', { area: 'dining', idx: 0 }, 7000); ok(s, 'takeOrder', { seat }, 7000);
  assert.equal(m.claimUntil, 7000 + E.CLAIM_MS);
  assert.match(act(s, 'claimPart', { moment: m.id }, 7500), /already have one/);
  assert.equal(E.apply(s, { pid: 'p1', type: 'claimPart', moment: m.id }, 8000), null);
  assert.equal(E.momentOrders(s, m).filter(o => o.pid === 'p1').length, 1);
});

test('Party orders nobody claims in 10 s go round the chefs who have none', () => {
  const s = game(3, 3, { level: 'normal' });
  const m = seatGroup(s, 'birthday');
  const seat = s.seats.findIndex(x => x.group === m.id);
  s.workers.p0 = s.workers.p0.map(() => null); s.spaces.reception = [null];
  ok(s, 'place', { area: 'dining', idx: 0 }, 7000); ok(s, 'takeOrder', { seat }, 7000);
  E.tick(s, 7000 + E.CLAIM_MS + 1);
  const parts = E.momentOrders(s, m);
  assert.equal(parts.length, 3); assert.equal(new Set(parts.map(o => o.pid)).size, 3);
  assert.equal(s.seats[seat].group, null);
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
