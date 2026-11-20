// The Endurance, from primitives. Ring of twelve modules (radius 30 m, ring plane XZ, spin axis Y) joined by
// pressurised connectors, four spokes to a central hub with docking adapters fore and aft, radiators off the hub,
// and a Ranger docked dorsal-down on the forward port. Parts are baked into one merged mesh per material.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { panelTextures, foilTextures, gridTexture } from './textures.js';

const RING_R = 30;
const TAU = Math.PI * 2;

// boxes get texture density from their real size, so a 12 m plate and a 0.5 m block share one panel scale
function box(w, h, d, scale = 6) {
    scale *= 2.2;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * dims[f][0] / scale + f * 0.37, uv.getY(i) * dims[f][1] / scale + f * 0.11);
    }
    return g;
}
function cyl(rt, rb, h, seg = 24, open = false, scaleU = 6) {
    scaleU *= 2.2;
    const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (TAU * Math.max(rt, rb)) / scaleU, uv.getY(i) * h / scaleU);
    return g;
}

class Builder {
    constructor() { this.parts = {}; this.stack = [new THREE.Matrix4()]; }
    push(m) { this.stack.push(this.stack[this.stack.length - 1].clone().multiply(m)); }
    pop() { this.stack.pop(); }
    add(key, geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
        const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
        let g = geo.index ? geo.toNonIndexed() : geo.clone();
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        g.applyMatrix4(this.stack[this.stack.length - 1].clone().multiply(m));
        (this.parts[key] ||= []).push(g);
    }
    build(materials) {
        const group = new THREE.Group();
        for (const [key, list] of Object.entries(this.parts)) {
            const mesh = new THREE.Mesh(mergeGeometries(list, false), materials[key]);
            mesh.castShadow = mesh.receiveShadow = true;
            group.add(mesh);
        }
        return group;
    }
}
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const RY = (a) => new THREE.Matrix4().makeRotationY(a);

function rangerOutline(scale = 1) {
    const pts = [[0, 9.2], [1.3, 6.4], [2.3, 2.2], [3.0, -1.6], [5.6, -4.6], [5.6, -6.4], [3.4, -6.6], [2.7, -8.8], [-2.7, -8.8], [-3.4, -6.6], [-5.6, -6.4], [-5.6, -4.6], [-3.0, -1.6], [-2.3, 2.2], [-1.3, 6.4]];
    const s = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? s.lineTo(x * scale, y * scale) : s.moveTo(x * scale, y * scale)));
    s.closePath();
    return s;
}

function buildRanger(B) {
    // built lying in XZ, nose toward +Z, belly toward -Y; caller places it
    const hull = new THREE.ExtrudeGeometry(rangerOutline(1), { depth: 1.1, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.32, bevelSegments: 3, curveSegments: 4 });
    const uv = hull.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 6);
    B.add('white', hull, [0, 0.55, 0], [Math.PI / 2, 0, 0], [1, 1, 1]);
    const shield = new THREE.ExtrudeGeometry(rangerOutline(1.015), { depth: 0.12, bevelEnabled: false });
    const su = shield.attributes.uv; for (let i = 0; i < su.count; i++) su.setXY(i, su.getX(i) / 4, su.getY(i) / 4);
    B.add('tile', shield, [0, -0.9, 0], [Math.PI / 2, 0, 0]);
    // dorsal spine and canopy
    const spine = new THREE.Shape();
    [[0, 7.4], [1.1, 4.0], [1.5, -7.6], [-1.5, -7.6], [-1.1, 4.0]].forEach(([x, y], i) => (i ? spine.lineTo(x, y) : spine.moveTo(x, y)));
    const sp = new THREE.ExtrudeGeometry(spine, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.25, bevelSegments: 3 });
    const spu = sp.attributes.uv; for (let i = 0; i < spu.count; i++) spu.setXY(i, spu.getX(i) / 6, spu.getY(i) / 6);
    B.add('white', sp, [0, 1.8, 0], [Math.PI / 2, 0, 0]);
    B.add('glass', box(1.3, 0.35, 1.6, 2), [0, 1.95, 5.2], [-0.32, 0, 0]);
    // aft engines and wing-root intakes
    for (const sx of [-1.6, 1.6]) {
        B.add('metal', cyl(0.55, 0.7, 1.4, 20, true, 3), [sx, 0.2, -9.4], [Math.PI / 2, 0, 0]);
        B.add('dark', cyl(0.42, 0.42, 0.3, 20, false, 3), [sx, 0.2, -8.85], [Math.PI / 2, 0, 0]);
    }
    B.add('foil', box(3.6, 0.1, 3.2, 3), [0, 0.97, -4.6]);
    B.add('dark', box(0.25, 0.9, 1.6, 2), [4.6, 0.3, -5.5]);
    B.add('dark', box(0.25, 0.9, 1.6, 2), [-4.6, 0.3, -5.5]);
}

