// Hogwarts, flattened the way the Marauders drew it: every floor on one sheet.
// Map space is 4800 x 1800 units, y down. Six accordion panels of 800 units.

export const MAP = { W: 4800, H: 1800, PANELS: 6, PW: 800 };

const R = (x, y, w, h) => ({ t: 'rect', x, y, w, h });
const C = (x, y, r) => ({ t: 'circle', x, y, r });
const P = (w, ...pts) => ({ t: 'path', w, pts });

// Walkable castle floor. Walls are traced around the union of these shapes.
export const FLOOR = [
    R(880, 240, 600, 620),            // Great Hall
    P(96, [1180, 850], [1180, 970]),
    R(960, 960, 440, 340),            // Entrance Hall
    P(110, [1180, 1290], [1180, 1540]),
    R(850, 1360, 230, 200),           // Trophy Room
    P(54, [1000, 1290], [1000, 1370]),
    R(1300, 1400, 230, 170),          // Kitchens
    P(54, [1360, 1290], [1360, 1410]),
    P(70, [1390, 1060], [1730, 1060]),
    R(1720, 560, 520, 560),           // Grand Staircase
    C(1980, 300, 150),                // Gryffindor Tower
    P(64, [1980, 440], [1980, 570]),
    P(80, [2120, 300], [3580, 300]),  // Seventh-floor corridor
    C(3700, 300, 130),                // Astronomy Tower
    P(60, [3700, 420], [3700, 570]),
    R(3620, 560, 300, 260),           // Hospital Wing
    P(56, [3760, 810], [3760, 1260]),
    P(70, [2230, 840], [2490, 840]),
    R(2480, 620, 520, 420),           // Library
    P(56, [2740, 330], [2740, 630]),
    P(56, [2740, 1030], [2740, 1260]),
    P(60, [2990, 760], [3310, 760]),
    R(3060, 560, 180, 150),           // Charms
    P(50, [3150, 700], [3150, 770]),
    C(3420, 760, 120),                // Headmaster's Office
    P(50, [3420, 870], [3420, 1260]),
    P(64, [1980, 1110], [1980, 1420]),
    P(70, [1980, 1250], [3990, 1250]), // Ground-floor corridor
    R(2480, 1330, 200, 160),          // Prefects' Bathroom
    P(50, [2580, 1240], [2580, 1340]),
    R(2760, 1330, 180, 150),          // Myrtle
    P(50, [2850, 1240], [2850, 1340]),
    R(3240, 1330, 300, 230),          // Potions
    P(50, [3330, 1240], [3330, 1340]),
    R(3600, 1330, 160, 150),          // Snape's office
    P(50, [3680, 1240], [3680, 1340]),
    R(3800, 1330, 170, 270),          // Slytherin
    P(50, [3880, 1240], [3880, 1340]),
];

export const WALL = 12;

