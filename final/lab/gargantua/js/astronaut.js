// Cooper, in NASA's EMU (public-domain model from NASA 3D Resources, by Michael D. Carbajal; cleaned, decimated and
// baked with occlusion by tools/bake-cooper.mjs). The suit is re-dressed in physical materials: a sheened beta-cloth
// outer layer, anodised hardware, a gold visor that reflects whatever world he is in, and the helmet lamps lit.
// It is one rigid scan-like mesh, so the zero-g drift of the limbs is done in the vertex shader: each arm and leg is
// turned a few degrees about its joint with a soft capsule weight. He can come apart: a noise-and-height field eats
// the suit from the boots up with a hot edge, and a cloud of grains sampled from its surface streams off where it
// has gone, the way Lusion's man dissolves down the corridor.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';

const URL_GLB = new URL('../models/cooper.glb', import.meta.url).href;

// shared GLSL: the dissolve field in model space (0 at the crown, 1 at the boots, broken up by two octaves of noise)
const fieldChunk = /* glsl */`
float dnH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float dnN(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dnH(i), dnH(i + vec3(1, 0, 0)), f.x), mix(dnH(i + vec3(0, 1, 0)), dnH(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(dnH(i + vec3(0, 0, 1)), dnH(i + vec3(1, 0, 1)), f.x), mix(dnH(i + vec3(0, 1, 1)), dnH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float dissolveField(vec3 p) {
    float n = dnN(p * 6.0) * 0.62 + dnN(p * 17.0 + 4.1) * 0.38;
    return clamp((0.78 - p.y) / 2.1, 0.0, 1.0) * 0.7 + n * 0.3;
}
`;

// joints in model space (metres about the chest pivot, facing +Z): shoulder, elbow, hand per arm; hip, knee, foot per leg
const ARMS = [
    { s: [0.27, 0.22, 0.03], e: [0.5, -0.03, 0.06], h: [0.36, -0.1, 0.32] },
    { s: [-0.27, 0.22, -0.02], e: [-0.51, -0.04, -0.16], h: [-0.45, -0.1, 0.12] },
];
const LEGS = [
    { s: [0.12, -0.42, 0.06], e: [0.15, -0.85, 0.08], h: [0.17, -1.22, 0.12] },
    { s: [-0.12, -0.42, 0.04], e: [-0.13, -0.85, 0.02], h: [-0.14, -1.22, 0.06] },
];

const limbChunk = /* glsl */`
uniform vec4 uLimbA;   // left arm (x about Z, y about X), right arm (z, w)
uniform vec4 uLimbL;   // left leg (x about X, y about Z), right leg (z, w)
uniform vec3 uJ[12];
float segD(vec3 p, vec3 a, vec3 b) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0, -s, c, 0, 0, 0, 1); }
// weight of limb i: inside a capsule round its two bones, ramping in from the root joint
float limbW(vec3 p, int i, float r) {
    vec3 a = uJ[i * 3], b = uJ[i * 3 + 1], c = uJ[i * 3 + 2];
    float d = min(segD(p, a, b), segD(p, b, c));
    float ramp = smoothstep(0.02, 0.16, length(p - a));
    return (1.0 - smoothstep(r * 0.7, r, d)) * ramp;
}
vec3 bend(vec3 p, inout vec3 n) {
    for (int i = 0; i < 4; i++) {
        float w = limbW(p, i, i < 2 ? 0.17 : 0.2);
        if (w <= 0.0) continue;
        vec2 ang = i == 0 ? uLimbA.xy : i == 1 ? uLimbA.zw : i == 2 ? uLimbL.xy : uLimbL.zw;
        mat3 R = i < 2 ? rotZ(ang.x * w) * rotX(ang.y * w) : rotX(ang.x * w) * rotZ(ang.y * w);
        vec3 piv = uJ[i * 3];
        p = piv + R * (p - piv);
        n = R * n;
    }
    return p;
}
`;

