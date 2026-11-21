import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { chromium } from './browser-runtime.mjs';

const root=resolve(import.meta.dirname,'..'), out=resolve(root,'output/playwright/exam');
await mkdir(out,{recursive:true});
const bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const origin='https://mooc1.chaoxing.com', preview='/exam-ans/mooc2/exam/preview', single='/exam-ans/exam/test/reVersionTestStartNew';
const result='/exam-ans/exam/test/look';
const row=(key,text,type='radio')=>`<div class="answerBg" role="${type}" aria-checked="false" tabindex="0"><span class="num_option">${key}</span><span class="answer_p">${text}</span></div>`;
const html=`<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui;margin:35px}.questionLi{margin:20px 0}.answerBg{padding:7px;cursor:pointer}.answerBg[aria-checked=true]{background:#bcdbff}#submitConfirmPop{position:fixed;z-index:1001;left:35%;top:24%;background:white;padding:20px;box-shadow:0 2px 20px #0004}.popBottom a{padding:10px}</style>
<aside>题量：3</aside><div class="sub-button"><a href="#" class="completeBtn">交卷</a></div><main>
<div class="questionLi"><h3 class="mark_name">1. <span class="colorShallow">单选题</span>课程中的试验常数是多少？</h3><div class="stem_answer">${row('A','42')}${row('B','98')}</div></div>
<div class="questionLi"><h3 class="mark_name">2. <span class="colorShallow">多选题</span>哪些是试验步骤？</h3><div class="stem_answer">${row('A','准备','checkbox')}${row('B','记录','checkbox')}${row('C','忽略','checkbox')}</div></div>
<div class="questionLi"><h3 class="mark_name">3. <span class="colorShallow">填空题</span>输入课程术语。</h3><div class="stem_answer"><input type="text"></div></div></main>
<div id="submitConfirmPop" role="alertdialog" aria-label="交卷" hidden><p>确认交卷？</p><div class="popBottom"><a href="#" class="confirm">确定</a><a href="#" class="cancel">取消</a></div></div>`;