// ---------------------------------------------------------------- helpers for details
const rectPoly = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
const circlePoly = (cx, cy, r, n = Math.max(14, Math.round(r * 0.9)), a0 = 0) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI * 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
};
const arcPoly = (cx, cy, r, a0, a1, n = 18) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
};
const bez = (p0, p1, p2, p3, n = 40) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        out.push([
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
    }
    return out;
};
const spiral = (cx, cy, r0, r1, turns, n = 80) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2, r = r0 + (r1 - r0) * t; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return out;
};
const steps = (x0, y0, x1, y1, width, gap = 8) => {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, out = [];
    for (let d = gap; d < L - gap * 0.5; d += gap) {
        const cx = x0 + ux * d, cy = y0 + uy * d, hw = width * 0.5 - 3;
        out.push({ pts: [[cx - nx * hw, cy - ny * hw], [cx + nx * hw, cy + ny * hw]], w: 0.8 });
    }
    return out;
};
const dashed = (pts, on = 10, off = 8) => {
    const out = [];
    let cur = [], acc = 0, drawing = true;
    for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const L = Math.hypot(bx - ax, by - ay);
        let s = 0;
        while (s < L) {
            const lim = (drawing ? on : off) - acc, take = Math.min(lim, L - s);
            const t0 = s / L, t1 = (s + take) / L;
            if (drawing) {
                if (!cur.length) cur.push([ax + (bx - ax) * t0, ay + (by - ay) * t0]);
                cur.push([ax + (bx - ax) * t1, ay + (by - ay) * t1]);
            }
            s += take; acc += take;
            if (acc >= (drawing ? on : off) - 1e-6) { if (drawing && cur.length > 1) out.push(cur); cur = []; drawing = !drawing; acc = 0; }
        }
    }
    if (cur.length > 1) out.push(cur);
    return out;
};
const bumpyCircle = (cx, cy, r, seed) => {
    const out = [], n = 22;
    for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2, k = 1 + 0.14 * Math.sin(a * 5 + seed) + 0.06 * Math.sin(a * 9 + seed * 2.3);
        out.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
    }
    return out;
};
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Every detail stroke: { pts, w } — w is nib width in map units.
export function detailStrokes() {
    const S = [];
    const add = (pts, w = 1.6) => S.push({ pts, w });
    const addAll = (arr, w) => arr.forEach((p) => add(p, w));

    // Great Hall: staff table, four house tables with benches, hearths.
    add(rectPoly(990, 288, 380, 22), 1.4);
    for (let x = 1004; x <= 1356; x += 22) add([[x, 320], [x + 6, 320]], 1.2);
    [985, 1110, 1250, 1375].forEach((x) => {
        add(rectPoly(x - 13, 380, 26, 430), 1.4);
        add([[x - 24, 392], [x - 24, 798]], 0.9);
        add([[x + 24, 392], [x + 24, 798]], 0.9);
    });
    add(circlePoly(898, 560, 10), 1.2); add(circlePoly(1462, 560, 10), 1.2);

    // Entrance Hall: house-point hourglasses, flagstones.
    [1055, 1130, 1230, 1305].forEach((x) => { add([[x - 9, 985], [x + 9, 985], [x - 9, 1015], [x + 9, 1015], [x - 9, 985]], 1.1); });
    addAll(dashed([[990, 1180], [1370, 1180]], 6, 10), 0.6);
    addAll(dashed([[990, 1240], [1370, 1240]], 6, 10), 0.6);
    S.push(...steps(1180, 1440, 1180, 1540, 110, 9));
    S.push(...steps(1000, 1296, 1000, 1366, 54, 8));
    S.push(...steps(1360, 1296, 1360, 1406, 54, 8));

    // Trophy Room cabinets, Kitchens barrels & tables.
    for (let x = 872; x < 1060; x += 46) add(rectPoly(x, 1376, 34, 16), 1.0);
    for (let x = 872; x < 1060; x += 46) add(rectPoly(x, 1528, 34, 16), 1.0);
    add(rectPoly(1330, 1440, 170, 18), 1.1); add(rectPoly(1330, 1500, 170, 18), 1.1);
    [[1316, 1418], [1336, 1416], [1512, 1552]].forEach(([x, y]) => add(circlePoly(x, y, 7), 1.0));

    // Grand Staircase: open stairwell and landings.
    addAll(dashed(rectPoly(1840, 680, 280, 320), 9, 7), 1.2);
    add(rectPoly(1832, 672, 296, 336), 0.7);
    S.push(...steps(1980, 446, 1980, 566, 64, 8));
    S.push(...steps(1980, 1116, 1980, 1186, 64, 8));

    // Gryffindor Tower: four-posters around the hearth.
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2 + 0.45, cx = 1980 + Math.cos(a) * 100, cy = 300 + Math.sin(a) * 100;
        const ca = Math.cos(a), sa = Math.sin(a), hw = 13, hh = 22;
        const corner = (u, v) => [cx + ca * v - sa * u, cy + sa * v + ca * u];
        add([corner(-hw, -hh), corner(hw, -hh), corner(hw, hh), corner(-hw, hh), corner(-hw, -hh)], 1.0);
    }
    add(circlePoly(1980, 300, 22), 1.3); add(circlePoly(1980, 300, 14), 0.8);

    // Seventh floor: Barnabas the Barmy tapestry.
    const tap = []; for (let x = 2600; x <= 2700; x += 4) tap.push([x, 252 + Math.sin(x * 0.18) * 2.2]);
    add(tap, 1.2); for (let x = 2604; x <= 2696; x += 9) add([[x, 254], [x, 262]], 0.7);

    // Library: shelves, restricted section rope.
    for (let x = 2530; x <= 2820; x += 42) { add([[x, 668], [x, 790]], 1.4); add([[x + 7, 668], [x + 7, 790]], 0.8); }
    for (let x = 2530; x <= 2820; x += 42) { add([[x, 890], [x, 1000]], 1.4); add([[x + 7, 890], [x + 7, 1000]], 0.8); }
    addAll(dashed([[2865, 632], [2865, 1028]], 5, 6), 1.1);
    for (let y = 660; y < 1010; y += 34) add([[2890, y], [2975, y]], 1.2);
    S.push(...steps(2740, 1036, 2740, 1110, 56, 8));
    S.push(...steps(2740, 560, 2740, 626, 56, 8));

    // Charms desks.
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) add(rectPoly(3082 + c * 52, 600 + r * 46, 34, 18), 1.0);

    // Headmaster: spiral stair & gargoyle.
    add(spiral(3420, 760, 6, 52, 2.4), 1.2);
    add(circlePoly(3420, 760, 62), 0.8);
    add([[3408, 950], [3420, 938], [3432, 950], [3426, 962], [3414, 962], [3408, 950]], 1.2);

    // Astronomy Tower: telescope platform.
    addAll(dashed(circlePoly(3700, 300, 68, 40), 7, 6), 1.0);
    add([[3700, 300], [3742, 262]], 2.2); add(circlePoly(3700, 300, 8), 1.2);

    // Hospital Wing beds.
    for (let i = 0; i < 6; i++) { add(rectPoly(3640 + i * 46, 580, 26, 46), 1.0); add(rectPoly(3640 + i * 46, 754, 26, 46), 1.0); }

    // Third-floor corridor, One-Eyed Witch and her passage.
    add([[1968, 1410], [1980, 1392], [1992, 1410], [1980, 1420], [1968, 1410]], 1.4);
    addAll(dashed(bez([1990, 1428], [2040, 1520], [2030, 1640], [2140, 1770], 30), 8, 9), 1.3);

    // Prefects' bath, Myrtle's sinks.
    add(circlePoly(2580, 1410, 46), 1.4); add(circlePoly(2580, 1410, 38), 0.8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(circlePoly(2580 + Math.cos(a) * 54, 1410 + Math.sin(a) * 54, 3.5, 10), 1.0); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(circlePoly(2850 + Math.cos(a) * 34, 1405 + Math.sin(a) * 34, 8, 12), 1.1); }
    add(circlePoly(2850, 1405, 10, 12), 0.8);

    // Dungeon stairs.
    [2580, 2850, 3330, 3680, 3880].forEach((x) => S.push(...steps(x, 1286, x, 1336, 50, 7)));

    // Potions cauldrons, Snape's shelves & desk, Slytherin lake window.
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { add(circlePoly(3290 + c * 66, 1390 + r * 80, 13), 1.3); add(circlePoly(3290 + c * 66, 1390 + r * 80, 7, 10), 0.7); }
    for (let y = 1350; y < 1470; y += 14) add([[3614, y], [3634, y]], 0.9);
    add(rectPoly(3672, 1386, 60, 30), 1.2);
    for (let k = 0; k < 4; k++) { const w = []; for (let x = 3816; x <= 3954; x += 4) w.push([x, 1560 - k * 9 + Math.sin(x * 0.12 + k) * 2.4]); add(w, 0.8); }
    add([[3830, 1400], [3940, 1400]], 0.9); add(circlePoly(3885, 1450, 18), 1.2);

    // ------------------------------------------------------------ the grounds
    const path = (pts) => addAll(dashed(pts, 5, 7), 1.2);
    path(bez([3995, 1250], [4080, 1220], [4180, 1060], [4270, 820], 30));
    path(bez([4260, 860], [4330, 760], [4400, 680], [4430, 610], 16));
    path(bez([4430, 610], [4470, 540], [4520, 480], [4555, 440], 16));
    path(bez([4430, 610], [4380, 520], [4330, 420], [4300, 320], 18));
    path(bez([4120, 1150], [4110, 1260], [4130, 1340], [4140, 1400], 14));

    // Hagrid's hut, chimney, pumpkins.
    add(circlePoly(4600, 380, 48), 1.6); add(circlePoly(4600, 380, 40), 0.9);
    add(rectPoly(4628, 336, 14, 14), 1.1);
    for (let i = 0; i < 5; i++) { const x = 4500 + (i % 3) * 22, y = 470 + Math.floor(i / 3) * 22; add(bumpyCircle(x, y, 8, i), 1.0); add([[x, y - 8], [x + 3, y - 13]], 0.9); }

    // Quidditch pitch.
    const pitch = []; for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2; pitch.push([4300 + Math.cos(a) * 170, 210 + Math.sin(a) * 78]); }
    add(pitch, 1.5); add([[4300, 134], [4300, 286]], 0.8); add(circlePoly(4300, 210, 18), 0.9);
    [-1, 1].forEach((s) => [-16, 0, 16].forEach((d) => add(circlePoly(4300 + s * 148, 210 + d, 4, 10), 1.0)));

    // Whomping Willow trunk + roots (the thrashing crown is a live sprite).
    add(bumpyCircle(4300, 700, 16, 3), 1.8);
    const rr = rng(77);
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + rr() * 0.4, L = 40 + rr() * 30;
        add(bez([4300 + Math.cos(a) * 15, 700 + Math.sin(a) * 15], [4300 + Math.cos(a + 0.3) * L * 0.5, 700 + Math.sin(a + 0.3) * L * 0.5], [4300 + Math.cos(a - 0.2) * L * 0.8, 700 + Math.sin(a - 0.2) * L * 0.8], [4300 + Math.cos(a) * L, 700 + Math.sin(a) * L], 10), 1.1);
    }
    add(circlePoly(4322, 736, 3, 8), 1.6);

    // Secret passage to the Shrieking Shack.
    const pass = bez([4312, 760], [4430, 950], [4420, 1180], [4560, 1396], 40);
    const off = (pts, d) => pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        return [p[0] - dy / L * d, p[1] + dx / L * d];
    });
    addAll(dashed(off(pass, -9), 12, 6), 1.1); addAll(dashed(off(pass, 9), 12, 6), 1.1);

    // Shrieking Shack: boarded up, sagging roof.
    add([[4510, 1410], [4622, 1404], [4626, 1500], [4506, 1504], [4510, 1410]], 1.6);
    add([[4500, 1414], [4566, 1370], [4632, 1408]], 1.6);
    for (let k = 0; k < 6; k++) add([[4520 + k * 17, 1394 - (k < 3 ? k * 8 : (5 - k) * 8)], [4528 + k * 17, 1412]], 0.8);
    add([[4520, 1440], [4560, 1470]], 1.2); add([[4520, 1470], [4560, 1440]], 1.2);
    add([[4576, 1436], [4612, 1436]], 1.2); add([[4576, 1450], [4612, 1452]], 1.2);

    // Forbidden Forest.
    const fr = rng(19);
    for (let i = 0; i < 46; i++) {
        const x = 4650 + fr() * 120, y = 520 + fr() * 860;
        if (y > 1360 && x < 4680) continue;
        const r = 12 + fr() * 12;
        add(bumpyCircle(x, y, r, i * 1.7), 1.0);
        add([[x, y + r * 0.9], [x + (fr() - 0.5) * 3, y + r + 8]], 0.9);
    }

    // The Black Lake and something with tentacles.
    add(bez([4000, 1370], [4140, 1400], [4330, 1500], [4400, 1800], 40), 1.6);
    for (let k = 0; k < 7; k++) {
        const y = 1440 + k * 48, x0 = 4010 + k * 8, L = 50 + (k % 3) * 20, w = [];
        for (let x = x0; x <= x0 + L; x += 3) w.push([x, y + Math.sin((x - x0) * 0.16) * 3]);
        add(w, 0.8);
    }
    add(spiral(4230, 1690, 2, 16, 1.4, 30), 1.1);
    add(bez([4246, 1690], [4262, 1660], [4276, 1700], [4290, 1672], 14), 1.0);

    // ------------------------------------------------------------ title panel ornament
    const frame = (i) => rectPoly(40 + i, 56 + i, 720 - i * 2, 1688 - i * 2);
    add(frame(0), 1.8); add(frame(11), 0.9);
    [[40, 56, 1, 1], [760, 56, -1, 1], [40, 1744, 1, -1], [760, 1744, -1, -1]].forEach(([x, y, sx, sy]) => {
        add(spiral(x + sx * 40, y + sy * 40, 2, 20, 1.6, 40).map(([px, py]) => [px, py]), 1.2);
        add(bez([x + sx * 11, y + sy * 70], [x + sx * 20, y + sy * 40], [x + sx * 40, y + sy * 20], [x + sx * 70, y + sy * 11], 16), 1.0);
    });

    // Swash under the title.
    add(bez([150, 905], [260, 960], [330, 860], [400, 905], 40), 1.8);
    add(bez([400, 905], [470, 950], [540, 860], [650, 905], 40), 1.8);
    add(spiral(150, 895, 2, 12, 1.2, 24), 1.3); add(spiral(650, 895, 2, 12, -1.2, 24), 1.3);

    // Compass rose.
    const cx = 400, cy = 1185;
    add(circlePoly(cx, cy, 150, 90), 1.6); add(circlePoly(cx, cy, 140, 90), 0.9); add(circlePoly(cx, cy, 34, 30), 1.1);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2, L = i % 2 ? 92 : 132, w = i % 2 ? 14 : 20;
        const tip = [cx + Math.cos(a) * L, cy + Math.sin(a) * L];
        const l = [cx + Math.cos(a - Math.PI / 2) * w, cy + Math.sin(a - Math.PI / 2) * w];
        const r = [cx + Math.cos(a + Math.PI / 2) * w, cy + Math.sin(a + Math.PI / 2) * w];
        add([l, tip, r], 1.3);
        add([[cx, cy], tip], 0.7);
    }
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; add([[cx + Math.cos(a) * 140, cy + Math.sin(a) * 140], [cx + Math.cos(a) * (i % 4 ? 133 : 126), cy + Math.sin(a) * (i % 4 ? 133 : 126)]], 0.8); }

    return S;
}

