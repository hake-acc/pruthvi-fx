// Everything you hear is synthesised here. Wind is filtered noise opened up by airspeed; the cloak is a band of
// noise pulsed at its flap rate; the Snitch is two detuned saws through a tremolo at wingbeat, panned and attenuated
// by where it is relative to the lens; the crowd is shaped noise that swells near the pitch and roars on a catch.
// The celesta is FM (inharmonic 3.5:1 modulator) playing an original D-minor waltz with a raised fourth.
const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
const NOTE = { 'A4': 69, 'Bb4': 70, 'C#5': 73, 'D5': 74, 'E5': 76, 'F5': 77, 'G5': 79, 'G#5': 80, 'A5': 81, 'Bb5': 82, 'C#6': 85, 'D6': 86, 'E6': 88, 'F6': 89, 'A6': 93, 'D7': 98 };
// [beat, note, length] in 3/4 at 80 bpm
const THEME = [
    [0, 'D5', 2], [2, 'F5', 1], [3, 'A5', 1], [4, 'G#5', 1], [5, 'A5', 1], [6, 'E5', 2], [8, 'D5', 1],
    [9, 'C#5', 1], [10, 'E5', 1], [11, 'A4', 1], [12, 'Bb4', 1], [13, 'D5', 1], [14, 'G5', 1],
    [15, 'F5', 1.5], [16.5, 'E5', 0.5], [17, 'D5', 1], [18, 'C#5', 1], [19, 'D5', 1], [20, 'E5', 1], [21, 'D5', 3],
];
const CHORDS = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]; // Dm Bb Gm A

export class Sound {
    constructor() { this.ctx = null; this.muted = false; this.on = false; }

