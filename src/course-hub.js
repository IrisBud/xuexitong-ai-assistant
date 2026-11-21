/* Course entry and queue. Native links only; completion always comes from the platform. */
(() => {
    'use strict';
    if(typeof GM_getValue!=='function')return;
    const read=(key,fallback)=>GM_getValue('xxt-hub-'+key,fallback),write=(key,value)=>GM_setValue('xxt-hub-'+key,value);
    const topPage=window===window.top,personal=XxtPlatform.isTrustedUrl(location.href)&&(/^https:\/\/i\.chaoxing\.com\/(?:base\/?)?$/.test(location.origin+location.pathname)||XxtPlatform.isSchoolUrl(location.href)&&/^\/(?:base\/?)?$/.test(location.pathname));
    const listPage=/^\/visit\/interaction$/.test(location.pathname)&&XxtPlatform.isCourseUrl(location.href);
    const nativeUrl=value=>{try{const u=new URL(value,location.href);if(!XxtPlatform.isCourseUrl(u.href)||!/^\/visit\/stucoursemiddle$/.test(u.pathname))return null;const course=u.searchParams.get('courseid'),clazz=u.searchParams.get('clazzid'),cpi=u.searchParams.get('cpi');return course&&clazz&&cpi?{href:u.href,key:course+'/'+clazz,course,clazz,cpi}:null;}catch{return null;}};

    const identity=()=>{const p=new URLSearchParams(location.search);return(p.get('courseId')||p.get('courseid')||'')+'/'+(p.get('clazzid')||p.get('clazzId')||'');};
    const account=()=>{const values=Object.fromEntries(document.cookie.split(';').map(v=>{const i=v.indexOf('=');return[v.slice(0,i).trim(),v.slice(i+1)];}).filter(([k])=>['_uid','UID'].includes(k)));const uid=values._uid||values.UID||'';if(!/^\d{1,24}$/.test(uid))return '';let h=2166136261;for(const char of uid)h=Math.imul(h^char.charCodeAt(0),16777619);return(h>>>0).toString(16);};
    const visible=node=>!!node&&node.isConnected&&!node.closest('[hidden],[aria-hidden="true"]')&&getComputedStyle(node).display!=='none'&&node.getClientRects().length>0;
    const el=(tag,text,parent)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(parent)parent.append(node);return node;};
    const button=(text,parent,action)=>{const b=el('button',text,parent);b.type='button';b.onclick=()=>Promise.resolve().then(action).catch(e=>status(e.message));return b;};
    let host,body,optionsRoot,statusNode,queue=null,tab=null,control=null,busy=false,closed=false,booted=false,homeOpened=false,navigating=false,starting=false,catalogSignature='',menuSignature='',queueSignature='';
    let tabReady=typeof GM_getTab!=='function'||typeof GM_saveTab!=='function',selectionRead=false;
    let pacingStart=0,restUntil=0,gapUntil=0,lastMedia=null,mediaGapArmed=false;
    const styles=el('style');styles.textContent=`
    [data-xxt-hub-hidden="true"]{display:none!important}
    [data-xxt-hub] button{font:inherit;cursor:pointer;border:1px solid var(--line,#b9c7d9);border-radius:10px;padding:5px 9px;margin:4px 5px 4px 0;background:var(--surface,#f7faff);color:inherit}
    [data-xxt-hub] button:disabled{opacity:.4;cursor:not-allowed}
    [data-xxt-hub] button:active:not(:disabled){background:var(--button,#e3edff)}
    [data-xxt-hub] button:focus-visible{outline:2px solid var(--accent,#2459d9);outline-offset:2px}
    [data-xxt-hub] label,[data-hub-settings] label{display:block;margin:6px 0}
    [data-xxt-hub] small,[data-hub-settings] small{display:block;color:var(--muted,#52617a)}
    [data-xxt-hub] ol{padding-left:24px;max-height:210px;overflow:auto}
    [data-xxt-hub] li{margin:6px 0;overflow-wrap:anywhere}
    [data-xxt-hub] input[type=number],[data-hub-settings] input[type=number]{width:65px}
    [data-xxt-hub] input[type=search]{width:100%;box-sizing:border-box}

    #xxt-course-hub{position:fixed;right:18px;bottom:18px;z-index:2147483646;width:min(440px,calc(100vw - 36px));box-sizing:border-box;text-align:left}
    #xxt-course-hub [hidden]{display:none!important}
    #xxt-course-hub .xxt-shell{height:min(650px,calc(100dvh - 36px));max-height:calc(100dvh - 36px)}
    #xxt-course-hub[data-hub-collapsed=true] .xxt-shell{height:auto}
    #xxt-course-hub .xxt-head{padding:16px;gap:10px;cursor:default}
    #xxt-course-hub .xxt-head strong{font-size:15px;line-height:1.5;letter-spacing:0}
    #xxt-course-hub .xxt-brand{width:34px;height:34px;border-radius:12px}
    #xxt-course-hub .xxt-brand svg{width:20px;height:20px}
    #xxt-course-hub .xxt-hub-fold{flex-shrink:0;padding:6px 10px;min-height:34px;margin:0;box-shadow:none}
    #xxt-course-hub .xxt-scene-art{inset:64px 0 0;opacity:.75}
    #xxt-course-hub .xxt-scene-art img{width:100%;height:100%;object-fit:cover;object-position:center;opacity:.8}
    #xxt-course-hub .xxt-body{display:flex;flex-direction:column;gap:12px;min-height:0;max-height:none;padding:12px;overflow:hidden;background:linear-gradient(180deg,color-mix(in srgb,var(--scene),transparent 48%),color-mix(in srgb,var(--scene),transparent 22%));backdrop-filter:none;-webkit-backdrop-filter:none}
    #xxt-course-hub .xxt-hub-controls{flex:0 0 auto}
    #xxt-course-hub .xxt-actions{grid-template-columns:minmax(0,1fr);margin:0 0 8px}
    #xxt-course-hub .xxt-actions button{min-height:40px;margin:0}
    #xxt-course-hub .xxt-hub-status{margin:0;font-size:11px;line-height:1.7;color:var(--muted);overflow-wrap:anywhere}
    #xxt-course-hub .xxt-hub-workspace{display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px;flex:1;min-height:0}
    #xxt-course-hub .xxt-hub-nav{display:flex;flex-direction:column;gap:6px;border-right:1px solid var(--line);padding-right:8px}
    #xxt-course-hub .xxt-hub-nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:44px;min-height:54px;padding:6px 2px;margin:0;border-color:transparent;background:transparent;box-shadow:none;color:var(--muted);font-size:11px;transform:none}
    #xxt-course-hub .xxt-hub-nav svg{width:19px;height:19px}
    #xxt-course-hub .xxt-hub-nav button[aria-selected=true]{color:var(--accent);background:var(--surface);border-color:var(--line)}
    #xxt-course-hub .xxt-hub-pages{min-width:0;min-height:0;display:flex;flex-direction:column}
    #xxt-course-hub .xxt-hub-pane{flex:1;min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--line) transparent;scrollbar-gutter:stable;padding:0 3px 8px 0;outline-offset:-2px}
    #xxt-course-hub .xxt-hub-pane>details{border:0;padding:0;margin:0;color:var(--ink)}
    #xxt-course-hub .xxt-hub-count{display:block;font-size:12px;font-weight:600;color:var(--ink);margin:2px 0 8px}
    #xxt-course-hub [data-hub-courses]{list-style:none;padding:0;max-height:none;overflow:visible;margin:0}
    #xxt-course-hub [data-hub-courses]>li{margin:0;padding:10px 4px;border-bottom:1px solid var(--line)}
    #xxt-course-hub [data-hub-courses]>li[data-selected=true]{background:var(--surface)}
    #xxt-course-hub [data-hub-courses] label{display:flex;align-items:flex-start;gap:8px;margin:0;line-height:1.65;cursor:pointer}
    #xxt-course-hub input[type=checkbox]{width:17px;height:17px;flex:0 0 17px;accent-color:var(--accent);margin:3px 0 0}
    #xxt-course-hub .xxt-hub-course-title{min-width:0;overflow-wrap:anywhere;word-break:normal;color:var(--ink)}
    #xxt-course-hub .xxt-hub-order{display:flex;align-items:center;gap:6px;padding:6px 0 0 25px;flex-wrap:wrap}
    #xxt-course-hub .xxt-hub-order small{font-size:10px;margin-right:auto;color:var(--accent)}
    #xxt-course-hub .xxt-hub-order button{min-height:32px;font-size:11px;padding:4px 8px;margin:0;box-shadow:none}
    #xxt-course-hub .xxt-hub-queue-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:12px}
    #xxt-course-hub .xxt-hub-queue-actions button{min-height:38px;padding:6px;margin:0;font-size:12px}
    #xxt-course-hub [data-hub-queue]{max-height:none;overflow:visible;margin:0;padding-left:20px}
    #xxt-course-hub [data-hub-queue]>small{margin:0 0 8px -20px;font-size:12px;color:var(--ink)}
    #xxt-course-hub [data-hub-settings] label{display:flex;align-items:flex-start;gap:8px;line-height:1.7;margin:9px 0}
    #xxt-course-hub [data-hub-settings] small{font-size:10px;line-height:1.8}
    #xxt-course-hub [data-hub-settings] fieldset{min-width:0;margin:16px 0 10px;padding:12px;border:1px solid var(--line);border-radius:12px}
    #xxt-course-hub [data-hub-settings] legend{padding:0 5px;font-size:12px;color:var(--ink)}
    #xxt-course-hub [data-hub-settings] input[type=number]{width:65px;margin-left:auto;padding:4px 6px;flex-shrink:0}
    #xxt-course-hub :is(button,input,a):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    #xxt-course-hub button:disabled{opacity:.45;cursor:not-allowed;transform:none}
    #xxt-course-hub ::selection{background:var(--accent);color:var(--scene)}
    @media(hover:hover) and (pointer:fine){#xxt-course-hub button:not(:disabled):hover{background:color-mix(in srgb,var(--surface),var(--accent) 15%);border-color:var(--accent)}}
    @media(max-width:600px){
      #xxt-course-hub .xxt-hub-workspace{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:10px}
      #xxt-course-hub .xxt-hub-nav{flex-direction:row;border:0;border-bottom:1px solid var(--line);padding:0 0 8px;gap:6px}
      #xxt-course-hub .xxt-hub-nav button{flex:1;width:auto;min-height:38px;flex-direction:row;gap:6px}
      #xxt-course-hub .xxt-head{padding:12px;gap:8px}
      #xxt-course-hub .xxt-head strong{font-size:14px}
    }
    @media(forced-colors:active){#xxt-course-hub .xxt-body{background:Canvas;color:CanvasText}#xxt-course-hub .xxt-hub-nav button[aria-selected=true]{outline:1px solid Highlight}#xxt-course-hub .xxt-hub-course-title{color:CanvasText}}
    `;(document.head||document.documentElement).append(styles);
    function status(text){if(statusNode)statusNode.textContent=text;}
    function save(){if(!tab||typeof GM_saveTab!=='function')return Promise.resolve(false);tab.xxtCourseQueue=queue?structuredClone(queue):null;queueSignature='';renderQueue();return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('队列保存未确认，请手动重试')),5000);GM_saveTab(structuredClone(tab),()=>{clearTimeout(timeout);resolve(true);});}).catch(error=>{if(queue)queue.state='paused';status(error.message);return false;});}
    function queueProblem(){
        if(!queue)return '尚未创建课程队列，请先在课程列表勾选课程，再点“开始所选课程”。';
        if(queue.v!==1||!Array.isArray(queue.items)||!queue.items.length||queue.items.length>80||!Array.isArray(queue.results)||!Number.isInteger(queue.index)||queue.index<0||queue.index>queue.items.length)return '课程队列记录不完整，请重新选择课程。';
        const current=account();
        if(!current)return '无法读取当前账号标识，请确认已登录后刷新；未启动课程队列。';
        if(!queue.account||queue.account!==current)return '当前账号与创建队列时不同，请在当前账号下重新选择课程。';
        if(!Number.isFinite(queue.at)||Date.now()-queue.at>=12*3600000||queue.at>Date.now()+60000)return '课程队列已超过12小时或时间失效，请重新选择课程。';
        if(!queue.items.every(x=>{const info=nativeUrl(x?.href);return info&&info.key===x.key&&info.cpi===x.cpi;}))return '课程入口已失效或发生变化，请重新选择课程。';
        if(queue.index===queue.items.length&&queue.state!=='complete')return '课程队列位置无效，请重新选择课程。';
        return '';
    }
    function valid(){return!!queue&&!queueProblem();}
    function matches(){const p=new URLSearchParams(location.search),cpi=p.get('cpi')||p.get('personid')||'';return valid()&&queue.items[queue.index]?.key===identity()&&queue.items[queue.index]?.cpi===cpi;}
    function hold(reason){if(queue?.state==='running'){queue.state='paused';queue.reason=reason;save();}pacingStart=0;restUntil=0;gapUntil=0;}
    function cancel(){if(queue){queue.state='stopped';queue.reason='已手动停止，需重新开始';save();}pacingStart=0;restUntil=0;gapUntil=0;}
    function rows(){const map=new Map();for(const a of document.querySelectorAll('#courselistArea .course .course-info a[href],#courselistArea .course a.color1[href]')){const info=nativeUrl(a.href),card=a.closest('.course');if(!info||map.has(info.key)||card.querySelector('.not-open-tip')?.textContent.trim()==='课程已结束')continue;map.set(info.key,{...info,title:(a.getAttribute('title')||a.textContent).trim().slice(0,160)});}return[...map.values()].filter(x=>x.title).slice(0,80);}
    let available=[],selected=[];
    function listUrl(value){try{const u=new URL(value,location.href);return u.protocol==='https:'&&!u.username&&!u.password&&/^mooc[12](?:-ans)?\.chaoxing\.com$/.test(u.hostname)&&u.pathname==='/visit/interaction'?u.href:null;}catch{return null;}}
    function nativeListEntry(){
        if(!personal)return null;
        const frame=listUrl(document.querySelector('#frame_content')?.getAttribute('src'));if(frame)return frame;
        const items=menus().filter(x=>/^(课程|courses?)$/i.test(x.label));
        return items.length===1?listUrl(items[0].node.getAttribute('dataurl')||items[0].node.getAttribute('data-url')||items[0].node.getAttribute('href')):null;
    }
    function renderSelection(){
        if(!host)return;
        const list=host.querySelector('[data-hub-courses]');if(!list)return;
        const entry=nativeListEntry(),signature=JSON.stringify([available,selected,selectionRead,entry,tabReady,!!tab,starting]);if(list.dataset.signature===signature)return;
        list.dataset.signature=signature;
        const focused=document.activeElement,focusKey=focused?.closest('[data-hub-course]')?.dataset.hubCourse,focusAction=focused?.dataset.hubOrder;
        list.replaceChildren();
        if(!available.length){
            const li=el('li',undefined,list);li.dataset.hubEmpty='true';
            el('small',selectionRead?'当前课程列表未读到可加入队列的课程；只显示可识别且未结束的课程。':'尚未读取到课程列表。请先打开个人空间的“课程”；若页面跳转或这里仍为空，可直接打开课程列表勾选。',li);
            if(entry)button('打开课程列表',li,()=>{const current=nativeListEntry();if(current)location.assign(current);});
            host.querySelector('[data-hub-start]').disabled=true;
            host.querySelector('[data-hub-count]').textContent='已选 0 / 0 门';
            return;
        }
        for(const course of available){
            const li=el('li',undefined,list),label=el('label',undefined,li),check=el('input',undefined,label);
            li.dataset.hubCourse=course.key;li.dataset.selected=String(selected.includes(course.key));
            check.type='checkbox';check.checked=selected.includes(course.key);
            el('span',course.title,label).className='xxt-hub-course-title';
            check.onchange=()=>{selected=selected.filter(k=>k!==course.key);if(check.checked)selected.push(course.key);renderSelection();};
            const order=selected.indexOf(course.key);
            if(order>=0){
                const tools=el('div',undefined,li);tools.className='xxt-hub-order';
                el('small','队列第 '+(order+1)+' 门',tools);
                const up=button('上移',tools,()=>{[selected[order-1],selected[order]]=[selected[order],selected[order-1]];renderSelection();});up.disabled=order===0;up.dataset.hubOrder='up';up.setAttribute('aria-label','上移：'+course.title);
                const down=button('下移',tools,()=>{[selected[order+1],selected[order]]=[selected[order],selected[order+1]];renderSelection();});down.disabled=order===selected.length-1;down.dataset.hubOrder='down';down.setAttribute('aria-label','下移：'+course.title);
            }
        }
        const start=host.querySelector('[data-hub-start]');if(start)start.disabled=starting||!tab||!selected.length;
        const count=host.querySelector('[data-hub-count]');if(count)count.textContent='已选 '+selected.length+' / '+available.length+' 门';
        if(focusKey){const row=[...list.children].find(n=>n.dataset.hubCourse===focusKey);const target=focusAction?row?.querySelector('[data-hub-order="'+focusAction+'"]'):null;(target&&!target.disabled?target:row?.querySelector('input'))?.focus({preventScroll:true});}
    }
    async function openQueueItem(){if(!valid()||queue.state!=='running')return;const item=queue.items[queue.index];const u=nativeUrl(item?.href);if(!u){hold('课程入口失效，请返回个人空间重选');return;}navigating=true;try{if(!await save())return;if(closed||!valid()||queue.state!=='running'||queue.items[queue.index]?.key!==u.key)return;location.assign(u.href);}finally{navigating=false;}}
    async function beginQueue(){if(starting)return;if(!tab)throw Error(tabReady?'当前脚本管理器没有提供标签页存储，课程队列不可用。':'正在读取当前标签页，请稍后重试。');if(!account())throw Error('未读到可确认的当前账号标识，暂不启动跨课程队列。');const items=selected.map(k=>available.find(x=>x.key===k)).filter(Boolean);if(!items.length)throw Error('请先勾选课程。');starting=true;renderSelection();try{queue={v:1,account:account(),at:Date.now(),id:XxtCompat.randomUUID(),items,index:0,state:'running',reason:'',results:[]};await openQueueItem();}finally{starting=false;renderSelection();}}
    function renderQueue(){
        if(!host)return;const list=host.querySelector('[data-hub-queue]');if(!list)return;
        const problem=queueProblem(),signature=JSON.stringify([queue,problem,tabReady,!!control,matches()]);if(signature===queueSignature)return;queueSignature=signature;
        const complete=queue?.state==='complete';
        host.querySelector('[data-hub-resume]')?.toggleAttribute('disabled',!queue||complete||!tabReady);
        host.querySelector('[data-hub-pause]')?.toggleAttribute('disabled',queue?.state!=='running');
        host.querySelector('[data-hub-stop]')?.toggleAttribute('disabled',!queue||complete||queue.state==='stopped');
        host.querySelector('[data-hub-skip]')?.toggleAttribute('disabled',!control||!matches()||complete);
        list.replaceChildren();if(!queue){el('li',tabReady?'尚未创建课程队列；本课自动切下一节不需要创建队列。':'正在读取课程队列…',list);return;}
        if(problem){el('li',problem,list);return;}
        el('small',(queue.state==='running'?'正在运行':complete?'队列已结束':queue.state==='paused'?'已暂停':'已停止')+(queue.reason?'：'+queue.reason:''),list);
        queue.items.forEach((item,index)=>{const result=queue.results.find(x=>x.index===index);el('li',(index===queue.index?'当前 · ':'')+item.title+' · '+(result?.state==='completed'?'目录已确认完成':result?.state==='skipped'?'已跳过，待复核':index<queue.index?'待复核':'等待'),list);});
    }

    function nextCourse(state){if(!matches()||queue.state!=='running')return false;queue.results=queue.results.filter(x=>x.index!==queue.index);queue.results.push({index:queue.index,state});queue.index++;if(queue.index>=queue.items.length){queue.state='complete';queue.reason=state==='skipped'?'已到队尾，跳过项仍需复核':'';save();return false;}openQueueItem();return true;}
    function courseComplete(entries){if(!matches()||queue.state!=='running'||!entries.length||!entries.every(e=>e.completion==='completed'))return false;if(!nextCourse('completed')){control?.stop();status('队列已结束，请核对平台任务点及跳过项。');}return true;}
    function checkbox(key,text,parent){const label=el('label',undefined,parent),check=el('input',undefined,label);check.type='checkbox';check.checked=read(key,false)===true;label.append(document.createTextNode(' '+text));check.onchange=()=>{write(key,check.checked);applyOptions();};return check;}
    function applyOptions(){const wanted=new Set();const add=selector=>document.querySelectorAll(selector).forEach(n=>wanted.add(n));if(read('hide-ai',false))add('.cx-robot-wrapper,.cx-robot-side,.cx-robot-side-tips');if(read('hide-watermark',false))add('#video.video-js > div.mask_div[id^="mask_div"]');if(read('hide-ended',false))for(const n of document.querySelectorAll('#courselistArea .not-open-tip'))if(n.textContent.trim()==='课程已结束')wanted.add(n.closest('.course'));if(personal&&read('hide-avatar',false))add('.user img.icon-head,.user-block img.head-img');const hiddenMenus=read('hidden-menus',[]);for(const item of menus())if(hiddenMenus.includes(item.key)&&!/^(课程|章节|courses?|chapters?)$/i.test(item.label))wanted.add(item.node);for(const n of document.querySelectorAll('[data-xxt-hub-hidden]'))if(!wanted.has(n))n.removeAttribute('data-xxt-hub-hidden');for(const n of wanted)if(n&&n.getAttribute('data-xxt-hub-hidden')!=='true')n.setAttribute('data-xxt-hub-hidden','true');}
    function menus(){const selector=personal?'.label-item[role="menuitem"][id^="first"]':'.stuNavigationList li,.stuNavigationList > a,#boxscrollleft .stuNavigationList a';const candidates=[...document.querySelectorAll(selector)].filter(n=>!n.querySelector('li')&&!n.closest('[data-xxt-hub]'));const result=[];for(const node of candidates){const label=(node.querySelector('h3')||node).textContent.replace(/[\uE000-\uF8FF]/g,'').replace(/\s+NEW\s*$/i,'').trim();if(!label||label.length>30||result.some(x=>x.label===label))continue;result.push({node,label,key:(personal?'personal:':'course:')+label});}return result;}
    function options(parent){const details=el('details',undefined,parent);optionsRoot=details;details.dataset.hubSettings='true';el('summary','页面与学习设置',details);checkbox('hide-ai','隐藏平台 AI 助教',details);checkbox('hide-watermark','隐藏视频浮动水印',details);checkbox('hide-ended','隐藏“课程已结束”卡片',details);if(personal){checkbox('hide-avatar','隐藏个人空间侧栏头像',details);checkbox('default-course','下次进入个人空间默认打开“课程”',details);}const menuBox=el('div',undefined,details);menuBox.dataset.hubMenus='true';const pacing=el('fieldset',undefined,details);el('legend','学习节奏（默认关闭）',pacing);checkbox('pacing','启用定时休息，结束后手动继续',pacing);for(const[key,label,max]of[['study-minutes','每轮学习分钟',240],['rest-minutes','休息分钟',120],['video-gap','两段视频间隔秒数',600]]){const row=el('label',label+' ',pacing),input=el('input',undefined,row);input.type='number';input.min=key==='video-gap'?'0':'1';input.max=String(max);input.value=String(read(key,key==='video-gap'?0:key==='study-minutes'?45:10));input.onchange=()=>{const value=Math.max(Number(input.min),Math.min(max,Math.round(Number(input.value)||Number(input.min))));input.value=String(value);write(key,value);pacingStart=0;gapUntil=0;};}el('small','不会让后台页面稳定运行；夜间休息、验证码、手动停止和预览仍按原规则处理。',details);}
    function renderMenus(){const box=optionsRoot?.querySelector('[data-hub-menus]');if(!box)return;const entries=menus(),signature=entries.map(x=>x.key).join('|');if(signature===menuSignature)return;menuSignature=signature;box.replaceChildren();if(!entries.length)return;el('strong','课程菜单显示',box);const hidden=read('hidden-menus',[]);for(const item of entries){if(/^(课程|章节|courses?|chapters?)$/i.test(item.label))continue;const label=el('label',undefined,box),c=el('input',undefined,label);c.type='checkbox';c.checked=!hidden.includes(item.key);label.append(document.createTextNode(' '+item.label));c.onchange=()=>{const value=read('hidden-menus',[]).filter(k=>k!==item.key);if(!c.checked)value.push(item.key);write('hidden-menus',value);applyOptions();};}}
    function addQueue(parent){const details=el('details',undefined,parent);el('summary','课程队列',details);const actions=el('div',undefined,details);button('继续队列',actions,async()=>{
        const problem=queueProblem();if(problem)throw Error(problem);if(queue.state==='complete')throw Error('课程队列已结束，请重新选择课程。');
        if(restUntil>Date.now())throw Error('仍在休息中，请稍后继续。');
        if(matches()&&control){if(!control.canStart())throw Error('请先结束夜间休息、人工验证或预览，再手动开始。');const resuming=queue;queue.state='running';queue.reason='';booted=true;if(!await save()||queue!==resuming||queue.state!=='running'||!matches()||!control.canStart())return;try{await control.start();}catch(error){hold(error.message);throw error;}}
        else{queue.state='running';queue.reason='';await openQueueItem();}
    }).dataset.hubResume='true';button('暂停队列',actions,()=>{control?.stop();hold('手动暂停，需点击继续队列');status('队列已暂停。');}).dataset.hubPause='true';button('停止队列',actions,()=>{control?.stop();cancel();status('队列已停止。');}).dataset.hubStop='true';button('跳过本课程',actions,()=>{if(!matches()||!control)throw Error('请在队列当前课程页操作。');control.stop();queue.state='running';if(!nextCourse('skipped')){status('已到队尾，本课程保留待复核。');}}).dataset.hubSkip='true';const list=el('ol',undefined,details);list.dataset.hubQueue='true';}
    function hubIcon(path){
        const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),p=document.createElementNS(ns,'path');
        for(const[k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
        p.setAttribute('d',path);svg.append(p);return svg;
    }
    function syncPersonalTheme(){if(host?.id==='xxt-course-hub')globalThis.XxtAssistantTheme?.syncSurface(host);}
    function mountPersonal(){
        if(host||!topPage||(!personal&&!listPage))return;
        host=el('aside');host.id='xxt-course-hub';host.dataset.xxtHub='true';host.dataset.xxtTheme='true';host.dataset.hubCollapsed='false';host.setAttribute('aria-label','学习助手 · 课程队列');
        const shell=el('div',undefined,host);shell.className='xxt-shell';
        const scene=el('div',undefined,shell);scene.className='xxt-scene-art';scene.setAttribute('aria-hidden','true');
        const heading=el('header',undefined,shell);heading.className='xxt-head';
        const brand=el('div',undefined,heading);brand.className='xxt-brand';brand.setAttribute('aria-hidden','true');brand.append(hubIcon('M5 5h14v4H5zM5 12h14M5 17h9M5 21h9'));
        const name=el('div',undefined,heading);el('strong','学习助手 · 课程队列',name);
        const toggle=button('收起',heading,()=>{body.hidden=!body.hidden;toggle.textContent=body.hidden?'展开':'收起';toggle.setAttribute('aria-expanded',String(!body.hidden));host.dataset.hubCollapsed=String(body.hidden);});
        toggle.className='xxt-hub-fold';toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-controls','xxt-hub-body');
        body=el('div',undefined,shell);body.id='xxt-hub-body';body.className='xxt-body';
        const controls=el('div',undefined,body);controls.className='xxt-hub-controls';
        const actions=el('div',undefined,controls);actions.className='xxt-actions';
        const start=button('开始所选课程',actions,beginQueue);start.dataset.hubStart='true';start.dataset.action='start';start.disabled=true;
        statusNode=el('p','在下方勾选课程，再点“开始所选课程”；勾选不会打开课程。请保持页面在前台。',controls);statusNode.className='xxt-hub-status';statusNode.setAttribute('role','status');
        const workspace=el('div',undefined,body);workspace.className='xxt-hub-workspace';
        const nav=el('div',undefined,workspace);nav.className='xxt-hub-nav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','课程队列分区');
        const pages=el('div',undefined,workspace);pages.className='xxt-hub-pages';
        const tabs=[],panes=[],scrolls=new Map();let active=0;
        const activate=index=>{scrolls.set(active,panes[active]?.scrollTop||0);active=index;tabs.forEach((t,i)=>{t.setAttribute('aria-selected',String(i===index));t.tabIndex=i===index?0:-1;panes[i].hidden=i!==index;});panes[index].scrollTop=scrolls.get(index)||0;};
        const media=matchMedia('(max-width:600px)'),orient=()=>nav.setAttribute('aria-orientation',media.matches?'horizontal':'vertical');orient();media.addEventListener('change',orient);window.addEventListener('pagehide',()=>media.removeEventListener('change',orient),{once:true});
        for(const[key,label,path]of [['courses','选课','M5 5h4v4H5zM5 15h4v4H5zM15 5h4v4h-4zM15 15h4v4h-4z'],['queue','队列','M8 6h12M8 12h12M8 18h12M3 6h1M3 12h1M3 18h1'],['settings','设置','M4 6h16M4 12h16M4 18h16M8 4v4M15 10v4M10 16v4']]){
            const index=tabs.length,tab=button('',nav,()=>activate(index)),pane=el('section',undefined,pages);
            tab.id='xxt-hub-tab-'+key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','xxt-hub-pane-'+key);tab.append(hubIcon(path),document.createTextNode(label));
            pane.id='xxt-hub-pane-'+key;pane.className='xxt-hub-pane';pane.dataset.hubPane=key;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);pane.tabIndex=0;
            tabs.push(tab);panes.push(pane);
            tab.onkeydown=event=>{let next=index;if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else if(event.key===(media.matches?'ArrowRight':'ArrowDown'))next=(index+1)%tabs.length;else if(event.key===(media.matches?'ArrowLeft':'ArrowUp'))next=(index+tabs.length-1)%tabs.length;else return;event.preventDefault();activate(next);tabs[next].focus();};
        }
        const count=el('span',undefined,panes[0]);count.className='xxt-hub-count';count.dataset.hubCount='true';count.setAttribute('aria-live','polite');
        const list=el('ol',undefined,panes[0]);list.dataset.hubCourses='true';list.setAttribute('aria-label','可选课程');
        addQueue(panes[1]);const queueDetails=panes[1].querySelector('details');queueDetails.open=true;queueDetails.querySelector('summary').hidden=true;
        const queueActions=queueDetails.querySelector('div');queueActions.className='xxt-hub-queue-actions';queueDetails.append(queueActions);
        options(panes[2]);optionsRoot.open=true;optionsRoot.querySelector('summary').hidden=true;
        document.body.append(host);activate(0);syncPersonalTheme();renderSelection();renderQueue();
    }
    function homeEntry(){return[...document.querySelectorAll('.stuNavigationList a[href],#boxscrollleft a[href]')].find(a=>{try{const u=new URL(a.href),p=u.searchParams;return u.origin===location.origin&&/^\/mycourse\/studentstudy(?:Ajax)?$/.test(u.pathname)&&(p.get('courseId')||p.get('courseid')||'')+'/'+(p.get('clazzid')||p.get('clazzId')||'')===identity()&&visible(a);}catch{return false;}});}
    function mountStudy(panel){if(host)return;host=el('section');host.dataset.xxtHub='true';const details=el('details',undefined,host);el('summary','待刷列表与章节目录',details);const actions=el('div',undefined,details);button('开始 / 继续',actions,()=>{if(restUntil>Date.now())throw Error('仍在休息中，请稍后继续。');if(!control?.canStart())throw Error('请先结束夜间休息、人工验证或预览。');pacingStart=Date.now();return control.start();});button('暂停',actions,()=>{control?.stop();hold('手动暂停');status('已暂停，点击开始可继续。');});const skip=button('跳过当前任务',actions,()=>{control.skipTask();refreshTaskSkip();});skip.dataset.hubSkipTask='true';skip.disabled=true;skip.title='跳过正在处理的音视频或资料，保留待复核。';button('跳过当前章节',actions,async()=>{if(!control)throw Error('当前页面没有可用章节控制。');await control.skip();});const search=el('input',undefined,details);search.type='search';search.placeholder='搜索章节';search.setAttribute('aria-label','搜索章节');search.dataset.hubSearch='true';const only=el('label',undefined,details),check=el('input',undefined,only);check.type='checkbox';check.dataset.hubPending='true';only.append(document.createTextNode(' 只看未完成 / 待核对'));const list=el('ol',undefined,details);list.dataset.hubCatalog='true';search.oninput=()=>{catalogSignature='';renderCatalog();};check.onchange=()=>{catalogSignature='';renderCatalog();};statusNode=el('p','目录标记来自平台；跳过不等于完成。',details);statusNode.setAttribute('role','status');addQueue(host);options(host);if(globalThis.XxtPanelLayout)globalThis.XxtPanelLayout.placeHub(panel,host);else (panel.querySelector('.xxt-body')||panel).append(host);renderCatalog();renderQueue();}
    function catalog(){return control?.catalog?.()||[];}
    function refreshTaskSkip(){const skip=host?.querySelector('[data-hub-skip-task]');if(skip)skip.disabled=!control?.canSkipTask?.();}
    function renderCatalog(){const list=host?.querySelector('[data-hub-catalog]');if(!list)return;const entries=catalog(),query=host.querySelector('[data-hub-search]').value.trim(),pending=host.querySelector('[data-hub-pending]').checked;const signature=JSON.stringify([query,pending,entries.map(e=>[e.title,e.completion,e.node.classList.contains('posCatalog_active')])]);if(signature===catalogSignature)return;catalogSignature=signature;list.replaceChildren();for(const entry of entries){const title=typeof entry.title==='string'?entry.title.trim():'';if(!title||query&&!title.includes(query)||pending&&entry.completion==='completed')continue;const li=el('li',undefined,list),current=entry.node.classList.contains('posCatalog_active');const b=button((current?'当前 · ':'')+title,li,async()=>{if(!entry.node.isConnected)throw Error('目录已变化，请重新选择。');control?.stop();hold('手动切换章节');const target=entry.node.querySelector('.posCatalog_name');if(!target||!visible(target))throw Error('章节入口当前不可用。');target.click();status('已打开章节，请核对后点击开始。');});b.title=title;el('small',entry.completion==='completed'?'平台目录已完成':entry.completion==='pending'?'平台目录未完成':'状态待核对',li);}}
    let defaultsDone=false,manualMenu=false;
    function defaults(){if(!personal||defaultsDone||!read('default-course',false)||manualMenu)return;const frame=document.querySelector('#frame_content');if(!frame)return;try{if(new URL(frame.src).pathname==='/visit/interaction'){defaultsDone=true;return;}}catch{}const entries=menus().filter(x=>/^(课程|courses?)$/i.test(x.label)&&visible(x.node));if(entries.length===1){defaultsDone=true;entries[0].node.click();}}
    document.addEventListener('pointerdown',e=>{if(e.isTrusted&&e.target.closest('.label-item[role="menuitem"]'))manualMenu=true;},true);
    const frameOrigin=()=>{try{return new URL(document.querySelector('#frame_content')?.src,location.href).origin;}catch{return '';}};
    window.addEventListener('message',event=>{if(!topPage||!personal||event.source!==document.querySelector('#frame_content')?.contentWindow||event.origin!==frameOrigin()||!XxtPlatform.isTrustedOrigin(event.origin)||!XxtPlatform.isCourseUrl(event.origin))return;const data=event.data;if(data?.source!=='xxt-course-list-v1'||!Array.isArray(data.items)||data.items.length>80)return;available=data.items.flatMap(item=>{const info=nativeUrl(item?.href);return info&&info.key===item.key&&typeof item.title==='string'&&item.title.trim()&&item.title.length<=160?[{...info,title:item.title}]:[];});selectionRead=true;selected=selected.filter(k=>available.some(x=>x.key===k));renderSelection();});

    let published='',publishedAt=0;
    function publish(){if(!listPage)return;const items=rows();if(topPage){available=items;selectionRead=true;selected=selected.filter(k=>available.some(x=>x.key===k));renderSelection();return;}const value=JSON.stringify(items);if(value===published&&Date.now()-publishedAt<5000)return;published=value;publishedAt=Date.now();let parentOrigin='https://i.chaoxing.com';try{const u=new URL(document.referrer);if(XxtPlatform.isTrustedOrigin(u.origin))parentOrigin=u.origin;}catch{}window.parent.postMessage({source:'xxt-course-list-v1',items},parentOrigin);}

    function gate(){const now=Date.now();if(restUntil){if(now<restUntil){status('学习休息中，剩余 '+Math.ceil((restUntil-now)/1000)+' 秒；结束后手动继续。');return true;}restUntil=0;status('休息已结束，请手动点击开始 / 继续。');return true;}if(read('pacing',false)&&pacingStart&&now-pacingStart>=read('study-minutes',45)*60000){control?.stop();hold('定时休息结束后需手动继续');restUntil=now+read('rest-minutes',10)*60000;status('本轮学习已暂停休息，结束后请手动继续。');return true;}if(gapUntil>now){status('视频间隔：剩余 '+Math.ceil((gapUntil-now)/1000)+' 秒');return true;}return false;}
    function mediaGate(media){if(lastMedia?.ended)mediaGapArmed=true;if(media&&media!==lastMedia){const seconds=Math.min(600,Math.max(0,Number(read('video-gap',0))||0));if(lastMedia&&mediaGapArmed&&seconds){gapUntil=Date.now()+seconds*1000;mediaGapArmed=false;}lastMedia=media;}if(media?.ended)mediaGapArmed=true;return gate();}
    async function pump(){if(closed||busy||navigating)return;busy=true;try{applyOptions();publish();mountPersonal();syncPersonalTheme();renderSelection();renderMenus();defaults();renderCatalog();renderQueue();refreshTaskSkip();if(topPage&&queue?.state==='running'){if(!valid()){hold(queueProblem());control?.stop();}else if(control&&!matches()){hold('当前课程不属于队列当前位置，请手动继续');control.stop();}else if(control&&!booted){if(document.hidden||!control.canStart()){hold('请核对当前课程后手动继续队列');}else{booted=true;pacingStart=Date.now();await control.start();}}else if(!control&&!personal&&!homeOpened&&homeEntry()){if(!matches()||document.hidden){hold('请核对课程后手动进入学习页');}else{homeOpened=true;location.assign(homeEntry().href);}}}}finally{busy=false;}}
    document.addEventListener('xxt-theme-changed',syncPersonalTheme);
    globalThis.XxtCourseHub={attach(panel,hooks){if(!topPage)return;control=hooks;mountStudy(panel);void pump();},hold,cancel,validContext(){return queue?.state!=='running'||matches();},courseComplete,gate,mediaGate,mediaEnded(){mediaGapArmed=true;},started(){pacingStart=Date.now();restUntil=0;},inspect(){return{state:queue?.state||'none',matches:matches(),restUntil,gapUntil};}};
    if(topPage&&typeof GM_getTab==='function'&&typeof GM_saveTab==='function')GM_getTab(value=>{if(closed)return;tabReady=true;tab=value||{};queue=tab.xxtCourseQueue||null;void pump();});
    const timer=setInterval(()=>void pump(),1200);void pump();
    document.addEventListener('xxt-platform-settings-changing',()=>{control?.stop();cancel();closed=true;clearInterval(timer);});
    window.addEventListener('pagehide',()=>{closed=true;clearInterval(timer);},{once:true});
})();
