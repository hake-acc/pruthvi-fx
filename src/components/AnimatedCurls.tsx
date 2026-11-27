import React, { useMemo } from 'react';

export interface AnimatedCurlsProps {
  /** Whether curls decoration is enabled for this container. Defaults to true. */
  enabled?: boolean;
  /** Number of curls to render. Defaults to 16. */
  count?: number;
  /** Minimum curl size in pixels. Defaults to 28. */
  minSize?: number;
  /** Maximum curl size in pixels. Defaults to 85. */
  maxSize?: number;
  /** Minimum stroke opacity. Defaults to 0.05. */
  minOpacity?: number;
  /** Maximum stroke opacity. Defaults to 0.14. */
  maxOpacity?: number;
  /** Custom stroke color or CSS variable. Defaults to '#d8d9e6'. */
  color?: string;
  /** Stroke width in px. Defaults to 1.7. */
  strokeWidth?: number;
  /** Optional numeric seed for deterministic layout stability. */
  seed?: number;
  /** Additional container CSS classes. */
  className?: string;
  /** Inline styles for container. */
  style?: React.CSSProperties;
}

interface CurlData {
  id: string;
  left: string;
  top: string;
  size: number;
  opacity: number;
  duration: number;
  breath: number;
  draw: number;
  delay: number;
  path: string;
}

/**
 * Procedural logarithmic/Archimedean spiral path generator
 * matches the original algorithm precisely.
 */
function makeSpiral(turns: number, tightness: number): string {
  let d = '';
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const angle = t * Math.PI * 2 * turns;
    const radius = 3 + t * tightness;

    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;

    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d;
}

/** Simple linear congruential pseudo-random number generator for stable seed */
function createPrng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function AnimatedCurls({
  enabled = true,
  count = 16,
  minSize = 28,
  maxSize = 85,
  minOpacity = 0.05,
  maxOpacity = 0.14,
  color = '#d8d9e6',
  strokeWidth = 1.7,
  seed = 42,
  className = '',
  style,
}: AnimatedCurlsProps) {
  // If disabled, render nothing
  if (!enabled) return null;

  // Memoize curls data so component rerenders never recreate DOM elements or restart animations
  const curls = useMemo<CurlData[]>(() => {
    const random = seed !== undefined ? createPrng(seed) : Math.random;
    const items: CurlData[] = [];

    for (let i = 0; i < count; i++) {
      const size = minSize + random() * (maxSize - minSize);
      const opacity = minOpacity + random() * (maxOpacity - minOpacity);
      const duration = 12 + random() * 18; // 12s - 30s
      const breath = 5 + random() * 8;     // 5s - 13s
      const draw = 4 + random() * 7;       // 4s - 11s
      const delay = -(random() * 15);      // staggered initial phase
      const turns = 1.3 + random() * 2.5;
      const tightness = 10 + random() * 32;

      // Distribute evenly with edge margin
      const left = `${(random() * 94).toFixed(1)}%`;
      const top = `${(random() * 90).toFixed(1)}%`;

      items.push({
        id: `curl-${seed}-${i}`,
        left,
        top,
        size: Math.round(size),
        opacity: Number(opacity.toFixed(3)),
        duration: Number(duration.toFixed(2)),
        breath: Number(breath.toFixed(2)),
        draw: Number(draw.toFixed(2)),
        delay: Number(delay.toFixed(2)),
        path: makeSpiral(turns, tightness),
      });
    }

    return items;
  }, [count, minSize, maxSize, minOpacity, maxOpacity, seed]);

  return (
    <div
      className={`swirl-layer ${className}`}
      aria-hidden="true"
      style={{
        ...style,
        ['--curl-stroke' as any]: color,
      }}
    >
      {curls.map((curl) => (
        <div
          key={curl.id}
          className="curl"
          style={{
            left: curl.left,
            top: curl.top,
            ['--size' as any]: `${curl.size}px`,
            ['--opacity' as any]: curl.opacity,
            ['--duration' as any]: `${curl.duration}s`,
            ['--breath' as any]: `${curl.breath}s`,
            ['--draw' as any]: `${curl.draw}s`,
            animationDelay: `${curl.delay}s`,
          }}
        >
          <svg viewBox="0 0 100 100" style={{ animationDelay: `${curl.delay * 0.7}s` }}>
            <path
              pathLength="1"
              d={curl.path}
              strokeWidth={strokeWidth}
              style={{ animationDelay: `${curl.delay * 0.5}s` }}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
