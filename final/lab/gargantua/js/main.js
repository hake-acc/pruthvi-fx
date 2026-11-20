// Gargantua: a place you stay in. Nothing here ends. You orbit the hole with the Endurance, take the Ranger out and
// fly it, or drift free with the cursor as a second, invisible mass bending the starlight behind it. Fall far enough
// and the horizon takes you: Cooper tumbles toward the shadow with the disk in his visor, the light streaks, goes
// black, goes white, and he is in the tesseract. Murph's watch spells STAY, the place folds shut, and "they" put you
// back in orbit, one loop later, the Earth clock having run on without you.
//
// Two worlds share one post chain. World 1 is the hole (units of r_s, raymarched) and the ships (metres, rasterised),
// sharing camera rotation; ship-to-ship offsets convert at K metres per r_s. World 2 is the tesseract. The hole also
// lights the ships and the falling astronaut: every few frames it is raymarched into a small equirect around the lens
// and prefiltered (PMREM) as their environment, so the gold visor reflects the actual disk.
import * as THREE from 'three';
import { createBlackHole } from './blackhole.js';
import { Post } from './post.js';
import { createEndurance, createRanger } from './endurance.js';
import { createAstronaut } from './astronaut.js';
import { createTesseract, createShards } from './tesseract.js';
import { LusionTesseract } from './lusion_tunnel.js';
import { createWatch } from './watch.js';
import { Sound } from './audio.js';

const Q = new URLSearchParams(location.search);
const SHOT = Q.get('shot');
const FIXED_T = Q.has('t') ? parseFloat(Q.get('t')) : null;
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ helpers
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => (SHOT ? b : a + (b - a) * (1 - Math.exp(-l * dt)));
const win = (p, a, b, c, d) => smooth(a, b, p) * (1 - smooth(c, d, p));
const D2R = Math.PI / 180;
const V3 = () => new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
// a camera-style orientation looking along f (its -Z on f), world up kept
function frameQ(f, out, up = UP) {
    _m4.lookAt(ZERO, f, Math.abs(f.dot(up)) > 0.995 ? new THREE.Vector3(1, 0, 0) : up);
    return out.setFromRotationMatrix(_m4);
}
const pad = (n, w = 2) => String(Math.floor(n)).padStart(w, '0');
// the tesseract's lens and grade (?tune=key:value,... overrides, for frame work)
const TUNE = { apCorr: 0.8, bloom: 0.85, exposure: 1.0, halo: 1, anam: 0.25 };
for (const kv of (Q.get('tune') || '').split(',')) { const [k, v] = kv.split(':'); if (k in TUNE) TUNE[k] = parseFloat(v); }

// ------------------------------------------------------------------ renderer + quality
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!SHOT, stencil: false });
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.NoToneMapping;
const gl = renderer.getContext();

const TIERS = [
    { name: 'floor', steps: 56, stepK: 0.15, bh: 0.5, dpr: 0.6, samples: 0, levels: 4, shadow: 512, dof: 0, envEvery: 120, envSteps: 48 },
    { name: 'low', steps: 90, stepK: 0.115, bh: 0.5, dpr: 1.0, samples: 0, levels: 5, shadow: 1024, dof: 0, envEvery: 40, envSteps: 64 },
    { name: 'mid', steps: 160, stepK: 0.085, bh: 0.55, dpr: 1.25, samples: 2, levels: 6, shadow: 1024, dof: 20, envEvery: 18, envSteps: 96 },
    { name: 'high', steps: 260, stepK: 0.062, bh: 0.75, dpr: 1.75, samples: 4, levels: 6, shadow: 2048, dof: 36, envEvery: 8, envSteps: 140 },
];
const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let gpuName = '';
try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpuName = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { /* hidden */ }
function guessTier() {
    if (Q.has('q')) return clamp(parseInt(Q.get('q'), 10) || 0, 0, 3);
    if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(gpuName)) return 0;
    if (mobile) return /Apple GPU|Adreno \(TM\) (7[3-9]|8)\d\d/i.test(gpuName) ? 2 : 1;
    if (/Apple M\d|RTX|Radeon RX|Radeon Pro|GeForce GTX 1[06-9]|Arc/i.test(gpuName)) return 3;
    if (/Intel|UHD|Iris|Radeon\(TM\) Graphics|Vega|Mali|Adreno/i.test(gpuName)) return 2;
    return 3;
}
let tier = guessTier();
const maxTier = tier;
let dyn = 1;
renderer.shadowMap.enabled = !mobile && tier > 0;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const post = new Post(renderer);
let W = 0, H = 0, aspect = 1;
function resize() {
    const T = TIERS[tier];
    const dpr = Math.min(window.devicePixelRatio || 1, T.dpr);
    W = Math.max(2, Math.round(window.innerWidth * dpr));
    H = Math.max(2, Math.round(window.innerHeight * dpr));
    aspect = W / H;
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    canvas.style.width = '100vw'; canvas.style.height = '100vh';
    post.setSize(W, H, T.bh * dyn, T.levels, T.samples, T.dof);
    for (const c of [bhCam, shipCam, tessCam]) { c.aspect = aspect; c.updateProjectionMatrix(); }
}

// ------------------------------------------------------------------ world 1: the hole (units of r_s) and the ships (metres)
const bh = createBlackHole();
const bhCam = new THREE.PerspectiveCamera(32, 1, 0.01, 10);
const shipCam = new THREE.PerspectiveCamera(32, 1, 1, 30000);
const shipScene = new THREE.Scene();

const bgMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { t: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.0); }',
});
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bg.frustumCulled = false; bg.renderOrder = -10;
shipScene.add(bg);

const shadows = renderer.shadowMap.enabled;
const endurance = createEndurance({ shadows });
shipScene.add(endurance.root);
const ranger = createRanger({ shadows });
endurance.dock.add(ranger.root);
const cooper = createAstronaut({ detail: tier >= 2 ? 1 : 0 });

// lit by the disk: a warm key from the hole, a broader glow off the disk's edge, a breath of starlight
const key = new THREE.DirectionalLight(0xffd2a0, 4.2);
key.castShadow = shadows;
key.shadow.mapSize.set(TIERS[tier].shadow, TIERS[tier].shadow);
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.06;
const diskGlow = new THREE.DirectionalLight(0xff9c55, 1.3);
const starFill = new THREE.HemisphereLight(0x8a96aa, 0x3a2414, 0.22);
const archFill = new THREE.DirectionalLight(0xffe6c8, 0.9);
shipScene.add(key, key.target, diskGlow, diskGlow.target, starFill, archFill, archFill.target);
function shadowBox(s) {
    const c = key.shadow.camera;
    if (c.right === s) return;
    Object.assign(c, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: s * 8 + 40 });
    c.updateProjectionMatrix();
    key.shadow.normalBias = s < 5 ? 0.012 : 0.06;
    key.shadow.bias = s < 5 ? -0.0002 : -0.0004;
}
shadowBox(48);