// Text in ink. f: 'sc' | 'fell' | 'italic' | 'script'. a: rotation in radians.
export const LABELS = [
    // Title panel
    { s: 'Messrs Moony, Wormtail,', x: 400, y: 245, f: 'script', z: 58 },
    { s: 'Padfoot & Prongs', x: 400, y: 312, f: 'script', z: 58 },
    { s: 'Purveyors of Aids to Magical Mischief-Makers', x: 400, y: 392, f: 'italic', z: 27 },
    { s: 'are proud to present', x: 400, y: 470, f: 'italic', z: 34 },
    { s: 'THE', x: 400, y: 572, f: 'sc', z: 50 },
    { s: "MARAUDER'S", x: 400, y: 690, f: 'sc', z: 92 },
    { s: 'MAP', x: 400, y: 842, f: 'sc', z: 150 },
    { s: 'N', x: 400, y: 1014, f: 'sc', z: 34 },
    { s: 'S', x: 400, y: 1380, f: 'sc', z: 34 },
    { s: 'W', x: 216, y: 1197, f: 'sc', z: 30 },
    { s: 'E', x: 584, y: 1197, f: 'sc', z: 30 },
    { s: 'Hogwarts School', x: 400, y: 1460, f: 'italic', z: 38 },
    { s: 'of Witchcraft and Wizardry', x: 400, y: 1508, f: 'italic', z: 32 },
    { s: 'drawn & enchanted by A. Pilania, mischief-maker', x: 400, y: 1660, f: 'script', z: 26 },

    // Castle
    { s: 'THE GREAT HALL', x: 1180, y: 860 - 18, f: 'sc', z: 30 },
    { s: 'Staff Table', x: 1180, y: 278, f: 'italic', z: 18 },
    { s: 'Entrance Hall', x: 1180, y: 1100, f: 'italic', z: 28 },
    { s: 'Front Doors', x: 1180, y: 1572, f: 'italic', z: 22 },
    { s: 'to the grounds', x: 1180, y: 1600, f: 'italic', z: 17 },
    { s: 'Trophy Room', x: 965, y: 1470, f: 'italic', z: 22 },
    { s: 'Kitchens', x: 1415, y: 1488, f: 'italic', z: 22 },
    { s: 'GRAND STAIRCASE', x: 1980, y: 1094, f: 'sc', z: 24 },
    { s: 'Gryffindor Tower', x: 1980, y: 476 - 300 + 300 - 10, f: 'italic', z: 1, hide: true },
    { s: 'GRYFFINDOR', x: 1980, y: 196, f: 'sc', z: 20 },
    { s: 'Tower', x: 1980, y: 420, f: 'italic', z: 18 },
    { s: 'The Fat Lady', x: 2056, y: 512, f: 'italic', z: 17 },
    { s: 'Seventh-Floor Corridor', x: 2380, y: 290, f: 'italic', z: 19 },
    { s: 'Barnabas the Barmy', x: 2650, y: 242, f: 'italic', z: 15 },
    { s: 'THE LIBRARY', x: 2670, y: 870, f: 'sc', z: 24 },
    { s: 'Restricted Section', x: 2934, y: 830, f: 'italic', z: 17, a: -Math.PI / 2 },
    { s: 'Charms', x: 3150, y: 692, f: 'italic', z: 18 },
    { s: "Headmaster's", x: 3420, y: 690, f: 'italic', z: 18 },
    { s: 'Office', x: 3420, y: 840, f: 'italic', z: 18 },
    { s: 'Gargoyle', x: 3462, y: 990, f: 'italic', z: 15 },
    { s: 'ASTRONOMY', x: 3700, y: 212, f: 'sc', z: 18 },
    { s: 'Tower', x: 3700, y: 398, f: 'italic', z: 17 },
    { s: 'Hospital Wing', x: 3770, y: 694, f: 'italic', z: 22 },
    { s: 'Third-Floor Corridor', x: 1940, y: 1320, f: 'italic', z: 16, a: -Math.PI / 2 },
    { s: 'One-Eyed Witch', x: 2066, y: 1414, f: 'italic', z: 16 },
    { s: 'to Honeydukes', x: 2172, y: 1712, f: 'italic', z: 16, a: 0.8 },
    { s: 'Ground-Floor Corridor', x: 2260, y: 1240, f: 'italic', z: 16 },
    { s: "Prefects'", x: 2580, y: 1342 + 6, f: 'italic', z: 15 },
    { s: 'Bathroom', x: 2580, y: 1484, f: 'italic', z: 15 },
    { s: "Moaning Myrtle's", x: 2850, y: 1350, f: 'italic', z: 14 },
    { s: 'Bathroom', x: 2850, y: 1472, f: 'italic', z: 14 },
    { s: 'Potions', x: 3390, y: 1520, f: 'italic', z: 22 },
    { s: 'Classroom', x: 3390, y: 1546, f: 'italic', z: 18 },
    { s: "Prof. Snape's", x: 3680, y: 1442, f: 'italic', z: 15 },
    { s: 'Office', x: 3700, y: 1466, f: 'italic', z: 15 },
    { s: 'Slytherin', x: 3885, y: 1494, f: 'italic', z: 18 },
    { s: 'Common Room', x: 3885, y: 1518, f: 'italic', z: 15 },
    { s: 'THE DUNGEONS', x: 3600, y: 1640, f: 'sc', z: 24 },

    // Grounds
    { s: "Hagrid's Hut", x: 4600, y: 318, f: 'italic', z: 20 },
    { s: 'Quidditch Pitch', x: 4300, y: 112, f: 'italic', z: 20 },
    { s: 'The Whomping Willow', x: 4180, y: 610, f: 'italic', z: 20 },
    { s: 'Secret Passage', x: 4468, y: 1080, f: 'italic', z: 16, a: 1.22 },
    { s: 'The Shrieking Shack', x: 4566, y: 1544, f: 'italic', z: 20 },
    { s: 'Forbidden Forest', x: 4716, y: 1440, f: 'italic', z: 20, a: -Math.PI / 2 },
    { s: 'The Black Lake', x: 4120, y: 1590, f: 'italic', z: 22 },
    { s: 'THE GROUNDS', x: 4280, y: 1040 - 40, f: 'sc', z: 22 },
].filter((l) => !l.hide);

