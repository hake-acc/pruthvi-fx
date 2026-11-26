import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { getSoundEnabled, subscribeSound, toggleSound } from '../lib/sound';

const THEME_STORAGE_KEY = 'pruthvifx-theme';

export function DiscordIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9 0 13.6.3 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12 0l.5.4-2 1 1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7ZM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

export function XIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.4l7.9-9L1 2h7l4.8 6.4L18.2 2Zm-1.2 18h1.9L7.1 4H5.1l11.9 16Z" />
    </svg>
  );
}

export function HeartIcon({
  className = 'heartbeat inline h-4 w-4 text-primary',
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.3 4c2.3 0 3.9 1.3 5.7 3.3C13.8 5.3 15.4 4 17.7 4 21.8 4 23.7 8.4 22 11.7 19.5 16.4 12 21 12 21Z" />
    </svg>
  );
}

export function ThemeToggle({
  defaultMode = 'dark',
  onModeChange,
}: {
  defaultMode?: 'dark' | 'light';
  onModeChange?: (mode: 'dark' | 'light') => void;
}) {
  const [isLight, setIsLight] = useState(defaultMode === 'light');
  const timerRef = useRef<number | null>(null);
  const prevDefaultRef = useRef<'dark' | 'light' | null>(null);

  useEffect(() => {
    const isInitialMount = prevDefaultRef.current === null;
    const adminChangedMode = !isInitialMount && prevDefaultRef.current !== defaultMode;
    prevDefaultRef.current = defaultMode;

    let nextLight = defaultMode === 'light';
    if (isInitialMount) {
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          nextLight = saved === 'light';
        }
      } catch {
        // ignore storage errors
      }
    } else if (adminChangedMode) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, defaultMode);
      } catch {
        // ignore storage errors
      }
    }

    setIsLight(nextLight);
    document.documentElement.dataset.theme = nextLight ? 'light' : 'dark';
    onModeChange?.(nextLight ? 'light' : 'dark');

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.documentElement.classList.remove('theme-changing');
    };
  }, [defaultMode, onModeChange]);

  const handleToggle = () => {
    const nextLight = !isLight;
    const root = document.documentElement;
    root.classList.add('theme-changing');
    root.dataset.theme = nextLight ? 'light' : 'dark';
    setIsLight(nextLight);
    onModeChange?.(nextLight ? 'light' : 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextLight ? 'light' : 'dark');
    } catch {
      // ignore storage errors
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      root.classList.remove('theme-changing');
    }, 500);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full bg-transparent text-foreground transition-colors duration-300 hover:bg-card hover:text-primary active:scale-90"
    >
      <Sun
        aria-hidden="true"
        className={`absolute h-[17px] w-[17px] transition-[transform,opacity] duration-500 ${
          isLight ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
      />
      <Moon
        aria-hidden="true"
        className={`absolute h-[17px] w-[17px] transition-[transform,opacity] duration-500 ${
          isLight ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        }`}
      />
    </button>
  );
}

export function SoundToggle() {
  const enabled = useSyncExternalStore(subscribeSound, getSoundEnabled, () => true);

  return (
    <button
      type="button"
      data-sound="none"
      onClick={() => toggleSound()}
      aria-label={enabled ? 'Mute interface sounds' : 'Enable interface sounds'}
      aria-pressed={enabled}
      title={enabled ? 'Sound On (click to mute)' : 'Sound Off (click to enable)'}
      className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full bg-transparent text-foreground transition-all duration-300 hover:bg-card hover:text-primary active:scale-90"
    >
      <Volume2
        aria-hidden="true"
        className={`absolute h-[17px] w-[17px] transition-[transform,opacity] duration-400 ${
          enabled ? 'rotate-0 scale-100 opacity-100' : '-rotate-45 scale-50 opacity-0'
        }`}
      />
      <VolumeX
        aria-hidden="true"
        className={`absolute h-[17px] w-[17px] text-muted-foreground transition-[transform,opacity] duration-400 ${
          enabled ? 'rotate-45 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
      />
    </button>
  );
}
