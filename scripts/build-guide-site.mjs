import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve(import.meta.dirname,'..'),site=resolve(root,'site'),assets=resolve(site,'assets');
const {version}=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
const repo='https://github.com/IrisBud/xuexitong-ai-assistant';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await mkdir(assets,{recursive:true});
const covers=[
 ['start','#dfdec6','#2a5c49','<rect x="34" y="30" width="150" height="150" rx="75" fill="none" stroke-width="2"/><path d="M63 135V74h39l14 14h39v61h-92Z" fill="none" stroke-width="3"/><path d="m87 114 15 15 31-35" fill="none" stroke-width="4"/>'],
 ['media','#65a09c','#123d40','<path d="M0 58h218M0 160h218" stroke-width="1"/><circle cx="109" cy="106" r="61" fill="none" stroke-width="2"/><path d="m95 77 43 29-43 29Z" fill="currentColor" stroke="none"/><path d="M25 181h168M25 188h92" stroke-width="2"/>'],
 ['answers','#c66e55','#f4e9d5','<rect x="42" y="24" width="135" height="166" rx="4" fill="none" stroke-width="2"/><path d="m62 63 7 7 14-17m-21 58 7 7 14-17m-21 57 7 7 14-17M98 65h58m-58 48h58m-58 46h38" fill="none" stroke-width="3"/>'],
 ['courses','#d9ba62','#395241','<path d="M24 40h170v43H63v44h131v43H24" fill="none" stroke-width="2"/><circle cx="24" cy="40" r="8" fill="currentColor" stroke="none"/><circle cx="194" cy="83" r="8" fill="currentColor" stroke="none"/><circle cx="63" cy="127" r="8" fill="currentColor" stroke="none"/><path d="m180 157 14 13-14 13" fill="none" stroke-width="3"/>'],
 ['ai','#a6b7cf','#2f4e79','<path d="M24 43h120v75H78l-27 23v-23H24ZM80 90h113v73h-23v26l-31-26H80Z" fill="none" stroke-width="2"/><path d="M43 64h75m-75 14h50m-50 14h65m37 43h29m-29 13h15" fill="none" stroke-width="3"/>'],
 ['help','#c0b4ce','#46395c','<circle cx="109" cy="107" r="72" fill="none" stroke-width="2"/><path d="M90 84c0-26 42-26 42 0 0 16-22 18-22 36m0 19v5" fill="none" stroke-width="5" stroke-linecap="round"/><path d="M109 17V0m0 210v-13M20 107H0m218 0h-20" fill="none" stroke-width="2"/>']
];
for(const[id,bg,ink,shape]of covers)await writeFile(resolve(assets,`cover-${id}.svg`),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 218 210" fill="none" color="${ink}" stroke="${ink}"><path fill="${bg}" stroke="none" d="M0 0h218v210H0z"/>${shape}</svg>\n`);
const images=[
 ['getting-started/tampermonkey-permissions.png','tampermonkey-permissions.png'],
 ['getting-started/chapter-directory-thumb.png','chapter-directory.png'],
 ['getting-started/chapter-study-thumb.png','chapter-study.png'],
 ['panel-layout/overview.png','panel-overview.png'],
 ['panel-layout/desktop-study.png','panel-study.png'],
 ['panel-layout/desktop-homework.png','panel-homework.png'],
 ['panel-layout/desktop-ai.png','panel-ai.png'],
 ['panel-layout/desktop-course.png','panel-course.png'],
 ['panel-layout/desktop-records.png','panel-records.png'],
 ['themes/landscape-preview.png','themes-preview.png'],
 ['window-layout/step-1.png','window-layout.png']
];
for(const[source,target]of images)await copyFile(resolve(root,'docs',source),resolve(assets,target));
await writeFile(resolve(assets,'release.json'),JSON.stringify({version,repository:repo,download:'https://raw.githubusercontent.com/IrisBud/xuexitong-ai-assistant/main/dist/xuexitong-ai-assistant.user.js'},null,2)+'\n');
let home=await readFile(resolve(site,'index.html'),'utf8');home=home.replace(/(<span data-version>)[^<]+(<\/span>)/g,`$1${version}$2`);await writeFile(resolve(site,'index.html'),home);
const banner=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 390" role="img" aria-label="学习助手：视频、阅读与AI答题"><rect width="1200" height="390" rx="16" fill="#163a35"/><g fill="#f5f1e3" font-family="Microsoft YaHei,PingFang SC,sans-serif"><text x="65" y="105" font-size="27">学习通 · 学习助手</text><text x="65" y="180" font-size="51" font-weight="600">打开一节课，开始学习。</text><text x="68" y="235" font-size="22" fill="#c8d8c7">视频与阅读直接开始，题目可接入自己的 AI。</text><text x="68" y="322" font-size="17" fill="#b5cabc">安装脚本 → 打开具体小节 → 选择运行模式</text></g><g transform="translate(905 192) rotate(-12)"><rect x="-110" y="-113" width="150" height="211" rx="10" fill="#d9ba62"/><path d="m-73-28 23 19 38-48" fill="none" stroke="#395241" stroke-width="5"/></g><g transform="translate(1000 192) rotate(11)"><rect x="-74" y="-108" width="150" height="211" rx="10" fill="#e0dfc9"/><circle cx="1" cy="-22" r="41" fill="none" stroke="#335b48" stroke-width="2"/><path d="m-9-42 31 21-31 21Z" fill="#335b48"/><path d="M-47 51h94m-94 15h64" fill="none" stroke="#335b48" stroke-width="3"/></g></svg>\n`;
await mkdir(resolve(root,'docs/readme'),{recursive:true});await writeFile(resolve(root,'docs/readme/guide-cover.svg'),banner);
if(process.argv.includes('--assets-only')){console.log('Guide assets prepared; article build not run.');process.exit(0);}
const{guides}=await import('../site/content/guides.mjs');
assert.equal(guides.length,10,'The reader guide has ten task-oriented articles');
const ids=new Set(guides.map(g=>g.id));assert.equal(ids.size,guides.length);
await mkdir(resolve(site,'guides'),{recursive:true});
const logo=`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 25 13 9l5 8 4-6 7 14H4Z"/><path d="m10 15 3 3 3-3M20 15l2 2 2-2"/></svg>`;
for(const[gIndex,guide]of guides.entries()){
 assert(/^[a-z-]+$/.test(guide.id));assert(guide.sections.length>=3);
 const side=guides.map(g=>`<a href="./${g.id}.html"${guide.id===g.id?' aria-current="page"':''}>${escape(g.title)}</a>`).join('');
 const toc=guide.sections.map(section=>{assert(/^[a-z0-9-]+$/.test(section.id));return`<a href="#${section.id}">${escape(section.title)}</a>`;}).join('');
 const sections=guide.sections.map(s=>`<section id="${s.id}"><h2>${escape(s.title)}</h2>${s.html}</section>`).join('\n');
 const source=guide.sourceDocs.map(path=>`<a href="${repo}/blob/main/${path.split('/').map(encodeURIComponent).join('/')}">${escape(path.replace('docs/',''))}</a>`).join('');
 const previous=guides[gIndex-1],next=guides[gIndex+1];
 const html=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#f7f6f0"><meta name="description" content="${escape(guide.summary)}"><title>${escape(guide.title)} · 学习助手使用手册</title><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../assets/site.css"><script src="../assets/site.js" defer></script></head>
<body class="reader"><a class="skip-link" href="#main">跳到正文</a><header class="site-header"><a class="brand" href="../index.html">${logo}<span>学习助手<span class="brand-divider">/</span><span class="brand-sub">使用手册</span></span></a><nav class="header-nav" aria-label="主导航"><a href="../index.html#find">搜索教程</a><a href="${repo}/releases">更新记录</a><a class="github-link" href="${repo}">GitHub ↗</a></nav></header>
<div class="reader-layout"><aside class="guide-sidebar"><a class="side-home" href="../index.html">← 所有教程</a><nav aria-label="教程目录">${side}</nav><p class="side-version">正式版 ${version}<br>安装后刷新具体学习页</p></aside><main class="article" id="main"><header class="article-header"><p class="breadcrumb"><a href="../index.html">使用手册</a><span>/</span>${escape(guide.title)}</p><h1>${escape(guide.title)}</h1><p class="article-lead">${escape(guide.summary)}</p><p class="article-meta"><span>按正式版 ${version} 整理</span><span>${escape(guide.minutes)} 分钟阅读</span></p></header><details class="mobile-toc"><summary>这篇讲什么</summary><nav aria-label="本页目录">${toc}</nav></details><div class="article-body">${sections}</div><div class="article-bottom"><p>需要查原始说明或当前适配范围：</p><div class="source-links">${source}</div><p>界面图用于说明操作位置，不能证明真实课程提交、任务点或实际成绩。</p><a href="${repo}/issues/new/choose">这篇没解决你的问题？反馈给作者 ↗</a></div><nav class="article-next" aria-label="相邻教程">${previous?`<a href="./${previous.id}.html"><small>← 上一篇</small>${escape(previous.title)}</a>`:''}${next?`<a href="./${next.id}.html"><small>下一篇 →</small>${escape(next.title)}</a>`:''}</nav></main><aside class="article-toc"><p>本页内容</p><nav aria-label="本页内容">${toc}</nav></aside></div>
<footer class="site-footer shell"><a class="footer-title" href="../index.html">学习助手 · 使用手册</a><p>正式版 ${version} · 任务点和成绩请在学习通核对</p><nav aria-label="页脚"><a href="${repo}">源代码</a><a href="${repo}/blob/main/NOTICE.md">来源与许可</a></nav></footer></body></html>\n`;
 await writeFile(resolve(site,'guides',`${guide.id}.html`),html);
}
const text=html=>html.replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();
await writeFile(resolve(assets,'search-index.json'),JSON.stringify(guides.map(g=>({id:g.id,title:g.title,summary:g.summary,keywords:g.keywords,text:g.sections.map(s=>s.title+' '+text(s.html)).join(' ')}))));
await writeFile(resolve(site,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://irisbud.github.io/xuexitong-ai-assistant/</loc></url>${guides.map(g=>`<url><loc>https://irisbud.github.io/xuexitong-ai-assistant/guides/${g.id}.html</loc></url>`).join('')}</urlset>\n`);
await writeFile(resolve(site,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://irisbud.github.io/xuexitong-ai-assistant/sitemap.xml\n');
console.log(`Built GitHub Pages guide: ${guides.length} articles, local search and ${images.length} original screenshots; formal version ${version}.`);
