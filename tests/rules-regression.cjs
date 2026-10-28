const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const engine = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).find(x => x.includes('function newGame'));
const ctx = vm.createContext({}); vm.runInContext(engine, ctx);
const E = ctx.Engine;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
function game(scenario = 8, strict = false, n = 4) {
  const s = E.newGame({scenario, strict, workerSec:30, shiftSec:240}, Array.from({length:n}, (_,i)=>({id:'p'+i,name:'Chef '+i,color:['blue','yellow','red','green'][i]})));
  E.apply(s,{type:'start'},1000); return s;
}
function act(s, type, args = {}, now = 4000) { return E.apply(s, {pid:'p0', type, ...args}, now); }
function ok(s, type, args, now) { assert.equal(act(s,type,args,now),null); }
function visit(s, area, idx=0, pid='p0', now=4000) { ok(s,'place',{area,idx,pid},now); }
function order(s, dish='mie', extra={}) {
  const o={id:s.nextOrder++,pid:'p0',dish,plate:null,ing:{},sp:{},src:[],row:0,...extra};s.orders.push(o);return o;
}
function complete(s,dish='mie',extra={}) { const d=E.DISHES[dish];return order(s,dish,{plate:d.plate,ing:{...d.ing},sp:{...d.sp},row:d.cook,...extra}); }

test('Restaurant 6+: a reception left without a choice still seats guests',()=>{
  const s=game(6,false,3);
  s.seats.forEach(x=>{x.dish=null;});
  visit(s,'reception');assert.equal(s.open.p0.type,'reception');
  const before=s.coins;
  visit(s,'storA');assert.equal(s.open.p0.type,'storage');
  assert.equal(s.seats.filter(x=>x.dish).length,2);assert.ok(s.coins>before);
  const t=game(6,false,3);visit(t,'reception',0,'p0',4000);t.seats.forEach(x=>{x.dish=null;});ok(t,'done',{},5000);
  assert.equal(t.open.p0,null);assert.equal(t.seats.filter(x=>x.dish).length,2);
});

