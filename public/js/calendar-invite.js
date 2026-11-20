// The contact UI over the calendar: headline lines rise out of clips, mono labels type in as glyphs and resolve, a
// live India clock, the brief form that opens out of its button and posts straight to the inbox, and the side column:
// the soundtrack switch and "Join the calendar": the portrait rebuilt as stacks of meetings in its own colours at one
// of three grid sizes, and the camera, which takes over the whole screen in that grid while the dance shrinks into the
// portrait. Frames are read from a small canvas and never leave the page.
const CONTACT = {
    email: 'aaravpilania2006@gmail.com',
    github: 'https://github.com/AaravPilania',
    linkedin: 'https://www.linkedin.com/in/aarav-pilania',
    instagram: 'https://www.instagram.com/aaravpilania',
    // optional: a Web3Forms access key sends the brief through Web3Forms instead of FormSubmit
    web3formsKey: '',
};

(() => {
    'use strict';

    const root = document.body, section = document.getElementById('gcContact'), panel = document.getElementById('gcBooth');
    if (!section || !panel) return;
    const $ = (id) => document.getElementById(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 1000px)');

    for (const key of ['github', 'linkedin', 'instagram']) for (const a of document.querySelectorAll(`[data-link="${key}"]`)) {
        if (CONTACT[key]) a.href = CONTACT[key];
        else a.hidden = true;
    }

    // ------------------------------------------------------------ mono reveal (their parts/mono-text-reveal)
    const GLYPHS = ['#', '#', '#', '#', '#', '$', '*', '@', '(', '0', '%', '1', '>'];
    const KEEP = { ' ': '_', '[': '[', ']': ']' };
    const easeP2 = (k) => 1 - (1 - k) * (1 - k);
    const easeP3 = (k) => 1 - Math.pow(1 - k, 3);
    function monoWrap(el) {
        if (el.__mono) return el.__mono;
        const text = el.textContent;
        el.textContent = '';
        const box = document.createElement('span'), ghost = document.createElement('span'), live = document.createElement('span');
        box.className = 'gc-m'; ghost.className = 'gc-m__ghost'; live.className = 'gc-m__live';
        ghost.textContent = text;
        box.append(ghost, live);
        el.append(box);
        const m = { el, ghost, live, text, rand: '', shown: 0, swapped: 0, raf: 0, setText(t) { m.text = t; ghost.textContent = t; m.rand = ''; } };
        return (el.__mono = m);
    }
    function randomize(m) {
        let s = '';
        for (const ch of m.text) s += KEEP[ch] ?? GLYPHS[(Math.random() * GLYPHS.length) | 0];
        m.rand = s;
    }
    function render(m) {
        let s = '';
        for (let i = 0; i < Math.min(m.text.length, m.shown); i++) s += i < m.swapped ? m.text[i] : m.rand[i];
        m.live.textContent = s;
    }
    function monoIn(el, { delay = 0, dur = 0.25 } = {}) {
        const m = monoWrap(el);
        cancelAnimationFrame(m.raf);
        const n = m.text.length;
        if (reduce.matches) { m.shown = m.swapped = n; render(m); return; }
        randomize(m);
        m.shown = m.swapped = 0;
        render(m);
        const D = (dur + n * 0.005) * 1000, t0 = performance.now() + delay * 1000;
        const step = (now) => {
            const a = Math.max(0, Math.min(1, (now - t0) / D)), b = Math.max(0, Math.min(1, (now - t0 - 200) / D));
            m.shown = Math.ceil(easeP2(a) * n);
            m.swapped = Math.ceil(easeP2(b) * n);
            render(m);
            if (b < 1) m.raf = requestAnimationFrame(step);
        };
        m.raf = requestAnimationFrame(step);
    }
    function monoOut(el) {
        const m = monoWrap(el);
        cancelAnimationFrame(m.raf);
        if (!m.rand) randomize(m);
        if (reduce.matches) { m.shown = m.swapped = 0; render(m); return; }
        const s0 = m.shown, w0 = m.swapped, D = (0.15 + s0 * 0.005) * 1000, t0 = performance.now();
        const step = (now) => {
            const a = Math.max(0, Math.min(1, (now - t0) / D)), b = Math.max(0, Math.min(1, (now - t0 - 100) / D));
            m.swapped = Math.floor(w0 * (1 - easeP3(a)));
            m.shown = Math.floor(s0 * (1 - easeP3(b)));
            render(m);
            if (b < 1) m.raf = requestAnimationFrame(step);
        };
        m.raf = requestAnimationFrame(step);
    }
    const monos = [...document.querySelectorAll('[data-mono]')];
    for (const el of monos) monoWrap(el).live.textContent = '';

    // ------------------------------------------------------------ line reveal (their parts/text-reveal)
    const head = $('gcHead');
    function lineIn(el, delay = 0) {
        const lines = [...el.querySelectorAll('.gc-l')], n = lines.length;
        lines.forEach((l, t) => l.style.setProperty('--ld', (t * (0.135 + 0.03 * n) / (n > 1 ? n - 1 : 1) + 0.15 + delay).toFixed(3) + 's'));
        el.classList.remove('is-out');
        el.classList.add('is-in');
    }
    function lineOut(el) {
        el.classList.add('is-out');
        el.classList.remove('is-in');
    }

    // ------------------------------------------------------------ headline: letters decipher under the pointer, the
    // navbar's glyph scramble one letter at a time. A letter or the gap beside it scrambles that pair, a swipe runs on
    // through the rest of the word, the gap between the two slabs takes the nearest letter of each.
    const SCR = '#$*@(0%1>';
    head.setAttribute('aria-label', [...head.querySelectorAll('.gc-ink')].map((n) => n.textContent).join(' '));
    let ci = 0;
    const rows = [...head.querySelectorAll('.gc-ink')].map((ink) => {
        const text = ink.textContent, chars = [];
        ink.textContent = '';
        ink.setAttribute('aria-hidden', 'true');
        for (const ch of text) {
            const s = document.createElement('span');
            s.className = ch === ' ' ? 'gc-ch gc-ch--sp' : 'gc-ch';
            s.textContent = ch === ' ' ? '\u00a0' : ch;
            s.style.setProperty('--ci', ci++);
            ink.append(s);
            if (ch !== ' ') chars.push({ el: s, start: 0, until: 0, last: 0, raf: 0 });
        }
        return chars;
    });
    // each letter only scrambles through glyphs no wider than itself and inside cap height and baseline, so nothing
    // spills out of its cell either way
    let pools = false;
    function fitPools() {
        const cs = getComputedStyle(rows[0][0].el), mc = document.createElement('canvas').getContext('2d');
        mc.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const cap = mc.measureText('H').actualBoundingBoxAscent * 1.03, low = parseFloat(cs.fontSize) * 0.02;
        const gw = [...SCR].map((g) => { const m = mc.measureText(g); return [g, m.width, m.actualBoundingBoxAscent <= cap && m.actualBoundingBoxDescent <= low]; });
        const narrow = gw.filter((g) => g[2]).reduce((a, b) => (b[1] < a[1] ? b : a), ['#', Infinity])[0];
        for (const chars of rows) for (const c of chars) {
            const w = c.el.getBoundingClientRect().width + 0.5;
            c.pool = gw.filter((g) => g[2] && g[1] <= w).map((g) => g[0]).join('') || narrow;
        }
        pools = true;
    }
    window.addEventListener('resize', () => { pools = false; });
    function scramble(c, delay = 0) {
        if (!c || reduce.matches) return;
        if (!pools) fitPools();
        const now = performance.now();
        if (c.raf && c.until > now + delay + 200) return;
        c.start = now + delay;
        c.until = c.start + 380;
        if (c.raf) return;
        const step = (t) => {
            if (t >= c.until) { delete c.el.dataset.s; c.raf = 0; return; }
            if (t >= c.start && t - c.last > 55) { c.el.dataset.s = c.pool[(Math.random() * c.pool.length) | 0]; c.last = t; }
            c.raf = requestAnimationFrame(step);
        };
        c.raf = requestAnimationFrame(step);
    }
    let boxes = null, last = null, wave = 0, waveT = 0;
    const measure = () => {
        boxes = rows.map((chars) => ({
            r: chars[0].el.parentNode.getBoundingClientRect(),
            xs: chars.map((c) => { const b = c.el.getBoundingClientRect(); return (b.left + b.right) / 2; }),
        }));
    };
    const nearest = (xs, x) => { let i = 0; while (i < xs.length - 1 && x > (xs[i] + xs[i + 1]) / 2) i++; return i; };
    head.addEventListener('pointerenter', measure);
    head.addEventListener('pointermove', (e) => {
        if (!boxes) measure();
        const x = e.clientX, y = e.clientY, now = performance.now();
        const ri = boxes.findIndex((b) => y >= b.r.top && y <= b.r.bottom);
        if (ri < 0) {
            if (boxes.length > 1 && y > boxes[0].r.bottom && y < boxes[1].r.top) boxes.forEach((b, k) => scramble(rows[k][nearest(b.xs, x)]));
            last = null;
            return;
        }
        const { xs } = boxes[ri], cs = rows[ri];
        let i = 0;
        while (i < xs.length - 2 && x > xs[i + 1]) i++;
        scramble(cs[i]);
        scramble(cs[i + 1]);
        const idx = nearest(xs, x);
        if (last && last.row === ri && idx !== last.idx) {
            const dir = Math.sign(idx - last.idx), dt = Math.max(1, now - last.t);
            if (dt < 220 && Math.abs(x - last.x) / dt > 0.35 && (dir !== wave || now - waveT > 500)) {
                for (let k = idx + dir, d = 1; k >= 0 && k < cs.length; k += dir, d++) scramble(cs[k], d * 45);
                wave = dir;
                waveT = now;
            }
        }
        if (!last || last.row !== ri || last.idx !== idx) last = { row: ri, idx, t: now, x };
    });
    head.addEventListener('pointerleave', () => { last = null; boxes = null; });

    // ------------------------------------------------------------ entrance: after the sound gate
    let entered = false;
    function enter() {
        if (entered) return;
        entered = true;
        root.classList.add('is-entered');
        lineIn(head, 0.62);
        monos.forEach((el) => monoIn(el, { delay: 0.72 }));
        if (wantBrief) setTimeout(() => brief(true), 900);
    }
    // an old /contact#brief link still opens the form, but the address bar stays /contact
    const wantBrief = location.hash === '#brief';
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    (function waitStart() {
        if (window.CalendarClock && CalendarClock.started()) enter();
        else setTimeout(waitStart, 80);
    })();

    // ------------------------------------------------------------ clock: always the real time in India
    const clockEl = $('gcClock');
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    (function tick() {
        clockEl.textContent = fmt.format(new Date());
        setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    })();

    // ------------------------------------------------------------ the brief: a form that opens out of its button
    const openBtn = $('gcBriefOpen'), form = $('gcBrief'), f = $('gcForm'), note = $('gcFormNote'), send = $('gcSendLabel');
    let briefOpen = false;
    function brief(open) {
        if (open === briefOpen) return;
        briefOpen = open;
        root.classList.toggle('is-brief', open);
        openBtn.setAttribute('aria-expanded', String(open));
        form.inert = !open;
        window.dispatchEvent(new CustomEvent('ap:glyph', { detail: open ? 'mail' : null }));
        if (open) {
            lineOut(head);
            setTimeout(() => (form.dataset.state === 'done' ? $('gcFormAgain') : f.elements.name).focus({ preventScroll: true }), 450);
        } else {
            lineIn(head, 0.1);
            if (form.contains(document.activeElement)) openBtn.focus({ preventScroll: true });
        }
    }
    openBtn.addEventListener('click', () => brief(true));
    window.addEventListener('ap:form', () => brief(true));
    if (window.__ptIntent === 'form') setTimeout(() => brief(true), window.__ptIncoming ? 1250 : 0);
    $('gcBriefClose').addEventListener('click', () => brief(false));
    // a tap anywhere off the form closes it; the side column (camera, grid, links) stays usable underneath
    document.addEventListener('pointerdown', (e) => {
        if (!briefOpen || !e.isPrimary) return;
        const t = e.target;
        if (form.contains(t) || openBtn.contains(t) || t.closest('.gc-side, .ap-nav, .ss-gate')) return;
        brief(false);
    });
    window.addEventListener('ap:hash', (e) => { if (e.detail === '#brief') brief(true); });
    $('gcFormAgain').addEventListener('click', () => {
        f.reset();
        setForm('idle');
        f.elements.name.focus({ preventScroll: true });
    });

    const LABEL = { idle: 'Send it', sending: 'Sending', error: 'Try again', done: 'Sent' };
    function setForm(s, msg = '') {
        form.dataset.state = s;
        send.textContent = LABEL[s];
        note.textContent = msg;
        $('gcSend').disabled = s === 'sending';
    }
    f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (form.dataset.state === 'sending') return;
        const d = Object.fromEntries(new FormData(f));
        if (d._honey) return;
        const bad = !d.name.trim() ? 'name' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()) ? 'email' : !d.message.trim() ? 'message' : '';
        if (bad) {
            setForm('idle', bad === 'email' ? 'That email looks off.' : `The ${bad} is missing.`);
            f.elements[bad].focus();
            return;
        }
        setForm('sending');
        const subject = `New brief from ${d.name.trim()}`;
        const w3 = !!CONTACT.web3formsKey;
        const body = w3
            ? { access_key: CONTACT.web3formsKey, subject, from_name: d.name, name: d.name, email: d.email, message: d.message }
            : { name: d.name, email: d.email, message: d.message, _subject: subject, _replyto: d.email, _template: 'table', _captcha: 'false' };
        try {
            const res = await fetch(w3 ? 'https://api.web3forms.com/submit' : `https://formsubmit.co/ajax/${CONTACT.email}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(body),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok || String(out.success) !== 'true') throw new Error(out.message || 'failed');
            setForm('done');
        } catch (err) {
            setForm('error', `Didn't go through. Write to ${CONTACT.email} instead.`);
        }
    });

    // ------------------------------------------------------------ panel
    function setPanel(open) {
        panel.classList.toggle('is-open', open);
        const h = panel.querySelector('.gc-panel__head');
        h.setAttribute('aria-expanded', String(open));
        h.querySelector('.gc-panel__pm i').textContent = open ? '−' : '+';
        panel.querySelector('.gc-panel__body').inert = !open;
    }
    panel.querySelector('.gc-panel__head').addEventListener('click', () => setPanel(!panel.classList.contains('is-open')));
    setPanel(false);

    // ------------------------------------------------------------ camera mode: the panel opens, an open brief stays
    let cam = false;
    function camMode(on) {
        if (on === cam) return;
        cam = on;
        root.classList.toggle('is-cam', on);
        if (on) setPanel(true);
        else if (state !== 'idle') stop('');
    }

    // ------------------------------------------------------------ booth
    const shot = $('gcShot'), booth = $('gcCam'), say = (t) => { $('gcNote').textContent = t; };
    const book = $('gcBook'), bookLabel = $('gcBookLabel');
    // fine / mid / coarse: columns across the portrait, and across the screen when the camera has it
    const COLS = [30, 15, 8], STAGE_COLS = [96, 48, 24];
    const GAP = '#fff7cf';
    const FPS = 24;
    const stage = $('gcStage'), calendar = $('gcCanvas'), photo = shot.querySelector('img');
    const grab = document.createElement('canvas');
    const gctx = grab.getContext('2d', { willReadFrequently: true });
    const bctx = booth.getContext('2d'), sctx = stage.getContext('2d');
    let sel = -1, rgb = null, fresh = true;
    let stream = null, video = null, state = 'idle', raf = 0, lastDraw = 0;

    function sizeTo(cv, w, h) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.max(1, Math.round(w * dpr));
        cv.height = Math.max(1, Math.round(h * dpr));
    }
    // layout size, not the transformed rect: measured mid-reveal the bitmap would get the wrong shape
    function sizeBooth() {
        sizeTo(booth, shot.clientWidth, shot.clientHeight);
        sizeTo(stage, innerWidth, innerHeight);
    }

    // src cover-cropped to cols x rows, averaged per cell; every column is a stack of meetings, a run of near colours
    // one rounded block in their mean colour, with the calendar's cream gaps
    // oy matches the img's object-position, so the grid sits exactly over the photo's own framing
    function paintGrid(cx, W, H, src, sw, sh, cols, mirror, oy = 0.5) {
        const rows = Math.max(1, Math.round(cols * (H / W))), n = cols * rows;
        if (grab.width !== cols || grab.height !== rows) { grab.width = cols; grab.height = rows; rgb = null; }
        if (!rgb || rgb.length !== n * 3) { rgb = new Float32Array(n * 3); fresh = true; }
        let cw = sw, ch = sw * H / W;
        if (ch > sh) { ch = sh; cw = sh * W / H; }
        gctx.setTransform(1, 0, 0, 1, 0, 0);
        gctx.clearRect(0, 0, cols, rows);
        gctx.imageSmoothingQuality = 'high';
        gctx.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? cols : 0, 0);
        gctx.drawImage(src, (sw - cw) / 2, (sh - ch) * oy, cw, ch, 0, 0, cols, rows);
        const px = gctx.getImageData(0, 0, cols, rows).data, k = fresh ? 1 : 0.5;
        for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) rgb[i * 3 + j] += (px[i * 4 + j] - rgb[i * 3 + j]) * k;
        fresh = false;
        const cwp = W / cols, chp = H / rows, gap = Math.max(1, Math.round(cwp * 0.12)), rad = Math.min(4, cwp * 0.22);
        cx.fillStyle = GAP;
        cx.fillRect(0, 0, W, H);
        for (let c = 0; c < cols; c++) {
            const x0 = Math.round(c * cwp) + (gap >> 1), x1 = Math.round((c + 1) * cwp) - (gap - (gap >> 1));
            let r = 0;
            while (r < rows) {
                const a = (r * cols + c) * 3;
                let e = r + 1, R = rgb[a], G = rgb[a + 1], B = rgb[a + 2];
                while (e < rows && e - r < 6) {
                    const b = (e * cols + c) * 3;
                    if (Math.abs(rgb[b] - rgb[a]) + Math.abs(rgb[b + 1] - rgb[a + 1]) + Math.abs(rgb[b + 2] - rgb[a + 2]) > 36) break;
                    R += rgb[b]; G += rgb[b + 1]; B += rgb[b + 2];
                    e++;
                }
                const m = e - r, y0 = Math.round(r * chp) + (gap >> 1), y1 = Math.round(e * chp) - (gap - (gap >> 1));
                cx.fillStyle = `rgb(${(R / m) | 0},${(G / m) | 0},${(B / m) | 0})`;
                cx.beginPath();
                if (cx.roundRect) cx.roundRect(x0, y0, x1 - x0, y1 - y0, rad); else cx.rect(x0, y0, x1 - x0, y1 - y0);
                cx.fill();
                r = e;
            }
        }
    }

    // With srcset, naturalWidth is density-corrected (the 480w file at 214px reads as 214 wide) while drawImage crops
    // in file pixels, so the grid reads from a plain copy of the chosen file whose natural size is its real size
    let pic = null;
    function paintPhoto() {
        if (sel < 0 || state === 'live') return;
        if (!photo.complete || !photo.naturalWidth) { photo.addEventListener('load', paintPhoto, { once: true }); return; }
        if (!pic || pic.src !== photo.currentSrc) {
            pic = new Image();
            pic.src = photo.currentSrc || photo.src;
        }
        if (!pic.complete || !pic.naturalWidth) { pic.addEventListener('load', paintPhoto, { once: true }); return; }
        sizeBooth();
        fresh = true;
        paintGrid(bctx, booth.width, booth.height, pic, pic.naturalWidth, pic.naturalHeight, COLS[sel], false, 0.3);
        shot.classList.add('is-on');
    }

    // the checked option again clears the grid back to the photo; the camera always needs one
    function setGrid(i) {
        if (i === sel) { if (state === 'live') return; i = -1; }
        sel = i;
        fresh = true;
        for (const b of document.querySelectorAll('[data-cell]')) b.setAttribute('aria-checked', String(+b.dataset.cell === i));
        if (sel < 0) shot.classList.remove('is-on');
        else paintPhoto();
    }
    for (const b of document.querySelectorAll('[data-cell]')) b.addEventListener('click', () => setGrid(+b.dataset.cell));

    // the dance, cover-cropped from the calendar canvas into the portrait
    function paintDance() {
        const W = booth.width, H = booth.height, cw0 = calendar.width, ch0 = calendar.height;
        if (!cw0 || !ch0) return;
        let sw = cw0, sh = cw0 * H / W;
        if (sh > ch0) { sh = ch0; sw = ch0 * W / H; }
        bctx.drawImage(calendar, (cw0 - sw) / 2, (ch0 - sh) / 2, sw, sh, 0, 0, W, H);
    }

    function loop(now) {
        raf = 0;
        if (state !== 'live') return;
        if (now - lastDraw >= 1000 / FPS - 2 && video && video.readyState >= 2 && video.videoWidth) {
            paintGrid(sctx, stage.width, stage.height, video, video.videoWidth, video.videoHeight, STAGE_COLS[sel], true);
            lastDraw = now;
        }
        paintDance();
        raf = requestAnimationFrame(loop);
    }

    function stopTracks() {
        if (stream) for (const t of stream.getTracks()) t.stop();
        stream = null;
        if (video) { video.pause(); video.srcObject = null; video = null; }
    }

    const LABELS = { idle: 'Use camera', waking: 'Waking camera', live: 'Stop camera' };
    function setState(s) {
        state = s;
        panel.dataset.booth = s;
        root.classList.toggle('is-live', s === 'live');
        book.disabled = s === 'waking';
        bookLabel.textContent = LABELS[s];
    }

    async function start() {
        if (state !== 'idle') return;
        camMode(true);
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('No camera here.'); return; }
        setState('waking');
        say('Nothing leaves this device.');
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
            video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.srcObject = stream;
            await video.play();
            if (!video.videoWidth) await new Promise((r) => video.addEventListener('loadeddata', r, { once: true }));
            if (document.hidden || !cam) throw Object.assign(new Error('hidden'), { name: 'AbortError' });
        } catch (e) {
            stopTracks();
            setState('idle');
            camMode(false);
            const n = e && e.name;
            say(n === 'AbortError' ? ''
                : n === 'NotAllowedError' || n === 'SecurityError' ? 'Camera blocked. Allow it to join.'
                    : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No camera found.'
                        : n === 'NotReadableError' ? 'The camera is busy in another app.' : 'Camera unavailable.');
            return;
        }
        if (sel < 0) setGrid(1);
        fresh = true;
        sizeBooth();
        shot.classList.add('is-on');
        setState('live');
        if (!raf) raf = requestAnimationFrame(loop);
    }

    function stop(msg) {
        stopTracks();
        cancelAnimationFrame(raf);
        raf = 0;
        setState('idle');
        say(msg);
        camMode(false);
        if (sel >= 0) paintPhoto(); else shot.classList.remove('is-on');
    }

    book.addEventListener('click', () => (state === 'idle' ? start() : state === 'live' ? stop('') : null));
    document.addEventListener('visibilitychange', () => { if (document.hidden && state !== 'idle') stop(''); });
    window.addEventListener('pagehide', () => { if (state !== 'idle') stop(''); });
    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || document.querySelector('.ap-nav.is-open')) return;
        if (briefOpen) brief(false);
        else if (state !== 'idle') stop('');
    });
    window.addEventListener('resize', () => { if (state === 'live') sizeBooth(); else paintPhoto(); });
    setState('idle');

    window.__invite = {
        get state() { return state; },
        get liveTracks() { return stream ? stream.getTracks().filter((t) => t.readyState === 'live').length : 0; },
        start, stop, brief, enter,
    };
})();
