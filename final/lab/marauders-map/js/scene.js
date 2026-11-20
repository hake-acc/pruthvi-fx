// The parchment in 3D: six accordion panels on spring-loaded hinges, a desk beneath, and the camera.
import { NOISE, DECODE } from './glsl.js';
import { MAP } from './plan.js';
import { TMAX } from './inkmap.js';

const S = 1 / 1000;                 // map units → world
export const PW = MAP.PW * S, PH = MAP.H * S, MW = MAP.W * S;
const EPS = 0.0017;                 // paper thickness when stacked
export const OPEN_ANGLE = 0.11;

const PANEL_VERT = /* glsl */ `
uniform float uBend, uCurl, uPanel, uTime, uPW, uPH;
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vU;
void main(){
    vec3 p = position;
    float u = p.x / uPW, vy = p.y / uPH;
    float sinu = sin(3.14159265 * u), cosu = cos(3.14159265 * u);
    float ay = abs(vy) * 2.;
    float curl = uCurl * pow(ay, 6.);
    float wv = 0.0022 * sin(vy * 9. + uPanel * 1.7 + uTime * 0.4) * sinu;
    p.z += uBend * sinu + curl + wv;
    float dzdx = (uBend * 3.14159265 * cosu + 0.0022 * sin(vy * 9. + uPanel * 1.7 + uTime * 0.4) * 3.14159265 * cosu) / uPW;
    float dzdy = uCurl * 6. * pow(ay, 5.) * 2. * sign(vy) / uPH + 0.0022 * 9. * cos(vy * 9. + uPanel * 1.7 + uTime * 0.4) * sinu / uPH;
    vN = normalize(mat3(modelMatrix) * normalize(vec3(-dzdx, -dzdy, 1.)));
    vec4 w = modelMatrix * vec4(p, 1.);
    vW = w.xyz; vUv = uv; vU = u;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;

const PANEL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tPaper, tInk, tOver;
uniform float uInkT, uWipe, uTime, uExposure, uCreaseL, uCreaseR, uHasInk;
uniform vec2 uWand, uMap, uInkPx;
uniform vec3 uLight, uCam;
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vU;
${NOISE}
${DECODE}
#define TMAX ${TMAX.toFixed(1)}

void main(){
    vec2 p = vec2(vUv.x * uMap.x, (1. - vUv.y) * uMap.y);

    // torn outer border
    float e = min(min(p.x, uMap.x - p.x), min(p.y, uMap.y - p.y));
    float edge = 1.;
    if (e < 40.) {
        float en = e + (fbm3(p * 0.035) - .5) * 16. + (vnoise(p * 0.32) - .5) * 3.;
        edge = smoothstep(2.0, 4.5, en);
        if (edge < 0.01) discard;
    }

    vec4 pap = texture2D(tPaper, vUv);
    vec3 paper = pap.rgb;
    float fib = vnoise(vec2(p.x * 0.3 + p.y * 0.1, p.y * 0.55)) * 0.55 + vnoise(p * 0.45) * 0.45;
    paper *= 0.975 + 0.035 * fib;

    // ---------------------------------------------------------------- main ink
    float ink = 0., wet = 0.;
    if (uHasInk > 0.5) {
        vec4 s0 = texture2D(tInk, vUv);
        float t0 = inkTime(s0, TMAX);
        float on0 = s0.a * inkDensity(s0) * step(t0, uInkT) * step(0.004, s0.a);
        float age0 = uInkT - t0;
        wet = on0 * exp(-max(age0, 0.) / 1.1);

        float bleed = 0., wetN = 0.;
        float fa = vnoise(p * 0.07) * 6.2832;
        vec2 fd = vec2(cos(fa), sin(fa));
        for (int i = 0; i < TAPS; i++) {
            float fi = float(i);
            float ang = fi * 2.39996 + fa * 0.3;
            float rad = (0.9 + 1.0 * fract(fi * 0.618)) * (1.0 + 0.9 * fib);
            vec2 o = vec2(cos(ang), sin(ang)) * rad;
            o += fd * dot(o, fd) * 0.8;
            vec4 s = texture2D(tInk, vUv + o * uInkPx);
            float t = inkTime(s, TMAX);
            float ag = uInkT - t;
            float reach = (1. - exp(-max(ag, 0.) / 0.45)) * step(0., ag);
            float w = s.a * inkDensity(s) * reach * step(0.004, s.a) * (1. - length(o) / 4.2);
            bleed = max(bleed, w);
            wetN = max(wetN, w * exp(-max(ag, 0.) / 1.1));
        }
        ink = min(1., max(on0 * 1.18, bleed * (0.32 + 0.4 * fib)));
        wet = max(wet, wetN * 0.6);

        if (uWipe > 0.) {
            float d = distance(p, uWand) / 5200.;
            float th = uWipe * 1.45 - d - fbm3(p * 0.012) * 0.35;
            ink *= 1. - smoothstep(0.02, 0.16, th);
            wet = max(wet * (1. - step(0.02, th)), smoothstep(-0.08, 0.04, th) * (1. - smoothstep(0.04, 0.16, th)) * ink * 0.6);
        }
    }

    // ---------------------------------------------------------------- live layer (footprints, names, remarks)
    vec4 ov = texture2D(tOver, vUv);
    float knock = ov.b;
    ink *= 1. - knock;
    paper = mix(paper, paper * 1.015 + 0.01, knock * 0.6);
    float oi = ov.r, ow = ov.g / max(ov.r, 1e-3);
    float inkAll = max(ink, oi);
    float wetAll = mix(wet / max(ink, 1e-3), ow, oi / max(inkAll, 1e-3));
    wetAll = clamp(wetAll, 0., 1.);

    vec3 dry = vec3(0.235, 0.135, 0.07);
    vec3 wetc = vec3(0.055, 0.045, 0.085);
    vec3 inkc = mix(dry, wetc, wetAll);
    inkc *= 0.85 + 0.3 * vnoise(p * 0.6);

    vec3 col;
    if (gl_FrontFacing) {
        col = mix(paper, inkc, clamp(inkAll * 0.94, 0., 1.));
    } else {
        col = paper * vec3(0.95, 0.93, 0.9);
        col = mix(col, vec3(0.42, 0.3, 0.2), clamp(inkAll, 0., 1.) * 0.16);
    }

    // ---------------------------------------------------------------- light
    vec3 N = normalize(vN) * (gl_FrontFacing ? 1. : -1.);
    vec3 V = normalize(uCam - vW);
    vec3 L = normalize(uLight);
    float dif = max(dot(N, L), 0.);
    float hgt = pap.a;
    float emb = clamp((dFdx(hgt) - dFdy(hgt)) * 0.9, -0.05, 0.05);
    float shade = 0.48 + 0.62 * dif + emb;
    float spec = pow(max(dot(reflect(-L, N), V), 0.), 24.) * 0.07;
    spec += pow(max(dot(reflect(-L, N), V), 0.), 60.) * 0.35 * wetAll * inkAll;

    // creases: valley shadow / ridge glint
    float cl = uCreaseL, cr = uCreaseR;
    float ao = 1.;
    ao -= max(cl, 0.) * 0.38 * exp(-vU * 38.);
    ao -= max(cr, 0.) * 0.38 * exp(-(1. - vU) * 38.);
    float glint = max(-cl, 0.) * 0.16 * exp(-vU * 140.) + max(-cr, 0.) * 0.16 * exp(-(1. - vU) * 140.);

    col = col * shade * ao + glint + spec;
    col *= uExposure;
    gl_FragColor = vec4(col, edge);
}`;

