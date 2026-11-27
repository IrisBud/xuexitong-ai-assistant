(function (root) {
    'use strict';
    const release = root.XxtRelease || (typeof module === 'object' && module.exports ? require('./release.json') : null);
    const base = 'https://raw.githubusercontent.com/IrisBud/xuexitong-ai-assistant/main/dist/';
    const pages = 'https://irisbud.github.io/xuexitong-ai-assistant/assets/';
    const latestUrl = 'https://github.com/IrisBud/xuexitong-ai-assistant/releases/latest';
    const manifestUrl = base + 'release.json', fallbackManifestUrl = pages + 'release.json';
    const installUrl = latestUrl + '/download/xuexitong-ai-assistant.user.js';
    const metaUrl = pages + 'xuexitong-ai-assistant.meta.js';
    const versionPattern = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
    function compare(a,b) {
        if (!versionPattern.test(a) || !versionPattern.test(b)) throw new Error('版本格式无效');
        const left=a.split('.').map(Number),right=b.split('.').map(Number);
        for(let i=0;i<3;i++) if(left[i]!==right[i]) return left[i]>right[i]?1:-1;
        return 0;
    }
    function validate(value) {
        if (!value || !versionPattern.test(value.version) || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Array.isArray(value.changes) || value.changes.length<1 || value.changes.length>20 || value.changes.some(x=>typeof x!=='string'||!x.trim()||x.length>400)) throw new Error('更新信息格式无效');
        // Never accept executable content or a download URL from remote metadata.
        return {version:value.version,date:value.date,changes:value.changes.slice()};
    }
    function network(nav) {
        if(nav.onLine===false) return {wifi:false,message:'当前离线，联网后再检查。'};
        const connection=nav.connection||nav.mozConnection||nav.webkitConnection;
        if(connection?.saveData) return {wifi:false,message:'已启用节省流量，自动检查已暂停。'};
        if(connection?.type==='wifi') return {wifi:true,message:'已识别 WLAN。'};
        if(connection?.type && !['unknown','other'].includes(connection.type)) return {wifi:false,message:'当前未识别为 WLAN，仅手动检查可用。'};
        return {wifi:false,message:'浏览器未提供 WLAN 类型，无法自动判断；可手动检查。'};
    }
    function requestManifest(url, now) {
        return new Promise((resolve,reject)=>GM_xmlhttpRequest({
            method:'GET',url:url+'?check='+now,anonymous:true,redirect:'error',timeout:8000,
            onload(response){
                try {
                    const expected=new URL(url), final=response.finalUrl?new URL(response.finalUrl):expected;
                    if(response.status!==200||final.origin!==expected.origin||final.pathname!==expected.pathname||
                        typeof response.responseText!=='string'||response.responseText.length>20000)throw Error('更新信息读取失败');
                    resolve(validate(JSON.parse(response.responseText)));
                } catch(error){reject(error);}
            },
            onerror:()=>reject(Error('更新检查连接失败')),
            ontimeout:()=>reject(Error('更新检查超时')),
            onabort:()=>reject(Error('更新检查已取消'))
        }));
    }
    function create({bannerHost} = {}) {
        const banner=document.createElement('aside');banner.className='xxt-update-banner';banner.dataset.updateBanner='true';banner.hidden=true;
        const bannerText=document.createElement('strong'),bannerActions=document.createElement('div');bannerText.setAttribute('role','status');
        const bannerInstall=document.createElement('button'),later=document.createElement('button'),close=document.createElement('button');
        bannerInstall.type=later.type=close.type='button';bannerInstall.textContent='查看并更新';later.textContent='稍后提醒';close.textContent='×';close.setAttribute('aria-label','关闭本版本更新提示');close.className='xxt-update-close';
        const waitHint=document.createElement('small');waitHint.dataset.updateWaitHint='true';waitHint.textContent='点击后油猴会加载更新；中转页可能停留约 1 分钟或更久，请保留页面，等待安装/更新确认窗口。';
        bannerActions.append(bannerInstall,later);banner.append(bannerText,bannerActions,waitHint,close);bannerHost?.prepend(banner);
        let available=null;
        const showBanner=()=>{banner.hidden=!available||GM_getValue('xxt-update-dismissed','')===available.version||Number(GM_getValue('xxt-update-snooze-until',0))>Date.now();};
        close.onclick=()=>{if(available)GM_setValue('xxt-update-dismissed',available.version);showBanner();};
        later.onclick=()=>{GM_setValue('xxt-update-snooze-until',Date.now()+6*60*60*1000);showBanner();};
        const section=document.createElement('details'); section.dataset.xxtUpdates='true';
        const heading=document.createElement('summary'); heading.textContent=`脚本更新 · ${release.version}`;
        const content=document.createElement('div'); content.className='ai-form';
        const autoLabel=document.createElement('label'),auto=document.createElement('select'); auto.dataset.updateAuto='true';
        for(const [value,label] of [['off','关闭'],['wifi','仅 WLAN'],['online','联网时（含无法识别 WLAN）']]){
            const option=document.createElement('option');option.value=value;option.textContent=label;auto.append(option);
        }
        const preference=GM_getValue('xxt-update-auto-mode',GM_getValue('xxt-update-wifi',false)===true?'wifi':'off');
        auto.value=['off','wifi','online'].includes(preference)?preference:'off';
        autoLabel.append(document.createTextNode('自动检查更新（每 2 小时）'),auto);
        const networkNote=document.createElement('small'); networkNote.dataset.updateNetwork='true';
        const updateNetworkNote=()=>auto.value==='online'&&navigator.onLine!==false&&
            !(navigator.connection||navigator.mozConnection||navigator.webkitConnection)?.saveData?'联网时可自动检查。':network(navigator).message;
        const buttons=document.createElement('div'); buttons.className='ai-buttons';
        const check=document.createElement('button'); check.type='button'; check.textContent='检查更新'; check.dataset.updateCheck='true';
        const install=document.createElement('button'); install.type='button'; install.hidden=true; install.dataset.updateInstall='true';
        const status=document.createElement('small'); status.setAttribute('role','status'); status.dataset.updateStatus='true';
        const latest=document.createElement('a');latest.href=latestUrl;latest.textContent='在 GitHub 查看最新版与更新内容';latest.target='_blank';latest.rel='noopener noreferrer';
        const notes=document.createElement('div'),notesTitle=document.createElement('strong'),list=document.createElement('ul'); notes.dataset.updateNotes='true'; notes.append(notesTitle,list);
        function showNotes(data,prefix='本次更新') { notesTitle.textContent=`${prefix} · ${data.version}（${data.date}）`; list.replaceChildren(); for(const text of data.changes){const li=document.createElement('li');li.textContent=text;list.append(li);} }
        showNotes(release);
        const seen=GM_getValue('xxt-update-notes-seen',''); section.open=seen!==release.version;
        if(section.open) status.textContent=`当前版本 ${release.version}，本次更新内容如下。`;
        const acknowledge=document.createElement('button'); acknowledge.type='button'; acknowledge.className='xxt-update-dismiss';acknowledge.textContent='知道了'; acknowledge.dataset.updateAcknowledge='true'; acknowledge.onclick=()=>{GM_setValue('xxt-update-notes-seen',release.version);section.open=false;};
        const instructions=document.createElement('details'),summary=document.createElement('summary'); summary.textContent='更新方法（油猴）';
        const steps=document.createElement('ol');
        for(const text of ['点击“更新至新版本”，在油猴打开的安装/更新页确认更新；脚本不能自行替换已安装代码。','也可点击浏览器扩展中的油猴图标 → 管理面板 → 找到本脚本 → 检查更新；或打开脚本编辑页 → 设置 → 更新 → 检查用户脚本的更新。','若旧版“更新 URL”为空：填入下方元数据地址、保存，再点检查更新。地址框不能编辑或卡在 Raw 中转页时，下载仓库 ZIP，解压 dist 中的 .user.js，用记事本全选复制，再到油猴编辑原脚本，全选替换并保存。不要删除原脚本，以便保留设置。','更新后刷新课程页面，核对面板版本；这里只展示最新版的本次更新内容。']) {const li=document.createElement('li');li.textContent=text;steps.append(li);}
        const meta=document.createElement('input'); meta.readOnly=true; meta.value=metaUrl;meta.setAttribute('aria-label','油猴更新 URL');
        const zip=document.createElement('a');zip.textContent='下载仓库 ZIP（备用）';zip.href='https://github.com/IrisBud/xuexitong-ai-assistant/archive/refs/heads/main.zip';zip.target='_blank';zip.rel='noopener noreferrer';
        const boundary=document.createElement('small');boundary.textContent='WLAN 限制仅约束本面板的自动检查；油猴自身的更新计划由油猴设置管理。检查只读取项目公开版本文件，不调用 AI、不发送密钥或课程信息。';
        instructions.append(summary,steps,meta,zip,boundary);
        let busy=false;
        async function checkUpdate(manual=false) {
            if(busy) return;
            const net=network(navigator);networkNote.textContent=updateNetworkNote();
            if(navigator.onLine===false){status.textContent=net.message;return;}
            const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
            if(!manual && (auto.value==='off'||auto.value==='wifi'&&!net.wifi||connection?.saveData||document.hidden)) return;
            const last=Number(GM_getValue('xxt-update-last-attempt',0)),now=Date.now();
            if(!manual && now-last<2*60*60*1000) return;
            busy=true;check.disabled=true;status.textContent='正在检查公开版本信息…';GM_setValue('xxt-update-last-attempt',now);
            try {
                let data;
                try {data=await requestManifest(manifestUrl,now);}
                catch {status.textContent='正在通过使用手册检查备用版本信息…';data=await requestManifest(fallbackManifestUrl,now);}
                const newer=compare(data.version,release.version)>0;install.hidden=!newer;
                if(newer){available=data;bannerText.textContent=`发现新版本 ${data.version}，当前为 ${release.version}。更新由你决定。`;showBanner();install.textContent=`更新至 ${data.version}`;status.textContent=`发现新版本 ${data.version}。`;showNotes(data,'新版本更新内容');section.open=true;}
                else {available=null;showBanner();status.textContent=compare(data.version,release.version)<0?'已安装版本高于当前发布版本，无需降级。':`当前已是最新版本 ${release.version}。`;showNotes(release);}
            }catch{status.textContent='两个来源均未能核对最新版本，请在 GitHub 查看最新版与更新内容。';}finally{busy=false;check.disabled=false;}
        }
        install.onclick=()=>{status.textContent='油猴正在加载更新，可能需要约 1 分钟或更久。看到 Script Installation 中转页时请保留页面等待，不必复制代码或反复点击。出现确认窗口后点击“更新”，再刷新课程页；若等待数分钟仍未出现，请按下方“更新方法（油猴）”检查更新或手动替换。';instructions.open=true;try{GM_openInTab(installUrl,{active:true,insert:true});}catch{status.textContent='无法打开更新页，请按下方步骤在油猴管理面板检查更新。';}};
        bannerInstall.onclick=()=>{section.open=true;install.click();};
        check.onclick=()=>checkUpdate(true);
        auto.onchange=()=>{GM_setValue('xxt-update-auto-mode',auto.value);networkNote.textContent=updateNetworkNote();if(auto.value!=='off')void checkUpdate();};
        buttons.append(check,install);content.append(autoLabel,networkNote,buttons,status,latest,notes,acknowledge,instructions);section.append(heading,content);
        const refresh=()=>{showBanner();networkNote.textContent=updateNetworkNote();void checkUpdate();};
        networkNote.textContent=updateNetworkNote();
        const timer=setInterval(()=>{if(!section.isConnected){clearInterval(timer);window.removeEventListener('online',refresh);navigator.connection?.removeEventListener?.('change',refresh);return;}refresh();},60000);
        window.addEventListener('online',refresh);navigator.connection?.addEventListener?.('change',refresh);queueMicrotask(()=>{if(section.isConnected)void checkUpdate();});
        return section;
    }
    const api={release,manifestUrl,installUrl,compare,validate,network,create};
    if(typeof module==='object'&&module.exports)module.exports=api;root.XxtUpdates=api;
})(typeof globalThis!=='undefined'?globalThis:this);
