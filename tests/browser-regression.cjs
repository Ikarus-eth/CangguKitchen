// Run with a static server and Playwright installed. BASE_URL defaults to localhost:8765.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = process.env.QA_OUTPUT || '/tmp/canggu-review';fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  const page=await browser.newPage({viewport:{width:1194,height:834}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const settle=()=>page.waitForTimeout(160);
  async function load(sc=8,n=4) {
    await page.evaluate(({sc,n})=>{__kc.ui.workers=false;__kc.ui.team=false;__kc.ui.peek=null;__kc.ui.mate=null;__kc.ui.planZoom=0;__kc.ui.sel=null;const g=__kc.loadScenario(sc,n);g.settings.strict=false;Engine.apply(g,{type:'start'},Date.now()-5000);g.coins=100;__kc.render();},{sc,n});await settle();
  }
  async function seedOrders() {
    await page.evaluate(()=>{const g=__kc.wrap.game;['mie','soup','antipasti'].forEach((dish,i)=>g.orders.push({id:g.nextOrder++,pid:__kc.me.pid,dish,plate:i===0?'M':null,ing:i===0?{meat:1,veg:1,pasta:1}:{},sp:{},src:[],row:i===0?2:0}));__kc.render();});await settle();
  }
  try{
    await page.goto((process.env.BASE_URL||'http://localhost:8765/')+'?dev');
    for(let sc=1;sc<=13;sc++)for(let n=1;n<=4;n++){
      await load(sc,n);
      const counts=await page.evaluate(()=>{
        const g=__kc.wrap.game,selectors={reception:'.reception',dining:'.dining',storA:'.st1',storB:'.st2',storC:'.st3',stove:'.stove',green:'.green',sink:'.sink',office:'.office'};
        return Object.entries(selectors).map(([area,sel])=>({area,expected:g.spaces[area]?.length||0,actual:document.querySelectorAll('.board '+sel+' .spot').length}));
      });for(const c of counts)assert.equal(c.actual,c.expected,`scenario ${sc}, ${n} players, ${c.area}`);
    }
    console.log('52 scenario/player layouts match engine capacities');
    for(const [width,height] of [[1280,960],[1194,834],[1024,768],[768,1024],[390,844]]){
      await page.setViewportSize({width,height});await load();await seedOrders();
      const geometry=await page.evaluate(()=>{
        const t=document.querySelector('.mytks>.ticket'),head=t.querySelector('.tk-head'),body=t.querySelector('.ticket-body'),y=head.getBoundingClientRect().top;
        body.scrollTop=10000;
        const r=head.getBoundingClientRect();
        return {pageWidth:document.body.scrollWidth,width:innerWidth,y,after:r.top,height:r.height,name:head.innerText,cardTop:t.getBoundingClientRect().top,recipeColumns:getComputedStyle(body).gridTemplateColumns};
      });assert.ok(geometry.pageWidth<=width+1,JSON.stringify(geometry));assert.equal(geometry.y,geometry.after);assert.ok(geometry.height>=30);assert.match(geometry.name,/Mie Goreng/);
      assert.equal(await page.locator('.mytks .next-need').count(),0);
      assert.equal(await page.locator('.mytks .recipe-line.complete,.mytks .recipe-line.missing,.mytks .recipe-line.excess').count(),0);
      await page.evaluate(()=>document.querySelectorAll('.ticket-body').forEach(el=>el.scrollTop=0));
      await page.screenshot({path:`${output}/game-${width}.png`});
    }
    console.log('Pinned meal names and neutral quantities verified at five screen sizes');
    await page.setViewportSize({width:1194,height:834});await load();await seedOrders();
    const free=await page.evaluate(()=>[...document.querySelectorAll('.board .free-spot')].map(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.spot');
      return {name:el.getAttribute('aria-label'),hit:hit===el,border:s.borderTopWidth,bg:s.backgroundColor};
    }));for(const x of free){assert.ok(x.hit,x.name);assert.equal(x.border,'4px');assert.notEqual(x.bg,'rgba(0, 0, 0, 0)');}
    assert.equal(await page.locator('.locked-spot').count(),2);assert.equal(await page.locator('.spot.broken').count(),1);
    await page.locator('.st1 [data-a="place"]').first().click();await settle();
    await page.locator('.st1 [data-a="takeIng"][data-ing="cheese"]').click();await settle();
    // This dish is already cooked, so the action is illegal even without correctness hints.
    assert.match(await page.locator('#toast').innerText(),/already cooking/);
    await page.evaluate(()=>{const g=__kc.wrap.game;for(const [i,area,idx] of [[1,'sink',0],[2,'sink',1],[3,'stove',4]]){const err=Engine.apply(g,{type:'place',pid:g.players[i].id,area,idx},Date.now());if(err)throw Error(err);}__kc.render();});await settle();
    assert.equal(await page.locator('.sink .spot.taken').count(),2);
    await page.screenshot({path:`${output}/busy-kitchen.png`});
    const before=await page.evaluate(()=>{const g=__kc.wrap.game;g.workers[__kc.me.pid].forEach(w=>{if(w)w.start-=60000});Object.values(g.spaces).flat().filter(Boolean).filter(x=>x.pid===__kc.me.pid).forEach(x=>x.start-=60000);__kc.render();return g.spaces.storA[0]!=null;});assert.ok(before);await settle();
    await page.locator('[data-a="workers"]').click();await settle();await page.locator('[data-a="recall"]').first().click();await settle();
    assert.equal(await page.evaluate(()=>__kc.wrap.game.spaces.storA[0]),null);await page.locator('.worker-card [data-a="workers"]').click();await settle();
    await load(5);await page.locator('[data-area="van"]').click();await settle();
    await page.locator('[data-a="shopIng"][data-ing="meat"]').click();await settle();
    await page.screenshot({path:`${output}/shopping.png`});
    await page.locator('[data-a="buyIng"][data-split="2"]').click();await settle();
    const stock=await page.evaluate(()=>{const g=__kc.wrap.game;return {a:g.storage.A.meat,b:g.storage.B.meat,coins:g.coins}});
    assert.deepEqual(stock,{a:8,b:9,coins:99});
    await load(3);await seedOrders();
    const reasonCount=await page.evaluate(()=>{const g=__kc.wrap.game;g.coins=g.shift0.coins;const n=g.orders.reduce((sum,o)=>sum+Engine.checkOrder(g,o).length,0);Engine.endShift(g,Date.now());__kc.ui.results=true;__kc.render();return n;});await settle();
    assert.equal(await page.locator('.meal-errors>li').count(),reasonCount);assert.ok(reasonCount>8);
    assert.equal(await page.locator('.score td.who:visible').count(),4);
    await page.waitForTimeout(3500);
    await page.screenshot({path:`${output}/mistakes-report.png`});
    assert.deepEqual(errors,[]);
    console.log('Visible standing spaces, two-person washing, recall, split shopping and full mistake reports passed');
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