function buildModule(B, k) {
    const type = k % 3;
    // module frame: x radial (out), y along spin axis, z tangential
    const W = type === 0 ? 5.8 : 5.0, H = type === 0 ? 4.6 : 4.0, L = 13.4;
    B.add('white', box(W, H, L), [0, 0, 0]);
    // chamfered outer edges
    for (const sy of [-1, 1]) B.add('white', box(0.9, 0.9, L - 0.3), [W / 2 - 0.15, sy * (H / 2 - 0.15), 0], [0, 0, Math.PI / 4]);
    if (type === 0) {
        // propulsion module: MLI blankets top and bottom, a pair of bells firing aft (-Y)
        B.add('foil', box(W - 0.6, 0.14, L - 1.6, 4), [-0.2, H / 2 + 0.07, 0]);
        B.add('foil', box(W - 0.6, 0.14, L - 1.6, 4), [-0.2, -H / 2 - 0.07, 0]);
        for (const z of [-2.6, 2.6]) {
            B.add('metal', cyl(0.7, 0.9, 0.6, 24), [0.2, -H / 2 - 0.4, z]);
            B.add('bell', cyl(0.5, 1.15, 2.1, 28, true, 3), [0.2, -H / 2 - 1.75, z]);
        }
        B.add('dark', box(0.12, 2.4, 6.5, 3), [W / 2 + 0.06, 0, 0]);
    } else if (type === 1) {
        // habitat: a slit of portholes on the outer face, RCS quads at the corners
        B.add('glass', box(0.1, 0.42, 7.4, 2), [W / 2 + 0.03, 0.75, 0]);
        B.add('foil', box(0.12, 1.2, 4.0, 3), [W / 2 + 0.06, -0.8, -2.8]);
        for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            B.add('metal', box(0.6, 0.6, 0.6, 1), [W / 2 - 0.4, sy * (H / 2 + 0.3), sz * (L / 2 - 0.6)]);
            B.add('dark', cyl(0.12, 0.2, 0.35, 10, false, 1), [W / 2 - 0.4, sy * (H / 2 + 0.75), sz * (L / 2 - 0.6)]);
        }
    } else {
        // laboratory / storage: radiator plate on the outer face, antenna mast
        B.add('radiator', box(0.14, H - 0.7, L - 1.4, 3), [W / 2 + 0.07, 0, 0]);
        B.add('metal', cyl(0.06, 0.06, 3.2, 8), [0.6, H / 2 + 1.6, 3.8]);
        B.add('metal', cyl(0.35, 0.02, 0.25, 16), [0.6, H / 2 + 3.2, 3.8]);
        B.add('foil', box(W - 1.0, 0.12, 3.0, 3), [-0.3, H / 2 + 0.06, -2.4]);
    }
    // inner face: the corridor hatch that faces the hub, framed
    B.add('metal', box(0.12, 2.0, 1.8, 2), [-W / 2 - 0.04, 0, 0]);
    B.add('white', box(0.16, 1.5, 1.3, 2), [-W / 2 - 0.06, 0, 0]);
    // handrails along the top edges, on standoffs
    for (const sx of [-1, 1]) {
        const x = sx * (W / 2 - 0.5);
        B.add('metal', cyl(0.07, 0.07, L - 1.2, 8, false, 2), [x, H / 2 + 0.32, 0], [Math.PI / 2, 0, 0]);
        for (let i = -2; i <= 2; i++) B.add('metal', box(0.08, 0.32, 0.08, 1), [x, H / 2 + 0.16, i * (L - 1.6) / 4]);
    }
    // greebles: equipment boxes, vents and blanket patches, seeded per module
    const R = rnd(k * 97 + 13);
    for (const sy of [-1, 1]) {
        const n = 3 + ((R() * 4) | 0);
        for (let i = 0; i < n; i++) {
            const w = 0.5 + R() * 1.4, d = 0.5 + R() * 2.2, h = 0.15 + R() * 0.5;
            const key = R() < 0.25 ? 'foil' : R() < 0.55 ? 'metal' : 'white';
            B.add(key, box(w, h, d, 2), [(R() - 0.5) * (W - w - 0.6), sy * (H / 2 + h / 2), (R() - 0.5) * (L - d - 1.0)]);
        }
    }
    // raised side plates on the end faces
    for (const sz of [-1, 1]) B.add('white', box(W - 0.8, H - 0.8, 0.14, 3), [0, 0, sz * (L / 2 + 0.07)]);
}

