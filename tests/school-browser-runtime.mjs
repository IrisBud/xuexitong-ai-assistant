/* Test-only GM approval for origin-transformed platform fixtures. Never bundled. */
import {chromium} from './browser-runtime.mjs';
const origins=JSON.parse(process.env.XXT_TEST_SCHOOL_ORIGINS || '[]');
if(!origins.length)throw Error('Explicit fixture school origins required');
async function approve(context){
    await context.addInitScript(origins=>{
        let original;
        Object.defineProperty(window,'GM_getValue',{configurable:true,
            get(){return (key,fallback)=>key==='xxt-school-origins-v1'?origins:typeof original==='function'?original(key,fallback):fallback;},
            set(value){original=value;}
        });
    },origins);
    return context;
}
const launch=chromium.launch.bind(chromium),persistent=chromium.launchPersistentContext.bind(chromium);
chromium.launch=async options=>{
    const browser=await launch(options),newContext=browser.newContext.bind(browser);
    browser.newContext=async options=>approve(await newContext(options));
    return browser;
};
chromium.launchPersistentContext=async (dir,options)=>approve(await persistent(dir,options));
export {chromium};
