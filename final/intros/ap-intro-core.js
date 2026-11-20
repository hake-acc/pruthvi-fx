(function () {
    'use strict';

    const INTROS = [
        ['01-goal-ultra', 'Goal Ultra'],
        ['02-dither-melt', 'Dither Melt'],
        ['03-ink-bleed', 'Ink Bleed'],
        ['04-split-flap', 'Split Flap'],
        ['05-marquee-tear', 'Marquee Tear'],
        ['06-plotter', 'Plotter'],
        ['07-block-drop', 'Block Drop'],
        ['08-stem-split', 'Stem Split'],
        ['09-halftone', 'Halftone'],
        ['10-plotter-bleed', 'Plotter Bleed'],
    ];

    const PRELUDE = `
        precision highp float;
        #define PI 3.14159265

        uniform vec2 uRes;      // viewport, CSS px
        uniform float uDpr;
        uniform float uTime;
        uniform float uFill;    // big mark fill 0 → 1 (bottom → top)
        uniform float uBigH;    // big mark height, CSS px (same size as the main intro)
        uniform float uMarkH;   // grid tile mark height, CSS px

        const vec3 INK = vec3(0.0);
        const vec3 SILHOUETTE = vec3(0.1333);
        const vec3 PAPER = vec3(1.0);
        const vec3 SIGNAL = vec3(1.0, 0.929, 0.161);
        const vec2 AP_VB = vec2(803.0, 644.0);

        // Chebyshev box distance keeps dilation square, so the mark grows like pixels, not blobs
        float sdBox(vec2 p, vec4 r) {
            vec2 c = (r.xy + r.zw) * 0.5;
            vec2 h = (r.zw - r.xy) * 0.5;
            vec2 q = abs(p - c) - h;
            return max(q.x, q.y);
        }

        // The navbar AP mark (viewBox 803 × 644, y down) as a union of its pixel blocks
        float sdAP(vec2 u) {
            float d = sdBox(u, vec4(0.0, 95.0, 99.0, 644.0));
            d = min(d, sdBox(u, vec4(99.0, 0.0, 352.0, 95.0)));
            d = min(d, sdBox(u, vec4(99.0, 254.0, 353.0, 359.0)));
            d = min(d, sdBox(u, vec4(352.0, 95.0, 468.0, 644.0)));
            d = min(d, sdBox(u, vec4(410.0, 0.0, 711.0, 95.0)));
            d = min(d, sdBox(u, vec4(711.0, 95.0, 803.0, 339.0)));
            d = min(d, sdBox(u, vec4(662.0, 95.0, 711.0, 141.0)));
            d = min(d, sdBox(u, vec4(662.0, 292.0, 711.0, 341.0)));
            d = min(d, sdBox(u, vec4(468.0, 341.0, 706.0, 440.0)));
            return d;
        }

        float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 w = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
        }

        float fbm(vec2 p) {
            float a = 0.5, s = 0.0;
            for (int i = 0; i < 5; i++) {
                s += a * noise(p);
                p = p * 2.03 + 17.1;
                a *= 0.5;
            }
            return s;
        }

        mat2 rot(float a) {
            float c = cos(a), s = sin(a);
            return mat2(c, -s, s, c);
        }

        // Centred CSS px, y down
        vec2 screenPx() {
            vec2 px = gl_FragCoord.xy / uDpr - uRes * 0.5;
            return vec2(px.x, -px.y);
        }

        // Centred CSS px → AP viewBox units for a mark of height h
        vec2 toAP(vec2 p, float h) {
            return p / h * 644.0 + AP_VB * 0.5;
        }

        float grain() {
            return (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * 0.035;
        }
    `;

    const GRID = `
        uniform float uScale;   // camera scale (1 = final tile size)
        uniform float uRot;     // camera rotation, radians
        uniform float uGrow;    // grid population progress
        uniform vec2 uPitch;    // tile pitch, CSS px

        vec2 gIdx;
        vec2 gLocal;
        vec2 gU;
        float gSd;
        float gAA;
        float gDn;
        float gH;
        float gMarkA;
        vec3 gMark;

        // The pull-back grid shared with Goal Ultra: centre tile carries the big fill, the rest ripple in
        void apGrid(vec2 px) {
            vec2 w = rot(-uRot) * px / uScale;
            gIdx = floor((w + uPitch * 0.5) / uPitch);
            gLocal = w - gIdx * uPitch;
            float upp = 644.0 / uMarkH;
            gU = gLocal * upp + AP_VB * 0.5;
            gSd = sdAP(gU);
            gAA = upp / (uScale * uDpr);
            float cov = clamp(0.5 - gSd / gAA, 0.0, 1.0);

            bool centre = gIdx.x == 0.0 && gIdx.y == 0.0;
            gH = hash(gIdx + 17.0);
            vec2 cs = rot(uRot) * (gIdx * uPitch) * uScale;
            gDn = length(cs) / length(uRes * 0.5);

            float presence = 1.0;
            float fill = uFill;
            if (!centre) {
                float lag = gDn * 0.55 + gH * 0.15;
                presence = clamp((uGrow - lag) / 0.12, 0.0, 1.0);
                fill = clamp((uGrow - 0.12 - lag) / 0.3, 0.0, 1.0);
            }
            float filled = clamp((gU.y - 644.0 * (1.0 - fill)) / gAA + 0.5, 0.0, 1.0);
            gMarkA = cov * presence;
            gMark = mix(SILHOUETTE, PAPER, filled) * gMarkA;
        }
    `;

    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const ease = {
        inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
        inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
        inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
        outCubic: (x) => 1 - Math.pow(1 - x, 3),
        outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    };

    function APIntro(opts) {
        const FILL_MIN = opts.fillMin || 2.0;
        const MARK_H = opts.markH || 40;
        const PITCH = [MARK_H * 803 / 644 + MARK_H * 0.5, MARK_H * 1.6];
        const i = Math.max(0, INTROS.findIndex((x) => x[0] === opts.id));
        const prev = INTROS[(i - 1 + INTROS.length) % INTROS.length];
        const next = INTROS[(i + 1) % INTROS.length];

        // inPage: runs inside the site itself (no iframe, no preview dock) as the real loader
        const inPage = !!opts.inPage;
        // Framed copies of the site (the loader previews) are driven by their parent page
        if (inPage && window.self !== window.top) return;
        let frame = null, canvas, dock = null;
        if (inPage) {
            canvas = document.createElement('canvas');
            canvas.id = 'apIntro';
            canvas.setAttribute('aria-hidden', 'true');
            canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:1000000;background:#000;';
            document.body.appendChild(canvas);
        } else {
            document.body.insertAdjacentHTML('afterbegin',
                '<iframe id="heroFrame" src="/index.html" title="Portfolio"></iframe>' +
                '<canvas id="apIntro" aria-hidden="true"></canvas>' +
                '<nav class="intro-dock" id="introDock" aria-label="Intro loaders">' +
                    '<button type="button" data-replay><span>↺</span> Replay</button>' +
                    '<a href="' + prev[0] + '.html" aria-label="Previous intro">←</a>' +
                    '<b><span>' + INTROS[i][0].slice(0, 2) + '</span> ' + INTROS[i][1] + '</b>' +
                    '<a href="' + next[0] + '.html" aria-label="Next intro">→</a>' +
                    '<a href="index.html">All</a>' +
                '</nav>');
            frame = document.getElementById('heroFrame');
            canvas = document.getElementById('apIntro');
            dock = document.getElementById('introDock');
        }

        let heroReady = false;

        // The real site runs behind the loader; skip its own intro so the hero sits there, finished
        function claimHero(force) {
            const iw = inPage ? window : frame.contentWindow;
            if (!iw || heroReady) return;
            try {
                if (typeof iw.__setIntroManual === 'function' && typeof iw.__renderIntroAt === 'function' &&
                    (force || (iw.document.readyState !== 'loading' && iw.__heroAvatarEngine))) {
                    iw.__setIntroManual();
                    iw.__renderIntroAt(99);
                    iw.document.body.classList.add('is-loaded');
                    iw.dispatchEvent(new iw.CustomEvent('intro-complete'));
                    heroReady = true;
                    return;
                }
            } catch (e) { /* cross-origin guard */ }
            if (!force) setTimeout(claimHero, 60);
        }
        const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
        if (!gl) {
            // In the site, the page's own intro keeps running as the fallback
            if (inPage) canvas.remove();
            else canvas.style.display = 'none';
            return;
        }

        if (inPage) {
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.style.display = 'none';
            if (typeof window.__setIntroManual === 'function') window.__setIntroManual();
        }
        claimHero();
        setTimeout(() => { claimHero(true); heroReady = true; }, 8000);

        function compile(type, src) {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
            return s;
        }

        const prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER,
            PRELUDE + (opts.grid ? GRID : '') + (opts.frag || document.getElementById('introFrag').textContent)));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const locs = {};
        function setU(name, v) {
            if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
            const l = locs[name];
            if (!l) return;
            if (typeof v === 'number') gl.uniform1f(l, v);
            else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
            else gl.uniform3f(l, v[0], v[1], v[2]);
        }

        let vw = 0, vh = 0, dpr = 1, bigH = 0, startScale = 1;
        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            vw = window.innerWidth;
            vh = window.innerHeight;
            canvas.width = Math.round(vw * dpr);
            canvas.height = Math.round(vh * dpr);
            gl.viewport(0, 0, canvas.width, canvas.height);
            // Same big-mark size as the main intro: 4.3 units of min(42, vw / 30) px
            bigH = 4.3 * Math.floor(Math.min(42, vw / 30));
            startScale = Math.max(1, bigH / MARK_H);
        }
        window.addEventListener('resize', resize);
        resize();

        let clock = 0, last = 0, fill = 0, fullAt = -1, rafId = 0;

        function start() {
            clock = 0;
            last = performance.now();
            fill = 0;
            fullAt = -1;
            canvas.classList.remove('is-done');
            canvas.style.display = '';
            if (dock) dock.classList.remove('is-visible');
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(loop);
        }

        function loop(now) {
            // Main-thread stalls while the page loads pause the timeline instead of skipping it ahead
            const dt = Math.min(Math.max(0, now - last) / 1000, 1 / 20);
            last = now;
            clock += dt;
            const elapsed = clock;

            // Fill tracks time, parks at 92% until the hero behind is ready, then completes
            const target = Math.min(elapsed / FILL_MIN, heroReady ? 1 : 0.92);
            fill = Math.min(target, fill + dt / 1.2);
            if (fill >= 1 && fullAt < 0) fullAt = elapsed;

            if (render(elapsed)) rafId = requestAnimationFrame(loop);
        }

        function render(elapsed) {
            const out = opts.frame({
                t: elapsed,
                since: fullAt >= 0 ? elapsed - fullAt : -1,
                fill, vw, vh, bigH, startScale, framed: !!frame,
            }) || {};

            if (out.done) {
                canvas.classList.add('is-done');
                canvas.style.display = 'none';
                if (frame) frame.style.transform = '';
                if (dock) dock.classList.add('is-visible');
                return false;
            }
            if (frame) frame.style.transform = out.hero || '';

            setU('uRes', [vw, vh]);
            setU('uDpr', dpr);
            setU('uTime', elapsed);
            setU('uFill', fill);
            setU('uBigH', bigH);
            setU('uMarkH', MARK_H);
            setU('uPitch', PITCH);
            const u = out.u || {};
            for (const k in u) setU(k, u[k]);

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            if (inPage && canvas.style.backgroundColor) canvas.style.backgroundColor = '';
            return true;
        }

        if (dock) dock.querySelector('[data-replay]').addEventListener('click', start);

        // Frame-stepping hook for previews: renders the timeline at `t` seconds with an on-time fill
        window.__apIntroRenderAt = function (t) {
            cancelAnimationFrame(rafId);
            canvas.classList.remove('is-done');
            canvas.style.display = '';
            fill = clamp01(t / FILL_MIN);
            fullAt = fill >= 1 ? FILL_MIN : -1;
            return render(t);
        };

        start();
    }

    // Goal Ultra's camera: hold, then pull back with a small swing while the grid ripples in
    APIntro.grid = function (s, o) {
        const HOLD = (o && o.hold) || 0.35, PULL = 1.5, SETTLE = 0.3;
        const u = { uScale: s.startScale, uRot: 0, uGrow: 0 };
        let since = -1;
        if (s.since >= 0) {
            const g = (s.since - HOLD) / PULL;
            const e = ease.inOutCubic(clamp01(g));
            u.uScale = Math.pow(s.startScale, 1 - e);
            u.uRot = -0.2 * Math.sin(Math.PI * e);
            u.uGrow = Math.max(0, g);
            since = s.since - HOLD - PULL - SETTLE;
        }
        return { u, since };
    };

    APIntro.clamp01 = clamp01;
    APIntro.ease = ease;
    APIntro.list = INTROS;
    window.APIntro = APIntro;
})();
