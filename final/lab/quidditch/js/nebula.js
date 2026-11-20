// Atmospheric Void, Volumetric Nebula, and Distant Lightning Mountains
// Matches Robert Borghesi's Dracarys environment: deep space void (#020408), central soft smoke nebula,
// and distant Highland mountain silhouettes illuminated by lightning.
import * as THREE from 'three';

// ------------------------------------------------------------------ Volumetric Smoke / Nebula Shaders
const smokeVert = /* glsl */`
    attribute float aScale;
    attribute float aRotation;
    attribute float aPhase;
    uniform float uTime;
    varying float vAlpha;
    varying vec2 vUv;
    varying float vRotation;

    void main() {
        vRotation = aRotation + uTime * 0.02 * sin(aPhase);
        vec3 pos = position;
        pos.x += sin(uTime * 0.12 + aPhase) * 0.3;
        pos.y += cos(uTime * 0.15 + aPhase) * 0.25;
        pos.z += sin(uTime * 0.10 + aPhase * 2.0) * 0.25;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = aScale * (260.0 / -mvPos.z);
        // Soft, organic background nebula
        vAlpha = clamp(0.08 + sin(uTime * 0.25 + aPhase) * 0.03, 0.04, 0.16);
    }
`;

const smokeFrag = /* glsl */`
    precision highp float;
    varying float vAlpha;
    varying float vRotation;
    uniform vec3 uColor;
    uniform float uLightning;

    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float s = sin(vRotation), c = cos(vRotation);
        uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

        float dist = length(uv);
        if (dist > 0.5) discard;

        float smoke = smoothstep(0.5, 0.0, dist) * pow(1.0 - dist * 2.0, 1.6);
        vec3 col = uColor + vec3(0.06, 0.10, 0.18) * uLightning;

        gl_FragColor = vec4(col, smoke * vAlpha);
    }
`;

// ------------------------------------------------------------------ Distant Highland Mountain Silhouettes
const mountainVert = /* glsl */`
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = wPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * wPos;
    }
`;

const mountainFrag = /* glsl */`
    precision highp float;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    uniform float uLightning;

    void main() {
        float heightFactor = smoothstep(-5.0, 35.0, vWorldPos.y);
        vec3 baseFog = vec3(0.005, 0.008, 0.015);
        vec3 rimLight = vec3(0.10, 0.16, 0.28) * uLightning * heightFactor;
        vec3 col = baseFog + rimLight;

        float alpha = smoothstep(0.0, 10.0, vWorldPos.y) * 0.8;
        gl_FragColor = vec4(col, alpha);
    }
`;

export function createNebulaVoid() {
    const group = new THREE.Group();

    // 1. Central Volumetric Smoke / Nebula Cloud
    const smokeCount = 110;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    const smokeScale = new Float32Array(smokeCount);
    const smokeRot = new Float32Array(smokeCount);
    const smokePhase = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
        const r = 0.5 + Math.random() * 4.0;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI * 0.7;

        smokePos[i * 3] = r * Math.cos(phi) * Math.cos(theta);
        smokePos[i * 3 + 1] = 0.9 + r * Math.sin(phi) * 0.5;
        smokePos[i * 3 + 2] = -0.4 + r * Math.cos(phi) * Math.sin(theta) * 0.8;

        smokeScale[i] = 16.0 + Math.random() * 22.0;
        smokeRot[i] = Math.random() * Math.PI * 2;
        smokePhase[i] = Math.random() * Math.PI * 2;
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    smokeGeo.setAttribute('aScale', new THREE.BufferAttribute(smokeScale, 1));
    smokeGeo.setAttribute('aRotation', new THREE.BufferAttribute(smokeRot, 1));
    smokeGeo.setAttribute('aPhase', new THREE.BufferAttribute(smokePhase, 1));

    const smokeMat = new THREE.ShaderMaterial({
        vertexShader: smokeVert,
        fragmentShader: smokeFrag,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(0x0a1628) },
            uLightning: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    group.add(smokePoints);

    // 2. Distant Highland Mountain Silhouettes
    const mtnGeo = new THREE.CylinderGeometry(180, 220, 60, 48, 12, true);
    const mtnPos = mtnGeo.attributes.position.array;
    for (let i = 0; i < mtnPos.length; i += 3) {
        const y = mtnPos[i + 1];
        if (y > 0) {
            const angle = Math.atan2(mtnPos[i + 2], mtnPos[i]);
            const ridge = Math.sin(angle * 7.0) * 10.0 + Math.cos(angle * 13.0) * 6.0 + Math.sin(angle * 29.0) * 3.0;
            mtnPos[i + 1] += ridge;
        }
    }
    mtnGeo.computeVertexNormals();

    const mtnMat = new THREE.ShaderMaterial({
        vertexShader: mountainVert,
        fragmentShader: mountainFrag,
        uniforms: {
            uLightning: { value: 0 }
        },
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false
    });

    const mtnMesh = new THREE.Mesh(mtnGeo, mtnMat);
    mtnMesh.position.set(0, 10, 0);
    group.add(mtnMesh);

    let lightningIntensity = 0;
    let nextLightningTime = 4.0 + Math.random() * 5.0;

    return {
        group,
        update: (time, dt) => {
            smokeMat.uniforms.uTime.value = time;

            if (time > nextLightningTime) {
                lightningIntensity = 1.0;
                nextLightningTime = time + 6.0 + Math.random() * 8.0;
            }
            lightningIntensity = THREE.MathUtils.damp(lightningIntensity, 0.0, 4.5, dt);

            smokeMat.uniforms.uLightning.value = lightningIntensity;
            mtnMat.uniforms.uLightning.value = lightningIntensity;
        }
    };
}
