// The Snitch: a walnut of gold with engraved seams, wings beating faster than the frame rate (drawn as three ghosted
// phases so they blur like they would on film), a flare that keeps it findable at 300 m, and a gold thread behind
// it. It flies like a hummingbird with opinions: lazy loops while you are far, jinks and bursts when you are close,
// and it tires if you stay on it.
import * as THREE from 'three';
import { NOISE, ATMOS, uniforms } from './atmos.js';
import { clamp, rng } from './util.js';

const bodyVert = /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec3 vL;
void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vL = position;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const bodyFrag = /* glsl */`
${ATMOS}
${NOISE}
uniform float uFlash;
varying vec3 vW; varying vec3 vN; varying vec3 vL;
void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    vec3 r = reflect(-v, n);
    vec3 gold = vec3(1.0, 0.66, 0.22);
    vec3 lp = normalize(vL);
    // engraved seams: a meridian band and swirling filigree
    float seam = 1.0 - smoothstep(0.0, 0.06, abs(lp.x));
    float fil = smoothstep(0.88, 0.97, sin(atan(lp.y, lp.z) * 6.0 + lp.x * 9.0) * 0.5 + 0.5) * (1.0 - seam);
    float fres = 0.55 + 0.45 * pow(1.0 - max(dot(n, v), 0.0), 2.0);
    vec3 env = skyBand(r) * 1.3 + SUNCOL * pow(max(dot(r, uSunDir), 0.0), 120.0) * 14.0;
    float ao = 0.55 + 0.45 * max(n.y, 0.0);
    vec3 col = gold * env * fres * ao * (1.0 - seam * 0.7 - fil * 0.45);
    col += gold * 0.12 + gold * uFlash * 8.0;
    gl_FragColor = vec4(applyFog(col, vW), 1.0);
}`;

const wingVert = /* glsl */`
uniform float uTime;
attribute float aGhost; attribute float aSide;
varying vec2 vUv; varying float vGhost; varying vec3 vW;
void main() {
    float f = 26.0;
    float ph = uTime * f * 6.2832 + aGhost * 0.9;
    float ang = aSide * (sin(ph) * 1.15 + 0.25);
    vec3 p = position;
    p.x *= aSide;
    float c = cos(ang), s = sin(ang);
    p = vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
    p.x += aSide * 0.13;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz; vUv = uv; vGhost = aGhost;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const wingFrag = /* glsl */`
