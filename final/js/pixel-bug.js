// GLITCH: top-down pixel beetle that wanders the whole viewport, grooms, flies, visits the cursor and narrates each section.
// Self-mounting once the intro has handed over (body.is-loaded). Boop (click), drag and drop (it lands on its back), or let it nap.
(function () {
    'use strict';
    if (window.__pixelBug) return;
    window.__pixelBug = true;
    try {
        if (window.frameElement && window.frameElement.hasAttribute('data-no-bug')) return;
    } catch (e) { /* cross-origin parent */ }

    const doc = document;
    const S = 2;                      // CSS px per sprite pixel
    const GW = 24, GH = 30;           // sprite grid, drawn facing up
    const BOX = 32;                   // square hit box in sprite px, centred on the bug
    const FXW = 40, FXH = 56;         // particle canvas, reaches above the box for hearts / Zs
    const PAL = { k: '#121316', w: '#f4f2ea', s: '#b9b5a8', y: '#FFED29', t: '#ff7a8a', d: '#57585f', o: '#7d6d1c', g: 'rgba(150, 160, 172, 0.55)' };
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Left half of the shell, head and pronotum; the right half is its mirror. The outline pass adds the ink edge.
    const BODY = [
        '............',
        '............',
        '............',
        '............',
        '.........www',
        '........wwww',
        '........wkkw',
        '........wkkw',
        '........wwww',
        '.........www',
        '.......sssss',
        '......ssssss',
        '......ssssss',
        '......kkkkkk',
        '......yyyyyk',
        '.....yyyyyyk',
        '.....yyyyyyk',
        '.....yykkyyk',
        '.....yykkyyk',
        '.....yyyyyyk',
        '.....yyyyyyk',
        '.....ykkyyyk',
        '.....ykkyyyk',
        '......yyyyyk',
        '.......yyyyk',
        '.........yyk',
    ];
    // Wing membranes behind the split shell, two buzz frames
    const WING = {
        1: { y: 11, rows: ['.....ggg', '...ggggg', '..gggggg', '.ggggggg', '.ggggggg', 'gggggggg', 'gggggggg', 'gggggggg',
            '.ggggggg', '.ggggggg', '..gggggg', '..gggggg', '...ggggg', '...ggggg', '....gggg', '.....ggg'] },
        2: { y: 13, rows: ['....gggg', '...ggggg', '..gggggg', '..gggggg', '..gggggg', '..gggggg', '...ggggg', '...ggggg',
            '...ggggg', '....gggg', '....gggg', '.....ggg'] },
    };
    // Left legs as pixel runs from the body outward
    const LEG = {
        front: {
            fwd: [[5, 11], [4, 11], [3, 10], [2, 9], [2, 8]],
            mid: [[5, 11], [4, 11], [3, 11], [2, 10], [1, 10]],
            back: [[5, 12], [4, 12], [3, 12], [2, 13], [1, 13]],
            tuck: [[5, 11], [4, 11]],
            groom: [[5, 11], [4, 10], [4, 9], [5, 8], [6, 7]],
        },
        mid: {
            fwd: [[4, 17], [3, 16], [2, 16], [1, 15]],
            mid: [[4, 17], [3, 17], [2, 17], [1, 17]],
            back: [[4, 18], [3, 19], [2, 19], [1, 19]],
            tuck: [[4, 17], [3, 17]],
        },
        rear: {
            fwd: [[4, 22], [3, 22], [2, 21], [1, 21]],
            mid: [[4, 22], [3, 23], [2, 24], [1, 25]],
            back: [[4, 23], [3, 24], [2, 25], [2, 26]],
            tuck: [[4, 22], [3, 23]],
        },
    };
    const ANT = {
        out: [[9, 3], [8, 2], [7, 1], [6, 1]],
        up: [[10, 3], [10, 2], [9, 1]],
        wide: [[9, 3], [8, 3], [7, 2], [6, 2], [5, 1]],
        down: [[9, 3], [8, 3], [7, 3], [6, 4]],
    };
    // SPARK: slim firefly, graphite wing cases, pink-flecked shield and a lantern tail (L) that flashes
    const FIREFLY = [
        '............', '............', '............', '............',
        '..........ww', '.........www', '.........kww', '.........kww', '..........ww',
        '........ssss', '........sstt', '........sstt', '........ssss', '........kkkk',
        '........dddk', '.......ddddk', '.......ddddk', '.......ddddk', '.......ddddk', '.......ddddk', '.......ddddk', '........dddk',
        '........LLLL', '........LLLL', '.........LLL', '..........LL',
    ];
    // PINCH: stag beetle, broad graphite shell with a signature-yellow rim and bone mandibles
    const STAG = [
        '............', '............', '............', '............',
        '.........sss', '.......sssss', '......skssss', '......ssssss', '.......sssss', '........ssss',
        '......dddddd', '.....ddddddd', '.....ddddddd', '......kkkkkk',
        '......yddddk', '.....ydddddk', '.....ydddddk', '.....ydddddk', '.....ydddddk', '.....ydddddk',
        '.....ydddddk', '.....ydddddk', '.....ydddddk', '......yddddk', '.......ydddk', '.........yyk',
    ];
    const MANDIBLE = [[9, 3], [10, 3], [8, 2], [8, 1], [9, 1], [10, 2]];
    // DUST: moth, fuzzy segmented body under dithered wings (D) with a yellow eye-spot
    const MOTH = [
        '............', '............', '............', '............',
        '..........ww', '.........www', '.........kww', '..........ww', '.........www', '.........www',
        '.........www', '.........www', '..........ww', '..........ss', '..........ww', '..........ss',
        '..........ww', '..........ss', '..........ww', '..........ss', '..........ww', '...........w',
    ];
    const MOTH_WING = { y: 7, rows: [
        '........DD', '......DDDD', '....DDDDDD', '..DDDDDDDD', '.DDDDyyDDD', '.DDDykkyDD', '.DDDDyyDDD', '..DDDDDDDD',
        '...DDDDDDD', '....DDDDDD', '...DDDDDDD', '..DDDDDDDD', '..DDDDDDDD', '...DDDDDDD', '....DDDDDD', '......DDDD', '........DD',
    ] };
    const SKINS = {
        beetle: { name: 'GLITCH', body: BODY, ant: ANT, legDx: 0, wings: 'membrane',
            welcome: 'hi. i\'m glitch. every good site ships with one bug. i\'m it.', scroll: 'scroll-jacked.',
            click: ['click. clack. i\'m a click beetle now.', 'that\'s not a bug report. that\'s a summons.'] },
        firefly: { name: 'SPARK', body: FIREFLY, legDx: 3, wings: 'membrane', lantern: true,
            ant: { out: [[10, 3], [9, 2], [8, 1], [7, 1]], up: [[11, 3], [11, 2], [10, 1]], wide: [[10, 3], [9, 3], [8, 2], [7, 2], [6, 1]], down: [[10, 3], [9, 3], [8, 4], [7, 5]] },
            welcome: 'hi. i\'m spark. i light up when you find the good stuff.', scroll: 'my light can\'t keep up with you.',
            click: ['flash. saw that.', 'lighting the way.'] },
        stag: { name: 'PINCH', body: STAG, legDx: 0, wings: 'membrane', extra: MANDIBLE,
            ant: { out: [[6, 5], [5, 4], [4, 4], [3, 3]], up: [[6, 5], [6, 4], [5, 3]], wide: [[6, 5], [5, 5], [4, 4], [3, 4], [2, 3]], down: [[5, 6], [4, 7], [3, 8]] },
            welcome: 'i\'m pinch. i guard the portfolio. mostly by standing here.', scroll: 'easy. these pincers aren\'t seatbelts.',
            click: ['you poked the guard.', 'pinch first, questions later.'] },
        moth: { name: 'DUST', body: MOTH, legDx: 0, wings: 'moth', noLegs: true,
            ant: { out: [[10, 3], [9, 2], [8, 2], [8, 1], [7, 1]], up: [[11, 3], [10, 2], [10, 1], [9, 1]], wide: [[10, 3], [9, 3], [8, 2], [7, 2], [7, 1], [6, 1]], down: [[10, 3], [9, 3], [8, 3], [7, 4]] },
            welcome: 'i\'m dust. came for the glow of your screen, stayed for the work.', scroll: 'wheee. is that a lamp?',
            click: ['was that a light switch?', 'drawn to it. can\'t help it.'] },
    };
    const GLYPH = {
        heart: ['yy.yy', 'yyyyy', '.yyy.', '..y..'],
        z: ['yyyy', '..y.', '.y..', 'yyyy'],
        bang: ['y', 'y', 'y', '.', 'y'],
        sparkle: ['.y.', 'yyy', '.y.'],
        note: ['..yy', '.yyy', '.y.y', 'yy.y', 'yy..'],
    };

    const LINES = {
        dance: ['vibing with the calendar.', 'got the rhythm.', 'look at these moves.', 'drop the beat.', 'nav bug on duty.', 'pencil me in for a dance.'],
        scroll: ['whoa, slow down.', 'wind in my antennae.', 'hold on, i\'m coming.', 'motion sickness is a feature.'],
        hero: ['move your cursor. he watches it. i just try not to get squashed.', 'drag me anywhere. i won\'t file a report.'],
        screen: ['same guy, smaller screen. i live in the gaps between the words.', 'keep it simple, stupid. i\'m the simple part.'],
        projects: ['the good work is down here. hover a row, i\'ll wait on the line.', 'zero bugs in any of these. except me, visiting.'],
        services: ['scroll me. i\'m a wheel now.', 'six arms, five stacks. i ride the spare one.'],
        together: ['thirty-six stickers and not one of me.', 'say hello. i\'ll be in the inbox, chewing.'],
        footer: ['he signed it. i\'m the asterisk.', 'mind the pile. something in there still compiles.'],
        pet: ['tickles.', '*antennae intensify*', 'careful. i bite. in bytes.', 'you\'re not squashing me. i like you.'],
        caught: ['gotcha. not a feature.', 'reproduced it.', 'found you. marking as resolved.', 'faster than your QA team.', 'tag. you\'re the bug now.'],
        flip: ['i\'m fine. this is fine.', 'help. legs. air.', 'undefined is not a function.', 'works on my machine.',
            'stack overflow. literally.', 'this side up. apparently not.'],
        held: ['put me down.', 'whee—', 'i get airsick.', 'this is not how you move a bug.', 'altitude: concerning.', 'hands off the prod build.'],
        wake: ['huh? i was compiling.', 'not asleep. just idle.', 'five more minutes.', 'back online.', 'i wasn\'t sleeping. i was caching.'],
        click: ['on it.', 'you rang?', 'breakpoint hit.', 'what\'s over there?', 'is that a crumb?', 'clicked. logged. investigating.',
            'right behind you.', 'event received.', 'ooh, a click.', 'coming. six legs, one speed.'],
    };

    function blank() {
        const g = [];
        for (let y = 0; y < GH; y++) g.push(new Array(GW).fill('.'));
        return g;
    }
    function put(g, x, y, c) {
        if (y >= 0 && y < GH && x >= 0 && x < GW) g[y][x] = c;
    }
    function both(g, x, y, c, side) {
        if (side <= 0) put(g, x, y, c);
        if (side >= 0) put(g, GW - 1 - x, y, c);
    }
    function run(g, pts, c, side, tip) {
        pts.forEach(([px, py], i) => both(g, px, py, tip && i === pts.length - 1 ? tip : c, side));
    }

    // Tripod gait: front + rear on one side swing with the middle leg of the other
    function legState(legs, side, leg) {
        if (legs === 'tuck') return 'tuck';
        if (legs === 'a' || legs === 'b') {
            const swing = (legs === 'a') === (side < 0);
            return (leg === 'mid') === swing ? 'back' : 'fwd';
        }
        if (legs === 'flail0' || legs === 'flail1') return (legs === 'flail0') === (side < 0) ? 'fwd' : 'back';
        if (leg === 'front' && ((legs === 'groomL' && side < 0) || (legs === 'groomR' && side > 0))) return 'groom';
        return 'mid';
    }

    // pose: { skin, legs, antL, antR, fly: 0|1|2, belly, happy, lit }
    const cache = new Map();
    function compose(p) {
        const key = JSON.stringify(p);
        if (cache.has(key)) return cache.get(key);
        const skin = SKINS[p.skin] || SKINS.beetle;
        const g = blank();
        if (skin.wings === 'moth') {
            // Wide wings at rest, folded toward the body on the upstroke
            const fold = p.fly === 2 ? 3 : 0;
            MOTH_WING.rows.forEach((row, ry) => {
                for (let rx = 0; rx < row.length; rx++) {
                    let c = row[rx];
                    if (c === '.' || rx + fold > 9) continue;
                    if (c === 'D') c = (rx + ry) % 2 ? 's' : 'w';
                    both(g, rx + fold, MOTH_WING.y + ry, c, 0);
                }
            });
        } else if (p.fly) {
            WING[p.fly].rows.forEach((row, ry) => {
                for (let rx = 0; rx < row.length; rx++) if (row[rx] !== '.') both(g, rx, WING[p.fly].y + ry, 'g', 0);
            });
        }
        for (const side of [-1, 1]) {
            if (!skin.noLegs) {
                for (const leg of ['front', 'mid', 'rear']) {
                    run(g, LEG[leg][legState(p.legs, side, leg)].map(([lx, ly]) => [lx + skin.legDx, ly]), 's', side);
                }
            }
            run(g, skin.ant[side < 0 ? p.antL : p.antR], 's', side, 'y');
            if (skin.extra) run(g, skin.extra, 'w', side);
        }
        const split = p.fly && skin.wings !== 'moth' ? 1 : 0;
        skin.body.forEach((row, y) => {
            for (let x = 0; x < 12; x++) {
                let c = row[x];
                if (c === '.') continue;
                if (c === 'L') c = p.lit ? 'y' : 'o';
                if (p.belly && y >= 14) c = y === 17 || y === 21 ? 'k' : 's';
                if (p.happy && c === 'k' && y >= 6 && y <= 7) c = 'y';
                const dx = split && y >= 14 ? 1 : 0;
                put(g, x - dx, y, c);
                put(g, GW - 1 - x + dx, y, c);
            }
        });
        // One-pixel ink edge around everything opaque, so the bug reads on the paper hero and the black slides alike
        const out = g.map((r) => r.slice());
        const solid = (yy, xx) => yy >= 0 && yy < GH && xx >= 0 && xx < GW && 'wsytdo'.indexOf(g[yy][xx]) >= 0;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
            if (g[y][x] === '.' && (solid(y - 1, x) || solid(y + 1, x) || solid(y, x - 1) || solid(y, x + 1))) out[y][x] = 'k';
        }
        const img = doc.createElement('canvas'), sil = doc.createElement('canvas');
        img.width = sil.width = GW;
        img.height = sil.height = GH;
        const ic = img.getContext('2d'), sc = sil.getContext('2d');
        sc.fillStyle = '#000';
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
            const c = out[y][x];
            if (c === '.') continue;
            ic.fillStyle = PAL[c];
            ic.fillRect(x, y, 1, 1);
            if (c !== 'g') sc.fillRect(x, y, 1, 1);
        }
        const res = { grid: out, img, sil };
        cache.set(key, res);
        return res;
    }

    // Sprite access for guide pages that stage their own GLITCH; __pixelBugSpriteOnly skips the wandering bug entirely
    window.__pixelBugSprite = (pose) => compose(Object.assign({ skin: 'beetle', legs: 'mid', antL: 'out', antR: 'out', fly: 0, belly: false, happy: false, lit: false }, pose)).img;
    if (window.__pixelBugSpriteOnly) return;

    function mount() {
        const style = doc.createElement('style');
        style.textContent = `
            .pb-bug { position: fixed; left: 0; top: 0; z-index: 9999990; width: ${BOX * S}px; height: ${BOX * S}px;
                padding: 0; margin: 0; border: 0; background: none; cursor: none; touch-action: none; overflow: visible;
                will-change: transform; -webkit-tap-highlight-color: transparent; }
            .pb-bug:focus-visible { outline: 1px dashed #FFED29; outline-offset: 2px; }
            .pb-bug canvas { position: absolute; display: block; pointer-events: none; image-rendering: pixelated; image-rendering: crisp-edges; }
            .pb-rot, .pb-bug .pb-shadow { position: absolute; left: ${(BOX - GW) / 2 * S}px; top: ${(BOX - GH) / 2 * S}px; width: ${GW * S}px; height: ${GH * S}px; will-change: transform; pointer-events: none; }
            .pb-bug .pb-body { left: 0; top: 0; width: 100%; height: 100%; }
            .pb-bug .pb-shadow { opacity: 0.26; }
            .pb-glow { position: absolute; left: ${12 * S - 22}px; top: ${23.5 * S - 22}px; width: 44px; height: 44px; border-radius: 50%; display: none;
                background: radial-gradient(circle, rgba(255, 237, 41, 0.75) 0%, rgba(255, 237, 41, 0.28) 32%, transparent 70%);
                mix-blend-mode: screen; opacity: 0; will-change: opacity; }
            .pb-bug.has-lantern .pb-glow { display: block; }
            .pb-fx { left: ${(BOX - FXW) / 2 * S}px; top: ${(BOX - FXH) * S}px; width: ${FXW * S}px; height: ${FXH * S}px; }
            .pb-bubble { position: fixed; left: 0; top: 0; z-index: 9999991; max-width: 15.5rem; pointer-events: none;
                padding: 9px 12px 10px; background: #f4f2ea; color: #121316;
                font: 500 11.5px/1.45 'IBM Plex Mono', 'Sometype Mono', monospace; letter-spacing: 0.01em;
                box-shadow: 0 -2px 0 0 #121316, 0 2px 0 0 #121316, -2px 0 0 0 #121316, 2px 0 0 0 #121316, 5px 5px 0 0 rgba(18,19,22,0.28);
                opacity: 0; transition: opacity 0.18s steps(3); will-change: transform, opacity; }
            .pb-bubble.is-on { opacity: 1; }
            .pb-bubble::after { content: ''; position: absolute; left: var(--tail, 24px); bottom: -8px; width: 8px; height: 6px; background: #121316;
                clip-path: polygon(0 0, 100% 0, 100% 33%, 66% 33%, 66% 66%, 33% 66%, 33% 100%, 0 100%); }
            .pb-bubble.is-below::after { bottom: auto; top: -8px; transform: scaleY(-1); }
            .pb-tag { display: inline-block; margin: 0 0 5px; padding: 1px 5px; background: #121316; color: #FFED29;
                font-size: 9px; letter-spacing: 0.18em; }
            .pb-text { position: relative; display: block; }
            .pb-ghost { visibility: hidden; }
            .pb-type { position: absolute; inset: 0; }
            .pb-type::after { content: ''; display: inline-block; width: 6px; height: 11px; margin-left: 2px; vertical-align: -1px; background: #121316; animation: pbCaret 0.8s steps(1) infinite; }
            .pb-bubble.is-done .pb-type::after { display: none; }
            @keyframes pbCaret { 50% { opacity: 0; } }
            .pb-trail { position: fixed; inset: 0; z-index: 9999989; pointer-events: none; overflow: hidden; }
            .pb-dot { position: absolute; left: 0; top: 0; width: ${S}px; height: ${S}px; margin: ${-S / 2}px 0 0 ${-S / 2}px; background: #b89a2e;
                opacity: 0; animation: pbDot 1.8s linear forwards; will-change: opacity; }
            @keyframes pbDot { 0% { opacity: 0; } 4% { opacity: 0.85; } 25% { opacity: 0.7; } 100% { opacity: 0; } }
        `;
        doc.head.appendChild(style);

        const bug = doc.createElement('button');
        bug.type = 'button';
        bug.className = 'pb-bug';
        bug.style.visibility = 'hidden';
        bug.setAttribute('aria-label', 'Glitch, the site guide. Press for a tip.');
        bug._hintBound = true;
        const shadow = doc.createElement('canvas');
        const body = doc.createElement('canvas');
        const fx = doc.createElement('canvas');
        shadow.className = 'pb-shadow';
        body.className = 'pb-body';
        fx.className = 'pb-fx';
        shadow.width = body.width = GW;
        shadow.height = body.height = GH;
        fx.width = FXW;
        fx.height = FXH;
        const rot = doc.createElement('div');
        rot.className = 'pb-rot';
        const glow = doc.createElement('span');
        glow.className = 'pb-glow';
        rot.append(glow, body);
        bug.append(shadow, rot, fx);
        const sctx = shadow.getContext('2d'), bctx = body.getContext('2d'), fctx = fx.getContext('2d');

        const bubble = doc.createElement('div');
        bubble.className = 'pb-bubble';
        bubble.setAttribute('role', 'status');
        bubble.setAttribute('aria-live', 'polite');
        bubble.innerHTML = '<span class="pb-tag"></span><span class="pb-text"><span class="pb-ghost"></span><span class="pb-type"></span></span>';
        const tag = bubble.querySelector('.pb-tag');
        let stored = null;
        try { stored = window.localStorage.getItem('pixelBugSkin'); } catch (e) { /* storage blocked */ }
        let skinKey = SKINS[window.__pixelBugSkin] ? window.__pixelBugSkin : SKINS[stored] ? stored : 'beetle';
        let skin = SKINS[skinKey];
        function applySkin() {
            tag.textContent = '[ ' + skin.name + ' ]';
            bug.classList.toggle('has-lantern', !!skin.lantern);
            bug.setAttribute('aria-label', skin.name.charAt(0) + skin.name.slice(1).toLowerCase() + ', the site guide. Press for a tip.');
        }
        applySkin();
        const ghost = bubble.querySelector('.pb-ghost');
        const typed = bubble.querySelector('.pb-type');
        const trail = doc.createElement('div');
        trail.className = 'pb-trail';
        trail.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(trail);
        doc.body.appendChild(bubble);
        doc.body.appendChild(bug);

        function dot(px, py) {
            const d = doc.createElement('span');
            d.className = 'pb-dot';
            d.style.transform = 'translate3d(' + (Math.round(px / S) * S) + 'px,' + (Math.round(py / S) * S) + 'px,0)';
            d.addEventListener('animationend', () => d.remove(), { once: true });
            trail.appendChild(d);
            if (trail.childElementCount > 140) trail.firstElementChild.remove();
        }

        const cursorDot = doc.getElementById('siteCursorDot');
        const cursorLabel = doc.getElementById('cursorLabel');
        const cursorText = cursorLabel && cursorLabel.querySelector('.js-text-container');
        function label(text) {
            if (!cursorLabel) return;
            if (text) {
                if (cursorText) cursorText.textContent = text;
                cursorLabel.style.opacity = '1';
                if (cursorDot) cursorDot.classList.add('is-hovering');
            } else {
                cursorLabel.style.opacity = '0';
                if (cursorDot) cursorDot.classList.remove('is-hovering');
            }
        }

        let vw = window.innerWidth, vh = window.innerHeight;
        const HALF = BOX * S / 2;
        const SPEED = { roam: 85, scuttle: 230, circle: 70, visit: 260, fly: 340 };
        const ENTRY_MS = 1250;
        // (x, y) is the centre of the bug; heading 0 points right. Placed by start().
        let x = -200, y = -200;
        let heading = 0, speed = 0, entered = false, live = false, shown = false;
        let act = null;
        let pauseUntil = 0, stride = 0, stepSide = 1, nextInterest = 0, lastVisit = 0;
        let state = 'idle', hover = false, happy = 0, squash = 0, lift = 0, wob = 0, flipUntil = 0, flips = 0, danceMode = false;
        let lastActive = performance.now(), clock = 0, travelled = 0;
        let twitch = 0, twitchSide = 'L', nextTwitch = 1.5;
        const mouse = { x: -1, y: -1, t: 0, vx: 0, seen: false, travel: 0 };
        const parts = [];
        let leash = null, sceneLine = '';
        const entering = () => !!(act && act.phase === 'entry');

        window.addEventListener('resize', () => {
            vw = window.innerWidth;
            vh = window.innerHeight;
        }, { passive: true });

        function wake(now, quiet) {
            lastActive = now;
            if (state !== 'sleep') return false;
            state = 'idle';
            spawn('bang');
            if (!quiet) react('wake', now);
            return true;
        }

        doc.addEventListener('pointermove', (e) => {
            const now = performance.now();
            if (mouse.t) {
                mouse.vx = (e.clientX - mouse.x) / Math.max(1, now - mouse.t) * 1000;
                mouse.travel += Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
            }
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.t = now;
            mouse.seen = true;
            if (live) wake(now);
        }, { passive: true });

        // Velocity is measured over a sliding window in the listener, so it holds up whether scroll events
        // arrive every 8ms or every 100ms; a fast window arms a takeoff for the loop.
        // Captured on the document because swup can swap the .js-scroller element after mount.
        const FAST = 1200, WINDOW = 200;
        const trace = [];
        let traceEl = null, scrollV = 0, scrollArmed = 0;
        let lastScrollMove = -1e9, lastScrollFly = -1e9, scrollFlights = 0;
        const scrollOf = (el) => (el === window ? window.scrollY : el.scrollTop);
        const initialScroller = doc.querySelector('.js-scroller') || window;
        trace.push([performance.now(), scrollOf(initialScroller)]);
        traceEl = initialScroller;
        doc.addEventListener('scroll', (e) => {
            const t = e.target;
            const page = t === doc || t === doc.documentElement || t === doc.body || t === doc.scrollingElement;
            if (!page && !(t.classList && t.classList.contains('js-scroller'))) return;
            const el = page ? window : t;
            const now = performance.now(), st = scrollOf(el);
            if (el !== traceEl) {
                traceEl = el;
                trace.length = 0;
            }
            const prev = trace.length ? trace[trace.length - 1][1] : st;
            if (Math.abs(st - prev) > 0.5) lastScrollMove = now;
            // After an idle gap the old position is re-timed to two frames ago, so the first frame of a flick counts
            if (trace.length && now - trace[trace.length - 1][0] > 400) trace.splice(0, trace.length - 1, [now - 33, prev]);
            trace.push([now, st]);
            while (trace.length > 2 && now - trace[1][0] > WINDOW) trace.shift();
            const span = now - trace[0][0];
            const v = (st - trace[0][1]) / Math.min(Math.max(span, 16), 1000) * 1000;
            scrollV = v;
            if (Math.abs(v) > FAST && Math.abs(st - trace[0][1]) > 40) scrollArmed = Math.sign(v);
            lastActive = now;
        }, { passive: true, capture: true });

        function spawn(kind, n) {
            const count = n || 1;
            for (let i = 0; i < count; i++) {
                parts.push({
                    kind,
                    x: FXW / 2 - 3 + (Math.random() * 6 | 0),
                    y: FXH - BOX / 2 - 12,
                    age: -i * 0.18,
                    life: kind === 'bang' ? 0.7 : kind === 'z' ? 2.2 : 1.3,
                    drift: Math.random() < 0.5 ? -1 : 1,
                });
            }
        }

        // --- Speech bubble with a fixed footprint so typing never reflows it
        const USER = 3, SECTION = 2;
        const queue = [];
        let say = null;
        function speak(text, now, kind, pri) {
            ghost.textContent = text;
            typed.textContent = '';
            bubble.classList.remove('is-done');
            bubble.classList.add('is-on');
            say = { text, kind: kind || 'section', pri: pri || SECTION, start: now, hold: 1900 + text.length * 48,
                bw: bubble.offsetWidth, bh: bubble.offsetHeight };
        }
        // Section-level lines never cut off a reaction; they wait at the front of the queue instead
        function announce(text, now) {
            if (say && say.text === text) return;
            if (say && say.pri >= USER) queue.unshift(text);
            else speak(text, now, 'section', SECTION);
        }

        // Shuffle bag per line set: every line plays once before any repeats, never the same one twice in a row
        const bags = {};
        function draw(key, pool) {
            const bag = bags[key] || (bags[key] = { left: [], last: '' });
            if (!bag.left.length) {
                const b = pool.slice();
                for (let i = b.length - 1; i > 0; i--) {
                    const j = Math.random() * (i + 1) | 0;
                    [b[i], b[j]] = [b[j], b[i]];
                }
                if (b.length > 1 && b[b.length - 1] === bag.last) [b[0], b[b.length - 1]] = [b[b.length - 1], b[0]];
                bag.left = b;
            }
            return (bag.last = bag.left.pop());
        }

        // Every user-caused reaction speaks and replaces whatever is showing. A burst of the same trigger speaks
        // on its first hit, then swaps lines at most every REPEAT ms, with the last hit of the burst still answered.
        const REPEAT = 900;
        const lastSaid = {};
        let pending = null;
        const PICK = {
            click: () => (state === 'flip' ? draw('flip', LINES.flip) : danceMode ? draw('dance', LINES.dance) : draw('click:' + skinKey, LINES.click.concat(skin.click || []))),
            pet: () => {
                const lines = section && LINES[section];
                if (pets % 2 === 1 && lines) {
                    const line = lines[(told[section] || 0) % lines.length];
                    told[section] = (told[section] || 0) + 1;
                    const qi = queue.indexOf(line);
                    if (qi >= 0) queue.splice(qi, 1);
                    return line;
                }
                return draw('pet', LINES.pet);
            },
            held: () => draw('held', LINES.held),
            flip: () => draw('flip', LINES.flip),
            scroll: () => draw('scroll:' + skinKey, LINES.scroll.concat(skin.scroll)),
            caught: () => draw('caught', LINES.caught),
            wake: () => draw('wake', LINES.wake),
        };
        function react(kind, now) {
            if (say && say.kind === kind && now - lastSaid[kind] < REPEAT) {
                pending = { kind, due: lastSaid[kind] + REPEAT };
                return;
            }
            pending = null;
            lastSaid[kind] = now;
            speak(PICK[kind](), now, kind, USER);
        }
        function enqueue(text) {
            if (queue.indexOf(text) < 0) queue.push(text);
        }
        function hush() {
            say = null;
            bubble.classList.remove('is-on');
            lastActive = performance.now();
        }

        // --- Section awareness: one line the first time each section settles under the viewport centre
        const hero = doc.querySelector('.sticky-hero-viewport');
        const heroSection = hero && hero.parentElement;
        const card = doc.getElementById('heroShrinkCard');
        const SECTIONS = [
            ['projects', doc.getElementById('section-projects')],
            ['services', doc.querySelector('.ll-section--services')],
            ['together', doc.querySelector('.ll-section--together')],
            ['footer', doc.querySelector('.sig-footer')],
        ].filter((s) => s[1]);
        const seen = {}, told = {};
        let section = '', sectionSince = 0;
        function detect(now) {
            const mid = vh * 0.5;
            let key = '';
            if (heroSection) {
                const r = heroSection.getBoundingClientRect();
                if (r.top <= mid && r.bottom >= mid) {
                    const cw = card ? card.getBoundingClientRect().width : vw;
                    key = cw < vw * 0.7 ? 'screen' : 'hero';
                }
            }
            if (!key) {
                for (const [k, el] of SECTIONS) {
                    const r = el.getBoundingClientRect();
                    if (r.top <= mid && r.bottom >= mid) { key = k; break; }
                }
            }
            if (key !== section) {
                section = key;
                sectionSince = now;
            } else if (key && !seen[key] && now - sectionSince > 700 && state !== 'held') {
                seen[key] = true;
                told[key] = 1;
                wake(now);
                spawn('bang');
                enqueue(LINES[key][0]);
            }
        }

        // --- Boop / drag
        let press = null, pets = 0;
        bug.addEventListener('pointerenter', () => { hover = true; label('[ BOOP ]'); });
        bug.addEventListener('pointerleave', () => { hover = false; if (state !== 'held') label(''); });
        bug.addEventListener('pointerdown', (e) => {
            press = { x: e.clientX, y: e.clientY, ox: e.clientX - x, oy: e.clientY - y };
            bug.setPointerCapture(e.pointerId);
        });
        bug.addEventListener('pointermove', (e) => {
            if (!press || reduced) return;
            if (state !== 'held' && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) {
                const now = performance.now();
                if (rest) { press = null; doze(now); return; }
                lastActive = now;
                state = 'held';
                react('held', now);
                label('[ WHEE ]');
            }
        });
        function release(e) {
            if (!press) return;
            const now = performance.now();
            if (state === 'held') {
                // Dropped bugs land on their back and flail until they right themselves
                state = 'flip';
                flipUntil = now + 1300;
                speed = 0;
                act = null;
                squash = 0.25;
                flips++;
                entered = true;
                react('flip', now);
                label(hover ? '[ BOOP ]' : '');
            } else {
                pet(now);
            }
            press = null;
            if (e && bug.hasPointerCapture(e.pointerId)) bug.releasePointerCapture(e.pointerId);
        }
        bug.addEventListener('pointerup', release);
        bug.addEventListener('pointercancel', release);
        bug.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hush();
        });
        bug.addEventListener('click', (e) => {
            if (e.detail === 0) pet(performance.now());
        });

        function pet(now) {
            wake(now, true);
            happy = 1.6;
            squash = 0.2;
            spawn('heart', 3);
            pets++;
            react('pet', now);
        }

        // Any click on the page gets a reaction: usually a scurry to the spot, sometimes a start in place.
        // Passive and never prevented, so links and buttons still work underneath.
        doc.addEventListener('pointerdown', (e) => {
            if (!live || e.button > 0 || bug.contains(e.target)) return;
            const now = performance.now();
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.t = now;
            mouse.seen = true;
            if (state === 'held' || press) return;
            if (rest) { lastActive = now; if (!e.target.closest || !e.target.closest('a, button')) doze(now); return; }
            if (state === 'flip') {
                lastActive = now;
                react('click', now);
                return;
            }
            const wasAsleep = wake(now, true);
            twitch = 0.35;
            twitchSide = e.clientX < x ? 'L' : 'R';
            if (!wasAsleep) spawn(danceMode ? 'sparkle' : 'bang');
            if (danceMode) happy = Math.min(6, happy + 1.5);
            squash = Math.max(squash, 0.12);
            const spot = { x: e.clientX, y: e.clientY };
            if (!reduced && !entering() && !leash) {
                if (act && act.type === 'fly' && act.phase === 'air') {
                    act.scroll = false;
                    act.pts[0] = spot;
                } else if (Math.random() < 0.7 && Math.hypot(spot.x - x, spot.y - y) > 44) {
                    act = { type: 'visit', spot, until: now + 4200 };
                } else {
                    act = { type: 'pause', until: now + 700 + Math.random() * 500, face: true };
                }
            }
            react(wasAsleep ? 'wake' : 'click', now);
        }, { passive: true });

        function caught(now) {
            happy = 2.2;
            spawn('heart');
            react('caught', now);
        }

        function drawParts() {
            fctx.clearRect(0, 0, FXW, FXH);
            for (const p of parts) {
                if (p.age < 0) continue;
                const rows = GLYPH[p.kind];
                const px = p.x + (p.kind === 'bang' ? 0 : Math.round(Math.sin(p.age * 5) * p.drift));
                const py = Math.round(p.y - p.age * (p.kind === 'bang' ? 3 : p.kind === 'z' ? 5 : 7)) - rows.length;
                fctx.fillStyle = PAL.k;
                rows.forEach((row, ry) => {
                    for (let rx = 0; rx < row.length; rx++) {
                        if (row[rx] === '.') continue;
                        fctx.fillRect(px + rx - 1, py + ry, 3, 1);
                        fctx.fillRect(px + rx, py + ry - 1, 1, 3);
                    }
                });
                fctx.fillStyle = PAL.y;
                rows.forEach((row, ry) => {
                    for (let rx = 0; rx < row.length; rx++) if (row[rx] !== '.') fctx.fillRect(px + rx, py + ry, 1, 1);
                });
            }
        }

        let last = performance.now(), nextDetect = 0, nextZ = 0, lastKey = '';
        let hoverX = 0, hoverY = 0, hoverTilt = 0;

        function land(now) {
            act = { type: 'fly', phase: 'land', until: now + 340, pts: [], i: 0 };
            entered = true;
            speed = 0;
            squash = 0.22;
            announce(skin.welcome, now);
        }

        // Buzzing in place after a fast scroll; returns the lift to hold while it lasts
        function hoverStep(now) {
            speed = 0;
            const k = Math.min(1, (now - act.t0) / 200);
            hoverX = (Math.sin(clock * 23) * 1.5 + Math.sin(clock * 37) * 1) * k;
            hoverY = (Math.sin(clock * 11) * 3 - 3 + Math.sin(clock * 41) * 0.8) * k;
            hoverTilt = Math.sin(clock * 7) > 0.55 ? 1 : Math.sin(clock * 7) < -0.55 ? -1 : 0;
            if (Math.abs(scrollV) > 200) act.dir = Math.sign(scrollV);
            if (now > act.until && now - lastScrollMove > 250) {
                act.phase = 'land';
                act.until = now + 340;
                squash = 0.2;
            }
            return 0.8;
        }

        // Leash approach: a glance toward the target, then a cubic arc from where it stands to the live target. It leaves
        // along a launch angle bent off the straight line (to whichever side keeps the arc clear of the scene's `avoid`
        // box and needs the least turning) and lands moving along the target's heading; duration scales with distance.
        function glance(now) {
            twitch = 0.35;
            twitchSide = Math.random() < 0.5 ? 'L' : 'R';
            return { phase: 'glance', until: now + 160 + Math.random() * 180 };
        }
        function arc(ap, px, py, ha, u) {
            const v = 1 - u, x0 = ap.x0, y0 = ap.y0;
            const c1x = x0 + Math.cos(ap.h0) * ap.k1, c1y = y0 + Math.sin(ap.h0) * ap.k1;
            const c2x = px - Math.cos(ha) * ap.k2, c2y = py - Math.sin(ha) * ap.k2;
            return [
                v * v * v * x0 + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * px,
                v * v * v * y0 + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * py,
            ];
        }
        function launch(ap, now, px, py, p) {
            const d = Math.hypot(px - x, py - y), base = Math.atan2(py - y, px - x);
            const bend = Math.min(0.55, 0.22 + d / 1800);
            Object.assign(ap, { phase: 'fly', t0: now, x0: x, y0: y, d, k1: Math.min(d * 0.36, 260), k2: Math.min(d * 0.3, 150),
                nx: -Math.sin(base), ny: Math.cos(base), air: d > 90, ph: Math.random() * 6.283 });
            let best = -Infinity, side = 1;
            for (const s of [-1, 1]) {
                ap.h0 = base + s * bend;
                const m = arc(ap, px, py, p.heading, 0.5);
                const a = p.avoid;
                const room = a ? Math.hypot(Math.max(a.l - m[0], 0, m[0] - a.r), Math.max(a.t - m[1], 0, m[1] - a.b)) : 0;
                const turn = Math.abs(Math.atan2(Math.sin(ap.h0 - heading), Math.cos(ap.h0 - heading)));
                const score = Math.min(room, 160) - turn * 40;
                if (score > best) {
                    best = score;
                    side = s;
                }
            }
            ap.h0 = base + side * bend;
            ap.dur = d < 14 ? 1 : Math.max(600, Math.min(1400, 380 + d * 0.6));
            ap.amp = ap.air ? Math.min(6, d * 0.012) : 0;
        }
        // Back to wandering: a beat with the wings up, then a curved hop off along roughly where it was heading
        function depart(now) {
            const d = 150 + Math.random() * 130, a = heading + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
            const spot = { x: Math.max(60, Math.min(vw - 60, x + Math.cos(a) * d)), y: Math.max(60, Math.min(vh - 60, y + Math.sin(a) * d)) };
            twitch = 0.35;
            return lift > 0.5
                ? { type: 'fly', phase: 'air', pts: [spot], i: 0 }
                : { type: 'fly', phase: 'warm', until: now + 240 + Math.random() * 200, pts: [spot], i: 0 };
        }

        // Six feet, one pair of track dots per step, only while it's on the ground
        function footsteps(dt) {
            if (speed > 20 && lift < 0.1) {
                const prev = Math.floor(stride);
                stride += speed * dt / 7;
                if (Math.floor(stride) !== prev) {
                    stepSide = -stepSide;
                    const c = Math.cos(heading), s = Math.sin(heading);
                    dot(x - s * 8 * stepSide + c * 5, y + c * 8 * stepSide + s * 5);
                    dot(x + s * 8 * stepSide - c * 4, y - c * 8 * stepSide - s * 4);
                }
            }
        }

        function loop(now) {
            // rAF timestamps can trail performance.now(), so the first step may come out negative
            const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
            last = Math.max(last, now);
            clock += dt;
            happy = Math.max(0, happy - dt);
            squash = Math.max(0, squash - dt);
            if (pending && now >= pending.due) react(pending.kind, now);

            if (now > nextDetect) {
                detect(now);
                nextDetect = now + 250;
            }

            // Slide 1 never lets it doze: it keeps prowling to bait the pointer
            const prowl = section === 'hero' && !leash;
            if (prowl) {
                lastActive = now;
                if (state === 'sleep') wake(now, true);
            }
            if (!danceMode && (state === 'idle' || state === 'walk' || state === 'groom') && now - lastActive > 18000 && !say && !queue.length) {
                state = 'sleep';
                speed = 0;
                act = null;
                hush();
            }

            const minX = 24, maxX = vw - 24, minY = 30, maxY = vh - 30;
            const clampX = (v) => Math.max(minX, Math.min(maxX, v));
            const clampY = (v) => Math.max(minY, Math.min(maxY, v));
            let liftTo = 0;

            // Fast scrolling startles it into buzzing on the spot until the scroll settles, then it drops back down
            if (now - lastScrollMove > 200) scrollV *= Math.exp(-dt * 10);
            // Every fast stretch sets it hovering, in either direction; only the line that goes with it is rationed
            const armed = scrollArmed;
            scrollArmed = 0;
            if (armed && act && act.scroll) {
                act.dir = armed;
                act.until = Math.min(act.t0 + 4000, Math.max(act.until, now + 1200));
            } else if (armed && (now - lastScrollFly > 900 || (act && act.type === 'fly')) && state !== 'held' && state !== 'flip' && !reduced && !entering()) {
                lastScrollFly = now;
                scrollFlights++;
                wake(now, true);
                act = { type: 'fly', phase: 'hover', scroll: true, dir: armed, t0: now, until: now + 1200 + Math.random() * 600 };
                speed = 0;
                squash = 0.15;
                react('scroll', now);
            }
            hoverX = hoverY = hoverTilt = 0;

            // A drag or a flip always wins over a leash; the leash then re-approaches from wherever it was dropped
            if (leash && (state === 'held' || state === 'flip')) leash.ap = null;
            if (state === 'held') {
                x = mouse.x - press.ox;
                y = mouse.y - press.oy;
                wob += (Math.max(-40, Math.min(40, -mouse.vx * 0.04)) - wob) * Math.min(1, dt * 10);
                mouse.vx *= 0.9;
                liftTo = 0.55;
            } else if (state === 'flip') {
                wob *= 0.85;
                if (now > flipUntil) {
                    state = 'idle';
                    squash = 0.2;
                    pauseUntil = now + 500;
                }
            } else if (leash && !reduced) {
                // A scene steers it (the slide 04 skills wheel): glance, approach arc (flown, or walked when it's close),
                // then it rides the target, flying whenever the scene asks (lift). Scroll hovers and speech play on top.
                wob *= 0.8;
                lastActive = now;
                let hovering = false;
                if (act && act.type === 'fly' && act.scroll) {
                    if (act.phase === 'hover') {
                        liftTo = hoverStep(now);
                        hovering = true;
                    } else if (now > act.until) {
                        act = null;
                    }
                } else {
                    act = null;
                }
                const p = leash.target(now);
                leash.avoid = p && p.avoid;
                speed = 0;
                if (p) {
                    const px = clampX(p.x), py = clampY(p.y), ox = x, oy = y;
                    const ap = leash.ap || (leash.ap = glance(now));
                    let want = p.heading, rate = 14;
                    if (ap.phase === 'glance') {
                        want = Math.atan2(py - y, px - x);
                        rate = 6;
                        const off = Math.abs(Math.atan2(Math.sin(want - heading), Math.cos(want - heading)));
                        if (now >= ap.until && (off < 1 || now >= ap.until + 400)) launch(ap, now, px, py, p);
                    }
                    if (ap.phase === 'fly') {
                        const k = Math.min(1, (now - ap.t0) / ap.dur), u = k * k * (3 - 2 * k);
                        const at = arc(ap, px, py, p.heading, u);
                        const fwd = arc(ap, px, py, p.heading, Math.min(1, u + 0.015)), back = arc(ap, px, py, p.heading, Math.max(0, u - 0.015));
                        const wv = ap.amp * Math.sin(Math.PI * u) * Math.sin(3 * Math.PI * u + ap.ph);
                        x = clampX(at[0] + ap.nx * wv);
                        y = clampY(at[1] + ap.ny * wv);
                        want = k >= 1 ? p.heading : Math.atan2(fwd[1] - back[1], fwd[0] - back[0]);
                        rate = 10;
                        if (ap.air) {
                            liftTo = Math.max(liftTo, u < 0.8 ? 1 : (1 - u) / 0.2);
                            if (!hovering) hoverY = Math.sin(clock * 9) * 2 * Math.sin(Math.PI * u);
                        }
                        if (k >= 1) {
                            ap.phase = 'ride';
                            squash = Math.max(squash, ap.air ? 0.18 : 0.08);
                            if (!leash.arrived) {
                                leash.arrived = true;
                                if (leash.onArrive) leash.onArrive();
                            }
                        }
                    } else if (ap.phase === 'ride') {
                        x = px;
                        y = py;
                        if (p.lift) liftTo = Math.max(liftTo, p.lift);
                    }
                    const da = Math.atan2(Math.sin(want - heading), Math.cos(want - heading));
                    heading += Math.max(-rate * dt, Math.min(rate * dt, da));
                    if (dt > 0) speed = Math.hypot(x - ox, y - oy) / dt;
                }
                footsteps(dt);
                if (danceMode && leash && leash.arrived) state = 'dance';
                else state = liftTo > 0.5 ? 'fly' : speed > 20 ? 'walk' : 'idle';
            } else if (leash && reduced) {
                const p = leash.target(now);
                leash.avoid = p && p.avoid;
                if (p) {
                    x = clampX(p.x);
                    y = clampY(p.y);
                    heading = p.heading;
                }
                speed = 0;
                if (!leash.arrived) {
                    leash.arrived = true;
                    if (leash.onArrive) leash.onArrive();
                }
            } else if (state !== 'sleep' && !reduced) {
                wob *= 0.8;
                const near = Math.hypot(mouse.x - x, mouse.y - y) < 26;
                const cursorLive = mouse.seen && now - mouse.t < 1500;

                // A lot of cursor movement sometimes catches its eye, but it won't drop everything every time
                if (now > nextInterest) {
                    nextInterest = now + 1000;
                    const busy = act && (act.type === 'visit' || act.type === 'fly');
                    if (!busy && cursorLive && mouse.travel > 180 && Math.random() < 0.5) act = { type: 'visit', until: now + 4200 };
                    mouse.travel = 0;
                }
                if ((near || hover) && act && act.type === 'visit') {
                    act = null;
                    pauseUntil = now + 1000;
                }

                if (!act && now > pauseUntil && !near && !hover) {
                    const spot = (lo, hi) => {
                        let gx = x, gy = y;
                        for (let i = 0; i < 10; i++) {
                            gx = minX + 30 + Math.random() * Math.max(0, maxX - minX - 60);
                            gy = minY + 30 + Math.random() * Math.max(0, maxY - minY - 60);
                            const d = Math.hypot(gx - x, gy - y);
                            if (d > lo && d < hi) break;
                        }
                        return { x: gx, y: gy };
                    };
                    // While it's talking it only picks calm things so the bubble stays readable
                    const menu = say && !prowl
                        ? [['pause', 3], ['groom', 2]]
                        : prowl
                        ? [['roam', 34], ['scuttle', 24], ['circle', 10], ['fly', 10], ['pause', 2],
                            ['visit', mouse.seen && now - lastVisit > 3500 ? 6 : 0]]
                        : [['roam', 28], ['scuttle', 16], ['pause', 16], ['groom', 12], ['circle', 8], ['fly', 8],
                            ['visit', mouse.seen && now - lastVisit > 3500 ? 9 : 0]];
                    let roll = Math.random() * menu.reduce((a, m) => a + m[1], 0);
                    let type = menu[0][0];
                    for (const [t, w] of menu) { if ((roll -= w) < 0) { type = t; break; } }

                    if (type === 'roam') {
                        act = { type, pts: [spot(120, 380)], i: 0 };
                    } else if (type === 'scuttle') {
                        // Short zigzag burst, the way beetles dart between cover
                        const pts = [], turn = Math.random() < 0.5 ? 1 : -1;
                        let a = heading + (Math.random() - 0.5) * 1.6, px = x, py = y;
                        for (let k = 0; k < 3; k++) {
                            const d = 50 + Math.random() * 60;
                            px = clampX(px + Math.cos(a) * d);
                            py = clampY(py + Math.sin(a) * d);
                            pts.push({ x: px, y: py });
                            a += turn * (k % 2 ? 0.9 : -0.9);
                        }
                        act = { type, pts, i: 0 };
                    } else if (type === 'circle') {
                        // Investigates a small patch in a tight loop
                        const r = 18, pts = [], dir = Math.random() < 0.5 ? 1 : -1;
                        const ccx = clampX(x + Math.cos(heading) * r), ccy = clampY(y + Math.sin(heading) * r);
                        for (let k = 1; k <= 10; k++) {
                            const a = heading + Math.PI + dir * k * Math.PI / 5;
                            pts.push({ x: ccx + Math.cos(a) * r, y: ccy + Math.sin(a) * r });
                        }
                        act = { type, pts, i: 0 };
                    } else if (type === 'fly') {
                        act = { type, phase: 'warm', until: now + 520, pts: [spot(260, 620)], i: 0 };
                    } else if (type === 'visit') {
                        act = { type, until: now + 4200 };
                    } else {
                        act = { type, until: now + (type === 'groom' ? 1600 + Math.random() * 1000 : 800 + Math.random() * 1400) };
                    }
                }

                let target = 0, goal = null;
                if (act && act.type === 'visit') {
                    const at = act.spot || mouse;
                    const dx = x - at.x, dy = y - at.y, d = Math.hypot(dx, dy) || 1;
                    goal = { x: clampX(at.x + dx / d * 38), y: clampY(at.y + dy / d * 38) };
                    if (now > act.until) {
                        act = { type: 'pause', until: now + 900 };
                        goal = null;
                    }
                } else if (act && act.type === 'fly') {
                    if (act.phase === 'entry') {
                        // Quadratic swoop in from off-screen, easing out so it brakes into the landing
                        const k = Math.min(1, (now - act.t0) / ENTRY_MS), e = 1 - Math.pow(1 - k, 3), u = 1 - e;
                        const p0 = act.p0, c = act.c, p1 = act.p1;
                        x = u * u * p0.x + 2 * u * e * c.x + e * e * p1.x;
                        y = u * u * p0.y + 2 * u * e * c.y + e * e * p1.y;
                        heading = Math.atan2(u * (c.y - p0.y) + e * (p1.y - c.y), u * (c.x - p0.x) + e * (p1.x - c.x));
                        liftTo = 1;
                        if (k >= 1) land(now);
                    } else if (act.phase === 'hover') {
                        liftTo = hoverStep(now);
                    } else if (act.phase === 'warm') {
                        if (now > act.until) act.phase = 'air';
                    } else if (act.phase === 'air') {
                        goal = { x: clampX(act.pts[0].x), y: clampY(act.pts[0].y) };
                        liftTo = 1;
                    } else if (now > act.until) {
                        act = null;
                        pauseUntil = now + 500 + Math.random() * 600;
                    }
                } else if (act && act.pts) {
                    const p = act.pts[act.i];
                    goal = { x: clampX(p.x), y: clampY(p.y) };
                } else if (act && now > act.until) {
                    act = null;
                    pauseUntil = now + 200 + Math.random() * 600;
                }

                // After a visit it keeps turning to face the cursor
                if (!goal && act && act.face && cursorLive) {
                    let da = Math.atan2(mouse.y - y, mouse.x - x) - heading;
                    da = Math.atan2(Math.sin(da), Math.cos(da));
                    heading += Math.max(-10 * dt, Math.min(10 * dt, da));
                }

                if (goal) {
                    const dx = goal.x - x, dy = goal.y - y, dist = Math.hypot(dx, dy);
                    const through = act.pts && act.i < act.pts.length - 1;
                    if (dist < (through ? 12 : 6)) {
                        if (act.type === 'visit') {
                            if (act.spot) {
                                happy = 0.8;
                                twitch = 0.35;
                            } else if (travelled > 100) {
                                caught(now);
                            }
                            lastVisit = now;
                            act = { type: 'pause', until: now + 2400, face: true };
                        } else if (act.type === 'fly') {
                            act.phase = 'land';
                            act.until = now + 340;
                        } else if (through) {
                            act.i++;
                        } else {
                            pauseUntil = now + (prowl ? 60 + Math.random() * 160 : act.type === 'scuttle' ? 150 + Math.random() * 400 : 300 + Math.random() * 800);
                            act = null;
                        }
                        travelled = 0;
                    } else {
                        // Pivots hard when slow, arcs when running, barely steers in the air
                        const want = Math.atan2(dy, dx) + (act.type === 'roam' ? Math.sin(clock * 7.3) * 0.35 : 0);
                        let da = want - heading;
                        da = Math.atan2(Math.sin(da), Math.cos(da));
                        const turn = (act.type === 'fly' ? (act.scroll ? 8 : 4.5) : speed < 50 ? 18 : 9) * dt;
                        heading += Math.max(-turn, Math.min(turn, da));
                        const top = act.type === 'visit' ? Math.min(SPEED.visit, 90 + dist * 0.9) : SPEED[act.type];
                        target = through ? top : Math.min(top, Math.sqrt(2 * 1800 * Math.max(0, dist - 4)));
                        if (Math.abs(da) > 1.6 && act.type !== 'fly') target = Math.min(target, 40);
                    }
                }
                const flying = act && act.type === 'fly';
                speed += Math.max((flying ? -900 : -2600) * dt, Math.min((flying ? 700 : 1500) * dt, target - speed));
                x += Math.cos(heading) * speed * dt;
                y += Math.sin(heading) * speed * dt;
                if (entered) {
                    x = clampX(x);
                    y = clampY(y);
                }
                travelled += speed * dt;
                footsteps(dt);
                state = flying ? 'fly' : speed > 20 ? 'walk' : act && act.type === 'groom' ? 'groom' : 'idle';
            }
            lift += (liftTo - lift) * Math.min(1, dt * 6);

            nextTwitch -= dt;
            if (nextTwitch <= 0) {
                twitch = 0.35;
                twitchSide = Math.random() < 0.5 ? 'L' : 'R';
                nextTwitch = 1 + Math.random() * 2.5;
            }
            twitch = Math.max(0, twitch - dt);

            // Firefly lantern: a short flash every couple of seconds, a slow glow while napping, full beam when happy
            let lantern = 0;
            if (skin.lantern) {
                const ph = (clock % 2.2) / 2.2;
                lantern = state === 'sleep' ? 0.2 + Math.sin(clock * 1.2) * 0.12 : Math.max(0.12, ph < 0.35 ? Math.sin(ph / 0.35 * Math.PI) : 0);
                if (happy > 0 || state === 'fly') lantern = 1;
                glow.style.opacity = (lantern * 0.95).toFixed(2);
            }
            const pose = { skin: skinKey, legs: 'stand', antL: 'out', antR: 'out', fly: 0, belly: false, happy: false, lit: lantern > 0.45 };
            const talking = say && now - say.start < say.text.length * 31;
            if (state === 'dance') {
                if (window.CalendarAudio && typeof window.CalendarAudio.onset === 'function') {
                    const onset = window.CalendarAudio.onset();
                    if (onset > 0.15) {
                        squash = 0.24;
                        if (Math.random() < 0.4) spawn('sparkle');
                    }
                }
                const tempo = 0.14;
                const beat = Math.floor(clock / tempo);
                const step = beat % 6;
                pose.legs = ['a', 'groomL', 'b', 'groomR', 'flail0', 'flail1'][step];
                pose.antL = beat % 2 === 0 ? 'up' : 'out';
                pose.antR = beat % 2 === 1 ? 'up' : 'wide';
                pose.fly = step === 2 || step === 5 ? 1 : 0;
                pose.happy = true;
                if (beat % 16 === 0 && Math.random() < 0.3) spawn('note');
            } else if (state === 'walk') {
                pose.legs = ['a', 'stand', 'b', 'stand'][Math.floor(stride) % 4];
                if (speed > 180) pose.antL = pose.antR = 'wide';
            } else if (state === 'fly') {
                pose.fly = Math.floor(clock / (skin.wings === 'moth' ? 0.08 : 0.035)) % 2 ? 1 : 2;
                pose.legs = act && act.phase === 'warm' ? 'stand' : 'tuck';
                pose.antL = pose.antR = 'wide';
            } else if (state === 'groom') {
                const left = Math.floor(clock / 0.18) % 2 === 0;
                pose.legs = left ? 'groomL' : 'groomR';
                if (left) pose.antL = 'down'; else pose.antR = 'down';
            } else if (state === 'sleep') {
                pose.legs = 'tuck';
                pose.antL = pose.antR = 'down';
                if (clock > nextZ) {
                    spawn('z');
                    nextZ = clock + 1.7;
                }
            } else if (state === 'held') {
                pose.legs = Math.floor(clock / 0.09) % 2 ? 'flail0' : 'flail1';
                pose.antL = pose.antR = 'wide';
            } else if (state === 'flip') {
                pose.belly = true;
                pose.legs = Math.floor(clock / 0.06) % 2 ? 'flail0' : 'flail1';
                pose.antL = pose.antR = 'wide';
            } else {
                if (twitch > 0) pose[twitchSide === 'L' ? 'antL' : 'antR'] = 'up';
                if (talking) {
                    const up = Math.floor(clock / 0.15) % 2 === 0;
                    pose.antL = up ? 'up' : 'out';
                    pose.antR = up ? 'out' : 'up';
                }
            }
            if (happy > 0 && state !== 'sleep' && state !== 'held' && state !== 'flip') {
                pose.happy = true;
                pose.antL = pose.antR = 'up';
            }

            for (let i = parts.length - 1; i >= 0; i--) {
                parts[i].age += dt;
                if (parts[i].age > parts[i].life) parts.splice(i, 1);
            }

            const spr = compose(pose);
            const key = JSON.stringify(pose);
            if (key !== lastKey) {
                lastKey = key;
                bctx.clearRect(0, 0, GW, GH);
                bctx.drawImage(spr.img, 0, 0);
                sctx.clearRect(0, 0, GW, GH);
                sctx.drawImage(spr.sil, 0, 0);
            }
            drawParts();

            // Pixel art rotates in 16 snapped steps so it never smears between angles
            const STEP = 22.5;
            let deg = Math.round((heading + Math.PI / 2) * 180 / Math.PI / STEP) * STEP;
            deg += Math.round(wob / STEP) * STEP;
            if (happy > 1.2 && state === 'idle') deg += Math.floor(clock / 0.12) % 2 ? STEP : -STEP;
            if (state === 'dance') {
                const beat = Math.floor(clock / 0.14);
                deg += (beat % 2 === 0 ? 1 : -1) * STEP;
                squash = Math.max(squash, Math.sin(clock * 14) * 0.15);
            }
            if (state === 'flip') deg += Math.floor(clock / 0.2) % 2 ? STEP : 0;
            deg += hoverTilt * STEP;
            const sc = (1 + lift * 0.18) * (1 + squash * 0.4);
            rot.style.transform = 'rotate(' + deg + 'deg) scale(' + sc.toFixed(3) + ')';
            shadow.style.transform = 'translate3d(' + Math.round(3 + lift * 16) + 'px,' + Math.round(4 + lift * 22) + 'px,0) rotate(' + deg + 'deg)';
            shadow.style.opacity = (0.26 - lift * 0.12).toFixed(3);

            const tx = Math.round((x - HALF) / S) * S;
            const ty = Math.round((y - HALF) / S) * S;
            const hx = Math.round(hoverX / S) * S, hy = Math.round(hoverY / S) * S;
            bug.style.transform = 'translate3d(' + (tx + hx) + 'px,' + (ty + hy) + 'px,0)';
            if (!shown) {
                shown = true;
                bug.style.visibility = '';
            }

            if (!say && queue.length && entered && state !== 'held' && state !== 'sleep') speak(queue.shift(), now);
            if (say) {
                const n = Math.min(say.text.length, Math.floor((now - say.start) / 31));
                if (typed.textContent.length !== n) typed.textContent = say.text.slice(0, n);
                if (n >= say.text.length) bubble.classList.add('is-done');
                const cx = tx + HALF, cy = ty + HALF;
                const bx = Math.max(12, Math.min(vw - say.bw - 12, cx - 30));
                let by = cy - 38 - say.bh;
                // A leashing scene's `avoid` box is text the bubble mustn't cover; it drops below when there's room
                const keepOff = leash && leash.avoid;
                const onText = !!keepOff && bx < keepOff.r + 12 && bx + say.bw > keepOff.l - 12 && by < keepOff.b + 12 && by + say.bh > keepOff.t - 12;
                const below = by < 12 || (onText && cy + 38 + say.bh <= vh - 4);
                if (below) by = cy + 38;
                bubble.classList.toggle('is-below', below);
                bubble.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0)';
                bubble.style.setProperty('--tail', Math.max(8, Math.min(say.bw - 20, cx - bx - 4)) + 'px');
                if (now - say.start > say.hold) hush();
            }

            requestAnimationFrame(loop);
        }

        window.__pixelBugSetSkin = (key) => {
            if (!SKINS[key] || key === skinKey) return;
            skinKey = key;
            skin = SKINS[key];
            applySkin();
            glow.style.opacity = '0';
            queue.length = 0;
            const now = performance.now();
            wake(now, true);
            spawn('bang');
            squash = 0.25;
            speak(skin.welcome, now, 'skin', USER);
        };
        window.__pixelBugDance = (enable) => {
            danceMode = !!enable;
            if (enable) {
                state = 'dance';
                happy = 4.0;
                lastActive = performance.now();
                wake(performance.now(), true);
            } else if (state === 'dance') {
                state = 'idle';
            }
        };
        window.__pixelBugSetState = (s) => {
            state = s;
            if (s === 'dance') danceMode = true;
            else if (danceMode) danceMode = false;
            lastActive = performance.now();
            wake(performance.now(), true);
        };
        // Scenes can take GLITCH over: target(now) returns { x, y, heading, lift?, avoid? } in viewport px every frame
        // (heading 0 = right, lift 1 = fly, avoid = { l, t, r, b } its approach arc bends away from). It flies in and calls
        // opts.onArrive once it first lands on the target. Passing null hands it back to wandering with a curved hop off.
        window.__pixelBugLeash = (target, opts) => {
            const now = performance.now();
            if (target) {
                leash = { target, ap: null, arrived: false, onArrive: opts && opts.onArrive };
                wake(now, true);
                entered = true;
                if (act && !(act.type === 'fly' && act.scroll)) act = null;
            } else if (leash) {
                leash = null;
                if (!(act && act.type === 'fly' && act.scroll)) act = reduced || state === 'held' || state === 'flip' ? null : depart(now);
                pauseUntil = now + 600;
            }
        };
        window.__pixelBugPlaceSilently = (target) => {
            const now = performance.now();
            const spot = typeof target === 'function' ? target(now) : target;
            if (spot) {
                x = spot.x;
                y = spot.y;
                heading = spot.heading != null ? spot.heading : -Math.PI / 2;
            }
            leash = { target: typeof target === 'function' ? target : () => spot, ap: null, arrived: true };
            speed = 0;
            entered = true;
            live = true;
            shown = true;
            state = 'idle';
            danceMode = false;
            happy = 0;
            lift = 0;
            act = null;
            lastActive = now;
            bug.style.opacity = '1';
            bug.style.transform = `translate3d(${Math.round(x - HALF)}px, ${Math.round(y - HALF)}px, 0) rotate(${heading + Math.PI / 2}rad)`;
        };
        // Scene narration: never cuts off a reaction to the user, and a newer scene line replaces a queued older one
        window.__pixelBugSay = (text) => {
            const qi = sceneLine ? queue.indexOf(sceneLine) : -1;
            if (qi >= 0) queue.splice(qi, 1);
            if (!text || !live) {
                if (say && say.kind === 'scene') hush();
                sceneLine = '';
                return;
            }
            const now = performance.now();
            sceneLine = text;
            wake(now, true);
            if (say && say.pri >= USER) queue.unshift(text);
            else speak(text, now, 'scene', SECTION);
        };
        // The last screen: it parks beside the contact button and hibernates there until the page is scrolled back up.
        // Taps still get a boop; calling it over or dragging it only gets a sleepy refusal.
        const DOZE = ['zzz… resting.', 'hibernating. scroll up to wake me.', 'mm… five more minutes.', 'off duty. try the button.'];
        const NUDGE = ['the contact page is wild. go look.', 'psst. that button. press it.', 'there\'s a calendar that dances. just saying.', 'go on, say hello. i\'ll wait here.'];
        let rest = false, restSaid = 0, nudgeN = 0;
        const restSpot = { x: 0, y: 0, heading: Math.PI };
        const doze = (now) => {
            if (now - restSaid < 1400) return;
            restSaid = now;
            spawn('z', 2);
            speak(DOZE[(Math.random() * DOZE.length) | 0], now, 'rest', USER);
        };
        window.addEventListener('wt:end', (e) => {
            rest = !!e.detail;
            const btn = doc.querySelector('.wt-contact');
            if (rest && btn) {
                window.__pixelBugLeash(() => {
                    const r = btn.getBoundingClientRect();
                    restSpot.x = Math.max(30, Math.min(window.innerWidth - 30, r.left - 38));
                    restSpot.y = Math.max(30, Math.min(window.innerHeight - 30, r.top + r.height / 2 + 4));
                    restSpot.heading = 0;
                    return restSpot;
                });
            } else if (!rest && leash) {
                window.__pixelBugLeash(null);
                hush();
            }
        });
        setInterval(() => {
            if (!rest || !live || say || document.hidden) return;
            const now = performance.now();
            if (now - restSaid < 6000) return;
            restSaid = now;
            if (nudgeN++ % 3 === 2) { spawn('z', 3); return; }
            speak(NUDGE[nudgeN === 1 ? 0 : (Math.random() * NUDGE.length) | 0], now, 'nudge', SECTION);
        }, 4500);

        const bugPos = { x: 0, y: 0 };
        window.__pixelBugPos = () => {
            if (!live) return null;
            bugPos.x = x;
            bugPos.y = y;
            return bugPos;
        };
        window.__pixelBugState = () => ({ live, state, x, y, section, leash: !!leash, leashPhase: leash && leash.ap ? leash.ap.phase : null, say: say && say.text, sayKind: say && say.kind, queue: queue.length, flips,
            entering: entering(), parts: parts.length, act: act && act.type, phase: act && act.phase, speed, lift, skin: skinKey,
            scrollV: Math.round(scrollV), scrollFly: !!(act && act.scroll), scrollDir: act && act.scroll ? act.dir : 0, scrollFlights, spot: !!(act && act.spot) });
        if (window.__pixelBugDebug) window.__pixelBugDebug = { compose, PAL, GW, GH, SKINS: Object.keys(SKINS) };

        // Warm the flight frames so the first airborne frame doesn't pay for composing them
        for (const f of [1, 2]) compose({ skin: skinKey, legs: 'tuck', antL: 'wide', antR: 'wide', fly: f, belly: false, happy: false, lit: false });

        return function start() {
            const now = performance.now();
            vw = window.innerWidth;
            vh = window.innerHeight;
            live = true;
            last = now;
            lastActive = now;
            scrollArmed = 0;
            // Lands in the lower third, on the side it came in from
            const fromLeft = Math.random() < 0.5;
            const p1 = {
                x: Math.max(90, Math.min(vw - 90, vw * (fromLeft ? 0.26 : 0.74))),
                y: Math.max(90, Math.min(vh - 70, vh * 0.8)),
            };
            if (reduced) {
                x = p1.x;
                y = p1.y;
                heading = -Math.PI / 2;
                entered = true;
                announce(skin.welcome, now);
            } else {
                const p0 = { x: fromLeft ? -70 : vw + 70, y: -70 };
                const c = { x: p1.x + (fromLeft ? 1 : -1) * vw * 0.14, y: vh * 0.3 };
                act = { type: 'fly', phase: 'entry', t0: now, p0, c, p1, pts: [], i: 0 };
                x = p0.x;
                y = p0.y;
                heading = Math.atan2(c.y - p0.y, c.x - p0.x);
                lift = 1;
                state = 'fly';
            }
            loop(now);
        };
    }

    // Hands over the instant the intro does: is-loaded on the body AND the AP loader canvas gone.
    // The AP loader fires intro-complete while its own canvas is still playing on top, so its class/style is watched too.
    let start = null, started = false, watcher = null;
    function build() {
        if (!start && doc.body) start = mount();
    }
    function ready() {
        if (started || !doc.body) return;
        const intro = doc.getElementById('apIntro');
        const introOn = intro && intro.isConnected && !intro.classList.contains('is-done') && intro.style.display !== 'none';
        if (intro && watcher && !intro._pbWatched) {
            intro._pbWatched = true;
            watcher.observe(intro, { attributes: true, attributeFilter: ['class', 'style'] });
        }
        if (intro && (!doc.body.classList.contains('is-loaded') || introOn)) return;
        started = true;
        if (watcher) watcher.disconnect();
        window.removeEventListener('intro-complete', ready);
        build();
        start();
    }
    function boot() {
        watcher = new MutationObserver(ready);
        watcher.observe(doc.body, { attributes: true, attributeFilter: ['class'], childList: true });
        window.addEventListener('intro-complete', ready);
        ready();
        if (!started) (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(build);
    }
    if (doc.body) boot();
    else doc.addEventListener('DOMContentLoaded', boot, { once: true });
})();
