// Compact overview and submenu actions must never correct standard-mode mistakes.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.env.QA_OUTPUT||'/tmp/kitchen-refinement';fs.mkdirSync(output,{recursive:true});
(async()=>{
const b=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const p=await b.newPage({viewport:{width:1194,height:834}}),errors=[];p.on('pageerror',e=>errors.push(e.message));const settle=()=>p.waitForTimeout(180);
async function load(strict=false){await p.evaluate(strict=>{Object.assign(__kc.ui,{detail:null,stationOpen:false,plateMenu:false,washMenu:false,stations:false,guests:false,seatPeek:null,orderHide:null,pick:null});const g=__kc.loadScenario(3,3);g.settings.strict=strict;Engine.apply(g,{type:'start'},Date.now()-5000);g.cupboard={S:5,M:5,L:5,XL:5};['mie','soup','antipasti'].forEach(dish=>g.orders.push({id:g.nextOrder++,pid:__kc.me.pid,dish,plate:null,ing:{},sp:{},src:[],row:0}));__kc.render();},strict);await settle();}
try{
await p.goto((process.env.BASE_URL||'http://localhost:8765/')+'?dev');await load();
await p.locator('.order-summary').first().click();await settle();
assert.equal(await p.locator('.work-card .recipe-line').count(),4);
await p.screenshot({path:output+'/recipe-menu.png'});
await p.locator('.work-footer [data-a="plateMenu"]').click();await settle();
await p.locator('.pm-row').first().locator('[data-size="S"]').click();await settle();
assert.equal(await p.evaluate(()=>__kc.wrap.game.orders[0].plate),'S');assert.equal(await p.locator('#toast.err.show').count(),0);
await p.locator('.platemenu [data-a="closePlates"]').click();await settle();
// Direct attempts on an already plated selected order must not target a different order.
await p.evaluate(()=>{const button=document.createElement('button');button.dataset.a='plate';button.dataset.size='M';document.getElementById('app').append(button);button.click();button.remove();});await settle();
assert.deepEqual(await p.evaluate(()=>__kc.wrap.game.orders.map(o=>o.plate)),['S',null,null]);
await p.locator('[data-a="stations"]').first().click();await settle();
assert.ok((await p.locator('.station-spots button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width))).every(w=>w>=44));
await p.locator('.station-spots [data-area="storA"]').first().click();await settle();
assert.equal(await p.locator('.work-card.at-station').count(),1);
await p.locator('.tray-item[data-ing="cheese"]').click();await settle();
assert.equal(await p.evaluate(()=>__kc.wrap.game.orders[0].ing.cheese),1);
assert.equal(await p.locator('.work-card .excess,.work-card .missing,.work-card .next-need').count(),0);
await p.screenshot({path:output+'/station-menu.png'});
await p.locator('[data-a="closeOrder"]').click();await settle();
assert.ok(await p.evaluate(()=>document.querySelector('.plan-stage').getBoundingClientRect().height>450));
await p.locator('[data-a="openStation"]').click();await settle();
await p.locator('.station-tray [data-a="done"]').click();await settle();
await p.evaluate(()=>{const o=__kc.wrap.game.orders[0];o.row=Engine.DISHES[o.dish].cook;__kc.render();});await settle();
await p.locator('.stove [data-a="place"]').first().click();await settle();
// The Canggu edition opens a cook menu at the stove; the original opens the meal from its ticket.
if(await p.locator('.cooksheet .cook-row').count()){await p.locator('.cooksheet .cook-row').first().click();await settle();}
else{await p.locator('.order-summary').first().click();await settle();await p.locator('.work-card [data-a="cook"]').click();await settle();}
assert.equal(await p.evaluate(()=>{const o=__kc.wrap.game.orders[0];return o.row-Engine.DISHES[o.dish].cook}),1);
assert.equal(await p.locator('.cook-ring.over,.next-need').count(),0);
await p.evaluate(()=>{const g=__kc.wrap.game,o=g.orders[0],d=Engine.DISHES[o.dish];o.ing={...d.ing};o.sp={...d.sp};o.row=d.cook;Engine.endShift(g,Date.now());__kc.ui.results=true;__kc.render();});await settle();
const report=await p.evaluate(()=>__kc.wrap.game.reports[0].orders[0]);assert.equal(report.ok,false);assert.ok(report.reasons.some(x=>x.includes('wrong plate')));
await p.locator('.ledger summary').first().click();await settle();await p.evaluate(()=>__kc.render());await settle();assert.equal(await p.locator('.ledger details[open]').count(),1);
await load(true);await p.locator('.plate-toggle').click();await settle();await p.locator('.pm-row').first().locator('[data-size="S"]').click();await settle();assert.equal(await p.evaluate(()=>__kc.wrap.game.orders[0].plate),null);assert.match(await p.locator('#toast').innerText(),/Wrong plate/);
for(const [width,height] of [[1194,834],[1024,768],[768,1024],[390,844]]){await p.setViewportSize({width,height});await load();await p.locator('.order-summary').first().click();await settle();const r=await p.locator('.work-card').boundingBox();assert.ok(r.y>=0&&r.y+r.height<=height);assert.ok(await p.locator('.work-card [data-a="closeOrder"]').isVisible());await p.locator('[data-a="closeOrder"]').click();await settle();}
assert.deepEqual(errors,[]);console.log('PASS compact submenus, large station controls, explicit plate targeting, wrong ingredients/plates and overcooking accepted, settlement penalties, persistent ledger and practice protection.');
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
