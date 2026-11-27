import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {fontDependenciesCode} from './font-dependencies.mjs';
import { themeAssetCode } from './theme-assets.mjs';
const root = resolve(import.meta.dirname, '..');
const {version} = JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const release = JSON.parse(readFileSync(resolve(root,'src/release.json'),'utf8'));
if (release.version !== version) throw Error('Release notes version does not match package version');
const header = `// ==UserScript==
// @name         超星学习通自动化脚本（支持接入各种主流AI模型api）
// @namespace    xuexitong-ai-assistant.public
// @version      ${version}
// @description  视频、文献与学习练习辅助；自配 AI API；不含任何密钥
// @supportURL   https://github.com/IrisBud/xuexitong-ai-assistant/issues
// @updateURL    https://irisbud.github.io/xuexitong-ai-assistant/assets/xuexitong-ai-assistant.meta.js
// @downloadURL  https://github.com/IrisBud/xuexitong-ai-assistant/releases/latest/download/xuexitong-ai-assistant.user.js
// @match        https://*.chaoxing.com/*
// @match        https://chaoxing.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_xmlhttpRequest
// @grant        GM_audio
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @connect      irisbud.github.io
// @connect      *
// ==/UserScript==

`;
const files = ['vendor/jquery-3.6.0.min.js','vendor/html2canvas-1.4.1.min.js','src/core.cjs','src/retry.cjs','src/fonts.js','src/dom.js','src/capture.js','src/documents.js','src/manual-verification.js','src/reading.js','src/page-tasks.js','src/interruptions.js','src/video-lines.js','src/video-quiz.js','src/models.cjs','src/locator.cjs','src/run-ledger.cjs','src/dispatch.cjs','src/diagnostics.cjs','src/profiles.cjs','src/personas.cjs','src/ai.js','src/discussion.js','src/short-answer.js','src/updates.cjs','src/rate-notice.js','src/force-rate.js','src/theme.js','src/audio.cjs','src/workflow.js','src/player.js'];
files.splice(files.indexOf('src/theme.js'),0,'src/programming-code.cjs','src/homework.cjs','src/saved-quizzes.cjs','src/panel-layout.js');
files.splice(files.indexOf('src/theme.js'),0,'src/panel-motion.js');
files.splice(files.indexOf('src/theme.js'),0,'vendor/exam-pdf/pdf-text.js','src/exam-knowledge.js','src/exam-ui.js');
files.splice(files.indexOf('src/workflow.js'),0,'src/homework-dom.js','src/homework-runtime.js');
files.splice(files.indexOf('src/workflow.js'),0,'src/course-hub.js','src/course-discussion.js');
files.splice(files.indexOf('src/workflow.js'),0,'src/exam-dom.js','src/exam-runtime.js');
const startup = ['src/platform.cjs','vendor/noble-sha256.cjs','src/compat.cjs','src/bootstrap.js'].map(path=>readFileSync(resolve(root,path),'utf8')).join('\n');
const content = header + '(() => { const module = undefined, exports = undefined, define = undefined;\n' + `globalThis.XxtRelease = ${JSON.stringify(release)};\n` + startup + '\nif (!XxtStartup.prepare()) return;\ntry {\n' + themeAssetCode() + fontDependenciesCode() + files.map(path=>readFileSync(resolve(root,path),'utf8')).join('\n') + '\n} catch (error) { XxtStartup.fail(error); }\n})();\n';
mkdirSync(resolve(root,'dist'),{recursive:true});
writeFileSync(resolve(root,'dist/xuexitong-ai-assistant.user.js'),content);
writeFileSync(resolve(root,'dist/xuexitong-ai-assistant.meta.js'),header);
writeFileSync(resolve(root,'dist/release.json'),JSON.stringify(release,null,2)+'\n');
console.log(`Built public userscript ${version}; no local configuration included.`);