// image-based light from the hole itself: an equirect raymarched around the lens, prefiltered
const pmrem = new THREE.PMREMGenerator(renderer);
const envRT = new THREE.WebGLRenderTarget(256, 128, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
let envShipRT = null;
function updateShipEnv(P) {
    const U = bh.uniforms;
    const steps = U.uSteps.value, k = U.uStepK.value;
    U.uEquirect.value = 1; U.uCamPos.value.copy(P); U.uSteps.value = TIERS[tier].envSteps; U.uStepK.value = 0.1;
    renderer.setRenderTarget(envRT);
    renderer.render(bh.scene, bh.camera);
    U.uEquirect.value = 0; U.uSteps.value = steps; U.uStepK.value = k;
    envShipRT = pmrem.fromEquirectangular(envRT.texture, envShipRT);
    shipScene.environment = envShipRT.texture;
}
shipScene.environmentIntensity = 1.0;

// ------------------------------------------------------------------ world 2: the tesseract
const tessScene = new THREE.Scene();
const tessCam = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
const tess = createTesseract({ slots: tier <= 1 ? 10 : 12, density: tier <= 0 ? 0.55 : tier === 1 ? 0.7 : 1 });
if (tier <= 1) tess.uniforms.uFogDensity.value = 0.032;
tess.mesh.visible = false;
tessScene.add(tess.root);
const shards = createShards({ count: tier <= 1 ? 60 : tier === 2 ? 110 : 150 });
shards.root.visible = false;
tessScene.add(shards.root);
const watch = createWatch();
watch.root.visible = false;
tessScene.add(watch.root);

// Lusion.co authentic multi-stage Black Hole environment
const lusionTess = new LusionTesseract();
lusionTess.init().catch(err => console.error('Lusion init error:', err));
tessScene.add(lusionTess.root);
const tKey = new THREE.DirectionalLight(0xf6f2ea, 3.2);
tKey.castShadow = shadows;
tKey.shadow.mapSize.set(TIERS[tier].shadow, TIERS[tier].shadow);
Object.assign(tKey.shadow.camera, { left: -1.7, right: 1.7, top: 1.7, bottom: -1.7, near: 0.5, far: 14 });
tKey.shadow.camera.updateProjectionMatrix();
tKey.shadow.bias = -0.0006; tKey.shadow.normalBias = 0.03;
const tRim = new THREE.DirectionalLight(0xffa458, 7.5);
const tRim2 = new THREE.DirectionalLight(0x8fd8ff, 2.4);
const tHemi = new THREE.HemisphereLight(0x30343a, 0x060708, 0.2);
tessScene.add(tKey, tKey.target, tRim, tRim.target, tRim2, tRim2.target, tHemi);
// two prefiltered environments, built once: the corridor itself seen from its axis with a softbox overhead (what the
// visor and the suit pick up while he falls), and a black studio of softboxes for the void, where the glass lives
function softboxes() {
    const g = new THREE.Group();
    const box = (w, h, col, p, look) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
        m.position.set(...p); m.lookAt(...look); g.add(m);
    };
    box(9, 5, new THREE.Color(6, 6, 5.7), [-4, 6, 5], [0, 0, 0]);
    box(0.6, 7, new THREE.Color(9, 4.2, 1.6), [6, 1, -5], [0, 0, 0]);
    box(0.4, 6, new THREE.Color(1.2, 3.6, 5), [-6, -1, -4], [0, 0, 0]);
    box(10, 0.25, new THREE.Color(3, 3, 3), [0, -5, 2], [0, 0, 0]);
    for (let i = 0; i < 18; i++) {
        const a = i * 2.39996, y = ((i * 0.618) % 1) * 2 - 1, r = Math.sqrt(1 - y * y);
        const c = i % 3 === 0 ? new THREE.Color(1.5, 4, 5) : new THREE.Color(5, 5, 5);
        box(0.25 + (i % 4) * 0.2, 0.08 + (i % 3) * 0.1, c, [Math.cos(a) * r * 12, y * 12, Math.sin(a) * r * 12], [0, 0, 0]);
    }
    return g;
}
const studioScene = new THREE.Scene();
studioScene.background = new THREE.Color(0.025, 0.028, 0.034);
studioScene.add(softboxes());
let envCorr = null, envStudio = null;
function buildTessEnvs() {
    if (envCorr) return;
    envStudio = pmrem.fromScene(studioScene, 0.0, 0.1, 100);
    const vis = [cooper.root.visible, watch.root.visible, dust.visible, shards.root.visible];
    cooper.root.visible = false; watch.root.visible = false; dust.visible = false; shards.root.visible = false;
    const sb = softboxes();
    sb.scale.setScalar(0.4);
    tessScene.add(sb);
    const z = tessCam.position.z;
    tess.follow(new THREE.Vector3(0, 0, 0), 0);
    tess.uniforms.uOpen.value = 0;
    tess.mesh.visible = true;
    envCorr = pmrem.fromScene(tessScene, 0.0, 0.1, 200);
    sb.removeFromParent();
    tess.follow(new THREE.Vector3(0, 0, z), time);
    [cooper.root.visible, watch.root.visible, dust.visible, shards.root.visible] = vis;
}
tessScene.environmentIntensity = 1.0;
tessScene.background = new THREE.Color(0.004, 0.005, 0.007);
// dust motes drifting in front of Cooper, lit by the amber
const dustN = 600, dustPos = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 14; dustPos[i * 3 + 1] = (Math.random() - 0.5) * 9; dustPos[i * 3 + 2] = -Math.random() * 18; }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 }, uH: { value: 1000 } },
    vertexShader: 'uniform float uH; varying float vF; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; vF = smoothstep(18.0, 2.0, -mv.z); gl_PointSize = uH * 0.0035 / -mv.z + 1.0; }',
    fragmentShader: 'uniform float uA; varying float vF; void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c,c)*16.0) * uA * vF; gl_FragColor = vec4(vec3(0.8,0.9,1.0) * a * 1.2, a); }',
});
const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false;
tessScene.add(dust);

// the dive and the tesseract use programs orbit never touches: build them while you are still in orbit, not on the
// frame the horizon closes
let warmed = false;
function warmWorlds() {
    if (warmed || !renderer.compileAsync) return;
    warmed = true;
    post.warm();
    buildTessEnvs();
    tessScene.environment = envCorr.texture;
    // program keys depend on the bound target (tone mapping, colour space): compile against the one we draw into
    // compile skips hidden objects, and most of the tesseract cast is hidden until its beat; lights stay as they are,
    // their count is part of every program key
    const hidden = [];
    const reveal = (scene) => scene.traverse((o) => { if (!o.visible && !o.isLight) { hidden.push(o); o.visible = true; } });
    renderer.setRenderTarget(post.rtScene);
    tessScene.add(cooper.root);
    reveal(tessScene);
    renderer.compileAsync(tessScene, tessCam).catch(() => {});
    tessScene.environment = envStudio.texture;
    renderer.compileAsync(tessScene, tessCam).catch(() => {});
    tessScene.environment = envCorr.texture;
    cooper.root.removeFromParent();
    shipScene.add(cooper.root);
    reveal(shipScene);
    renderer.compileAsync(shipScene, shipCam).catch(() => {});
    for (const o of hidden) o.visible = false;
    // the dive hides the ships, and the Endurance's engine glow with them: one point light fewer in every key
    const shipsVis = [endurance.root.visible, ranger.root.visible];
    endurance.root.visible = false; ranger.root.visible = false;
    renderer.compileAsync(shipScene, shipCam).catch(() => {});
    [endurance.root.visible, ranger.root.visible] = shipsVis;
    cooper.root.removeFromParent();
    renderer.setRenderTarget(null);
}

// ------------------------------------------------------------------ the sky's mechanics (r_s = 1)
// GM in these units is 0.5 c^2 r_s; the clock is scaled (x3) so an orbit at r = 26 takes about six minutes.
const GM = 4.5;
const K = 4000;                 // metres of ship space per r_s, for ship-to-ship offsets only
const END_R = 26, END_INC = 7 * D2R;
let endAng = 0.42;
const endP = V3(), endV = V3();
function endState(a) {
    const s = Math.sin(a), c = Math.cos(a), w = Math.sqrt(GM / END_R ** 3);
    endP.set(END_R * c, END_R * s * Math.sin(END_INC), END_R * s * Math.cos(END_INC));
    // prograde with the disk (the angle runs backwards)
    endV.set(END_R * s, -END_R * c * Math.sin(END_INC), -END_R * c * Math.cos(END_INC)).multiplyScalar(w);
}
endState(endAng);

const rgr = { docked: true, P: V3(), V: V3(), Q: new THREE.Quaternion(), hold: 0, bank: 0, want: 0 };
const free = { P: V3() };
const focus = V3();
const shipOf = (P, out) => out.copy(P).sub(focus).multiplyScalar(K);

