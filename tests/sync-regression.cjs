// Two iPads over a local relay: the start screen lists the game, a guest who drops out pauses the
// game, and rejoins from the list without the code. Needs: a static server on :8765 and a local MQTT
// WebSocket relay on :8898 (e.g. aedes + ws, see tests/local-relay.cjs).
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL=(process.env.BASE_URL||'http://localhost:8765/')+'?broker=ws://localhost:8898';
const out=process.env.QA_OUTPUT||'/tmp/canggu-sync';require('fs').mkdirSync(out,{recursive:true});
(async()=>{
  const b=await chromium.launch();
  const hc=await b.newContext({viewport:{width:1180,height:820}}), gc=await b.newContext({viewport:{width:1180,height:820}});
  const errs=[];const H=await hc.newPage();H.on('pageerror',e=>errs.push('H '+e.message));
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  await H.goto(URL);await H.fill('#nm','Papa');await H.click('[data-a="host"]');await w(2500);
  const code=await H.evaluate(()=>document.querySelector('.roomchip b, .code, .roomcode')?.textContent||'');
  console.log('host lobby code chip?',code);
  let G=await gc.newPage();G.on('pageerror',e=>errs.push('G '+e.message));
  await G.goto(URL);await G.fill('#nm','Juna');
  await G.waitForSelector('.game-row',{timeout:20000});console.log('guest sees:',await G.locator('.game-row').first().innerText());
  await G.screenshot({path:out+'/home-list.png'});
  await G.locator('.game-row').first().click();await w(4000);
  console.log('host lobby players',await H.evaluate(()=>document.body.innerText.includes('Juna')));
  H.on('dialog',d=>d.accept());
  await H.click('[data-a="newgame"]');await w(1500);
  await H.click('[data-a="startShift"]').catch(e=>console.log('start',e.message));await w(5000);
  console.log('phase',await H.locator('#clock').innerText());
  // disconnect the guest (close the page; localStorage keeps its id)
  await G.close();const t0=Date.now();
  await H.waitForSelector('.pause-banner',{timeout:30000});console.log('paused after',Math.round((Date.now()-t0)/1000),'s');
  const c1=await H.locator('#clock').innerText();await w(3000);const c2=await H.locator('#clock').innerText();console.log('clock frozen',c1,c2);
  await H.screenshot({path:out+'/paused.png'});
  G=await gc.newPage();G.on('pageerror',e=>errs.push('G2 '+e.message));
  await G.addInitScript(()=>{try{localStorage.removeItem('kc-guest');localStorage.removeItem('cg:kc-guest')}catch(e){}});
  await G.goto(URL);await G.waitForSelector('.game-row.mine',{timeout:20000});console.log('rejoin row:',await G.locator('.game-row.mine').innerText());
  await G.screenshot({path:out+'/rejoin.png'});
  await G.locator('.game-row.mine').click();
  await H.waitForSelector('.pause-banner',{state:'detached',timeout:20000});console.log('resumed; clock',await H.locator('#clock').innerText());
  await w(2000);await G.screenshot({path:out+'/guest-back.png'});
  console.log('errors',errs);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
