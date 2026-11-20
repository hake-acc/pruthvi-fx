// Overcast Scottish dusk: a slate cloud deck that breaks open toward the horizon so the low sun bleeds amber under it,
// plus cloud banks you can fly into. Puffs are camera-facing cards with a baked density/lighting texture; they thin
// out as the lens enters them and the post chain takes over with a full-screen mist.
import * as THREE from 'three';
import { NOISE, ATMOS, uniforms } from './atmos.js';
import { rng, fbm, lerp, clamp } from './util.js';
import { LAKE, CASTLE } from './world.js';

const skyVert = /* glsl */`
varying vec3 vDir;
void main() {
    vDir = position;
    vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
    gl_Position = p.xyww;
}`;
const skyFrag = /* glsl */`
${ATMOS}
${NOISE}
varying vec3 vDir;
void main() {
    vec3 rd = normalize(vDir);
    vec3 col = skyBand(rd);
    float s = max(dot(rd, uSunDir), 0.0);
    float dens = 0.0;
    if (rd.y > -0.04) {
        float y = max(rd.y, 0.0) + 0.055;
        vec2 p = rd.xz / y * 0.85 + vec2(uTime * 0.0045, uTime * 0.0015);
        float c = fbm2(p * 1.1);
        float c2 = fbm2(p * 3.3 + 4.0);
        float field = c + (c2 - 0.5) * 0.28;
        float open = smoothstep(0.03, 0.22, rd.y);
        dens = smoothstep(0.40, 0.70, field) * open;
        float edge = (1.0 - smoothstep(0.40, 0.62, field)) * smoothstep(0.34, 0.46, field);
        vec3 under = vec3(0.058, 0.062, 0.078) * (0.85 + 0.5 * rd.y);
        vec3 lit = vec3(1.25, 0.56, 0.26) * (pow(s, 3.0) * 1.4 + 0.05);
        vec3 cc = under + lit * (0.25 + edge * 1.8) + vec3(0.03, 0.035, 0.045) * c2;
        col = mix(col, cc, dens * 0.95);
        // thin streaks of high cirrus catching the last light
        float ci = fbm3(vec2(rd.x / y * 0.25, rd.z / y * 2.2) + uTime * 0.002);
        col += vec3(0.9, 0.42, 0.2) * smoothstep(0.55, 0.85, ci) * (1.0 - dens) * pow(s, 2.0) * 0.35 * open;
    }
    float disc = smoothstep(0.99972, 0.99986, s);
    col += SUNCOL * disc * 28.0 * (1.0 - dens * 0.9);
    col += SUNCOL * pow(s, 220.0) * 1.6 * (1.0 - dens * 0.6);
    gl_FragColor = vec4(col, 1.0);
}`;

export function createSky() {
    const g = new THREE.SphereGeometry(100, 48, 24);
    const m = new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, uniforms: uniforms(), side: THREE.BackSide, depthWrite: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    return mesh;
}

// ------------------------------------------------------------------ cloud banks
// banks drift east on the wind and wrap far out in the fog
const DRIFT = 0.8, SPAN = 5600;
const wrapX = (x, t) => ((x + t * DRIFT + SPAN * 0.5 + 200) % SPAN + SPAN) % SPAN - SPAN * 0.5 - 200;

function bakePuff(size = 128) {
    const data = new Uint8Array(size * size * 4);
    const dens = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const u = x / size * 2 - 1, v = y / size * 2 - 1;
        const r = Math.hypot(u, v * 1.15);
        const n = fbm(u * 2.6 + 11, v * 2.6 + 3, 5) * 0.55 + fbm(u * 6 + 2, v * 6, 3) * 0.2;
        dens[y * size + x] = clamp((1 - r * r * 1.15) + n - 0.18) * clamp((1 - r) * 3);
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const d = dens[i];
        const lx = Math.min(size - 1, x + 6), ly = Math.min(size - 1, y + 9);
        const toward = dens[ly * size + lx];
        const light = clamp(0.55 + (d - toward) * 2.2);
        data[i * 4] = light * 255; data[i * 4 + 1] = 0; data[i * 4 + 2] = 0;
        data[i * 4 + 3] = clamp(d * 1.3) * 255;
    }
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
}

