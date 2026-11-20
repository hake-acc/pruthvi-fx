// Live ink layer rendered in map space each frame: footprints, banners, remarks, moving staircases.
// Output: R = ink coverage, G = wetness * coverage, B = knockout (clears the map ink beneath), A = max.
import { NOISE, DECODE } from './glsl.js';
import { MAP } from './plan.js';

const MAX_PRINTS = 900;

const PRINT_VERT = /* glsl */ `
attribute vec2 aPos; attribute float aAng, aBirth, aKind, aSize;
varying vec2 vQ; varying float vBirth, vKind;
void main(){
    vec2 size = aKind > 1.5 ? vec2(10., 10.) : vec2(10., 23.);
    size *= aSize * 1.5;
    vec2 q = position.xy * size;
    float c = cos(aAng), s = sin(aAng);
    vec2 w = aPos + vec2(c * q.y - s * q.x, s * q.y + c * q.x);
    vQ = position.xy * size / (aSize * 1.5); vBirth = aBirth; vKind = aKind;
    gl_Position = projectionMatrix * viewMatrix * vec4(w.x, -w.y, 0., 1.);
}`;

const PRINT_FRAG = /* glsl */ `
precision highp float;
uniform float uNow, uLife, uGlobal;
varying vec2 vQ; varying float vBirth, vKind;
${NOISE}
float ell(vec2 p, vec2 c, vec2 r){ return (length((p - c) / r) - 1.) * min(r.x, r.y); }
void main(){
    float age = uNow - vBirth;
    if (age < 0. || age > uLife) discard;
    vec2 p = vQ;
    float d;
    if (vKind < 1.5) {
        if (vKind > 0.5) p.x = -p.x;
        float sole = ell(p, vec2(0.6, 4.6), vec2(3.7, 6.3));
        float heel = ell(p, vec2(-0.1, -7.4), vec2(3.0, 2.6));
        d = min(sole, heel);
    } else {
        float pad = ell(p, vec2(0., -1.1), vec2(2.6, 2.1));
        float t1 = length(p - vec2(-2.5, 1.7)) - 1.1;
        float t2 = length(p - vec2(-0.9, 3.1)) - 1.1;
        float t3 = length(p - vec2(0.9, 3.1)) - 1.1;
        float t4 = length(p - vec2(2.5, 1.7)) - 1.1;
        d = min(pad, min(min(t1, t2), min(t3, t4)));
    }
    float grow = mix(0.45, 0., smoothstep(0., 0.8, age));
    float cov = 1. - smoothstep(-0.55 - grow, 0.45 + grow, d);
    float n = vnoise(vQ * 0.9 + vBirth * 17.);
    cov *= 0.72 + 0.4 * n;
    float appear = smoothstep(0., 0.06, age);
    float fade = 1. - smoothstep(uLife * 0.42, uLife, age);
    cov *= appear * fade * uGlobal;
    float wet = exp(-age / 0.55) * 0.85;
    if (cov < 0.004) discard;
    gl_FragColor = vec4(cov, cov * wet, 0., cov);
}`;

const SPRITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform float uNow, uTmax, uAlpha, uDissolve, uSeed, uKnock;
uniform vec2 uSize;
varying vec2 vUv;
${NOISE}
${DECODE}
void main(){
    vec4 s = texture2D(tMap, vUv);
    if (s.a < 0.003) discard;
    float t = inkTime(s, uTmax);
    float shown = step(t, uNow);
    float ink = s.a * inkDensity(s) * shown;
    float age = uNow - t;
    float wet = shown * exp(-max(age, 0.) / 0.9);
    float grow = smoothstep(0., 0.5, uNow);
    float knock = s.a * uKnock * grow;
    vec2 p = vUv * uSize;
    float n = fbm3(p * 0.045 + uSeed) * 0.75 + vnoise(p * 0.4 + uSeed) * 0.25;
    float keep = smoothstep(uDissolve * 1.15 - 0.1, uDissolve * 1.15 + 0.02, n);
    ink *= keep * uAlpha; knock *= keep * uAlpha;
    gl_FragColor = vec4(ink, ink * max(wet, (1. - keep) * 0.8 * step(0.001, uDissolve)), knock, max(ink, knock));
}`;

export function createOverlay(renderer, quality) {
    const THREE = window.THREE;
    const width = quality.overlay, height = Math.round(width * MAP.H / MAP.W);
    const rt = new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(0, MAP.W, 0, -MAP.H, -10, 10);
    const blend = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, transparent: true, depthTest: false, depthWrite: false };

    // ------------------------------------------------------------------ footprints
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
    const aPos = new Float32Array(MAX_PRINTS * 2), aAng = new Float32Array(MAX_PRINTS), aBirth = new Float32Array(MAX_PRINTS).fill(-1e5), aKind = new Float32Array(MAX_PRINTS), aSize = new Float32Array(MAX_PRINTS).fill(1);
    const attrs = {
        aPos: new THREE.InstancedBufferAttribute(aPos, 2), aAng: new THREE.InstancedBufferAttribute(aAng, 1), aBirth: new THREE.InstancedBufferAttribute(aBirth, 1),
        aKind: new THREE.InstancedBufferAttribute(aKind, 1), aSize: new THREE.InstancedBufferAttribute(aSize, 1),
    };
    Object.entries(attrs).forEach(([k, a]) => { a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); });
    geo.instanceCount = MAX_PRINTS;
    const printMat = new THREE.ShaderMaterial({ uniforms: { uNow: { value: 0 }, uLife: { value: 5.5 }, uGlobal: { value: 1 } }, vertexShader: PRINT_VERT, fragmentShader: PRINT_FRAG, ...blend });
    const prints = new THREE.Mesh(geo, printMat);
    prints.frustumCulled = false; prints.renderOrder = 1;
    scene.add(prints);
    let head = 0, dirty = false;
    function addPrint(x, y, ang, kind, now, size = 1) {
        aPos[head * 2] = x; aPos[head * 2 + 1] = y; aAng[head] = ang; aBirth[head] = now; aKind[head] = kind; aSize[head] = size;
        head = (head + 1) % MAX_PRINTS; dirty = true;
    }
    function clearPrints() { aBirth.fill(-1e5); dirty = true; }

    // ------------------------------------------------------------------ ink sprites
    const spriteVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
    const quad = new THREE.PlaneGeometry(1, 1);
    const quadL = new THREE.PlaneGeometry(1, 1); quadL.translate(0.5, 0, 0);
    class InkSprite {
        constructor(src, opts = {}) {
            this.tex = new THREE.CanvasTexture(src.canvas);
            this.tex.premultiplyAlpha = true; this.tex.generateMipmaps = false;
            this.tex.minFilter = THREE.LinearFilter; this.tex.magFilter = THREE.LinearFilter;
            this.w = src.w; this.h = src.h; this.duration = src.duration || 1;
            this.mat = new THREE.ShaderMaterial({
                uniforms: {
                    tMap: { value: this.tex }, uNow: { value: -1 }, uTmax: { value: src.tmax }, uAlpha: { value: 1 }, uDissolve: { value: 0 },
                    uSeed: { value: Math.random() * 50 }, uKnock: { value: opts.knock ?? 1 }, uSize: { value: new THREE.Vector2(src.w, src.h) },
                },
                vertexShader: spriteVert, fragmentShader: SPRITE_FRAG, ...blend,
            });
            this.mesh = new THREE.Mesh(opts.anchorLeft ? quadL : quad, this.mat);
            this.mesh.scale.set(src.w, src.h, 1);
            this.mesh.renderOrder = opts.order ?? 5;
            this.mesh.frustumCulled = false;
            this.born = null; this.x = 0; this.y = 0;
            scene.add(this.mesh);
        }
        place(x, y, rot = 0) { this.x = x; this.y = y; this.mesh.position.set(x, -y, 0); this.mesh.rotation.z = -rot; }
        start(now) { this.born = now; this.mat.uniforms.uDissolve.value = 0; this.dissolveAt = null; this.mesh.visible = true; }
        dissolve(now, dur = 1.1) { if (this.dissolveAt == null) { this.dissolveAt = now; this.dissolveDur = dur; } }
        refresh(src) { if (src) { this.tex.image = src.canvas; this.w = src.w; this.h = src.h; } this.tex.needsUpdate = true; }
        tick(now) {
            const u = this.mat.uniforms;
            u.uNow.value = this.born == null ? -1 : now - this.born;
            if (this.dissolveAt != null) {
                u.uDissolve.value = Math.min(1, (now - this.dissolveAt) / this.dissolveDur);
                if (u.uDissolve.value >= 1) { this.mesh.visible = false; return false; }
            }
            this.mesh.visible = this.born != null;
            return true;
        }
        destroy() { scene.remove(this.mesh); this.mat.dispose(); this.tex.dispose(); }
    }

    function render(now, globalAlpha) {
        printMat.uniforms.uNow.value = now;
        printMat.uniforms.uGlobal.value = globalAlpha;
        if (dirty) { Object.values(attrs).forEach((a) => (a.needsUpdate = true)); dirty = false; }
        const prevColor = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
        renderer.setRenderTarget(rt);
        renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false);
        renderer.render(scene, cam);
        renderer.setRenderTarget(null);
        renderer.setClearColor(prevColor, prevAlpha);
    }

    return { rt, scene, addPrint, clearPrints, InkSprite, render };
}
