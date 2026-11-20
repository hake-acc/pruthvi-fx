// Small ink drawings, each with its own time map (same encoding as the main map).
import { textOps, renderOps, inkColor, fontFor, mulberry } from './inkmap.js';

const PPU = 3;

function surface(w, h, ppu = PPU) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * ppu); c.height = Math.ceil(h * ppu);
    return { canvas: c, ctx: c.getContext('2d'), w, h, ppu };
}

function polyOps(ops, pts, t0, speed, w, d = 1) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        ops.push({ t: t0 + acc / speed, k: 0, ax, ay, bx, by, w, d });
        acc += Math.hypot(bx - ax, by - ay);
    }
    return t0 + acc / speed;
}
const curve = (fn, n = 24) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

function knockFill(ctx, ppu, path, tmax) {
    ctx.setTransform(ppu, 0, 0, ppu, 0, 0);
    ctx.fillStyle = inkColor(tmax * 0.98, tmax, 0);
    ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
}

// ------------------------------------------------------------------ banner ribbon with a name
export function bannerSprite(name, seed = 1) {
    const rnd = mulberry(seed), tmax = 4;
    const probe = document.createElement('canvas').getContext('2d');
    const z = 20, k = z / 12.5;
    probe.font = fontFor('sc', z);
    const tw = probe.measureText(name).width;
    const L = tw / 2 + 11 * k, hh = 10 * k, tail = 15 * k, drop = 6 * k;
    const W = (L + tail + 6) * 2, H = hh * 2 + drop + 12;
    const s = surface(W, H, 2.6);
    const cx = W / 2, cy = 6 + hh;
    const arch = (x) => -1.6 * k * Math.cos((x / L) * Math.PI * 0.5);
    const top = curve((u) => [cx - L + u * 2 * L, cy - hh + arch(-L + u * 2 * L)]);
    const bot = curve((u) => [cx + L - u * 2 * L, cy + hh + arch(L - u * 2 * L)]);
    const band = [...top, ...bot];
    const tailPoly = (sg) => {
        const x0 = cx + sg * (L - 6), x1 = cx + sg * (L + tail);
        return [[x0, cy - hh + drop], [x1, cy - hh + drop], [x1 - sg * 5, cy + drop * 0.5], [x1, cy + hh + drop], [x0, cy + hh + drop]];
    };
    const ops = [];
    [-1, 1].forEach((sg) => { knockFill(s.ctx, s.ppu, tailPoly(sg), tmax); });
    let t = 0.02;
    [-1, 1].forEach((sg) => { polyOps(ops, [...tailPoly(sg)], t, 320, 1.7, 0.95); });
    // fold shadow where the tail tucks behind
    [-1, 1].forEach((sg) => {
        for (let j = 0; j < 4; j++) {
            const x = cx + sg * (L - 5 * k + j * 2.2);
            ops.push({ t: t + 0.25 + j * 0.03, k: 0, ax: x, ay: cy + hh + 0.5, bx: x - sg * 2, by: cy + hh + drop - 0.5, w: 1, d: 0.9 });
        }
    });
    const opsTail = ops.splice(0);
    renderOps(s.ctx, opsTail, tmax, s.ppu);
    knockFill(s.ctx, s.ppu, band, tmax);
    t = polyOps(ops, top, 0.1, 380, 1.9);
    polyOps(ops, bot, 0.12, 380, 1.9);
    polyOps(ops, [[cx - L, cy - hh + arch(-L)], [cx - L, cy + hh + arch(-L)]], 0.1, 300, 1.7);
    polyOps(ops, [[cx + L, cy - hh + arch(L)], [cx + L, cy + hh + arch(L)]], 0.1, 300, 1.7);
    textOps(s.ctx, ops, { s: name, x: cx, y: cy + z * 0.36, f: 'sc', z }, 0.35, rnd, 0.045, 2);
    renderOps(s.ctx, ops, tmax, s.ppu);
    return { canvas: s.canvas, w: W, h: H, tmax, duration: 0.35 + name.length * 0.05 };
}

