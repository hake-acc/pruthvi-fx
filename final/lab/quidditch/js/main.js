// Quidditch / Patronus: Studio-Grade Interactive WebGL Art Piece
// Built in the aesthetic tradition of Robert Borghesi's Dracarys (Awwwards SOTD / FWA).
// Features:
// 1. Luminescent 3D GPGPU-style particle swarm of Harry Potter & The Firebolt (16,000+ points).
// 2. Deep atmospheric void (#020408), central volumetric nebula, and radial chromatic flare rays.
// 3. Chromatic dispersion liquid mirror floor with hydrodynamic ripples and Celtic Hogwarts runes.
// 4. Floating 3D geometric constellation polyhedra drifting with glowing vertex nodes.
// 5. Minimalist luxury editorial HUD with running timecode (00:19:185 ■ HOVER THE PATRONUS).
import * as THREE from 'three';
import { createPatronusSwarm } from './patronus.js';
import { createNebulaVoid } from './nebula.js';
import { createConstellations } from './constellations.js';
import { createChromaticWater } from './water.js';
import { Post } from './post.js';
import { Sound } from './audio.js';
import { clamp, lerp, damp } from './util.js';

const Q = new URLSearchParams(location.search);
const SHOT = Q.get('shot');
const root = document.documentElement;

// ------------------------------------------------------------------ Renderer
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: !!SHOT,
    stencil: false
});
renderer.setClearColor(0x020408, 1);
renderer.toneMapping = THREE.NoToneMapping;
const gl = renderer.getContext();

const TIERS = [
    { name: 'floor', dpr: 0.65, refl: 0.25 },
    { name: 'low', dpr: 0.85, refl: 0.35 },
    { name: 'mid', dpr: 1.0, refl: 0.5 },
    { name: 'high', dpr: 1.5, refl: 0.65 },
];
let tier = 2;

// ------------------------------------------------------------------ Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020408);
scene.fog = new THREE.FogExp2(0x020408, 0.015);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 1.4, 7.2);

// Dual-Camera Reflection Target
const mirrorCam = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
const rtRefl = new THREE.WebGLRenderTarget(512, 512, {
    type: THREE.HalfFloatType,
    depthBuffer: true
});

// ------------------------------------------------------------------ Creative Elements
const nebula = createNebulaVoid();
const water = createChromaticWater();
const patronus = createPatronusSwarm();
const constellations = createConstellations();

scene.add(nebula.group);
scene.add(water.mesh);
scene.add(patronus.group);
scene.add(constellations.group);

water.uniforms.tRefl.value = rtRefl.texture;
water.uniforms.uHasRefl.value = 1.0;

// Post Processing Chain
const post = new Post(renderer);
const sound = new Sound();

let W = 0, H = 0;
function resize() {
    const T = TIERS[tier];
    const dpr = Math.min(window.devicePixelRatio || 1, T.dpr);
    W = Math.max(2, Math.round(window.innerWidth * dpr));
    H = Math.max(2, Math.round(window.innerHeight * dpr));
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';

    camera.aspect = W / H;
    camera.updateProjectionMatrix();

    mirrorCam.aspect = W / H;
    mirrorCam.updateProjectionMatrix();

    post.setSize(W, H, 5, 2, true);

    const rw = Math.max(2, Math.round(W * T.refl));
    const rh = Math.max(2, Math.round(H * T.refl));
    rtRefl.setSize(rw, rh);
}

// ------------------------------------------------------------------ Turntable Orbit & Interaction State
const orbit = {
    yaw: 0.45,
    pitch: 0.10,
    dist: 7.2,
    tyaw: 0.45,
    tpitch: 0.10,
    tdist: 7.2,
    drag: false,
    downX: 0,
    downY: 0,
    idle: 0,
};

const dot = document.querySelector('.site-cursor-dot');
let cx = -100, cy = -100;
let pointerX = 0, pointerY = 0;
let hoverAmount = 0;
let isHoveringPatronus = false;

// Water Raycasting
const raycaster = new THREE.Raycaster();
const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const lakeHit = new THREE.Vector3();
let cursorOnWater = false;
let clickPulse = 0;

function raycastLake(clientX, clientY) {
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const hit = raycaster.ray.intersectPlane(waterPlane, lakeHit);
    if (hit) {
        cursorOnWater = true;
    } else {
        cursorOnWater = false;
    }

    const centerDist = Math.hypot(ndcX, ndcY);
    isHoveringPatronus = centerDist < 0.38;
}

window.addEventListener('pointermove', (e) => {
    cx = e.clientX;
    cy = e.clientY;
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = -(e.clientY / window.innerHeight) * 2 + 1;
    if (dot) dot.classList.add('is-on');

    if (orbit.drag) {
        const dx = e.clientX - orbit.downX;
        const dy = e.clientY - orbit.downY;
        orbit.downX = e.clientX;
        orbit.downY = e.clientY;
        orbit.tyaw -= dx * 0.0055;
        orbit.tpitch = clamp(orbit.tpitch + dy * 0.0055, -0.25, 0.85);
        orbit.idle = 0;
    }

    raycastLake(e.clientX, e.clientY);
}, { passive: true });

window.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('a, button, label, fieldset')) return;
    orbit.drag = true;
    orbit.downX = e.clientX;
    orbit.downY = e.clientY;
    orbit.idle = 0;
    clickPulse = 1.0;
    raycastLake(e.clientX, e.clientY);
    if (cursorOnWater) {
        water.addRipple(lakeHit.x, lakeHit.z, 2.2, time);
    }
});