const DESK_FRAG = /* glsl */ `
precision highp float;
uniform vec4 uRect; uniform float uLift, uExposure, uTime;
uniform vec2 uLamp;
varying vec2 vP;
${NOISE}
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
void main(){
    vec2 c = (uRect.xy + uRect.zw) * 0.5, hs = (uRect.zw - uRect.xy) * 0.5;
    float blur = 0.03 + uLift * 1.6;
    float d = sdBox(vP - c - vec2(0.035, -0.05) * (1. + uLift * 8.), hs);
    float sh = 1. - smoothstep(-blur * 0.6, blur * 2.2, d);
    float contact = 1. - smoothstep(-0.004, 0.02, sdBox(vP - c - vec2(0.006, -0.008), hs));
    float pool = exp(-dot(vP - uLamp, vP - uLamp) * 0.12);
    float grain = fbm3(vec2(vP.x * 2.5, vP.y * 40.)) * 0.5 + vnoise(vP * 300.) * 0.5;
    vec3 col = mix(vec3(0.012, 0.009, 0.007), vec3(0.085, 0.058, 0.035), pool) * (0.86 + 0.28 * grain);
    col *= 1. - sh * 0.72 - contact * 0.2;
    gl_FragColor = vec4(col * uExposure, 1.);
}`;