    start(enabled) {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = this.ctx = new AC();
        this.on = true;
        const master = this.master = ctx.createGain();
        master.gain.value = 0;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
        master.connect(comp).connect(ctx.destination);
        master.gain.setTargetAtTime(enabled ? 0.9 : 0, ctx.currentTime, 1.2);
        if (!enabled) this.muted = true;

        const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const d = noise.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < d.length; i++) {
            const w = Math.random() * 2 - 1;
            b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
            d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
        }
        const src = (rate = 1) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = rate; s.start(ctx.currentTime + Math.random()); return s; };

        // reverb: a synthetic hall
        const ir = ctx.createBuffer(2, ctx.sampleRate * 3.6, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = ir.getChannelData(c);
            for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3.2);
        }
        this.verb = ctx.createConvolver(); this.verb.buffer = ir;
        const verbOut = ctx.createGain(); verbOut.gain.value = 0.55;
        this.verb.connect(verbOut).connect(master);

        // wind
        this.windBP = ctx.createBiquadFilter(); this.windBP.type = 'bandpass'; this.windBP.Q.value = 0.6; this.windBP.frequency.value = 400;
        this.windG = ctx.createGain(); this.windG.gain.value = 0;
        src(1).connect(this.windBP).connect(this.windG).connect(master);
        this.whistleBP = ctx.createBiquadFilter(); this.whistleBP.type = 'bandpass'; this.whistleBP.Q.value = 6; this.whistleBP.frequency.value = 1800;
        this.whistleG = ctx.createGain(); this.whistleG.gain.value = 0;
        src(1.3).connect(this.whistleBP).connect(this.whistleG).connect(master);

        // cloak
        this.flapBP = ctx.createBiquadFilter(); this.flapBP.type = 'bandpass'; this.flapBP.Q.value = 1.4; this.flapBP.frequency.value = 170;
        this.flapG = ctx.createGain(); this.flapG.gain.value = 0;
        src(0.7).connect(this.flapBP).connect(this.flapG).connect(master);

        // Snitch
        this.buzzPan = ctx.createStereoPanner();
        this.buzzG = ctx.createGain(); this.buzzG.gain.value = 0;
        const trem = ctx.createGain(); trem.gain.value = 0.5;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 26; const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
        lfo.connect(lfoG).connect(trem.gain); lfo.start();
        const bbp = ctx.createBiquadFilter(); bbp.type = 'bandpass'; bbp.frequency.value = 1100; bbp.Q.value = 1.6;
        this.buzzOsc = [];
        for (const f of [208, 211.5, 416]) {
            const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
            const g = ctx.createGain(); g.gain.value = f > 400 ? 0.25 : 0.5;
            o.connect(g).connect(bbp); o.start(); this.buzzOsc.push([o, f]);
        }
        bbp.connect(trem).connect(this.buzzG).connect(this.buzzPan).connect(master);
        const buzzSend = ctx.createGain(); buzzSend.gain.value = 0.15; this.buzzG.connect(buzzSend).connect(this.verb);

        // crowd
        this.crowdG = ctx.createGain(); this.crowdG.gain.value = 0;
        const c1 = ctx.createBiquadFilter(); c1.type = 'bandpass'; c1.frequency.value = 650; c1.Q.value = 0.7;
        const c2 = ctx.createBiquadFilter(); c2.type = 'bandpass'; c2.frequency.value = 1500; c2.Q.value = 2.5;
        const cLfo = ctx.createOscillator(); cLfo.frequency.value = 0.21; const cLfoG = ctx.createGain(); cLfoG.gain.value = 260;
        cLfo.connect(cLfoG).connect(c2.frequency); cLfo.start();
        const cMix = ctx.createGain(); cMix.gain.value = 1;
        src(0.9).connect(c1).connect(cMix); src(1.1).connect(c2).connect(cMix);
        cMix.connect(this.crowdG).connect(master);
        const crowdSend = ctx.createGain(); crowdSend.gain.value = 0.4; this.crowdG.connect(crowdSend).connect(this.verb);
        this.roarG = ctx.createGain(); this.roarG.gain.value = 0;
        cMix.connect(this.roarG).connect(master);
        this.roarG.connect(crowdSend);

        // music bus
        this.music = ctx.createGain(); this.music.gain.value = 0.5;
        this.music.connect(master);
        const mSend = ctx.createGain(); mSend.gain.value = 0.9; this.music.connect(mSend).connect(this.verb);
        this.padG = ctx.createGain(); this.padG.gain.value = 0.0;
        const padLP = ctx.createBiquadFilter(); padLP.type = 'lowpass'; padLP.frequency.value = 820; padLP.Q.value = 0.4;
        this.padG.connect(padLP).connect(this.music);
        this.padVoices = [];
        for (let i = 0; i < 4; i++) {
            const g = ctx.createGain(); g.gain.value = 0.05; g.connect(this.padG);
            const os = [-6, 6].map((det) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.connect(g); o.start(); return o; });
            this.padVoices.push(os);
        }
        this.padG.gain.setTargetAtTime(0.32, ctx.currentTime + 1, 4);

        this.beat = 60 / 80;
        this.nextPhrase = ctx.currentTime + 2.5;
        this.chordAt = ctx.currentTime;
        this.chordIdx = -1;
        this.sparkAt = ctx.currentTime + 6;
        this.timer = setInterval(() => this.schedule(), 120);
    }

    bell(t, midi, vel = 0.5, len = 2.4) {
        const ctx = this.ctx, f = MIDI(midi);
        const car = ctx.createOscillator(); car.frequency.value = f;
        const mod = ctx.createOscillator(); mod.frequency.value = f * 3.5;
        const mg = ctx.createGain();
        mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.5);
        mod.connect(mg).connect(car.frequency);
        const oct = ctx.createOscillator(); oct.frequency.value = f * 2;
        const og = ctx.createGain(); og.gain.setValueAtTime(vel * 0.25, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        car.connect(g); oct.connect(og).connect(g);
        g.connect(this.music);
        [car, mod, oct].forEach((o) => { o.start(t); o.stop(t + len + 0.1); });
    }

    schedule() {
        const ctx = this.ctx; if (!ctx || ctx.state !== 'running') return;
        const now = ctx.currentTime, ahead = now + 0.4;
        // the phrase, then a long breath; sometimes an octave up
        if (this.nextPhrase < ahead) {
            const t0 = this.nextPhrase, up = Math.random() < 0.3 ? 12 : 0;
            for (const [b, n, l] of THEME) this.bell(t0 + b * this.beat, NOTE[n] + up, 0.42 + Math.random() * 0.12, 1.4 + l * this.beat * 1.2);
            this.nextPhrase = t0 + 24 * this.beat + (12 + Math.random() * 12) * this.beat;
        }
        if (this.sparkAt < ahead) {
            const pool = [86, 89, 93, 88, 98, 81];
            const n = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < n; i++) this.bell(this.sparkAt + i * this.beat * 0.5, pool[Math.floor(Math.random() * pool.length)], 0.14, 2.2);
            this.sparkAt += (5 + Math.random() * 7) * this.beat;
        }
        if (now - this.chordAt > 0 || this.chordIdx < 0) {
            this.chordIdx = (this.chordIdx + 1) % CHORDS.length;
            CHORDS[this.chordIdx].forEach((m, i) => this.padVoices[i].forEach((o) => o.frequency.setTargetAtTime(MIDI(m), now, 1.6)));
            this.chordAt = now + 6 * this.beat * 2;
        }
    }

    // per-frame: speed 0..1+, boost 0..1, snitch distance and pan, crowd proximity
    update(s) {
        const ctx = this.ctx; if (!ctx) return;
        const t = ctx.currentTime;
        const sp = s.speed01;
        this.windG.gain.setTargetAtTime(0.05 + sp * sp * 0.55 + s.mist * 0.1, t, 0.15);
        this.windBP.frequency.setTargetAtTime(280 + sp * 900 + s.turn * 300, t, 0.2);
        this.whistleG.gain.setTargetAtTime(s.boost * 0.06 * sp, t, 0.2);
        this.whistleBP.frequency.setTargetAtTime(1500 + sp * 1600, t, 0.3);
        const rate = 3 + sp * 7;
        const flap = Math.pow(Math.max(0, Math.sin(s.time * rate * Math.PI * 2)), 3);
        this.flapG.gain.setTargetAtTime((0.04 + sp * 0.2) * (0.3 + flap * 0.7), t, 0.015);
        const near = 1 / (1 + Math.pow(s.snitchDist / 9, 1.6));
        this.buzzG.gain.setTargetAtTime(near * 0.5, t, 0.05);
        this.buzzPan.pan.setTargetAtTime(Math.max(-1, Math.min(1, s.snitchPan)), t, 0.05);
        this.buzzOsc.forEach(([o, f]) => o.frequency.setTargetAtTime(f * (1 + s.snitchDoppler * 0.04), t, 0.05));
        this.crowdG.gain.setTargetAtTime(0.03 + 0.22 / (1 + s.pitchDist / 160), t, 0.5);
    }

    catch() {
        const ctx = this.ctx; if (!ctx) return;
        const t = ctx.currentTime;
        [74, 77, 81, 86, 89, 93, 98].forEach((m, i) => this.bell(t + 0.02 + i * 0.055, m, 0.5 - i * 0.03, 2.6));
        this.bell(t + 0.5, 62, 0.4, 3.5); this.bell(t + 0.5, 69, 0.3, 3.5);
        this.roarG.gain.cancelScheduledValues(t);
        this.roarG.gain.setValueAtTime(this.roarG.gain.value, t);
        this.roarG.gain.linearRampToValueAtTime(0.9, t + 0.35);
        this.roarG.gain.setTargetAtTime(0, t + 0.9, 1.4);
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.6);
        g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(g).connect(this.master); o.start(t); o.stop(t + 1);
    }

    hoop() {
        const ctx = this.ctx; if (!ctx) return;
        const t = ctx.currentTime;
        this.bell(t, 81, 0.35, 1.8); this.bell(t + 0.09, 88, 0.3, 2.0);
    }

    setMuted(m) {
        this.muted = m;
        if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.25);
    }

    pause(p) {
        if (!this.ctx) return;
        if (p) this.ctx.suspend(); else this.ctx.resume();
    }
}
