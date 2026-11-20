/* Reference materials are read locally and only extracted excerpts are sent to the AI. */
(() => {
    'use strict';
    const maxFileBytes = 8 * 1024 * 1024;
    const maxCharacters = 320000;
    const accept = '.txt,.md,.csv,.tsv,.json,.pdf,.docx';
    const utf8 = new TextDecoder('utf-8', {fatal:true});
    function decode(buffer) {
        const bytes = new Uint8Array(buffer);
        if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le',{fatal:true}).decode(bytes);
        if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be',{fatal:true}).decode(bytes);
        try { return utf8.decode(bytes); }
        catch { throw Error('文本编码无法识别，请另存为 UTF-8 后重新导入。'); }
    }

    async function word(buffer) {
        const data = new DataView(buffer), length = data.byteLength;
        const u16 = offset => data.getUint16(offset,true), u32 = offset => data.getUint32(offset,true);
        let end = length - 22;
        while (end >= Math.max(0,length - 65557) && (u32(end) !== 0x06054b50 || end + 22 + u16(end+20) !== length)) end--;
        if (end < Math.max(0,length - 65557) || u16(end+4) || u16(end+6)) throw Error('Word 文件结构无法识别。');
        const count = u16(end+10), directory = u32(end+16);
        if (count > 2048 || directory + u32(end+12) > end) throw Error('Word 文件目录超出读取范围。');
        let cursor = directory;
        for (let i=0;i<count;i++) {
            if (cursor+46 > end || u32(cursor)!==0x02014b50) break;
            const nameLength=u16(cursor+28), next=cursor+46+nameLength+u16(cursor+30)+u16(cursor+32);
            if(next>end) break;
            const name = new TextDecoder().decode(new Uint8Array(buffer,cursor+46,nameLength));
            if (name !== 'word/document.xml') {cursor=next;continue;}
            const bytes=u32(cursor+20), expected=u32(cursor+24), local=u32(cursor+42), method=u16(cursor+10);
            const limit=4 * 1024 * 1024;
            if (!expected || expected>limit || u16(cursor+8)&1 || local+30>directory || u32(local)!==0x04034b50) break;
            const start=local+30+u16(local+26)+u16(local+28);
            if(start+bytes>directory || ![0,8].includes(method)) break;
            const raw=new Uint8Array(buffer,start,bytes);
            let xml;
            if(method===0) {
                if(bytes!==expected) break;
                xml=decode(raw);
            } else {
                const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
                const unpacked=new Uint8Array(expected);
                let size=0;
                try {
                    for(;;){
                        const {value,done}=await reader.read();
                        if(done)break;
                        if(size+value.length>expected)throw Error('Word 正文解压大小不符。');
                        unpacked.set(value,size);size+=value.length;
                    }
                } finally { await reader.cancel().catch(()=>{}); }
                if(size!==expected) break;
                xml=decode(unpacked);
            }
            if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Word 正文包含无法读取的实体。');
            const doc=new DOMParser().parseFromString(xml,'application/xml');
            const namespace=doc.documentElement.namespaceURI;
            if(doc.documentElement.localName!=='document'||!['http://schemas.openxmlformats.org/wordprocessingml/2006/main','http://purl.oclc.org/ooxml/wordprocessingml/main'].includes(namespace))break;
            return [...doc.getElementsByTagNameNS(namespace,'p')].map(p=>[...p.getElementsByTagNameNS(namespace,'t')].map(n=>n.textContent).join('')).join('\n');
        }
        throw Error('无法读取 Word 正文。请另存为普通 DOCX 或复制为 TXT。');
    }

    async function pdf(buffer) {
        if(!globalThis.XxtPdf?.getDocument)throw Error('PDF 读取组件不可用。请先提取文字，再导入 TXT。');
        const task=globalThis.XxtPdf.getDocument({data:new Uint8Array(buffer), useWasm:false, isEvalSupported:false,
            useSystemFonts:false, disableFontFace:true, enableXfa:false, stopAtErrors:true, verbosity:0});
        try {
            const doc=await task.promise;
            if(doc.numPages>150)throw Error('PDF 超过 150 页，请拆分后导入。');
            const sections=[];
            let size=0, skipped=0;
            for(let i=1;i<=doc.numPages;i++){
                const page=await doc.getPage(i);
                const content=await page.getTextContent();
                const text=content.items.map(item=>typeof item.str==='string'?item.str+(item.hasEOL?'\n':' '):'').join('').trim();
                page.cleanup();
                if(!text){skipped++;continue;}
                size+=text.length;
                if(size>maxCharacters)throw Error('资料正文超出 32 万字符，请拆分或删去无关内容。');
                sections.push({suffix:`第 ${i} 页`, text});
            }
            return {sections, skipped};
        } finally { await task.destroy(); }
    }

    function terms(text) {
        const keys=new Set();
        for(const part of text.toLowerCase().match(/[\p{Script=Han}]+|[a-z0-9][a-z0-9_-]+/gu)||[]){
            if(/^\p{Script=Han}/u.test(part)){
                for(let i=0;i+1<part.length;i++)keys.add(part.slice(i,i+2));
            } else keys.add(part);
        }
        return keys;
    }
    async function read(file) {
        const ext=file.name.toLowerCase().split('.').pop();
        if(!accept.split(',').includes('.'+ext))throw Error('请选择 TXT、Markdown、CSV、TSV、JSON、PDF 或 DOCX 文件。');
        if(!file.size||file.size>maxFileBytes)throw Error('单个资料文件需大于 0 且不超过 8 MB。');
        const buffer=await file.arrayBuffer();
        const {sections,skipped}=ext==='pdf'?await pdf(buffer):{sections:[{text:ext==='docx'?await word(buffer):decode(buffer)}],skipped:0};
        const chars=sections.reduce((count,s)=>count+s.text.length,0);
        if(chars>maxCharacters)throw Error('资料正文超出 32 万字符，请拆分或删去无关内容。');
        const chunks=[];
        const name=file.name.slice(0,110);
        for(const section of sections){
            const text=section.text.replace(/\r\n?/g,'\n').replace(/\u0000/g,'').trim();
            for(let start=0, part=1;start<text.length;part++){
                let end=Math.min(text.length,start+1800);
                const boundary=text.lastIndexOf('\n',end);
                if(end<text.length&&boundary>start+1200)end=boundary+1;
                const value=text.slice(start,end).trim();
                if(value)chunks.push({source:`${name} · ${section.suffix ? section.suffix+' · ' : ''}第 ${part} 段`,text:value,terms:terms(value)});
                start=end===text.length?end:end-100;
            }
        }
        if(!chunks.length)throw Error('没有可读取的正文。扫描件请先转成可搜索的 PDF 或 TXT。');
        return {name,chunks,chars,skipped};
    }

    function reference(files, questions, strong) {
        if(!files.length)return undefined;
        const candidates=files.flatMap(file=>file.chunks);
        const lists=questions.map(q=>{
            const stem=terms(q.text), options=terms(q.options.map(o=>o.text).join(' '));
            return candidates.map(chunk=>({chunk,score:[...stem].reduce((s,key)=>s+(chunk.terms.has(key)?3:0),0)+
                [...options].reduce((s,key)=>s+(chunk.terms.has(key)?1:0),0)})).sort((a,b)=>b.score-a.score);
        });
        const seen=new Set(), excerpts=[];
        let limit=strong?23000:11000;
        function add(chunk){
            if(!chunk||seen.has(chunk)||excerpts.length>=18||chunk.text.length+chunk.source.length>limit)return;
            limit-=chunk.text.length+chunk.source.length;
            seen.add(chunk);excerpts.push({text:chunk.text,source:chunk.source});
        }
        for(let index=0;index<(strong?5:2);index++)for(const list of lists)if(list[index]?.score>0)add(list[index].chunk);
        if(!excerpts.length || strong)for(const file of files)add(file.chunks[0]);
        return {priority:strong?'strong':'normal', excerpts};
    }
    globalThis.XxtExamKnowledge={accept,read,reference,maxCharacters};
})();
