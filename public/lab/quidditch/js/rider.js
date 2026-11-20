// The rider is a silhouette first: dark robes, a scarlet-lined cloak that streams flat at speed and billows as it
// slows, a red-and-gold scarf simulated as a Verlet chain in world space, round glasses catching the low sun, and a
// twig broom that leaves a faint wake. Local frame: +Z forward along the handle, +Y up.
import * as THREE from 'three';
import { NOISE, ATMOS, uniforms } from './atmos.js';
import { merge, paint, rng, clamp } from './util.js';

const ROBE = [0.026, 0.026, 0.032];
const TROUSER = [0.035, 0.035, 0.045];
const SKIN = [0.50, 0.34, 0.27];
const HAIR = [0.020, 0.015, 0.011];
const WOOD = [0.30, 0.16, 0.065];
const TWIG = [0.30, 0.215, 0.11];
const METAL = [0.10, 0.10, 0.11];
const SCARLET = [0.42, 0.03, 0.035];

const bodyVert = /* glsl */`
attribute vec3 color; attribute vec2 aMat;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vM;
void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; vM = aMat;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const bodyFrag = /* glsl */`
${ATMOS}
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vM;
void main() {
    if (uReflect > 0.5 && vW.y < -0.3) discard;
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    vec3 col = lightIt(vC, n, vW, 1.0);
    vec3 r = reflect(-v, n);
    float sp = pow(max(dot(r, uSunDir), 0.0), mix(12.0, 90.0, vM.x));
    col += SUNCOL * sp * vM.x * 2.5 + skyBand(r) * vM.x * 0.25;
    // a cool key from the sky behind the camera keeps the silhouette readable on the dark side
    col += vC * vec3(0.30, 0.36, 0.48) * pow(max(dot(n, v), 0.0), 2.0) * 0.6;
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

const cloakVert = /* glsl */`
uniform float uTime; uniform float uSpeed; uniform float uRoll; uniform float uFlip;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
vec3 cloak(float u, float v) {
    float s = uSpeed;
    float w = mix(0.34, 0.82, v);
    vec3 dir = normalize(mix(vec3(0.0, -0.86, -0.50), vec3(0.0, 0.06, -1.0), s));
    vec3 p = vec3(0.0, 0.43, -0.02) + dir * v * 1.42;
    p.y -= sin(v * 3.1416) * 0.07 * (1.0 - s * 0.7);
    float side = abs(u - 0.5) * 2.0;
    p.y -= side * side * mix(0.16, 0.07, s) * (1.0 - v * 0.4);
    float t = uTime * mix(4.0, 15.0, s);
    float amp = mix(0.08, 0.26, s) * v * v;
    p.y += sin(v * 7.0 - t + u * 2.2) * amp + sin(v * 13.0 - t * 1.63 + u * 5.0) * amp * 0.35;
    p.x += (u - 0.5) * w + sin(v * 5.0 - t * 0.71 + 1.3) * amp * 0.55;
    p.x += uRoll * v * v * 0.5;
    p.y += abs(uRoll) * v * v * 0.12;
    return p;
}
void main() {
    vec3 p = cloak(uv.x, uv.y);
    vec3 du = cloak(uv.x + 0.02, uv.y) - p, dv = cloak(uv.x, uv.y + 0.02) - p;
    vec3 n = normalize(cross(du, dv)) * uFlip;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const cloakFrag = /* glsl */`
${ATMOS}
${NOISE}
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main() {
    if (uReflect > 0.5 && vW.y < -0.3) discard;
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    vec3 alb = gl_FrontFacing ? vec3(0.30, 0.018, 0.026) : vec3(0.022, 0.022, 0.027);
    if (dot(n, v) < 0.0) n = -n;
    float weave = 0.9 + 0.1 * vnoise(vUv * vec2(60.0, 120.0));
    vec3 col = lightIt(alb * weave, n, vW, 1.0);
    float sheen = pow(1.0 - abs(dot(n, v)), 3.0);
    col += alb * sheen * vec3(0.5, 0.55, 0.7) * 1.6 + SUNCOL * sheen * pow(max(dot(-v, uSunDir), 0.0), 2.0) * 0.12;
    // the hem frays into the dusk
    float hem = smoothstep(0.985, 0.94, vUv.y + (vnoise(vec2(vUv.x * 30.0, 1.0)) - 0.5) * 0.04);
    if (hem < 0.5) discard;
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

const ribbonVert = /* glsl */`
attribute float aT;
varying vec3 vW; varying vec3 vN; varying float vT; varying vec2 vUv;
void main() {
    vW = position; vN = normal; vT = aT; vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;
const scarfFrag = /* glsl */`
${ATMOS}
varying vec3 vW; varying vec3 vN; varying float vT; varying vec2 vUv;
void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    float band = step(0.5, fract(vT * 4.6));
    vec3 alb = mix(vec3(0.40, 0.025, 0.03), vec3(0.62, 0.42, 0.08), band * step(0.08, vT));
    vec3 col = lightIt(alb, n, vW, 1.0) + alb * vec3(0.3, 0.32, 0.4) * 0.5;
    if (vT > 0.96 && fract(vUv.x * 9.0) < 0.5) discard;
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;
const trailFrag = /* glsl */`
${ATMOS}
uniform float uGain;
varying vec3 vW; varying vec3 vN; varying float vT; varying vec2 vUv;
void main() {
    float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float a = pow(across, 2.0) * pow(1.0 - vT, 2.2) * smoothstep(0.0, 0.06, vT) * uGain;
    vec3 col = mix(vec3(1.2, 0.85, 0.55), vec3(0.6, 0.65, 0.8), vT) * a;
    gl_FragColor = vec4(col, 1.0);
}`;

function between(a, b, r, color, mat = [0, 0], seg = 8) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len), 3, seg).toNonIndexed();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    g.applyQuaternion(q);
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    return paint(g, { color, aMat: mat });
}
function rod(a, b, r0, r1, color, mat = [0, 0], seg = 6) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true).toNonIndexed();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    g.applyQuaternion(q);
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    return paint(g, { color, aMat: mat });
}
function ball(p, r, color, s = [1, 1, 1], mat = [0, 0]) {
    const g = new THREE.SphereGeometry(r, 14, 10).toNonIndexed();
    g.scale(...s); g.translate(...p);
    return paint(g, { color, aMat: mat });
}