// ------------------------------------------------------------------ wrapped handwriting
function wrap(ctx, text, font, maxW) {
    ctx.font = font;
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach((w) => {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
}

export function remarkSprite(text, seed = 1, opts = {}) {
    const rnd = mulberry(seed), tmax = 14;
    const z = opts.z || 28, lh = z * 1.24, maxW = opts.width || 470, pad = 16;
    const probe = document.createElement('canvas').getContext('2d');
    const lines = wrap(probe, text, fontFor('italic', z), maxW);
    probe.font = fontFor('italic', z);
    const wMax = Math.max(...lines.map((l) => probe.measureText(l).width));
    const W = wMax + pad * 2, H = lines.length * lh + pad * 2 + 4;
    const s = surface(W, H);
    const ctx = s.ctx;
    ctx.setTransform(s.ppu, 0, 0, s.ppu, 0, 0);
    ctx.font = fontFor('italic', z);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = inkColor(tmax * 0.98, tmax, 0); ctx.lineWidth = z * 0.55; ctx.lineJoin = 'round';
    lines.forEach((l, i) => ctx.strokeText(l, pad, pad + z + i * lh));
    const ops = [];
    let t = 0.05;
    const speed = opts.charDur || 0.034;
    lines.forEach((l, i) => { t = textOps(ctx, ops, { s: l, x: pad, y: pad + z + i * lh, f: 'italic', z, align: 'left' }, t, rnd, speed, 2) + 0.06; });
    renderOps(ctx, ops, tmax, s.ppu);
    return { canvas: s.canvas, w: W, h: H, tmax, duration: t };
}

// ------------------------------------------------------------------ the blank-cover invitation
export function promptSprite(lines, seed = 3, opts = {}) {
    const rnd = mulberry(seed), tmax = 12;
    const W = opts.width || 640, H = opts.height || 330;
    const s = surface(W, H);
    if (opts.halo) {
        const c = s.ctx;
        c.save(); c.setTransform(s.ppu, 0, 0, s.ppu, 0, 0);
        c.filter = `blur(${Math.round(16 * s.ppu)}px)`;
        c.fillStyle = inkColor(tmax * 0.98, tmax, 0);
        c.beginPath(); c.ellipse(W / 2, H / 2, W * 0.42, H * 0.36, 0, 0, Math.PI * 2); c.fill();
        c.restore();
    }
    const ops = [];
    let t = opts.delay ?? 0.2;
    lines.forEach((L) => {
        if (L.rule) { t = polyOps(ops, curve((u) => [W / 2 - L.rule + u * L.rule * 2, L.y + Math.sin(u * 9) * 0.8]), t, 520, 1.2) + 0.1; return; }
        if (L.dots) { for (let i = 0; i < 3; i++) ops.push({ t: t + i * 0.12, k: 3, ax: W / 2 + (i - 1) * 14, ay: L.y, w: 1.8, d: 1 }); t += 0.4; return; }
        t = textOps(s.ctx, ops, { ...L, x: L.x ?? W / 2 }, t, rnd, L.cd || (L.f === 'script' ? 0.06 : 0.04), L.z > 30 ? 3 : 2) + (L.gap ?? 0.18);
    });
    renderOps(s.ctx, ops, tmax, s.ppu);
    return { canvas: s.canvas, w: W, h: H, tmax, duration: t };
}

// ------------------------------------------------------------------ live text the visitor types
export function createLiveText(width, height, opts = {}) {
    const s = surface(width, height);
    const tmax = 600;
    let times = [], prev = '', epoch = 0;
    const z0 = opts.z || 30, font = opts.f || 'italic';
    function draw(value, now) {
        if (!value) { times = []; prev = ''; epoch = now; }
        let k = 0;
        while (k < prev.length && k < value.length && prev[k] === value[k]) k++;
        times = times.slice(0, k);
        for (let i = k; i < value.length; i++) times.push(now - epoch);
        prev = value;
        const ctx = s.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
        ctx.setTransform(s.ppu, 0, 0, s.ppu, 0, 0);
        let z = z0;
        ctx.font = fontFor(font, z);
        const full = ctx.measureText(value).width;
        if (full > width - 30) { z = z0 * (width - 30) / full; ctx.font = fontFor(font, z); }
        const fw = ctx.measureText(value).width;
        let x = width / 2 - fw / 2;
        const y = height / 2 + z * 0.33;
        let pre = '';
        [...value].forEach((ch, i) => {
            const cx = x + ctx.measureText(pre).width;
            pre += ch;
            if (ch === ' ') return;
            ctx.fillStyle = inkColor(Math.min(tmax, times[i] || 0), tmax, 0.95);
            ctx.save(); ctx.translate(cx, y); ctx.rotate(Math.sin(i * 12.9898) * 0.03); ctx.fillText(ch, 0, Math.sin(i * 7.1) * z * 0.03); ctx.restore();
        });
        return { canvas: s.canvas, w: width, h: height, tmax };
    }
    return { draw, get epoch() { return epoch; }, setEpoch(v) { epoch = v; }, canvas: s.canvas, w: width, h: height, tmax };
}

// ------------------------------------------------------------------ a flight of moving stairs
export function stairSprite(seed = 1) {
    const tmax = 4, W = 220, H = 48;
    const s = surface(W, H);
    const ops = [];
    knockFill(s.ctx, s.ppu, [[2, 6], [W - 2, 6], [W - 2, H - 6], [2, H - 6]], tmax);
    polyOps(ops, [[4, 8], [W - 4, 8]], 0.05, 420, 1.5);
    polyOps(ops, [[4, 12], [W - 4, 12]], 0.07, 420, 0.8);
    polyOps(ops, [[4, H - 8], [W - 4, H - 8]], 0.05, 420, 1.5);
    polyOps(ops, [[4, H - 12], [W - 4, H - 12]], 0.07, 420, 0.8);
    for (let x = 14, k = 0; x < W - 8; x += 11, k++) ops.push({ t: 0.2 + k * 0.025, k: 0, ax: x, ay: 13, bx: x, by: H - 13, w: 0.9, d: 0.9 });
    polyOps(ops, [[W - 30, H / 2], [W - 12, H / 2]], 0.6, 200, 1.0);
    polyOps(ops, [[W - 18, H / 2 - 5], [W - 12, H / 2], [W - 18, H / 2 + 5]], 0.7, 200, 1.0);
    renderOps(s.ctx, ops, tmax, s.ppu);
    return { canvas: s.canvas, w: W, h: H, tmax, duration: 1 };
}

// ------------------------------------------------------------------ the Room of Requirement
export function rorSprite(seed = 5) {
    const rnd = mulberry(seed), tmax = 6, W = 230, H = 150;
    const s = surface(W, H);
    const ops = [];
    const room = (o) => [[W / 2 - 22, H - 8 - o], [8 + o, H - 8 - o], [8 + o, 8 + o], [W - 8 - o, 8 + o], [W - 8 - o, H - 8 - o], [W / 2 + 22, H - 8 - o]];
    knockFill(s.ctx, s.ppu, [[6, 6], [W - 6, 6], [W - 6, H - 4], [6, H - 4]], tmax);
    polyOps(ops, room(0), 0.05, 380, 1.8);
    polyOps(ops, room(10), 0.12, 380, 1.1);
    polyOps(ops, [[W / 2 - 22, H - 8], [W / 2 - 22, H - 18]], 0.9, 200, 1.2);
    polyOps(ops, [[W / 2 + 22, H - 8], [W / 2 + 22, H - 18]], 0.9, 200, 1.2);
    for (let i = 0; i < 9; i++) {
        const x = 30 + rnd() * (W - 60), y = 28 + rnd() * 50, r = 3 + rnd() * 5;
        polyOps(ops, curve((u) => [x + Math.cos(u * 6.283) * r, y + Math.sin(u * 6.283) * r], 12), 0.6 + rnd() * 0.5, 160, 0.9);
    }
    textOps(s.ctx, ops, { s: 'Room of Requirement', x: W / 2, y: 104, f: 'italic', z: 19 }, 0.7, rnd, 0.04, 2);
    textOps(s.ctx, ops, { s: '(the Come & Go Room)', x: W / 2, y: 124, f: 'italic', z: 12 }, 1.3, rnd, 0.03, 1);
    renderOps(s.ctx, ops, tmax, s.ppu);
    return { canvas: s.canvas, w: W, h: H, tmax, duration: 2 };
}

// ------------------------------------------------------------------ Whomping Willow crown
export function willowSprite(seed = 9) {
    const rnd = mulberry(seed), tmax = 5, W = 300, H = 300;
    const s = surface(W, H, 2.5);
    const ops = [];
    const branch = (x, y, a, len, w, depth, t) => {
        const pts = [];
        const bendA = (rnd() - 0.5) * 0.9;
        for (let i = 0; i <= 10; i++) {
            const u = i / 10, aa = a + bendA * u * u;
            pts.push([x + Math.cos(aa) * len * u, y + Math.sin(aa) * len * u]);
        }
        const end = pts[pts.length - 1];
        const t1 = polyOps(ops, pts, t, 240, w);
        if (depth > 0) {
            const n = depth > 2 ? 2 : 2 + (rnd() > 0.5 ? 1 : 0);
            for (let k = 0; k < n; k++) branch(end[0], end[1], a + bendA + (rnd() - 0.5) * 1.3, len * (0.55 + rnd() * 0.2), w * 0.7, depth - 1, t1);
        } else {
            for (let k = 0; k < 3; k++) {
                const la = a + (rnd() - 0.5) * 2;
                ops.push({ t: t1 + 0.05, k: 0, ax: end[0], ay: end[1], bx: end[0] + Math.cos(la) * 6, by: end[1] + Math.sin(la) * 6, w: 0.8, d: 0.9 });
            }
        }
    };
    for (let i = 0; i < 7; i++) branch(W / 2, H / 2, (i / 7) * Math.PI * 2 + rnd() * 0.5, 34 + rnd() * 16, 2.2, 3, 0.05);
    renderOps(s.ctx, ops, tmax, s.ppu);
    return { canvas: s.canvas, w: W, h: H, tmax, duration: 1.6 };
}
