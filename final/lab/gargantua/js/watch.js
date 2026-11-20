// Murph's watch: a 38 mm field watch, steel case turned on a lathe profile, black dial painted on a canvas, cream
// lume hands, and a second hand that has stopped keeping time and started spelling. Morse is scheduled here; the
// page reads the hand angle and the onsets (for the tick sound and the caption) every frame.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';

function dialTexture() {
    const n = 1024, c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d');
    const cx = n / 2;
    // matte black with a faint grain and a hint of sunburst
    const g = x.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0, '#16161a'); g.addColorStop(1, '#0a0a0c');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    for (let i = 0; i < 360; i++) {
        const a = (i / 360) * Math.PI * 2;
        x.strokeStyle = `rgba(255,255,255,${0.008 + (i % 3) * 0.004})`;
        x.beginPath(); x.moveTo(cx, cx); x.lineTo(cx + Math.cos(a) * cx, cx + Math.sin(a) * cx); x.stroke();
    }
    x.translate(cx, cx);
    // minute track
    for (let i = 0; i < 60; i++) {
        x.save(); x.rotate((i / 60) * Math.PI * 2);
        x.fillStyle = '#e9dfc6';
        const five = i % 5 === 0;
        x.fillRect(-(five ? 5 : 2), -cx * 0.95, five ? 10 : 4, five ? 34 : 20);
        x.restore();
    }
    // numerals 1-12 outer, 13-24 inner, in the field-watch manner
    x.fillStyle = '#efe5cc';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        x.font = `600 ${i % 3 === 0 ? 92 : 78}px "G Suisse", "Helvetica Neue", Arial, sans-serif`;
        x.fillText(String(i), Math.cos(a) * cx * 0.71, Math.sin(a) * cx * 0.71 + 4);
        x.font = '500 30px "G Mono", monospace';
        x.fillStyle = 'rgba(239,229,204,0.65)';
        x.fillText(String(i + 12), Math.cos(a) * cx * 0.5, Math.sin(a) * cx * 0.5);
        x.fillStyle = '#efe5cc';
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

// worn brown calf: pebbled grain, darker burnished edges, a saddle stitch down each side
function leatherTextures() {
    const w = 256, h = 1024;
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const cm = mk(), cb = mk();
    const m = cm.getContext('2d'), b = cb.getContext('2d');
    m.fillStyle = '#4b2d1b'; m.fillRect(0, 0, w, h);
    b.fillStyle = '#9a9a9a'; b.fillRect(0, 0, w, h);
    let s = 77;
    const R = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < 9000; i++) {
        const x = R() * w, y = R() * h, r = 0.6 + R() * 2.2, v = R();
        m.fillStyle = `rgba(${v < 0.5 ? '20,10,5' : '120,80,50'},${0.05 + R() * 0.08})`;
        m.beginPath(); m.arc(x, y, r, 0, 6.283); m.fill();
        b.fillStyle = `rgba(${v < 0.5 ? '40,40,40' : '220,220,220'},${0.12 + R() * 0.15})`;
        b.beginPath(); b.arc(x, y, r, 0, 6.283); b.fill();
    }
    // burnished edges
    const eg = m.createLinearGradient(0, 0, w, 0);
    eg.addColorStop(0, 'rgba(15,8,4,0.7)'); eg.addColorStop(0.08, 'rgba(15,8,4,0)'); eg.addColorStop(0.92, 'rgba(15,8,4,0)'); eg.addColorStop(1, 'rgba(15,8,4,0.7)');
    m.fillStyle = eg; m.fillRect(0, 0, w, h);
    // stitches: slanted dashes, pressed into the bump
    for (const x of [w * 0.12, w * 0.88]) for (let y = 6; y < h; y += 14) {
        m.save(); m.translate(x, y); m.rotate(0.5); m.fillStyle = '#d9c7a4'; m.fillRect(-1.6, -4, 3.2, 8); m.restore();
        b.save(); b.translate(x, y); b.rotate(0.5); b.fillStyle = '#e8e8e8'; b.fillRect(-1.6, -4, 3.2, 8); b.restore();
        b.fillStyle = '#303030'; b.fillRect(x - 1, y + 5, 2, 3);
    }
    const map = new THREE.CanvasTexture(cm), bump = new THREE.CanvasTexture(cb);
    map.colorSpace = THREE.SRGBColorSpace;
    for (const t of [map, bump]) { t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return { map, bump };
}

function hand(len, w0, w1, tail, depth, mat) {
    const s = new THREE.Shape();
    s.moveTo(-w0 / 2, -tail); s.lineTo(w0 / 2, -tail); s.lineTo(w1 / 2, len * 0.85); s.lineTo(0, len); s.lineTo(-w1 / 2, len * 0.85); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    return new THREE.Mesh(g, mat);
}

// Morse for STAY, unit 0.24 s. The hand sits on the second it stopped on and twitches forward for each mark.
const CODE = { S: '...', T: '-', A: '.-', Y: '-.--' };
export function morseSchedule(word = 'STAY', u = 0.24) {
    const ev = [];
    let t = 0.8;
    for (const ch of word) {
        for (const sym of CODE[ch]) {
            const d = sym === '.' ? u : u * 3;
            ev.push({ t0: t, t1: t + d, ch, sym });
            t += d + u;
        }
        t += u * 2;
        ev.push({ t0: t, t1: t, ch, sym: ' ', end: true });
    }
    return { ev, period: t + u * 9 };
}

