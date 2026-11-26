import { useEffect, useState } from 'react';

interface OpeningRevealProps {
  logoSrc: string;
  brandName: string;
  skip?: boolean;
  onComplete: (ready: boolean) => void;
}

type IntroPhase = 'draw' | 'logo' | 'expand' | 'done';

export function OpeningReveal({
  logoSrc,
  brandName,
  skip = false,
  onComplete,
}: OpeningRevealProps) {
  const [phase, setPhase] = useState<IntroPhase>(skip ? 'done' : 'draw');

  useEffect(() => {
    if (skip) {
      setPhase('done');
      onComplete(true);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setPhase('done');
      onComplete(true);
      return;
    }

    // Phase 1 -> 2: Fade/scale circular mascot logo inside the drawing ring
    const logoTimer = window.setTimeout(() => {
      setPhase('logo');
    }, 320);

    // Phase 2 -> 3: Slide curtain + locked top laser line cleanly past 100vh
    const expandTimer = window.setTimeout(() => {
      setPhase('expand');
    }, 1020);

    // Trigger crisp hero entrance right as the top of the hero is revealed
    const heroTimer = window.setTimeout(() => {
      onComplete(true);
    }, 1260);

    // Phase 3 -> 4: Unmount overlay once curtain is completely off-screen
    const doneTimer = window.setTimeout(() => {
      setPhase('done');
    }, 2000);

    return () => {
      window.clearTimeout(logoTimer);
      window.clearTimeout(expandTimer);
      window.clearTimeout(heroTimer);
      window.clearTimeout(doneTimer);
    };
  }, [skip, onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      className="intro"
      data-phase={phase}
      role="status"
      aria-label={`Loading ${brandName}`}
    >
      <div className="intro-line" aria-hidden="true" />
      <div className="intro-mark">
        <svg className="intro-svg" viewBox="0 0 132 132" aria-hidden="true">
          <circle className="intro-arc" cx="66" cy="66" r="64" pathLength={100} />
        </svg>
        <img
          src={logoSrc}
          alt=""
          loading="eager"
          decoding="sync"
          className="intro-logo"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
