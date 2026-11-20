import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from './browser-runtime.mjs';

const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'output/playwright/course-discussion');
await mkdir(out,{recursive:true});
const bundle=await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const browser=await chromium.launch({headless:true});
const site='https://groupweb.chaoxing.com';
const scope='bbsid=board1&courseid=course1&clazzid=class1&cpi=person1';
const topicPath=n=>'/course/topic/v3/bbs/board1/topic'+n+'/replysList?courseId=course1&classId=class1&cpi=person1';
const row=(n,title='合成话题 '+n,body='')=>'<li class="dataBody_td dataBody_topic" id="topicId_'+n+'"><span class="author">合成作者</span><a class="topicli_link" href="javascript:void(0);" data-n="'+n+'"><div class="topicli_title">'+title+'</div><div class="topicli_content">'+body+'</div></a></li>';
const results=[];
async function scenario({name,width=1300,height=900,skin='ridge',uncertain=false}) {
    const context=await browser.newContext({viewport:{width,height}});
    const store={'xxt-quiet-enabled':false,'xxt-ui-preference':skin,'xxt-ai-enabled':true,
        'xxt-discussion-settings':{mode:'ai',length:'custom',precision:'strict',words:4},
        'xxt-ai-config':{provider:'custom',protocol:'chat',baseUrl:'https://model.synthetic.invalid/v1',model:'fixture',key:'fixture-only'}};
    const calls={more:0,reply:[],publish:[],models:[],external:0};
    await context.exposeBinding('__fixtureStore',async(_source,key,value)=>{
        store[key]=value;
        await Promise.all(context.pages().flatMap(page=>page.frames()).map(frame=>
            frame.evaluate(([k,v])=>{if(window.__gm)window.__gm[k]=v},[key,value]).catch(()=>{})));
    });
    await context.exposeBinding('__fixtureRecord',(_source,type,value)=>{
        if(type==='more') calls.more++;
        else calls[type].push(value);
    });
    await context.addInitScript(()=>{
        window.__gm={};
        window.unsafeWindow=window;
        document.hasFocus=()=>true;
        Object.defineProperty(document,'visibilityState',{get:()=>'visible'});
        window.GM_getValue=(key,fallback)=>Object.hasOwn(window.__gm,key)?window.__gm[key]:fallback;
        window.GM_setValue=(key,value)=>{window.__gm[key]=value;void window.__fixtureStore(key,value)};
        window.GM_openInTab=url=>{
            const opened=window.open(url,'_blank');
            return {get closed(){return !opened||opened.closed},close(){opened?.close()}};
        };
    });
    const headers=()=>'<script>Object.assign(__gm,'+JSON.stringify(store)+'); GM_xmlhttpRequest=options=>{'+
        'if(options.method==="GET"){setTimeout(()=>options.onload({status:404}),0);return{abort(){}}}'+
        'const raw=options.data; const ids=[...new Set(raw.match(/post-\\d+/g)||[])];'+
        'const isReflection=raw.includes("写一段学习收获"); const decision={action:"answer",answer:"认真学习",reason:"四字合成回复",suitableMax:20,requirement:"无"};'+
        'const answers=(ids.length?ids:["discussion"]).map(id=>({id,choices:[],readable:true,confidence:1,explanation:"fixture",texts:[JSON.stringify(ids.length?'+
        '{title:isReflection?"合成学习收获":"合成问题 "+id+"？",body:"这里写课程讨论的背景和具体学习做法。"}:decision)]}));'+
        'const timer=setTimeout(()=>{__fixtureRecord("models",{ids,isReflection,bodyOnly:raw.includes("只有课程正文")});'+
        'options.onload({status:200,responseText:JSON.stringify({choices:[{message:{content:JSON.stringify({answers})}}]})});},50);'+
        'return{abort(){clearTimeout(timer);options.onabort?.();}};};</script>';

    await context.route('**/*',async route=>{
        const u=new URL(route.request().url());
        if(![site,'https://mooc2-ans.chaoxing.com'].includes(u.origin)){
            calls.external++;
            return route.fulfill({status:404,body:'isolated'});
        }
        if(u.pathname==='/bundle.js')return route.fulfill({contentType:'text/javascript',body:bundle});
        let body='', includeBundle=true, title='合成课程';
        if(u.pathname==='/course'){
            body='<iframe title="课程讨论" src="'+site+'/course/topic/topicList?'+scope+'" style="width:100%;height:96vh;border:0"></iframe>';
        }else if(u.pathname==='/course/topic/topicList'){
            const newRows=Array.from({length:20},(_,i)=>row(46+i)).join('');
            body='<main id="centerMain"><div class="dataCon"><ul class="dataBody">'+
                [row(1),row(2,'','只有课程正文'),row(3,'详情已有本人回复'),...Array.from({length:42},(_,i)=>row(4+i))].join('')+
                '</ul><div class="loadMore"><p class="loadText">点击加载更多</p></div></div></main>'+
                '<ul class="myoprate"><li><a class="myReply" href="/course/topic/board1/myReply?courseId=course1">我回复的</a></li><li><a class="myTopic" href="/course/topic/board1/myTopic?courseId=course1">我发布的</a></li></ul>'+
                '<div class="editContainer"><div class="edit_main"><div class="edit_title"><input placeholder="请输入标题"></div>'+
                '<div id="ueditorContainer"><div class="edui-editor-iframeholder"><iframe src="/editor.html"></iframe></div></div>'+
                '<div class="edit_btn"><div class="jb_btn jb_btn_92_disable">发布</div></div></div></div>'+
                '<script>const list=document.querySelector(".dataBody"),more=document.querySelector(".loadMore");'+
                'more.onclick=()=>{__fixtureRecord("more");list.insertAdjacentHTML("beforeend",'+JSON.stringify(newRows)+')};'+
                'list.onclick=event=>{const a=event.target.closest("a.topicli_link");if(!a)return;event.preventDefault();'+
                'window.open("/course/topic/v3/bbs/board1/topic"+a.dataset.n+"/replysList?courseId=course1&classId=class1&cpi=person1","_blank")};'+
                'const input=document.querySelector(".edit_title input"),ed=document.querySelector("#ueditorContainer iframe"),pub=document.querySelector(".edit_btn .jb_btn");'+
                'const sync=()=>pub.className="jb_btn "+(input.value.trim()&&ed.contentDocument.body.textContent.trim()?"jb_btn_92":"jb_btn_92_disable");'+
                'input.oninput=sync;ed.addEventListener("load",()=>ed.contentDocument.body.addEventListener("input",sync));'+
                'let sequence=100;pub.onclick=()=>{if(!pub.classList.contains("jb_btn_92"))return;'+
                'const publishedTitle=input.value;__fixtureRecord("publish",{title:publishedTitle,body:ed.contentDocument.body.textContent});'+
                (uncertain?'return;':'const r=document.createElement("li");r.id="topicId_"+(++sequence);r.className="dataBody_topic";'+
                'const t=document.createElement("div");t.className="topicli_title";t.textContent=publishedTitle;r.append(t);list.prepend(r);'+
                'input.value="";ed.contentDocument.body.textContent="";sync();')+
                '};</script>';
        }else if(u.pathname.endsWith('/myReply')){
            body='<main class="subPageMain"><ul class="dataBody"><li class="dataBody_topic"><a class="topicli_link"><div class="topicli_preTopic"><span>合成作者：</span>合成话题 1</div></a></li></ul><div class="loadMore loadEnd">点击加载更多</div></main>';
        }else if(u.pathname.endsWith('/myTopic')){
            body='<main class="subPageMain"><ul class="dataBody"></ul></main>';
        }else if(u.pathname.endsWith('/replysList')){
            const id=Number(u.pathname.split('/').at(-2).replace('topic',''));
            const own='<div class="topicDetail_replyItem"><div class="topicDetail_info"><div class="operate_con"><a class="popEditBnt">编辑</a><a class="popDeleBnt">删除</a></div></div></div>';
            body='<div id="bbsTopicDetail"><div class="topicDetail_detail"><div class="topicDetail_head"><div class="topicDetail_title"><span>'+
                (id===2?'':'合成标题')+'</span></div></div><div class="topicDetail_main"><div class="richText">'+
                (id===2?'只有课程正文':'')+'</div></div></div></div><div class="topicDetail_replyList">'+(id===3?own:'')+
                '</div><div class="topicDetail_editContainer"><div class="replyEdit"><textarea placeholder="回复话题"></textarea>'+
                '<div class="replyEditBtnGroup"><div class="addReply">回复</div></div></div></div>'+
                '<script>document.querySelector(".addReply").onclick=()=>{const t=document.querySelector("textarea");__fixtureRecord("reply",t.value);t.value="";'+
                'document.querySelector(".topicDetail_replyList").insertAdjacentHTML("beforeend",'+JSON.stringify(own)+')};</script>';
        }else if(u.pathname==='/editor.html'){
            body='<body contenteditable="true"></body>';includeBundle=false;
        }else return route.fulfill({status:404,body:'isolated'});
        return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>'+title+'</title>'+
            '<style>body{font:14px sans-serif}iframe{display:block}iframe[hidden]{display:none}.addReply,.jb_btn{padding:4px}.dataBody{max-height:205px;overflow:auto}</style>'+
            (includeBundle?headers():'')+body+(includeBundle?'<script src="/bundle.js"></script>':'')});
    });
    const page=await context.newPage();
    try {
        await page.goto('https://mooc2-ans.chaoxing.com/course');
        const frame=page.frameLocator('iframe[title="课程讨论"]');
        const panel=frame.locator('#xxt-course-discussion');
        await panel.getByRole('button',{name:'展开',exact:true}).click();
        assert.equal(await panel.getAttribute('data-skin'),skin);
        await panel.getByRole('button',{name:'读取话题',exact:true}).click();
        await panel.getByText('已收录 50 条话题，已核对平台回复历史。',{exact:true}).waitFor();
        assert.equal(calls.more,1);
        assert.equal(await panel.locator('ul li').count(),50);
        assert.equal(await panel.locator('ul li').filter({hasText:'合成话题 1已回复'}).getByRole('checkbox').isDisabled(),true);
        await page.screenshot({path:resolve(out,name+'-list.png')});
        await panel.getByText('回复设置（与章节讨论题共用）',{exact:true}).click();
        assert.equal(await panel.locator('[data-setting="discussion-words"]').inputValue(),'4');
        if(!uncertain){
            await panel.getByRole('checkbox',{name:'只有课程正文',exact:true}).check();
            await panel.getByRole('checkbox',{name:'详情已有本人回复',exact:true}).check();
            await panel.getByRole('button',{name:'回复选中话题'}).click();
            await panel.getByText('已确认 2 条回复，跳过 0 条。',{exact:true}).waitFor();
            assert.deepEqual(calls.reply,['认真学习']);
            assert.equal(calls.models.filter(model=>model.bodyOnly).length,1);
            assert.equal(await panel.getByText('已回复',{exact:true}).count(),3);
        }
        await panel.getByText('新建话题',{exact:true}).click();
        await panel.getByRole('spinbutton',{name:'发布数量'}).fill('2');
        await panel.getByRole('button',{name:'发布话题',exact:true}).click();
        if(uncertain){
            await panel.getByText(/平台回执待核对/).waitFor();
            assert.equal(calls.publish.length,1);
            assert(await panel.getByRole('button',{name:'发布话题',exact:true}).isDisabled());
            await panel.getByRole('button',{name:'核对待确认发布'}).click();
            await panel.getByText(/平台列表尚未确认/).waitFor();
            assert.equal(calls.publish.length,1);
        }else{
            await panel.getByText('已确认发布 2 条。',{exact:true}).waitFor();
            assert.equal(calls.publish.length,2);
            await panel.getByLabel('发布内容').selectOption('reflection');
            assert.equal(await panel.getByRole('spinbutton',{name:'发布数量'}).isVisible(),false);
            await panel.getByRole('button',{name:'发布话题',exact:true}).click();
            await panel.getByText('已确认发布 1 条。',{exact:true}).waitFor();
            assert.equal(calls.publish.at(-1).title,'合成学习收获');
            assert(calls.models.some(model=>model.isReflection));
        }
        const bounds=await panel.boundingBox();
        assert(bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.y>=0&&bounds.y+bounds.height<=height+1,'Panel fits viewport');
        await page.screenshot({path:resolve(out,name+'.png')});
        assert.equal(calls.external,0);
        results.push({name,skin,width,height,loadMoreClicks:calls.more,confirmedOrAttemptedReplies:calls.reply.length,
            nativePublishClicks:calls.publish.length,modelRequests:calls.models.length,passed:true});
        console.log('Course discussion PASS',name);
    } finally { await context.close(); }
}

try {
    await scenario({name:'desktop'});
    await scenario({name:'narrow-uncertain',width:390,height:740,skin:'nailoong',uncertain:true});
    await writeFile(resolve(out,'results.json'),JSON.stringify({scope:'Synthetic pages and models only',results},null,2)+'\n');
} finally { await browser.close(); }