// Navigation graph for the footprints.
export const NODES = {
    GHs: [1180, 345], GH: [1180, 600], GHd: [1180, 905], EH: [1180, 1130], EHe: [1380, 1060],
    FD: [1180, 1500], TRc: [1000, 1325], TR: [965, 1430], KIc: [1360, 1340], KI: [1415, 1470],
    C1: [1560, 1060], S4: [1780, 1060], S3: [2180, 1060], S1: [1780, 620], S2: [2180, 620],
    Stop: [1980, 618], Sbot: [1980, 1062], SE: [2195, 840], SW: [1775, 840],
    GTc: [1980, 505], GT: [1980, 330],
    C7a: [2200, 300], C7b: [2740, 300], C7c: [3150, 300], C7d: [3500, 300], AT: [3700, 320], ATc: [3700, 495],
    HW: [3770, 640], HWc: [3760, 1040],
    C2: [2340, 840], LIBw: [2540, 840], LIB: [2700, 830], LIBr: [2930, 780], C7L: [2740, 480], LIBs: [2740, 1145],
    CHc: [3150, 760], CH: [3150, 640], HM: [3420, 770], GG: [3420, 1060],
    G1: [1980, 1250], Gpb: [2580, 1250], Glib: [2740, 1250], Gmy: [2850, 1250], Gpo: [3330, 1250], Ggg: [3420, 1250],
    Gsn: [3680, 1250], Ghw: [3760, 1250], Gsl: [3880, 1250], Gx: [3985, 1250],
    SBc: [1980, 1185], OEW: [1980, 1390],
    PB: [2580, 1400], MM: [2850, 1400], PO: [3390, 1440], SO: [3680, 1400], SL: [3885, 1440],
    X1: [4110, 1150], X2: [4255, 880], WW: [4300, 780], X3: [4425, 615], HH: [4555, 440], QP: [4300, 240],
    LK: [4140, 1400], P1: [4422, 1000], P2: [4500, 1250], SS: [4566, 1452],
    RoR: [2850, 180],
};

