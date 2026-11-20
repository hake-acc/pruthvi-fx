// Builds the "time map": a canvas where every ink pixel stores the moment the quill reaches it.
// R,G = 16-bit time (0..TMAX s), B = ink density, A = coverage. The shader reveals, bleeds and dries it.
import { MAP, FLOOR, WALL, detailStrokes, LABELS } from './plan.js';

export const TMAX = 16;
export const INK_SPEED = 1050;   // how fast the ink front travels outward from the wand (units/s)
const NIB_SPEED = 620;           // how fast a single stroke is drawn (units/s)
const NIB_SCALE = 1.6;
const START = 0.42;

export const FONTS = {
    sc: '"MM Fell SC", Georgia, serif',
    fell: '"MM Fell", Georgia, serif',
    italic: 'italic 400 {z}px "MM Fell", Georgia, serif',
    script: '"MM Pinyon", "MM Fell", cursive',
};
export function fontFor(f, z) {
    if (f === 'italic') return `italic 400 ${z}px "MM Fell", Georgia, serif`;
    if (f === 'sc') return `400 ${z}px "MM Fell SC", Georgia, serif`;
    if (f === 'script') return `400 ${z}px "MM Pinyon", "MM Fell", cursive`;
    return `400 ${z}px "MM Fell", Georgia, serif`;
}

export function inkColor(t, tmax, density) {
    const v = Math.max(0, Math.min(65535, Math.round((t / tmax) * 65535)));
    return `rgb(${v >> 8},${v & 255},${Math.round(Math.max(0, Math.min(1, density)) * 255)})`;
}

export function mulberry(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ------------------------------------------------------------------ wall contours (built once)
const CS = 3;
function drawFloor(ctx, inflate) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    for (const p of FLOOR) {
        if (p.t === 'rect') ctx.fillRect((p.x - inflate) / CS, (p.y - inflate) / CS, (p.w + inflate * 2) / CS, (p.h + inflate * 2) / CS);
        else if (p.t === 'circle') { ctx.beginPath(); ctx.arc(p.x / CS, p.y / CS, (p.r + inflate) / CS, 0, Math.PI * 2); ctx.fill(); }
        else {
            ctx.lineWidth = (p.w + inflate * 2) / CS; ctx.lineCap = inflate ? 'square' : 'butt';
            ctx.beginPath(); p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x / CS, y / CS) : ctx.moveTo(x / CS, y / CS))); ctx.stroke();
        }
    }
}

function marching(field, gw, gh, iso) {
    const segA = [], segB = [], pos = new Map();
    const H = (x, y) => (y * gw + x) * 2, V = (x, y) => (y * gw + x) * 2 + 1;
    const lerp = (a, b) => (iso - a) / (b - a || 1e-6);
    const point = (key, fa, fb, x, y, horiz) => {
        if (!pos.has(key)) { const t = lerp(fa, fb); pos.set(key, horiz ? [x + t, y] : [x, y + t]); }
        return key;
    };
    for (let y = 0; y < gh - 1; y++) {
        for (let x = 0; x < gw - 1; x++) {
            const a = field[y * gw + x], b = field[y * gw + x + 1], c = field[(y + 1) * gw + x + 1], d = field[(y + 1) * gw + x];
            const idx = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const T = () => point(H(x, y), a, b, x, y, true), B = () => point(H(x, y + 1), d, c, x, y + 1, true);
            const L = () => point(V(x, y), a, d, x, y, false), Rr = () => point(V(x + 1, y), b, c, x + 1, y, false);
            const s = (p, q) => { segA.push(p); segB.push(q); };
            switch (idx) {
                case 1: case 14: s(L(), B()); break;
                case 2: case 13: s(B(), Rr()); break;
                case 3: case 12: s(L(), Rr()); break;
                case 4: case 11: s(T(), Rr()); break;
                case 6: case 9: s(T(), B()); break;
                case 7: case 8: s(T(), L()); break;
                case 5: s(T(), L()); s(Rr(), B()); break;
                case 10: s(T(), Rr()); s(L(), B()); break;
            }
        }
    }
    const adj = new Map();
    const link = (k, i) => { const l = adj.get(k); if (l) l.push(i); else adj.set(k, [i]); };
    for (let i = 0; i < segA.length; i++) { link(segA[i], i); link(segB[i], i); }
    const used = new Uint8Array(segA.length), lines = [];
    for (let i = 0; i < segA.length; i++) {
        if (used[i]) continue;
        used[i] = 1;
        const chain = [segA[i], segB[i]];
        for (let dir = 0; dir < 2; dir++) {
            for (;;) {
                const end = dir ? chain[0] : chain[chain.length - 1];
                const next = (adj.get(end) || []).find((j) => !used[j]);
                if (next === undefined) break;
                used[next] = 1;
                const other = segA[next] === end ? segB[next] : segA[next];
                if (dir) chain.unshift(other); else chain.push(other);
            }
        }
        if (chain.length > 3) lines.push(chain.map((k) => { const p = pos.get(k); return [p[0] * CS, p[1] * CS]; }));
    }
    return lines;
}

