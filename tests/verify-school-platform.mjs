import {chromium} from './browser-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/playwright/school-platform');
await mkdir(out,{recursive:true});
const baseline=process.argv.includes('--baseline');
const bundle=await readFile(resolve(root,baseline?'artifacts/issue-11/baseline.user.js':'dist/xuexitong-ai-assistant.user.js'),'utf8');
const browser=await chromium.launch({channel:'msedge',headless:true});
const observations=[];
async function pageFor({origin='http://learn.school.example',approved=true,rng=true,storage=true,path='/mycourse/studentstudy?courseId=fixture',width=1366}={}){
    const context=await browser.newContext({viewport:{width,height:1000}}),errors=[],requests=[];
    await context.addInitScript(({origin,approved,rng,storage})=>{
        window.unsafeWindow=window;window.__gm={'xxt-school-origins-v1':approved?[origin,'http://quiz.school.example']:[],'xxt-quiet-enabled':false,'xxt-ai-enabled':false,'private-test':'do-not-export-fixture'};
        window.GM_getValue=(key,fallback)=>__gm[key]??fallback;window.GM_setValue=(key,value)=>__gm[key]=structuredClone(value);
        window.__menus={};window.GM_registerMenuCommand=(name,callback)=>__menus[name]=callback;
        window.GM_xmlhttpRequest=()=>{throw Error('No model/network request expected')};
        if(!rng)Object.defineProperty(globalThis,'crypto',{value:{},configurable:true});
        if(!storage)Object.defineProperty(globalThis,'sessionStorage',{get(){throw Error('do-not-export-fixture https://private.invalid/course?secret=fixture')}});
    },{origin,approved,rng,storage});
    const homework=path.includes('/mooc2/work/dowork') ? '<div class="fanyaMarking TiMu"><form id="submitForm">'+await readFile(resolve(root,'tests/fixtures/homework/boolean.html'),'utf8')+'</form></div>' : '';
    await context.route('**/*',route=>route.fulfill({contentType:'text/html;charset=utf-8',body:'<!doctype html>'+homework+'<div id="coursetree"><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name">合成课程</span></div></div><p>学校课程初始化隔离验证</p>'}));
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    page.on('request',r=>{if(!r.isNavigationRequest())requests.push(r.url())});
    await page.goto(origin+path);await page.addScriptTag({content:bundle});
    return {page,context,errors,requests};
}
try{
    if(baseline){
        const t=await pageFor();await t.page.waitForTimeout(200);
        assert.equal(await t.page.locator('[data-xxt-codex-panel]').count(),0);
        assert(t.errors.some(e=>/randomUUID/.test(e)));observations.push({case:'published-1.7.7-http-init-defect-reproduced',errors:t.errors});await t.context.close();
    }else{
        for(const origin of ['https://mooc1.chaoxing.com','https://learn.school.example','http://learn.school.example']){
            const t=await pageFor({origin});await t.page.locator('[data-xxt-codex-panel]').waitFor();
            assert.equal(await t.page.locator('[data-xxt-codex-panel]').count(),1);assert.deepEqual(t.errors,[]);assert.deepEqual(t.requests,[]);
            const result=await t.page.evaluate(async()=>({secureContext:isSecureContext,uuid:typeof crypto.randomUUID,subtle:typeof crypto.subtle,sha:await XxtCompat.sha256Hex(new TextEncoder().encode('abc')),id:XxtCompat.randomUUID()}));
            assert.equal(result.sha,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
            assert.match(result.id,/^[a-f0-9-]{36}$/);if(origin.startsWith('http:')){assert.equal(result.secureContext,false);assert.equal(result.uuid,'undefined');assert.equal(result.subtle,'undefined');}
            if(origin.startsWith('http:')){
                const id=await t.page.evaluate(()=>XxtProfiles.create(GM_getValue,GM_setValue).save({provider:'custom',protocol:'chat',baseUrl:'https://model.synthetic.invalid/v1',model:'fixture',key:'fixture-only'}).id);
                assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
                observations.push({case:'http-saved-interface-profile-uuid'});
            }
            if(origin.startsWith('http:'))await t.page.screenshot({path:resolve(out,'http-panel.png')});
            observations.push({case:'panel-init',origin,...result});await t.context.close();
        }
        for(const options of [{origin:'https://unrelated.example',approved:false,path:'/'},{approved:false},{origin:'http://mooc1.chaoxing.com',approved:false}]){
            const t=await pageFor(options);assert.equal(await t.page.locator('[data-xxt-codex-panel]').count(),0);assert.equal(await t.page.evaluate(()=>typeof XxtAi),'undefined');assert.deepEqual(t.errors,[]);
            observations.push({case:'unapproved-source-not-running',origin:options.origin||'http://learn.school.example'});await t.context.close();
        }
        for(const options of [{rng:false,width:390},{storage:false}]){
            const t=await pageFor(options);await t.page.locator('[data-xxt-startup-error]').waitFor();
            await t.page.getByRole('button',{name:'查看脱敏诊断'}).click();const diagnostic=await t.page.getByRole('textbox',{name:'脱敏启动诊断'}).inputValue();
            const parsed=JSON.parse(diagnostic);assert.equal(parsed.code,options.rng===false?'E_RANDOM':'E_INIT');assert(!/secret|private|school\.example|courseId|do-not-export/.test(diagnostic));assert.deepEqual(t.errors,[]);
            assert(await t.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
            if(options.rng===false)await t.page.screenshot({path:resolve(out,'http-missing-rng-390.png')});
            observations.push({case:'safe-startup-diagnostic',...parsed});await t.context.close();
        }
        {
            const t=await pageFor({path:'/mooc2/work/dowork?courseId=fixture&workId=fixture'});
            assert(await t.page.evaluate(()=>XxtHomeworkRuntime.ownsPage()));assert.equal(await t.page.locator('[data-xxt-codex-panel]').count(),1);assert.deepEqual(t.errors,[]);
            observations.push({case:'school-http-standalone-homework-init'});await t.context.close();
        }
        {
            const t=await pageFor();let prompts=0;t.page.on('dialog',async dialog=>{if(dialog.type()==='prompt'){prompts++;await dialog.accept('https://other.school.example');}else await dialog.accept();});
            await t.page.evaluate(()=>__menus['学校域名设置']());assert.equal(prompts,1);
            assert.deepEqual(await t.page.evaluate(()=>__gm['xxt-school-origins-v1']),['https://other.school.example']);
            assert.equal(await t.page.evaluate(()=>sessionStorage.getItem('xxt-auto:http://learn.school.example/fixture/')),null);
            assert.deepEqual(t.errors,[]);observations.push({case:'explicit-menu-save-stops-old-run-and-needs-refresh'});await t.context.close();
        }
    }
}finally{await browser.close();}
const report={runtimeSHA256:createHash('sha256').update(bundle).digest('hex'),browserChannel:process.env.XXT_BROWSER_CHANNEL||'msedge',baseline,checks:observations.length,observations,scope:'Native browser insecure HTTP and HTTPS origins fulfilled by synthetic routes; mock GM; no real school, model, course submission or grade.'};
await writeFile(resolve(out,baseline?'baseline.json':'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
