import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/school-coordination');await mkdir(out,{recursive:true});
const baseline=process.argv.includes('--uuid-only');
let bundle=await readFile(resolve(root,baseline?'artifacts/issue-11/baseline.user.js':'dist/xuexitong-ai-assistant.user.js'),'utf8');
if(baseline)bundle=(await Promise.all(['vendor/noble-sha256.cjs','src/compat.cjs'].map(p=>readFile(resolve(root,p),'utf8')))).join('\n')+'\n'+bundle.replaceAll('crypto.randomUUID()','XxtCompat.randomUUID()');
const runtimeSHA256=createHash('sha256').update(bundle).digest('hex'),browser=await chromium.launch({channel:'msedge',headless:true}),observations=[];
try{
    for(const mode of baseline?['normal']:['normal','unapproved-worker','stop','forged-finished']){
        const origin='http://learn.school.example',quizOrigin='http://quiz.school.example',events=[],errors=[];
        const context=await browser.newContext({viewport:{width:1450,height:1000}});
        await context.exposeBinding('__event',(_,event)=>events.push(event));
        await context.addInitScript(({origin,quizOrigin,mode})=>{
            window.unsafeWindow=window;window.__gm={'xxt-school-origins-v1':mode==='unapproved-worker'?[origin]:[origin,quizOrigin], 'xxt-quiet-enabled':false,'xxt-ai-enabled':true,'xxt-ai-config':{provider:'custom',protocol:'chat',baseUrl:'https://model.synthetic.invalid/v1',model:'fixture',key:'fixture-only'}};
            window.GM_getValue=(k,d)=>__gm[k]??d;window.GM_setValue=(k,v)=>__gm[k]=structuredClone(v);
            window.GM_xmlhttpRequest=spec=>{const body=JSON.parse(spec.data),text=body.messages[0].content,qs=JSON.parse(text.split('题目：')[1].split('\n之前的平台反馈')[0]);__event('model');let aborted=false;
                setTimeout(()=>{if(!aborted)spec.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers:qs.map(q=>({id:q.id,choices:['A'],readable:true,confidence:1,explanation:'合成回执'}))})}}]})});},mode==='stop'?1500:25);return {abort(){aborted=true;spec.onabort?.();}};};
            window.addEventListener('message',e=>{if(e.data?.source==='xxt-codex-0.3'&&e.data.type==='ready')window.__worker={nonce:e.data.nonce};if(e.data?.source==='xxt-codex-0.3'&&e.data.type==='owner')window.__owner=e.data;});
        },{origin,quizOrigin,mode});
        await context.route('**/*',async route=>{
            const u=new URL(route.request().url());let html='';
            if(u.origin===origin){
                html=`<div class="prev_title">学习检测</div><div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">当前章节</span><span class="orangeNew">1</span></div><div class="posCatalog_select"><span class="posCatalog_name">下一章节</span></div></div><div class="ans-attach-ct" id="task"><span class="ans-job-icon" aria-label="任务点未完成"></span><iframe id="quiz" src="${quizOrigin}/work/doHomeWorkNew?workId=fixture" style="width:900px;height:700px"></iframe></div><button id="next">下一节</button><script>document.querySelector('#next').onclick=()=>{if(!document.querySelector('#task').classList.contains('ans-job-finished')){__event('early-next');return;}__event('next');document.querySelector('.posCatalog_active').classList.remove('posCatalog_active');document.querySelectorAll('.posCatalog_select')[1].classList.add('posCatalog_active');document.querySelector('#quiz').remove();};window.addEventListener('message',e=>{if(e.origin===${JSON.stringify(quizOrigin)}&&e.source===document.querySelector('#quiz')?.contentWindow&&e.data?.fixturePlatform==='submitted'){document.querySelector('#task').classList.add('ans-job-finished');document.querySelector('.ans-job-icon').setAttribute('aria-label','任务点已完成');}});</script>`;
            }else if(u.origin===quizOrigin){
                html=`<div class="TiMu"><div class="Zy_TItle"><span class="newZy_TItle">【单选题】</span>合成题干</div><ul class="Zy_ulTop"><li><span class="num_option_dx">A</span><a class="after">选项甲</a></li><li><span class="num_option_dx">B</span><a class="after">选项乙</a></li></ul></div><a class="btnSubmit workBtnIndex">提交</a><script>document.querySelectorAll('.num_option_dx').forEach(e=>e.onclick=()=>e.classList.add('check_answer'));document.querySelector('.btnSubmit').onclick=()=>{__event('submit');window.top.postMessage({fixturePlatform:'submitted'},${JSON.stringify(origin)});document.body.innerHTML='<p>满分:100</p><p>最终成绩100分</p>';};</script>`;
            }else throw Error('Unexpected fixture network request');
            await route.fulfill({contentType:'text/html;charset=utf-8',body:'<!doctype html>'+html+'<script>'+bundle.replaceAll('</script','<\\/script')+'</script>'});
        });
        const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
        await page.goto(origin+'/mycourse/studentstudy?courseId=fixture&clazzid=fixture&cpi=fixture');
        const frame=page.frameLocator('#quiz');await frame.locator('.TiMu').waitFor();
        if(mode==='unapproved-worker'){
            await page.waitForTimeout(1200);assert.equal(await frame.locator('[data-xxt-codex-panel]').count(),0);assert.deepEqual(events,[]);
            observations.push({mode,events});await context.close();continue;
        }
        if(baseline){
            await page.waitForTimeout(1400);assert(await frame.locator('[data-xxt-codex-panel]').isVisible());
            await page.locator('[data-action=start]').click();await page.waitForTimeout(1500);assert(!events.includes('model'));assert(!events.includes('next'));
            observations.push({mode:'UUID-only-2-panels-no-coordination',visiblePanels:2,events});await context.close();continue;
        }
        await frame.locator('[data-xxt-codex-panel]').waitFor({state:'hidden'});
        assert(await page.locator('[data-xxt-codex-panel]').isVisible());
        if(mode==='forged-finished'){
            await page.waitForFunction(()=>!!window.__worker);
            await page.evaluate(()=>{const child=document.querySelector('#quiz').contentWindow;for(const [origin,source,nonce,task] of [['http://evil.school.example',child,__worker.nonce,'wrong'],['null',child,__worker.nonce,'wrong'],[location.origin,window,__worker.nonce,'wrong'],['http://quiz.school.example',child,'wrong','wrong']]) window.dispatchEvent(new MessageEvent('message',{origin,source,data:{source:'xxt-codex-0.3',type:'finished',nonce,task}}));});
            await page.waitForTimeout(800);assert.deepEqual(events,[]);assert.equal(await page.locator('.ans-job-finished').count(),0);
        }
        await page.locator('[data-action=start]').click();
        if(mode==='stop'){
            await page.waitForFunction(()=>document.querySelector('[data-xxt-codex-panel] pre').textContent.includes('模型'));
            await page.locator('[data-action=stop]').click();await page.waitForTimeout(1900);assert(!events.includes('submit'));assert(!events.includes('next'));
        }else{
            await page.waitForFunction(()=>document.querySelectorAll('.posCatalog_select')[1].classList.contains('posCatalog_active'),null,{timeout:18000}).catch(async error=>{console.error(mode,events,await page.locator('[data-xxt-codex-panel] pre').textContent());throw error});
            assert.equal(events.filter(v=>v==='model').length,1);assert.equal(events.filter(v=>v==='submit').length,1);assert.equal(events.filter(v=>v==='next').length,1);assert(!events.includes('early-next'));
        }
        assert.deepEqual(errors,[]);observations.push({mode,visiblePanelsBeforeStart:1,events});await context.close();
    }
}finally{await browser.close();await writeFile(resolve(out,baseline?'uuid-only-baseline.json':'verification.json'),JSON.stringify({runtimeSHA256,observations,scope:'Synthetic HTTP cross-origin quiz, mock model and explicit fixture platform callback; no real course writes or grades.'},null,2));}
console.log(JSON.stringify(observations,null,2));
