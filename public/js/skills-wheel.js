// Projects -> Skills: row 16's asterisk drops straight down its own column into slide 04, then turns like a wheel.
// The first detent is the EXPERTISE intro (the star at rest, no counter, nothing drawn); after it, one gesture (wheel
// flick, trackpad swipe, touch swipe, key) is one 60° detent and one category swap; the first detent up and the last
// detent down hand the page back to normal scrolling. Six categories (the five skill sets, then EXPERIENCE) turn the
// six-armed star through a full 360°, and the last one settles it heavier.
// GLITCH (pixel-bug.js) is leashed to a paper plane's flight while the stage is stuck: take-off past the asterisk, a
// loop round each of the backdrop portrait's eyes (a pair of goggles), a dive between the words and the skills, and a
// landing. It flies in to the take-off on the intro, flies one leg per category and lays a solid ribbon of broken
// screen behind it until reverse steps eat it back; then it's handed back to wandering.
(function (root) {
    'use strict';

    // Gesture classifier. Times are ms. A gesture ends after GAP of wheel silence, on a direction change, or when a
    // delta surges well above the decaying tail (a new swipe landing on top of trackpad inertia).
    function createIntent(opt) {
        const o = opt || {};
        const GAP = o.gap || 180;
        const LOCK = o.lock || 860;
        const WHEEL_MIN = o.wheelMin || 6;
        const TOUCH_MIN = o.touchMin || 32;
        const TAU = 100;
        let last = -Infinity, dir = 0, acc = 0, peak = 0, tail = 0, spent = false, firedAt = -Infinity, lockUntil = -Infinity;
        let touchY = null, touchSpent = false;

        const fire = (d, t) => {
            spent = true;
            touchSpent = true;
            firedAt = t;
            lockUntil = t + LOCK;
            return d;
        };

        return {
            locked: (t) => t < lockUntil,
            unlock() {
                spent = false;
                touchSpent = false;
                lockUntil = -Infinity;
            },
            // Entering the stage owns whatever gesture carried the page there, so its inertia can't skip category one
            claim(t) {
                spent = true;
                touchSpent = true;
                firedAt = t;
                lockUntil = t + LOCK;
            },
            wheel(dy, t) {
                const mag = Math.abs(dy);
                if (!mag) return 0;
                const d = dy > 0 ? 1 : -1;
                if (d !== dir && mag < 4 && t - last <= GAP) {
                    last = t;
                    return 0;
                }
                const decayed = tail * Math.exp(-(t - last) / TAU);
                const fresh = t - last > GAP || d !== dir || (mag >= 16 && mag > decayed * 2.5);
                last = t;
                tail = Math.max(mag, decayed);
                if (fresh) {
                    dir = d;
                    acc = 0;
                    peak = 0;
                    spent = false;
                }
                acc += mag;
                peak = Math.max(peak, mag);
                if (t < lockUntil) return 0;
                if (!spent) return acc >= WHEEL_MIN ? fire(d, t) : 0;
                // A mouse wheel that keeps spinning at full strength is new intent; trackpad inertia decays well below its peak
                if (t - firedAt > LOCK + 250 && peak >= 30 && mag >= peak * 0.8) return fire(d, t);
                return 0;
            },
            touchStart(y) {
                touchY = y;
                touchSpent = false;
            },
            touchMove(y, t) {
                if (touchY === null || touchSpent) return 0;
                const dy = touchY - y;
                if (Math.abs(dy) < TOUCH_MIN || t < lockUntil) return 0;
                return fire(dy > 0 ? 1 : -1, t);
            },
            touchEnd() {
                touchY = null;
            },
            key(d, t) {
                return t < lockUntil ? 0 : fire(d, t);
            },
        };
    }

    // Pin zone [A, B] in scroller pixels; detent k rests at A + (B - A) * k / (n - 1).
    function createZone(n, opt) {
        const o = opt || {};
        const TOL = o.tol || 4;
        const DEV = o.dev || 6;
        const z = { pinned: false, step: 0, guard: false, A: 0, B: 0 };
        let prev = null;

        const offset = (k) => Math.round(z.A + (z.B - z.A) * k / (n - 1));
        const nearest = (y) => Math.max(0, Math.min(n - 1, Math.round((y - z.A) / (z.B - z.A) * (n - 1))));
        const inside = (y) => y > z.A + TOL && y < z.B - TOL;
        const engage = (k) => {
            z.pinned = true;
            z.step = k;
            z.guard = false;
            return { type: 'engage', step: k, y: offset(k) };
        };

        z.offset = offset;
        z.frame = (y, A, B, drag, anim) => {
            const moved = A !== z.A || B !== z.B;
            z.A = A;
            z.B = B;
            const p = prev;
            prev = y;
            if (B - A < n) return null;
            if (z.pinned) {
                if (moved) return { type: 'snap', y: offset(z.step) };
                // Anything else moving the page (scrollbar, find-in-page, another script) wins; stepping resumes on re-entry
                if (!anim && Math.abs(y - offset(z.step)) > DEV) {
                    z.pinned = false;
                    z.guard = true;
                    return { type: 'release', external: true };
                }
                return null;
            }
            if (drag) return null;
            if (z.guard) {
                if (inside(y)) return null;
                z.guard = false;
            }
            if (p !== null && p < A && y >= A && y <= B) return engage(0);
            if (p !== null && p > B && y <= B && y >= A) return engage(n - 1);
            if (inside(y)) return engage(nearest(y));
            return null;
        };
        z.input = (d) => {
            if (!z.pinned || !d) return null;
            const to = z.step + d;
            if (to < 0 || to > n - 1) {
                z.pinned = false;
                z.guard = true;
                return { type: 'release', dir: d, y: d < 0 ? z.A : z.B };
            }
            z.step = to;
            return { type: 'step', step: to, y: offset(to) };
        };
        z.external = () => {
            const was = z.pinned;
            z.pinned = false;
            z.guard = true;
            return was ? { type: 'release', external: true } : null;
        };
        z.unguard = () => {
            z.guard = false;
        };
        z.desired = (y) => {
            if (z.pinned) return z.step;
            if (y <= z.A + TOL) return -1;
            if (y >= z.B - TOL) return n - 1;
            return nearest(y);
        };
        return z;
    }

    // Segment i of a uniform Catmull-Rom through P (the prototype's bezier controls), at t in [0, 1]
    // Centripetal (alpha 0.5) so a short segment next to a long one can't loop or overshoot into the text
    function crHandle(p0, p1, p2) {
        const a = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), b = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        if (a < 1e-6 || b < 1e-6) return [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3];
        const sa = Math.sqrt(a), sb = Math.sqrt(b), k = 2 * a + 3 * sa * sb + b, d = 3 * sa * (sa + sb);
        return [(a * p2[0] - b * p0[0] + k * p1[0]) / d, (a * p2[1] - b * p0[1] + k * p1[1]) / d];
    }

    function crPoint(P, i, t) {
        const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
        const [c1x, c1y] = crHandle(p0, p1, p2);
        const [c2x, c2y] = crHandle(p3, p2, p1);
        const u = 1 - t;
        return [
            u * u * u * p1[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p2[0],
            u * u * u * p1[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p2[1],
        ];
    }

    const rectDist = (x, y, r) => Math.hypot(Math.max(r.l - x, 0, x - r.r), Math.max(r.t - y, 0, y - r.b));
    const unite = (a, b) => (!a ? b : !b ? a : { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) });

    // The curve through stage-pixel control points, sampled densely and parameterised by arc length. Each span gets
    // samples about every 3px (dense runs like the loops need few); knots[i] is the arc length at control point i.
    function createRoute(P) {
        const xs = [], ys = [], cum = [], knots = [0];
        let L = 0;
        for (let i = 0; i < P.length - 1; i++) {
            const seg = Math.max(2, Math.min(48, Math.ceil(Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) / 3)));
            for (let j = i ? 1 : 0; j <= seg; j++) {
                const q = crPoint(P, i, j / seg);
                if (xs.length) L += Math.hypot(q[0] - xs[xs.length - 1], q[1] - ys[ys.length - 1]);
                xs.push(q[0]);
                ys.push(q[1]);
                cum.push(L);
            }
            knots.push(L);
        }
        const n = xs.length;
        const pos = (s) => {
            s = Math.max(0, Math.min(L, s));
            let lo = 0, hi = n - 1;
            while (hi - lo > 1) {
                const mid = (lo + hi) >> 1;
                if (cum[mid] <= s) lo = mid;
                else hi = mid;
            }
            const f = cum[hi] > cum[lo] ? (s - cum[lo]) / (cum[hi] - cum[lo]) : 0;
            return [xs[lo] + (xs[hi] - xs[lo]) * f, ys[lo] + (ys[hi] - ys[lo]) * f];
        };
        // Tangent from a short chord, so heading doesn't snap at sample joints
        const atS = (s) => {
            const p = pos(s), q0 = pos(s - 6), q1 = pos(s + 6);
            return { x: p[0], y: p[1], a: Math.atan2(q1[1] - q0[1], q1[0] - q0[0]) };
        };
        return { L, atS, at: (t) => atS(t * L), xs, ys, cum, knots };
    }

    // The backdrop behind this slide is a still portrait (videos/services-bg.mp4, 1440x1920). Its eyes in video pixels,
    // and the radius each loop's round is flown at: the eye socket plus a little, so the ribbon rims it.
    const PORTRAIT = { w: 1440, h: 1920, eyes: [[655, 682], [816, 694]], lens: 62 };

    // Where the backdrop draws a video pixel: its grid shader covers the viewport (u_size = innerWidth x innerHeight)
    // with the video centred, at u_scale 1 once its intro zoom has settled
    function eyeSpots(vw, vh) {
        const k = Math.max(vw / PORTRAIT.w, vh / PORTRAIT.h);
        const ox = (vw - PORTRAIT.w * k) / 2, oy = (vh - PORTRAIT.h * k) / 2;
        return { eyes: PORTRAIT.eyes.map((e) => ({ x: ox + e[0] * k, y: oy + e[1] * k })), r: PORTRAIT.lens * k, k };
    }

    // The scroll range (scroller px) over which the fixed nav is lifted away: from the services section's top edge
    // reaching NAV_ENTER of the viewport (or the stage engaging, if that's sooner) until the portrait's exit wipe has
    // erased the eyes' loops. The portrait is a fixed backdrop; the bundle's section shader (backdrop_theme) wipes it
    // upward, scrubbed by u_bottomProgress (the section bottom's rise through the viewport, 0 at its bottom edge, 1 at
    // its top), erasing a row at GL height v once u_bottomProgress >= 0.8 * (0.7 v + 0.15 + n) + 0.2, n <= 0.075 noise.
    // The section's bottom only reaches the viewport top at the page's end, under the footer.
    const NAV_ENTER = 0.85, NAV_HYST = 40;
    function navSpan(o) {
        const v = 1 - Math.max(0, o.eyeTop) / o.H;
        const gone = Math.min(1, 0.8 * (0.7 * v + 0.225) + 0.2);
        return [Math.min(o.A, o.sTop - o.H * NAV_ENTER), Math.max(o.B, o.sBot - o.H * (1 - gone))];
    }
    // Whether the nav should be hidden at scroll y, given whether it is now: each edge flips NAV_HYST / 2 past the
    // line in the direction of travel, so a scroll resting on a boundary can't flicker it
    function navHide(hidden, y, span) {
        const h = hidden ? -NAV_HYST / 2 : NAV_HYST / 2;
        return y > span[0] + h && y < span[1] - h;
    }

    // A paper plane's inside loop, design 10's prolate cycloid: x = drift * (q - PI) + sin q, y = cos q, out of level
    // flight to the right, up, over the top and back down. Stretched across so its closed part (from the top down to
    // where the path crosses itself) is round; cy and rad place that circle against the cycloid's axis, per unit radius.
    const LOOP = (() => {
        const drift = 0.2, f = (q) => drift * (q - Math.PI) + Math.sin(q);
        let lo = 0.01, hi = Math.PI - 0.01;
        for (let i = 0; i < 60; i++) {
            const mid = (lo + hi) / 2;
            if (f(mid) < 0) lo = mid;
            else hi = mid;
        }
        const cross = Math.cos(lo), rad = (cross + 1) / 2;
        return { drift, cy: (cross - 1) / 2, rad, wide: rad / f(Math.acos(-drift)), n: 72 };
    })();

    // The loop whose round closes on a circle of radius rad about (cx, cy), entry to exit, both level at the bottom
    function loopPts(cx, cy, rad) {
        const R = rad / LOOP.rad, ly = cy - LOOP.cy * R, out = [];
        for (let j = 0; j <= LOOP.n; j++) {
            const q = j / LOOP.n * Math.PI * 2;
            out.push([cx + LOOP.wide * R * (LOOP.drift * (q - Math.PI) + Math.sin(q)), ly + R * Math.cos(q)]);
        }
        return out;
    }

    // A stacked column's dive may run this close to the right edge: pixel-bug keeps GLITCH 24px inside the viewport
    const DIVE_EDGE = 24;

    // Unit vector from the nearest of rects out to (x, y); from inside, out through the nearest edge
    function awayFrom(rects, x, y) {
        let best = [0, -1], bd = Infinity;
        rects.forEach((r) => {
            const px = Math.max(r.l, Math.min(r.r, x)), py = Math.max(r.t, Math.min(r.b, y));
            const d = Math.hypot(x - px, y - py);
            if (d > 1e-6) {
                if (d < bd) {
                    bd = d;
                    best = [(x - px) / d, (y - py) / d];
                }
                return;
            }
            const e = [[x - r.l, -1, 0], [r.r - x, 1, 0], [y - r.t, 0, -1], [r.b - y, 0, 1]].reduce((a, b) => (b[0] < a[0] ? b : a));
            if (-1 < bd) {
                bd = -1;
                best = [e[1], e[2]];
            }
        });
        return best;
    }

    // The flight on the stage, in stage pixels. `words` is the union of every category's counter and title, `list` of
    // every skills list, `clear` the ribbon's half-width plus a margin, `half` the half-width alone, `star` the asterisk
    // (centre, arm length) and `eyes` / `eyeR` the portrait's eyes and loop radius. `marks` split the flight: take-off
// past the asterisk and loop 1, the bridge and loop 2, the dive to touchdown, the roll-out. `steps` are where the
// stage's seven detents rest along it: the intro on the take-off point (nothing drawn yet), then one leg per category:
// up to loop 1's entry, round loop 1, round loop 2, the dive, the flare to touchdown, the roll-out. The loops stay on the eyes: one
    // that touches the words is tried a little smaller, then nudged off them, and is left on the eye if neither clears.
    // If an eye's loop would leave the stage, the pair is flown in the band above the words instead. The rest of the
    // flight is bent, control point by control point, until it keeps `clear` off the words. lensClear is how close the
    // loops (and anything held with them) come to the words; under `clear` means the ribbon passes under them there.
    function planRoute(o) {
        const w = o.w, h = o.h, m = o.clear, half = o.half || 0, inset = o.inset || 0;
        const words = o.words || null, list = o.list || null;
        const rects = [words, list].filter(Boolean);
        const box = rects.reduce((a, r) => unite(a, r), null);
        const stacked = !!(words && list && list.l < words.r);
        const star = o.star || { x: 0, y: h / 2, r: 0 };
        const near = (x, y) => rects.reduce((a, r) => Math.min(a, rectDist(x, y, r)), Infinity);
        const clearOf = (P) => P.reduce((a, p) => Math.min(a, near(p[0], p[1])), Infinity);
        const fits = (c, r) => c.x - r - half >= 0 && c.x + r + half <= w && c.y - r - half >= 0 && c.y + r + half <= h;

        let rad = o.eyeR || 0;
        const onEyes = !!(o.eyes && o.eyes.length === 2 && rad > 0 && o.eyes.every((e) => fits(e, rad)));
        let spots;
        if (onEyes) {
            spots = o.eyes.map((e) => ({ x: e.x, y: e.y })).sort((a, b) => a.x - b.x);
        } else {
            const top = box ? box.t - m : h * 0.45, l = words ? words.l : w * 0.3, ww = words ? words.r - words.l : w * 0.4;
            rad = Math.max(8, Math.min((top - inset) * 0.3, w * 0.05));
            const y = Math.max(inset + rad, (inset + top) / 2);
            spots = [{ x: l + ww * 0.22, y }, { x: l + ww * 0.22 + rad * 2.8, y }];
        }

        let lensOk = true;
        const TRIES = [[1, 0], [0.88, 0], [0.76, 0], [0.88, 0.2], [0.88, 0.4]];
        const lens = spots.map((c) => {
            const n = awayFrom(rects, c.x, c.y);
            for (const [s, k] of TRIES) {
                const x = c.x + n[0] * k * rad, y = c.y + n[1] * k * rad;
                const P = loopPts(x, y, rad * s);
                if (!rects.length || clearOf(P) >= m) return { x, y, r: rad * s, P };
            }
            lensOk = false;
            return { x: c.x, y: c.y, r: rad, P: loopPts(c.x, c.y, rad) };
        });

        // Take-off: from the bottom edge under the asterisk, up past its right arm, round the words' top-left corner
        const in1 = lens[0].P[0], out2 = lens[1].P[LOOP.n];
        const xb = words ? words.l - m : w * 0.3, tip = star.x + star.r + m;
        const ax = Math.max(inset, Math.min(tip <= xb ? (tip + xb) / 2 : xb, in1[0] - rad));
        const S0 = [Math.max(inset, Math.min(ax, star.x + star.r * 0.5)), h - inset];
        const A1 = [ax, Math.max(in1[1] + rad, Math.min(S0[1] - rad, star.y))];
        const P = [S0, A1];
        if (words && in1[1] < words.t - m) P.push([Math.min(xb, ax + (in1[0] - ax) * 0.25), Math.min(words.t - m, (A1[1] + in1[1]) / 2)]);
        const i1s = P.length;
        P.push(...lens[0].P);
        const i1e = P.length - 1;
        P.push(...lens[1].P);
        const i2e = P.length - 1;

        // The dive: between the words and the skills (stacked: down the free strip beside the column), touchdown below
        // them and a short level roll-out
        const yTop = box ? box.t : h * 0.4;
        const yBot = box ? Math.min(h - inset, box.b + m) : h * 0.7;
        const yLand = Math.min(h - inset, yBot + Math.max(m, (h - inset - yBot) * 0.45));
        let gx, stop;
        if (!stacked) {
            gx = words && list ? (words.r + list.l) / 2 : w * 0.75;
            gx = Math.min(w - inset, Math.max(gx, out2[0] + rad));
            stop = w - inset;
        } else if ((list ? list.r : box.r) + m <= w - DIVE_EDGE) {
            gx = ((list ? list.r : box.r) + m + w - DIVE_EDGE) / 2;
            stop = Math.max(inset, w * 0.45);
        } else {
            gx = (inset + Math.max(inset, box.l - m)) / 2;
            stop = w - inset;
        }
        P.push([gx, Math.max(yTop, out2[1] + rad)], [gx, yBot]);
        const iDive = P.length - 1;
        // Stacked, a loop left on an eye under the words leaves loop 2 inside them, so the dive is under them until it
        // clears the column; that stretch is held as drawn and counted with the loops
        const ex = stacked && words && rectDist(out2[0], out2[1], words) < m ? P.length - 1 : i2e;
        P.push([gx + (stop - gx) * 0.45, yLand]);
        const iTouch = P.length - 1;
        P.push([stop, yLand]);

        const fixed = (i) => i >= i1s && i <= ex;
        for (let it = 0; it < 40 && rects.length; it++) {
            const push = P.map(() => null);
            let any = false;
            for (let i = 0; i < P.length - 1; i++) {
                if (i >= i1s && i < ex) continue;
                for (let j = 0; j <= 16; j++) {
                    const q = crPoint(P, i, j / 16);
                    const need = m - near(q[0], q[1]);
                    if (need <= 0) continue;
                    any = true;
                    const d = awayFrom(rects, q[0], q[1]);
                    [i, i + 1].forEach((k) => {
                        if (!fixed(k) && (!push[k] || push[k][2] < need + 1)) push[k] = [d[0], d[1], need + 1];
                    });
                }
            }
            if (!any) break;
            push.forEach((p, k) => {
                if (p) P[k] = [Math.max(inset, Math.min(w - inset, P[k][0] + p[0] * p[2])), Math.max(inset, Math.min(h - inset, P[k][1] + p[1] * p[2]))];
            });
        }

        const route = createRoute(P);
        const K = route.knots;
        let minClear = Infinity, lensClear = Infinity;
        for (let i = 0; i < route.xs.length; i++) {
            const d = near(route.xs[i], route.ys[i]);
            if (route.cum[i] >= K[i1s] && route.cum[i] <= K[ex]) lensClear = Math.min(lensClear, d);
            else minClear = Math.min(minClear, d);
        }
        return {
            route, pts: P, s0: 0, s1: route.L, marks: [0, K[i1e], K[i2e], K[iTouch], route.L], steps: [0, 1, 2, 3, 4, 5, 6].map((k) => route.L * k / 6),
            calm: [K[i1s], K[i2e]], box, clear: m,
            minClear, lensClear, lens: lens.map((l) => ({ x: l.x, y: l.y, r: l.r })), onEyes, lensOk, stacked, ok: minClear >= m - 1,
        };
    }

    // Arc length at path progress t: detent k of the N rests at marks[k], at t = k / (N - 1), and moves evenly between
    function legS(marks, t) {
        const n = marks.length - 1, f = Math.max(0, Math.min(1, t)) * n, i = Math.min(n - 1, Math.floor(f));
        return marks[i] + (marks[i + 1] - marks[i]) * (f - i);
    }

    function mulberry32(seed) {
        let a = seed | 0;
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // The ribbon's broken-screen fill: every `cell`-px grid cell within `half` + a cell of the route gets a colour, so the
    // band clipped out of it has no holes. Seeded, so the same stage always breaks the same way; s is where along the
    // route a cell is first reached. Mostly signal red in shifting zones of stuck RGB
    // sub-pixels, burn-in and dead clusters, with scanline streaks (a cell often repeats its left neighbour) and tear rows.
    // Kinds: 0 dead, 1 RGB sub-pixels, 2 magenta, 3 cyan, 4 green, 5 red, 6 deep red, 7 hot white, 8 light red, 9 maroon,
    // 10 blue.
    const RIBBON_ZONES = [
        [0.55, [2, 5, 1, 1, 0.5, 36, 26, 2, 14, 12, 0.5]],    // signal red
        [0.27, [3, 26, 9, 9, 7, 16, 12, 4, 6, 5, 3]],         // stuck sub-pixels
        [0.18, [9, 8, 2, 4, 1, 20, 16, 13, 9, 16, 2]],        // burn-in
    ];
    function ribbonCells(route, o) {
        const rnd = mulberry32(o.seed || 0x5ced04);
        const c = o.cell, R = o.half + c;
        const owned = new Map(), cells = [];
        const key = (gx, gy) => (gx + 4096) * 8192 + (gy + 4096);
        for (let s = 0; s <= route.L; s += c * 0.4) {
            const p = route.atS(s);
            const gx0 = Math.floor((p.x - R) / c), gx1 = Math.floor((p.x + R) / c);
            const gy0 = Math.floor((p.y - R) / c), gy1 = Math.floor((p.y + R) / c);
            for (let gx = gx0; gx <= gx1; gx++) {
                for (let gy = gy0; gy <= gy1; gy++) {
                    const k = key(gx, gy);
                    if (owned.has(k) || Math.hypot((gx + 0.5) * c - p.x, (gy + 0.5) * c - p.y) > R) continue;
                    const cell = { gx, gy, s, k: 5 };
                    owned.set(k, cell);
                    cells.push(cell);
                }
            }
        }
        const pick = (weights) => {
            let r = rnd() * weights.reduce((x, y) => x + y, 0);
            for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) < 0) return i;
            return 5;
        };
        let zone = RIBBON_ZONES[0][1], zoneUntil = -1;
        cells.forEach((cell) => {
            if (cell.s >= zoneUntil) {
                const r = rnd();
                zone = r < RIBBON_ZONES[0][0] ? RIBBON_ZONES[0][1] : r < RIBBON_ZONES[0][0] + RIBBON_ZONES[1][0] ? RIBBON_ZONES[1][1] : RIBBON_ZONES[2][1];
                zoneUntil = cell.s + 40 + rnd() * 120;
            }
            const left = owned.get(key(cell.gx - 1, cell.gy));
            cell.k = left && left.s <= cell.s && rnd() < 0.32 ? left.k : pick(zone);
        });
        const run = (gx, gy, n, k) => {
            for (let i = 0; i < n; i++) {
                const t = owned.get(key(gx + i, gy));
                if (t) t.k = k;
            }
        };
        cells.forEach((cell) => {
            const r = rnd();
            if (r < 0.006) {
                const n = 2 + Math.floor(rnd() * 3);
                run(cell.gx, cell.gy, n, 0);
                if (rnd() < 0.5) run(cell.gx, cell.gy + 1, n - 1, 0);
            } else if (r < 0.0095) {
                const t = rnd();
                run(cell.gx, cell.gy, 3 + Math.floor(rnd() * 6), t < 0.45 ? 7 : t < 0.75 ? 3 : 1);
            }
        });
        // Round the eyes (s within o.calm) the band stays in the red family: no dead or hot cells beside the dark sockets,
        // only the odd stuck sub-pixel. Its own stream, so the rest of the ribbon breaks exactly as without it.
        if (o.calm) {
            const q = mulberry32((o.seed || 0x5ced04) ^ 0x9e3779b9), REDS = [5, 6, 8, 9];
            cells.forEach((cell) => {
                if (cell.s < o.calm[0] || cell.s > o.calm[1] || REDS.includes(cell.k)) return;
                cell.k = cell.k === 1 && q() < 0.2 ? 1 : REDS[Math.floor(q() * REDS.length)];
            });
        }
        return cells;
    }

    // Counters and the rail count within a cycle: the expertise categories, then experience as a cycle of its own.
    // `list` holds each detent's cycle name (null for the intro, which takes the first cycle's zero).
    function cycleInfo(list, k) {
        const first = list.find((c) => c != null);
        const c = k >= 0 && k < list.length && list[k] != null ? list[k] : first;
        let n = 0, total = 0;
        list.forEach((x, i) => {
            if (x !== c) return;
            total++;
            if (i <= k) n++;
        });
        return { n: list[k] == null ? 0 : n, total, cycle: c == null ? null : c };
    }
    const counter = (n, total) => '[ ' + String(n).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') + ' ]';

    if (typeof window === 'undefined' && typeof module === 'object' && module && module.exports) {
        module.exports = { createIntent, createZone, createRoute, planRoute, ribbonCells, eyeSpots, legS, navSpan, navHide, cycleInfo, counter, PORTRAIT };
        return;
    }

    const doc = root.document;
    const track = doc.getElementById('skWheel');
    if (!track || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrowMq = root.matchMedia ? root.matchMedia('(max-width: 700px)') : null;

    const scroller = doc.querySelector('.js-scroller');
    const stage = track.querySelector('.sk__stage');
    const star = track.querySelector('.sk-star');
    const railSegs = [...track.querySelectorAll('.sk-rail__seg')];
    const container = track.parentElement;
    const cats = [...track.querySelectorAll('.sk-cat')];
    const N = cats.length;
    const INTRO = cats[0] && cats[0].classList.contains('sk-cat--intro') ? 1 : 0;
    const rows = doc.querySelectorAll('#section-projects .projects__entry');
    const srcRow = rows[rows.length - 1] || null;
    const srcIndex = srcRow && srcRow.querySelector('.projects__entry-index');
    if (!scroller || !stage || !star || N < 2) return;

    const CAT_LINES = (INTRO ? ['expertise. five of them, then the day job. i\'ll draw you a map.'] : []).concat([
        'frontend. react 19, gsap, three.js. and still nobody can center me.',
        'backend. fastapi and postgres. i live in the logs now.',
        'ai / ml. pytorch found me in the training data. rude.',
        'seven languages. i only speak segfault.',
        'git, docker, ollama. git blame still says it was me.',
        'experience. landed at samsung prism. 8,233 clauses and not one about me.',
    ]);
    // Categories are numbered after the intro: the wheel and the rail stay at rest on it and count from the first one
    const nth = (k) => Math.max(0, k + 1 - INTRO);
    const cycles = cats.map((c, i) => (i < INTRO ? null : c.getAttribute('data-cycle') || 'expertise'));
    const railAt = (k) => { const c = cycleInfo(cycles, k); return c.total ? c.n / c.total : 0; };
    const markCycle = (k) => track.classList.toggle('sk--exp', cycleInfo(cycles, k).cycle === 'experience');

    const ARM = Math.PI / 3;          // one detent: the asterisk's six arms repeat every 60°
    const LOCK = 0.86;                // s a detent owns the input; the swap below settles inside it
    const T_OUT = 0.24, CAP_OUT = 0.06, T_IN = 0.52, CAP_IN = 0.12;
    const SHIFT = 135;                // % of a glyph's line box; clears the mask's 0.12em/0.2em padding either way
    const SETTLE = 0.45;              // s to settle onto a detent after the page carries into the stage
    // Detents sit 0.3 viewports apart: under pixel-bug's 1200px/s fast-scroll threshold at this ease and LOCK
    const STEP_VH = 0.3;
    const ROUTE_EDGE = 36;            // inside pixel-bug's viewport clamp (24 / 30px), so it's never pushed off its route
    const APPROACH_MAX = 2600;        // ms a detent's travel waits for GLITCH to land on the route before going anyway
    const APP_URL = '/wp-content/themes/lamalama2025/dist/assets/app-DjHRamTc.js';

    const st = { travel: 0, travelT: 0, wheel: 0, angle: 0 };
    const rail = { p: 0, tl: 0, tr: 0, sl: 0, sr: 0 };
    // GLITCH's progress along the route: detent k of N rests at k / (N - 1), so detent 1 is the start and N the end
    const path = { t: 0 };
    const dmgCanvas = track.querySelector('.sk-damage');
    const dmgCtx = dmgCanvas ? dmgCanvas.getContext('2d') : null;
    const texC = doc.createElement('canvas'), maskC = doc.createElement('canvas'), redC = doc.createElement('canvas'), cyanC = doc.createElement('canvas');
    const texCtx = texC.getContext('2d'), maskCtx = maskC.getContext('2d', { willReadFrequently: true });
    const redCtx = redC.getContext('2d'), cyanCtx = cyanC.getContext('2d');
    let route = null, plan = null, keep = { words: null, list: null }, ribbon = [], routeKey = '';
    let eyes = null, starAt = null;
    let cellDev = 5, cellCss = 5, ribbonW = 20, dmgScale = 1, pathTween = null, pathGoal = 0, pathDir = 1, dmgDrawn = -1, dmgDirty = true;
    let arrived = false, approachSince = 0, pendingT = null;
    let flickCells = null, nextFlicker = 0;
    let W = 0, H = 0, S = 0, cx = 0, srcY = 0, srcS = 0.03, A = 0, B = 0, gapPx = 18;
    let geo = [];
    let visible = false, drawn = -1, detached = false, railDirty = true;
    let wantLeash = false, leashed = false, navHidden = false, navRange = [0, 0];
    let shown = -1, swap = null, spin = null, fill = null;
    let appMod = null, nativeTween = null, animUntil = 0, passUntil = 0, dragging = false, nudgeAfterTouch = 0;

    const now = () => performance.now();
    const viewW = () => scroller.clientWidth;
    const say = (text) => { if (typeof root.__pixelBugSay === 'function') root.__pixelBugSay(text); };
    const easeScroll = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

    // Meer's split: every glyph is its own inline-block inside an overflow mask; spaces become nbsp so widths hold
    function splitInto(parent, text, whole) {
        const chars = [];
        const groups = whole ? [text] : text.split(' ');
        groups.forEach((g, gi) => {
            const mk = doc.createElement('span');
            mk.className = 'sk-mk';
            for (const c of g) {
                const ch = doc.createElement('span');
                ch.className = 'sk-ch';
                ch.textContent = c === ' ' ? '\u00a0' : c;
                mk.appendChild(ch);
                chars.push(ch);
            }
            parent.appendChild(mk);
            if (gi < groups.length - 1) parent.appendChild(doc.createTextNode(' '));
        });
        return chars;
    }

    const parts = cats.map((cat, i) => {
        const title = cat.querySelector('.sk-title');
        const set = cat.querySelector('.sk-set');
        const label = title.textContent.trim();
        title.setAttribute('aria-label', label);
        title.textContent = '';
        // The intro's word stands alone: no counter, and the categories count from 01 after it
        let kickChars = [];
        if (i >= INTRO) {
            const kick = doc.createElement('span');
            kick.className = 'sk-kicker';
            kick.setAttribute('aria-hidden', 'true');
            title.appendChild(kick);
            const c = cycleInfo(cycles, i);
            kickChars = splitInto(kick, counter(c.n, c.total), true);
        }
        const titleChars = kickChars.concat(splitInto(title, label, false));
        const items = [];
        set.querySelectorAll('li').forEach((li) => {
            const t = li.textContent.trim();
            li.setAttribute('aria-label', t);
            li.textContent = '';
            items.push(...splitInto(li, t, true));
        });
        return { cat, title: titleChars, items, all: titleChars.concat(items), titleEl: title, setEl: set };
    });

    // ---------- scrolling: the bundle's Lenis when it runs one, the bare .js-scroller otherwise (touch-first devices)

    // Same URL the bundle's module graph resolves, so this is the running module instance; its `n` export is the live App
    function loadApp() {
        import(APP_URL).then((m) => { appMod = m; }).catch(() => {});
    }
    const lenisOf = () => {
        const app = appMod && appMod.n;
        const s = app && app.instances && app.instances.get('scroller');
        return (s && s.lenis) || root.__lenis || null;
    };

    function scrollTo(y, dur) {
        const lenis = lenisOf();
        animUntil = now() + dur * 1000 + 120;
        if (lenis) {
            lenis.scrollTo(y, dur > 0 ? { duration: dur, easing: easeScroll, force: true } : { immediate: true, force: true });
            return;
        }
        if (nativeTween) nativeTween.kill();
        nativeTween = null;
        if (dur <= 0) {
            scroller.scrollTop = y;
            return;
        }
        const o = { y: scroller.scrollTop };
        nativeTween = gsap.to(o, { y, duration: dur, ease: 'sine.inOut', onUpdate: () => { scroller.scrollTop = o.y; } });
    }

    // Stopped Lenis still runs forced scrollTo; overflow:hidden is what halts iOS momentum on the bare scroller
    function hold(on) {
        const lenis = lenisOf();
        if (on) {
            if (lenis) lenis.stop();
            else scroller.style.setProperty('overflow-y', 'hidden', 'important');
            return;
        }
        if (lenis) lenis.start();
        scroller.style.removeProperty('overflow-y');
    }

    function nudge(d) {
        const y = scroller.scrollTop + d * H * 0.45;
        const lenis = lenisOf();
        if (lenis) lenis.scrollTo(y, { duration: 0.9 });
        else scrollTo(y, 0.7);
    }

    // ---------- the swap: outgoing glyphs clear their masks before the incoming set rises into the same masks

    const each = (cap, n, rev) => ({ each: Math.min(0.016, cap / Math.max(1, n - 1)), from: rev ? 'end' : 'start' });

    function show(k, dir) {
        const from = shown;
        shown = k;
        if (swap) swap.kill();
        parts.forEach((p, i) => { if (i !== from && i !== k) gsap.set(p.all, { yPercent: SHIFT }); });
        swap = gsap.timeline();
        const rev = dir < 0;
        let at = 0;
        if (from >= 0) {
            const p = parts[from];
            const to = rev ? SHIFT : -SHIFT;
            swap.to(p.title, { yPercent: to, duration: T_OUT, ease: 'power2.in', stagger: each(CAP_OUT, p.title.length, rev) }, 0);
            swap.to(p.items, { yPercent: to, duration: T_OUT, ease: 'power2.in', stagger: each(CAP_OUT, p.items.length, rev) }, 0);
            at = T_OUT + CAP_OUT;
        }
        if (k >= 0) {
            const p = parts[k];
            gsap.set(p.all, { yPercent: rev ? -SHIFT : SHIFT });
            swap.to(p.title, { yPercent: 0, duration: T_IN, ease: 'power4.out', stagger: each(CAP_IN, p.title.length, rev) }, at);
            swap.to(p.items, { yPercent: 0, duration: T_IN, ease: 'power4.out', stagger: each(CAP_IN, p.items.length, rev) }, at);
        }
        if (spin) spin.kill();
        const full = nth(k) === N - INTRO && N - INTRO === 6;
        spin = gsap.to(st, full && !rev ? { wheel: nth(k), duration: 1.25, ease: 'back.out(2.4)' } : { wheel: nth(k), duration: 0.9, ease: 'back.out(1.2)' });
        if (fill) fill.kill();
        const g = geo[Math.max(k, 0)];
        const dirtyRail = () => { railDirty = true; };
        const crossing = from >= 0 && k >= 0 && cycleInfo(cycles, from).cycle !== cycleInfo(cycles, k).cycle;
        if (crossing) {
            // A new cycle drains the rail and refills it in its own colour
            fill = gsap.timeline()
                .to(rail, { p: 0, duration: 0.32, ease: 'power2.in', onUpdate: dirtyRail })
                .add(() => markCycle(k))
                .to(rail, Object.assign({ p: railAt(k), duration: 0.8, ease: 'power3.out', onUpdate: dirtyRail }, g || {}));
        } else {
            markCycle(k);
            fill = gsap.to(rail, Object.assign({ p: railAt(k), duration: 0.9, ease: 'power3.out', onUpdate: dirtyRail }, g || {}));
        }
        travelTo(Math.max(k, 0) / (N - 1));
        if (k >= 0 && leashed) say(CAT_LINES[k]);
    }

    // A detent that lands while GLITCH is still flying in is queued until it touches down on the route, so the trail
    // never runs ahead of it; a jump of several detents takes a little longer than one.
    function travelTo(pt) {
        if (leashed && !arrived && now() - approachSince < APPROACH_MAX) {
            pendingT = pt;
            return;
        }
        pendingT = null;
        if (pt === pathGoal && (pathTween || pt === path.t)) return;
        pathGoal = pt;
        if (pt === path.t) return;
        pathDir = pt > path.t ? 1 : -1;
        if (pathTween) pathTween.kill();
        const q = Math.max(1, Math.abs(pt - path.t) * (N - 1));
        pathTween = gsap.to(path, { t: pt, duration: LOCK * Math.sqrt(q), ease: 'power2.inOut', onComplete: () => { pathTween = null; } });
    }

    function onArrive() {
        arrived = true;
        if (pendingT !== null) travelTo(pendingT);
    }

    // ---------- geometry

    // Caps sit off-centre in their line box by (ascent - descent - capHeight) / 2; shifting by it puts the ink on the axis
    let inkCtx = null;
    function inkShift(el) {
        if (!inkCtx) inkCtx = doc.createElement('canvas').getContext('2d');
        if (!inkCtx) return 0;
        const cs = getComputedStyle(el);
        inkCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        const m = inkCtx.measureText('H');
        if (!m.fontBoundingBoxAscent || !m.actualBoundingBoxAscent) return 0;
        return (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
    }

    function spanX(els, left) {
        let a = Infinity, b = -Infinity;
        els.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width <= 0) return;
            a = Math.min(a, r.left - left);
            b = Math.max(b, r.right - left);
        });
        return a < b ? [a, b] : [0, 0];
    }

    function boxOf(els, sr) {
        let box = null;
        els.forEach((el) => {
            if (!el) return;
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) return;
            box = unite(box, { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top });
        });
        return box;
    }

    // --sk-h drives the track's scroll length, so it changes only on resize, ahead of ScrollTrigger's debounced refresh
    function syncHeight() {
        const h = scroller.clientHeight;
        if (h && h !== H) {
            H = h;
            track.style.setProperty('--sk-h', h + 'px');
            track.style.setProperty('--sk-steps', String(N - 1));
            track.style.setProperty('--sk-step', String(STEP_VH));
            return true;
        }
        return false;
    }

    function measure() {
        // The track breaks out of the grid to the scroller's full width, so the star is cut by the viewport's left edge
        const cr = container.getBoundingClientRect();
        const pl = parseFloat(getComputedStyle(container).paddingLeft) || 0;
        W = viewW();
        track.style.setProperty('--sk-x', Math.round(-(cr.left + pl)) + 'px');
        track.style.setProperty('--sk-w', W + 'px');
        S = Math.round(Math.min(W, H) * (W < 650 ? 0.7 : 0.58));
        track.style.setProperty('--sk-S', S + 'px');
        gapPx = Math.max(14, Math.min(26, W * 0.014));

        // Row 16's ::before: a 0.8em box flush left in the index cell, vertically centred. Under 650px the index is
        // display:none, so the star leaves from the row's left edge instead.
        let size = 12, sx = W * 0.06, sy = track.getBoundingClientRect().top;
        const ir = srcIndex && srcIndex.getBoundingClientRect();
        if (ir && ir.width > 0) {
            size = 0.8 * parseFloat(getComputedStyle(srcIndex).fontSize);
            sx = ir.left + size / 2;
            sy = ir.top + ir.height / 2;
        } else if (srcRow) {
            const rr = srcRow.getBoundingClientRect();
            sx = rr.left + size / 2;
            sy = rr.top + rr.height / 2;
        }
        const sr = stage.getBoundingClientRect();
        cx = sx - sr.left;

        // The text column opens a few gaps past the star's resting right arm (x 3..21 of the 24-unit glyph)
        const narrow = !!(narrowMq && narrowMq.matches);
        const tx = Math.round(Math.max(narrow ? 0 : W * 0.29, cx + S * 9 / 24 + gapPx * 3));
        track.style.setProperty('--sk-tx', tx + 'px');
        track.style.setProperty('--sk-fit', '1');
        track.style.removeProperty('--sk-tw');
        let col;
        if (narrow) {
            col = parts[0].cat.getBoundingClientRect().width;
        } else {
            let setLeft = Infinity;
            parts.forEach((p) => { setLeft = Math.min(setLeft, p.setEl.getBoundingClientRect().left - sr.left); });
            col = setLeft - gapPx * 3 - tx;
            track.style.setProperty('--sk-tw', Math.max(0, Math.round(col)) + 'px');
        }
        let widest = 0;
        parts.forEach((p) => {
            p.titleEl.querySelectorAll(':scope > .sk-mk').forEach((mk) => { widest = Math.max(widest, mk.getBoundingClientRect().width); });
        });
        if (widest > 0 && col > 0) track.style.setProperty('--sk-fit', Math.max(0.5, Math.min(1, col / widest)).toFixed(4));
        if (narrow) {
            track.style.setProperty('--sk-ty', '0px');
            track.style.setProperty('--sk-sy', '0px');
        } else {
            track.style.setProperty('--sk-ty', inkShift(parts[0].titleEl).toFixed(2) + 'px');
            track.style.setProperty('--sk-sy', inkShift(parts[0].setEl).toFixed(2) + 'px');
        }

        // Where the rail breaks for each category's words (title ink, then the skills column), in stage pixels
        geo = parts.map((p) => {
            const t = spanX(p.titleEl.querySelectorAll(':scope > .sk-mk'), sr.left);
            const s = spanX(p.setEl.querySelectorAll('.sk-mk'), sr.left);
            return { tl: t[0], tr: t[1], sl: s[0], sr: s[1] };
        });
        if (fill) fill.kill();
        fill = null;
        Object.assign(rail, geo[Math.max(shown, 0)], { p: railAt(shown) });
        markCycle(shown);
        railDirty = true;

        // What GLITCH and its trail keep out of: the furthest extents of every category's counter, title and skills,
        // in stage pixels (masks, so ascenders and descenders count; the glyphs' own swap transforms don't)
        let kick = null, title = null, set = null;
        parts.forEach((p) => {
            kick = unite(kick, boxOf([p.titleEl.querySelector('.sk-kicker')], sr));
            title = unite(title, boxOf(p.titleEl.querySelectorAll(':scope > .sk-mk'), sr));
            set = unite(set, boxOf(p.setEl.querySelectorAll('.sk-mk'), sr));
        });
        keep = { words: unite(kick, title), list: set };

        const tr = track.getBoundingClientRect();
        const scr = scroller.getBoundingClientRect();
        // The backdrop is fixed to the viewport and the stage sticks at the scroller's top, so this is where the eyes
        // sit on the stage while it's stuck, whatever the scroll is now
        const spot = eyeSpots(root.innerWidth, root.innerHeight);
        eyes = { pts: spot.eyes.map((e) => ({ x: e.x - sr.left, y: e.y - scr.top })), r: spot.r };
        starAt = { x: cx, y: stage.clientHeight / 2, r: S * 0.375 };
        A = Math.round(tr.top - scr.top + scroller.scrollTop);
        B = A + Math.round(track.offsetHeight - scroller.clientHeight);
        const sec = track.closest('.ll-section--services');
        if (sec) {
            const r = sec.getBoundingClientRect(), y = scroller.scrollTop;
            navRange = navSpan({
                A, B, H: scroller.clientHeight, sTop: r.top - scr.top + y, sBot: r.bottom - scr.top + y,
                eyeTop: Math.min(...spot.eyes.map((e) => e.y)) - spot.r - scr.top,
            });
        } else {
            navRange = [A, B];
        }
        buildTrail();

        if (reduced) return;
        // Before it sticks the stage rides the track's top edge, so the star's start offset is measured from there
        srcY = sy - (tr.top + H / 2);
        srcS = size / S;
    }

    // ---------- drawing

    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

    function render() {
        const e = ease(st.travel);
        const on = st.travel > 0.0005;
        star.style.opacity = on ? 1 : 0;
        if (on !== detached) {
            detached = on;
            if (srcIndex) srcIndex.classList.toggle('sk-detached', on);
        }
        star.style.transform = 'translate3d(' + (cx - S / 2) + 'px,' + (srcY * (1 - e)) + 'px,0) rotate(' + (60 * e + st.angle * 180 / Math.PI) + 'deg) scale(' + (srcS + (1 - srcS) * e) + ')';
    }

    // Three 100%-wide segments, each placed and cut to length by transform alone; progress fills the visible length
    function renderRail() {
        railDirty = false;
        if (!railSegs.length || !W) return;
        let holes = [[rail.tl - gapPx, rail.tr + gapPx], [rail.sl - gapPx, rail.sr + gapPx]]
            .filter((h) => h[1] > h[0] + gapPx * 2)
            .sort((a, b) => a[0] - b[0]);
        if (holes.length === 2 && holes[1][0] <= holes[0][1]) holes = [[holes[0][0], Math.max(holes[0][1], holes[1][1])]];
        const segs = [];
        let x = 0;
        holes.forEach((h) => {
            segs.push([x, Math.max(x, h[0])]);
            x = Math.max(x, h[1]);
        });
        segs.push([x, Math.max(x, W)]);
        let total = 0;
        segs.forEach((s) => { total += s[1] - s[0]; });
        let left = rail.p * total;
        railSegs.forEach((el, i) => {
            const s = segs[i];
            const len = s ? s[1] - s[0] : 0;
            const d = Math.max(0, Math.min(len, left));
            left -= d;
            el.style.transform = 'translate3d(' + (s ? s[0] : 0) + 'px,0,0) scaleX(' + (d / W) + ')';
        });
    }

    // ---------- the route and the broken-screen ribbon GLITCH leaves on it

    // The ribbon is 1.8vw wide (12px at least) on a grid of whole backing pixels about seven cells across it, and the route
    // keeps its centre line that half-width plus 0.8vw (8px at least) off the words. The backing store is capped at 2x since
    // the look is deliberately coarse.
    function buildTrail() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        const scale = Math.min(2, root.devicePixelRatio || 1);
        const at = [keep.words, keep.list].filter(Boolean).map((r) => [r.l, r.t, r.r, r.b])
            .concat(eyes ? [eyes.r].concat(...eyes.pts.map((e) => [e.x, e.y])) : [], starAt ? [starAt.x, starAt.y, starAt.r] : []);
        const key = [w, h, scale].concat(...at).map(Math.round).join(',');
        if (key === routeKey) return;
        routeKey = key;
        dmgScale = scale;
        ribbonW = Math.max(12, w * 0.018);
        cellDev = Math.max(2, Math.round(Math.max(3, ribbonW / 7) * scale));
        cellCss = cellDev / scale;
        plan = planRoute({
            w, h, words: keep.words, list: keep.list, clear: ribbonW / 2 + Math.max(8, w * 0.008), half: ribbonW / 2, inset: ROUTE_EDGE,
            star: starAt, eyes: eyes && eyes.pts, eyeR: eyes ? eyes.r : 0,
        });
        route = plan.route;
        ribbon = ribbonCells(route, { cell: cellCss, half: ribbonW / 2, seed: 0x5ced04, calm: calmSpan() });
        flickCells = null;
        dmgDirty = true;
        if (!dmgCanvas) return;
        dmgCanvas.width = Math.round(w * scale);
        dmgCanvas.height = Math.round(h * scale);
        const gw = Math.ceil(w / cellCss) + 1, gh = Math.ceil(h / cellCss) + 1;
        [maskC, redC, cyanC].forEach((c) => {
            c.width = gw;
            c.height = gh;
        });
        texC.width = gw * cellDev;
        texC.height = gh * cellDev;
        paintTexture();
    }

    const RIB_FILL = ['#3b0710', '', '#ff1fd0', '#18f0ff', '#22ff5a', '#ff1e2d', '#d90018', '#fff6f0', '#ff4a3d', '#99000f', '#2a4bff'];
    const SUB = ['#ff0000', '#00ff00', '#0000ff'];

    // The fill, painted once per layout: every cell the ribbon can cover, stuck sub-pixels as three hard stripes
    function paintTexture() {
        const ctx = texCtx, cd = cellDev, w3 = Math.max(1, Math.floor(cd / 3));
        ctx.clearRect(0, 0, texC.width, texC.height);
        for (let k = 0; k < RIB_FILL.length; k++) {
            if (k === 1) {
                for (let sp = 0; sp < 3; sp++) {
                    ctx.fillStyle = SUB[sp];
                    ribbon.forEach((c) => { if (c.k === 1) ctx.fillRect(c.gx * cd + sp * w3, c.gy * cd, sp === 2 ? cd - 2 * w3 : w3, cd); });
                }
                continue;
            }
            ctx.fillStyle = RIB_FILL[k];
            ribbon.forEach((c) => { if (c.k === k) ctx.fillRect(c.gx * cd, c.gy * cd, cd, cd); });
        }
    }

    function tint(ctx, color) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, maskC.width, maskC.height);
        ctx.drawImage(maskC, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, maskC.width, maskC.height);
        ctx.globalCompositeOperation = 'source-over';
    }

    // Round the eyes the band narrows to CALM_W of its width, easing in and out over CALM_RAMP widths either side, so
    // the goggles frame the sockets and brows instead of burying them
    const CALM_W = 0.55, CALM_RAMP = 3;
    function calmSpan() {
        if (!plan || !plan.calm) return null;
        const T = ribbonW * CALM_RAMP;
        return [plan.calm[0] - T, plan.calm[1] + T];
    }
    function widthAt(s) {
        const c = plan && plan.calm;
        if (!c) return ribbonW;
        const T = ribbonW * CALM_RAMP;
        const u = Math.max(0, Math.min(1, s < c[0] ? (s - c[0] + T) / T : s > c[1] ? (c[1] + T - s) / T : 1));
        return ribbonW * (1 - (1 - CALM_W) * u * u * (3 - 2 * u));
    }

    // The ribbon up to arc length sNow: a round-capped stroke at one pixel per cell, hardened to whole cells, scaled up
    // without smoothing so its edge steps cell by cell, then filled with the broken-screen texture (source-in), the
    // flicker painted only where the ribbon is (source-atop), and a red/cyan ghost slipped out either side behind it.
    function drawTrail(sNow) {
        const ctx = dmgCtx;
        ctx.clearRect(0, 0, dmgCanvas.width, dmgCanvas.height);
        if (!route || sNow <= 0) return;
        const m = maskCtx, k = 1 / cellCss;
        m.clearRect(0, 0, maskC.width, maskC.height);
        m.lineWidth = ribbonW * k;
        m.lineCap = 'round';
        m.lineJoin = 'round';
        m.strokeStyle = m.fillStyle = '#fff';
        const end = Math.min(sNow, route.L);
        const [a, b] = calmSpan() || [end, end];
        const seg = (s0, s1) => {
            if (s1 <= s0) return;
            m.beginPath();
            for (let s = s0; s < s1; s += cellCss) {
                const p = route.atS(s);
                if (s === s0) m.moveTo(p.x * k, p.y * k);
                else m.lineTo(p.x * k, p.y * k);
            }
            const q = route.atS(s1);
            m.lineTo(q.x * k, q.y * k);
            m.stroke();
        };
        seg(0, Math.min(end, a));
        seg(Math.max(0, b), end);
        const dot = (s) => {
            const p = route.atS(s);
            m.beginPath();
            m.arc(p.x * k, p.y * k, widthAt(s) * k / 2, 0, Math.PI * 2);
            m.fill();
        };
        for (let s = Math.max(0, a); s < Math.min(end, b); s += cellCss * 0.5) dot(s);
        if (end > a && end < b) dot(end);
        const img = m.getImageData(0, 0, maskC.width, maskC.height), d = img.data;
        for (let i = 3; i < d.length; i += 4) {
            d[i - 3] = d[i - 2] = d[i - 1] = 255;
            d[i] = d[i] >= 128 ? 255 : 0;
        }
        m.putImageData(img, 0, 0);
        tint(redCtx, '#ff0040');
        tint(cyanCtx, '#00e5ff');

        const cd = cellDev, cw = maskC.width * cd, ch = maskC.height * cd, fr = Math.max(1, Math.round(1.5 * dmgScale));
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(maskC, 0, 0, cw, ch);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(texC, 0, 0);
        if (flickCells) {
            ctx.globalCompositeOperation = 'source-atop';
            flickCells.forEach((f) => {
                ctx.fillStyle = f[3];
                ctx.fillRect(f[0] * cd, f[1] * cd, f[2] * cd, cd);
            });
        }
        ctx.globalCompositeOperation = 'destination-over';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(redC, -fr, 0, cw, ch);
        ctx.drawImage(cyanC, fr, 0, cw, ch);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    // A few cells die or burn white and come back, and once in a while a scanline tears across; throttled, and only
    // while the stage is seen
    function flicker(sNow, t) {
        if (t < nextFlicker) return false;
        nextFlicker = t + 110 + Math.random() * 90;
        let lo = 0, hi = ribbon.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (ribbon[mid].s <= sNow) lo = mid + 1;
            else hi = mid;
        }
        const n = lo;
        flickCells = [];
        if (!n) return true;
        const count = Math.min(16, Math.ceil(n * 0.004)), calm = calmSpan();
        const quiet = (c) => calm && c.s >= calm[0] && c.s <= calm[1];
        for (let i = 0; i < count; i++) {
            const c = ribbon[Math.floor(Math.random() * n)];
            if (quiet(c)) continue;
            flickCells.push([c.gx, c.gy, 1, Math.random() < 0.6 ? '#120205' : '#fff6f0']);
        }
        if (Math.random() < 0.08) {
            const c = ribbon[Math.floor(Math.random() * n)];
            if (!quiet(c)) flickCells.push([c.gx - 2, c.gy, 4 + Math.floor(Math.random() * 5), Math.random() < 0.5 ? '#fff6f0' : '#18f0ff']);
        }
        return true;
    }

    // GLITCH rides the flight (take-off and stop both a ROUTE_EDGE inside the viewport) at the live path progress, facing
    // along the tangent in the direction it's travelling, and the ribbon ends exactly under it. Viewport coordinates,
    // read per bug frame so it stays glued to the stage; it flies while a detent is moving it. `avoid` is the words'
    // box, so its approach flight bends around them rather than across.
    function routeTarget() {
        if (!route) return null;
        const r = stage.getBoundingClientRect();
        const p = route.atS(legS(INTRO ? plan.steps : plan.steps.slice(1), path.t));
        const moving = !!(pathTween && pathTween.isActive());
        const T = plan.box;
        return {
            x: r.left + p.x, y: r.top + p.y, heading: pathDir > 0 ? p.a : p.a + Math.PI, lift: moving ? 1 : 0,
            avoid: T ? { l: r.left + T.l, t: r.top + T.t, r: r.left + T.r, b: r.top + T.b } : null,
        };
    }

    function leashOn() {
        arrived = false;
        approachSince = now();
        root.__pixelBugLeash(routeTarget, { onArrive });
        leashed = true;
    }

    function leashOff() {
        wantLeash = false;
        if (leashed && typeof root.__pixelBugLeash === 'function') root.__pixelBugLeash(null);
        leashed = false;
        arrived = false;
        say('');
        if (pendingT !== null) travelTo(pendingT);
    }

    // ---------- stepping

    const zone = createZone(N);
    const intent = createIntent({ lock: LOCK * 1000 });

    function run(act) {
        if (!act) return;
        if (act.type === 'engage') {
            hold(true);
            intent.claim(now());
            scrollTo(act.y, SETTLE);
        } else if (act.type === 'step') {
            scrollTo(act.y, LOCK);
        } else if (act.type === 'snap') {
            scrollTo(act.y, 0);
        } else if (act.type === 'release') {
            if (!act.external && act.dir < 0) scrollTo(act.y, 0);
            hold(false);
            if (intent && intent.unlock) intent.unlock();
        }
    }

    function inScope(t) {
        if (!t || t.nodeType !== 1) return false;
        if (t.closest('[data-lenis-prevent],[data-lenis-prevent-wheel]')) return false;
        return scroller.contains(t) || !!t.closest('.pb-bug');
    }

    // Lenis skips events flagged lenisStopPropagation, so a swallowed gesture never reaches its smooth scroll
    function swallow(e) {
        e.lenisStopPropagation = true;
        if (e.cancelable) e.preventDefault();
    }

    function onWheel(e) {
        if (e.ctrlKey) return;
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= H;
        if (Math.abs(e.deltaX) > Math.abs(dy)) dy = 0;
        if (zone.pinned && !inScope(e.target)) return;
        const d = intent.wheel(dy, now());
        if (!zone.pinned) return;
        const act = zone.input(d);
        // The releasing event is left alone, so Lenis (or the browser) scrolls it as the first move of normal scrolling
        if (act && act.type === 'release') {
            run(act);
            return;
        }
        swallow(e);
        run(act);
    }

    function onTouchStart(e) {
        if (nativeTween && !zone.pinned) {
            nativeTween.kill();
            nativeTween = null;
        }
        if (e.touches.length === 1) intent.touchStart(e.touches[0].clientY);
        else intent.touchEnd();
    }

    function onTouchMove(e) {
        if (!zone.pinned || e.touches.length !== 1 || !inScope(e.target)) return;
        swallow(e);
        const act = zone.input(intent.touchMove(e.touches[0].clientY, now()));
        if (act && act.type === 'release') nudgeAfterTouch = act.dir;
        run(act);
    }

    // A touch whose first move was cancelled never scrolls natively, so the release is carried after the finger lifts
    function onTouchEnd() {
        intent.touchEnd();
        if (!nudgeAfterTouch) return;
        const d = nudgeAfterTouch;
        nudgeAfterTouch = 0;
        requestAnimationFrame(() => nudge(d));
    }

    function onKey(e) {
        if (!zone.pinned || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target;
        if (t && t.nodeType === 1 && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        let d = 0;
        switch (e.key) {
            case 'ArrowDown': case 'PageDown': d = 1; break;
            case 'ArrowUp': case 'PageUp': d = -1; break;
            case ' ': case 'Spacebar':
                if (t && t.nodeType === 1 && t.closest('button, a, [role="button"]')) return;
                d = e.shiftKey ? -1 : 1;
                break;
            case 'Home': case 'End': run(zone.external()); return;
            default: return;
        }
        e.preventDefault();
        const act = zone.input(intent.key(d, now()));
        run(act);
        if (act && act.type === 'release') nudge(act.dir);
    }

    // The scrollbar is the scroller's own box past its client width
    function onPointerDown(e) {
        if (e.target !== scroller || e.clientX < scroller.getBoundingClientRect().left + scroller.clientWidth) return;
        dragging = true;
        run(zone.external());
    }

    function onPointerUp() {
        if (!dragging) return;
        dragging = false;
        zone.unguard();
    }

    // In-page jumps (anchors, the footer's back-to-top) glide straight through the wheel instead of being caught by it
    function onClick(e) {
        const a = e.target && e.target.closest && e.target.closest('a[href*="#"], [data-sk-pass]');
        if (!a) return;
        passUntil = now() + 2600;
        if (zone.pinned) run(zone.external());
    }

    function tick(time, dt) {
        const s = Math.max(1, Math.min(dt, 50)) / 1000;
        const y = scroller.scrollTop;
        run(zone.frame(y, A, B, dragging || now() < passUntil, now() < animUntil));
        if (zone.pinned) {
            const lenis = lenisOf();
            if (lenis && !lenis.isStopped) lenis.stop();
        }
        const want = zone.desired(y);
        if (want !== shown) show(want, want > shown ? 1 : -1);
        const held = zone.pinned || (y > A && y < B);
        if (held && !wantLeash) wantLeash = true;
        else if (!held && wantLeash) leashOff();
        const hide = held || navHide(navHidden, y, navRange);
        if (hide !== navHidden) {
            navHidden = hide;
            document.body.classList.toggle('sk-nav-hidden', hide);
            document.body.classList.toggle('is-nav-hidden', hide);
        }

        st.travel += (st.travelT - st.travel) * (1 - Math.exp(-s * 14));
        if (Math.abs(st.travelT - st.travel) < 1e-4) st.travel = st.travelT;
        st.angle = st.wheel * ARM;
        if (visible || st.travel !== drawn) {
            render();
            drawn = st.travel;
        }
        if (railDirty && (visible || rail.p === 0)) renderRail();
        if (dmgCtx && route && visible) {
            const sNow = legS(INTRO ? plan.steps : plan.steps.slice(1), path.t);
            if (sNow > 0 && flicker(sNow, now())) dmgDirty = true;
            if (dmgDirty || sNow !== dmgDrawn) {
                drawTrail(sNow);
                dmgDrawn = sNow;
                dmgDirty = false;
            }
        }
        // pixel-bug mounts after the intro, so the hand-over waits for its API rather than racing it
        if (wantLeash && !leashed && typeof root.__pixelBugLeash === 'function') {
            leashOn();
            if (shown >= 0) say(CAT_LINES[shown]);
        }
        if (pendingT !== null && now() - approachSince >= APPROACH_MAX) travelTo(pendingT);
    }

    // Reduced motion: no stepping, so the trail is drawn whole and still, and GLITCH is parked on the route's end
    // whenever that point is on screen (pixel-bug places a leashed bug without animating it under reduced motion).
    function reducedTrail() {
        path.t = pathGoal = 1;
        if (dmgCtx && route) drawTrail(route.L);
        const sync = () => {
            if (!route || typeof root.__pixelBugLeash !== 'function') return;
            const r = stage.getBoundingClientRect();
            const e = route.atS(plan.s1);
            const y = r.top + e.y;
            const on = y > 0 && y < scroller.clientHeight;
            if (on && !leashed) {
                leashOn();
            } else if (!on && leashed) {
                leashOff();
            }
        };
        scroller.addEventListener('scroll', sync, { passive: true });
        setInterval(sync, 1000);
        sync();
    }

    function init() {
        track.classList.add('is-live');
        syncHeight();
        if (reduced) {
            st.travel = 1;
            measure();
            render();
            reducedTrail();
            const redo = () => {
                syncHeight();
                measure();
                render();
                if (dmgCtx && route) drawTrail(route.L);
            };
            root.addEventListener('resize', redo, { passive: true });
            if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(redo);
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        gsap.set(parts.flatMap((p) => p.all), { yPercent: SHIFT });
        ScrollTrigger.create({
            trigger: track, scroller, start: 'top bottom', end: 'top top',
            onUpdate: (self) => { st.travelT = self.progress; },
            onRefresh: (self) => { st.travelT = self.progress; },
        });
        ScrollTrigger.create({
            trigger: track, scroller, start: 'top bottom', end: 'bottom top',
            onToggle: (self) => { visible = self.isActive; },
        });
        // The CSS sticky stage does the pinning (the site's own sticky-hero pattern); the stepper holds the page on detents
        let refreshTimer = 0;
        const refreshSoon = () => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 220);
        };
        ScrollTrigger.addEventListener('refresh', () => {
            if (syncHeight()) refreshSoon();
            measure();
        });
        // ScrollTrigger ignores height-only resizes on touch devices, but the track's length follows the height
        root.addEventListener('resize', () => { if (syncHeight()) refreshSoon(); }, { passive: true });
        measure();

        root.addEventListener('wheel', onWheel, { capture: true, passive: false });
        root.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
        root.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        root.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
        root.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });
        root.addEventListener('keydown', onKey, { capture: true });
        scroller.addEventListener('pointerdown', onPointerDown, { passive: true });
        root.addEventListener('pointerup', onPointerUp, { passive: true });
        root.addEventListener('pointercancel', onPointerUp, { passive: true });
        doc.addEventListener('click', onClick, true);

        gsap.ticker.add(tick);
        if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', loadApp, { once: true });
        else loadApp();
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    init();
})(typeof window !== 'undefined' ? window : globalThis);