function rnd(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

let TEX = null;
function textures() {
    return TEX ||= {
        panel: panelTextures(7),
        foil: foilTextures(3),
        rad: gridTexture(5, 512, 24, '#1a1c20', '#30343a', 14),
        tile: gridTexture(9, 512, 20, '#0f1012', '#1d1f22', 26),
    };
}
const stretchUniforms = () => ({ uStretch: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uFade: { value: 1 }, uRed: { value: 0 } });

function makeMaterials(shipU) {
    const { panel, foil, rad, tile } = textures();
    const hook = (m) => {
        m.onBeforeCompile = (sh) => {
            Object.assign(sh.uniforms, shipU);
            sh.vertexShader = 'uniform float uStretch;\nuniform vec3 uCenter;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            {
                vec3 q = mvPosition.xyz - uCenter;
                vec3 ax = normalize(vec3(0.0, 0.0, 1e-3) - uCenter);
                float along = dot(q, ax);
                vec3 perp = q - ax * along;
                // spaghettified toward the hole: drawn out along the line of fall, pinched across it
                mvPosition.xyz = uCenter + ax * along * (1.0 + uStretch * 9.0) + ax * uStretch * uStretch * length(uCenter) * 0.6 + perp / (1.0 + uStretch * 2.5);
                gl_Position = projectionMatrix * mvPosition;
            }`);
            sh.fragmentShader = 'uniform float uFade;\nuniform float uRed;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
            gl_FragColor.rgb *= mix(vec3(1.0), vec3(1.0, 0.32, 0.12), uRed) * uFade;`);
        };
        return m;
    };
    const mats = {
        white: hook(new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: panel.map, bumpMap: panel.bump, bumpScale: 0.7, roughness: 0.5, metalness: 0.0, clearcoat: 0.2, clearcoatRoughness: 0.5 })),
        foil: hook(new THREE.MeshStandardMaterial({ color: 0xffffff, map: foil.map, bumpMap: foil.bump, bumpScale: 0.45, roughness: 0.28, metalness: 1.0 })),
        metal: hook(new THREE.MeshStandardMaterial({ color: 0x6d6f73, roughness: 0.38, metalness: 0.9 })),
        dark: hook(new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.5, metalness: 0.6 })),
        bell: hook(new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.28, metalness: 1.0, side: THREE.DoubleSide })),
        radiator: hook(new THREE.MeshStandardMaterial({ color: 0xffffff, map: rad, roughness: 0.34, metalness: 0.5 })),
        tile: hook(new THREE.MeshStandardMaterial({ color: 0xffffff, map: tile, roughness: 0.75, metalness: 0.0 })),
        glass: hook(new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.06, metalness: 0.2, clearcoat: 1 })),
    };
    return mats;
}

