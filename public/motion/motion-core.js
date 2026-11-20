(function () {
    'use strict';

    const PROTOS = [
        ['01-plotter-callouts', 'Plotter Callouts'],
        ['02-callouts-ap-drift', 'Callouts + AP Drift'],
        ['03-live-screen', 'Live Screen'],
    ];

    const ART_W = 1672, ART_H = 941;
    const clamp01 = (x) => Math.max(0, Math.min(1, x));

    // Loads the real site, skips its intro and hands two empty layers
    // (slide 1 paper, slide 2 margins) plus live geometry to a prototype
    function MotionProto(opts) {
        const i = Math.max(0, PROTOS.findIndex((p) => p[0] === opts.id));
        const prev = PROTOS[(i - 1 + PROTOS.length) % PROTOS.length];
        const next = PROTOS[(i + 1) % PROTOS.length];

        document.body.insertAdjacentHTML('afterbegin',
            '<iframe id="siteFrame" src="/index.html" title="Portfolio"></iframe>' +
            '<nav class="mp-dock" id="mpDock" aria-label="Motion prototypes">' +
                '<button type="button" data-slide="1">Slide 1</button>' +
                '<button type="button" data-slide="2">Slide 2</button>' +
                '<a href="' + prev[0] + '.html" aria-label="Previous prototype">←</a>' +
                '<b><span>' + PROTOS[i][0].slice(0, 2) + '</span> ' + PROTOS[i][1] + '</b>' +
                '<a href="' + next[0] + '.html" aria-label="Next prototype">→</a>' +
                '<a href="index.html">All</a>' +
            '</nav>');

        const frame = document.getElementById('siteFrame');
        const dock = document.getElementById('mpDock');

        function claim() {
            const w = frame.contentWindow;
            try {
                if (w && typeof w.__setIntroManual === 'function' && typeof w.__renderIntroAt === 'function' &&
                    w.document.readyState !== 'loading' && w.__heroAvatarEngine &&
                    w.document.getElementById('heroMarqueeOutlineClip').firstChild) {
                    w.__setIntroManual();
                    w.__renderIntroAt(99);
                    w.document.body.classList.add('is-loaded');
                    w.dispatchEvent(new w.CustomEvent('intro-complete'));
                    setup(w, w.document);
                    return;
                }
            } catch (e) { /* not ready */ }
            setTimeout(claim, 80);
        }
        claim();

        function setup(win, doc) {
            const style = doc.createElement('style');
            style.textContent =
                '.mp-layer { position: absolute; pointer-events: none; overflow: hidden; }' +
                '.mp-s1 { left: 50%; top: 50%; width: 100vw; height: 100vh; transform: translate(-50%, -50%); z-index: 2; }' +
                '.mp-s2 { inset: 0; width: 100%; height: 100%; z-index: 1; opacity: 0; transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1); }' +
                '.mp-s2.is-active { opacity: 1; }' +
                (opts.css || '');
            doc.head.appendChild(style);

            const card = doc.getElementById('heroShrinkCard');
            const marquee = doc.getElementById('heroMarquee');
            const line1 = marquee && marquee.querySelector('.track-line-1');
            const line2 = marquee && marquee.querySelector('.track-line-2');
            const scroller = doc.querySelector('.js-scroller');

            const s1 = doc.createElement('div');
            s1.className = 'mp-layer mp-s1';
            card.insertBefore(s1, card.firstChild);
            const s2 = doc.createElement('div');
            s2.className = 'mp-layer mp-s2';
            card.parentNode.insertBefore(s2, card);

            const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, speed: 0, moved: 0, down: [] };
            let lastMove = 0;
            doc.addEventListener('pointermove', (e) => {
                const now = performance.now();
                const dt = Math.max(1, now - lastMove) / 1000;
                if (mouse.x > -9000) {
                    mouse.vx = (e.clientX - mouse.x) / dt;
                    mouse.vy = (e.clientY - mouse.y) / dt;
                }
                mouse.x = e.clientX;
                mouse.y = e.clientY;
                mouse.moved = now;
                lastMove = now;
            }, { passive: true });
            doc.addEventListener('pointerdown', (e) => mouse.down.push({ x: e.clientX, y: e.clientY }), { passive: true });

            const S = {
                win, doc, s1, s2, mouse,
                t: 0, dt: 0,
                winW: 0, winH: 0,
                card: null, target: null,
                shrinkP: 0, s1Alpha: 1, s2Active: false,
                lines: null,
                scrollTop: 0, scrollV: 0,
                art(ax, ay) {
                    const r = S.card;
                    const k = Math.max(r.width / ART_W, r.height / ART_H);
                    return { x: r.left + r.width / 2 + (ax - ART_W / 2) * k, y: r.top + r.height / 2 + (ay - ART_H / 2) * k, k };
                },
                local(layer, x, y) {
                    const r = layer === s1 ? S.s1Rect : S.s2Rect;
                    return { x: x - r.left, y: y - r.top };
                },
                el(tag, cls, parent, ns) {
                    const n = ns ? doc.createElementNS('http://www.w3.org/2000/svg', tag) : doc.createElement(tag);
                    if (cls) n.setAttribute('class', cls);
                    if (parent) parent.appendChild(n);
                    return n;
                },
            };

            function measure() {
                S.winW = win.innerWidth;
                S.winH = win.innerHeight;
                const rem = parseFloat(win.getComputedStyle(doc.documentElement).fontSize) || 16;
                const tw = Math.min(35.375 * rem, S.winW * 0.92);
                const th = Math.min(22.875 * rem, S.winH * 0.62);
                const r = card.getBoundingClientRect();
                S.card = r;
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                S.target = { left: cx - tw / 2, right: cx + tw / 2, top: cy - th / 2, bottom: cy + th / 2, width: tw, height: th, cx, cy };
                S.shrinkP = clamp01((S.winW - r.width) / Math.max(1, S.winW - tw));
                const a = line1.getBoundingClientRect(), b = line2.getBoundingClientRect();
                S.lines = { l1Top: a.top, l1Bottom: a.bottom, l2Top: b.top, l2Bottom: b.bottom };
                S.s1Rect = s1.getBoundingClientRect();
                S.s2Rect = s2.getBoundingClientRect();
                S.s1Alpha = Math.max(0, 1 - S.shrinkP * 3);
                S.s2Active = S.shrinkP > 0.25;
                const st = scroller ? scroller.scrollTop : 0;
                S.scrollV = S.dt > 0 ? (st - S.scrollTop) / S.dt : 0;
                S.scrollTop = st;
            }

            s1.style.opacity = '1';
            measure();
            const proto = opts.mount(S) || {};

            let t0 = performance.now(), last = t0;
            function loop(now) {
                S.dt = Math.min(0.05, (now - last) / 1000);
                last = now;
                S.t = (now - t0) / 1000;
                measure();
                s1.style.opacity = S.s1Alpha;
                s2.classList.toggle('is-active', S.s2Active);
                mouse.speed = Math.hypot(mouse.vx, mouse.vy);
                if (now - mouse.moved > 80) { mouse.vx *= 0.85; mouse.vy *= 0.85; }
                if (proto.frame) proto.frame(S);
                mouse.down.length = 0;
                requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);

            dock.addEventListener('click', (e) => {
                const b = e.target.closest('[data-slide]');
                if (!b || !scroller) return;
                const top = b.dataset.slide === '2' ? Math.ceil(S.winH * 1.25 * 0.74) : 0;
                scroller.scrollTo({ top, behavior: 'smooth' });
            });
            dock.classList.add('is-visible');
            window.__mp = S;
        }
    }

    MotionProto.clamp01 = clamp01;
    MotionProto.list = PROTOS;
    window.MotionProto = MotionProto;
})();
