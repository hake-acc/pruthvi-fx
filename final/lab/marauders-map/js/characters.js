// Footprints that know their way around the castle.
import { NODES, EDGES, CAST } from './plan.js';

const ROOMS = new Set(['GH', 'GHs', 'GT', 'LIB', 'LIBr', 'TR', 'KI', 'PB', 'MM', 'PO', 'SO', 'SL', 'HM', 'HW', 'CH', 'AT', 'HH', 'QP', 'SS', 'WW', 'LK', 'RoR', 'OEW']);

function graph(allowRoR) {
    const adj = {};
    Object.keys(NODES).forEach((k) => (adj[k] = []));
    EDGES.forEach(([a, b]) => {
        if (!allowRoR && (a === 'RoR' || b === 'RoR')) return;
        const d = Math.hypot(NODES[a][0] - NODES[b][0], NODES[a][1] - NODES[b][1]);
        adj[a].push([b, d]); adj[b].push([a, d]);
    });
    return adj;
}
const G0 = graph(false), G1 = graph(true);

function route(from, to, allowRoR) {
    const adj = allowRoR ? G1 : G0;
    const dist = { [from]: 0 }, prev = {}, open = new Set([from]), done = new Set();
    while (open.size) {
        let u = null;
        open.forEach((k) => { if (u === null || dist[k] < dist[u]) u = k; });
        open.delete(u); done.add(u);
        if (u === to) break;
        for (const [v, d] of adj[u]) {
            if (done.has(v)) continue;
            const nd = dist[u] + d;
            if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = u; open.add(v); }
        }
    }
    if (dist[to] === undefined) return null;
    const path = [to];
    while (path[0] !== from) path.unshift(prev[path[0]]);
    return path;
}

function pick(prefs, exclude) {
    const entries = Object.entries(prefs).filter(([k]) => k !== exclude && NODES[k]);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
    return entries[0][0];
}

