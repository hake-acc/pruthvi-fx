// Sound. (a) A pipe organ composed live: each pipe is a PeriodicWave mixing 16', 8', 4', 2 2/3' and 2' ranks, voiced
// with a slow chiff and wind wobble, through a generated cathedral impulse. Original slow chords, 8.75 s each (seven
// ticks), under a clock that ticks every 1.25 s. The scroll sets how much organ there is; the horizon is silence.
// (b) The owner's own score file, if one has been placed at audio/score.mp3.
// Time dilation is heard, not shown: one constant source feeds every oscillator's and filter's detune, so near the
// horizon the whole instrument sinks in pitch together, and the clock's tick interval stretches by the same factor.
// Holding the thrusters opens a band of brown noise under it all.
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// A minor, never resolving where you expect: i(add9) - VI(maj7) - III/5 - VII6sus - iv(add9) - VI - i/5 - V(sus4)
const CHORDS = [
    [45, 57, 60, 64, 71], [41, 53, 57, 64, 69], [43, 55, 60, 64, 67], [43, 55, 62, 67, 69],
    [38, 50, 57, 62, 65], [41, 53, 60, 65, 69], [40, 52, 57, 64, 69], [40, 52, 59, 64, 69],
];
const BAR = 8.75, TICK = 1.25;

export class Sound {
    constructor() {
        this.ctx = null; this.mode = 'off'; this.muted = false;
        this.level = 0; this.bright = 0; this.tickLevel = 0; this.arp = 0;
        this.rate = 1; this.thrust = 0;
        this.scoreEl = null;
        this.glassAudio = null;
    }

    playGlassBreak() {
        if (this.muted || this.mode === 'off') return;
        try {
            if (!this.glassAudio) {
                this.glassAudio = new Audio(new URL('../assets/audio/glass_broken.ogg', import.meta.url).href);
            }
            this.glassAudio.currentTime = 0;
            this.glassAudio.volume = 0.85;
            this.glassAudio.play().catch(() => {});
        } catch (e) {}
    }

    async scoreAvailable() {
        try {
            const r = await fetch(new URL('../audio/score.mp3', import.meta.url), { method: 'HEAD', cache: 'no-store' });
            return r.ok && !/text\/html/.test(r.headers.get('content-type') || '');
        } catch (e) { return false; }
    }

    start(mode) {
        this.mode = mode;
        if (mode === 'off') return;
        if (mode === 'score') {
            this.scoreEl = new Audio(new URL('../audio/score.mp3', import.meta.url).href);
            this.scoreEl.loop = true; this.scoreEl.volume = 0;
            this.scoreEl.preservesPitch = false;
            this.scoreEl.play().catch(() => {});
            return;
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = this.ctx = new AC();
        this.master = ctx.createGain(); this.master.gain.value = 0;
        this.comp = ctx.createDynamicsCompressor();
        this.comp.threshold.value = -16; this.comp.ratio.value = 3; this.comp.attack.value = 0.05; this.comp.release.value = 0.4;
        this.master.connect(this.comp).connect(ctx.destination);

        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this.impulse(7.5);
        this.wet = ctx.createGain(); this.wet.gain.value = 0.55;
        this.reverb.connect(this.wet).connect(this.master);

        this.organBus = ctx.createGain(); this.organBus.gain.value = 0;
        this.tone = ctx.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 900; this.tone.Q.value = 0.3;
        this.organBus.connect(this.tone);
        this.tone.connect(this.master); this.tone.connect(this.reverb);

        this.tickBus = ctx.createGain(); this.tickBus.gain.value = 0;
        this.tickBus.connect(this.master); this.tickBus.connect(this.reverb);
        this.morseBus = ctx.createGain(); this.morseBus.gain.value = 0.8;
        this.morseBus.connect(this.master); this.morseBus.connect(this.reverb);
        this.arpBus = ctx.createGain(); this.arpBus.gain.value = 0;
        this.arpBus.connect(this.tone);
        this.pitch = ctx.createConstantSource(); this.pitch.offset.value = 0; this.pitch.start();

        // pipe timbres: principal chorus and a flute-ish pedal
        const wave = (amps) => { const re = new Float32Array(amps.length + 1), im = new Float32Array(amps.length + 1); amps.forEach((a, i) => { im[i + 1] = a; }); return ctx.createPeriodicWave(re, im); };
        this.principal = wave([1, 0.62, 0.34, 0.3, 0.12, 0.16, 0.05, 0.09, 0.03, 0.04, 0, 0.02]);
        this.pedal = wave([1, 0.45, 0.12, 0.08, 0.02]);
        this.flute = wave([1, 0.18, 0.06, 0.02]);

        this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        // thrusters: looping brown noise through a lowpass that opens with the burn
        const bn = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), bd = bn.getChannelData(0);
        let last = 0;
        for (let i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
        const src = ctx.createBufferSource(); src.buffer = bn; src.loop = true;
        this.thrustLp = ctx.createBiquadFilter(); this.thrustLp.type = 'lowpass'; this.thrustLp.frequency.value = 120; this.thrustLp.Q.value = 0.7;
        this.thrustBus = ctx.createGain(); this.thrustBus.gain.value = 0;
        src.connect(this.thrustLp).connect(this.thrustBus).connect(this.master);
        this.thrustBus.connect(this.reverb);
        src.start();

        this.t0 = ctx.currentTime + 0.1;
        this.nextBar = this.t0; this.bar = 0;
        this.nextTick = this.t0; this.nextArp = this.t0;
        this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 1.5);
        this.timer = setInterval(() => this.schedule(), 80);
    }

