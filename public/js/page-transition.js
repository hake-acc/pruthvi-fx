// Page transition between every page of the site (home, /contact, the 404), the intro's ink bleed run backwards.
// Leaving: from the click, a sheet of AP marks inks in cell by cell through the site's own 4x4 dither ramp, its wet edge
// in signal yellow. Arriving: the same sheet pixelates up to the intro's pixel size, then those pixels dither out from
// the point that was clicked on the page before. Every arrival runs it: a link, back/forward, or a page restored from
// the bfcache. Loaded in <head> so the arriving page is covered before its first paint.
(() => {
    'use strict';

    const KEY = 'ap-pt', Z = 99999990;
    const PAPER = '#f9f4eb', SIGNAL = '#FFED29';
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const AP = 'M 0 644 L 98 644 L 99 359 L 352 359 L 353 644 L 468 644 L 469 440 L 706 440 L 706 341 L 803 339 L 803 95 L 711 94 L 711 0 L 411 0 L 410 95 L 352 94 L 352 0 L 100 0 L 99 95 L 0 95 Z M 468 95 L 662 94 L 663 141 L 712 143 L 712 292 L 663 293 L 662 341 L 469 341 Z M 99 95 L 352 94 L 353 253 L 100 254 Z';
    // The loader's grid: 28px marks on its pitch, centred on the viewport
    const MARK_H = 28, PITCH_X = MARK_H * 803 / 644 + MARK_H * 0.5, PITCH_Y = MARK_H * 1.6;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;

    // any document path is a page (a 404 lives at whatever URL was mistyped); files with other extensions are not
    const page = (p) => (/^\/contact(\/|\.html|\/index\.html)?$/.test(p) ? 'contact' : /^\/(index\.html)?$/.test(p) ? 'home'
        : /\.(?!html?$)[a-z0-9]+$/i.test(p) ? '' : p.replace(/(\/index)?\.html?$|\/$/i, '') || '/');
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    let incoming = null;
    try {
        const raw = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        const s = raw && JSON.parse(raw);
        if (s && Date.now() - s.t < 10000) incoming = s;
    } catch (e) { /* storage blocked */ }
    if (!incoming && page(location.pathname)) {
        const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
        if (nav && nav.type === 'back_forward') incoming = { x: 0.5, y: 0.5 };
    }
    const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (navEntry && navEntry.type === 'reload') {
        incoming = null;
        try { sessionStorage.removeItem(KEY); } catch (e) {}
    }
    window.__ptIncoming = !!incoming;
    window.__ptScroll = (incoming && incoming.s) || null;
    window.__ptIntent = (incoming && incoming.i) || null;

    const style = document.createElement('style');
    style.textContent = `html.pt-hold::after{content:"";position:fixed;inset:0;background:#000;z-index:${Z};pointer-events:none}
.pt-canvas{position:fixed;left:0;top:0;width:100vw;height:100vh;display:block;z-index:${Z};pointer-events:none}`;
    document.head.appendChild(style);
    if (incoming && !reduce) root.classList.add('pt-hold');

    let vw = 0, vh = 0, dpr = 1, P = 0, cols = 0, rows = 0, cv = null, ctx = null, sheet = null, run = 0;

    // on <html>, not <body>: a transformed or contained body would turn position:fixed into "at the top of the page",
    // which only covers the screen from the first slide
    function setup() {
        vw = window.innerWidth; vh = window.innerHeight;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        P = Math.floor(Math.min(42, vw / 30));
        cols = Math.ceil(vw / P); rows = Math.ceil(vh / P);
        if (!cv) {
            cv = document.createElement('canvas');
            cv.className = 'pt-canvas';
            cv.setAttribute('aria-hidden', 'true');
            ctx = cv.getContext('2d');
        }
        cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
        if (cv.parentNode !== root) root.appendChild(cv);
    }

    // The full-screen sheet of marks; the tile under the click is the one yellow mark. Returns that tile's centre.
    function buildSheet(ox, oy) {
        sheet = document.createElement('canvas');
        sheet.width = cv.width; sheet.height = cv.height;
        const g = sheet.getContext('2d'), path = new Path2D(AP), k = MARK_H / 644;
        g.fillStyle = '#000';
        g.fillRect(0, 0, sheet.width, sheet.height);
        g.scale(dpr, dpr);
        const cx = vw / 2, cy = vh / 2;
        const i0 = Math.floor(-cx / PITCH_X) - 1, i1 = Math.ceil(cx / PITCH_X) + 1;
        const j0 = Math.floor(-cy / PITCH_Y) - 1, j1 = Math.ceil(cy / PITCH_Y) + 1;
        const hi = Math.round((ox - cx) / PITCH_X), hj = Math.round((oy - cy) / PITCH_Y);
        for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
                g.save();
                g.translate(cx + i * PITCH_X - 401.5 * k, cy + j * PITCH_Y - 322 * k);
                g.scale(k, k);
                g.fillStyle = i === hi && j === hj ? SIGNAL : PAPER;
                g.fill(path, 'evenodd');
                g.restore();
            }
        }
        return { x: cx + hi * PITCH_X, y: cy + hj * PITCH_Y };
    }

    // Each cell's turn: mostly distance from the origin, broken up by the 4x4 ordered-dither threshold
    function order(ox, oy, mix) {
        const th = new Float32Array(cols * rows);
        const far = Math.max(Math.hypot(ox, oy), Math.hypot(vw - ox, oy), Math.hypot(ox, vh - oy), Math.hypot(vw - ox, vh - oy));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const d = Math.hypot((c + 0.5) * P - ox, (r + 0.5) * P - oy) / far;
                th[r * cols + c] = (1 - mix) * d + mix * (BAYER[(r & 3) * 4 + (c & 3)] + 0.5) / 16;
            }
        }
        return th;
    }

    const EDGE = 0.07;

    function cover(ox, oy, href, scroll, intent) {
        try { sessionStorage.setItem(KEY, JSON.stringify({ x: ox / window.innerWidth, y: oy / window.innerHeight, s: scroll || null, i: intent || null, t: Date.now() })); } catch (e) { /* ignore */ }
        if (reduce) { location.href = href; return; }
        const id = ++run;
        setup();
        buildSheet(ox, oy);
        const th = order(ox, oy, 0.3), D = 640, t0 = performance.now();
        const step = (now) => {
            if (id !== run) return;
            const k = easeIO(clamp01((now - t0) / D)) * (1 + EDGE);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, cv.width, cv.height);
            const stepS = P * dpr;
            const s = Math.ceil(stepS) + 1;
            ctx.fillStyle = SIGNAL;
            for (let i = 0; i < th.length; i++) {
                const e = k - th[i];
                if (e < 0) continue;
                const x = (i % cols) * stepS, y = ((i / cols) | 0) * stepS;
                if (e < EDGE) ctx.fillRect(x, y, s, s);
                else ctx.drawImage(sheet, x, y, s, s, x, y, s, s);
            }
            if (now - t0 < D + 90) requestAnimationFrame(step);
            else location.href = href;
        };
        requestAnimationFrame(step);
    }

    function reveal(at, waitLoad) {
        const id = ++run;
        setup();
        const ox = at.x * vw, oy = at.y * vh;
        buildSheet(ox, oy);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(sheet, 0, 0);
        root.classList.remove('pt-hold');
        const small = document.createElement('canvas'), sg = small.getContext('2d');
        const th = order(ox, oy, 0.38);
        const go = () => {
            const D1 = 340, D2 = 760, t0 = performance.now();
            const stepS = P * dpr;
            const s = Math.ceil(stepS) + 1;
            const step = (now) => {
                if (id !== run) return;
                const t = now - t0;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, cv.width, cv.height);
                // The marks melt into blocks, growing to the loader's pixel size on the same cell grid
                const p = Math.max(1, Math.round(1 + (P - 1) * Math.pow(clamp01(t / D1), 1.6)));
                small.width = Math.ceil(vw / p); small.height = Math.ceil(vh / p);
                sg.imageSmoothingEnabled = true;
                sg.drawImage(sheet, 0, 0, small.width * p * dpr, small.height * p * dpr, 0, 0, small.width, small.height);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(small, 0, 0, small.width * p * dpr, small.height * p * dpr);
                if (t > D1) {
                    const k = easeIO(clamp01((t - D1) / D2)) * (1 + EDGE);
                    ctx.fillStyle = SIGNAL;
                    for (let i = 0; i < th.length; i++) {
                        const e = k - th[i];
                        if (e < 0) continue;
                        const x = (i % cols) * stepS, y = ((i / cols) | 0) * stepS;
                        if (e < EDGE) ctx.fillRect(x, y, s, s);
                        else ctx.clearRect(x, y, s, s);
                    }
                }
                if (t < D1 + D2 + 40) requestAnimationFrame(step);
                else if (cv.isConnected) cv.remove();
            };
            requestAnimationFrame(step);
        };
        if (!waitLoad || document.readyState === 'complete') { requestAnimationFrame(go); return; }
        let started = false;
        const once = () => { if (!started) { started = true; requestAnimationFrame(go); } };
        window.addEventListener('load', once, { once: true });
        setTimeout(once, 1400);
    }

    window.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
        const u = new URL(a.getAttribute('href'), location.href);
        const to = page(u.pathname), from = page(location.pathname);
        if (u.origin !== location.origin || !to || to === from) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        let x = e.clientX, y = e.clientY;
        if (!e.detail) { const r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
        u.hash = '';
        cover(x, y, u.href, a.dataset.scroll, a.dataset.intent);
    }, true);

    // Back/forward from the bfcache returns to a page still wearing its cover: it arrives like any other
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        run++;
        if (reduce) { if (cv && cv.isConnected) cv.remove(); root.classList.remove('pt-hold'); return; }
        reveal({ x: 0.5, y: 0.5 }, false);
    });

    if (incoming && !reduce) {
        const at = { x: clamp01(incoming.x), y: clamp01(incoming.y) };
        if (document.body) reveal(at, true);
        else document.addEventListener('DOMContentLoaded', () => reveal(at, true), { once: true });
    } else root.classList.remove('pt-hold');

    window.__pageTransition = {
        navigate(href, x, y, scroll = null, intent = null) {
            const ox = typeof x === 'number' ? x : window.innerWidth / 2;
            const oy = typeof y === 'number' ? y : window.innerHeight / 2;
            const fullUrl = new URL(href, location.href).href;
            cover(ox, oy, fullUrl, scroll, intent);
        }
    };
})();