export class Walker {
    constructor(def, world) {
        this.def = def; this.world = world;
        this.node = def.start;
        this.pos = [...NODES[def.start]];
        this.heading = Math.random() * Math.PI * 2;
        this.path = []; this.seg = 0; this.segT = 0;
        this.pause = 1 + Math.random() * 2;
        this.stride = 0; this.foot = 0;
        this.phase = Math.random() * 100;
        this.active = false; this.visible = !def.ghost;
        this.dest = def.start;
        this.ghostTimer = def.ghost ? 14 + Math.random() * 10 : 0;
        this.bannerPos = [this.pos[0], this.pos[1] - 46];
    }
    plan() {
        const d = this.def;
        let to;
        if (d.follows) {
            const leader = this.world.walkers.find((w) => w.def.id === d.follows);
            to = leader && Math.random() < 0.65 ? leader.dest : pick(d.prefs, this.node);
        } else to = pick(d.prefs, this.node);
        if (to === this.node) to = pick(d.prefs, this.node);
        const p = route(this.node, to, this.world.rorOpen);
        if (!p || p.length < 2) { this.pause = 1.5; return; }
        this.path = p; this.seg = 0; this.segT = 0; this.dest = to;
    }
    update(dt, now) {
        if (!this.active) return;
        const d = this.def;
        if (d.ghost) {
            this.ghostTimer -= dt;
            if (this.ghostTimer <= 0) {
                if (this.visible) { this.visible = false; this.ghostTimer = 22 + Math.random() * 18; this.world.onGhost(this, false, now); }
                else {
                    const spots = ['SS', 'P2', 'GT', 'KI', 'LK', 'TR', 'PB', 'OEW'];
                    const ron = this.world.walkers.find((w) => w.def.id === 'ron');
                    let at = spots[Math.floor(Math.random() * spots.length)];
                    if (ron && Math.random() < 0.45) at = ron.path.length ? ron.path[Math.min(ron.seg + 1, ron.path.length - 1)] : ron.node;
                    this.node = at; this.pos = [...NODES[at]]; this.path = []; this.pause = 0.8;
                    this.bannerPos = [this.pos[0], this.pos[1] - 46];
                    this.visible = true; this.ghostTimer = 9 + Math.random() * 6; this.world.onGhost(this, true, now);
                }
            }
            if (!this.visible) return;
        }
        if (this.pause > 0) {
            this.pause -= dt;
            if (this.pause <= 0) this.plan();
            this.updateBanner(dt);
            return;
        }
        if (!this.path.length) { this.plan(); return; }
        const a = NODES[this.path[this.seg]], b = NODES[this.path[this.seg + 1]];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const sp = d.speed * (0.88 + 0.18 * Math.sin(now * 0.7 + this.phase)) * (this.world.rorOpen || this.path[this.seg + 1] !== 'RoR' ? 1 : 1);
        this.segT += (sp * dt) / L;
        if (this.segT >= 1) {
            this.seg++; this.segT = 0;
            this.node = this.path[this.seg];
            if (this.seg >= this.path.length - 1) {
                this.path = [];
                this.pause = ROOMS.has(this.node) ? 3 + Math.random() * 6 : 0.4 + Math.random() * 1.5;
                if (this.node === 'RoR' && !this.world.rorOpen) this.pause = 0.2;
                this.updateBanner(dt);
                return;
            }
        }
        const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
        const wander = Math.sin(now * 0.9 + this.phase) * 5 + Math.sin(now * 2.3 + this.phase * 2) * 2;
        const nx = a[0] + (b[0] - a[0]) * this.segT - uy * wander, ny = a[1] + (b[1] - a[1]) * this.segT + ux * wander;
        const mx = nx - this.pos[0], my = ny - this.pos[1], m = Math.hypot(mx, my);
        if (m > 0.0001) {
            const target = Math.atan2(my, mx);
            let dh = target - this.heading;
            while (dh > Math.PI) dh -= Math.PI * 2;
            while (dh < -Math.PI) dh += Math.PI * 2;
            this.heading += dh * Math.min(1, dt * 7);
        }
        this.pos[0] = nx; this.pos[1] = ny;
        this.stride += m;
        if (this.stride >= d.stride) {
            this.stride -= d.stride;
            this.step(now);
        }
        this.updateBanner(dt);
    }
    step(now) {
        const d = this.def, side = this.foot ? 1 : -1;
        const off = d.kind === 'paw' ? 3.2 : 5.6;
        const lx = -Math.sin(this.heading) * off * side, ly = Math.cos(this.heading) * off * side;
        const jitter = (Math.random() - 0.5) * 0.12;
        if (d.kind === 'paw') {
            this.world.overlay.addPrint(this.pos[0] + lx, this.pos[1] + ly, this.heading + jitter, 2, now, 0.85);
            this.world.overlay.addPrint(this.pos[0] + lx + Math.cos(this.heading) * 9, this.pos[1] + ly + Math.sin(this.heading) * 9, this.heading + jitter, 2, now + 0.05, 0.85);
        } else {
            this.world.overlay.addPrint(this.pos[0] + lx, this.pos[1] + ly, this.heading + jitter + side * 0.06, this.foot, now, d.id === 'dumbledore' ? 1.08 : 1);
        }
        this.foot = 1 - this.foot;
        if (this.world.onStep) this.world.onStep(this);
    }
    updateBanner(dt) {
        const k = 1 - Math.exp(-dt * 4);
        this.bannerPos[0] += (this.pos[0] - this.bannerPos[0]) * k;
        this.bannerPos[1] += (this.pos[1] - 46 - this.bannerPos[1]) * k;
    }
}

export function createCast(overlay) {
    const world = { overlay, walkers: [], rorOpen: false, onGhost: () => {}, onStep: null };
    world.walkers = CAST.map((def) => new Walker(def, world));
    return world;
}
