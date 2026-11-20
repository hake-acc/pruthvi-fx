// Footer: the signature written on as the footer scrolls in, after Lando Norris's (a Rive state machine whose `scroll`
// input is ScrollTrigger progress, scrub 0.5): one flat marker colour, broad round-nibbed strokes that ease in from the
// pen landing and taper out long as it lifts. The strokes are the inline SVG's polylines in pen order (redrawn from
// signature.png as smoothed centrelines); each is cut by arc length on one pen clock, with a short lift between strokes.
(() => {
    'use strict';
    const foot = document.querySelector('.sig-footer');
    if (!foot) return;
    const hero = foot.querySelector('.sig-hero');
    const canvas = foot.querySelector('.sig-canvas');
    const svg = foot.querySelector('.sig-svg');
    const scroller = document.querySelector('.js-scroller') || document.scrollingElement || document.documentElement;
    const STATIC = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const APP_URL = '/wp-content/themes/lamalama2025/dist/assets/app-DjHRamTc.js';
    const SUN = '#FFED29';
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const smooth = (t) => t * t * (3 - 2 * t);

    // Footer links ride the page's Lenis, like every other in-page jump
    let appMod = null;
    import(APP_URL).then((m) => { appMod = m; }).catch(() => {});
    const lenisOf = () => {
        const app = appMod && appMod.n;
        const s = app && app.instances && app.instances.get('scroller');
        return (s && s.lenis) || null;
    };
    foot.addEventListener('click', (e) => {
        const a = e.target.closest('[data-sig-to]');
        if (!a) return;
        const to = a.getAttribute('data-sig-to');
        let y = 0;
        if (to !== '0') {
            const el = document.querySelector(to);
            if (!el) return;
            const vTop = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
            y = el.getBoundingClientRect().top - vTop + scroller.scrollTop;
        }
        e.preventDefault();
        const lenis = lenisOf();
        if (lenis) lenis.scrollTo(y, STATIC ? { immediate: true, force: true } : { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
        else scroller.scrollTo({ top: y, behavior: STATIC ? 'auto' : 'smooth' });
    });

    if (!hero || !svg || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const vb = svg.viewBox.baseVal;
    const VW = vb.width || 1000, VH = vb.height || 726;
    const SW = parseFloat(svg.getAttribute('data-stroke')) || 20;
    const TS = SW * 1.2, TE = SW * 2.8; // landing ease-in and lift-off taper lengths, in signature units
    const STEP = 1.6;

    // Each stroke resampled to even arc length: flat [x, y, ...] plus the arc length at every sample
    const strokes = [...svg.querySelectorAll('polyline')].map((el) => {
        const p = el.getAttribute('points').trim().split(/\s+/).map((q) => q.split(',').map(Number));
        const xy = [p[0][0], p[0][1]], s = [0];
        let at = 0, carry = 0;
        for (let i = 1; i < p.length; i++) {
            const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1], l = Math.hypot(dx, dy);
            let u = STEP - carry;
            while (u <= l) {
                xy.push(p[i - 1][0] + (dx * u) / l, p[i - 1][1] + (dy * u) / l);
                s.push(at + u);
                u += STEP;
            }
            carry = l - (u - STEP);
            at += l;
        }
        const end = p[p.length - 1];
        if (at - s[s.length - 1] > 0.05) { xy.push(end[0], end[1]); s.push(at); }
        const e = el.getAttribute('data-e') || '11';
        return { xy, s, L: at, dot: at < SW * 1.4, in: e[0] === '1' ? TS : 0, out: e[1] === '1' ? TE : 0 };
    });
    if (!strokes.length) return;

    // Pen time: arc length, plus a short lift between strokes (dots cost a tap)
    const cost = strokes.map((k) => (k.dot ? SW * 2 : k.L));
    const LIFT = cost.reduce((a, b) => a + b, 0) * 0.012;
    const span = cost.reduce((a, b) => a + b, 0) + LIFT * (strokes.length - 1);
    let acc = 0;
    strokes.forEach((k, i) => { k.t0 = acc / span; k.t1 = (acc + cost[i]) / span; acc += cost[i] + LIFT; });

    // Free ends (pen landings / lifts) taper; ends that meet another stroke stay full so the joins read as one line
    const width = (k, s) => {
        const a = k.in ? 0.55 + 0.45 * smooth(Math.min(1, s / k.in)) : 1;
        const b = k.out ? 0.3 + 0.7 * smooth(Math.min(1, Math.max(0, k.L - s) / k.out)) : 1;
        return SW * a * b;
    };

    let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
    const cache = document.createElement('canvas');
    const cctx = cache.getContext('2d');
    let cached = -1;

    function size() {
        const w = Math.max(1, hero.clientWidth), h = Math.max(1, hero.clientHeight);
        const d = Math.min(2, window.devicePixelRatio || 1);
        if (w === W && h === H && d === dpr) return false;
        W = w; H = h; dpr = d;
        canvas.width = cache.width = Math.round(w * dpr);
        canvas.height = cache.height = Math.round(h * dpr);
        scale = Math.min(w / (VW + SW * 2), h / (VH + SW * 2));
        ox = (w - VW * scale) / 2;
        oy = (h - VH * scale) / 2;
        cached = -1;
        return true;
    }

    function pen(c) {
        c.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.strokeStyle = SUN;
        c.fillStyle = SUN;
    }

    // Constant-width middle as one path; the tapered ends as short segments whose round caps hide the width steps
    function drawStroke(c, k, f) {
        if (f <= 0) return;
        const { xy, s, L } = k;
        if (k.dot) {
            const r = SW * 0.62 * smooth(Math.min(1, f * 1.6));
            const i = (xy.length >> 1) >> 1;
            c.beginPath();
            c.arc(xy[i * 2], xy[i * 2 + 1], r, 0, Math.PI * 2);
            c.fill();
            return;
        }
        const v = L * f, n = s.length;
        let last = 0;
        while (last < n - 1 && s[last + 1] <= v) last++;
        let hx = xy[last * 2], hy = xy[last * 2 + 1];
        if (last < n - 1 && v > s[last]) {
            const u = (v - s[last]) / (s[last + 1] - s[last]);
            hx += (xy[last * 2 + 2] - hx) * u;
            hy += (xy[last * 2 + 3] - hy) * u;
        }
        const seg = (i, j, x1, y1) => {
            c.lineWidth = width(k, (s[i] + (j < n ? s[j] : v)) / 2);
            c.beginPath();
            c.moveTo(xy[i * 2], xy[i * 2 + 1]);
            c.lineTo(x1, y1);
            c.stroke();
        };
        const b0 = k.in, b1 = L - k.out;
        let i = 0;
        for (; i < last && s[i] < b0; i++) seg(i, i + 1, xy[i * 2 + 2], xy[i * 2 + 3]);
        if (i < last && s[i] < b1) {
            c.lineWidth = SW;
            c.beginPath();
            c.moveTo(xy[i * 2], xy[i * 2 + 1]);
            for (; i < last && s[i] < b1; i++) c.lineTo(xy[i * 2 + 2], xy[i * 2 + 3]);
            c.stroke();
        }
        for (; i < last; i++) seg(i, i + 1, xy[i * 2 + 2], xy[i * 2 + 3]);
        if (v > s[last] + 0.01) seg(last, n, hx, hy);
        else if (last === 0) {
            c.beginPath();
            c.arc(hx, hy, width(k, 0) / 2, 0, Math.PI * 2);
            c.fill();
        }
    }

    let progress = STATIC ? 1 : 0, shown = -1, visible = false, raf = 0, last = 0;

    // Starts as the signature's box enters; completes once it sits centred, or at the very bottom if that comes first
    function target() {
        const r = hero.getBoundingClientRect(), f = foot.getBoundingClientRect(), vh = window.innerHeight;
        const start = vh - r.height * 0.15;
        const end = Math.min(start - 1, Math.max((vh - r.height) / 2, vh - r.height - (f.bottom - r.bottom) + 2));
        return clamp01((start - r.top) / Math.max(1, start - end));
    }

    // Finished strokes live on a cache canvas, redrawn only when another one completes
    function render() {
        let done = 0;
        while (done < strokes.length && progress >= strokes[done].t1) done++;
        if (done !== cached) {
            cctx.setTransform(1, 0, 0, 1, 0, 0);
            cctx.clearRect(0, 0, cache.width, cache.height);
            pen(cctx);
            for (let i = 0; i < done; i++) drawStroke(cctx, strokes[i], 1);
            cached = done;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (done) ctx.drawImage(cache, 0, 0);
        if (done < strokes.length) {
            const k = strokes[done];
            pen(ctx);
            drawStroke(ctx, k, clamp01((progress - k.t0) / (k.t1 - k.t0)));
        }
        shown = progress;
        if (!foot.classList.contains('is-drawn')) foot.classList.add('is-drawn');
    }

    function frame(now) {
        raf = 0;
        const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
        last = now;
        if (!STATIC) {
            const t = target();
            progress += (t - progress) * (1 - Math.exp(-dt * 7));
            if (Math.abs(t - progress) < 2e-4) progress = t;
        }
        if (shown < 0 || Math.abs(progress - shown) > 1e-5) render();
        if (visible) raf = requestAnimationFrame(frame);
    }
    function frameOnce() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

    function init() {
        size();
        if ('ResizeObserver' in window) new ResizeObserver(() => { if (size()) { shown = -1; frameOnce(); } }).observe(hero);
        else window.addEventListener('resize', () => { if (size()) { shown = -1; frameOnce(); } }, { passive: true });
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((es) => {
                visible = es[es.length - 1].isIntersecting;
                if (visible) frameOnce();
            }, { rootMargin: '25% 0px' }).observe(foot);
        } else { visible = true; frameOnce(); }
        render();
    }

    window.__sigFooter = {
        state: () => ({ progress, target: target(), strokes: strokes.length, span, W, H, scale }),
        set: (p) => { progress = p; render(); },
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
