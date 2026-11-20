/* Course-level discussion. All platform writes use its native controls. */
(function(root) {
    'use strict';
    const limit = 50;
    const panelId = 'xxt-course-discussion';
    const listPath = '/course/topic/topicList';
    const rowSelector = 'li.dataBody_topic[id^="topicId_"]';
    const tidy = value => String(value || '').normalize('NFC').replace(/\s+/gu, ' ').trim();
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

    function scopeFor(href) {
        const url = new URL(href);
        const values = ['bbsid','courseid','clazzid','cpi'].map(key => url.searchParams.get(key));
        if (url.pathname !== listPath || !values[0] || !values.every(value => /^[a-zA-Z0-9_-]+$/.test(value || ''))) return null;
        const [board, course, clazz, account] = values;
        return { origin:url.origin, board, course, clazz, account, key:['course-discussion',url.origin,...values].join('/') };
    }

    function readTitle(node) {
        if (!node) return '';
        return tidy(node.getAttribute('title') || [...node.childNodes].map(child => {
            const text = tidy(child.textContent);
            return child.nodeType === 1 && (child.matches('.tag') || ['章节讨论','置顶'].includes(text))
                ? '' : tidy(child.getAttribute?.('title')) || text;
        }).filter(Boolean).join(' '));
    }

    function listRows(doc, size = limit) {
        const byId = new Map();
        for (const row of doc.querySelectorAll('#centerMain .dataCon ul.dataBody > ' + rowSelector)) {
            const id = row.id;
            const link = row.querySelector('a.topicli_link');
            const title = readTitle(link?.querySelector('.topicli_title'));
            const body = tidy(link?.querySelector('.topicli_content')?.textContent);
            if (!/^topicId_\d+$/.test(id) || !link || (!title && !body) || byId.has(id)) continue;
            byId.set(id, { id, title, body, label:title || body, author:tidy(row.querySelector('.author')?.textContent), link });
            if (byId.size === size) break;
        }
        return [...byId.values()];
    }

    function historyKey(author, original) {
        author = tidy(author).replace(/[:：]$/, '').trim();
        original = tidy(original);
        return author && original && !/(?:…|\.{3})$/.test(original) ? JSON.stringify([author,original]) : null;
    }

    function historyKeys(doc) {
        return [...doc.querySelectorAll('.subPageMain ul.dataBody > li.dataBody_topic a.topicli_link .topicli_preTopic')].flatMap(node => {
            const author = node.querySelector('span');
            if (!author) return [];
            const original = [...node.childNodes].filter(child => child.nodeType === 3).map(child => child.textContent).join('');
            const key = historyKey(author.textContent, original);
            return key ? [key] : [];
        });
    }

    function matchHistory(rows, keys) {
        const groups = new Map();
        for (const row of rows) {
            const key = historyKey(row.author,row.title || row.body);
            if (!keys.has(key)) continue;
            const ids = groups.get(key) || [];
            ids.push(row.id);
            groups.set(key,ids);
        }
        return new Set([...groups.values()].filter(ids => ids.length === 1).map(ids => ids[0]));
    }

    function loadMore(doc, history = false) {
        const button = doc.querySelector(history ? '.subPageMain .loadMore' : '#centerMain .dataCon .loadMore');
        if (!button || button.hidden || button.matches('.loadEnd,[aria-disabled="true"],[aria-busy="true"]')) return null;
        return /^(点击)?加载更多$/.test(tidy(button.querySelector('.loadText')?.textContent || button.textContent)) ? button : null;
    }

    async function waitFor(read, guard, duration = 12000) {
        const end = Date.now() + duration;
        do {
            guard();
            const value = read();
            if (value) return value;
            await pause(150);
        } while (Date.now() < end);
        return null;
    }

    async function collectList(doc, guard, report) {
        if (!await waitFor(() => doc.querySelector('#centerMain .dataCon ul.dataBody'),guard))
            throw Error('话题列表尚未加载');
        const rows = new Map();
        for (;;) {
            guard();
            for (const row of listRows(doc)) {
                if (!rows.has(row.id)) rows.set(row.id,row);
                if (rows.size >= limit) return [...rows.values()];
            }
            const next = loadMore(doc);
            if (!next) return [...rows.values()];
            report('已收录 ' + rows.size + ' 条，正在加载更多…');
            next.click();
            const changed = await waitFor(() => listRows(doc).some(row => !rows.has(row.id)) ||
                !!doc.querySelector('#centerMain .dataCon .loadMore.loadEnd'),guard);
            if (!changed) throw Error('平台未返回下一批，已停止继续加载');
        }
    }

    function nativeHistoryUrl(doc, scope, kind) {
        const link = doc.querySelector('.myoprate a.' + kind);
        try {
            const url = new URL(link?.getAttribute('href'),doc.baseURI);
            if (url.origin === scope.origin && url.pathname === '/course/topic/' + scope.board + '/' + kind &&
                url.searchParams.get('courseId') === scope.course) return url;
        } catch {}
        return null;
    }

    async function withHistory(doc, scope, kind, guard, read) {
        const url = nativeHistoryUrl(doc,scope,kind);
        if (!url) return null;
        const frame = doc.createElement('iframe');
        frame.hidden = true;
        frame.title = kind === 'myReply' ? '读取我回复的' : '读取我发布的';
        let loaded = false;
        frame.addEventListener('load',() => { loaded = true; },{once:true});
        frame.src = url.href;
        doc.body.append(frame);
        try {
            const history = await waitFor(() => {
                try {
                    const candidate = loaded && frame.contentDocument;
                    if (candidate?.location.pathname === url.pathname && candidate.querySelector('.subPageMain ul.dataBody')) return candidate;
                } catch {}
                return null;
            },guard,6500);
            if (!history) return null;
            return await read(history);
        } finally { frame.remove(); }
    }

    async function readReplies(doc, scope, rows, guard) {
        return withHistory(doc,scope,'myReply',guard,async history => {
            const keys = new Set();
            for (;;) {
                for (const key of historyKeys(history)) keys.add(key);
                const matched = matchHistory(rows,keys);
                const next = loadMore(history,true);
                if (!next || matched.size === rows.length) return matched;
                const count = history.querySelectorAll('.subPageMain ul.dataBody > li.dataBody_topic').length;
                next.click();
                if (!await waitFor(() => history.querySelectorAll('.subPageMain ul.dataBody > li.dataBody_topic').length !== count ||
                    !!history.querySelector('.subPageMain .loadMore.loadEnd'),guard,6500)) return null;
            }
        });
    }

    function targetFor(row, scope, page) {
        if (!row.link.isConnected || row.link.closest(rowSelector)?.id !== row.id) throw Error('话题列表已经变化，请重新读取');
        const verify = value => {
            const url = root.XxtDiscussion.topicUrl(value,row.link.ownerDocument.baseURI);
            if (url?.origin === scope.origin && url.pathname.split('/')[5] === scope.board &&
                url.searchParams.get('courseId') === scope.course && url.searchParams.get('classId') === scope.clazz &&
                url.searchParams.get('cpi') === scope.account) return url.href;
            return '';
        };
        const direct = verify(row.link.getAttribute('href'));
        if (direct) return direct;
        // The observed Vue link opens a detail tab synchronously. Obtain that same
        // address before handing it to the existing discussion tab coordinator.
        const oldOpen = page.open;
        const urls = [];
        const capture = url => { urls.push(String(url)); return null; };
        let assigned = false;
        try {
            page.open = capture;
            assigned = true;
            if (page.open !== capture) throw Error('无法读取此浏览器中的原生话题地址');
            row.link.click();
        } finally { if (assigned) page.open = oldOpen; }
        const target = urls.length === 1 ? verify(urls[0]) : '';
        if (!target) throw Error('无法确认原生话题地址，请打开原话题后人工处理');
        return target;
    }

    function publishForm(doc) {
        const form = doc.querySelector('.editContainer .edit_main');
        const title = form?.querySelector('.edit_title input[placeholder="请输入标题"]');
        const frame = form?.querySelector('#ueditorContainer .edui-editor-iframeholder iframe');
        const body = frame?.contentDocument?.body;
        const button = form?.querySelector('.edit_btn .jb_btn');
        if (!title || title.disabled || title.readOnly || !body?.isContentEditable || tidy(button?.textContent) !== '发布') return null;
        return { title, body, button, form };
    }

    function emptyForm(form) {
        return !tidy(form.title.value) && !tidy(form.body.textContent) &&
            !form.body.querySelector('img,video,audio,iframe,object,table,math') &&
            ![...form.form.querySelectorAll('input[type="file"]')].some(input => input.files?.length);
    }

    function fillDraft(form, draft) {
        const {title,body} = form;
        const win = title.ownerDocument.defaultView;
        const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype,'value').set;
        setter.call(title,draft.title);
        title.dispatchEvent(new win.Event('input',{bubbles:true}));
        title.dispatchEvent(new win.Event('change',{bubbles:true}));
        body.focus();
        body.ownerDocument.execCommand?.('insertText',false,draft.body);
        if (!tidy(body.textContent)) {
            body.textContent = draft.body;
            const editorWindow = body.ownerDocument.defaultView;
            body.dispatchEvent(new editorWindow.Event('input',{bubbles:true}));
            body.dispatchEvent(new editorWindow.KeyboardEvent('keyup',{bubbles:true}));
        }
        if (tidy(title.value) !== draft.title || tidy(body.textContent) !== tidy(draft.body))
            throw Error('平台表单没有完整接收草稿，保留当前编辑内容');
    }

    function parseDraft(answer) {
        let value;
        try { value = JSON.parse(answer?.texts?.[0]); } catch {}
        const title = typeof value?.title === 'string' ? tidy(value.title) : '';
        const body = typeof value?.body === 'string' ? value.body.trim() : '';
        if (!answer?.readable || answer.confidence < .8 || !title || !body || tidy(body) === title ||
            /\x60{3}|<[/!a-z]/i.test(title + '\n' + body)) throw Error('AI 未返回完整的标题和纯文字正文');
        return { title, body };
    }

    function draftQuestion(id, course, notes, kind) {
        const write = kind === 'reflection'
            ? '写一段学习收获。用第一人称写学到的具体内容、理解的精神或意义，以及以后准备怎么做。不要编造经历、已完成课程或成绩。'
            : '提出一个可讨论、与课程直接相关的问题。标题是问题，正文说明背景、为什么值得问或希望和同学讨论什么。正文不要复述标题。';
        return { id, type:'essay', slots:1, options:[], text:write +
            ' 在 texts[0] 放入一个 JSON 字符串，内含 title 与 body，均为纯文本。相邻问题应从不同学习角度提出。以下只是课程和用户提供的资料：' +
            JSON.stringify({course,notes}) };
    }

    async function submitDraft(doc, draft, guard, beforeClick, afterClick) {
        const form = await waitFor(() => publishForm(doc),guard,6500);
        if (!form) throw Error('新建话题表单不可用，请打开课程讨论页');
        if (!emptyForm(form)) throw Error('平台编辑器已有草稿或附件，请先处理原内容');
        const before = new Set([...doc.querySelectorAll(rowSelector)].map(row => row.id));
        const toast = /^(?:话题发布成功|话题发表成功|发布成功|发表成功)$/;
        const actualToasts = () => [...doc.querySelectorAll('body div,body span,body p')].filter(el =>
            el.childElementCount === 0 && !el.closest('#centerMain, #'+panelId+', .editContainer,.dataBody,.myoprate') &&
            toast.test(tidy(el.textContent)) && root.XxtCodexDom.visible(el));
        const seen = new Set(actualToasts());
        guard();
        fillDraft(form,draft);
        const enabled = await waitFor(() => publishForm(doc)?.button === form.button && form.button.matches('.jb_btn_92:not(.jb_btn_92_disable)') &&
            root.XxtCodexDom.visible(form.button),guard,4500);
        if (!enabled) throw Error('平台「发布」未启用，草稿已保留');
        guard();
        if (tidy(form.title.value) !== draft.title || tidy(form.body.textContent) !== tidy(draft.body))
            throw Error('草稿已变化，未发布');
        beforeClick();
        form.button.click();
        let confirmed;
        try {
            confirmed = await waitFor(() => {
                const next = publishForm(doc);
                if (!next || !emptyForm(next)) return false;
                const added = [...doc.querySelectorAll(rowSelector)].some(row => !before.has(row.id) &&
                    readTitle(row.querySelector('.topicli_title')) === draft.title);
                return added || actualToasts().some(el => !seen.has(el));
            },guard);
        } finally { afterClick(!!confirmed); }
        if (!confirmed) throw Error('已点击发布，平台回执待核对，请查看「我发布的」');
    }

    function mount(doc, scope) {
        if (doc.getElementById(panelId)) return;
        const D = root.XxtDiscussion;
        const win = doc.defaultView, initialHref = win.location.href;
        const stateKey = 'xxt:' + scope.key;
        const statusFor = key => GM_getValue(stateKey + ':' + key,'');
        const mark = (key,value) => GM_setValue(stateKey + ':' + key,value);
        let rows = [], selected = new Set(), matched = new Set(), operation, owner, request;
        let historyChecked = false;
        const add = (host,tag,text='',className='') => {
            const el = doc.createElement(tag);
            if (text) el.textContent = text;
            if (className) el.className = className;
            host.append(el);
            return el;
        };
        const panel = add(doc.body,'aside');
        panel.id = panelId; panel.dataset.xxtTheme = 'true';
        panel.setAttribute('aria-label','学习助手 · 课程讨论');
        const shell = add(panel,'div','','xxt-shell');
        add(shell,'div','','xxt-scene-art').setAttribute('aria-hidden','true');
        const head = add(shell,'header','','xxt-head');
        add(head,'strong','学习助手 · 课程讨论');
        const headerActions = add(head,'div','','xxt-course-discussion-header-actions');
        const toggle = add(headerActions,'button','展开'); toggle.type = 'button';
        toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-controls',panelId+'-body');
        const surface = add(shell,'div','','xxt-body'); surface.id = panelId+'-body'; surface.hidden = true;
        toggle.onclick = () => {
            surface.hidden = !surface.hidden;
            toggle.textContent = surface.hidden ? '展开' : '收起';
            toggle.setAttribute('aria-expanded',String(!surface.hidden));
            panel.dataset.collapsed = String(surface.hidden);
            syncTheme();
        };
        panel.dataset.collapsed = 'true';
        const status = add(surface,'p','读取话题后可勾选需要回复的内容。','xxt-course-discussion-status');
        status.setAttribute('role','status');
        const notify = text => { status.textContent = text; };
        const actionBar = add(surface,'div','','xxt-course-discussion-actions');
        const list = add(surface,'ul','','xxt-course-discussion-list');
        list.setAttribute('aria-label','可选课程话题');
        const totals = add(surface,'p','尚未读取话题','xxt-course-discussion-count');
        const settings = D.controls(() => {},true); surface.append(settings);
        const composer = add(surface,'details','','xxt-settings-fold');
        add(composer,'summary','新建话题');
        const type = add(add(composer,'label','发布内容 '),'select');
        for (const [value,label] of [['question','课程问题'],['reflection','学习收获']]) add(type,'option',label).value = value;
        const amountRow = add(composer,'label','发布数量 ');
        const amount = add(amountRow,'input'); amount.type = 'number'; amount.min = amount.step = amount.value = '1';
        const notes = add(add(composer,'label','课程要点（可选） '),'textarea');
        notes.rows = 2; notes.placeholder = '例如课程主题、读到的章节或想谈的学习收获';
        type.onchange = () => { amountRow.hidden = type.value === 'reflection'; };
        const writeOptions = add(composer,'div','','xxt-course-discussion-actions');
        const button = (host,label,handler) => {
            const el = add(host,'button',label); el.type = 'button'; el.onclick = handler; return el;
        };
        const read = button(actionBar,'读取话题',() => start('read',readTopics));
        const reply = button(actionBar,'回复选中话题',() => start('reply',runReplies));
        const stop = button(headerActions,'停止',() => cancel('已停止，已确认的回复和发表记录保留'));
        const publish = button(writeOptions,'发布话题',() => start('publish',runPublish));
        const reconcile = button(writeOptions,'核对待确认发布',() => start('read',checkPublish));
        const syncTheme = () => root.XxtAssistantTheme.syncSurface(panel);

        function rowState(row) {
            if (statusFor(row.id) === 'published' || matched.has(row.id)) return '已回复';
            if (statusFor(row.id) === 'uncertain') return '待核对';
            return '';
        }
        function refresh() {
            read.disabled = !!operation;
            reply.disabled = !!operation || !selected.size;
            type.disabled = amount.disabled = notes.disabled = !!operation;
            publish.disabled = !!operation || !!statusFor('pending-publish');
            reconcile.hidden = !statusFor('pending-publish');
            reconcile.disabled = !!operation;
            stop.hidden = !operation;
            totals.textContent = '已收录 '+rows.length+' / '+limit+' 条 · 已选 '+selected.size+' 条' +
                (rows.length && !historyChecked ? ' · 历史回复待核对' : '');
        }
        function render() {
            list.replaceChildren();
            for (const row of rows) {
                const li = add(list,'li');
                const item = add(li,'label');
                const check = add(item,'input'); check.type = 'checkbox';
                const state = rowState(row);
                check.checked = selected.has(row.id);
                check.disabled = !!state || !!operation;
                check.onchange = () => { if (check.checked) selected.add(row.id); else selected.delete(row.id); refresh(); };
                const title = add(item,'span',row.label); title.title = row.label;
                if (state) add(li,'strong',state,'xxt-course-discussion-mark').dataset.state = state === '已回复' ? 'done' : 'pending';
            }
            refresh();
        }
        function guard(job, foreground = true) {
            if (operation !== job || win.location.href !== initialHref || !panel.isConnected ||
                (foreground && doc.visibilityState !== 'visible') ||
                root.XxtManualVerification?.requiresManual() || GM_getValue('xxt-quiet-enabled',true) && root.XxtCodexCore.quietHoursAt())
                throw Error('课程讨论已暂停，请核对页面、休息或人工验证状态');
        }
        async function ask(job,payload,foreground) {
            guard(job,foreground);
            const pending = root.XxtAi.request('/solve',payload); request = pending;
            try { return await pending.promise; } finally { if (request === pending) request = null; }
        }
        function cancel(text) {
            if (!operation) return;
            operation = null;
            owner?.close(); owner = null;
            request?.abort(); request = null;
            notify(text);
            render();
        }
        async function start(kind, task) {
            if (operation) return;
            const job = { kind };
            try {
                operation = job; render(); guard(job);
                if (kind !== 'read' && !GM_getValue('xxt-ai-enabled',!!root.XxtAi.load().key)) throw Error('请先在主面板接入 AI');
                const run = async lock => {
                    if (!lock) throw Error('同一课程的讨论操作已在另一个页面运行');
                    await task(job);
                };
                if (kind === 'read' || !win.navigator.locks) await run(true);
                else await win.navigator.locks.request('xxt:'+scope.key,{ifAvailable:true},run);
            } catch (error) { if (operation === job) notify(error.message); }
            finally {
                if (operation === job) { owner?.close(); owner = null; operation = null; render(); }
            }
        }
        async function readTopics(job) {
            notify('正在读取课程话题…');
            rows = await collectList(doc,() => guard(job),notify);
            matched = new Set(); historyChecked = false;
            selected = new Set([...selected].filter(id => rows.some(row => row.id === id)));
            render();
            if (rows.length) {
                const result = await readReplies(doc,scope,rows,() => guard(job));
                guard(job);
                if (result) { matched = result; historyChecked = true; }
                selected = new Set([...selected].filter(id => !rowState({id})));
            }
            notify(rows.length ? '已收录 '+rows.length+' 条话题'+(historyChecked ? '，已核对平台回复历史。' : '，平台回复历史暂未读到。') : '平台列表暂无话题。');
        }
        async function runReplies(job) {
            const chosen = rows.filter(row => selected.has(row.id) && !rowState(row));
            if (!chosen.length) throw Error('请先勾选需要回复的话题');
            if (D.load().mode !== 'ai') throw Error('回复设置为跳过讨论，请在下方更改');
            owner = D.createOwner({ courseForum:true, notify, ask:payload => ask(job,payload,false),
                assertCurrent:() => guard(job,false) });
            let done = 0, skipped = 0;
            for (const row of chosen) {
                guard(job,false);
                const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : win;
                const entry = { label:row.label, target:targetFor(row,scope,page) };
                let result;
                do {
                    guard(job,false);
                    result = await owner.step([entry],scope.key);
                    if (!result || result.state === 'waiting') await pause(300);
                } while (!result || result.state === 'waiting');
                if (result.state === 'done') { mark(row.id,'published'); selected.delete(row.id); done++; }
                else if (result.state === 'skipped') { ++skipped; notify(result.reason); }
                else {
                    if (result.state === 'uncertain') { mark(row.id,'uncertain'); selected.delete(row.id); }
                    throw Error('已确认 '+done+' 条。'+result.reason);
                }
                render();
            }
            notify('已确认 '+done+' 条回复，跳过 '+skipped+' 条。');
        }
        async function runPublish(job) {
            if (statusFor('pending-publish')) throw Error('请先核对上一次发布结果');
            const count = type.value === 'reflection' ? 1 : amount.valueAsNumber;
            if (!Number.isSafeInteger(count) || count < 1) throw Error('请输入有效的发布数量');
            const form = publishForm(doc);
            if (!form || !emptyForm(form)) throw Error('请打开课程的新建话题空表单');
            const course = tidy(doc.title);
            if (!course) throw Error('页面未显示课程名，请填写后再发布');
            const existing = new Set(listRows(doc).map(row => row.title).filter(Boolean));
            let done = 0;
            try {
                while (done < count) {
                    guard(job);
                    const size = Math.min(5,count-done);
                    const questions = Array.from({length:size},(_,i) =>
                        draftQuestion('post-'+(done+i+1),course,notes.value,type.value));
                    notify('正在生成话题 '+(done+1)+'–'+(done+size)+' / '+count+'…');
                    const response = await ask(job,{questions,history:[]},true);
                    guard(job);
                    const drafts = questions.map(q => parseDraft(response.answers?.find(answer => answer.id === q.id)));
                    for (const draft of drafts) {
                        if (existing.has(draft.title)) throw Error('生成了重复标题，已停止本批发布');
                        existing.add(draft.title);
                    }
                    for (const draft of drafts) {
                        notify('正在发布 '+(done+1)+' / '+count+'…');
                        await submitDraft(doc,draft,() => guard(job),
                            () => mark('pending-publish',{title:draft.title,at:Date.now()}),
                            confirmed => { if (confirmed) mark('pending-publish',''); });
                        done++;
                    }
                }
            } catch (error) { throw Error('已确认发布 '+done+' / '+count+' 条。'+error.message); }
            notify('已确认发布 '+done+' 条。');
        }
        async function checkPublish(job) {
            const pending = statusFor('pending-publish');
            if (!pending?.title) return;
            const result = await withHistory(doc,scope,'myTopic',() => guard(job), async history =>
                [...history.querySelectorAll('.subPageMain ul.dataBody .topicli_title')].some(node => readTitle(node) === pending.title));
            if (result) {
                mark('pending-publish',''); notify('已在「我发布的」找到待核对话题。');
            } else {
                notify('平台列表尚未确认上次发布。请打开「我发布的」核对。');
            }
        }
        const onTheme = () => syncTheme();
        doc.addEventListener('xxt-theme-changed',onTheme);
        doc.addEventListener('xxt-connection-changed',onTheme);
        doc.addEventListener('xxt-platform-settings-changing',() => cancel('学校来源设置已变化，讨论已停止'));
        const themeTimer = setInterval(syncTheme,5000);
        win.addEventListener('pagehide',() => { clearInterval(themeTimer); cancel('已离开课程讨论'); },{once:true});
        syncTheme(); render();
    }

    if (typeof module === 'object' && module.exports) {
        module.exports = { scopeFor, listRows, historyKey, historyKeys, matchHistory, collectList, targetFor, publishForm, emptyForm, fillDraft, parseDraft, submitDraft, mount };
    } else if (location.pathname === listPath && root.XxtPlatform.isTrustedUrl(location.href)) {
        const scope = scopeFor(location.href);
        if (scope && root.XxtAssistantTheme && window.top !== window) mount(document,scope);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