export function createAstronaut({ detail = 1 } = {}) {
    const root = new THREE.Group();
    const tumble = new THREE.Group();
    const body = new THREE.Group();
    root.add(tumble);
    tumble.add(body);

    const joints = [];
    for (const l of [...ARMS, ...LEGS]) for (const k of ['s', 'e', 'h']) joints.push(new THREE.Vector3(...l[k]));
    const shared = {
        uLimbA: { value: new THREE.Vector4() }, uLimbL: { value: new THREE.Vector4() }, uJ: { value: joints },
        uDissolve: { value: 0 }, uEdgeCol: { value: new THREE.Color(0.6, 0.9, 1.0) }, uTime: { value: 0 },
    };

    // every suit material gets the limb drift, the dissolve and the baked occlusion on its indirect light
    const dress = (m) => {
        m.onBeforeCompile = (sh) => {
            Object.assign(sh.uniforms, shared);
            sh.vertexShader = sh.vertexShader
                .replace('#include <common>', `#include <common>\n${limbChunk}\nvarying vec3 vDPos;`)
                .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvec3 bentP = bend(position, objectNormal);\nvDPos = position;')
                .replace('#include <begin_vertex>', 'vec3 transformed = bentP;');
            sh.fragmentShader = sh.fragmentShader
                .replace('#include <common>', `#include <common>\n${fieldChunk}\nuniform float uDissolve;\nuniform vec3 uEdgeCol;\nvarying vec3 vDPos;`)
                .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
                    float dFld = dissolveField(vDPos);
                    float dTh = 1.0 - uDissolve;
                    if (uDissolve > 0.001 && dFld > dTh) discard;`)
                .replace('#include <color_fragment>', '#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n diffuseColor.rgb *= mix(1.0, vColor.r, 0.5);\n#endif')
                .replace('#include <aomap_fragment>', `#include <aomap_fragment>
                    #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
                    reflectedLight.indirectDiffuse *= vColor.r;
                    reflectedLight.indirectSpecular *= mix(1.0, vColor.r, 0.85);
                    #endif`)
                .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                    if (uDissolve > 0.001) totalEmissiveRadiance += uEdgeCol * pow(smoothstep(dTh - 0.045, dTh, dFld), 3.0) * 9.0;`);
        };
        m.customProgramCacheKey = () => 'cooper-' + m.name;
        return m;
    };

    const tex = (t) => { if (t) { t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; } return t; };
    const fabric = dress(new THREE.MeshPhysicalMaterial({ name: 'fabric', color: 0xd9d6cf, roughness: 0.74, sheen: 0.8, sheenRoughness: 0.45, sheenColor: 0xffffff, vertexColors: true, envMapIntensity: 0.9 }));
    const visor = dress(new THREE.MeshPhysicalMaterial({
        name: 'visor', color: 0xffc766, metalness: 1, roughness: 0.035, clearcoat: 1, clearcoatRoughness: 0.02,
        envMapIntensity: 3.2,
    }));
    const hard = dress(new THREE.MeshPhysicalMaterial({ name: 'hard', color: 0x9a9da3, metalness: 0.75, roughness: 0.32, clearcoat: 0.4, vertexColors: true }));
    const red = dress(new THREE.MeshPhysicalMaterial({ name: 'red', color: 0xb02a2c, roughness: 0.6, sheen: 0.4, sheenColor: 0xff8080, vertexColors: true }));
    const lens = dress(new THREE.MeshPhysicalMaterial({ name: 'lens', color: 0x222222, metalness: 0.2, roughness: 0.1, emissive: 0xfff1d8, emissiveIntensity: 1.4, vertexColors: true }));
    const brass = dress(new THREE.MeshPhysicalMaterial({ name: 'brass', color: 0xb8945a, metalness: 1, roughness: 0.28, vertexColors: true }));
    const materials = { fabric, visor, hard, red, lens, brass };

    const stats = { draws: 0, tris: 0 };
    let loaded = false;
    const ready = new Promise((resolve) => {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        loader.load(URL_GLB, (g) => {
            const meshes = [];
            g.scene.updateMatrixWorld(true);
            g.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
            for (const o of meshes) {
                const src = o.material;
                const nm = src.name || '';
                const c = src.color;
                let m;
                if (/justbody_blinn3SG/.test(nm)) m = visor;
                else if (/lambert4SG/.test(nm)) m = red;
                else if (/blinn1SG/.test(nm)) m = lens;
                else if (/blinn3SG|blinn12SG/.test(nm)) m = brass;
                else if (/blinn2SG|lambert3SG|lambert11SG|lambert10SG|initialShading/.test(nm)) m = hard;
                else if (src.map) {
                    m = dress(new THREE.MeshPhysicalMaterial({ name: 'patch-' + nm, map: tex(src.map), roughness: 0.7, sheen: 0.5, sheenColor: 0xffffff, vertexColors: true }));
                } else if (c && Math.min(c.r, c.g, c.b) > 0.6) m = fabric;
                else m = dress(new THREE.MeshPhysicalMaterial({ name: 'misc-' + nm, color: c, roughness: 0.6, vertexColors: true }));
                const mesh = new THREE.Mesh(o.geometry, m);
                o.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
                mesh.castShadow = true; mesh.receiveShadow = true;
                body.add(mesh);
                stats.draws++;
                stats.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
            }
            buildDust(meshes);
            loaded = true;
            resolve();
        }, undefined, (e) => { console.warn('cooper.glb failed to load', e); resolve(); });
    });

    // ------------------------------------------------------------ the dust he sheds
    const dustU = {
        uDissolve: shared.uDissolve, uTime: shared.uTime, uSize: { value: 600 }, uDrift: { value: new THREE.Vector3(0, -0.2, 1) },
        uCol: { value: new THREE.Color(0.75, 0.88, 1.0) }, uWarm: { value: new THREE.Color(1.0, 0.7, 0.4) },
    };
    let dust = null;
    function buildDust(meshes) {
        const N = detail >= 1 ? 26000 : 9000;
        const tris = [];
        let total = 0;
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), t = new THREE.Vector3();
        for (const o of meshes) {
            const g = o.geometry, P = g.attributes.position, I = g.index;
            if (!I) continue;
            for (let i = 0; i < I.count; i += 3) {
                a.fromBufferAttribute(P, I.getX(i)); b.fromBufferAttribute(P, I.getX(i + 1)); c.fromBufferAttribute(P, I.getX(i + 2));
                const ar = t.subVectors(b, a).cross(c.clone().sub(a)).length() * 0.5;
                total += ar;
                tris.push(total, P, I.getX(i), I.getX(i + 1), I.getX(i + 2), o.geometry.attributes.normal);
            }
        }
        const pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), rnd = new Float32Array(N * 4);
        let s = 9183;
        const R = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
        const n = new THREE.Vector3(), n2 = new THREE.Vector3(), n3 = new THREE.Vector3();
        const cnt = tris.length / 6;
        for (let k = 0; k < N; k++) {
            // area-weighted triangle pick by binary search over the running total
            const target = R() * total;
            let lo = 0, hi = cnt - 1;
            while (lo < hi) { const mid = (lo + hi) >> 1; if (tris[mid * 6] < target) lo = mid + 1; else hi = mid; }
            const P = tris[lo * 6 + 1], i0 = tris[lo * 6 + 2], i1 = tris[lo * 6 + 3], i2 = tris[lo * 6 + 4], NN = tris[lo * 6 + 5];
            let u = R(), v = R();
            if (u + v > 1) { u = 1 - u; v = 1 - v; }
            a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1); c.fromBufferAttribute(P, i2);
            t.copy(a).multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v);
            n.fromBufferAttribute(NN, i0); n2.fromBufferAttribute(NN, i1); n3.fromBufferAttribute(NN, i2);
            n.multiplyScalar(1 - u - v).addScaledVector(n2, u).addScaledVector(n3, v).normalize();
            t.toArray(pos, k * 3); n.toArray(nor, k * 3);
            rnd.set([R(), R(), R(), R()], k * 4);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aN', new THREE.BufferAttribute(nor, 3));
        g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
        const m = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: dustU,
            vertexShader: /* glsl */`
                ${fieldChunk}
                uniform float uDissolve, uTime, uSize;
                uniform vec3 uDrift;
                attribute vec3 aN;
                attribute vec4 aRnd;
                varying float vA;
                varying float vW;
                void main() {
                    float fld = dissolveField(position);
                    float th = 1.0 - uDissolve;
                    // grains keep breaking off wherever the suit has gone, and each streams away on its own clock
                    float gone = smoothstep(th - 0.01, th + 0.03, fld) * step(0.001, uDissolve);
                    float life = fract(aRnd.x + uTime * (0.09 + aRnd.y * 0.12));
                    vec3 p = position;
                    vec3 sw = vec3(sin(uTime * 0.7 + aRnd.z * 40.0 + p.y * 5.0), cos(uTime * 0.6 + aRnd.w * 40.0 + p.x * 6.0), sin(uTime * 0.5 + aRnd.x * 40.0 + p.z * 5.0));
                    float L = life * (0.5 + 0.5 * (fld - th + 0.1) * 3.0);
                    p += aN * L * 0.12 + uDrift * L * (0.8 + aRnd.w * 2.4) + sw * L * 0.22;
                    // and a fizz of sparks right at the front
                    float front = 1.0 - smoothstep(0.0, 0.03, abs(fld - th));
                    vA = gone * (1.0 - life) * smoothstep(0.0, 0.06, life) + front * step(0.001, uDissolve) * 0.6 * step(0.7, aRnd.z);
                    vW = aRnd.w;
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    gl_Position = projectionMatrix * mv;
                    gl_PointSize = clamp(uSize * (0.004 + 0.008 * aRnd.y * aRnd.y) / -mv.z, 1.0, 9.0);
                    if (vA < 0.004) gl_PointSize = 0.0;
                }`,
            fragmentShader: /* glsl */`
                uniform vec3 uCol, uWarm;
                varying float vA;
                varying float vW;
                void main() {
                    vec2 c = gl_PointCoord - 0.5;
                    float a = exp(-dot(c, c) * 14.0) * vA;
                    gl_FragColor = vec4(mix(uCol, uWarm, step(0.8, vW)) * a * 2.2, a);
                }`,
        });
        dust = new THREE.Points(g, m);
        dust.frustumCulled = false;
        dust.renderOrder = 5;
        body.add(dust);
    }

    // ------------------------------------------------------------ motion: a slow zero-g float, a spring to the cursor
    const target = new THREE.Vector2(), lean = new THREE.Vector2(), leanV = new THREE.Vector2();
    const qInv = new THREE.Quaternion(), wDrift = new THREE.Vector3(0, -0.25, 1);
    function update(dt, time, pointer, { tumbleAmt = 1, spin = 0, dissolve = 0, drift = null, size = 600 } = {}) {
        target.set(-pointer.y * 0.45, pointer.x * 0.75);
        const k = 10, c = 2 * Math.sqrt(k) * 0.85;
        const h = Math.min(dt, 1 / 30);
        leanV.x += (k * (target.x - lean.x) - c * leanV.x) * h;
        leanV.y += (k * (target.y - lean.y) - c * leanV.y) * h;
        lean.addScaledVector(leanV, h);
        tumble.rotation.set(
            (0.18 + Math.sin(time * 0.11) * 0.2) * tumbleAmt + lean.x + spin * 0.7,
            (-0.5 + Math.sin(time * 0.07) * 0.6) * tumbleAmt + lean.y + spin,
            (-0.32 + Math.sin(time * 0.09 + 1.3) * 0.16) * tumbleAmt + spin * 0.4,
        );
        body.position.y = Math.sin(time * 0.37) * 0.04;
        // limbs drift on their own slow clocks, the arms a little looser than the legs
        shared.uLimbA.value.set(0.1 + Math.sin(time * 0.5 + 1) * 0.08, Math.sin(time * 0.33 + 0.4) * 0.12, -0.08 + Math.sin(time * 0.47 - 1) * 0.08, Math.sin(time * 0.29 + 2.1) * 0.12);
        shared.uLimbL.value.set(Math.sin(time * 0.31 + 0.7) * 0.1 - 0.05, Math.sin(time * 0.23) * 0.04, Math.sin(time * 0.27 + 2.3) * 0.12 + 0.06, Math.sin(time * 0.21 + 1) * 0.04);
        shared.uDissolve.value = dissolve;
        shared.uTime.value = time;
        dustU.uSize.value = size;
        if (dust) {
            dust.visible = dissolve > 0.001;
            root.updateMatrixWorld(true);
            body.getWorldQuaternion(qInv).invert();
            dustU.uDrift.value.copy(drift || wDrift).applyQuaternion(qInv);
        }
    }

    return { root, body, update, visor, materials, ready, stats, get loaded() { return loaded; } };
}