test('All 13 scenarios and 1–4 players have the required worker capacities',()=>{
  for(let sc=1;sc<=13;sc++)for(let n=1;n<=4;n++){
    const s=game(sc,false,n),p=Math.max(n,2);
    assert.equal(s.spaces.stove.length,p+2);assert.equal(s.spaces.dining.length,p+1);
    assert.equal(s.spaces.storA.length,2);assert.equal(s.spaces.storB.length,2);
    assert.equal(s.workers.p0.length,sc===1?1:2);
    assert.equal(s.spaces.green?.length,sc>=2?2:undefined);
    assert.equal(s.spaces.sink?.length,sc>=3?2:undefined);
    assert.equal(s.spaces.office?.length,sc>=7?1:undefined);
    assert.equal(s.spaces.storC?.length,sc>=5?2:undefined);
  }
});
test('Meal mistakes are allowed in standard play and fully reported at shift end',()=>{
  const s=game(3),o=order(s);visit(s,'storA');
  ok(s,'takePlate',{order:o.id,size:'S'});ok(s,'takeIng',{order:o.id,ing:'cheese'});
  visit(s,'stove');ok(s,'cook',{order:o.id});
  E.endShift(s,244000);
  const r=s.reports[0].orders[0];assert.equal(r.ok,false);
  for(const word of ['wrong plate','missing','too many','undercooked'])assert.ok(r.reasons.some(x=>x.includes(word)),word);
});
test('Practice mode blocks wrong plates, extra ingredients and early cooking atomically',()=>{
  const s=game(3,true),o=order(s),stock=s.storage.A.cheese;visit(s,'storA');
  assert.match(act(s,'takePlate',{order:o.id,size:'S'}),/Wrong plate/);
  assert.match(act(s,'takeIng',{order:o.id,ing:'cheese'}),/doesn't need/);
  assert.equal(s.storage.A.cheese,stock);assert.equal(o.plate,null);
  visit(s,'stove');assert.match(act(s,'cook',{order:o.id}),/plate/);assert.equal(o.row,0);
});
test('Only the exact plate works in scenario 1; exactly one size larger works later',()=>{
  const a=game(1),b=game(2),o=order(a,'pizza',{plate:'L'});
  assert.equal(E.plateOk(a,o),false);assert.equal(E.plateOk(b,o),true);
  o.plate='XL';assert.equal(E.plateOk(b,o),false);
});
test('Ingredients cannot be added after cooking, but spices can',()=>{
  const s=game(4),o=order(s,'mie',{plate:'M',row:1});visit(s,'storA');
  assert.match(act(s,'takeIng',{order:o.id,ing:'meat'}),/already cooking/);
  visit(s,'green');ok(s,'takeSpice',{order:o.id,spice:'chili'});assert.equal(o.sp.chili,1);
});
test('Scenario 1 returns ingredients to their actual source room',()=>{
  const s=game(1),o=order(s,'pizza'),n=s.storage.B.cheese;visit(s,'storB');
  ok(s,'takeIng',{order:o.id,ing:'cheese'});ok(s,'returnIng',{order:o.id,ing:'cheese'});
  assert.equal(s.storage.B.cheese,n);assert.equal(o.ing.cheese,undefined);
});
test('Starting another visit terminates the first action',()=>{
  const s=game(3),o=order(s);visit(s,'storA');visit(s,'green');
  assert.match(act(s,'takeIng',{order:o.id,ing:'meat'}),/visit ended/);
});
test('Occupied spaces remain occupied when the worker finishes',()=>{
  const s=game();visit(s,'sink');assert.match(act(s,'place',{pid:'p1',area:'sink',idx:0},35000),/Someone else/);
  ok(s,'recall',{owner:'p0',t:0},35000);visit(s,'sink',0,'p1',35000);
});
test('Workers cannot be recalled early or by another player',()=>{
  const s=game();visit(s,'sink');assert.match(act(s,'recall',{owner:'p0',t:0}),/still working/);
  assert.match(act(s,'recall',{owner:'p0',t:0,pid:'p1'},35000),/another player/);
  assert.ok(s.spaces.sink[0]);
});
test('A ready shared chef is reused without leaving a phantom worker or old action',()=>{
  const s=game();visit(s,'storA');visit(s,'green');visit(s,'sink');
  assert.equal(s.spaces.sink[0].pid,'temp');assert.equal(s.open.p0.type,'wash');
  visit(s,'sink',0,'p1',35000);assert.equal(s.open.p0,null);assert.equal(s.spaces.sink[0].pid,'temp');
  assert.equal(s.workers.p1.filter(Boolean).length,0);assert.equal(s.workers.temp[0].by,'p1');
  assert.match(act(s,'wash',{size:'M'},35000),/wash station/);
});
test('Two people can wash simultaneously, each with a separate allowance of three',()=>{
  const s=game();s.dirty.M=8;visit(s,'sink',0);visit(s,'sink',1,'p1');
  for(let i=0;i<3;i++)ok(s,'wash',{size:'M'});
  assert.equal(s.open.p0,null);assert.equal(s.open.p1.left,3);assert.equal(s.dirty.M,5);
});
test('Grace period lets a running sand timer finish, then closes forgotten actions',()=>{
  const s=game(3),o=order(s);visit(s,'storA',0,'p0',s.shiftEnd-5000);E.tick(s,s.shiftEnd);
  assert.equal(s.phase,'grace');E.tick(s,s.shiftEnd+20000);assert.equal(s.phase,'grace');
  ok(s,'takeIng',{order:o.id,ing:'meat'},s.shiftEnd+20000);
  assert.match(act(s,'place',{area:'stove',idx:0},s.shiftEnd+20000),/not running/);
  E.tick(s,s.shiftEnd+25001);assert.equal(s.phase,'results');
});
test('A forgotten Done never blocks the end of the shift',()=>{
  const s=game(3);visit(s,'storA');E.tick(s,s.shiftEnd);assert.equal(s.phase,'grace');
  E.tick(s,s.shiftEnd+9000);assert.equal(s.phase,'grace');
  E.tick(s,s.shiftEnd+10000);assert.equal(s.phase,'results');
});
test('Done still ends the shift straight away',()=>{
  const s=game(3);visit(s,'storA');E.tick(s,s.shiftEnd);ok(s,'done',{},s.shiftEnd+100);E.tick(s,s.shiftEnd+101);assert.equal(s.phase,'results');
});
test('Shopping splits one bundle across rooms for one coin and respects bread/pasta separation',()=>{
  const s=game(5),a=s.storage.A.meat,b=s.storage.B.meat,c=s.coins;visit(s,'van');
  ok(s,'buy',{kind:'ing',ing:'meat',allocation:{A:2,B:3}});
  assert.equal(s.storage.A.meat,a+2);assert.equal(s.storage.B.meat,b+3);assert.equal(s.coins,c-1);
  visit(s,'van');assert.match(act(s,'buy',{kind:'ing',ing:'bread',allocation:{A:5}}),/can't go/);
  ok(s,'buy',{kind:'ing',ing:'bread',room:'C'});assert.equal(s.storage.C.bread,10);
});
test('Invalid shopping allocations do not spend coins or partially modify stock',()=>{
  const s=game();s.coins=9;visit(s,'van');const before=JSON.stringify(s.storage);
  for(const allocation of [{A:2,B:3},{A:6,B:-1},{A:2},{A:2.5,C:2.5}])assert.ok(act(s,'buy',{kind:'ing',ing:'meat',allocation}));
  assert.equal(JSON.stringify(s.storage),before);assert.equal(s.coins,9);
});
test('General supply includes stock and all current plates; discarded food returns to it',()=>{
  const s=game(5),o=order(s,'mie',{plate:'M',ing:{meat:2}});order(s,'soup');
  assert.equal(E.supplyCount(s,'meat'),10);ok(s,'discard',{order:o.id});assert.equal(E.supplyCount(s,'meat'),12);
  s.storage.A.meat=21;s.storage.B.meat=3;visit(s,'van');const coins=s.coins;
  assert.match(act(s,'buy',{kind:'ing',ing:'meat',room:'A'}),/supply/);assert.equal(s.coins,coins);
});
test('Spice purchases reject unavailable combinations before modifying any spice',()=>{
  const s=game(5);s.bag.salt=12;visit(s,'van');const before=JSON.stringify(s.bag);
  assert.match(act(s,'buy',{kind:'cheap',spices:['herbs','herbs','salt']}),/supply/);
  assert.equal(JSON.stringify(s.bag),before);
});
test('Shop has no occupancy limit; office and broken stove remain exclusive',()=>{
  const s=game();s.coins=20;
  for(const p of s.players)visit(s,'van',0,p.id);
  assert.equal(s.spaces.van.length,4);visit(s,'office');
  assert.match(act(s,'place',{pid:'p1',area:'office',idx:0}),/Someone else/);
  assert.match(act(s,'place',{pid:'p1',area:'stove',idx:s.broken.idx}),/broken/);
});
test('Office repairs and unlocks a station, and charges once',()=>{
  const s=game();s.coins=20;s.officeOpen=['locksmith','technician'];s.officeDeck=[];
  visit(s,'office');ok(s,'officeCard',{card:'locksmith'});assert.equal(s.locked.B,undefined);
  visit(s,'office',0,'p0',35000);ok(s,'officeCard',{card:'technician'},35000);assert.equal(s.broken,null);assert.equal(s.coins,14);
});
test('Early service gives a tip immediately but checks the meal only at shift end',()=>{
  const s=game(6);s.coins=100;s.rep=5;const o=complete(s,'mie');o.sp={};visit(s,'dining');
  ok(s,'serve',{order:o.id});assert.equal(s.coins,101);E.endShift(s,244000);
  const r=s.reports[0];assert.equal(r.orders[0].ok,false);assert.equal(r.freeDrinks,1);assert.equal(r.repLoss,1);
  assert.equal(s.orders[0].ing.meat,1);assert.equal(s.orders[0].row,2); // Missing spice can be added next shift.
});
test('Unfinished recoverable meals carry over; overcooked meals reset and dirty their plates',()=>{
  const s=game(4),good=complete(s,'mie',{row:1}),bad=complete(s,'mie',{row:3}),dirty=s.dirty.M;
  E.endShift(s,244000);assert.equal(good.row,1);assert.equal(good.plate,'M');
  assert.equal(bad.row,0);assert.equal(bad.plate,null);assert.equal(s.dirty.M,dirty+1);
});
test('A VIP only pays when both dishes are complete; an erroneous early VIP loses three reputation',()=>{
  const s=game(7),vip=E.VIPS[0],d=E.DISHES[vip];s.coins=100;s.rep=5;
  const parts=d.parts.map(id=>complete(s,id,{patron:vip,group:1}));parts[1].row=0;parts[1].ing={};
  visit(s,'dining');ok(s,'serve',{order:parts[0].id});E.endShift(s,244000);
  assert.equal(s.reports[0].meals,0);assert.equal(s.reports[0].repLoss,3);assert.equal(s.reports[0].freeDrinks,0);
});
test('Set-aside is reversible and never certifies a meal',()=>{
  const s=game(4),o=order(s);ok(s,'park',{order:o.id});assert.equal(o.parked,true);
  ok(s,'unpark',{order:o.id});assert.equal(o.parked,false);assert.ok(E.checkOrder(s,o).length);
});
test('Mission 3 is guest mix; Mission 4 is 12/18/24 coins and no locksmith',()=>{
  for(const n of [2,3,4]){
    const a=game(11,false,n),b=game(12,false,n);
    assert.equal(a.goal.coins,undefined);assert.equal(a.goal.mix.vip,2);
    assert.equal(b.goal.coins,n*6);assert.equal(b.goal.rep,undefined);
    assert.ok(![...b.officeOpen,...b.officeDeck].includes('locksmith'));
    assert.equal(Object.values(b.storage).flatMap(Object.values).reduce((a,b)=>a+b,0),0);
  }
});
test('Salary creates strikes; late payment returns one worker at a time',()=>{
  const s=game(7);s.coins=9;E.endShift(s,244000);assert.equal(E.onStrike(s),5);
  ok(s,'nextShift',{},250000);s.coins=3;
  const owner=s.players.find(p=>s.off[p.id].some(Boolean)).id,t=s.off[owner].findIndex(Boolean);
  const payer=s.players.find(p=>s.off[p.id].some(x=>!x)).id;visit(s,'office',0,payer,254000);
  ok(s,'latePay',{pid:payer,owner,t},254000);assert.equal(E.onStrike(s),4);assert.equal(s.coins,0);
});
test('Per-meal compensation matches actual coins paid when the register empties',()=>{
  const s=game(3);s.coins=1;order(s,'mie');order(s,'soup');E.endShift(s,244000);
  assert.equal(s.reports[0].freeDrinks,1);assert.equal(s.reports[0].orders.reduce((sum,o)=>sum+(o.freeDrink||0),0),1);assert.equal(s.coins,0);
});
console.log(`${passed} rule regressions passed.`);
