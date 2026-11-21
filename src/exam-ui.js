(() => {
    'use strict';
    const settingKey='xxt-exam-settings';
    const defaults={answer:'manual',submit:'manual',minutes:0,strong:false};
    const load=()=>{
        const saved=GM_getValue(settingKey,defaults)||{};
        const answer=saved.answer==='auto'?'auto':'manual';
        const minutes=Number.isInteger(saved.minutes)&&saved.minutes>=0&&saved.minutes<=360?saved.minutes:0;
        return {answer,submit:answer==='auto'&&saved.submit==='auto'?'auto':'manual',minutes,strong:saved.strong===true};
    };
    const el=(tag,content,cls)=>{
        const node=document.createElement(tag);
        if(content)node.textContent=content;
        if(cls)node.className=cls;
        return node;
    };
    const button=text=>Object.assign(el('button',text),{type:'button'});
    const formatTime=ms=>{
        const seconds=Math.ceil(ms/1000);
        return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    };
    function plainReport(report){
        return ['考试作答理由','每题右上角是 AI 对该题建议答案的自评确定度。它只能辅助复查，不能代表正确率或得分。低于 80% 的题会标为待复查。',report.at?new Date(report.at).toLocaleString('zh-CN'):'', ...report.items.map(item=>{
            const confidence=item.confidence===null?'':` · AI 自评 ${Math.round(100*item.confidence)}%`;
            return [`第 ${item.number} 题${item.review?' · 待复查':''}${confidence}${item.image?' · 含图':''}`,item.stem,
                item.options.map(o=>`${o.key}. ${o.text}`).join('\n'),`建议答案 ${item.answer||'未生成'}`,item.explanation].filter(Boolean).join('\n');
        })].filter(Boolean).join('\n\n');
    }
    function mount({host,callbacks={}}){
        const phase=callbacks.phase||'', onPaper=phase==='paper', section=el('section',null,'xxt-exam-options');
        section.dataset.examOptions='true';section.hidden=true;
        let settings=load(), minutesValid=true, files=[], report=null, importing=false;
        const flag=el('p',null,'xxt-exam-context');
        flag.textContent=onPaper?'AI 会处理当前整卷预览。':phase==='result'?'查看本卷保存在本机的作答理由。':'在学习通打开试卷，点击「开始考试辅助」进入整卷预览。';
        const usage=el('p','考试功能原为俗称「水课」的课程练习和获准使用 AI 的测验开发。请遵守校方及任课教师的考试规则。违反规则使用时，因被检测、成绩处理或纪律处分产生的后果由使用者自行承担，作者不对此负责。','xxt-exam-muted');usage.dataset.examUsage='true';
        const mode=el('section',null,'xxt-exam-group');mode.append(el('h3','答题与交卷'));
        const submitHint=el('p',null,'xxt-exam-muted');
        function choice(label,key,choices){
            const title=el('div',label,'xxt-exam-field-title');
            const rows=el('div',null,'xxt-mode-group');rows.setAttribute('role','group');rows.setAttribute('aria-label',label);
            const items=choices.map(([value,text])=>{
                const control=button(text);control.dataset.examChoice=`${key}-${value}`;
                control.onclick=()=>{
                    if(value===settings[key])return;
                    set(key,value);
                    if(key==='answer'&&value==='manual')settings.submit='manual';
                    persist();
                };
                rows.append(control);
                return [value,control];
            });
            mode.append(title,rows);
            return ()=>{for(const [value,control] of items){
                control.setAttribute('aria-pressed',String(settings[key]===value));
                control.disabled=key==='submit'&&value==='auto'&&settings.answer!=='auto';
            }};
        }
        const renderAnswer=choice('作答方式','answer',[['auto','AI 直接作答'],['manual','AI 给答案，手动作答']]);
        const renderSubmit=choice('交卷方式','submit',[['auto','AI 直接交卷'],['manual','手动交卷']]);
        const time=el('input');time.type='number';time.inputMode='numeric';time.min='0';time.max='360';time.step='1';time.value=String(settings.minutes);time.dataset.examMinutes='true';
        time.setAttribute('aria-describedby','xxt-exam-time-note');
        const timeLabel=el('label',null,'xxt-exam-time');timeLabel.append(el('span','最早交卷（分钟）'),time);
        const timeNote=el('p',null,'xxt-exam-muted');timeNote.id='xxt-exam-time-note';
        timeNote.textContent='从脚本首次识别本卷的答题时间起算。0 表示立即允许。学习通到时自动交卷由平台控制。';
        time.oninput=()=>{
            minutesValid=time.value!==''&&time.validity.valid;
            time.setAttribute('aria-invalid',String(!minutesValid));
            if(minutesValid)set('minutes',Number(time.value));else callbacks.change?.();
            persist();
        };
        mode.append(submitHint,timeLabel,timeNote);

        const materials=el('section',null,'xxt-exam-group');materials.append(el('h3','知识文件'));
        const filesInput=el('input');filesInput.type='file';filesInput.multiple=true;filesInput.accept=XxtExamKnowledge.accept;filesInput.dataset.examFiles='true';
        const fileLabel=el('label',null,'xxt-exam-file');fileLabel.append(el('span','导入参考资料'),filesInput);filesInput.disabled=!onPaper;
        const fileNote=el('p','支持 TXT、Markdown、CSV、TSV、JSON、可复制文字的 PDF、DOCX。单个文件最多 8 MB。','xxt-exam-muted');
        const fileList=el('ul',null,'xxt-exam-file-list');fileList.hidden=true;
        const importance=el('input');importance.type='checkbox';importance.checked=settings.strong;importance.dataset.examStrong='true';
        importance.onchange=()=>{set('strong',importance.checked);persist();};
        const importantLabel=el('label',null,'xxt-exam-importance');importantLabel.append(importance,el('span','考试与知识文件强相关'));
        const priorityNote=el('p','开始作答时会把相关片段发送给已配置的 AI。选中后优先采用资料中能支持答案的内容。','xxt-exam-muted');
        const importStatus=el('p',null,'xxt-exam-muted');importStatus.setAttribute('role','status');importStatus.hidden=true;
        materials.append(fileLabel,fileNote,fileList,importantLabel,priorityNote,importStatus);
        filesInput.onchange=async()=>{
            const picked=[...filesInput.files];filesInput.value='';if(!picked.length)return;
            if(picked.length+files.length>8){noteImport('最多导入 8 份知识文件。');return;}
            importing=true;filesInput.disabled=true;callbacks.change?.();noteImport('正在本地读取资料…');
            const messages=[];
            try {
                for(const source of picked){
                    try {
                        const file=await XxtExamKnowledge.read(source);
                        if(files.reduce((sum,item)=>sum+item.chars,0)+file.chars>XxtExamKnowledge.maxCharacters)throw Error('全部资料超出 32 万字符，请移除无关文件。');
                        files.push(file);
                    } catch(error){messages.push(`${source.name.slice(0,110)} · ${error.message}`);}
                }
            } finally {importing=false;filesInput.disabled=!onPaper;}
            renderFiles();noteImport(messages.join('\n')||`已读取 ${files.length} 份资料，本次整卷预览有效。`);
        };
        function noteImport(text){importStatus.hidden=!text;importStatus.textContent=text;}
        function renderFiles(){
            fileList.replaceChildren();fileList.hidden=!files.length;
            for(const file of files){
                const row=el('li'),name=el('span',`${file.name} · ${file.chars} 字符${file.skipped?` · ${file.skipped} 页无可读文字`:''}`),remove=button('移除');
                remove.setAttribute('aria-label',`移除 ${file.name}`);
                remove.onclick=()=>{files=files.filter(item=>item!==file);renderFiles();noteImport(files.length?`已导入 ${files.length} 份资料。`:'已移除全部资料。');callbacks.change?.();};
                row.append(name,remove);fileList.append(row);
            }
        }

        const reviewSection=el('section',null,'xxt-exam-group'), reviewHead=el('div',null,'xxt-exam-review-head');
        const exportButton=button('导出理由');exportButton.dataset.examExport='true';exportButton.disabled=true;
        const progress=el('p',null,'xxt-exam-muted');progress.setAttribute('role','status');
        const confidenceNote=el('p','每题右上角是 AI 对该题建议答案的自评确定度。它只能辅助复查，不能代表正确率或得分。低于 80% 的题会标为待复查。','xxt-exam-muted');confidenceNote.dataset.examConfidenceNote='true';
        const review=el('div',null,'xxt-exam-review');review.dataset.examReview='true';review.setAttribute('role','region');review.setAttribute('aria-label','作答理由和待复查题目');review.tabIndex=0;
        reviewHead.append(el('h3','作答理由'),exportButton);reviewSection.append(reviewHead,confidenceNote,progress,review);
        exportButton.onclick=()=>{
            if(!report?.items.length)return;
            const url=URL.createObjectURL(new Blob(['\ufeff',plainReport(report)],{type:'text/plain;charset=utf-8'}));
            const a=document.createElement('a');a.href=url;a.download=`考试作答理由-${new Date(report.at).toISOString().slice(0,10)}.txt`;a.click();
            setTimeout(()=>URL.revokeObjectURL(url),1000);
        };
        function renderReport(next){
            report=next;review.replaceChildren();
            const items=next?.items||[];exportButton.disabled=!items.length;
            if(!items.length){review.append(el('p',phase==='result'?'本卷暂无可读取的理由记录。':'运行后，这里会显示逐题答案与理由。','xxt-exam-muted'));progress.textContent='';return;}
            const uncertain=items.filter(item=>item.review).length;
            progress.textContent=`已生成 ${items.length} 题理由${uncertain?` · ${uncertain} 题待复查`:''}`;
            for(const item of items){
                const row=el('article',null,'xxt-exam-reason');row.dataset.state=item.review?'review':'ready';
                const head=el('div',null,'xxt-exam-reason-head');head.append(el('strong',`第 ${item.number} 题`));
                if(item.review)head.append(el('span','待复查','xxt-exam-review-label'));
                if(item.confidence!==null)head.append(el('span',`AI 自评 ${Math.round(100*item.confidence)}%`,'xxt-exam-confidence'));
                const answer=el('p',item.answer||'未生成可用答案','xxt-exam-answer');
                answer.setAttribute('aria-label',`建议答案 ${item.answer||'未生成'}`);
                row.append(head,el('p',item.stem,'xxt-exam-stem'),answer,el('p',item.explanation));review.append(row);
            }
        }
        function set(key,value){settings[key]=value;callbacks.change?.();}
        function persist(write=true){
            if(write&&minutesValid)GM_setValue(settingKey,settings);
            renderAnswer();renderSubmit();
            submitHint.textContent=settings.answer==='manual'?'选择 AI 直接作答后可启用自动交卷。':'';
            submitHint.hidden=!submitHint.textContent;
        }
        function showGate(ms){
            const timeText=minutesValid?(settings.minutes===0?'0 表示立即允许。':ms>0?`距允许交卷还有 ${formatTime(ms)}。`:'已达到最早交卷时间。'):'请输入 0 到 360 的整数分钟。';
            timeNote.textContent=(onPaper||phase==='single')?`${timeText} 从脚本首次识别本卷答题时计时。平台到时会自行交卷。`:'从脚本首次识别本卷答题时计时，0 表示立即允许。';
        }
        const revealReport=()=>{
            const pane=section.closest('.xxt-workspace-pane');
            if(pane&&!pane.hidden&&!section.hidden&&reviewHead.getClientRects().length)pane.scrollTop+=reviewHead.getBoundingClientRect().top-pane.getBoundingClientRect().top;
        };
        persist(false);renderReport(null);
        section.append(flag,usage,mode,materials,reviewSection);host.append(section);
        return {section,policy:()=>({...settings,minutesValid,importing,files:[...files]}),renderReport,revealReport,showGate};
    }
    globalThis.XxtExamUI={mount,load};
})();
