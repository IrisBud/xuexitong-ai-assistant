import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const bundle=await readFile(new URL('../dist/xuexitong-ai-assistant.user.js',import.meta.url),'utf8');
const release=JSON.parse(await readFile(new URL('../src/release.json',import.meta.url),'utf8'));
const newerRelease={...release,version:release.version.replace(/\d+$/,value=>String(Number(value)+1))};
const out=new URL('../artifacts/panel-layout/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[];
const fixture=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f3f5f7;color:#344256;font:15px/1.7 system-ui}main{margin:35px;width:650px;background:white;border-radius:14px;padding:28px}h1{font-size:24px}#coursetree{border-top:1px solid #ddd;padding-top:15px}.posCatalog_select{padding:13px;border-bottom:1px solid #eee}.posCatalog_active{background:#eaf2ef}.orangeNew{float:right;border-radius:8px;padding:0 8px;background:#fff1dd;color:#9d621f}.icon_Completed{color:#377f61}@media(max-width:700px){main{width:auto;margin:15px;padding:14px}}</style><main><small>交互预览 · 隔离模拟页面</small><h1>学习助手面板布局演示</h1><p>此页没有连接真实课程或模型，章节和进度仅用于检查界面。</p><div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">第一节 · 课程导入</span><span class="icon_Completed">已完成</span></div><div class="posCatalog_select"><span class="posCatalog_name">第二节 · 章节练习</span><span class="orangeNew">1</span></div><div class="posCatalog_select"><span class="posCatalog_name">第三节 · 阅读与讨论</span><span class="orangeNew">2</span></div></div></main>`;
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/*',r=>r.fulfill({body:fixture,contentType:'text/html; charset=utf-8'}));
 await ctx.addInitScript(release=>{
     window.unsafeWindow=window;
     window.__requests=[];window.__opens=[];
     window.__gm={'xxt-ai-enabled':false,'xxt-quiet-enabled':false,'xxt-update-notes-seen':release.version};
     const themeKey=key=>key==='xxt-ui-preference'||key==='xxt-ui-skin';
     window.GM_getValue=(key,fallback)=>themeKey(key)?localStorage.getItem(key)??fallback:__gm[key]??fallback;
     window.GM_setValue=(key,value)=>{
         if(themeKey(key))localStorage.setItem(key,value);
         else __gm[key]=structuredClone(value);
     };
     window.GM_openInTab=url=>__opens.push(url);
     window.GM_xmlhttpRequest=options=>{
         __requests.push({url:options.url,anonymous:options.anonymous,method:options.method});
         window.__request=options;
     };
 },release);
 await page.goto('https://mooc2-ans.chaoxing.com/mycourse/studentstudy?courseId=fixture&clazzid=c&cpi=account');
 await page.addScriptTag({content:bundle});const panel=page.locator('[data-xxt-codex-panel]');
 await panel.waitFor();assert.equal(await panel.getAttribute('data-workspace'),'study');assert.equal(await panel.getByRole('tab').count(),5);assert(await page.locator('[data-action=start]').isVisible());assert(await page.locator('[data-action=stop]').isVisible());checks.push('five-workspaces-and-fixed-actions');
 await page.waitForFunction(()=>document.querySelector('[data-workspace-pane=study] > [data-hub-settings]'));
 assert(await page.locator('[data-hub-settings]').evaluate(el=>el.parentElement.dataset.workspacePane==='study'&&el===el.parentElement.lastElementChild));
 assert.equal(await page.locator('[data-workspace-pane=course] [data-hub-settings]').count(),0);
 checks.push('page-and-study-settings-last-in-study-existing-node');
 assert.deepEqual(await panel.locator('[data-homework-modes] button').allTextContents(),['章节','作业','考试']);assert.equal(await panel.locator('[data-exam-options]').isVisible(),false);
 assert.equal(await panel.locator('[data-homework-modes]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length),3);
 const tab=name=>page.locator(`[data-workspace-tab=${name}]`);
 const support=panel.getByRole('link',{name:'支持作者',exact:true});
 assert.equal(await support.count(),1);
 assert.equal(await support.getAttribute('href'),'https://github.com/IrisBud/xuexitong-ai-assistant/blob/main/docs/SUPPORT.md');
 assert.equal(await support.getAttribute('target'),'_blank');
 assert.equal(await support.getAttribute('rel'),'noopener noreferrer');
 assert.equal(await support.evaluate(link=>link.closest('[role=tablist]')),null);
 const desktopSupport=await support.boundingBox(),desktopMore=await tab('more').boundingBox();
 assert(desktopSupport.y>=desktopMore.y+desktopMore.height);
 assert(Math.abs(desktopSupport.x+desktopSupport.width/2-desktopMore.x-desktopMore.width/2)<2);
 await tab('more').focus();await page.keyboard.press('Tab');
 assert(await support.evaluate(link=>link===document.activeElement));
 await tab('more').click();
 await support.hover();await panel.screenshot({path:fileURLToPath(new URL('panel-support.png',out))});
 await tab('study').click();
 checks.push('support-icon-below-more-outside-tablist-with-keyboard-access');
 await page.screenshot({path:fileURLToPath(new URL('desktop-study.png',out))});await panel.screenshot({path:fileURLToPath(new URL('panel-study.png',out))});
 const inputSame=await page.evaluate(()=>{window.__originalField=document.querySelector('[data-ai-field=key]');return !!__originalField;});assert(inputSame);
 await tab('ai').click();await page.getByRole('combobox',{name:'运行模式',exact:true}).selectOption('on');await page.locator('[data-ai-settings] > summary').click();assert(await page.locator('[data-ai-field=key]').first().isVisible());assert(await page.locator('[data-action=stop]').isVisible());assert(await page.evaluate(()=>__originalField===document.querySelector('[data-ai-field=key]')));assert.equal(await page.evaluate(()=>__requests.length),0);checks.push('moving-existing-controls-does-not-request-or-replace');
 await page.screenshot({path:fileURLToPath(new URL('desktop-ai.png',out))});await panel.screenshot({path:fileURLToPath(new URL('panel-ai.png',out))});
 await page.evaluate(()=>{const pane=document.querySelector('[data-workspace-pane=ai]');const p=document.createElement('p');p.textContent='布局滚动测试 '.repeat(1000);p.dataset.fixtureFiller='true';pane.append(p);pane.scrollTop=120;});
 await tab('study').click();await tab('ai').click();assert((await page.locator('[data-workspace-pane=ai]').evaluate(n=>n.scrollTop))>=119);await page.locator('[data-fixture-filler]').evaluate(n=>n.remove());await page.getByRole('combobox',{name:'运行模式',exact:true}).selectOption('off');checks.push('independent-workspace-scroll-position');
 await tab('study').click();await tab('study').focus();await page.keyboard.press('ArrowRight');assert.equal(await panel.getAttribute('data-workspace'),'course');assert.equal(await tab('course').getAttribute('tabindex'),'0');await page.keyboard.press('End');assert.equal(await panel.getAttribute('data-workspace'),'more');await page.keyboard.press('Home');assert.equal(await panel.getAttribute('data-workspace'),'study');checks.push('roving-tab-keyboard-arrows-home-end');
 await tab('course').click();await page.locator('[data-hub-catalog]').locator('..').locator('summary').first().click();assert.equal(await page.locator('[data-hub-catalog] li').count(),3);await page.locator('[data-hub-search]').fill('第二节');assert.equal(await page.locator('[data-hub-catalog] li').count(),1);await page.screenshot({path:fileURLToPath(new URL('desktop-course.png',out))});await panel.screenshot({path:fileURLToPath(new URL('panel-course.png',out))});checks.push('course-hub-mounted-in-course-workspace');
 await tab('study').click();await page.locator('[data-action=start]').click();assert.equal(await page.evaluate(()=>sessionStorage.getItem('xxt-auto:https://mooc2-ans.chaoxing.com/fixture/c')),'1');
 const quick=page.getByRole('button',{name:'检查脚本更新',exact:true});await quick.click();await page.waitForFunction(()=>__requests.length===1);assert(await quick.isDisabled());assert.equal(await panel.getAttribute('data-workspace'),'more');assert.equal(await page.evaluate(()=>sessionStorage.getItem('xxt-auto:https://mooc2-ans.chaoxing.com/fixture/c')),'1');assert.equal(await page.evaluate(()=>__opens.length),0);assert(await page.evaluate(()=>__requests[0].url.startsWith('https://raw.githubusercontent.com/IrisBud/xuexitong-ai-assistant/main/dist/release.json?check=')));assert.equal(await page.evaluate(()=>__requests[0].anonymous),true);
 await page.screenshot({path:fileURLToPath(new URL('desktop-update-checking.png',out))});
 await page.evaluate(release=>__request.onload({status:200,responseText:JSON.stringify({...release,changes:['模拟相同版本']}),finalUrl:__request.url}),release);await page.waitForFunction(()=>!document.querySelector('[data-quick-update]').disabled);assert.match(await page.locator('[data-update-status]').textContent(),/最新版本/);await page.locator('[data-action=stop]').click();assert.equal(await page.evaluate(()=>sessionStorage.getItem('xxt-auto:https://mooc2-ans.chaoxing.com/fixture/c')),null);checks.push('quick-update-anonymous-single-request-without-stop-ai-or-install');
 await quick.click();await page.evaluate(()=>__request.onerror());await page.waitForFunction(()=>__request.url.includes('irisbud.github.io'));await page.evaluate(()=>__request.onerror());await page.waitForFunction(()=>document.querySelector('[data-quick-update]').dataset.state==='error');assert.match(await quick.getAttribute('title'),/未能核对/);assert(await page.locator('[data-action=stop]').isVisible());checks.push('quick-update-error-shown-and-stop-remains-visible');
 await page.locator('.xxt-fold').click();assert.equal(await panel.getAttribute('data-layout-collapsed'),'true');await quick.click();assert.equal(await panel.getAttribute('data-layout-collapsed'),'false');assert.equal(await panel.getAttribute('data-workspace'),'more');await page.evaluate(release=>__request.onload({status:200,responseText:JSON.stringify({...release,changes:['模拟可用更新']}),finalUrl:__request.url}),newerRelease);await page.waitForFunction(()=>document.querySelector('[data-quick-update]').dataset.state==='available');assert.equal(await page.evaluate(()=>__opens.length),0);await page.screenshot({path:fileURLToPath(new URL('desktop-update.png',out))});checks.push('folded-quick-check-opens-result-without-installing');
 await page.locator('[data-update-banner] button[aria-label="关闭本版本更新提示"]').click();
 await tab('ai').click();await page.locator('[data-homework-modes] [data-choice=homework]').click();await page.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel]').dataset.workspace==='study');assert(await page.locator('[data-homework-options]').isVisible());await page.screenshot({path:fileURLToPath(new URL('desktop-homework.png',out))});await page.locator('[data-homework-modes] [data-choice=chapter]').click();checks.push('mode-switch-shows-learning-options-without-implicit-run');
 const box=page.locator('[data-answer-preview]');await box.evaluate(n=>{n.querySelector('[data-preview-content]').textContent='预览区域布局示例：这里的内容没有填写或提交。';n.hidden=false;});await page.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel]').dataset.workspace==='records');assert(await box.isVisible());assert.equal(await box.evaluate(n=>n.closest('[data-workspace-pane]')?.dataset.workspacePane),'records');await page.screenshot({path:fileURLToPath(new URL('desktop-records.png',out))});checks.push('answer-preview-automatically-visible-in-records');
 const handle=await panel.locator('.xxt-head strong').boundingBox();await page.mouse.move(handle.x+12,handle.y+8);await page.mouse.down();await page.mouse.move(800,150);await page.mouse.up();assert((await panel.boundingBox()).x>390);
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel]').getBoundingClientRect().right<=innerWidth);checks.push('dragged-panel-clamped-into-resized-viewport');
 for(const key of ['study','course','ai','records','more']){await tab(key).click();assert.equal(await box.isVisible(),key==='records');assert.equal(await page.getByRole('tablist').getAttribute('aria-orientation'),'horizontal');const width=await panel.evaluate(n=>({panel:n.getBoundingClientRect().right,window:innerWidth,scroll:document.documentElement.scrollWidth}));assert(width.panel<=width.window+1);assert(width.scroll<=width.window);assert(await page.locator('[data-action=stop]').isVisible());await page.screenshot({path:fileURLToPath(new URL('mobile-'+key+'.png',out))});}checks.push('390-width-five-workspaces-no-page-overflow-fixed-stop');
 for(const width of [390,320]){
     await page.setViewportSize({width,height:844});
     const heart=await support.boundingBox(),more=await tab('more').boundingBox();
     assert(heart.x>=more.x+more.width&&heart.x+heart.width<width);
     assert(Math.abs(heart.y+heart.height/2-more.y-more.height/2)<2);
     if(width===320)await panel.screenshot({path:fileURLToPath(new URL('panel-support-320.png',out))});
 }
 checks.push('support-icon-next-to-more-on-narrow-screens');
 await page.emulateMedia({reducedMotion:'reduce'});await quick.click();const animation=await quick.locator('svg').evaluate(n=>getComputedStyle(n).animationName);assert.equal(animation,'none');await page.evaluate(()=>__request.onerror());await page.waitForFunction(()=>__request.url.includes('irisbud.github.io'));await page.evaluate(()=>__request.onerror());await page.waitForFunction(()=>!document.querySelector('[data-quick-update]').disabled);checks.push('reduced-motion-update-feedback');
 await page.setViewportSize({width:1440,height:1000});
 await tab('more').click();
 const rainbow=panel.getByRole('button',{name:'彩虹',exact:true});
 const beforeTheme=await page.evaluate(()=>__requests.length);
 await rainbow.focus();await rainbow.press('Enter');
 assert.equal(await panel.getAttribute('data-skin'),'rainbow');
 assert.equal(await rainbow.getAttribute('aria-pressed'),'true');
 assert.equal(await panel.locator('.xxt-head strong').textContent(),'彩虹·学习助手');
 assert.equal(await panel.locator('.xxt-scene-art img,.xxt-theme-mascot img').count(),0);
 const paint=await panel.evaluate(node=>{
     const styles=selector=>getComputedStyle(node.querySelector(selector));
     const colors=[...node.querySelectorAll('[data-workspace-tab] svg')].map(icon=>getComputedStyle(icon).color);
     const contrast=(color,background)=>{
         const luminance=value=>value.match(/\d+/g).slice(0,3).map(Number).reduce((acc,value,index)=>{
             const v=value/255;
             return acc+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][index];
         },0);
         const ratios=[luminance(color),luminance(background)];
         return (Math.max(...ratios)+.05)/(Math.min(...ratios)+.05);
     };
     const primary=styles('[data-action=start]'),status=styles('.xxt-status-card'),copy=styles('.xxt-status-card pre');
     return {ribbons:styles('.xxt-shell').backgroundImage.includes('radial-gradient'),
         header:styles('.xxt-head').backgroundImage.includes('radial-gradient'),
         iconColors:new Set(colors).size,primary:contrast(primary.color,primary.backgroundColor),
         status:contrast(copy.color,status.backgroundColor)};
 });
 assert(paint.ribbons&&paint.header&&paint.iconColors===5&&paint.primary>=4.5&&paint.status>=4.5,JSON.stringify(paint));
 assert.equal(await page.evaluate(()=>__requests.length),beforeTheme);
 await page.reload();await page.addScriptTag({content:bundle});
 assert.equal(await panel.getAttribute('data-skin'),'rainbow');
 const statusCard=panel.locator('.xxt-status-card');
 const statusSymbol=statusCard.locator('.xxt-status-symbol');
 const statusCopy=statusCard.locator('pre');
 const symbolArt=()=>statusSymbol.evaluate(symbol=>getComputedStyle(symbol).backgroundImage);
 assert.match(await symbolArt(),/data:image\/svg\+xml/);
 assert.equal(await statusSymbol.evaluate(symbol=>getComputedStyle(symbol).borderTopColor),'rgba(0, 0, 0, 0)');
 await statusCard.screenshot({path:fileURLToPath(new URL('rainbow-waiting-detail.png',out))});
 const idleCopy=await statusCopy.textContent();
 await statusCopy.evaluate(node=>node.textContent='正在处理模拟内容');
 await page.waitForFunction(()=>document.querySelector('.xxt-status-card').dataset.status==='running');
 assert.equal(await symbolArt(),'none');
 assert.notEqual(await statusSymbol.evaluate(symbol=>getComputedStyle(symbol).borderTopColor),'rgba(0, 0, 0, 0)');
 await statusCopy.evaluate((node,value)=>node.textContent=value,idleCopy);
 await page.waitForFunction(()=>document.querySelector('.xxt-status-card').dataset.status==='idle');
 const heartStroke=()=>support.locator('svg path').evaluate(path=>getComputedStyle(path).stroke);
 assert.match(await heartStroke(),/xxt-support-gradient-/);
 assert.equal(await support.locator('linearGradient stop').count(),6);
 checks.push('waiting-rainbow-preserves-status-glyphs-and-heart-keeps-link');

 const selectedStyle=control=>control.evaluate(node=>{
     const style=getComputedStyle(node);
     const icon=getComputedStyle(node.querySelector('svg')).color;
     return {icon,fill:style.backgroundColor,ink:style.color,border:style.borderColor,radius:style.borderRadius};
 });
 const fills=[];
 for(const key of ['study','course','ai','records','more']){
     const control=tab(key);
     await control.click();
     assert.equal(await control.getAttribute('aria-selected'),'true');
     const paint=await selectedStyle(control);
     assert.equal(paint.ink,paint.icon);
     fills.push(paint.fill);
     const overlay=panel.locator('.xxt-liquid-indicator');
     assert.equal(await overlay.evaluate(node=>getComputedStyle(node).borderTopColor),paint.icon);
 }
 assert.equal(new Set(fills).size,5);
 const mode=key=>panel.locator(`[data-homework-modes] [data-choice=${key}]`);
 const modeColors=[];
 for(const key of ['chapter','homework','exam']){
     const control=mode(key);
     await control.focus();await control.press('Enter');
     assert.equal(await control.getAttribute('aria-pressed'),'true');
     const paint=await selectedStyle(control);
     assert.equal(paint.ink,paint.icon);
     assert.equal(paint.radius,'12px');
     modeColors.push(paint);
 }
 assert.equal(new Set(modeColors.map(paint=>paint.fill)).size,3);
 assert.equal(new Set(modeColors.map(paint=>paint.border)).size,3);
 assert.equal(new Set(modeColors.map(paint=>paint.icon)).size,3);
 await mode('chapter').click();await tab('course').click();await page.mouse.move(1,1);
 await statusCopy.evaluate((node,value)=>node.textContent=value,idleCopy);
 await page.waitForFunction(()=>document.querySelector('.xxt-status-card').dataset.status==='idle');
 await panel.screenshot({path:fileURLToPath(new URL('rainbow-course-selected.png',out))});
 checks.push('rainbow-mode-and-workspace-selection-follows-icon-colors');

 await tab('more').click();assert.equal(await rainbow.getAttribute('aria-pressed'),'true');
 await panel.screenshot({path:fileURLToPath(new URL('rainbow-picker.png',out))});
 await tab('study').click();
 for(const width of [1440,390,320]){
     await page.setViewportSize({width,height:width===1440?1000:844});
     await page.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel]').getBoundingClientRect().right<=innerWidth);
     const bounds=await panel.evaluate(node=>{
         const {left,right}=node.getBoundingClientRect();
         const tabs=[...node.querySelectorAll('[data-workspace-tab]')];
         return left>=0&&right<=innerWidth+1&&tabs.every(tab=>tab.scrollWidth<=tab.clientWidth+1);
     });
     assert(bounds,`Rainbow overflows at ${width}px`);
     assert(await support.isVisible());
     await panel.screenshot({path:fileURLToPath(new URL(`rainbow-${width}.png`,out))});
 }
 checks.push('rainbow-keyboard-selection-contrast-and-responsive-art');
 await page.emulateMedia({forcedColors:'active'});
 assert.equal(await panel.locator('.xxt-shell').evaluate(node=>getComputedStyle(node).backgroundImage),'none');
 assert.equal(await symbolArt(),'none');
 assert.doesNotMatch(await heartStroke(),/url\(/);
 await page.emulateMedia({forcedColors:'none'});
 checks.push('rainbow-respects-forced-colors');
 await tab('more').click();assert.equal(await rainbow.getAttribute('aria-pressed'),'true');
 await rainbow.click();assert.equal(await panel.getAttribute('data-skin'),'default');
 await tab('study').click();
 assert(await panel.locator('[data-action=start]').isVisible()&&await support.isVisible());
 assert.doesNotMatch(await heartStroke(),/url\(/);
 checks.push('rainbow-persists-on-reload-and-can-return-to-default');
 assert.deepEqual(errors,[]);await writeFile(new URL('verification.json',out),JSON.stringify({scope:'Synthetic pages and mocked update metadata only; no real course, model call, install or grade.',runtimeSHA256:createHash('sha256').update(bundle).digest('hex'),checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,checks}));await ctx.close();
}finally{await browser.close();}

