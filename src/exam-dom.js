/* Visible controls observed on the Chaoxing exam paper and native submit dialog. */
(() => {
    'use strict';
    const plain = node => (node?.textContent || '').replace(/\s+/g,' ').trim();
    const available = node => !!node?.isConnected && node.getClientRects().length>0 &&
        !['hidden','collapse'].includes(getComputedStyle(node).visibility);
    const enabled = node => available(node) && !node.disabled && !node.classList.contains('disabled') && node.getAttribute('aria-disabled')!=='true';
    const openPath = /^\/exam-ans\/mooc2\/exam\/preview\/?$/;
    const activePath = /^\/exam-ans\/exam\/test\/reVersionTestStartNew\/?$/;
    const resultPath = /^\/exam-ans\/exam\/test\/look\/?$/;
    const submitSelector = '.sub-button a.completeBtn';
    const dialogSelector = '#submitConfirmPop[role="alertdialog"][aria-label="交卷"]';
    const confirmSelector = dialogSelector+' .popBottom a.confirm';
    const digest = value => {
        let a=2166136261,b=3339675911;
        for(const c of value){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),2246822519);}
        return [a,b].map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');
    };
    function pageKey(value) {
        const url=new URL(value);
        url.hash='';
        return digest(url.href);
    }
    function phase(url = new URL(location.href)) {
        if(openPath.test(url.pathname))return 'paper';
        if(activePath.test(url.pathname))return 'single';
        if(resultPath.test(url.pathname))return 'result';
        return '';
    }
    function scope(url = new URL(location.href)) {
        const params = Object.fromEntries([...url.searchParams].map(([key,value])=>[key.toLowerCase(),value]));
        const fields = [...document.querySelectorAll('input[type="hidden"][name="examAnswerId" i]')];
        const validId = id => Boolean(id && /^[\w-]{1,80}$/.test(id) && !/^(?:0|null|undefined)$/i.test(id));
        const attempt = [params.examanswerid, fields.length===1?fields[0].value:''].find(validId);
        if(attempt){
            const key=digest(url.origin+'\nanswer\n'+attempt);
            return {key,progressScope:key,identified:true};
        }
        const key=digest(url.href);
        const relationAttempt=params.examrelationanswerid;
        const progressScope=phase(url)==='paper'&&validId(relationAttempt)
            ? digest(url.origin+'\nrelation-answer\n'+relationAttempt)
            : key;
        return {key,progressScope,identified:false};
    }
    function one(selector, text, doc=document) {
        const matches=[...doc.querySelectorAll(selector)].filter(node=>enabled(node)&&plain(node)===text&&!node.closest('[data-xxt-codex-panel]'));
        return matches.length===1?matches[0]:null;
    }
    const submit = () => one(submitSelector,'交卷');
    const confirm = () => one(confirmSelector,'确定');
    const dialog = () => [...document.querySelectorAll(dialogSelector)].some(available);
    function preview() {
        if(phase()!=='single')return null;
        const control=one('a,button,[role="button"],[onclick]','整卷预览');
        if(!control||control.closest('.questionLi,[role="alertdialog"],#topicNumberScroll'))return null;
        const target=control.getAttribute('target');
        if(target&&target.toLowerCase()!=='_self')return null;
        const href=control.getAttribute('href')?.trim();
        if(href&&!href.startsWith('#')&&!/^javascript:/i.test(href)){
            const destination=new URL(href,location.href);
            if(destination.origin!==location.origin||phase(destination)!=='paper')return null;
        }
        return control;
    }

    function scan(doc = document) {
        return [...doc.querySelectorAll('.questionLi')].filter(node=>available(node)&&!node.parentElement?.closest('.questionLi,[data-xxt-codex-panel]')).map((element,index)=>{
            const title = element.querySelector('h3.mark_name,.mark_name');
            const heading = title?.cloneNode(true);
            heading?.querySelectorAll('.colorShallow,.asFlagBtn').forEach(el=>el.remove());
            const rawText=plain(heading), label=plain(element.querySelector('h2.type_tit,.colorShallow')) || plain(title);
            const number=Number((element.getAttribute('aria-label')||'').match(/题目\s*(\d+)/)?.[1]||rawText.match(/^(\d+)[.、．]/)?.[1])||index+1;
            const rows = [...element.querySelectorAll('.stem_answer .answerBg[role="radio"],.stem_answer .answerBg[role="checkbox"]')].filter(available);
            const fields = [...element.querySelectorAll('.stem_answer input[type="text"],.stem_answer textarea')].filter(el=>enabled(el)&&!el.readOnly);
            const media = [...element.querySelectorAll('img')].filter(el=>available(el)&&!el.closest('.asFlagBtn'));
            const options=rows.map((row,i)=>{
                const key=plain(row.querySelector('.num_option,.num_option_dx'))||String.fromCharCode(65+i);
                const content=row.querySelector('.answer_p');
                const image=!!content?.querySelector('img');
                return {key,text:plain(content)|| (image ? `图片选项 ${key}` : ''),...(image ? {imageKey:key} : {})};
            });
            let type = 'unsupported';
            const role=rows[0]?.getAttribute('role');
            if(title && (rawText || media.length) && rows.length>=2 && rows.length<=20 && !fields.length &&
                rows.every(row=>row.getAttribute('role')===role) && options.every(o=>/^[A-T]$/.test(o.key)&&o.text) && new Set(options.map(o=>o.key)).size===rows.length) {
                if (role==='checkbox' && !/^(?:单选|判断)/.test(label)) type='multiple';
                if (role==='radio' && !/多选题/.test(label)) type=/判断题/.test(label)&&rows.length===2?'boolean':'single';
            } else if (rawText && !rows.length && fields.length && fields.length<=20) {
                if(/填空题/.test(label))type='blank';
                if(/简答题|问答题|论述题|计算题/.test(label)&&fields.length===1)type='essay';
            }
            const imageKey=media.length?digest(JSON.stringify(media.map(img=>[img.currentSrc||img.getAttribute('src')||img.getAttribute('data-original'),img.getAttribute('alt')]))):'';
            const question={id:`q-${index+1}`,number,type,text:rawText||`第 ${number} 题`,options,
                ...(imageKey?{imageKey,requiresVision:true}:{}),...(fields.length&&!rows.length?{slots:fields.length}:{})};
            return {question,element,rows,fields,media};
        });
    }

    function read(entry) {
        if(entry.question.type==='unsupported'||!entry.element.isConnected)return null;
        if(entry.rows.length){
            if(entry.rows.some(row=>!entry.element.contains(row)))return null;
            try {
                return entry.rows.flatMap((row,i)=>XxtCodexDom.selected(row)?[entry.question.options[i].key]:[]).sort();
            } catch {
                return null;
            }
        }
        if(entry.fields.some(field=>!entry.element.contains(field)))return null;
        return entry.fields.map(field=>field.value.trim());
    }
    const same = (left,right) => JSON.stringify(left)===JSON.stringify(right);
    const target = (entry,answer) => entry.rows.length
        ? answer.choices?.map(value=>value.trim()).sort()
        : answer.texts?.map(value=>value.trim());
    const matches = (entry,answer) => !!answer && same(read(entry),target(entry,answer));
    const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
    function reviewOptions(entry) {
        const {question,fields,rows,media}=entry;
        const value=read(entry);
        if(!value)return null;
        const imageSources = images => images.map(img=>img.currentSrc||img.getAttribute('src')).filter(Boolean);
        return {
            value,
            stemImages:imageSources(media.filter(img=>!img.closest('.stem_answer'))),
            options:question.options.map((option,index)=>({...option,images:imageSources(media.filter(img=>rows[index].contains(img)))})),
            limits:fields.map(field=>field.maxLength),
        };
    }
    function manualAnswer(entry, values) {
        const {question,rows,fields}=entry;
        if(!values.length || values.some(value=>!value.trim()))throw Error('请选择答案或填完所有输入框。');
        if(rows.length){
            if(values.some(value=>!question.options.some(option=>option.key===value)) ||
                new Set(values).size!==values.length || (question.type!=='multiple'&&values.length!==1))throw Error('所选选项与当前题目不符。');
            return {choices:values};
        }
        if(!fields.length || values.length!==fields.length)throw Error('答案与当前输入框不符。');
        return {texts:values.map(value=>value.trim())};
    }
    async function fill(entry,answer,guard,{replace=false,onWrite=()=>{}}={}){
        guard();
        if(!entry.element.isConnected)throw Error('当前题目已更换。');
        const current=read(entry), expected=target(entry,answer);
        if(!current||!expected)throw Error('无法确认平台作答状态。');
        if(same(current,expected))return true;
        if(current.some(Boolean)&&!replace)return false;
        if(entry.rows.length){
            const remove=replace&&entry.question.type==='multiple'?current.filter(key=>!expected.includes(key)):[];
            const changes=[...remove.map(key=>[key,false]),...expected.filter(key=>!current.includes(key)).map(key=>[key,true])];
            const controls=changes.map(([key,checked])=>({key,checked,row:entry.rows[entry.question.options.findIndex(o=>o.key===key)]}));
            if(controls.some(({row})=>!enabled(row)))throw Error('原生答题选项已变化。');
            for(const {key,checked,row} of controls){
                guard();
                row.click();
                for(let attempt=0;attempt<10&&read(entry)?.includes(key)!==checked;attempt++){await pause(70);guard();}
                const updated=read(entry);
                if(updated?.includes(key)!==checked)throw Error('页面未确认选项已更新。');
                onWrite(updated);
            }
        } else {
            for(const [i,field] of entry.fields.entries()){
                guard();
                if(!enabled(field)||field.readOnly)throw Error('原生答题输入框已变化。');
                if(field.maxLength>=0&&expected[i].length>field.maxLength)throw Error('答案超过原生输入框限长。');
                if(field.value.trim()===expected[i])continue;
                field.value=expected[i];
                field.dispatchEvent(new Event('input',{bubbles:true}));
                field.dispatchEvent(new Event('change',{bubbles:true}));
                if(field.value.trim()===expected[i])onWrite(read(entry));
            }
        }
        guard();
        if(!matches(entry,answer))throw Error('页面未确认答案，请人工核对。');
        return true;
    }

    function count(doc=document) {
        const values=[...new Set((doc.body?.innerText||'').match(/题量\s*[:：]\s*\d+/g)?.map(s=>Number(s.match(/\d+/)[0]))||[])];
        return values.length===1&&values[0]>0?values[0]:null;
    }
    function isSubmitControl(node) {
        const control=node?.closest?.(`${submitSelector},${confirmSelector}`);
        return Boolean(control && /^(交卷|确定)$/.test(plain(control)));
    }
    globalThis.XxtExamDom={phase,scope,preview,scan,read,fill,matches,count,submit,confirm,dialog,isSubmitControl,pageKey,reviewOptions,manualAnswer,paperKey:entries=>digest(JSON.stringify(entries.map(({question})=>question)))};
})();
