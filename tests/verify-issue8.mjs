import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/issue8');
await mkdir(out,{recursive:true});
const baseline=process.argv.includes('--baseline');
async function showQueue(page){const tab=page.getByRole('tab',{name:'队列',exact:true});if(await tab.count())await tab.click();else await page.getByText('课程队列',{exact:true}).click();}
const bundle=await readFile(process.env.XXT_ISSUE8_BUNDLE||resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const browser=await chromium.launch({headless:true}),results=[];
const entry=id=>({href:`https://mooc1.chaoxing.com/visit/stucoursemiddle?courseid=${id}&clazzid=c${id}&cpi=p${id}`,key:`${id}/c${id}`,cpi:`p${id}`,title:`合成课程${id}`});
const cards=`<div id="courselistArea"><div id="courseList"><div id="stuNormalCourseListDiv">${['1','2'].map(id=>`<div class="course clearfix learnCourse"><div class="course-info"><h3><a class="color1" href="${entry(id).href}"><span class="course-name" title="合成课程${id}">合成课程${id}</span></a></h3></div></div>`).join('')}</div><div class="course"><a class="not-open-tip">课程已结束</a><div class="course-info"><a href="${entry('3').href}">已结束课程</a></div></div></div></div>`;
async function setup({url='https://i.chaoxing.com/base',html='<iframe id="frame_content" src="https://mooc2-ans.chaoxing.com/visit/interaction"></iframe>',queue=null,uid='12345',saveFails=false,saveDelay=0}={}){
 const context=await browser.newContext({viewport:{width:1100,height:950}}),page=await context.newPage(),errors=[];
 if(uid)await context.addCookies([{name:'_uid',value:uid,domain:'.chaoxing.com',path:'/'}]);
 let stored={unrelated:'preserved',...(queue?{xxtCourseQueue:queue}:{})},saves=0;
 await context.exposeBinding('__readTab',()=>structuredClone(stored));
 await context.exposeBinding('__saveTab',async(_,v)=>{if(saveDelay)await new Promise(r=>setTimeout(r,saveDelay));if(saveFails)throw Error('fixture storage failed');stored=structuredClone(v);saves++;});
 await context.addInitScript(()=>{
  window.unsafeWindow=window;window.__calls=0;window.__clicks=[];window.__gm={'xxt-ai-enabled':false,'xxt-quiet-enabled':false};
  GM_getValue=(k,d)=>__gm[k]??d;GM_setValue=(k,v)=>__gm[k]=structuredClone(v);
  GM_getTab=cb=>__readTab().then(cb);GM_saveTab=(v,cb)=>__saveTab(v).then(()=>cb?.()).catch(()=>{});
  GM_xmlhttpRequest=()=>{__calls++;throw Error('Models and network forbidden');};
 });
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:new URL(r.request().url()).pathname==='/visit/interaction'?cards:html}));
 await page.goto(url);await page.addScriptTag({content:bundle});
 return{context,page,errors,get stored(){return stored;},get saves(){return saves;}};
}
function queue(extra={}){let h=2166136261;for(const c of '12345')h=Math.imul(h^c.charCodeAt(0),16777619);return{v:1,account:(h>>>0).toString(16),at:Date.now(),items:[entry('1'),entry('2')],index:0,state:'paused',reason:'',results:[],...extra};}
async function check(name,run){if(process.env.XXT_ISSUE8_CASE&&!name.includes(process.env.XXT_ISSUE8_CASE))return;const since=Date.now();try{await run();results.push({name,passed:true,ms:Date.now()-since});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.message,ms:Date.now()-since});console.log('FAIL',name,e.message);}}
try{
 await check('empty-personal-list-has-actionable-state-and-disabled-start',async()=>{
  const s=await setup();try{await s.page.waitForSelector('#xxt-course-hub');assert(await s.page.getByRole('button',{name:'开始所选课程',exact:true}).isDisabled());assert.match(await s.page.locator('[data-hub-courses]').textContent(),/课程列表/);assert(await s.page.getByRole('button',{name:'打开课程列表',exact:true}).isVisible());assert.equal(s.saves,0);await s.page.screenshot({path:resolve(out,baseline?'baseline-empty.png':'empty-personal.png')});}finally{await s.context.close();}
 });
 await check('no-queue-cannot-resume-or-report-account-mismatch',async()=>{
  const s=await setup();try{await showQueue(s.page);const resume=s.page.getByRole('button',{name:'继续队列',exact:true});assert(await resume.isDisabled());assert.doesNotMatch(await s.page.locator('#xxt-course-hub').textContent(),/账号不匹配|队列已过期/);assert.equal(s.saves,0);}finally{await s.context.close();}
 });
 await check('direct-native-course-list-can-select-without-opening-course',async()=>{
  const s=await setup({url:'https://mooc2-ans.chaoxing.com/visit/interaction'});try{await s.page.waitForSelector('#xxt-course-hub',{timeout:3000});assert.equal(await s.page.locator('[data-hub-courses] input[type=checkbox]').count(),2);await s.page.locator('[data-hub-courses] input').first().check();assert(await s.page.getByRole('button',{name:'开始所选课程',exact:true}).isEnabled());assert.equal(s.saves,0);assert.equal(new URL(s.page.url()).pathname,'/visit/interaction');await s.page.screenshot({path:resolve(out,'direct-course-selection.png')});await writeFile(resolve(out,'selection-preview.html'),(await s.page.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));await s.page.setViewportSize({width:390,height:844});assert(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const bounds=await s.page.locator('#xxt-course-hub').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390,'Queue panel must stay fully inside the viewport');await s.page.screenshot({path:resolve(out,'direct-course-selection-390.png')});}finally{await s.context.close();}
 });
 if(!baseline){
  for(const [name,value,message] of [['expired',queue({at:Date.now()-13*3600000}),/超过.*12.*小时|已过期/],['account-mismatch',queue({account:'other'}),/当前账号.*不同|账号.*不一致/],['invalid-entry',queue({items:[{...entry('1'),href:'https://evil.invalid/'}]}),/课程入口.*失效|课程入口.*变化/]])await check(`queue-${name}-has-specific-explanation`,async()=>{const s=await setup({queue:value});try{await showQueue(s.page);await s.page.getByRole('button',{name:'继续队列',exact:true}).click();await s.page.waitForFunction(()=>/过期|小时|不同|不一致|失效|变化/.test(document.querySelector('#xxt-course-hub [role=status]').textContent));assert.match(await s.page.locator('#xxt-course-hub [role=status]').textContent(),message);assert.equal(s.saves,0);}finally{await s.context.close();}});
  await check('missing-account-is-distinct-from-changed-account',async()=>{const s=await setup({queue:queue(),uid:''});try{await showQueue(s.page);await s.page.getByRole('button',{name:'继续队列',exact:true}).click();await s.page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('账号'));assert.match(await s.page.locator('[role=status]').textContent(),/无法.*账号|未读到.*账号/);assert.equal(s.saves,0);}finally{await s.context.close();}});
  await check('native-list-link-is-explicit-and-stays-in-same-tab',async()=>{const s=await setup();try{await s.page.getByRole('button',{name:'打开课程列表',exact:true}).click();await s.page.waitForURL('**/visit/interaction');assert.equal(s.saves,0);await s.page.addScriptTag({content:bundle});await s.page.waitForSelector('[data-hub-courses] input');assert.equal(await s.page.locator('[data-hub-courses] input').count(),2);}finally{await s.context.close();}});
  await check('untrusted-course-list-link-is-not-offered',async()=>{const s=await setup({html:'<iframe id="frame_content" src="https://evil.invalid/visit/interaction"></iframe>'});try{assert.equal(await s.page.getByRole('button',{name:'打开课程列表',exact:true}).count(),0);assert(await s.page.getByRole('button',{name:'开始所选课程',exact:true}).isDisabled());}finally{await s.context.close();}});
  await check('english-course-menu-with-icon-is-found-and-cannot-be-hidden',async()=>{const s=await setup({html:'<div id="first1" class="label-item" role="menuitem" dataurl="https://mooc2-ans.chaoxing.com/visit/interaction"><i>\uE001</i><h3>Courses</h3></div><iframe id="frame_content" src="about:blank"></iframe>'});try{await s.page.evaluate(()=>{__gm['xxt-hub-hidden-menus']=['personal:Courses'];__gm['xxt-hub-default-course']=true;document.querySelector('#first1').onclick=()=>__clicks.push('courses');});await s.page.waitForFunction(()=>__clicks.includes('courses'));assert.equal(await s.page.locator('#first1').getAttribute('data-xxt-hub-hidden'),null);assert(await s.page.getByRole('button',{name:'打开课程列表',exact:true}).isVisible());assert.equal(s.saves,0);}finally{await s.context.close();}});
  await check('cancelled-saved-queue-does-not-autostart',async()=>{const s=await setup({queue:queue({state:'stopped'})});try{await s.page.waitForTimeout(1400);assert.equal(s.stored.xxtCourseQueue.state,'stopped');assert.equal(s.saves,0);assert.equal(await s.page.evaluate(()=>__calls),0);}finally{await s.context.close();}});
  await check('completed-queue-resume-is-disabled',async()=>{const s=await setup({queue:queue({state:'complete',index:2})});try{await s.page.waitForFunction(()=>document.querySelector('[data-hub-queue]').textContent.includes('队列已结束'));await showQueue(s.page);assert(await s.page.getByRole('button',{name:'继续队列',exact:true}).isDisabled());assert.equal(s.saves,0);}finally{await s.context.close();}});
  await check('malformed-queue-is-explained-without-render-error',async()=>{const s=await setup({queue:{v:1,items:null,state:'paused'}});try{await s.page.waitForFunction(()=>document.querySelector('[data-hub-queue]').textContent.includes('记录不完整'));assert.deepEqual(s.errors,[]);assert.equal(s.saves,0);}finally{await s.context.close();}});
  await check('resume-waits-for-save-and-stop-cancels-pending-start',async()=>{const s=await setup({url:'https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=1&clazzid=c1&cpi=p1',html:'<section id="panel"></section>',queue:queue(),saveDelay:600});try{const hub=await readFile(resolve(root,'src/course-hub.js'),'utf8');await s.page.addScriptTag({content:hub});await s.page.evaluate(()=>{window.__starts=0;XxtCourseHub.attach(document.querySelector('#panel'),{catalog:()=>[],canStart:()=>true,start:()=>__starts++,stop:()=>XxtCourseHub.cancel()});});await showQueue(s.page);await s.page.getByRole('button',{name:'继续队列',exact:true}).click();assert.equal(await s.page.evaluate(()=>__starts),0);await s.page.getByRole('button',{name:'停止队列',exact:true}).click();await s.page.waitForTimeout(1000);assert.equal(await s.page.evaluate(()=>__starts),0);assert.equal(s.stored.xxtCourseQueue.state,'stopped');}finally{await s.context.close();}});
  await check('resume-during-preview-does-not-change-queue-to-running',async()=>{const s=await setup({url:'https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=1&clazzid=c1&cpi=p1',html:'<section id="panel"></section>',queue:queue()});try{const hub=await readFile(resolve(root,'src/course-hub.js'),'utf8');await s.page.addScriptTag({content:hub});await s.page.evaluate(()=>{window.__starts=0;XxtCourseHub.attach(document.querySelector('#panel'),{catalog:()=>[],canStart:()=>false,start:()=>__starts++,stop:()=>{}});});await showQueue(s.page);await s.page.getByRole('button',{name:'继续队列',exact:true}).click();await s.page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('预览'));assert.equal(await s.page.evaluate(()=>__starts),0);assert.equal(s.stored.xxtCourseQueue.state,'paused');assert.equal(s.saves,0);}finally{await s.context.close();}});
 }
 for(const completed of [true,false])await check(`natural-media-${completed?'already-completed':'ended-platform-confirmed'}-uses-directory-without-queue`,async()=>{
  const context=await browser.newContext({viewport:{width:1200,height:1000}}),page=await context.newPage(),events=[];
  await context.exposeBinding('__event',(_,e)=>events.push(e));
  const wav=Buffer.alloc(44+8000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  await context.addInitScript(()=>{window.unsafeWindow=window;window.__gm={'xxt-ai-enabled':false,'xxt-quiet-enabled':false};GM_getValue=(k,d)=>__gm[k]??d;GM_setValue=(k,v)=>__gm[k]=structuredClone(v);GM_xmlhttpRequest=()=>{__event('unexpected-model');throw Error('No model allowed');};});
  await context.route('**/*',r=>{const path=new URL(r.request().url()).pathname;let html='';
   if(path==='/mycourse/studentstudy')html='<div class="prev_title">视频</div><div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name" title="第一节">第一节</span></div><div class="posCatalog_select"><span class="posCatalog_name" title="第二节">第二节</span><span class="orangeNew">1</span></div></div><iframe id="iframe" src="/mooc-ans/knowledge/cards" style="width:950px;height:500px"></iframe><div id="prevNextFocusNext" role="button">下一节</div><script>document.querySelector("#prevNextFocusNext").onclick=()=>__event("next-stalled");document.querySelectorAll(".posCatalog_name")[1].onclick=()=>{__event("directory");document.querySelector(".posCatalog_active").classList.remove("posCatalog_active");document.querySelectorAll(".posCatalog_select")[1].classList.add("posCatalog_active");document.querySelector("#iframe").remove();};</script>';
   else if(path==='/mooc-ans/knowledge/cards')html=`<div class="ans-attach-ct videoContainer ${completed?'ans-job-finished':''}"><div class="ans-job-icon" aria-label="${completed?'任务点已完成':'任务点未完成'}"></div><iframe class="ans-insertvideo-online" src="/ananas/modules/video/index.html" style="width:900px;height:400px"></iframe></div>`;
   else if(path==='/ananas/modules/video/index.html')html=`<video id="video_html5_api" controls muted src="data:audio/wav;base64,${wav.toString('base64')}" style="width:800px;height:320px"></video><script>document.querySelector('video').onended=()=>{__event('ended');setTimeout(()=>{const c=parent.document.querySelector('.ans-attach-ct');c.classList.add('ans-job-finished');c.querySelector('.ans-job-icon').setAttribute('aria-label','任务点已完成');__event('platform-confirmed');},250);};</script>`;
   return r.fulfill({contentType:'text/html;charset=utf-8',body:html+`<script>${bundle.replaceAll('</script','<\\/script')}</script>`});
  });
  try{await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=1&clazzid=c1&cpi=p1');await page.locator('[data-action=start]').click();await page.waitForFunction(()=>document.querySelector('.posCatalog_active .posCatalog_name')?.title==='第二节',null,{timeout:28000});await page.locator('[data-action=stop]').click();assert.equal(events.filter(x=>x==='directory').length,1);assert.equal(events.filter(x=>x==='next-stalled').length,1);assert(!events.includes('unexpected-model'));if(!completed){assert(events.indexOf('platform-confirmed')>=0);assert(events.indexOf('platform-confirmed')<events.indexOf('directory'));}assert.equal(await page.evaluate(()=>Object.entries(__gm).some(([k,v])=>k.startsWith('xxt-skipped:')&&v.length)),false);assert.equal(await page.locator('.orangeNew').count(),1);}finally{await context.close();}
 });
 const navModes=baseline?['no-native-next','stalled-native-next']:['no-native-next','stalled-native-next','normal-native-next','delegated-title','group-between','stop','preview','quiet','verification','disabled-next','disabled-title','ambiguous-active','no-successor','stalled-title'];
 for(const mode of navModes)await check(`chapter-navigation-${mode}`,async()=>{
  const disabled=mode==='disabled-title'?'aria-disabled="true"':'';
  const middle=mode==='group-between'?'<div class="posCatalog_select"><h3>章节分组</h3></div>':'';
  const html=`<div class="prev_title">合成导航</div><div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name" title="第一节">第一节</span><span class="icon_Completed"></span></div>${middle}<div class="posCatalog_select ${mode==='ambiguous-active'?'posCatalog_active':''}"><span class="posCatalog_name" title="第二节" ${disabled}>第二节</span><span class="orangeNew">1</span></div></div>${mode==='no-native-next'?'':'<div id="prevNextFocusNext" role="button" '+(mode==='disabled-next'?'aria-disabled="true"':'')+'>下一节</div>'}`;
  const s=await setup({url:'https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=1&clazzid=c1&cpi=p1',html});
  try{
   await s.page.evaluate(mode=>{
    window.__realNow=Date.now.bind(Date);const base=__realNow();Date.now=()=>base+(__realNow()-base)*8;
    const open=()=>{if(mode==='stalled-title')return;document.querySelector('.posCatalog_active')?.classList.remove('posCatalog_active');document.querySelectorAll('.posCatalog_name')[1].parentElement.classList.add('posCatalog_active');document.querySelector('.prev_title').textContent='第二节内容';};
    const next=document.querySelector('#prevNextFocusNext');if(next)next.onclick=()=>{__clicks.push('next');if(mode==='normal-native-next')open();};
    const title=document.querySelectorAll('.posCatalog_name')[1];
    if(mode==='delegated-title')document.querySelector('#coursetree').addEventListener('click',e=>{if(e.target.closest('.posCatalog_name')===title){__clicks.push('title');open();}});
    else title.onclick=()=>{__clicks.push('title');open();};
    if(mode==='no-successor')title.parentElement.remove();
   },mode);
   await s.page.locator('[data-workspace-tab=course]').click();await s.page.locator('[data-hub-catalog]').locator('..').locator('summary').click();
   await s.page.getByRole('button',{name:'跳过当前章节',exact:true}).click();
   if(['stop','preview','quiet','verification'].includes(mode)){
    await s.page.waitForFunction(()=>__clicks.includes('next'));
    if(mode==='stop')await s.page.locator('[data-action=stop]').click();
    if(mode==='preview'){await s.page.evaluate(()=>{__gm['xxt-ai-enabled']=true;document.querySelector('[data-action=solve]').disabled=false;});await s.page.locator('[data-action=solve]').click();assert.match(await s.page.locator('[data-xxt-codex-panel]').textContent(),/正在预览|查找当前可见/);}
    if(mode==='quiet')await s.page.evaluate(()=>{__gm['xxt-quiet-enabled']=true;XxtCodexCore.quietHoursAt=()=>true;});
    if(mode==='verification'){await s.page.evaluate(()=>{const f=document.createElement('form');f.innerHTML='<div class="yzmTips"><input id="ucode" class="yzmInp" type="text"><img id="ccc" width="80" height="30"><input class="submit" type="submit" value="提交"></div>';document.body.append(f);});assert.equal(await s.page.evaluate(()=>XxtManualVerification.requiresManual()),true);}
    await s.page.waitForTimeout(2400);assert(!await s.page.evaluate(()=>__clicks.includes('title')));
   }else if(['disabled-next','disabled-title','ambiguous-active','no-successor','stalled-title'].includes(mode)){
    await s.page.waitForTimeout(4200);const clicks=await s.page.evaluate(()=>__clicks);assert.equal(clicks.filter(x=>x==='title').length,mode==='stalled-title'?1:0);assert.equal(await s.page.locator('.orangeNew').count(),mode==='no-successor'?0:1);
   }else{
    await s.page.waitForFunction(()=>document.querySelector('.posCatalog_active .posCatalog_name')?.title==='第二节',null,{timeout:7000});const clicks=await s.page.evaluate(()=>__clicks);assert.equal(clicks.filter(x=>x==='title').length,mode==='normal-native-next'?0:1);if(mode==='stalled-native-next')assert.equal(clicks.filter(x=>x==='next').length,1);
   }
   await s.page.locator('[data-action=stop]').click();assert.equal(await s.page.evaluate(()=>__calls),0);assert.deepEqual(s.errors,[]);
  }finally{await s.context.close();}
 });
}finally{
 await browser.close();await writeFile(resolve(out,`${baseline?'baseline':'verification'}${process.env.XXT_ISSUE8_CASE?'-'+process.env.XXT_ISSUE8_CASE:''}.json`),JSON.stringify({baseline,runtimeSHA256:createHash('sha256').update(bundle).digest('hex'),scope:'Isolated browser fixtures based on read-only native DOM contracts; simulated GM; no live-course writes, model calls, task credit or grades.',results},null,2));
}
assert(results.length>0,'No checks matched the requested case filter');
if(baseline){assert(results.some(r=>!r.passed),'The old runtime unexpectedly passed every reproduction');console.log('Baseline failures recorded:',results.filter(r=>!r.passed).length);}else if(results.some(r=>!r.passed))process.exitCode=1;

