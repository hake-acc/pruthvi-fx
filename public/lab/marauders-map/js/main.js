import { MAP, VISITOR_LINES, ROR_LINES, AREAS } from './plan.js';
import { buildInkMap, inkArrival, wallStrokes } from './inkmap.js';
import { bakePaper } from './paper.js';
import { createStage, PW, PH } from './scene.js';
import { createOverlay } from './overlay.js';
import { bannerSprite, remarkSprite, promptSprite, createLiveText, stairSprite, rorSprite, willowSprite } from './sprites.js';
import { createCast } from './characters.js';
import { createAudio } from './audio.js';

const $ = (s) => document.querySelector(s);
const clock = () => performance.now() / 1000;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const coarse = matchMedia('(pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function detectQuality() {
    const forced = new URLSearchParams(location.search).get('q');
    const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 8;
    let tier = 2;
    if (coarse || cores <= 4 || mem <= 4) tier = 1;
    if (coarse && (cores <= 4 || mem <= 3)) tier = 0;
    if (forced !== null) tier = Math.max(0, Math.min(2, +forced));
    return [
        { tier: 0, dpr: 1.25, ink: 0.42, overlay: 2048, paper: 1536, taps: 4 },
        { tier: 1, dpr: 1.5, ink: 0.56, overlay: 3072, paper: 2048, taps: 6 },
        { tier: 2, dpr: 2, ink: 0.72, overlay: 4096, paper: 2560, taps: 8 },
    ][tier];
}

