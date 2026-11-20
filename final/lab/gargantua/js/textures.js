// Every surface is painted here on a canvas: no downloads, no stock textures. Seeded so a reload looks the same.
import * as THREE from 'three';

function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function canvas(n) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    return [c, c.getContext('2d')];
}

function tex(c, srgb) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
}

// Painted hull panels: subdivided plates with a little tone drift, recessed seams, fastener rows, and the grime that
// collects along edges after years in vacuum. Returns colour + a bump map that shares the seam layout.
export function panelTextures(seed = 7, size = 1024) {
    const R = rng(seed);
    const [c, x] = canvas(size);
    const [b, y] = canvas(size);
    x.fillStyle = '#d8d4cb'; x.fillRect(0, 0, size, size);
    y.fillStyle = '#808080'; y.fillRect(0, 0, size, size);

    const plates = [];
    (function split(px, py, w, h, depth) {
        if (depth > 3 || (depth > 1 && R() < 0.3) || w < size / 10 || h < size / 10) { plates.push([px, py, w, h]); return; }
        if (w > h ? R() < 0.8 : R() < 0.2) { const k = Math.round(w * (0.3 + R() * 0.4)); split(px, py, k, h, depth + 1); split(px + k, py, w - k, h, depth + 1); }
        else { const k = Math.round(h * (0.3 + R() * 0.4)); split(px, py, w, k, depth + 1); split(px, py + k, w, h - k, depth + 1); }
    })(0, 0, size, size, 0);

    for (const [px, py, w, h] of plates) {
        const tone = 206 + Math.round((R() - 0.5) * 18);
        x.fillStyle = `rgb(${tone + 2},${tone},${tone - 6})`;
        x.fillRect(px, py, w, h);
        const bv = 128 + Math.round((R() - 0.5) * 10);
        y.fillStyle = `rgb(${bv},${bv},${bv})`;
        y.fillRect(px, py, w, h);
        // edge grime: darker toward the seams
        const g = x.createLinearGradient(px, py, px, py + h);
        g.addColorStop(0, 'rgba(60,50,40,0.10)'); g.addColorStop(0.12, 'rgba(60,50,40,0)'); g.addColorStop(0.88, 'rgba(60,50,40,0)'); g.addColorStop(1, 'rgba(60,50,40,0.14)');
        x.fillStyle = g; x.fillRect(px, py, w, h);
        // the odd hatch or access plate
        if (R() < 0.35) {
            const hw = w * (0.18 + R() * 0.2), hh = h * (0.18 + R() * 0.2), hx = px + R() * (w - hw), hy = py + R() * (h - hh);
            x.strokeStyle = 'rgba(70,64,58,0.55)'; x.lineWidth = 1.2; x.strokeRect(hx, hy, hw, hh);
            y.strokeStyle = 'rgb(96,96,96)'; y.lineWidth = 2; y.strokeRect(hx, hy, hw, hh);
        }
        // fasteners along the long edges
        if (R() < 0.6) {
            x.fillStyle = 'rgba(90,84,76,0.6)'; y.fillStyle = 'rgb(150,150,150)';
            const n = Math.floor(w / 18);
            for (let i = 1; i < n; i++) {
                const fx = px + (i / n) * w;
                x.fillRect(fx, py + 5, 2, 2); x.fillRect(fx, py + h - 7, 2, 2);
                y.fillRect(fx, py + 5, 2, 2); y.fillRect(fx, py + h - 7, 2, 2);
            }
        }
        // a rare small stencil mark, the only colour on the hull
        if (R() < 0.05) {
            x.fillStyle = R() < 0.5 ? 'rgba(60,60,60,0.7)' : 'rgba(180,120,40,0.75)';
            x.fillRect(px + 10 + R() * (w - 50), py + 10 + R() * (h - 20), 26 + R() * 18, 5);
        }
    }
    // seams
    for (const [px, py, w, h] of plates) {
        x.strokeStyle = 'rgba(52,48,44,0.85)'; x.lineWidth = 2; x.strokeRect(px + 1, py + 1, w - 2, h - 2);
        y.strokeStyle = 'rgb(30,30,30)'; y.lineWidth = 3; y.strokeRect(px + 1, py + 1, w - 2, h - 2);
    }
    // micrometeorite pitting and long sun-faded streaks
    for (let i = 0; i < 2600; i++) {
        const a = R() * 0.12;
        x.fillStyle = `rgba(80,70,60,${a})`;
        x.fillRect(R() * size, R() * size, 1 + R() * 1.5, 1 + R() * 1.5);
    }
    for (let i = 0; i < 40; i++) {
        const sx = R() * size, sy = R() * size, len = 40 + R() * 220;
        const g = x.createLinearGradient(sx, sy, sx, sy + len);
        g.addColorStop(0, 'rgba(90,80,68,0.08)'); g.addColorStop(1, 'rgba(90,80,68,0)');
        x.fillStyle = g; x.fillRect(sx, sy, 3 + R() * 8, len);
    }
    return { map: tex(c, true), bump: tex(b, false) };
}

