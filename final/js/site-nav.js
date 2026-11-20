// The header pill on every page (css/site-nav.css): the bar or the burger opens it, Escape, the scrim or a link closes
// it. The centre line and the pixel mark follow the section on screen, [data-scroll] links glide to their section
// without ever putting a fragment in the URL, and the form button opens the brief on /contact (from elsewhere it rides
// the page transition there and the brief opens on arrival). body.is-nav-hidden slides the whole pill away.
(() => {
    'use strict';

    const nav = document.querySelector('.ap-nav');
    if (!nav) return;
    const burger = nav.querySelector('.ap-nav__burger');
    const menu = nav.querySelector('.ap-nav__menu');
    const focusables = () => [nav.querySelector('.ap-nav__mark'), burger, ...menu.querySelectorAll('a, button')];

    function set(open) {
        if (open === nav.classList.contains('is-open')) return;
        nav.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.inert = !open;
        if (!open && menu.contains(document.activeElement)) burger.focus({ preventScroll: true });
    }

    // one markup on every page: the current one is found from the URL
    const here = document.body.dataset.page === '404' ? 'lost' : /^\/contact(\/|\.html)?$/.test(location.pathname) ? 'contact' : 'home';
    for (const a of nav.querySelectorAll('[data-nav]')) {
        if (a.dataset.nav !== here) continue;
        a.setAttribute('aria-current', 'page');
        a.querySelector('.ap-nav__ico').innerHTML = '<rect x="2" y="2" width="6" height="6" fill="currentColor" />';
        a.insertAdjacentHTML('beforeend', '<span class="ap-nav__here" aria-hidden="true">You are here</span>');
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ------------------------------------------------------------ the centre line: one per section, typed through
    // glyphs that resolve whenever the section changes
    const LINES = {
        hero: 'Creative developer, India',
        screen: 'Lives inside the screen',
        projects: 'Selected work, source open',
        stack: 'What the work is made of',
        watch: 'Every dot placed by hand',
        together: 'Bring the odd idea',
        end: 'Writes back within a day',
        contact: 'Yes, the calendar dances',
        lost: 'This page wandered off',
    };
    const msg = nav.querySelector('.ap-nav__msg');
    const G = '#$*@(0%1>';
    let msgRaf = 0, msgText = msg ? msg.textContent : '';
    function line(text) {
        if (!msg || text === msgText) return;
        msgText = text;
        cancelAnimationFrame(msgRaf);
        if (reduce.matches) { msg.textContent = text; return; }
        const t0 = performance.now(), D = 520 + text.length * 12;
        const step = (now) => {
            const k = Math.min(1, (now - t0) / D), fixed = Math.floor(Math.max(0, k * 1.4 - 0.4) * text.length), shown = Math.ceil(Math.min(1, k * 1.6) * text.length);
            let s = text.slice(0, fixed);
            for (let i = fixed; i < shown; i++) s += text[i] === ' ' ? ' ' : G[(Math.random() * G.length) | 0];
            msg.textContent = s;
            if (k < 1) msgRaf = requestAnimationFrame(step);
        };
        msgRaf = requestAnimationFrame(step);
    }

    // ------------------------------------------------------------ the mark: AP on a 16 x 13 pixel grid that re-books
    // itself cell by cell into the glyph of the section on screen; hovering it brings the AP back
    const GW = 16, GH = 13, SIGNAL = '#FFED29';
    const bits = (rows) => Uint8Array.from(rows.join(''), (c) => (c === '#' ? 1 : 0));
    const GLYPHS = {
        // the hero: the character's face behind its round spectacles
        face: bits([
            '...##########...',
            '.##############.',
            '################',
            '################',
            '##.....##.....##',
            '##.##..##.##..##',
            '##.....##.....##',
            '################',
            '################',
            '####.######.####',
            '#####......#####',
            '.##############.',
            '...##########...',
        ]),
        heart: bits([
            '................',
            '..####....####..',
            '.######..######.',
            '################',
            '################',
            '################',
            '.##############.',
            '..############..',
            '...##########...',
            '....########....',
            '.....######.....',
            '......####......',
            '.......##.......',
        ]),
        // slide 2: the shrunk screen with the bio typed into it
        screen: bits([
            '................',
            '################',
            '#..............#',
            '#.##...........#',
            '#.##.######....#',
            '#..............#',
            '#.#########....#',
            '#.######.......#',
            '#..............#',
            '################',
            '......####......',
            '......####......',
            '...##########...',
        ]),
        // alternative projects: folder / archive
        folder: bits([
            '......#####.....',
            '.....#######....',
            '################',
            '#..............#',
            '#.############.#',
            '#.#..........#.#',
            '#.#..........#.#',
            '#.#..........#.#',
            '#.############.#',
            '#..............#',
            '################',
            '################',
            '................',
        ]),
        // alternative together: spectacles
        specs: bits([
            '................',
            '..############..',
            '.##############.',
            '##....####....##',
            '##.##.####.##.##',
            '##....####....##',
            '.##############.',
            '..############..',
            '................',
            '................',
            '................',
            '................',
            '................',
        ]),
        // alternative spark
        spark: bits([
            '.......##.......',
            '......####......',
            '.....######.....',
            '....########....',
            '...##########...',
            '......####......',
            '.....######.....',
            '....########....',
            '......####......',
            '.......##.......',
            '........#.......',
            '................',
            '................',
        ]),
        // the projects: source, open
        code: bits([
            '.........##.....',
            '.........##.....',
            '.........##.....',
            '...##...##.##...',
            '..##....##..##..',
            '.##.....##...##.',
            '##.....##.....##',
            '.##....##....##.',
            '..##...##...##..',
            '...##.##...##...',
            '......##........',
            '......##........',
            '.....##.........',
        ]),
        // the stack: layers
        layers: bits([
            '.......##.......',
            '.....######.....',
            '...##########...',
            '.##############.',
            '...##########...',
            '#....######....#',
            '###....##....###',
            '..###......###..',
            '....###..###....',
            '#.....####.....#',
            '###..........###',
            '..###......###..',
            '....########....',
        ]),
        // slide 4: the dithered portrait looking back
        eye: bits([
            '................',
            '................',
            '.....######.....',
            '...###....###...',
            '.##...####...##.',
            '##...######...##',
            '#...###..###...#',
            '##...######...##',
            '.##...####...##.',
            '...###....###...',
            '.....######.....',
            '................',
            '................',
        ]),
        // build together: the odd idea
        bulb: bits([
            '.....######.....',
            '...##########...',
            '..############..',
            '.####..########.',
            '.###..#########.',
            '.##############.',
            '..############..',
            '...##########...',
            '....########....',
            '................',
            '....########....',
            '.....######.....',
            '.......##.......',
        ]),
        // /contact: the week view with one slot still free
        cal: bits([
            '..##........##..',
            '################',
            '################',
            '#..............#',
            '#..##..##..##..#',
            '#..##..##..##..#',
            '#..............#',
            '#..##..##..##..#',
            '#..##..##..##..#',
            '#..............#',
            '#..##..##......#',
            '#..##..##......#',
            '################',
        ]),
        // the 404
        ask: bits([
            '....########....',
            '...##########...',
            '..####....####..',
            '..###......###..',
            '...........###..',
            '.........####...',
            '.......####.....',
            '......###.......',
            '......###.......',
            '................',
            '......###.......',
            '......###.......',
            '................',
        ]),
        // the end screen and the form: an envelope
        mail: bits([
            '################',
            '################',
            '#.############.#',
            '##.##########.##',
            '###.########.###',
            '####.######.####',
            '#####.####.#####',
            '######.##.######',
            '#######..#######',
            '################',
            '################',
            '################',
            '################',
        ]),
    };
    const mark = nav.querySelector('.ap-nav__mark'), markSvg = mark && mark.querySelector('svg');
    const markPath = markSvg && markSvg.querySelector('path');
    let morphTo = null;
    if (mark && markPath) {
        const p = new Path2D(markPath.getAttribute('d')), probe = document.createElement('canvas').getContext('2d');
        const ap = new Uint8Array(GW * GH);
        for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) ap[j * GW + i] = probe.isPointInPath(p, (i + 0.5) * 803 / GW, (j + 0.5) * 644 / GH, 'evenodd') ? 1 : 0;
        GLYPHS.ap = ap;
        const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
        const turn = new Float32Array(GW * GH);
        for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) turn[j * GW + i] = 0.55 * (i + j) / (GW + GH - 2) + 0.45 * BAYER[(j & 3) * 4 + (i & 3)] / 15;
        const cv = document.createElement('canvas'), cx = cv.getContext('2d');
        cv.className = 'ap-nav__px';
        cv.setAttribute('aria-hidden', 'true');
        mark.appendChild(cv);
        const shown = ap.slice(), from = ap.slice();
        let target = 'ap', raf = 0, t0 = 0;
        const D = 460, FLASH = 70;
        const draw = (now) => {
            const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
            if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
            const to = GLYPHS[target], ink = getComputedStyle(mark).color, W = cv.width, H = cv.height;
            const k = (now - t0) / D;
            let done = true;
            cx.clearRect(0, 0, W, H);
            for (let c = 0; c < GW * GH; c++) {
                let v = from[c], flash = false;
                if (from[c] !== to[c]) {
                    const at = turn[c] * D * 0.8;
                    if (now - t0 >= at + FLASH) v = to[c];
                    else { done = false; flash = now - t0 >= at; }
                }
                shown[c] = v;
                if (!v && !flash) continue;
                const i = c % GW, j = (c / GW) | 0;
                const x0 = Math.round(i * W / GW), y0 = Math.round(j * H / GH);
                cx.fillStyle = flash ? SIGNAL : ink;
                cx.fillRect(x0, y0, Math.round((i + 1) * W / GW) - x0, Math.round((j + 1) * H / GH) - y0);
            }
            return done || k > 2;
        };
        const frame = (now) => {
            raf = 0;
            if (!draw(now)) { raf = requestAnimationFrame(frame); return; }
            mark.classList.toggle('is-px', target !== 'ap');
        };
        morphTo = (name) => {
            if (!GLYPHS[name] || name === target) return;
            from.set(shown);
            target = name;
            t0 = performance.now();
            mark.classList.add('is-px');
            if (reduce.matches) { from.set(GLYPHS[name]); t0 -= D * 3; }
            if (!raf) raf = requestAnimationFrame(frame);
        };
    }

    // ------------------------------------------------------------ what the bar says and shows, per section
    // Top-left mark remains consistently the editorial AP mark across all sections
    let section = here === 'home' ? 'hero' : here;
    function apply() {
        line(LINES[section] || LINES.hero);
        if (morphTo) morphTo('ap');
    }
    if (mark) {
        mark.addEventListener('pointerenter', () => { if (morphTo) morphTo('ap'); });
        mark.addEventListener('pointerleave', apply);
        mark.addEventListener('click', (e) => {
            const isHome = location.pathname === '/' || location.pathname === '/index.html' || location.pathname === '';
            if (isHome) {
                e.preventDefault();
                set(false);
                const lenis = lenisOf();
                if (lenis) lenis.scrollTo(0, { duration: 1.4, force: true });
                else window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                if (window.__pageTransition && typeof window.__pageTransition.navigate === 'function') {
                    e.preventDefault();
                    window.__pageTransition.navigate('/');
                }
            }
        });
    }

    // ------------------------------------------------------------ the form button: on /contact it opens the brief
    // in place; elsewhere the transition carries data-intent="form" over and the contact page opens it on arrival
    for (const a of nav.querySelectorAll('[data-intent="form"]')) {
        a.addEventListener('click', (e) => {
            if (here !== 'contact' || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            set(false);
            window.dispatchEvent(new CustomEvent('ap:form'));
        });
    }

    // ------------------------------------------------------------ hidden: slide 4 sets body.is-nav-hidden itself;
    // the end screen borrows the same class while it lasts, without clearing one somebody else set
    const body = document.body;
    let endHid = false;
    function syncHidden() {
        const end = document.documentElement.classList.contains('is-wt-end');
        if (end && !body.classList.contains('is-nav-hidden')) { body.classList.add('is-nav-hidden'); endHid = true; }
        else if (!end && endHid) { endHid = false; body.classList.remove('is-nav-hidden'); }
        if (body.classList.contains('is-nav-hidden')) set(false);
    }

    // ------------------------------------------------------------ clean URLs: in-page targets scroll through Lenis
    // and never write a fragment; from another page the target rides along with the page transition
    const TARGETS = { projects: '#section-projects', stack: '.ll-section--services', together: '#work-together' };
    let appMod = null;
    const lenisOf = () => {
        const app = appMod && appMod.n, s = app && app.instances && app.instances.get('scroller');
        return (s && s.lenis) || null;
    };
    function scrollToKey(key, immediate) {
        const el = document.querySelector(TARGETS[key] || '');
        if (!el) return false;
        const lenis = lenisOf();
        if (lenis) lenis.scrollTo(el, immediate ? { immediate: true, force: true } : { duration: 1.6, force: true });
        else el.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
        return !!lenis || immediate;
    }
    const HASHES = { '#section-projects': 'projects', '#work-together': 'together', '#stack': 'stack' };
    const clean = () => { if (location.hash) history.replaceState(history.state, '', location.pathname + location.search); };

    if (here === 'home') {
        import('/wp-content/themes/lamalama2025/dist/assets/app-DjHRamTc.js').then((m) => { appMod = m; }).catch(() => {});
        const pending = window.__ptScroll || HASHES[location.hash] || null;
        clean();
        if (pending) {
            const t0 = performance.now();
            (function wait() {
                if (lenisOf() || performance.now() - t0 > 6000) { scrollToKey(pending, true); return; }
                setTimeout(wait, 60);
            })();
        }
        window.addEventListener('hashchange', () => {
            const key = HASHES[location.hash];
            clean();
            if (key) scrollToKey(key, false);
        });
        document.addEventListener('click', (e) => {
            const a = e.target.closest && e.target.closest('a[data-scroll], a[href^="#"], a[href^="/#"]');
            if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
            const key = a.dataset.scroll || HASHES[new URL(a.getAttribute('href'), location.href).hash];
            if (!key) return;
            e.preventDefault();
            e.stopPropagation();
            set(false);
            scrollToKey(key, false);
        }, true);

        // the section under the middle of the screen; slide 2 is the hero track once its card has shrunk into the
        // screen, slide 4 is wherever the nav has been told to hide, the last screen is the together slide's end state
        const secs = [['hero', '#heroTrack'], ['projects', '#section-projects'], ['stack', '.ll-section--services'], ['together', '#work-together']]
            .map(([k, s]) => [k, document.querySelector(s)]).filter((x) => x[1]);
        const card = document.querySelector('.hero-shrink-card');
        const live = new Set(), root = document.documentElement;
        const pick = () => {
            syncHidden();
            if (root.classList.contains('is-wt-end')) section = 'end';
            else if (body.classList.contains('is-nav-hidden')) section = 'watch';
            else {
                let k = 'hero';
                for (const [key, el] of secs) if (live.has(el)) k = key;
                section = k === 'hero' && card && card.classList.contains('is-shrunk') ? 'screen' : k;
            }
            apply();
        };
        const io = new IntersectionObserver((list) => {
            for (const en of list) { if (en.isIntersecting) live.add(en.target); else live.delete(en.target); }
            pick();
        }, { rootMargin: '-48% 0px -48% 0px' });
        for (const [, el] of secs) io.observe(el);
        const mo = new MutationObserver(pick), cls = { attributes: true, attributeFilter: ['class'] };
        mo.observe(root, cls);
        mo.observe(body, cls);
        if (card) mo.observe(card, cls);
    } else {
        clean();
        apply();
        new MutationObserver(syncHidden).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    menu.inert = true;
    burger.addEventListener('click', () => set(!nav.classList.contains('is-open')));
    nav.querySelector('.ap-nav__hit').addEventListener('click', () => set(!nav.classList.contains('is-open')));
    nav.querySelector('.ap-nav__scrim').addEventListener('click', () => set(false));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => {
        if (!nav.classList.contains('is-open')) return;
        if (e.key === 'Escape') { set(false); return; }
        if (e.key !== 'Tab') return;
        const f = focusables(), i = f.indexOf(document.activeElement);
        if (i < 0) return;
        if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
    });
})();