    impulse(sec) {
        const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
        const buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                const t = i / ctx.sampleRate;
                // early reflections then a dark, long tail
                const er = t < 0.08 && Math.random() < 0.004 ? 0.8 : 0;
                d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * Math.exp(-t * 0.35) + er) * (0.6 + 0.4 * Math.exp(-t * 3));
            }
        }
        return buf;
    }

    pipe(freq, t, dur, wave, gain, out) {
        const ctx = this.ctx;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 1.8);
        g.gain.setValueAtTime(gain, t + dur - 0.2);
        g.gain.linearRampToValueAtTime(0, t + dur + 2.6);
        g.connect(out);
        const end = t + dur + 2.8;
        for (const det of [-3.5, 3.5]) {
            const o = ctx.createOscillator();
            o.setPeriodicWave(wave);
            o.frequency.value = freq;
            o.detune.value = det;
            // wind: a slow, tiny pitch breath
            const lfo = ctx.createOscillator(), lg = ctx.createGain();
            lfo.frequency.value = 0.15 + Math.random() * 0.2; lg.gain.value = 1.2;
            lfo.connect(lg).connect(o.detune);
            this.bend(o);
            o.connect(g);
            o.start(t); lfo.start(t); o.stop(end); lfo.stop(end);
        }
        // chiff: a breath of noise at the speech of the pipe
        const n = ctx.createBufferSource(); n.buffer = this.noise;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 3; bp.Q.value = 4;
        this.bend(bp, t + 0.45);
        const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(gain * 0.25, t + 0.06); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        n.connect(bp).connect(ng).connect(out); n.start(t); n.stop(t + 0.42);
    }

    // route the dilation pitch into an oscillator's or filter's detune for as long as it lives
    bend(node, until) {
        this.pitch.connect(node.detune);
        const off = () => { try { this.pitch.disconnect(node.detune); } catch (e) { /* already gone */ } };
        if (node.addEventListener && node.start) node.addEventListener('ended', off);
        else setTimeout(off, Math.max(0, (until - this.ctx.currentTime) * 1000) + 100);
    }

    tick(t, strength = 1, pitch = 1, bus = this.tickBus) {
        const ctx = this.ctx;
        const n = ctx.createBufferSource(); n.buffer = this.noise;
        const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200 * pitch; hp.Q.value = 2.5;
        this.bend(hp, t + 0.08);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * strength, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        n.connect(hp).connect(g).connect(bus); n.start(t); n.stop(t + 0.06);
        const o = ctx.createOscillator(); o.frequency.value = 1760 * pitch; o.type = 'sine';
        this.bend(o);
        const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.12 * strength, t + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(og).connect(bus); o.start(t); o.stop(t + 0.1);
    }

    schedule() {
        const ctx = this.ctx, ahead = ctx.currentTime + 0.35;
        while (this.nextBar < ahead) {
            const ch = CHORDS[this.bar % CHORDS.length];
            const t = this.nextBar;
            this.pipe(mtof(ch[0] - 12), t, BAR, this.pedal, 0.16, this.organBus);
            this.pipe(mtof(ch[0]), t, BAR, this.pedal, 0.1, this.organBus);
            for (let i = 1; i < ch.length; i++) this.pipe(mtof(ch[i]), t + i * 0.12, BAR - i * 0.12, this.principal, 0.055, this.organBus);
            // octave rank that only speaks when the scroll asks for brightness
            for (let i = 2; i < ch.length; i++) this.pipe(mtof(ch[i] + 12), t + 0.5, BAR - 0.5, this.flute, 0.03 * this.bright, this.organBus);
            this.chord = ch;
            this.bar++; this.nextBar += BAR;
        }
        while (this.nextTick < ahead) {
            if (this.tickLevel > 0.01) this.tick(this.nextTick, 1, 1);
            // Miller's clock: each tick waits longer the deeper we are
            this.nextTick += TICK / Math.max(0.12, this.rate);
        }
        // the tesseract's ostinato: chord tones, a quarter of a tick apart, rising and falling
        while (this.nextArp < ahead) {
            if (this.arp > 0.01 && this.chord) {
                const step = Math.round((this.nextArp - this.t0) / (TICK / 4));
                const pat = [1, 2, 3, 4, 3, 2, 4, 3];
                const m = this.chord[pat[step % pat.length]] + 12;
                const ctx2 = this.ctx, o = ctx2.createOscillator(), g = ctx2.createGain();
                o.setPeriodicWave(this.flute); o.frequency.value = mtof(m);
                this.bend(o);
                g.gain.setValueAtTime(0, this.nextArp); g.gain.linearRampToValueAtTime(0.05, this.nextArp + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, this.nextArp + 0.9);
                o.connect(g).connect(this.arpBus); o.start(this.nextArp); o.stop(this.nextArp + 1);
            }
            this.nextArp += TICK / 4;
        }
    }

    // called every frame with the piece's wishes; everything glides. rate is dtau/dt-ish (1 far out, toward 0 deep in)
    set({ level = 0, bright = 0, tick = 0, arp = 0, rate = 1, thrust = 0 }) {
        this.level = level; this.bright = bright; this.tickLevel = tick; this.arp = arp; this.rate = rate; this.thrust = thrust;
        const m = this.muted ? 0 : 1;
        // pitch follows the clock, gently: a fifth down at a third of normal time, never more than an octave
        const pf = Math.max(0.5, Math.pow(Math.max(0.05, rate), 0.35));
        if (this.scoreEl) {
            const v = Math.max(0, Math.min(1, level * m));
            this.scoreEl.volume += (v - this.scoreEl.volume) * 0.05;
            const pr = Math.round(pf * 100) / 100;
            if (Math.abs(this.scoreEl.playbackRate - pr) > 0.009) this.scoreEl.playbackRate = pr;
            return;
        }
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        this.organBus.gain.setTargetAtTime(level * m, now, 0.6);
        this.tone.frequency.setTargetAtTime(500 + bright * 2600, now, 0.8);
        this.tickBus.gain.setTargetAtTime(tick * m * 0.7, now, 0.15);
        this.arpBus.gain.setTargetAtTime(arp * m, now, 0.8);
        this.pitch.offset.setTargetAtTime(1200 * Math.log2(pf), now, 0.4);
        this.thrustBus.gain.setTargetAtTime(thrust * m * 0.55, now, thrust > 0.05 ? 0.06 : 0.35);
        this.thrustLp.frequency.setTargetAtTime(110 + thrust * 520, now, 0.12);
    }

    // a single tick right now: the watch's Morse
    morseTick() {
        if (!this.ctx || this.muted) return;
        this.tick(this.ctx.currentTime + 0.005, 1.1, 0.8, this.morseBus);
    }

    setMuted(v) {
        this.muted = v;
        if (this.ctx) this.master.gain.setTargetAtTime(v ? 0 : 0.9, this.ctx.currentTime, 0.3);
        if (this.scoreEl) this.scoreEl.muted = v;
    }

    pause(hidden) {
        if (this.ctx) (hidden ? this.ctx.suspend() : this.ctx.resume()).catch(() => {});
        if (this.scoreEl) hidden ? this.scoreEl.pause() : this.scoreEl.play().catch(() => {});
    }
}
