// HDR in, film out: mip-chain bloom (13-tap down, tent up), crepuscular shafts marched toward the sun at quarter
// resolution, then one grade: speed smear toward the vanishing point on the boost, cloud mist, ACES-fit curve,
// vignette, grain that lives in the mids, a white flash for the catch and letterbox bars for attract mode.
import * as THREE from 'three';

const quadVert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const downFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uFirst;
vec3 S(vec2 o) { return clamp(texture2D(tSrc, vUv + o * uTexel).rgb, 0.0, 6.0e4); }
void main() {
    vec3 a = S(vec2(-2, 2)), b = S(vec2(0, 2)), c = S(vec2(2, 2));
    vec3 d = S(vec2(-2, 0)), e = S(vec2(0, 0)), f = S(vec2(2, 0));
    vec3 g = S(vec2(-2, -2)), h = S(vec2(0, -2)), i = S(vec2(2, -2));
    vec3 j = S(vec2(-1, 1)), k = S(vec2(1, 1)), l = S(vec2(-1, -1)), m = S(vec2(1, -1));
    vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
    if (uFirst > 0.5) {
        float br = max(col.r, max(col.g, col.b));
        float soft = clamp(br - uThreshold * 0.5, 0.0, uThreshold);
        soft = soft * soft / (4.0 * uThreshold + 1e-4);
        col *= max(soft, br - uThreshold) / max(br, 1e-4);
        col = min(col, vec3(40.0));
    }
    gl_FragColor = vec4(col, 1.0);
}
`;

const upFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
vec3 S(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main() {
    vec3 col = S(vec2(0)) * 4.0 + (S(vec2(-1, 0)) + S(vec2(1, 0)) + S(vec2(0, 1)) + S(vec2(0, -1))) * 2.0
        + S(vec2(-1, -1)) + S(vec2(1, -1)) + S(vec2(-1, 1)) + S(vec2(1, 1));
    gl_FragColor = vec4(col / 16.0, 1.0);
}
`;

const shaftFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uSun;
uniform float uAspect;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
    vec2 d = (uSun - vUv) / 36.0;
    vec2 p = vUv + d * hash12(gl_FragCoord.xy);
    vec3 acc = vec3(0.0);
    float w = 1.0;
    for (int i = 0; i < 36; i++) {
        vec3 c = clamp(texture2D(tSrc, p).rgb, 0.0, 6.0);
        float l = max(c.r, max(c.g, c.b));
        vec2 q = (p - uSun) * vec2(uAspect, 1.0);
        acc += c * smoothstep(1.3, 3.2, l) * w * exp(-dot(q, q) * 12.0);
        w *= 0.955;
        p += d;
    }
    gl_FragColor = vec4(acc / 36.0, 1.0);
}
`;

const compFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform sampler2D tShaft;
uniform vec2 uRes;
uniform float uTime;
uniform float uBloom;
uniform float uShaft;
uniform float uExposure;
uniform float uGrain;
uniform float uVignette;
uniform float uLetter;
uniform float uStreak;
uniform float uWhite;
uniform float uMist;
uniform vec3 uMistCol;
uniform float uCA;
uniform float uFrost; // Dracarys speed frost & wind condensation

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
vec3 filmic(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

void main() {
    vec2 uv = vUv;
    vec2 dc = uv - 0.5;
    vec3 col;
    float r2 = dot(dc, dc);
    if (uStreak > 0.002) {
        vec3 acc = vec3(0.0); float ws = 0.0;
        float j = hash12(gl_FragCoord.xy + fract(uTime) * 91.0);
        for (int i = 0; i < 12; i++) {
            float t = (float(i) + j) / 12.0;
            float s = 1.0 - uStreak * 0.065 * t * smoothstep(0.02, 0.25, r2);
            float w = 1.0 - t * 0.6;
            acc += texture2D(tScene, 0.5 + dc * s).rgb * w; ws += w;
        }
        col = acc / ws;
    } else {
        float ca = uCA * r2;
        col = vec3(texture2D(tScene, uv - dc * ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv + dc * ca).b);
    }
    col += texture2D(tBloom, uv).rgb * uBloom * vec3(1.05, 0.97, 0.9);
    col += texture2D(tShaft, uv).rgb * uShaft * vec3(1.0, 0.78, 0.55);
    col = clamp(col, 0.0, 6.0e4);
    if (uMist > 0.001) {
        float n = vnoise(uv * vec2(uRes.x / uRes.y, 1.0) * 3.0 + vec2(uTime * 0.25, uTime * 0.1)) * 0.6
                + vnoise(uv * 9.0 - uTime * 0.4) * 0.4;
        float m = clamp(uMist * (0.75 + 0.5 * n) * (0.7 + 0.6 * r2 * 2.0), 0.0, 1.0);
        col = mix(col, uMistCol * (0.85 + 0.3 * n), m);
    }

    // Robert Borghesi Dracarys: Speed Frost & Wind Condensation
    if (uFrost > 0.001) {
        vec2 fUv = uv * vec2(uRes.x / uRes.y, 1.0) * 14.0;
        float fNoise = vnoise(fUv + vec2(sin(uTime * 0.35), cos(uTime * 0.28))) * 0.6 + vnoise(fUv * 2.8 - uTime * 0.55) * 0.4;
        float edgeDist = length(dc * vec2(uRes.x / uRes.y, 1.0) * 1.55);
        float frostMask = smoothstep(0.75 - uFrost * 0.32, 1.35, edgeDist + fNoise * 0.28) * uFrost;
        vec3 frostCol = vec3(0.85, 0.94, 1.0) * (0.8 + 0.4 * fNoise);
        col = mix(col, frostCol, clamp(frostMask * 0.92, 0.0, 1.0));
    }

    col *= uExposure;
    col = filmic(col);
    float vig = smoothstep(1.2, 0.25, length(dc * vec2(uRes.x / uRes.y, 1.0) * 0.85));
    col *= mix(1.0, vig, uVignette);
    col = toSRGB(col);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float gr = hash12(floor(uv * uRes) + fract(uTime * 13.7) * 371.0) + hash12(floor(uv * uRes * 0.5) + fract(uTime * 7.3) * 113.0) - 1.0;
    col += gr * uGrain * (0.35 + 0.65 * 4.0 * lum * (1.0 - lum));
    col = mix(col, vec3(1.0, 0.93, 0.78), uWhite);
    float bar = step(0.5 - uLetter, abs(uv.y - 0.5));
    col *= 1.0 - bar;
    gl_FragColor = vec4(col, 1.0);
}
`;

