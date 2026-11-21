/* One explicit run per active exam page. This runtime only uses native exam controls. */
(() => {
    'use strict';
    const D=globalThis.XxtExamDom;
    const phase=window===window.top&&XxtPlatform.isTrustedUrl(location.href)?D.phase():'';
    globalThis.XxtExamRuntime={ownsPage:()=>Boolean(phase)};
    if(!phase||typeof GM_getValue!=='function')return;
    const initialUrl=location.href, {key,identified}=D.scope();
    const clockKey=`xxt-exam-start:${key}`, pendingKey=`xxt-exam-pending:${key}`, reportKey=`xxt-exam-report:${key}`;
    const transferKey='xxt-exam-preview-handoff';
    function takePreviewHandoff(){
        if(phase!=='paper')return null;
        const raw=sessionStorage.getItem(transferKey);
        if(!raw)return null;
        sessionStorage.removeItem(transferKey);
        try {
            const transfer=JSON.parse(raw), now=Date.now(), from=new URL(document.referrer);
            if(from.origin!==location.origin||D.phase(from)!=='single'||D.pageKey(from.href)!==transfer.source)return null;
            if(transfer.identified&&identified&&transfer.key!==key)return null;
            if(!(transfer.startedAt>0&&transfer.startedAt<=transfer.issuedAt&&transfer.issuedAt<=now&&now-transfer.issuedAt<=20000))return null;
            return transfer;
        } catch {return null;}
    }
    const handoff=takePreviewHandoff();
    const savedStart=Number(sessionStorage.getItem(clockKey));
    const now=Date.now();
    const startTime=Math.min(savedStart>0&&savedStart<=now?savedStart:now,handoff?.startedAt??now);
    if(phase!=='result')sessionStorage.setItem(clockKey,String(startTime));
    const capturedAt=performance.now();
    const elapsedAtLoad=Date.now()-startTime;
    const msRemaining=minutes=>Math.max(0,minutes*60000-elapsedAtLoad-(performance.now()-capturedAt));
    const waiting=()=>new Promise(resolve=>setTimeout(resolve,140));
    const readReport=()=>GM_getValue(reportKey,null);
    let panel, status, view, output, job, activeTest, openingPreview, previewTimeout, humanHold=false, unloaded=false;
    function notice(text){if(output&&output.textContent!==text)output.textContent=text;}
    const policy=()=>view?.policy()||{...XxtExamUI.load(),minutesValid:true,files:[]};
    const pending=()=>sessionStorage.getItem(pendingKey)==='1'||(identified&&readReport()?.submitted===true);

    function stop(text='已停止考试辅助，当前作答保留。'){
        const current=job;job=null;
        current?.request?.abort();
        const test=activeTest;activeTest=null;
        test?.abort();
        notice(text);
    }
    function cancelPreviewHandoff(){
        if(!openingPreview)return;
        clearTimeout(previewTimeout);
        if(sessionStorage.getItem(transferKey)===openingPreview)sessionStorage.removeItem(transferKey);
        openingPreview=null;
    }
    function openPaper(){
        const control=D.preview();
        if(!control){notice('未找到唯一可用的「整卷预览」，请点平台顶部入口后再开始。');return;}
        openingPreview=JSON.stringify({source:D.pageKey(initialUrl),key,identified,startedAt:startTime,issuedAt:Date.now()});
        sessionStorage.setItem(transferKey,openingPreview);
        notice('正在打开学习通整卷预览…');
        previewTimeout=setTimeout(()=>{
            cancelPreviewHandoff();
            notice('未进入整卷预览，请点平台顶部入口后再开始。');
        },8000);
        control.click();
    }
    function check(subject){
        if(job!==subject||unloaded)throw Error('考试辅助已停止。');
        if(location.href!==initialUrl||panel.dataset.studyMode!=='exam')throw Error('考试页面或板块已切换。');
        if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('考试页失去前台焦点，请重新手动开始。');
        if(XxtManualVerification.kind())throw Error('请手动完成平台验证，然后重新开始。');
        if(GM_getValue('xxt-quiet-enabled',true)&&XxtCodexCore.quietHoursAt())throw Error('夜间休息中，考试辅助保持暂停。');
    }
    function writeReport(items, at, submitted=false){
        const report={scope:key,at,items,submitted};
        GM_setValue(reportKey,report);
        view.renderReport(report);
        return report;
    }
    function markPending(){
        sessionStorage.setItem(pendingKey,'1');
        const prior=readReport();
        if(prior)GM_setValue(reportKey,{...prior,submitted:true});
    }
    function viewItem(q, answer, problem=''){
        const labels=answer?.choices?.map(value=>`${value} · ${q.options.find(o=>o.key===value)?.text||''}`);
        return {number:q.number,stem:q.text,type:q.type,image:Boolean(q.imageKey),options:q.options.map(({key,text})=>({key,text})),confidence:answer?.confidence??null,
            answer:(answer?.texts||labels||[]).join('；'), review:Boolean(problem||!answer?.readable||answer.confidence<0.8||!answer.explanation.trim()),
            explanation:[problem,answer?.explanation].filter(Boolean).join('\n')||'AI 未提供理由，请核对。'};
    }
    function snapshot(entries){return JSON.stringify(entries.map(entry=>entry.question));}
    async function solve(entries,subject,settings){
        const rows=new Map(), answers=new Map();
        const eligible=[];
        for(const entry of entries){
            const q=entry.question;
            try {
                if(q.type==='unsupported')throw Error('此题的作答控件尚未适配，请手动处理。');
                XxtCodexCore.validateQuestions([q]);
                eligible.push(entry);
            } catch(error){rows.set(q.id,viewItem(q,null,error.message));}
        }
        const vision=XxtAi.imageConfig();
        for(let offset=0;offset<eligible.length;offset+=6){
            check(subject);
            const slice=eligible.slice(offset,offset+6), questions=[], images=[], imageQuestionIds=[];
            for(const {question:q,element} of slice){
                check(subject);
                if(XxtDispatch.needsVision(q)){
                    if(!vision){rows.set(q.id,viewItem(q,null,'未配置图片接口，请手动核对图片题。'));continue;}
                    try {
                        images.push(await XxtQuestionCapture.capture(element,{guard:()=>check(subject)}));
                        imageQuestionIds.push(q.id);
                    } catch(error){check(subject);rows.set(q.id,viewItem(q,null,`题图未完整读取。${error.message}`));continue;}
                }
                questions.push(q);
            }
            if(!questions.length)continue;
            const resultCount=offset+slice.length;
            notice(`正在生成第 ${offset+1}–${resultCount} / ${eligible.length} 题的答案与理由…`);
            const examReference=XxtExamKnowledge.reference(settings.files,questions,settings.strong);
            try {
                subject.request=XxtAi.request('/solve',{questions,images,imageQuestionIds,examReference});
                const result=await subject.request.promise;
                check(subject);
                for(const q of questions){
                    const answer=result.answers.find(item=>item?.id===q.id);
                    if(answer)answers.set(q.id,answer);
                    rows.set(q.id,viewItem(q,answer,result.skipped?.find(item=>item.id===q.id)?.reason));
                }
            } catch(error) {
                check(subject);
                for(const q of questions)rows.set(q.id,viewItem(q,null,error.message));
            } finally {subject.request=null;}
            view.renderReport({at:subject.at,items:entries.map(({question})=>rows.get(question.id)).filter(Boolean)});
        }
        return {rows,answers};
    }
    async function autoSubmit(entries,answers,subject){
        for(;;){
            check(subject);
            const settings=policy();
            if(!settings.minutesValid||settings.answer!=='auto'||settings.submit!=='auto'||pending())throw Error('交卷设置或状态已变，请人工核对。');
            const wait=msRemaining(settings.minutes);
            if(!wait)break;
            notice(`已核对所有答案，距最早交卷还有 ${Math.ceil(wait/1000)} 秒。`);
            await new Promise(resolve=>setTimeout(resolve,Math.min(1000,wait)));
        }
        check(subject);
        const fresh=D.scan();
        if(snapshot(fresh)!==snapshot(entries)||D.count()!==entries.length||!fresh.every(entry=>D.matches(entry,answers.get(entry.question.id))))throw Error('试卷或现有答案已变化，等待人工核对。');
        const open=D.submit();
        if(!open||D.dialog())throw Error('找不到唯一的原生交卷入口，或已有确认弹窗。');
        open.click();
        for(let i=0;i<14&&!D.confirm();i++){await waiting();check(subject);}
        const confirm=D.confirm();
        if(!confirm)throw Error('没有出现已采集的交卷确认窗口，请人工核对。');
        check(subject);
        if(!policy().minutesValid||msRemaining(policy().minutes)>0||pending()||!fresh.every(entry=>entry.element.isConnected&&D.matches(entry,answers.get(entry.question.id))))throw Error('交卷条件已变化，请人工核对。');
        markPending();
        confirm.click();
        notice('已点击平台确认交卷，等待学习通回执。若页面未跳转，请先核对提交状态。');
    }
    async function execute(subject, settings, readOnly, fromPreview){
        check(subject);
        if(XxtFonts?.prepare)await XxtFonts.prepare(document,()=>check(subject));
        let entries=D.scan();
        if(fromPreview){
            for(let i=0;i<24;i++){
                const count=D.count();
                if(entries.length&&(count===null||count===entries.length))break;
                await waiting();
                check(subject);
                entries=D.scan();
            }
        }
        if(!entries.length||entries.length>XxtCodexCore.pageQuestionLimit)throw Error('整卷题目未就绪或超过 256 题。');
        if(D.count()!==null&&D.count()!==entries.length)throw Error('页面题量与已显示题数不一致，请展开全部试题。');
        const full=snapshot(entries), prior=entries.map(D.read);
        const {rows,answers}=await solve(entries,subject,settings);
        check(subject);
        const items=entries.map(({question:q})=>rows.get(q.id)||viewItem(q,null,'这一题没有返回可用结果。'));
        writeReport(items,subject.at,pending());
        if(readOnly||settings.answer==='manual'){view.revealReport();notice('已生成答案与理由，请查看面板并手动作答。');return;}
        const current=D.scan();
        if(full!==snapshot(current)||JSON.stringify(prior)!==JSON.stringify(current.map(D.read)))throw Error('题目或人工答案已变化，已保存作答理由，请人工核对。');
        let filled=0;
        for(const entry of current){
            check(subject);
            const id=entry.question.id, item=rows.get(id), answer=answers.get(id);
            if(item.review)continue;
            try {
                if(await D.fill(entry,answer,()=>check(subject)))filled++;
                else {item.review=true;item.explanation+='\n已有作答与建议不同，保留人工答案。';}
            } catch(error) {
                check(subject);
                item.review=true;item.explanation+='\n'+error.message;
                writeReport(items,subject.at);
                throw Error('第 '+entry.question.number+' 题：'+error.message);
            }
        }
        writeReport(items,subject.at);
        view.revealReport();
        if(items.some(item=>item.review)){notice(`已核对 ${filled} 题。待复查题请手动处理，自动交卷已停止。`);return;}
        if(settings.submit==='auto')await autoSubmit(current,answers,subject);
        else notice(`已核对 ${filled} 题，请查看作答理由并手动交卷。`);
    }

    async function start(readOnly,fromPreview=false){
        if(phase==='result'||(phase==='single'&&readOnly)){notice('请在整卷预览页生成答案。');return;}
        if(D.dialog()){notice('请先关闭学习通的交卷确认窗口。');return;}
        if(job||openingPreview){notice('本卷正在处理，可点击停止。');return;}
        if(activeTest){notice('请等 AI 连接测试结束后再开始。');return;}
        const settings=policy();
        if(settings.importing||!settings.minutesValid){notice('请等资料读取完成，并核对最早交卷时间。');return;}
        if(phase==='paper'&&settings.strong&&!settings.files.length){notice('请先导入知识文件，或取消勾选强相关。');return;}
        if(pending()&&!readOnly&&settings.answer==='auto'){notice('本卷已有交卷请求，先核对平台回执。');return;}
        if(!GM_getValue('xxt-ai-enabled',!!XxtAi.load().key)){notice('请先在接口页选择并配置 AI。');return;}
        if(XxtManualVerification.kind()){notice('请先手动处理学习通验证。');return;}
        humanHold=false;status.setVerification('');
        const subject={at:Date.now()};job=subject;
        try {
            check(subject);
            if(phase==='single'){openPaper();return;}
            if(navigator.locks)await navigator.locks.request(`xxt:exam:${key}`,{ifAvailable:true},async lock=>{
                if(!lock)throw Error('另一个页面正在处理同一份试卷。');
                await execute(subject,settings,readOnly,fromPreview);
            });
            else await execute(subject,settings,readOnly,fromPreview);
        } catch(error){if(job===subject){cancelPreviewHandoff();notice(error.message);}}
        finally{if(job===subject)job=null;}
    }
    function changed(){if(job||activeTest||openingPreview){cancelPreviewHandoff();stop('考试设置已变，当前操作停止。需要时请重新开始。');}}
    function mount(){
        panel=document.createElement('section');panel.dataset.xxtCodexPanel='true';panel.dataset.xxtExamPage=phase;
        panel.setAttribute('aria-label','学习助手考试面板');
        const title=document.createElement('strong');title.textContent='学习助手';
        const actions=document.createElement('div');
        for(const [action,label] of [['connect','测试 AI'],['start','开始自动'],['solve','预览 AI 答案'],['stop','停止']]){
            const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;actions.append(button);
        }
        output=document.createElement('pre');
        const details=document.createElement('details');
        const summary=document.createElement('summary');summary.textContent='考试作答记录';details.append(summary);
        status=XxtAssistantTheme.decorate(panel,{title,actions,output,details,playbackRate:1,onRateChange:()=>{},muted:false,onMutedChange:()=>{},onAiChange:changed,onQuietChange:changed,studyControls:true,examCallbacks:{phase,start,change:changed}});
        view=status.homeworkUI.exam;
        actions.querySelector('[data-action=stop]').onclick=()=>{cancelPreviewHandoff();stop();};
        actions.querySelector('[data-action=connect]').onclick=async event=>{
            if(job||activeTest||openingPreview||XxtManualVerification.kind())return;
            const button=event.currentTarget;button.disabled=true;
            const test=XxtAi.request('/test-selected',{});activeTest=test;
            try {const result=await test.promise;if(activeTest===test)XxtAssistantTheme.testResult(button,result);}
            catch(error){if(activeTest===test)notice(error.message);}
            finally{if(activeTest===test)activeTest=null;button.disabled=false;}
        };
        document.body.append(panel);
        const previous=readReport();
        if(previous)view.renderReport(previous);
        notice(phase==='paper'?'选择作答与交卷方式，再开始本卷。':phase==='result'?'交卷结果以学习通回执为准。':'点击「开始考试辅助」可打开整卷预览。');
    }
    function sync(){
        const type=XxtManualVerification.kind();
        if(type&&!humanHold){humanHold=true;cancelPreviewHandoff();stop(XxtManualVerification.action(type));}
        status.setVerification(type||(humanHold?'waiting':''),'开始考试辅助');
        panel.toggleAttribute('data-xxt-exam-dialog',D.dialog());
        view.showGate(msRemaining(policy().minutes));
    }
    function intercept(event){
        if(phase!=='paper'||location.href!==initialUrl)return;
        if(D.isSubmitControl(event.target)){
            const settings=policy();
            if(!settings.minutesValid||msRemaining(settings.minutes)>0){
                event.preventDefault();event.stopImmediatePropagation();
                notice(settings.minutesValid?'尚未达到设置的最早交卷时间。':'请先填写有效的最早交卷时间。');
            } else if(event.isTrusted&&event.type==='click'){
                if(job)stop('已转为人工交卷。');
                if(event.target.closest('.confirm'))markPending();
            }
        } else if(job&&event.isTrusted&&event.target.closest?.('.questionLi'))stop('检测到人工操作，当前作答保留。');
    }
    mount();sync();
    const observer=new MutationObserver(changes=>{if(changes.some(change=>!panel.contains(change.target)))sync();});
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden','src']});
    const timer=setInterval(sync,650);
    window.addEventListener('click',intercept,true);
    window.addEventListener('input',intercept,true);
    window.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')intercept(event);},true);
    function foreground(){if((job||activeTest)&&(document.hidden||!document.hasFocus()))stop('考试页离开前台，自动操作已停止。');}
    window.addEventListener('blur',foreground);document.addEventListener('visibilitychange',foreground);
    document.addEventListener('xxt-profiles-changed',changed);
    document.addEventListener('xxt-platform-settings-changing',changed);
    window.addEventListener('pagehide',()=>{unloaded=true;clearTimeout(previewTimeout);observer.disconnect();clearInterval(timer);stop();},{once:true});
    if(handoff&&!humanHold)void start(false,true);
})();
