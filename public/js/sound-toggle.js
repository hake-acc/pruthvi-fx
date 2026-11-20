// Site-wide sound: the visitor's choice, the entry gate that asks for it (and is the gesture that unlocks audio), and
// the on/off toggle. Engine-agnostic: pages pass callbacks, so any page with a soundtrack can adopt it.
//   SiteSound.pref()                 -> 'on' | 'off' | null (the choice made in this browsing session)
//   SiteSound.setPref(v)
//   SiteSound.gate(opts)             -> Promise<boolean> sound wanted; opts { kicker, title, body, onChoose(sound) }
//                                       onChoose runs synchronously inside the click, where audio may be unlocked
//   SiteSound.toggle(opts)           -> { el, set(muted), get muted() }; opts { muted, onChange(muted), clock() (seconds
//                                       of music time at a performance.now() timestamp), beat (seconds), onset() (0..1
//                                       per frame, optional), onsetDelay() (seconds from analysis to audible), mount
//                                       (element, default body), hotkey ('m') }
window.SiteSound = (() => {
    'use strict';

    const KEY = 'ap.sound';
    const SESSION_MS = 12 * 3600e3;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function pref() {
        try {
            const o = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (o && (o.v === 'on' || o.v === 'off') && Date.now() - o.t < SESSION_MS) return o.v;
        } catch (e) { /* storage blocked */ }
        return null;
    }
    function setPref(v) {
        try { localStorage.setItem(KEY, JSON.stringify({ v, t: Date.now() })); } catch (e) { /* storage blocked */ }
    }

    // ------------------------------------------------------------ gate
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const SPEAKER = '<rect x="0" y="3" width="2" height="4" /><rect x="2" y="2" width="1" height="6" /><rect x="3" y="1" width="1" height="8" />';
    const ICO_ON = `<svg viewBox="0 0 10 10" aria-hidden="true"><g fill="currentColor">${SPEAKER}<rect class="ss-w1" x="5" y="4" width="1" height="2" /><rect class="ss-w2" x="7" y="2" width="1" height="6" /><rect class="ss-w3" x="9" y="0" width="1" height="10" /></g></svg>`;
    const ICO_OFF = `<svg viewBox="0 0 10 10" aria-hidden="true"><g fill="currentColor">${SPEAKER}<rect x="6" y="3" width="1" height="1" /><rect x="9" y="3" width="1" height="1" /><rect x="7" y="4" width="2" height="2" /><rect x="6" y="6" width="1" height="1" /><rect x="9" y="6" width="1" height="1" /></g></svg>`;

    function gate(opts = {}) {
        return new Promise((resolve) => {
            const el = document.createElement('div');
            el.className = 'ss-gate';
            el.setAttribute('role', 'dialog');
            el.setAttribute('aria-modal', 'true');
            el.setAttribute('aria-labelledby', 'ssGateTitle');
            el.innerHTML = `
                <div class="ss-gate__scrim"></div>
                <div class="ss-gate__flash" aria-hidden="true"></div>
                <div class="ss-gate__card">
                    <p class="ss-gate__kicker"><i aria-hidden="true"></i>${esc(opts.kicker || 'Soundtrack · 137 BPM')}</p>
                    <h2 class="ss-gate__title" id="ssGateTitle">${esc(opts.title || 'Sound on?')}</h2>
                    ${opts.body ? `<p class="ss-gate__body">${esc(opts.body)}</p>` : ''}
                    <div class="ss-gate__actions">
                        <button class="ss-gate__btn ss-gate__btn--on" type="button" data-sound="1">
                            <span class="ss-gate__ico">${ICO_ON}</span><span class="ss-gate__t">With sound</span><kbd>Enter</kbd>
                        </button>
                        <button class="ss-gate__btn ss-gate__btn--off" type="button" data-sound="0">
                            <span class="ss-gate__ico">${ICO_OFF}</span><span class="ss-gate__t">Without sound</span><kbd>Esc</kbd>
                        </button>
                    </div>
                </div>`;
            document.body.appendChild(el);
            const prevFocus = document.activeElement;
            const buttons = [...el.querySelectorAll('button')];
            requestAnimationFrame(() => {
                el.classList.add('is-in');
                buttons[0].focus({ preventScroll: true });
            });

            let done = false;
            function choose(sound) {
                if (done) return;
                done = true;
                setPref(sound ? 'on' : 'off');
                if (opts.onChoose) opts.onChoose(sound);
                document.removeEventListener('keydown', onKey, true);
                el.classList.remove('is-in');
                el.classList.add('is-out');
                el.setAttribute('aria-hidden', 'true');
                setTimeout(() => el.remove(), reduceMotion.matches ? 0 : 900);
                if (prevFocus && prevFocus.focus && prevFocus !== document.body) prevFocus.focus({ preventScroll: true });
                resolve(sound);
            }
            function onKey(e) {
                if (e.key === 'Escape') { e.preventDefault(); choose(false); }
                else if (e.key === 'Tab') {
                    // focus stays on the two choices while the dialog is up
                    e.preventDefault();
                    const i = buttons.indexOf(document.activeElement);
                    buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
                }
            }
            document.addEventListener('keydown', onKey, true);
            for (const b of buttons) b.addEventListener('click', () => choose(b.dataset.sound === '1'));
        });
    }

    // ------------------------------------------------------------ toggle
    // A 2x2 slot of meetings that books itself round the bar: one block per beat, clockwise, read off the music clock
    // so each lands on its beat. Muting cancels the slot back to four empty blocks.
    const ORDER = [0, 1, 3, 2];
    function toggle(opts = {}) {
        let muted = !!opts.muted;
        const beat = opts.beat || 0.5;
        const clock = opts.clock || ((now) => now / 1000);
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'ss-toggle' + (opts.mount ? '' : ' ss-toggle--fixed');
        el.innerHTML = `<span class="ss-toggle__beat" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span class="ss-toggle__label" aria-hidden="true"><span class="ss-toggle__roll"><span>On</span><span>Off</span></span></span>`;
        (opts.mount || document.body).appendChild(el);
        const cells = [...el.querySelectorAll('.ss-toggle__beat i')];
        let raf = 0;

        function sync() {
            el.classList.toggle('is-muted', muted);
            el.setAttribute('aria-pressed', String(!muted));
            el.setAttribute('aria-label', muted ? 'Sound off. Turn sound on' : 'Sound on. Mute');
            el.title = muted ? 'Sound off (M)' : 'Sound on (M)';
        }

        function rest() {
            for (const c of cells) { c.style.transform = ''; c.style.opacity = ''; c.classList.remove('is-down'); }
        }
        // onsets between beats (busy vocals, fills) book an extra block, so the slot runs faster when the track does.
        // The analyser hears a sample before the speakers do: each onset waits out that lead before it books.
        let extra = 0, kickAt = -1e9, lastTs = 0, dt = 1000 / 60;
        const due = [];
        function frame(ts) {
            raf = 0;
            if (muted || document.hidden) { lastTs = 0; due.length = 0; return; }
            if (lastTs) dt += (Math.min(34, Math.max(6, ts - lastTs)) - dt) * 0.05;
            lastTs = ts;
            // sampled half a frame ahead, the same instant the calendar renders for, so both step on the same vsync
            const now = ts + dt / 2;
            const b = clock(now) / beat, nb = Math.floor(b), ph = b - nb;
            const o = opts.onset ? opts.onset() : 0;
            if (o > 0) due.push(performance.now() + (opts.onsetDelay ? opts.onsetDelay() : 0) * 1000);
            while (due.length && due[0] <= now) {
                const at = due.shift(), pa = (b - (now - at) / 1000 / beat) % 1;
                if (pa > 0.16 && pa < 0.84) { extra++; kickAt = at; }
            }
            const n = nb + extra, at = ORDER[((n % 4) + 4) % 4], prev = ORDER[(((n - 1) % 4) + 4) % 4];
            const hit = Math.max(Math.exp(-ph * 7), Math.exp(-(now - kickAt) * 0.009));
            for (let i = 0; i < 4; i++) {
                const c = cells[i];
                if (i === at) {
                    c.style.transform = `scale(${(0.86 + 0.34 * hit).toFixed(3)})`;
                    c.style.opacity = '1';
                } else {
                    c.style.transform = 'scale(0.8)';
                    c.style.opacity = i === prev ? (0.3 + 0.4 * hit).toFixed(3) : '0.3';
                }
                c.classList.toggle('is-down', i === at && ((nb % 4) + 4) % 4 === 0);
            }
            raf = requestAnimationFrame(frame);
        }
        function wake() {
            if (muted || reduceMotion.matches) { cancelAnimationFrame(raf); raf = 0; rest(); return; }
            if (!raf) raf = requestAnimationFrame(frame);
        }

        function set(m, silent) {
            m = !!m;
            if (m === muted) return;
            muted = m;
            sync();
            wake();
            if (!silent && opts.onChange) opts.onChange(muted);
        }

        el.addEventListener('click', () => set(!muted));
        if (opts.hotkey !== null) {
            const hk = (opts.hotkey || 'm').toLowerCase();
            window.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() !== hk || e.metaKey || e.ctrlKey || e.altKey) return;
                const t = e.target;
                if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
                if (document.querySelector('.ss-gate')) return;
                set(!muted);
            });
        }
        document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
        reduceMotion.addEventListener?.('change', wake);
        sync();
        wake();
        requestAnimationFrame(() => el.classList.add('is-in'));
        return { el, set: (m) => set(m, true), get muted() { return muted; } };
    }

    return { pref, setPref, gate, toggle };
})();