// ------------------------------------------------------------------ state
const S = {
    phase: 'orbit',        // orbit | dive | tess
    mode: 'endurance',     // endurance | ranger | free
    pt: 0,                 // seconds in phase
    sim: 0,                // the world's own (dilated) clock: disk flow, ship spin
    tau: 0,                // proper time aboard
    earth: 0,              // days elapsed at home
    loop: 1,
    rate: 1, dil: 1, r: END_R,
};
const ctl = {
    yaw: 0, pitch: 0, tyaw: 0.0, tpitch: 0.0, fyaw: 0, fpitch: 0,
    lx: 0, ly: 0,
    zoom: { endurance: Math.log(170), ranger: Math.log(40), free: Math.log(30) },
    zoomT: { endurance: Math.log(170), ranger: Math.log(40), free: Math.log(30) },
    hold: false, holdT: 0, idle: 0,
};
const ZOOM = { endurance: [Math.log(60), Math.log(900)], ranger: [Math.log(18), Math.log(160)], free: [Math.log(1.6), Math.log(90)] };
const pointer = new THREE.Vector2(), pointerS = new THREE.Vector2();
let pointerIn = false;
const cut = { t: -1, fn: null };
const blend = { t: 1, anchor: null, pos: V3(), quat: new THREE.Quaternion(), dur: 1.2 };
const dive = { dir: V3(), r0: 10, from: 'free' };
let introAt = SHOT ? -100 : Infinity;
let time = FIXED_T ?? 0;
let world = 1;
let watchT0 = -1;
let envTick = 0;
let capT = -1, capText = '';

// temporaries
const v1 = V3(), v2 = V3(), v3 = V3(), v4 = V3(), fwd = V3(), right = V3(), up = V3(), toHole = V3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), qCam = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, 'YXZ');
const rgrCamQ = new THREE.Quaternion();
let rgrCamInit = false;

// ------------------------------------------------------------------ transitions
function startBlend(anchorP) {
    // remember where the ship camera is, relative to a moving anchor, and ease out of it
    blend.anchor = anchorP;
    blend.pos.copy(shipCam.position).add(v1.copy(focus).sub(anchorP).multiplyScalar(K));
    blend.quat.copy(shipCam.quaternion);
    blend.t = 0;
}
function cutTo(fn) { if (cut.t < 0) { cut.t = 0; cut.fn = fn; } }

function undock() {
    if (!rgr.docked) return;
    endurance.root.updateMatrixWorld(true);
    ranger.root.getWorldPosition(v1);
    ranger.root.getWorldQuaternion(rgr.Q);
    rgr.P.copy(endP).addScaledVector(v1.sub(endurance.root.position), 1 / K);
    // a push off the port, straight up out of the cradle
    v2.set(0, 1, 0).applyQuaternion(rgr.Q);
    rgr.V.copy(endV).addScaledVector(v2, 3 / K);
    shipScene.add(ranger.root);
    rgr.docked = false;
    rgrCamInit = false;
}
function dockRanger() {
    endurance.dock.add(ranger.root);
    ranger.root.position.set(0, 0, 0); ranger.root.quaternion.identity();
    ranger.shipU.uStretch.value = 0; ranger.shipU.uRed.value = 0; ranger.shipU.uFade.value = 1;
    rgr.docked = true; rgr.hold = 0;
}
function setMode(m, { instant = false } = {}) {
    if (S.phase !== 'orbit' || m === S.mode) return;
    const prev = S.mode;
    const farJump = () => {
        const from = prev === 'free' ? free.P : prev === 'ranger' && !rgr.docked ? rgr.P : endP;
        const to = m === 'free' ? from : m === 'ranger' && !rgr.docked ? rgr.P : endP;
        return from.distanceTo(to) > 0.02;
    };
    const go = () => {
        if (m === 'ranger' && rgr.docked) undock();
        if (m === 'free') {
            // drift free from wherever the lens is, looking at the hole
            const P = prev === 'ranger' && !rgr.docked ? rgr.P : endP;
            const R = P.length();
            ctl.zoom.free = ctl.zoomT.free = Math.log(clamp(R, 1.7, 90));
            ctl.tyaw = ctl.yaw = Math.atan2(P.x, P.z);
            ctl.tpitch = ctl.pitch = Math.asin(clamp(P.y / R, -1, 1));
        } else if (m === 'endurance') {
            ctl.tyaw = ctl.yaw = 0; ctl.tpitch = ctl.pitch = 0;
        }
        ctl.fyaw = ctl.fpitch = 0;
        S.mode = m;
        syncModeUI();
    };
    if (!instant && farJump()) cutTo(go);
    else { startBlend(prev === 'free' ? free.P : prev === 'ranger' && !rgr.docked ? rgr.P : endP); go(); }
}

function startDive(from) {
    if (S.phase !== 'orbit') return;
    S.phase = 'dive'; S.pt = 0;
    dive.from = from;
    const P = from === 'ranger' ? rgr.P : free.P;
    // the eject is a cut to an outside camera a little further back, so the whole shadow sits behind him
    dive.r0 = Math.max(4.6, P.length());
    dive.dir.copy(P).normalize().negate();
    ctl.tyaw = ctl.yaw = 0; ctl.tpitch = ctl.pitch = 0; ctl.fyaw = ctl.fpitch = 0;
    shipScene.add(cooper.root);
    cooper.root.visible = true;
    envTick = 0;
    syncModeUI();
}
function startTess() {
    S.phase = 'tess'; S.pt = 0;
    world = 2;
    lusionTess.reset();
    tessCam.position.set(0, 0, 0);
    tessCam.rotation.set(0, 0, 0);
    tessCam.updateMatrixWorld();
    watchT0 = -1;
    syncModeUI();
}
function putBack() {
    // the loop closes: back aboard, the Ranger in its cradle, one more on the counter
    S.phase = 'orbit'; S.pt = 0;
    world = 1;
    cooper.root.removeFromParent();
    dockRanger();
    envTick = 0;
    S.mode = 'endurance';
    // a hold carried out of the tesseract must not launch the Ranger the moment you are back
    ctl.hold = false; ctl.holdT = 0;
    S.loop++;
    ctl.tyaw = ctl.yaw = -0.5; ctl.tpitch = ctl.pitch = 0.05; ctl.fyaw = 0.06; ctl.fpitch = 0;
    ctl.zoom.endurance = Math.log(420); ctl.zoomT.endurance = Math.log(170);
    caption(`Loop ${pad(S.loop)}. They put you back.`);
    syncModeUI();
}

// ------------------------------------------------------------------ HUD
const $ = (id) => document.getElementById(id);
const el = {
    title: $('title'), tau: $('tau'), earth: $('earth'), r: $('teleR'), d: $('teleD'), loop: $('teleL'),
    act: $('actLabel'), rate: $('actRate'), cap: $('cap'), morse: $('morse'), stay: $('stay'), murph: $('murph'),
    markE: $('markE'), markR: $('markR'), modes: [...document.querySelectorAll('[data-mode]')], warn: $('warn'),
};
const txt = (e, s) => { if (e && e.textContent !== s) e.textContent = s; };
function caption(s) { capText = s; capT = 0; txt(el.cap, s); }
function syncModeUI() {
    for (const b of el.modes) b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode && S.phase === 'orbit'));
    root.dataset.phase = S.phase;
    root.dataset.mode = S.mode;
}
for (const b of el.modes) b.addEventListener('click', (e) => { e.stopPropagation(); setMode(b.dataset.mode); });
function actionLabel() {
    if (S.phase === 'tess') return 'Hold to hurry time';
    if (S.phase === 'dive') return 'No signal';
    if (S.mode === 'endurance') return 'Hold to launch the Ranger';
    if (S.mode === 'ranger') return S.r < 2.4 ? 'Hold to cross' : 'Steer with the cursor. Hold to burn';
    return S.r < 2.4 ? 'Hold to cross' : 'Drag to orbit. Hold to fall';
}
function markAt(e, P, label) {
    if (!e) return;
    v1.copy(P).project(bhCam);
    const vis = v1.z < 1 && Math.abs(v1.x) < 0.95 && Math.abs(v1.y) < 0.9;
    e.classList.toggle('is-on', vis);
    if (!vis) return;
    e.style.transform = `translate3d(${((v1.x * 0.5 + 0.5) * window.innerWidth).toFixed(1)}px, ${((-v1.y * 0.5 + 0.5) * window.innerHeight).toFixed(1)}px, 0)`;
    txt(e.lastElementChild, label);
}

