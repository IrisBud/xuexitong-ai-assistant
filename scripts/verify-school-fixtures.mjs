/* Reuse real assertion bodies with HTTP school origins and mock GM approval only. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'artifacts/issue-11/school-fixtures');await mkdir(out,{recursive:true});
const names=['verify-two-checks.mjs','verify-answer-preview.mjs','verify-document-reading.mjs','verify-document-scroll.mjs','verify-topic-reading.mjs','verify-homework-runtime.mjs','verify-image-questions.mjs','verify-discussions.mjs','verify-short-answer-nested.mjs','verify-course-hub.mjs','verify-course-queue-bridge.mjs','verify-audio-tasks.mjs','verify-captcha-guard.mjs','verify-video-quiz.mjs','verify-quiet-hours.mjs','verify-text-routing.mjs','verify-page-tasks.mjs','verify-saved-quizzes.mjs'];
const selected=process.env.XXT_SCHOOL_CASE?names.filter(n=>n===process.env.XXT_SCHOOL_CASE):names;
if(!selected.length)throw Error('Unknown school fixture');
const runtimeSHA256=createHash('sha256').update(await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'))).digest('hex'),results=[];
let prior;
if(process.env.XXT_SCHOOL_RESUME==='1'){
    prior=JSON.parse(await readFile(resolve(out,'verification.json'),'utf8'));
    if(prior.runtimeSHA256!==runtimeSHA256)throw Error('Cannot resume school fixtures from different runtime bytes');
}
for(const name of selected){
    const original=await readFile(resolve(root,'tests',name),'utf8');
    // Only synthetic platform addresses change. Remote model URLs remain HTTPS.
    const hosts=[...new Set([...original.matchAll(/https:\/\/([a-z0-9.-]+)\.chaoxing\.com/gi)].map(m=>m[1]))];
    const origins=[...new Set([...hosts,'mooc1','mooc2-ans','mooc2','mooc1-ans','work','groupweb','pan-yz','i'])].map(host=>`http://${host}.school.example`);
    let source=original.replaceAll("'./browser-runtime.mjs'",JSON.stringify(pathToFileURL(resolve(root,'tests/school-browser-runtime.mjs')).href))
        .replaceAll('import.meta.dirname',JSON.stringify(resolve(root,'tests')))
        .replaceAll("new URL('../",`new URL('${pathToFileURL(root+'/').href}`)
        .replace(/https:\/\/([a-z0-9.-]+)\.chaoxing\.com/gi,'http://$1.school.example')
        .replaceAll('https://${','http://${').replaceAll('.chaoxing.com','.school.example')
        .replaceAll("domain:'.chaoxing.com'","domain:'.school.example'")
        .replaceAll('artifacts/','artifacts/issue-11/school-results/')
        .replaceAll('output/playwright/','output/playwright/issue-11-school/');
    const path=resolve(out,name);await writeFile(path,source);
    const originalSHA256=createHash('sha256').update(original).digest('hex'),fixtureSHA256=createHash('sha256').update(source).digest('hex');
    const completed=prior?.results.find(r=>r.name===name&&r.passed&&r.originalSHA256===originalSHA256&&r.fixtureSHA256===fixtureSHA256);
    if(completed){results.push({...completed,reused:true});console.log('Reused identical school fixture/runtime:',name);continue;}
    if(createHash('sha256').update(await readFile(resolve(root,'dist/xuexitong-ai-assistant.user.js'))).digest('hex')!==runtimeSHA256)throw Error('Runtime changed during school verification');
    const started=Date.now();console.log('School HTTP fixture:',name,origins);
    const code=await new Promise(accept=>{const child=spawn(process.execPath,[path],{cwd:root,env:{...process.env,XXT_TEST_SCHOOL_ORIGINS:JSON.stringify(origins)},stdio:'inherit',windowsHide:true});child.on('error',error=>{console.error(error.message);accept(-1)});child.on('close',accept);});
    results.push({name,passed:code===0,code,durationMs:Date.now()-started,origins,originalSHA256,fixtureSHA256});
    await writeFile(resolve(out,'verification.json'),JSON.stringify({runtimeSHA256,results,scope:'Origin-transformed existing assertions in Edge, mock GM approval. No real school/course/model/grade.'},null,2));
    if(code!==0){process.exitCode=1;break;}
}
