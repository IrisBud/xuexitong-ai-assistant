import {chromium} from './browser-runtime.mjs';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=resolve(import.meta.dirname,'..');
const baseline=process.env.XXT_TASKPOINT_BUNDLE;
const bundle=await readFile(baseline || resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const out=resolve(root,'output/playwright/issue-7-taskpoint');
await mkdir(out,{recursive:true});
const rows=[];
const wav=Buffer.alloc(44+8000*2*30);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const media='data:audio/wav;base64,'+wav.toString('base64');
// The icon and empty i are transcribed from the user's screenshot. The surrounding
// loader, timing, media and platform receipts below are synthetic.
const icon=(label='任务点未完成')=>`<div class="ans-job-icon ans-job-video ans-job-icon-clear" tabindex="0" aria-label="${label}" role="option"><i></i></div>`;
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
async function run(name, action){
 try {const details=await action();rows.push({name,passed:true,...details});}
 catch(error){rows.push({name,passed:false,error:error.message});}
 console.log(JSON.stringify(rows.at(-1)));
}
async function context(){
 const ctx=await browser.newContext({viewport:{width:1400,height:1000}});
 await ctx.addInitScript(()=>{
  window.unsafeWindow=window;
  window.GM_getValue=(k,d)=>{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)};
  window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  GM_setValue('xxt-ai-enabled',false);GM_setValue('xxt-quiet-enabled',false);
  window.GM_xmlhttpRequest=()=>{throw Error('No real API calls allowed')};
 });
 return ctx;
}
try {
 const ctx=await context();
 await ctx.route('**/*',route=>route.fulfill({contentType:'text/html;charset=utf-8',body:'<!doctype html><body><div id="fixture"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>'}));
 const page=await ctx.newPage();await page.goto('https://mooc1.chaoxing.com/taskpoint-fixture');
 const checks=[
  {name:'screenshot-empty-i-is-pending-video',html:icon(),done:false,kind:'video'},
  {name:'explicit-pending-beats-stale-video-class',html:icon(),cls:'ans-job-finished',done:false,kind:'video'},
  {name:'own-pending-icon-beats-sibling-done-icon',html:icon('任务点已完成')+icon(),done:false,kind:'video'},
  {name:'aria-completed-without-finished-class',html:icon('任务点已完成'),done:true,kind:'video'},
  {name:'text-completed-with-empty-i',html:'<div class="ans-job-icon ans-job-video"><i></i>任务点已完成</div>',done:true,kind:'video'},
  {name:'nested-completion-is-not-parent-completion',html:icon()+'<div class="ans-attach-ct ans-job-finished">'+icon('任务点已完成')+'</div>',done:false,kind:'video'},
 ];
 for(const c of checks)await run(c.name,async()=>{
  const state=await page.evaluate(c=>{
   document.querySelector('#fixture').innerHTML=`<div class="ans-attach-ct videoContainer ${c.cls||''}">${c.html}</div>`;
   const el=document.querySelector('#fixture > div');
   return {done:XxtPageTasks.complete(el),kind:XxtPageTasks.scan(window).markers.find(m=>m.element===el)?.kind};
  },c);
  assert.deepEqual(state,{done:c.done,kind:c.kind});return {state};
 });
 await ctx.close();

 for(const c of [
  {name:'normal-ended-waits-for-platform'},
  {name:'stale-finished-class-must-play',stale:true},
  {name:'cross-origin-ended-waits-for-platform',cross:true},
  {name:'generic-player-loader-keeps-video-owner',generic:true},
  {name:'manual-stop-during-platform-wait',stop:true},
  {name:'preview-during-platform-wait',preview:true},
  {name:'night-rest-during-platform-wait',quiet:true},
  {name:'ninety-percent-needs-platform-confirmation',early:true},
 ])await run(c.name,async()=>{
  const ctx=await context(),events=[];
  await ctx.exposeBinding('__event',(_,name)=>events.push(name));
  if(c.early)await ctx.addInitScript(()=>GM_setValue('xxt-video-advance',90));
  if(c.preview)await ctx.addInitScript(()=>{GM_setValue('xxt-ai-enabled',true);GM_setValue('xxt-ai-config',{provider:'codex',protocol:'codex',baseUrl:'http://127.0.0.1:18763',key:'b'.repeat(64)})});
  await ctx.route('**/*',route=>{
   const u=new URL(route.request().url());let h='';
   if(u.pathname==='/mycourse/studentstudy')h=`<div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">Synthetic video</span></div><div class="posCatalog_select"><span class="posCatalog_name">Next</span></div></div><ul><li id="dct1" cardid="media">1 视频</li><li id="dct2" cardid="quiz">2 章节测验</li></ul><iframe id="iframe" src="/mooc-ans/knowledge/cards?num=0" style="width:1000px;height:650px"></iframe><button id="next">下一节</button><script>document.querySelector('#dct2').onclick=()=>{__event('quiz');document.querySelector('#iframe').src='/mooc-ans/knowledge/cards?num=1'};document.querySelector('#next').onclick=()=>{__event('next');document.querySelector('#iframe').remove();document.querySelectorAll('.posCatalog_select')[1].classList.add('posCatalog_active')};</script>`;
   else if(u.pathname==='/mooc-ans/knowledge/cards')h=u.searchParams.get('num')==='1'?'<p>满分:100</p><p>最终成绩100分</p>':`<div class="ans-attach-ct videoContainer ${c.stale?'ans-job-finished':''}">${icon()}<iframe src="${c.cross?'https://mooc1-1.chaoxing.com':''}${c.generic?'/player-loader':'/ananas/modules/video/index.html'}" style="width:900px;height:450px"></iframe></div>`;
   else if(u.pathname==='/player-loader'||u.pathname==='/ananas/modules/video/index.html')h=`<video id="video_html5_api" controls muted src="${media}" style="width:800px;height:350px"></video><script>const v=document.querySelector('video');v.onplay=()=>__event('play');v.onended=()=>__event('ended');</script>`;
   else return route.fulfill({body:''});
   return route.fulfill({contentType:'text/html;charset=utf-8',body:'<!doctype html><meta charset="utf-8">'+h+'<script>'+bundle.replaceAll('</script','<\\/script')+'</script>'});
  });
  const page=await ctx.newPage();
  try {
   await page.goto('https://mooc1.chaoxing.com/mycourse/studentstudy?courseId=synthetic-issue7-taskpoint');
   await page.locator('[data-action="start"]').click();
   const player=page.frames().find(f=>/\/modules\/video\/|\/player-loader/.test(f.url()));
   await player.waitForFunction(()=>document.querySelector('video')?.readyState>0,null,{timeout:5000});
   await page.waitForTimeout(2500);
   assert(events.includes('play'),'An explicitly pending video must play even when its wrapper has a stale finished class');
   assert(!events.includes('quiz'),'Must not leave a video whose own icon is pending');
   if(c.generic)assert.equal(await page.evaluate(()=>XxtPageTasks.scan(window).markers.find(m=>m.element.classList.contains('videoContainer'))?.kind),'video');
   await player.evaluate(early=>{const v=document.querySelector('video');v.currentTime=early?v.duration*.92:v.duration-.05},!!c.early);
   if(!c.early)await player.waitForFunction(()=>document.querySelector('video').ended,null,{timeout:3000});
   await page.waitForTimeout(1200);
   assert(!events.includes('quiz')&&!events.includes('next'),'Playback progress/end cannot replace task-point confirmation');
   if(c.stop)await page.locator('[data-action="stop"]').click();
   if(c.preview)await page.locator('[data-action="solve"]').click();
   if(c.quiet)for(const frame of page.frames())await frame.evaluate(()=>{GM_setValue('xxt-quiet-enabled',true);XxtCodexCore.quietHoursAt=()=>true});
   await page.frameLocator('#iframe').locator('.ans-attach-ct').evaluate(el=>{el.classList.add('ans-job-finished');el.querySelector('.ans-job-icon').setAttribute('aria-label','任务点已完成')});
   events.push('platform-confirmed');
   if(c.stop||c.preview||c.quiet){await page.waitForTimeout(1800);assert(!events.includes('quiz')&&!events.includes('next'),'Stop/preview/night must not resume after confirmation');}
   else {await page.waitForFunction(()=>!document.querySelector('#iframe'),null,{timeout:14000});assert(events.indexOf('quiz')>events.indexOf('platform-confirmed'));assert.equal(events.filter(e=>e==='next').length,1);}
   return {events};
  }catch(error){await page.screenshot({path:resolve(out,`${baseline?'baseline':'candidate'}-${c.name}.png`)});throw error;}
  finally {await ctx.close();}
 });
} finally {
 await browser.close();
 await writeFile(resolve(out,`${baseline?'baseline':'candidate'}.json`),JSON.stringify({runtimeSHA256:createHash('sha256').update(bundle).digest('hex'),scope:'Screenshot-transcribed icon; synthetic pages/media/platform receipts, no real course or model calls',rows},null,2)+'\n');
}
if(baseline)assert(rows.some(r=>!r.passed),'Baseline must reproduce at least one failure');
else assert(rows.every(r=>r.passed),'Task-point regression failed');
