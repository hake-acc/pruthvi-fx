// Looping soundtrack + master clock for the calendar page. Kept apart from the renderer so the site's sound gate and
// toggle (sound-toggle.js) drive it without touching the animation.
//   CalendarAudio.init(url, loopSeconds, pad) -> Promise (resolves once decoded); the file holds the loop with `pad`
//                             seconds of circular padding on both sides, so loop points sit inside identical audio
//                             whatever priming the MP3 decoder keeps. Nothing plays until start().
//   CalendarAudio.start({ muted, at }) -> call from a user gesture: unlocks the context and starts the loop (silent if
//                             muted, so the clock still runs and unmuting later is instant). at(perfTime) -> loop
//                             seconds: join the loop at the position the visuals will show when the sound is heard
//   CalendarAudio.resume()    -> Promise<boolean>: tries to start without a gesture (a returning visitor whose browser
//                             already allows audio here); false when the browser holds it back
//   CalendarAudio.time()      -> seconds since the loop started (audio-hardware clock), or null while silent
//   CalendarAudio.timeAt(t)   -> the same, at performance.now()-based timestamp t
//   CalendarAudio.onStart(fn) -> fn() whenever playback (re)starts, so visuals can restart in sync
//   CalendarAudio.setMuted(b) -> fades over FADE seconds; levels(out) fills out (0..1) with live band levels
//   CalendarAudio.onset()     -> 0, or 0..1 strength when a vocal/rhythm onset landed since the last call (poll per frame)
window.CalendarAudio = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const FADE = 0.45;
    let ctx = null, gain = null, analyser = null, spectrum = null, buffer = null, source = null;
    let vox = null, voxCur = null, voxPrev = null, fluxAvg = 0, lastOnset = 0;
    let startAt = 0, loop = 0, pad = 0, muted = false, wanted = false, ready = null, joinAt = null;
    const starters = new Set();

    function play() {
        if (!wanted || !buffer || source || ctx.state !== 'running') return;
        // Scheduled slightly ahead so the loop's first sample and the visual clock's zero coincide; a late join enters
        // the loop where the visuals already are, so nothing restarts
        const when = ctx.currentTime + 0.05;
        const lat = ctx.outputLatency || ctx.baseLatency || 0;
        const at = joinAt ? ((joinAt(performance.now() + (0.05 + lat) * 1000) % loop) + loop) % loop : 0;
        joinAt = null;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = pad;
        source.loopEnd = pad + loop;
        source.connect(gain);
        startAt = when - at;
        gain.gain.cancelScheduledValues(0);
        gain.gain.setValueAtTime(0, when);
        if (!muted) gain.gain.linearRampToValueAtTime(1, when + (at ? FADE : 0.02));
        source.start(when, pad + at);
        starters.forEach((fn) => fn());
    }

    function make() {
        if (ctx || !AC) return;
        // At the file's own rate the decoded buffer is not resampled, so the loop points land on exact samples
        try { ctx = new AC({ latencyHint: 'interactive', sampleRate: 44100 }); } catch (e) { ctx = new AC({ latencyHint: 'interactive' }); }
        gain = ctx.createGain();
        gain.gain.value = 0;
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        spectrum = new Uint8Array(analyser.frequencyBinCount);
        // unsmoothed, so frame-to-frame differences are real onsets rather than the display smoothing
        vox = ctx.createAnalyser();
        vox.fftSize = 1024;
        vox.smoothingTimeConstant = 0;
        voxCur = new Uint8Array(vox.frequencyBinCount);
        voxPrev = new Uint8Array(vox.frequencyBinCount);
        gain.connect(analyser);
        analyser.connect(vox);
        vox.connect(ctx.destination);
        ctx.addEventListener('statechange', play);
    }

    function init(url, loopSeconds, padSeconds = 0) {
        if (!AC) return Promise.resolve();
        make();
        pad = padSeconds;
        ready = (async () => {
            const data = await (await fetch(url)).arrayBuffer();
            buffer = await new Promise((res, rej) => ctx.decodeAudioData(data, res, rej));
            loop = Math.min(loopSeconds, buffer.duration - 2 * pad);
            play();
        })();
        return ready;
    }

    function start(opts = {}) {
        if (!ctx) return;
        muted = !!opts.muted;
        wanted = true;
        joinAt = opts.at || null;
        const p = ctx.resume();
        if (p && p.then) p.then(play, () => {});
        else play();
    }

    async function resume(opts = {}) {
        if (!ctx) return false;
        muted = !!opts.muted;
        wanted = true;
        try { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 350))]); } catch (e) { /* blocked */ }
        if (ctx.state !== 'running') { wanted = false; return false; }
        play();
        return true;
    }

    // log-spaced bands over the analyser's bins, skipping DC
    function levels(out) {
        if (!source || !analyser) { out.fill(0); return out; }
        analyser.getByteFrequencyData(spectrum);
        const n = out.length, bins = spectrum.length;
        for (let i = 0; i < n; i++) {
            const a = Math.max(1, Math.floor(Math.pow(bins * 0.7, i / n))), b = Math.max(a + 1, Math.floor(Math.pow(bins * 0.7, (i + 1) / n)));
            let s = 0;
            for (let k = a; k < b; k++) s += spectrum[k];
            out[i] = s / ((b - a) * 255);
        }
        return out;
    }

    // positive spectral flux over the vocal band (300 Hz - 3.4 kHz) against an adaptive mean
    function onset() {
        if (!source || !vox || muted) return 0;
        vox.getByteFrequencyData(voxCur);
        const hz = ctx.sampleRate / vox.fftSize, lo = Math.round(300 / hz), hi = Math.round(3400 / hz);
        let f = 0;
        for (let k = lo; k < hi; k++) {
            const d = voxCur[k] - voxPrev[k];
            if (d > 0) f += d;
            voxPrev[k] = voxCur[k];
        }
        f /= (hi - lo) * 255;
        const thr = fluxAvg * 1.7 + 0.01, t = ctx.currentTime;
        fluxAvg += (f - fluxAvg) * 0.06;
        if (f <= thr || t - lastOnset < 0.11) return 0;
        lastOnset = t;
        return Math.min(1, (f - thr) / (thr + 0.001));
    }

    return {
        init, start, resume, levels, onset,
        // an onset reported now reaches the speakers after the output latency, less the half analysis window it lags by
        onsetDelay: () => (ctx ? Math.max(0, (ctx.outputLatency || ctx.baseLatency || 0) - (vox ? vox.fftSize / 2 / ctx.sampleRate : 0)) : 0),
        available: () => !!AC,
        time: () => (source ? ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) - startAt : null),
        // Audible position at a performance.now() timestamp (e.g. a rAF time). currentTime advances in audio-callback
        // chunks; the output timestamp pairs it with the performance clock so frame-to-frame steps stay even.
        timeAt(now) {
            if (!source) return null;
            const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
            if (ts && ts.performanceTime > 0 && ts.contextTime > 0) return ts.contextTime + (now - ts.performanceTime) / 1000 - startAt;
            return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) - startAt;
        },
        loopLength: () => loop,
        isRunning: () => !!source,
        isMuted: () => muted,
        onStart: (fn) => { starters.add(fn); },
        setMuted(b) {
            muted = !!b;
            if (!gain) return;
            const t = ctx.currentTime, g = gain.gain;
            // hold the current value first so the ramp starts where the sound is, never with a step
            if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
            else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
            g.linearRampToValueAtTime(muted ? 0 : 1, t + FADE);
        },
    };
})();
