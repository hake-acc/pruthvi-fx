// Chromatic Dispersion Liquid Mirror Floor & Celtic Hogwarts Runes
// Matches Robert Borghesi's Dracarys: Dark obsidian reflective mirror plane with true spectral RGB
// chromatic dispersion (red, yellow, green, cyan separation in reflection) and hydrodynamic mouse wake ripples.
import * as THREE from 'three';

const waterVert = /* glsl */`
    uniform float uTime;
    uniform vec4 uCursor; // x, z, active, pulse
    uniform vec4 uRipples[8]; // x, z, timeStarted, intensity

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec4 vScreenPos;
    varying float vRippleTotal;

    void main() {
        vUv = uv;
        vec3 pos = position;

        float totalDisp = 0.0;

        // Interactive mouse wake ripples
        for (int i = 0; i < 8; i++) {
            if (uRipples[i].w > 0.01) {
                float age = uTime - uRipples[i].z;
                if (age > 0.0 && age < 3.5) {
                    float dist = length(pos.xz - uRipples[i].xy);
                    float waveSpeed = 3.8;
                    float waveFront = age * waveSpeed;
                    float waveWidth = 1.0;
                    float diff = dist - waveFront;
                    float env = exp(-age * 1.5) * exp(-diff * diff / (waveWidth * waveWidth));
                    float ripple = sin(diff * 6.28 * 0.9) * env * uRipples[i].w * 0.08;
                    totalDisp += ripple;
                }
            }
        }

        // Direct cursor dip
        if (uCursor.z > 0.5) {
            float distToCur = length(pos.xz - uCursor.xy);
            totalDisp += sin(distToCur * 6.0 - uTime * 5.0) * exp(-distToCur * 2.5) * 0.035;
        }

        // Gentle deep swells
        totalDisp += sin(pos.x * 0.4 + uTime * 1.2) * cos(pos.z * 0.4 + uTime * 0.9) * 0.015;

        pos.y += totalDisp;
        vRippleTotal = totalDisp;

        float eps = 0.08;
        float dx = (sin((pos.x + eps) * 0.4 + uTime * 1.2) - sin((pos.x - eps) * 0.4 + uTime * 1.2)) * 0.015;
        float dz = (cos((pos.z + eps) * 0.4 + uTime * 0.9) - cos((pos.z - eps) * 0.4 + uTime * 0.9)) * 0.015;
        vec3 norm = normalize(vec3(-dx * 5.0, 1.0, -dz * 5.0));
        vNormal = norm;

        vec4 wPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = wPos.xyz;
        vScreenPos = projectionMatrix * viewMatrix * wPos;
        gl_Position = vScreenPos;
    }
`;

