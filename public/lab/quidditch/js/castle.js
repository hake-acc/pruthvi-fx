// Hogwarts from primitives: drum towers with slate cones and spires, battlemented keeps, a long-roofed Great Hall,
// curtain walls and the covered viaduct to the gate tower, all merged into a single draw. Windows are not geometry:
// every wall carries a metre-space UV and the shader cuts arched lancets into it, lighting about half of them.
import * as THREE from 'three';
import { NOISE, ATMOS, uniforms } from './atmos.js';
import { merge, paint, rng } from './util.js';
import { CASTLE } from './world.js';

const STONE = [0.33, 0.31, 0.285];
const STONE_D = [0.27, 0.26, 0.245];
const SLATE = [0.062, 0.068, 0.082];
const LEAD = [0.10, 0.11, 0.12];

const vert = /* glsl */`
attribute vec3 color;
attribute vec3 aWin;
attribute float aSeed;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vWin; varying vec2 vUv; varying float vSeed;
void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; vWin = aWin; vUv = uv; vSeed = aSeed;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const frag = /* glsl */`
${ATMOS}
${NOISE}
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vWin; varying vec2 vUv; varying float vSeed;
void main() {
    if (uReflect > 0.5 && vW.y < -0.3) discard;
    vec3 n = normalize(vN);
    float d = length(vW - cameraPosition);
    float detail = 1.0 - smoothstep(120.0, 520.0, d);
    vec3 alb = vC;
    float ao = 1.0;
    vec3 emit = vec3(0.0);
    if (vWin.x > 0.2) {
        // ashlar courses, staggered, with mortar that fades out with distance before it can shimmer
        vec2 bl = vUv / vec2(1.5, 0.6);
        bl.x += floor(bl.y) * 0.5;
        vec2 bf = fract(bl);
        float e = min(min(bf.x, 1.0 - bf.x) * 1.5, min(bf.y, 1.0 - bf.y) * 0.6);
        float fw = fwidth(vUv.y) * 1.5;
        float mort = 1.0 - smoothstep(0.015, 0.045 + fw, e);
        alb *= (0.82 + 0.36 * hash12(floor(bl) + vSeed)) * mix(1.0, 0.72, mort * detail);
        alb *= 0.78 + 0.32 * vnoise(vec2(vUv.x * 0.08, vUv.y * 0.02) + vSeed);
        alb *= mix(0.72, 1.0, vnoise(vec2(vUv.x * 0.6, vUv.y * 0.04) + vSeed * 3.0) * 0.6 + 0.4);
        ao = mix(0.55, 1.0, smoothstep(0.0, 10.0, vUv.y));
        if (vWin.x > 0.6 && vUv.y > vWin.y && vUv.y < vWin.z) {
            vec2 cs = vec2(3.6, 5.8);
            vec2 g = vUv / cs; vec2 cell = floor(g);
            vec2 f = (fract(g) - vec2(0.5, 0.45)) * cs;
            float hw = 0.52, hh = 1.35;
            float rect = max(abs(f.x) - hw, max(-hh - f.y, f.y - (hh - hw)));
            float circ = length(f - vec2(0.0, hh - hw)) - hw;
            float sd = min(rect, circ);
            float fw2 = fwidth(f.x) * 1.4 + 0.01;
            float win = 1.0 - smoothstep(-fw2, fw2, sd);
            float rnd = hash12(cell + vSeed * 13.17);
            float lowFloor = 1.0 - smoothstep(vWin.y, vWin.y + 30.0, vUv.y) * 0.35;
            float lit = step(1.0 - 0.52 * lowFloor, rnd);
            float far = smoothstep(260.0, 900.0, d);
            win = mix(win, 0.105, far);
            lit = mix(lit, 0.45, far);
            float flick = 0.86 + 0.14 * sin(uTime * (1.1 + rnd * 2.6) + rnd * 60.0) * sin(uTime * 2.3 + rnd * 17.0);
            vec3 warm = mix(vec3(1.0, 0.42, 0.13), vec3(1.0, 0.66, 0.30), hash12(cell + 2.7)) * (2.2 + 4.6 * hash12(cell + 5.3)) * flick;
            // mullions: a dark cross through the lit pane
            float mull = (1.0 - smoothstep(0.03, 0.06 + fw2, abs(f.x))) + (1.0 - smoothstep(0.03, 0.06 + fw2, abs(f.y - 0.1)));
            float pane = clamp(1.0 - mull * detail, 0.0, 1.0);
            emit = warm * lit * win * pane;
            alb = mix(alb, vec3(0.012, 0.014, 0.018), win);
            // a warm spill on the stone under each lit window
            float spill = lit * (1.0 - far) * exp(-max(length(f * vec2(0.9, 0.5)) - 0.6, 0.0) * 1.6) * (1.0 - win);
            emit += vec3(1.0, 0.45, 0.16) * spill * 0.12;
        }
    } else {
        // slate: courses of tiles and a faint sheen
        float tile = 1.0 - smoothstep(0.0, 0.08 + fwidth(vW.y * 2.5), fract(vW.y * 2.5)) ;
        alb *= (0.85 + 0.3 * vnoise(vW.xz * 0.9 + vW.y)) * mix(1.0, 0.7, tile * detail * 0.6);
    }
    vec3 col = lightIt(alb, n, vW, ao);
    if (vWin.x < 0.2) {
        vec3 v = normalize(cameraPosition - vW);
        col += SUNCOL * pow(max(dot(reflect(-v, n), uSunDir), 0.0), 24.0) * 0.18;
    }
    col += emit;
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

export function createCastle() {
    const r = rng(1997);
    const parts = [];
    const colliders = [];
    let seed = 1;
    const OX = CASTLE.x, OZ = CASTLE.z, BASE = CASTLE.y - 4;
    const FOUND = 26;

    function finish(g, color, win) {
        g = paint(g, { color, aWin: win, aSeed: seed++ + r() });
        g.deleteAttribute('uv2');
        parts.push(g);
    }
    function cylUV(g, rad, h) {
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * rad, uv.getY(i) * h);
    }
    function worldUV(g, base) {
        const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) {
            const nx = n.getX(i), nz = n.getZ(i);
            if (Math.abs(n.getY(i)) > 0.6) { uv.setXY(i, p.getX(i), p.getZ(i)); continue; }
            const l = Math.hypot(nx, nz) || 1;
            uv.setXY(i, p.getX(i) * (-nz / l) + p.getZ(i) * (nx / l), p.getY(i) - base);
        }
    }
    function drum(x, z, rad, h, { win = true, base = BASE, seg = 0 } = {}) {
        const s = seg || Math.max(10, Math.round(rad * 2.4));
        const H = h + FOUND;
        const g = new THREE.CylinderGeometry(rad, rad * 1.04, H, s, 1, true).toNonIndexed();
        cylUV(g, rad, H);
        g.translate(OX + x, base - FOUND + H / 2, OZ + z);
        finish(g, r() < 0.5 ? STONE : STONE_D, [win ? 1 : 0.3, FOUND + 5, H - 4]);
        colliders.push({ x: OX + x, z: OZ + z, r: rad + 2.5, top: base + h + 2 });
        return base + h;
    }
    function cone(x, z, rad, h, y0, seg = 0) {
        const s = seg || Math.max(10, Math.round(rad * 2.4));
        const g = new THREE.ConeGeometry(rad, h, s, 1, true).toNonIndexed();
        cylUV(g, rad, h);
        g.translate(OX + x, y0 + h / 2, OZ + z);
        finish(g, SLATE, [0, 0, 0]);
        colliders.push({ x: OX + x, z: OZ + z, r: rad * 0.6 + 1.5, top: y0 + h * 0.55 });
    }
    function ring(x, z, rad, h, y0, color = STONE_D) {
        const s = Math.max(12, Math.round(rad * 2.6));
        const g = new THREE.CylinderGeometry(rad, rad * 0.94, h, s, 1, false).toNonIndexed();
        cylUV(g, rad, h);
        g.translate(OX + x, y0 + h / 2, OZ + z);
        finish(g, color, [0.3, 0, 0]);
    }
    function box(x, y, z, w, h, d, rot, { win = true, color = null, wx = OX, wz = OZ } = {}) {
        const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
        g.rotateY(rot);
        g.translate(wx + x, y + h / 2, wz + z);
        worldUV(g, y);
        finish(g, color || (r() < 0.5 ? STONE : STONE_D), [win ? 1 : 0.3, 4.5, h - 3.5]);
    }
    function merlonsCircle(x, z, rad, y0) {
        const n = Math.round((Math.PI * 2 * rad) / 2.2);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            box(x + Math.cos(a) * rad, y0, z + Math.sin(a) * rad, 1.1, 1.5, 0.8, -a + Math.PI / 2, { win: false });
        }
    }
    function merlonsLine(x0, z0, x1, z1, y0, off = 0) {
        const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 2.2), rot = Math.atan2(x1 - x0, z1 - z0);
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            box(x0 + (x1 - x0) * t, y0, z0 + (z1 - z0) * t, 0.8, 1.4, 1.1, rot + off, { win: false });
        }
    }
    function gable(x, z, w, d, h, y0, rot) {
        // a pitched roof: two slate slopes and two stone gables
        const hw = w / 2, hd = d / 2;
        const slopes = new Float32Array([
            -hw, 0, -hd, -hw, 0, hd, 0, h, hd, -hw, 0, -hd, 0, h, hd, 0, h, -hd,
            hw, 0, hd, hw, 0, -hd, 0, h, -hd, hw, 0, hd, 0, h, -hd, 0, h, hd,
        ]);
        const gables = new Float32Array([-hw, 0, hd, hw, 0, hd, 0, h, hd, hw, 0, -hd, -hw, 0, -hd, 0, h, -hd]);
        const mk = (arr, color, win) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
            g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(arr.length / 3 * 2), 2));
            g.computeVertexNormals();
            g.rotateY(rot);
            g.translate(OX + x, y0, OZ + z);
            worldUV(g, y0);
            finish(g, color, win);
        };
        mk(slopes, SLATE, [0, 0, 0]);
        mk(gables, STONE_D, [0.3, 0, 0]);
    }
    function hall(x, z, w, d, h, rot, roofH) {
        box(x, BASE - FOUND, z, w, h + FOUND, d, rot);
        // the box's UV base sits in the foundation; re-band its windows above ground
        parts[parts.length - 1].attributes.aWin.array.forEach((_, i, a) => { if (i % 3 === 1) a[i] = FOUND + 5; else if (i % 3 === 2) a[i] = FOUND + h - 4; });
        gable(x, z, w + 0.6, d + 0.6, roofH, BASE + h, rot);
        const c = Math.cos(rot), s = Math.sin(rot);
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        for (const [sx, sz] of corners) {
            const lx = sx * (w / 2 + 0.8), lz = sz * (d / 2 + 0.8);
            const tx = x + lx * c + lz * s, tz = z - lx * s + lz * c;
            const th = h + 6 + r() * 10, tr = 2.0 + r() * 1.2;
            const top = drum(tx, tz, tr, th, { seg: 10 });
            cone(tx, tz, tr * 1.25, tr * 4.2 + r() * 4, top, 10);
        }
        const n = Math.max(2, Math.round(d / 30));
        for (let i = 0; i < n; i++) {
            const lz = ((i + 0.5) / n - 0.5) * d;
            colliders.push({ x: OX + x + lz * s, z: OZ + z + lz * c, r: Math.max(w, d / n) / 2 + 3, top: BASE + h + roofH });
        }
    }
    function tower(x, z, rad, h, kind, roofH = 0) {
        const top = drum(x, z, rad, h);
        ring(x, z, rad * 1.12, 1.4, top - 3.2);
        if (kind === 'cone') {
            ring(x, z, rad * 1.1, 1.2, top - 0.2, STONE);
            cone(x, z, rad * 1.22, roofH, top + 0.8);
            const sp = new THREE.CylinderGeometry(0.06, 0.12, roofH * 0.35, 5).toNonIndexed();
            sp.translate(OX + x, top + 0.8 + roofH + roofH * 0.17, OZ + z);
            finish(sp, LEAD, [0, 0, 0]);
        } else {
            ring(x, z, rad * 1.14, 1.6, top - 0.4);
            merlonsCircle(x, z, rad * 1.1, top + 1.2);
            if (kind === 'batcone') {
                const t2 = drum(x, z, rad * 0.45, 9, { base: top, win: true, seg: 12 });
                cone(x, z, rad * 0.6, rad * 2.2, t2);
            }
        }
    }
    function wall(a, b, h = 17, t = 3.2) {
        const x0 = a[0], z0 = a[1], x1 = b[0], z1 = b[1];
        const len = Math.hypot(x1 - x0, z1 - z0), rot = Math.atan2(x1 - x0, z1 - z0);
        box((x0 + x1) / 2, BASE - FOUND, (z0 + z1) / 2, t, h + FOUND, len, rot, { win: false });
        const c = Math.cos(rot), s = Math.sin(rot);
        const ox = c * t * 0.42, oz = -s * t * 0.42;
        merlonsLine(x0 + ox, z0 + oz, x1 + ox, z1 + oz, BASE + h);
        merlonsLine(x0 - ox, z0 - oz, x1 - ox, z1 - oz, BASE + h);
        const n = Math.max(1, Math.round(len / 18));
        for (let i = 0; i <= n; i++) {
            const tt = i / n;
            colliders.push({ x: OX + x0 + (x1 - x0) * tt, z: OZ + z0 + (z1 - z0) * tt, r: 6, top: BASE + h + 2 });
        }
    }

    // --- the halls
    hall(-5, 40, 20, 64, 30, 0, 15);        // Great Hall
    hall(-40, -25, 44, 26, 36, 0.12, 12);   // the keep
    hall(55, 5, 24, 70, 28, 0.05, 12);      // east wing
    hall(10, -72, 52, 22, 40, -0.06, 13);   // north range
    hall(-82, 8, 22, 58, 25, -0.08, 10);    // west wing
    hall(38, 78, 40, 18, 22, 0.1, 9);       // clock court

    // --- the towers
    tower(-78, -45, 6.5, 104, 'cone', 28);  // Astronomy Tower
    tower(0, -12, 12.5, 82, 'cone', 32);
    tower(-30, -74, 11, 70, 'batcone');
    tower(38, -58, 9, 64, 'cone', 24);
    tower(86, -22, 7, 52, 'cone', 21);
    tower(72, 48, 9, 58, 'batcone');
    tower(20, 98, 7, 44, 'cone', 18);
    tower(-42, 94, 8, 48, 'cone', 20);
    tower(-98, 34, 9, 44, 'bat');
    tower(-112, -14, 5, 38, 'cone', 16);
    tower(112, 16, 5, 40, 'cone', 16);
    tower(58, -98, 5, 50, 'cone', 18);
    tower(-70, 64, 5, 34, 'cone', 14);
    tower(-58, -96, 6, 58, 'cone', 20);
    tower(95, 80, 5.5, 36, 'cone', 15);

    // --- curtain walls between the outer towers
    const ring8 = [[-112, -14], [-98, 34], [-70, 64], [-42, 94], [20, 98], [95, 80], [112, 16], [86, -22], [58, -98], [-30, -74], [-58, -96], [-78, -45], [-112, -14]];
    for (let i = 0; i < ring8.length - 1; i++) wall(ring8[i], ring8[i + 1], 15 + r() * 6);

    // --- covered viaduct to the gate tower on the shore
    const A = [-42, 102], B = [-150, 168];
    const vlen = Math.hypot(B[0] - A[0], B[1] - A[1]), vrot = Math.atan2(B[0] - A[0], B[1] - A[1]);
    const deckY = BASE + 8;
    box((A[0] + B[0]) / 2, deckY, (A[1] + B[1]) / 2, 6, 6, vlen, vrot, { win: true });
    parts[parts.length - 1].attributes.aWin.array.forEach((_, i, a) => { if (i % 3 === 1) a[i] = 1.0; else if (i % 3 === 2) a[i] = 5.6; });
    gable((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, 6.6, vlen, 3.2, deckY + 6, vrot);
    const np = Math.round(vlen / 13);
    for (let i = 1; i < np; i++) {
        const t = i / np;
        const px = A[0] + (B[0] - A[0]) * t, pz = A[1] + (B[1] - A[1]) * t;
        box(px, deckY - 70, pz, 3.2, 70, 3.2, vrot, { win: false });
    }
    const gt = drum(-150, 168, 7, 26, { base: BASE - 10 });
    cone(-150, 168, 8.4, 22, gt + 0.6);
    for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        colliders.push({ x: OX + A[0] + (B[0] - A[0]) * t, z: OZ + A[1] + (B[1] - A[1]) * t, r: 6, top: deckY + 10 });
    }

    const geo = merge(parts);
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: uniforms() });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    // the Snitch likes to thread these
    const spires = [[-78, -45, BASE + 104 + 16], [0, -12, BASE + 82 + 18], [72, 48, BASE + 58 + 10], [-42, 94, BASE + 48 + 6], [-150, 168, BASE + 10]]
        .map(([x, z, y]) => new THREE.Vector3(OX + x, y, OZ + z));
    return { mesh, colliders, spires };
}
