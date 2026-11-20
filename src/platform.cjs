/* Exact origins approved in the script manager's private storage, never by page messages. */
(function (root) {
    'use strict';
    const key = 'xxt-school-origins-v1';
    function normalizeOrigin(value) {
        if (typeof value !== 'string' || value.length > 300) throw Error('请逐行填写完整来源，例如 https://mooc.school.example');
        const raw = value.trim();
        if (!/^https?:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(raw)) throw Error('学校来源只能包含 HTTP/HTTPS 协议和完整主机，不含路径、通配符、账号或查询参数');
        const u = new URL(raw);
        if (u.port || u.hostname.endsWith('.') || !u.hostname.includes('.') || !u.hostname.split('.').every(part => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(part)))
            throw Error('学校来源需要有效主机名及默认端口；不同子域名请分别添加');
        return u.origin;
    }
    function normalizeOrigins(values) {
        if (!Array.isArray(values) || values.length > 20) throw Error('学校来源最多添加20条');
        return [...new Set(values.map(normalizeOrigin))];
    }
    function configured() {
        try { return normalizeOrigins(typeof GM_getValue === 'function' ? GM_getValue(key, []) : []); } catch { return []; }
    }
    function parse(value, base) {
        try {
            if (typeof value !== 'string' || !value || value !== value.trim()) return null;
            const u = new URL(value, base);
            return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password && !u.port ? u : null;
        } catch { return null; }
    }
    const official = u => u.protocol === 'https:' && /(^|\.)chaoxing\.com$/i.test(u.hostname);
    function isSchoolUrl(value, base, origins = configured()) {
        const u = parse(value, base);
        return !!u && origins.includes(u.origin);
    }
    function isTrustedUrl(value, base, origins = configured()) {
        const u = parse(value, base);
        return !!u && (official(u) || origins.includes(u.origin));
    }
    function isTrustedOrigin(value, origins = configured()) {
        const u = parse(value);
        // An event origin is an origin, not a URL with a path, slash, credentials or query.
        return !!u && value === u.origin && (official(u) || origins.includes(u.origin));
    }
    function isCourseUrl(value, base) {
        const u = parse(value, base);
        return !!u && (isSchoolUrl(u.href) || official(u) && /^mooc[12](?:-ans)?\.chaoxing\.com$/i.test(u.hostname));
    }
    function save(values) {
        const normalized = normalizeOrigins(values);
        if (typeof GM_setValue !== 'function') throw Error('当前脚本管理器不能保存学校来源');
        GM_setValue(key, normalized);
        return normalized;
    }
    const api = {key, normalizeOrigin, normalizeOrigins, configured, isSchoolUrl, isTrustedUrl, isTrustedOrigin, isCourseUrl, save};
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.XxtPlatform = api;
})(globalThis);
