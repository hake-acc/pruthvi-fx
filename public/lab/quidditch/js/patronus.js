// Ethereal Flight Silhouette & Dracarys Particle Engine — Harry Potter & The Firebolt
// Eliminates all primitive 'balls and sticks' in favor of an anatomical skeletal contour,
// 32,000+ luminescent stardust particles, flowing cloth ribbons, and dynamic fire embers.
import * as THREE from 'three';

const COUNT = 32000;

const vertShader = /* glsl */`
    uniform float uTime;
    uniform float uSpeed;
    uniform vec3 uPointer;
    uniform float uHover;
    uniform float uBank;
    uniform float uPitch;

    attribute vec3 aBase;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aSpeed;
    attribute float aType; // 0 = bone/skeleton, 1 = cloak/cloth ribbons, 2 = broom embers, 3 = aura/stardust

    varying vec3 vColor;
    varying float vAlpha;
    varying float vType;

    vec3 curlNoise(vec3 p, float t) {
        float s1 = sin(p.y * 3.2 + t * 2.1) * cos(p.z * 2.8 + t * 1.5);
        float s2 = sin(p.z * 3.5 + t * 1.8) * cos(p.x * 2.9 + t * 2.3);
        float s3 = sin(p.x * 2.7 + t * 1.6) * cos(p.y * 3.1 + t * 1.9);
        return vec3(s1, s2, s3);
    }

    void main() {
        vColor = aColor;
        vType = aType;

        vec3 pos = aBase;

        // Dynamic aerodynamic breathing oscillation
        float flightBreath = sin(uTime * 2.4 + aPhase) * 0.035;
        pos.y += flightBreath;

        float t = uTime * aSpeed;
        if (aType > 0.5 && aType < 1.5) {
            // Billowing cloak & scarf streamlines: dynamic wind drag
            float trailDist = max(0.0, 0.4 - pos.z);
            vec3 curl = curlNoise(pos * 0.9, t * 1.6);
            pos.x += curl.x * (0.03 + trailDist * 0.16);
            pos.y += sin(uTime * 5.2 - pos.z * 4.2 + aPhase) * (0.025 + trailDist * 0.12) + curl.y * 0.04;
            pos.z += curl.z * (0.02 + trailDist * 0.08);
        } else if (aType >= 1.5 && aType < 2.5) {
            // Dracarys fire wake & swirling ember vortices
            float age = fract(uTime * 0.42 + aPhase);
            pos.z -= age * 4.6;
            vec3 swirl = curlNoise(pos * 1.2, t * 2.2);
            pos.x += swirl.x * (0.08 + age * 0.35);
            pos.y += swirl.y * (0.08 + age * 0.35) - age * 0.45;
            pos.z += swirl.z * 0.15;
        } else if (aType >= 2.5) {
            // Ethereal stardust aura
            vec3 auraCurl = curlNoise(pos * 1.4, t * 1.1);
            pos += auraCurl * (0.06 + sin(uTime * 2.8 + aPhase) * 0.03);
        } else {
            // Sleek aerodynamic broom and rider frame micro-vibrations
            pos += curlNoise(pos * 2.2, t * 0.8) * 0.008;
        }

        // Kinetic banking & pitch roll
        float cosB = cos(uBank), sinB = sin(uBank);
        float ny = pos.y * cosB - pos.x * sinB;
        float nx = pos.y * sinB + pos.x * cosB;
        pos.x = nx; pos.y = ny;

        float cosP = cos(uPitch), sinP = sin(uPitch);
        float pz = pos.z * cosP - pos.y * sinP;
        float py = pos.z * sinP + pos.y * cosP;
        pos.y = py; pos.z = pz;

        // Interactive cursor turbulence
        vec3 worldP = (modelMatrix * vec4(pos, 1.0)).xyz;
        float distToPtr = length(worldP - uPointer);
        if (distToPtr < 2.4 && uHover > 0.05) {
            float force = (1.0 - distToPtr / 2.4) * uHover * 0.4;
            vec3 push = normalize(worldP - uPointer);
            pos += push * force;
            vColor = mix(vColor, vec3(1.0, 0.95, 0.8), force * 0.7);
        }

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;

        // Dracarys point sizing with camera perspective attenuation
        float pSize = aSize * (1.0 + sin(uTime * 3.5 + aPhase * 6.28) * 0.22);
        if (aType >= 1.5 && aType < 2.5) {
            float age = fract(uTime * 0.42 + aPhase);
            pSize *= (1.0 - age * 0.75);
        }
        gl_PointSize = clamp(pSize * (110.0 / -mvPos.z), 1.0, 6.5);

        float alpha = 0.88;
        if (aType >= 1.5 && aType < 2.5) {
            alpha = (1.0 - fract(uTime * 0.42 + aPhase)) * 0.92;
        } else if (aType >= 2.5) {
            alpha = 0.38 + sin(uTime * 2.2 + aPhase * 3.14) * 0.22;
        }
        vAlpha = alpha;
    }
`;