// ------------------------------------------------------------------ the orbit: three viewpoints, one sky
function physics(dt) {
    if (dt <= 0) return;
    endAng -= Math.sqrt(GM / END_R ** 3) * dt;
    endState(endAng);
    if (rgr.docked) return;
    const n = 4, h = dt / n;
    fwd.set(0, 0, 1).applyQuaternion(rgr.Q);
    const thrust = rgr.want > 0 ? Math.min(0.6, 0.03 + rgr.hold * 0.09) : 0;
    for (let i = 0; i < n; i++) {
        const r2 = rgr.P.lengthSq(), r = Math.sqrt(r2);
        rgr.V.addScaledVector(rgr.P, -GM / (r2 * r) * h);
        rgr.V.addScaledVector(fwd, thrust * h);
        // a soft fence far out, so no one drifts off into the dark for good
        if (r > 60) rgr.V.addScaledVector(rgr.P, -(r - 60) * 0.004 * h / r);
        const sp = rgr.V.length();
        if (sp > 3) rgr.V.multiplyScalar(3 / sp);
        rgr.P.addScaledVector(rgr.V, h);
    }
}

function updateOrbit(dt, simDt) {
    const holdLaunch = ctl.hold && S.mode === 'endurance' && introAt !== Infinity && cut.t < 0;
    if (holdLaunch && ctl.holdT > 0.15) setMode('ranger', { instant: true });
    rgr.want = ctl.hold && S.mode === 'ranger' && !rgr.docked ? 1 : 0;
    rgr.hold = rgr.want ? rgr.hold + dt : 0;
    physics(simDt);

    // free-cam fall: holding pulls you in, faster the longer you hold
    if (S.mode === 'free' && ctl.hold) ctl.zoomT.free = Math.max(Math.log(1.12), ctl.zoomT.free - dt * (0.08 + ctl.holdT * 0.22));

    // camera angles: drag target + fling inertia, then eased; idle drift keeps the frame alive
    if (!ctl.drag) {
        ctl.tyaw += ctl.fyaw * dt; ctl.tpitch += ctl.fpitch * dt;
        ctl.fyaw *= Math.exp(-1.6 * dt); ctl.fpitch *= Math.exp(-2.4 * dt);
        if (ctl.idle > 6 && S.mode !== 'ranger') ctl.tyaw += dt * 0.018 * smooth(6, 10, ctl.idle);
    }
    ctl.tpitch = clamp(ctl.tpitch, -1.25, 1.25);
    ctl.yaw = damp(ctl.yaw, ctl.tyaw, 7, dt);
    ctl.pitch = damp(ctl.pitch, ctl.tpitch, 7, dt);
    for (const k of ['endurance', 'ranger', 'free']) {
        const lo = k === 'free' && ctl.hold ? Math.log(1.12) : ZOOM[k][0];
        ctl.zoomT[k] = clamp(ctl.zoomT[k], lo, ZOOM[k][1]);
        ctl.zoom[k] = damp(ctl.zoom[k], ctl.zoomT[k], k === 'free' ? 2.2 : 3.2, dt);
    }
    // the cursor leans the view a little (not in the Ranger, where it steers)
    const lean = S.mode === 'ranger' ? 0 : 1;
    ctl.lx = damp(ctl.lx, -pointerS.x * 0.16 * lean, 3, dt);
    ctl.ly = damp(ctl.ly, pointerS.y * 0.09 * lean, 3, dt);

    let fov = 32;
    if (S.mode === 'endurance') {
        focus.copy(endP);
        toHole.copy(endP).negate().normalize();
        frameQ(toHole, q1);
        qCam.copy(q1).multiply(q2.setFromEuler(eul.set(ctl.pitch + ctl.ly, ctl.yaw + ctl.lx, 0)));
        const d = Math.exp(ctl.zoom.endurance);
        fwd.set(0, 0, -1).applyQuaternion(qCam); right.set(1, 0, 0).applyQuaternion(qCam); up.set(0, 1, 0).applyQuaternion(qCam);
        shipCam.position.copy(fwd).multiplyScalar(-d).addScaledVector(right, d * 0.24).addScaledVector(up, d * 0.075);
        shipCam.quaternion.copy(qCam);
        fov = 32;
    } else if (S.mode === 'ranger') {
        focus.copy(rgr.P);
        // steer: the cursor's offset from centre is a turn rate, the way you lean a dragon
        const ox = Math.sign(pointerS.x) * Math.max(0, Math.abs(pointerS.x) - 0.1) / 0.9;
        const oy = Math.sign(pointerS.y) * Math.max(0, Math.abs(pointerS.y) - 0.1) / 0.9;
        if (!rgrCamInit) { fwd.set(0, 0, 1).applyQuaternion(rgr.Q); frameQ(fwd, rgrCamQ); rgrCamInit = true; }
        up.set(0, 1, 0).applyQuaternion(rgrCamQ); right.set(1, 0, 0).applyQuaternion(rgrCamQ);
        if (pointerIn || ctl.hold) {
            q1.setFromAxisAngle(up, -ox * 1.0 * dt);
            q2.setFromAxisAngle(right, oy * 0.75 * dt);
            rgr.Q.premultiply(q1).premultiply(q2).normalize();
        }
        rgr.bank = damp(rgr.bank, -ox * 0.55, 3, dt);
        fwd.set(0, 0, 1).applyQuaternion(rgr.Q);
        frameQ(fwd, q1);
        rgrCamQ.slerp(q1, SHOT ? 1 : 1 - Math.exp(-2.6 * dt));
        qCam.copy(rgrCamQ).multiply(q2.setFromEuler(eul.set(ctl.pitch * 0.5 + 0.04, ctl.yaw * 0.5, 0)));
        const d = Math.exp(ctl.zoom.ranger);
        fwd.set(0, 0, -1).applyQuaternion(qCam); up.set(0, 1, 0).applyQuaternion(qCam); right.set(1, 0, 0).applyQuaternion(qCam);
        // the burn pushes the camera back a touch and shakes it
        const shake = ranger.throttle * 0.12 * (reduceMotion ? 0 : 1);
        shipCam.position.copy(fwd).multiplyScalar(-d * (1 + ranger.throttle * 0.12)).addScaledVector(up, d * 0.2)
            .addScaledVector(right, Math.sin(time * 37) * shake).addScaledVector(up, Math.sin(time * 43 + 1) * shake);
        shipCam.quaternion.copy(qCam);
        fov = 40 + ranger.throttle * 4;
        // the hull leans into the turn
        ranger.root.quaternion.copy(rgr.Q).multiply(q2.setFromAxisAngle(v1.set(0, 0, 1), rgr.bank));
        if (rgr.P.length() < 1.32) startDive('ranger');
    } else {
        const R = Math.exp(ctl.zoom.free);
        const el2 = ctl.pitch, az = ctl.yaw;
        free.P.set(R * Math.cos(el2) * Math.sin(az), R * Math.sin(el2), R * Math.cos(el2) * Math.cos(az));
        focus.copy(free.P);
        toHole.copy(free.P).negate().normalize();
        frameQ(toHole, q1);
        qCam.copy(q1).multiply(q2.setFromEuler(eul.set(ctl.ly, ctl.lx, 0)));
        shipCam.position.set(0, 0, 0);
        shipCam.quaternion.copy(qCam);
        fov = lerp(48, 34, smooth(2, 30, R));
        if (R < 1.3) startDive('free');
    }
    // ease out of the previous rig's pose
    if (blend.t < 1) {
        blend.t = Math.min(1, blend.t + dt / blend.dur);
        const e = 1 - Math.pow(1 - blend.t, 3);
        v1.copy(blend.pos).add(v2.copy(blend.anchor).sub(focus).multiplyScalar(K));
        shipCam.position.lerpVectors(v1, shipCam.position, e);
        shipCam.quaternion.slerpQuaternions(blend.quat, shipCam.quaternion, e);
    }
    // portrait screens keep roughly the horizontal framing of a square one
    if (aspect < 1) fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) / Math.max(0.55, aspect)));
    shipCam.fov = damp(shipCam.fov, fov, 3, dt);
    shipCam.near = S.mode === 'ranger' ? 0.5 : 1; shipCam.far = 30000;

    // place the ships in this frame of reference
    shipOf(endP, endurance.root.position);
    toHole.copy(endP).negate().normalize();
    frameQ(toHole, q1);
    endurance.root.quaternion.copy(q1).multiply(q2.setFromEuler(eul.set(0.42, 0.62, 0.2, 'XYZ')));
    eul.order = 'YXZ';
    const endDist = endurance.root.position.length();
    endurance.root.visible = endDist < 25000;
    endurance.update(simDt, S.sim, 0);
    if (!rgr.docked) {
        shipOf(rgr.P, ranger.root.position);
        if (S.mode !== 'ranger') ranger.root.quaternion.copy(rgr.Q);
        ranger.root.visible = ranger.root.position.length() < 25000;
    }
    ranger.update(SHOT ? 10 : dt, time, rgr.want);
    endurance.shipU.uStretch.value = 0; endurance.shipU.uRed.value = 0; endurance.shipU.uFade.value = 1;
    ranger.shipU.uFade.value = 1;
    // the Ranger reddens and stretches as it nears the hole
    const rr = rgr.docked ? 99 : rgr.P.length();
    ranger.shipU.uRed.value = smooth(3.2, 1.4, rr) * 0.8;
    ranger.shipU.uStretch.value = smooth(2.2, 1.3, rr) * 0.25;

    // the lights come from where the hole is, wherever we are
    if (S.mode === 'ranger') v4.copy(ranger.root.position); else if (S.mode === 'endurance') v4.copy(endurance.root.position); else v4.set(0, 0, 0);
    lightsFromHole(v4, S.mode === 'ranger' ? 16 : 48);
    key.intensity = 5.6;
    if (S.mode === 'free') { markAt(el.markE, endP, `Endurance ${endP.length().toFixed(1)} r\u209b`); if (!rgr.docked) markAt(el.markR, rgr.P, 'Ranger'); else el.markR.classList.remove('is-on'); }
    else { el.markE.classList.remove('is-on'); el.markR.classList.remove('is-on'); }
}