${ATMOS}
varying vec2 vUv; varying float vGhost; varying vec3 vW;
void main() {
    // a feathered blade: rounded leading edge, scalloped trailing edge, a few veins
    vec2 q = vUv;
    float span = q.x;
    float chord = (q.y - 0.5) * 2.0;
    float outline = (1.0 - span * span * 0.35) * (0.35 + 0.65 * sin(span * 3.0 + 0.2));
    float scallop = 0.08 * (0.5 + 0.5 * cos(span * 34.0));
    float inside = step(abs(chord), outline - scallop * step(0.0, -chord));
    if (inside < 0.5) discard;
    float vein = smoothstep(0.85, 1.0, cos(span * 34.0)) * step(chord, 0.0) * 0.6;
    float a = (0.32 - vGhost * 0.09) * (0.65 + vein * 0.5);
    vec3 v = normalize(cameraPosition - vW);
    vec3 col = vec3(0.62, 0.60, 0.55) * (0.35 + 0.8 * pow(max(dot(-v, uSunDir), 0.0), 3.0)) + vec3(1.0, 0.7, 0.3) * 0.12;
    gl_FragColor = vec4(col * a, a);
}`;

const glowVert = /* glsl */`
uniform float uSize;
varying vec2 vUv; varying float vD;
void main() {
    vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float d = -c.z;
    float sz = max(uSize, d * 0.02);
    c.xy += position.xy * sz;
    c.z += 0.25;
    vUv = position.xy; vD = d;
    gl_Position = projectionMatrix * c;
}`;
const glowFrag = /* glsl */`
uniform float uGain; uniform float uTime;
varying vec2 vUv; varying float vD;
void main() {
    float r = length(vUv);
    float near = 0.25 + 0.75 * smoothstep(1.5, 9.0, vD);
    float core = exp(-r * r * 70.0) * 3.2 + exp(-r * r * 10.0) * 0.35;
    float streak = exp(-abs(vUv.y) * 110.0) * exp(-abs(vUv.x) * 3.0) * 0.9;
    float pulse = 0.85 + 0.15 * sin(uTime * 9.0);
    vec3 col = vec3(1.0, 0.68, 0.25) * (core + streak) * pulse * uGain * near;
    gl_FragColor = vec4(col, 1.0);
}`;

const trailVert = /* glsl */`
attribute float aT;
varying float vT; varying float vX; varying float vD;
void main() { vT = aT; vX = uv.x; vD = distance(position, cameraPosition); gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`;
const trailFrag = /* glsl */`
uniform float uGain;
varying float vT; varying float vX; varying float vD;
void main() {
    float a = pow(1.0 - vT, 2.0) * smoothstep(0.0, 0.12, vT) * (1.0 - abs(vX - 0.5) * 2.0) * uGain;
    a *= 0.12 + 0.88 * smoothstep(3.0, 14.0, vD);
    gl_FragColor = vec4(vec3(1.0, 0.62, 0.2) * a * 1.6, 1.0);
}`;

const burstVert = /* glsl */`
uniform float uT; uniform vec3 uO; uniform float uScale;
attribute vec4 aDir;
varying float vA;
void main() {
    float t = uT;
    float sp = aDir.w;
    vec3 p = uO + aDir.xyz * sp * (1.0 - exp(-t * 2.6)) / 2.6;
    p.y -= 1.6 * t * t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float life = clamp(1.0 - t / (1.1 + fract(sp * 7.13) * 1.2), 0.0, 1.0);
    vA = life * life;
    gl_PointSize = clamp((0.5 + fract(sp * 3.7)) * uScale / -mv.z, 1.5, 9.0) * (0.4 + 0.6 * life);
    vA *= 0.6 + 0.4 * sin(t * 30.0 + sp * 40.0);
    gl_Position = projectionMatrix * mv;
}`;
const burstFrag = /* glsl */`
varying float vA;
void main() {
    vec2 q = gl_PointCoord - 0.5;
    float a = exp(-dot(q, q) * 16.0) * vA;
    gl_FragColor = vec4(vec3(1.0, 0.7, 0.28) * a * 7.0, 1.0);
}`;

export function createSnitch() {
    const group = new THREE.Group();
    const flash = { value: 0 };
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), new THREE.ShaderMaterial({
        vertexShader: bodyVert, fragmentShader: bodyFrag, uniforms: uniforms({ uFlash: flash }),
    }));
    body.scale.set(1, 1, 1.08);
    group.add(body);

    // wings: 2 sides x 3 ghost phases in one geometry
    const wParts = [];
    for (const side of [-1, 1]) for (let gh = 0; gh < 3; gh++) {
        const g = new THREE.PlaneGeometry(0.52, 0.18, 8, 1).toNonIndexed();
        g.translate(0.26, 0, 0);
        g.rotateX(-Math.PI / 2);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) - pos.getX(i) * 0.25);
        const n = pos.count;
        g.setAttribute('aGhost', new THREE.BufferAttribute(new Float32Array(n).fill(gh), 1));
        g.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(n).fill(side), 1));
        g.deleteAttribute('normal');
        wParts.push(g);
    }
    const wGeo = new THREE.BufferGeometry();
    ['position', 'uv', 'aGhost', 'aSide'].forEach((name) => {
        const size = wParts[0].attributes[name].itemSize;
        const arr = new Float32Array(wParts.reduce((s, p) => s + p.attributes[name].array.length, 0));
        let o = 0; wParts.forEach((p) => { arr.set(p.attributes[name].array, o); o += p.attributes[name].array.length; });
        wGeo.setAttribute(name, new THREE.BufferAttribute(arr, size));
    });
    // blades lie in XZ with the hinge on local Z (the Snitch's forward); the shader beats them about it
    const wingMat = new THREE.ShaderMaterial({
        vertexShader: wingVert,
        fragmentShader: wingFrag, uniforms: uniforms(), transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const wings = new THREE.Mesh(wGeo, wingMat);
    wings.frustumCulled = false;
    group.add(wings);

    const glowU = uniforms({ uSize: { value: 0.55 }, uGain: { value: 1 } });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        vertexShader: glowVert, fragmentShader: glowFrag, uniforms: glowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.frustumCulled = false; glow.renderOrder = 8;
    group.add(glow);

    // trail
    const TN = 14;
    const hist = []; for (let i = 0; i < TN; i++) hist.push(new THREE.Vector3());
    const tGeo = new THREE.BufferGeometry();
    const tPos = new Float32Array(TN * 6), tT = new Float32Array(TN * 2), tUv = new Float32Array(TN * 4), tIdx = [];
    for (let i = 0; i < TN; i++) {
        tT[i * 2] = tT[i * 2 + 1] = i / (TN - 1); tUv[i * 4 + 2] = 1;
        if (i < TN - 1) { const a = i * 2; tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
    tGeo.setAttribute('aT', new THREE.BufferAttribute(tT, 1));
    tGeo.setAttribute('uv', new THREE.BufferAttribute(tUv, 2));
    tGeo.setIndex(tIdx);
    const trailU = { uGain: { value: 0.6 } };
    const trail = new THREE.Mesh(tGeo, new THREE.ShaderMaterial({
        vertexShader: trailVert, fragmentShader: trailFrag, uniforms: trailU, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    trail.frustumCulled = false; trail.renderOrder = 7;

    // catch burst
    const BN = 420;
    const bDir = new Float32Array(BN * 4);
    const br = rng(5);
    for (let i = 0; i < BN; i++) {
        const u = br() * 2 - 1, a = br() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        bDir.set([Math.cos(a) * s, u * 0.8 + 0.15, Math.sin(a) * s, 2 + br() * br() * 13], i * 4);
    }
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BN * 3), 3));
    bGeo.setAttribute('aDir', new THREE.BufferAttribute(bDir, 4));
    const burstU = { uT: { value: 99 }, uO: { value: new THREE.Vector3() }, uScale: { value: 60 } };
    const burst = new THREE.Points(bGeo, new THREE.ShaderMaterial({
        vertexShader: burstVert, fragmentShader: burstFrag, uniforms: burstU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    burst.frustumCulled = false; burst.renderOrder = 9;

    // ---------------------------------------------------------------- flight
    const R = rng(31);
    const S = {
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: new THREE.Vector3(),
        retarget: 0, jink: 0.5, fatigue: 0, cooldown: 0, escape: 0, heading: new THREE.Vector3(0, 0, 1),
    };
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), desired = new THREE.Vector3();
    let primed = false;

    function place(p, v) { S.pos.copy(p); S.vel.copy(v || tmp.set(0, 0, 0)); S.target.copy(p); S.retarget = 0; primed = false; }

    function update(dt, time, player, world) {
        const toP = tmp.subVectors(S.pos, player.pos);
        const dist = toP.length();
        S.cooldown = Math.max(0, S.cooldown - dt);
        S.retarget -= dt;
        if (S.escape > 0) {
            S.escape -= dt;
        } else {
            if (S.retarget <= 0 || S.pos.distanceTo(S.target) < 22) {
                world.pickWaypoint(R, player, S.target);
                S.retarget = 5 + R() * 6;
            }
            desired.subVectors(S.target, S.pos).normalize();
            const near = clamp(1 - dist / 46);
            if (near > 0) desired.addScaledVector(toP.normalize(), near * 1.1 * (1 - S.fatigue * 0.75)).normalize();
            S.fatigue = clamp(S.fatigue + (dist < 45 ? dt * 0.11 : -dt * 0.018));
            let spd;
            if (dist > 150) spd = 9;
            else if (dist > 60) spd = 16;
            else spd = Math.min(32 - S.fatigue * 10, Math.max(15, player.speed * (0.84 - S.fatigue * 0.36)));
            const k = 1 - Math.exp(-dt * 2.6);
            S.vel.lerp(desired.multiplyScalar(spd), k);
            S.jink -= dt;
            if (S.jink <= 0) {
                S.jink = 0.45 + R() * (dist < 50 ? 0.8 : 1.6);
                tmp2.set(R() - 0.5, (R() - 0.5) * 0.8, R() - 0.5).normalize();
                S.vel.addScaledVector(tmp2, ((dist < 50 ? 7 : 5) + R() * 6) * (1 - S.fatigue * 0.65));
            }
        }
        // hummingbird hover jitter
        S.pos.addScaledVector(S.vel, dt);
        S.pos.x += Math.sin(time * 13.1) * 0.012; S.pos.y += Math.sin(time * 17.3 + 1) * 0.015;
        const g = world.ground(S.pos.x, S.pos.z);
        if (S.pos.y < g + 8) { S.pos.y += (g + 8 - S.pos.y) * Math.min(1, dt * 6); S.vel.y = Math.max(S.vel.y, 2); }
        if (S.pos.y > 420) S.vel.y -= dt * 20;
        world.pushOut(S.pos, 1.5);

        if (S.vel.lengthSq() > 0.5) S.heading.lerp(tmp2.copy(S.vel).normalize(), 1 - Math.exp(-dt * 8)).normalize();
        group.position.copy(S.pos);
        group.lookAt(tmp2.copy(S.pos).add(S.heading));

        // trail
        if (!primed) { for (let i = 0; i < TN; i++) hist[i].copy(S.pos); primed = true; }
        for (let i = TN - 1; i > 0; i--) hist[i].copy(hist[i - 1]);
        hist[0].copy(S.pos);
        const cam = world.camera.position;
        for (let i = 0; i < TN; i++) {
            const a = hist[Math.max(0, i - 1)], b = hist[Math.min(TN - 1, i + 1)];
            tmp2.subVectors(a, b);
            if (tmp2.lengthSq() < 1e-8) tmp2.set(1, 0, 0);
            const right = desired.crossVectors(tmp2, tmp.subVectors(cam, hist[i])).normalize();
            const w = 0.035 * (1 - i / TN) + 0.006;
            tPos[i * 6] = hist[i].x - right.x * w; tPos[i * 6 + 1] = hist[i].y - right.y * w; tPos[i * 6 + 2] = hist[i].z - right.z * w;
            tPos[i * 6 + 3] = hist[i].x + right.x * w; tPos[i * 6 + 4] = hist[i].y + right.y * w; tPos[i * 6 + 5] = hist[i].z + right.z * w;
        }
        tGeo.attributes.position.needsUpdate = true;

        flash.value = Math.max(0, flash.value - dt * 2.5);
        burstU.uT.value += dt;
        glowU.uGain.value = 1 + flash.value * 3;
        return dist;
    }

    // caught: burst where it was, then it bolts
    function caught(player) {
        burstU.uO.value.copy(S.pos);
        burstU.uT.value = 0;
        flash.value = 1;
        S.cooldown = 3.2; S.escape = 1.6; S.fatigue = 0;
        tmp.copy(player.fwd).multiplyScalar(0.6).add(tmp2.set(R() - 0.5, 0.7 + R() * 0.4, R() - 0.5)).normalize();
        S.vel.copy(tmp).multiplyScalar(48);
        S.retarget = 0;
    }

    return { group, trail, burst, S, update, caught, place, burstU };
}
