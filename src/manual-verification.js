/* Detect visible native verification controls without reading their contents or operating them. */
(() => {
    'use strict';
    const excluded = '[data-xxt-codex-panel],.TiMu,.ans-videoquiz';
    const actions = Object.freeze({
        captcha: '请在平台窗口手动输入验证码并提交。',
        slider: '请在平台窗口手动拖动滑块完成拼图验证。',
        face: '请按平台页面提示手动完成人脸验证。'
    });
    const action = type => Object.hasOwn(actions, type) ? actions[type] : '';

    function visible(element, view) {
        if (!element || element.hidden || !element.getClientRects().length) return false;
        const style = view.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse';
    }

    function localKind(doc, view) {
        for (const box of doc.querySelectorAll('.yzmTips')) {
            if (box.closest(excluded) || !visible(box, view)) continue;
            const form = box.closest('form');
            if (form && visible(box.querySelector('input#ucode.yzmInp[type="text"]'), view) &&
                visible(box.querySelector('img#ccc'), view) &&
                visible(form.querySelector('input.submit[type="submit"]'), view)) return 'captcha';
        }

        for (const canvas of doc.querySelectorAll('#cx_obstacle_canvas')) {
            if (canvas.closest(excluded) || !visible(canvas, view)) continue;
            for (let region = canvas.parentElement, depth = 0;
                region && region !== doc.body && depth < 7;
                region = region.parentElement, depth++) {
                const text = region.textContent;
                if (text.includes('请完成安全验证') && text.includes('向右拖动滑块填充拼图')) return 'slider';
            }
        }

        for (const control of doc.querySelectorAll('.chapterVideoFaceMaskDiv,#fcqrimg[src]:not([src=""])')) {
            if (!control.closest(excluded) && visible(control, view)) return 'face';
        }
        return '';
    }

    function kind() {
        const seen = new Set();
        function visit(doc, view, depth) {
            if (!doc?.querySelectorAll || seen.has(doc) || depth > 7) return '';
            seen.add(doc);
            const type = localKind(doc, view);
            if (type) return type;
            for (const frame of doc.querySelectorAll('iframe')) {
                if (!visible(frame, view)) continue;
                try {
                    const childType = visit(frame.contentDocument, frame.contentWindow, depth + 1);
                    if (childType) return childType;
                } catch { /* The frame may be served from another origin. */ }
            }
            return '';
        }
        return visit(document, window, 0);
    }

    globalThis.XxtManualVerification = { kind, requiresManual: () => Boolean(kind()), action };
})();
