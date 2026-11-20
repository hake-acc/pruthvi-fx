// HDR in, film out: a mip-chain bloom (13-tap down, tent up), a half-resolution depth-of-field gather (golden-angle
// disc, thin-lens circle of confusion from the scene's resolved depth), then one composite pass that grades like a
// print: ACES for the hole (its look is tuned on it) or AgX for skin-and-cloth close-ups, halation, grain that lives in
// the mids, a breath of lateral chromatic aberration, letterbox, the horizon's radial streaks, the white and the black.
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
vec3 S(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
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
        col = min(col, vec3(60.0));
    }
    gl_FragColor = vec4(col, 1.0);
}
`;

const upFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uRadius;
vec3 S(vec2 o) { return texture2D(tSrc, vUv + o * uTexel * uRadius).rgb; }
void main() {
    vec3 col = S(vec2(0)) * 4.0 + (S(vec2(-1, 0)) + S(vec2(1, 0)) + S(vec2(0, 1)) + S(vec2(0, -1))) * 2.0
        + S(vec2(-1, -1)) + S(vec2(1, -1)) + S(vec2(-1, 1)) + S(vec2(1, 1));
    gl_FragColor = vec4(col / 16.0, 1.0);
}
`;

const cocChunk = /* glsl */`
uniform sampler2D tDepth;
uniform float uNear, uFar, uFocus, uAperture, uMaxCoc;
float linZ(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
// signed circle of confusion in full-resolution pixels: negative in front of the focal plane
float cocAt(vec2 uv) {
    float z = linZ(texture2D(tDepth, uv).x);
    return clamp(uAperture * (z - uFocus) / max(z, 1e-3), -uMaxCoc, uMaxCoc);
}
`;

const dofFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform vec2 uTexel;     // full-resolution texel
uniform float uTaps;
${cocChunk}
#define MAX_TAPS 48
void main() {
    float c0 = cocAt(vUv);
    vec3 acc = texture2D(tScene, vUv).rgb;
    float wsum = 1.0;
    float fg = 0.0;
    const float GA = 2.39996323;
    for (int i = 0; i < MAX_TAPS; i++) {
        if (float(i) >= uTaps) break;
        float fi = float(i) + 0.5;
        float r = sqrt(fi / uTaps) * uMaxCoc;
        float a = fi * GA;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
        float ci = cocAt(uv);
        // a tap contributes if its own blur disc reaches this pixel; foreground taps also bleed over sharp ground
        float reach = abs(ci);
        float w = clamp((reach - r + 1.5) / 1.5, 0.0, 1.0);
        if (ci < c0) w = max(w, clamp((-ci - r + 1.5) / 1.5, 0.0, 1.0));
        fg = max(fg, ci < 0.0 ? clamp((-ci - r + 1.0), 0.0, 1.0) * -ci : 0.0);
        vec3 s = texture2D(tScene, uv).rgb;
        // gentle highlight boost: bokeh discs read as discs, not mush
        w *= 1.0 + 0.6 * smoothstep(1.0, 6.0, max(s.r, max(s.g, s.b)));
        acc += s * w; wsum += w;
    }
    gl_FragColor = vec4(acc / wsum, max(abs(c0), fg));
}
`;

const compFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform sampler2D tDof;
uniform float uDofOn;
uniform vec2 uRes;
uniform float uTime;
uniform float uBloom;
uniform float uExposure;
uniform float uGrain;
uniform float uVignette;
uniform float uLetter;
uniform float uStreak;
uniform float uWhite;
uniform float uBlack;
uniform float uCA;
uniform float uAgX;
uniform vec3 uLift;
uniform vec3 uTint;
uniform sampler2D tLow;   // the smallest bloom level: how much light the whole frame holds
uniform sampler2D tMid;   // a mid bloom level, for the anamorphic streak
uniform float uHalo;
uniform float uAnam;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

// Narkowicz ACES fit: the disk's core rolls into white without a hard plateau
vec3 aces(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
// AgX (Sobotka), Filament fit, with a restrained punchy look: whites desaturate the way film and cloth do
vec3 agxContrast(vec3 x) { vec3 x2 = x * x, x4 = x2 * x2; return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
vec3 agx(vec3 c) {
    const mat3 toRec2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
    const mat3 fromRec2020 = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
    const mat3 inset = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
    const mat3 outset = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
    c = inset * (toRec2020 * c);
    c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
    c = agxContrast(c);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = pow(max(c, 0.0), vec3(1.18));
    c = l + 1.12 * (c - l);
    c = outset * c;
    c = pow(max(c, 0.0), vec3(2.2));
    return clamp(fromRec2020 * c, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

vec3 sceneAt(vec2 uv) {
    vec3 s = texture2D(tScene, uv).rgb;
    if (uDofOn > 0.5) {
        vec4 d = texture2D(tDof, uv);
        s = mix(s, d.rgb, smoothstep(0.6, 2.2, d.a));
    }
    return s;
}

void main() {
    vec2 uv = vUv;
    vec2 dc = uv - 0.5;
    vec3 col;
    if (uStreak > 0.002) {
        // light dragged toward the vanishing point: radial smear, weighted to the outer samples
        vec3 acc = vec3(0.0); float wsum = 0.0;
        for (int i = 0; i < 32; i++) {
            float t = float(i) / 31.0;
            float s = 1.0 - uStreak * 0.85 * t;
            float w = 1.0 - t * 0.5;
            vec3 c = texture2D(tScene, 0.5 + dc * s).rgb;
            acc += c * w * (1.0 + 2.0 * smoothstep(0.8, 3.0, max(c.r, max(c.g, c.b))) * uStreak);
            wsum += w;
        }
        col = acc / wsum;
    } else {
        // lateral CA grows toward the corners, like an old anamorphic at full aperture
        float ca = uCA * dot(dc, dc);
        col = vec3(sceneAt(uv - dc * ca).r, sceneAt(uv).g, sceneAt(uv + dc * ca).b);
    }
    vec3 bloom = texture2D(tBloom, uv).rgb;
    col += bloom * uBloom * vec3(1.06, 0.96, 0.88);
    if (uAnam > 0.001) {
        // anamorphic: bright points smear sideways into thin blue lines
        vec3 an = vec3(0.0);
        for (int i = -7; i <= 7; i++) {
            float o = float(i) / 7.0;
            vec3 s = texture2D(tMid, vec2(uv.x + o * 0.3, uv.y)).rgb;
            an += max(s - 0.15, 0.0) * exp(-abs(o) * 3.5);
        }
        col += an * vec3(0.35, 0.62, 1.0) * uAnam * 0.25;
    }
    if (uHalo > 0.001) {
        // the big ring a wide lens throws round a bright frame, split into a spectrum across its width, strongest at
        // the sides like the ghost of an anamorphic front element
        vec3 src = texture2D(tLow, vec2(0.5)).rgb;
        float lum = min(dot(src, vec3(0.3333)) * 4.0, 1.0);
        vec2 hp = dc * vec2(uRes.x / uRes.y, 1.0);
        float r = length(hp);
        float R0 = 0.74;
        float x = (r - R0) / 0.045;
        float ring = exp(-x * x * 0.5);
        vec3 spec = clamp(0.5 + 0.5 * cos(6.2831 * (x * 0.13 + vec3(0.0, 0.33, 0.67))), 0.0, 1.0);
        spec = mix(vec3(dot(spec, vec3(0.333))), spec, 0.75);
        float ang = atan(hp.y, hp.x);
        float side = 0.3 + 0.7 * pow(abs(cos(ang)), 1.2);
        side *= 0.7 + 0.3 * sin(ang * 5.0 + uTime * 0.15);
        col += spec * ring * side * (0.07 + 0.08 * lum) * uHalo;
    }
    col *= uExposure * uTint;
    col = mix(aces(col), agx(col * 1.15), uAgX);
    col = col + uLift * (1.0 - col);

    float vig = smoothstep(1.15, 0.2, length(dc * vec2(uRes.x / uRes.y, 1.0) * 0.82));
    col *= mix(1.0, vig, uVignette);
    col = toSRGB(col);

    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float gr = hash12(floor(uv * uRes) + fract(uTime * 13.7) * 371.0) + hash12(floor(uv * uRes * 0.5) + fract(uTime * 7.3) * 113.0) - 1.0;
    col += gr * uGrain * (0.35 + 0.65 * 4.0 * lum * (1.0 - lum));

    col = mix(col, vec3(1.0, 0.995, 0.985), uWhite);
    col *= 1.0 - uBlack;
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
        this.w = 4; this.h = 4;
        const opts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        this.rtScene = this.makeScene(4, 4, this.samples);
        this.rtBH = new THREE.WebGLRenderTarget(4, 4, opts);
        this.rtDof = new THREE.WebGLRenderTarget(4, 4, opts);
        this.mips = [];
        for (let i = 0; i < 8; i++) this.mips.push(new THREE.WebGLRenderTarget(4, 4, opts));

        this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        this.quad.frustumCulled = false;
        this.scene = new THREE.Scene();
        this.scene.add(this.quad);

        this.down = new THREE.ShaderMaterial({
            vertexShader: quadVert, fragmentShader: downFrag, depthTest: false, depthWrite: false,
            uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.0 }, uFirst: { value: 0 } },
        });
        this.up = new THREE.ShaderMaterial({
            vertexShader: quadVert, fragmentShader: upFrag, depthTest: false, depthWrite: false,
            blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
            uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } },
        });
        // focus / aperture are shared by the gather and the composite
        this.dofU = {
            tDepth: { value: null }, uNear: { value: 0.1 }, uFar: { value: 100 }, uFocus: { value: 5 }, uAperture: { value: 0 }, uMaxCoc: { value: 12 },
        };
        this.dof = new THREE.ShaderMaterial({
            vertexShader: quadVert, fragmentShader: dofFrag, depthTest: false, depthWrite: false,
            uniforms: Object.assign({ tScene: { value: null }, uTexel: { value: new THREE.Vector2() }, uTaps: { value: 32 } }, this.dofU),
        });
        this.comp = new THREE.ShaderMaterial({
            vertexShader: quadVert, fragmentShader: compFrag, depthTest: false, depthWrite: false,
            uniforms: {
                tScene: { value: null }, tBloom: { value: null }, tDof: { value: null }, uDofOn: { value: 0 }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 },
                uBloom: { value: 0.9 }, uExposure: { value: 1 }, uGrain: { value: 0.045 }, uVignette: { value: 0.55 }, uLetter: { value: 0 },
                uStreak: { value: 0 }, uWhite: { value: 0 }, uBlack: { value: 0 }, uCA: { value: 0.012 }, uAgX: { value: 0 },
                uLift: { value: new THREE.Vector3(0, 0, 0) }, uTint: { value: new THREE.Vector3(1, 1, 1) },
                tLow: { value: null }, tMid: { value: null }, uHalo: { value: 0 }, uAnam: { value: 0 },
            },
        });
        this.u = this.comp.uniforms;
        this.dofTaps = 32;
    }

    makeScene(w, h, samples) {
        const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples, depthBuffer: true });
        rt.depthTexture = new THREE.DepthTexture(w, h);
        rt.depthTexture.type = THREE.UnsignedIntType;
        return rt;
    }

    setSize(w, h, bhScale, levels, samples, dofTaps) {
        this.levels = levels;
        this.dofTaps = dofTaps;
        this.w = w; this.h = h;
        if (samples !== this.samples) {
            this.samples = samples;
            this.rtScene.dispose();
            this.rtScene = this.makeScene(w, h, samples);
        }
        this.rtScene.setSize(w, h);
        this.rtBH.setSize(Math.max(2, Math.round(w * bhScale)), Math.max(2, Math.round(h * bhScale)));
        this.rtDof.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
        let mw = w, mh = h;
        for (let i = 0; i < this.mips.length; i++) {
            mw = Math.max(1, Math.round(mw / 2)); mh = Math.max(1, Math.round(mh / 2));
            this.mips[i].setSize(mw, mh);
        }
        this.u.uRes.value.set(w, h);
    }

    // the depth-of-field gather is only used in the dive and the tesseract; compile it ahead of time
    warm() {
        if (!this.renderer.compileAsync) return;
        this.quad.material = this.dof;
        this.renderer.compileAsync(this.scene, this.cam).catch(() => {});
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
            this.up.uniforms.uRadius.value = 1.0;
            this.pass(this.up, this.mips[i - 1]);
        }
        this.renderer.autoClear = true;
        return this.mips[0].texture;
    }

    // camera: the perspective camera the scene target was rendered with (for linear depth)
    finish(threshold, camera) {
        const D = this.dofU;
        const dofOn = this.dofTaps > 0 && D.uAperture.value > 0.05 && camera;
        if (dofOn) {
            D.tDepth.value = this.rtScene.depthTexture;
            D.uNear.value = camera.near; D.uFar.value = camera.far;
            this.dof.uniforms.tScene.value = this.rtScene.texture;
            this.dof.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
            this.dof.uniforms.uTaps.value = this.dofTaps;
            this.pass(this.dof, this.rtDof);
        }
        this.u.uDofOn.value = dofOn ? 1 : 0;
        this.u.tDof.value = this.rtDof.texture;
        this.u.tScene.value = this.rtScene.texture;
        this.u.tBloom.value = this.bloom(threshold);
        this.u.tLow.value = this.mips[this.levels - 1].texture;
        this.u.tMid.value = this.mips[Math.min(2, this.levels - 1)].texture;
        this.pass(this.comp, null);
    }
}