const puffVert = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
attribute vec4 aPuff;
attribute vec2 aMeta;  // rotation, opacity
varying vec2 vUv; varying float vA; varying vec3 vW; varying float vSun;
void main() {
    vec3 c = aPuff.xyz; float sz = aPuff.w;
    c.x = mod(c.x + uTime * ${DRIFT.toFixed(2)} + ${(SPAN * 0.5 + 200).toFixed(1)}, ${SPAN.toFixed(1)}) - ${(SPAN * 0.5 + 200).toFixed(1)};
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float cr = cos(aMeta.x), sr = sin(aMeta.x);
    vec2 q = mat2(cr, -sr, sr, cr) * position.xy;
    vec3 w = c + (right * q.x + up * q.y) * sz;
    vW = w; vUv = position.xy + 0.5;
    float d = length(c - cameraPosition);
    vA = smoothstep(sz * 0.18, sz * 0.95, d) * aMeta.y;
    vSun = dot(normalize(c - cameraPosition), uSunDir);
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;
const puffFrag = /* glsl */`
${ATMOS}
uniform sampler2D tPuff;
varying vec2 vUv; varying float vA; varying vec3 vW; varying float vSun;
void main() {
    vec4 t = texture2D(tPuff, vUv);
    float a = t.a * vA;
    if (a < 0.004) discard;
    a *= smoothstep(0.0, 14.0, vW.y);
    float back = pow(max(vSun, 0.0), 8.0);
    vec3 base = vec3(0.050, 0.054, 0.066) + vec3(0.035, 0.038, 0.048) * t.r;
    vec3 col = base + SUNCOL * t.r * t.r * (0.03 + 0.22 * pow(max(vSun, 0.0), 3.0)) + SUNCOL * back * (1.0 - t.a) * 0.55;
    col = applyFog(col, vW);
    gl_FragColor = vec4(col * a, a);
}`;

export function createClouds(tier) {
    const r = rng(1213);
    const puffs = [];
    const bankCentres = [];
    const banks = tier >= 2 ? 30 : 18;
    for (let b = 0; b < banks; b++) {
        let cx, cz, cy;
        if (b < 4) { const a = b * 1.7 + 0.4; cx = CASTLE.x + Math.cos(a) * 160; cz = CASTLE.z + Math.sin(a) * 140; cy = 170 + r() * 50; }
        else { const a = r() * 6.283, d = 300 + r() * 1900; cx = Math.cos(a) * d - 200; cz = Math.sin(a) * d + 100; cy = 150 + r() * 140; }
        const n = 10 + Math.floor(r() * 10);
        const spread = 70 + r() * 90;
        bankCentres.push([cx, cy, cz]);
        for (let i = 0; i < n; i++) {
            puffs.push([cx + (r() - 0.5) * spread * 2, cy + (r() - 0.5) * spread * 0.35, cz + (r() - 0.5) * spread * 2, 45 + r() * 55, r() * 6.283, 0.55 + r() * 0.35]);
        }
    }
    // low mist lying on the lake
    const mist = tier >= 2 ? 26 : 14;
    for (let i = 0; i < mist; i++) {
        const a = r() * 6.283, d = Math.sqrt(r());
        puffs.push([LAKE.x + Math.cos(a) * LAKE.rx * 0.8 * d, 6 + r() * 14, LAKE.z + Math.sin(a) * LAKE.rz * 0.8 * d, 70 + r() * 70, r() * 6.283, 0.16 + r() * 0.14]);
    }
    const N = puffs.length;
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    const aPuff = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
    const aMeta = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2);
    aPuff.setUsage(THREE.DynamicDrawUsage); aMeta.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aPuff', aPuff); g.setAttribute('aMeta', aMeta);
    g.instanceCount = N;
    const m = new THREE.ShaderMaterial({
        vertexShader: puffVert, fragmentShader: puffFrag, uniforms: uniforms({ tPuff: { value: bakePuff() } }),
        transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;

    const order = puffs.map((_, i) => i);
    const dist = new Float32Array(N);
    let frame = 0;
    function update(cam, time) {
        let mistAmt = 0;
        for (let i = 0; i < N; i++) {
            const p = puffs[i];
            const dx = wrapX(p[0], time) - cam.x, dy = (p[1] - cam.y) * 1.6, dz = p[2] - cam.z;
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            dist[i] = d;
            mistAmt = Math.max(mistAmt, clamp(1 - d / (p[3] * 0.62)) * p[5]);
        }
        if (frame++ % 4 === 0) {
            order.sort((a, b) => dist[b] - dist[a]);
            for (let k = 0; k < N; k++) {
                const p = puffs[order[k]];
                aPuff.setXYZW(k, p[0], p[1], p[2], p[3]);
                aMeta.setXY(k, p[4], p[5]);
            }
            aPuff.needsUpdate = true; aMeta.needsUpdate = true;
        }
        return mistAmt;
    }
    // live centres of the high banks, for the Snitch to dive through
    const bankAt = (i, time, out) => {
        const c = bankCentres[i % bankCentres.length];
        return out.set(wrapX(c[0], time), c[1], c[2]);
    };
    return { mesh, update, bankAt, bankCount: bankCentres.length };
}