// Multi-layer insulation: gold kapton crinkled into facets. Colour varies facet by facet; the bump does the rest.
export function foilTextures(seed = 3, size = 512) {
    const R = rng(seed);
    const [c, x] = canvas(size);
    const [b, y] = canvas(size);
    x.fillStyle = '#b8873a'; x.fillRect(0, 0, size, size);
    y.fillStyle = '#808080'; y.fillRect(0, 0, size, size);
    for (let i = 0; i < 1400; i++) {
        const cx = R() * size, cy = R() * size, r = 8 + R() * 40, n = 3 + Math.floor(R() * 3);
        const v = R();
        x.fillStyle = `rgba(${200 + v * 55 | 0},${140 + v * 70 | 0},${50 + v * 50 | 0},${0.25 + R() * 0.3})`;
        y.fillStyle = `rgba(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0},0.35)`;
        x.beginPath(); y.beginPath();
        for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + R() * 0.8, rr = r * (0.5 + R() * 0.7);
            const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
            if (k) { x.lineTo(px, py); y.lineTo(px, py); } else { x.moveTo(px, py); y.moveTo(px, py); }
        }
        x.fill(); y.fill();
    }
    // stitched seams of the blanket
    x.strokeStyle = 'rgba(90,60,20,0.6)'; y.strokeStyle = 'rgb(40,40,40)'; x.lineWidth = y.lineWidth = 2;
    for (let i = 1; i < 4; i++) { const p = (i / 4) * size; x.beginPath(); x.moveTo(0, p); x.lineTo(size, p); x.stroke(); y.beginPath(); y.moveTo(0, p); y.lineTo(size, p); y.stroke(); }
    return { map: tex(c, true), bump: tex(b, false) };
}

// Dark radiator / solar cell / heat tile grid.
export function gridTexture(seed = 5, size = 512, cells = 16, base = '#14161a', line = '#2c3036', jitter = 10) {
    const R = rng(seed);
    const [c, x] = canvas(size);
    x.fillStyle = base; x.fillRect(0, 0, size, size);
    const s = size / cells;
    for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
        const v = (R() - 0.5) * jitter;
        x.fillStyle = `rgba(${128 + v},${128 + v},${132 + v},0.06)`;
        x.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
    }
    x.strokeStyle = line; x.lineWidth = 2;
    for (let i = 0; i <= cells; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, size); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(size, i * s); x.stroke(); }
    return tex(c, true);
}