const fragShader = /* glsl */`
    precision highp float;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vType;

    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float r = length(uv);
        if (r > 0.5) discard;

        // Gaussian core glow + soft outer halo
        float core = exp(-r * 14.0);
        float halo = smoothstep(0.5, 0.05, r);

        vec3 col = vColor;
        if (r < 0.15 && vType < 0.5) {
            col = mix(col, vec3(1.0), 0.55);
        }

        gl_FragColor = vec4(col * (core * 1.25 + halo * 0.45), (core + halo * 0.5) * vAlpha);
    }
`;

export function createPatronusSwarm() {
    const group = new THREE.Group();

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const bases = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const phases = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);
    const types = new Float32Array(COUNT);

    let idx = 0;

    function addPt(x, y, z, col, size, type, jitter = 0.012) {
        if (idx >= COUNT) return;
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;
        const jz = (Math.random() - 0.5) * jitter;

        positions[idx * 3] = x + jx;
        positions[idx * 3 + 1] = y + jy;
        positions[idx * 3 + 2] = z + jz;

        bases[idx * 3] = x + jx;
        bases[idx * 3 + 1] = y + jy;
        bases[idx * 3 + 2] = z + jz;

        colors[idx * 3] = col.r;
        colors[idx * 3 + 1] = col.g;
        colors[idx * 3 + 2] = col.b;

        sizes[idx] = size;
        phases[idx] = Math.random() * Math.PI * 2;
        speeds[idx] = 0.7 + Math.random() * 0.7;
        types[idx] = type;
        idx++;
    }

    // Dracarys Palette: Electric Silver, Cerulean Cyan, Pure White, Crimson & Firebolt Gold
    const cWhite = new THREE.Color(0xffffff);
    const cSilver = new THREE.Color(0xdce7f0);
    const cElectricCyan = new THREE.Color(0x00e5ff);
    const cSoftCyan = new THREE.Color(0x38bdf8);
    const cGold = new THREE.Color(0xffb703);
    const cAmber = new THREE.Color(0xfb8500);
    const cCrimson = new THREE.Color(0xd90429);

    // ------------------------------------------------------------------ 1. Anatomical Broom: The Firebolt
    // Swept curved aerodynamic mahogany beam with tapered nose and gold runes
    for (let i = 0; i < 2200; i++) {
        const u = i / 2200;
        const z = THREE.MathUtils.lerp(2.2, -1.4, u);
        const yCurve = 0.44 + Math.sin(u * Math.PI) * 0.08 - u * 0.04;
        const taper = u < 0.15 ? (u / 0.15) * 0.032 : (1.0 - (u - 0.15) * 0.3) * 0.032;
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * taper;
        const isRune = Math.abs(z - 1.1) < 0.06 || Math.abs(z - 0.1) < 0.06 || Math.abs(z + 0.8) < 0.06;
        const col = isRune ? cGold : (Math.random() > 0.4 ? cSilver : cSoftCyan);
        addPt(Math.cos(theta) * r, yCurve + Math.sin(theta) * r, z, col, isRune ? 2.5 : 1.7, 0, 0.008);
    }

    // Stirrup footrests
    for (const sx of [-1, 1]) {
        for (let i = 0; i < 250; i++) {
            const v = i / 250;
            const x = sx * (0.04 + v * 0.14);
            const y = 0.44 - v * 0.26;
            const z = -0.22 - v * 0.06;
            addPt(x, y, z, cGold, 1.8, 0, 0.01);
        }
    }

    // Broom bristle fan (cone of streaming twigs)
    for (let i = 0; i < 3500; i++) {
        const u = Math.random();
        const z = -1.4 - u * 1.35;
        const flare = Math.pow(u, 1.25) * 0.38;
        const theta = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * flare;
        const x = Math.cos(theta) * rad;
        const y = 0.40 + Math.sin(theta) * rad + u * 0.06;
        const col = Math.random() > 0.35 ? cGold : cAmber;
        addPt(x, y, z, col, 2.1, 0, 0.02);
    }

    // ------------------------------------------------------------------ 2. Anatomical Flight Rider: Harry Potter
    // Spine & Vertebrae Curve (33 articulated points with cross-rib arcs)
    for (let s = 0; s < 33; s++) {
        const u = s / 33;
        const sz = THREE.MathUtils.lerp(-0.35, 0.95, u);
        const sy = 0.48 + Math.sin(u * 2.4) * 0.38;
        // Vertebral body
        for (let k = 0; k < 45; k++) {
            const col = Math.random() > 0.3 ? cWhite : cElectricCyan;
            addPt(0, sy, sz, col, 2.3, 0, 0.015);
        }
        // Rib Cage rings (contoured athletic torso)
        if (u > 0.25 && u < 0.85) {
            const ribRadX = 0.16 * Math.sin((u - 0.25) / 0.6 * Math.PI);
            const ribRadY = 0.13 * Math.sin((u - 0.25) / 0.6 * Math.PI);
            for (let a = 0; a < 80; a++) {
                const angle = (a / 80) * Math.PI * 2;
                const rx = Math.cos(angle) * ribRadX;
                const ry = sy + Math.sin(angle) * ribRadY - 0.04;
                const col = Math.random() > 0.4 ? cSilver : cSoftCyan;
                addPt(rx, ry, sz, col, 1.8, 0, 0.015);
            }
        }
    }

    // Shoulders, Clavicles & Arms Gripping Handle
    for (const sx of [-1, 1]) {
        // Clavicle to shoulder
        for (let i = 0; i < 300; i++) {
            const v = i / 300;
            const x = sx * v * 0.22;
            const y = 0.82 - v * 0.04;
            const z = 0.68 + v * 0.06;
            addPt(x, y, z, cSilver, 1.9, 0, 0.012);
        }
        // Upper arm to elbow
        for (let i = 0; i < 400; i++) {
            const v = i / 400;
            const x = sx * (0.22 - v * 0.05);
            const y = 0.78 - v * 0.22;
            const z = 0.74 + v * 0.24;
            addPt(x, y, z, cSoftCyan, 1.8, 0, 0.015);
        }
        // Forearm to hands on broom handle
        for (let i = 0; i < 450; i++) {
            const v = i / 450;
            const x = sx * (0.17 - v * 0.12);
            const y = 0.56 - v * 0.10;
            const z = 0.98 + v * 0.32;
            addPt(x, y, z, cSilver, 1.9, 0, 0.015);
        }
        // Hands gripping broom
        for (let i = 0; i < 220; i++) {
            const theta = Math.random() * Math.PI * 2;
            const rad = Math.random() * 0.04;
            addPt(sx * 0.05 + Math.cos(theta) * rad, 0.46 + Math.sin(theta) * rad, 1.30, cWhite, 2.2, 0, 0.01);
        }
        // Legs tucked tight along broom flanks
        for (let i = 0; i < 600; i++) {
            const v = i / 600;
            const x = sx * (0.14 - v * 0.06);
            const y = 0.48 - v * 0.16;
            const z = -0.05 - v * 0.45;
            addPt(x, y, z, cSoftCyan, 1.8, 0, 0.015);
        }
        // Boots
        for (let i = 0; i < 300; i++) {
            const v = i / 300;
            const x = sx * 0.08;
            const y = 0.32 - v * 0.08;
            const z = -0.50 - v * 0.18;
            addPt(x, y, z, cSilver, 2.0, 0, 0.015);
        }
    }

    // Anatomical Head, Cranium & Flowing Hair Tufts
    const headCenter = new THREE.Vector3(0, 0.96, 1.05);
    for (let i = 0; i < 2200; i++) {
        const u = Math.random(), v = Math.random();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2.0 * v - 1.0);
        const rad = 0.115 * Math.cbrt(Math.random());
        const x = rad * Math.sin(phi) * Math.cos(theta);
        const y = headCenter.y + rad * Math.sin(phi) * Math.sin(theta) * 1.1;
        const z = headCenter.z + rad * Math.cos(phi);
        const col = Math.random() > 0.4 ? cWhite : cSilver;
        addPt(x, y, z, col, 2.0, 0, 0.01);
    }

    // Wind-swept hair strands streaming backward
    for (let strand = 0; strand < 36; strand++) {
        const sa = Math.random() * Math.PI * 2;
        const startX = Math.cos(sa) * 0.09;
        const startY = headCenter.y + Math.sin(sa) * 0.09 + 0.03;
        const startZ = headCenter.z - 0.04;
        for (let seg = 0; seg < 45; seg++) {
            const v = seg / 45;
            const hx = startX * (1.0 + v * 0.4) + Math.sin(v * 6.0) * 0.02;
            const hy = startY + v * 0.04;
            const hz = startZ - v * 0.32;
            addPt(hx, hy, hz, cSilver, 1.6, 0, 0.01);
        }
    }

    // Iconic Round Spectacles
    for (const sx of [-1, 1]) {
        const gx = sx * 0.045;
        const gy = headCenter.y - 0.01;
        const gz = headCenter.z + 0.115;
        for (let ring = 0; ring < 90; ring++) {
            const a = (ring / 90) * Math.PI * 2;
            const x = gx + Math.cos(a) * 0.028;
            const y = gy + Math.sin(a) * 0.028;
            addPt(x, y, gz, cGold, 2.6, 0, 0.005);
        }
    }
    // Glasses bridge
    for (let b = 0; b < 40; b++) {
        const x = THREE.MathUtils.lerp(-0.018, 0.018, b / 40);
        addPt(x, headCenter.y - 0.01, headCenter.z + 0.116, cGold, 2.4, 0, 0.005);
    }

    // ------------------------------------------------------------------ 3. Billowing Cloak & Scarf Streamlines (Flowing Cloth)
    // 24 aerodynamic ribbons streaming from shoulders and waist
    for (let r = 0; r < 28; r++) {
        const u = r / 28;
        const startAngle = u * Math.PI;
        const sx = Math.cos(startAngle) * 0.24;
        const sy = 0.74 - Math.sin(startAngle) * 0.12;
        const sz = 0.55;
        const isScarf = r >= 12 && r <= 16;
        for (let p = 0; p < 220; p++) {
            const v = p / 220;
            const wave = Math.sin(v * 8.0 + u * 4.0) * 0.05 * v;
            const flareX = sx * (1.0 + v * 2.2) + wave;
            const dropY = sy - Math.pow(v, 1.4) * 0.45;
            const trailZ = sz - v * 2.6;
            const col = isScarf ? (p % 20 < 10 ? cCrimson : cGold) : (Math.random() > 0.3 ? cSoftCyan : cSilver);
            addPt(flareX, dropY, trailZ, col, isScarf ? 2.5 : 1.9, 1, 0.018);
        }
    }

    // ------------------------------------------------------------------ 4. Dracarys Swirling Flame Embers (Wake Simulation)
    for (let i = 0; i < 5500; i++) {
        const u = Math.random();
        const z = -1.4 - u * 3.5;
        const swirlRad = Math.pow(u, 1.3) * 0.65;
        const theta = Math.random() * Math.PI * 2;
        const x = Math.cos(theta) * swirlRad;
        const y = 0.40 + Math.sin(theta) * swirlRad - u * 0.3;
        const isFire = Math.random() > 0.4;
        const col = isFire ? cGold : cAmber;
        addPt(x, y, z, col, 2.4 + Math.random() * 1.5, 2, 0.035);
    }

    // ------------------------------------------------------------------ 5. Stardust Aura
    for (let i = 0; i < 3500; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2.0 * Math.random() - 1.0);
        const rad = 0.6 + Math.random() * 1.8;
        const x = rad * Math.sin(phi) * Math.cos(theta);
        const y = 0.6 + rad * Math.sin(phi) * Math.sin(theta) * 0.6;
        const z = 0.2 + rad * Math.cos(phi) * 1.4;
        addPt(x, y, z, Math.random() > 0.5 ? cElectricCyan : cSilver, 1.5, 3, 0.05);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aBase', new THREE.BufferAttribute(bases, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aType', new THREE.BufferAttribute(types, 1));

    const uniforms = {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
        uPointer: { value: new THREE.Vector3(0, 0, 0) },
        uHover: { value: 0 },
        uBank: { value: 0 },
        uPitch: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vertShader,
        fragmentShader: fragShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    group.add(points);

    function update(time, dt, bank, pitch, pointer, hover) {
        uniforms.uTime.value = time;
        uniforms.uBank.value = bank || 0;
        uniforms.uPitch.value = pitch || 0;
        if (pointer) uniforms.uPointer.value.copy(pointer);
        uniforms.uHover.value = hover || 0;
    }

    return { group, points, uniforms, update };
}

