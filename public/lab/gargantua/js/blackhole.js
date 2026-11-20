// Gargantua. Every pixel traces one photon backwards from the lens through Schwarzschild spacetime (units of the
// Schwarzschild radius, horizon at r = 1). The orbit equation of a null geodesic, u'' + u = 1.5 u^2, is exactly the
// path of a particle under a = -1.5 h^2 r / |r|^5 with h = |r x v| conserved, so the ray is integrated in flat 3D with
// that force (velocity Verlet, step proportional to radius). The thin disk is found where the ray crosses y = 0;
// it is semi-transparent, so the far side bent over and under the shadow and the photon ring all come for free.
// Two extra modes: a whole-sky equirect from the lens (for image-based lighting of whatever is near it), and a
// second point mass that follows the cursor, applied as a thin-lens deflection of the escaped starlight.
import * as THREE from 'three';

const vert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */`
precision highp float;
varying vec2 vUv;

uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform float uTanFov;
uniform float uAspect;
uniform float uPixAng;
uniform float uTime;
uniform float uSteps;
uniform float uStepK;
uniform float uRin;
uniform float uRout;
uniform float uDiskGain;
uniform float uStarGain;
uniform float uDoppler;
uniform float uSpin;
uniform float uExposure;
uniform vec3 uLensDir;
uniform float uLensK;
uniform float uEquirect;

#define MAX_STEPS 320

float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
}
float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i), n100 = hash13(i + vec3(1, 0, 0)), n010 = hash13(i + vec3(0, 1, 0)), n110 = hash13(i + vec3(1, 1, 0));
    float n001 = hash13(i + vec3(0, 0, 1)), n101 = hash13(i + vec3(1, 0, 1)), n011 = hash13(i + vec3(0, 1, 1)), n111 = hash13(i + vec3(1, 1, 1));
    return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return s;
}

// ------------------------------------------------------------------ sky: pin-point stars, a breath of dust
vec3 starLayer(vec3 d, float S, float density, float seed) {
    vec3 p = d * S + seed;
    vec3 id = floor(p);
    if (hash13(id) > density) return vec3(0.0);
    vec3 c = id + 0.15 + 0.7 * hash33(id + 3.1);
    vec3 sd = normalize(c - seed);
    float dist = length(d - sd) * S;
    float rad = max(uPixAng * S * 0.75, 0.002);
    float m = hash13(id + 9.7);
    float lum = 0.18 + 6.0 * pow(m, 12.0);
    float k = hash13(id + 4.2);
    vec3 tint = k < 0.25 ? vec3(1.0, 0.82, 0.62) : k < 0.85 ? vec3(1.0, 0.97, 0.92) : vec3(0.78, 0.86, 1.0);
    // energy-conserving footprint: wider than a pixel means dimmer, never a fat blob
    float norm = (uPixAng * S * 0.75) / rad;
    return tint * lum * norm * norm * exp(-dist * dist / (rad * rad));
}
vec3 sky(vec3 d) {
    vec3 c = vec3(0.0);
    c += starLayer(d, 60.0, 0.05, 0.0);
    c += starLayer(d, 140.0, 0.03, 17.0) * 0.7;
    c += starLayer(d, 320.0, 0.018, 41.0) * 0.45;
    float neb = fbm(d * 2.2 + 4.0);
    neb = smoothstep(0.52, 0.85, neb) * smoothstep(0.75, 0.0, abs(d.y + 0.25 * d.x + 0.1));
    c += vec3(0.55, 0.42, 0.34) * neb * 0.012;
    return c * uStarGain;
}

// ------------------------------------------------------------------ the disk
vec3 diskColor(float t) {
    // ember -> orange -> amber -> warm white -> faint blue-white: Nolan's restrained palette, not a rainbow
    vec3 c = mix(vec3(0.42, 0.08, 0.015), vec3(1.0, 0.36, 0.08), smoothstep(0.15, 0.55, t));
    c = mix(c, vec3(1.0, 0.66, 0.34), smoothstep(0.5, 0.9, t));
    c = mix(c, vec3(1.0, 0.93, 0.84), smoothstep(0.85, 1.35, t));
    c = mix(c, vec3(0.86, 0.91, 1.0), smoothstep(1.5, 2.4, t));
    return c;
}

float diskPattern(float rh, float a, float seed) {
    // long azimuthal streaks: low frequency around the orbit, high frequency across it
    vec3 q = vec3(cos(a) * 1.6, sin(a) * 1.6, rh * 9.0 + seed);
    float w = fbm(q * 0.7 + seed * 3.1);
    float n = fbm(q + vec3(0.0, 0.0, w * 2.2));
    float fine = vnoise(vec3(cos(a) * 4.0, sin(a) * 4.0, rh * 70.0 + seed + w * 6.0));
    float hair = vnoise(vec3(cos(a) * 9.0, sin(a) * 9.0, rh * 160.0 + seed));
    return n * 0.75 + fine * 0.28 + hair * 0.12;
}

vec4 disk(vec3 hp, float rh, vec3 rayDir) {
    float x = (rh - uRin) / (uRout - uRin);
    float phi = atan(hp.z, hp.x);
    float omega = 0.9 * pow(rh, -1.5);

    // two flow layers, half a period apart, so differential rotation never shears the noise into hair
    float T = 18.0;
    float f1 = fract(uTime / T), f2 = fract(uTime / T + 0.5);
    float wA = 1.0 - abs(2.0 * f1 - 1.0);
    float nA = diskPattern(rh, phi + uSpin * omega * f1 * T, 0.0);
    float nB = diskPattern(rh, phi + uSpin * omega * f2 * T, 11.0);
    float n = mix(nB, nA, wA);

    float edgeIn = smoothstep(-0.005, 0.025, x);
    float edgeOut = 1.0 - smoothstep(0.1, 1.0, x);
    float clump = smoothstep(0.2, 0.66, n + 0.22 * (1.0 - x));
    // opacity and glow fall off differently: the outer disk is dim dust that still hides what is behind it
    float alpha = clamp(edgeIn * sqrt(edgeOut) * (0.35 + 0.65 * clump) * 3.2, 0.0, 0.995);
    float glow = edgeIn * edgeOut * edgeOut * (0.25 + 0.75 * clump);

    // relativistic beaming: circular orbit speed seen by a static observer, Doppler factor, gravitational redshift
    vec3 tang = uSpin * normalize(vec3(hp.z, 0.0, -hp.x));
    float v = min(sqrt(0.5 / max(rh - 1.0, 0.05)), 0.8);
    float gam = inversesqrt(1.0 - v * v);
    float D = 1.0 / (gam * (1.0 - v * dot(tang, -rayDir)));
    float gG = sqrt(max(1.0 - 1.0 / rh, 0.0));
    float g = mix(1.0, D, uDoppler) * mix(1.0, gG / sqrt(1.0 - 1.0 / uRin), 0.75);

    float temp = pow(uRin / rh, 0.85);
    float t = temp * mix(1.0, g, 0.5);
    // beaming kept to roughly 2.5:1 across the disk: legible, never a blown-out half
    float I = pow(temp, 2.4) * pow(g, 2.1) * (0.4 + 1.15 * n);
    vec3 col = diskColor(t * 1.2) * I * uDiskGain * glow;
    return vec4(col, alpha);
}

void main() {
    vec3 dir;
    if (uEquirect > 0.5) {
        // the whole sky around the lens, for image-based lighting of everything near it
        // three.js equirect convention: u = atan(d.z, d.x) / 2pi + 0.5, v = asin(d.y) / pi + 0.5
        float lon = (vUv.x - 0.5) * 6.2831853, lat = (vUv.y - 0.5) * 3.1415927;
        dir = vec3(cos(lon) * cos(lat), sin(lat), sin(lon) * cos(lat));
    } else {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= uAspect;
        dir = normalize(uCamRot * vec3(p * uTanFov, -1.0));
    }
    vec3 dir0 = dir;

    vec3 pos = uCamPos;
    vec3 vel = dir;
    vec3 L = cross(pos, vel);
    float h2 = dot(L, L);
    float r = length(pos);
    float escR = max(r * 1.15, 50.0);

    vec3 col = vec3(0.0);
    float alpha = 0.0;
    bool captured = false;

    // a per-pixel phase on the first step turns step-count banding into fine noise the grain swallows
    float jit = 0.35 + 0.65 * hash13(vec3(gl_FragCoord.xy, 7.0));
    for (int i = 0; i < MAX_STEPS; i++) {
        if (float(i) >= uSteps) break;
        float dt = clamp((r - 0.85) * uStepK, 0.006, 6.0);
        if (i == 0) dt *= jit;
        vec3 prev = pos;
        float r2 = dot(pos, pos);
        vec3 acc = -1.5 * h2 * pos / (r2 * r2 * sqrt(r2));
        vel += acc * (0.5 * dt);
        pos += vel * dt;
        r2 = dot(pos, pos);
        acc = -1.5 * h2 * pos / (r2 * r2 * sqrt(r2));
        vel += acc * (0.5 * dt);
        r = sqrt(r2);

        if (prev.y * pos.y < 0.0) {
            float k = prev.y / (prev.y - pos.y);
            vec3 hp = mix(prev, pos, k);
            float rh = length(hp.xz);
            if (rh > uRin * 0.97 && rh < uRout) {
                vec4 d = disk(hp, rh, normalize(vel));
                col += (1.0 - alpha) * d.rgb;
                alpha += (1.0 - alpha) * d.a;
                if (alpha > 0.985) break;
            }
        }
        if (r < 1.0) { captured = true; break; }
        if (r > escR && dot(pos, vel) > 0.0) break;
    }
    if (!captured) {
        vec3 sd = normalize(vel);
        // the cursor is a second, invisible point mass: starlight behind it is pulled round it (thin-lens, softened core)
        if (uLensK > 1e-6 && uEquirect < 0.5) {
            float c = clamp(dot(dir0, uLensDir), -1.0, 1.0);
            float th = acos(c);
            float alphaL = uLensK * th / (th * th + uLensK * 0.08);
            vec3 ax = cross(dir0, uLensDir);
            float al = length(ax);
            if (al > 1e-5) {
                ax /= al;
                float s = sin(alphaL), cs = cos(alphaL);
                sd = sd * cs + cross(ax, sd) * s + ax * dot(ax, sd) * (1.0 - cs);
            }
        }
        col += (1.0 - alpha) * sky(sd);
    }
    gl_FragColor = vec4(col * uExposure, 1.0);
}
`;

