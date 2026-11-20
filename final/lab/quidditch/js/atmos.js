// One sky for everything: the fog takes its colour from the same horizon band the dome paints, so towers, hills and
// cloud puffs dissolve into exactly the light behind them. Low sun in the north-east, behind the castle as seen from
// the pitch, so Hogwarts reads as a silhouette with its windows lit.
import * as THREE from 'three';

export const SUN = new THREE.Vector3(0.80, 0.115, -0.585).normalize();

export const G = {
    uTime: { value: 0 },
    uSunDir: { value: SUN },
    uFogD: { value: 0.00078 },
    uFogH: { value: 0.0052 },
    uReflect: { value: 0 },
    uMistTint: { value: 0 },
};

export const NOISE = /* glsl */`
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float vnoise3(vec3 p) {
    vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
    float a = mix(mix(hash13(i), hash13(i + vec3(1,0,0)), u.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), u.x), u.y);
    float b = mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), u.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), u.x), u.y);
    return mix(a, b, u.z);
}
float fbm2(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
float fbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
`;

export const ATMOS = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
uniform float uFogD;
uniform float uFogH;
uniform float uReflect;
const vec3 SUNCOL = vec3(1.45, 0.80, 0.46);

// the horizon band without clouds: what the fog dissolves into
vec3 skyBandK(vec3 rd, float glow) {
    float s = max(dot(rd, uSunDir), 0.0);
    float h = rd.y;
    vec3 zen = vec3(0.030, 0.040, 0.066);
    vec3 hor = vec3(0.120, 0.128, 0.162);
    vec3 c = mix(hor, zen, smoothstep(-0.02, 0.6, h));
    float az = 0.5 + 0.5 * s;
    c = mix(c * vec3(0.86, 0.92, 1.08), c, az);
    float low = 1.0 - smoothstep(0.0, 0.4, abs(h));
    c += vec3(1.0, 0.46, 0.20) * (pow(s, 6.0) * 0.55 + pow(s, 30.0) * 1.1) * (0.25 + 0.75 * low) * glow;
    c += vec3(0.20, 0.10, 0.07) * low * 0.3;
    c = mix(c, c * 0.55, smoothstep(0.02, -0.25, h));
    return c;
}
vec3 skyBand(vec3 rd) { return skyBandK(rd, 1.0); }

vec3 applyFog(vec3 col, vec3 wp) {
    vec3 d = wp - cameraPosition;
    float dist = length(d);
    vec3 rd = d / max(dist, 1e-3);
    float ry = abs(rd.y) < 1e-3 ? 1e-3 : rd.y;
    float a = uFogD * exp(-uFogH * max(cameraPosition.y, 0.0));
    float k = clamp(dist * ry * uFogH, -30.0, 30.0);
    float f = a * (1.0 - exp(-k)) / (ry * uFogH);
    f = 1.0 - exp(-max(f, 0.0));
    return mix(col, skyBandK(rd, 0.45), f);
}

// dusk light: warm wrapped sun, cool sky from above, peat-dark bounce, a sun-side rim to catch silhouettes
vec3 lightIt(vec3 albedo, vec3 n, vec3 wp, float ao) {
    float ndl = dot(n, uSunDir);
    float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
    vec3 sun = SUNCOL * wrap * wrap * 0.95;
    float hemi = n.y * 0.5 + 0.5;
    vec3 amb = mix(vec3(0.034, 0.031, 0.029), vec3(0.125, 0.140, 0.185), hemi);
    vec3 v = normalize(cameraPosition - wp);
    float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 4.0) * pow(max(dot(-v, uSunDir), 0.0), 3.0);
    return albedo * (sun + amb) * ao + albedo * rim * SUNCOL * 0.9;
}
`;

export function uniforms(extra = {}) {
    return { ...G, ...extra };
}