export const EDGES = [
    ['GHs', 'GH'], ['GH', 'GHd'], ['GHd', 'EH'], ['EH', 'FD'], ['EH', 'TRc'], ['TRc', 'TR'], ['EH', 'KIc'], ['KIc', 'KI'],
    ['EH', 'EHe'], ['EHe', 'C1'], ['C1', 'S4'], ['S4', 'Sbot'], ['Sbot', 'S3'], ['S3', 'SE'], ['SE', 'S2'], ['S2', 'Stop'],
    ['Stop', 'S1'], ['S1', 'SW'], ['SW', 'S4'], ['Stop', 'GTc'], ['GTc', 'GT'],
    ['GT', 'C7a'], ['C7a', 'C7b'], ['C7b', 'C7c'], ['C7c', 'C7d'], ['C7d', 'AT'], ['AT', 'ATc'], ['ATc', 'HW'], ['HW', 'HWc'], ['HWc', 'Ghw'],
    ['SE', 'C2'], ['C2', 'LIBw'], ['LIBw', 'LIB'], ['LIB', 'LIBr'], ['C7b', 'C7L'], ['C7L', 'LIB'], ['LIB', 'LIBs'], ['LIBs', 'Glib'],
    ['LIBr', 'CHc'], ['CHc', 'CH'], ['CHc', 'HM'], ['HM', 'GG'], ['GG', 'Ggg'],
    ['Sbot', 'SBc'], ['SBc', 'G1'], ['G1', 'OEW'], ['G1', 'Gpb'], ['Gpb', 'Glib'], ['Glib', 'Gmy'], ['Gmy', 'Gpo'], ['Gpo', 'Ggg'],
    ['Ggg', 'Gsn'], ['Gsn', 'Ghw'], ['Ghw', 'Gsl'], ['Gsl', 'Gx'],
    ['Gpb', 'PB'], ['Gmy', 'MM'], ['Gpo', 'PO'], ['Gsn', 'SO'], ['Gsl', 'SL'],
    ['Gx', 'X1'], ['X1', 'X2'], ['X2', 'WW'], ['X2', 'X3'], ['X3', 'HH'], ['X3', 'QP'], ['X1', 'LK'],
    ['WW', 'P1'], ['P1', 'P2'], ['P2', 'SS'],
    ['C7b', 'RoR'],
];

