// The pitch: three gilded hoops at each end on impossibly tall poles, and a ring of timber stand-towers dressed in the
// four houses, lanterns lit, long banners lifting in the wind.
import * as THREE from 'three';
import { NOISE, ATMOS, uniforms } from './atmos.js';
import { merge, paint, rng } from './util.js';
import { PITCH } from './world.js';

const HOUSES = [
    { a: [0.42, 0.025, 0.03], b: [0.78, 0.52, 0.10] },   // Gryffindor
    { a: [0.025, 0.18, 0.075], b: [0.52, 0.54, 0.57] },  // Slytherin
    { a: [0.035, 0.065, 0.26], b: [0.48, 0.30, 0.14] },  // Ravenclaw
    { a: [0.52, 0.37, 0.035], b: [0.025, 0.025, 0.025] }, // Hufflepuff
];
const GOLD = [0.85, 0.58, 0.18];
const TIMBER = [0.11, 0.075, 0.05];

const propVert = /* glsl */`
attribute vec3 color;
attribute vec2 aMat;   // x: metal, y: emission
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vM;
void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vC = color; vM = aMat;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const propFrag = /* glsl */`
${ATMOS}
${NOISE}
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vM;
void main() {
    if (uReflect > 0.5 && vW.y < -0.3) discard;
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    vec3 col;
    if (vM.y > 0.0) {
        col = vC * vM.y * (0.85 + 0.15 * sin(uTime * 3.0 + vW.x * 1.7 + vW.z));
    } else if (vM.x > 0.5) {
        // gilt: the sky and the sun in a warm metal
        vec3 r = reflect(-v, n);
        float fres = 0.6 + 0.4 * pow(1.0 - max(dot(n, v), 0.0), 3.0);
        col = vC * (skyBand(r) * 1.6 + SUNCOL * pow(max(dot(r, uSunDir), 0.0), 60.0) * 9.0) * fres;
        col += lightIt(vC, n, vW, 1.0) * 0.25;
    } else {
        vec3 alb = vC * (0.8 + 0.4 * vnoise(vW.xz * 0.7 + vW.y * 1.3));
        col = lightIt(alb, n, vW, mix(0.6, 1.0, smoothstep(${PITCH.y.toFixed(1)}, ${(PITCH.y + 12).toFixed(1)}, vW.y)));
    }
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

const banVert = /* glsl */`
uniform float uTime;
attribute vec3 aA; attribute vec3 aB; attribute vec3 aNrm; attribute float aPh;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vA; varying vec3 vB;
void main() {
    float hang = uv.y;                       // 0 at the rod, 1 at the hem
    float t = uTime * 1.7 + aPh;
    float wave = sin(hang * 4.2 - t * 2.1 + uv.x * 1.3) * 0.55 + sin(hang * 7.7 - t * 3.3) * 0.22;
    float amp = hang * hang * 1.4;
    vec3 p = position + aNrm * wave * amp;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    float dw = cos(hang * 4.2 - t * 2.1 + uv.x * 1.3) * 4.2 * 0.55 * amp;
    vN = normalize(aNrm - vec3(0.0, -1.0, 0.0) * dw * 0.08);
    vUv = uv; vA = aA; vB = aB;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const banFrag = /* glsl */`
${ATMOS}
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vA; varying vec3 vB;
void main() {
    if (uReflect > 0.5 && vW.y < -0.3) discard;
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    // a chevron pointing down and two edge stripes in the second colour
    float chev = step(abs(abs(vUv.x - 0.5) * 1.2 - (vUv.y - 0.55)), 0.06);
    float edge = step(abs(vUv.x - 0.5), 0.5) * step(0.40, abs(vUv.x - 0.5));
    float hem = step(0.93, vUv.y);
    vec3 alb = mix(vA, vB, max(max(chev, edge), hem));
    vec3 v = normalize(cameraPosition - vW);
    float trans = pow(max(dot(-v, uSunDir), 0.0), 3.0) * 0.6;
    vec3 col = lightIt(alb, n, vW, 1.0) + alb * SUNCOL * trans;
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

export function createPitch() {
    const r = rng(394);
    const parts = [];
    const banners = [];
    const hoops = [];
    const colliders = [];
    const X = PITCH.x, Y = PITCH.y, Z = PITCH.z;
    const add = (g, color, metal = 0, emit = 0) => {
        const geo = paint(g, { color, aMat: [metal, emit] });
        geo.deleteAttribute('uv');
        parts.push(geo);
    };
    const boxAt = (x, y, z, w, h, d, rot, color, emit = 0) => {
        const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
        g.rotateY(rot); g.translate(x, y + h / 2, z);
        add(g, color, 0, emit);
    };

    // --- hoops
    for (const side of [-1, 1]) {
        [[-9, 15], [0, 19.5], [9, 15]].forEach(([dz, hh]) => {
            const hx = X + side * 70, hz = Z + dz;
            const pole = new THREE.CylinderGeometry(0.09, 0.14, hh - 1.6, 8).toNonIndexed();
            pole.translate(hx, Y + (hh - 1.6) / 2, hz);
            add(pole, GOLD, 1);
            const ringG = new THREE.TorusGeometry(1.6, 0.11, 8, 40).toNonIndexed();
            ringG.rotateY(Math.PI / 2); ringG.translate(hx, Y + hh, hz);
            add(ringG, GOLD, 1);
            const foot = new THREE.CylinderGeometry(0.5, 0.7, 0.6, 10).toNonIndexed();
            foot.translate(hx, Y + 0.3, hz);
            add(foot, GOLD, 1);
            hoops.push({ x: hx, y: Y + hh, z: hz, r: 1.6 });
        });
    }

    // --- stand towers around the oval
    const N = 20;
    for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + 0.08;
        if (Math.abs(Math.cos(a)) > 0.985) continue;     // leave the ends open behind the hoops
        const sx = X + Math.cos(a) * 104, sz = Z + Math.sin(a) * 54;
        const rot = Math.atan2(Math.cos(a) * 104, Math.sin(a) * 54);
        const house = HOUSES[Math.floor(((a + 0.4) / (Math.PI * 2)) * 4) % 4];
        const h = 28 + r() * 12;
        // timber legs and cross braces
        for (const [lx, lz] of [[-3, -3], [3, -3], [3, 3], [-3, 3]]) {
            const c = Math.cos(rot), s = Math.sin(rot);
            boxAt(sx + lx * c + lz * s, Y - 1, sz - lx * s + lz * c, 0.7, h + 1, 0.7, rot, TIMBER);
        }
        for (let k = 1; k < 4; k++) boxAt(sx, Y + (h / 4) * k, sz, 6.8, 0.4, 6.8, rot, TIMBER);
        // the dressed box: skirt in the house colour, trim, seats, a pyramid roof
        boxAt(sx, Y + h - 11, sz, 8.4, 11, 8.4, rot, house.a);
        boxAt(sx, Y + h - 0.6, sz, 8.8, 0.6, 8.8, rot, house.b);
        boxAt(sx, Y + h + 2.6, sz, 8.8, 0.5, 8.8, rot, house.b);
        const roof = new THREE.ConeGeometry(6.6, 6.5, 4, 1, true).toNonIndexed();
        roof.rotateY(Math.PI / 4 + rot); roof.translate(sx, Y + h + 3.1 + 3.25, sz);
        add(roof, house.a);
        const pole = new THREE.CylinderGeometry(0.06, 0.06, 4, 5).toNonIndexed();
        pole.translate(sx, Y + h + 9.6 + 2, sz);
        add(pole, GOLD, 1);
        // lanterns on the corners
        for (const [lx, lz] of [[-4.2, -4.2], [4.2, -4.2], [4.2, 4.2], [-4.2, 4.2]]) {
            const c = Math.cos(rot), s = Math.sin(rot);
            boxAt(sx + lx * c + lz * s, Y + h + 1.2, sz - lx * s + lz * c, 0.35, 0.5, 0.35, rot, [1.0, 0.55, 0.2], 7);
        }
        colliders.push({ x: sx, z: sz, r: 7.5, top: Y + h + 10 });
        // the banner, hung on the pitch-facing side
        const inward = new THREE.Vector3(X - sx, 0, Z - sz).normalize();
        const side = new THREE.Vector3(-inward.z, 0, inward.x);
        banners.push({ top: new THREE.Vector3(sx + inward.x * 4.45, Y + h - 0.8, sz + inward.z * 4.45), n: inward, side, house, w: 3.6, len: 13 + r() * 4, ph: r() * 10 });
        // a pennant from the pole
        const pt = new THREE.Vector3(sx, Y + h + 13, sz);
        banners.push({ top: pt, n: side.clone(), side: inward.clone().negate(), house, w: 1.4, len: 3.2, ph: r() * 10, pennant: true });
    }

    const propGeo = merge(parts);
    const propMat = new THREE.ShaderMaterial({ vertexShader: propVert, fragmentShader: propFrag, uniforms: uniforms() });
    const props = new THREE.Mesh(propGeo, propMat);
    props.frustumCulled = false;

    // --- banner cloth: a grid per banner, displaced along its own normal in the shader
    const bParts = [];
    for (const b of banners) {
        const cols = 4, rows = 14;
        const g = new THREE.PlaneGeometry(1, 1, cols, rows);
        const p = g.attributes.position, uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) {
            const u = uv.getX(i), v = 1 - uv.getY(i);
            uv.setXY(i, u, v);
            let px, py, pz;
            if (b.pennant) {
                // a flag streaming sideways from the pole, tapering to a point
                const taper = 1 - u;
                px = b.top.x + b.side.x * u * b.len * -1; pz = b.top.z + b.side.z * u * b.len * -1;
                py = b.top.y - (v - 0.5) * b.w * taper;
            } else {
                px = b.top.x + b.side.x * (u - 0.5) * b.w; pz = b.top.z + b.side.z * (u - 0.5) * b.w;
                py = b.top.y - v * b.len;
            }
            p.setXYZ(i, px, py, pz);
        }
        if (b.pennant) for (let i = 0; i < p.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
        const geo = g.toNonIndexed();
        geo.deleteAttribute('normal');
        geo.computeVertexNormals();
        bParts.push(paint(geo, { aA: b.house.a, aB: b.house.b, aNrm: [b.n.x, b.n.y, b.n.z], aPh: b.ph }));
    }
    const banGeo = merge(bParts);
    const banMat = new THREE.ShaderMaterial({ vertexShader: banVert, fragmentShader: banFrag, uniforms: uniforms(), side: THREE.DoubleSide });
    const bannerMesh = new THREE.Mesh(banGeo, banMat);
    bannerMesh.frustumCulled = false;

    const group = new THREE.Group();
    group.add(props, bannerMesh);
    return { group, hoops, colliders };
}
