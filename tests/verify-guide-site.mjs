import {chromium} from './browser-runtime.mjs';
import {readFile,readdir,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {guides} from '../site/content/guides.mjs';

const root=resolve(import.meta.dirname,'..'),site=resolve(root,'site'),out=resolve(root,'output/playwright/docs-site');
const base=process.env.XXT_GUIDE_URL||'http://127.0.0.1:4187/xuexitong-ai-assistant/';
await mkdir(out,{recursive:true});
const walk=async dir=>(await Promise.all((await readdir(dir)).map(async name=>{const path=resolve(dir,name);return(await stat(path)).isDirectory()?await walk(path):[path];}))).flat();
const files=await walk(site),htmlFiles=files.filter(x=>x.endsWith('.html'));
let localLinks=0;
for(const file of htmlFiles){
 const html=await readFile(file,'utf8');assert(html.includes('lang="zh-CN"'));assert.equal((html.match(/<h1\b/g)||[]).length,1,`One h1 in ${file}`);assert(!/maximum-scale|user-scalable\s*=\s*no|javascript:/i.test(html));
 for(const match of html.matchAll(/\b(?:href|src)="([^"<>]+)"/g)){
  const value=match[1].replaceAll('&amp;','&');if(/^(?:https?:|mailto:|data:|tel:)/.test(value))continue;
  const url=new URL(value,'https://local.invalid/'+relative(site,file).replaceAll('\\','/')),target=resolve(site,'.'+decodeURIComponent(url.pathname));
  const path=(await stat(target)).isDirectory()?resolve(target,'index.html'):target;
  assert((await stat(path)).isFile(),`Missing asset ${value}`);localLinks++;
  if(url.hash){const text=await readFile(path,'utf8'),id=decodeURIComponent(url.hash.slice(1));assert(text.includes(`id="${id}"`),`Missing anchor ${value} from ${file}`);}
 }
}
const readme=await readFile(resolve(root,'README.md'),'utf8');assert(readme.split('\n').length<120);const {version,channel}=JSON.parse(await readFile(resolve(root,'src/release.json'),'utf8'));assert(readme.includes(channel==='candidate'?'当前文件是本地候选 '+version:'目前脚本最新版本为 '+version+'，请已安装脚本的用户尽快更新'));assert(readme.includes('https://irisbud.github.io/xuexitong-ai-assistant/'));assert(!/TODO|Lorem ipsum|待补链接/.test(readme));
const browser=await chromium.launch({headless:true}),results=[],errors=[];
async function check(name,run){const started=Date.now();await run();results.push({name,passed:true,ms:Date.now()-started});console.log('PASS',name);}
async function pageAt(context,path=''){
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL(path,base).href);return page;
}
async function exposure(page,index){return page.locator('.fan-card').nth(index).evaluate(element=>{const box=element.getBoundingClientRect();for(let y=Math.max(0,box.top+10);y<Math.min(innerHeight,box.bottom-10);y+=9)for(let x=Math.max(0,box.left+8);x<Math.min(innerWidth,box.right-8);x+=9)if(document.elementFromPoint(x,y)?.closest('.fan-card')===element)return{x,y};return null;});}
try{
 await check('static-pages-and-local-links',async()=>{assert.equal(htmlFiles.length,11);assert(localLinks>200);});
 await check('desktop-fan-each-card-is-exposed-and-lifts-on-pointer',async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await pageAt(context);assert.equal(await page.locator('.fan-card').count(),8);
  for(let index=0;index<8;index++){await page.mouse.move(20,130);await page.waitForTimeout(270);const point=await exposure(page,index);assert(point,`Card ${index} has no clickable exposed area`);await page.mouse.move(point.x,point.y);await page.waitForTimeout(280);assert(await page.locator('.fan-card').nth(index).evaluate(n=>n.classList.contains('is-active')));assert.match(await page.locator('.fan-card').nth(index).getAttribute('style'),/translateY\(-44px\)/);}
  await page.screenshot({path:resolve(out,'home-fan-active-1440.png')});await page.mouse.move(20,130);await page.waitForTimeout(280);assert.equal(await page.locator('.fan-card.is-active').count(),0);assert.equal(await page.locator('.fan-card.is-selected').evaluate(n=>n.style.zIndex),'10');await page.screenshot({path:resolve(out,'home-1440.png'),fullPage:true});await context.close();
 });
 await check('keyboard-card-activation-is-instant-and-navigates',async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await pageAt(context);await page.keyboard.press('Tab');const link=page.locator('.fan-card').first();await link.focus();assert.equal(await link.evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await link.press('Enter');await page.waitForURL('**/guides/start.html');assert.match(await page.locator('h1').textContent(),/安装/);await context.close();
 });
 await check('reduced-motion-keeps-fan-static-but-links-work',async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await pageAt(context);const link=page.locator('.fan-card').last(),before=await link.evaluate(n=>getComputedStyle(n).transform);const point=await exposure(page,7);await page.mouse.move(point.x,point.y);assert.equal(await link.evaluate(n=>getComputedStyle(n).transform),before);await link.click();await page.waitForURL('**/guides/troubleshooting.html');await page.screenshot({path:resolve(out,'troubleshooting-1440.png'),fullPage:true});await context.close();
 });
 await check('discussion-and-exam-cards-shortcuts-index-and-search-open-their-sections',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await pageAt(context);
  for(const [anchor,label,query] of [['discussion','章节讨论','章节讨论'],['exam','考试辅助（测试版）','整卷预览']]){
   const href=`guides/answers.html#${anchor}`;
   for(const scope of ['[data-fan]','.topic-shortcuts','[data-guide-index]']){
    const link=page.locator(`${scope} a[href="${href}"]`);assert.match(await link.textContent(),new RegExp(label.split('（')[0]));
    await link.click();await page.waitForURL(`**/${href}`);
    assert.equal(await page.locator(`#${anchor} h2`).textContent(),label);
    await page.goto(base);
   }
   await page.getByRole('searchbox',{name:'搜索教程'}).fill(query);
   const result=page.locator('.search-result').first();await result.waitFor();
   assert.equal(await result.getAttribute('href'),href);await result.click();await page.waitForURL(`**/${href}`);
   await page.goto(base);
  }
  await context.close();
 });
 await check('search-finds-topic-keywords-and-no-results-retains-directory',async()=>{
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await pageAt(context);const input=page.getByRole('searchbox',{name:'搜索教程'});await input.fill('WorkBuddy');await page.waitForFunction(()=>document.querySelector('[data-search-status]').textContent.includes('找到'));assert((await page.locator('.search-result').allTextContents()).some(t=>t.includes('WorkBuddy')));await input.fill('面板');await page.waitForFunction(()=>document.querySelectorAll('.search-result').length>1);await page.screenshot({path:resolve(out,'search-results.png')});await input.fill('nothing-matches-this-8842');await page.waitForFunction(()=>document.querySelector('[data-search-status]').textContent.includes('没有找到'));assert(await page.locator('[data-guide-index]').isVisible());await input.fill('');assert(await page.locator('[data-guide-index]').isVisible());await context.close();
 });
 await check('search-index-failure-has-recovery-and-html-query-is-inert',async()=>{
  const context=await browser.newContext(),page=await pageAt(context);await page.route('**/search-index.json',route=>route.fulfill({status:503,body:'unavailable'}));await page.locator('#guide-search').fill('AI');await page.waitForFunction(()=>document.querySelector('[data-search-status]').textContent.includes('加载失败'));assert(await page.locator('[data-guide-index]').isVisible());await page.unroute('**/search-index.json');await page.locator('#guide-search').fill('<img src=x onerror=alert(1)>');await page.waitForFunction(()=>document.querySelector('[data-search-status]').textContent.includes('没有找到'));assert.equal(await page.locator('[data-search-results] img').count(),0);await context.close();
 });
 for(const width of [390,681,768,1024])await check(`responsive-home-${width}-no-page-overflow`,async()=>{
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},hasTouch:width===390,isMobile:width===390}),page=await pageAt(context);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await page.getByRole('link',{name:'第一次使用',exact:true}).isVisible());if(width===390){assert.equal(await page.locator('[data-fan]').evaluate(n=>getComputedStyle(n).overflowX),'auto');await page.locator('.fan-card').last().scrollIntoViewIfNeeded();await page.locator('.fan-card').last().click();await page.waitForURL('**/guides/troubleshooting.html');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:resolve(out,'article-390.png'),fullPage:true});await page.goto(base);}await page.screenshot({path:resolve(out,`home-${width}.png`),fullPage:true});await context.close();
 });
 await check('all-ten-articles-images-anchors-and-narrow-layout',async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const guide of guides){await page.goto(new URL(`guides/${guide.id}.html`,base).href);assert.equal(await page.locator('h1').textContent(),guide.title);assert.equal(await page.locator('.guide-sidebar a[aria-current=page]').count(),1);assert.equal(await page.locator('.article-body section').count(),guide.sections.length);await page.evaluate(()=>{document.querySelectorAll('img').forEach(img=>img.loading='eager');});await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));assert(await page.evaluate(()=>[...document.images].every(img=>img.naturalWidth>0)));await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Narrow overflow in ${guide.id}`);const details=page.locator('.mobile-toc');await details.locator('summary').click();await details.locator('a').last().click();assert(new URL(page.url()).hash);await page.setViewportSize({width:1440,height:1000});}
  await page.goto(new URL('guides/start.html',base).href);await page.screenshot({path:resolve(out,'start-guide-1440.png'),fullPage:true});await context.close();
 });
 await check('no-javascript-retains-readable-content-and-direct-links',async()=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:1100,height:900}}),page=await pageAt(context);await page.locator('.topic-shortcuts a').first().click();await page.waitForURL('**/guides/start.html');assert(await page.getByRole('heading',{name:'进入一条具体小节'}).isVisible());assert.equal(await page.locator('.article-body section').count(),6);await context.close();
 });
 assert.deepEqual(errors,[]);
}finally{
 await browser.close();const hashes={};for(const file of files)hashes[relative(site,file).replaceAll('\\','/')]=createHash('sha256').update(await readFile(file)).digest('hex');await writeFile(resolve(out,'verification.json'),JSON.stringify({at:new Date().toISOString(),base,scope:'Real Chromium rendering and interactions against local GitHub Pages path; device widths simulated, no real phone hardware, course action, model call or install.',htmlPages:htmlFiles.length,localLinks,results,errors,hashes},null,2)+'\n');
}
console.log(`Guide site: ${results.length} browser groups passed; ${localLinks} local links checked.`);
