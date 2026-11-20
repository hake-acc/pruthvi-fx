// The glen: one height function shared by the GPU mesh and the flight model, so the broom pulls up off exactly the
// ground you see. Black Lake in the middle, the castle on its northern promontory, the pitch on the western meadow,
// the Forbidden Forest to the east, and a ring of ridged Highland mountains that fog out in layers.
import * as THREE from 'three';
import { NOISE, ATMOS, uniforms } from './atmos.js';
import { fbm, ridged, smooth, lerp, rng } from './util.js';

export const LAKE = { x: 120, z: 270, rx: 640, rz: 430 };
export const CASTLE = { x: 0, z: -330, y: 58, r: 160 };
export const PITCH = { x: -930, z: 330, y: 8, rx: 205, rz: 130 };

export function height(x, z) {
    let h = 9 + fbm(x * 0.0016 + 3.1, z * 0.0016 - 1.7, 4) * 32;
    const r = Math.hypot(x - 40, z - 60);
    const ring = smooth(1050, 2700, r);
    if (ring > 0) h += ring * (110 + ridged(x * 0.00082 + 7.3, z * 0.00082 + 2.1, 5) * 760);
    const ld = Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) + fbm(x * 0.004, z * 0.004, 3) * 0.13;
    h = lerp(-30, h, smooth(0.8, 1.12, ld));
    const dz = z - CASTLE.z;
    const cd = Math.hypot(x - CASTLE.x, dz * (dz < 0 ? 0.42 : 0.92)) / CASTLE.r + fbm(x * 0.011, z * 0.011, 3) * 0.09 + fbm(x * 0.04, z * 0.04, 2) * 0.05;
    const w = 1 - smooth(0.87, 1.12, cd);
    if (w > 0) {
        h = lerp(h, CASTLE.y + fbm(x * 0.03, z * 0.03, 2) * 1.5, w);
        // buttresses and gullies down the cliff face rather than a lawn
        const face = w * (1 - w) * 4;
        h += face * ((ridged(x * 0.022, z * 0.022, 4) - 0.45) * 26 + fbm(x * 0.09, z * 0.09, 2) * 5);
    }
    const pd = Math.hypot((x - PITCH.x) / PITCH.rx, (z - PITCH.z) / PITCH.rz);
    h = lerp(PITCH.y, h, smooth(0.9, 1.7, pd));
    return h;
}

