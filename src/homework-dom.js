/* Homework DOM adapter based on user-collected question/editor/button contracts. */
(() => {
 'use strict';
 const plain=node=>(node?.textContent||'').replace(/\s+/g,' ').trim();
 const hash=value=>{let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0).toString(16);};
 function richBlanks(node){
  const slots=[];
  for(const row of node.querySelectorAll(':scope > .stem_answer .blankItemDiv')){
   if(row.closest('.questionLi')!==node)continue;
   const labels=row.querySelectorAll(':scope > .tiankong');
   const inputs=row.querySelectorAll(':scope > .blankItemInp');
   const number=labels.length===1?Number(plain(labels[0]).match(/^第\s*(\d+)\s*空[：:]?$/)?.[1]):0;
   const body=inputs.length===1?inputs[0]:null;
   if(!number||!body)return null;
   const wrappers=body.querySelectorAll(':scope > .textDIV'),activators=body.querySelectorAll(':scope > .InpDIV');
   if(wrappers.length!==1||activators.length!==1)return null;
   const wrapper=wrappers[0],activator=activators[0];
   const fields=wrapper.querySelectorAll('textarea'),frames=wrapper.querySelectorAll('iframe[id^="ueditor_"]');
   if(fields.length!==1||frames.length!==1)return null;
   const field=fields[0],frame=frames[0],suffix=field.id.match(/^answerEditor(\d+)$/)?.[1];
   if(!suffix||activator.id!=='inpDiv'+suffix)return null;
   slots.push({number,label:labels[0],row,wrapper,activator,field,frame});
  }
  slots.sort((a,b)=>a.number-b.number);
  return slots.length>0&&slots.length<=20&&slots.every((slot,index)=>slot.number===index+1) ? slots : null;
 }
 function readingEntries(node,title,number,form){
  const groups=node.querySelectorAll(':scope > .readComprehensionQues');
  if(!title||groups.length!==1)return null;
  const group=groups[0],items=[...group.children];
  const media='img,svg,math,canvas,audio,video,iframe,object,embed';
  if(!items.length||title.querySelector(media)||group.querySelector(media))return null;
  const passage=title.innerText.replace(/^\s*\d+\s*[.．、]\s*/,'').replace(/^\s*[（(]阅读理解[）)]\s*/,'').trim();
  if(!passage)return null;
  const entries=[];
  for(const [index,item] of items.entries()){
   const headings=item.querySelectorAll(':scope > .reader_answer_tit');
   const heading=headings[0],kind=plain(heading?.querySelector(':scope > .read_type'));
   const fields=item.querySelectorAll(':scope > input[type="hidden"]');
   const field=fields[0],stems=item.querySelectorAll(':scope > .stem_answer');
   if(!item.matches('.reading_answer[qtype="0"]')||headings.length!==1||!/^[（(]?单选题[）)]?$/.test(kind)||
      fields.length!==1||field.form!==form||field.disabled||stems.length!==1)return null;
   const rows=[...stems[0].children];
   const qid=rows[0]?.getAttribute('qid')||'';
   if(!/^[A-Za-z0-9_-]{1,64}$/.test(qid)||rows.length<2||rows.length>20||
      rows.some(row=>!row.matches('.hoverDiv[qtype="15"]')||row.getAttribute('qid')!==qid||
       !/^\s*(?:return\s+)?addChoice\s*\(/.test(row.getAttribute('onclick')||'')))return null;
   const options=rows.map(row=>{
    const markers=row.querySelectorAll(':scope > .num_option[data]');
    const bodies=row.querySelectorAll(':scope > .answer_p');
    const key=markers.length===1?markers[0].getAttribute('data'):'';
    return {key:plain(markers[0])===key?key:'',text:bodies.length===1?plain(bodies[0]):''};
   });
   const stem=heading.innerText.replace(/^\s*[（(]\s*\d+\s*[）)]\s*/,'').replace(/^\s*[（(]单选题[）)]\s*/,'').trim();
   if(!stem||options.some(option=>!/^[A-T]$/.test(option.key)||!option.text)||
      new Set(options.map(option=>option.key)).size!==options.length)return null;
   entries.push({element:item,title:heading,rows,readingField:field,question:{
    id:'reading-'+qid,number:number+'.'+(index+1),type:'single',
    text:'阅读材料：\n'+passage+'\n\n小题：\n'+stem,options
   }});
  }
  return entries;
 }
 function scan(doc){
  const form=doc.querySelector('.fanyaMarking #submitForm');if(!form)return[];
  return [...form.querySelectorAll('.questionLi.singleQuesId[id^="question"]')].filter(node=>!node.parentElement?.closest('.questionLi')).flatMap(node=>{
   const title=node.querySelector(':scope > h3.mark_name'),kind=plain(title?.querySelector('.colorShallow'));
   const id=node.id,number=node.getAttribute('aria-label')?.match(/题目\s*(\d+)/)?.[1]||plain(title).match(/^(\d+)\./)?.[1]||id;
   if(node.getAttribute('typename')==='阅读理解'||/^[（(]?阅读理解[）)]?$/.test(kind)){
    return readingEntries(node,title,number,form)||{element:node,title,rows:[],question:{id,number,type:'unsupported',text:plain(title),options:[]}};
   }
   const rows=[...node.querySelectorAll(':scope > .stem_answer.qtDetail > .answerBg[role="radio"],:scope > .stem_answer.qtDetail > .answerBg[role="checkbox"]')];
   const richSlots=/填空题/.test(kind)?richBlanks(node):null;
   const richLayout=node.querySelector(':scope > .stem_answer .blankItemDiv .textDIV');
   const editor=node.querySelector(':scope > .stem_answer > .eidtDiv');
   const fields=editor?[...editor.querySelectorAll('textarea')].filter(f=>f.id==='answer'+id.slice('question'.length)):[...node.querySelectorAll(':scope > .stem_answer input[type="text"],:scope > .stem_answer textarea')].filter(n=>n.getClientRects().length&&!n.disabled&&!n.readOnly);
   const frames=editor?[...editor.querySelectorAll('iframe[id^="ueditor_"]')]:[];
   const options=rows.map(row=>({key:plain(row.querySelector('.num_option,.num_option_dx')),text:plain(row.querySelector('.answer_p'))}));
   const programming=/^[（(]?编程题[）)]?$/.test(kind);
   let type='unsupported';
   if(/判断题/.test(kind)&&rows.length===2&&options.every(o=>o.key&&o.text)&&new Set(options.map(o=>o.key)).size===2)type='boolean';
   if(/单选题|多选题/.test(kind)&&rows.length>=2&&options.every(o=>/^[A-T]$/.test(o.key)&&o.text)&&new Set(options.map(o=>o.key)).size===rows.length)type=/多选题/.test(kind)?'multiple':'single';
   if(/计算题|简答题|论述题/.test(kind)&&fields.length===1&&frames.length===1)type='essay';
   if(programming&&!rows.length&&editor&&fields.length===1&&frames.length===1&&
      editor.querySelectorAll('iframe,textarea').length===2&&fields[0].name===fields[0].id)type='essay';
   if(/填空题/.test(kind)&&!rows.length&&(richSlots||!richLayout&&fields.length>=1&&fields.length<=20&&!frames.length))type='blank';
   const images=[...(title?.querySelectorAll('img')||[])];
   const visualSources=images.map(img=>img.getAttribute('src')||img.getAttribute('data-original')||img.getAttribute('data-collector-image')||'image');
   const code=programming&&type==='essay', text=code?title.innerText.trim():plain(title);
   return{element:node,title,rows,fields,frames,richSlots,question:{id,number,type,text,options,
    ...(code?{answerFormat:'code',codeLanguage:XxtProgrammingCode.languageFor(text)}:{}),
    ...(['essay','blank'].includes(type)?{slots:richSlots?.length??fields.length}:{}),...(images.length?{requiresVision:true,imageKey:hash(JSON.stringify(visualSources))}:{})}};
  });
 }
 function buttons(doc){const host=doc.querySelector('.subNav #submitFocus');if(!host)return{save:null,submit:null};const candidates=[...host.querySelectorAll(':scope > a')];const one=list=>list.length===1?list[0]:null;return{save:one(candidates.filter(n=>!n.classList.contains('completeBtn')&&plain(n)==='暂时保存')),submit:one(candidates.filter(n=>n.classList.contains('completeBtn')&&n.getAttribute('role')==='button'&&plain(n)==='提交'))};}
 const comparable=value=>globalThis.XxtHomework.comparable(value);
 function htmlText(value,doc){const t=doc.createElement('template');t.innerHTML=String(value||'');for(const n of t.content.querySelectorAll('br'))n.replaceWith('\n');return comparable(t.content.textContent);}
 const visible=n=>!!n?.isConnected&&!!n.getClientRects().length&&n.ownerDocument.defaultView.getComputedStyle(n).visibility!=='hidden';
 function editorFor(entry,slot){
  const field=slot?.field||entry.fields[0],frame=slot?.frame||entry.frames[0],doc=entry.element.ownerDocument;
  const win=typeof unsafeWindow!=='undefined'&&unsafeWindow.document===doc?unsafeWindow:doc.defaultView;
  const matches=Object.values(win.UE?.instants||{}).filter(e=>e&&e.key===field?.id&&e.textarea===field&&e.iframe===frame);
  const e=matches.length===1?matches[0]:null;
  if(!e||!['setContent','getContent','sync'].every(k=>typeof e[k]==='function')||!e.body?.isConnected||e.body!==frame.contentDocument?.body||!e.body.isContentEditable||e.options?.readonly||field.disabled||field.readOnly||(!slot&&!visible(frame)))throw Error('富文本编辑器尚未可用或对应关系变化，未写入答案。');
  // The observed runtime reports isReady !== true for five live, editable
  // bodies. Readiness is established by the actual bound body and methods.
  return e;
 }
 function slotEditor(entry,slot){
  const {number,field,frame,wrapper,activator}=slot,doc=entry.element.ownerDocument;
  const current=richBlanks(entry.element)?.[number-1];
  if(!current||Object.keys(slot).some(key=>current[key]!==slot[key])||
     [field,frame,activator].some(node=>!node.id||doc.querySelectorAll('#'+CSS.escape(node.id)).length!==1)||
     !field.form||field.form!==entry.element.closest('form')||
     activator.matches(':disabled,[aria-disabled=true]')||
     frame.closest('[hidden],[aria-hidden=true],[inert]')||
     (!visible(frame)&&!(visible(activator)&&visible(wrapper.parentElement)&&doc.defaultView.getComputedStyle(wrapper).display==='none')))
   throw Error('第 '+number+' 空的编辑器或原生展开入口无法确认。');
  return editorFor(entry,slot);
 }
 function slotText(entry,slot,editor=slotEditor(entry,slot)){
  const doc=entry.element.ownerDocument,values=[editor.getContent(),editor.body.innerHTML,slot.field.value].map(value=>htmlText(value,doc));
  if(values.some(value=>value!==values[0]))throw Error('第 '+slot.number+' 空的页面显示与保存字段不一致，请人工核对。');
  return values[0];
 }
 function readProgrammingEditor(entry,editor=editorFor(entry),expectedLanguage){
  const doc=entry.element.ownerDocument,field=entry.fields[0],frame=entry.frames[0];
  if(!field.form||field.form!==entry.element.closest('form')||
     [field,frame].some(node=>doc.querySelectorAll('#'+CSS.escape(node.id)).length!==1))
   throw Error('编程题编辑器与作答字段无法一一对应。');
  const values=[editor.body.innerHTML,editor.getContent(),field.value].map(value=>{
   const parsed=doc.createElement('template');
   parsed.innerHTML=String(value||'');
   if(parsed.content.querySelector('img,audio,video,iframe,object,embed,table,hr'))
    throw Error('编程题已有非文本作答，请保留内容并人工检查。');
   const block=parsed.content.querySelector('pre > code');
   if(expectedLanguage&&block?.getAttribute('lang')!==expectedLanguage)
    throw Error('编程题代码块语言未同步，请人工检查。');
   for(const br of parsed.content.querySelectorAll('br'))br.replaceWith('\n');
   for(const block of parsed.content.querySelectorAll('p,div,pre'))block.append('\n');
   const text=parsed.content.textContent.replace(/^[ \t\u00a0]+/gm,indent=>indent.replace(/\u00a0/g,' '));
   return XxtProgrammingCode.codeText(text);
  });
  if(values.some(value=>value!==values[0]))
   throw Error('编程题显示或提交字段未同步，请保留现有内容并人工检查。');
  return values[0];
 }
 function writeEditor(editor,value,language){
  const escaped=value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const html=language
   ? '<pre><code lang="'+language+'">'+escaped.replace(/^[ \t]+/gm,indent=>indent.replace(/ /g,'&nbsp;')).replace(/\n/g,'<br>')+'</code></pre>'
   : '<p>'+escaped.replace(/\r?\n/g,'<br>')+'</p>';
  editor.setContent(html);editor.fireEvent?.('contentChange');editor.sync();
 }
 async function applyRichBlanks(entry,answer,guard){
  const prior=entry.richSlots.map(slot=>slotText(entry,slot));
  for(const [index,slot] of entry.richSlots.entries()){
   guard();
   const value=answer.texts[index];
   if(prior[index]===comparable(value))continue;
   const unchanged=()=>entry.richSlots.every((item,i)=>slotText(entry,item)===prior[i]);
   if(!unchanged())throw Error('填空作答已变化，保留现有内容。');
   if(!visible(slot.frame)){
    slot.activator.click();
    for(let i=0;i<12&&!visible(slot.frame);i++){await new Promise(resolve=>setTimeout(resolve,80));guard();}
   }
   guard();
   if(!visible(slot.frame)||!unchanged())throw Error('第 '+slot.number+' 空未就绪或已有人工修改。');
   const editor=slotEditor(entry,slot);
   writeEditor(editor,value);guard();
   if(slotText(entry,slot)!==comparable(value))throw Error('第 '+slot.number+' 空未通过回读，未保存或提交。');
   prior[index]=comparable(value);
  }
 }
 function markedChoices(entry){
  return entry.rows.flatMap((row,i)=>{
   const input=row.querySelector('input[type="radio"],input[type="checkbox"]'),marker=row.querySelector('.num_option,.num_option_dx');
   return input?.checked||row.getAttribute('aria-checked')==='true'||row.classList.contains('check_answer')||row.classList.contains('check_answer_dx')||marker?.classList.contains('check_answer')||marker?.classList.contains('check_answer_dx')?[entry.question.options[i].key]:[];
  }).sort();
 }
 function choices(entry){
  const marked=markedChoices(entry);
  if(entry.readingField){
   const field=entry.readingField;
   const fields=entry.element.querySelectorAll(':scope > input[type="hidden"]');
   if(!entry.element.isConnected||fields.length!==1||fields[0]!==field||
      field.disabled||!field.form||field.form!==entry.element.closest('form'))
    throw Error('阅读理解第 '+entry.question.number+' 小题的作答字段已变化，请人工核对。');
   const value=field.value.trim();
   if(!value&&!marked.length)return [];
   if(marked.length===1&&marked[0]===value)return marked;
   throw Error('阅读理解第 '+entry.question.number+' 小题的页面选项与作答字段不一致，请人工核对。');
  }
  const field=entry.element.querySelector('input[type="hidden"][id="answer'+entry.element.id.slice('question'.length)+'"]');
  const value=String(field?.value||'').trim();
  if(marked.length)return marked;
  if(!value)return[];
  if(/^[A-T]+$/.test(value)&&[...value].every(k=>entry.question.options.some(o=>o.key===k)))return[...value].sort();
  if(entry.question.type==='boolean'&&/^(true|false)$/i.test(value))return entry.question.options.filter(o=>(value.toLowerCase()==='true'?/^(对|正确|√)$/:/^(错|错误|×)$/).test(o.text)).map(o=>o.key);
  throw Error('选项保存字段已有内容，但选中状态无法确认；保留现有作答。');
 }
 function readEntry(entry){
  if(entry.question.type==='essay'){
   const text=entry.question.answerFormat==='code'?readProgrammingEditor(entry):htmlText(editorFor(entry).body.innerHTML,entry.element.ownerDocument);
   return{id:entry.question.id,texts:[text]};
  }
  if(entry.question.type==='blank')return{id:entry.question.id,texts:entry.richSlots
   ?entry.richSlots.map(slot=>slotText(entry,slot)):entry.fields.map(f=>comparable(f.value))};
  if(entry.rows.length)return{id:entry.question.id,choices:choices(entry)};
  return{id:entry.question.id};
 }
 function create({doc=document,identity,assertCurrent=()=>{},policy=()=>({}),readState=()=>null,writeState=()=>{},timeout=8000}={}){
  const owned=new WeakMap();
  const getPage=()=>{const entries=scan(doc);return{identity:identity(),entries,questions:entries.map(e=>e.question)};};
  const read=page=>page.entries.map(readEntry);
  const ensure=(entry,answer)=>{
   const current=readEntry(entry),key=entry.question.type==='essay'||entry.question.type==='blank'?'texts':'choices';
   const requested=entry.question.answerFormat==='code'?globalThis.XxtHomework.answerValue(entry.question,answer):answer;
   const now=JSON.stringify(current[key]),prior=owned.get(entry.element),expected=JSON.stringify(requested[key]);
   if(prior&&prior!==now)throw Error('检测到人工修改，保留作答并取消后续操作。');
   if((current[key]||[]).some(Boolean)&&!prior&&now!==expected)throw Error('已有作答与AI答案不同，保留内容；请先人工检查。');
  };
  async function apply(page,answers,guard){
   if(readState(page.identity))throw Error('此作业存在提交记录，先人工检查平台状态。');
   const entries=page.entries.filter(e=>answers.some(a=>a.id===e.question.id));
   for(const entry of entries){guard();const answer=answers.find(a=>a.id===entry.question.id);ensure(entry,answer);if(entry.question.type==='essay')editorFor(entry);}
   for(const entry of entries){
    guard();const answer=answers.find(a=>a.id===entry.question.id);ensure(entry,answer);
    if(entry.question.type==='essay'){
     const e=editorFor(entry),code=entry.question.answerFormat==='code';
     if(code){
      const value=globalThis.XxtHomework.answerValue(entry.question,answer).texts[0];
      const language=XxtProgrammingCode.editorLanguage(entry.question.codeLanguage);
      const alreadyFilled=readProgrammingEditor(entry,e)===value;
      if(!alreadyFilled){writeEditor(e,value,language);guard();}
      if(readProgrammingEditor(entry,e,alreadyFilled?undefined:language)!==value)throw Error('编程题代码格式未通过回读，未保存或提交。');
     }else{
      const value=answer.texts[0];writeEditor(e,value);guard();
      if([e.getContent(),entry.fields[0].value,e.body.innerHTML].some(v=>htmlText(v,doc)!==comparable(value)))throw Error('主观题显示或提交字段未同步，未执行收尾操作。');
     }
    }else if(entry.richSlots){
     await applyRichBlanks(entry,answer,guard);
    }else if(entry.question.type==='blank'){
     for(let i=0;i<entry.fields.length;i++){guard();const f=entry.fields[i];if(!visible(f)||f.disabled||f.readOnly)throw Error('填空框不可编辑。');const proto=f.tagName==='TEXTAREA'?doc.defaultView.HTMLTextAreaElement.prototype:doc.defaultView.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(f,answer.texts[i]);for(const type of ['input','change'])f.dispatchEvent(new doc.defaultView.Event(type,{bubbles:true}));}
    }else{
     for(let i=0;i<entry.rows.length;i++){guard();const row=entry.rows[i],key=entry.question.options[i].key,want=answer.choices.includes(key),has=choices(entry).includes(key);if(want!==has&&(entry.question.type==='multiple'||want)){if(!visible(row))throw Error('选项不可见，已停止。');row.click();await new Promise(r=>setTimeout(r,80));}}
    }
    guard();const actual=readEntry(entry),expected=globalThis.XxtHomework.answerValue(entry.question,answer);if(JSON.stringify(globalThis.XxtHomework.answerValue(entry.question,actual,{readBack:true}))!==JSON.stringify(expected))throw Error('答案未正确写入，未保存或提交。');owned.set(entry.element,JSON.stringify(actual.texts||actual.choices));
   }
  }
  async function finish(kind,{page,guard,signal}){
   guard();if(readState(page.identity))throw Error('已有提交记录，本轮不重复提交。');
   const button=buttons(doc)[kind];if(!visible(button)||button.classList.contains('disabled')||button.getAttribute('aria-disabled')==='true')throw Error('作业收尾按钮缺失、不唯一或不可用。');
   if(kind==='submit'&&(!globalThis.XxtHomework.normalize(policy()).subjective||policy().subjective!=='ai'))throw Error('未允许AI主观题，不能直接提交。');
   const success=kind==='save'?/^(?:暂时)?保存成功[!！。]?$/u:/^(?:作业)?提交成功[!！。]?$/u;
   const hits=()=>[...doc.querySelectorAll('div,span,p,[role="status"],[role="alert"]')].filter(n=>!n.closest('[data-xxt-codex-panel],.questionLi,script,style')&&visible(n)&&success.test(plain(n)));
   const prior=new Set(hits()),changed=new WeakSet();
   const observer=new MutationObserver(records=>{for(const m of records){const target=m.target.nodeType===1?m.target:m.target.parentElement;if(target?.closest('[data-xxt-codex-panel]'))continue;for(let n=target;n&&n!==doc.body;n=n.parentElement)changed.add(n);for(const n of m.addedNodes)if(n.nodeType===1){changed.add(n);for(const c of n.querySelectorAll('*'))changed.add(c);}}});
   observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden']});
   try{
    if(kind==='submit')writeState(page.identity,'pending');
    guard();button.click();const since=Date.now();let confirmationClicked=false;
    while(Date.now()-since<timeout){
     if(signal.aborted)throw Error('已停止，未继续处理确认窗口。');
     if(hits().some(n=>!prior.has(n)||changed.has(n))){if(kind==='submit')writeState(page.identity,'confirmed');return{state:'confirmed'};}
     guard();
     if(kind==='submit'&&!confirmationClicked){const confirm=globalThis.XxtCodexDom?.confirmation(doc,'submit');if(confirm){guard();confirm.click();confirmationClicked=true;}}
     await new Promise(r=>setTimeout(r,80));
    }
    return{state:'unknown'};
   }finally{observer.disconnect();}
  }
  return{verified:true,scan:getPage,read,apply,finish,assertCurrent,policy};
 }
 globalThis.XxtHomeworkDom={scan,buttons,editorFor,readEntry,create};
})();