function lightsFromHole(center, box) {
    toHole.copy(focus).negate().normalize();
    v3.copy(toHole).applyAxisAngle(UP, 0.95); v3.y += 0.45; v3.normalize();
    key.position.copy(center).addScaledVector(v3, box * 3.3);
    key.target.position.copy(center);
    shadowBox(box);
    v2.copy(toHole).applyAxisAngle(UP, 1.1); v2.y += 0.15;
    diskGlow.position.copy(center).addScaledVector(v2, 160);
    diskGlow.target.position.copy(center);
    v2.set(-0.6, 0.8, 0.5).applyQuaternion(shipCam.quaternion);
    archFill.position.copy(center).addScaledVector(v2, 160);
    archFill.target.position.copy(center);
}

// ------------------------------------------------------------------ the dive: Cooper falls with the disk in his visor
const DIVE_FALL = 5.4, DIVE_STREAK = [4.5, 5.0, 5.4, 5.8], DIVE_BLACK = [5.5, 5.8, 6.7, 7.0], DIVE_WHITE = 7.6;
function updateDive(dt) {
    const pt = S.pt;
    const e = Math.pow(clamp(pt / DIVE_FALL), 2.2);
    const r = lerp(dive.r0, 1.0, e);
    focus.copy(dive.dir).multiplyScalar(-r);
    endurance.root.visible = false;
    ranger.root.visible = false;
    rgr.want = 0;
    ranger.update(SHOT ? 10 : dt, time, 0);

    // a slow orbit round him, with the hole behind; drag still turns the view
    if (!ctl.drag) { ctl.tyaw += ctl.fyaw * dt; ctl.fyaw *= Math.exp(-1.6 * dt); }
    ctl.yaw = damp(ctl.yaw, ctl.tyaw, 6, dt); ctl.pitch = damp(ctl.pitch, clamp(ctl.tpitch, -0.6, 0.6), 6, dt);
    ctl.lx = damp(ctl.lx, -pointerS.x * 0.1, 3, dt); ctl.ly = damp(ctl.ly, pointerS.y * 0.06, 3, dt);
    frameQ(dive.dir, q1);
    qCam.copy(q1).multiply(q2.setFromEuler(eul.set(-0.06 + ctl.pitch + ctl.ly, -0.22 + pt * 0.035 + ctl.yaw + ctl.lx, 0)));
    fwd.set(0, 0, -1).applyQuaternion(qCam); right.set(1, 0, 0).applyQuaternion(qCam); up.set(0, 1, 0).applyQuaternion(qCam);
    const d = 3.6 - pt * 0.12;
    cooper.root.position.set(0, 0, 0);
    shipCam.position.copy(fwd).multiplyScalar(-d).addScaledVector(right, -0.62).addScaledVector(up, 0.12);
    shipCam.quaternion.copy(qCam);
    shipCam.fov = damp(shipCam.fov, 36 + pt * 1.5, 3, dt);
    shipCam.near = 0.05; shipCam.far = 400;
    cooper.update(dt, time, pointerS, { tumbleAmt: 1.2, spin: pt * 0.18 });
    lightsFromHole(cooper.root.position, 1.8);
    key.intensity = 6.5;
    el.markE.classList.remove('is-on'); el.markR.classList.remove('is-on');
    if (pt > DIVE_WHITE) startTess();
}

// ------------------------------------------------------------------ the tesseract: the corridor, the void, the watch, the fold
// He is far down the corridor, falling with you and coming apart into dust; the corridor brakes and blows open into a
// dark full of glass, he pulls himself back together in front of you, the watch spells, and the walls slam back in.
const T_OPEN = 12.5, T_FOUND = 18, T_WATCH = 22, T_FOLD = 34, T_END = 38.5;
function tessSpeed(t) {
    const cruise = 7.5 * (1 - 0.95 * smooth(T_OPEN - 2.5, T_FOUND, t)) * smooth(-0.6, 1.2, t);
    const rush = smooth(T_FOLD, T_END, t);
    return cruise + rush * rush * 70;
}
function tessTravel(pt) {
    let s = 0;
    for (let t = 0; t < pt; t += 0.05) { const h = Math.min(0.05, pt - t); s += tessSpeed(t + h * 0.5) * h; }
    return s;
}
function updateTess(dt) {
    const pt = S.pt;
    const normPt = clamp(pt / T_END, 0, 1);

    if (!ctl.drag) { ctl.tyaw += ctl.fyaw * dt; ctl.tpitch += ctl.fpitch * dt; ctl.fyaw *= Math.exp(-1.6 * dt); ctl.fpitch *= Math.exp(-2.4 * dt); }
    if (!ctl.drag) { ctl.tyaw *= Math.exp(-0.8 * dt); ctl.tpitch *= Math.exp(-0.8 * dt); }
    ctl.tyaw = clamp(ctl.tyaw, -0.8, 0.8); ctl.tpitch = clamp(ctl.tpitch, -0.5, 0.5);
    ctl.yaw = damp(ctl.yaw, ctl.tyaw, 5, dt); ctl.pitch = damp(ctl.pitch, ctl.tpitch, 5, dt);
    ctl.lx = damp(ctl.lx, pointerS.x, 2.2, dt); ctl.ly = damp(ctl.ly, pointerS.y, 2.2, dt);

    // Forward journey down the Lusion tunnel axis
    tessCam.position.z -= 11.5 * dt;
    tessCam.position.x = damp(tessCam.position.x, Math.sin(time * 0.4) * 0.25 + ctl.lx * 0.45, 4, dt);
    tessCam.position.y = damp(tessCam.position.y, Math.cos(time * 0.3) * 0.18 + ctl.ly * 0.35, 4, dt);
    tessCam.rotation.set(
        Math.sin(time * 0.12) * 0.015 + ctl.pitch + ctl.ly * 0.03,
        Math.sin(time * 0.15) * 0.02 + ctl.yaw - ctl.lx * 0.04,
        Math.sin(time * 0.18) * 0.02 - ctl.lx * 0.02,
        'YXZ'
    );
    tessCam.fov = lerp(54, 44, normPt);
    if (aspect < 1) tessCam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(tessCam.fov) / 2) / Math.max(0.55, aspect)));
    tessCam.updateProjectionMatrix();
    tessCam.updateMatrixWorld();

    lusionTess.update(time, dt, normPt, tessCam, sound);

    // Dynamic studio and tunnel lights
    tKey.position.set(-2, 3, tessCam.position.z + 4);
    tKey.target.position.set(0, 0, tessCam.position.z - 4);
    tRim.position.set(2, -1, tessCam.position.z - 4);
    tRim.target.position.set(0, 0, tessCam.position.z);

    // Dynamic background tone shift (authentic Lusion palette)
    if (normPt < 0.32) {
        tessScene.background = new THREE.Color(0x000000);
    } else if (normPt < 0.85) {
        const wt = smooth(0.32, 0.45, normPt) * (1 - smooth(0.80, 0.86, normPt));
        tessScene.background = new THREE.Color().lerpColors(new THREE.Color(0x000000), new THREE.Color(0xffffff), wt);
    } else {
        tessScene.background = new THREE.Color(0x000000);
    }

    // Hide old objects
    tess.mesh.visible = false;
    shards.root.visible = false;
    cooper.root.visible = false;
    watch.root.visible = false;
    el.murph.style.opacity = '0';

    if (pt > T_END) putBack();
}

