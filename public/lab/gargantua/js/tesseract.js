// The tesseract, the way "they" built it: a corridor through the bulk with time laid out as a physical axis. Murph's
// bookshelf is the raw material: shelves of spines extruded along time into the walls, threads of amber light running
// through them, and around that a machined kitbash of plates, beams and chips at every scale, all dark metal with
// bright worn arrises. The corridor is a ring of recycled segments: each one is a fixed instanced layout, re-dealt
// a quarter turn or a half turn and a new pattern of lit chips every time it comes back round, so the fall never ends
// and never visibly repeats. Box edges are bevelled in the shader at a constant width in world units, so a 4 cm chip
// and a 6 m beam both catch a crisp highlight. When Cooper is found the walls blow outward into the dark and a field
// of glass shards takes their place; at the fold they slam back in.
import * as THREE from 'three';

export const SEG_L = 12;     // segment length along time (-Z)
export const HALF = 3.0;     // half-width of the clear corridor

const vert = /* glsl */`
attribute vec4 aInfo;   // seed, kind, glow, speed
attribute vec3 aColor;
attribute float aSlot;
uniform vec4 uSlot[NSLOT];  // z of the segment's near end, quarter turns, half turn about Y (0/1), cycle seed
uniform float uTime;
uniform float uOpen;
uniform float uCollapse;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vNl;
varying vec3 vWorld;
varying vec3 vColor;
varying vec4 vInfo;
varying vec3 vRot;      // cos, sin, flip
varying float vCycle;
varying float vRun;

float h1(float n) { return fract(sin(n) * 43758.5453); }

void main() {
    vec4 S = uSlot[int(aSlot + 0.5)];
    vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vec4 ip = instanceMatrix * vec4(position, 1.0);
    float kind = aInfo.y;
    vRun = 1.0;
    if (kind > 4.5 && kind < 5.5) {
        // runners slide down their strip through the segment and fade at its ends
        float f = fract(aInfo.x * 7.13 + uTime * aInfo.w / ${SEG_L.toFixed(1)});
        ip.z -= f * ${SEG_L.toFixed(1)};
        vRun = sin(f * 3.14159);
    }
    // a half turn about Y keeps the winding: x -> -x, z -> -L - z
    if (S.z > 0.5) { ip.x = -ip.x; ip.z = -${SEG_L.toFixed(1)} - ip.z; }
    float a = S.y * 1.5707963;
    float c = cos(a), s = sin(a);
    ip.xy = vec2(c * ip.x - s * ip.y, s * ip.x + c * ip.y);
    ip.z += S.x;
    float hs = h1(aInfo.x * 91.7 + 3.1);
    // the walls blow outward into the dark, each piece at its own speed
    if (uOpen > 0.0) {
        float r = max(length(ip.xy), 0.001);
        float o = uOpen * uOpen;
        ip.xy += ip.xy / r * o * (3.0 + 22.0 * hs);
        ip.z += o * (h1(aInfo.x * 13.3) - 0.5) * 14.0;
    }
    vec4 wp = modelMatrix * ip;
    // "they" fold the place shut: the far corridor is drawn in toward the line of sight
    float far = smoothstep(2.0, 70.0, cameraPosition.z - wp.z);
    wp.xy = mix(wp.xy, cameraPosition.xy + (wp.xy - cameraPosition.xy) * 0.04, uCollapse * far);
    vWorld = wp.xyz;
    vLocal = position;
    vScale = sc;
    vNl = normal;
    vColor = aColor;
    vInfo = aInfo;
    vRot = vec3(c, s, S.z);
    vCycle = S.w;
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */`
precision highp float;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vNl;
varying vec3 vWorld;
varying vec3 vColor;
varying vec4 vInfo;
varying vec3 vRot;
varying float vCycle;
varying float vRun;
uniform float uTime;
uniform float uOpen;
uniform float uGain;
uniform float uFlow;
uniform float uFogDensity;
uniform float uFarZ;
uniform vec3 uFarCol;
uniform vec3 uHaze;
uniform vec3 uCool;
uniform vec4 uPL[4];     // moving lights: position, intensity
uniform vec3 uPLc[4];