export function createWatch() {
    const steel = new THREE.MeshPhysicalMaterial({ color: 0xc9cbcf, metalness: 1, roughness: 0.18, clearcoat: 0.3 });
    const brushed = new THREE.MeshStandardMaterial({ color: 0xb4b7bc, metalness: 1, roughness: 0.38 });
    const dialMat = new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.6, metalness: 0 });
    const lume = new THREE.MeshStandardMaterial({ color: 0xefe5cc, roughness: 0.45, metalness: 0.2, emissive: 0x2a2212 });
    const handSteel = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.22 });
    const lt = leatherTextures();
    const leather = new THREE.MeshPhysicalMaterial({ map: lt.map, bumpMap: lt.bump, bumpScale: 1.4, roughnessMap: lt.bump, roughness: 0.85, sheen: 0.4, sheenColor: 0x8a5a3a, sheenRoughness: 0.6 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false });

    const root = new THREE.Group();
    const face = new THREE.Group();
    root.add(face);

    // case: lathe profile (radius, height), axis along +Y, later turned to face the camera
    const prof = [[0, -0.22], [0.86, -0.22], [0.97, -0.16], [1.0, -0.02], [0.98, 0.1], [0.93, 0.15], [0.86, 0.16], [0.84, 0.12], [0.8, 0.12]].map(([r, y]) => new THREE.Vector2(r, y));
    const caseM = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), steel);
    face.add(caseM);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.8, 96), dialMat);
    dial.rotation.x = -Math.PI / 2; dial.position.y = 0.06; face.add(dial);
    const crystal = new THREE.Mesh(new THREE.SphereGeometry(1.6, 64, 16, 0, Math.PI * 2, 0, 0.53), glass);
    crystal.position.y = 0.16 - 1.6 * Math.cos(0.53) - 0.0; face.add(crystal);
    // lugs and crown
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), brushed);
        lug.position.set(sx * 0.52, -0.06, sz * 1.02); lug.rotation.x = sz * 0.12; face.add(lug);
    }
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 24), brushed);
    crown.rotation.z = Math.PI / 2; crown.position.set(1.07, -0.04, 0); face.add(crown);
    // strap: rounded, tapering, curving away round a wrist that is not there, stitched along both edges
    for (const sz of [-1, 1]) {
        const g = new RoundedBoxGeometry(0.88, 0.085, 3.0, 8, 0.035);
        const p = g.attributes.position;
        const RB = 1.5, Z0 = 0.15;
        for (let i = 0; i < p.count; i++) {
            let x = p.getX(i), y = p.getY(i), z = p.getZ(i) + 1.5;   // 0 at the lug, 3 at the far end
            x *= 1 - 0.14 * THREE.MathUtils.clamp((z - 0.4) / 2.4, 0, 1);
            if (z > Z0) {
                // wrap round a centre RB behind the strap; the outer face sits on the larger radius
                const th = (z - Z0) / RB, r = RB + y;
                z = Z0 + Math.sin(th) * r; y = -RB + Math.cos(th) * r;
            }
            p.setXYZ(i, x, y, z * sz);
        }
        g.computeVertexNormals();
        const strap = new THREE.Mesh(g, leather);
        strap.position.set(0, -0.11, sz * 1.18);
        face.add(strap);
        // a keeper loop near the case
        const keeper = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.15, 0.12, 3, 0.04), leather);
        keeper.position.set(0, -0.12, sz * 1.62); face.add(keeper);
    }
    // hands, built pointing +Y in the XY plane, laid onto the dial
    const handsPlane = new THREE.Group();
    handsPlane.rotation.x = -Math.PI / 2; handsPlane.position.y = 0.075; face.add(handsPlane);
    const hHour = hand(0.42, 0.09, 0.07, 0.08, 0.015, lume);
    const hMin = hand(0.66, 0.07, 0.05, 0.1, 0.015, lume);
    const hSec = hand(0.74, 0.016, 0.012, 0.2, 0.012, handSteel);
    hMin.position.z = 0.016; hSec.position.z = 0.032;
    handsPlane.add(hHour, hMin, hSec);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20), handSteel);
    cap.rotation.x = Math.PI / 2; cap.position.z = 0.05; handsPlane.add(cap);
    // hands read 10:08, the second hand parked on 12
    hHour.rotation.z = -((10 + 8 / 60) / 12) * Math.PI * 2;
    hMin.rotation.z = -(8 / 60) * Math.PI * 2;

    face.rotation.x = Math.PI / 2;  // dial faces +Z

    const sched = morseSchedule();
    let lastOn = false;
    // returns the current mark and whether a new one just began
    function update(t) {
        const tt = t % sched.period;
        let on = null;
        for (const e of sched.ev) if (!e.end && tt >= e.t0 && tt < e.t1) { on = e; break; }
        const base = 0;
        const target = on ? -(1 / 60) * Math.PI * 2 : 0;
        hSec.rotation.z += (base + target - hSec.rotation.z) * 0.55;
        const onset = !!on && !lastOn;
        lastOn = !!on;
        // the text so far
        let morse = '', word = '';
        for (const e of sched.ev) {
            if (e.t0 > tt) break;
            if (e.end) { word += e.ch; morse += '   '; } else morse += e.sym === '.' ? '\u00b7' : '\u2013';
        }
        return { onset, on: !!on, morse, word };
    }
    return { root, update };
}