// ------------------------------------------------------------------ the frame
const sound = new Sound();
function update(dt) {
    const T = TIERS[tier];
    const started = introAt !== Infinity;
    const intro = SHOT ? 1 : smooth(0, 5, time - introAt);
    ctl.holdT = ctl.hold ? ctl.holdT + dt : 0;
    if (!warmed && S.phase === 'orbit' && S.pt > 4 && shipScene.environment && cooper.loaded) warmWorlds();
    ctl.idle += dt;
    pointerS.x = damp(pointerS.x, pointer.x, 6, dt); pointerS.y = damp(pointerS.y, pointer.y, 6, dt);
    if (cut.t >= 0) {
        const was = cut.t;
        cut.t += dt;
        if (was < 0.32 && cut.t >= 0.32 && cut.fn) { cut.fn(); cut.fn = null; }
        if (cut.t > 0.8) cut.t = -1;
    }

    // time: how fast the world runs here, from the lens's own radius
    const holdBoost = S.phase === 'tess' && ctl.hold ? 3.5 : 1;
    const ptDt = dt * holdBoost;
    if (S.phase !== 'tess') {
        const r = Math.max(1.0001, focus.length());
        S.r = r;
        S.dil = Math.sqrt(1 - 1 / r);
    }
    const rateT = S.phase === 'tess' ? 1 : clamp(Math.pow(S.dil, 2.2), 0.06, 1);
    S.rate = SHOT ? rateT : damp(S.rate, rateT, 2, dt);
    const simDt = (started || SHOT ? dt : dt * 0.3) * (S.phase === 'tess' ? 1 : S.rate);
    S.sim += simDt;
    if (FIXED_T != null) S.sim = FIXED_T;
    if (started) {
        S.tau += dt * (S.phase === 'tess' ? 1 : S.rate);
        S.earth += dt * (S.phase === 'tess' ? 400 : (1 / Math.max(S.dil, 0.004) - 1) * 40 + 1 / 86400);
    }
    S.pt += ptDt;

    if (S.phase === 'orbit') updateOrbit(dt, SHOT ? 0 : simDt);
    else if (S.phase === 'dive') updateDive(ptDt);
    else updateTess(ptDt);
    if (SHOT && S.phase === 'orbit') S.pt = SHOT_PT;

    // ---------------- the lens (world 1)
    if (world === 1) {
        shipCam.updateProjectionMatrix();
        shipCam.updateMatrixWorld();
        // each ship stretches about its own centre, in view space
        endurance.shipU.uCenter.value.copy(endurance.root.position).applyMatrix4(shipCam.matrixWorldInverse);
        ranger.root.getWorldPosition(ranger.shipU.uCenter.value).applyMatrix4(shipCam.matrixWorldInverse);
        bhCam.position.copy(focus);
        bhCam.quaternion.copy(shipCam.quaternion);
        bhCam.fov = shipCam.fov; bhCam.aspect = aspect;
        bhCam.updateProjectionMatrix();
        bhCam.updateMatrixWorld();
        const U = bh.uniforms;
        U.uTime.value = S.sim;
        U.uSteps.value = T.steps;
        U.uStepK.value = T.stepK;
        U.uDiskGain.value = 1.6 * (SHOT ? 1 : smooth(0.0, 4.5, time - introAt) * 0.85 + 0.15);
        U.uStarGain.value = SHOT ? 1 : 0.35 + 0.65 * intro;
        U.uDoppler.value = 1;
        // the cursor's own gravity: an Einstein ring that follows it across the sky
        const lensOn = S.phase === 'orbit' && (pointerIn || SHOT === 'lens') && !mobile ? 1 : 0;
        U.uLensK.value = damp(U.uLensK.value, lensOn * (0.0011 + (ctl.hold ? 0.0007 : 0)), 4, dt);
        v1.set(SHOT === 'lens' ? -0.35 : pointerS.x, SHOT === 'lens' ? 0.42 : pointerS.y, 0.5).unproject(bhCam).sub(bhCam.position).normalize();
        U.uLensDir.value.copy(v1);
        endurance.puffMat.uniforms.uScale.value = H * 0.9;
        // relight the scene from the hole every few frames (always in shots)
        envTick--;
        if (SHOT || envTick <= 0 || !envShipRT) {
            updateShipEnv(focus);
            envTick = T.envEvery;
        }
    } else if (!envCorr && cooper.loaded) {
        buildTessEnvs();
    }

    // ---------------- post
    const u = post.u, D = post.dofU;
    const k = H / 900;
    let white = 0, black = 0, streak = 0, letter = 0;
    if (S.phase === 'orbit') {
        white = S.loop > 1 ? 1 - smooth(0, 2.6, S.pt) : 0;
        D.uAperture.value = 0;
    } else if (S.phase === 'dive') {
        streak = win(S.pt, ...DIVE_STREAK);
        black = Math.max(win(S.pt, ...DIVE_BLACK), 1 - smooth(0, 0.35, S.pt));
        white = smooth(6.8, DIVE_WHITE, S.pt);
        letter = Math.max(0, (1 - aspect / 2.39) / 2) * smooth(0, 1, S.pt);
        D.uFocus.value = shipCam.position.distanceTo(cooper.root.position);
        D.uAperture.value = 6.5 * k; D.uMaxCoc.value = 9 * k;
    } else {
        white = Math.max(1 - smooth(0, 1.6, S.pt), smooth(T_END - 2.2, T_END, S.pt));
        const wIn = smooth(T_WATCH, T_WATCH + 3, S.pt) * (1 - smooth(T_FOLD + 0.5, T_FOLD + 2.5, S.pt));
        const found = smooth(T_OPEN - 3, T_FOUND, S.pt);
        const fc = tessCam.position.distanceTo(cooper.root.position), fw = tessCam.position.distanceTo(watch.root.position);
        D.uFocus.value = lerp(fc, fw, wIn);
        // down the corridor the focus sits on him, far away, and the near walls go soft; in the void it is a portrait lens
        D.uAperture.value = lerp(TUNE.apCorr, 7, found) * (1 - wIn * 0.35) * k; D.uMaxCoc.value = 13 * k;
    }
    if (cut.t >= 0) black = Math.max(black, cut.t < 0.32 ? smooth(0, 0.32, cut.t) : 1 - smooth(0.32, 0.8, cut.t));
    if (!SHOT && !started) black = 1;
    else if (!SHOT) black = Math.max(black, 1 - smooth(0, 2.4, time - introAt));
    u.uWhite.value = white; u.uBlack.value = black; u.uStreak.value = streak; u.uLetter.value = letter;
    u.uBloom.value = world === 1 ? (S.phase === 'dive' ? 0.6 : 0.5) : TUNE.bloom;
    u.uExposure.value = world === 1 ? 1.0 : TUNE.exposure;
    u.uAgX.value = world === 2 ? 1 : S.phase === 'dive' ? 0.45 : 0;
    u.uGrain.value = world === 2 ? 0.055 : 0.045;
    u.uVignette.value = world === 2 ? 0.75 : 0.6;
    u.uCA.value = S.phase === 'orbit' ? 0.006 : S.phase === 'tess' ? 0.02 : 0.011;
    // the lens: a rainbow halo ring and an anamorphic streak, lit by how much light the frame holds
    u.uHalo.value = world === 2 ? TUNE.halo * (1 - 0.5 * smooth(T_OPEN, T_FOUND, S.pt)) : 0;
    u.uAnam.value = world === 2 ? TUNE.anam : 0;
    u.uTime.value = time;

    // ---------------- HUD
    const ti = S.tau;
    txt(el.tau, `${pad(ti / 3600)}:${pad((ti / 60) % 60)}:${pad(ti % 60)}.${pad((ti * 100) % 100)}`);
    const yrs = Math.floor(S.earth / 365.25), days = Math.floor(S.earth % 365.25);
    txt(el.earth, `Earth +${yrs}y ${pad(days, 3)}d`);
    if (S.phase === 'tess') { txt(el.r, 'r  bulk'); txt(el.d, 'd\u03c4/dt  \u2014'); }
    else { txt(el.r, `r  ${S.r.toFixed(2)} r\u209b`); txt(el.d, `d\u03c4/dt  ${S.dil.toFixed(3)}`); }
    txt(el.loop, `Loop ${pad(S.loop)}`);
    txt(el.act, actionLabel());
    txt(el.rate, `${(S.phase === 'tess' ? holdBoost : S.rate).toFixed(2)}\u00d7`);
    root.classList.toggle('is-near', S.phase === 'orbit' && S.r < 2.4);
    root.classList.toggle('is-hold', ctl.hold);
    if (el.title) {
        const o = SHOT ? 0 : win(time - introAt, 0.8, 2.2, 5.5, 7.5);
        el.title.style.opacity = o.toFixed(3);
        el.title.style.transform = `translate3d(-50%, calc(-50% + ${((1 - o) * 10).toFixed(1)}px), 0)`;
    }
    if (capT >= 0) {
        capT += dt;
        const o = win(capT, 0.6, 1.4, 4.4, 5.6);
        el.cap.style.opacity = o.toFixed(3);
        el.cap.style.transform = `translate3d(-50%, ${((1 - o) * 8).toFixed(1)}px, 0)`;
        if (capT > 6) capT = -1;
    }
    if (S.phase !== 'tess') el.murph.style.opacity = '0';

    // ---------------- sound
    const close = smooth(12, 2, S.r);
    const thr = S.mode === 'ranger' ? ranger.throttle : (S.mode === 'free' && ctl.hold ? 0.45 : 0);
    if (S.phase === 'orbit') {
        sound.set({ level: (0.4 + 0.35 * close) * intro, bright: 0.25 + 0.75 * close, tick: 0.55 + 0.35 * close, arp: 0, rate: S.rate, thrust: thr });
    } else if (S.phase === 'dive') {
        const silence = 1 - smooth(4.8, 5.5, S.pt);
        sound.set({ level: 0.75 * silence, bright: 1, tick: 0.9 * silence, arp: 0, rate: S.rate, thrust: 0 });
    } else {
        const pt = S.pt;
        const after = smooth(0.4, 3, pt);
        sound.set({
            level: after * lerp(0.35, 0.75, smooth(8, 14, pt)) * (1 - 0.6 * win(pt, T_WATCH, T_WATCH + 3, T_FOLD, T_FOLD + 1.5)) * (1 + smooth(T_FOLD, T_END, pt) * 0.3),
            bright: 0.6 + smooth(T_FOLD, T_END, pt) * 0.4,
            tick: 0,
            arp: smooth(9, 14, pt) * (1 - 0.7 * win(pt, T_WATCH, T_WATCH + 3, T_FOLD, T_FOLD + 1.5)),
            rate: holdBoost > 1 ? 1.25 : 1, thrust: 0,
        });
    }
}