function pdf() {
    const stream='BT /F1 18 Tf 28 60 Td (PDF auxiliary source 42) Tj ET';
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 90] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
    const positions=[];
    let raw='%PDF-1.4\n';
    for(const [i,text] of objects.entries()){positions.push(raw.length);raw+=`${i+1} 0 obj\n${text}\nendobj\n`;}
    const start=raw.length;
    return Buffer.from(`${raw}xref\n0 ${positions.length+1}\n0000000000 65535 f \n${positions.map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
}
function docx() {
    const name=Buffer.from('word/document.xml'), data=Buffer.from('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Word 文件的试验常数为 42</w:t></w:r></w:p></w:body></w:document>');
    const compressed=deflateRawSync(data), local=Buffer.alloc(30), directory=Buffer.alloc(46), end=Buffer.alloc(22);
    local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
    directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(8,10);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(name.length,28);
    end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(directory.length+name.length,12);end.writeUInt32LE(local.length+name.length+compressed.length,16);
    return Buffer.concat([local,name,compressed,directory,name,end]);
}

const browser=await chromium.launch({headless:true});
const outcomes=[];
async function setup(opts={}){
    const context=await browser.newContext({acceptDownloads:true,viewport:opts.viewport||{width:1260,height:970}});
    const errors=[];
    await context.route('**/*',route=>{
        const url=new URL(route.request().url());
        const id=opts.differentPreview?'other-attempt':'fixture';
        const previewControl='<a href="'+preview+'?examAnswerId='+id+'">整卷预览</a>';
        const navigation=url.pathname===single&&opts.previewLink?previewControl.repeat(opts.ambiguousPreview?2:1):'';
        return route.fulfill({contentType:'text/html;charset=utf-8',body:url.pathname===result?'<p>交卷成功</p>':html+navigation});
    });
    await context.addInitScript(({uncertain,latency,receipt,questionCount,image,vision,classOnly})=>{
        window.unsafeWindow=window;
        const config={provider:'custom',protocol:'chat',model:'fixture',key:'fixture',baseUrl:'https://model.fixture.invalid/v1'};
        window.GM_getValue=(key,fallback)=>JSON.parse(localStorage.getItem('settings:'+key)||'null')??({'xxt-ai-enabled':true,'xxt-quiet-enabled':false,'xxt-ai-config':config,'xxt-ai-vision-enabled':vision||false,'xxt-ai-vision-config':config}[key]??fallback);
        window.GM_setValue=(key,value)=>localStorage.setItem('settings:'+key,JSON.stringify(value));
        window.counters={open:0,confirm:0,fill:0,text:0,models:0,images:0,prompt:''};
        document.hasFocus=()=>true;
        window.GM_xmlhttpRequest=spec=>{
            window.counters.models++;
            const message=JSON.parse(spec.data).messages[0].content;
            const content=Array.isArray(message)?message[0].text:message;
            if(Array.isArray(message))counters.images+=message.filter(part=>part.type==='image_url').length;
            window.counters.prompt=content;
            const questions=JSON.parse(content.split('\n题目：')[1].split('\n之前的平台反馈')[0]);
            const answers=questions.map(q=>({id:q.id,choices:q.type==='multiple'?['A','B']:q.type==='blank'?[]:['A'],
                ...(q.type==='blank'?{texts:['样例术语']}:{}),readable:true,confidence:uncertain&&q.id==='q-2'?0.42:0.95,explanation:`示例证据 ${q.id}`}));
            const timeout=setTimeout(()=>spec.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers})}}]})}),latency||10);
            return {abort(){clearTimeout(timeout);spec.onabort?.();}};
        };
        document.addEventListener('DOMContentLoaded',()=>{
            if(!document.querySelector('main'))return;
            if(questionCount)document.querySelector('aside').textContent='题量：'+questionCount;
            if(image){const img=document.createElement('img');img.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';img.alt='图片';document.querySelector('.answer_p').append(img);}
            const modal=document.querySelector('#submitConfirmPop');
            document.querySelector('.completeBtn').onclick=event=>{event.preventDefault();counters.open++;modal.hidden=false;};
            document.querySelector('.confirm').onclick=event=>{
                event.preventDefault();counters.confirm++;modal.hidden=true;
                if(receipt)location.href='/exam-ans/exam/test/look'+location.search;
            };
            const selected=row=>classOnly?row.querySelector('.num_option').classList.contains('check_answer'):row.getAttribute('aria-checked')==='true';
            function mark(row,checked){
                if(classOnly)row.querySelector('.num_option').classList.toggle('check_answer',checked);
                else row.setAttribute('aria-checked',String(checked));
            }
            for(const row of document.querySelectorAll('.answerBg')){
                if(classOnly)row.removeAttribute('aria-checked');
                row.onclick=()=>{
                    const checked=!selected(row);
                    const single=row.getAttribute('role')==='radio';
                    if(single)for(const item of row.parentElement.querySelectorAll('[role=radio]'))mark(item,false);
                    mark(row,single||checked);
                    counters.fill++;
                };
            }
            document.querySelector('main input').addEventListener('input',()=>counters.text++);
        });
    },opts);
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    if(opts.clock)await page.clock.install({time:new Date('2026-11-20T12:00:00+08:00')});
    await page.goto(origin+(opts.single?single:preview)+'?examAnswerId=fixture');
    await page.addScriptTag({content:bundle});
    await page.locator('[data-exam-options]').waitFor();
    return {page,context,errors};
}
const choice=(page,key)=>page.locator(`[data-exam-choice="${key}"]`);
const start=(page,action='start')=>page.locator(`[data-xxt-exam-page] [data-action="${action}"]`).click();
const message=page=>page.locator('[data-xxt-exam-page] .xxt-status-card pre');
const stats=page=>page.evaluate(()=>counters);
const waitText=(page,text)=>page.waitForFunction(text=>document.querySelector('[data-xxt-exam-page] .xxt-status-card pre').textContent.includes(text),text);
async function scenario(name,opts,check){
    const {page,context,errors}=await setup(opts);
    try{await check(page);assert.deepEqual(errors,[]);outcomes.push(name);}finally{await context.close();}
}
try {
    await scenario('reference-import-strong-preview-and-export',{uncertain:true},async page=>{
        assert.deepEqual(await page.locator('[data-homework-modes] button').allTextContents(),['章节','作业','考试']);
        const rows=await page.locator('[data-homework-modes] button').evaluateAll(list=>list.map(item=>item.getBoundingClientRect().top));
        assert(Math.max(...rows)-Math.min(...rows)<5);
        const beta=page.locator('[data-exam-beta]');
        assert(await beta.getByText('考试功能 · 测试版').isVisible());
        assert.equal(await beta.getByRole('link',{name:'提交 Issue'}).getAttribute('href'),'https://github.com/IrisBud/xuexitong-ai-assistant/issues/new/choose');
        assert.equal(await choice(page,'submit-auto').isDisabled(),true);
        await page.screenshot({path:resolve(out,'desktop-settings.png')});
        await page.locator('[data-exam-files]').setInputFiles([
            {name:'course.txt',mimeType:'text/plain',buffer:Buffer.from('课程笔记：试验常数是 42。准备后记录步骤。')},
            {name:'reference.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:docx()},
            {name:'reference.pdf',mimeType:'application/pdf',buffer:pdf()}
        ]);
        await page.waitForFunction(()=>document.querySelector('.xxt-exam-file-list').children.length===3);
        assert.equal((await stats(page)).models,0);
        await page.locator('[data-exam-strong]').check();
        await choice(page,'answer-auto').click();assert.equal(await choice(page,'submit-auto').isDisabled(),false);
        await choice(page,'submit-auto').click();
        await start(page,'solve');
        await waitText(page,'已生成答案与理由');
        const checked=await stats(page);
        assert.match(checked.prompt,/本卷与课程资料强相关/);
        assert.match(checked.prompt,/course.txt/);
        assert.match(checked.prompt,/Word 文件的试验常数为 42/);
        assert.match(checked.prompt,/PDF auxiliary source 42/);
        assert.deepEqual([checked.fill,checked.text,checked.confirm],[0,0,0]);
        const review=page.locator('[data-exam-review]');assert.equal(await review.locator('[data-state=review]').count(),1);
        assert.match(await review.innerText(),/待复查/);assert.match(await review.innerText(),/样例术语/);
        assert.match(await review.innerText(),/AI 自评 95%/);
        assert.match(await page.locator('[data-exam-confidence-note]').innerText(),/不能代表正确率或得分/);
        assert.match(await page.locator('[data-exam-usage]').innerText(),/作者不对此负责/);
        await review.scrollIntoViewIfNeeded();
        await page.screenshot({path:resolve(out,'desktop-review.png')});
        const downloadEvent=page.waitForEvent('download');await page.locator('[data-exam-export]').click();const download=await downloadEvent;
        const exported=await readFile(await download.path(),'utf8');assert.match(exported,/第 2 题 · 待复查/);assert.match(exported,/示例证据 q-3/);
        await choice(page,'answer-manual').click();assert.equal(await choice(page,'submit-auto').isDisabled(),true);
        assert.equal(await choice(page,'submit-manual').getAttribute('aria-pressed'),'true');
    });
    await scenario('auto-fill-with-uncertainty-stops-submit',{uncertain:true,viewport:{width:390,height:840}},async page=>{
        await choice(page,'answer-auto').click();await choice(page,'submit-auto').click();
        await start(page);await waitText(page,'自动交卷已停止');
        const checked=await stats(page);assert.deepEqual([checked.fill,checked.text,checked.open,checked.confirm],[1,1,0,0]);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        const rows=await page.locator('[data-homework-modes] button').evaluateAll(list=>list.map(item=>item.getBoundingClientRect().top));
        assert(Math.max(...rows)-Math.min(...rows)<5);
        await page.locator('[data-exam-review]').scrollIntoViewIfNeeded();
        await page.screenshot({path:resolve(out,'narrow-review.png')});
    });
    await scenario('auto-and-manual-submit-respect-thirty-minute-gate',{clock:true},async page=>{
        await page.locator('[data-exam-minutes]').fill('30');
        await page.locator('.completeBtn').click();assert.equal((await stats(page)).open,0);
        await choice(page,'answer-auto').click();await choice(page,'submit-auto').click();
        await start(page);await waitText(page,'距最早交卷');
        await page.clock.fastForward(29*60*1000);
        assert.equal((await stats(page)).confirm,0);
        await page.clock.fastForward(62*1000);
        await waitText(page,'已点击平台确认交卷');
        const checked=await stats(page);assert.deepEqual([checked.fill,checked.text,checked.open,checked.confirm],[3,1,1,1]);
        await start(page);await waitText(page,'本卷已有交卷请求');assert.equal((await stats(page)).confirm,1);
    });
    await scenario('preserve-existing-answer-and-do-not-submit',{},async page=>{
        await page.locator('main .answerBg').nth(1).click();
        await choice(page,'answer-auto').click();await choice(page,'submit-auto').click();
        await start(page);await waitText(page,'自动交卷已停止');
        assert.equal(await page.locator('main .answerBg').nth(1).getAttribute('aria-checked'),'true');
        assert.match(await page.locator('[data-exam-review]').innerText(),/保留人工答案/);
        assert.equal((await stats(page)).confirm,0);
    });
    await scenario('fill-with-manual-submit-and-native-confirm-gate',{clock:true},async page=>{
        await choice(page,'answer-auto').click();
        await start(page);await waitText(page,'请查看作答理由并手动交卷');
        assert.deepEqual([(await stats(page)).fill,(await stats(page)).confirm],[3,0]);
        await page.locator('.completeBtn').click();
        await page.locator('[data-exam-minutes]').fill('30');
        await page.locator('.confirm').click();
        assert.equal((await stats(page)).confirm,0);
        await page.clock.fastForward(31*60*1000);
        await page.locator('.confirm').click();
        assert.equal((await stats(page)).confirm,1);
    });
    await scenario('result-page-restores-reason-after-native-receipt',{receipt:true},async page=>{
        await choice(page,'answer-auto').click();await choice(page,'submit-auto').click();await start(page);
        await page.waitForURL('**/look?*');await page.addScriptTag({content:bundle});
        await page.locator('[data-exam-review] [data-state=ready]').first().waitFor();
        assert.equal(await page.locator('[data-exam-review] [data-state=ready]').count(),3);
    });
    await scenario('class-only-choice-controls-can-be-filled',{classOnly:true},async page=>{
        await choice(page,'answer-auto').click();await start(page);await waitText(page,'请查看作答理由并手动交卷');
        assert.equal(await page.locator('.answerBg[aria-checked]').count(),0);
        assert.equal(await page.locator('.check_answer').count(),3);
        assert.deepEqual([(await stats(page)).fill,(await stats(page)).confirm],[3,0]);
    });
    await scenario('class-only-manual-choice-is-preserved',{classOnly:true},async page=>{
        await page.locator('main .answerBg').nth(1).click();
        await choice(page,'answer-auto').click();await start(page);await waitText(page,'自动交卷已停止');
        assert(await page.locator('main .answerBg').nth(1).locator('.check_answer').count());
        assert.match(await page.locator('[data-exam-review]').innerText(),/保留人工答案/);
    });
    await scenario('one-start-opens-native-preview-and-resumes-same-attempt',{single:true,previewLink:true,classOnly:true},async page=>{
        assert.equal(await page.locator('[data-exam-files]').isDisabled(),true);
        await choice(page,'answer-auto').click();
        await Promise.all([page.waitForURL('**/preview?*'),start(page)]);
        await page.addScriptTag({content:bundle});
        await waitText(page,'请查看作答理由并手动交卷');
        assert.deepEqual([(await stats(page)).models,(await stats(page)).fill,(await stats(page)).confirm],[1,3,0]);
        assert.equal(await page.evaluate(()=>sessionStorage.getItem('xxt-exam-preview-handoff')),null);
    });
    await scenario('preview-handoff-does-not-run-on-different-attempt',{single:true,previewLink:true,differentPreview:true},async page=>{
        await choice(page,'answer-auto').click();
        await Promise.all([page.waitForURL('**/preview?*'),start(page)]);
        await page.addScriptTag({content:bundle});
        await waitText(page,'选择作答与交卷方式');
        assert.equal((await stats(page)).models,0);
        assert.equal(await page.evaluate(()=>sessionStorage.getItem('xxt-exam-preview-handoff')),null);
    });
    await scenario('ambiguous-preview-and-read-only-single-do-not-navigate',{single:true,previewLink:true,ambiguousPreview:true},async page=>{
        await start(page,'solve');await waitText(page,'请在整卷预览页生成答案');
        await start(page);await waitText(page,'未找到唯一可用');
        assert(page.url().includes(single));assert.equal((await stats(page)).models,0);
    });
    await scenario('paper-count-mismatch-does-not-write',{questionCount:6},async page=>{
        await start(page);await waitText(page,'题量与已显示题数不一致');assert.equal((await stats(page)).models,0);
    });
    await scenario('image-without-vision-is-marked-for-review',{image:true},async page=>{
        await start(page);await waitText(page,'已生成答案与理由');
        assert.match(await page.locator('[data-exam-review] [data-state=review]').innerText(),/未配置图片接口/);
    });
    await scenario('attached-question-image-reaches-vision-model',{image:true,vision:true},async page=>{
        await start(page);await waitText(page,'已生成答案与理由');
        assert.equal((await stats(page)).images,1);
        assert.equal(await page.locator('[data-exam-review] [data-state=ready]').count(),3);
    });
    await scenario('manual-verification-interrupts-a-pending-request',{latency:1200},async page=>{
        await choice(page,'answer-auto').click();await choice(page,'submit-auto').click();await start(page);
        await page.waitForFunction(()=>counters.models>0);
        await page.evaluate(()=>document.body.insertAdjacentHTML('beforeend','<div class="chapterVideoFaceMaskDiv">人工验证</div>'));
        await page.locator('[data-xxt-verification=face]').waitFor();
        await page.evaluate(()=>document.querySelector('.chapterVideoFaceMaskDiv').remove());
        await page.locator('[data-xxt-verification=waiting]').waitFor();
        const checked=await stats(page);assert.deepEqual([checked.fill,checked.open,checked.confirm],[0,0,0]);
    });
    await scenario('changing-answer-policy-aborts-a-pending-request',{latency:1200},async page=>{
        await choice(page,'answer-auto').click();await choice(page,'submit-auto').click();await start(page);
        await page.waitForFunction(()=>counters.models>0);
        await choice(page,'answer-manual').click();await waitText(page,'考试设置已变');
        assert.equal(await choice(page,'submit-auto').isDisabled(),true);
        assert.deepEqual([(await stats(page)).fill,(await stats(page)).open,(await stats(page)).confirm],[0,0,0]);
    });
    await writeFile(resolve(out,'observations.json'),JSON.stringify({scope:'Synthetic user-observed exam structures, local files and fake model. No live grade or submission.',outcomes},null,2)+'\n');
    console.log(`Exam passed ${outcomes.length} scenarios`);
} finally {await browser.close();}
