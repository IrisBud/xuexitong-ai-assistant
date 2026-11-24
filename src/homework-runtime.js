/* A standalone homework coordinator; chapter scheduling never owns this page. */
(() => {
 'use strict';
 const ownsPage=()=>window===window.top&&XxtPlatform.isTrustedUrl(location.href)&&/\/mooc2\/work\/dowork\/?$/.test(location.pathname);
 globalThis.XxtHomeworkRuntime={ownsPage};
 if(!ownsPage()||typeof GM_getValue!=='function')return;
 const H=globalThis.XxtHomework,A=globalThis.XxtHomeworkDom;
 const settingsKey='xxt-homework-settings',submissionsKey='xxt-homework-submissions';
 const settings=()=>H.normalize(GM_getValue(settingsKey,{}));
 const quiet=()=>GM_getValue('xxt-quiet-enabled',true)&&XxtCodexCore.quietHoursAt();
 const ai=()=>GM_getValue('xxt-ai-enabled',!!XxtAi.load().key);
 const identity=()=>{
  const u=new URL(location.href),parts=[...u.searchParams].filter(([k])=>/^(courseid|classid|clazzid|cpi|workid|workanswerid)$/i.test(k)).map(([k,v])=>[k.toLowerCase(),v]).sort();
  const value=u.origin+u.pathname+JSON.stringify(parts);let a=2166136261,b=3339675911;for(const c of value){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),2246822519);}return[a,b].map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');
 };
 const initialIdentity=identity();let panel,output,view,controller,activeTest,verificationStatus,disposed=false,manualHold=false,wasBusy=false;
 const notify=text=>{if(output)output.textContent=text;};
 const stop=(message='已停止作业操作，当前填写保持不变。')=>{controller?.cancel();activeTest?.abort();XxtAi.cancelImageTest();notify(message);};
 function syncVerification(type = XxtManualVerification.kind()){
  if(type&&!manualHold){
   manualHold=true;
   stop(`检测到人工验证，作业操作已暂停。${XxtManualVerification.action(type)}`);
   view?.cancelReview(false);
  }
  verificationStatus?.setVerification(type || (manualHold ? 'waiting' : ''), '作答当前作业');
  return type;
 }
 function guard(){
  if(disposed||identity()!==initialIdentity)throw Error('当前作业或账号已变化，请刷新后重新开始。');
  const type=syncVerification();
  if(type)throw Error(`检测到人工验证，已暂停。${XxtManualVerification.action(type)}`);
  if(manualHold)throw Error('人工验证后仍保持暂停，请显式点击作答当前作业。');
  if(quiet())throw Error('夜间休息中，作业操作保持暂停；不会自动续填或续交。');
  if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('作业页失去前台焦点，已停止；请回到此页后显式开始。');
  if(settings().mode!=='homework')throw Error('请切换到作业模式。');
  if(!ai())throw Error('作业作答需要接入AI，请先选择并配置接口。');
 }
 const readSubmission=id=>(GM_getValue(submissionsKey,[])||[]).find(x=>x.id===id)?.state;
 const writeSubmission=(id,state)=>{const list=(GM_getValue(submissionsKey,[])||[]).filter(x=>x.id!==id);list.push({id,state,at:Date.now()});GM_setValue(submissionsKey,list.slice(-100));};
 async function ask({questions,signal}){
  guard();await globalThis.XxtFonts?.prepare(document,guard);XxtCodexCore.validateQuestions(questions,XxtCodexCore.pageQuestionLimit);
  const entries=A.scan(document),visual=entries.filter(e=>questions.some(q=>q.id===e.question.id)&&XxtDispatch.needsVision(e.question));
  if(visual.length&&!XxtAi.imageConfig())throw Error(`当前有${visual.length}道图片题，请先配置并测试图片接口；本轮未填写或提交。`);
  const images=[],imageQuestionIds=[];
  for(const e of visual){guard();if(signal.aborted)throw Error('已停止。');notify(`正在准备第${e.question.number}题图片（${images.length+1}/${visual.length}）…`);const target=e.question.type==='essay'?e.title:e.element;images.push(await XxtQuestionCapture.capture(target,{guard:()=>{if(signal.aborted)throw Error('已停止。');guard();}}));imageQuestionIds.push(e.question.id);}
  guard();notify('题目已准备，正在等待AI作答…');const job=XxtAi.request('/solve',{questions,images,imageQuestionIds});
  const abort=()=>job.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)job.abort();
  try{const response=await job.promise;guard();if(signal.aborted)throw Error('已停止。');return response;}finally{signal.removeEventListener('abort',abort);}
 }
 function mount(){
  if(panel||!document.body||!A.scan(document).length)return;
  panel=document.createElement('section');panel.dataset.xxtCodexPanel='true';panel.setAttribute('aria-label','学习助手作业面板');
  const title=document.createElement('strong');title.textContent='学习助手';
  const actions=document.createElement('div');
  for(const[action,label]of[['connect','测试 AI'],['start','开始自动'],['solve','预览 AI 答案'],['stop','停止']]){const b=document.createElement('button');b.type='button';b.dataset.action=action;b.textContent=label;actions.append(b);}
  output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:0';
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='作业处理说明';details.append(summary);const note=document.createElement('p');note.textContent='只处理当前打开的作业，不自动切换下一份。高级选词填空、共享文章子题等仍待相应真实结构适配。目录完成或提交提示不等于满分。';details.append(note);
  const adapter=A.create({doc:document,identity,assertCurrent:guard,policy:settings,readState:readSubmission,writeState:writeSubmission});
  controller=H.createController({adapter,ask,notify,changed:value=>{wasBusy=value;}});
  const action=operation=>async state=>{try{return await operation(state);}catch(error){notify(error?.message||'作业操作未完成，请检查设置后重试。');throw error;}};
  const callbacks={review:action(async state=>{guard();return controller.review(state);}),run:action(async state=>{if(!XxtManualVerification.requiresManual())manualHold=false;guard();return controller.run(state);}),preview:action(async state=>{guard();const result=await controller.preview(state);notify(result.answers.map(a=>{
   const question=result.questions.find(q=>q.id===a.id);
   const list=question?.answerFormat==='code'?H.answerValue(question,a)?.texts||['AI 未返回符合题目语言的源代码。']:a.texts||a.choices;
   return `第${question?.number||a.id}题：${question?.answerFormat==='code'?'\n':''}${(list||[]).join('、')}`;
  }).join('\n\n'));})};
  const status=XxtAssistantTheme.decorate(panel,{title,actions,output,details,playbackRate:1,onRateChange:()=>{},muted:false,onMutedChange:()=>{},onAiChange:()=>stop('设置已更改，作业操作已停止；请显式开始。'),onQuietChange:()=>{if(quiet())stop('夜间休息中，作业操作已停止。');},studyControls:true,homeworkCallbacks:callbacks});
  view=status.homeworkUI;
  verificationStatus=status;
  actions.querySelector('[data-action=stop]').onclick=()=>{stop();view.cancelReview(false);};
  actions.querySelector('[data-action=connect]').onclick=async event=>{if(quiet()||XxtManualVerification.requiresManual()){notify('休息或人工验证期间不测试AI。');return;}stop('正在测试AI接口…');const b=event.currentTarget;b.disabled=true;try{activeTest=XxtAi.request('/test-selected',{});const result=await activeTest.promise;notify(result.success?'AI连接测试通过。':'部分接口测试未通过。');XxtAssistantTheme.testResult(b,result);}catch(e){notify(e.message);}finally{activeTest=null;b.disabled=false;}};
  document.body.append(panel);notify('当前是作业页，请选择“作业”模式；默认不答主观题、作答后不额外保存或提交。');
 }
 function refresh(){mount();syncVerification();}
 const observer=new MutationObserver(changes=>{
  if(changes.some(change=>!panel?.contains(change.target)))refresh();
 });
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden','src']});
 refresh();
 const monitor=setInterval(()=>{if(wasBusy){try{guard();}catch(e){stop(e.message);view?.cancelReview(false);notify(e.message);}}},200);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'&&wasBusy){stop('作业页已切至后台，操作已停止。');view?.cancelReview(false);}});
 document.addEventListener('xxt-profiles-changed',()=>{if(wasBusy)stop('接口配置变化，旧请求已取消。');});
 document.addEventListener('xxt-platform-settings-changing',()=>{stop('学校来源设置已变化，请刷新页面后手动继续。');view?.cancelReview(false);});
 window.addEventListener('pagehide',()=>{disposed=true;observer.disconnect();clearInterval(monitor);stop('页面已离开。');},{once:true});
})();
