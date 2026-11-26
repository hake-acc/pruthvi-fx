const STORAGE_KEY = 'pruthvifx-sound';

export type SoundProfile = 'studio' | 'soft' | 'crisp';

export interface LiveSoundSettings {
  enabled: boolean;
  volume: number;
  profile: SoundProfile;
}

function parseEnabled(val: string | null): boolean | null {
  if (!val) return null;
  const norm = val.trim().toLowerCase();
  return norm !== 'off' && norm !== 'false' && norm !== '0';
}

const listeners = new Set<(enabled: boolean) => void>();

let userOverride: boolean | null = null;
let liveConfig: LiveSoundSettings = {
  enabled: true,
  volume: 0.75,
  profile: 'studio',
};

function readInitial(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const parsed = parseEnabled(localStorage.getItem(STORAGE_KEY));
    userOverride = parsed;
    return parsed ?? liveConfig.enabled;
  } catch {
    return liveConfig.enabled;
  }
}

let soundEnabled = readInitial();
let audioCtx: AudioContext | null = null;
let lastHoverTs = 0;

export function getSoundEnabled(): boolean {
  return soundEnabled;
}

export function subscribeSound(cb: (enabled: boolean) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function applyLiveSoundSettings(next: LiveSoundSettings) {
  const prevEnabled = liveConfig.enabled;
  liveConfig = {
    enabled: Boolean(next.enabled),
    volume: Math.max(0, Math.min(1, Number.isFinite(next.volume) ? next.volume : 0.75)),
    profile:
      next.profile === 'soft' || next.profile === 'crisp' ? next.profile : 'studio',
  };

  // If the admin explicitly toggles global sound or the user hasn't locally overridden, sync immediately
  if (userOverride === null || prevEnabled !== liveConfig.enabled) {
    soundEnabled = liveConfig.enabled;
    for (const cb of listeners) cb(soundEnabled);
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

interface ToneOpts {
  type: OscillatorType;
  startFreq: number;
  endFreq: number;
  delay?: number;
  duration: number;
  peakGain: number;
  filterFreq?: number;
}

function getProfileTuning() {
  if (liveConfig.profile === 'soft') {
    return { pitchScale: 0.82, gainScale: 0.72, filterScale: 0.75 };
  }
  if (liveConfig.profile === 'crisp') {
    return { pitchScale: 1.22, gainScale: 1.05, filterScale: 1.3 };
  }
  return { pitchScale: 1, gainScale: 1, filterScale: 1 };
}

function playTone(ctx: AudioContext, opts: ToneOpts) {
  const tuning = getProfileTuning();
  const vol = liveConfig.volume * tuning.gainScale;
  if (vol <= 0.005) return;

  const start = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.startFreq * tuning.pitchScale, start);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, opts.endFreq * tuning.pitchScale),
    start + opts.duration
  );

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime((opts.filterFreq ?? 1800) * tuning.filterScale, start);
  filter.Q.setValueAtTime(0.8, start);

  const scaledPeak = Math.max(0.0002, opts.peakGain * vol);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(scaledPeak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + opts.duration + 0.015);
}

export function playClickSound(force = false) {
  if (!soundEnabled && !force) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  playTone(ctx, {
    type: 'triangle',
    startFreq: 480,
    endFreq: 720,
    duration: 0.055,
    peakGain: 0.075,
    filterFreq: 1700,
  });
  playTone(ctx, {
    type: 'sine',
    startFreq: 920,
    endFreq: 680,
    delay: 0.008,
    duration: 0.045,
    peakGain: 0.035,
    filterFreq: 2200,
  });
}

export function playOpenSound(force = false) {
  if (!soundEnabled && !force) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  playTone(ctx, {
    type: 'triangle',
    startFreq: 340,
    endFreq: 523.25,
    duration: 0.11,
    peakGain: 0.085,
    filterFreq: 1650,
  });
  playTone(ctx, {
    type: 'sine',
    startFreq: 587.33,
    endFreq: 783.99,
    delay: 0.048,
    duration: 0.16,
    peakGain: 0.065,
    filterFreq: 2400,
  });
}

export function playCloseSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  playTone(ctx, {
    type: 'sine',
    startFreq: 659.25,
    endFreq: 440,
    duration: 0.11,
    peakGain: 0.065,
    filterFreq: 1900,
  });
  playTone(ctx, {
    type: 'triangle',
    startFreq: 392,
    endFreq: 261.63,
    delay: 0.035,
    duration: 0.12,
    peakGain: 0.05,
    filterFreq: 1400,
  });
}

function playHoverSound() {
  if (!soundEnabled || !audioCtx || audioCtx.state !== 'running') return;
  const now = performance.now();
  if (now - lastHoverTs < 75) return;
  lastHoverTs = now;
  playTone(audioCtx, {
    type: 'sine',
    startFreq: 760,
    endFreq: 960,
    duration: 0.028,
    peakGain: 0.016,
    filterFreq: 2000,
  });
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  userOverride = soundEnabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, soundEnabled ? 'on' : 'off');
    } catch {
      // ignore storage errors
    }
  }
  for (const cb of listeners) cb(soundEnabled);
  if (soundEnabled) playOpenSound();
  return soundEnabled;
}

export function attachGlobalSoundListeners(): () => void {
  if (typeof document === 'undefined') return () => {};

  const onClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const interactive = target.closest('button, a[href], [role="tab"], summary');
    if (!interactive || interactive.hasAttribute('disabled')) return;
    const mode = interactive.getAttribute('data-sound');
    if (mode === 'none') return;
    if (mode === 'open') playOpenSound();
    else if (mode === 'close') playCloseSound();
    else playClickSound();
  };

  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target;
    if (
      target instanceof Element &&
      target.matches('[data-hover-sound], .thumb, .lift, .card-hover-shine, .btn-shine')
    ) {
      playHoverSound();
    }
  };

  document.addEventListener('click', onClick, { capture: true });
  document.addEventListener('pointerenter', onPointerEnter, { capture: true });

  return () => {
    document.removeEventListener('click', onClick, { capture: true });
    document.removeEventListener('pointerenter', onPointerEnter, { capture: true });
  };
}
