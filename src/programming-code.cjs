/* Formatting for source code in standalone homework answers. */
(function (root) {
    'use strict';
    const languages = [
        [/\bC\s*\+\+/i, 'C++', 'C/C++'],
        [/\bPython(?:\s*3)?\b/i, 'Python', 'Python'],
        [/\bJavaScript\b/i, 'JavaScript', 'Javascript'],
        [/\bJava\b/i, 'Java', 'Java'],
        [/\bC\s*#/i, 'C#', 'C#'],
        [/\b(?:Bash|Shell)\b/i, 'Bash', 'Bash/Shell'],
        [/\bPHP\b/i, 'PHP', 'Php'],
        [/\bRuby\b/i, 'Ruby', 'Ruby'],
        [/\bPerl\b/i, 'Perl', 'Perl'],
        [/\bSQL\b/i, 'SQL', 'Sql'],
        [/\bTypeScript\b/i, 'TypeScript', 'Plain Text'],
        [/\bRust\b/i, 'Rust', 'Plain Text'],
        [/\bGo\s*(?:语言|编程)|\bGolang\b/i, 'Go', 'Plain Text'],
        [/\bKotlin\b/i, 'Kotlin', 'Plain Text'],
        [/\bLua\b/i, 'Lua', 'Plain Text']
    ];
    const languageFor = stem => languages.find(([pattern])=>pattern.test(stem))?.[1] ?? 'C';
    const editorLanguage = language => languages.find(([, name])=>name===language)?.[2] ?? 'C/C++';
    const codeText = value => {
        const text = String(value ?? '').replace(/\r\n?/g,'\n');
        return text.trim()?text.replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g,''):'';
    };

    // Treat C/C++ literals, comments and preprocessor lines as opaque tokens.
    const tokens = /(^[ \t]*#(?:\\\n|[^\n])*)|(?:u8|u|U|L)?R"([^\s()\\]{0,16})\([\s\S]*?\)\2"|"(?:\\[\s\S]|[^"\\])*"|\b\d(?:[\w.]|'[\w])*|'(?:\\[\s\S]|[^'\\])*'|\/\/(?:\\\n|[^\n])*|\/\*[\s\S]*?\*\/|\\\n|\n|[{}();\[\]]/gm;
    function formatC(source) {
        if(/\?\?\/|<%|%>|%:/.test(source))return source;
        const lines = [], blocks = [];
        let line = '', depth = 0, previous = 0;
        const append = text => {
            if(!line)text=text.replace(/^[ \t]+/,'');
            if(!text)return;
            if(!line)line='    '.repeat(blocks.length);
            line+=text;
        };
        const flush = () => {
            if(line)lines.push(line);
            line='';
        };
        for(const match of source.matchAll(tokens)){
            const [token, directive] = match;
            const end = match.index + token.length;
            append(source.slice(previous,match.index));
            previous=end;
            if(directive){flush();lines.push(token);continue;}
            if(token==='\\\n')return source;
            if(token==='\n'){
                if(line)flush();
                else if(source[match.index-1]==='\n'&&lines.at(-1)!=='')lines.push('');
                continue;
            }
            if(token==='}'){
                flush();blocks.pop();append(token);
                if(/^(?:else|catch)\b/.test(source.slice(end)))append(' ');
                if(!/^\s*(?:[;,)\]]|else\b|catch\b)/.test(source.slice(end)))flush();
                continue;
            }
            const followsStatement=token.startsWith('/*')&&/;[ \t]*$/.test(line);
            if(token==='{'&&line&&!/\s$/.test(line))append(' ');
            append(token);
            if(followsStatement)flush();
            if(token==='('||token==='[')depth++;
            if(token===')'||token===']')depth--;
            if(token==='{'){flush();blocks.push(depth);}
            if(token===';'&&depth===(blocks.at(-1)??0)&&!/^[ \t]*\/[/*]/.test(source.slice(end)))flush();
        }
        append(source.slice(previous));flush();
        return codeText(lines.join('\n'));
    }

    function modelCode(value, language='C') {
        const text = codeText(value);
        const fence = text.match(/^(```|~~~)([\w#+./-]*)[ \t]*\n([\s\S]*?)\n\1[ \t]*$/);
        const code = fence ? codeText(fence[3]) : text;
        if(editorLanguage(language)!=='C/C++')return code;
        if(fence?.[2]&&!/^(?:c|c\+\+|cc|cpp|cxx|c\/c\+\+|text|plaintext)$/i.test(fence[2]))return '';
        const shape = code.replace(tokens, (token,directive) =>
            directive || /^[{}();\[\]\n]$/.test(token) ? token : token.replace(/[^\n]/g,' '));
        if(/^[ \t]*(?:#![^\n]*\bpython\d*|from[ \t]+\S+[ \t]+import\b|(?:async[ \t]+)?def[ \t]+\w+[ \t]*\(|(?:public[ \t]+)?class[ \t]+\w+[^\n{]*:[ \t]*$|public[ \t]+static[ \t]+void[ \t]+main\b)/m.test(shape)||
           !/[;{}]|^[ \t]*#[ \t]*\w+/m.test(shape))return '';
        return formatC(code);
    }
    const api = {languageFor,editorLanguage,codeText,modelCode};
    if(typeof module==='object'&&module.exports)module.exports=api;
    root.XxtProgrammingCode=api;
})(typeof globalThis!=='undefined'?globalThis:this);
