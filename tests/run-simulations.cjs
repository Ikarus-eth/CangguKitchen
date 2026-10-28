const fs = require('fs');
const vm = require('vm');
const path = require('path');
const engine = [...fs.readFileSync(process.env.KC_HTML || path.join(__dirname, '../index.html'), 'utf8').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes('function newGame'));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function run(scenario, n, seed, load) {
  const math = Object.create(Math); math.random = rng(seed);
  const ctx = vm.createContext({Math: math}); vm.runInContext(engine, ctx);
  const E = ctx.Engine;
  const players = Array.from({length:n}, (_,i)=>({id:'p'+i,name:'Player '+i,color:['blue','yellow','red','green'][i]}));
  const s = E.newGame({scenario,workerSec:30,shiftSec:240,strict:true}, players);
  let now=1000, decisions=0;
  const m={scenario,players:n,seed,load,actions:0,errors:[],maxStock:0,maxSpices:0,maxDishesPerPlayer:0,maxDishesTotal:0,missingPlateDecisions:0,missingIngredientDecisions:0,missingSpiceDecisions:0,blockedStationDecisions:0,maxOccupancy:{},visits:{},trace:[]};
  function act(a) { const err=E.apply(s,a,now); if(err){if(m.errors.length<15)m.errors.push({action:a.type,error:err});return false;} m.actions++; if(m.trace.length<100)m.trace.push({t:now,shift:s.shift,...a}); return true; }
  function orders(pid) {return s.orders.filter(o=>o.pid===pid&&!o.served);}
  function missingIng(o) {return Object.entries(E.DISHES[o.dish].ing).filter(([k,v])=>(o.ing[k]||0)<v);}
  function missingSp(o) {return Object.entries(E.DISHES[o.dish].sp).filter(([k,v])=>(o.sp[k]||0)<v);}
  function slot(area,pid) {
    if(!s.spaces[area])return -2;
    if(area==='van')return 0;
    if(s.locked[E.ROOM_OF[area]])return -2;
    return s.spaces[area].findIndex((o,i)=>!(s.broken&&s.broken.area===area&&s.broken.idx===i)&&(!o||(o.pid===pid&&E.timerReady(s,s.workers[o.pid][o.t],now))));
  }
  function visit(area,pid) {const i=slot(area,pid);if(i<0){m.blockedStationDecisions++;return false;}if(!E.workerReady(s,pid,now))return false;const ok=act({type:'place',pid,area,idx:i});if(ok)m.visits[area]=(m.visits[area]||0)+1;return ok;}
  function shop(pid,kind,item,room) { if(!E.cfgOf(s).shop||s.coins<1||E.supplyCount(s,item)<(kind==='ing'?(E.has(s,'bulk')?7:5):kind==='cheap'?3:2))return false;if(!visit('van',pid))return false;const a={type:'buy',pid,kind};if(kind==='ing'){a.ing=item;a.room=room;}else a.spices=Array(kind==='cheap'?3:2).fill(item);const ok=act(a);if(s.open[pid])act({type:'done',pid});return ok; }
  function service(pid,card) {if(!s.officeOpen.includes(card)||s.coins<E.OFFICE[card].cost)return false;return visit('office',pid)&&act({type:'officeCard',pid,card});}
  function seat(pid) {return s.deck.length&&s.seats.some(x=>!x.reserved&&!x.dish)&&visit('reception',pid)&&(s.open[pid]?.type==='reception'?act({type:'seat',pid}):true);}
  function decide(pid) {
    let own=orders(pid);
    // Taking a plate is not a worker-placement action in this implementation.
    const plate=own.find(o=>!o.plate);
    if(plate){m.missingPlateDecisions++;const d=E.DISHES[plate.dish];const sizes=[d.plate];if(E.cfgOf(s).bigger&&d.plate!=='XL')sizes.push(E.PLATES[E.PLATES.indexOf(d.plate)+1]);const available=sizes.find(z=>s.cupboard[z]>0);if(available){act({type:'takePlate',pid,order:plate.id,size:available});return;}}
    if(!E.workerReady(s,pid,now))return;
    // Recover workers when affordable.
    if(s.spaces.office&&s.coins>=3){for(const owner of Object.keys(s.off)){const t=s.off[owner].findIndex(Boolean);if(t>=0&&visit('office',pid)){act({type:'latePay',pid,owner,t});return;}}}
    if(plate&&s.spaces.sink){const d=E.DISHES[plate.dish];const allowed=[d.plate];if(E.cfgOf(s).bigger&&d.plate!=='XL')allowed.push(E.PLATES[E.PLATES.indexOf(d.plate)+1]);if(allowed.some(k=>s.dirty[k]>0)&&visit('sink',pid)){let count=E.has(s,'sink')?5:3;const keys=[...allowed,...E.PLATES.filter(k=>!allowed.includes(k))];for(const size of keys)while(count>0&&s.dirty[size]>0&&s.open[pid]){act({type:'wash',pid,size});count--;}if(s.open[pid])act({type:'done',pid});return;}}
    // Work on the oldest unfinished dish first, batching useful collections from one room.
    for(const o of own){if(!o.plate)continue;const missing=missingIng(o);if(missing.length){m.missingIngredientDecisions++;let best=null;
      for(const room of Object.keys(s.storage)){if(s.locked[room])continue;const area='stor'+room;if(slot(area,pid)<0)continue;let gain=0;for(const q of own.filter(x=>x.plate&&x.row===0))for(const [k,v] of missingIng(q))gain+=Math.min(v-(q.ing[k]||0),s.storage[room][k]||0);if(gain&&(!best||gain>best.gain))best={room,area,gain};}
      if(best&&visit(best.area,pid)){for(const q of own.filter(x=>x.plate&&x.row===0))for(const [k,v] of missingIng(q))while((q.ing[k]||0)<v&&s.storage[best.room][k]>0)act({type:'takeIng',pid,order:q.id,ing:k});act({type:'done',pid});return;}
      if(s.locked.B&&missing.some(([k])=>s.storage.B?.[k]>0)&&service(pid,'locksmith'))return;
      for(const [k] of missing){const room=Object.keys(s.storage).find(r=>!s.locked[r]&&E.roomIngs(s,r).includes(k));if(room&&shop(pid,'ing',k,room))return;}
      if(seat(pid))return;continue;
    }
    const spice=missingSp(o);if(spice.length&&s.spaces.green){m.missingSpiceDecisions++;if(spice.some(([k])=>s.bag[k]>0)&&visit('green',pid)){for(const q of own.filter(x=>x.plate))for(const [k,v]of missingSp(q))while((q.sp[k]||0)<v&&s.bag[k]>0)act({type:'takeSpice',pid,order:q.id,spice:k});act({type:'done',pid});return;}for(const[k]of spice)if(shop(pid,E.CHEAP.includes(k)?'cheap':'pricey',k))return;if(seat(pid))return;}
    const d=E.DISHES[o.dish];if(o.row<d.cook&&visit('stove',pid)){act({type:'cook',pid,order:o.id});return;}
    if(E.cfgOf(s).service&&E.checkOrder(s,o).length===0){const group=o.group?s.orders.filter(x=>x.group===o.group):[o];if(group.every(q=>E.checkOrder(s,q).length===0)&&visit('dining',pid)){act({type:'serve',pid,order:o.id});return;}}
    }
    const incomplete=own.filter(o=>E.checkOrder(s,o).length>0).length;
    if(incomplete<load){const choices=s.seats.map((x,i)=>({x,i})).filter(z=>!z.x.reserved&&z.x.dish).sort((a,b)=>{const score=k=>{const d=E.DISHES[k];return d.vip?8:Object.values(d.ing).reduce((a,b)=>a+b,0)+d.cook;};return score(a.x.dish)-score(b.x.dish);});if(choices.length&&visit('dining',pid)){act({type:'takeOrder',pid,seat:choices[0].i});return;}if(seat(pid))return;}
    if(s.broken&&service(pid,'technician'))return;
  }
  act({type:'start'});
  for(now=4000;now<1100000;now+=1000){E.tick(s,now);if(s.phase==='finished'||s.phase==='end'||s.phase==='gameover')break;if(s.phase==='between'){act({type:'nextShift'});continue;}if(s.phase!=='play'||now<s.shiftStart)continue;
    for(let j=0;j<n;j++){const pid=players[(j+Math.floor(now/1000))%n].id;decide(pid);decisions++;}
    for(const v of Object.values(s.storage))m.maxStock=Math.max(m.maxStock,Object.values(v).reduce((a,b)=>a+b,0));
    m.maxSpices=Math.max(m.maxSpices,Object.values(s.bag||{}).reduce((a,b)=>a+b,0));
    const active=s.orders.filter(o=>!o.served);m.maxDishesTotal=Math.max(m.maxDishesTotal,active.length);for(const p of players)m.maxDishesPerPlayer=Math.max(m.maxDishesPerPlayer,active.filter(o=>o.pid===p.id).length);
    for(const[k,v]of Object.entries(s.spaces))m.maxOccupancy[k]=Math.max(m.maxOccupancy[k]||0,v.filter(Boolean).length);
    if(s.results)break;
  }
  const outcome=s.results||E.tally(s);m.win=outcome.win;m.served=outcome.served;m.phase=s.phase;m.shiftsReached=s.shift;m.coins=s.coins;m.rep=s.rep;m.decisions=decisions;return m;
}
const runs=[];for(let sc=1;sc<=13;sc++)for(const n of [2,3,4])for(let seed=1;seed<=5;seed++)runs.push(run(sc,n,seed,2));
const extra=[];for(const sc of[2,7,8,12])for(let seed=1;seed<=5;seed++)extra.push(run(sc,4,seed,4));
const all=[...runs,...extra];const summary={sourceHash:require('crypto').createHash('sha256').update(engine).digest('hex'),runs:all.length,normalRuns:runs.length,highLoadRuns:extra.length,errors:all.flatMap(r=>r.errors),maxStock:Math.max(...all.map(r=>r.maxStock)),maxSpices:Math.max(...all.map(r=>r.maxSpices)),maxDishesPerPlayer:Math.max(...all.map(r=>r.maxDishesPerPlayer)),maxDishesTotal:Math.max(...all.map(r=>r.maxDishesTotal)),maxOccupancy:{},visits:{},scenarios:[]};
for(const r of all){for(const[k,v]of Object.entries(r.maxOccupancy))summary.maxOccupancy[k]=Math.max(summary.maxOccupancy[k]||0,v);for(const[k,v]of Object.entries(r.visits))summary.visits[k]=(summary.visits[k]||0)+v;}
for(let sc=1;sc<=13;sc++){const rr=all.filter(r=>r.scenario===sc);summary.scenarios.push({scenario:sc,runs:rr.length,wins:rr.filter(r=>r.win).length,maxStock:Math.max(...rr.map(r=>r.maxStock)),maxDishesPerPlayer:Math.max(...rr.map(r=>r.maxDishesPerPlayer)),maxDishesTotal:Math.max(...rr.map(r=>r.maxDishesTotal)),plateBlockingSeen:rr.some(r=>r.missingPlateDecisions),chiliOrOtherSpiceNeedSeen:rr.some(r=>r.missingSpiceDecisions)});}
fs.writeFileSync(path.join(__dirname,'simulation-results.json'),JSON.stringify({summary,runs:all},null,2));console.log(JSON.stringify(summary,null,2));
