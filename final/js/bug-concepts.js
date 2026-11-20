/* Field guide, plate II: twenty guide-bug specimens, each a different rendering technique.
   One shared locomotion model (walk to a waypoint, pause, signature idle), twenty renderers. */
(() => {
    'use strict';

    const TAU = Math.PI * 2, PI = Math.PI;
    const INK = '#121316', PAPER = '#eeece5', SIG = '#FFED29', RED = '#e5484d', RISO = '#3255a4';
    const MONO = '"IBM Plex Mono", ui-monospace, monospace';
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LS_FINAL = 'pixelBugConcept', LS_SHORT = 'pixelBugConceptShortlist';

    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (t) => t * t * (3 - 2 * t);
    const wrap = (a) => { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; };
    const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    function rng(seed) {
        let s = seed | 0;
        return () => {
            s = (s + 0x6d2b79f5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

    /* ---------- drawing helpers (local bug space: facing +x, ~60 units nose to tail) ---------- */

    const ell = (cx, cy, rx, ry, n) => {
        const p = [];
        for (let i = 0; i < n; i++) { const t = (i / n) * TAU; p.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); }
        return p;
    };
    function wob(ctx, pts, r, amp, closed) {
        const p = pts.map((q) => [q[0] + (r() - 0.5) * 2 * amp, q[1] + (r() - 0.5) * 2 * amp]);
        const n = p.length;
        ctx.beginPath();
        if (closed) {
            ctx.moveTo((p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2);
            for (let i = 0; i < n; i++) {
                const a = p[i], b = p[(i + 1) % n];
                ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
            }
            ctx.closePath();
        } else {
            ctx.moveTo(p[0][0], p[0][1]);
            for (let i = 1; i < n - 1; i++) {
                const a = p[i], b = p[i + 1];
                ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
            }
            ctx.lineTo(p[n - 1][0], p[n - 1][1]);
        }
    }
    function poly(ctx, pts, close) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        if (close) ctx.closePath();
    }
    function seg(ctx, a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
    function oval(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
    function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
    function dot(path, x, y, r) { path.moveTo(x + r, y); path.arc(x, y, r, 0, TAU); }

    /* Tripod gait: legs 0-2 left (front, mid, back), 3-5 right. Swing moves the foot forward while lifted. */
    const HIP = [[9, 5], [0, 6], [-9, 5]];
    const FOOT = [[22, 16], [2, 21], [-19, 17]];
    function legs(S, o = {}) {
        const out = [], sp = o.spread || 1, ln = o.len || 1, g = S.gait;
        const ph0 = o.phase != null ? o.phase : S.phase;
        for (let i = 0; i < 6; i++) {
            const side = i < 3 ? -1 : 1, k = i % 3, grp = (k + (side > 0 ? 1 : 0)) % 2;
            const ph = ph0 + grp * PI, s = Math.sin(ph), lift = Math.max(0, Math.cos(ph)) * g;
            const hx = HIP[k][0] * ln, hy = side * HIP[k][1] * sp;
            const fx = FOOT[k][0] * ln + s * 5 * g * ln, fy = side * (FOOT[k][1] * sp * ln - lift * 2);
            const kx = hx + (fx - hx) * 0.45 + [3, 0, -3][k] * ln, ky = hy + (fy - hy) * 0.75;
            out.push({ hx, hy, kx, ky, fx, fy, lift, side, k, grp });
        }
        return out;
    }

    /* Walk the recorded path backwards from the head, returning points spaced along arc length. */
    function trailPoints(S, n, spacing) {
        const out = [{ x: S.x, y: S.y }], H = S.hist;
        let need = spacing, px = S.x, py = S.y, i = H.length - 1;
        while (out.length < n && i >= 0) {
            const h = H[i], dx = h.x - px, dy = h.y - py, d = Math.hypot(dx, dy);
            if (d >= need && d > 0) { const t = need / d; px += dx * t; py += dy * t; out.push({ x: px, y: py }); need = spacing; }
            else { need -= d; px = h.x; py = h.y; i--; }
        }
        while (out.length < n) {
            const a = out[out.length - 1], b = out[out.length - 2] || { x: a.x + 1, y: a.y };
            const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1;
            out.push({ x: a.x + (dx / d) * spacing, y: a.y + (dy / d) * spacing });
        }
        return out;
    }
    function eachChunk(H, count, chunks, cb) {
        const start = Math.max(0, H.length - count), len = H.length - start;
        if (len < 3) return;
        const per = Math.max(2, Math.ceil(len / chunks));
        for (let a = start; a < H.length - 1; a += per) {
            const b = Math.min(H.length - 1, a + per);
            cb(a, b, (b - start) / len);
        }
    }
    function tracePath(ctx, H, a, b, map) {
        ctx.beginPath();
        for (let i = a; i <= b; i++) {
            const h = H[i], p = map ? map(h) : null;
            const x = p ? p[0] : h.x, y = p ? p[1] : h.y;
            if (i === a) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
    }
    const toWorld = (S, lx, ly) => {
        const c = Math.cos(S.a), s = Math.sin(S.a);
        return [S.x + (lx * c - ly * s) * S.u, S.y + (lx * s + ly * c) * S.u];
    };

    let grain = null;
    function grainPattern(ctx) {
        if (grain) return grain;
        const g = mkCanvas(96, 96), c = g.getContext('2d'), r = rng(77);
        for (let i = 0; i < 1500; i++) {
            c.fillStyle = `rgba(0,0,0,${(0.25 + r() * 0.75).toFixed(2)})`;
            c.fillRect(Math.floor(r() * 96), Math.floor(r() * 96), 1, 1);
        }
        grain = ctx.createPattern(g, 'repeat');
        return grain;
    }

    /* ---------- the specimens ---------- */

    const CONCEPTS = [];
    const def = (o) => CONCEPTS.push(o);

    /* 01 INKLING: marker line-boil, same hand as the hero portrait */
    def({
        key: 'inkling', name: 'INKLING', latin: 'Atramentum boilii', tech: 'marker line-boil', swatch: 'paper', boil: 11,
        trait: 'redraws itself eleven times a second. never the same bug twice.',
        line: "i'm not buggy, i'm hand-drawn.",
        motion: { speed: 40 },
        draw(ctx, S) {
            const r = rng(S.boil * 977 + 11), L = legs(S);
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.fillStyle = 'rgba(255,237,41,0.92)';
            wob(ctx, ell(0, 2.2, 16, 10, 12), r, 1.3, true); ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 1.9;
            for (const l of L) {
                wob(ctx, [[l.hx, l.hy], [l.kx, l.ky], [l.fx, l.fy]], r, 0.7); ctx.stroke();
                wob(ctx, [[l.fx, l.fy], [l.fx + 2.4, l.fy + l.side * 0.6]], r, 0.3); ctx.stroke();
            }
            ctx.lineWidth = 2.3; wob(ctx, ell(-2, 0, 17, 11, 16), r, 0.9, true); ctx.stroke();
            ctx.lineWidth = 1.7;
            wob(ctx, [[10, -9], [12.8, 0], [10, 9]], r, 0.6); ctx.stroke();
            wob(ctx, [[11, 0.3], [-4, 0], [-18, 0.4]], r, 0.6); ctx.stroke();
            ctx.lineWidth = 1.1;
            for (let i = 0; i < 4; i++) { wob(ctx, [[-14 + i * 4, -8], [-11 + i * 4, -3]], r, 0.4); ctx.stroke(); }
            ctx.lineWidth = 2.1; wob(ctx, ell(19.5, 0, 6.5, 7, 10), r, 0.7, true); ctx.stroke();
            ctx.fillStyle = INK;
            circle(ctx, 21.5, -2.8, 1.6); ctx.fill(); circle(ctx, 21.5, 2.8, 1.6); ctx.fill();
            const tw = S.idleK * Math.sin(S.t * 38) * 3;
            ctx.lineWidth = 1.5;
            wob(ctx, [[25, -3], [31, -8 - tw], [37, -7 - tw * 1.4]], r, 0.5); ctx.stroke();
            wob(ctx, [[25, 3], [31, 8 + tw], [37, 7 + tw * 1.4]], r, 0.5); ctx.stroke();
            if (S.idleK > 0.02) {
                ctx.save(); ctx.rotate(-S.a); ctx.globalAlpha = clamp(S.idleK * 1.6, 0, 1); ctx.lineWidth = 2;
                wob(ctx, [[-5, -40], [-4, -45], [1, -46.5], [5, -43], [1, -37.5], [0, -33.5]], r, 0.5); ctx.stroke();
                circle(ctx, 0, -29, 1.4); ctx.fill();
                ctx.restore();
            }
        }
    });

    /* 02 SPEC: blueprint / technical drawing that dimensions itself */
    def({
        key: 'spec', name: 'SPEC', latin: 'Specimen tolerantia', tech: 'blueprint plotter drawing', swatch: 'blueprint',
        trait: 'documents every step it takes, in millimetres, to one decimal place.',
        line: 'leg three is out of tolerance by 0.2mm. shipping anyway.',
        motion: { speed: 34, idle: 3.2 },
        under(ctx, S) {
            const len = S.hist.length || 1;
            ctx.lineWidth = 1;
            for (const h of S.hist) {
                if (h.n % 22) continue;
                const a = 1 - (S.n - h.n) / len;
                if (a <= 0) continue;
                const s = 3 * S.u;
                ctx.strokeStyle = `rgba(238,236,229,${(a * 0.55).toFixed(3)})`;
                ctx.beginPath(); ctx.moveTo(h.x - s, h.y); ctx.lineTo(h.x + s, h.y); ctx.moveTo(h.x, h.y - s); ctx.lineTo(h.x, h.y + s); ctx.stroke();
            }
        },
        draw(ctx, S) {
            const lw = 1 / S.u, C = 'rgba(238,236,229,0.92)', D = 'rgba(238,236,229,0.4)';
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.strokeStyle = D; ctx.lineWidth = lw; ctx.setLineDash([7, 2, 1.5, 2]);
            seg(ctx, -30, 0, 37, 0); seg(ctx, 19.5, -11, 19.5, 11);
            ctx.setLineDash([]);
            ctx.strokeStyle = C; ctx.lineWidth = 1.15 * lw;
            for (const l of legs(S)) {
                ctx.beginPath(); ctx.moveTo(l.hx, l.hy); ctx.lineTo(l.kx, l.ky); ctx.lineTo(l.fx, l.fy); ctx.stroke();
                circle(ctx, l.kx, l.ky, 1.1); ctx.stroke();
                circle(ctx, l.hx, l.hy, 0.8); ctx.stroke();
                const dx = l.fx - l.kx, dy = l.fy - l.ky, d = Math.hypot(dx, dy) || 1;
                seg(ctx, l.fx - (dy / d) * 1.6, l.fy + (dx / d) * 1.6, l.fx + (dy / d) * 1.6, l.fy - (dx / d) * 1.6);
            }
            oval(ctx, -3, 0, 16, 10.5); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(9, 0, 5, 9, 0, -PI / 2, PI / 2); ctx.stroke();
            ctx.save(); oval(ctx, -3, 0, 16, 10.5); ctx.clip();
            ctx.strokeStyle = D; ctx.lineWidth = 0.7 * lw; ctx.beginPath();
            for (let i = -32; i < 12; i += 2.6) { ctx.moveTo(i, -12); ctx.lineTo(i + 10, -1); }
            ctx.stroke(); ctx.restore();
            ctx.strokeStyle = C;
            circle(ctx, 19.5, 0, 6); ctx.stroke();
            circle(ctx, 22, -3, 1.3); ctx.stroke(); circle(ctx, 22, 3, 1.3); ctx.stroke();
            poly(ctx, [[24.5, -3.5], [30, -7], [35.5, -6]]); ctx.stroke();
            poly(ctx, [[24.5, 3.5], [30, 7], [35.5, 6]]); ctx.stroke();
            circle(ctx, 35.5, -6, 0.8); ctx.stroke(); circle(ctx, 35.5, 6, 0.8); ctx.stroke();
            const k = S.idleK;
            if (k > 0.01) {
                const p = smooth(clamp(S.idle * 2.5, 0, 1));
                ctx.globalAlpha = clamp(k * 1.5, 0, 1); ctx.strokeStyle = SIG; ctx.fillStyle = SIG; ctx.lineWidth = lw;
                seg(ctx, -19, -5, -19, -27); seg(ctx, 25.5, -4, 25.5, -27);
                const xe = lerp(-19, 25.5, p);
                seg(ctx, -19, -24, xe, -24);
                const arrow = (x, y, dir) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * 2.6, y - 1.1); ctx.lineTo(x - dir * 2.6, y + 1.1); ctx.closePath(); ctx.fill(); };
                arrow(-19, -24, -1); if (p > 0.97) arrow(25.5, -24, 1);
                ctx.font = `500 4.6px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                const label = (txt, x, y) => { ctx.save(); ctx.translate(x, y); if (S.dir < 0) ctx.rotate(PI); ctx.fillText(txt, 0, 0); ctx.restore(); };
                label((44.5 * p).toFixed(1), 3, -27.5);
                const q = clamp((S.idle - 0.3) * 3, 0, 1);
                if (q > 0) {
                    seg(ctx, 24, 4.5, lerp(24, 31, q), lerp(4.5, 15, q));
                    if (q >= 1) { seg(ctx, 31, 15, 41, 15); label('R6.0', 36, 12.5); }
                }
                ctx.globalAlpha = 1;
            }
        }
    });

    /* 03 DITHR: shaded render pushed through a 4x4 Bayer matrix, strictly two colours */
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    def({
        key: 'dithr', name: 'DITHR', latin: 'Bayerus bitonalis', tech: '1-bit ordered dither', swatch: 'void', world: true, boil: 14,
        trait: 'knows exactly two colours and is smug about it.',
        line: 'gradients are a crutch.',
        motion: { speed: 38 },
        draw(ctx, S, st) {
            const q = 3, W = Math.ceil(S.w / q), H = Math.ceil(S.h / q), o = st.store;
            if (!o.cv || o.W !== W || o.H !== H) {
                o.cv = mkCanvas(W, H); o.cx = o.cv.getContext('2d', { willReadFrequently: true });
                o.W = W; o.H = H;
            }
            const c = o.cx, k = S.u / q, ca = Math.cos(S.a), sa = Math.sin(S.a);
            c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
            c.setTransform(k * ca, k * sa, -k * sa, k * ca, S.x / q, S.y / q);
            c.lineCap = 'round'; c.strokeStyle = '#cfcfcf'; c.lineWidth = 3.3;
            for (const l of legs(S)) { c.beginPath(); c.moveTo(l.hx, l.hy); c.lineTo(l.kx, l.ky); c.lineTo(l.fx, l.fy); c.stroke(); }
            c.lineWidth = 2.2; c.strokeStyle = '#9a9a9a';
            c.beginPath(); c.moveTo(24, -3); c.lineTo(34, -9); c.moveTo(24, 3); c.lineTo(34, 9); c.stroke();
            let g = c.createRadialGradient(-8, -5, 1, -2, 0, 20);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#b4b4b4'); g.addColorStop(1, '#161616');
            c.fillStyle = g; oval(c, -2, 0, 17, 11); c.fill();
            c.strokeStyle = '#000'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(11, 0); c.lineTo(-19, 0); c.stroke();
            g = c.createRadialGradient(17, -3, 0.5, 19, 0, 8);
            g.addColorStop(0, '#f2f2f2'); g.addColorStop(1, '#2a2a2a');
            c.fillStyle = g; oval(c, 19, 0, 6.5, 7); c.fill();
            c.fillStyle = '#000'; circle(c, 22, -3, 1.5); c.fill(); circle(c, 22, 3, 1.5); c.fill();
            const img = c.getImageData(0, 0, W, H), d = img.data, out = new Uint32Array(d.buffer);
            const dis = S.idleK, on = 0xffe5ecee;
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const i = y * W + x, a = d[i * 4 + 3];
                    if (!a) { out[i] = 0; continue; }
                    let lum = (d[i * 4] / 255) * (a / 255);
                    if (dis > 0) lum = lum * (1 - dis) + hash(x * 7.3 + y * 13.1 + S.boil * 1.7) * lum * dis * 1.3;
                    out[i] = lum > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? on : 0;
                }
            }
            c.putImageData(img, 0, 0);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(o.cv, 0, 0, W * q, H * q);
        }
    });

    /* 04 GLYPH: monospace ascii beetle, mirrored glyph-by-glyph so it never reads backwards */
    const GL = [
        ['   \\  |  /    ,', ' ={#######}(EE)', "   /  |  \\    '"],
        ['   /  :  \\    ,', ' ={#######}(EE)', "   \\  :  /    '"],
    ];
    const MIRROR = { '/': '\\', '\\': '/', '(': ')', ')': '(', '{': '}', '}': '{' };
    const mirrorRow = (row) => row.split('').reverse().map((ch) => MIRROR[ch] || ch).join('');
    def({
        key: 'glyph', name: 'GLYPH', latin: 'Asciius monospacea', tech: 'ascii / monospace glyphs', swatch: 'void', upright: true, boil: 8,
        trait: 'made of characters it refuses to escape.',
        line: "i'm 94% semicolons by weight.",
        motion: { speed: 36, turn: 2.8 },
        over(ctx, S) {
            ctx.font = `500 ${8 * S.u}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = PAPER;
            const len = S.hist.length || 1;
            for (const h of S.hist) {
                if (h.n % 6) continue;
                const a = 1 - (S.n - h.n) / len;
                if (a <= 0.05) continue;
                ctx.globalAlpha = a * 0.55; ctx.fillText('.', h.x, h.y + 6 * S.u);
            }
            ctx.globalAlpha = 1;
        },
        draw(ctx, S) {
            const fr = S.gait > 0.12 ? Math.floor(S.phase / PI) & 1 : 0;
            let rows = GL[fr];
            if (S.dir < 0) rows = rows.map(mirrorRow);
            const seq = ['oo', 'oo', '^^', '--', '^^', 'oo', '@@', 'oo'];
            const eyes = S.mode === 'idle' ? seq[Math.min(seq.length - 1, Math.floor(S.idle * seq.length))] : (S.t % 3.4 < 0.12 ? '--' : 'oo');
            ctx.font = `600 8px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const cw = 4.85;
            rows.forEach((row, ri) => {
                const off = (row.length - 1) / 2;
                let ei = 0;
                for (let i = 0; i < row.length; i++) {
                    let ch = row[i];
                    if (ch === ' ') continue;
                    let col = PAPER, a = 1;
                    if (ch === 'E') { ch = eyes[ei++]; col = SIG; }
                    else if (ch === '#') { ch = S.gait > 0.1 && hash(i * 3.1 + S.boil * 0.77 + ri) > 0.82 ? '%' : '#'; a = 0.9; }
                    else if ('\\/|:,\''.includes(ch)) a = 0.72;
                    ctx.globalAlpha = a; ctx.fillStyle = col;
                    ctx.fillText(ch, (i - off) * cw, (ri - 1) * 8.5);
                }
            });
            if (S.idleK > 0.2) {
                ctx.globalAlpha = S.idleK; ctx.fillStyle = SIG;
                ctx.fillText(S.idle < 0.5 ? '?' : '!', S.dir * 22, -17);
            }
            ctx.globalAlpha = 1;
        }
    });

    /* 05 SNIP: cut paper on split pins, flips to its kraft back when idle */
    def({
        key: 'snip', name: 'SNIP', latin: 'Papyrus scissorii', tech: 'paper cut-out on split pins', swatch: 'paper',
        trait: 'a craft-table escapee held together with split pins.',
        line: 'one open window and i\'m in the recycling.',
        motion: { speed: 34, turn: 2.6, idle: 2.2 },
        draw(ctx, S, st) {
            const o = st.store;
            if (!o.body) {
                const r = rng(5);
                const jag = (pts, amp) => pts.map(([x, y]) => [x + (r() - 0.5) * amp, y + (r() - 0.5) * amp]);
                o.body = jag(ell(-3, 0, 17, 11, 22), 1.1);
                o.pron = jag(ell(9, 0, 5.2, 9, 14), 0.8);
                o.elL = jag(ell(-5, -4.8, 12.5, 5, 16), 0.7);
                o.elR = jag(ell(-5, 4.8, 12.5, 5, 16), 0.7);
                o.head = jag(ell(19, 0, 6.3, 6.6, 13), 0.7);
            }
            const sc = S.mode === 'idle' ? Math.cos(S.idle * TAU) : 1;
            const back = sc < 0;
            ctx.scale(1, Math.abs(sc) < 0.05 ? 0.05 * (sc < 0 ? -1 : 1) : sc);
            const ox = 1.5 * Math.cos(S.a) + 2.1 * Math.sin(S.a), oy = (-1.5 * Math.sin(S.a) + 2.1 * Math.cos(S.a)) * (sc < 0 ? -1 : 1);
            const piece = (pts, col) => {
                ctx.save(); ctx.translate(ox, oy); poly(ctx, pts, true); ctx.fillStyle = 'rgba(18,19,22,0.2)'; ctx.fill(); ctx.restore();
                poly(ctx, pts, true); ctx.fillStyle = col; ctx.fill();
                ctx.strokeStyle = 'rgba(18,19,22,0.25)'; ctx.lineWidth = 0.35; ctx.stroke();
            };
            const strip = (ax, ay, bx, by, w) => {
                const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = (-dy / d) * w, ny = (dx / d) * w;
                return [[ax + nx - dx * 0.08, ay + ny - dy * 0.08], [bx + nx * 0.8 + dx * 0.08, by + ny * 0.8 + dy * 0.08],
                    [bx - nx * 0.8 + dx * 0.08, by - ny * 0.8 + dy * 0.08], [ax - nx - dx * 0.08, ay - ny - dy * 0.08]];
            };
            const pin = (x, y) => {
                circle(ctx, x, y, 1.25); ctx.fillStyle = '#8f8b7e'; ctx.fill();
                circle(ctx, x - 0.35, y - 0.35, 0.45); ctx.fillStyle = '#f7f5ee'; ctx.fill();
            };
            const dark = back ? '#cdbf9f' : '#1b1c1f', paperCol = back ? '#d9ccab' : SIG;
            const L = legs(S);
            for (const l of L) { piece(strip(l.hx, l.hy, l.kx, l.ky, 1.5), dark); piece(strip(l.kx, l.ky, l.fx, l.fy, 1.1), dark); }
            piece(strip(22, -3, 33, -9, 0.7), dark); piece(strip(22, 3, 33, 9, 0.7), dark);
            piece(o.body, dark);
            piece(o.pron, back ? '#c6b892' : '#2b2c30');
            piece(o.elL, paperCol); piece(o.elR, paperCol);
            piece(o.head, dark);
            if (!back) {
                ctx.fillStyle = '#f7f5ee'; circle(ctx, 21, -2.6, 1.9); ctx.fill(); circle(ctx, 21, 2.6, 1.9); ctx.fill();
                ctx.fillStyle = INK; circle(ctx, 21.8, -2.6, 0.9); ctx.fill(); circle(ctx, 21.8, 2.6, 0.9); ctx.fill();
            }
            for (const l of L) { pin(l.hx, l.hy); pin(l.kx, l.ky); }
            pin(13, 0); pin(-5, 0);
        }
    });

    /* 06 MISREG: risograph, yellow + blue plates with grain, drifting out of register */
    def({
        key: 'misreg', name: 'MISREG', latin: 'Risographus offsetii', tech: 'risograph two-tone', swatch: 'paper', world: true,
        trait: 'always slightly out of register, never out of character.',
        line: "that's not a bug, that's misregistration.",
        motion: { speed: 36, idle: 2.6 },
        draw(ctx, S, st) {
            const o = st.store, dpr = st.dpr, W = Math.round(S.w * dpr), H = Math.round(S.h * dpr);
            if (!o.a || o.W !== W || o.H !== H) { o.a = mkCanvas(W, H); o.b = mkCanvas(W, H); o.W = W; o.H = H; }
            const L = legs(S);
            const plate = (cv, paint) => {
                const c = cv.getContext('2d');
                c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
                c.setTransform(dpr, 0, 0, dpr, 0, 0); c.translate(S.x, S.y); c.rotate(S.a); c.scale(S.u, S.u);
                c.lineCap = 'round'; c.lineJoin = 'round';
                paint(c);
                c.setTransform(1, 0, 0, 1, 0, 0);
                c.globalCompositeOperation = 'destination-out'; c.fillStyle = grainPattern(c); c.fillRect(0, 0, W, H);
                c.globalCompositeOperation = 'source-over';
            };
            plate(o.a, (c) => {
                c.strokeStyle = SIG; c.fillStyle = SIG; c.lineWidth = 3.4;
                for (const l of L) { c.beginPath(); c.moveTo(l.hx, l.hy); c.lineTo(l.kx, l.ky); c.lineTo(l.fx, l.fy); c.stroke(); }
                oval(c, -2, 0, 17.5, 11.5); c.fill(); oval(c, 19.5, 0, 7, 7.2); c.fill();
            });
            plate(o.b, (c) => {
                c.strokeStyle = RISO; c.fillStyle = RISO; c.lineWidth = 1.3;
                for (const l of L) { c.beginPath(); c.moveTo(l.hx, l.hy); c.lineTo(l.kx, l.ky); c.lineTo(l.fx, l.fy); c.stroke(); }
                c.globalAlpha = 0.28; c.beginPath(); c.ellipse(-2, 3.5, 16, 8, 0, 0, PI); c.fill(); c.globalAlpha = 1;
                c.lineWidth = 1.5; oval(c, -2, 0, 17, 11); c.stroke();
                c.beginPath(); c.moveTo(11, 0); c.lineTo(-19, 0); c.stroke();
                c.beginPath(); c.ellipse(9, 0, 5, 9.5, 0, -PI / 2, PI / 2); c.stroke();
                c.lineWidth = 1;
                for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(-5, 0, 9 - i * 3, 7.5 - i * 2.2, 0, PI * 1.05, PI * 1.95); c.stroke(); }
                const dots = new Path2D();
                for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) dot(dots, -14 + i * 4, 3.5 + j * 2.6, 0.55 + j * 0.15);
                c.fill(dots);
                circle(c, 21.5, -2.8, 1.6); c.fill(); circle(c, 21.5, 2.8, 1.6); c.fill();
                c.beginPath(); c.moveTo(25, -3); c.quadraticCurveTo(31, -9, 37, -7); c.moveTo(25, 3); c.quadraticCurveTo(31, 9, 37, 7); c.stroke();
            });
            let d = 0;
            if (S.mode === 'idle') d = S.idle < 0.78 ? smooth(S.idle / 0.78) : 1 - smooth((S.idle - 0.78) / 0.22);
            const offX = (1.4 + 5 * d) * S.u, offY = (-1 + 3.5 * d) * S.u;
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(o.a, 0, 0, S.w, S.h);
            ctx.drawImage(o.b, offX, offY, S.w, S.h);
            ctx.globalCompositeOperation = 'source-over';
        }
    });

    /* 07 VERTEX: low-poly wireframe projected by hand, spins in 3D when idle */
    const VX = (() => {
        const v = [], e = [], X = [-22, -14, -4, 5, 11], R = [3.5, 8, 10.5, 9.5, 6], n = 6;
        X.forEach((x, s) => {
            for (let j = 0; j < n; j++) {
                const t = (j / n) * TAU + PI / 6;
                v.push([x, Math.cos(t) * R[s], 6 + Math.sin(t) * R[s] * 0.62]);
                e.push([s * n + j, s * n + ((j + 1) % n)]);
                if (s) e.push([(s - 1) * n + j, s * n + j]);
            }
        });
        const tail = v.length; v.push([-28, 0, 6]);
        const nose = v.length; v.push([15, 0, 6.5]);
        for (let j = 0; j < n; j++) { e.push([tail, j]); e.push([nose, (X.length - 1) * n + j]); }
        const h = v.length;
        v.push([25, 0, 6], [15, 0, 6], [20, -5, 6], [20, 5, 6], [20, 0, 11], [20, 0, 1]);
        [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]].forEach(([a, b]) => e.push([h + a, h + b]));
        return { v, e, head: h };
    })();
    def({
        key: 'vertex', name: 'VERTEX', latin: 'Polygonus lowcountii', tech: 'low-poly wireframe, hand-projected', swatch: 'void', world: true,
        trait: 'thirty-six polygons and a very high opinion of itself.',
        line: 'render distance: about four pixels.',
        motion: { speed: 38, idle: 2.4 },
        draw(ctx, S) {
            const u = S.u, tilt = 0.95, ct = Math.cos(tilt), stl = Math.sin(tilt);
            const yaw = S.a + (S.mode === 'idle' ? smooth(S.idle) * TAU : 0);
            const cy = Math.cos(yaw), sy = Math.sin(yaw), bob = Math.sin(S.phase * 2) * 0.6 * S.gait;
            const P = (x, y, z) => {
                const X = x * cy - y * sy, Y = x * sy + y * cy, Z = z + bob;
                return [S.x + X * u, S.y + (Y * ct - Z * stl) * u, Y * stl + Z * ct];
            };
            const pv = VX.v.map((p) => P(p[0], p[1], p[2]));
            let lo = Infinity, hi = -Infinity;
            for (const p of pv) { if (p[2] < lo) lo = p[2]; if (p[2] > hi) hi = p[2]; }
            const buckets = [[], [], []];
            for (const [a, b] of VX.e) {
                const dz = ((pv[a][2] + pv[b][2]) / 2 - lo) / (hi - lo || 1);
                buckets[dz < 0.36 ? 0 : dz < 0.68 ? 1 : 2].push([pv[a], pv[b]]);
            }
            ctx.lineCap = 'round'; ctx.lineWidth = 1;
            const styles = [[0.22, [2, 2.5]], [0.55, []], [0.95, []]];
            buckets.forEach((list, i) => {
                ctx.strokeStyle = `rgba(238,236,229,${styles[i][0]})`; ctx.setLineDash(styles[i][1]);
                ctx.beginPath(); for (const [a, b] of list) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
            });
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(238,236,229,0.8)';
            ctx.beginPath();
            const feet = [];
            for (const l of legs(S)) {
                const h = P(l.hx, l.hy, 4), k = P(l.kx, l.ky * 1.05, 11 + l.lift * 4), f = P(l.fx, l.fy, l.lift * 3);
                ctx.moveTo(h[0], h[1]); ctx.lineTo(k[0], k[1]); ctx.lineTo(f[0], f[1]);
                if (l.lift < 0.05) feet.push(f);
            }
            const a1 = P(24, -2, 8), a2 = P(31, -7, 13), a3 = P(24, 2, 8), a4 = P(31, 7, 13);
            ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.moveTo(a3[0], a3[1]); ctx.lineTo(a4[0], a4[1]);
            ctx.stroke();
            ctx.fillStyle = PAPER;
            for (let i = 0; i < VX.head; i++) { const p = pv[i]; ctx.fillRect(p[0] - 0.8, p[1] - 0.8, 1.6, 1.6); }
            ctx.fillStyle = SIG;
            for (let i = VX.head; i < pv.length; i++) { const p = pv[i]; ctx.fillRect(p[0] - 1.1, p[1] - 1.1, 2.2, 2.2); }
            ctx.strokeStyle = SIG; ctx.beginPath();
            for (const f of feet) { ctx.moveTo(f[0] - 2, f[1]); ctx.lineTo(f[0] + 2, f[1]); ctx.moveTo(f[0], f[1] - 2); ctx.lineTo(f[0], f[1] + 2); }
            ctx.stroke();
        }
    });

    /* 08 NEONATE: bent-glass neon, segments flicker out when it gets nervous */
    def({
        key: 'neonate', name: 'NEONATE', latin: 'Lampas flickerii', tech: 'neon tube line', swatch: 'void', boil: 16,
        trait: 'buzzes at 60hz. flickers when nervous.',
        line: 'open 24/7. except the n.',
        motion: { speed: 42 },
        draw(ctx, S) {
            const L = legs(S), paths = [];
            let p = new Path2D(); p.ellipse(-2, 0, 17, 10.5, 0, 0, TAU); paths.push([p, 0]);
            p = new Path2D(); p.moveTo(10, -9); p.quadraticCurveTo(14, 0, 10, 9); p.moveTo(9, 0); p.lineTo(-17, 0); paths.push([p, 0]);
            p = new Path2D(); p.ellipse(19.5, 0, 6, 6.5, 0, 0, TAU); paths.push([p, 0]);
            for (const l of L) { p = new Path2D(); p.moveTo(l.hx, l.hy); p.lineTo(l.kx, l.ky); p.lineTo(l.fx, l.fy); paths.push([p, 1]); }
            p = new Path2D(); p.moveTo(24.5, -3); p.quadraticCurveTo(30, -10, 36, -8); paths.push([p, 1]);
            p = new Path2D(); p.moveTo(24.5, 3); p.quadraticCurveTo(30, 10, 36, 8); paths.push([p, 1]);
            p = new Path2D(); dot(p, 21.5, -2.6, 1.1); dot(p, 21.5, 2.6, 1.1); paths.push([p, 2]);
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            const hum = 0.9 + 0.1 * Math.sin(S.t * 377);
            paths.forEach(([path, kind], i) => {
                const h = hash(i * 13.7 + S.boil * 1.31);
                let lit = 1;
                if (S.idleK > 0.05 && h < S.idleK * 0.6) lit = 0; else if (h > 0.985) lit = 0.35;
                if (!lit) { ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1.6; ctx.stroke(path); return; }
                const rgb = kind === 1 ? '255,246,216' : '255,237,41';
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `rgba(${rgb},${0.07 * lit * hum})`; ctx.lineWidth = 7.5; ctx.stroke(path);
                ctx.strokeStyle = `rgba(${rgb},${0.2 * lit * hum})`; ctx.lineWidth = 3.8; ctx.stroke(path);
                ctx.strokeStyle = `rgba(255,252,230,${0.95 * lit})`; ctx.lineWidth = 1.3; ctx.stroke(path);
                if (kind === 2) { ctx.fillStyle = `rgba(255,252,230,${lit})`; ctx.fill(path); }
                ctx.globalCompositeOperation = 'source-over';
            });
        }
    });

    /* 09 BLOT: mirrored rorschach ink, blooms into something else when idle */
    def({
        key: 'blot', name: 'BLOT', latin: 'Rorschachia ambigua', tech: 'ink-blot rorschach', swatch: 'paper',
        trait: 'what do you see? it sees a merge conflict.',
        line: 'tell me about your parent branch.',
        motion: { speed: 32, idle: 3 },
        draw(ctx, S, st) {
            const o = st.store;
            if (!o.blobs) {
                const r = rng(9);
                o.blobs = Array.from({ length: 16 }, () => {
                    const x = -20 + r() * 38, lim = Math.max(1.5, 10 * Math.sqrt(Math.max(0, 1 - ((x + 2) / 19) ** 2)));
                    return { x, y: 1 + r() * lim, r: 2 + r() * 4, ph: r() * TAU, sp: 0.5 + r() };
                });
                o.specks = Array.from({ length: 12 }, () => ({ x: -26 + r() * 56, y: 12 + r() * 14, r: 0.35 + r() * 0.7 }));
            }
            const m = S.idleK, t = S.t, core = new Path2D(), bleed = new Path2D();
            const add = (x, y, rad) => { dot(core, x, y, rad); dot(bleed, x, y, rad + 1.8); };
            core.ellipse(-2, 0, 16, 5.5, 0, 0, TAU); bleed.ellipse(-2, 0, 17.8, 7.3, 0, 0, TAU);
            add(19, 0, 6);
            for (const b of o.blobs) {
                const x = b.x + Math.sin(t * b.sp + b.ph) * 1.3;
                const y = (b.y + Math.sin(t * b.sp * 1.3 + b.ph) * 0.8) * (1 + m * 1.2) + m * 3;
                const rad = b.r * (1 + m * 0.45);
                add(x, y, rad); add(x, -y, rad);
            }
            for (const l of legs(S)) {
                for (let i = 0; i < 5; i++) { const q = i / 5; add(lerp(l.hx, l.kx, q), lerp(l.hy, l.ky, q), 2.3 - q * 0.6); }
                for (let i = 0; i < 5; i++) { const q = i / 5; add(lerp(l.kx, l.fx, q), lerp(l.ky, l.fy, q), 1.6 - q * 0.6); }
                add(l.fx, l.fy, 1.6);
            }
            for (const s of o.specks) { dot(core, s.x, s.y * (1 + m * 0.5), s.r); dot(core, s.x, -s.y * (1 + m * 0.5), s.r); }
            ctx.fillStyle = 'rgba(18,19,22,0.12)'; ctx.fill(bleed);
            ctx.fillStyle = INK; ctx.fill(core);
            ctx.fillStyle = '#eeece5'; circle(ctx, 21, -2.4, 1.2); ctx.fill(); circle(ctx, 21, 2.4, 1.2); ctx.fill();
        }
    });

    /* 10 MODULO: pure DOM + CSS geometry; JS only moves the wrapper */
    const MOD_LEGS = [[-58, 1, 9, -5, 0], [-92, 1, 0, -6, 1], [-124, 1, -9, -5, 0], [58, -1, 9, 5, 1], [92, -1, 0, 6, 0], [124, -1, -9, 5, 1]];
    def({
        key: 'modulo', name: 'MODULO', latin: 'Cascadia stylesheetii', tech: 'css-only geometry', swatch: 'paper', dom: true,
        trait: 'built from border-radius and hubris. the body is 100% css.',
        line: 'no canvas was harmed in my making.',
        motion: { speed: 38 },
        mount(host) {
            const el = document.createElement('div');
            el.className = 'mod';
            el.innerHTML = '<div class="mod-in">' +
                MOD_LEGS.map(([a, s, x, y, g]) => `<i class="mod-leg" style="--a:${a}deg;--s:${s};--x:${x}px;--y:${y}px;--d:${g ? '-0.26s' : '0s'}"></i>`).join('') +
                '<i class="mod-tail"></i><i class="mod-body"></i><i class="mod-shell"></i><i class="mod-head"><b></b><b></b></i></div>';
            host.appendChild(el);
            return el;
        },
        update(S, st) {
            st.el.style.transform = `translate3d(${S.x.toFixed(2)}px,${S.y.toFixed(2)}px,0) rotate(${S.a.toFixed(4)}rad) scale(${S.u.toFixed(3)})`;
            const walk = S.gait > 0.15, idle = S.mode === 'idle';
            if (walk !== st.store.walk) { st.el.classList.toggle('is-walk', walk); st.store.walk = walk; }
            if (idle !== st.store.idle) { st.el.classList.toggle('is-idle', idle); st.store.idle = idle; }
        }
    });

    /* 11 FOLD: origami facets lit from the top-left, wings unfold when idle */
    def({
        key: 'fold', name: 'FOLD', latin: 'Origamia plicata', tech: 'origami facets', swatch: 'void',
        trait: 'folded from a single sheet of the spec.',
        line: "one crease out of place and i'm a crane.",
        motion: { speed: 36, idle: 2.8 },
        draw(ctx, S) {
            const LIGHT = -2.36;
            const shade = (ang, base = 0.62) => {
                const b = clamp(base + 0.32 * Math.cos(ang + S.a - LIGHT), 0.18, 1.02);
                return `rgb(${(238 * b) | 0},${(236 * b) | 0},${(229 * b) | 0})`;
            };
            const face = (pts, ang, base) => { poly(ctx, pts, true); ctx.fillStyle = shade(ang, base); ctx.fill(); };
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            for (const l of legs(S)) {
                ctx.lineWidth = 2.3;
                ctx.strokeStyle = shade(l.side * PI / 2 - 0.5, 0.55); seg(ctx, l.hx, l.hy, l.kx, l.ky);
                ctx.strokeStyle = shade(l.side * PI / 2 + 0.6, 0.45); seg(ctx, l.kx, l.ky, l.fx, l.fy);
            }
            const N = [13, 0], T = [-24, 0], Lp = [-5, -11], R = [-5, 11], C = [-3, 0];
            face([N, Lp, C], -PI * 0.35); face([N, C, R], PI * 0.35); face([Lp, T, C], -PI * 0.72); face([C, T, R], PI * 0.72);
            ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            poly(ctx, [N, C, T]); ctx.stroke(); poly(ctx, [Lp, C, R]); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.4; poly(ctx, [N, Lp, T, R], true); ctx.stroke();
            const open = S.idleK;
            if (open > 0.01) {
                for (const sd of [-1, 1]) {
                    const tip = [-13 - 5 * open, sd * (4 + 18 * open)], mid = [-2, sd * (3 + 14 * open)];
                    face([[8, sd * 1], tip, [-18, sd * 1]], sd * (PI / 2 + 0.9 * (1 - open)), 0.5 + 0.2 * open);
                    face([[8, sd * 1], mid, tip], sd * (PI / 2 - 0.5), 0.7);
                    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; poly(ctx, [[8, sd], tip]); ctx.stroke();
                }
            }
            const H0 = [13, 0], HL = [18, -5.5], HF = [24, 0], HR = [18, 5.5];
            face([H0, HL, HF], -PI * 0.3, 0.7); face([H0, HF, HR], PI * 0.3, 0.7);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; seg(ctx, 13, 0, 24, 0);
            ctx.lineWidth = 0.8; ctx.strokeStyle = shade(-0.4, 0.8);
            seg(ctx, 23, -1.5, 31, -8); seg(ctx, 23, 1.5, 31, 8);
            ctx.fillStyle = SIG; ctx.fillRect(19.2, -2.6, 1.6, 1.6); ctx.fillRect(19.2, 1, 1.6, 1.6);
        }
    });

    /* 12 HG: chrome metaball goo; body splits into droplets and re-merges */
    const CHROME = (() => {
        const stops = [[16, 17, 20], [70, 72, 80], [236, 234, 226], [120, 122, 130], [22, 23, 26], [250, 232, 60], [206, 205, 198], [16, 17, 20]];
        const lut = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            const f = (i / 256) * (stops.length - 1), k = Math.floor(f), t = f - k, a = stops[k], b = stops[k + 1];
            const r = lerp(a[0], b[0], t) | 0, g = lerp(a[1], b[1], t) | 0, bl = lerp(a[2], b[2], t) | 0;
            lut[i] = (bl << 16) | (g << 8) | r;
        }
        return lut;
    })();
    def({
        key: 'hg', name: 'HG', latin: 'Hydrargyrum fluxus', tech: 'chrome metaball', swatch: 'void', world: true,
        trait: 'liquid metal. flows around obstacles and responsibilities.',
        line: "i don't have bugs. i have phases.",
        motion: { speed: 34, idle: 2.8 },
        draw(ctx, S, st) {
            const q = st.big ? 4 : 3, W = Math.ceil(S.w / q), H = Math.ceil(S.h / q), o = st.store;
            if (!o.cv || o.W !== W || o.H !== H) {
                o.cv = mkCanvas(W, H); o.cx = o.cv.getContext('2d'); o.img = o.cx.createImageData(W, H);
                o.buf = new Uint32Array(o.img.data.buffer); o.W = W; o.H = H;
            }
            const k = S.idleK, balls = [];
            const add = (lx, ly, r) => { const [wx, wy] = toWorld(S, lx, ly); balls.push(wx / q, wy / q, ((r * S.u) / q) ** 2); };
            add(9 + 7 * k, 0, 8); add(-4, 0, 9.5); add(-16 - 9 * k, 0, 7.5); add(20 + 10 * k, 0, 5.5);
            if (k > 0.05) { add(-4, -14 * k, 3 * k); add(6, 15 * k, 2.6 * k); }
            for (const l of legs(S)) {
                const sp = 1 + 0.35 * k;
                add(lerp(l.hx, l.kx, 0.5) * sp, lerp(l.hy, l.ky, 0.5) * sp, 2.4);
                add(l.kx * sp, l.ky * sp, 2.3);
                add(lerp(l.kx, l.fx, 0.5) * sp, lerp(l.ky, l.fy, 0.5) * sp, 2.1);
                add(l.fx * sp, l.fy * sp, 2.4);
            }
            const buf = o.buf; buf.fill(0);
            const R = (46 * S.u) / q, x0 = Math.max(0, Math.floor(S.x / q - R)), x1 = Math.min(W, Math.ceil(S.x / q + R));
            const y0 = Math.max(0, Math.floor(S.y / q - R)), y1 = Math.min(H, Math.ceil(S.y / q + R)), nb = balls.length;
            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    let f = 0;
                    for (let i = 0; i < nb; i += 3) { const dx = x - balls[i], dy = y - balls[i + 1]; f += balls[i + 2] / (dx * dx + dy * dy + 0.01); }
                    if (f < 0.8) continue;
                    const a = Math.min(1, (f - 0.8) / 0.35);
                    const idx = ((((f - 1) * 0.1 + (y / H) * 0.85 + (x / W) * 0.12) * 256) & 255);
                    buf[y * W + x] = (((a * 255) | 0) << 24) | CHROME[idx];
                }
            }
            o.cx.putImageData(o.img, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(o.cv, 0, 0, W * q, H * q);
            ctx.fillStyle = '#050506';
            for (const sd of [-1, 1]) { const [ex, ey] = toWorld(S, 22 + 10 * k, sd * 2.4); circle(ctx, ex, ey, 1.2 * S.u); ctx.fill(); }
        }
    });

    /* 13 SCRAWL: a single restless ballpoint loop */
    def({
        key: 'scrawl', name: 'SCRAWL', latin: 'Scribblus marginalis', tech: 'ballpoint scribble', swatch: 'paper', boil: 12,
        trait: 'a margin doodle that became sentient during a standup.',
        line: 'i was a todo comment once.',
        motion: { speed: 40, turn: 4 },
        under(ctx, S) {
            const u = S.u;
            ctx.lineWidth = 0.8; ctx.lineCap = 'round';
            eachChunk(S.hist, 170, 5, (a, b, f) => {
                tracePath(ctx, S.hist, a, b, (h) => [h.x + Math.cos(h.n * 0.9) * 2.6 * u, h.y + Math.sin(h.n * 0.9) * 2.6 * u]);
                ctx.strokeStyle = `rgba(18,19,22,${(f * 0.35).toFixed(3)})`; ctx.stroke();
            });
        },
        draw(ctx, S) {
            const r = rng(S.boil * 37 + 5), k = S.idleK;
            ctx.strokeStyle = 'rgba(18,19,22,0.88)'; ctx.lineWidth = 0.85; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            const loops = (cx, cy, rx, ry, n, lr, turns) => {
                ctx.beginPath();
                for (let i = 0; i <= n; i++) {
                    const t = (i / n) * TAU, la = t * turns + S.boil * 0.9;
                    const x = cx + Math.cos(t) * rx + Math.cos(la) * lr + (r() - 0.5) * 0.8;
                    const y = cy + Math.sin(t) * ry + Math.sin(la) * lr * 0.85 + (r() - 0.5) * 0.8;
                    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
                }
                ctx.stroke();
            };
            for (const l of legs(S)) {
                ctx.beginPath();
                const pts = [[l.hx, l.hy], [l.kx, l.ky], [l.fx, l.fy]];
                for (let s = 0; s < 2; s++) {
                    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
                    for (let i = 0; i <= 5; i++) {
                        const q = i / 5, z = (i % 2 ? 1 : -1) * 1.2 * (1 - q * 0.5);
                        const x = ax + dx * q + (-dy / d) * z, y = ay + dy * q + (dx / d) * z;
                        if (!s && !i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }
            loops(-2, 0, 13, 8, 110, 3.2 * (1 + k * 0.9), 17);
            ctx.beginPath();
            for (let i = 0; i <= 16; i++) {
                const x = -14 + i * 1.7, h = Math.sqrt(Math.max(0, 1 - ((x + 2) / 14) ** 2)) * 8;
                ctx.lineTo(x + (r() - 0.5), (i % 2 ? -h : h) * 0.9);
            }
            ctx.stroke();
            loops(18, 0, 4.2, 4.5, 50, 2.2, 9);
            ctx.fillStyle = INK; circle(ctx, 20.5, -2.2, 1.3); ctx.fill(); circle(ctx, 20.5, 2.2, 1.3); ctx.fill();
            for (const sd of [-1, 1]) {
                ctx.beginPath(); ctx.moveTo(22, sd * 3);
                ctx.quadraticCurveTo(28, sd * 9, 33, sd * 7.5);
                for (let i = 0; i < 14; i++) { const t = (i / 14) * TAU * 1.3, rr = 2.2 - i * 0.13; ctx.lineTo(33 + Math.cos(t) * rr, sd * (7.5 - 2.2 + Math.sin(t) * rr * sd + 2.2)); }
                ctx.stroke();
            }
            if (k > 0.02) {
                ctx.save(); ctx.rotate(-S.a); ctx.globalAlpha = clamp(k * 1.5, 0, 1);
                loops(0, -32, 9, 5, 90, 3.4, 13);
                ctx.lineWidth = 1.1;
                seg(ctx, -9, -22, -12, -18); seg(ctx, 0, -23, 0, -19); seg(ctx, 9, -22, 12, -18);
                ctx.restore();
            }
        }
    });

    /* 14 PURL: running-stitch embroidery on felt; sews its own trail */
    function thread(ctx, build, col, lw, dash, off) {
        ctx.setLineDash(dash || []); ctx.lineDashOffset = off || 0; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.save(); ctx.translate(0.45, 0.6); build(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = lw + 0.7; ctx.stroke(); ctx.restore();
        build(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
        ctx.save(); ctx.translate(-0.25, -0.3); build(); ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = lw * 0.3; ctx.stroke(); ctx.restore();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    def({
        key: 'purl', name: 'PURL', latin: 'Filum tapestrii', tech: 'running-stitch embroidery', swatch: 'felt',
        trait: 'hand-stitched, one careful loop at a time. sews its own trail.',
        line: 'held together by a single thread. like prod.',
        motion: { speed: 32, idle: 3 },
        under(ctx, S) {
            const u = S.u, H = S.hist;
            eachChunk(H, 220, 5, (a, b, f) => {
                ctx.globalAlpha = f * 0.85;
                thread(ctx, () => tracePath(ctx, H, a, b), SIG, 1.5 * u, [4 * u, 3 * u], (H[a].n * 2 * u) % (7 * u));
            });
            ctx.globalAlpha = 1;
        },
        draw(ctx, S) {
            for (const l of legs(S)) {
                thread(ctx, () => poly(ctx, [[l.hx, l.hy], [l.kx, l.ky], [l.fx, l.fy]]), '#e8e3d3', 1.6, [2.6, 1.5]);
            }
            thread(ctx, () => { ctx.beginPath(); ctx.moveTo(24, -2.5); ctx.quadraticCurveTo(30, -9, 36, -8); ctx.moveTo(24, 2.5); ctx.quadraticCurveTo(30, 9, 36, 8); }, '#e8e3d3', 1.1, [2.2, 1.4]);
            thread(ctx, () => {
                ctx.beginPath();
                for (let x = -18; x <= 13; x += 1.55) {
                    const h = 10.5 * Math.sqrt(Math.max(0, 1 - ((x + 2.5) / 16.2) ** 2));
                    if (h < 1) continue;
                    ctx.moveTo(x - 1.1, -h * 0.94); ctx.lineTo(x + 1.1, h * 0.94);
                }
            }, '#e8e3d3', 1.2);
            thread(ctx, () => { ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-18, 0); }, SIG, 1.5, [2.6, 0.9]);
            thread(ctx, () => {
                ctx.beginPath();
                for (let x = 14; x <= 25; x += 1.2) { const h = 6.2 * Math.sqrt(Math.max(0, 1 - ((x - 19.5) / 6) ** 2)); if (h > 0.6) { ctx.moveTo(x, -h); ctx.lineTo(x + 0.4, h); } }
            }, SIG, 1.1);
            ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
            for (const sd of [-1, 1]) { seg(ctx, 20, sd * 2.8 - 1, 22, sd * 2.8 + 1); seg(ctx, 22, sd * 2.8 - 1, 20, sd * 2.8 + 1); }
            if (S.idleK > 0.02) {
                const m = Math.abs(Math.sin(S.idle * TAU * 2)), nx = -24 - 6 * m, ny = 4 + 5 * m;
                ctx.globalAlpha = clamp(S.idleK * 1.6, 0, 1);
                thread(ctx, () => { ctx.beginPath(); ctx.moveTo(-18, 0); ctx.bezierCurveTo(-26, -8, -34 + m * 4, 14, nx - 3, ny - 2); }, SIG, 0.9);
                ctx.strokeStyle = '#cfd1d4'; ctx.lineWidth = 1.2; seg(ctx, nx - 5, ny - 3, nx + 6, ny + 3.5);
                ctx.strokeStyle = '#7b7d82'; ctx.lineWidth = 0.5; circle(ctx, nx - 3.6, ny - 2.2, 0.8); ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    });

    /* 15 LPI: halftone screen locked to the page; the bug moves through the dots */
    function segDist(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        return Math.hypot(px - ax - dx * t, py - ay - dy * t);
    }
    def({
        key: 'lpi', name: 'LPI', latin: 'Bendayus punctatus', tech: 'page-locked halftone', swatch: 'paper', world: true,
        trait: 'from far away, a bug. up close, a crisis.',
        line: '85 lines per inch and still pixel-peeping.',
        motion: { speed: 36, idle: 2.6 },
        draw(ctx, S) {
            const u = S.u, segs = [];
            for (const l of legs(S)) { segs.push([l.hx, l.hy, l.kx, l.ky], [l.kx, l.ky, l.fx, l.fy]); }
            segs.push([24, -3, 34, -9], [24, 3, 34, 9]);
            const ca = Math.cos(S.a), sa = Math.sin(S.a);
            const shade = (wx, wy) => {
                const dx = wx - S.x, dy = wy - S.y, lx = (dx * ca + dy * sa) / u, ly = (-dx * sa + dy * ca) / u;
                if (lx < -30 || lx > 40 || ly < -26 || ly > 26) return 0;
                let d = 0;
                const e = ((lx + 2) / 17) ** 2 + (ly / 11) ** 2;
                if (e < 1) { d = 0.28 + 0.62 * e; if (Math.abs(ly) < 0.9 && lx < 11) d = 1; if ((lx + 8) ** 2 + (ly + 4) ** 2 < 12) d *= 0.35; }
                const h = ((lx - 19.5) / 6.5) ** 2 + (ly / 7) ** 2;
                if (h < 1) { d = 0.82; if ((lx - 21.5) ** 2 + (Math.abs(ly) - 2.8) ** 2 < 2.4) d = 0; }
                if (!d) for (const s of segs) { const sd = segDist(lx, ly, s[0], s[1], s[2], s[3]); if (sd < 2.2) { d = Math.max(d, sd < 1.3 ? 1 : 1 - (sd - 1.3) / 0.9); } }
                if (d && S.idleK > 0) d *= 1 - 0.6 * S.idleK * (0.5 + 0.5 * Math.sin(Math.hypot(lx, ly) * 0.45 - S.t * 9));
                return d;
            };
            const screen = (angle, g, ox, oy, fill) => {
                const c = Math.cos(angle), s = Math.sin(angle), cx = S.x - ox, cy = S.y - oy, R = 44 * u;
                const i0 = Math.round((cx * c + cy * s) / g), j0 = Math.round((-cx * s + cy * c) / g), n = Math.ceil(R / g);
                const p = new Path2D();
                for (let i = i0 - n; i <= i0 + n; i++) {
                    for (let j = j0 - n; j <= j0 + n; j++) {
                        const x = (i * c - j * s) * g, y = (i * s + j * c) * g, d = shade(x + ox, y + oy);
                        if (d > 0.04) dot(p, x + ox, y + oy, Math.sqrt(d) * g * 0.56);
                    }
                }
                ctx.fillStyle = fill; ctx.fill(p);
            };
            screen(PI / 12, 4.2 * u, -3.2 * u, -4 * u, SIG);
            screen(PI / 4, 4.2 * u, 0, 0, INK);
        }
    });

    /* 16 CARET: a block cursor with legs, types as it walks */
    const CARET_TRAIL = 'const bug = new Bug(); bug.walk(); // works on my machine ';
    const CARET_MSG = ['ls ./bugs', 'git blame me', 'sudo make coffee', '// todo: legs', 'exit 0'];
    def({
        key: 'caret', name: 'CARET', latin: 'Promptus nictans', tech: 'terminal cursor', swatch: 'void', world: true,
        trait: 'a blinking cursor that grew legs and left the prompt.',
        line: 'still waiting for your input_',
        motion: { speed: 36, idle: 3.2, turn: 3 },
        draw(ctx, S) {
            const u = S.u, H = S.hist, len = H.length || 1;
            ctx.font = `500 ${9 * u}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = PAPER;
            for (const h of H) {
                if (h.n % 3) continue;
                const a = 1 - (S.n - h.n) / len;
                if (a < 0.05) continue;
                ctx.globalAlpha = a * 0.6;
                ctx.fillText(CARET_TRAIL[(h.n / 3) % CARET_TRAIL.length | 0], h.x, h.y + 2 * u);
            }
            ctx.globalAlpha = 1;
            const bw = 8 * u, bh = 14 * u, x = S.x - bw / 2, y = S.y - bh / 2;
            ctx.strokeStyle = PAPER; ctx.lineWidth = Math.max(1, 1.1 * u); ctx.lineCap = 'square';
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                for (const sd of [-1, 1]) {
                    const grp = (i + (sd > 0 ? 1 : 0)) % 2, lift = Math.max(0, Math.cos(S.phase + grp * PI)) * S.gait;
                    const sx = sd < 0 ? x : x + bw, yy = y + (3.5 + i * 3.8) * u;
                    ctx.moveTo(sx, yy); ctx.lineTo(sx + sd * 4 * u, yy - (1 + lift * 2.4) * u); ctx.lineTo(sx + sd * 6 * u, yy + 3 * u - lift * 2 * u);
                }
            }
            ctx.stroke();
            const idle = S.mode === 'idle', blinkOn = !idle || Math.floor(S.t * 2.4) % 2 === 0;
            if (blinkOn) { ctx.fillStyle = SIG; ctx.fillRect(x, y, bw, bh); }
            else { ctx.strokeStyle = SIG; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1); }
            ctx.fillStyle = blinkOn ? INK : SIG;
            const ex = S.x + Math.cos(S.a) * 1.4 * u, ey = y + 3.4 * u + Math.sin(S.a) * 0.8 * u;
            ctx.fillRect(ex - 2.4 * u, ey, 1.4 * u, 1.9 * u); ctx.fillRect(ex + 1 * u, ey, 1.4 * u, 1.9 * u);
            if (idle) {
                const msg = '$ ' + CARET_MSG[S.cycle % CARET_MSG.length];
                const shown = msg.slice(0, Math.min(msg.length, Math.floor(S.idle * 2.2 * msg.length)));
                const right = S.x < S.w * 0.6;
                ctx.textAlign = right ? 'left' : 'right'; ctx.fillStyle = PAPER; ctx.globalAlpha = clamp((1 - S.idle) * 5, 0, 1);
                ctx.fillText(shown, right ? x + bw + 9 * u : x - 9 * u, S.y - 12 * u);
                ctx.globalAlpha = 1;
            }
        }
    });

    /* 17 HALT: the breakpoint dot, roaming a code gutter; freezes everything when idle */
    def({
        key: 'halt', name: 'HALT', latin: 'Haltus debuggeri', tech: 'debugger breakpoint', swatch: 'editor',
        trait: 'stops everything to look at you. then steps over.',
        line: 'paused on line 42. we need to talk.',
        motion: { speed: 34, idle: 3 },
        under(ctx, S, st) {
            const u = S.u, rh = 14 * u, gw = Math.max(24, 26 * u), o = st.store;
            if (!o.rows) {
                const r = rng(33);
                o.rows = Array.from({ length: 80 }, () => {
                    const segs = [], n = r() < 0.18 ? 0 : 1 + Math.floor(r() * 4);
                    for (let i = 0; i < n; i++) segs.push([4 + r() * 22, Math.floor(r() * 4)]);
                    return { ind: Math.floor(r() * 4), segs };
                });
            }
            const cur = Math.floor(S.y / rh), idle = S.mode === 'idle';
            ctx.fillStyle = 'rgba(238,236,229,0.035)'; ctx.fillRect(0, 0, gw, S.h);
            if (idle) {
                ctx.fillStyle = `rgba(255,237,41,${(0.04 + 0.1 * S.idleK).toFixed(3)})`; ctx.fillRect(0, cur * rh, S.w, rh);
                ctx.fillStyle = SIG; ctx.fillRect(gw - 2, cur * rh, 2, rh);
                ctx.fillStyle = RED; circle(ctx, 7 * u, cur * rh + rh / 2, 3.2 * u); ctx.fill();
            }
            ctx.font = `500 ${7.5 * u}px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            const cols = ['rgba(238,236,229,0.13)', 'rgba(255,237,41,0.2)', 'rgba(229,72,77,0.2)', 'rgba(238,236,229,0.07)'];
            const rows = Math.ceil(S.h / rh);
            for (let i = 0; i < rows; i++) {
                const y = i * rh + rh / 2, row = o.rows[i % o.rows.length];
                ctx.fillStyle = i === cur ? PAPER : 'rgba(238,236,229,0.26)';
                ctx.fillText(String(i + 1), gw - 6, y);
                let x = gw + 10 + row.ind * 9 * u;
                for (const [w, c] of row.segs) { ctx.fillStyle = cols[c]; ctx.fillRect(x, y - 2 * u, w * u, 4 * u); x += (w + 3) * u; }
            }
        },
        draw(ctx, S) {
            ctx.strokeStyle = 'rgba(238,236,229,0.85)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            for (const l of legs(S, { len: 0.82, spread: 0.92 })) { poly(ctx, [[l.hx, l.hy], [l.kx, l.ky], [l.fx, l.fy]]); ctx.stroke(); }
            seg(ctx, 14, -2, 20, -7); seg(ctx, 14, 2, 20, 7);
            if (S.mode === 'idle') {
                const f = (S.t * 1.1) % 1;
                ctx.strokeStyle = `rgba(229,72,77,${((1 - f) * S.idleK).toFixed(3)})`; ctx.lineWidth = 1;
                circle(ctx, -2, 0, 10 + f * 14); ctx.stroke();
            }
            ctx.fillStyle = '#a92d33'; circle(ctx, 11.5, 0, 4.8); ctx.fill();
            const g = ctx.createRadialGradient(-5, -4, 0.5, -2, 0, 11);
            g.addColorStop(0, '#ff9ea1'); g.addColorStop(0.45, RED); g.addColorStop(1, '#8f242a');
            ctx.fillStyle = g; circle(ctx, -2, 0, 10); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.55)'; oval(ctx, -5.5, -4.2, 2.6, 1.5); ctx.fill();
            ctx.fillStyle = PAPER; circle(ctx, 13.8, -1.8, 0.9); ctx.fill(); circle(ctx, 13.8, 1.8, 0.9); ctx.fill();
        },
        over(ctx, S) {
            if (S.mode !== 'idle') return;
            const u = S.u, txt = 'paused in debugger';
            ctx.font = `500 ${7.5 * u}px ${MONO}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            const tw = ctx.measureText(txt).width, bw = tw + 30 * u, bh = 14 * u;
            const bx = clamp(S.x - bw / 2, 4, S.w - bw - 4), by = clamp(S.y - 36 * u, 4, S.h - bh - 4);
            ctx.globalAlpha = clamp(S.idleK * 2.5, 0, 1);
            ctx.fillStyle = '#26272b'; ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = SIG; ctx.fillRect(bx, by, 2 * u, bh);
            ctx.fillStyle = PAPER; ctx.fillText(txt, bx + 7 * u, by + bh / 2 + 0.5);
            const px = bx + tw + 12 * u, py = by + bh / 2;
            ctx.fillStyle = SIG; ctx.beginPath(); ctx.moveTo(px, py - 3 * u); ctx.lineTo(px + 5 * u, py); ctx.lineTo(px, py + 3 * u); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px + 12 * u, py + 1 * u, 3 * u, PI, 0); ctx.stroke();
            ctx.globalAlpha = 1;
        }
    });

    /* 18 HPGL: stepper-driven plotter rover, pen on a boom, signs its name when idle */
    function sigSpiral(ctx, s, prog, u) {
        const steps = 12;
        let total = 0;
        for (let j = 0; j < steps; j++) total += (j + 1) * 1.2 * u;
        let left = total * prog, x = s.x, y = s.y;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < steps && left > 0; j++) {
            const L = Math.min(left, (j + 1) * 1.2 * u), a = s.a + j * (PI / 2);
            x += Math.cos(a) * L; y += Math.sin(a) * L; ctx.lineTo(x, y); left -= L;
        }
        ctx.stroke();
    }
    def({
        key: 'hpgl', name: 'HPGL', latin: 'Plotterus gcodii', tech: 'pen-plotter bot', swatch: 'paper',
        trait: 'walks in g-code, leaves receipts.',
        line: "G01 X12 Y40. that's bug for hi.",
        motion: { speed: 30, stepped: 2.6, turn: 2.6, idle: 3.2 },
        under(ctx, S, st) {
            const u = S.u, o = st.store;
            o.sigs = o.sigs || [];
            ctx.lineWidth = 0.9; ctx.lineJoin = 'miter';
            eachChunk(S.hist, 300, 6, (a, b, f) => {
                tracePath(ctx, S.hist, a, b);
                ctx.strokeStyle = `rgba(18,19,22,${(f * 0.55).toFixed(3)})`; ctx.stroke();
            });
            const [px, py] = toWorld(S, -22, 0);
            if (S.mode === 'idle') o.cur = { x: px, y: py, a: S.a, prog: S.idle };
            else if (o.cur) { o.sigs.push({ x: o.cur.x, y: o.cur.y, a: o.cur.a, t: S.t }); o.cur = null; if (o.sigs.length > 4) o.sigs.shift(); }
            for (const s of o.sigs) {
                const a = 1 - (S.t - s.t) / 14;
                if (a <= 0) continue;
                ctx.strokeStyle = `rgba(18,19,22,${(a * 0.7).toFixed(3)})`; sigSpiral(ctx, s, 1, u);
            }
            if (o.cur) { ctx.strokeStyle = INK; sigSpiral(ctx, o.cur, clamp(o.cur.prog * 1.3, 0, 1), u); }
        },
        draw(ctx, S) {
            const q = Math.floor(S.phase / (PI / 2)) * (PI / 2), tick = Math.floor(S.phase / (PI / 2)) & 1;
            ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
            ctx.fillStyle = INK;
            for (const l of legs(S, { phase: q, len: 0.9 })) {
                poly(ctx, [[l.hx * 0.9, l.hy], [l.kx, l.ky], [l.fx, l.fy]]); ctx.stroke();
                ctx.fillRect(l.kx - 1.2, l.ky - 1.2, 2.4, 2.4); ctx.fillRect(l.fx - 1.5, l.fy - 0.7, 3, 1.4);
            }
            ctx.lineWidth = 1; seg(ctx, -12, 0, -22, 0);
            circle(ctx, -22, 0, 2.6); ctx.stroke();
            ctx.fillStyle = S.mode === 'idle' || S.gait > 0.1 ? SIG : '#8d8a80'; circle(ctx, -22, 0, 1.3); ctx.fill();
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-14, -8.5, 28, 17, 3) : ctx.rect(-14, -8.5, 28, 17);
            ctx.fillStyle = '#f4f2ea'; ctx.fill(); ctx.lineWidth = 1.3; ctx.stroke();
            ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(18,19,22,0.55)';
            poly(ctx, [[-11, -5], [-5, -5], [-3, -3]]); ctx.stroke(); poly(ctx, [[-11, 5], [-5, 5], [-3, 3]]); ctx.stroke();
            poly(ctx, [[5, -5], [10, -5], [10, 5], [5, 5]]); ctx.stroke();
            ctx.fillStyle = INK; ctx.fillRect(-3, -4, 7, 8);
            ctx.fillStyle = '#f4f2ea'; for (let i = 0; i < 3; i++) ctx.fillRect(-2, -2.6 + i * 2.2, 1, 1);
            ctx.fillStyle = INK; ctx.fillRect(14, -6, 4, 12);
            ctx.fillStyle = tick ? SIG : '#6b685f'; circle(ctx, 16, -3.5, 1.1); ctx.fill();
            ctx.fillStyle = tick ? '#6b685f' : SIG; circle(ctx, 16, 3.5, 1.1); ctx.fill();
        },
        over(ctx, S) {
            const u = S.u;
            ctx.font = `500 ${Math.max(8, 7.5 * u)}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = 'rgba(18,19,22,0.55)';
            const gx = (S.x / (4 * u)).toFixed(1), gy = (S.y / (4 * u)).toFixed(1);
            ctx.fillText(`${S.mode === 'idle' ? 'G02' : 'G01'} X${gx} Y${gy} F1200${S.mode === 'idle' ? '  ; signing' : ''}`, 10, S.h - 10);
        }
    });

    /* 19 CHORUS: forty-eight fireflies on springs, holding a bug shape together */
    def({
        key: 'chorus', name: 'CHORUS', latin: 'Lampyris collectiva', tech: 'firefly particle swarm', swatch: 'void', world: true,
        trait: 'forty-eight fireflies in a trench coat.',
        line: "we are one bug. please don't count.",
        motion: { speed: 38, idle: 3 },
        draw(ctx, S, st) {
            const o = st.store, u = S.u;
            if (!o.p) {
                const r = rng(21);
                o.p = [];
                for (let i = 0; i < 48; i++) {
                    let hx = 0, hy = 0, leg = -1, t = 0;
                    if (i < 22) { const a = r() * TAU, rr = Math.sqrt(r()); hx = -2 + Math.cos(a) * 16 * rr; hy = Math.sin(a) * 10 * rr; }
                    else if (i < 28) { const a = r() * TAU, rr = Math.sqrt(r()); hx = 19 + Math.cos(a) * 5.5 * rr; hy = Math.sin(a) * 5.5 * rr; }
                    else if (i < 46) { leg = (i - 28) % 6; t = [0.4, 0.75, 1][Math.floor((i - 28) / 6)]; }
                    else { hx = 32; hy = i === 46 ? -7 : 7; }
                    o.p.push({ x: S.x, y: S.y, vx: 0, vy: 0, hx, hy, leg, t, s: r() });
                }
            }
            const L = legs(S, { len: 1.05 }), c = Math.cos(S.a), s = Math.sin(S.a), dt = Math.min(S.dt, 0.033), k = S.idleK;
            for (const p of o.p) {
                let lx = p.hx, ly = p.hy;
                if (p.leg >= 0) {
                    const l = L[p.leg];
                    if (p.t < 0.5) { const q = p.t / 0.5; lx = lerp(l.hx, l.kx, q); ly = lerp(l.hy, l.ky, q); }
                    else { const q = (p.t - 0.5) / 0.5; lx = lerp(l.kx, l.fx, q); ly = lerp(l.ky, l.fy, q); }
                }
                const sa = p.s * TAU + S.t * (0.6 + p.s), sr = k * (14 + 22 * p.s);
                lx += Math.cos(sa) * sr + Math.sin(S.t * 3 + p.s * 40) * 0.6; ly += Math.sin(sa) * sr + Math.cos(S.t * 2.6 + p.s * 30) * 0.6;
                const tx = S.x + (lx * c - ly * s) * u, ty = S.y + (lx * s + ly * c) * u;
                if (!dt) { p.x = tx; p.y = ty; continue; }
                const K = 34 + p.s * 30;
                p.vx += ((tx - p.x) * K - p.vx * 9) * dt; p.vy += ((ty - p.y) * K - p.vy * 9) * dt;
                p.x += p.vx * dt; p.y += p.vy * dt;
            }
            ctx.globalCompositeOperation = 'lighter';
            const glow = new Path2D(), cores = [new Path2D(), new Path2D(), new Path2D()];
            for (const p of o.p) {
                dot(glow, p.x, p.y, 3.6 * u);
                const tw = 0.5 + 0.5 * Math.sin(S.t * 5 + p.s * 50);
                dot(cores[tw < 0.33 ? 0 : tw < 0.66 ? 1 : 2], p.x, p.y, 1.1 * u);
            }
            ctx.fillStyle = 'rgba(255,237,41,0.08)'; ctx.fill(glow);
            ctx.fillStyle = 'rgba(255,237,41,0.35)'; ctx.fill(cores[0]);
            ctx.fillStyle = 'rgba(255,237,41,0.75)'; ctx.fill(cores[1]);
            ctx.fillStyle = '#fffbe0'; ctx.fill(cores[2]);
            ctx.globalCompositeOperation = 'source-over';
        }
    });

    /* 20 CURLY: centipede of open braces with a metachronal leg wave; closes its scopes when idle */
    def({
        key: 'curly', name: 'CURLY', latin: 'Chilopoda bracketii', tech: 'bracket centipede', swatch: 'void', world: true,
        trait: 'every segment opens a scope. none of them close. usually.',
        line: '}}}}}}}}} finally. i can breathe.',
        motion: { speed: 32, turn: 2.4, stride: 10, idle: 3 },
        draw(ctx, S) {
            const u = S.u, N = 13, P = trailPoints(S, N, 6.2 * u);
            const ang = (i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)]; return Math.atan2(a.y - b.y, a.x - b.x); };
            ctx.strokeStyle = 'rgba(238,236,229,0.55)'; ctx.lineWidth = Math.max(1, 0.9 * u); ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 1; i < N - 1; i++) {
                const a = ang(i), w = Math.sin(S.phase * 1.2 - i * 0.95) * 0.55 * S.gait;
                for (const sd of [-1, 1]) {
                    const la = a + sd * (PI / 2 - w), kx = P[i].x + Math.cos(la) * 4.5 * u, ky = P[i].y + Math.sin(la) * 4.5 * u;
                    const fa = la - sd * 0.5;
                    ctx.moveTo(P[i].x + Math.cos(la) * 2 * u, P[i].y + Math.sin(la) * 2 * u);
                    ctx.lineTo(kx, ky); ctx.lineTo(kx + Math.cos(fa) * 3.5 * u, ky + Math.sin(fa) * 3.5 * u);
                }
            }
            ctx.stroke();
            ctx.font = `500 ${11 * u}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (let i = N - 1; i >= 1; i--) {
                const c = (N - 1 - i) / (N - 1), closed = S.mode === 'idle' && S.idle * 1.4 > c && S.idle < 0.9;
                ctx.save(); ctx.translate(P[i].x, P[i].y); ctx.rotate(ang(i));
                ctx.fillStyle = closed ? SIG : PAPER;
                ctx.fillText(i === N - 1 ? ';' : closed ? '}' : '{', 0, 0);
                ctx.restore();
            }
            const ha = ang(0);
            ctx.save(); ctx.translate(P[0].x, P[0].y); ctx.rotate(ha);
            ctx.strokeStyle = 'rgba(238,236,229,0.7)'; ctx.lineWidth = Math.max(1, 0.8 * u);
            const tw = S.idleK * Math.sin(S.t * 20) * 2 * u;
            ctx.beginPath();
            ctx.moveTo(3 * u, -2 * u); ctx.quadraticCurveTo(9 * u, -7 * u + tw, 13 * u, -5 * u + tw);
            ctx.moveTo(3 * u, 2 * u); ctx.quadraticCurveTo(9 * u, 7 * u - tw, 13 * u, 5 * u - tw);
            ctx.stroke();
            ctx.rotate(PI / 2); ctx.fillStyle = SIG; ctx.fillText('@', 0, 0);
            ctx.restore();
        }
    });

    /* ---------- locomotion ---------- */

    class Motor {
        constructor(st, o) {
            this.st = st;
            this.o = Object.assign({ speed: 40, turn: 3.4, stride: 12, idle: 2.6, pause: 0.5, stepped: 0 }, o);
            const { w, h, u } = st;
            this.x = w * (0.3 + 0.4 * Math.random()); this.y = h * (0.35 + 0.3 * Math.random());
            this.a = Math.random() * TAU; this.v = 0; this.phase = 0; this.mode = 'walk';
            this.idle = 0; this.timer = 0; this.acc = 0; this.n = 0; this.cycles = 0; this.dir = 1; this.hist = [];
            for (let i = 40; i > 0; i--) this.hist.push({ x: this.x - Math.cos(this.a) * i * 2 * u, y: this.y - Math.sin(this.a) * i * 2 * u, n: this.n++ });
            this.pick();
        }
        bounds() { const st = this.st, m = Math.min(30 * st.u, Math.min(st.w, st.h) * 0.22); return [m, m, st.w - m, st.h - m]; }
        pick() {
            const [x0, y0, x1, y1] = this.bounds();
            let tx = this.x, ty = this.y;
            for (let i = 0; i < 10; i++) {
                tx = lerp(x0, x1, Math.random()); ty = lerp(y0, y1, Math.random());
                if (Math.hypot(tx - this.x, ty - this.y) > Math.min(this.st.w, this.st.h) * 0.35) break;
            }
            this.tx = tx; this.ty = ty;
        }
        contain() { this.x = clamp(this.x, 0, this.st.w); this.y = clamp(this.y, 0, this.st.h); this.pick(); }
        update(dt) {
            const st = this.st, o = this.o, u = st.u, maxV = o.speed * u, p = st.pointer;
            if (p && p.on && this.mode !== 'idle') {
                const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy), keep = 46 * u;
                if (d > keep * 1.25) { this.tx = p.x - (dx / d) * keep; this.ty = p.y - (dy / d) * keep; this.mode = 'walk'; }
            }
            if (this.mode === 'walk') {
                const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
                const diff = wrap(Math.atan2(dy, dx) - this.a);
                this.a = wrap(this.a + clamp(diff, -o.turn * dt, o.turn * dt));
                const vt = maxV * (1 - Math.min(1, Math.abs(diff) / PI) * 0.75) * Math.max(0.2, Math.min(1, d / (26 * u)));
                this.v += (vt - this.v) * Math.min(1, dt * 4);
                if (d < 3 * u) { this.mode = 'pause'; this.timer = o.pause * (0.6 + Math.random() * 0.9); }
            } else {
                this.v += (0 - this.v) * Math.min(1, dt * 8);
                if (this.mode === 'pause') {
                    this.timer -= dt;
                    if (this.timer <= 0) { this.mode = 'idle'; this.idle = 0; this.cycles++; }
                } else {
                    this.idle += dt / o.idle;
                    if (this.idle >= 1) { this.idle = 0; this.mode = 'walk'; this.pick(); }
                }
            }
            let mv = this.v * dt;
            if (o.stepped) {
                this.acc += mv; mv = 0;
                const q = o.stepped * u;
                if (this.acc >= q) { mv = q; this.acc = Math.min(q, this.acc - q); }
            }
            this.x += Math.cos(this.a) * mv; this.y += Math.sin(this.a) * mv;
            this.phase += (mv / (o.stride * u)) * PI;
            const c = Math.cos(this.a);
            if (c > 0.3) this.dir = 1; else if (c < -0.3) this.dir = -1;
            const h = this.hist[this.hist.length - 1];
            if (Math.hypot(this.x - h.x, this.y - h.y) >= 2 * u) {
                this.hist.push({ x: this.x, y: this.y, n: this.n++ });
                if (this.hist.length > 320) this.hist.shift();
            }
        }
    }

    /* ---------- stage ---------- */

    const active = new Set();
    let raf = 0, last = 0, fxStage = null;

    class Stage {
        constructor(host, d, opts = {}) {
            this.host = host; this.def = d; this.big = !!opts.big; this.store = {}; this.t = 0; this.dt = 0; this.S = {}; this.pointer = null;
            if (d.dom) this.el = d.mount(host, this);
            else {
                this.cv = document.createElement('canvas'); this.cv.setAttribute('aria-hidden', 'true');
                host.appendChild(this.cv); this.ctx = this.cv.getContext('2d');
            }
            this.measure();
            this.m = new Motor(this, d.motion || {});
            if (REDUCED) { this.m.v = this.m.o.speed * this.u * 0.8; this.m.phase = 0.9; }
            this.ro = new ResizeObserver(() => { const w = this.w, h = this.h; this.measure(); if (w !== this.w || h !== this.h) { this.m.contain(); } this.draw(); });
            this.ro.observe(host);
            this.draw();
        }
        measure() {
            const w = this.host.clientWidth || 300, h = this.host.clientHeight || 225;
            this.w = w; this.h = h; this.dpr = Math.min(2, window.devicePixelRatio || 1);
            if (this.cv) {
                const W = Math.round(w * this.dpr), H = Math.round(h * this.dpr);
                if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; }
            }
            const base = Math.min(w, h);
            this.u = this.big ? clamp(base / 250, 1.3, 2.6) : clamp(base / 200, 0.75, 1.35);
        }
        tick(dt) { this.dt = dt; this.t += dt; this.m.update(dt); this.draw(); }
        state() {
            const m = this.m, S = this.S, maxV = m.o.speed * this.u;
            S.x = m.x; S.y = m.y; S.a = m.a; S.u = this.u; S.t = this.t; S.dt = this.dt; S.phase = m.phase; S.v = m.v;
            S.gait = clamp(m.v / (maxV * 0.3), 0, 1); S.mode = m.mode;
            S.idle = m.mode === 'idle' ? m.idle : 0; S.idleK = m.mode === 'idle' ? Math.sin(PI * m.idle) : 0;
            S.boil = Math.floor(this.t * (this.def.boil || 10)); S.hist = m.hist; S.n = m.n; S.cycle = m.cycles;
            S.w = this.w; S.h = this.h; S.dir = m.dir; S.big = this.big;
            return S;
        }
        draw() {
            if (!this.m) return;
            const S = this.state(), d = this.def;
            if (d.dom) { d.update(S, this); return; }
            const c = this.ctx;
            c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
            c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
            if (d.under) { c.save(); d.under(c, S, this); c.restore(); }
            c.save();
            if (d.world) d.draw(c, S, this);
            else { c.translate(S.x, S.y); if (!d.upright) c.rotate(S.a); c.scale(S.u, S.u); d.draw(c, S, this); }
            c.restore();
            if (d.over) { c.save(); d.over(c, S, this); c.restore(); }
        }
        destroy() { this.ro.disconnect(); active.delete(this); this.host.replaceChildren(); }
    }

    function loop(now) {
        raf = 0;
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        if (fxStage) { fxStage.tick(dt); placeBubble(); }
        else for (const st of active) st.tick(dt);
        if (fxStage || active.size) raf = requestAnimationFrame(loop); else last = 0;
    }
    function wake() { if (!raf && !REDUCED) { last = 0; raf = requestAnimationFrame(loop); } }

    /* ---------- gallery ---------- */

    const store = {
        get final() { try { return localStorage.getItem(LS_FINAL); } catch (e) { return null; } },
        set final(k) { try { if (k) localStorage.setItem(LS_FINAL, k); else localStorage.removeItem(LS_FINAL); } catch (e) { /* storage blocked */ } },
        get short() { try { return JSON.parse(localStorage.getItem(LS_SHORT) || '[]'); } catch (e) { return []; } },
        set short(a) { try { localStorage.setItem(LS_SHORT, JSON.stringify(a)); } catch (e) { /* storage blocked */ } },
    };
    const byKey = Object.fromEntries(CONCEPTS.map((c, i) => [c.key, Object.assign(c, { no: String(i + 1).padStart(2, '0') })]));

    const plate = document.getElementById('plate');
    const cards = new Map();
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) { const st = e.target.__stage; if (e.isIntersecting) active.add(st); else active.delete(st); }
        wake();
    }, { rootMargin: '60px' });

    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

    CONCEPTS.forEach((c) => {
        const el = document.createElement('article');
        el.className = 'sp';
        el.dataset.key = c.key;
        el.tabIndex = 0;
        el.setAttribute('aria-label', `No. ${c.no} ${c.name}, ${c.tech}. Open specimen.`);
        el.innerHTML = `
            <div class="sp-stage sw-${c.swatch}"><div class="sp-host"></div>
                <span class="sp-pin" aria-hidden="true"></span>
                <span class="sp-no">No. ${c.no}</span>
                <span class="sp-scale" aria-hidden="true"><i></i>10 mm</span>
                <span class="sp-stamp" aria-hidden="true">finalised</span>
            </div>
            <div class="sp-label">
                <div class="sp-meta"><span>[ ${esc(c.tech)} ]</span><span class="sp-sl">shortlisted</span></div>
                <h2 class="sp-name">${c.name}</h2>
                <p class="sp-latin">${esc(c.latin)} <span>det. 2026</span></p>
                <p class="sp-trait">${esc(c.trait)}</p>
                <p class="sp-quote">${esc(c.line)}</p>
                <div class="sp-actions">
                    <button type="button" class="sp-btn" data-act="final">[ finalise ]</button>
                    <button type="button" class="sp-btn" data-act="short">[ shortlist ]</button>
                </div>
            </div>`;
        plate.appendChild(el);
        const host = el.querySelector('.sp-host');
        const st = new Stage(host, c);
        host.__stage = st;
        io.observe(host);
        cards.set(c.key, el);
    });

    function toggleFinal(k) { store.final = store.final === k ? null : k; sync(); }
    function toggleShort(k) {
        const s = store.short, i = s.indexOf(k);
        if (i >= 0) s.splice(i, 1); else s.push(k);
        store.short = s; sync();
    }

    const tbFinal = document.getElementById('tbFinal'), tbShort = document.getElementById('tbShort');
    function sync() {
        const f = store.final, s = store.short.filter((k) => byKey[k]);
        for (const [k, el] of cards) {
            const isF = f === k, isS = s.includes(k);
            el.classList.toggle('is-final', isF); el.classList.toggle('is-short', isS);
            const bf = el.querySelector('[data-act="final"]'), bs = el.querySelector('[data-act="short"]');
            bf.textContent = isF ? '[ finalised ]' : '[ finalise ]'; bf.classList.toggle('is-on', isF); bf.setAttribute('aria-pressed', isF);
            bs.textContent = isS ? '[ shortlisted ]' : '[ shortlist ]'; bs.classList.toggle('is-on', isS); bs.setAttribute('aria-pressed', isS);
        }
        tbFinal.innerHTML = f && byKey[f] ? `<button type="button" class="tb-chip is-final" data-open="${f}">No. ${byKey[f].no} ${byKey[f].name}</button>` : '<span class="tb-none">none yet</span>';
        tbShort.innerHTML = s.length ? s.map((k) => `<button type="button" class="tb-chip" data-open="${k}">${byKey[k].name}</button>`).join('') : '<span class="tb-none">empty</span>';
        if (fxKey) fxSync();
    }

    plate.addEventListener('click', (e) => {
        const card = e.target.closest('.sp');
        if (!card) return;
        const btn = e.target.closest('[data-act]');
        if (btn) { e.stopPropagation(); (btn.dataset.act === 'final' ? toggleFinal : toggleShort)(card.dataset.key); return; }
        openFx(card.dataset.key);
    });
    plate.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('sp')) { e.preventDefault(); openFx(e.target.dataset.key); }
    });
    document.querySelector('.tb').addEventListener('click', (e) => {
        const chip = e.target.closest('[data-open]');
        if (chip) openFx(chip.dataset.open);
    });

    /* ---------- focus view ---------- */

    const fx = document.getElementById('fx'), fxHost = document.getElementById('fxStage'), fxBubble = document.getElementById('fxBubble');
    const $ = (id) => document.getElementById(id);
    let fxKey = null, fxOpenedAt = 0, fxBubbleCycle = -1, fxReturn = null;

    function fxSync() {
        const f = store.final === fxKey, s = store.short.includes(fxKey);
        const bf = fx.querySelector('[data-act="final"]'), bs = fx.querySelector('[data-act="short"]');
        bf.textContent = f ? '[ finalised ]' : '[ finalise ]'; bf.classList.toggle('is-on', f); bf.setAttribute('aria-pressed', f);
        bs.textContent = s ? '[ shortlisted ]' : '[ shortlist ]'; bs.classList.toggle('is-on', s); bs.setAttribute('aria-pressed', s);
        fx.classList.toggle('is-final', f);
    }
    function openFx(k) {
        const c = byKey[k];
        if (!c) return;
        if (!fxKey) fxReturn = document.activeElement;
        if (fxStage) fxStage.destroy();
        fxKey = k;
        $('fxNo').textContent = `No. ${c.no} / 20`;
        $('fxName').textContent = c.name;
        $('fxLatin').textContent = c.latin;
        $('fxTech').textContent = `[ ${c.tech} ]`;
        $('fxTrait').textContent = c.trait;
        $('fxQuote').textContent = c.line;
        fxHost.className = `fx-stage sw-${c.swatch}`;
        fx.hidden = false;
        document.documentElement.classList.add('fx-open');
        fxStage = new Stage(fxHost, c, { big: true });
        fxOpenedAt = performance.now(); fxBubbleCycle = -1;
        fxBubble.textContent = ''; fxBubble.classList.remove('is-on');
        fxSync();
        $('fxClose').focus({ preventScroll: true });
        if (REDUCED) placeBubble(true);
        wake();
    }
    function closeFx() {
        if (!fxKey) return;
        fxStage.destroy(); fxStage = null; fxKey = null;
        fx.hidden = true;
        document.documentElement.classList.remove('fx-open');
        if (fxReturn && fxReturn.focus) fxReturn.focus({ preventScroll: true });
        wake();
    }
    function step(d) { const i = CONCEPTS.findIndex((c) => c.key === fxKey); openFx(CONCEPTS[(i + d + CONCEPTS.length) % CONCEPTS.length].key); }

    function placeBubble(force) {
        if (!fxStage) return;
        const m = fxStage.m, c = fxStage.def, u = fxStage.u;
        const fresh = performance.now() - fxOpenedAt < 3200;
        const show = force || fresh || m.mode === 'idle';
        if (show) {
            if (fxBubbleCycle !== m.cycles || !fxBubble.textContent) { fxBubbleCycle = m.cycles; fxBubble.dataset.full = c.line; fxBubble.dataset.t0 = performance.now(); }
            const full = fxBubble.dataset.full, n = REDUCED ? full.length : Math.min(full.length, Math.floor((performance.now() - fxBubble.dataset.t0) / 32));
            if (fxBubble.textContent !== full.slice(0, n)) fxBubble.textContent = full.slice(0, n);
            const bw = fxBubble.offsetWidth, bh = fxBubble.offsetHeight;
            const x = clamp(m.x - bw * 0.2, 8, fxStage.w - bw - 8), y = clamp(m.y - 44 * u - bh, 8, fxStage.h - bh - 8);
            fxBubble.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        }
        fxBubble.classList.toggle('is-on', !!show);
    }

    fxHost.addEventListener('pointermove', (e) => {
        if (!fxStage) return;
        const r = fxHost.getBoundingClientRect();
        fxStage.pointer = { x: e.clientX - r.left, y: e.clientY - r.top, on: true };
    });
    fxHost.addEventListener('pointerleave', () => { if (fxStage) fxStage.pointer = null; });
    $('fxClose').addEventListener('click', closeFx);
    $('fxPrev').addEventListener('click', () => step(-1));
    $('fxNext').addEventListener('click', () => step(1));
    fx.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (btn) { (btn.dataset.act === 'final' ? toggleFinal : toggleShort)(fxKey); return; }
        if (e.target === fx) closeFx();
    });
    document.addEventListener('keydown', (e) => {
        if (!fxKey) return;
        if (e.key === 'Escape') closeFx();
        else if (e.key === 'ArrowRight') step(1);
        else if (e.key === 'ArrowLeft') step(-1);
    });

    sync();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { for (const el of cards.values()) el.querySelector('.sp-host').__stage.draw(); });
    wake();
})();
