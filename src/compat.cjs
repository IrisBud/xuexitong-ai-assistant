/* Capability-based crypto; never patch browser crypto or use a weak random fallback. */
(function (root) {
    'use strict';
    if (typeof module === 'object' && module.exports && !root.XxtSha256) require('../vendor/noble-sha256.cjs');
    function randomUUID() {
        const c = root.crypto;
        if (typeof c?.randomUUID === 'function') return c.randomUUID();
        if (typeof c?.getRandomValues !== 'function') throw Object.assign(Error('当前环境缺少安全随机数能力'), {code:'E_RANDOM'});
        const bytes = c.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const h = [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
        return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
    }
    async function sha256Bytes(bytes) {
        if (typeof root.crypto?.subtle?.digest === 'function') return new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes));
        if (typeof root.XxtSha256 !== 'function') throw Object.assign(Error('SHA-256校验组件不可用'), {code:'E_HASH'});
        return root.XxtSha256(bytes);
    }
    const sha256Hex = async bytes => [...await sha256Bytes(bytes)].map(v => v.toString(16).padStart(2,'0')).join('');
    const api = {randomUUID, sha256Bytes, sha256Hex};
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.XxtCompat = api;
})(globalThis);
