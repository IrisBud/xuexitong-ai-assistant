import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';
const require=createRequire(import.meta.url),P=require('../src/platform.cjs');
const approved=P.normalizeOrigins(['http://learn.school.example/','https://LEARN.school.example','http://quiz.school.example']);
test('school configuration is explicit, exact, canonical and bounded',()=>{
    assert.deepEqual(approved,['http://learn.school.example','https://learn.school.example','http://quiz.school.example']);
    assert.deepEqual(P.normalizeOrigins([...approved,...approved]),approved);
    for(const value of ['null','*://*.school.example/*','https://school.example/path','https://user:pass@school.example','https://school.example/?secret=x','https://school.example/#x','https://school.example:8443','https://school.example.','javascript:alert(1)','file:///x','https://bad..example','https://school.example\\@evil.example','https://school.example%2f.evil.example']) assert.throws(()=>P.normalizeOrigin(value));
    assert.throws(()=>P.normalizeOrigins(Array(21).fill(approved[0])));
    assert.throws(()=>P.normalizeOrigins({}));
});
test('only approved schemes/hosts enter URL and event trust, no opaque or lookalike origins',()=>{
    for(const value of approved) assert(P.isTrustedOrigin(value,approved));
    for(const value of ['https://mooc1.chaoxing.com','https://chaoxing.com']) assert(P.isTrustedOrigin(value,[]));
    for(const value of ['http://mooc1.chaoxing.com','https://chaoxing.com.evil.example','https://evilchaoxing.com','null','data:text/html,a','https://learn.school.example:444','http://else.school.example','http://learn.school.example/','http://learn.school.example/path','http://user@learn.school.example','HTTP://learn.school.example']) assert(!P.isTrustedOrigin(value,approved),value);
    assert(P.isTrustedUrl('http://learn.school.example/mycourse/studentstudy?courseId=fixture',undefined,approved));
    assert(!P.isTrustedUrl('http://learn.school.example/mycourse/studentstudy',undefined,[]));
    assert(!P.isTrustedUrl('https://user@mooc1.chaoxing.com/path',undefined,approved));
});
test('storage validation fails closed; values never come from a page message',()=>{
    globalThis.GM_getValue=()=>['http://learn.school.example'];
    assert(P.isTrustedOrigin('http://learn.school.example'));assert(!P.isTrustedOrigin('http://else.school.example'));
    globalThis.GM_getValue=()=>['https://invalid.example/path'];assert.deepEqual(P.configured(),[]);
    delete globalThis.GM_getValue;
});
function insecureCrypto(crypto={getRandomValues:webcrypto.getRandomValues.bind(webcrypto)}){
    const context=vm.createContext({crypto,Uint8Array,TextEncoder});
    for(const file of ['vendor/noble-sha256.cjs','src/compat.cjs']) vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
    return context.XxtCompat;
}
test('insecure-context UUID fallback generates 10000 unique v4 UUIDs with correct variant',()=>{
    const api=insecureCrypto(),ids=new Set();
    for(let i=0;i<10000;i++){const id=api.randomUUID();assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);ids.add(id);}
    assert.equal(ids.size,10000);
});
test('native UUID stays native; missing secure RNG fails closed',()=>{
    assert.equal(insecureCrypto({randomUUID:()=> 'native-id'}).randomUUID(),'native-id');
    assert.throws(()=>insecureCrypto({}).randomUUID(),{code:'E_RANDOM'});
});
test('bundled SHA-256 on HTTP matches Node for known vectors, Unicode, boundaries and byte views',async()=>{
    const api=insecureCrypto();
    for(const text of ['', 'abc','中文😀', 'a'.repeat(55),'a'.repeat(56),'a'.repeat(64),'a'.repeat(1000000)]){
        const bytes=new TextEncoder().encode(text);
        assert.equal(await api.sha256Hex(bytes),createHash('sha256').update(bytes).digest('hex'));
    }
    const bytes=Uint8Array.from([255,1,2,3,255]).subarray(1,4);
    assert.equal(await api.sha256Hex(bytes),createHash('sha256').update(bytes).digest('hex'));
});
test('native SHA-256 errors are not treated as a successful verification',async()=>{
    const api=insecureCrypto({subtle:{digest(){return Promise.reject(Error('rejected'))}}});
    await assert.rejects(api.sha256Hex(new Uint8Array()),/rejected/);
});
