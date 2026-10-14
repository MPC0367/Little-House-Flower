import assert from 'node:assert/strict';
const {webkit,expect}=await import(process.env.LHF_PLAYWRIGHT_MODULE||'@playwright/test');
const base=(process.env.LHF_TEST_URL||'http://127.0.0.1:5590/Little-House-Flower').replace(/\/$/,'');
const home=base+'/?lang=en#/',marker='lhf.logo.intro.v5',FILM_MS=4400;
const local=['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname);
const checks=[],reports=[],errors=[],contexts=[];
let stage='setup';
const browser=await webkit.launch();

async function contextFor({reducedMotion='no-preference',blockAutoplay=false}={}){
 const context=await browser.newContext({serviceWorkers:'allow',reducedMotion,viewport:{width:1440,height:1000}});
 contexts.push(context);
 await context.addInitScript(({blockAutoplay})=>{
  // Observe before bootstrap. A once-per-session skip must never pass simply
  // because the overlay has not been inserted yet or has already disappeared.
  const qa=window.__lhfIntroReload={starts:0,dismissals:[],unsafeControls:[],mockedAPI:[],playBlocked:0};
  const observed=new WeakSet();
  const observe=()=>{
   for(const overlay of document.querySelectorAll('.lhf-logo-intro')){
    if(!observed.has(overlay)){observed.add(overlay);qa.starts++;}
    if(overlay.querySelector('button,input[type=password]'))qa.unsafeControls.push('intro control');
   }
   if(document.querySelector('#pages-access,input[type=password]'))qa.unsafeControls.push('password gate');
  };
  new MutationObserver(observe).observe(document,{subtree:true,childList:true});
  document.addEventListener('lhf:intro-dismissed',event=>qa.dismissals.push(structuredClone(event.detail)));
  // All API calls are mocked before pages-access captures fetch. The test never
  // creates even a customer session, a preview job, or an order on the backend.
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
   const url=new URL(input instanceof Request?input.url:String(input),location.href);
   if(/\/api\//.test(url.pathname)){
    const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    qa.mockedAPI.push({method,path:url.pathname});
    const recipes=url.pathname.endsWith('/preview-recipes');
    return Promise.resolve(new Response(JSON.stringify(recipes?{recipes:[]}:{error:'API disabled for read-only loading regression.'}),{status:recipes?200:503,headers:{'Content-Type':'application/json'}}));
   }
   return originalFetch(input,init);
  };
  if(blockAutoplay){
   const originalPlay=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(...args){
    if(this.classList.contains('lhf-logo-video')){qa.playBlocked++;return Promise.reject(new DOMException('Autoplay blocked for regression check.','NotAllowedError'));}
    return originalPlay.apply(this,args);
   };
  }
 },{blockAutoplay});
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 // In addition to mocking page fetch, fail if an API request escapes the mock.
 context.on('request',request=>{if(/\/api\//.test(new URL(request.url()).pathname))errors.push('Unexpected network API request: '+request.method()+' '+new URL(request.url()).pathname);});
 return context;
}

async function releaseChecks(page){
 await expect(page.locator('.lhf-logo-intro')).toHaveCount(0,{timeout:10000});
 await expect(page.locator('#main h1')).toBeVisible();
 assert.equal(await page.locator('#main').evaluate(node=>node.inert),false,'Main content must be released after the intro.');
 await expect(page.locator('#pages-access,input[type=password]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/skip animation|skip intro|ข้าม.*(?:แอนิเมชัน|ภาพเปิด)/i})).toHaveCount(0);
 assert.deepEqual(await page.evaluate(()=>window.__lhfIntroReload.unsafeControls),[],'No password or intro skip controls may be rendered.');
}

async function waitForRun(page,label,{expectedStarts=1,expectedDismissals=1,blocked=false}={}){
 // Wait for the application instrumentation, not an initial empty DOM selector.
 await page.waitForFunction(()=>Boolean(window.LHF?.logoIntro&&(LHF.logoIntro.state||LHF.logoIntro.report)),null,{timeout:20000});
 await page.waitForFunction(count=>window.__lhfIntroReload?.starts>=count,expectedStarts,{timeout:10000});
 await page.waitForFunction(count=>window.__lhfIntroReload?.dismissals.length>=count,expectedDismissals,{timeout:12000});
 await releaseChecks(page);
 const result=await page.evaluate(()=>({starts:__lhfIntroReload.starts,dismissals:__lhfIntroReload.dismissals,report:LHF.logoIntro.report,marker:sessionStorage.getItem('lhf.logo.intro.v5'),playBlocked:__lhfIntroReload.playBlocked}));
 assert.equal(result.starts,expectedStarts,label+': the intro must actually start exactly once per document load.');
 assert.equal(result.dismissals.length,expectedDismissals,label+': the intro must finish.');
 assert.equal(result.marker,'1');
 // The opening is the supplied film and never lasts longer than it (4.4s), whatever the page is doing.
 assert.ok(result.report.elapsed<=FILM_MS+120,label+': the opening must not outlast the film ('+Math.round(result.report.elapsed)+' ms).');
 if(result.report.media==='video'){
  assert.ok(['film-ended','film-length','film-length-page-still-loading'].includes(result.report.reason),label+': the opening ends with the film ('+result.report.reason+').');
  assert.ok(result.report.timeline>=3300,label+': the film must be seen through its 100% frame at its own speed (reached '+Math.round(result.report.timeline)+' ms).');
 }else{
  assert.equal(result.report.media,'poster');
  assert.ok(['blocked','stalled','error'].includes(result.report.playback),label+': only an explicit media fallback is allowed.');
 }
 if(blocked){assert.ok(result.playBlocked>0);assert.equal(result.report.media,'poster');assert.equal(result.report.playback,'blocked');}
 reports.push({label,...result.report});
 return result.report;
}

try{
 stage='initial homepage load';
 const normal=await contextFor(),page=await normal.newPage();page.setDefaultTimeout(20000);
 await page.goto(home,{waitUntil:'domcontentloaded'});
 await waitForRun(page,'initial homepage');
 for(let reload=1;reload<=2;reload++){
  stage='same-tab homepage reload '+reload;
  // Explicitly preserve the legacy marker that used to suppress later loads.
  await page.evaluate(key=>sessionStorage.setItem(key,'1'),marker);
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),marker),'1');
  await page.reload({waitUntil:'domcontentloaded'});
  await waitForRun(page,'homepage reload '+reload+' with existing session marker');
 }
 checks.push('Initial homepage plus two same-tab reloads each start and finish the intro despite the stored session marker');

 stage='hash navigation does not replay';
 const beforeNavigation=await page.evaluate(()=>({starts:__lhfIntroReload.starts,dismissals:__lhfIntroReload.dismissals.length,report:JSON.stringify(LHF.logoIntro.report)}));
 for(const path of ['/custom','/']){
  await page.evaluate(path=>{location.hash=path;},path);
  await page.waitForFunction(path=>document.querySelector('#main')?.dataset.route===path,path,{timeout:20000});
  await page.waitForTimeout(1200);
  await releaseChecks(page);
  assert.deepEqual(await page.evaluate(()=>({starts:__lhfIntroReload.starts,dismissals:__lhfIntroReload.dismissals.length,report:JSON.stringify(LHF.logoIntro.report)})),beforeNavigation,'Hash navigation must not replay the intro.');
 }
 checks.push('Navigating to /custom and back home does not replay the intro');

 stage='actual video playback';
 if(!reports.some(report=>report.media==='video'&&report.playback==='ended')){
  if(local){
   // WebKit may reject automatic play in a fresh browser. A genuine click
   // exercises real media completion; it cannot satisfy the three reload tests.
   await page.evaluate(()=>{const button=document.createElement('button');button.id='intro-regression-play';button.textContent='Play loading animation test';button.onclick=()=>{button.remove();LHF.logoIntro.replay();};document.body.append(button);});
   await page.getByRole('button',{name:'Play loading animation test',exact:true}).click();
   const playback=await waitForRun(page,'user-gesture playback',{expectedStarts:2,expectedDismissals:2});
   assert.equal(playback.media,'video','The local user-gesture check must play the actual supplied film.');
   assert.ok(playback.timeline>=3300);
   checks.push('Actual supplied video completes after a real click when WebKit blocks initial autoplay');
  }else checks.push('Automatic live starts use a legitimate media fallback; actual-video verification requires a separate localhost run because replay tooling is local-only');
 }else checks.push('Actual supplied video completed during automatic homepage playback');

 stage='reduced-motion initial load and reload';
 const reduced=await contextFor({reducedMotion:'reduce'}),reducedPage=await reduced.newPage();
 for(let load=0;load<2;load++){
  if(load){await reducedPage.evaluate(key=>sessionStorage.setItem(key,'1'),marker);await reducedPage.reload({waitUntil:'domcontentloaded'});}
  else await reducedPage.goto(home,{waitUntil:'domcontentloaded'});
  await reducedPage.waitForFunction(()=>window.LHF?.logoIntro?.report?.reason==='reduced-motion',null,{timeout:20000});
  await releaseChecks(reducedPage);
  assert.equal(await reducedPage.evaluate(()=>__lhfIntroReload.starts),0,'Reduced motion must not create an animated overlay.');
  assert.equal(await reducedPage.evaluate(()=>__lhfIntroReload.dismissals.length),0);
 }
 checks.push('Reduced-motion preference remains respected on initial load and reload');

 stage='blocked-autoplay fallback initial load and reload';
 const blocked=await contextFor({blockAutoplay:true}),blockedPage=await blocked.newPage();
 for(let load=0;load<2;load++){
  if(load){await blockedPage.evaluate(key=>sessionStorage.setItem(key,'1'),marker);await blockedPage.reload({waitUntil:'domcontentloaded'});}
  else await blockedPage.goto(home,{waitUntil:'domcontentloaded'});
  await waitForRun(blockedPage,'blocked autoplay '+(load?'reload':'initial load'),{blocked:true});
 }
 checks.push('Blocked autoplay starts the intro and releases the usable page through the poster fallback on initial load and reload');
 assert.deepEqual(errors,[]);
 checks.push('No API requests reach the backend, no customer orders are submitted, and no JavaScript errors occur');
 console.log(JSON.stringify({ok:true,base,checks,reports},null,2));
}catch(error){
 console.error(JSON.stringify({ok:false,base,stage,error:error.message,checks,reports,javascriptErrors:errors},null,2));process.exitCode=1;
}finally{await Promise.allSettled(contexts.map(context=>context.close()));await browser.close();}