function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
        const [i0, i1] = stack.pop();
        const [ax, ay] = pts[i0], [bx, by] = pts[i1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
        let md = 0, mi = -1;
        for (let i = i0 + 1; i < i1; i++) {
            const d = L < 1e-3 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
            if (d > md) { md = d; mi = i; }
        }
        if (md > eps && mi > 0) { keep[mi] = 1; stack.push([i0, mi], [mi, i1]); }
    }
    return pts.filter((_, i) => keep[i]);
}

function chunk(pts, maxLen) {
    const out = []; let cur = [pts[0]], acc = 0;
    for (let i = 1; i < pts.length; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        cur.push(pts[i]);
        if (acc > maxLen && i < pts.length - 2) { out.push(cur); cur = [pts[i]]; acc = 0; }
    }
    if (cur.length > 1) out.push(cur);
    return out;
}

let WALLS = null;
export function wallStrokes() {
    if (WALLS) return WALLS;
    const gw = Math.ceil(MAP.W / CS) + 2, gh = Math.ceil(MAP.H / CS) + 2;
    const c = document.createElement('canvas'); c.width = gw; c.height = gh;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const field = (inflate) => {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, gw, gh);
        drawFloor(ctx, inflate);
        const d = ctx.getImageData(0, 0, gw, gh).data, f = new Float32Array(gw * gh);
        for (let i = 0; i < f.length; i++) f[i] = d[i * 4] / 255;
        return f;
    };
    const inner = marching(field(0), gw, gh, 0.5), outer = marching(field(WALL), gw, gh, 0.5);
    WALLS = [];
    inner.forEach((l) => chunk(rdp(l, 0.9), 320).forEach((p) => WALLS.push({ pts: p, w: 1.3, wob: 0.8 })));
    outer.forEach((l) => chunk(rdp(l, 0.9), 320).forEach((p) => WALLS.push({ pts: p, w: 1.95, wob: 1.0 })));
    return WALLS;
}

// ------------------------------------------------------------------ stroke → timed segments
function resample(pts, step) {
    const out = [pts[0]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
        let d = step - carry;
        while (d <= L) { out.push([ax + (bx - ax) * (d / L), ay + (by - ay) * (d / L)]); d += step; }
        carry = L - (d - step);
    }
    const last = pts[pts.length - 1], tail = out[out.length - 1];
    if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > 0.5) out.push(last);
    return out;
}

function strokeOps(ops, s, t0, rnd, opts = {}) {
    const pts = resample(s.pts, 3.2);
    if (pts.length < 2) return t0;
    const wob = s.wob ?? 0.55, ph1 = rnd() * 100, ph2 = rnd() * 100, ph3 = rnd() * 100;
    const nib = opts.nib ?? NIB_SPEED * (0.85 + rnd() * 0.3);
    let acc = 0, t = t0;
    const P = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
        const n = (Math.sin(acc * 0.019 + ph1) * 0.6 + Math.sin(acc * 0.061 + ph2) * 0.3 + Math.sin(acc * 0.17 + ph3) * 0.1) * wob;
        return [p[0] - (dy / L) * n, p[1] + (dx / L) * n, acc];
    });
    const total = acc;
    for (let i = 1; i < P.length; i++) {
        const [ax, ay, sa] = P[i - 1], [bx, by] = P[i];
        const u = sa / Math.max(1, total);
        const press = 0.84 + 0.22 * Math.sin(sa * 0.013 + ph2) + 0.08 * Math.sin(sa * 0.09 + ph1);
        const taper = Math.min(1, 0.55 + sa / 10) * (u > 0.92 ? 0.75 + (1 - u) * 3 : 1);
        const w = s.w * press * taper;
        t = t0 + sa / nib;
        const dens = 0.78 + 0.22 * Math.sin(sa * 0.007 + ph3) * Math.sin(sa * 0.031 + ph1) + (sa < 6 ? 0.15 : 0);
        ops.push({ t, k: 0, ax, ay, bx, by, w, d: dens });
    }
    // a small ink pool where the nib first touches the paper
    if (s.w > 1.0 && !opts.noBlob) ops.push({ t: t0, k: 1, ax: P[0][0], ay: P[0][1], w: s.w * 0.85, d: 1 });
    return t0 + total / nib;
}

function orient(pts, wx, wy) {
    const a = pts[0], b = pts[pts.length - 1];
    return Math.hypot(a[0] - wx, a[1] - wy) <= Math.hypot(b[0] - wx, b[1] - wy) ? pts : pts.slice().reverse();
}
function nearest(pts, wx, wy) {
    let m = Infinity;
    for (let i = 0; i < pts.length; i += 3) m = Math.min(m, Math.hypot(pts[i][0] - wx, pts[i][1] - wy));
    return m;
}