// ------------------------------------------------------------------ terrain
const terrainVert = /* glsl */`
varying vec3 vW; varying vec3 vN;
void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = normal;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const terrainFrag = /* glsl */`
${ATMOS}
${NOISE}
uniform vec4 uPitch;   // x, z, rx, rz
varying vec3 vW; varying vec3 vN;
void main() {
    if (uReflect > 0.5 && vW.y < -0.3) discard;
    vec3 n = normalize(vN);
    float d = length(vW - cameraPosition);
    float det = 1.0 - smoothstep(300.0, 1400.0, d);
    float n1 = vnoise(vW.xz * 0.018), n2 = vnoise(vW.xz * 0.11) * det, n3 = fbm3(vW.xz * 0.0035);
    vec3 grass = mix(vec3(0.060, 0.078, 0.034), vec3(0.120, 0.128, 0.056), n1) * (0.85 + 0.3 * n2);
    vec3 heather = mix(vec3(0.118, 0.072, 0.080), vec3(0.150, 0.110, 0.070), n1);
    float hm = smoothstep(0.45, 0.62, n3) * smoothstep(25.0, 90.0, vW.y);
    vec3 col = mix(grass, heather, hm);
    float slope = 1.0 - n.y;
    float strata = 0.75 + 0.5 * vnoise(vec2(vW.y * 0.35, (vW.x + vW.z) * 0.01));
    // gullies run down the fall line: noise stretched along the face's own horizontal tangent
    vec2 tg = normalize(vec2(-n.z, n.x) + 1e-4);
    float along = dot(vW.xz, tg);
    float gully = vnoise(vec2(along * 0.11, vW.y * 0.012)) * 0.6 + vnoise(vec2(along * 0.42, vW.y * 0.05)) * 0.4;
    vec3 rock = vec3(0.125, 0.118, 0.112) * (0.65 + 0.6 * vnoise(vW.xz * 0.04 + vW.y * 0.07)) * (0.85 + 0.3 * n2) * mix(1.0, strata, det);
    float rk = smoothstep(0.16, 0.34, slope + (n1 - 0.5) * 0.18);
    rock *= mix(1.0, 0.35 + 1.3 * gully, det * rk);
    col = mix(col, rock, rk);
    float snow = smoothstep(560.0, 700.0, vW.y + n3 * 140.0) * smoothstep(0.5, 0.25, slope);
    col = mix(col, vec3(0.62, 0.66, 0.74), snow);
    col = mix(col, vec3(0.045, 0.040, 0.036), smoothstep(2.2, 0.2, vW.y));
    // the pitch: mown stripes and chalk lines on the flattened meadow
    vec2 pq = (vW.xz - uPitch.xy) / uPitch.zw;
    float pe = length(pq);
    if (pe < 0.82) {
        float stripe = step(0.5, fract(vW.x / 9.0));
        col = mix(col, mix(vec3(0.075, 0.13, 0.04), vec3(0.10, 0.16, 0.05), stripe), smoothstep(0.82, 0.78, pe));
        float fw = 0.004 + fwidth(pe);
        float line = 1.0 - smoothstep(0.0, fw, abs(pe - 0.76));
        float cc = length(vW.xz - uPitch.xy);
        line = max(line, 1.0 - smoothstep(0.0, 0.35 + fwidth(cc), abs(cc - 9.0)));
        line = max(line, (1.0 - smoothstep(0.0, 0.3 + fwidth(vW.x), abs(vW.x - uPitch.x))) * step(pe, 0.76));
        col = mix(col, vec3(0.5, 0.5, 0.46), line * 0.8);
    }
    col = lightIt(col, n, vW, 1.0);
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

export function createTerrain(tier) {
    const N = tier >= 3 ? 440 : tier === 2 ? 320 : 210;
    const HALF = 4600, CX = -40, CZ = -250, P = 1.8;
    const pos = new Float32Array((N + 1) * (N + 1) * 3);
    const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), P) * HALF;
    let o = 0;
    for (let j = 0; j <= N; j++) {
        const z = CZ + warp(j / N * 2 - 1);
        for (let i = 0; i <= N; i++) {
            const x = CX + warp(i / N * 2 - 1);
            pos[o++] = x; pos[o++] = height(x, z); pos[o++] = z;
        }
    }
    const idx = new Uint32Array(N * N * 6);
    o = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
        idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    const m = new THREE.ShaderMaterial({
        vertexShader: terrainVert, fragmentShader: terrainFrag,
        uniforms: uniforms({ uPitch: { value: new THREE.Vector4(PITCH.x, PITCH.z, PITCH.rx * 0.5, PITCH.rz * 0.3) } }),
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    return mesh;
}

// ------------------------------------------------------------------ the Black Lake
const waterVert = /* glsl */`
uniform mat4 uTexMat;
varying vec3 vW; varying vec4 vR;
void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vR = uTexMat * w;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const waterFrag = /* glsl */`
${ATMOS}
${NOISE}
uniform sampler2D tRefl;
uniform float uHasRefl;
uniform vec4 uWake; // x, z = broom pos, y = speed, w = wake intensity (Dracarys lake wake)
uniform vec4 uCursor; // x, z = lake pos, y = active (0..1), w = click pulse
uniform vec4 uRipples[8]; // x, z, time, strength
uniform vec3 uBroomPos;
varying vec3 vW; varying vec4 vR;

// Procedural Celtic / Hogwarts ancient runes & Marauder's map circles
float celestialRunes(vec2 p, vec2 center, float radius) {
    vec2 d = p - center;
    float r = length(d);
    if (r > radius || r < 0.6) return 0.0;
    float fade = smoothstep(radius, radius * 0.25, r) * smoothstep(0.6, 1.4, r);
    
    // Concentric astrolabe rings
    float rings = 0.0;
    rings += smoothstep(0.10, 0.0, abs(r - 2.8)) * 0.75;
    rings += smoothstep(0.10, 0.0, abs(r - 6.2)) * 0.65;
    rings += smoothstep(0.10, 0.0, abs(r - 10.4)) * 0.70;
    rings += smoothstep(0.12, 0.0, abs(r - 14.8)) * 0.80;
    
    // Astrological compass spokes
    float ang = atan(d.y, d.x);
    float spokes = smoothstep(0.03, 0.0, abs(sin(ang * 6.0))) * smoothstep(14.8, 2.5, r) * 0.6;
    
    // Fine runic dashes along outer perimeter
    float perimeter = smoothstep(0.14, 0.0, abs(r - 14.8)) * step(0.45, sin(ang * 48.0)) * 0.7;
    
    // Inner 8-pointed astronomical star
    float starLines = smoothstep(0.035, 0.0, abs(sin(ang * 8.0) * r - 1.8)) * smoothstep(9.0, 2.8, r) * 0.55;

    return (rings + spokes + perimeter + starLines) * fade;
}

float waves(vec2 p, float t) {
    float h = 0.0;
    h += sin(dot(p, vec2(0.12, 0.05)) + t * 0.9) * 0.35;
    h += sin(dot(p, vec2(-0.07, 0.15)) + t * 1.1) * 0.25;
    h += sin(dot(p, vec2(0.31, -0.21)) + t * 1.7) * 0.10;
    h += (vnoise(p * 0.35 + vec2(t * 0.4, t * 0.25)) - 0.5) * 0.35;
    h += (vnoise(p * 1.3 - vec2(t * 0.7, -t * 0.3)) - 0.5) * 0.12;

    // Dracarys water wake furrow & concentric spray ripples from the broom
    if (uWake.w > 0.005) {
        vec2 d = p - uWake.xz;
        float r = length(d);
        float wakeWave = sin(r * 0.65 - t * 7.5) * exp(-r * 0.07) * uWake.w * 0.75;
        float furrow = -exp(-r * r * 0.22) * uWake.w * 0.48;
        h += wakeWave + furrow;
    }

    // Dynamic hydrodynamic ripples from user cursor interactions
    for (int i = 0; i < 8; i++) {
        vec4 rip = uRipples[i];
        float dt = t - rip.z;
        if (dt > 0.0 && dt < 4.0) {
            float d = length(p - rip.xy);
            float wave = sin(d * 0.85 - dt * 14.0) * exp(-d * 0.045) * exp(-dt * 1.2) * rip.w;
            h += wave;
        }
    }

    return h;
}
void main() {
    float t = uTime;
    vec3 toC = cameraPosition - vW;
    float dist = length(toC);
    vec3 v = toC / dist;
    float e = 0.6;
    float h0 = waves(vW.xz, t);
    vec2 g = vec2(waves(vW.xz + vec2(e, 0.0), t) - h0, waves(vW.xz + vec2(0.0, e), t) - h0) / e;
    float calm = mix(1.0, 0.25, smoothstep(80.0, 1200.0, dist));
    vec3 n = normalize(vec3(-g.x * 0.55 * calm, 1.0, -g.y * 0.55 * calm));
    float fres = 0.025 + 0.975 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
    vec3 rd = reflect(-v, n);
    vec3 refl;
    if (uHasRefl > 0.5) {
        vec2 uv = vR.xy / vR.w + n.xz * 0.022;
        refl = texture2D(tRefl, uv).rgb;
    } else {
        refl = skyBand(rd);
    }

    // Interactive Hogwarts Lumos Runes beneath the surface
    vec2 refrP = vW.xz + n.xz * 1.5;
    float cursorRune = uCursor.y > 0.1 ? celestialRunes(refrP, uCursor.xz, 18.0) * (0.85 + uCursor.w * 2.0) : 0.0;
    float broomRune = celestialRunes(refrP, uBroomPos.xz, 14.0) * clamp((14.0 - uBroomPos.y) / 10.0, 0.0, 1.0);
    float runeIntensity = cursorRune + broomRune * 0.75;

    // Glowing golden amber / cyan Lumos palette
    vec3 goldRune = vec3(1.0, 0.78, 0.32);
    vec3 cyanLumos = vec3(0.42, 0.88, 0.96);
    vec3 runeCol = mix(goldRune, cyanLumos, sin(vW.x * 0.08 + t * 1.2) * 0.3 + 0.3) * runeIntensity;

    vec3 body = vec3(0.006, 0.012, 0.015);
    vec3 col = mix(body + runeCol * 0.65, refl, clamp(fres * 1.15, 0.0, 1.0));
    col += runeCol * 0.35; // punch through water
    float spec = pow(max(dot(rd, uSunDir), 0.0), 600.0);
    col += SUNCOL * spec * 26.0 + SUNCOL * pow(max(dot(rd, uSunDir), 0.0), 40.0) * 0.12;
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}
`;

export function createWater() {
    const g = new THREE.PlaneGeometry(LAKE.rx * 2.6, LAKE.rz * 2.6, 1, 1);
    g.rotateX(-Math.PI / 2);
    const ripples = [];
    for (let i = 0; i < 8; i++) ripples.push(new THREE.Vector4(-9999, -9999, -9999, 0));
    const m = new THREE.ShaderMaterial({
        vertexShader: waterVert, fragmentShader: waterFrag,
        uniforms: uniforms({
            tRefl: { value: null },
            uHasRefl: { value: 0 },
            uTexMat: { value: new THREE.Matrix4() },
            uWake: { value: new THREE.Vector4(0, 0, 0, 0) },
            uCursor: { value: new THREE.Vector4(0, 0, 0, 0) },
            uRipples: { value: ripples },
            uBroomPos: { value: new THREE.Vector3(0, 0, 0) },
        }),
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(LAKE.x, 0, LAKE.z);
    return mesh;
}

// ------------------------------------------------------------------ the Forbidden Forest (and scattered firs)
const treeVert = /* glsl */`
uniform float uTime;
attribute vec3 color;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vH;
void main() {
    mat4 im = instanceMatrix;
    vec4 w = modelMatrix * im * vec4(position, 1.0);
    float sway = sin(uTime * 0.8 + im[3].x * 0.05 + im[3].z * 0.03) * 0.04 * position.y;
    w.x += sway; 
    vW = w.xyz; vN = normalize(mat3(modelMatrix * im) * normal); vC = color; vH = position.y;
    float tint = fract(sin(dot(im[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
    vC *= 0.75 + 0.5 * tint;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const treeFrag = /* glsl */`
${ATMOS}
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vH;
void main() {
    if (uReflect > 0.5 && vW.y < -0.3) discard;
    vec3 n = normalize(vN);
    float ao = 0.45 + 0.55 * smoothstep(0.0, 1.0, vH);
    vec3 col = lightIt(vC, n, vW, ao);
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

export function createTrees(count) {
    const parts = [];
    const add = (geo, c) => {
        const n = geo.attributes.position.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) col.set(c, i * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.deleteAttribute('uv');
        parts.push(geo.index ? geo.toNonIndexed() : geo);
    };
    const trunk = new THREE.CylinderGeometry(0.03, 0.05, 0.3, 5, 1, true); trunk.translate(0, 0.15, 0);
    add(trunk, [0.07, 0.05, 0.035]);
    [[0.42, 0.5, 0.22], [0.33, 0.42, 0.48], [0.22, 0.36, 0.72]].forEach(([r, h, y]) => {
        const c = new THREE.ConeGeometry(r, h, 7, 1, true); c.translate(0, y + h * 0.5, 0);
        add(c, [0.030, 0.050, 0.032]);
    });
    const geo = new THREE.BufferGeometry();
    ['position', 'normal', 'color'].forEach((name) => {
        const size = parts[0].attributes[name].itemSize;
        const arr = new Float32Array(parts.reduce((s, p) => s + p.attributes[name].array.length, 0));
        let o = 0; parts.forEach((p) => { arr.set(p.attributes[name].array, o); o += p.attributes[name].array.length; });
        geo.setAttribute(name, new THREE.BufferAttribute(arr, size));
    });
    const mat = new THREE.ShaderMaterial({ vertexShader: treeVert, fragmentShader: treeFrag, uniforms: uniforms() });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    const r = rng(77);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let placed = 0, tries = 0;
    while (placed < count && tries < count * 40) {
        tries++;
        const forest = r() < 0.72;
        const x = forest ? lerp(700, 1900, r()) : lerp(-2000, 1800, r());
        const z = forest ? lerp(-1100, 650, r()) : lerp(-1500, 1500, r());
        if (forest && fbm(x * 0.004, z * 0.004, 2) < -0.2) continue;
        if (!forest && fbm(x * 0.003 + 9, z * 0.003, 3) < 0.1) continue;
        const h = height(x, z);
        if (h < 2.5 || h > 380) continue;
        if (Math.hypot((x - PITCH.x) / (PITCH.rx * 1.25), (z - PITCH.z) / (PITCH.rz * 1.35)) < 1) continue;
        if (Math.hypot(x - CASTLE.x, z - CASTLE.z) < 150) continue;
        const sl = Math.abs(height(x + 4, z) - h) + Math.abs(height(x, z + 4) - h);
        if (sl > 5) continue;
        const sc = (forest ? 15 : 11) + r() * 12;
        p.set(x, h - 0.6, z); q.setFromAxisAngle(up, r() * 6.283); s.set(sc * (0.8 + r() * 0.35), sc, sc * (0.8 + r() * 0.35));
        m4.compose(p, q, s);
        mesh.setMatrixAt(placed++, m4);
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
}
