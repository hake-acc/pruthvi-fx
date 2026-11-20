// Contact page: a calendar week on signature yellow that refines into a slot mosaic, books "YOUR MOVE" glyph by glyph, coarsens back to a week and plays the reel's dance at its own 30 fps. During the dance every
// sub-column is a stack of real meetings: runs of same-colour slots are matched frame to frame and their edges glide at
// display rate, so the meetings themselves stretch, slide, split and merge into the dancer. The dance ends on a held
// pose on a downbeat; a rising line then cancels it into free time and the grid coarsens into the ordinary week. One
// 16-bar cycle locked to the soundtrack loop. The cursor ink lives in calendar-grain.js; the invite card and its booth
// in calendar-invite.js. The cycle holds on the week until the sound gate is answered, so the first beat is the first frame.
(() => {
    'use strict';

    // Must equal scratch/calendar/v11/loop16.json: 1236222 samples at 44.1 kHz, 16 bars of 4 beats starting on the
    // source's bar 79 downbeat (an instrumental phrase). The loop is four like 4-bar phrases, so every beat below keeps
    // its place in the phrase.
    const LOOP = 1236222 / 44100;
    const AUDIO_PAD = 0.5;
    const BEAT = LOOP / 64;
    const STEP = BEAT / 8; // a 32nd note: the pace of the resolution steps
    const beat = (n) => n * BEAT;
    const DANCE_FPS = 30;
    const GLYPH_BEATS = [2, 2.5, 3, 3.5, 6, 6.5, 7, 8]; // Y O U R   M O V E
    const NG = GLYPH_BEATS.length;
    const DISSOLVE_STEPS = 8; // sixteenth notes
    // The dance file's last frame is its final pose and lands on beat 56, a bar's downbeat; it holds there until the
    // rising line takes it on beat 58 and the week returns on the last bar's downbeat
    const T = {
        refine: beat(1), empty: beat(1) + 3 * STEP, text: beat(GLYPH_BEATS[0]), textFull: beat(GLYPH_BEATS[NG - 1]),
        coarsen: beat(11.5), coarse: beat(11.5) + 3 * STEP, dance: beat(13), refine3: beat(16), refine5: beat(16.5),
        sub7: beat(17), fine: beat(17.5), dissolve: beat(58), outro: beat(60), week: beat(60) + 3 * STEP,
    };
    const GLYPH_T = new Float64Array(GLYPH_BEATS.map(beat));

    // Google Calendar event colours, in the order of PALETTE in scratch/calendar/reel-build.py: the dance file is
    // mapped onto these by nearest colour, then drawn in PALETTE
    const SRC = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
        '#d50000', '#f4511e', '#f6bf26', '#e67c73'];
    // Free time is the signature yellow and the booked glyphs a deep ochre of it; every other colour is the source's own
    const PALETTE = ['#ffed29', ...SRC.slice(1), '#b8860b'];
    const NP = PALETTE.length;
    const FIELD = 0, OCHRE = NP - 1;
    const COL = { field: 0, basil: 1, graphite: 2, lavender: 5, blueberry: 7, peacock: 8, tomato: 9, tangerine: 10, banana: 11, flamingo: 12 };
    const GAP_BG = '#fff7cf';
    const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const DARK_INK = PALETTE.map((h) => { const [r, g, b] = rgbOf(h); return 0.299 * r + 0.587 * g + 0.114 * b > 125; });
    // light ink, dark ink, a quiet ochre for free time so the meetings read first, and umber on the ochre glyphs
    const INK = ['rgba(255,255,255,0.9)', 'rgba(32,33,36,0.78)', 'rgba(122,92,0,0.5)', 'rgba(64,44,0,0.88)'];
    const NI = INK.length;
    const inkOf = (v) => (v === FIELD ? 2 : v === OCHRE ? 3 : DARK_INK[v] ? 1 : 0);

    const SUB = 7; // sub-columns per day at full resolution

    // [day, start, minutes, title, colour]
    const EVENTS = [
        [0, '6:30', 60, 'Run', 'field'], [0, '8:00', 60, 'Sync', 'field'], [0, '9:00', 150, 'Focus Time', 'field'],
        [0, '11:30', 60, 'Lunch', 'field'], [0, '13:00', 150, 'Design Review', 'field'], [0, '16:00', 120, 'All Hands', 'field'],
        [0, '18:30', 90, 'Dinner w/ Sam', 'flamingo'],
        [1, '7:00', 60, 'Gym', 'field'], [1, '8:00', 120, 'Focus Time', 'field'], [1, '10:00', 105, 'Sync', 'field'],
        [1, '12:00', 105, 'Design Review', 'field'], [1, '14:00', 90, 'Lunch & Learn', 'field'], [1, '15:45', 135, '1:1', 'field'],
        [1, '18:00', 60, 'Side Project', 'blueberry'], [1, '19:30', 90, 'Climbing', 'field'],
        [2, '8:00', 90, 'Weekly', 'basil'], [2, '9:30', 30, 'Q3 Planning', 'tomato'], [2, '10:30', 30, 'Office Hours', 'banana'],
        [2, '11:00', 30, 'Hiring Sync', 'basil'], [2, '11:30', 30, 'Design Review', 'tomato'], [2, '12:00', 150, 'Deep Work', 'field'],
        [2, '14:30', 90, 'Retro', 'field'], [2, '16:00', 120, 'Code Review', 'field'], [2, '18:30', 60, 'Groceries', 'graphite'],
        [3, '6:00', 60, 'Run', 'field'], [3, '8:00', 105, 'Q3 Planning', 'basil'], [3, '9:45', 30, 'Coffee Chat', 'banana'],
        [3, '12:15', 60, 'Lunch', 'basil'], [3, '13:15', 30, 'All Hands', 'peacock'], [3, '13:45', 30, 'Product Review', 'lavender'],
        [3, '14:15', 30, 'Standup', 'blueberry'], [3, '14:45', 30, '1:1', 'basil'], [3, '15:15', 30, 'Bday cake', 'banana'],
        [3, '16:30', 30, 'Space Time', 'tangerine'], [3, '17:00', 75, 'Deep Work', 'field'], [3, '19:00', 120, 'Movie night', 'lavender'],
        [4, '7:00', 60, 'Gym', 'field'], [4, '8:00', 150, 'Planning', 'field'], [4, '10:30', 30, 'Lunch', 'basil'],
        [4, '11:00', 120, 'Focus Time', 'blueberry'], [4, '13:00', 30, '1:1', 'lavender'], [4, '13:30', 60, 'Sync', 'blueberry'],
        [4, '14:30', 60, 'Code Review', 'graphite'], [4, '15:30', 60, 'Standup', 'blueberry'], [4, '16:30', 90, 'Design Crit', 'basil'],
        [4, '18:30', 90, 'Band practice', 'tangerine'],
        [5, '8:00', 75, '1:1', 'field'], [5, '9:15', 105, 'Career Chat', 'field'], [5, '11:00', 90, '1:1', 'blueberry'],
        [5, '12:30', 30, 'Lunch', 'graphite'], [5, '13:00', 30, 'Focus Time', 'blueberry'], [5, '13:30', 120, 'All Hands', 'graphite'],
        [5, '15:30', 60, 'Q3 Planning', 'basil'], [5, '16:30', 30, 'Focus Time', 'graphite'], [5, '17:00', 30, 'All Hands', 'basil'],
        [5, '17:30', 30, 'Design Review', 'graphite'], [5, '19:00', 120, 'Drinks', 'field'],
        [6, '7:00', 60, 'Run', 'field'], [6, '8:00', 120, 'Gym', 'field'], [6, '10:00', 120, '1:1', 'field'], [6, '12:00', 150, 'All Hands', 'field'],
        [6, '14:30', 60, 'Deep Work', 'field'], [6, '15:30', 30, 'Cloud Time', 'basil'], [6, '16:00', 90, 'Mentoring', 'field'],
        [6, '18:00', 120, 'Family dinner', 'flamingo'],
    ].map(([day, start, min, title, colour]) => {
        const [h, m] = start.split(':').map(Number);
        const s = (h * 60 + m) / 15;
        return { day, s, e: s + min / 15, title, c: COL[colour] };
    });
    const FILLERS = ['Hold', 'Prep', 'Email', 'Busy', 'Read', 'Notes'];
    // Mosaic titles: whole on day-wide events, truncated to a few letters on the slot grid
    const TITLES = ['Sync', 'Focus Time', 'Lunch', '1:1', 'Standup', 'Design Review', 'Q3 Planning', 'All Hands', 'Code Review',
        'Retro', 'Deep Work', 'Coffee Chat', 'Hiring Sync', 'Office Hours', 'Planning', 'Gym', 'Weekly', 'Product Review',
        'Mentoring', 'Team Lunch', 'Demo', 'Email', 'Notes', 'Prep'];
    // Titles of the meetings that spell the glyphs
    const PINGS = ['Your turn', 'Ping', 'RSVP', 'Slot open', 'Hi?', 'Your call', 'Make a move'];
    const NAMES = TITLES.concat(PINGS);
    const PING0 = TITLES.length;

    // 5x7 bitmap glyphs: '#' is one glyph pixel, booked as one sub-column by G.textPu row units
    const GLYPHS = {
        Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
        O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
        U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
        R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
        M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
        V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
        E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    };
    const LINES = ['YOUR', 'MOVE'];
    const LINE_GAP = 2; // glyph pixels between lines
    const lineWidth = (s) => [...s].reduce((w, ch, i) => w + GLYPHS[ch][0].length + (i ? 1 : 0), 0);
    const TEXT_W = Math.max(...LINES.map(lineWidth)), TEXT_H = LINES.length * 7 + (LINES.length - 1) * LINE_GAP;

    // Rows are counted in 7.5-minute units (U per hour). Resolution levels: S sub-columns per day, q units per cell.
    const U = 8;
    const LV = [
        { S: 7, q: 2 }, // 0 the reel's grid: 15-minute slots
        { S: 5, q: 2 }, // 1
        { S: 3, q: 4 }, // 2
        { S: 2, q: 8 }, // 3 hour-merged
        { S: 1, q: 8 }, // 4 one column per day, hour cells
        { S: 1, q: 2 }, // 5 one column per day, 15-minute slices
        { S: 3, q: 2 }, // 6
        { S: 7, q: 2 }, // 7 the dance at full clarity: sub-columns per day set in layout() to keep the reel's cell shape
        { S: 5, q: 2 }, // 8 the text: set in layout() so a glyph pixel is near square
    ];
    const TEXT_LV = 8;
    // Dance frames live on the reel's grid (7 sub-columns/day, 15-minute slots), glyphs on the text level; levels vote
    // over whichever is showing
    const REEL_SC = 7, REEL_SQ = 2, MAX_SD = 12, MAX_S = MAX_SD;
    const M_WEEK = 0, M_EMPTY = 1, M_TEXT = 2, M_DANCE = 3, M_WEEKGRID = 4;
    // Same-colour runs at most this many rows apart are the same meeting moving, not a new one
    const MATCH_GAP = 1;
    const UNDER = 16; // tween flag: a meeting being overwritten, drawn beneath the rest
    const BACKING = 32; // tween flag: static fill under moving meetings, without gaps or title

    const canvas = document.getElementById('gcCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const timesEl = document.getElementById('gcTimes');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const grain = window.CalendarGrain && CalendarGrain.enabled ? CalendarGrain : null;

    let G = null;          // layout
    let dance = null;      // { w, h, n, frames: Uint8Array(n*w*h) } in PALETTE indices
    let lastKey = -1, lastT = -1;
    // null: held on the week until the gate is answered; then the wall clock stands in until the audio clock runs
    let wallStart = null;
    let lastRaw = -Infinity;

    // India keeps one offset all year
    const IST_MS = 5.5 * 3600e3;
    let today = 1, nowHour = 12.5;
    function readNow() {
        const d = new Date(Date.now() + IST_MS);
        today = d.getUTCDay();
        nowHour = d.getUTCHours() + d.getUTCMinutes() / 60;
    }

    // ---------------------------------------------------------------- layout
    function layout() {
        const vw = window.innerWidth, vh = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const mobile = vw < 700;
        const gh = vh;
        // The reel's 10 hours, so its dance frames land on our slots row for row
        const hours = 10, startHour = 8;
        const R = hours * U, unitH = gh / R, slotH = unitH * 2;

        let th = '';
        for (let h = 1; h < hours; h++) {
            const hh = startHour + h;
            th += `<div class="gc-time" style="top:${(h * 4 * slotH).toFixed(2)}px">${((hh + 11) % 12) + 1} ${hh < 12 ? 'AM' : 'PM'}</div>`;
        }
        timesEl.innerHTML = th;
        // The time column is exactly as wide as its widest label plus its padding and hairline
        const tcs = getComputedStyle(timesEl);
        let labelW = 0;
        for (const el of timesEl.children) labelW = Math.max(labelW, el.getBoundingClientRect().width);
        const gutter = Math.ceil(labelW + parseFloat(tcs.paddingLeft) + parseFloat(tcs.paddingRight) + parseFloat(tcs.borderRightWidth));
        const gw = vw - gutter, pitch = gw / (7 * SUB), dayW = gw / 7;
        // Reel cells are 1.09 as wide as tall; portrait screens trade some of that for showing more of the dancer
        const sd = Math.max(4, Math.min(MAX_SD, Math.round(dayW / (slotH * 1.09) * (gw < gh ? 1.9 : 1))));
        const ys = new Int32Array(R + 1);
        for (let r = 0; r <= R; r++) ys[r] = Math.round(r * unitH * dpr);
        const fs = Math.max(7, Math.min(11, Math.round(Math.min(pitch, slotH) * 0.33)));
        G = {
            vw, vh, dpr, mobile, gutter, gw, gh, pitch, hours, startHour, R, unitH, slotH, dayW, ys, fs, sd,
            W: Math.round(vw * dpr), H: Math.round(gh * dpr),
            padX: Math.max(1, Math.round(2.5 * dpr)), padY: Math.max(1, Math.round(2 * dpr)),
            labelH: Math.ceil(fs * 1.3 * dpr),
        };
        // A glyph pixel is one sub-column by pu row units: the tallest pu whose pixel stays near square (5x7 letters
        // at about their bitmap proportions) with the longest line still fitting inside the week
        const minTs = Math.ceil((TEXT_W + 2) / 7);
        let pu = 1, ts = minTs;
        for (const p of [4, 2, 1]) {
            const s = Math.max(minTs, Math.min(MAX_SD, Math.round(dayW / (p * unitH))));
            const ar = (dayW / s) / (p * unitH);
            if (TEXT_H * p <= R && (ar >= 0.82 || p === 1)) { pu = p; ts = s; break; }
        }
        G.textPu = pu;
        G.levels = LV.map((lv, i) => buildLevel(i === 7 ? { S: sd, q: 2 } : i === TEXT_LV ? { S: ts, q: Math.min(2, pu) } : lv, i));
        // Dance refine steps (1 -> 3 -> 5 -> 7 sub-columns, then the finest) skip any that would not be coarser
        G.danceLv = [5, 6, 1, 0, 7].map((l) => (l !== 7 && LV[l].S >= sd ? 7 : l));

        canvas.width = G.W;
        canvas.height = G.H;
        canvas.style.width = vw + 'px';
        canvas.style.height = gh + 'px';
        const root = document.documentElement.style;
        root.setProperty('--gc-gutter', gutter + 'px');
        if (grain) grain.layout({ canvas, x0: G.levels[0].xs[0], W: G.W, H: G.H, vw, vh: gh, dpr });

        const cells = 7 * MAX_S * R, cols = 7 * MAX_S;
        G.evC = new Uint8Array(cells); G.evX = new Int32Array(cells); G.evY = new Int32Array(cells);
        G.evW = new Int32Array(cells); G.evH = new Int32Array(cells); G.evT = new Uint8Array(cells); G.evR = new Uint8Array(cells);
        G.order = new Uint16Array(cells); G.bucket = new Uint16Array(NP + 1);
        G.cellCol = new Uint8Array(cells); G.cellKey = new Int16Array(cells);
        G.colA = new Uint8Array(cells); G.keyA = new Int16Array(cells);
        G.colB = new Uint8Array(cells); G.keyB = new Int16Array(cells);
        G.fine = new Uint8Array(cells); G.fineFrame = -1;
        G.votes = new Uint16Array(NP);
        G.runA = makeRuns(cells, cols); G.runB = makeRuns(cells, cols);
        const P = cells * 4;
        G.tw = {
            n: 0, under: 0, c: new Uint8Array(P), x: new Int32Array(P), w: new Int32Array(P),
            t0: new Float32Array(P), b0: new Float32Array(P), t1: new Float32Array(P), b1: new Float32Array(P),
            f: new Uint8Array(P), ti: new Uint8Array(P), o: new Float32Array(P),
            y0: new Float32Array(P), y1: new Float32Array(P), jt: new Float32Array(P), jb: new Float32Array(P),
            order: new Uint32Array(P), bucket: new Uint32Array(2 * NP + 1),
        };
        G.uf = new Int16Array(2 * R + 2); G.ufDone = new Uint8Array(2 * R + 2);
        G.compA = new Int16Array(R + 1); G.compB = new Int16Array(R + 1);
        G.field = document.createElement('canvas');
        G.field.width = G.W; G.field.height = G.H;
        G.fieldCtx = G.field.getContext('2d', { alpha: false });
        G.fieldLv = -1;

        buildWeek();
        buildGlyphs();
        buildSampler();
        buildAtlas();
        G.weekCache = null;
        lastKey = -1;
    }

    function makeRuns(n, cols) {
        return { top: new Uint8Array(n), bot: new Uint8Array(n), col: new Uint8Array(n), start: new Int32Array(cols + 1) };
    }

    // Column edges, gaps, and free-time event breaks (random lengths up to 2 hours, realigned every 2 hours)
    function buildLevel({ S, q }, li) {
        const { gutter, dayW, dpr, R, startHour, unitH } = G;
        const C = 7 * S, Rq = R / q;
        const xs = new Int32Array(C + 1);
        for (let k = 0; k <= C; k++) xs[k] = Math.round((gutter + (Math.floor(k / S) + (k % S) / S) * dayW) * dpr);
        const colW = dayW / Math.max(S, SUB) * dpr;
        const gx = Math.max(1, Math.round(colW * 0.11)), gy = Math.max(1, Math.round(Math.min(q, 2) * unitH * dpr * 0.1));
        let seed = 97 + li * 131;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const brkField = new Uint8Array(C * Rq), brkInk = new Uint8Array(C * Rq);
        const fineInk = q <= 2 && S >= 5;
        for (let c = 0; c < C; c++) {
            for (let r = 0; r < Rq; r++) {
                const unit = startHour * U + r * q;
                if (unit % (2 * U) === 0 || r === 0) {
                    brkField[c * Rq + r] = 1;
                    brkInk[c * Rq + r] = 1;
                    let len = 1;
                    while (r + len < Rq && (startHour * U + (r + len) * q) % (2 * U)) len++;
                    if (len > 1) {
                        const cuts = len >= 12 ? 2 + (rand() < 0.5 ? 1 : 0) : len >= 6 ? 1 + (rand() < 0.4 ? 1 : 0) : rand() < 0.6 ? 1 : 0;
                        for (let k = 0; k < cuts; k++) brkField[c * Rq + r + 1 + Math.floor(rand() * (len - 1))] = 1;
                    }
                }
                // booked cells run at most 30 minutes on the reel's grid, 15 on the finest
                if (fineInk && ((q === 1 ? unit : unit >> 1) + c) % 2 === 0) brkInk[c * Rq + r] = 1;
            }
        }
        const labelW = Math.max(1, Math.floor(dayW * dpr / S) - gx - G.padX);
        return { S, q, C, Rq, xs, gx, gy, cr: colW >= 24 ? 2 : 1, brkField, brkInk, labelW };
    }

    // The ordinary week: events plus free-time fillers so every slot in view is booked
    function buildWeek() {
        const { R, startHour } = G;
        const lo = startHour * 4, hi = lo + R / 2;
        const list = [];
        let fill = 0;
        for (let d = 0; d < 7; d++) {
            const day = EVENTS.filter((e) => e.day === d && e.e > lo && e.s < hi).sort((a, b) => a.s - b.s);
            let at = lo;
            for (const e of day) {
                if (e.s > at) list.push({ day: d, s: at, e: e.s, title: FILLERS[fill++ % FILLERS.length], c: FIELD });
                list.push(e);
                at = Math.max(at, e.e);
            }
            if (at < hi) list.push({ day: d, s: at, e: hi, title: FILLERS[fill++ % FILLERS.length], c: FIELD });
        }
        const id = new Int16Array(7 * R);
        list.forEach((e, i) => {
            for (let s = Math.max(lo, e.s); s < Math.min(hi, e.e); s++) {
                id[e.day * R + (s - lo) * 2] = i;
                id[e.day * R + (s - lo) * 2 + 1] = i;
            }
        });
        G.week = list;
        G.weekId = id;
        G.weekCol = Uint8Array.from(list, (e) => e.c);
    }

    function buildGlyphs() {
        const lv = G.levels[TEXT_LV], C = lv.C, R = G.R / lv.q, k = G.textPu / lv.q;
        let y = Math.floor((G.R / G.textPu - TEXT_H) / 2) * k;
        const glyph = new Uint8Array(C * R);
        let n = 0;
        for (const line of LINES) {
            let x = Math.round((C - lineWidth(line)) / 2);
            [...line].forEach((ch, i) => {
                if (i) x++;
                const g = GLYPHS[ch];
                n++;
                for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < g[0].length; gx++) {
                    if (g[gy][gx] !== '#') continue;
                    for (let j = 0; j < k; j++) {
                        const c = x + gx, r = y + gy * k + j;
                        if (c >= 0 && c < C && r >= 0 && r < R) glyph[c * R + r] = n;
                    }
                }
                x += g[0].length;
            });
            y += (7 + LINE_GAP) * k;
        }
        G.glyph = glyph;
    }

    // Dance frames are reel cells (49 x 40): rows map onto our slots, and the finest level shows the 49 reel columns
    // one to one, centred (or, when it has fewer columns, in a window that follows the dancer)
    function buildSampler() {
        G.samples = null;
        if (!dance) return;
        const FR = G.R / REEL_SQ, srow = new Int32Array(FR);
        for (let r = 0; r < FR; r++) srow[r] = Math.min(dance.h - 1, Math.floor(r * dance.h / FR)) * dance.w;
        const lv = G.levels[7], C = lv.C, W = dance.w;
        const off = C >= W ? Math.floor((W - C) / 2) : 0;
        const map = new Int32Array(C * FR);
        for (let c = 0; c < C; c++) for (let r = 0; r < FR; r++) {
            const u = c + off;
            map[c * FR + r] = u < 0 || u >= W ? -1 : u * FR + r;
        }
        lv.map = map;
        lv.shift = new Int32Array(dance.n);
        if (C < W) for (let f = 0; f < dance.n; f++) lv.shift[f] = Math.max(0, Math.min(W - C, Math.round(dance.cx[f] - C / 2))) * FR;
        G.samples = srow;
        G.fineFrame = -1;
    }

    // Title sprites (three inks) and start-time sprites for every slot, at the widest event width; narrower events blit
    // a left-aligned slice, so the mosaic never calls fillText per frame
    function buildAtlas() {
        const { labelH, fs, dpr, padX, R, startHour } = G;
        const atlas = document.createElement('canvas');
        atlas.width = Math.max(...G.levels.map((l) => l.labelW));
        const names = NAMES;
        atlas.height = (names.length + R / 2) * NI * labelH;
        const a = atlas.getContext('2d');
        a.textBaseline = 'top';
        const dy = Math.round(0.1 * fs * dpr);
        a.font = `500 ${fs * dpr}px Roboto, Arial, sans-serif`;
        names.forEach((t, i) => {
            for (let ink = 0; ink < NI; ink++) { a.fillStyle = INK[ink]; a.fillText(t, 0, (i * NI + ink) * labelH + dy); }
        });
        a.font = `400 ${fs * dpr}px Roboto, Arial, sans-serif`;
        for (let r = 0; r < R / 2; r++) {
            const min = (startHour * 4 + r) * 15, h = Math.floor(min / 60);
            const t = ((h + 11) % 12) + 1 + ':' + String(min % 60).padStart(2, '0') + (h < 12 ? ' AM' : ' PM');
            for (let ink = 0; ink < NI; ink++) { a.fillStyle = INK[ink]; a.fillText(t, 0, ((names.length + r) * NI + ink) * labelH + dy); }
        }
        G.atlas = atlas;
        G.minLabelW = Math.round(8 * dpr) - padX;
        G.fieldLv = -1;
    }

    // ---------------------------------------------------------------- content
    function danceFine(f) {
        G.fineSC = REEL_SC; G.fineSQ = REEL_SQ; G.fineRows = G.R / REEL_SQ;
        if (G.fineFrame === f) return;
        const FR = G.fineRows, W = dance.w, srow = G.samples, out = G.fine, fr = dance.frames, base = f * W * dance.h;
        for (let c = 0; c < W; c++) for (let r = 0; r < FR; r++) out[c * FR + r] = fr[base + srow[r] + c];
        G.fineFrame = f;
    }

    function textFine(g) {
        const lv = G.levels[TEXT_LV];
        G.fineSC = lv.S; G.fineSQ = lv.q; G.fineRows = G.R / lv.q;
        if (G.fineFrame === -2 - g) return;
        const n = lv.C * G.fineRows, glyph = G.glyph, out = G.fine;
        for (let i = 0; i < n; i++) out[i] = glyph[i] && glyph[i] <= g ? OCHRE : FIELD;
        G.fineFrame = -2 - g;
    }

    // Cell colours and merge keys for one level; content cells vote into coarser level cells
    function fillCells(lv, mode, col, key, sh) {
        const { R } = G;
        const { C, Rq, q, S } = lv;
        const fine = G.fine, votes = G.votes;
        const SC = G.fineSC, SQ = G.fineSQ, FR = G.fineRows, direct = S === SC && q === SQ;
        if (mode === M_DANCE && lv.map) {
            const map = lv.map;
            for (let i = 0; i < C * Rq; i++) col[i] = key[i] = map[i] < 0 ? FIELD : fine[map[i] + sh];
            return;
        }
        for (let c = 0; c < C; c++) {
            const d = Math.floor(c / S), s = c % S;
            const f0 = d * SC + Math.floor(s * SC / S), f1 = Math.max(f0 + 1, d * SC + Math.floor((s + 1) * SC / S));
            for (let r = 0; r < Rq; r++) {
                const i = c * Rq + r;
                if (mode === M_WEEKGRID) {
                    const id = G.weekId[d * R + r * q];
                    col[i] = G.weekCol[id]; key[i] = id;
                } else if (mode === M_EMPTY) {
                    col[i] = FIELD; key[i] = FIELD;
                } else if (direct) {
                    col[i] = key[i] = fine[c * FR + r];
                } else {
                    const r0 = Math.floor(r * q / SQ), r1 = Math.max(r0 + 1, Math.floor((r + 1) * q / SQ));
                    votes.fill(0);
                    for (let fc = f0; fc < f1; fc++) for (let fr = r0; fr < r1; fr++) {
                        const v = fine[fc * FR + fr];
                        votes[v] += v === FIELD ? 7 : 10;
                    }
                    let best = 0;
                    for (let v = 1; v < NP; v++) if (votes[v] > votes[best]) best = v;
                    col[i] = key[i] = best;
                }
            }
        }
    }

    // ---------------------------------------------------------------- moving meetings
    // Every vertical run of one booked colour in a sub-column is one meeting
    function extractRuns(lv, col, runs) {
        const { C, Rq } = lv;
        const top = runs.top, bot = runs.bot, rc = runs.col, start = runs.start;
        let n = 0;
        for (let c = 0; c < C; c++) {
            start[c] = n;
            const base = c * Rq;
            let r = 0;
            while (r < Rq) {
                const v = col[base + r];
                let e = r + 1;
                while (e < Rq && col[base + e] === v) e++;
                if (v !== FIELD) { top[n] = r; bot[n] = e; rc[n] = v; n++; }
                r = e;
            }
        }
        start[C] = n;
    }

    function ufFind(k) {
        const p = G.uf;
        while (p[k] !== k) { p[k] = p[p[k]]; k = p[k]; }
        return k;
    }

    // Meetings of frame A become meetings of frame B. Same-colour runs that overlap (or nearly touch) form one group;
    // the group's total length in A is mapped monotonically onto its total length in B, cut at every run boundary of
    // either frame, so a split, a merge or a plain stretch are all the same continuous motion. Pieces that belong to
    // one meeting carry join flags so the gap between them opens or closes with the motion instead of popping.
    // Unmatched runs grow from (or shrink into) their own centre, their gaps opening (closing) with them. Flags: 1/2 top
    // joined at A/B, 4/8 bottom joined.
    let emitLv = null;
    function emit(c, v, t0, b0, t1, b1, f) {
        const tw = G.tw, m = tw.n, xs = emitLv.xs, gx = emitLv.gx;
        tw.c[m] = v; tw.x[m] = xs[c] + gx - (gx >> 1); tw.w[m] = xs[c + 1] - xs[c] - gx;
        tw.t0[m] = t0; tw.b0[m] = b0; tw.t1[m] = t1; tw.b1[m] = b1; tw.f[m] = f;
        tw.ti[m] = v === OCHRE ? PING0 + (c * 3 + Math.floor(t0) * 5) % PINGS.length : (c * 7 + v * 5) % TITLES.length;
        tw.o[m] = (((c * 2654435761) ^ (v * 40503)) >>> 0) % 997 / 997;
        tw.n = m + 1;
    }

    function buildTweens(lv, A, B) {
        const { C } = lv;
        const tw = G.tw, uf = G.uf, done = G.ufDone, cA = G.compA, cB = G.compB;
        emitLv = lv;
        tw.n = 0;
        for (let c = 0; c < C; c++) {
            const a0 = A.start[c], na = A.start[c + 1] - a0, b0 = B.start[c], nb = B.start[c + 1] - b0;
            const nn = na + nb;
            // where the slot is booked in both frames, the old meeting backs the motion so it never cracks to free time
            for (let i = 0; i < na; i++) {
                const at = A.top[a0 + i], ab = A.bot[a0 + i];
                for (let j = 0; j < nb; j++) {
                    const lo = Math.max(at, B.top[b0 + j]), hi = Math.min(ab, B.bot[b0 + j]);
                    if (hi > lo) emit(c, A.col[a0 + i], lo, hi, lo, hi, 15 | UNDER | BACKING);
                }
            }
            for (let k = 0; k < nn; k++) { uf[k] = k; done[k] = 0; }
            for (let i = 0; i < na; i++) {
                const at = A.top[a0 + i], ab = A.bot[a0 + i], av = A.col[a0 + i];
                for (let j = 0; j < nb; j++) {
                    if (B.col[b0 + j] !== av) continue;
                    const bt = B.top[b0 + j], bb = B.bot[b0 + j];
                    if (Math.max(at, bt) - Math.min(ab, bb) > MATCH_GAP) continue;
                    const ra = ufFind(i), rb = ufFind(na + j);
                    if (ra !== rb) uf[ra] = rb;
                }
            }
            for (let k = 0; k < nn; k++) {
                const root = ufFind(k);
                if (done[root]) continue;
                done[root] = 1;
                let nA = 0, nB = 0, totA = 0, totB = 0;
                for (let i = 0; i < na; i++) if (ufFind(i) === root) { cA[nA++] = a0 + i; totA += A.bot[a0 + i] - A.top[a0 + i]; }
                for (let j = 0; j < nb; j++) if (ufFind(na + j) === root) { cB[nB++] = b0 + j; totB += B.bot[b0 + j] - B.top[b0 + j]; }
                if (!nB) {
                    for (let i = 0; i < nA; i++) {
                        const t = A.top[cA[i]], b = A.bot[cA[i]];
                        // overwritten by other meetings: hold underneath them (retracting only to what they will
                        // cover) so the newcomers wipe over it instead of both halving and opening holes
                        let lo = b, hi = t;
                        for (let j = 0; j < nb; j++) {
                            const bt = B.top[b0 + j], bb = B.bot[b0 + j];
                            if (bt < b && bb > t) { lo = Math.min(lo, Math.max(t, bt)); hi = Math.max(hi, Math.min(b, bb)); }
                        }
                        if (hi > lo) emit(c, A.col[cA[i]], t, b, lo, hi, UNDER);
                        else emit(c, A.col[cA[i]], t, b, (t + b) / 2, (t + b) / 2, 2 | 8);
                    }
                    continue;
                }
                if (!nA) {
                    for (let j = 0; j < nB; j++) {
                        const t = B.top[cB[j]], b = B.bot[cB[j]], mid = (t + b) / 2;
                        emit(c, B.col[cB[j]], mid, mid, t, b, 1 | 4);
                    }
                    continue;
                }
                const v = A.col[cA[0]];
                let i = 0, j = 0, ca = 0, cb = 0, s = 0;
                while (i < nA && j < nB) {
                    const ai = cA[i], bj = cB[j];
                    const la = A.bot[ai] - A.top[ai], lb = B.bot[bj] - B.top[bj];
                    const endA = (ca + la) / totA, endB = (cb + lb) / totB;
                    const s1 = Math.min(endA, endB);
                    if (s1 - s > 1e-6) {
                        const f = (s > ca / totA + 1e-6 ? 1 : 0) | (s > cb / totB + 1e-6 ? 2 : 0)
                            | (s1 < endA - 1e-6 ? 4 : 0) | (s1 < endB - 1e-6 ? 8 : 0);
                        emit(c, v,
                            A.top[ai] + s * totA - ca, A.top[ai] + s1 * totA - ca,
                            B.top[bj] + s * totB - cb, B.top[bj] + s1 * totB - cb, f);
                    }
                    if (endA <= s1 + 1e-6) { ca += la; i++; }
                    if (endB <= s1 + 1e-6) { cb += lb; j++; }
                    s = s1;
                }
            }
        }
        const m = tw.n;
        // counting sort by layer then colour: held meetings first, and each fill colour set once per layer
        const bucket = tw.bucket, order = tw.order, F = tw.f, Cc = tw.c;
        bucket.fill(0);
        for (let k = 0; k < m; k++) bucket[(F[k] & UNDER ? 0 : NP) + Cc[k] + 1]++;
        for (let v = 0; v < 2 * NP; v++) bucket[v + 1] += bucket[v];
        tw.under = bucket[NP];
        for (let k = 0; k < m; k++) order[bucket[(F[k] & UNDER ? 0 : NP) + Cc[k]]++] = k;
    }

    // e: progress through the step (0 = frame A, 1 = frame B). dis: dissolve progress 0..1, or -1 when not dissolving.
    // The free-time mosaic underneath is a cached image; meetings punch their own gap into it and draw on top.
    function drawPieces(lv, e, dis) {
        const tw = G.tw, n = tw.n, rowPx = lv.q * G.unitH * G.dpr;
        const gya = lv.gy >> 1, gyb = lv.gy - gya, cr = lv.cr;
        const Y0 = tw.y0, Y1 = tw.y1, JT = tw.jt, JB = tw.jb, F = tw.f, X = tw.x, Wd = tw.w;
        const jitter = rowPx * 3, retract = rowPx * 2.5;
        const line = dis < 0 ? Infinity : G.H + jitter - dis * (G.H + jitter + retract);
        const thin = 1;
        for (let i = 0; i < n; i++) {
            const f = F[i];
            let y0 = (tw.t0[i] + (tw.t1[i] - tw.t0[i]) * e) * rowPx, y1 = (tw.b0[i] + (tw.b1[i] - tw.b0[i]) * e) * rowPx;
            // cancelled once the rising line passes the meeting's top: its bottom edge retracts up into it
            if (dis >= 0) {
                const k = (y0 + tw.o[i] * jitter - line) / retract;
                if (k > 0) y1 -= (y1 - y0) * (k < 1 ? k : 1);
            }
            Y0[i] = y0; Y1[i] = y1;
            JT[i] = (f & 1 ? 0 : 1 - e) + (f & 2 ? 0 : e);
            JB[i] = (f & 4 ? 0 : 1 - e) + (f & 8 ? 0 : e);
        }
        // two layers (meetings being overwritten, then the rest), each: gaps punched into the free time, then ink
        const order = tw.order, under = tw.under;
        const fill = (x, y, w, h) => ctx.fillRect(x, y, w, h);
        for (let layer = 0; layer < 2; layer++) {
            const j0 = layer ? under : 0, j1 = layer ? n : under;
            ctx.fillStyle = GAP_BG;
            for (let j = j0; j < j1; j++) {
                const i = order[j];
                if (Y1[i] - Y0[i] < thin || F[i] & BACKING) continue;
                const oy = Math.round(Y0[i] - gya * JT[i]);
                fill(X[i], oy, Wd[i], Math.round(Y1[i] + gyb * JB[i]) - oy);
            }
            let cur = -1;
            for (let j = j0; j < j1; j++) {
                const i = order[j];
                if (Y1[i] - Y0[i] < thin) continue;
                const y = Math.round(Y0[i] + gyb * JT[i]), h = Math.round(Y1[i] - gya * JB[i]) - y;
                if (h < 1) continue;
                if (tw.c[i] !== cur) { cur = tw.c[i]; ctx.fillStyle = PALETTE[cur]; }
                const x = X[i], w = Wd[i];
                if (JT[i] < 0.5 || JB[i] < 0.5 || w <= cr * 2 || h <= cr * 2) { fill(x, y, w, h); continue; }
                fill(x + cr, y, w - cr * 2, h);
                fill(x, y + cr, w, h - cr * 2);
                if (cr === 2) fill(x + 1, y + 1, w - 2, h - 2);
            }
        }
        const { labelH, padX, padY, minLabelW } = G, lw = lv.labelW, atlas = G.atlas;
        if (lw >= minLabelW) {
            for (let i = 0; i < n; i++) {
                if (JT[i] < 0.5 || (F[i] & UNDER && e > 0)) continue;
                const y = Math.round(Y0[i] + gyb * JT[i]), h = Math.round(Y1[i] - gya * JB[i]) - y;
                if (h < labelH * 0.8 + padY) continue;
                const sw = Math.min(lw, Wd[i] - padX - 1);
                if (sw <= 0) continue;
                const sh = Math.min(labelH, h - padY);
                ctx.drawImage(atlas, 0, (tw.ti[i] * NI + inkOf(tw.c[i])) * labelH, sw, sh, X[i] + padX, y + padY, sw, sh);
            }
        } else {
            const lineW = Math.max(1, Math.round(G.dpr * 0.75));
            let cur = -1;
            for (let i = 0; i < n; i++) {
                if (JT[i] < 0.5 || (F[i] & UNDER && e > 0)) continue;
                const y = Math.round(Y0[i] + gyb * JT[i]), h = Math.round(Y1[i] - gya * JB[i]) - y;
                if (h < padY * 2 + lineW) continue;
                const ink = inkOf(tw.c[i]);
                if (ink !== cur) { cur = ink; ctx.fillStyle = INK[ink]; }
                ctx.fillRect(X[i] + 1, y + padY, Math.max(1, Math.round(Wd[i] * 0.6)), lineW);
            }
        }
    }

    // ---------------------------------------------------------------- drawing
    function clearGrid(cx) {
        const x0 = G.levels[0].xs[0];
        cx.fillStyle = '#fff';
        cx.fillRect(0, 0, x0, G.H);
        cx.fillStyle = GAP_BG;
        cx.fillRect(x0, 0, G.W - x0, G.H);
    }

    // The empty slot mosaic of one level, cached: the free time every moving meeting sits on
    function drawField(li) {
        if (G.fieldLv !== li) {
            const lv = G.levels[li];
            fillCells(lv, M_EMPTY, G.cellCol, G.cellKey, 0);
            clearGrid(G.fieldCtx);
            drawMosaic(G.fieldCtx, lv, G.cellCol, G.cellKey);
            G.fieldLv = li;
        }
        ctx.drawImage(G.field, 0, 0);
    }

    function drawMosaic(cx, lv, col, key) {
        const { ys, padX, padY, labelH, minLabelW } = G;
        const { C, Rq, q, xs, gx, gy, cr, brkField, brkInk } = lv;
        const EC = G.evC, EX = G.evX, EY = G.evY, EW = G.evW, EH = G.evH, ET = G.evT;
        const gyb = gy - (gy >> 1);
        let n = 0;
        for (let c = 0; c < C; c++) {
            const x = xs[c] + (gx - (gx >> 1)), w = xs[c + 1] - xs[c] - gx;
            let r = 0;
            while (r < Rq) {
                const i0 = c * Rq + r, v = col[i0], k = key[i0], brk = v === FIELD ? brkField : brkInk;
                let e = r + 1;
                while (e < Rq && key[c * Rq + e] === k && !brk[c * Rq + e]) e++;
                const y = ys[r * q] + gyb;
                EC[n] = v; EX[n] = x; EY[n] = y; EW[n] = w;
                EH[n] = ys[e * q] - ys[r * q] - gy - ((e * q + G.startHour * U) % U === 0 && e < Rq ? 1 : 0);
                ET[n] = (c * 7 + r * 13 + k * 5) % TITLES.length;
                G.evR[n] = (r * q) >> 1;
                n++;
                r = e;
            }
        }
        const bucket = G.bucket, order = G.order;
        bucket.fill(0);
        for (let i = 0; i < n; i++) bucket[EC[i] + 1]++;
        for (let v = 0; v < NP; v++) bucket[v + 1] += bucket[v];
        for (let i = 0; i < n; i++) order[bucket[EC[i]]++] = i;
        let cur = -1;
        for (let j = 0; j < n; j++) {
            const i = order[j];
            if (EC[i] !== cur) { cur = EC[i]; cx.fillStyle = PALETTE[cur]; }
            const x = EX[i], y = EY[i], w = EW[i], h = EH[i];
            if (w <= cr * 2 || h <= cr * 2) { cx.fillRect(x, y, w, h); continue; }
            cx.fillRect(x + cr, y, w - cr * 2, h);
            cx.fillRect(x, y + cr, w, h - cr * 2);
            if (cr === 2) cx.fillRect(x + 1, y + 1, w - 2, h - 2);
        }
        const atlas = G.atlas, lw = lv.labelW, ER = G.evR, timeRow = NAMES.length * NI, timed = lv.S <= 3;
        if (lw >= minLabelW) {
            for (let i = 0; i < n; i++) {
                if (EH[i] < labelH * 0.8 + padY) continue;
                const sw = Math.min(lw, EW[i] - padX - 1);
                if (sw <= 0) continue;
                const sh = Math.min(labelH, EH[i] - padY), ink = inkOf(EC[i]);
                cx.drawImage(atlas, 0, (ET[i] * NI + ink) * labelH, sw, sh, EX[i] + padX, EY[i] + padY, sw, sh);
                if (timed && EH[i] >= labelH * 2 + padY) {
                    cx.drawImage(atlas, 0, (timeRow + ER[i] * NI + ink) * labelH, sw, labelH, EX[i] + padX, EY[i] + padY + labelH, sw, labelH);
                }
            }
        } else {
            // too narrow for letters: the title reads as a dash, as it does in the app at this size
            const line = Math.max(1, Math.round(G.dpr * 0.75));
            cur = -1;
            for (let i = 0; i < n; i++) {
                if (EH[i] < padY * 2 + line) continue;
                const ink = inkOf(EC[i]);
                if (ink !== cur) { cur = ink; cx.fillStyle = INK[ink]; }
                cx.fillRect(EX[i] + 1, EY[i] + padY, Math.max(1, Math.round(EW[i] * 0.6)), line);
            }
        }
    }

    // Real time in New Delhi, on today's column, whenever it falls inside the visible hours
    function nowLine() {
        const { dpr, slotH, startHour, hours } = G;
        if (nowHour < startHour || nowHour > startHour + hours) return;
        const y = Math.round((nowHour - startHour) * 4 * slotH * dpr);
        const xs = G.levels[0].xs, x0 = xs[today * SUB], x1 = xs[today * SUB + SUB];
        ctx.fillStyle = '#ea4335';
        ctx.fillRect(x0, y - Math.round(dpr), x1 - x0, Math.max(2, Math.round(2 * dpr)));
        ctx.beginPath();
        ctx.arc(x0, y, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();
    }

    // The ordinary week: whole events with title and time, cached because it is shown on both sides of the loop seam
    function drawWeek() {
        if (!G.weekCache) {
            const off = document.createElement('canvas');
            off.width = G.W; off.height = G.H;
            const c = off.getContext('2d', { alpha: false });
            const { ys, dpr, startHour, R } = G;
            const { xs, gx } = G.levels[4], gy = G.levels[0].gy, lo = startHour * 4;
            clearGrid(c);
            const fs = Math.round((G.mobile ? 9 : 12) * dpr), pad = Math.round((G.mobile ? 2 : 6) * dpr);
            c.textBaseline = 'top';
            for (const ev of G.week) {
                const r0 = Math.max(0, (ev.s - lo) * 2), r1 = Math.min(R, (ev.e - lo) * 2);
                const x = xs[ev.day] + (gx - (gx >> 1)), w = xs[ev.day + 1] - xs[ev.day] - gx;
                const y = ys[r0] + (gy - (gy >> 1)), h = ys[r1] - ys[r0] - gy;
                c.fillStyle = PALETTE[ev.c];
                c.beginPath();
                if (c.roundRect) c.roundRect(x, y, w, h, Math.min(4 * dpr, h / 3)); else c.rect(x, y, w, h);
                c.fill();
                if (h < fs + 2 * dpr) continue;
                c.save();
                c.beginPath();
                c.rect(x, y, w - pad / 2, h);
                c.clip();
                c.fillStyle = INK[inkOf(ev.c)];
                c.font = `500 ${fs}px Roboto, Arial, sans-serif`;
                c.fillText(ev.title, x + pad, y + Math.round(3 * dpr));
                if (h >= fs * 2.6 + 4 * dpr) {
                    c.font = `400 ${fs}px Roboto, Arial, sans-serif`;
                    c.fillText(span(ev.s * 15, ev.e * 15), x + pad, y + Math.round(3 * dpr) + fs * 1.3);
                }
                c.restore();
            }
            G.weekCache = off;
        }
        ctx.drawImage(G.weekCache, 0, 0);
    }

    function clock(min, withSuffix) {
        const h = Math.floor(min / 60) % 24, m = min % 60, h12 = ((h + 11) % 12) + 1;
        return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + (withSuffix ? (h < 12 ? 'am' : 'pm') : '');
    }
    function span(a, b) {
        const sameHalf = (Math.floor(a / 60) < 12) === (Math.floor(b / 60) < 12);
        return clock(a, !sameHalf) + ' – ' + clock(b, true);
    }

    // ---------------------------------------------------------------- timeline
    // A scene is (mode, level, argument), packed into one number so the per-frame check allocates nothing
    let sMode = 0, sLevel = 0, sArg = 0, sDis = 0;
    const stepIn = (t, from) => Math.floor((t - from) / STEP);
    const REFINE = [3, 2, TEXT_LV], COARSEN = [6, 2, 3, 4];

    function scene(t) {
        const ready = dance && G.samples;
        sArg = 0; sDis = 0;
        if (t < T.refine || t >= T.week) { sMode = M_WEEK; sLevel = 0; }
        else if (t < T.empty) { sMode = M_WEEKGRID; sLevel = REFINE[stepIn(t, T.refine)]; }
        else if (t >= T.outro) { sMode = M_WEEKGRID; sLevel = [0, 1, 2][Math.min(2, stepIn(t, T.outro))]; }
        else if (t < T.text) { sMode = M_EMPTY; sLevel = TEXT_LV; }
        else if (t < T.dance || !ready) {
            sMode = M_TEXT;
            let g = 0;
            while (g < NG && GLYPH_T[g] <= t) g++;
            sArg = g;
            sLevel = t < T.coarsen || t >= T.dance ? TEXT_LV : COARSEN[Math.min(3, stepIn(t, T.coarsen))];
        } else {
            sMode = M_DANCE;
            sArg = Math.max(0, Math.floor((t - T.dance) * DANCE_FPS));
            const dl = G.danceLv;
            sLevel = t < T.refine3 ? dl[0] : t < T.refine5 ? dl[1] : t < T.sub7 ? dl[2] : t < T.fine ? dl[3] : dl[4];
            if (t >= T.dissolve) sDis = 1;
        }
        return ((sMode * 10 + sLevel) * 2 + sDis) * 10000 + sArg;
    }

    // The rising line moves one sixteenth of the way per sixteenth note, each move eased out from its downbeat
    function dissolveAt(t) {
        const k = (t - T.dissolve) / (BEAT / 4);
        if (k >= DISSOLVE_STEPS) return 1;
        const s = Math.floor(k), fr = k - s;
        return (s + 1 - (1 - fr) * (1 - fr) * (1 - fr)) / DISSOLVE_STEPS;
    }

    function cycleTime(now, probe) {
        const a = window.CalendarAudio && CalendarAudio.timeAt(now);
        if ((a === null || a === undefined) && wallStart === null) return 0;
        let raw = a !== null && a !== undefined ? a : (now - wallStart) / 1000;
        // the output timestamp jitters by a few ms; never let that step a frame backwards
        if (!probe) {
            if (raw < lastRaw && lastRaw - raw < 0.05) raw = lastRaw;
            lastRaw = raw;
        }
        return ((raw % LOOP) + LOOP) % LOOP;
    }

    // One dance step: frame f's meetings travelling to frame f+1's, on the current level (a level change is a hard cut
    // on the beat, like every other resolution step). Portrait windows keep frame f's offset for both ends.
    const frameAt = (k) => (k < dance.n ? k : dance.seam + 1 + ((k - dance.n) % (dance.n - 1 - dance.seam)));
    function buildStep(lv, k) {
        const f = frameAt(k), f1 = frameAt(k + 1), sh = lv.shift ? lv.shift[f] : 0;
        danceFine(f);
        fillCells(lv, M_DANCE, G.colA, G.keyA, sh);
        extractRuns(lv, G.colA, G.runA);
        danceFine(f1);
        fillCells(lv, M_DANCE, G.colB, G.keyB, sh);
        extractRuns(lv, G.colB, G.runB);
        buildTweens(lv, G.runA, G.runB);
    }

    function render(t) {
        const key = scene(t);
        if (sMode === M_DANCE) {
            if (key === lastKey && t === lastT) return false;
            const lv = G.levels[sLevel];
            if (key !== lastKey) buildStep(lv, sArg);
            lastKey = key; lastT = t;
            // linear across the step: consecutive steps join at constant velocity, so motion reads as motion, not pulses
            const e = Math.min(1, Math.max(0, (t - T.dance) * DANCE_FPS - sArg));
            drawField(sLevel);
            drawPieces(lv, e, sDis ? dissolveAt(t) : -1);
            return true;
        }
        if (key === lastKey) return false;
        lastKey = key;
        if (sMode === M_WEEK) {
            drawWeek();
            nowLine();
        } else if (sMode === M_TEXT) {
            const lv = G.levels[sLevel];
            textFine(sArg);
            fillCells(lv, M_TEXT, G.colA, G.keyA, 0);
            extractRuns(lv, G.colA, G.runA);
            buildTweens(lv, G.runA, G.runA);
            drawField(sLevel);
            drawPieces(lv, 0, -1);
        } else {
            const lv = G.levels[sLevel];
            fillCells(lv, sMode, G.cellCol, G.cellKey, 0);
            clearGrid(ctx);
            drawMosaic(ctx, lv, G.cellCol, G.cellKey);
            nowLine();
        }
        return true;
    }

    // ?t=<seconds> pins the cycle to one moment (stills, debugging)
    let frozen = parseFloat(new URLSearchParams(location.search).get('t'));
    if (!Number.isFinite(frozen)) frozen = null;

    // Rolling cost of render() on frames that drew, and rAF deltas, for the perf check
    const PERF_N = 4096;
    const perfDraw = new Float32Array(PERF_N), perfDelta = new Float32Array(PERF_N);
    let perfI = 0, perfJ = 0, lastTs = 0, frameDt = 1000 / 60;

    function tick(ts) {
        const a = performance.now();
        // Sampled half a frame ahead so each step lands within +-half a vsync of its beat instead of up to a whole one late
        const t = reduceMotion.matches ? T.textFull : frozen !== null ? frozen : cycleTime(ts + frameDt / 2);
        const drew = render(t);
        if (grain) grain.frame(drew, ts);
        if (drew || (grain && grain.active)) perfDraw[perfI++ % PERF_N] = performance.now() - a;
        if (lastTs) {
            perfDelta[perfJ++ % PERF_N] = ts - lastTs;
            frameDt += (Math.min(34, Math.max(6, ts - lastTs)) - frameDt) * 0.05;
        }
        lastTs = ts;
        requestAnimationFrame(tick);
    }

    // ---------------------------------------------------------------- data
    async function loadDance(url) {
        try {
            let res = await fetch(url);
            if (!res.ok) {
                const alt = url.startsWith('/') ? url.slice(1) : '/' + url;
                res = await fetch(alt);
            }
            if (!res.ok) return;
            let buf = new Uint8Array(await res.arrayBuffer());
            if (buf[0] === 0x1f && buf[1] === 0x8b) {
                if (typeof DecompressionStream === 'undefined') return;
                const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
                buf = new Uint8Array(await new Response(stream).arrayBuffer());
            }
            const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
            if (String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== 'GCD2') return;
        const w = dv.getUint16(5, true), h = dv.getUint16(7, true), n = dv.getUint16(9, true), np = buf[13];
        // Map the file's palette onto the source colours by nearest colour so the two can never drift apart silently
        const ours = SRC.map(rgbOf), remap = new Uint8Array(256);
        for (let i = 0; i < np; i++) {
            const r = buf[14 + i * 3], g = buf[15 + i * 3], b = buf[16 + i * 3];
            let best = 0, bd = 1e9;
            ours.forEach(([R, Gg, B], j) => { const d = (r - R) ** 2 + (g - Gg) ** 2 + (b - B) ** 2; if (d < bd) { bd = d; best = j; } });
            remap[i] = best;
        }
        const p = 14 + np * 3, size = w * h;
        const raw = buf.subarray(p, p + n * size), frames = new Uint8Array(n * size);
        for (let i = 0; i < size; i++) frames[i] = raw[i];
        for (let i = size; i < n * size; i++) frames[i] = raw[i] ^ frames[i - size];
        for (let i = 0; i < n * size; i++) frames[i] = remap[frames[i]];

        // Creative studio pass: harmonize character clothing colors in middle dance sequences (frames 225-345, 390-410)
        // removing unnatural solid green chroma-key artifacts and restoring rich denim blues, graphite styling, and white details
        for (let f = 0; f < n; f++) {
            if ((f >= 225 && f <= 345) || (f >= 390 && f <= 410)) {
                let topR = -1, botR = -1, minC = 999, maxC = -1;
                for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
                    if (frames[f * size + r * w + c] !== FIELD) {
                        if (topR === -1) topR = r;
                        botR = r;
                        if (c < minC) minC = c;
                        if (c > maxC) maxC = c;
                    }
                }
                if (topR !== -1) {
                    const H = botR - topR + 1, W = maxC - minC + 1, midC = (minC + maxC) / 2;
                    for (let c = minC; c <= maxC; c++) {
                        for (let r = topR; r <= botR; r++) {
                            const idx = f * size + r * w + c;
                            if (frames[idx] === COL.basil) {
                                const yNorm = (r - topR) / H;
                                const isEdge = Math.abs(c - midC) / (Math.max(1, W / 2)) > 0.35;
                                let newCol = COL.basil;
                                if (yNorm < 0.16) {
                                    newCol = COL.graphite;
                                } else if (yNorm < 0.24) {
                                    newCol = isEdge ? COL.graphite : 3;
                                } else if (yNorm < 0.52) {
                                    newCol = isEdge ? ((c % 2 === 0) ? COL.graphite : COL.blueberry) : 3;
                                } else if (yNorm < 0.88) {
                                    const relX = c - minC;
                                    if (relX % 3 === 0) newCol = COL.blueberry;
                                    else if (relX % 3 === 1) newCol = 6;
                                    else newCol = (r % 4 === 0) ? COL.lavender : COL.blueberry;
                                } else {
                                    newCol = (r >= botR - 1) ? COL.graphite : 3;
                                }
                                frames[idx] = newCol;
                            }
                        }
                    }
                }
            }
        }

        // Per-frame dancer centre, averaged over +-8 frames so a narrow window glides instead of jittering
        const cen = new Float64Array(n), cx = new Float64Array(n);
        for (let f = 0; f < n; f++) {
            let sx = 0, sn = 0;
            for (let i = 0; i < size; i++) if (frames[f * size + i] !== FIELD) { sx += i % w; sn++; }
            cen[f] = sn ? sx / sn + 0.5 : w / 2;
        }
        for (let f = 0; f < n; f++) {
            let sum = 0, k = 0;
            for (let j = Math.max(0, f - 8); j <= Math.min(n - 1, f + 8); j++) { sum += cen[j]; k++; }
            cx[f] = sum / k;
        }
        // Past the last frame the dance keeps going from the earlier frame closest to it, so the dissolve never freezes it
        let seam = 0, bestD = Infinity;
        const last = (n - 1) * size;
        for (let f = 0; f < n - 1 - DANCE_FPS * 2; f++) {
            let d = 0;
            for (let i = 0, o = f * size; i < size && d < bestD; i++) if (frames[o + i] !== frames[last + i]) d++;
            if (d < bestD) { bestD = d; seam = f; }
        }
        dance = { w, h, n, frames, cx, seam };
        if (G) { buildSampler(); lastKey = -1; }
        } catch (e) {
            console.warn('Error loading dance data:', e);
        }
    }

    // ---------------------------------------------------------------- boot
    readNow();
    layout();
    let resizeRaf = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(layout);
    });
    reduceMotion.addEventListener?.('change', () => { lastKey = -1; });
    setInterval(() => { readNow(); lastKey = -1; }, 30000);
    if (document.fonts && document.fonts.ready) {
        // the hour labels' width, and so the column, settles once Roboto arrives
        document.fonts.ready.then(layout);
    }

    loadDance('data/calendar-dance.bin?v=2.1').catch(() => {});

    // ---------------------------------------------------------------- sound
    // The gate's answer starts the cycle: with sound, or silently on the same audio clock so unmuting stays in time.
    const audio = window.CalendarAudio && CalendarAudio.available() ? CalendarAudio : null;
    const sound = window.SiteSound || null;
    let toggle = null;
    function begin(withSound, viaGesture) {
        if (wallStart === null) wallStart = performance.now();
        lastRaw = -Infinity;
        lastKey = -1;
        if (audio && viaGesture) audio.start({ muted: !withSound });
        if (sound && !toggle) {
            toggle = sound.toggle({
                muted: !withSound,
                mount: document.querySelector('[data-sound-slot="bar"]') || undefined,
                beat: BEAT,
                clock: (now) => cycleTime(now, true),
                onset: audio ? () => audio.onset() : undefined,
                onsetDelay: audio ? () => audio.onsetDelay() : undefined,
                onChange: (m) => {
                    sound.setPref(m ? 'off' : 'on');
                    if (!audio) return;
                    if (!audio.isRunning()) audio.start({ muted: m, at: (now) => cycleTime(now, true) });
                    else audio.setMuted(m);
                },
            });
        }
    }
    if (audio) {
        CalendarAudio.onStart(() => { lastRaw = -Infinity; lastKey = -1; });
        CalendarAudio.init('audio/calendar-loop.mp3', LOOP, AUDIO_PAD).catch(() => {});
    }
    if (!sound || frozen !== null || /[?&]gate=0\b/.test(location.search)) begin(false, false);
    else sound.gate({ title: 'Ready for the flashbang?', body: 'This week dances to a track. Best loud.', onChoose: (s) => begin(s, true) });

    const pct = (arr, count, p) => {
        const a = Array.from(arr.subarray(0, Math.min(count, PERF_N))).sort((x, y) => x - y);
        return a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(2) : null;
    };
    // For the invite card's booth: counts in on the same beats the calendar moves to
    window.CalendarClock = { time: () => cycleTime(performance.now(), true), BEAT, started: () => wallStart !== null };

    window.__calendarContact = {
        P: T, LOOP, BEAT,
        time: () => cycleTime(performance.now(), true),
        drawn: () => lastKey,
        scene: (t) => { scene(t); return ['week', 'empty', 'text', 'dance', 'weekgrid'][sMode] + '@' + G.levels[sLevel].S + 'x' + G.levels[sLevel].q + ':' + sArg + (sDis ? '/dissolve' : ''); },
        key: (t) => scene(t),
        freeze: (t) => { frozen = t; lastKey = -1; },
        bench: (t) => { const a = performance.now(); lastKey = -1; render(t); return performance.now() - a; },
        pieces: () => G.tw.n,
        ready: () => !!(dance && G.samples),
        frames: () => (dance ? dance.n : 0),
        started: () => wallStart !== null,
        perfReset: () => { perfI = 0; perfJ = 0; lastTs = 0; },
        perf: () => ({
            draws: perfI, drawP50: pct(perfDraw, perfI, 0.5), drawP95: pct(perfDraw, perfI, 0.95), drawMax: pct(perfDraw, perfI, 1),
            frames: perfJ, rafP50: pct(perfDelta, perfJ, 0.5), rafP95: pct(perfDelta, perfJ, 0.95), rafMax: pct(perfDelta, perfJ, 1),
            over33: Array.from(perfDelta.subarray(0, Math.min(perfJ, PERF_N))).filter((d) => d > 33.4).length,
        }),
    };
    requestAnimationFrame(tick);
})();