float h1(float n) { return fract(sin(n) * 43758.5453); }
float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec3 toWorld(vec3 n) {
    if (vRot.z > 0.5) { n.x = -n.x; n.z = -n.z; }
    return vec3(vRot.x * n.x - vRot.y * n.y, vRot.y * n.x + vRot.x * n.y, n.z);
}

// what a polished face sees: the far end of the corridor burning down the axis, the light strips raking the walls,
// a cold ambient between
vec3 env(vec3 R, float rough) {
    float down = max(-R.z, 0.0);
    float sharp = mix(40.0, 3.0, rough);
    vec3 e = uFarCol * (pow(down, sharp) * mix(2.4, 0.25, rough) + 0.015 * down);
    float ang = atan(R.y, R.x);
    float band = pow(abs(cos(ang * 2.0)), mix(80.0, 6.0, rough)) * pow(1.0 - abs(R.z), 2.0) * mix(0.9, 0.08, rough);
    e += uCool * band;
    e += vec3(0.004, 0.005, 0.007);
    return e;
}

float D_GGX(float NoH, float a) { float a2 = a * a; float d = NoH * NoH * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d); }

void main() {
    float seed = vInfo.x;
    float kind = vInfo.y;
    vec3 nl = normalize(vNl);
    vec3 al = abs(nl);
    vec2 q, s2; vec3 ax1, ax2;
    if (al.x > 0.5) { q = vLocal.yz; s2 = vScale.yz; ax1 = vec3(0.0, 1.0, 0.0); ax2 = vec3(0.0, 0.0, 1.0); }
    else if (al.y > 0.5) { q = vLocal.xz; s2 = vScale.xz; ax1 = vec3(1.0, 0.0, 0.0); ax2 = vec3(0.0, 0.0, 1.0); }
    else { q = vLocal.xy; s2 = vScale.xy; ax1 = vec3(1.0, 0.0, 0.0); ax2 = vec3(0.0, 1.0, 0.0); }
    // bevel at a fixed width in metres: distance to this face's edges, tilted normal on the arris
    vec2 e = (0.5 - abs(q)) * s2;
    float bw = min(kind > 0.5 && kind < 1.5 ? 0.03 : 0.012 + 0.012 * fract(seed * 5.3), 0.32 * min(s2.x, s2.y));
    vec2 t = 1.0 - clamp(e / bw, 0.0, 1.0);
    t = t * t;
    float edge = max(t.x, t.y);
    vec3 nb = normalize(nl + (ax1 * sign(q.x) * t.x + ax2 * sign(q.y) * t.y) * 1.6);
    vec3 N = normalize(toWorld(nb));
    vec3 V = normalize(cameraPosition - vWorld);
    vec2 fp = q * s2;   // face coordinates in metres

    vec3 albedo = vColor;
    float metal = 0.85;
    float rough = mix(0.2, 0.55, fract(seed * 13.17));
    // machining: brushed streaks along the longer side, faint panel seams on big faces
    vec2 bdir = s2.x > s2.y ? fp.yx : fp;
    float brush = h2(floor(vec2(bdir.x * 180.0, bdir.y * 3.0)) + seed * 17.0);
    rough *= 0.8 + 0.4 * brush;
    float seam = 1.0;
    if (min(s2.x, s2.y) > 0.7 && kind < 0.5) {
        float cs = 0.35 + 0.5 * fract(seed * 3.7);
        vec2 g = abs(fract(fp / cs + 0.5) - 0.5) * cs;
        seam = mix(0.35, 1.0, smoothstep(0.004, 0.012, min(g.x, g.y)));
    }
    // worn arrises go bright, faces stay dark
    albedo *= (1.0 + edge * 2.5) * seam;
    rough = mix(rough, 0.16, edge);

    vec3 F0 = mix(vec3(0.04), mix(vec3(0.5, 0.52, 0.55), albedo * 6.0, 0.25), metal);
    vec3 diffC = albedo * (1.0 - metal);
    float NoV = max(dot(N, V), 1e-3);
    float a = rough * rough;
    vec3 col = vec3(0.0);

    // the far end: one warm source down the axis
    vec3 Lf = normalize(vec3(0.0, 0.0, uFarZ) - vWorld);
    {
        vec3 H = normalize(Lf + V);
        float NoL = max(dot(N, Lf), 0.0);
        float NoH = max(dot(N, H), 0.0);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
        col += uFarCol * NoL * (diffC + F * D_GGX(NoH, a) * 0.25 / (NoV * 0.5 + 0.5)) * 0.12;
    }
    // light packets travelling the corridor
    for (int i = 0; i < 4; i++) {
        vec3 Lp = uPL[i].xyz - vWorld;
        float d2 = dot(Lp, Lp);
        vec3 L = Lp * inversesqrt(d2);
        vec3 H = normalize(L + V);
        float NoL = max(dot(N, L), 0.0);
        float NoH = max(dot(N, H), 0.0);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
        col += uPLc[i] * uPL[i].w / (1.0 + d2 * 0.6) * NoL * (diffC + F * D_GGX(NoH, a) * 0.25);
    }
    // reflections: faces keep to F0 (no grazing flare, or the receding walls turn to mirrors of the far end); the
    // arrises are polished and pick up the corridor's light as hard lines
    vec3 R = reflect(-V, N);
    col += env(R, rough) * F0 * 0.6 + env(N, 1.0) * diffC * 0.5;
    col += env(R, 0.12) * edge * (0.35 + 0.65 * fract(seed * 7.9)) * 0.9;

    // ---- the materials that make their own light
    float on = step(0.32, h1(seed * 7.7 + vCycle * 31.0));
    if (kind > 1.5 && kind < 2.5) {
        // chips and strips; some flicker like a failing display
        float fl = h1(seed * 3.1) > 0.86 ? step(0.35, h1(floor(uTime * 9.0 + seed * 50.0))) : 1.0;
        col = col * 0.3 + vColor * vInfo.z * on * fl * (1.0 - 0.6 * edge);
    } else if (kind > 4.5 && kind < 5.5) {
        col = col * 0.3 + vColor * vInfo.z * vRun * (1.0 - 0.5 * edge);
    } else if (kind > 2.5 && kind < 3.5) {
        // a time thread: light runs along it in pulses
        float s = vWorld.z * 0.07 + uTime * vInfo.w * uFlow + seed * 17.0;
        float pulse = pow(0.5 + 0.5 * sin(s * 6.2831), 22.0) + pow(0.5 + 0.5 * sin(s * 2.3 + 1.3), 50.0) * 0.6;
        col = col * 0.5 + vColor * (0.03 + pulse * vInfo.z);
    } else if (kind > 3.5 && kind < 4.5) {
        // a spine extruded along time: worn cloth over board, a gilt band catching the far light now and then
        float band = step(0.93, fract(vWorld.z * (0.35 + fract(seed * 9.1)) + seed * 7.0));
        col += vColor * band * pow(max(dot(N, Lf), 0.0), 2.0) * 2.0 * on;
        float glow = pow(0.5 + 0.5 * sin(vWorld.z * 0.05 + uTime * 0.6 * uFlow + seed * 11.0), 30.0);
        col += vColor * glow * 1.6;
    }

    // haze: dark near, burning toward the far end, so the walls dissolve into light down the axis
    float d = length(vWorld - cameraPosition);
    float fog = 1.0 - exp(-d * uFogDensity);
    float toward = pow(max(dot(-V, vec3(0.0, 0.0, -1.0)), 0.0), 10.0);
    vec3 hz = uHaze + uFarCol * toward * 0.05;
    col = mix(col, hz, fog);
    col *= uGain * (1.0 - uOpen * 0.85);
    gl_FragColor = vec4(col, 1.0);
}
`;

const BOOKS = [0x6b3d22, 0x8a5a2b, 0x9c6b33, 0x4a2c1a, 0x7d3a26, 0xb58a4c, 0x5e4a33, 0x3a2a20, 0xa47645, 0x6f5236, 0x8b4a2f];
const METALS = [[0.03, 0.032, 0.036], [0.045, 0.046, 0.05], [0.065, 0.066, 0.07], [0.022, 0.023, 0.027], [0.05, 0.045, 0.04], [0.085, 0.086, 0.09]];

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const hashN = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// one segment's worth of wall, as axis-aligned boxes in segment space (z from 0 down to -SEG_L)
function buildLayout(seed, density) {
    const R = rng(seed);
    const A = HALF, L = SEG_L;
    const out = [];
    const col = new THREE.Color();
    const metal = () => { const m = METALS[(R() * METALS.length) | 0]; const k = 0.8 + R() * 0.4; return [m[0] * k, m[1] * k, m[2] * k]; };
    const glowCol = () => { const r = R(); return r < 0.55 ? [1, 1, 1] : r < 0.9 ? [0.42, 0.92, 1.0] : [1.0, 0.58, 0.24]; };
    // wall w: the floor (y = -A, depth d going down), turned a quarter at a time about Z
    const push = (w, u0, u1, d0, d1, z0, z1, kind, color, glow = 0, speed = 0) => {
        const su = Math.abs(u1 - u0), sd = Math.abs(d1 - d0), sz = Math.abs(z1 - z0);
        if (su < 1e-3 || sd < 1e-3 || sz < 1e-3) return;
        const u = (u0 + u1) / 2, d = (d0 + d1) / 2, z = (z0 + z1) / 2;
        let x = u, y = -(A + d);
        let sx = su, sy = sd;
        if (w === 1) { [x, y] = [-y, x]; [sx, sy] = [sy, sx]; }
        else if (w === 2) { x = -x; y = -y; }
        else if (w === 3) { [x, y] = [y, -x]; [sx, sy] = [sy, sx]; }
        out.push({ p: [x, y, z], s: [sx, sy, sz], kind, color, glow, speed, seed: R() });
    };

    for (let w = 0; w < 4; w++) {
        const U0 = -A - 0.7, U1 = A + 0.7;
        // back plates, deep: dark, with the odd far light glimpsed through the gaps
        for (let z = 0; z > -L; z -= 3) for (let u = U0; u < U1; u += 1.6) {
            push(w, u + 0.02, Math.min(U1, u + 1.6) - 0.02, 2.6, 2.75, z - 0.02, z - 2.98, 6, metal().map((v) => v * 0.6));
            if (R() < 0.35) { const cu = u + R() * 1.4, cz = z - R() * 2.8; push(w, cu, cu + 0.05 + R() * 0.2, 2.55, 2.6, cz, cz - 0.05 - R() * 0.3, 2, glowCol(), 1.5 + R() * 4); }
        }
        // the outer lattice: cells of beams behind the plating, so holes read as depth not as void
        for (let z = -1.5; z > -L; z -= 3) push(w, U0, U1, 1.75, 1.95, z + 0.08, z - 0.08, 1, metal());
        for (let u = U0 + 0.4; u < U1; u += 1.75) push(w, u - 0.07, u + 0.07, 1.95, 2.15, 0, -L, 1, metal());
        // the main frames: the square rings that recede down the corridor
        for (const z of [-0.2, -6.2]) {
            push(w, -A - 0.34, A + 0.34, -0.02, 0.34, z, z - 0.36, 1, metal().map((v) => v * 1.4));
            push(w, -A - 0.2, A + 0.2, 0.34, 0.75, z + 0.25, z + 0.12, 1, metal());
            push(w, -A - 0.2, A + 0.2, 0.34, 0.75, z - 0.48, z - 0.61, 1, metal());
            if (R() < 0.4) push(w, -A * 0.8, A * 0.8, -0.03, -0.02, z - 0.12, z - 0.15, 2, [0.42, 0.92, 1.0], 2.5 + R() * 3);
        }
        // corner rails along time
        push(w, A - 0.16, A + 0.16, -0.06, 0.3, 0, -L, 1, metal().map((v) => v * 1.3));

        // the greeble field: recursive splits of the wall, then panels, sub-panels and chips at every scale
        const rects = [];
        const split = (u0, u1, z0, z1, depth) => {
            const wu = u1 - u0, wz = z0 - z1;
            const stop = (wu < 0.45 && wz < 0.45) || (depth > 1 && R() < 0.12 + depth * 0.07 && wu * wz < 5);
            if (stop || depth > 9) { rects.push([u0, u1, z0, z1]); return; }
            const alongU = wu > wz ? R() < 0.78 : R() < 0.22;
            const f = 0.22 + R() * 0.56;
            if (alongU) { const m = u0 + wu * f; split(u0, m, z0, z1, depth + 1); split(m, u1, z0, z1, depth + 1); }
            else { const m = z0 - wz * f; split(u0, u1, z0, m, depth + 1); split(u0, u1, m, z1, depth + 1); }
        };
        split(U0, U1, 0, -L, 0);
        for (const [u0, u1, z0, z1] of rects) {
            if (R() > density) continue;
            const g = 0.02 + R() * 0.035;
            const a0 = u0 + g, a1 = u1 - g, b0 = z0 - g, b1 = z1 + g;
            const wu = a1 - a0, wz = b0 - b1;
            if (wu < 0.03 || wz < 0.03) continue;
            const r = R();
            if (r < 0.2) continue;                        // a hole into the lattice
            if (r < 0.28 && wu > 0.3) {
                // a shelf: spines side by side, each extruded down the time axis
                let u = a0;
                while (u < a1 - 0.02) {
                    const sw = 0.03 + R() * 0.08, h = 0.12 + R() * 0.55;
                    const top = Math.max(0.03, 0.85 - h);
                    col.set(BOOKS[(R() * BOOKS.length) | 0]);
                    if (R() < 0.92) push(w, u, Math.min(a1, u + sw * 0.9), top, 0.95, b0, b1, 4, [col.r * 0.32, col.g * 0.3, col.b * 0.3]);
                    u += sw;
                }
                push(w, a0, a1, 0.95, 1.05, b0, b1, 0, metal());
                continue;
            }
            const base = 0.75 + R() * 0.75;
            const top = Math.max(0.04, base - (0.06 + R() * R() * 0.95));
            push(w, a0, a1, top, top + 0.18 + R() * 0.5, b0, b1, 0, metal());
            // sub-panels standing proud of it
            if (R() < 0.6) {
                const n = 1 + ((R() * 4) | 0);
                for (let i = 0; i < n; i++) {
                    const cu0 = a0 + R() * wu * 0.7, cz0 = b0 - R() * wz * 0.7;
                    const cu1 = Math.min(a1, cu0 + wu * (0.12 + R() * 0.5)), cz1 = Math.max(b1, cz0 - wz * (0.12 + R() * 0.5));
                    const h = 0.025 + R() * R() * 0.3;
                    push(w, cu0, cu1, Math.max(0.015, top - h), top, cz0, cz1, 0, metal());
                }
            }
            // chips: little boxes in clusters; some of them lit
            if (R() < 0.5) {
                const n = 2 + ((R() * 9) | 0);
                const lit = R() < 0.55;
                const gc = glowCol(), gi = 3 + R() * 11;
                for (let i = 0; i < n; i++) {
                    const cu = a0 + R() * wu, cz = b0 - R() * wz;
                    const cw = 0.03 + R() * 0.14, cl = 0.03 + R() * (R() < 0.3 ? 0.6 : 0.16);
                    const h = 0.012 + R() * 0.05;
                    const t2 = Math.max(0.006, top - h);
                    if (lit && R() < 0.75) push(w, cu, Math.min(a1, cu + cw), t2, top, cz, Math.max(b1, cz - cl), 2, gc, gi * (0.6 + R() * 0.8));
                    else push(w, cu, Math.min(a1, cu + cw), t2, top, cz, Math.max(b1, cz - cl), 0, metal().map((v) => v * 1.3));
                }
            }
        }
        // threads of time: amber, a few cold ones, standing just off the wall
        const nT = 3 + ((R() * 4) | 0);
        for (let i = 0; i < nT; i++) {
            const u = (R() * 2 - 1) * (A - 0.3), d = -0.12 + R() * 0.4, th = 0.003 + R() * 0.004;
            push(w, u - th, u + th, d - th, d + th, 0, -L, 3, R() < 0.8 ? [1.0, 0.6, 0.26] : [0.45, 0.9, 1.0], 0.8 + R() * 2.2, 0.3 + R() * 0.9);
        }
        // light strips, and the packets that run down them
        const nS = 1 + ((R() * 2) | 0);
        for (let i = 0; i < nS; i++) {
            const u = (R() * 2 - 1) * (A - 0.4), d = 0.02 + R() * 0.2;
            const sl = 2 + R() * 7, sz0 = -R() * (L - sl);
            push(w, u - 0.02, u + 0.02, d - 0.012, d + 0.012, sz0, sz0 - sl, 2, [0.42, 0.92, 1.0], 1.4);
            for (let k = 0; k < 2; k++) push(w, u - 0.026, u + 0.026, d - 0.016, d + 0.016, 0, -0.35 - R() * 0.4, 5, R() < 0.7 ? [0.7, 0.97, 1.0] : [1, 1, 1], 9 + R() * 8, 2.5 + R() * 6);
        }
    }
    return out;
}

export function createTesseract({ slots = 12, density = 1 } = {}) {
    const LAYOUTS = 4;
    slots = Math.max(LAYOUTS, Math.round(slots / LAYOUTS) * LAYOUTS);
    const layouts = [];
    for (let i = 0; i < LAYOUTS; i++) layouts.push(buildLayout(7919 * (i + 3), density));
    let count = 0;
    for (let k = 0; k < slots; k++) count += layouts[k % LAYOUTS].length;

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mats = new Float32Array(count * 16), infos = new Float32Array(count * 4), cols = new Float32Array(count * 3), slotA = new Float32Array(count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let n = 0;
    for (let k = 0; k < slots; k++) {
        for (const b of layouts[k % LAYOUTS]) {
            m.compose(p.set(...b.p), q, s.set(...b.s));
            m.toArray(mats, n * 16);
            infos.set([b.seed + k * 0.618, b.kind, b.glow, b.speed], n * 4);
            cols.set(b.color, n * 3);
            slotA[n] = k;
            n++;
        }
    }
    const slotU = [];
    for (let k = 0; k < slots; k++) slotU.push(new THREE.Vector4());
    const plPos = [0, 1, 2, 3].map(() => new THREE.Vector4());
    const plCol = [new THREE.Color(0.55, 0.9, 1.0), new THREE.Color(1, 1, 1), new THREE.Color(1.0, 0.62, 0.3), new THREE.Color(0.55, 0.9, 1.0)];
    const mat = new THREE.ShaderMaterial({
        vertexShader: vert.replace('NSLOT', String(slots)), fragmentShader: frag,
        uniforms: {
            uSlot: { value: slotU }, uTime: { value: 0 }, uOpen: { value: 0 }, uCollapse: { value: 0 }, uGain: { value: 1 }, uFlow: { value: 1 },
            uFogDensity: { value: 0.024 }, uFarZ: { value: -100 },
            uFarCol: { value: new THREE.Color(1.0, 0.88, 0.74) }, uHaze: { value: new THREE.Color(0.002, 0.003, 0.0045) }, uCool: { value: new THREE.Color(0.55, 0.8, 0.95) },
            uPL: { value: plPos }, uPLc: { value: plCol },
        },
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.array.set(mats);
    mesh.geometry.setAttribute('aInfo', new THREE.InstancedBufferAttribute(infos, 4));
    mesh.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(cols, 3));
    mesh.geometry.setAttribute('aSlot', new THREE.InstancedBufferAttribute(slotA, 1));
    mesh.frustumCulled = false;

    const root = new THREE.Group();
    root.add(mesh);

    // segments are dealt from the camera's position alone, so any frame can be posed exactly: segment n spans
    // z in [-(n+1)L, -nL] + 8, sits in slot n mod slots, and gets its turn and its lit-chip pattern from n
    function follow(camPos, time) {
        const L = SEG_L;
        const n0 = Math.floor((8 - camPos.z - 10) / L);
        for (let i = 0; i < slots; i++) {
            const nn = n0 + i;
            const k = ((nn % slots) + slots) % slots;
            slotU[k].set(8 - nn * L, Math.floor(hashN(nn) * 4), hashN(nn + 0.5) < 0.5 ? 1 : 0, hashN(nn + 0.25) * 100);
        }
        mat.uniforms.uFarZ.value = camPos.z - 90;
        // four light packets sweeping down the corridor past the camera
        for (let i = 0; i < 4; i++) {
            const sp = [9, 14, 6, 11][i], ph = i * 23.7;
            const z = camPos.z + 6 - ((time * sp + ph) % 60 + 60) % 60;
            const a = i * 1.7 + 0.6;
            plPos[i].set(Math.cos(a) * HALF * 0.75, Math.sin(a) * HALF * 0.75, z, [7, 5, 6, 4][i]);
        }
    }
    return { root, mesh, uniforms: mat.uniforms, follow, count, slots };
}

// The void Cooper is found in: glass shards drifting in the dark, catching the studio light in their facets and
// splitting it at the edges.
export function createShards({ count = 140 } = {}) {
    const base = new THREE.OctahedronGeometry(1, 0);
    const pos = base.attributes.position;
    // a cut, flattened gem: squash one axis and skew the facets so no two read alike
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * 1.0, pos.getY(i) * 0.22, pos.getZ(i) * 0.62 + pos.getX(i) * 0.18);
    const geo = base;
    // glass on black: what you see is the studio reflected in each facet, the studio refracted through it once per
    // wavelength (so the softboxes split into spectra at the cuts), and a thin-film fringe at grazing; added to the
    // frame like light, since there is nothing behind them but dark
    const mat = new THREE.ShaderMaterial({
        // they write depth so the lens focuses on them where they are, not on the dark behind
        transparent: true, depthWrite: true, blending: THREE.AdditiveBlending,
        uniforms: { uAmt: { value: 1 } },
        vertexShader: /* glsl */`
            varying vec3 vW;
            void main() {
                vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
                vW = wp.xyz;
                gl_Position = projectionMatrix * viewMatrix * wp;
            }`,
        fragmentShader: /* glsl */`
            precision highp float;
            varying vec3 vW;
            uniform float uAmt;
            vec3 studio(vec3 d) {
                vec3 c = vec3(0.015, 0.017, 0.02) + vec3(0.25) * pow(max(d.y, 0.0), 3.0);
                c += vec3(7.0) * smoothstep(0.82, 0.93, dot(d, normalize(vec3(-0.45, 0.65, 0.6))));
                c += vec3(9.0, 4.2, 1.6) * smoothstep(0.9, 0.975, dot(d, normalize(vec3(0.75, 0.12, -0.62))));
                c += vec3(1.2, 3.6, 5.0) * smoothstep(0.9, 0.975, dot(d, normalize(vec3(-0.8, -0.13, -0.55))));
                c += vec3(3.0) * smoothstep(0.95, 0.99, dot(d, normalize(vec3(0.3, -0.2, 0.93))));
                return c;
            }
            void main() {
                vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
                vec3 V = normalize(cameraPosition - vW);
                if (dot(N, V) < 0.0) N = -N;
                float NoV = max(dot(N, V), 0.0);
                float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
                vec3 refl = studio(reflect(-V, N));
                vec3 tr = vec3(studio(refract(-V, N, 1.0 / 1.48)).r, studio(refract(-V, N, 1.0 / 1.53)).g, studio(refract(-V, N, 1.0 / 1.6)).b);
                vec3 film = (0.5 + 0.5 * cos(6.2831 * (NoV * 2.2 + vec3(0.0, 0.33, 0.67)))) * pow(1.0 - NoV, 2.0);
                vec3 col = refl * F + tr * (1.0 - F) * 0.22 + film * 0.35 + vec3(0.01, 0.012, 0.016);
                gl_FragColor = vec4(col * uAmt, 1.0);
            }`,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    const R = rng(4242);
    const items = [];
    for (let i = 0; i < count; i++) {
        const near = i < count * 0.18;
        items.push({
            x: (R() * 2 - 1) * (near ? 3 : 9), y: (R() * 2 - 1) * (near ? 2 : 5.5), z: R() * 34,
            ax: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), sp: (R() - 0.5) * 0.6, ph: R() * 6.28,
            s: (near ? 0.07 : 0.13) + R() * R() * 0.45, gate: R(),
        });
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const tilt = new THREE.Quaternion();
    function update(time, camPos, amount) {
        mesh.visible = amount > 0.002;
        if (!mesh.visible) return;
        for (let i = 0; i < count; i++) {
            const it = items[i];
            // they live in a box around the camera and wrap along Z as it drifts
            const z = camPos.z + 1.5 - (((it.z - camPos.z * 0.999) % 34) + 34) % 34;
            p.set(it.x + Math.sin(time * 0.1 + it.ph) * 0.2, it.y + Math.cos(time * 0.13 + it.ph) * 0.15, z);
            q.setFromAxisAngle(it.ax, it.ph + time * it.sp);
            tilt.setFromAxisAngle(sc.set(1, 0, 0), 0.5);
            q2.copy(q).multiply(tilt);
            const g = THREE.MathUtils.smoothstep(amount, it.gate * 0.6, it.gate * 0.6 + 0.4);
            m.compose(p, q2, sc.setScalar(it.s * g + 1e-4));
            mesh.setMatrixAt(i, m);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }
    return { root: mesh, mesh, update, material: mat };
}