const waterFrag = /* glsl */`
    precision highp float;

    uniform sampler2D tRefl;
    uniform float uHasRefl;
    uniform float uTime;
    uniform vec4 uCursor;
    uniform vec4 uRipples[8];

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec4 vScreenPos;
    varying float vRippleTotal;

    float runePattern(vec2 p) {
        float r = length(p);
        float a = atan(p.y, p.x);

        float ring1 = smoothstep(0.035, 0.0, abs(r - 2.2));
        float ring2 = smoothstep(0.028, 0.0, abs(r - 3.8));
        float ring3 = smoothstep(0.040, 0.0, abs(r - 5.8));
        float ring4 = smoothstep(0.020, 0.0, abs(r - 7.6));

        float spoke = smoothstep(0.025, 0.0, abs(sin(a * 12.0))) * step(1.2, r) * step(r, 7.6);
        float rosette = smoothstep(0.028, 0.0, abs(r - 3.8 - sin(a * 24.0) * 0.28));

        return ring1 * 0.6 + ring2 * 0.7 + ring3 * 0.8 + ring4 * 0.5 + spoke * 0.3 + rosette * 0.5;
    }

    void main() {
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 N = normalize(vNormal);

        vec2 projCoord = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;
        vec2 distort = N.xz * 0.03;

        // ------------------------------------------------------------------
        // SPECTRAL CHROMATIC DISPERSION (Dracarys Signature)
        // Red, Yellow, Green, Cyan separation across reflected light
        // ------------------------------------------------------------------
        float dispersion = 0.018 + abs(vRippleTotal) * 0.08;

        vec4 reflR = texture2D(tRefl, projCoord + distort + vec2(dispersion * 1.4, -dispersion * 0.6));
        vec4 reflY = texture2D(tRefl, projCoord + distort + vec2(dispersion * 0.7, -dispersion * 0.3));
        vec4 reflG = texture2D(tRefl, projCoord + distort);
        vec4 reflB = texture2D(tRefl, projCoord + distort - vec2(dispersion * 0.9, -dispersion * 0.4));

        vec3 chromaticRefl = vec3(
            reflR.r * 1.35 + reflY.r * 0.65,
            reflG.g * 1.15 + reflY.g * 0.45,
            reflB.b * 1.55 + reflG.b * 0.35
        );

        // Fallback procedural reflection directly under the patronus
        float centerDist = length(vWorldPos.xz);
        vec3 procRefl = vec3(0.0);
        if (centerDist < 4.0) {
            float coreGlow = exp(-centerDist * 1.1);
            procRefl.r = exp(-length(vWorldPos.xz - vec2(0.2, -0.3)) * 1.1) * 0.9;
            procRefl.g = exp(-length(vWorldPos.xz) * 1.1) * 0.7;
            procRefl.b = exp(-length(vWorldPos.xz + vec2(0.2, -0.3)) * 1.1) * 1.2;
        }

        vec3 finalRefl = mix(procRefl, chromaticRefl, uHasRefl);

        // Fresnel reflection factor
        float NdotV = max(dot(N, V), 0.0);
        float fresnel = 0.08 + 0.92 * pow(1.0 - NdotV, 4.0);

        // Pitch black obsidian base
        vec3 waterBase = vec3(0.002, 0.003, 0.006);

        // Subtle Celtic runes beneath the dark surface
        float runes = runePattern(vWorldPos.xz);
        float wakeDist = length(vWorldPos.xz - uCursor.xy);
        float wakeGlow = smoothstep(3.5, 0.2, wakeDist) * uCursor.z * 1.2;
        vec3 runeCol = vec3(0.08, 0.22, 0.45) * runes * (0.08 + wakeGlow + abs(vRippleTotal) * 2.5);

        vec3 color = waterBase + runeCol + finalRefl * fresnel * 1.8;

        // Mist extinction into deep black void
        float distToCam = length(cameraPosition - vWorldPos);
        float fog = smoothstep(8.0, 45.0, distToCam);
        color = mix(color, vec3(0.002, 0.004, 0.008), fog);

        gl_FragColor = vec4(color, 1.0);
    }
`;

export function createChromaticWater() {
    const geo = new THREE.PlaneGeometry(120, 120, 128, 128);
    geo.rotateX(-Math.PI / 2);

    const ripples = [];
    for (let i = 0; i < 8; i++) {
        ripples.push(new THREE.Vector4(0, 0, -100, 0));
    }
    let rippleIdx = 0;

    const uniforms = {
        tRefl: { value: null },
        uHasRefl: { value: 0 },
        uTime: { value: 0 },
        uCursor: { value: new THREE.Vector4(0, 0, 0, 0) },
        uRipples: { value: ripples }
    };

    const mat = new THREE.ShaderMaterial({
        vertexShader: waterVert,
        fragmentShader: waterFrag,
        uniforms,
        transparent: false,
        depthWrite: true
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0;

    return {
        mesh,
        uniforms,
        addRipple: (x, z, intensity = 1.0, time = 0) => {
            ripples[rippleIdx].set(x, z, time, intensity);
            rippleIdx = (rippleIdx + 1) % 8;
        },
        update: (time, dt, cursorX, cursorZ, cursorActive, pulse) => {
            uniforms.uTime.value = time;
            uniforms.uCursor.value.set(cursorX, cursorZ, cursorActive ? 1.0 : 0.0, pulse);
        }
    };
}