export function createStage(canvas, quality) {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.tier > 0, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__MM_CAPTURE });
    renderer.setClearColor(0x050403, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 40);

    const shared = {
        tPaper: { value: null }, tInk: { value: null }, tOver: { value: null },
        uInkT: { value: -1 }, uWipe: { value: 0 }, uTime: { value: 0 }, uExposure: { value: 0 }, uHasInk: { value: 0 },
        uWand: { value: new THREE.Vector2(400, 1185) }, uMap: { value: new THREE.Vector2(MAP.W, MAP.H) },
        uInkPx: { value: new THREE.Vector2(1 / MAP.W, 1 / MAP.H) },
        uLight: { value: new THREE.Vector3(-0.45, 0.55, 0.9) }, uCam: { value: new THREE.Vector3() },
        uPW: { value: PW }, uPH: { value: PH }, uCurl: { value: 0.004 },
    };

    const root = new THREE.Group();
    scene.add(root);
    const panels = [], hinges = [];
    let parent = root;
    for (let i = 0; i < MAP.PANELS; i++) {
        const holder = new THREE.Group();
        if (i > 0) {
            const s = i % 2 ? 1 : -1, d = -s * EPS;
            const hinge = new THREE.Group();
            hinge.position.set(PW, 0, d);
            parent.add(hinge);
            holder.position.set(0, 0, -d);
            hinge.add(holder);
            hinges.push({ g: hinge, s, theta: Math.PI, vel: 0, target: Math.PI, delay: 0 });
        } else {
            parent.add(holder);
        }
        const geo = new THREE.PlaneGeometry(PW, PH, quality.tier > 0 ? 24 : 14, quality.tier > 0 ? 48 : 28);
        geo.translate(PW / 2, 0, 0);
        const uv = geo.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / MAP.PANELS);
        const mat = new THREE.ShaderMaterial({
            uniforms: { ...shared, uBend: { value: 0 }, uPanel: { value: i }, uCreaseL: { value: 0 }, uCreaseR: { value: 0 } },
            vertexShader: PANEL_VERT, fragmentShader: PANEL_FRAG,
            defines: { TAPS: quality.taps },
            side: THREE.DoubleSide, transparent: true, depthWrite: true,
            extensions: { derivatives: true },
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 10 - i;
        mesh.userData.panel = i;
        holder.add(mesh);
        panels.push(mesh);
        parent = holder;
    }

    const deskMat = new THREE.ShaderMaterial({
        uniforms: { uRect: { value: new THREE.Vector4(0, -0.9, 0.8, 0.9) }, uLift: { value: 0 }, uExposure: shared.uExposure, uTime: shared.uTime, uLamp: { value: new THREE.Vector2(1.2, 0.4) } },
        vertexShader: 'varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vP = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: DESK_FRAG, depthWrite: false,
    });
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), deskMat);
    desk.position.set(2.4, 0, -0.03);
    desk.renderOrder = -1;
    scene.add(desk);

    // ------------------------------------------------------------------ fold dynamics
    const fold = { open: false, lift: 0, liftV: 0, liftTarget: 0, clock: 0 };
    function setOpen(open, now) {
        fold.open = open;
        const n = hinges.length;
        hinges.forEach((h, k) => {
            h.delay = now + (open ? k * 0.26 : (n - 1 - k) * 0.2);
            h.pendingTarget = open ? OPEN_ANGLE : Math.PI;
        });
        fold.liftTarget = 1;
        fold.liftUntil = now + (open ? 2.6 : 2.4);
    }
    function snap(open) {
        hinges.forEach((h) => { h.theta = h.target = h.pendingTarget = open ? OPEN_ANGLE : Math.PI; h.vel = 0; });
        fold.open = open; fold.lift = 0; fold.liftTarget = 0;
    }

    const corner = new THREE.Vector3(), box = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    function updateFold(dt, now) {
        const K = 11, C = 2 * Math.sqrt(K) * 0.82;
        hinges.forEach((h, k) => {
            if (h.pendingTarget !== undefined && now >= h.delay) { h.target = h.pendingTarget; h.pendingTarget = undefined; }
            const steps = 3, sdt = dt / steps;
            for (let i = 0; i < steps; i++) {
                const a = K * (h.target - h.theta) - C * h.vel;
                h.vel += a * sdt; h.theta += h.vel * sdt;
            }
            if (h.theta > Math.PI) { h.theta = Math.PI; h.vel = Math.min(0, h.vel) * -0.2; }
            h.g.rotation.y = h.s * h.theta;
            const mat = panels[k + 1].material.uniforms;
            mat.uBend.value = Math.max(-0.07, Math.min(0.07, -h.vel * 0.022 * h.s)) + Math.sin(now * 0.6 + k) * 0.0012 * (fold.open ? 1 : 0);
        });
        panels[0].material.uniforms.uBend.value = fold.open ? Math.sin(now * 0.5) * 0.001 : 0;
        if (fold.liftUntil && now > fold.liftUntil) { fold.liftTarget = 0; fold.liftUntil = 0; }
        const la = 14 * (fold.liftTarget - fold.lift) - 6.5 * fold.liftV;
        fold.liftV += la * dt; fold.lift += fold.liftV * dt;
        root.position.z = fold.lift * 0.09;
        root.rotation.x = -fold.lift * 0.09;
        root.rotation.y = fold.lift * 0.05;
        root.position.y = 0;

        panels.forEach((m, i) => {
            const u = m.material.uniforms;
            const left = i > 0 ? hinges[i - 1] : null, right = i < hinges.length ? hinges[i] : null;
            const amt = (h) => (h ? Math.min(1, Math.sin(Math.min(h.theta, Math.PI / 2)) * 4.2) * (h.s > 0 ? -1 : 1) : 0);
            u.uCreaseL.value = amt(left); u.uCreaseR.value = amt(right);
        });

        root.updateMatrixWorld(true);
        box.minX = box.minY = Infinity; box.maxX = box.maxY = -Infinity;
        panels.forEach((m) => {
            for (const [x, y] of [[0, -PH / 2], [PW, -PH / 2], [0, PH / 2], [PW, PH / 2]]) {
                corner.set(x, y, 0).applyMatrix4(m.matrixWorld);
                box.minX = Math.min(box.minX, corner.x); box.maxX = Math.max(box.maxX, corner.x);
                box.minY = Math.min(box.minY, corner.y); box.maxY = Math.max(box.maxY, corner.y);
            }
        });
        deskMat.uniforms.uRect.value.set(box.minX, box.minY, box.maxX, box.maxY);
        deskMat.uniforms.uLift.value = fold.lift * 0.05 + 0.002;
        return box;
    }
    const openness = () => hinges.reduce((s, h) => s + (Math.PI - h.theta) / (Math.PI - OPEN_ANGLE), 0) / hinges.length;

    // ------------------------------------------------------------------ camera
    const view = { x: PW / 2, y: 0, h: PH / 0.84, tx: PW / 2, ty: 0, th: PH / 0.84, tiltX: 0, tiltY: 0, ptX: 0, ptY: 0 };
    function applyCamera(dt, speed = 5.5) {
        const k = 1 - Math.exp(-dt * speed);
        view.x += (view.tx - view.x) * k; view.y += (view.ty - view.y) * k; view.h += (view.th - view.h) * k;
        view.tiltX += (view.ptX - view.tiltX) * (1 - Math.exp(-dt * 3)); view.tiltY += (view.ptY - view.tiltY) * (1 - Math.exp(-dt * 3));
        const dist = view.h / 2 / Math.tan((camera.fov * Math.PI) / 360);
        camera.position.set(view.x + view.tiltX * 0.06 * view.h, view.y - 0.1 * view.h + view.tiltY * 0.05 * view.h, dist);
        camera.lookAt(view.x, view.y, 0);
        shared.uCam.value.copy(camera.position);
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function pick(clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(panels, false)[0];
        if (!hit || !hit.uv) return null;
        return { x: hit.uv.x * MAP.W, y: (1 - hit.uv.y) * MAP.H, panel: hit.object.userData.panel, front: hit.face && hit.face.normal ? true : true };
    }
    // world-units per CSS pixel at the map plane
    const worldPerPx = () => view.h / Math.max(1, canvas.clientHeight);

    function resize() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
    }

    return { THREE, renderer, scene, camera, root, panels, hinges, shared, setOpen, snap, updateFold, openness, view, applyCamera, pick, worldPerPx, resize, box, S, fold };
}
