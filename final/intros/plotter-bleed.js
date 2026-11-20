// Plotter Bleed: plotter build, Goal Ultra pull-back into a dense AP grid, ink bleed reveal.
// Shared by intros/10-plotter-bleed.html (preview) and index.html (the real loader).
window.AP_PLOTTER_BLEED = {
    id: '10-plotter-bleed',
    grid: true,
    markH: 28,
    frag: `
        uniform float uPaper;
        uniform float uSolid;
        uniform float uReveal;
        uniform float uStartScale;
        uniform float uGridS;

        float hair(float d) { return clamp(1.0 - d * uDpr, 0.0, 1.0); }

        // Screen-locked copy of the hero canvas graph paper (1672x941, lines at 20k+0.5 and 100k+0.5,
        // widths 1 and 1.25, object-fit: cover) so every intro line lands on a slide 1 line
        float heroGrid(vec2 px) {
            vec2 c = px / uGridS + vec2(836.0, 470.5) - 0.5;
            vec2 m1 = abs(c - floor(c / 20.0 + 0.5) * 20.0) * uGridS;
            vec2 m2 = abs(c - floor(c / 100.0 + 0.5) * 100.0) * uGridS;
            float minor = clamp((0.5 * uGridS - min(m1.x, m1.y)) * uDpr + 0.5, 0.0, 1.0);
            float major = clamp((0.625 * uGridS - min(m2.x, m2.y)) * uDpr + 0.5, 0.0, 1.0);
            return max(minor * 0.075, major * 0.16);
        }

        float tA;

        // One camera for everything: the plotter sheet lives in the centre tile, so pulling back
        // shrinks the drawing into the grid while the neighbours get traced and filled in
        vec3 tile(vec2 px) {
            vec2 w = rot(-uRot) * px / uScale;
            vec2 idx = floor((w + uPitch * 0.5) / uPitch);
            vec2 local = w - idx * uPitch;
            float ups = 644.0 / (uMarkH * uScale);   // AP units per CSS px on screen
            float aa = ups / uDpr;
            vec2 u = local * (644.0 / uMarkH) + AP_VB * 0.5;
            float sd = sdAP(u);
            float inside = clamp(0.5 - sd / aa, 0.0, 1.0);
            float outline = clamp(0.5 - (abs(sd) - 0.6 * ups) / aa, 0.0, 1.0);
            float zoom = uScale / uStartScale;

            float paper = uPaper;
            vec3 rgb = vec3(heroGrid(px)) * paper;

            if (idx.x == 0.0 && idx.y == 0.0) {
                vec2 corner = vec2(u.x < 401.5 ? -48.0 : 851.0, u.y < 322.0 ? -48.0 : 692.0);
                vec2 dc = abs(u - corner) / ups;
                float reg = max(hair(dc.x) * step(dc.y, 9.0 * zoom), hair(dc.y) * step(dc.x, 9.0 * zoom));
                rgb = mix(rgb, SIGNAL, reg * 0.85 * paper);

                float hp = clamp((uFill - 0.3) / 0.7, 0.0, 1.0);
                float fillLine = 644.0 * (1.0 - hp);
                float below = clamp((u.y - fillLine) / aa + 0.5, 0.0, 1.0);
                vec2 p = w * uStartScale;
                float hv = abs(fract((p.x + p.y) / 7.0) - 0.5) * 7.0 * 0.7071 * zoom;
                float hatch = clamp((mix(0.55, 3.0, uSolid) - hv) * uDpr + 0.5, 0.0, 1.0);
                rgb = mix(rgb, PAPER, inside * below * hatch);
                float pen = exp(-abs(u.y - fillLine) / (5.0 * ups)) * inside * step(0.001, hp) * step(hp, 0.999);
                rgb = mix(rgb, SIGNAL, pen * 0.9);

                float ang = fract(atan(u.x - 401.5, 322.0 - u.y) / (2.0 * PI));
                float trace = clamp(uFill / 0.5, 0.0, 1.0);
                float drawn = step(ang, trace);
                float head = smoothstep(trace - 0.05, trace, ang) * drawn * step(trace, 0.999);
                rgb = mix(rgb, mix(PAPER, SIGNAL, head), outline * drawn);
                tA = inside;
            } else {
                float h = hash(idx + 17.0);
                vec2 cs = rot(uRot) * (idx * uPitch) * uScale;
                float lag = length(cs) / length(uRes * 0.5) * 0.55 + h * 0.15;
                float presence = clamp((uGrow - lag) / 0.12, 0.0, 1.0);
                float fill = clamp((uGrow - 0.12 - lag) / 0.3, 0.0, 1.0);
                float filled = clamp((u.y - 644.0 * (1.0 - fill)) / aa + 0.5, 0.0, 1.0);
                rgb = mix(rgb, PAPER * 0.6, outline * presence);
                rgb = mix(rgb, PAPER, inside * filled * presence);
                tA = inside * presence;
            }
            return rgb;
        }

        void main() {
            vec2 px = screenPx();
            float wet = 0.0;
            float hole = 0.0;
            float rim = 0.0;

            // The ink field is only needed once the reveal starts; skipping it keeps the build light
            if (uReveal > 0.0) {
                float d = length(px) / length(uRes * 0.5);
                vec2 q = px * 0.0032;
                float warp = fbm(q * 1.7 + 4.0);
                float f = d * 0.9 + (fbm(q + warp * 1.6) - 0.5) * 0.7;
                float R = mix(-0.35, 1.3, uReveal);
                wet = exp(-pow((f - R) * 7.0, 2.0));
                hole = clamp((R - f) / 0.0035 + 0.5, 0.0, 1.0);
                rim = clamp((R + 0.014 - f) / 0.0035 + 0.5, 0.0, 1.0) - hole;
            }

            // Tiles caught in the wet edge get dragged outward and pick up the yellow
            vec2 dir = px / (length(px) + 1.0);
            vec3 rgb = tile(px - dir * wet * 20.0);
            rgb = mix(rgb, SIGNAL * tA, wet);
            float ink = 1.0 - hole - rim;
            rgb = rgb * ink + SIGNAL * rim;
            float alpha = 1.0 - hole;

            rgb += grain() * ink * (1.0 - tA);
            gl_FragColor = vec4(clamp(rgb, 0.0, alpha), alpha);
        }
    `,
    frame(s) {
        const E = APIntro.ease, c = APIntro.clamp01;
        const g = APIntro.grid(s, { hold: 0.55 });
        const r = c(g.since / 1.8);
        if (r >= 1) return { done: true };
        g.u.uPaper = c(s.t / 0.6);
        g.u.uSolid = s.since >= 0 ? E.inOutCubic(c(s.since / 0.35)) : 0;
        g.u.uStartScale = s.startScale;
        g.u.uReveal = E.inOutSine(r);
        const heroZoom = 1.06 - 0.06 * E.outExpo(r);
        g.u.uGridS = Math.max(s.vw / 1672, s.vh / 941) * (s.framed ? heroZoom : 1);
        return { u: g.u, hero: 'scale(' + heroZoom + ')' };
    }
};
