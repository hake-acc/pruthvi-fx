import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// frame-rate independent exponential approach
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function rng(seed = 1) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}
export function fbm(x, y, oct = 5) {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; }
    return s;
}
export function ridged(x, y, oct = 5) {
    let s = 0, a = 0.5, f = 1, w = 1;
    for (let i = 0; i < oct; i++) {
        let n = 1 - Math.abs(vnoise(x * f, y * f));
        n *= n * w; w = clamp(n * 1.6);
        s += a * n; f *= 2.07; a *= 0.5;
    }
    return s;
}

// merge non-indexed geometries that share an attribute layout into one draw
export function merge(list) {
    const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
    const names = Object.keys(geos[0].attributes);
    const out = new THREE.BufferGeometry();
    for (const n of names) {
        const size = geos[0].attributes[n].itemSize;
        let len = 0;
        for (const g of geos) len += g.attributes[n].count * size;
        const arr = new Float32Array(len);
        let o = 0;
        for (const g of geos) { arr.set(g.attributes[n].array, o); o += g.attributes[n].count * size; }
        out.setAttribute(n, new THREE.BufferAttribute(arr, size));
    }
    return out;
}

// stamp constant per-vertex attributes onto a geometry (colour, window band, seed...)
export function paint(g, attrs) {
    const geo = g.index ? g.toNonIndexed() : g;
    const n = geo.attributes.position.count;
    for (const [name, val] of Object.entries(attrs)) {
        const v = Array.isArray(val) ? val : [val];
        const arr = new Float32Array(n * v.length);
        for (let i = 0; i < n; i++) for (let k = 0; k < v.length; k++) arr[i * v.length + k] = v[k];
        geo.setAttribute(name, new THREE.BufferAttribute(arr, v.length));
    }
    return geo;
}
