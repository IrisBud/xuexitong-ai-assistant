import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fontDependenciesCode} from './font-dependencies.mjs';
import {themeAssetCode} from './theme-assets.mjs';
const root=resolve(import.meta.dirname,'..');
function walk(dir){return readdirSync(dir).flatMap(name=>{if(['.git','node_modules','artifacts','local','output','.playwright-cli'].includes(name))return [];const path=resolve(dir,name);return statSync(path).isDirectory()?walk(path):[path];});}
// These local working notes are excluded by package.mjs and the upload whitelist.
const paths=walk(root).filter(path=>!['TASK_PROGRESS.md','AGENTS.md'].includes(relative(root,path)));
for(const path of paths){
 const name=relative(root,path).replaceAll('\\','/');
 if(/bridge-token|\.log$|本机\.user\.js|hongya|虹芽|job-/.test(name))throw Error(`Private artifact path: ${name}`);
 if(!/\.(js|cjs|mjs|md|json|yml|txt)$/.test(name))continue;
 const raw=readFileSync(path,'utf8');
 // Exempt only the exact, hash-verified public theme asset block from the private PNG check.
 const text=name === 'dist/xuexitong-ai-assistant.user.js' ? raw.replace(themeAssetCode(),'') : raw;
 if(name !== 'scripts/check-public.mjs')assert(!/[A-Z]:[/\\](Users|Codex)[/\\]|XxtHongyaAsset|data:image\/png;base64,[A-Za-z0-9+/]{500}/.test(text),`Personal asset/path in ${name}`);
 assert(!/GM_setValue\(['"]xxt-codex-token['"],\s*['"][a-f0-9]{64}/.test(text),`Paired token in ${name}`);
 assert(!/sk-[A-Za-z0-9_-]{20,}/.test(text),`Possible key in ${name}`);
 if(/\.(js|cjs|mjs)$/.test(name))execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
}
const script=readFileSync(resolve(root,'dist/xuexitong-ai-assistant.user.js'),'utf8');
const noble=JSON.parse(readFileSync(resolve(root,'vendor/noble-sha256.json'),'utf8'));
const nobleBytes=readFileSync(resolve(root,'vendor',noble.file));
assert.equal(createHash('sha256').update(nobleBytes).digest('hex'),noble.sha256,'Pinned SHA-256 dependency changed');
assert(script.includes(nobleBytes.toString('utf8')),'Stale SHA-256 dependency');
assert(script.includes(themeAssetCode()),'Stale theme assets');
assert(script.includes(fontDependenciesCode()),'Stale font dependencies');
const pdf=JSON.parse(readFileSync(resolve(root,'vendor/exam-pdf/manifest.json'),'utf8'));
const pdfBytes=readFileSync(resolve(root,'vendor/exam-pdf',pdf.file));
assert.equal(createHash('sha256').update(pdfBytes).digest('hex'),pdf.sha256,'Pinned PDF parser changed');
assert(script.includes(pdfBytes.toString('utf8')),'Stale PDF parser');
for(const name of ['exam-knowledge.js','exam-ui.js','exam-dom.js','exam-runtime.js'])assert(script.includes(readFileSync(resolve(root,'src',name),'utf8')),`Stale build: ${name}`);
for(const name of ['platform.cjs','compat.cjs','bootstrap.js','core.cjs','retry.cjs','fonts.js','dom.js','capture.js','documents.js','manual-verification.js','reading.js','page-tasks.js','interruptions.js','video-lines.js','video-quiz.js','models.cjs','locator.cjs','run-ledger.cjs','dispatch.cjs','diagnostics.cjs','profiles.cjs','personas.cjs','ai.js','discussion.js','short-answer.js','saved-quizzes.cjs','updates.cjs','rate-notice.js','force-rate.js','programming-code.cjs','homework.cjs','panel-layout.js','panel-motion.js','theme.js','audio.cjs','homework-dom.js','homework-runtime.js','course-hub.js','course-discussion.js','workflow.js','player.js'])assert(script.includes(readFileSync(resolve(root,'src',name),'utf8')),`Stale build: ${name}`);
const {version}=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const release=JSON.parse(readFileSync(resolve(root,'src/release.json'),'utf8'));
const readme=readFileSync(resolve(root,'README.md'),'utf8').replaceAll('\r\n','\n'),notice=release.channel==='candidate'
    ? `当前文件是本地候选 ${version}` : `目前脚本最新版本为 ${version}，请已安装脚本的用户尽快更新`;
assert(readme.includes(notice)&&readme.indexOf(notice)<readme.indexOf('\n## '),'README latest-version reminder must match package version and precede features');
assert(readme.includes(`## 功能\n<!-- 功能核对版本：${version} -->`),'Review the README feature summary and update its verification version');
assert(script.includes(`@version      ${version}`));assert(script.includes('@connect      *'));
assert.equal(release.version,version);assert.deepEqual(JSON.parse(readFileSync(resolve(root,'dist/release.json'),'utf8')),release);
const meta=readFileSync(resolve(root,'dist/xuexitong-ai-assistant.meta.js'),'utf8');assert.equal(meta,script.slice(0,script.indexOf('(() => {')));
assert(meta.includes('@updateURL    https://raw.githubusercontent.com/IrisBud/xuexitong-ai-assistant/main/dist/xuexitong-ai-assistant.meta.js'));
console.log(`Public build checked: ${paths.length} files, source sync and JavaScript syntax; theme assets hash-verified; no known personal paths or paired credentials.`);

