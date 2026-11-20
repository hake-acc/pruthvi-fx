// Procedural parchment, baked once into a texture: rgb = albedo, a = fibre height.
import { NOISE } from './glsl.js';
import { MAP } from './plan.js';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uMap;
uniform float uPW;
varying vec2 vUv;
${NOISE}

vec3 foxing(vec2 p, vec3 col, float sc, float thr, float amt){
    vec2 cell = floor(p / sc);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 c = cell + vec2(float(i), float(j));
        float h = hash12(c * 1.37 + sc);
        if (h < thr) continue;
        vec2 ctr = (c + hash22(c + sc)) * sc;
        float r = sc * (0.04 + 0.16 * hash12(c + 9.1)) * (h - thr) / (1. - thr) * 2.2;
        float d = length(p - ctr) + (vnoise(p * 0.18 + c) - .5) * r * 0.7;
        float spot = 1. - smoothstep(r * 0.25, r, d);
        float rim = exp(-pow((d - r * 0.82) / (r * 0.16 + 0.5), 2.));
        col = mix(col, col * vec3(0.80, 0.63, 0.44), spot * amt);
        col *= 1. - rim * amt * 0.22;
    }
    return col;
}

float tide(vec2 p, vec2 c, float r){
    float d = length(p - c) + (fbm(p * 0.005 + c * 0.01) - .5) * r * 0.45;
    return exp(-pow((d - r) / 5., 2.)) + (1. - smoothstep(r * 0.6, r, d)) * 0.18;
}

void main(){
    vec2 p = vec2(vUv.x * uMap.x, (1. - vUv.y) * uMap.y);
    float lo = fbm(p * 0.0012 + 3.1), mid = fbm(p * 0.0055 + 7.7);
    vec3 light = vec3(0.930, 0.862, 0.690), dark = vec3(0.815, 0.675, 0.445);
    vec3 col = mix(light, dark, smoothstep(0.28, 0.78, lo));
    col *= 0.94 + 0.12 * mid;

    float f1 = fbm(vec2(p.x * 0.03 + p.y * 0.012, p.y * 0.07));
    float f2 = fbm(vec2(p.x * 0.07 + p.y * 0.035, p.y * 0.010) + 11.);
    float f3 = fbm(vec2(p.x * 0.11, p.y * 0.016) + 23.);
    col *= 1. - 0.022 * smoothstep(0.55, 0.75, f1) - 0.03 * smoothstep(0.58, 0.78, f2) - 0.02 * smoothstep(0.6, 0.8, f3);
    col += vec3(0.03, 0.026, 0.02) * smoothstep(0.62, 0.82, fbm(p * 0.045 + 5.));

    col = foxing(p, col, 160., 0.82, 0.55);
    col = foxing(p, col, 47., 0.9, 0.42);

    float t = tide(p, vec2(1530., 420.), 230.) + tide(p, vec2(3930., 1330.), 310.) + tide(p, vec2(250., 1560.), 170.) + tide(p, vec2(2860., 1650.), 120.);
    col = mix(col, col * vec3(0.84, 0.70, 0.52), clamp(t, 0., 1.) * 0.32);

    float e = min(min(p.x, uMap.x - p.x), min(p.y, uMap.y - p.y)) + (fbm(p * 0.007) - .5) * 90.;
    float burn = 1. - smoothstep(0., 190., e);
    col = mix(col, vec3(0.60, 0.40, 0.20), burn * burn * 0.8);
    col = mix(col, vec3(0.30, 0.17, 0.08), (1. - smoothstep(0., 30., e)) * 0.75);

    float px = mod(p.x, uPW), dc = min(px, uPW - px);
    float dh = abs(p.y - uMap.y * 0.5) + (vnoise(p * 0.05) - .5) * 3.;
    col *= 1. - 0.11 * exp(-dc / 2.2) - 0.05 * exp(-dc / 16.);
    col += vec3(0.025, 0.02, 0.012) * exp(-dc / 9.) * (1. - exp(-dc / 2.5));
    col *= 1. - 0.06 * exp(-dh / 2.) - 0.02 * exp(-dh / 12.);

    float h = 0.5 + 0.28 * (f1 - .5) + 0.3 * (fbm(p * 0.2) - .5) + 0.12 * (f3 - .5) - 0.35 * exp(-dc / 3.) - 0.18 * exp(-dh / 3.);
    gl_FragColor = vec4(col, clamp(h, 0., 1.));
}`;

export function bakePaper(renderer, width) {
    const THREE = window.THREE;
    const height = Math.round(width * MAP.H / MAP.W);
    const rt = new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: new THREE.Vector2(MAP.W, MAP.H) }, uPW: { value: MAP.PW } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
        fragmentShader: FRAG, depthTest: false, depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const scene = new THREE.Scene(); scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null);
    mat.dispose(); quad.geometry.dispose();
    return rt;
}