function render() {
    const u = post.u;
    const covered = u.uBlack.value > 0.999 || u.uWhite.value > 0.999;
    let cam = null;
    if (!covered) {
        if (world === 1) {
            bh.setCamera(bhCam, post.rtBH.height);
            renderer.setRenderTarget(post.rtBH);
            renderer.render(bh.scene, bh.camera);
            bgMat.uniforms.t.value = post.rtBH.texture;
            renderer.setRenderTarget(post.rtScene);
            renderer.render(shipScene, shipCam);
            cam = shipCam;
        } else {
            renderer.setRenderTarget(post.rtScene);
            renderer.render(tessScene, tessCam);
            cam = tessCam;
        }
    }
    post.finish(world === 1 ? 1.5 : 1.4, cam);
}

// ------------------------------------------------------------------ adaptive quality: sample, then step down / up
const perf = { ema: 16.7, bad: 0, good: 0, cool: 0, raised: false };
function sample(dtMs) {
    if (SHOT || introAt === Infinity || time - introAt < 2.5) return;
    perf.ema = lerp(perf.ema, Math.min(dtMs, 100), 0.05);
    perf.cool -= dtMs;
    if (perf.cool > 0) return;
    if (perf.ema > 24) perf.bad += dtMs; else perf.bad = Math.max(0, perf.bad - dtMs * 0.5);
    if (perf.ema < 13) perf.good += dtMs; else perf.good = 0;
    if (perf.bad > 1200) {
        perf.bad = 0; perf.cool = 2500;
        if (dyn > 0.76) { dyn -= 0.12; resize(); }
        else if (tier > 0) { tier--; dyn = 1; if (tier === 0) { key.castShadow = false; tKey.castShadow = false; } resize(); }
    } else if (perf.good > 6000 && !perf.raised) {
        perf.good = 0; perf.cool = 3000;
        if (dyn < 1) { dyn = Math.min(1, dyn + 0.12); resize(); }
        else if (tier < maxTier) { tier++; perf.raised = true; resize(); }
    }
}

// ------------------------------------------------------------------ input: drag to orbit, scroll to zoom, hold to burn
const dot = document.querySelector('.site-cursor-dot');
let cx = -100, cy = -100, dx = -100, dy = -100;
const touches = new Map();
let down = null;       // { x, y, t, id, moved }
let pinch0 = 0;
const isUI = (t) => t && t.closest && t.closest('a, button, label, input, .ap-nav, .g-gate');
function setPointer(e) {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    cx = e.clientX; cy = e.clientY;
}
window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || touches.size) { setPointer(e); pointerIn = e.pointerType === 'mouse' || S.mode === 'ranger'; }
    if (e.pointerType === 'mouse') dot.classList.add('is-on');
    dot.classList.toggle('is-hover', !!isUI(e.target));
    ctl.idle = 0;
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0) ctl.zoomT[S.mode] -= Math.log(d / pinch0) * 1.4;
        pinch0 = d;
        return;
    }
    if (!down || down.id !== e.pointerId) return;
    const mx = e.clientX - down.lx, my = e.clientY - down.ly;
    down.lx = e.clientX; down.ly = e.clientY;
    const steering = S.phase === 'orbit' && S.mode === 'ranger';
    if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7 && !ctl.hold && !steering) { down.moved = true; ctl.drag = true; }
    if (ctl.drag) {
        // grab-the-world orbiting: drag right and the camera swings left round its subject
        const sx = 3.2 / window.innerWidth, sy = 2.2 / window.innerHeight;
        const py = S.phase === 'orbit' && S.mode === 'free' ? 1 : -1;   // free cam pitch is elevation, the rest is view pitch
        ctl.tyaw -= mx * sx; ctl.tpitch += my * sy * py;
        const now = performance.now(), dtv = Math.max(8, now - down.lt) / 1000;
        down.lt = now;
        ctl.fyaw = lerp(ctl.fyaw, -mx * sx / dtv, 0.5);
        ctl.fpitch = lerp(ctl.fpitch, my * sy * py / dtv, 0.5);
    }
}, { passive: true });
canvas.addEventListener('pointerdown', (e) => {
    if (introAt === Infinity) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { pinch0 = 0; ctl.hold = false; ctl.drag = false; down = null; return; }
    setPointer(e);
    pointerIn = true;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), t: performance.now(), moved: false };
    ctl.fyaw = ctl.fpitch = 0;
    ctl.idle = 0;
    // in the Ranger the press is the throttle; elsewhere it becomes a hold if it does not turn into a drag
    if (S.mode === 'ranger' && S.phase === 'orbit') ctl.hold = true;
    else setTimeout(() => { if (down && !down.moved && down.id === e.pointerId) ctl.hold = true; }, 200);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
});
const release = (e) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch0 = 0;
    if (down && down.id === e.pointerId) {
        down = null; ctl.drag = false; ctl.hold = false;
        if (e.pointerType !== 'mouse') pointerIn = false;
    }
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
document.addEventListener('pointerleave', () => { dot.classList.remove('is-on'); pointerIn = false; });
document.addEventListener('pointerenter', () => { pointerIn = true; });
window.addEventListener('wheel', (e) => {
    if (introAt === Infinity || S.phase !== 'orbit') return;
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    ctl.zoomT[S.mode] += clamp(d, -120, 120) * 0.0016;
    ctl.idle = 0;
}, { passive: true });
window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (introAt === Infinity) return;
    if (e.code === 'Space') { if (!e.repeat) ctl.hold = true; e.preventDefault(); }
    else if (e.key === '1' || e.key === 'e' || e.key === 'E') setMode('endurance');
    else if (e.key === '2' || e.key === 'r' || e.key === 'R') setMode('ranger');
    else if (e.key === '3' || e.key === 'f' || e.key === 'F') setMode('free');
    else if (e.key === 'm' || e.key === 'M') document.getElementById('mute').click();
    ctl.idle = 0;
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') ctl.hold = false; });
window.addEventListener('blur', () => { ctl.hold = false; ctl.drag = false; down = null; });