export function inkArrival(x, y, wx, wy) { return START + Math.hypot(x - wx, y - wy) / INK_SPEED; }

// ------------------------------------------------------------------ text → timed glyph slices
export function textOps(ctx, ops, L, t0, rnd, charDur, slicesPer = 2) {
    ctx.font = fontFor(L.f, L.z);
    const chars = [...L.s], widths = [];
    let full = ctx.measureText(L.s).width;
    let prefix = '';
    const xs = chars.map((ch) => { const x = ctx.measureText(prefix).width; prefix += ch; return x; });
    chars.forEach((ch, i) => widths.push((i < chars.length - 1 ? xs[i + 1] : full) - xs[i]));
    const align = L.align || 'center';
    const ox = align === 'center' ? -full / 2 : align === 'right' ? -full : 0;
    let t = t0;
    chars.forEach((ch, i) => {
        if (ch === ' ') { t += charDur * 0.6; return; }
        const jit = { r: (rnd() - 0.5) * 0.045, y: (rnd() - 0.5) * L.z * 0.035, d: 0.86 + rnd() * 0.14 };
        for (let j = 0; j < slicesPer; j++) {
            ops.push({ t: t + (j / slicesPer) * charDur, k: 2, L, ch, x: ox + xs[i], w: widths[i], j, n: slicesPer, jit, d: jit.d, first: i === 0, last: i === chars.length - 1 });
        }
        t += charDur * (0.75 + rnd() * 0.5);
    });
    return t;
}

function drawGlyphOp(ctx, op) {
    const { L } = op, z = L.z;
    ctx.save();
    ctx.translate(L.x, L.y);
    if (L.a) ctx.rotate(L.a);
    const sw = op.w / op.n, padL = op.j === 0 ? z * 0.45 : 0, padR = op.j === op.n - 1 ? z * 0.45 : 0;
    ctx.beginPath();
    ctx.rect(op.x + sw * op.j - padL, -z * 1.25, sw + padL + padR + 0.4, z * 1.9);
    ctx.clip();
    ctx.translate(op.x + op.w / 2, op.jit.y);
    ctx.rotate(op.jit.r);
    ctx.font = fontFor(L.f, z);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.fillText(op.ch, 0, 0);
    ctx.restore();
}

export function renderOps(ctx, ops, tmax, scale) {
    ops.sort((a, b) => b.t - a.t);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const op of ops) {
        const col = inkColor(op.t, tmax, op.d);
        if (op.k === 0) {
            ctx.strokeStyle = col; ctx.lineWidth = Math.max(op.w, 0.55 / scale);
            ctx.beginPath(); ctx.moveTo(op.ax, op.ay); ctx.lineTo(op.bx, op.by); ctx.stroke();
        } else if (op.k === 1) {
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(op.ax, op.ay, op.w, 0, Math.PI * 2); ctx.fill();
        } else if (op.k === 3) {
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(op.ax, op.ay, op.w, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = col; drawGlyphOp(ctx, op);
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
        }
    }
}

// ------------------------------------------------------------------ the whole map, timed from the wand
export function buildInkMap(canvas, scale, wx, wy, seed = 1) {
    const rnd = mulberry(seed);
    canvas.width = Math.round(MAP.W * scale); canvas.height = Math.round(MAP.H * scale);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ops = [];
    let end = 0;
    const schedule = (s) => {
        const pts = orient(s.pts, wx, wy);
        const t0 = START + nearest(pts, wx, wy) / INK_SPEED + rnd() * 0.22;
        end = Math.max(end, strokeOps(ops, { ...s, pts, w: s.w * NIB_SCALE }, t0, rnd));
    };
    wallStrokes().forEach(schedule);
    detailStrokes().forEach(schedule);

    LABELS.map((L) => (L.x < MAP.PW ? L : { ...L, z: L.z * 1.3 })).forEach((L) => {
        const t0 = START + 0.12 + Math.hypot(L.x - wx, L.y - wy) / INK_SPEED + rnd() * 0.1;
        const big = L.z > 60;
        const charDur = big ? 0.07 + L.z * 0.0009 : 0.028 + L.z * 0.0016;
        end = Math.max(end, textOps(ctx, ops, L, t0, rnd, charDur, big ? 4 : L.z > 26 ? 3 : 2));
    });

    // the blot where the wand first touched
    ops.push({ t: 0.04, k: 3, ax: wx, ay: wy, w: 5.5, d: 1 });
    for (let i = 0; i < 7; i++) {
        const a = rnd() * Math.PI * 2, r = 8 + rnd() * 16;
        ops.push({ t: 0.08 + rnd() * 0.2, k: 3, ax: wx + Math.cos(a) * r, ay: wy + Math.sin(a) * r, w: 0.6 + rnd() * 1.6, d: 0.9 });
    }

    renderOps(ctx, ops, TMAX, scale);
    return { duration: Math.min(TMAX - 0.5, end + 0.2), count: ops.length };
}
