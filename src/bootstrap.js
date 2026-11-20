/* Small startup boundary independent of the panel, theme assets and UUIDs. */
(() => {
    'use strict';
    const P = XxtPlatform;
    function diagnostic(code) {
        return {version:globalThis.XxtRelease?.version || 'unknown', protocol:location.protocol,
            secureContext:globalThis.isSecureContext === true, randomUUID:typeof globalThis.crypto?.randomUUID === 'function',
            getRandomValues:typeof globalThis.crypto?.getRandomValues === 'function', subtleDigest:typeof globalThis.crypto?.subtle?.digest === 'function',
            code:['E_RANDOM','E_HASH','E_TEXT_ENCODER','E_ORIGIN'].includes(code) ? code : 'E_INIT'};
    }
    function notice(message, code) {
        if (!document.body) { document.addEventListener('DOMContentLoaded', () => notice(message, code), {once:true}); return; }
        document.querySelector('[data-xxt-startup-error]')?.remove();
        const box = document.createElement('aside'); box.dataset.xxtStartupError = 'true'; box.setAttribute('role','alert');
        box.style.cssText = 'position:fixed;right:12px;bottom:12px;box-sizing:border-box;width:360px;max-width:calc(100vw - 24px);padding:14px;background:#fff;color:#263b32;border:1px solid #98aaa0;border-radius:10px;font:14px/1.6 sans-serif;z-index:2147483647';
        const text = document.createElement('p'); text.textContent = '学习助手：' + message;
        const settings = document.createElement('button'); settings.type = 'button'; settings.textContent = '学校域名设置'; settings.onclick = configure;
        const show = document.createElement('button'); show.type = 'button'; show.textContent = '查看脱敏诊断';
        const detail = document.createElement('textarea'); detail.hidden = true; detail.readOnly = true; detail.setAttribute('aria-label','脱敏启动诊断'); detail.style.cssText = 'box-sizing:border-box;width:100%;height:150px;margin-top:8px';
        show.onclick = () => { detail.hidden = false; detail.value = JSON.stringify(diagnostic(code),null,2); detail.select(); };
        const close = document.createElement('button'); close.type = 'button'; close.textContent = '关闭'; close.onclick = () => box.remove();
        box.append(text,settings,show,close,detail); document.body.append(box);
    }
    function configure() {
        const value = window.prompt('学校来源：每行一个完整来源（含 http:// 或 https://），最多20条。只填实际课程/已确认子页的来源，不填路径或通配符。请先停止自动运行；保存后刷新所有相关页面。油猴“用户匹配”仍需单独添加。', P.configured().join('\n'));
        if (value === null) return;
        try {
            const origins = P.normalizeOrigins(value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean));
            // Use the assistant's existing stop path before replacing a live trust configuration.
            document.dispatchEvent(new Event('xxt-platform-settings-changing'));
            P.save(origins);
            window.alert('学校来源已保存。请在油猴该脚本的“设置 → 用户匹配”添加对应规则，保留原始匹配项，再刷新相关课程和子页面。此操作不会自动开始学习。');
        } catch (error) { window.alert(error.message); }
    }
    function prepare() {
        try {
            if (window === window.top && typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('学校域名设置',configure);
            if (!P.isTrustedUrl(location.href)) {
                if (window === window.top && /^\/(?:mycourse\/studentstudy|mooc2\/work\/dowork)\/?$/.test(location.pathname)) notice('当前来源尚未授权。请先配置学校来源，并在油猴单独添加用户匹配规则。','E_ORIGIN');
                return false;
            }
            if (typeof globalThis.TextEncoder !== 'function') throw {code:'E_TEXT_ENCODER'};
            XxtCompat.randomUUID();
            return true;
        } catch (error) { fail(error); return false; }
    }
    function fail(error) {
        const code = diagnostic(error?.code).code;
        const descriptions = {E_RANDOM:'缺少安全随机数，无法安全初始化；请检查浏览器或改用学校可用的 HTTPS 页面。', E_HASH:'SHA-256校验组件不可用，请重新安装完整脚本。', E_TEXT_ENCODER:'浏览器缺少文字编码能力，请更新浏览器。', E_INIT:'初始化未完成，请查看脱敏诊断并反馈错误码。'};
        notice(descriptions[code] || descriptions.E_INIT,code);
    }
    globalThis.XxtStartup = {prepare,fail,diagnostic};
})();
