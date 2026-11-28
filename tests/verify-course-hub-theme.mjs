import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from './browser-runtime.mjs';

const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/course-hub-theme');
await mkdir(out,{recursive:true});
const bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const browser=await chromium.launch({headless:true}),checks=[],errors=[],external=[],pages=[];
const values={'xxt-ai-enabled':false,'xxt-quiet-enabled':false,'xxt-ui-preference':'ridge'};
const titles=['Photoshop图像处理','计算机辅助设计Sketch Up','临床技能学-学银在线','传感器技术','机械制图（2026年秋）','人力资源管理','国际商法（英文）International Business Law','VeryLongUnbrokenCourseName'.repeat(6)];
let writes=0,requests=0;
const cards='<div id="courselistArea">'+titles.map((title,i)=>`<div class="course"><div class="course-info"><a class="color1" title="${title}" href="https://mooc2-ans.chaoxing.com/visit/stucoursemiddle?courseid=${i+1}&clazzid=c${i+1}&cpi=p${i+1}">${title}</a></div></div>`).join('')+'</div>';
const doc=body=>`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>body{margin:0;background:#edf0f1;color:#18252c;font:15px/1.7 sans-serif}main{padding:40px;max-width:620px}h1{font-size:24px}.fixture-note{color:#52656d}.course{padding:10px;background:white;border-bottom:1px solid #eee}iframe{width:50%;height:400px;border:0}</style><main><h1>课程队列 · 隔离预览</h1><p class="fixture-note">模拟课程与脚本存储，仅验证界面和交互。</p>${body}</main></html>`;
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
await ctx.addCookies([{name:'_uid',value:'12345',domain:'.chaoxing.com',path:'/'}]);
await ctx.exposeBinding('__shareValue',async({page},key,value)=>{
  values[key]=structuredClone(value);
  await Promise.all(pages.filter(p=>p!==page&&!p.isClosed()).map(p=>p.evaluate(({key,value})=>{__gm[key]=value;},{key,value}).catch(()=>{})));
});
await ctx.exposeBinding('__writeTab',()=>writes++);
await ctx.exposeBinding('__modelRequest',()=>requests++);
await ctx.addInitScript(seed=>{
  window.__gm=structuredClone(seed);window.__tab={unrelated:'preserved'};
  window.GM_getValue=(k,d)=>__gm[k]??d;
  window.GM_setValue=(k,v)=>{__gm[k]=structuredClone(v);void __shareValue(k,v);};
  window.GM_getTab=cb=>cb(structuredClone(__tab));
  window.GM_saveTab=(v,cb)=>{__tab=structuredClone(v);void __writeTab();cb?.();};
  window.GM_xmlhttpRequest=()=>{void __modelRequest();throw Error('Unexpected model request');};
  window.GM_openInTab=()=>{throw Error('Unexpected tab opening');};
  window.unsafeWindow=window;
},values);
await ctx.route('**/*',r=>{
  const u=new URL(r.request().url());
  if(r.request().resourceType()!=='document'){external.push(u.href);return r.abort();}
  const content=u.hostname==='i.chaoxing.com'?'<div class="label-item" role="menuitem" id="first1">课程</div><div class="label-item" role="menuitem" id="first2">笔记</div><iframe id="frame_content" src="https://mooc2-ans.chaoxing.com/visit/interaction"></iframe>':u.pathname==='/visit/interaction'?cards:'<div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">合成章节</span></div></div>';
  return r.fulfill({contentType:'text/html;charset=utf-8',body:doc(content)});
});
function observe(page){pages.push(page);page.on('pageerror',e=>errors.push(e.message));}
async function shot(page,name){await page.screenshot({path:resolve(out,name+'.png')});}
async function selectionState(page){return page.locator('[data-hub-courses]>li').evaluateAll(rows=>rows.map(row=>({key:row.dataset.hubCourse,checked:row.querySelector('input').checked,order:row.querySelector('small')?.textContent||''})));}
async function bounds(page,label){
  const b=await page.evaluate(()=>{
    const host=document.querySelector('#xxt-course-hub'),r=host.getBoundingClientRect(),pane=host.querySelector('.xxt-hub-pane:not([hidden])');
    return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:pane.scrollWidth-pane.clientWidth,skin:host.dataset.skin};
  });
  assert(b.left>=0&&b.right<=b.width+1&&b.top>=0&&b.bottom<=b.height+1,`${label}: outside viewport ${JSON.stringify(b)}`);
  assert(b.overflow<=1,`${label}: pane overflow ${JSON.stringify(b)}`);
  checks.push({label,...b});
}
try{
  const main=await ctx.newPage();observe(main);
  await main.goto('https://mooc2-ans.chaoxing.com/mycourse/studentstudy?courseId=1&clazzid=c1&cpi=p1');await main.addScriptTag({content:bundle});
  const personal=await ctx.newPage();observe(personal);
  await personal.goto('https://i.chaoxing.com/base');await personal.addScriptTag({content:bundle});
  const frame=personal.frames().find(f=>f.url().includes('/visit/interaction'));assert(frame);await frame.addScriptTag({content:bundle});
  await personal.waitForFunction(()=>document.querySelectorAll('[data-hub-courses] input').length===8);
  assert.equal(await personal.locator('#xxt-course-hub[data-xxt-codex-panel]').count(),0);
  assert(await personal.locator('[data-hub-start]').isDisabled());
  await personal.locator('[data-hub-courses] input').nth(0).check();
  await personal.locator('[data-hub-courses] input').nth(1).check();
  await personal.locator('[data-hub-courses] li').nth(1).getByRole('button',{name:/上移/}).click();
  assert.equal(await personal.locator('[data-hub-courses] li').nth(1).locator('small').innerText(),'队列第 1 门');
  assert.equal(await personal.locator('[data-hub-count]').innerText(),'已选 2 / 8 门');
  assert.equal(await personal.evaluate(()=>document.activeElement.closest('[data-hub-course]')?.dataset.hubCourse),'2/c2');
  const selection=await selectionState(personal);
  await personal.evaluate(()=>window.__courseInputs=[...document.querySelectorAll('[data-hub-courses] input')]);
  checks.push({label:'checkbox-order-focus-and-start-state'});

  await main.locator('[data-workspace-tab=more]').click();
  for(const skin of ['ridge','tide','nailoong','naiwa','rainbow','default']){
    await main.bringToFront();
    if(skin!=='ridge')await main.locator(skin==='default'?'.xxt-theme-switch':'[data-skin-choice='+skin+']').click();
    await main.waitForFunction(s=>document.querySelector('[data-xxt-codex-panel]').dataset.skin===s,skin);
    await personal.bringToFront();
    await personal.waitForFunction(s=>document.querySelector('#xxt-course-hub').dataset.skin===s,skin);
    assert.deepEqual(await selectionState(personal),selection);
    assert(await personal.evaluate(()=>__courseInputs.every(node=>node.isConnected)));
    for(const width of [1440,768,390,320]){await personal.setViewportSize({width,height:900});await bounds(personal,skin+'-'+width);}
    await personal.setViewportSize({width:1280,height:900});await shot(personal,skin+'-desktop');
    await personal.locator('#xxt-course-hub').screenshot({path:resolve(out,skin+'-panel.png')});
    if(skin==='ridge'||skin==='tide'){await personal.setViewportSize({width:390,height:844});await shot(personal,skin+'-390');}
    const mainPalette=await main.locator('[data-xxt-codex-panel]').evaluate(n=>['--ink','--accent','--scene'].map(k=>getComputedStyle(n).getPropertyValue(k)));
    const hubPalette=await personal.locator('#xxt-course-hub').evaluate(n=>['--ink','--accent','--scene'].map(k=>getComputedStyle(n).getPropertyValue(k)));
    assert.deepEqual(hubPalette,mainPalette);
  }
  for(const [id,model]of [['deepseek','deepseek-chat'],['openai','gpt-6.1-sol'],['claude','claude-sonnet-5-5'],['gemini','gemini-3.1-pro-preview'],['zhipu','glm-5'],['kimi','kimi-k2.5'],['qwen','qwen3-max'],['doubao','doubao-seed-2-0-pro'],['xiaomi','mimo-v2-pro']]){
    await main.evaluate(({id,model})=>{
      const config={provider:id,protocol:'chat',baseUrl:'https://api.example.invalid/v1',model,key:'fixture-key-0001',vision:false};
      GM_setValue('xxt-ai-config',config);GM_setValue('xxt-ai-enabled',true);
      XxtPersonas.create(GM_getValue,GM_setValue).success(config);GM_setValue('xxt-ui-preference','auto');
      document.dispatchEvent(new Event('xxt-profiles-changed'));
    },{id,model});
    await main.waitForFunction(id=>document.querySelector('[data-xxt-codex-panel]').dataset.skin==='ai-'+id,id);
    await personal.waitForFunction(id=>document.querySelector('#xxt-course-hub').dataset.skin==='ai-'+id,id);
    assert.deepEqual(await selectionState(personal),selection);
    for(const width of [1280,390]){await personal.setViewportSize({width,height:900});await bounds(personal,'ai-'+id+'-'+width);}
    if(['deepseek','openai','claude'].includes(id)){await personal.setViewportSize({width:1280,height:900});await shot(personal,'ai-'+id+'-desktop');await personal.locator('#xxt-course-hub').screenshot({path:resolve(out,'ai-'+id+'-panel.png')});}
  }
  await personal.setViewportSize({width:390,height:844});
  await personal.getByRole('tab',{name:'队列',exact:true}).click();
  assert(await personal.getByRole('button',{name:'继续队列',exact:true}).isDisabled());await shot(personal,'queue-empty-390');
  await personal.getByRole('tab',{name:'队列',exact:true}).press('ArrowRight');
  assert.equal(await personal.locator('[role=tab][aria-selected=true]').innerText(),'设置');
  await personal.getByLabel('隐藏平台 AI 助教',{exact:true}).check();
  assert.equal(await personal.evaluate(()=>__gm['xxt-hub-hide-ai']),true);await shot(personal,'settings-390');
  await main.evaluate(()=>{GM_setValue('xxt-ui-preference','tide');document.dispatchEvent(new Event('xxt-profiles-changed'));});
  await personal.waitForFunction(()=>document.querySelector('#xxt-course-hub').dataset.skin==='tide');
  assert(await personal.getByLabel('隐藏平台 AI 助教',{exact:true}).isChecked());
  assert.equal(await personal.locator('[role=tab][aria-selected=true]').innerText(),'设置');
  await personal.getByRole('button',{name:'收起',exact:true}).click();
  await main.evaluate(()=>{GM_setValue('xxt-ui-preference','ridge');document.dispatchEvent(new Event('xxt-profiles-changed'));});
  await personal.waitForFunction(()=>document.querySelector('#xxt-course-hub').dataset.skin==='ridge');
  assert(await personal.locator('#xxt-hub-body').isHidden());
  await shot(personal,'collapsed-390');await personal.getByRole('button',{name:'展开',exact:true}).click();
  assert.equal(await personal.locator('[role=tab][aria-selected=true]').innerText(),'设置');
  await personal.getByRole('tab',{name:'选课',exact:true}).click();
  assert.deepEqual(await selectionState(personal),selection);
  checks.push({label:'theme-sync-preserves-active-tab-settings-selection-order-and-collapse'});

  // Empty and delayed list states share the same mounted controls.
  await frame.evaluate(()=>document.querySelector('#courselistArea').replaceChildren());
  await personal.waitForFunction(()=>document.querySelectorAll('[data-hub-courses] input').length===0);
  assert(await personal.locator('[data-hub-empty]:visible').isVisible());assert(await personal.locator('[data-hub-start]').isDisabled());
  await shot(personal,'empty-390');
  await frame.evaluate(cards=>{document.body.innerHTML=cards;},cards);
  await personal.waitForFunction(()=>document.querySelectorAll('[data-hub-courses] input').length===8);
  checks.push({label:'empty-and-late-course-list'});
  await personal.setViewportSize({width:390,height:480});await bounds(personal,'short-window');
  await personal.emulateMedia({reducedMotion:'reduce'});await bounds(personal,'reduced-motion');
  await personal.emulateMedia({forcedColors:'active'});await bounds(personal,'forced-colors');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(writes,0);assert.equal(requests,0);
  await writeFile(resolve(out,'verification.json'),JSON.stringify({at:new Date().toISOString(),runtimeSHA256:createHash('sha256').update(bundle).digest('hex'),checks,passed:checks.length,pageErrors:errors,externalRequests:external,queueWrites:writes,modelRequests:requests,scope:'Full userscript in isolated Edge pages; real cross-origin iframe and shared GM mocks. No real course, account, model call, navigation or grade.'},null,2));
  console.log(JSON.stringify({passed:checks.length,runtimeSHA256:createHash('sha256').update(bundle).digest('hex'),out}));
}finally{await ctx.close();await browser.close();}