// ------------------------------------------------------------------ the gate
const gate = document.getElementById('gate');
sound.scoreAvailable().then((ok) => { if (ok) document.getElementById('scoreOpt').hidden = false; });
document.getElementById('gateGo').addEventListener('click', () => {
    const mode = (document.querySelector('input[name="snd"]:checked') || {}).value || 'organ';
    sound.start(mode);
    if (mode === 'off') { sound.muted = true; document.getElementById('mute').setAttribute('aria-pressed', 'true'); }
    gate.classList.add('is-gone');
    root.classList.remove('g-locked');
    root.classList.add('is-running');
    introAt = time;
    // arrive from far out, settling into the chase
    ctl.zoom.endurance = Math.log(900); ctl.zoomT.endurance = Math.log(170);
    ctl.yaw = -0.7; ctl.tyaw = 0; ctl.pitch = 0.12; ctl.tpitch = 0;
});
document.getElementById('mute').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.setAttribute('aria-label', on ? 'Unmute sound' : 'Mute sound');
    if (!sound.ctx && !sound.scoreEl && !on) { sound.start('organ'); }
    sound.setMuted(on);
});

// ------------------------------------------------------------------ shots: fixed states for frame renders (?shot=name&t=s)
let SHOT_PT = 0;
function applyShot(name) {
    gate.style.display = 'none';
    root.classList.add('is-running');
    root.classList.remove('g-locked');
    if (Q.has('clean')) root.classList.add('g-clean');
    const pt = Q.has('pt') ? parseFloat(Q.get('pt')) : null;
    const Z = (m, d) => { ctl.zoom[m] = ctl.zoomT[m] = Math.log(d); };
    S.tau = 4321.37; S.earth = 2741; S.loop = Q.has('loop') ? parseInt(Q.get('loop'), 10) : 1;
    switch (name) {
        case 'endurance-wide': Z('endurance', 520); ctl.tyaw = ctl.yaw = -0.3; ctl.tpitch = ctl.pitch = 0.06; break;
        case 'endurance-side': Z('endurance', 140); ctl.tyaw = ctl.yaw = 1.2; ctl.tpitch = ctl.pitch = 0.15; break;
        case 'ranger': case 'ranger-near': {
            undock();
            S.mode = 'ranger';
            v1.set(0, 0, 1).applyQuaternion(rgr.Q);
            toHole.copy(endP).negate().normalize();
            frameQ(toHole, q1); q1.multiply(q2.setFromAxisAngle(UP, Math.PI));
            rgr.Q.copy(q1).multiply(q2.setFromEuler(new THREE.Euler(0.12, 0.35, 0)));
            // behind the Endurance (further out), a little high and to the side, so the station sits between us and the hole
            rgr.P.copy(endP).addScaledVector(toHole, -260 / K).addScaledVector(v2.set(0, 1, 0), 24 / K).addScaledVector(v3.crossVectors(toHole, UP).normalize(), -60 / K);
            rgr.want = 1; Z('ranger', name === 'ranger' ? 36 : 30);
            if (name === 'ranger-near') { rgr.P.copy(toHole).multiplyScalar(-4.2); }
            break;
        }
        case 'free': S.mode = 'free'; Z('free', 18); ctl.tyaw = ctl.yaw = 0.3; ctl.tpitch = ctl.pitch = 0.07; break;
        case 'lens': S.mode = 'free'; Z('free', 22); ctl.tyaw = ctl.yaw = 0.3; ctl.tpitch = ctl.pitch = 0.05; pointerIn = true; break;
        case 'free-close': S.mode = 'free'; Z('free', 2.6); ctl.tyaw = ctl.yaw = 0.3; ctl.tpitch = ctl.pitch = 0.05; break;
        case 'return': S.loop = 2; SHOT_PT = pt ?? 1.2; S.pt = SHOT_PT; Z('endurance', 200); ctl.tyaw = ctl.yaw = -0.5; ctl.tpitch = ctl.pitch = 0.05; break;
        case 'eject': case 'streak':
            S.mode = 'free'; Z('free', 6); ctl.tyaw = ctl.yaw = 0.3; ctl.tpitch = ctl.pitch = 0.06;
            free.P.set(6 * Math.sin(0.3), 6 * 0.06, 6 * Math.cos(0.3));
            startDive('free');
            S.pt = pt ?? (name === 'eject' ? 2.2 : 4.8);
            break;
        case 'tess-fall': case 'corridor': case 'open': case 'cooper': case 'watch': case 'fold':
            startTess();
            S.pt = pt ?? { 'tess-fall': 2.6, corridor: 7, open: 14.5, cooper: 20, watch: 31, fold: 35.2 }[name];
            break;
        default: break;
    }
    syncModeUI();
}

// ------------------------------------------------------------------ loop
let raf = 0, last = performance.now(), frames = 0, readyFrames = 0;
function frame(now) {
    raf = requestAnimationFrame(frame);
    const dtMs = Math.min(100, now - last);
    last = now;
    let dt = dtMs / 1000;
    if (SHOT) {
        // shots hold the phase clock still; only the first frames settle springs
        const keepPt = S.pt;
        update(0.0001);
        S.pt = keepPt;
    } else {
        if (FIXED_T == null) time += dt;
        update(dt);
    }
    render();
    sample(dtMs);
    dx += (cx - dx) * 0.35; dy += (cy - dy) * 0.35;
    dot.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    frames++;
    if (cooper.loaded) readyFrames++;
    if (SHOT && readyFrames === 8) window.__gargShot = true;
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; sound.pause(true); ctl.hold = false; }
    else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); sound.pause(false); }
});
window.addEventListener('resize', resize);
resize();
if (SHOT) { time = FIXED_T ?? 10; root.classList.add('g-shot'); applyShot(SHOT); }
else { root.classList.add('g-locked'); }
syncModeUI();
raf = requestAnimationFrame(frame);

// the shared nav types its home-page line on load; this page keeps its own
const navMsg = document.querySelector('.ap-nav__msg');
if (navMsg) {
    const LINE = 'Lab / Gargantua';
    new MutationObserver(() => { if (/^Creative developer/.test(navMsg.textContent)) navMsg.textContent = LINE; })
        .observe(navMsg, { childList: true, characterData: true, subtree: true });
}

window.__G_SET_PT__ = (pt) => { S.pt = pt; S.phase = 'tess'; world = 2; };
window.__garg = {
    get tier() { return TIERS[tier].name; }, get warmed() { return warmed; }, gpu: gpuName, get dyn() { return dyn; }, renderer, sound, S, ctl, rgr,
    astro: cooper.stats, setMode, startDive, endurance, ranger, shipCam, focus, endP, tessScene, tKey, cooper, lusionTess
};