// height field -> tangent-space normal map (Sobel), so painted relief shades under real lights
function heightToNormal(h, size, strength) {
    const [c, x] = canvas(size);
    const img = x.createImageData(size, size);
    const H = (i, j) => h[((j + size) % size) * size + ((i + size) % size)];
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const dx = (H(i + 1, j - 1) + 2 * H(i + 1, j) + H(i + 1, j + 1)) - (H(i - 1, j - 1) + 2 * H(i - 1, j) + H(i - 1, j + 1));
        const dy = (H(i - 1, j + 1) + 2 * H(i, j + 1) + H(i + 1, j + 1)) - (H(i - 1, j - 1) + 2 * H(i, j - 1) + H(i + 1, j - 1));
        let nx = -dx * strength, ny = -dy * strength, nz = 1;
        const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
        const k = (j * size + i) * 4;
        img.data[k] = (nx * 0.5 + 0.5) * 255; img.data[k + 1] = (ny * 0.5 + 0.5) * 255; img.data[k + 2] = (nz * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return tex(c, false);
}

// Ortho-fabric, the EVA outer layer: a plain weave of Gore-Tex / Nomex / Kevlar with a heavier ripstop grid every few
// millimetres, slubs in the yarn and a faint puckered quilting. One tile = 6 cm of cloth.
export function fabricNormal(size = 512) {
    const R = rng(11);
    const h = new Float32Array(size * size);
    const slub = new Float32Array(size);
    for (let i = 0; i < size; i++) slub[i] = (R() - 0.5) * 0.35;
    const cell = 64, yarn = 4;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        // plain weave: warp over weft over warp, each yarn a rounded ridge
        const wu = i / yarn, wv = j / yarn;
        const over = ((Math.floor(wu) + Math.floor(wv)) & 1) ? 1 : 0;
        const ru = Math.sin((wu % 1) * Math.PI), rv = Math.sin((wv % 1) * Math.PI);
        let v = over ? ru * 0.6 + rv * 0.25 : rv * 0.6 + ru * 0.25;
        v += slub[j] * 0.4 + slub[i] * 0.4;
        // ripstop: doubled yarns on a coarser grid
        const gi = i % cell, gj = j % cell;
        if (gi < 3 || gj < 3) v += 0.75;
        h[j * size + i] = v;
    }
    // quilting pucker: low, round domes between the ripstop lines
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const u = (i % (cell * 2)) / (cell * 2), w = (j % (cell * 2)) / (cell * 2);
        h[j * size + i] += Math.sin(u * Math.PI) * Math.sin(w * Math.PI) * 1.4;
    }
    return heightToNormal(h, size, 0.55);
}

// Moulded fibreglass / polycarbonate: almost flat, a faint orange peel and the odd sanded swirl
export function plasticNormal(size = 256) {
    const R = rng(23);
    const h = new Float32Array(size * size);
    const blobs = [];
    for (let i = 0; i < 260; i++) blobs.push([R() * size, R() * size, 3 + R() * 9, (R() - 0.5)]);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        let v = 0;
        for (let b = 0; b < 12; b++) {
            const [bx, by, br, ba] = blobs[(i * 7 + j * 13 + b * 31) % blobs.length];
            const dx = ((i - bx + size * 1.5) % size) - size / 2, dy = ((j - by + size * 1.5) % size) - size / 2;
            v += ba * Math.exp(-(dx * dx + dy * dy) / (br * br));
        }
        h[j * size + i] = v;
    }
    return heightToNormal(h, size, 0.25);
}

// The shoulder patch: a mission roundel in embroidered thread, no flag, no logo
export function patchTexture(size = 256) {
    const [c, x] = canvas(size);
    const m = size / 2;
    x.fillStyle = '#0b0d12'; x.beginPath(); x.arc(m, m, m - 2, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#c8b27a'; x.lineWidth = size * 0.035; x.beginPath(); x.arc(m, m, m - size * 0.05, 0, Math.PI * 2); x.stroke();
    // the hole and its disk, in thread
    x.strokeStyle = '#e09a4a'; x.lineWidth = size * 0.03;
    x.beginPath(); x.ellipse(m, m * 1.04, m * 0.56, m * 0.1, 0, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#000'; x.beginPath(); x.arc(m, m * 1.04, m * 0.2, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#f1c27d'; x.lineWidth = size * 0.016; x.beginPath(); x.arc(m, m * 1.04, m * 0.23, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    x.fillStyle = '#d9d2c2'; x.font = `500 ${size * 0.075}px "G Mono", monospace`; x.textAlign = 'center';
    x.fillText('ENDURANCE', m, m * 0.5);
    x.fillText('LAZARUS', m, m * 1.6);
    const t = tex(c, true);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
}

// Woven suit fabric: a fine twill with soft seam lines, used as a bump so the white suit reads as cloth, not plastic.
export function fabricBump(size = 512) {
    const [c, x] = canvas(size);
    const img = x.createImageData(size, size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const tw = Math.sin((i + j) * 0.9) * 0.5 + Math.sin((i - j) * 0.35) * 0.2;
        const n = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
        const v = 128 + tw * 26 + n * 14;
        const k = (j * size + i) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.strokeStyle = 'rgb(70,70,70)'; x.lineWidth = 3;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(0, (i / 4) * size); x.bezierCurveTo(size * 0.3, (i / 4) * size + 12, size * 0.7, (i / 4) * size - 12, size, (i / 4) * size); x.stroke(); }
    return tex(c, false);
}