function normalize(s) { return s.toLowerCase().replace(/[\u2019']/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function lev(a, b) {
    const m = a.length, n = b.length, d = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        let prev = d[0]; d[0] = i;
        for (let j = 1; j <= n; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
    }
    return d[n];
}
const OATH = 'i solemnly swear that i am up to no good';
function isOath(s) {
    const n = normalize(s);
    if (n.length < 14) return false;
    if (/sol\w*m\w* swea?r/.test(n) && /no good|nogood/.test(n)) return true;
    if (/swea?r\w*.*up to no good/.test(n)) return true;
    return 1 - lev(n, OATH) / Math.max(n.length, OATH.length) >= 0.78;
}
function isManaged(s) {
    const n = normalize(s);
    if (/mis\w*ch\w* man\w*g/.test(n) || n.includes('mischief managed')) return true;
    return n.length >= 12 && 1 - lev(n, 'mischief managed') / Math.max(n.length, 16) >= 0.74;
}

async function loadFonts() {
    const fams = ['400 40px "MM Fell"', 'italic 400 40px "MM Fell"', '400 40px "MM Fell SC"', '400 40px "MM Pinyon"'];
    try { await Promise.race([Promise.all(fams.map((f) => document.fonts.load(f, 'Aa'))), new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* fall back to Georgia */ }
}

async function boot() {
    const canvas = $('#mmGL');
    const ui = { hint: $('#mmHint'), areas: $('#mmAreas'), manage: $('#mmManage'), sound: $('#mmSound'), input: $('#mmSpell'), live: $('#mmLive'), cursor: $('.site-cursor-dot'), label: $('.js-cursor-label'), root: document.documentElement };
    if (!window.THREE) { document.body.classList.add('mm-nogl'); return; }
    const quality = detectQuality();
    await loadFonts();

    let stage;
    try { stage = createStage(canvas, quality); } catch (e) { document.body.classList.add('mm-nogl'); console.error(e); return; }
    const { THREE, renderer, shared, view } = stage;
    stage.resize();
    stage.snap(false);
    stage.fold.lift = 1.4;

    shared.tPaper.value = bakePaper(renderer, quality.paper).texture;
    const overlay = createOverlay(renderer, quality);
    shared.tOver.value = overlay.rt.texture;
    const inkCanvas = document.createElement('canvas');
    inkCanvas.width = inkCanvas.height = 4;
    const inkTex = new THREE.CanvasTexture(inkCanvas);
    inkTex.premultiplyAlpha = true; inkTex.generateMipmaps = false;
    inkTex.minFilter = THREE.LinearFilter; inkTex.magFilter = THREE.LinearFilter;
    shared.tInk.value = inkTex;
    wallStrokes();

    const audio = createAudio();
    const st = {
        mode: 'closed', bootAt: clock(), oathAt: 0, inkDur: 10, wand: [400, 1000], seed: 7,
        name: localStorage.getItem('mm-name') || '', naming: false, cursor: null, pointer: null, pointerType: 'mouse',
        zoom: coarse ? 1 : 1.5, userMoved: false, hover: null, cool: {}, quillUntil: 0, managedAt: 0,
        timeline: [], remarks: [], vel: [0, 0], dragging: false,
    };
    const later = (at, fn) => st.timeline.push({ at, fn });
    const sayLive = (s) => { ui.live.textContent = s; };

    // ------------------------------------------------------------------ sprites
    const COVER = [400, 840];
    const promptSrc = () => promptSprite([
        { s: 'Here lies a parchment', f: 'script', z: 74, y: 96 },
        { s: 'of no consequence', f: 'script', z: 74, y: 176 },
        { s: 'whatsoever.', f: 'script', z: 74, y: 256 },
        { s: 'Unless, of course, you solemnly', f: 'italic', z: 40, y: 352, gap: 0.04 },
        { s: 'swear that you are up to no good.', f: 'italic', z: 40, y: 402 },
        { rule: 300, y: 560 },
        { s: coarse ? 'tap the line to write \u00b7 or tap thrice' : 'type the words \u00b7 or tap thy wand thrice', f: 'italic', z: 25, y: 612 },
    ], 3, { width: 740, height: 660, delay: 0.5 });
    let prompt = new overlay.InkSprite(promptSrc(), { order: 7, knock: 0 });
    prompt.place(COVER[0], COVER[1]);
    const LINE_Y = COVER[1] - 330 + 560;

    const liveOath = createLiveText(740, 110, { z: 42 });
    const oathSprite = new overlay.InkSprite(liveOath.draw('', clock()), { order: 8, knock: 0 });
    oathSprite.place(COVER[0], LINE_Y - 40);

    const world = createCast(overlay);
    world.walkers.forEach((w, i) => {
        w.banner = new overlay.InkSprite(bannerSprite(w.def.name, i + 11), { order: 6 });
        w.activeAt = Infinity;
    });

    const stairs = [
        { p: [1850, 705], a: [0.32, 0.62, 0.05] },
        { p: [2110, 990], a: [Math.PI + 0.32, Math.PI + 0.62, Math.PI + 0.06] },
        { p: [2115, 700], a: [Math.PI - 0.35, Math.PI - 0.7, Math.PI - 0.1] },
        { p: [1845, 985], a: [-0.35, -0.68, -0.08] },
    ].map((s, i) => {
        const sp = new overlay.InkSprite(stairSprite(i), { order: 4, anchorLeft: true });
        const o = { ...s, sp, idx: 0, from: s.a[0], to: s.a[0], t0: 0, cur: s.a[0] };
        sp.place(s.p[0], s.p[1], s.a[0]);
        return o;
    });
    let stairNext = 0;
    const ror = new overlay.InkSprite(rorSprite(), { order: 4 });
    ror.place(2850, 178);
    const rorState = { open: false, next: Infinity };
    const willow = new overlay.InkSprite(willowSprite(), { order: 4, knock: 0 });
    willow.place(4300, 700);
    const willowState = { thrash: 0, next: Infinity };

    // ------------------------------------------------------------------ visitor
    const visitor = { banner: null, last: null, acc: 0, heading: 0, foot: 0, pos: null, target: null, bannerPos: [0, 0] };
    function makeVisitor(name, now) {
        if (visitor.banner) visitor.banner.dissolve(now, 0.6);
        visitor.banner = new overlay.InkSprite(bannerSprite(name.toUpperCase(), 99), { order: 6 });
        const c = st.cursor || mapAtView(0, 0.1);
        visitor.pos = [c.x, c.y]; visitor.last = { x: c.x, y: c.y };
        visitor.bannerPos = [c.x, c.y - 48];
        visitor.banner.place(visitor.bannerPos[0], visitor.bannerPos[1]);
        visitor.banner.start(now);
        document.body.classList.add('is-named');
    }

    // ------------------------------------------------------------------ remarks
    function remark(text, x, y, now, opts = {}) {
        const src = remarkSprite(text, st.seed++, opts);
        const sp = new overlay.InkSprite(src, { order: 9 });
        let px = x + src.w * 0.5 + 18, py = y - src.h * 0.5 - 46;
        if (px + src.w / 2 > MAP.W - 40) px = x - src.w * 0.5 - 18;
        px = Math.max(src.w / 2 + 40, Math.min(MAP.W - src.w / 2 - 40, px));
        py = Math.max(src.h / 2 + 40, Math.min(MAP.H - src.h / 2 - 40, py));
        sp.place(px, py, (Math.random() - 0.5) * 0.03);
        sp.start(now);
        st.remarks.push({ sp, until: now + src.duration + (opts.hold ?? 5.5) });
        const live = st.remarks.filter((r) => r.sp.dissolveAt == null);
        if (live.length > 3) live[0].sp.dissolve(now);
        st.quillUntil = Math.max(st.quillUntil, now + src.duration);
        sayLive(text);
        return sp;
    }

    // ------------------------------------------------------------------ view helpers
    const aspect = () => canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const closedH = () => Math.max(PH / 0.84, (PW / 0.82) / aspect());
    const openH = () => {
        const fit = aspect() < 0.8 ? PH / 0.96 : PH / 0.9;
        return fit / st.zoom;
    };
    function mapAtView(fx, fy) {
        const x = (view.tx + fx * view.th * aspect()) * 1000;
        const y = (PH / 2 - (view.ty + fy * view.th)) * 1000;
        return { x: Math.max(60, Math.min(MAP.W - 60, x)), y: Math.max(60, Math.min(MAP.H - 60, y)) };
    }
    function clampView(box) {
        const vh = view.th, vw = vh * aspect(), m = 0.06;
        const minX = box.minX + vw / 2 - m, maxX = box.maxX - vw / 2 + m;
        view.tx = minX > maxX ? (box.minX + box.maxX) / 2 : Math.max(minX, Math.min(maxX, view.tx));
        const minY = box.minY + vh / 2 - m * 0.6, maxY = box.maxY - vh / 2 + m * 0.6;
        view.ty = minY > maxY ? (box.minY + box.maxY) / 2 : Math.max(minY, Math.min(maxY, view.ty));
    }
    function goArea(x) { st.userMoved = true; view.tx = x / 1000; }

    // ------------------------------------------------------------------ the oath
    function swear(wx, wy) {
        if (st.mode !== 'closed') return;
        audio.ensure();
        st.mode = 'swearing';
        st.wand = [wx, wy];
        const res = buildInkMap(inkCanvas, quality.ink, wx, wy, st.seed++);
        inkTex.image = inkCanvas; inkTex.needsUpdate = true;
        shared.uHasInk.value = 1; shared.uWipe.value = 0; shared.uWand.value.set(wx, wy);
        const now = clock();
        st.oathAt = now + 0.05; st.inkDur = res.duration; st.userMoved = false; st.naming = false;
        prompt.dissolve(now, 0.9); oathSprite.dissolve(now, 0.9);
        ui.input.value = ''; if (coarse) ui.input.blur();
        document.body.classList.add('is-sworn');
        sayLive('The map reveals itself.');
        audio.scratch(1.4);

        later(st.oathAt + 1.25, (t) => { stage.setOpen(true, t); audio.rustle(2.4, 1); });
        later(st.oathAt + 3.4, () => { st.mode = 'open'; });
        later(st.oathAt + 6.4, () => document.body.classList.add('is-open'));
        later(st.oathAt + 7.6, (t) => askName(t));
        world.walkers.forEach((w) => {
            w.activeAt = st.oathAt + inkArrival(w.pos[0], w.pos[1], wx, wy) + 1.3 + Math.random() * 0.6;
            if (w.def.ghost) { w.visible = false; w.ghostTimer = 10 + Math.random() * 8; }
        });
        stairs.forEach((s) => { s.revealAt = st.oathAt + inkArrival(s.p[0], s.p[1], wx, wy) + 0.4; });
        rorState.next = st.oathAt + inkArrival(2850, 178, wx, wy) + 3;
        willowState.revealAt = st.oathAt + inkArrival(4300, 700, wx, wy) + 0.2;
        willowState.next = willowState.revealAt + 5;
    }

    function askName(now) {
        if (st.mode !== 'open' && st.mode !== 'swearing') return;
        const at = mapAtView(-0.08, 0.06);
        at.x = Math.max(MAP.PW + 440, Math.min(MAP.W - 440, at.x));
        if (st.name) {
            makeVisitor(st.name, now);
            remark(`Welcome back, ${st.name}. Mr Prongs had a feeling you would return, and Mr Padfoot owes him a Galleon.`, at.x - 180, at.y + 60, now);
            return;
        }
        st.naming = true;
        st.namePrompt = new overlay.InkSprite(promptSprite([
            { s: 'Who goes there?', f: 'script', z: 72, y: 84 },
            { s: 'Messrs Moony, Wormtail, Padfoot & Prongs', f: 'italic', z: 32, y: 142, gap: 0.02 },
            { s: 'request the name of the bearer of this map.', f: 'italic', z: 32, y: 184 },
            { rule: 280, y: 296 },
            { s: coarse ? 'tap here to sign' : 'write it, then press enter', f: 'italic', z: 22, y: 336 },
        ], 21, { width: 820, height: 370, delay: 0.1, halo: true }), { order: 8, knock: 1 });
        st.namePrompt.place(at.x, at.y);
        st.namePrompt.start(now);
        if (innerWidth < 760) goArea(at.x);
        st.nameAt = at;
        st.liveName = createLiveText(760, 100, { z: 46 });
        st.nameSprite = new overlay.InkSprite(st.liveName.draw('', now), { order: 9, knock: 0 });
        st.nameSprite.place(at.x, at.y - 185 + 296 - 36);
        ui.input.value = '';
        if (!coarse) ui.input.focus({ preventScroll: true });
        sayLive('Who goes there? Type your name and press enter.');
    }

    function setName(raw, now) {
        const name = raw.trim().replace(/\s+/g, ' ').slice(0, 26) || 'A Mischief-Maker';
        st.name = name; st.naming = false;
        localStorage.setItem('mm-name', name);
        st.namePrompt && st.namePrompt.dissolve(now, 1);
        st.nameSprite && st.nameSprite.dissolve(now, 1);
        ui.input.value = ''; if (coarse) ui.input.blur();
        makeVisitor(name, now);
        const line = VISITOR_LINES[0].replace('{name}', name);
        remark(line, st.nameAt.x - 160, st.nameAt.y + 40, now);
    }

    function manage() {
        if (st.mode !== 'open') return;
        const now = clock();
        st.mode = 'managing'; st.managedAt = now;
        audio.ensure(); audio.hiss(2.8); audio.scratch(1);
        const c = st.cursor || mapAtView(0, 0);
        shared.uWand.value.set(c.x, c.y);
        [prompt, oathSprite, ror, willow, ...stairs.map((s) => s.sp), ...world.walkers.map((w) => w.banner)].forEach((s) => s.born != null && s.dissolve(now + Math.random() * 0.5, 1.4));
        if (visitor.banner) visitor.banner.dissolve(now + 0.3, 1.4);
        st.remarks.forEach((r) => r.sp.dissolve(now, 1));
        if (st.namePrompt) { st.namePrompt.dissolve(now, 1); st.nameSprite.dissolve(now, 1); }
        if (st.spellSprite) st.spellSprite.dissolve(now, 0.8);
        st.naming = false; ui.input.value = ''; ui.input.blur();
        world.walkers.forEach((w) => { w.active = false; w.activeAt = Infinity; });
        world.rorOpen = false; rorState.open = false; rorState.next = Infinity;
        document.body.classList.remove('is-open', 'is-named');
        sayLive('Mischief managed.');
        later(now + 2.3, (t) => { stage.setOpen(false, t); audio.rustle(2.2, 0.9); st.userMoved = false; });
        later(now + 4.6, (t) => {
            shared.uHasInk.value = 0; shared.uInkT.value = -1; shared.uWipe.value = 0;
            overlay.clearPrints();
            st.mode = 'closed';
            document.body.classList.remove('is-sworn');
            prompt.destroy();
            prompt = new overlay.InkSprite(promptSrc(), { order: 7, knock: 0 });
            prompt.place(COVER[0], COVER[1]);
            prompt.start(t + 0.6);
            liveOath.draw('', t); oathSprite.refresh(); oathSprite.start(t);
            oathSprite.born = liveOath.epoch;
            visitor.banner = null;
        });
    }

    function smudge(now) {
        oathSprite.dissolve(now, 0.9);
        remark('Mr Padfoot suggests you try that again, with rather more solemnity.', COVER[0] - 300, LINE_Y + 260, now, { hold: 3.5, width: 400 });
        later(now + 0.95, (t) => { ui.input.value = ''; liveOath.draw('', t); oathSprite.refresh(); oathSprite.start(t); oathSprite.born = liveOath.epoch; });
    }

    // ------------------------------------------------------------------ typing
    function onType(value) {
        const now = clock();
        audio.ensure(); audio.scratch(0.7);
        if (st.mode === 'closed') {
            if (oathSprite.dissolveAt != null) return;
            oathSprite.refresh(liveOath.draw(value, now));
            oathSprite.start(liveOath.epoch);
            if (isOath(value)) {
                const c = st.cursor && st.cursor.panel === 0 ? st.cursor : { x: COVER[0], y: 1000 };
                setTimeout(() => swear(c.x, c.y), 160);
            }
        } else if (st.naming && st.liveName) {
            st.nameSprite.refresh(st.liveName.draw(value, now));
            st.nameSprite.start(st.liveName.epoch);
        } else if (st.mode === 'open') {
            if (!st.spellSprite || st.spellSprite.dissolveAt != null) {
                st.liveSpell = createLiveText(900, 100, { z: 46 });
                st.spellSprite = new overlay.InkSprite(st.liveSpell.draw('', now), { order: 9, knock: 0 });
                const at = mapAtView(0, -0.36);
                st.spellSprite.place(at.x, at.y);
            }
            st.spellSprite.refresh(st.liveSpell.draw(value, now));
            st.spellSprite.start(st.liveSpell.epoch);
            st.spellUntil = now + 3.5;
            if (isManaged(value)) setTimeout(manage, 200);
        }
    }
    function onEnter() {
        const now = clock(), v = ui.input.value;
        if (st.mode === 'closed') { if (!isOath(v) && v.trim()) smudge(now); }
        else if (st.naming) { if (isManaged(v)) manage(); else setName(v, now); }
        else if (st.mode === 'open') {
            if (isManaged(v)) manage();
            else { st.spellSprite && st.spellSprite.dissolve(now, 0.8); ui.input.value = ''; }
        }
    }
    ui.input.addEventListener('input', () => onType(ui.input.value));
    document.addEventListener('keydown', (e) => {
        if (e.target === ui.input) {
            if (e.key === 'Enter') { e.preventDefault(); onEnter(); }
            else if (e.key === 'Escape') { ui.input.value = ''; onType(''); }
            return;
        }
        if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable], .ap-nav')) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const pan = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (pan && st.mode === 'open') { st.userMoved = true; view.tx += pan * view.h * 0.25; e.preventDefault(); return; }
        if (e.key.length === 1) {
            e.preventDefault();
            ui.input.focus({ preventScroll: true });
            ui.input.value += e.key;
            onType(ui.input.value);
        }
    });

    // ------------------------------------------------------------------ pointer
    const pointers = new Map();
    let down = null, taps = [], pinch = null, pendingPick = false, lastMoveAt = 0;
    canvas.addEventListener('pointerdown', (e) => {
        audio.ensure();
        canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        st.pointerType = e.pointerType;
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: st.zoom };
            down = null;
        } else {
            down = { x: e.clientX, y: e.clientY, t: clock(), moved: false, vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: clock() };
            st.vel = [0, 0];
        }
    });
    canvas.addEventListener('pointermove', (e) => {
        st.pointer = { x: e.clientX, y: e.clientY };
        st.pointerType = e.pointerType;
        pendingPick = true; lastMoveAt = clock();
        if (e.pointerType === 'mouse') {
            ui.cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            view.ptX = (e.clientX / innerWidth - 0.5) * (reduced ? 0 : 1);
            view.ptY = (e.clientY / innerHeight - 0.5) * (reduced ? 0 : 1);
        }
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pointers.size >= 2) {
            const [a, b] = [...pointers.values()];
            st.zoom = Math.max(0.8, Math.min(3, pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
            st.userMoved = true;
            return;
        }
        if (!down) return;
        const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
        if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down.moved = true; document.body.classList.add('is-dragging'); }
        if (down.moved && st.mode === 'open') {
            const k = stage.worldPerPx();
            view.tx -= dx * k; view.ty += dy * k;
            view.x -= dx * k * 0.6; view.y += dy * k * 0.6;
            const t = clock(), dtp = Math.max(0.008, t - down.lt);
            st.vel = [-dx * k / dtp, dy * k / dtp];
            st.userMoved = true;
        }
        down.lx = e.clientX; down.ly = e.clientY; down.lt = clock();
    });
    const endPointer = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        document.body.classList.remove('is-dragging');
        if (!down) return;
        const wasTap = !down.moved && clock() - down.t < 0.5;
        if (!down.moved || clock() - down.lt > 0.08) st.vel = [0, 0];
        down = null;
        if (wasTap) onTap(e.clientX, e.clientY);
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { st.cursor = null; ui.cursor.classList.add('is-away'); } });
    canvas.addEventListener('pointerenter', () => ui.cursor.classList.remove('is-away'));

    function onTap(x, y) {
        const hit = stage.pick(x, y);
        const now = clock();
        if (st.mode === 'closed') {
            if (!hit) return;
            taps = taps.filter((t) => now - t < 1.1); taps.push(now);
            audio.scratch(0.5);
            if (taps.length >= 3) { taps = []; swear(hit.x, hit.y); return; }
            if (coarse && Math.abs(hit.y - LINE_Y) < 120) ui.input.focus();
            return;
        }
        if (st.mode !== 'open' || !hit) return;
        if (st.naming && st.nameAt && Math.hypot(hit.x - st.nameAt.x, hit.y - st.nameAt.y) < 260) { ui.input.focus(); return; }
        const who = hoverAt(hit);
        if (who) { trigger(who, now, true); return; }
        if (st.pointerType !== 'mouse' && visitor.banner) visitor.target = [hit.x, hit.y];
    }

    canvas.addEventListener('wheel', (e) => {
        if (st.mode !== 'open') return;
        e.preventDefault();
        const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
        if (e.ctrlKey) {
            st.zoom = Math.max(0.8, Math.min(3, st.zoom * Math.exp(-e.deltaY * scale * 0.004)));
        } else {
            const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * scale;
            view.tx += d * stage.worldPerPx() * 1.1;
            if (e.shiftKey) { view.tx -= d * stage.worldPerPx() * 1.1; view.ty -= d * stage.worldPerPx(); }
        }
        st.userMoved = true;
    }, { passive: false });

    // ------------------------------------------------------------------ hover
    function hoverAt(c) {
        if (!c) return null;
        for (const w of world.walkers) {
            if (!w.active || !w.visible) continue;
            const b = w.banner;
            if (Math.hypot(c.x - w.pos[0], c.y - w.pos[1]) < 30) return w;
            if (Math.abs(c.x - w.bannerPos[0]) < b.w / 2 && Math.abs(c.y - w.bannerPos[1]) < b.h / 2) return w;
        }
        if (visitor.banner && visitor.banner.dissolveAt == null && st.pointerType !== 'mouse') {
            if (Math.abs(c.x - visitor.bannerPos[0]) < visitor.banner.w / 2 && Math.abs(c.y - visitor.bannerPos[1]) < visitor.banner.h / 2) return 'visitor';
        }
        if (rorState.open && Math.abs(c.x - 2850) < 115 && Math.abs(c.y - 178) < 75) return 'ror';
        return null;
    }
    function trigger(who, now, force) {
        const id = typeof who === 'string' ? who : who.def.id;
        if (!force && now < (st.cool[id] || 0)) return;
        st.cool[id] = now + 9;
        let text, x, y;
        if (who === 'visitor') { text = VISITOR_LINES[1 + Math.floor(Math.random() * (VISITOR_LINES.length - 1))].replace('{name}', st.name); x = visitor.bannerPos[0]; y = visitor.bannerPos[1]; }
        else if (who === 'ror') { text = ROR_LINES[Math.floor(Math.random() * ROR_LINES.length)]; x = 2850; y = 178; }
        else {
            const lines = who.def.lines;
            who.lineIdx = ((who.lineIdx ?? Math.floor(Math.random() * lines.length)) + 1) % lines.length;
            text = lines[who.lineIdx]; x = who.pos[0]; y = who.pos[1];
        }
        remark(text, x, y, now, who.def && who.def.villain ? { z: 29 } : {});
        audio.scratch(1);
    }

    // ------------------------------------------------------------------ UI
    AREAS.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'mm-area'; b.textContent = a.label;
        b.addEventListener('click', () => goArea(a.x));
        ui.areas.appendChild(b);
    });
    ui.manage.addEventListener('click', () => manage());
    const syncSound = (m) => { ui.sound.setAttribute('aria-pressed', String(!m)); ui.sound.querySelector('span').textContent = m ? 'Sound off' : 'Sound on'; };
    syncSound(audio.muted);
    audio.onChange(syncSound);
    ui.sound.addEventListener('click', () => { audio.ensure(); audio.setMuted(!audio.muted); });
    document.querySelectorAll('.mm-tools button, .mm-area').forEach((el) => {
        el.addEventListener('pointerenter', () => ui.cursor.classList.add('is-ring'));
        el.addEventListener('pointerleave', () => ui.cursor.classList.remove('is-ring'));
    });
    addEventListener('resize', () => stage.resize());

    // ------------------------------------------------------------------ frame loop
    let camSpeed = 5.5;
    let last = clock(), frames = 0, acc = 0, dprNow = renderer.getPixelRatio(), slowFor = 0, fastFor = 0;
    prompt.start(st.bootAt + 0.9);
    oathSprite.start(liveOath.epoch);

    function frame() {
        const now = clock();
        const dt = Math.min(0.05, now - last); last = now;
        shared.uTime.value = now;
        shared.uExposure.value = Math.min(1, (now - st.bootAt) / 1.3);

        st.timeline = st.timeline.filter((ev) => { if (now >= ev.at) { ev.fn(now); return false; } return true; });

        const box = stage.updateFold(dt, now);

        // camera
        if (st.mode === 'managing' && now > st.managedAt + 2.1) {
            const wfit = (box.maxX - box.minX + 0.3) / aspect();
            view.th = Math.min(PH / 0.5, Math.max(closedH(), wfit, PH / 0.8));
            view.tx = (box.minX + box.maxX) / 2; view.ty = 0;
            camSpeed = 2.4;
        } else if (st.mode === 'closed') {
            view.th = closedH(); view.tx = PW / 2; view.ty = 0;
            if (now < st.managedAt + 7) camSpeed = 2;
        } else if (st.mode === 'swearing' && now < st.oathAt + 1.25) {
            view.th = closedH() * 1.02;
        } else if (st.mode !== 'managing' && !st.userMoved && now < st.oathAt + 6.4) {
            const wfit = (box.maxX - box.minX + 0.3) / aspect();
            view.th = Math.min(PH / 0.5, Math.max(closedH(), wfit, PH / 0.8));
            view.tx = (box.minX + box.maxX) / 2; view.ty = 0;
            camSpeed = 2.2;
        } else {
            if (now > st.oathAt + 6.4 && now < st.oathAt + 9) camSpeed = 1.6; else camSpeed = 5.5;
            view.th = openH();
            if (!st.userMoved) { view.tx = -1e3; view.ty = 0; }
            if (Math.hypot(st.vel[0], st.vel[1]) > 0.001 && !down) {
                view.tx += st.vel[0] * dt; view.ty += st.vel[1] * dt;
                const f = Math.exp(-dt * 4.5); st.vel[0] *= f; st.vel[1] *= f;
            }
            clampView(box);
        }
        stage.applyCamera(dt, camSpeed);
        camSpeed = 5.5;
        if (st.mode === 'open') {
            const mx = view.x * 1000;
            let best = 0;
            AREAS.forEach((a, i) => { if (Math.abs(a.x - mx) < Math.abs(AREAS[best].x - mx)) best = i; });
            if (best !== st.here) { st.here = best; [...ui.areas.children].forEach((b, i) => b.classList.toggle('is-here', i === best)); }
        }

        // ink clock
        if (st.mode === 'swearing' || st.mode === 'open' || st.mode === 'managing') shared.uInkT.value = now - st.oathAt;
        if (st.mode === 'managing') shared.uWipe.value = Math.min(1, ease(Math.min(1, (now - st.managedAt) / 2.4)));

        // pointer → map
        if (pendingPick && st.pointer) {
            pendingPick = false;
            st.cursor = stage.pick(st.pointer.x, st.pointer.y);
        }

        const open = st.mode === 'open' || st.mode === 'swearing';
        if (open) {
            world.walkers.forEach((w) => {
                if (!w.active && now >= w.activeAt) {
                    w.active = true;
                    if (!w.def.ghost) { w.banner.place(w.bannerPos[0], w.bannerPos[1]); w.banner.start(now); }
                }
                w.update(dt, now);
                if (w.active && w.visible) w.banner.place(w.bannerPos[0], w.bannerPos[1], Math.sin(now * 1.3 + w.phase) * 0.018);
            });
            stairs.forEach((s) => {
                if (s.sp.born == null && now >= (s.revealAt ?? Infinity)) s.sp.start(now);
                if (s.t0 && now >= s.t0) {
                    const u = Math.min(1, (now - s.t0) / 2.4);
                    s.cur = s.from + (s.to - s.from) * ease(u);
                    s.sp.place(s.p[0], s.p[1], s.cur);
                    if (u >= 1) s.t0 = 0;
                }
            });
            if (st.mode === 'open' && now > stairNext) {
                const s = stairs[Math.floor(Math.random() * stairs.length)];
                s.idx = (s.idx + 1 + Math.floor(Math.random() * (s.a.length - 1))) % s.a.length;
                s.from = s.cur; s.to = s.a[s.idx]; s.t0 = now;
                stairNext = now + 3.5 + Math.random() * 3;
            }
            if (now >= rorState.next) {
                rorState.open = !rorState.open;
                world.rorOpen = rorState.open;
                if (rorState.open) { ror.start(now); rorState.next = now + 13 + Math.random() * 5; }
                else { ror.dissolve(now, 1.8); rorState.next = now + 8 + Math.random() * 6; }
            }
            if (willow.born == null && now >= (willowState.revealAt ?? Infinity)) willow.start(now);
            if (now >= willowState.next) { willowState.thrash = now; willowState.next = now + 7 + Math.random() * 7; }
            const th = Math.max(0, 1 - (now - willowState.thrash) / 2.6);
            willow.place(4300, 700, Math.sin(now * 0.7) * 0.05 + Math.sin(now * 13) * 0.22 * th * th);
            willow.mesh.scale.set(willow.w * (1 + th * 0.06 * Math.sin(now * 9)), willow.h * (1 + th * 0.06 * Math.cos(now * 8)), 1);

            // visitor footprints
            if (visitor.banner && visitor.banner.dissolveAt == null) {
                let c = null;
                if (st.pointerType === 'mouse' && st.cursor && now - lastMoveAt < 4) c = st.cursor;
                else if (visitor.target && visitor.pos) {
                    const dx = visitor.target[0] - visitor.pos[0], dy = visitor.target[1] - visitor.pos[1], d = Math.hypot(dx, dy);
                    if (d > 2) { const s = Math.min(d, 120 * dt); visitor.pos[0] += dx / d * s; visitor.pos[1] += dy / d * s; }
                    c = { x: visitor.pos[0], y: visitor.pos[1] };
                }
                if (c) {
                    const dx = c.x - visitor.last.x, dy = c.y - visitor.last.y, d = Math.hypot(dx, dy);
                    if (d > 140) { visitor.last = { x: c.x, y: c.y }; visitor.acc = 0; }
                    else if (d > 0.4) {
                        const target = Math.atan2(dy, dx);
                        let dh = target - visitor.heading;
                        while (dh > Math.PI) dh -= Math.PI * 2;
                        while (dh < -Math.PI) dh += Math.PI * 2;
                        visitor.heading += dh * Math.min(1, 0.5 + d * 0.02);
                        visitor.acc += d; visitor.last = { x: c.x, y: c.y };
                        if (visitor.acc > 27) {
                            visitor.acc = 0;
                            const side = visitor.foot ? 1 : -1;
                            overlay.addPrint(c.x - Math.sin(visitor.heading) * 5.6 * side, c.y + Math.cos(visitor.heading) * 5.6 * side, visitor.heading, visitor.foot, now);
                            visitor.foot = 1 - visitor.foot;
                        }
                    }
                    const k = 1 - Math.exp(-dt * 5);
                    visitor.bannerPos[0] += (c.x - visitor.bannerPos[0]) * k;
                    visitor.bannerPos[1] += (c.y - 48 - visitor.bannerPos[1]) * k;
                    visitor.banner.place(visitor.bannerPos[0], visitor.bannerPos[1], Math.sin(now * 1.4) * 0.02);
                }
            }

            // hover remarks
            if (st.mode === 'open' && st.pointerType === 'mouse') {
                const who = hoverAt(st.cursor);
                if (who !== st.hover) { st.hover = who; if (who) trigger(who, now); }
                ui.cursor.classList.toggle('is-ring', !!who);
                ui.label.textContent = who ? (who === 'ror' ? '[ COME & GO ]' : who === 'visitor' ? '[ YOU ]' : '[ PSST ]') : '';
            }
        }
        if (st.spellSprite && st.spellUntil && now > st.spellUntil && st.spellSprite.dissolveAt == null && st.mode === 'open') { st.spellSprite.dissolve(now, 0.8); ui.input.value = ''; }

        // sprite clocks
        [prompt, oathSprite, ror, willow, ...stairs.map((s) => s.sp), ...world.walkers.map((w) => w.banner)].forEach((s) => s.tick(now));
        if (visitor.banner) visitor.banner.tick(now);
        if (st.namePrompt) { st.namePrompt.tick(now); st.nameSprite.tick(now); }
        if (st.spellSprite) st.spellSprite.tick(now);
        st.remarks = st.remarks.filter((r) => {
            if (now > r.until) r.sp.dissolve(now, 1.2);
            if (!r.sp.tick(now)) { r.sp.destroy(); return false; }
            return true;
        });

        const overlayAlpha = st.mode === 'managing' ? Math.max(0, 1 - (now - st.managedAt) / 1.6) : 1;
        overlay.render(now, overlayAlpha);
        renderer.render(stage.scene, stage.camera);

        // sound: the quill follows the ink front and any remark being written
        let q = 0;
        if (st.mode !== 'closed' && st.mode !== 'managing') { const t = now - st.oathAt; if (t > 0.3 && t < st.inkDur) q = 0.55 + 0.45 * (1 - t / st.inkDur); }
        if (now < st.quillUntil) q = Math.max(q, 0.45);
        if (st.mode === 'closed' && prompt.born != null && now - prompt.born < prompt.duration && now > prompt.born) q = Math.max(q, 0.35);
        audio.quill(q);

        // adaptive resolution
        frames++; acc += dt;
        if (acc > 1) {
            const avg = acc / frames;
            if (avg > 1 / 38) { slowFor++; fastFor = 0; } else if (avg < 1 / 57) { fastFor++; slowFor = 0; } else { slowFor = fastFor = 0; }
            if (slowFor >= 2 && dprNow > 0.75) { dprNow = Math.max(0.75, dprNow - 0.25); renderer.setPixelRatio(dprNow); stage.resize(); slowFor = 0; }
            if (fastFor >= 5 && dprNow < Math.min(devicePixelRatio || 1, quality.dpr)) { dprNow = Math.min(quality.dpr, dprNow + 0.25); renderer.setPixelRatio(dprNow); stage.resize(); fastFor = 0; }
            frames = 0; acc = 0;
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.body.classList.add('is-ready');

    // hooks for render scripts
    window.__mm = {
        swear: (x = 400, y = 1000) => swear(x, y), manage, state: () => st.mode, quality,
        name: (n) => setName(n, clock()),
        pan: (x) => goArea(x), zoom: (z) => { st.zoom = z; st.userMoved = true; },
        hover: (x, y) => { st.pointerType = 'mouse'; st.cursor = { x, y, panel: Math.floor(x / MAP.PW) }; lastMoveAt = clock(); },
        say: (who) => { const w = world.walkers.find((k) => k.def.id === who); if (w) { w.active = true; w.visible = true; trigger(w, clock(), true); return w.pos; } return null; },
        walkers: () => world.walkers.map((w) => ({ id: w.def.id, x: w.pos[0], y: w.pos[1], active: w.active, visible: w.visible })),
        type: (s) => { ui.input.value = s; onType(s); },
        enter: () => onEnter(),
    };
}

boot();