export function createRider() {
    const r = rng(7);
    const parts = [];
    const P = (g) => { g.deleteAttribute('uv'); parts.push(g); };

    // --- the broom
    P(rod([0, 0, -0.95], [0, 0.015, 1.18], 0.03, 0.022, WOOD, [0.7, 0], 10));
    P(ball([0, 0.016, 1.18], 0.022, WOOD, [1, 1, 1], [0.7, 0]));
    for (const z of [-0.9, -0.99]) {
        const t = new THREE.TorusGeometry(0.048, 0.008, 6, 16).toNonIndexed();
        t.translate(0, 0, z);
        P(paint(t, { color: METAL, aMat: [0.8, 0] }));
    }
    for (let i = 0; i < 90; i++) {
        const a = r() * Math.PI * 2, rr = Math.sqrt(r());
        const sx = Math.cos(a) * 0.035 * rr, sy = Math.sin(a) * 0.035 * rr;
        const spread = 0.10 + r() * 0.1;
        const ex = Math.cos(a) * spread * rr * 1.3, ey = Math.sin(a) * spread * rr + 0.03;
        const ez = -1.68 - r() * 0.22;
        const c = TWIG.map((v) => v * (0.75 + r() * 0.5));
        P(rod([sx, sy, -0.92], [ex, ey, ez], 0.0055, 0.003, c, [0, 0], 4));
    }
    P(rod([0, 0, -0.5], [0, -0.27, -0.52], 0.008, 0.008, METAL, [0.8, 0], 5));
    P(rod([-0.17, -0.28, -0.5], [0.17, -0.28, -0.5], 0.01, 0.01, METAL, [0.8, 0], 5));

    // --- the rider, crouched low over the handle
    P(ball([0, 0.10, -0.38], 0.15, ROBE, [1.1, 0.8, 1.05]));
    P(between([0, 0.16, -0.34], [0, 0.39, 0.03], 0.15, ROBE));
    P(between([-0.17, 0.39, 0.0], [0.17, 0.39, 0.0], 0.082, ROBE));
    P(between([0, 0.43, 0.05], [0, 0.49, 0.11], 0.048, SKIN));
    const HC = [0, 0.555, 0.175];
    P(ball(HC, 0.1, SKIN, [0.95, 1.04, 1.0]));
    // a messy crop, not a helmet: a cap over the crown and back with a few loose locks
    P(ball([0, HC[1] + 0.028, HC[2] - 0.02], 0.109, HAIR, [1.06, 0.88, 1.08]));
    [[0.028, 0.072, -0.05], [-0.03, 0.07, -0.045], [0, 0.085, 0.0], [0.03, 0.078, 0.05], [-0.034, 0.074, 0.058], [0, 0.055, 0.088], [0, -0.005, -0.092]]
        .forEach(([x, y, z]) => P(ball([HC[0] + x, HC[1] + y, HC[2] + z], 0.034 + r() * 0.006, HAIR, [1, 0.8, 1])));
    for (const sx of [-1, 1]) {
        const t = new THREE.TorusGeometry(0.023, 0.0045, 6, 18).toNonIndexed();
        t.translate(sx * 0.037, HC[1] + 0.002, HC[2] + 0.098);
        P(paint(t, { color: [0.6, 0.5, 0.3], aMat: [1, 0] }));
        P(rod([sx * 0.06, HC[1] + 0.004, HC[2] + 0.095], [sx * 0.097, HC[1] + 0.008, HC[2]], 0.003, 0.003, [0.5, 0.42, 0.26], [1, 0], 4));
    }
    for (const sx of [-1, 1]) {
        const hz = sx < 0 ? 0.40 : 0.51;
        P(between([sx * 0.18, 0.385, 0.0], [sx * 0.21, 0.22, 0.22], 0.054, ROBE));
        P(between([sx * 0.21, 0.22, 0.22], [sx * 0.045, 0.045, hz], 0.045, ROBE));
        P(ball([sx * 0.04, 0.03, hz], 0.04, SKIN, [1, 0.9, 1.3]));
        P(between([sx * 0.1, 0.07, -0.38], [sx * 0.21, -0.05, -0.10], 0.068, TROUSER));
        P(between([sx * 0.21, -0.05, -0.10], [sx * 0.15, -0.26, -0.45], 0.054, TROUSER));
        P(ball([sx * 0.15, -0.285, -0.48], 0.055, [0.012, 0.012, 0.014], [1, 0.8, 1.9], [0.3, 0]));
    }
    // the scarf knotted at the throat
    const knot = new THREE.TorusGeometry(0.072, 0.034, 8, 18).toNonIndexed();
    knot.rotateX(Math.PI / 2 - 0.7); knot.translate(0, 0.445, 0.07);
    P(paint(knot, { color: SCARLET, aMat: [0, 0] }));

    const bodyGeo = merge(parts);
    const body = new THREE.Mesh(bodyGeo, new THREE.ShaderMaterial({ vertexShader: bodyVert, fragmentShader: bodyFrag, uniforms: uniforms() }));
    body.frustumCulled = false;

    const cloakU = uniforms({ uSpeed: { value: 0.5 }, uRoll: { value: 0 }, uFlip: { value: -1 } });
    const cloakGeo = new THREE.PlaneGeometry(1, 1, 10, 22);
    cloakGeo.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 1) a[i] = 1 - v; });
    const cloak = new THREE.Mesh(cloakGeo, new THREE.ShaderMaterial({ vertexShader: cloakVert, fragmentShader: cloakFrag, uniforms: cloakU, side: THREE.DoubleSide }));
    cloak.frustumCulled = false;

    const group = new THREE.Group();
    const lean = new THREE.Group();
    lean.add(body, cloak);
    group.add(lean);

    // --- the scarf tail: Verlet in world space
    const SN = 14, SEG = 0.095;
    const pts = [], prev = [];
    for (let i = 0; i < SN; i++) { pts.push(new THREE.Vector3()); prev.push(new THREE.Vector3()); }
    const sGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(SN * 2 * 3), sNrm = new Float32Array(SN * 2 * 3), sT = new Float32Array(SN * 2), sUv = new Float32Array(SN * 2 * 2);
    const sIdx = [];
    for (let i = 0; i < SN; i++) {
        sT[i * 2] = sT[i * 2 + 1] = i / (SN - 1);
        sUv[i * 4] = 0; sUv[i * 4 + 1] = i / (SN - 1); sUv[i * 4 + 2] = 1; sUv[i * 4 + 3] = i / (SN - 1);
        if (i < SN - 1) { const a = i * 2; sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
    sGeo.setAttribute('normal', new THREE.BufferAttribute(sNrm, 3).setUsage(THREE.DynamicDrawUsage));
    sGeo.setAttribute('aT', new THREE.BufferAttribute(sT, 1));
    sGeo.setAttribute('uv', new THREE.BufferAttribute(sUv, 2));
    sGeo.setIndex(sIdx);
    const scarf = new THREE.Mesh(sGeo, new THREE.ShaderMaterial({ vertexShader: ribbonVert, fragmentShader: scarfFrag, uniforms: uniforms(), side: THREE.DoubleSide }));
    scarf.frustumCulled = false;

    // --- the twig wake: a ribbon through the broom tail's recent path
    const TN = 12;
    const hist = [];
    for (let i = 0; i < TN; i++) hist.push(new THREE.Vector3());
    const tGeo = new THREE.BufferGeometry();
    const tPos = new Float32Array(TN * 2 * 3), tT = new Float32Array(TN * 2), tUv = new Float32Array(TN * 2 * 2);
    const tIdx = [];
    for (let i = 0; i < TN; i++) {
        tT[i * 2] = tT[i * 2 + 1] = i / (TN - 1);
        tUv[i * 4] = 0; tUv[i * 4 + 2] = 1;
        if (i < TN - 1) { const a = i * 2; tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
    tGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(TN * 2 * 3), 3));
    tGeo.setAttribute('aT', new THREE.BufferAttribute(tT, 1));
    tGeo.setAttribute('uv', new THREE.BufferAttribute(tUv, 2));
    tGeo.setIndex(tIdx);
    const trailU = uniforms({ uGain: { value: 0 } });
    const trail = new THREE.Mesh(tGeo, new THREE.ShaderMaterial({
        vertexShader: ribbonVert, fragmentShader: trailFrag, uniforms: trailU, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    trail.frustumCulled = false;
    trail.renderOrder = 6;

    // --- Dracarys-style GPGPU magical particle embers & wake streaming from broom twigs
    const PN = 360;
    const pPos = new Float32Array(PN * 3);
    const pVel = new Float32Array(PN * 3);
    const pLife = new Float32Array(PN);
    const pMaxLife = new Float32Array(PN);
    const pCol = new Float32Array(PN * 3);
    const pSize = new Float32Array(PN);

    for (let i = 0; i < PN; i++) {
        pLife[i] = 999;
        pMaxLife[i] = 0.4 + Math.random() * 0.7;
        pSize[i] = 14 + Math.random() * 26;
        pPos[i * 3 + 1] = -9999;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
    pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));

    const sparkMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uGain: { value: 1.0 } },
        vertexShader: /* glsl */`
            attribute vec3 color;
            attribute float size;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = clamp(size * (220.0 / -mv.z), 1.0, 48.0);
            }
        `,
        fragmentShader: /* glsl */`
            varying vec3 vColor;
            void main() {
                vec2 c = gl_PointCoord - 0.5;
                float r2 = dot(c, c);
                if (r2 > 0.25) discard;
                float a = exp(-r2 * 14.0);
                gl_FragColor = vec4(vColor * a, a);
            }
        `
    });

    const sparks = new THREE.Points(pGeo, sparkMat);
    sparks.frustumCulled = false;
    sparks.renderOrder = 8;

    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), camDir = new THREE.Vector3();
    const anchorLocal = new THREE.Vector3(0.05, 0.44, 0.04), tailLocal = new THREE.Vector3(0, 0.04, -1.62);
    let primed = false;

    function reset() {
        primed = false;
        for (let i = 0; i < PN; i++) { pLife[i] = 999; pPos[i * 3 + 1] = -9999; }
    }

    function update(dt, s, time, camPos) {
        // body language: tuck in on the boost, deep lean into turns
        lean.rotation.x = 0.12 * s.boost - Math.sin(time * 1.3) * 0.015 + Math.min(0, s.pitch) * 0.15;
        lean.position.y = Math.sin(time * 1.7) * 0.025;
        lean.rotation.z = Math.sin(time * 0.9) * 0.02 + s.roll * 0.12;
        cloakU.uSpeed.value = clamp((s.speed - 10) / 42);
        cloakU.uRoll.value = s.roll;
        group.updateMatrixWorld(true);

        // scarf
        const anchor = tmp.copy(anchorLocal).applyMatrix4(lean.matrixWorld);
        if (!primed) {
            for (let i = 0; i < SN; i++) { pts[i].copy(anchor).addScaledVector(s.fwd, -i * SEG); prev[i].copy(pts[i]); }
            for (let i = 0; i < TN; i++) hist[i].copy(tailLocal).applyMatrix4(group.matrixWorld);
            primed = true;
        }
        const sub = 3, h = Math.min(dt, 0.05) / sub;
        for (let k = 0; k < sub; k++) {
            pts[0].copy(anchor);
            for (let i = 1; i < SN; i++) {
                const p = pts[i], q = prev[i];
                const vx = p.x - q.x, vy = p.y - q.y, vz = p.z - q.z;
                q.copy(p);
                const drag = 0.86;
                const tip = (i / SN) * (i / SN);
                const fl = Math.sin(time * 19 - i * 0.8) * 0.6 + Math.sin(time * 31 - i * 1.5) * 0.4;
                const fv = Math.sin(time * 15 - i * 0.6 + 1.7) * 0.7 + Math.sin(time * 27 - i * 1.1) * 0.3;
                p.x += vx * drag + s.right.x * fl * 0.006 * s.speed * h * 60 * tip;
                p.y += vy * drag - 9 * h * h + fv * 0.005 * s.speed * h * 60 * tip;
                p.z += vz * drag + s.right.z * fl * 0.006 * s.speed * h * 60 * tip;
            }
            for (let it = 0; it < 4; it++) {
                for (let i = 1; i < SN; i++) {
                    const a = pts[i - 1], b = pts[i];
                    tmp2.subVectors(b, a);
                    const d = tmp2.length() || 1e-5;
                    const corr = (d - SEG) / d;
                    if (i === 1) b.addScaledVector(tmp2, -corr);
                    else { a.addScaledVector(tmp2, corr * 0.5); b.addScaledVector(tmp2, -corr * 0.5); }
                }
            }
        }
        for (let i = 0; i < SN; i++) {
            const a = pts[Math.max(0, i - 1)], b = pts[Math.min(SN - 1, i + 1)];
            tmp2.subVectors(b, a).normalize();
            camDir.subVectors(camPos, pts[i]).normalize();
            right.crossVectors(tmp2, s.up).normalize().lerp(tmp.crossVectors(tmp2, camDir).normalize(), 0.35).normalize();
            up.crossVectors(right, tmp2).normalize();
            const w = 0.045;
            sPos[i * 6] = pts[i].x - right.x * w; sPos[i * 6 + 1] = pts[i].y - right.y * w; sPos[i * 6 + 2] = pts[i].z - right.z * w;
            sPos[i * 6 + 3] = pts[i].x + right.x * w; sPos[i * 6 + 4] = pts[i].y + right.y * w; sPos[i * 6 + 5] = pts[i].z + right.z * w;
            sNrm.set([up.x, up.y, up.z, up.x, up.y, up.z], i * 6);
        }
        sGeo.attributes.position.needsUpdate = true; sGeo.attributes.normal.needsUpdate = true;

        // twig wake ribbon
        for (let i = TN - 1; i > 0; i--) hist[i].copy(hist[i - 1]);
        hist[0].copy(tailLocal).applyMatrix4(group.matrixWorld);
        for (let i = 0; i < TN; i++) {
            const a = hist[Math.max(0, i - 1)], b = hist[Math.min(TN - 1, i + 1)];
            tmp2.subVectors(a, b);
            if (tmp2.lengthSq() < 1e-8) tmp2.copy(s.fwd);
            camDir.subVectors(camPos, hist[i]);
            right.crossVectors(tmp2, camDir).normalize();
            const w = 0.03 + (i / TN) * 0.28;
            tPos[i * 6] = hist[i].x - right.x * w; tPos[i * 6 + 1] = hist[i].y - right.y * w; tPos[i * 6 + 2] = hist[i].z - right.z * w;
            tPos[i * 6 + 3] = hist[i].x + right.x * w; tPos[i * 6 + 4] = hist[i].y + right.y * w; tPos[i * 6 + 5] = hist[i].z + right.z * w;
        }
        tGeo.attributes.position.needsUpdate = true;
        const endOn = Math.abs(camDir.subVectors(camPos, hist[0]).normalize().dot(s.fwd));
        trailU.uGain.value = (0.012 + 0.09 * s.boost) * (1 - endOn * endOn * 0.92);

        // Broom embers & sparks simulation (Dracarys GPGPU particle wake)
        const tailWorld = tmp.copy(tailLocal).applyMatrix4(group.matrixWorld);
        const spawnCount = Math.floor(s.boost > 0.1 ? 22 : 9);
        let spawned = 0;

        for (let i = 0; i < PN; i++) {
            pLife[i] += dt;
            if (pLife[i] >= pMaxLife[i] && spawned < spawnCount) {
                pLife[i] = 0;
                pMaxLife[i] = 0.35 + Math.random() * (s.boost > 0.1 ? 0.85 : 0.55);
                const spread = (Math.random() - 0.5) * 0.22;
                const spreadY = (Math.random() - 0.5) * 0.22;
                pPos[i * 3 + 0] = tailWorld.x + spread;
                pPos[i * 3 + 1] = tailWorld.y + spreadY;
                pPos[i * 3 + 2] = tailWorld.z + spread;

                const swirlAngle = Math.random() * Math.PI * 2;
                const swirlRad = (0.2 + Math.random() * 0.8) * (1.0 + s.boost * 1.8);
                pVel[i * 3 + 0] = -s.fwd.x * s.speed * 0.3 + Math.cos(swirlAngle) * swirlRad;
                pVel[i * 3 + 1] = -s.fwd.y * s.speed * 0.3 + Math.sin(swirlAngle) * swirlRad + 0.4;
                pVel[i * 3 + 2] = -s.fwd.z * s.speed * 0.3 + Math.sin(swirlAngle) * swirlRad;

                const isGold = Math.random() > 0.35;
                if (s.boost > 0.1) {
                    pCol[i * 3 + 0] = 1.0;
                    pCol[i * 3 + 1] = isGold ? 0.88 : 0.45;
                    pCol[i * 3 + 2] = isGold ? 0.25 : 0.05;
                } else {
                    pCol[i * 3 + 0] = 0.95;
                    pCol[i * 3 + 1] = isGold ? 0.72 : 0.32;
                    pCol[i * 3 + 2] = isGold ? 0.15 : 0.02;
                }
                spawned++;
            } else if (pLife[i] < pMaxLife[i]) {
                const age = pLife[i] / pMaxLife[i];
                const drag = Math.exp(-dt * 3.2);
                pVel[i * 3 + 0] *= drag;
                pVel[i * 3 + 1] = (pVel[i * 3 + 1] + dt * 0.5) * drag;
                pVel[i * 3 + 2] *= drag;

                pPos[i * 3 + 0] += pVel[i * 3 + 0] * dt;
                pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
                pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;

                const fade = Math.pow(1.0 - age, 1.4);
                pCol[i * 3 + 0] *= fade;
                pCol[i * 3 + 1] *= fade;
                pCol[i * 3 + 2] *= fade;
            } else {
                pPos[i * 3 + 1] = -9999;
            }
        }
        pGeo.attributes.position.needsUpdate = true;
        pGeo.attributes.color.needsUpdate = true;
    }

    return { group, scarf, trail, sparks, update, reset };
}
