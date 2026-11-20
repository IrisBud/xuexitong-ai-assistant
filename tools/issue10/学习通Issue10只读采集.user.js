// ==UserScript==
// @name         学习通 Issue 10 只读结构采集器（临时）
// @namespace    xxt-issue10-local-collector
// @version      0.1.0
// @description  手动导出当前题目结构；不答题、不保存、不提交、不上传。用完请删除。
// @match        *://*.chaoxing.com/*
// @match        *://*.xueyinonline.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(() => {
  'use strict';
  const HOST = 'xxt-issue10-readonly-collector';
  if (document.getElementById(HOST)) return;
  const QUESTION = '.TiMu,.questionLi,.question-item,.questionItem,[data-question-id]';
  const CONTROL = 'input[type="radio"],input[type="checkbox"],[role="radio"],[role="checkbox"],.num_option,.num_option_dx';
  const EXCLUDE = '[data-xxt-codex-panel],#xxt-issue10-readonly-collector';
  const aliases = new Map();
  function alias(s) {
    return String(s || '').replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b1[3-9]\d{9}\b/gi, '[隐藏]')
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}|[a-f0-9]{16,}|\d{5,}/gi, v => {
        if (!aliases.has(v)) aliases.set(v, 'N' + (aliases.size + 1));
        return aliases.get(v);
      }).slice(0, 400);
  }
  function label(s) {
    const v = String(s || '').trim().replace(/\s+/g, ' ');
    if (!v) return '';
    if (/^(?:[A-T][.、．]?|对|错|正确|错误|true|false|暂时保存|提交|确定|取消)$/i.test(v)) return v;
    const kinds = [...new Set(v.match(/多选题|单选题|判断题|填空题|简答题|论述题|计算题|其他|其它/g) || [])];
    return (kinds.length ? '[题型:' + kinds.join('/') + '] ' : '') + '[正文隐藏，' + Array.from(v).length + '字]';
  }
  function visible(n) {
    const w = n.ownerDocument.defaultView;
    return !!n.getClientRects().length && w.getComputedStyle(n).visibility !== 'hidden';
  }
  function attrs(n) {
    const out = {};
    for (const a of n.attributes) {
      if (['id', 'class', 'name', 'type', 'role', 'for', 'contenteditable', 'disabled', 'readonly', 'multiple', 'tabindex'].includes(a.name)) out[a.name] = alias(a.value);
      else if (['aria-disabled', 'aria-hidden', 'aria-multiselectable'].includes(a.name)) out[a.name] = /^(true|false)$/.test(a.value) ? a.value : '[隐藏]';
      else if (a.name === 'aria-label') out[a.name] = label(a.value);
      else if (/^on[a-z]+$/.test(a.name)) {
        const names = [...a.value.matchAll(/\b([A-Za-z_$][\w.$]*)\s*\(/g)].map(m => alias(m[1]));
        if (names.length) out['data-collector-' + a.name] = [...new Set(names)].slice(0, 8).join(',') + '(参数隐藏)';
      }
    }
    return out;
  }
  function describe(n) {
    return { tag: n.tagName.toLowerCase(), attrs: attrs(n), visible: visible(n) };
  }
  function structuralHTML(node) {
    if (node.querySelectorAll('*').length > 6000) return { html: '', omitted: '节点过多，改用备用方法采集单题' };
    const clone = node.cloneNode(true);
    for (const n of [clone, ...clone.querySelectorAll('*')]) {
      if (n.matches('script,style,noscript,template,link,meta,object,embed') || n.matches(EXCLUDE)) { n.remove(); continue; }
      const kept = attrs(n);
      // Only a short, explicitly named question-type code is useful; never export answer values.
      const typeCode = n.matches('input[type="hidden"]') && /^(?:type|questiontype|answertype)\d*$/i.test(n.getAttribute('name') || '') && /^\d{1,2}$/.test(n.getAttribute('value') || '') ? n.getAttribute('value') : null;
      for (const a of [...n.attributes]) n.removeAttribute(a.name);
      for (const [k, v] of Object.entries(kept)) n.setAttribute(k, v);
      if (n.matches('input')) n.setAttribute('value', typeCode === null ? '[输入内容隐藏]' : typeCode);
      if (n.matches('textarea')) n.textContent = '[输入内容隐藏]';
      if (n.matches('img,iframe,video,audio,source')) n.setAttribute('data-collector-resource', '地址隐藏，未下载');
    }
    const walker = clone.ownerDocument.createTreeWalker(clone, 4 | 128);
    const comments = [];
    let item;
    while ((item = walker.nextNode())) {
      if (item.nodeType === 8) comments.push(item);
      else if (item.parentElement?.tagName !== 'TEXTAREA') item.nodeValue = label(item.nodeValue);
    }
    comments.forEach(n => n.remove());
    const html = clone.outerHTML;
    return { html: html.slice(0, 100000), truncated: html.length > 100000 };
  }
  function roots(doc) {
    let list = [...doc.querySelectorAll(QUESTION)].filter(n => !n.closest(EXCLUDE) && visible(n));
    // New skins can use native checkbox/radio controls without the usual question class.
    if (!list.length) {
      for (const field of [...doc.querySelectorAll(CONTROL)].slice(0, 120)) {
        if (field.closest(EXCLUDE)) continue;
        let n = field.parentElement;
        for (let i = 0; n && !n.matches('body,html') && i < 7; i++, n = n.parentElement) {
          if (visible(n) && n.querySelectorAll(CONTROL).length >= 2 && /多选题|单选题|判断题/.test(n.textContent || '') && !n.querySelector(EXCLUDE)) { list.push(n); break; }
        }
      }
    }
    list = [...new Set(list)];
    return list.filter(n => !list.some(other => other !== n && other.contains(n)));
  }
  function collect() {
    aliases.clear();
    const seen = new Set(), docs = [];
    let questionCount = 0, inaccessibleFrames = 0, remaining = 24;
    function visit(doc, depth) {
      if (seen.has(doc) || seen.size >= 24 || depth > 6) return;
      seen.add(doc);
      const all = roots(doc);
      const chosen = all.slice(0, remaining);
      remaining -= chosen.length;
      const questions = chosen.map((node, i) => {
        const parents = [];
        for (let p = node.parentElement; p && parents.length < 5 && !p.matches('body,html'); p = p.parentElement) parents.push(describe(p));
        return { sample: i + 1, element: describe(node), parents, ...structuralHTML(node),
          controls: [...node.querySelectorAll('input,textarea,select,[role="radio"],[role="checkbox"],iframe')].slice(0, 160).map(n => {
            const style = n.ownerDocument.defaultView.getComputedStyle(n);
            return { ...describe(n), disabled: !!n.disabled, readOnly: !!n.readOnly,
              appearance: style.appearance, borderRadius: style.borderRadius };
          }) };
      });
      questionCount += questions.length;
      const resultNodes = [...doc.querySelectorAll('.mark_table,.newTestCon,.result-container')].filter(n => !n.closest(EXCLUDE) && visible(n) && !all.some(q => q.contains(n)));
      docs.push({ level: depth, isTop: doc.defaultView === doc.defaultView.top, totalQuestionBlocks: all.length,
        omittedQuestionBlocks: all.length - chosen.length, questions,
        resultRegions: resultNodes.slice(0, 2).map(n => ({ ...describe(n), ...structuralHTML(n) })),
        counts: { radio: doc.querySelectorAll('input[type="radio"]').length, checkbox: doc.querySelectorAll('input[type="checkbox"]').length,
          unsupportedHint: /不支持的题型|未适配题型/.test(doc.body?.textContent || ''), readingResultHint: /读取成绩/.test(doc.body?.textContent || '') } });
      for (const f of [...doc.querySelectorAll('iframe,frame')].slice(0, 30)) {
        if (f.closest(EXCLUDE)) continue;
        try { if (f.contentDocument?.body) visit(f.contentDocument, depth + 1); else inaccessibleFrames++; }
        catch { inaccessibleFrames++; }
      }
    }
    visit(document, 0);
    return { schema: 'xxt-issue10-structure-v1', collectorVersion: '0.1.0', questionCount, inaccessibleFrames,
      note: '只读结构快照。文本、输入内容、URL及处理函数参数隐藏；仅保留短题型代码。未自动采集跨域iframe；缺失时在题目子页的采集按钮导出，或使用备用选题采集。',
      documents: docs };
  }
  function mount() {
    if (!document.body || document.getElementById(HOST)) return;
    // Subframes get their own button when they have a question. No cross-frame messaging or storage.
    if (window !== window.top && !roots(document).length) return;
    const host = document.createElement('div'); host.id = HOST;
    host.style.cssText = 'position:fixed!important;left:12px!important;bottom:12px!important;z-index:2147483647!important;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>:host{all:initial}*{box-sizing:border-box}button{font:14px system-ui;cursor:pointer;border:1px solid #1e5cb3;border-radius:6px;padding:9px 12px;background:#175eb2;color:white}button.secondary{background:white;color:#234}.box{position:fixed;inset:5vh 5vw;background:white;color:#182337;border:2px solid #175eb2;border-radius:10px;padding:16px;box-shadow:0 8px 40px #0006;display:flex;flex-direction:column;gap:10px;font:14px/1.6 system-ui}.box p{margin:0}.box textarea{width:100%;flex:1;min-height:120px;font:12px/1.4 monospace;resize:none}.row{display:flex;gap:8px;flex-wrap:wrap}.info{max-width:300px;background:white;color:#182337;padding:8px;border:1px solid #175eb2;margin-bottom:6px;font:13px/1.6 system-ui}</style><div class="info" hidden></div><button type="button" id="export">Issue 10：导出题目结构</button>`;
    const info = shadow.querySelector('.info');
    shadow.querySelector('#export').addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      try {
        const data = collect();
        if (!data.questionCount) {
          info.hidden = false;
          info.textContent = '没有找到题目。请点击题目区域内部的同名按钮；若仍为0，使用说明中的F12备用方法。不要为采集而开始自动、重做或提交。';
          return;
        }
        shadow.querySelector('.box')?.remove();
        const box = document.createElement('section'); box.className = 'box';
        box.innerHTML = '<p></p><p>正文、输入内容和链接已隐藏。仍请检查文件中是否含个人信息；此工具不会上传。</p><textarea readonly aria-label="结构文件预览"></textarea><div class="row"><button type="button" id="download">下载 JSON 文件</button><button type="button" class="secondary" id="close">关闭</button></div>';
        box.querySelector('p').textContent = `采集到 ${data.questionCount} 个题目块。` + (data.inaccessibleFrames ? `另有 ${data.inaccessibleFrames} 个不可读取的子页；不一定是题目缺失。` : '');
        const json = JSON.stringify(data, null, 2);
        box.querySelector('textarea').value = json;
        box.querySelector('#close').addEventListener('click', e => { e.stopPropagation(); box.remove(); });
        box.querySelector('#download').addEventListener('click', e => {
          e.preventDefault(); e.stopPropagation();
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
          const a = document.createElement('a'); a.href = url; a.download = '学习通-Issue10-题目结构.json';
          shadow.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
          info.hidden = false; info.textContent = '已发起下载，请到下载列表确认；检查文件后手动发送。用完请在油猴中删除这个临时采集器。';
        });
        shadow.append(box);
      } catch { info.hidden = false; info.textContent = '采集未完成，请用说明中的F12备用方法。不要发送Cookie或账号资料。'; }
    });
    // Keep collector UI events away from the platform's document-level answer handlers.
    for (const t of ['click','input','change','keydown','pointerdown','pointerup']) host.addEventListener(t, e => e.stopPropagation());
    document.body.append(host);
  }
  mount();
  if (!document.getElementById(HOST)) {
    // Limited wait for delayed question frames; does not observe, click or navigate platform content.
    let attempts = 0;
    const timer = setInterval(() => { mount(); if (document.getElementById(HOST) || ++attempts >= 20) clearInterval(timer); }, 1500);
  }
})();
