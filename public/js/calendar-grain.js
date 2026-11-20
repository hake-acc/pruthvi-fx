// Contact page: the cursor inks the calendar. The pointer lays ink along its path into a low-res field (capsules
// from the last position to this one, so fast strokes stay unbroken); the ink bleeds into its neighbours and dries
// over about a second. The field prints onto the calendar as a halftone: round dots on a 45 degree screen, sized by
// the ink under each dot, near-black over the light paper and off-white over the dancer and the ochre glyphs, and
// its slope bends the calendar beneath like a lens of wet ink. Only pointer (mouse, pen, touch) movement lays ink.
// At rest the GL canvas is hidden and the 2D calendar shows through untouched.
(() => {
    'use strict';

    const CELL = 8;          // css px per field texel
    const PITCH = 6.5;       // css px between halftone dots
    const DRY_MS = 300;      // ink time constant
    const BLEED = 0.22;      // share of the neighbours' ink taken per 60 Hz frame
    const LIFE_MS = 1700;    // after the last stamp the field is dry; the canvas hides
    const MAX_SEG = 16;      // stamps folded into one frame
    const LENS = 7;          // css px of refraction per unit of ink slope
    const INK_DARK = [18 / 255, 19 / 255, 22 / 255];
    const INK_LIGHT = [244 / 255, 242 / 255, 234 / 255];
    const LUMA_SPLIT = 0.6;

    const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

    // One pass: bleed, dry, then add this frame's stamps. A stamp is a capsule (p0 -> p1) with an amount and a radius.
    const INK = `#version 300 es
precision highp float;
uniform sampler2D u_prev;
uniform float u_keep;
uniform float u_bleed;
uniform float u_cell;
uniform int u_n;
uniform vec4 u_seg[${MAX_SEG}];
uniform vec2 u_par[${MAX_SEG}];
out vec4 FragColor;
float ink(ivec2 p) {
    ivec2 s = textureSize(u_prev, 0);
    return texelFetch(u_prev, clamp(p, ivec2(0), s - 1), 0).r;
}
void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    float c = ink(p);
    float nb = 0.25 * (ink(p + ivec2(1, 0)) + ink(p - ivec2(1, 0)) + ink(p + ivec2(0, 1)) + ink(p - ivec2(0, 1)));
    float v = max(mix(c, max(c, nb), u_bleed) * u_keep - 0.0035, 0.0);
    vec2 x = gl_FragCoord.xy * u_cell;
    for (int i = 0; i < ${MAX_SEG}; i++) {
        if (i >= u_n) break;
        vec2 a = u_seg[i].xy, b = u_seg[i].zw, ab = b - a;
        float h = clamp(dot(x - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
        float d = length(x - a - ab * h);
        vec2 q = u_par[i];
        v += exp(-d * d / (q.y * q.y)) * q.x;
    }
    FragColor = vec4(min(v, 1.0), 0.0, 0.0, 1.0);
}`;

    const DRAW = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform sampler2D u_field;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform float u_x0;
uniform float u_pitch;
uniform float u_lens;
uniform vec3 u_dark;
uniform vec3 u_light;
uniform float u_split;
out vec4 FragColor;

const mat2 ROT = mat2(0.70710678, 0.70710678, -0.70710678, 0.70710678);

float field(vec2 s) { return texture(u_field, s / u_resolution).r; }

vec3 at(vec2 p) {
    ivec2 size = textureSize(u_input, 0);
    return texelFetch(u_input, clamp(ivec2(p), ivec2(0), size - 1), 0).rgb;
}

void main() {
    float H = float(textureSize(u_input, 0).y);
    vec2 screen = vec2(u_x0 + gl_FragCoord.x, gl_FragCoord.y) / u_dpr;

    float e = 5.0;
    vec2 slope = vec2(field(screen + vec2(e, 0.0)) - field(screen - vec2(e, 0.0)), field(screen + vec2(0.0, e)) - field(screen - vec2(0.0, e)));
    vec2 off = floor(-slope * u_lens * u_dpr + 0.5);
    vec2 p = vec2(u_x0 + gl_FragCoord.x, H - gl_FragCoord.y) + vec2(off.x, -off.y);
    vec3 col = at(p);

    // dot centre on the rotated screen, back in screen space, so every dot takes one ink value and stays round
    vec2 q = ROT * screen / u_pitch;
    vec2 cell = floor(q) + 0.5;
    vec2 centre = transpose(ROT) * (cell * u_pitch);
    float k = field(centre);
    if (k > 0.015) {
        float jitter = fract(dot(cell, vec2(0.7548776662, 0.5698402910)));
        float r = sqrt(k) * u_pitch * (0.62 + 0.12 * jitter);
        float d = length((q - cell) * u_pitch);
        float aa = 0.7 / u_dpr;
        float cover = 1.0 - smoothstep(r - aa, r + aa, d);
        vec2 cp = centre * u_dpr;
        vec3 under = at(vec2(cp.x, H - cp.y));
        vec3 ink = dot(under, vec3(0.299, 0.587, 0.114)) > u_split ? u_dark : u_light;
        col = mix(col, ink, cover);
    }
    FragColor = vec4(col, 1.0);
}`;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let gl = null, glCanvas = null, src = null, ok = false;
    let pInk = null, pDraw = null;
    const U = { ink: {}, draw: {} };
    let texIn = null, inW = 0, inH = 0;
    let simW = 0, simH = 0, simTex = [null, null], simFbo = [null, null], simIdx = 0;
    let vw = 0, vh = 0, dpr = 1;
    let shown = false, dirty = true, lastNow = 0, lastStamp = -Infinity, last = null;
    const segs = new Float32Array(MAX_SEG * 4), pars = new Float32Array(MAX_SEG * 2);
    let nSeg = 0;
    const PERF_N = 2048, perf = new Float32Array(PERF_N);
    let perfI = 0;

    function fail() {
        ok = false;
        if (glCanvas) glCanvas.remove();
        glCanvas = null; gl = null;
    }

    function program(fs, names, store) {
        const sh = (type, s) => {
            const o = gl.createShader(type);
            gl.shaderSource(o, s);
            gl.compileShader(o);
            return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null;
        };
        const vs = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, fs);
        if (!vs || !f) return null;
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, f);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
        for (const n of names) store[n] = gl.getUniformLocation(p, n);
        return p;
    }

    function texture(filter) {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
    }

    function init() {
        glCanvas = document.createElement('canvas');
        glCanvas.className = 'gc-grain';
        glCanvas.setAttribute('aria-hidden', 'true');
        gl = glCanvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
        if (!gl) { fail(); return; }
        pInk = program(INK, ['u_prev', 'u_keep', 'u_bleed', 'u_cell', 'u_n', 'u_seg', 'u_par'], U.ink);
        pDraw = program(DRAW, ['u_input', 'u_field', 'u_resolution', 'u_dpr', 'u_x0', 'u_pitch', 'u_lens', 'u_dark', 'u_light', 'u_split'], U.draw);
        if (!pInk || !pDraw) { fail(); return; }
        gl.useProgram(pDraw);
        gl.uniform1i(U.draw.u_input, 0);
        gl.uniform1i(U.draw.u_field, 1);
        gl.uniform1f(U.draw.u_pitch, PITCH);
        gl.uniform1f(U.draw.u_lens, LENS);
        gl.uniform3fv(U.draw.u_dark, INK_DARK);
        gl.uniform3fv(U.draw.u_light, INK_LIGHT);
        gl.uniform1f(U.draw.u_split, LUMA_SPLIT);
        gl.activeTexture(gl.TEXTURE0); texIn = texture(gl.NEAREST);
        gl.activeTexture(gl.TEXTURE1);
        // 8-bit ink is enough: drying subtracts a floor every pass, so nothing lingers at a rounding fixed point
        for (let i = 0; i < 2; i++) { simTex[i] = texture(gl.LINEAR); simFbo[i] = gl.createFramebuffer(); }
        glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });
        ok = true;
        bindPointer();
    }

    function allocSim() {
        simW = Math.max(2, Math.ceil(vw / CELL));
        simH = Math.max(2, Math.ceil(vh / CELL));
        const zero = new Uint8Array(simW * simH * 4);
        gl.activeTexture(gl.TEXTURE1);
        for (let i = 0; i < 2; i++) {
            gl.bindTexture(gl.TEXTURE_2D, simTex[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, simW, simH, 0, gl.RGBA, gl.UNSIGNED_BYTE, zero);
            gl.bindFramebuffer(gl.FRAMEBUFFER, simFbo[i]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, simTex[i], 0);
        }
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) fail();
        else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        simIdx = 0;
    }

    // Called from the calendar's layout(): the GL canvas covers the grid from device column x0, one GL pixel per
    // calendar pixel; the field covers the whole viewport.
    function layout(o) {
        if (!ok) return;
        src = o.canvas; vw = o.vw; vh = o.vh; dpr = o.dpr;
        if (!glCanvas.isConnected) o.canvas.after(glCanvas);
        glCanvas.width = o.W - o.x0;
        glCanvas.height = o.H;
        glCanvas.style.left = (o.x0 / o.dpr) + 'px';
        glCanvas.style.width = ((o.W - o.x0) / o.dpr) + 'px';
        glCanvas.style.height = o.vh + 'px';
        inW = inH = 0;
        dirty = true;
        allocSim();
        if (!ok) return;
        gl.useProgram(pDraw);
        gl.uniform2f(U.draw.u_resolution, simW * CELL, simH * CELL);
        gl.uniform1f(U.draw.u_dpr, dpr);
        gl.uniform1f(U.draw.u_x0, o.x0);
    }

    // ------------------------------------------------------------ stamps
    function stamp(x0, y0, x1, y1, amount, radius) {
        if (nSeg >= MAX_SEG) {
            // out of slots this frame: stretch the last capsule to reach the new point
            const j = MAX_SEG - 1;
            segs[j * 4 + 2] = x1; segs[j * 4 + 3] = y1; pars[j * 2] = Math.min(0.9, Math.max(pars[j * 2], amount));
            return;
        }
        const j = nSeg++;
        segs[j * 4] = x0; segs[j * 4 + 1] = y0; segs[j * 4 + 2] = x1; segs[j * 4 + 3] = y1;
        pars[j * 2] = amount; pars[j * 2 + 1] = radius;
    }

    function bindPointer() {
        const live = () => ok && !reduceMotion.matches;
        window.addEventListener('pointermove', (e) => {
            if (!live()) return;
            if (e.pointerType === 'touch' && !e.isPrimary) return;
            const cur = [e.clientX, vh - e.clientY];
            if (last) {
                const dx = cur[0] - last[0], dy = cur[1] - last[1], len = Math.hypot(dx, dy);
                if (len > 0.5) stamp(last[0], last[1], cur[0], cur[1], Math.min(1, len / 16) * 0.5, 9 + Math.min(len, 70) * 0.22);
            }
            last = cur;
        }, { passive: true });
        window.addEventListener('pointerdown', (e) => { last = [e.clientX, vh - e.clientY]; }, { passive: true });
        const drop = (e) => { if (e.pointerType !== 'mouse') last = null; };
        window.addEventListener('pointerup', drop, { passive: true });
        window.addEventListener('pointercancel', () => { last = null; }, { passive: true });
        document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) last = null; }, { passive: true });
    }

    function step(dt, now) {
        if (nSeg) lastStamp = now;
        const w = 1 - simIdx;
        gl.bindFramebuffer(gl.FRAMEBUFFER, simFbo[w]);
        gl.viewport(0, 0, simW, simH);
        gl.useProgram(pInk);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, simTex[simIdx]);
        const u = U.ink, f = dt / (1000 / 60);
        gl.uniform1i(u.u_prev, 1);
        gl.uniform1f(u.u_keep, Math.exp(-dt / DRY_MS));
        gl.uniform1f(u.u_bleed, Math.min(0.6, BLEED * f));
        gl.uniform1f(u.u_cell, CELL);
        gl.uniform1i(u.u_n, nSeg);
        gl.uniform4fv(u.u_seg, segs);
        gl.uniform2fv(u.u_par, pars);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        simIdx = w;
        nSeg = 0;
    }

    function upload() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texIn);
        if (inW === src.width && inH === src.height) {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
            inW = src.width; inH = src.height;
        }
    }

    // After every rAF of the calendar. drew: the calendar canvas changed this frame.
    function frame(drew, now) {
        if (!ok || !src) return;
        const dt = lastNow ? Math.min(50, now - lastNow) : 16.6;
        lastNow = now;
        if (drew) dirty = true;
        if (reduceMotion.matches) nSeg = 0;
        const live = nSeg > 0 || now - lastStamp < LIFE_MS;
        if (!live) {
            if (shown) { glCanvas.style.visibility = 'hidden'; shown = false; }
            return;
        }
        const a = performance.now();
        step(dt, now);
        if (dirty || !shown) { upload(); dirty = false; }
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.useProgram(pDraw);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, simTex[simIdx]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!shown) { glCanvas.style.visibility = 'visible'; shown = true; }
        perf[perfI++ % PERF_N] = performance.now() - a;
    }

    init();

    window.CalendarGrain = {
        get enabled() { return ok; },
        get trail() { return ok && !reduceMotion.matches; },
        get active() { return shown; },
        layout, frame,
        perf: () => {
            const v = Array.from(perf.subarray(0, Math.min(perfI, PERF_N))).sort((x, y) => x - y);
            const at = (p) => (v.length ? +v[Math.min(v.length - 1, Math.floor(v.length * p))].toFixed(2) : null);
            return { draws: perfI, p50: at(0.5), p95: at(0.95), max: at(1) };
        },
        perfReset: () => { perfI = 0; },
    };
})();