window.addEventListener('pointerup', () => { orbit.drag = false; });
window.addEventListener('pointercancel', () => { orbit.drag = false; });

window.addEventListener('wheel', (e) => {
    orbit.tdist = clamp(orbit.tdist + Math.sign(e.deltaY) * 0.55, 4.2, 11.5);
    orbit.idle = 0;
}, { passive: true });

// ------------------------------------------------------------------ Running Timecode (00:19:185)
const timecodeEl = document.getElementById('timecode');
function updateTimecode(tSec) {
    if (!timecodeEl) return;
    const m = Math.floor(tSec / 60);
    const s = Math.floor(tSec % 60);
    const ms = Math.floor((tSec % 1) * 1000);
    const str = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
    timecodeEl.textContent = str;
}

// ------------------------------------------------------------------ Animation Loop
let time = 0;
let started = false;
let raf = 0, last = performance.now();

function frame(now) {
    raf = requestAnimationFrame(frame);
    const dtMs = Math.min(100, now - last);
    last = now;
    const dt = dtMs / 1000;
    time += dt;

    orbit.idle += dt;
    if (!orbit.drag && orbit.idle > 3.0) {
        orbit.tyaw += dt * 0.08;
    }

    orbit.yaw = damp(orbit.yaw, orbit.tyaw, 5.0, dt);
    orbit.pitch = damp(orbit.pitch, orbit.tpitch, 5.0, dt);
    orbit.dist = damp(orbit.dist, orbit.tdist, 5.0, dt);

    const cp = Math.cos(orbit.pitch);
    camera.position.x = Math.sin(orbit.yaw) * cp * orbit.dist;
    camera.position.y = Math.sin(orbit.pitch) * orbit.dist + 1.1;
    camera.position.z = Math.cos(orbit.yaw) * cp * orbit.dist;
    camera.lookAt(0, 0.75, 0);

    const bank = Math.sin(time * 0.9) * 0.16 + pointerX * 0.20;
    const pitch = Math.cos(time * 0.8) * 0.07 + pointerY * 0.12;

    hoverAmount = damp(hoverAmount, isHoveringPatronus ? 1.0 : 0.0, 6.0, dt);
    clickPulse = damp(clickPulse, 0.0, 3.5, dt);

    nebula.update(time, dt);
    constellations.update(time, dt);
    patronus.update(time, dt, bank, pitch, lakeHit, hoverAmount);
    water.update(time, dt, lakeHit.x, lakeHit.z, cursorOnWater, clickPulse);

    // Mirrored Camera Render for Chromatic Dispersion Reflection
    mirrorCam.position.copy(camera.position);
    mirrorCam.position.y = -camera.position.y;
    mirrorCam.quaternion.copy(camera.quaternion);
    mirrorCam.quaternion.x = -mirrorCam.quaternion.x;
    mirrorCam.quaternion.z = -mirrorCam.quaternion.z;

    water.mesh.visible = false;
    renderer.setRenderTarget(rtRefl);
    renderer.clear();
    renderer.render(scene, mirrorCam);
    water.mesh.visible = true;

    // Main Scene Render & Post-Processing
    renderer.setRenderTarget(post.rtScene);
    renderer.clear();
    renderer.render(scene, camera);

    // Dracarys post-processing grade
    post.u.uTime.value = time;
    post.u.uExposure.value = 1.0;
    post.u.uBloom.value = 0.40; // Crisp, luminous particle glow
    post.u.uFrost.value = 0.0;
    post.u.uStreak.value = 0.18;
    post.u.uCA.value = 0.007; // Spectral chromatic aberration
    post.u.uLetter.value = 0.0;
    post.u.uMist.value = 0.0;

    const centerScreen = new THREE.Vector2(0.5, 0.5);
    post.finish(1.15, centerScreen, 0.0);

    updateTimecode(time);

    if (dot) {
        dot.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
        if (isHoveringPatronus) dot.classList.add('is-hover');
        else dot.classList.remove('is-hover');
    }
}

// ------------------------------------------------------------------ Gate & Audio Controls
const gate = document.getElementById('gate');
document.getElementById('gateGo')?.addEventListener('click', () => {
    const mode = (document.querySelector('input[name="snd"]:checked') || {}).value || 'on';
    sound.start(mode !== 'off');
    if (mode === 'off') document.getElementById('mute')?.setAttribute('aria-pressed', 'true');
    gate.classList.add('is-gone');
    root.classList.add('is-running');
    started = true;
});

document.getElementById('mute')?.addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.setAttribute('aria-label', on ? 'Unmute sound' : 'Mute sound');
    if (!sound.ctx && !on) sound.start(true);
    sound.setMuted(on);
});

window.addEventListener('resize', resize);
resize();

raf = requestAnimationFrame(frame);

const navMsg = document.querySelector('.ap-nav__msg');
if (navMsg) {
    const LINE = 'Lab / Quidditch';
    new MutationObserver(() => { if (/^Creative developer/.test(navMsg.textContent)) navMsg.textContent = LINE; })
        .observe(navMsg, { childList: true, characterData: true, subtree: true });
}

window.__q = {
    renderer, camera, patronus, water, constellations, nebula, sound,
    setTier(t) { tier = clamp(t, 0, 3); resize(); }
};
