// Air you can see: streaks anchored in the world (so parallax is honest), wrapped in a box that rides with the lens,
// stretched along the broom's velocity by a 1/16 s shutter. Nearly invisible at cruise, a storm on the boost.
import * as THREE from 'three';
import { rng } from './util.js';

const vert = /* glsl */`
attribute vec4 aLine;
uniform vec3 uCam; uniform vec3 uFlow; uniform vec3 uDir; uniform float uLen; uniform float uGain;
varying float vA; varying float vT;
void main() {
    vec3 box = vec3(36.0, 22.0, 36.0);
    vec3 rel = mod(aLine.xyz + uFlow, box) - box * 0.5;
    vec3 a = uCam + rel;
    vec3 e = a - uDir * uLen * (0.6 + aLine.w * 0.8) * position.y;
    vec3 toCam = normalize(uCam - e);
    vec3 side = normalize(cross(uDir, toCam));
    e += side * position.x * (0.012 + aLine.w * 0.02);
    float r = length(rel);
    vA = smoothstep(1.8, 5.0, r) * (1.0 - smoothstep(12.0, 18.0, r)) * uGain * (0.4 + aLine.w * 0.6);
    vT = position.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(e, 1.0);
}`;
const frag = /* glsl */`
varying float vA; varying float vT;
void main() {
    float a = vA * sin(vT * 3.1416);
    gl_FragColor = vec4(vec3(0.75, 0.78, 0.86) * a, 1.0);
}`;

export function createSpeedLines(count = 260) {
    const base = new THREE.PlaneGeometry(1, 1, 1, 4);
    base.translate(0, 0.5, 0);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    const r = rng(9);
    const arr = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) arr.set([r() * 36, r() * 22, r() * 36, r()], i * 4);
    g.setAttribute('aLine', new THREE.InstancedBufferAttribute(arr, 4));
    g.instanceCount = count;
    const u = { uCam: { value: new THREE.Vector3() }, uFlow: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(0, 0, 1) }, uLen: { value: 1 }, uGain: { value: 0 } };
    const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
        vertexShader: vert, fragmentShader: frag, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    mesh.frustumCulled = false;
    mesh.renderOrder = 10;
    const flow = u.uFlow.value;
    function update(dt, camPos, vel, speed, boost) {
        u.uCam.value.copy(camPos);
        flow.addScaledVector(vel, -dt);
        flow.set(((flow.x % 36) + 36) % 36, ((flow.y % 22) + 22) % 22, ((flow.z % 36) + 36) % 36);
        if (speed > 0.1) u.uDir.value.copy(vel).divideScalar(speed);
        u.uLen.value = speed * 0.065;
        u.uGain.value = 0.03 + Math.max(0, (speed - 28) / 26) * 0.38 + boost * 0.08;
    }
    return { mesh, update };
}