export const CAST = [
    {
        id: 'harry', name: 'HARRY POTTER', kind: 'shoe', speed: 74, stride: 30, start: 'GT',
        prefs: { GT: 3, GH: 3, QP: 3, HH: 2, C7b: 2, RoR: 2, OEW: 1, WW: 1, LIB: 1 },
        lines: [
            'Mr Prongs is delighted to see the family tradition of being out of bed after hours is in such capable hands.',
            'Mr Padfoot would like it noted that the boy has his father\u2019s hair and, tragically, his father\u2019s idea of a shortcut.',
            'Mr Moony advises Mr Potter that the cloak hides the boy, not the footprints. Do keep moving.',
        ],
    },
    {
        id: 'hermione', name: 'HERMIONE GRANGER', kind: 'shoe', speed: 82, stride: 27, start: 'LIB',
        prefs: { LIB: 6, LIBr: 2, GT: 2, GH: 2, CH: 2, HH: 1 },
        lines: [
            'Mr Moony approves of anyone who reads this much, and begs Miss Granger to stop correcting the spelling on our map.',
            'Mr Prongs suspects Miss Granger has already found three mistakes on this parchment. There are four.',
            'Mr Padfoot reminds Miss Granger that the Restricted Section is restricted, which is precisely the appeal.',
        ],
    },
    {
        id: 'ron', name: 'RON WEASLEY', kind: 'shoe', speed: 70, stride: 31, start: 'GH',
        prefs: { GH: 4, GT: 3, KI: 3, QP: 2, HH: 1 },
        lines: [
            'Mr Padfoot advises Mr Weasley to keep a much closer eye on his rat.',
            'Mr Wormtail sees nothing interesting about Mr Weasley whatsoever and would like to change the subject.',
            'Mr Prongs notes that Mr Weasley has walked to the kitchens four times tonight and admires the commitment.',
        ],
    },
    {
        id: 'snape', name: 'SEVERUS SNAPE', kind: 'shoe', speed: 66, stride: 33, start: 'PO', villain: true,
        prefs: { PO: 4, SO: 4, SL: 2, GH: 2, LIBr: 1, C7b: 1, WW: 1 },
        lines: [
            'Mr Padfoot wonders whether Professor Snape has ever considered washing his hair, or at least threatening it.',
            'Mr Moony would remind Professor Snape that greasy fingerprints are almost impossible to lift from parchment.',
            'Mr Prongs is surprised the Professor can see the map at all past that nose, and suggests he turn it sideways.',
            'Mr Wormtail bids the Professor good evening, and observes that sulking is not offered at N.E.W.T. level.',
            'Messrs Moony, Padfoot and Prongs agree this parchment has no secrets for Snivellus. Shoo.',
        ],
    },
    {
        id: 'filch', name: 'ARGUS FILCH', kind: 'shoe', speed: 52, stride: 26, start: 'TR',
        prefs: { EH: 2, TR: 3, C7b: 2, G1: 2, Gpo: 2, Gsl: 2, FD: 2, SBc: 1, OEW: 1 },
        lines: [
            'Mr Padfoot would like Mr Filch to know the third-floor toilets have been flooding since Tuesday, and it wasn\u2019t us.',
            'Mr Moony suggests Mr Filch confiscate a sense of humour next. It would be his first.',
            'Mr Prongs recommends the caretaker check the filing cabinet marked Confiscated and Highly Dangerous. Twice.',
        ],
    },
    {
        id: 'norris', name: 'MRS NORRIS', kind: 'paw', speed: 60, stride: 18, start: 'EH', follows: 'filch',
        prefs: { EH: 2, TR: 2, C7b: 2, G1: 2, KI: 2, Gsl: 1 },
        lines: [
            'Mr Padfoot, speaking strictly as a dog, has nothing kind to say about this cat.',
            'Mr Moony observes that Mrs Norris has seen you. Mrs Norris always sees you.',
        ],
    },
    {
        id: 'dumbledore', name: 'ALBUS DUMBLEDORE', kind: 'shoe', speed: 46, stride: 34, start: 'HM',
        prefs: { HM: 5, GHs: 4, AT: 2, HW: 1, KI: 1 },
        lines: [
            'Messrs Moony, Wormtail, Padfoot and Prongs doff their caps to the Headmaster and swear this is an ordinary blank parchment.',
            'Mr Prongs strongly suspects the Headmaster already knows exactly what this map is.',
            'Mr Moony notes the Headmaster is walking towards the kitchens again. Sherbet lemons, presumably.',
        ],
    },
    {
        id: 'pettigrew', name: 'PETER PETTIGREW', kind: 'shoe', speed: 58, stride: 22, start: 'SS', ghost: true,
        prefs: { SS: 3, P2: 2, GT: 2, KI: 2, LK: 1 },
        lines: [
            'Mr Wormtail is not here. Mr Wormtail has never been here. Kindly look elsewhere.',
            'Mr Padfoot would very much like a word with this one.',
            'Mr Moony insists the map never lies, and invites you to draw your own conclusions about a dead man walking.',
        ],
    },
];

export const VISITOR_LINES = [
    'Mr Moony welcomes {name} and trusts they are up to precisely no good.',
    'Mr Padfoot approves of {name}\u2019s walk. Very sneaky. Almost respectable.',
    'Mr Prongs advises {name} that Filch is closer than you think.',
    'Mr Wormtail would follow {name} anywhere. Mr Wormtail would follow anyone anywhere.',
];

export const ROR_LINES = [
    'Mr Padfoot cannot find it either. Walk past three times and think very hard.',
    'Mr Moony notes the Room only appears to those who need it. Mr Prongs needs a nap.',
];

export const AREAS = [
    { id: 'title', label: 'The Marauders', x: 400 },
    { id: 'hall', label: 'Great Hall', x: 1180 },
    { id: 'stairs', label: 'Grand Staircase', x: 1990 },
    { id: 'library', label: 'Library & Seventh Floor', x: 2760 },
    { id: 'dungeons', label: 'Headmaster & Dungeons', x: 3560 },
    { id: 'grounds', label: 'The Grounds', x: 4380 },
];
