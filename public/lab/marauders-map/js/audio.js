// Paper and quill, synthesised. Nothing is sampled.
export function createAudio() {
    let ctx = null, master = null, noise = null, quillGain = null, quillSrc = null, muted = localStorage.getItem('mm-muted') === '1';
    const listeners = new Set();

    function ensure() {
        if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
        const len = ctx.sampleRate * 2;
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noise.getChannelData(0);
        let b = 0;
        for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.7 + b * 1.6; }

        quillSrc = ctx.createBufferSource(); quillSrc.buffer = noise; quillSrc.loop = true;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 0.9;
        quillGain = ctx.createGain(); quillGain.gain.value = 0;
        quillSrc.connect(hp); hp.connect(bp); bp.connect(quillGain); quillGain.connect(master);
        quillSrc.start();
        return true;
    }

    // continuous quill scratch: intensity 0..1, called every frame
    let qLevel = 0;
    function quill(intensity) {
        if (!ctx || !quillGain) return;
        const target = Math.max(0, Math.min(1, intensity));
        qLevel += (target - qLevel) * 0.2;
        const flutter = 0.35 + Math.random() * 0.65 * (Math.random() < 0.18 ? 1.6 : 1);
        quillGain.gain.setTargetAtTime(qLevel * 0.16 * flutter, ctx.currentTime, 0.012);
    }

    function burst(t, dur, freq, q, gain, type = 'bandpass') {
        const src = ctx.createBufferSource(); src.buffer = noise;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(f); f.connect(g); g.connect(master);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + Math.min(0.006, dur * 0.2));
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
    }

    // crackly paper movement
    function rustle(duration = 1.2, intensity = 1) {
        if (!ensure()) return;
        const t0 = ctx.currentTime;
        const n = Math.round(duration * 46 * intensity);
        for (let i = 0; i < n; i++) {
            const u = Math.random(), t = t0 + u * duration;
            const env = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7;
            burst(t, 0.012 + Math.random() * 0.05, 900 + Math.random() * 3200, 0.7 + Math.random() * 1.6, (0.05 + Math.random() * 0.16) * env * intensity);
        }
        burst(t0, duration * 0.9, 380, 0.6, 0.07 * intensity, 'lowpass');
    }

    function scratch(strength = 1) {
        if (!ensure()) return;
        const t = ctx.currentTime;
        burst(t, 0.05 + Math.random() * 0.05, 4200 + Math.random() * 2400, 1.4, 0.07 * strength);
        if (Math.random() < 0.6) burst(t + 0.03, 0.03, 6800, 2, 0.04 * strength);
    }

    function hiss(duration = 2) {
        if (!ensure()) return;
        const t = ctx.currentTime;
        const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(600, t + duration); f.Q.value = 0.5;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
        src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + duration + 0.05);
    }

    function setMuted(m) {
        muted = m; localStorage.setItem('mm-muted', m ? '1' : '0');
        if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
        listeners.forEach((fn) => fn(m));
    }

    return { ensure, quill, rustle, scratch, hiss, setMuted, get muted() { return muted; }, onChange: (fn) => listeners.add(fn) };
}