export class Post {
    constructor(renderer) {
        this.renderer = renderer;
        this.levels = 6;
        this.samples = 4;
        const opts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        this.rtScene = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: this.samples, depthBuffer: true });
        this.rtShaft = new THREE.WebGLRenderTarget(4, 4, opts);
        this.mips = [];
        for (let i = 0; i < 7; i++) this.mips.push(new THREE.WebGLRenderTarget(4, 4, opts));
        this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        this.quad.frustumCulled = false;
        this.scene = new THREE.Scene();
        this.scene.add(this.quad);
        const M = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: frag, depthTest: false, depthWrite: false, uniforms, ...extra });
        this.down = M(downFrag, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.0 }, uFirst: { value: 0 } });
        this.up = M(upFrag, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
            { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
        this.shaft = M(shaftFrag, { tSrc: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1 } });
        this.comp = M(compFrag, {
            tScene: { value: null }, tBloom: { value: null }, tShaft: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 },
            uBloom: { value: 0.75 }, uShaft: { value: 0 }, uExposure: { value: 1 }, uGrain: { value: 0.04 }, uVignette: { value: 0.6 }, uLetter: { value: 0 },
            uStreak: { value: 0 }, uWhite: { value: 0 }, uMist: { value: 0 }, uMistCol: { value: new THREE.Vector3(0.25, 0.26, 0.3) }, uCA: { value: 0.01 },
            uFrost: { value: 0 }
        });
        this.u = this.comp.uniforms;
        this.shaftsOn = true;
    }

    setSize(w, h, levels, samples) {
        this.levels = levels;
        if (samples !== this.samples) {
            this.samples = samples;
            this.rtScene.dispose();
            this.rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples, depthBuffer: true });
        }
        this.rtScene.setSize(w, h);
        this.rtShaft.setSize(Math.max(2, Math.round(w / 4)), Math.max(2, Math.round(h / 4)));
        let mw = w, mh = h;
        for (let i = 0; i < this.mips.length; i++) {
            mw = Math.max(1, Math.round(mw / 2)); mh = Math.max(1, Math.round(mh / 2));
            this.mips[i].setSize(mw, mh);
        }
        this.u.uRes.value.set(w, h);
        this.shaft.uniforms.uAspect.value = w / h;
    }

    pass(mat, target) {
        this.quad.material = mat;
        this.renderer.setRenderTarget(target);
        this.renderer.render(this.scene, this.cam);
    }

    bloom(threshold) {
        const n = this.levels;
        let src = this.rtScene.texture, sw = this.rtScene.width, sh = this.rtScene.height;
        for (let i = 0; i < n; i++) {
            this.down.uniforms.tSrc.value = src;
            this.down.uniforms.uTexel.value.set(1 / sw, 1 / sh);
            this.down.uniforms.uFirst.value = i === 0 ? 1 : 0;
            this.down.uniforms.uThreshold.value = threshold;
            this.renderer.autoClear = true;
            this.pass(this.down, this.mips[i]);
            src = this.mips[i].texture; sw = this.mips[i].width; sh = this.mips[i].height;
        }
        this.renderer.autoClear = false;
        for (let i = n - 1; i > 0; i--) {
            const s = this.mips[i];
            this.up.uniforms.tSrc.value = s.texture;
            this.up.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
            this.pass(this.up, this.mips[i - 1]);
        }
        this.renderer.autoClear = true;
        return this.mips[0].texture;
    }

    finish(threshold, sunUV, shaftGain) {
        this.u.tScene.value = this.rtScene.texture;
        if (this.shaftsOn && shaftGain > 0.01) {
            this.shaft.uniforms.tSrc.value = this.rtScene.texture;
            this.shaft.uniforms.uSun.value.copy(sunUV);
            this.pass(this.shaft, this.rtShaft);
            this.u.uShaft.value = shaftGain;
        } else this.u.uShaft.value = 0;
        this.u.tShaft.value = this.rtShaft.texture;
        this.u.tBloom.value = this.bloom(threshold);
        this.pass(this.comp, null);
    }
}