export function createBlackHole() {
    const uniforms = {
        uCamPos: { value: new THREE.Vector3(0, 2, 40) },
        uCamRot: { value: new THREE.Matrix3() },
        uTanFov: { value: Math.tan(THREE.MathUtils.degToRad(16)) },
        uAspect: { value: 16 / 9 },
        uPixAng: { value: 0.001 },
        uTime: { value: 0 },
        uSteps: { value: 180 },
        uStepK: { value: 0.07 },
        uRin: { value: 2.05 },
        uRout: { value: 11.0 },
        uDiskGain: { value: 1 },
        uStarGain: { value: 1 },
        uDoppler: { value: 0.6 },
        uSpin: { value: 1 },
        uExposure: { value: 1 },
        uLensDir: { value: new THREE.Vector3(0, 0, -1) },
        uLensK: { value: 0 },
        uEquirect: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const rot = new THREE.Matrix4();
    return {
        uniforms, scene, camera, material,
        // the lens: a perspective camera living in black-hole units
        setCamera(cam, rtHeight) {
            cam.updateMatrixWorld();
            rot.extractRotation(cam.matrixWorld);
            uniforms.uCamRot.value.setFromMatrix4(rot);
            uniforms.uCamPos.value.copy(cam.position);
            const t = Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));
            uniforms.uTanFov.value = t;
            uniforms.uAspect.value = cam.aspect;
            uniforms.uPixAng.value = (2 * t) / Math.max(1, rtHeight);
        },
    };
}