// The Ranger on its own: same hull and materials as when docked, plus two engine plumes and the glow they throw on
// the tail. Built nose +Z, belly -Y. Throttle 0..1 drives the plume, the light and the flicker.
export function createRanger({ shadows = true } = {}) {
    const shipU = stretchUniforms();
    const mats = makeMaterials(shipU);
    const B = new Builder();
    buildRanger(B);
    const hull = B.build(mats);
    hull.traverse((o) => { if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = shadows; } });
    const root = new THREE.Group();
    root.add(hull);

    const plumeU = { uThrottle: { value: 0 }, uTime: { value: 0 }, uFade: shipU.uFade };
    const plumeMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: plumeU,
        vertexShader: /* glsl */`
            varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */`
            uniform float uThrottle, uTime, uFade; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            float h(float n) { return fract(sin(n) * 43758.5453); }
            void main() {
                float along = 1.0 - vUv.y;                       // 0 at the nozzle
                float rim = pow(1.0 - abs(dot(vN, vV)), 1.6);
                float core = 1.0 - rim;
                // shock diamonds: bright knots at regular intervals that slide with throttle
                float knots = 0.6 + 0.4 * pow(0.5 + 0.5 * cos(along * 38.0 - uTime * 30.0), 6.0);
                float flick = 0.85 + 0.15 * h(floor(uTime * 40.0));
                float fade = pow(1.0 - along, 1.6 + (1.0 - uThrottle) * 3.0);
                vec3 hot = mix(vec3(1.0, 0.55, 0.22), vec3(0.75, 0.85, 1.0), core * (1.0 - along));
                float a = fade * core * knots * flick * uThrottle * uFade;
                gl_FragColor = vec4(hot * a * 3.2, a);
            }`,
    });
    const plumes = [];
    for (const sx of [-1.6, 1.6]) {
        const g = new THREE.ConeGeometry(0.5, 7, 24, 1, true);
        g.translate(0, -3.5, 0);
        const m = new THREE.Mesh(g, plumeMat);
        m.position.set(sx, 0.2, -10.1);
        m.rotation.x = -Math.PI / 2;
        m.renderOrder = 5;
        root.add(m); plumes.push(m);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0xffc894, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        disc.position.set(sx, 0.2, -9.0); disc.rotation.y = Math.PI;
        root.add(disc); plumes.push(disc);
    }
    const glow = new THREE.PointLight(0xffa860, 0, 28, 2);
    glow.position.set(0, 0.6, -11.5);
    root.add(glow);

    let throttle = 0;
    function update(dt, time, want) {
        throttle += (want - throttle) * Math.min(1, dt * (want > throttle ? 9 : 4));
        plumeU.uThrottle.value = throttle;
        plumeU.uTime.value = time;
        for (const p of plumes) { p.visible = throttle > 0.01; if (p.isMesh && p.geometry.type === 'ConeGeometry') p.scale.set(0.8 + throttle * 0.4, 0.4 + throttle * 0.9, 0.8 + throttle * 0.4); }
        plumes.forEach((p) => { if (p.material.isMeshBasicMaterial) p.material.opacity = throttle * shipU.uFade.value; });
        glow.intensity = throttle * 160 * (0.9 + 0.1 * Math.sin(time * 61)) * shipU.uFade.value;
        return throttle;
    }
    return { root, shipU, materials: mats, update, get throttle() { return throttle; } };
}

export function createEndurance({ shadows = true } = {}) {
    const shipU = stretchUniforms();
    const mats = makeMaterials(shipU);

    const B = new Builder();
    // ring
    for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        B.push(RY(-a).multiply(T(RING_R, 0, 0)));
        buildModule(B, k);
        B.pop();
        // connector to the next module, at the half step
        const c = a + TAU / 24;
        B.push(RY(-c).multiply(T(RING_R, 0, 0)));
        B.add('metal', cyl(1.45, 1.45, 3.4, 28), [0, 0, 0], [Math.PI / 2, 0, 0]);
        for (const z of [-1.1, 1.1]) B.add('dark', new THREE.TorusGeometry(1.55, 0.16, 8, 32), [0, 0, z]);
        B.add('foil', cyl(1.5, 1.5, 0.9, 28, false, 3), [0, 0, 0], [Math.PI / 2, 0, 0]);
        B.pop();
    }
    // spokes: four, each a main pressurised tube and a lighter strut, with braces
    for (let s = 0; s < 4; s++) {
        const a = (s / 4) * TAU + TAU / 24;
        B.push(RY(-a));
        const r0 = 3.9, r1 = RING_R - 1.1, len = r1 - r0, mid = (r0 + r1) / 2;
        B.add('white', cyl(0.62, 0.62, len, 18), [mid, 0, 0], [0, 0, Math.PI / 2]);
        B.add('metal', cyl(0.18, 0.18, len, 8), [mid, 1.25, 0], [0, 0, Math.PI / 2]);
        B.add('metal', cyl(0.18, 0.18, len, 8), [mid, -1.25, 0], [0, 0, Math.PI / 2]);
        for (let i = 0; i <= 8; i++) {
            const x = r0 + (i / 8) * len;
            B.add('dark', box(0.14, 2.5, 0.14, 1), [x, 0, 0]);
            if (i < 8) B.add('dark', box(0.1, 2.9, 0.1, 1), [x + len / 16, 0, 0], [0, 0, Math.atan2(len / 8, 2.5) * (i % 2 ? 1 : -1)]);
        }
        B.add('dark', new THREE.TorusGeometry(0.72, 0.1, 8, 20), [r1 - 0.6, 0, 0], [0, Math.PI / 2, 0]);
        B.pop();
    }
    // hub
    B.add('white', cyl(3.6, 3.6, 8.4, 40), [0, 0, 0]);
    B.add('foil', cyl(3.68, 3.68, 2.2, 40, false, 4), [0, 0.6, 0]);
    for (const y of [-4.2, -1.5, 4.2]) B.add('dark', new THREE.TorusGeometry(3.66, 0.14, 8, 48), [0, y, 0], [Math.PI / 2, 0, 0]);
    B.add('white', cyl(2.2, 3.6, 1.4, 40), [0, 4.9, 0]);
    B.add('metal', cyl(1.5, 1.5, 1.8, 28), [0, 6.4, 0]);
    B.add('dark', new THREE.TorusGeometry(1.6, 0.18, 8, 28), [0, 7.1, 0], [Math.PI / 2, 0, 0]);
    B.add('white', cyl(3.6, 2.4, 1.4, 40), [0, -4.9, 0]);
    B.add('metal', cyl(1.4, 1.4, 1.6, 28), [0, -6.3, 0]);
    // aft dish
    B.add('white', new THREE.SphereGeometry(2.3, 32, 12, 0, TAU, Math.PI * 0.62, Math.PI * 0.38), [0, -5.6, 0]);
    B.add('metal', cyl(0.08, 0.08, 2.2, 8), [0, -7.6, 0]);
    // radiators: two thin wings off the hub, edge-on to the ring
    for (const sx of [-1, 1]) {
        B.add('metal', cyl(0.14, 0.14, 2.4, 8), [sx * 4.8, -2.6, 0], [0, 0, Math.PI / 2]);
        B.add('radiator', box(7.5, 0.12, 2.6, 3), [sx * 9.6, -2.6, 0]);
    }
    const ship = B.build(mats);
    ship.traverse((o) => { if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = shadows; } });

    // RCS puffs: a handful of brief, soft jets from the module corners
    const N = 32;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), age = new Float32Array(N).fill(9), vel = new Float32Array(N * 3);
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('aAge', new THREE.BufferAttribute(age, 1));
    const pMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uScale: { value: 400 }, uFade: shipU.uFade },
        vertexShader: /* glsl */`
            attribute float aAge; varying float vA; uniform float uScale;
            void main() {
                vA = aAge;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = uScale * (0.5 + aAge * 3.0) / -mv.z;
            }`,
        fragmentShader: /* glsl */`
            varying float vA; uniform float uFade;
            void main() {
                if (vA > 1.0) discard;
                vec2 c = gl_PointCoord - 0.5;
                float a = exp(-dot(c, c) * 14.0) * (1.0 - vA) * (1.0 - vA);
                gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * a * 0.9 * uFade, a);
            }`,
    });
    const puffs = new THREE.Points(pGeo, pMat);
    puffs.frustumCulled = false;

    const root = new THREE.Group();
    const spinner = new THREE.Group();
    spinner.add(ship, puffs);
    root.add(spinner);
    // the Ranger rides here when docked: belly-down on the forward port, nose across the ring
    const dock = new THREE.Group();
    dock.position.set(0, 8.35, 0); dock.rotation.y = 0.35;
    spinner.add(dock);

    const sites = [];
    for (let k = 1; k < 12; k += 3) {
        const a = (k / 12) * TAU;
        for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            const local = new THREE.Vector3(2.1, sy * 2.75, sz * 4.9).applyMatrix4(RY(-a).multiply(T(RING_R, 0, 0)));
            const dir = new THREE.Vector3(0, sy, 0);
            sites.push([local, dir]);
        }
    }
    let nextPuff = 1.5, slot = 0;
    function update(dt, time, busy = 0) {
        spinner.rotation.y += dt * 0.045;
        nextPuff -= dt;
        if (nextPuff <= 0) {
            nextPuff = (0.9 + Math.random() * 2.6) / (1 + busy * 6);
            const [p, d] = sites[(Math.random() * sites.length) | 0];
            const burst = 2 + ((Math.random() * 3) | 0);
            for (let b = 0; b < burst; b++) {
                const i = slot++ % N;
                pos.set([p.x, p.y, p.z], i * 3);
                vel.set([d.x * 3 + (Math.random() - 0.5) * 1.2, d.y * (6 + Math.random() * 4), d.z * 3 + (Math.random() - 0.5) * 1.2], i * 3);
                age[i] = -b * 0.05;
            }
        }
        for (let i = 0; i < N; i++) {
            if (age[i] > 1) continue;
            age[i] += dt * 1.6;
            if (age[i] < 0) continue;
            pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        }
        pGeo.attributes.position.needsUpdate = true;
        pGeo.attributes.aAge.needsUpdate = true;
    }

    return { root, spinner, dock, shipU, materials: mats, update, puffMat: pMat };
}
